/** 컬럼 메타데이터 */
export interface ColumnMeta {
  name: string;
  pgType: string; // udt_name (e.g. "int4", "text", "timestamptz")
  nullable: boolean;
  isPrimaryKey: boolean;
  hasDefault: boolean;
}

/** 테이블 메타데이터 */
export interface TableMeta {
  schema: string;
  name: string;
  columns: ColumnMeta[];
  /** view인 경우 true (read-only — Row 타입 + List hook만 생성) */
  isView?: boolean;
}
