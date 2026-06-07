import {
  combine,
  createEffect,
  createEvent,
  createStore,
  merge,
  sample,
  type Effect,
  type EventCallable,
  type Store,
} from 'effector';

import { inMemoryCache } from './cache';
import { stableStringify } from './utils';
import type {
  CacheConfig,
  ConcurrencyStrategy,
  CreateQueryConfig,
  CreateQueryHandlerConfig,
  DelayFn,
  Query,
  QueryStatus,
  RetryConfig,
} from './types';

// internal payloads
interface Run<P> {
  runId: number;
  params: P;
}
interface ExecDone<P, R> extends Run<P> {
  result: R;
}

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
  // ---- resolve config ----
  const effect: Effect<Params, Result, Error> =
    'effect' in config
      ? config.effect
      : (createEffect(config.handler) as Effect<Params, Result, Error>);

  const strategy: ConcurrencyStrategy = config.concurrency ?? 'TAKE_LATEST';

  const mapData = config.mapData ?? (({ result }) => result as unknown as Mapped);
  const mapError = config.mapError ?? (({ error }) => error);

  // retry
  const retryCfg: RetryConfig<Error> | null =
    config.retry == null
      ? null
      : typeof config.retry === 'number'
        ? { times: config.retry }
        : config.retry;
  const $times: Store<number> = retryCfg
    ? typeof retryCfg.times === 'number'
      ? createStore(retryCfg.times)
      : retryCfg.times
    : createStore(0);
  const delayFn: DelayFn =
    retryCfg && retryCfg.delay != null
      ? typeof retryCfg.delay === 'number'
        ? () => retryCfg.delay as number
        : retryCfg.delay
      : () => 0;
  const retryFilter = retryCfg?.filter ?? (() => true);
  const suppressIntermediate = retryCfg?.suppressIntermediateErrors ?? true;

  // cache
  const cacheCfg: Required<Pick<CacheConfig<Params>, 'adapter' | 'staleAfter' | 'key'>> | null =
    config.cache == null || config.cache === false
      ? null
      : {
          adapter:
            config.cache === true ? inMemoryCache() : config.cache.adapter ?? inMemoryCache(),
          staleAfter: config.cache === true ? Infinity : config.cache.staleAfter ?? Infinity,
          key:
            config.cache === true
              ? (p: Params) => stableStringify(p)
              : config.cache.key ?? ((p: Params) => stableStringify(p)),
        };
  const cachePurge = typeof config.cache === 'object' ? config.cache.purge : undefined;

  // ---- public units ----
  const start = createEvent<Params>();
  const refresh = createEvent<Params>();
  const reset = createEvent<void>();
  const cancel = createEvent<void>();

  const $enabled = config.enabled ?? createStore(true);
  const $data = createStore<Mapped | null>(config.initialData ?? null);
  const $error = createStore<Error | null>(null);
  const $status = createStore<QueryStatus>('initial');
  const $stale = createStore(false);
  const $params = createStore<Params | null>(null);

  const aborted = createEvent<{ params: Params }>();
  const finishedDone = createEvent<{ params: Params; result: Mapped }>();
  const finishedFail = createEvent<{ params: Params; error: Error }>();
  const finishedFinally = createEvent<{ params: Params; status: 'done' | 'fail' }>();

  // ---- internal units ----
  const $runId = createStore(0);
  const $attempts = createStore(0);
  const $retrying = createStore(false);

  // per-instance retry delay effect (must not be shared across queries)
  const sleepFx = createEffect<{ ms: number; payload: unknown }, unknown>(
    ({ ms, payload }) => new Promise((res) => setTimeout(() => res(payload), ms)),
  );

  // execFx wraps the *real* effect, carrying runId so we can detect stale results.
  const runFx = createEffect<Run<Params>, ExecDone<Params, Result>, Error>(
    async ({ runId, params }) => {
      const result = await effect(params); // runs the user effect within the current scope
      return { runId, params, result };
    },
  );

  const requested = createEvent<{ params: Params; fresh: boolean }>();
  sample({ clock: start, fn: (params) => ({ params, fresh: false }), target: requested });
  sample({ clock: refresh, fn: (params) => ({ params, fresh: true }), target: requested });

  // enabled gate
  const allowed = sample({
    clock: requested,
    source: $enabled,
    filter: (enabled) => enabled,
    fn: (_e, r) => r,
  });
  sample({
    clock: requested,
    source: $enabled,
    filter: (enabled) => !enabled,
    fn: (_e, r) => ({ params: r.params }),
    target: aborted,
  });

  // concurrency gate (TAKE_FIRST drops while busy)
  const proceed = createEvent<{ params: Params; fresh: boolean }>();
  if (strategy === 'TAKE_FIRST') {
    sample({ clock: allowed, source: runFx.pending, filter: (busy) => !busy, fn: (_b, r) => r, target: proceed });
    sample({
      clock: allowed,
      source: runFx.pending,
      filter: (busy) => busy,
      fn: (_b, r) => ({ params: r.params }),
      target: aborted,
    });
  } else {
    sample({ clock: allowed, target: proceed });
  }

  // cache lookup / exec branch
  const toExec = createEvent<{ params: Params }>();
  const cacheHit = createEvent<{ params: Params; result: Result }>();
  // accepted (current-runId) success — declared early so the cache write-through can subscribe
  const acceptedDone = createEvent<{ params: Params; result: Result }>();

  if (cacheCfg) {
    // refresh bypasses the freshness check
    sample({ clock: proceed, filter: (r) => r.fresh, fn: (r) => ({ params: r.params }), target: toExec });

    const lookupFx = createEffect(async (params: Params) => {
      const entry = await cacheCfg.adapter.get(cacheCfg.key(params));
      const fresh = entry != null && Date.now() - entry.storedAt < cacheCfg.staleAfter;
      return { entry, params, fresh };
    });
    sample({ clock: proceed, filter: (r) => !r.fresh, fn: (r) => r.params, target: lookupFx });
    sample({
      clock: lookupFx.doneData,
      filter: ({ fresh }) => fresh,
      fn: ({ entry, params }) => ({ params, result: (entry as { value: Result }).value }),
      target: cacheHit,
    });
    sample({
      clock: lookupFx.doneData,
      filter: ({ fresh }) => !fresh,
      fn: ({ params }) => ({ params }),
      target: toExec,
    });

    // write through on success
    const setFx = createEffect((p: { params: Params; result: Result }) =>
      cacheCfg.adapter.set(cacheCfg.key(p.params), p.result, Date.now()),
    );
    sample({ clock: acceptedDone, target: setFx });

    if (cachePurge) {
      const purgeFx = createEffect(() => cacheCfg.adapter.purge());
      sample({ clock: cachePurge, target: purgeFx });
    }
  } else {
    sample({ clock: proceed, fn: (r) => ({ params: r.params }), target: toExec });
  }

  // tag with a fresh runId, reset attempts, then execute the real effect
  const tagged = sample({
    clock: toExec,
    source: $runId,
    fn: (id, r): Run<Params> => ({ runId: id + 1, params: r.params }),
  });
  $runId.on(tagged, (_id, t) => t.runId);
  $attempts.on(tagged, () => 0);
  sample({ clock: tagged, target: runFx });

  // record params on each accepted run / cache hit
  // (coalesce undefined -> null so void-param queries don't trip effector's skip-update guard)
  $params.on(tagged, (_p, t) => t.params ?? null);
  $params.on(cacheHit, (_p, h) => h.params ?? null);

  // ---- result acceptance (concurrency) ----
  const isCurrent = (lastId: number, runId: number) =>
    strategy === 'TAKE_EVERY' ? true : runId === lastId;

  sample({
    clock: runFx.done,
    source: $runId,
    filter: (lastId, { result }) => isCurrent(lastId, result.runId),
    fn: (_id, { result }) => ({ params: result.params, result: result.result }),
    target: acceptedDone,
  });
  sample({
    clock: runFx.done,
    source: $runId,
    filter: (lastId, { result }) => !isCurrent(lastId, result.runId),
    fn: (_id, { result }) => ({ params: result.params }),
    target: aborted,
  });

  // ---- failure / retry ----
  const willRetry = (lastId: number, attempts: number, times: number, runId: number, error: Error) =>
    isCurrent(lastId, runId) && attempts < times && retryFilter({ error, attempt: attempts + 1 });

  const scheduleRetry = createEvent<Run<Params> & { error: Error }>();
  const finalFail = createEvent<{ params: Params; error: Error }>();

  sample({
    clock: runFx.fail,
    source: { lastId: $runId, attempts: $attempts, times: $times },
    filter: ({ lastId, attempts, times }, { params, error }) =>
      willRetry(lastId, attempts, times, params.runId, error),
    fn: (_s, { params, error }) => ({ runId: params.runId, params: params.params, error }),
    target: scheduleRetry,
  });
  sample({
    clock: runFx.fail,
    source: { lastId: $runId, attempts: $attempts, times: $times },
    filter: ({ lastId, attempts, times }, { params, error }) =>
      isCurrent(lastId, params.runId) && !willRetry(lastId, attempts, times, params.runId, error),
    fn: (_s, { params, error }) => ({ params: params.params, error }),
    target: finalFail,
  });
  // stale failure (superseded run) -> aborted
  sample({
    clock: runFx.fail,
    source: $runId,
    filter: (lastId, { params }) => !isCurrent(lastId, params.runId),
    fn: (_id, { params }) => ({ params: params.params }),
    target: aborted,
  });

  // retry: wait, then re-run the same runId (unless superseded meanwhile)
  $attempts.on(scheduleRetry, (n) => n + 1);
  $retrying.on(scheduleRetry, () => true);
  sample({
    clock: scheduleRetry,
    source: $attempts,
    fn: (attempt, s): { ms: number; payload: unknown } => ({
      ms: delayFn(attempt),
      payload: { runId: s.runId, params: s.params } as Run<Params>,
    }),
    target: sleepFx,
  });
  sample({
    clock: sleepFx.doneData,
    source: $runId,
    filter: (lastId, payload) => isCurrent(lastId, (payload as Run<Params>).runId),
    fn: (_id, payload) => payload as Run<Params>,
    target: runFx,
  });
  $retrying.reset(sleepFx.done);

  // ---- invalidation ----
  const invalidate = merge([reset, cancel]);
  $runId.on(invalidate, (id) => id + 1);
  $retrying.reset(invalidate);

  // ---- state stores ----
  $status
    .on(tagged, () => 'pending' as const)
    .on(acceptedDone, () => 'done' as const)
    .on(cacheHit, () => 'done' as const)
    .on(finalFail, () => 'fail' as const)
    .reset(reset);

  $data
    .on(acceptedDone, (_d, { params, result }) => mapData({ result, params }))
    .on(cacheHit, (_d, { params, result }) => mapData({ result, params }))
    .reset(reset);

  $error
    .on(finalFail, (_e, { params, error }) => mapError({ error, params }))
    .reset([tagged, acceptedDone, cacheHit, reset]);
  if (!suppressIntermediate) {
    // surface intermediate (retried) failures too
    $error.on(scheduleRetry, (_e, { params, error }) => mapError({ error, params }));
  }

  $stale.on(acceptedDone, () => false).on(cacheHit, () => false).reset(reset);

  const $pending = combine(runFx.pending, $retrying, (p, r) => p || r);

  // ---- finished / lifecycle wiring ----
  sample({
    clock: acceptedDone,
    fn: ({ params, result }) => ({ params, result: mapData({ result, params }) }),
    target: finishedDone,
  });
  sample({
    clock: cacheHit,
    fn: ({ params, result }) => ({ params, result: mapData({ result, params }) }),
    target: finishedDone,
  });
  sample({
    clock: finalFail,
    fn: ({ params, error }) => ({ params, error: mapError({ error, params }) }),
    target: finishedFail,
  });
  sample({
    clock: finishedDone,
    fn: ({ params }) => ({ params, status: 'done' as const }),
    target: finishedFinally,
  });
  sample({
    clock: finishedFail,
    fn: ({ params }) => ({ params, status: 'fail' as const }),
    target: finishedFinally,
  });

  return {
    start: start as EventCallable<Params>,
    refresh: refresh as EventCallable<Params>,
    reset,
    cancel,

    $data,
    $error,
    $status,
    $pending,
    $stale,
    $enabled,
    $params,

    finished: { done: finishedDone, fail: finishedFail, finally: finishedFinally },
    aborted,

    __: { effect, runFx },
  };
}
