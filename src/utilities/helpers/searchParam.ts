/** Next.js search params can repeat (?a=1&a=2). Pages that expect one value take the first. */
export type SearchParams = Record<string, string | string[] | undefined>;

export function searchParam(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}
