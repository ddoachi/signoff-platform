/** PostgreSQL 에러를 구조화한 인터페이스 */
export interface DbError {
  code: string;
  message: string;
  detail?: string;
  constraint?: string;
}

/** IPC 응답 래퍼 — 성공 */
export interface DbResultOk<T> {
  ok: true;
  data: T;
}

/** IPC 응답 래퍼 — 실패 */
export interface DbResultErr {
  ok: false;
  error: DbError;
}

/** IPC 응답 유니온 */
export type DbResult<T> = DbResultOk<T> | DbResultErr;

/** 트랜잭션 쿼리 항목 */
export interface TransactionQuery {
  sql: string;
  params?: unknown[];
}

/** Connection pool 상태 */
export interface PoolStatus {
  total: number;
  idle: number;
  waiting: number;
}

/** Renderer에 노출하는 DB API 인터페이스 (Phase 2 완료 후) */
export interface DbApi {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  transaction(queries: TransactionQuery[]): Promise<unknown[][]>;
  bulkInsert(table: string, columns: string[], rows: unknown[][]): Promise<number>;
  importCsv(table: string, columns: string[], filePath: string): Promise<void>;
  poolStatus(): Promise<PoolStatus>;
}
