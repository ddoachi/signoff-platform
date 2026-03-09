import { ipcMain } from 'electron';
import type { DbResult } from '../db/types.js';
import {
  query,
  transactionQueries,
  bulkInsert,
  importCsv,
  poolStatus,
  pgErrorToDbError,
} from '../db/postgres.js';

/**
 * DB 관련 IPC 핸들러를 등록한다.
 * main process 초기화 시 한 번 호출.
 */
export function registerDbHandlers(): void {
  // ── 기존: 단건 SQL 실행 (Phase 2-1 에러 처리 적용) ──
  ipcMain.handle(
    'db:query',
    async (_event, sql: string, params?: unknown[]): Promise<DbResult<unknown[]>> => {
      try {
        const data = await query(sql, params);
        return { ok: true, data };
      } catch (err) {
        return { ok: false, error: pgErrorToDbError(err) };
      }
    },
  );

  // ── Phase 2-2: 트랜잭션 묶음 실행 ──
  ipcMain.handle(
    'db:transaction',
    async (
      _event,
      queries: { sql: string; params?: unknown[] }[],
    ): Promise<DbResult<unknown[][]>> => {
      try {
        const data = await transactionQueries(queries);
        return { ok: true, data };
      } catch (err) {
        return { ok: false, error: pgErrorToDbError(err) };
      }
    },
  );

  // ── Phase 2-3: COPY 기반 대량 insert ──
  ipcMain.handle(
    'db:bulk-insert',
    async (
      _event,
      table: string,
      columns: string[],
      rows: unknown[][],
    ): Promise<DbResult<number>> => {
      try {
        const data = await bulkInsert(table, columns, rows);
        return { ok: true, data };
      } catch (err) {
        return { ok: false, error: pgErrorToDbError(err) };
      }
    },
  );

  // ── Phase 2-4: CSV 파일 → 테이블 직접 import ──
  ipcMain.handle(
    'db:import-csv',
    async (
      _event,
      table: string,
      columns: string[],
      filePath: string,
    ): Promise<DbResult<void>> => {
      try {
        await importCsv(table, columns, filePath);
        return { ok: true, data: undefined };
      } catch (err) {
        return { ok: false, error: pgErrorToDbError(err) };
      }
    },
  );

  // ── Phase 2-5: 연결 풀 상태 조회 (디버깅용) ──
  ipcMain.handle('db:pool-status', () => ({
    ok: true,
    data: poolStatus(),
  }));
}
