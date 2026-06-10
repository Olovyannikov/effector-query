import { is, merge, sample, type Store } from 'effector';
import { inMemoryCache } from './cache';
import { stableStringify } from './utils';
import type { Barrier } from './barrier';
import type { CacheConfig, ConcurrencyStrategy, DelayFn, Query, RetryConfig } from './types';

type AnyQuery = Query<any, any, any, any>;

/**
 * Set the concurrency strategy. Standalone & composable:
 *
 *   concurrency(searchQuery, { strategy: 'TAKE_LATEST' });
 *
 * `createQuery({ concurrency })` is sugar over this.
 */
export function concurrency<Q extends AnyQuery>(query: Q, opts: { strategy: ConcurrencyStrategy }): Q {
  query.__.setStrategy(opts.strategy);
  return query;
}

/**
 * Add retry behavior. `retry(query, 3)` or `retry(query, { times, delay, filter })`.
 * (A `Store<number>` for `times` is resolved to its current value at setup — sourced
 * retry is not reactive yet.)
 */
export function retry<Q extends AnyQuery>(query: Q, opts: number | RetryConfig<any>): Q {
  const cfg = typeof opts === 'number' ? { times: opts } : opts;
  const times = typeof cfg.times === 'number' ? cfg.times : (cfg.times as Store<number>).getState();
  const delay: DelayFn =
    cfg.delay == null ? () => 0 : typeof cfg.delay === 'number' ? () => cfg.delay as number : cfg.delay;
  query.__.setRetry({
    times,
    delay,
    filter: cfg.filter ?? (() => true),
    suppress: cfg.suppressIntermediateErrors ?? true,
  });
  return query;
}

/**
 * Add caching. `cache(query)` (in-memory) or `cache(query, { adapter, staleAfter, key, purge })`.
 */
export function cache<Q extends AnyQuery>(query: Q, opts: boolean | CacheConfig<any> = true): Q {
  if (opts === false) {
    query.__.setCache(null);
    return query;
  }
  const cfg = opts === true ? {} : opts;
  const staleAfter =
    cfg.staleAfter == null ? Infinity : is.store(cfg.staleAfter) ? cfg.staleAfter.getState() : cfg.staleAfter;
  query.__.setCache({
    adapter: cfg.adapter ?? inMemoryCache(),
    staleAfter,
    key: cfg.key ?? ((p: unknown) => stableStringify(p)),
    swr: cfg.swr ?? false,
    dedupe: cfg.dedupe ?? false,
  });
  if (typeof opts === 'object' && opts.purge && is.unit(opts.purge)) {
    sample({ clock: opts.purge, target: query.__.purgeFx });
  }
  return query;
}

/**
 * Set a per-attempt deadline (ms): the in-flight request is aborted and the run
 * fails (retryable) if it exceeds `ms`. `timeout(query, 5000)`. `0` disables it.
 *
 * `createQuery({ timeout })` is sugar over this; a `Store<number>` (reactive,
 * fork-correct) is only available through the inline option.
 */
export function timeout<Q extends AnyQuery>(query: Q, ms: number | Store<number>): Q {
  query.__.setTimeout(is.store(ms) ? ms.getState() : ms);
  return query;
}

/**
 * Refetch the query (with its last params) whenever a `source` store changes —
 * keeps the data fresh relative to external state (filters, locale, viewer, …):
 *
 *   keepFresh(productsQuery, { source: $filters });
 *
 * No-op until the query has run (`status !== 'initial'`) and while disabled.
 */
export function keepFresh<Q extends AnyQuery>(
  query: Q,
  config: { source: Store<unknown> | ReadonlyArray<Store<unknown>> },
): Q {
  const sources = Array.isArray(config.source) ? config.source : [config.source as Store<unknown>];
  const clock = sources.length === 1 ? sources[0] : merge(sources);
  type Snapshot = { params: unknown; status: string; enabled: boolean };
  sample({
    clock,
    source: { params: query.$params, status: query.$status, enabled: query.$enabled },
    filter: ({ status, enabled, params }: Snapshot) => status !== 'initial' && enabled && params != null,
    fn: ({ params }: Snapshot) => params,
    target: query.refetch,
  });
  return query;
}

/**
 * Gate a query/mutation on a barrier after it's been created — runs wait while
 * the barrier is locked (e.g. a 401 → token-refresh flow). The same effect as
 * the `barrier` config option, but composable onto an existing unit. Pass `null`
 * to detach.
 *
 *   const auth = createBarrier({ perform: refreshTokenFx });
 *   applyBarrier(userQuery, auth);
 */
export function applyBarrier<Q extends AnyQuery>(query: Q, barrier: Barrier | null): Q {
  query.__.setBarrier(barrier);
  return query;
}
