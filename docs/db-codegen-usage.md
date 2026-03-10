# DB Codegen — 사용 가이드

## 개념

```
┌─ 실제 DB 모드 ──────────────────────────────────────────────┐
│  PostgreSQL (khsow02:5432)                                   │
│    ↓  introspect.ts (information_schema 조회)                │
│  TableMeta[] (테이블/컬럼/PK/default 메타데이터)              │
│    ↓  generators                                             │
│  types.ts, queryKeys.ts, hooks.ts                            │
└──────────────────────────────────────────────────────────────┘

┌─ dry-run 모드 (DB 없이 테스트) ─────────────────────────────┐
│  tests/fixtures/sample-schema.json (fixture 파일)            │
│    ↓  동일한 TableMeta[] 형식                                │
│    ↓  generators                                             │
│  types.ts, queryKeys.ts, hooks.ts                            │
└──────────────────────────────────────────────────────────────┘
```

**fixture**는 실제 DB 스키마 조회 결과를 모방한 JSON 파일입니다.
generators는 입력이 동일한 `TableMeta[]`이므로, DB 없이도 생성 로직을 검증할 수 있습니다.

---

## 사무실에서 실제 DB로 사용하기

### 1단계: 의존성 설치

```bash
cd signoff-platform
npm install
```

### 2단계: DB 연결 설정

`codegen-db.config.ts`에서 DB 주소를 확인합니다:

```ts
const config: CodegenDbConfig = {
  connectionString:
    process.env.DATABASE_URL ??
    'postgresql://signoff:dss-signoff123!@khsow02:5432/signoff',
  schemas: ['public'],
  outputDir: 'src/generated/db',
  exclude: [],
};
```

- 기본값은 `khsow02:5432/signoff`로 설정되어 있습니다
- 다른 DB를 사용하려면 환경변수 `DATABASE_URL`로 오버라이드합니다

### 3단계: codegen 실행

```bash
# 기본 — config에 설정된 DB 사용
npm run db:generate

# 환경변수로 DB 주소 오버라이드
DATABASE_URL=postgresql://user:pass@hostname:5432/dbname npm run db:generate
```

### 4단계: 생성된 파일 확인

```
src/generated/db/
├── types.ts       ← Row/Insert/Update 인터페이스
├── queryKeys.ts   ← TanStack Query 키 팩토리
└── hooks.ts       ← useXxxList, useXxxById, useInsert/Update/DeleteXxx
```

### 5단계: 프로젝트에서 사용

생성된 파일을 Electron + React 프로젝트의 `apps/frontend/src/`에 복사하거나,
`outputDir`을 직접 프로젝트 경로로 지정합니다:

```ts
// codegen-db.config.ts
const config: CodegenDbConfig = {
  // ...
  outputDir: '../worktrees/migration-to-mui-ver2/apps/frontend/src/generated/db',
};
```

그 후 컴포넌트에서 바로 import:

```tsx
import { useSorvTaskList, useInsertSorvTask } from '@/generated/db/hooks';

function SorvTaskPage() {
  const { data, isLoading } = useSorvTaskList();
  const insert = useInsertSorvTask();

  const handleAdd = () => {
    insert.mutate({ sorv_path: '/some/path' });
  };

  return (
    // ...
  );
}
```

---

## DB 없이 테스트하기 (dry-run)

### fixture 기반 실행

```bash
# 기본 fixture (tests/fixtures/sample-schema.json) 사용
npm run db:generate:dry-run

# 커스텀 fixture 지정
npx tsx scripts/codegen-db/index.ts --fixture=path/to/my-schema.json
```

### 유닛 테스트 실행

```bash
# 전체 테스트 (DB 불필요)
npm test

# watch 모드
npm run test:watch
```

24개 테스트가 fixture 데이터를 기반으로 생성기 로직을 검증합니다:
- `naming`: snake_case → PascalCase/camelCase 변환
- `mapTypes`: PostgreSQL 타입 → TypeScript 타입 매핑
- `generateTypes`: Row/Insert/Update 인터페이스 생성
- `generateQueryKeys`: query key factory 생성
- `generateHooks`: CRUD hook 생성 + SQL 문 검증

### 실제 DB 스키마를 fixture로 저장하기

사무실에서 한 번 실행한 후, 해당 스키마를 fixture로 저장해두면
이후에는 DB 없이도 동일한 결과를 재현할 수 있습니다:

```bash
# 1. DB에서 스키마 조회 + fixture로 저장
npx tsx scripts/codegen-db/index.ts --save-fixture=tests/fixtures/office-schema.json

# 2. 이후 fixture로 dry-run
npx tsx scripts/codegen-db/index.ts --fixture=tests/fixtures/office-schema.json
```

> 참고: `--save-fixture` 기능은 향후 구현 예정입니다.

---

## 특정 테이블 제외하기

`codegen-db.config.ts`의 `exclude`에 테이블 이름을 추가합니다:

```ts
const config: CodegenDbConfig = {
  // ...
  exclude: ['knex_migrations', 'knex_migrations_lock', 'temp_import'],
};
```

---

## 트러블슈팅

### DB 연결 실패

```
[codegen-db] ERROR: connect ECONNREFUSED 127.0.0.1:5432
```

- DB 서버가 실행 중인지 확인
- `khsow02` 호스트에 네트워크 접근이 가능한지 확인
- `pg_hba.conf`에서 연결을 허용하는지 확인

### 테이블이 없음

```
[codegen-db] no tables found. nothing to generate.
```

- `schemas` 설정이 올바른지 확인 (기본: `['public']`)
- DB에 실제로 테이블이 존재하는지 확인: `\dt` (psql)

### 생성된 hook에서 TypeScript 에러

- `window.electronApi.dbApi`가 `global.d.ts`에 선언되어 있는지 확인
- `@tanstack/react-query`가 프로젝트에 설치되어 있는지 확인
