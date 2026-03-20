# DB Codegen — 사용 가이드

## 개요

`codegen-db`는 PostgreSQL 스키마를 기반으로 TypeScript 타입, TanStack Query 키, React Query 훅을 자동 생성하는 도구입니다.

```
┌─ 실제 DB 모드 ──────────────────────────────────────────────┐
│  PostgreSQL (khsow02:5432)                                   │
│    ↓  introspect.ts (information_schema 조회)                │
│  TableMeta[] (테이블/뷰/컬럼/PK/default 메타데이터)           │
│    ↓  generators                                             │
│  types.ts, queryKeys.ts, hooks.ts (, index.ts)               │
└──────────────────────────────────────────────────────────────┘

┌─ dry-run 모드 (DB 없이 테스트) ─────────────────────────────┐
│  tests/fixtures/sample-schema.json (fixture 파일)            │
│    ↓  동일한 TableMeta[] 형식                                │
│    ↓  generators                                             │
│  types.ts, queryKeys.ts, hooks.ts (, index.ts)               │
└──────────────────────────────────────────────────────────────┘
```

---

## 빠른 시작

### 1단계: 환경 설정

프로젝트 루트에 환경별 `.env` 파일을 생성합니다:

**`.env.development`** (개발 환경):
```env
POSTGRES_HOST=khsow02
POSTGRES_PORT=5432
POSTGRES_USER=signoff
POSTGRES_PASSWORD=dss-signoff123!
POSTGRES_DATABASE=signoff
```

**`.env.production`** (운영 환경):
```env
POSTGRES_HOST=prod-db-host
POSTGRES_PORT=5432
POSTGRES_USER=signoff
POSTGRES_PASSWORD=secure-prod-password
POSTGRES_DATABASE=signoff
```

`codegen-db.config.ts`가 환경에 맞는 파일을 자동으로 읽어 connection string을 조립합니다.

#### `.env` 파일 해석 순서 (Vite 동일 규칙)

| 우선순위 | 파일 | 용도 |
|---------|------|------|
| 1 (최고) | `.env.{envName}.local` | 개인 오버라이드 (git-ignored) |
| 2 | `.env.{envName}` | 환경별 설정 |
| 3 | `.env.local` | 공통 개인 오버라이드 (git-ignored) |
| 4 (최저) | `.env` | 공통 기본값 |

`process.env.DATABASE_URL`이 설정되어 있으면 `.env` 파일보다 우선 사용됩니다.

### 2단계: codegen 실행

```bash
# 기본 — .env.development의 DB 사용 (--env 미지정 시 기본값)
npm run db:generate

# 운영 DB에서 생성
npm run db:generate:prod
# 또는
npx tsx scripts/codegen-db/index.ts --env=production

# NODE_ENV로도 환경 지정 가능
NODE_ENV=production npm run db:generate

# 환경변수로 DB 주소 직접 오버라이드 (어떤 환경이든 우선)
DATABASE_URL=postgresql://user:pass@hostname:5432/dbname npm run db:generate

# DB 없이 fixture로 테스트
npm run db:generate:dry-run
```

#### 환경 결정 우선순위

`--env=` CLI flag → `NODE_ENV` 환경변수 → `development` (기본값)

### 3단계: 생성된 파일 확인

**단일 폴더 모드** (`groupBySchema: false`):
```
src/generated/db/
├── types.ts       ← Row/Insert/Update 인터페이스
├── queryKeys.ts   ← TanStack Query 키 팩토리
├── hooks.ts       ← useXxxList, useXxxById, useInsert/Update/DeleteXxx
└── index.ts       ← 배럴 파일 (generateIndex: true일 때)
```

**스키마별 폴더 모드** (`groupBySchema: true`):
```
src/generated/db/
├── index.ts          ← 루트 배럴 (모든 스키마 re-export)
├── public/
│   ├── types.ts
│   ├── queryKeys.ts
│   └── hooks.ts
├── dashboard/
│   ├── types.ts
│   ├── queryKeys.ts
│   └── hooks.ts
├── sol/
│   ├── types.ts
│   ├── queryKeys.ts
│   └── hooks.ts
└── sorv/
    ├── types.ts
    ├── queryKeys.ts
    └── hooks.ts
```

