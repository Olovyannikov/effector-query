import { is } from 'effector';
import { createBaseQuery } from './base-query';
import { cache, concurrency, retry } from './operators';
import type { CreateQueryConfig, CreateQueryHandlerConfig, Query, SourcedConfig } from './types';

/**
 * Build a query on top of a real effect, then apply the inline `concurrency` /
 * `retry` / `cache` options. Constants go through the standalone operators
 * (`concurrency()` / `retry()` / `cache()`); inline `Store` values are wired as
 * reactive, fork-correct sourced config.
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
  const c = config.concurrency;
  const r = config.retry;
  const ca = config.cache;

  // collect reactive (sourced) stores from inline options
  const sourced: SourcedConfig = {};
  if (is.store(c)) sourced.strategy = c;
  if (r != null && typeof r === 'object' && is.store(r.times)) sourced.retryTimes = r.times;
  if (ca != null && typeof ca === 'object' && is.store(ca.staleAfter)) sourced.staleAfter = ca.staleAfter;

  const query = createBaseQuery<Params, Result, Error, Mapped>(config, sourced);

  // constants via the standalone operators; sourced stores already wired above
  if (!is.store(c)) concurrency(query, { strategy: c ?? 'TAKE_LATEST' });
  if (r != null) retry(query, r);
  if (ca) cache(query, ca);

  return query;
}
