/** Deterministic JSON: object keys sorted, so {a,b} and {b,a} share a cache key. */
export function stableStringify(value: unknown): string {
  if (value === undefined) return '';
  return JSON.stringify(value, (_key, val) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      return Object.keys(val)
        .sort()
        .reduce<Record<string, unknown>>((acc, k) => {
          acc[k] = (val as Record<string, unknown>)[k];
          return acc;
        }, {});
    }
    return val;
  });
}