---

## 설정 파일 (`codegen-db.config.ts`)

```ts
const config: CodegenDbConfig = {
  // DB 연결 — .env.development에서 자동 로드
  connectionString: buildConnectionString(),

  // 대상 스키마 목록
  schemas: ['public', 'sol', 'sorv', 'dashboard'],

  // 생성 파일 출력 경로
  outputDir: 'src/generated/db',

  // 제외할 테이블 이름
  exclude: ['knex_migrations', 'knex_migrations_lock'],

  // 스키마별 폴더 분리 (default: false)
  groupBySchema: false,

  // index.ts 배럴 파일 생성 (default: false)
  generateIndex: true,
};
```

### 옵션 설명

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `connectionString` | `string` | `.env.development`에서 조립 | PostgreSQL 연결 문자열 |
| `schemas` | `string[]` | `['public']` | introspect할 스키마 목록 |
| `outputDir` | `string` | `'src/generated/db'` | 생성 파일 출력 디렉토리 |
| `exclude` | `string[]` | `[]` | 코드 생성에서 제외할 테이블 이름 |
| `groupBySchema` | `boolean` | `false` | `true`이면 스키마별로 폴더를 분리하여 생성 |
| `generateIndex` | `boolean` | `false` | `true`이면 `index.ts` 배럴 파일을 생성 |

### `groupBySchema` 폴더 구조 예시

`groupBySchema: true`일 때 스키마별로 독립 폴더가 생성되고, import 경로가 달라집니다:

```ts
// groupBySchema: false (단일 폴더)
import { useSorvTaskList } from '@/generated/db/hooks';

// groupBySchema: true (스키마별 폴더)
import { useSorvTaskList } from '@/generated/db/sorv/hooks';
import { useVPipelineStatusList } from '@/generated/db/dashboard/hooks';

// generateIndex: true일 때는 루트 배럴에서도 가능
import { useSorvTaskList, useVPipelineStatusList } from '@/generated/db';
```

---

## View 지원 (Dashboard 등)

codegen은 테이블뿐 아니라 **view**도 자동으로 인식합니다. View는 read-only이므로:

- **생성되는 것**: `Row` 타입, `all` query key, `useXxxList` hook
- **생성되지 않는 것**: `Insert`/`Update` 타입, mutation hooks (`useInsert*`, `useUpdate*`, `useDelete*`, `useBulkInsert*`)

### View 기반 codegen이 적합한 경우

복잡한 JOIN/집계 쿼리를 위한 codegen은 **미리 DB에 view를 만들어두는 것이 올바른 접근**입니다:

| 방식 | codegen 가능 | 설명 |
|------|:---:|------|
| **VIEW** | ✅ | `information_schema`에 노출되므로 introspect 가능 |
| **FUNCTION** | ❌ | `information_schema.columns`에 나타나지 않아 컬럼 메타를 가져올 수 없음 |
| **Materialized VIEW** | ✅ | 일반 view와 동일하게 introspect 가능, 성능상 유리 |

> **결론**: 차트/대시보드용 복잡 쿼리는 `CREATE VIEW`로 정의한 후 codegen하는 것이 표준 패턴입니다.
> 성능이 중요한 경우 `MATERIALIZED VIEW` + `REFRESH` 전략을 고려하세요.

### 예시: dashboard schema의 view

```sql
CREATE SCHEMA IF NOT EXISTS dashboard;

CREATE OR REPLACE VIEW dashboard.v_pipeline_status AS
SELECT
    sorv.productid,
    CASE ... END AS pipeline_status,
    COUNT(*) AS count
FROM public.signoff_task st
JOIN sol.task sol ON st.sol_task_id = sol.id
...
GROUP BY sorv.productid, pipeline_status;
```

codegen 실행 후 자동으로 다음이 생성됩니다:

