import type { DbApi } from './db/types.js';

declare global {
  interface Window {
    electronApi: {
      dbApi: DbApi;
    };
  }
}

export {};
