import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import type { TableMeta } from '../scripts/codegen-db/types.js';
import { pgToTs } from '../scripts/codegen-db/mapTypes.js';
import { toPascalCase, toCamelCase } from '../scripts/codegen-db/naming.js';
import { generateTypes } from '../scripts/codegen-db/generateTypes.js';
import { generateQueryKeys } from '../scripts/codegen-db/generateQueryKeys.js';
import { generateHooks } from '../scripts/codegen-db/generateHooks.js';

// ── fixture 로드 ──
const fixture: TableMeta[] = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, 'fixtures/sample-schema.json'),
    'utf-8',
  ),
);

describe('naming', () => {
  it('snake_case → PascalCase', () => {
    expect(toPascalCase('sorv_task')).toBe('SorvTask');
    expect(toPascalCase('user_profile')).toBe('UserProfile');
    expect(toPascalCase('a')).toBe('A');
  });

  it('snake_case → camelCase', () => {
    expect(toCamelCase('sorv_task')).toBe('sorvTask');
    expect(toCamelCase('user_profile')).toBe('userProfile');
  });
});

describe('mapTypes', () => {
  it('숫자 타입 매핑', () => {
    expect(pgToTs('int4')).toBe('number');
    expect(pgToTs('float8')).toBe('number');
    expect(pgToTs('numeric')).toBe('number');
  });

  it('문자열 타입 매핑', () => {
    expect(pgToTs('text')).toBe('string');
    expect(pgToTs('varchar')).toBe('string');
    expect(pgToTs('uuid')).toBe('string');
  });

  it('날짜 타입 매핑', () => {
    expect(pgToTs('timestamptz')).toBe('string');
    expect(pgToTs('date')).toBe('string');
  });

  it('JSON 타입 매핑', () => {
    expect(pgToTs('jsonb')).toBe('unknown');
  });

  it('알 수 없는 타입은 unknown', () => {
    expect(pgToTs('custom_type')).toBe('unknown');
  });
});

describe('generateTypes', () => {
  const output = generateTypes(fixture);

  it('DO NOT EDIT 헤더 포함', () => {
    expect(output).toContain('DO NOT EDIT');
  });

  it('Row 인터페이스 생성', () => {
    expect(output).toContain('export interface SorvTaskRow {');
    expect(output).toContain('id: number;');
    expect(output).toContain('sorv_path: string;');
  });

  it('nullable 컬럼은 | null 포함', () => {
    expect(output).toContain('status: string | null;');
  });

  it('Insert 타입: PK/default는 optional', () => {
    expect(output).toContain('export interface SorvTaskInsert {');
    expect(output).toContain('id?: number;');
    expect(output).toContain('sorv_path: string;');
    expect(output).toContain('created_at?: string;');
  });

  it('Update 타입은 Partial<Insert>', () => {
    expect(output).toContain(
      'export type SorvTaskUpdate = Partial<SorvTaskInsert>;',
    );
  });

  it('여러 테이블 모두 생성', () => {
    expect(output).toContain('export interface UserProfileRow {');
    expect(output).toContain('export interface UserProfileInsert {');
  });
});

describe('generateQueryKeys', () => {
  const output = generateQueryKeys(fixture);

  it('dbKeys 객체 생성', () => {
    expect(output).toContain('export const dbKeys = {');
  });

  it('테이블별 all/byId 키 생성', () => {
    expect(output).toContain("all: ['sorv_task'] as const,");
    expect(output).toContain(
      "byId: (id: number) => ['sorv_task', id] as const,",
    );
  });

  it('uuid PK는 string 타입', () => {
    expect(output).toContain(
      "byId: (id: string) => ['user_profile', id] as const,",
    );
  });
});

describe('generateHooks', () => {
  const output = generateHooks(fixture);

  it('tanstack query import 포함', () => {
    expect(output).toContain(
      "import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';",
    );
  });

  it('List hook 생성', () => {
    expect(output).toContain('export function useSorvTaskList()');
    expect(output).toContain('export function useUserProfileList()');
  });

  it('ById hook 생성', () => {
    expect(output).toContain('export function useSorvTaskById(id: number)');
    expect(output).toContain('export function useUserProfileById(id: string)');
  });

  it('Insert hook 생성', () => {
    expect(output).toContain('export function useInsertSorvTask()');
    expect(output).toContain('(input: SorvTaskInsert)');
  });

  it('Update hook 생성', () => {
    expect(output).toContain('export function useUpdateSorvTask()');
    expect(output).toContain('SorvTaskUpdate & { id: number }');
  });

  it('Delete hook 생성', () => {
    expect(output).toContain('export function useDeleteSorvTask()');
    expect(output).toContain("'DELETE FROM public.sorv_task WHERE id = $1'");
  });

  it('invalidateQueries 포함', () => {
    expect(output).toContain('qc.invalidateQueries');
  });

  it('INSERT SQL에 non-default 컬럼만 포함', () => {
    // sorv_task: id(PK,default), sorv_path(required), status(nullable,default), created_at(default)
    // → INSERT에는 sorv_path만
    expect(output).toContain(
      "INSERT INTO public.sorv_task (sorv_path) VALUES ($1)",
    );
  });
});