```ts
// types.ts
export interface VPipelineStatusRow {
  productid: string | null;
  pipeline_status: string | null;
  count: number | null;
}

// hooks.ts
export function useVPipelineStatusList() {
  return useQuery({
    queryKey: dbKeys.vPipelineStatus.all,
    queryFn: () =>
      window.electronApi.dbApi.query<VPipelineStatusRow>(
        'SELECT * FROM dashboard.v_pipeline_status',
      ),
  });
}
```

---

## TanStack React Query 사용법

### Query Hooks (데이터 조회)

#### `useXxxList()` — 전체 목록 조회

```tsx
import { useSorvTaskList } from '@/generated/db/hooks';

function TaskListPage() {
  const {
    data,        // SorvTaskRow[] | undefined — 쿼리 결과 배열
    isLoading,   // boolean — 첫 로딩 중 여부
    isError,     // boolean — 에러 발생 여부
    error,       // Error | null — 에러 객체
    isFetching,  // boolean — 백그라운드 리페칭 중 여부
    isSuccess,   // boolean — 데이터 로드 완료 여부
    refetch,     // () => void — 수동 리페칭
    status,      // 'pending' | 'error' | 'success'
  } = useSorvTaskList();

  if (isLoading) return <div>로딩 중...</div>;
  if (isError) return <div>에러: {error.message}</div>;

  return (
    <ul>
      {data?.map((task) => (
        <li key={task.id}>{task.sorv_path} — {task.status}</li>
      ))}
    </ul>
  );
}
```

#### `useXxxById(id)` — 단건 조회

```tsx
import { useSorvTaskById } from '@/generated/db/hooks';

function TaskDetail({ taskId }: { taskId: number }) {
  const {
    data,       // SorvTaskRow | null | undefined
    isLoading,
    isError,
  } = useSorvTaskById(taskId);

  // taskId가 null/undefined이면 쿼리 비활성화 (enabled: id != null)
  if (isLoading) return <div>로딩 중...</div>;
  if (!data) return <div>태스크를 찾을 수 없습니다</div>;

  return <div>{data.sorv_path}</div>;
}
```

#### queryOptions 활용

TanStack Query v5에서는 `queryOptions`를 사용하여 쿼리 설정을 재사용할 수 있습니다:

```tsx
import { useQuery, queryOptions } from '@tanstack/react-query';
import { dbKeys } from '@/generated/db/queryKeys';
import type { SorvTaskRow } from '@/generated/db/types';

// queryOptions 팩토리 패턴
const sorvTaskListOptions = queryOptions({
  queryKey: dbKeys.sorvTask.all,
  queryFn: () =>
    window.electronApi.dbApi.query<SorvTaskRow>(
      'SELECT * FROM public.sorv_task ORDER BY id DESC',
    ),
  staleTime: 5 * 60 * 1000,        // 5분간 stale하지 않음
  gcTime: 10 * 60 * 1000,           // 10분간 가비지 컬렉션 방지
  refetchOnWindowFocus: false,       // 윈도우 포커스 시 리페칭 비활성화
});

// 컴포넌트에서 사용
function TaskPage() {
  const { data } = useQuery(sorvTaskListOptions);
  // ...
}

// prefetch (React Router loader 등에서)
async function loader(queryClient: QueryClient) {
  await queryClient.ensureQueryData(sorvTaskListOptions);
  return null;
}
```

#### 조건부 쿼리

```tsx
// productId가 있을 때만 조회
const { data } = useQuery({
  queryKey: ['tasks', productId],
  queryFn: () =>
    window.electronApi.dbApi.query<SorvTaskRow>(
      'SELECT * FROM sorv.task WHERE productid = $1',
      [productId],
    ),
  enabled: !!productId, // productId가 있을 때만 활성화
});
```

### Mutation Hooks (데이터 변경)

#### `useInsertXxx()` — 단건 삽입

