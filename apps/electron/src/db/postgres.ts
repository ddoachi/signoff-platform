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

// ── SQL identifier 검증 ────────────────────────────────────

const SAFE_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_.]*$/;

function validateIdentifiers(table: string, columns: string[]): void {
  if (!SAFE_IDENTIFIER.test(table)) {
    throw new Error(`Invalid table identifier: ${table}`);
  }
  for (const col of columns) {
    if (!SAFE_IDENTIFIER.test(col)) {
      throw new Error(`Invalid column identifier: ${col}`);
    }
  }
}

// ── CSV 값 이스케이프 (RFC 4180) ───────────────────────────

function csvEscape(v: unknown): string {
  if (v == null) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

// ── Phase 2-1: 구조화된 에러 처리 ──────────────────────────

export function pgErrorToDbError(err: unknown): DbError {
  if (!(err instanceof Error)) {
    return { code: 'UNKNOWN', message: String(err) };
  }
  if (!('code' in err) || typeof (err as Record<string, unknown>).code !== 'string') {
    return { code: 'UNKNOWN', message: err.message };
  }
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
    try {
      await client.query('ROLLBACK');
    } catch {
      // ROLLBACK 실패 시 원본 에러를 우선 전달
    }
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
  validateIdentifiers(table, columns);

  const client = await getPool().connect();
  try {
    const copySQL = `COPY ${table} (${columns.join(',')}) FROM STDIN WITH (FORMAT csv)`;
    const stream = client.query(copyFrom(copySQL));
    const csvLines = rows.map((row) =>
      row.map((v) => csvEscape(v)).join(','),
    );
    const readable = Readable.from(csvLines.map((line) => line + '\n'));
    await pipeline(readable, stream);
    return (stream as unknown as { rowCount: number }).rowCount ?? rows.length;
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
  validateIdentifiers(table, columns);

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
