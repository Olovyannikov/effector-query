import { createStore, is, sample, type Effect, type Event, type StoreWritable } from 'effector';
import type { Mutation, Query } from './types';

// `Query.$data` is exposed as a read `Store`; at runtime it's the writable store
// `createQuery` owns, so patching it via `sample({ target })` is safe.
const writable = <T>(store: Query<any, any, any, T>['$data']): StoreWritable<T | null> =>
  store as unknown as StoreWritable<T | null>;

type DoneTrigger<P, R> = Query<P, any, any, R> | Mutation<P, any, any, R>;

export interface UpdateFromOperation<QM, P, R> {
  /** Query whose `$data` is patched. */
  query: Query<any, any, any, QM>;
  /** A Mutation or Query — patch runs on its success. */
  on: DoneTrigger<P, R>;
  /** Compute the new query data from current data + the trigger's result/params. */
  fn: (ctx: { data: QM | null; result: R; params: P }) => QM;
}

export interface UpdateFromEvent<QM, T> {
  query: Query<any, any, any, QM>;
  /** A raw Event or Effect — patch runs when it fires (effect: on success). */
  on: Event<T> | Effect<any, T, any>;
  fn: (ctx: { data: QM | null; payload: T }) => QM;
}

/**
 * Patch a query's `$data` directly from a mutation result — no refetch.
 *
 *   update({ query: todosQuery, on: addTodo, fn: ({ data, result }) => [...(data ?? []), result] });
 */
export function update<QM, P, R>(config: UpdateFromOperation<QM, P, R>): void;
export function update<QM, T>(config: UpdateFromEvent<QM, T>): void;
export function update(config: any): void {
  const { query, on, fn } = config;
  const $data: StoreWritable<any> = writable(query.$data);
  const isOperation = on && typeof on === 'object' && 'finished' in on;

  if (isOperation) {
    sample({
      clock: on.finished.done as Event<any>,
      source: $data,
      fn: (data: any, p: any) => fn({ data, result: p.result, params: p.params }),
      target: $data,
    });
    return;
  }

  const clock: Event<any> = is.effect(on) ? on.done : on;
  sample({
    clock,
    source: $data,
    fn: (data: any, payload: any) => fn({ data, payload }),
    target: $data,
  });
}

export interface OptimisticUpdateConfig<QM, P, R> {
  /** Query whose `$data` is patched optimistically. */
  query: Query<any, any, any, QM>;
  /** Mutation that drives the optimistic update. */
  on: Mutation<P, R, any, any>;
  /** Apply the optimistic value when the mutation starts. */
  update: (ctx: { data: QM | null; params: P }) => QM;
  /** Reconcile with the server result on success (defaults to keeping the optimistic value). */
  commit?: (ctx: { data: QM | null; result: R; params: P }) => QM;
  /** Roll back to the pre-mutation value on failure. Default: true. */
  rollbackOnFailure?: boolean;
}

/**
 * Optimistic update: patch `$data` immediately on mutation start, roll back on
 * failure, and optionally reconcile with the server result on success.
 *
 * Assumes effectively-serial mutations per query (the common case); heavily
 * interleaved concurrent mutations on the same query can clobber each other's
 * rollback snapshot.
 */
export function optimisticUpdate<QM, P, R>(config: OptimisticUpdateConfig<QM, P, R>): void {
  const { query, on, update: apply, commit, rollbackOnFailure = true } = config;

  // snapshot previous value, then apply the optimistic one (snapshot first)
  const $rollback = createStore<QM | null>(null, { skipVoid: false });
  sample({ clock: on.start, source: query.$data, target: $rollback });
  sample({
    clock: on.start,
    source: query.$data,
    fn: (data: QM | null, params: P) => apply({ data, params }),
    target: writable(query.$data),
  });

  if (rollbackOnFailure) {
    sample({ clock: on.finished.fail, source: $rollback, target: writable(query.$data) });
  }

  if (commit) {
    sample({
      clock: on.finished.done,
      source: query.$data,
      fn: (data: QM | null, p: { params: P; result: R }) =>
        commit({ data, result: p.result, params: p.params }),
      target: writable(query.$data),
    });
  }
}