```tsx
import { useInsertSorvTask } from '@/generated/db/hooks';

function AddTaskForm() {
  const {
    mutate,       // (input: SorvTaskInsert) => void — 실행
    mutateAsync,  // (input: SorvTaskInsert) => Promise<...> — Promise 반환
    isPending,    // boolean — 실행 중 여부 (v5: isLoading → isPending)
    isError,      // boolean — 에러 발생 여부
    isSuccess,    // boolean — 성공 여부
    error,        // Error | null
    data,         // mutation 결과
    reset,        // () => void — 상태 초기화
  } = useInsertSorvTask();

  const handleSubmit = () => {
    mutate(
      { sorv_path: '/some/path' },
      {
        onSuccess: () => {
          console.log('삽입 성공!');
          // queryKey 자동 invalidate됨 (hook 내부에서 처리)
        },
        onError: (err) => {
          console.error('삽입 실패:', err.message);
        },
      },
    );
  };

  return (
    <button onClick={handleSubmit} disabled={isPending}>
      {isPending ? '저장 중...' : '추가'}
    </button>
  );
}
```

#### `useUpdateXxx()` — 단건 수정

```tsx
import { useUpdateSorvTask } from '@/generated/db/hooks';

function EditTask({ task }: { task: SorvTaskRow }) {
  const update = useUpdateSorvTask();

  const handleUpdate = (newStatus: string) => {
    // id(PK)는 필수, 나머지는 변경할 필드만 전달
    update.mutate({
      id: task.id,
      status: newStatus,
    });
  };

  return (
    <select
      value={task.status ?? ''}
      onChange={(e) => handleUpdate(e.target.value)}
      disabled={update.isPending}
    >
      <option value="PENDING">Pending</option>
      <option value="DONE">Done</option>
    </select>
  );
}
```

#### `useDeleteXxx()` — 단건 삭제

```tsx
import { useDeleteSorvTask } from '@/generated/db/hooks';

function DeleteButton({ taskId }: { taskId: number }) {
  const deleteMutation = useDeleteSorvTask();

  return (
    <button
      onClick={() => deleteMutation.mutate(taskId)}
      disabled={deleteMutation.isPending}
    >
      삭제
    </button>
  );
}
```

#### `useBulkInsertXxx()` — 대량 삽입 (COPY 기반)

```tsx
import { useBulkInsertSorvTask } from '@/generated/db/hooks';

function BulkImport() {
  const bulkInsert = useBulkInsertSorvTask();

  const handleBulkInsert = () => {
    const rows = [
      { sorv_path: '/path/1' },
      { sorv_path: '/path/2' },
      { sorv_path: '/path/3' },
    ];

    bulkInsert.mutate(rows, {
      onSuccess: () => console.log('대량 삽입 완료'),
    });
  };

  return (
    <button onClick={handleBulkInsert} disabled={bulkInsert.isPending}>
      {bulkInsert.isPending ? '삽입 중...' : '대량 삽입'}
    </button>
  );
}
```

### 자동 캐시 무효화

모든 mutation hook은 성공 시 자동으로 해당 테이블의 query를 무효화합니다:

```ts
onSuccess: () => qc.invalidateQueries({ queryKey: dbKeys.sorvTask.all }),
```

따라서 `useInsertSorvTask`로 데이터를 삽입하면, `useSorvTaskList`의 데이터가 자동으로 리페칭됩니다.

---

## Electron Preload DB API

생성된 hooks는 내부적으로 `window.electronApi.dbApi`를 호출합니다.
이 API는 Electron의 preload script를 통해 renderer에 노출됩니다.

### `dbApi.query<T>(sql, params?)`

파라미터화된 SQL 쿼리를 실행합니다.

```ts
// 단순 조회
const rows = await window.electronApi.dbApi.query<SorvTaskRow>(
  'SELECT * FROM public.sorv_task WHERE status = $1',
  ['PENDING'],
);

// 집계 쿼리
const [{ count }] = await window.electronApi.dbApi.query<{ count: number }>(
  'SELECT COUNT(*) as count FROM public.sorv_task',
);
```

- **반환**: `Promise<T[]>` — 결과 행 배열
- **파라미터**: `$1`, `$2`, ... 형태의 positional parameter 사용 (SQL injection 방지)

### `dbApi.transaction(queries)`

여러 쿼리를 하나의 트랜잭션으로 실행합니다. 하나라도 실패하면 전체 ROLLBACK됩니다.

