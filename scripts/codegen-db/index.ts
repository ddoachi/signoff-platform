import fs from 'fs';
import path from 'path';
import { introspect } from './introspect.js';
import { generateTypes } from './generateTypes.js';
import { generateQueryKeys } from './generateQueryKeys.js';
import { generateHooks } from './generateHooks.js';
import type { TableMeta } from './types.js';

// ── config 로드 ──
const configPath = path.resolve('codegen-db.config.ts');
const configMod = await import(configPath);
const config = configMod.default;

const isDryRun = process.argv.includes('--dry-run');
const fixtureArg = process.argv.find((a) => a.startsWith('--fixture='));

async function main() {
  let tables: TableMeta[];

  if (isDryRun || fixtureArg) {
    // DB 없이 fixture 데이터로 실행
    const fixturePath =
      fixtureArg?.split('=')[1] ??
      path.resolve('tests/fixtures/sample-schema.json');
    console.log(`[codegen-db] dry-run: loading fixture from ${fixturePath}`);
    const raw = fs.readFileSync(fixturePath, 'utf-8');
    tables = JSON.parse(raw) as TableMeta[];
  } else {
    // 실제 DB에서 스키마 조회
    console.log(`[codegen-db] connecting to ${config.connectionString.replace(/:[^:@]+@/, ':***@')}...`);
    tables = await introspect(
      config.connectionString,
      config.schemas,
      config.exclude,
    );
  }

  if (tables.length === 0) {
    console.log('[codegen-db] no tables found. nothing to generate.');
    return;
  }

  console.log(
    `[codegen-db] found ${tables.length} table(s): ${tables.map((t) => t.name).join(', ')}`,
  );

  // ── 파일 생성 ──
  const outDir = path.resolve(config.outputDir);
  fs.mkdirSync(outDir, { recursive: true });

  const typesContent = generateTypes(tables);
  const keysContent = generateQueryKeys(tables);
  const hooksContent = generateHooks(tables);

  fs.writeFileSync(path.join(outDir, 'types.ts'), typesContent);
  fs.writeFileSync(path.join(outDir, 'queryKeys.ts'), keysContent);
  fs.writeFileSync(path.join(outDir, 'hooks.ts'), hooksContent);

  console.log(`[codegen-db] generated 3 files in ${outDir}`);
  console.log('  - types.ts');
  console.log('  - queryKeys.ts');
  console.log('  - hooks.ts');
}

main().catch((err) => {
  console.error('[codegen-db] ERROR:', err);
  process.exit(1);
});
