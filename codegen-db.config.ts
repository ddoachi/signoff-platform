export interface CodegenDbConfig {
  /** PostgreSQL 연결 문자열 */
  connectionString: string;
  /** 대상 스키마 목록 (기본: ['public']) */
  schemas: string[];
  /** 생성 파일 출력 경로 */
  outputDir: string;
  /** 제외할 테이블 이름 */
  exclude: string[];
}

const config: CodegenDbConfig = {
  connectionString:
    process.env.DATABASE_URL ??
    'postgresql://signoff:dss-signoff123!@khsow02:5432/signoff',
  schemas: ['public'],
  outputDir: 'src/generated/db',
  exclude: [],
};

export default config;
