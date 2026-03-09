import { contextBridge, ipcRenderer } from 'electron';
import type { DbApi, TransactionQuery } from './db/types.js';

const dbApi: DbApi = {
  query: <T = Record<string, unknown>>(sql: string, params?: unknown[]) =>
    ipcRenderer.invoke('db:query', sql, params).then((r: { ok: boolean; data: T[] }) => {
      if (!r.ok) throw r;
      return r.data;
    }),

  transaction: (queries: TransactionQuery[]) =>
    ipcRenderer.invoke('db:transaction', queries).then((r: { ok: boolean; data: unknown[][] }) => {
      if (!r.ok) throw r;
      return r.data;
    }),

  bulkInsert: (table: string, columns: string[], rows: unknown[][]) =>
    ipcRenderer.invoke('db:bulk-insert', table, columns, rows).then((r: { ok: boolean; data: number }) => {
      if (!r.ok) throw r;
      return r.data;
    }),

  importCsv: (table: string, columns: string[], filePath: string) =>
    ipcRenderer.invoke('db:import-csv', table, columns, filePath).then((r: { ok: boolean; data: void }) => {
      if (!r.ok) throw r;
      return r.data;
    }),

  poolStatus: () =>
    ipcRenderer.invoke('db:pool-status').then((r: { ok: boolean; data: { total: number; idle: number; waiting: number } }) => {
      if (!r.ok) throw r;
      return r.data;
    }),
};

contextBridge.exposeInMainWorld('electronApi', { dbApi });
