/**
 * snake_case → PascalCase 변환
 * e.g. "sorv_task" → "SorvTask"
 */
export function toPascalCase(snake: string): string {
  return snake
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

/**
 * snake_case → camelCase 변환
 * e.g. "sorv_task" → "sorvTask"
 */
export function toCamelCase(snake: string): string {
  const pascal = toPascalCase(snake);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}
