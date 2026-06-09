import type { Query } from './types';

/**
 * Read a query's current data imperatively (no-scope store — for a single client
 * app; in scoped code read `scope.getState(query.$data)` instead).
 */
export function getQueryData<Params, Result, Error, Mapped>(
  query: Query<Params, Result, Error, Mapped>,
): Mapped | null {
  return query.$data.getState();
}

/**
 * Write a query's `$data` imperatively — a value or an updater `(prev) => next`.
 * Useful for optimistic edits outside the `update` / `optimisticUpdate` operators.
 *
 *   setQueryData(todosQuery, (todos) => [...(todos ?? []), newTodo]);
 */
export function setQueryData<Params, Result, Error, Mapped>(
  query: Query<Params, Result, Error, Mapped>,
  updater: (Mapped | null) | ((prev: Mapped | null) => Mapped | null),
): void {
  const next =
    typeof updater === 'function'
      ? (updater as (prev: Mapped | null) => Mapped | null)(query.$data.getState())
      : updater;
  query.__.setData(next);
}