```ts
const results = await window.electronApi.dbApi.transaction([
  {
    sql: 'INSERT INTO public.sorv_task (sorv_path) VALUES ($1)',
    params: ['/path/1'],
  },
  {
    sql: 'INSERT INTO public.sorv_task (sorv_path) VALUES ($1)',
    params: ['/path/2'],
  },
  {
    sql: 'UPDATE public.user_profile SET role = $1 WHERE user_id = $2',
    params: ['admin', 'uuid-123'],
  },
]);

// results: unknown[][] — 각 쿼리의 결과 행 배열
// results[0] = INSERT 결과, results[1] = INSERT 결과, results[2] = UPDATE 결과
```

- **반환**: `Promise<unknown[][]>` — 각 쿼리의 결과 행 배열
- **에러 시**: 자동 ROLLBACK 후 에러를 throw
- **구현**: `BEGIN` → 순차 실행 → `COMMIT` (에러 시 `ROLLBACK`)

### `dbApi.bulkInsert(table, columns, rows)`

`COPY ... FROM STDIN WITH (FORMAT csv)` 기반의 고성능 대량 삽입입니다.
`INSERT INTO` 대비 10~100배 빠릅니다.

```ts
const insertedCount = await window.electronApi.dbApi.bulkInsert(
  'public.sorv_task',                    // 테이블명 (schema.table)
  ['sorv_path', 'status'],              // 컬럼명 배열
  [
    ['/path/1', 'PENDING'],             // row 1
    ['/path/2', 'DONE'],                // row 2
    ['/path/3', null],                  // row 3 (null 허용)
  ],
);
console.log(`${insertedCount}건 삽입 완료`);
```

- **반환**: `Promise<number>` — 삽입된 행 수
- **보안**: 테이블명/컬럼명에 SQL identifier 검증 적용 (`/^[a-zA-Z_][a-zA-Z0-9_.]*$/`)
- **인코딩**: 값에 쉼표, 따옴표, 줄바꿈이 포함되면 RFC 4180 CSV 이스케이프 적용
- **빈 배열**: `rows`가 빈 배열이면 0을 반환 (쿼리 실행 안 함)

### `dbApi.importCsv(table, columns, filePath)`

파일 시스템의 CSV 파일을 직접 PostgreSQL에 스트리밍 삽입합니다.

```ts
await window.electronApi.dbApi.importCsv(
  'public.sorv_task',                    // 테이블명
  ['sorv_path', 'status'],              // 컬럼명 (CSV 헤더와 매칭)
  '/home/user/data/tasks.csv',          // CSV 파일 경로 (절대 경로)
);
```

- **반환**: `Promise<void>`
- **CSV 형식**: 첫 줄이 헤더(`HEADER true`)로 처리됨
- **스트리밍**: 파일을 메모리에 전부 읽지 않고 스트림으로 처리하므로 대용량 파일에 적합
- **보안**: 테이블명/컬럼명에 SQL identifier 검증 적용

### `dbApi.poolStatus()`

현재 커넥션 풀 상태를 조회합니다.

```ts
const status = await window.electronApi.dbApi.poolStatus();
console.log(status);
// { total: 10, idle: 8, waiting: 0 }
```

- **반환**: `Promise<PoolStatus>` — `{ total, idle, waiting }`

### 에러 처리

모든 DB API 호출은 실패 시 구조화된 에러를 throw합니다:

```ts
try {
  await window.electronApi.dbApi.query('INSERT ...');
} catch (err) {
  const dbError = (err as Error & { dbError: DbError }).dbError;
  console.log(dbError.code);       // '23505' (PG 에러 코드)
  console.log(dbError.message);    // '중복 데이터: unique_constraint_name'
  console.log(dbError.detail);     // 상세 정보
  console.log(dbError.constraint); // 위반된 제약 조건명
}
```

주요 에러 코드:

| PG 코드 | 의미 | 메시지 |
|---------|------|--------|
| `23505` | UNIQUE 위반 | `중복 데이터: {constraint}` |
| `23503` | FK 참조 무결성 위반 | `참조 무결성 위반: {detail}` |
| `23502` | NOT NULL 위반 | `필수 값 누락: {column}` |
| `42P01` | 테이블 없음 | `테이블이 존재하지 않음` |
| `57014` | 쿼리 타임아웃 | `쿼리 타임아웃` |

