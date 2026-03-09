/** PostgreSQL udt_name → TypeScript 타입 매핑 */
const PG_TO_TS: Record<string, string> = {
  // 숫자
  int2: 'number',
  int4: 'number',
  int8: 'number',
  float4: 'number',
  float8: 'number',
  numeric: 'number',
  serial: 'number',
  bigserial: 'number',

  // 불리언
  bool: 'boolean',

  // 문자열
  text: 'string',
  varchar: 'string',
  char: 'string',
  bpchar: 'string',
  name: 'string',
  uuid: 'string',
  citext: 'string',

  // 날짜/시간
  date: 'string',
  timestamp: 'string',
  timestamptz: 'string',
  time: 'string',
  timetz: 'string',
  interval: 'string',

  // JSON
  json: 'unknown',
  jsonb: 'unknown',

  // 바이너리
  bytea: 'Buffer',

  // 배열 (기본)
  _int4: 'number[]',
  _int8: 'number[]',
  _text: 'string[]',
  _varchar: 'string[]',
  _bool: 'boolean[]',
  _float4: 'number[]',
  _float8: 'number[]',
};

/**
 * PG udt_name을 TypeScript 타입 문자열로 변환
 */
export function pgToTs(pgType: string): string {
  return PG_TO_TS[pgType] ?? 'unknown';
}
