import { useUnit } from 'effector-react';
import type { Query, QueryStatus } from './types';

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
