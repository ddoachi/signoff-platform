import { Pool } from 'pg';
import type { PoolClient, DatabaseError } from 'pg';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { createReadStream } from 'fs';
import { from as copyFrom } from 'pg-copy-streams';
import type { DbError, PoolStatus } from './types.js';

// ── Pool 설정 (Phase 2-5) ──────────────────────────────────

let pool: Pool;

export function initPool(connectionString: string): void {
  pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 30_000,
  });

  pool.on('error', (err) => {
    console.error('[DB Pool] Unexpected error on idle client:', err);
  });
}

export function getPool(): Pool {
  if (!pool) {
    throw new Error('[DB Pool] Pool not initialized. Call initPool() first.');
  }
  return pool;
}

// ── Phase 2-1: 구조화된 에러 처리 ──────────────────────────

export function pgErrorToDbError(err: unknown): DbError {
  const pgErr = err as DatabaseError;
  return {
    code: pgErr.code ?? 'UNKNOWN',
    message: pgErrorToMessage(pgErr),
    detail: pgErr.detail,
    constraint: pgErr.constraint,
  };
}

function pgErrorToMessage(err: DatabaseError): string {
  switch (err.code) {
    case '23505': return `중복 데이터: ${err.constraint ?? err.detail}`;
    case '23503': return `참조 무결성 위반: ${err.detail}`;
    case '23502': return `필수 값 누락: ${err.column}`;
    case '42P01': return `테이블이 존재하지 않음`;
    case '57014': return `쿼리 타임아웃`;
    default:      return err.message;
  }
}

// ── 기본 쿼리 ──────────────────────────────────────────────

export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  const result = await getPool().query(sql, params);
  return result.rows as T[];
}

// ── Phase 2-2: 트랜잭션 ───────────────────────────────────

export async function transaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function transactionQueries(
  queries: { sql: string; params?: unknown[] }[],
): Promise<unknown[][]> {
  return transaction(async (client) => {
    const results: unknown[][] = [];
    for (const q of queries) {
      const res = await client.query(q.sql, q.params);
      results.push(res.rows);
    }
    return results;
  });
}

// ── Phase 2-3: COPY 기반 Bulk Insert ──────────────────────

export async function bulkInsert(
  table: string,
  columns: string[],
  rows: unknown[][],
): Promise<number> {
  if (rows.length === 0) return 0;

  const client = await getPool().connect();
  try {
    const copySQL = `COPY ${table} (${columns.join(',')}) FROM STDIN WITH (FORMAT csv)`;
    const stream = client.query(copyFrom(copySQL));
    const csvLines = rows.map((row) =>
      row.map((v) => (v == null ? '' : String(v))).join(','),
    );
    const readable = Readable.from(csvLines.map((line) => line + '\n'));
    await pipeline(readable, stream);
    return rows.length;
  } finally {
    client.release();
  }
}

// ── Phase 2-4: CSV 파일 직접 Import ───────────────────────

export async function importCsv(
  table: string,
  columns: string[],
  csvFilePath: string,
): Promise<void> {
  const client = await getPool().connect();
  try {
    const copySQL = `COPY ${table} (${columns.join(',')}) FROM STDIN WITH (FORMAT csv, HEADER true)`;
    const stream = client.query(copyFrom(copySQL));
    const fileStream = createReadStream(csvFilePath);
    await pipeline(fileStream, stream);
  } finally {
    client.release();
  }
}

// ── Phase 2-5: Pool 상태 및 종료 ──────────────────────────

export function poolStatus(): PoolStatus {
  const p = getPool();
  return {
    total: p.totalCount,
    idle: p.idleCount,
    waiting: p.waitingCount,
  };
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
  }
}
