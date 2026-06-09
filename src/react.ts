import { useUnit } from 'effector-react';
import type { Query, QueryStatus } from './types';

type AnyQuery = Query<any, any, any, any>;

export interface UseQueryResult<Params, Mapped, Error> {
  data: Mapped | null;
  error: Error | null;
  status: QueryStatus;
  pending: boolean;
  stale: boolean;
  enabled: boolean;
  params: Params | null;
  /** Derived convenience flags. */
  isInitial: boolean;
  isPending: boolean;
  isDone: boolean;
  isFail: boolean;
  // bound triggers (scope-aware via effector-react's Provider)
  start: (params: Params) => void;
  refresh: (params: Params) => void;
  refetch: (params: Params) => void;
  reset: () => void;
  cancel: () => void;
}

/**
 * React binding for a Query. Reads its stores and binds its triggers to the
 * current effector scope (effector-react <Provider>) via `useUnit`.
 *
 * It does NOT start the query — call `start`/`refresh` yourself (e.g. in an
 * effect), keeping the query explicit and SSR-friendly.
 */
export function useQuery<Params, Result, Error, Mapped>(
  query: Query<Params, Result, Error, Mapped>,
): UseQueryResult<Params, Mapped, Error> {
  const state = useUnit({
    data: query.$data,
    error: query.$error,
    status: query.$status,
    pending: query.$pending,
    stale: query.$stale,
    enabled: query.$enabled,
    params: query.$params,
  });

  const triggers = useUnit({
    start: query.start,
    refresh: query.refresh,
    refetch: query.refetch,
    reset: query.reset,
    cancel: query.cancel,
  });

  return {
    ...state,
    isInitial: state.status === 'initial',
    isPending: state.status === 'pending',
    isDone: state.status === 'done',
    isFail: state.status === 'fail',
    ...triggers,
  };
}

// Per-query promise cache: while a query is loading we throw a *stable* promise
// (React keys Suspense retries on identity) that resolves on the next settle.
const suspenseCache = new WeakMap<object, Promise<void>>();

/**
 * Suspense binding for a Query. Returns the data directly (never null):
 *
 *  - `initial` → auto-starts with the given params, then suspends;
 *  - `pending` → suspends (the nearest `<Suspense>` shows its fallback);
 *  - `fail` → throws the error (caught by the nearest Error Boundary);
 *  - `done` → returns the data.
 *
 * Client-side Suspense (CSR). Scope-aware reads/triggers via effector-react,
 * but the settle signal is observed globally, so pair it with `fork` only
 * outside of concurrent SSR streaming.
 */
export function useSuspenseQuery<Params, Result, Error, Mapped>(
  query: Query<Params, Result, Error, Mapped>,
  ...args: [Params] extends [void] ? [] : [Params]
): Mapped {
  const { data, status, error } = useUnit({
    data: query.$data,
    status: query.$status,
    error: query.$error,
  });
  const start = useUnit(query.start) as (...a: unknown[]) => void;

  if (status === 'done') {
    suspenseCache.delete(query as object);
    return data as Mapped;
  }
  if (status === 'fail') {
    suspenseCache.delete(query as object);
    throw error;
  }

  // initial / pending → suspend until the query settles
  let promise = suspenseCache.get(query as object);
  if (!promise) {
    promise = new Promise<void>((resolve) => {
      const unwatch = (query as unknown as AnyQuery).finished.finally.watch(() => {
        unwatch();
        resolve();
      });
    });
    suspenseCache.set(query as object, promise);
    if (status === 'initial') start(...args);
  }
  throw promise;
}
