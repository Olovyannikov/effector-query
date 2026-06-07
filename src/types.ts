import type { Effect, Event, EventCallable, Store } from 'effector';

export type QueryStatus = 'initial' | 'pending' | 'done' | 'fail';

export type ConcurrencyStrategy = 'TAKE_LATEST' | 'TAKE_FIRST' | 'TAKE_EVERY';

/** Function computing the pause (ms) before retry attempt N (1-based). */
export type DelayFn = (attempt: number) => number;

export interface RetryConfig<Error = unknown> {
  /** Max retries after the first failure. */
  times: number | Store<number>;
  /** Pause before a retry, ms. A number, f(attempt), or linearDelay/exponentialDelay. */
  delay?: number | DelayFn;
  /** Whether to retry this particular failure. Default: always. */
  filter?: (ctx: { error: Error; attempt: number }) => boolean;
  /** Hide intermediate failures from $error/$status until the final one. Default: true. */
  suppressIntermediateErrors?: boolean;
}

export interface CacheEntry {
  value: unknown;
  storedAt: number;
}

export interface CacheAdapter {
  get(key: string): Promise<CacheEntry | null> | CacheEntry | null;
  set(key: string, value: unknown, storedAt: number): void | Promise<void>;
  remove(key: string): void | Promise<void>;
  purge(): void | Promise<void>;
}

export interface CacheConfig<Params = unknown> {
  /** Storage implementation. Default: inMemoryCache(). */
  adapter?: CacheAdapter;
  /** ms after which a cached entry is considered stale. Default: Infinity (never). */
  staleAfter?: number;
  /** Cache key from params. Default: stable JSON of params. */
  key?: (params: Params) => string;
  /** Event that clears the whole cache when fired. */
  purge?: Event<unknown>;
}

export interface CreateQueryConfig<Params, Result, Error, Mapped = Result> {
  /** Primary input: a real effector Effect. */
  effect: Effect<Params, Result, Error>;
  /** Initial $data value before the first success. */
  initialData?: Mapped;
  /** Gate: while false, start/refresh are skipped. */
  enabled?: Store<boolean>;
  /** Map a successful result before writing it to $data. */
  mapData?: (ctx: { result: Result; params: Params }) => Mapped;
  /** Normalize an error before writing it to $error. */
  mapError?: (ctx: { error: Error; params: Params }) => Error;

  retry?: number | RetryConfig<Error>;
  cache?: boolean | CacheConfig<Params>;
  concurrency?: ConcurrencyStrategy;

  /** Prefix for unit names (devtools). */
  name?: string;
}

/** Same as CreateQueryConfig but with a plain async handler instead of an Effect. */
export interface CreateQueryHandlerConfig<Params, Result, Error, Mapped = Result>
  extends Omit<CreateQueryConfig<Params, Result, Error, Mapped>, 'effect'> {
  handler: (params: Params) => Promise<Result> | Result;
}

export interface QueryFinished<Params, Result, Error> {
  done: Event<{ params: Params; result: Result }>;
  fail: Event<{ params: Params; error: Error }>;
  finally: Event<{ params: Params; status: 'done' | 'fail' }>;
}

/**
 * What `useUnit(query)` resolves to: store values + scope-bound triggers.
 * Declared as a type alias (not an interface) so it stays assignable to the
 * `Record<string, Unit>` shape that effector's `useUnit` overloads expect.
 */
export type QueryUnitShape<Params, Mapped, Error> = {
  data: Store<Mapped | null>;
  error: Store<Error | null>;
  status: Store<QueryStatus>;
  pending: Store<boolean>;
  stale: Store<boolean>;
  enabled: Store<boolean>;
  params: Store<Params | null>;
  start: EventCallable<Params>;
  refetch: EventCallable<Params>;
  refresh: EventCallable<Params>;
  reset: EventCallable<void>;
  cancel: EventCallable<void>;
};

export interface Query<Params, Result, Error, Mapped = Result> {
  // triggers
  start: EventCallable<Params>;
  /** Re-run, bypassing cache freshness. */
  refresh: EventCallable<Params>;
  /** Alias of `refresh`, for the familiar `refetch` name. */
  refetch: EventCallable<Params>;
  reset: EventCallable<void>;
  cancel: EventCallable<void>;

  // state
  $data: Store<Mapped | null>;
  $error: Store<Error | null>;
  $status: Store<QueryStatus>;
  $pending: Store<boolean>;
  $stale: Store<boolean>;
  $enabled: Store<boolean>;
  /** Last params the query ran with (null before first run). */
  $params: Store<Params | null>;

  // lifecycle
  finished: QueryFinished<Params, Mapped, Error>;
  aborted: Event<{ params: Params }>;

  /** Escape hatch — "based on real effects". */
  __: {
    effect: Effect<Params, Result, Error>;
    runFx: Effect<{ runId: number; params: Params }, any, Error>;
  };

  /**
   * effector `useUnit` protocol: `useUnit(query)` returns
   * `{ data, error, status, pending, stale, enabled, params, start, refetch, refresh, reset, cancel }`.
   * Works with both effector-react and effector-vue.
   */
  '@@unitShape': () => QueryUnitShape<Params, Mapped, Error>;
}

// ---- type-level helpers ----

export type ParamsOf<Q> = Q extends Query<infer P, any, any, any> ? P : never;
export type ResultOf<Q> = Q extends Query<any, any, any, infer M> ? M : never;
export type ErrorOf<Q> = Q extends Query<any, any, infer E, any> ? E : never;
