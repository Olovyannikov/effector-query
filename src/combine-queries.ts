import { combine, type Store } from 'effector';
import type { Query, QueryStatus } from './types';

type AnyQuery = Query<any, any, any, any>;
type DataOf<Q> = Q extends Query<any, any, any, infer M> ? M | null : never;

export interface CombinedQueries<Q extends ReadonlyArray<AnyQuery>> {
  /** Per-query data, in order (tuple of `Mapped | null`). */
  $data: Store<{ [K in keyof Q]: DataOf<Q[K]> }>;
  $statuses: Store<QueryStatus[]>;
  $errors: Store<unknown[]>;
  /** True if any query is pending. */
  $pending: Store<boolean>;
  /** True if any query has failed. */
  $isError: Store<boolean>;
  /** True if every query has succeeded. */
  $isSuccess: Store<boolean>;
}

/**
 * Aggregate several queries into combined stores — the effector-flavored `useQueries`.
 * The queries stay independent (start them as usual); this just reads their combined state.
 *
 *   const { $data, $pending } = combineQueries([userQuery, postsQuery]);
 */
export function combineQueries<Q extends ReadonlyArray<AnyQuery>>(queries: Q): CombinedQueries<Q> {
  const $data = combine(queries.map((q) => q.$data)) as Store<{ [K in keyof Q]: DataOf<Q[K]> }>;
  const $statuses = combine(queries.map((q) => q.$status)) as Store<QueryStatus[]>;
  const $errors = combine(queries.map((q) => q.$error)) as Store<unknown[]>;
  const $pending = combine(queries.map((q) => q.$pending)).map((ps) => ps.some(Boolean));
  const $isError = $statuses.map((ss) => ss.some((s) => s === 'fail'));
  const $isSuccess = $statuses.map((ss) => ss.length > 0 && ss.every((s) => s === 'done'));

  return { $data, $statuses, $errors, $pending, $isError, $isSuccess };
}
