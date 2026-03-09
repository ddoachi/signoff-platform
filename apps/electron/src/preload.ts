import { contextBridge, ipcRenderer } from 'electron';
import type { DbApi, DbResult, TransactionQuery } from './db/types.js';

function unwrap<T>(result: DbResult<T>): T {
  if (!result.ok) {
    const err = new Error(result.error.message);
    (err as Error & { dbError: typeof result.error }).dbError = result.error;
    throw err;
  }
  return result.data;
}

const dbApi: DbApi = {
  query: <T = Record<string, unknown>>(sql: string, params?: unknown[]) =>
    ipcRenderer.invoke('db:query', sql, params).then(unwrap<T[]>),

  transaction: (queries: TransactionQuery[]) =>
    ipcRenderer.invoke('db:transaction', queries).then(unwrap<unknown[][]>),

  bulkInsert: (table: string, columns: string[], rows: unknown[][]) =>
    ipcRenderer.invoke('db:bulk-insert', table, columns, rows).then(unwrap<number>),

  importCsv: (table: string, columns: string[], filePath: string) =>
    ipcRenderer.invoke('db:import-csv', table, columns, filePath).then(unwrap<void>),

  poolStatus: () =>
    ipcRenderer.invoke('db:pool-status').then(unwrap<{ total: number; idle: number; waiting: number }>),
};

contextBridge.exposeInMainWorld('electronApi', { dbApi });
