import { is, sample, type Store } from 'effector';
import { inMemoryCache } from './cache';
import { stableStringify } from './utils';
import type {
  CacheConfig,
  ConcurrencyStrategy,
  DelayFn,
  Query,
  RetryConfig,
} from './types';

type AnyQuery = Query<any, any, any, any>;

/**
 * Set the concurrency strategy. Standalone & composable:
 *
 *   concurrency(searchQuery, { strategy: 'TAKE_LATEST' });
 *
 * `createQuery({ concurrency })` is sugar over this.
 */
export function concurrency<Q extends AnyQuery>(
  query: Q,
  opts: { strategy: ConcurrencyStrategy },
): Q {
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
    cfg.delay == null
      ? () => 0
      : typeof cfg.delay === 'number'
        ? () => cfg.delay as number
        : cfg.delay;
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
