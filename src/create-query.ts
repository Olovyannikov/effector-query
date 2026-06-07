import { createBaseQuery } from './base-query';
import { cache, concurrency, retry } from './operators';
import type { CreateQueryConfig, CreateQueryHandlerConfig, Query } from './types';

/**
 * Build a query on top of a real effect, then apply the inline `concurrency` /
 * `retry` / `cache` options as operators. The options are pure sugar over the
 * standalone `concurrency()` / `retry()` / `cache()` operators — use those
 * directly for composition or post-hoc configuration.
 */
export function createQuery<Params, Result, Error = unknown, Mapped = Result>(
  config: CreateQueryConfig<Params, Result, Error, Mapped>,
): Query<Params, Result, Error, Mapped>;
export function createQuery<Params, Result, Error = unknown, Mapped = Result>(
  config: CreateQueryHandlerConfig<Params, Result, Error, Mapped>,
): Query<Params, Result, Error, Mapped>;
export function createQuery<Params, Result, Error = unknown, Mapped = Result>(
  config:
    | CreateQueryConfig<Params, Result, Error, Mapped>
    | CreateQueryHandlerConfig<Params, Result, Error, Mapped>,
): Query<Params, Result, Error, Mapped> {
  const query = createBaseQuery<Params, Result, Error, Mapped>(config);

  concurrency(query, { strategy: config.concurrency ?? 'TAKE_LATEST' });
  if (config.retry != null) retry(query, config.retry);
  if (config.cache) cache(query, config.cache);

  return query;
}
