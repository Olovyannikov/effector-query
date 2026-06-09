function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Structural sharing: return a value that reuses references from `prev` wherever
 * `next` is deeply equal, so unchanged sub-trees keep their identity (fewer
 * re-renders). Mirrors TanStack Query's `replaceEqualDeep`.
 */
export function replaceEqualDeep<T>(prev: unknown, next: T): T {
  if (prev === next) return next;

  const bothArrays = Array.isArray(prev) && Array.isArray(next);
  if (bothArrays || (isPlainObject(prev) && isPlainObject(next))) {
    const prevObj = prev as Record<string, unknown>;
    const nextObj = next as Record<string, unknown>;
    const nextKeys = bothArrays ? (next as unknown[]).map((_, i) => String(i)) : Object.keys(nextObj);
    const prevSize = bothArrays ? (prev as unknown[]).length : Object.keys(prevObj).length;
    const nextSize = nextKeys.length;

    const out: Record<string, unknown> = bothArrays ? ([] as unknown as Record<string, unknown>) : {};
    let equal = 0;
    for (const key of nextKeys) {
      out[key] = replaceEqualDeep(prevObj[key], nextObj[key]);
      if (out[key] === prevObj[key] && (prevObj[key] !== undefined || key in prevObj)) equal++;
    }

    return (prevSize === nextSize && equal === nextSize ? prev : out) as T;
  }

  return next;
}

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
