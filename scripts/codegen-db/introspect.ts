import pg from 'pg';
import type { TableMeta, ColumnMeta } from './types.js';

const INTROSPECT_SQL = `
SELECT
  c.table_schema,
  c.table_name,
  c.column_name,
  c.udt_name,
  c.is_nullable,
  c.column_default,
  t.table_type,
  COALESCE(pk.is_pk, false) AS is_primary_key
FROM information_schema.columns c
JOIN information_schema.tables t
  ON t.table_schema = c.table_schema
  AND t.table_name = c.table_name
  AND t.table_type IN ('BASE TABLE', 'VIEW')
LEFT JOIN (
  SELECT
    kcu.table_schema,
    kcu.table_name,
    kcu.column_name,
    true AS is_pk
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  WHERE tc.constraint_type = 'PRIMARY KEY'
) pk
  ON pk.table_schema = c.table_schema
  AND pk.table_name = c.table_name
  AND pk.column_name = c.column_name
WHERE c.table_schema = ANY($1)
ORDER BY c.table_schema, c.table_name, c.ordinal_position;
`;

interface RawRow {
  table_schema: string;
  table_name: string;
  column_name: string;
  udt_name: string;
  is_nullable: string;
  column_default: string | null;
  table_type: string;
  is_primary_key: boolean;
}

/**
 * PostgreSQL에 접속하여 모든 테이블의 스키마 메타데이터를 조회
 */
export async function introspect(
  connectionString: string,
  schemas: string[],
  exclude: string[],
): Promise<TableMeta[]> {
  const pool = new pg.Pool({ connectionString });

  try {
    const { rows } = await pool.query<RawRow>(INTROSPECT_SQL, [schemas]);

    const tableMap = new Map<string, TableMeta>();

    for (const row of rows) {
      const key = `${row.table_schema}.${row.table_name}`;

      if (exclude.includes(row.table_name)) continue;

      if (!tableMap.has(key)) {
        tableMap.set(key, {
          schema: row.table_schema,
          name: row.table_name,
          columns: [],
          isView: row.table_type === 'VIEW',
        });
      }

      const col: ColumnMeta = {
        name: row.column_name,
        pgType: row.udt_name,
        nullable: row.is_nullable === 'YES',
        isPrimaryKey: row.is_primary_key,
        hasDefault: row.column_default != null,
      };

      tableMap.get(key)!.columns.push(col);
    }

    return Array.from(tableMap.values());
  } finally {
    await pool.end();
  }
}