---

## 스크립트 코드 설명 (`scripts/codegen-db/`)

### 파일 구조

```
scripts/codegen-db/
├── index.ts           ← CLI 진입점 — 설정 로드, 모드 분기, 파일 쓰기
├── types.ts           ← 공유 인터페이스 (TableMeta, ColumnMeta)
├── introspect.ts      ← PostgreSQL information_schema에서 메타데이터 추출
├── mapTypes.ts        ← PG udt_name → TypeScript 타입 문자열 매핑
├── naming.ts          ← snake_case → PascalCase/camelCase 변환
├── generateTypes.ts   ← Row/Insert/Update TypeScript 인터페이스 생성
├── generateQueryKeys.ts ← TanStack Query 키 팩토리 생성
└── generateHooks.ts   ← React Query CRUD 훅 코드 생성
```

### `index.ts` — CLI 진입점

실행 흐름:

1. `codegen-db.config.ts` 로드 (`.env.development`에서 DB 접속 정보 자동 조립)
2. `--dry-run` / `--fixture=` 플래그 확인
3. 실제 DB 모드이면 `introspect()` 호출, fixture 모드이면 JSON 파일 로드
4. `generateTypes()`, `generateQueryKeys()`, `generateHooks()` 호출
5. `groupBySchema` 옵션에 따라 단일/분리 폴더로 파일 쓰기
6. `generateIndex` 옵션에 따라 `index.ts` 배럴 파일 생성

```bash
# 사용법
npx tsx scripts/codegen-db/index.ts              # 실제 DB 모드
npx tsx scripts/codegen-db/index.ts --dry-run     # 기본 fixture 사용
npx tsx scripts/codegen-db/index.ts --fixture=path/to/schema.json  # 커스텀 fixture
```

### `types.ts` — 공유 인터페이스

```ts
interface ColumnMeta {
  name: string;        // 컬럼명
  pgType: string;      // PostgreSQL udt_name (e.g. 'int4', 'text', 'timestamptz')
  nullable: boolean;   // NULL 허용 여부
  isPrimaryKey: boolean; // PK 여부
  hasDefault: boolean; // DEFAULT 값 존재 여부
}

interface TableMeta {
  schema: string;      // 스키마명 (e.g. 'public', 'dashboard')
  name: string;        // 테이블/뷰 이름
  columns: ColumnMeta[];
  isView?: boolean;    // true이면 view (read-only — Row + List hook만 생성)
}
```

### `introspect.ts` — DB 스키마 조회

- `information_schema.columns` + `information_schema.tables` + `information_schema.table_constraints`를 JOIN하여 컬럼 메타데이터 추출
- `table_type IN ('BASE TABLE', 'VIEW')` 조건으로 테이블과 뷰 모두 조회
- `table_type = 'VIEW'`이면 `isView: true` 설정
- `exclude` 배열에 포함된 테이블은 건너뜀
- 결과를 `Map<string, TableMeta>`로 그룹핑한 후 `TableMeta[]`로 변환

### `mapTypes.ts` — 타입 매핑

PostgreSQL `udt_name`을 TypeScript 타입 문자열로 변환합니다:

| PostgreSQL | TypeScript |
|-----------|-----------|
| `int2`, `int4`, `int8`, `float4`, `float8`, `numeric`, `serial`, `bigserial` | `number` |
| `bool` | `boolean` |
| `text`, `varchar`, `char`, `bpchar`, `name`, `uuid`, `citext` | `string` |
| `date`, `timestamp`, `timestamptz`, `time`, `timetz`, `interval` | `string` |
| `json`, `jsonb` | `unknown` |
| `bytea` | `Buffer` |
| `_int4`, `_int8` | `number[]` |
| `_text`, `_varchar` | `string[]` |
| `_bool` | `boolean[]` |
| 기타 | `unknown` |

### `naming.ts` — 이름 변환

- `toPascalCase('sorv_task')` → `'SorvTask'`
- `toCamelCase('sorv_task')` → `'sorvTask'`
- `toPascalCase('v_pipeline_status')` → `'VPipelineStatus'`

