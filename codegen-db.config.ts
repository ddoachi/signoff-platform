import fs from 'fs';
import path from 'path';

export interface CodegenDbConfig {
  /** PostgreSQL 연결 문자열 */
  connectionString: string;
  /** 대상 스키마 목록 (기본: ['public']) */
  schemas: string[];
  /** 생성 파일 출력 경로 */
  outputDir: string;
  /** 제외할 테이블 이름 */
  exclude: string[];
  /** 스키마별로 폴더를 분리할지 여부 (기본: false) */
  groupBySchema?: boolean;
  /** index.ts 배럴 파일을 생성할지 여부 (기본: false) */
  generateIndex?: boolean;
}

/**
 * .env 파일을 파싱하여 key-value 객체로 반환
 * - 주석(#)과 빈 줄 무시
 * - $VAR 형태의 변수 참조를 같은 파일 내 값으로 치환
 */
function loadEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};

  const content = fs.readFileSync(filePath, 'utf-8');
  const vars: Record<string, string> = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;

    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();

    // 따옴표 제거
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    // $VAR 참조 치환
    value = value.replace(/\$([A-Z_][A-Z0-9_]*)/g, (_, varName) => {
      return vars[varName] ?? process.env[varName] ?? '';
    });

    vars[key] = value;
  }
  return vars;
}

/**
 * 환경에 맞는 .env 파일을 로드하여 connection string을 조립
 *
 * 파일 해석 순서:
 *   1. `.env.{envName}.local`  (git-ignored, 개인 오버라이드)
 *   2. `.env.{envName}`        (환경별 설정)
 *   3. `.env.local`            (git-ignored, 공통 오버라이드)
 *   4. `.env`                  (공통 기본값)
 *
 * 먼저 찾은 파일의 값이 우선합니다 (Vite 동일 규칙).
 */
function resolveEnv(envName: string): Record<string, string> {
  const candidates = [
    `.env.${envName}.local`,
    `.env.${envName}`,
    '.env.local',
    '.env',
  ];

  let merged: Record<string, string> = {};

  // 역순으로 로드하여, 우선순위 높은 파일이 나중에 덮어쓰도록
  for (const file of candidates.reverse()) {
    const vars = loadEnvFile(path.resolve(file));
    merged = { ...merged, ...vars };
  }

  return merged;
}

function buildConnectionString(env: Record<string, string>): string {
  // 1) process.env.DATABASE_URL이 있으면 최우선
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  // 2) .env 파일의 DATABASE_URL
  if (env.DATABASE_URL) return env.DATABASE_URL;

  // 3) 개별 변수로 조립
  const host = env.POSTGRES_HOST ?? 'localhost';
  const port = env.POSTGRES_PORT ?? '5432';
  const user = env.POSTGRES_USER ?? 'signoff';
  const pass = env.POSTGRES_PASSWORD ?? '';
  const db = env.POSTGRES_DATABASE ?? 'signoff';

  return `postgresql://${user}:${encodeURIComponent(pass)}@${host}:${port}/${db}`;
}

/**
 * 환경 이름을 받아 CodegenDbConfig를 반환
 *
 * @param envName - 환경 이름 (e.g. 'development', 'production')
 *                  결정 순서: --env= CLI flag → NODE_ENV → 'development'
 */
export default function buildConfig(envName: string): CodegenDbConfig {
  const env = resolveEnv(envName);

  console.log(`[codegen-db] env: ${envName}`);

  return {
    connectionString: buildConnectionString(env),
    schemas: ['public', 'sol', 'sorv', 'dashboard'],
    outputDir: 'src/generated/db',
    exclude: [],
    groupBySchema: false,
    generateIndex: true,
  };
}
