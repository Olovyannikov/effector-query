import { useUnit } from 'effector-solid';
import type { Accessor } from 'solid-js';
import type { Query, QueryStatus } from './types';

export interface UseQuerySolidResult<Params, Mapped, Error> {
  data: Accessor<Mapped | null>;
  error: Accessor<Error | null>;
  status: Accessor<QueryStatus>;
  pending: Accessor<boolean>;
  stale: Accessor<boolean>;
  enabled: Accessor<boolean>;
  params: Accessor<Params | null>;
  /** Derived convenience flags. */
  isInitial: Accessor<boolean>;
  isPending: Accessor<boolean>;
  isDone: Accessor<boolean>;
  isFail: Accessor<boolean>;
  // bound triggers (scope-aware via effector-solid's <Provider>)
  start: (params: Params) => void;
  refresh: (params: Params) => void;
  refetch: (params: Params) => void;
  reset: () => void;
  cancel: () => void;
}

/**
 * Solid binding for a Query. Reads its stores as reactive accessors and binds
 * its triggers to the current effector scope (effector-solid `<Provider>`) via
 * `useUnit`. Mirrors the React/Vue bindings — values are Solid accessors
 * (call them), like Vue's refs.
 *
 * It does NOT start the query — call `start`/`refresh` yourself, keeping the
 * query explicit and SSR-friendly.
 */
export function useQuery<Params, Result, Error, Mapped>(
  query: Query<Params, Result, Error, Mapped>,
): UseQuerySolidResult<Params, Mapped, Error> {
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
    data: state.data,
    error: state.error,
    status: state.status,
    pending: state.pending,
    stale: state.stale,
    enabled: state.enabled,
    params: state.params,
    // plain accessors (not memos): they read the reactive `status` accessor on
    // every call, so they stay correct in a tracked component scope.
    isInitial: () => state.status() === 'initial',
    isPending: () => state.status() === 'pending',
    isDone: () => state.status() === 'done',
    isFail: () => state.status() === 'fail',
    start: triggers.start,
    refresh: triggers.refresh,
    refetch: triggers.refetch,
    reset: triggers.reset,
    cancel: triggers.cancel,
  };
}