### `generateTypes.ts` — 타입 생성

테이블/뷰마다 다음 인터페이스를 생성합니다:

**테이블 (isView: false)**:
- `XxxRow` — SELECT 결과 타입 (모든 컬럼 필수, nullable이면 `T | null`)
- `XxxInsert` — INSERT 입력 타입 (PK/default/nullable 컬럼은 optional)
- `XxxUpdate` — `Partial<XxxInsert>` (부분 업데이트)

**뷰 (isView: true)**:
- `XxxRow` — SELECT 결과 타입만 생성 (read-only)

### `generateQueryKeys.ts` — 쿼리 키 생성

```ts
export const dbKeys = {
  sorvTask: {
    all: ['sorv_task'] as const,
    byId: (id: number) => ['sorv_task', id] as const,
  },
  vPipelineStatus: {
    all: ['v_pipeline_status'] as const,
    // view는 byId 없음
  },
};
```

- PK의 PostgreSQL 타입에 따라 `id` 파라미터 타입 결정 (`number` | `string` | `unknown`)
- View는 `all` 키만 생성

### `generateHooks.ts` — 훅 생성

**테이블용 (6종)**:
| Hook | 용도 | React Query |
|------|------|------------|
| `useXxxList()` | 전체 목록 조회 | `useQuery` |
| `useXxxById(id)` | PK로 단건 조회 | `useQuery` |
| `useInsertXxx()` | 단건 삽입 | `useMutation` |
| `useUpdateXxx()` | 단건 수정 (PK 기준) | `useMutation` |
| `useDeleteXxx()` | 단건 삭제 (PK 기준) | `useMutation` |
| `useBulkInsertXxx()` | COPY 기반 대량 삽입 | `useMutation` |

**뷰용 (1종)**:
| Hook | 용도 | React Query |
|------|------|------------|
| `useXxxList()` | 전체 목록 조회 | `useQuery` |

---

## 유닛 테스트

```bash
# 전체 테스트 (DB 불필요 — fixture 기반)
npm test

# watch 모드
npm run test:watch
```

40개 테스트가 fixture 데이터를 기반으로 모든 생성기 로직을 검증합니다:

- `naming`: snake_case → PascalCase/camelCase 변환
- `mapTypes`: PostgreSQL 타입 → TypeScript 타입 매핑
- `generateTypes`: Row/Insert/Update 인터페이스 생성 + view는 Row만 생성
- `generateQueryKeys`: query key factory 생성 + view는 byId 미생성
- `generateHooks`: CRUD hook 생성 + SQL 문 검증 + view는 List만 생성

---

## 트러블슈팅

### DB 연결 실패

```
[codegen-db] ERROR: connect ECONNREFUSED 127.0.0.1:5432
```

- `.env.development` 파일이 프로젝트 루트에 있는지 확인
- `POSTGRES_HOST`, `POSTGRES_PORT` 값이 올바른지 확인
- DB 서버가 실행 중인지 확인
- 네트워크 접근이 가능한지 확인

### 테이블이 없음

```
[codegen-db] no tables found. nothing to generate.
```

- `schemas` 설정이 올바른지 확인
- DB에 실제로 테이블이 존재하는지 확인: `\dt` (psql)
- View를 찾지 못하면 해당 스키마가 `schemas` 배열에 포함되어 있는지 확인

### 생성된 hook에서 TypeScript 에러

- `window.electronApi.dbApi`가 `global.d.ts`에 선언되어 있는지 확인
- `@tanstack/react-query`가 프로젝트에 설치되어 있는지 확인
- `groupBySchema: true`로 변경한 경우 import 경로를 업데이트했는지 확인

### View가 codegen에 포함되지 않음

- 해당 view의 스키마가 `schemas` 배열에 포함되어 있는지 확인
- migration이 실행되어 view가 실제로 DB에 생성되어 있는지 확인:
  ```sql
  SELECT table_schema, table_name, table_type
  FROM information_schema.tables
  WHERE table_type = 'VIEW' AND table_schema = 'dashboard';
  ```
