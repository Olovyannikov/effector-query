import {
  combine,
  createEffect,
  createEvent,
  createStore,
  merge,
  sample,
  type Effect,
  type EventCallable,
} from 'effector';

import type {
  ConcurrencyStrategy,
  CreateQueryConfig,
  CreateQueryHandlerConfig,
  Query,
  QueryStatus,
  ResolvedCache,
  ResolvedRetry,
} from './types';

interface Run<P> {
  runId: number;
  params: P;
}
interface ExecDone<P, R> extends Run<P> {
  result: R;
}

/**
 * The engine. Contains ALL machinery (concurrency / retry / cache) always, driven
 * by mutable config set through `__.setStrategy/setRetry/setCache`. Operators flip
 * that config at setup time (before any `fork`), so they compose and can even be
 * applied after creation. Filters/handlers read the live config at run time.
 */
export function createBaseQuery<Params, Result, Error = unknown, Mapped = Result>(
  config:
    | CreateQueryConfig<Params, Result, Error, Mapped>
    | CreateQueryHandlerConfig<Params, Result, Error, Mapped>,
): Query<Params, Result, Error, Mapped> {
  const effect =
    'effect' in config
      ? config.effect
      : (createEffect(config.handler) as Effect<Params, Result, Error>);

  const isAbortable = (effect as { __abortable?: boolean }).__abortable === true;
  const callEffect = (params: Params, signal: AbortSignal): Promise<Result> =>
    isAbortable
      ? (effect as (a: { params: Params; signal: AbortSignal }) => Promise<Result>)({ params, signal })
      : (effect as (p: Params) => Promise<Result>)(params);

  const mapData = config.mapData ?? (({ result }) => result as unknown as Mapped);
  const mapError = config.mapError ?? (({ error }) => error);

  // ---- live, operator-configurable engine state ----
  let strategy: ConcurrencyStrategy = 'TAKE_LATEST';
  let retryCfg: ResolvedRetry<Error> | null = null;
  let cacheCfg: ResolvedCache<Params> | null = null;

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

  const sleepFx = createEffect<{ ms: number; payload: unknown }, unknown>(
    ({ ms, payload }) => new Promise((res) => setTimeout(() => res(payload), ms)),
  );

  const controllers = new Set<AbortController>();
  const abortInFlightFx = createEffect(() => {
    controllers.forEach((c) => c.abort());
    controllers.clear();
  });

  const runFx = createEffect<Run<Params>, ExecDone<Params, Result>, Error>(async ({ runId, params }) => {
    if (!isAbortable) {
      const result = await callEffect(params, new AbortController().signal);
      return { runId, params, result };
    }
    const controller = new AbortController();
    controllers.add(controller);
    try {
      const result = await callEffect(params, controller.signal);
      return { runId, params, result };
    } finally {
      controllers.delete(controller);
    }
  });

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

  // concurrency gate (TAKE_FIRST drops while busy) — strategy read live
  const proceed = createEvent<{ params: Params; fresh: boolean }>();
  sample({
    clock: allowed,
    source: runFx.pending,
    filter: (busy) => !(strategy === 'TAKE_FIRST' && busy),
    fn: (_b, r) => r,
    target: proceed,
  });
  sample({
    clock: allowed,
    source: runFx.pending,
    filter: (busy) => strategy === 'TAKE_FIRST' && busy,
    fn: (_b, r) => ({ params: r.params }),
    target: aborted,
  });

  // cache lookup / exec branch — cacheCfg read live; when null, behaves as no-cache
  const toExec = createEvent<{ params: Params }>();
  const cacheHit = createEvent<{ params: Params; result: Result }>();
  const acceptedDone = createEvent<{ params: Params; result: Result }>();

  const lookupFx = createEffect(async (params: Params) => {
    const cfg = cacheCfg;
    if (!cfg) return { entry: null, params, fresh: false };
    const entry = await cfg.adapter.get(cfg.key(params));
    const fresh = entry != null && Date.now() - entry.storedAt < cfg.staleAfter;
    return { entry, params, fresh };
  });
  // no cache (or refresh) -> straight to exec
  sample({
    clock: proceed,
    filter: (r) => !cacheCfg || r.fresh,
    fn: (r) => ({ params: r.params }),
    target: toExec,
  });
  // cache present & not refresh -> lookup
  sample({ clock: proceed, filter: (r) => !!cacheCfg && !r.fresh, fn: (r) => r.params, target: lookupFx });
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

  const setFx = createEffect((p: { params: Params; result: Result }) => {
    const cfg = cacheCfg;
    if (cfg) cfg.adapter.set(cfg.key(p.params), p.result, Date.now());
  });
  sample({ clock: acceptedDone, filter: () => !!cacheCfg, target: setFx });

  const purgeFx = createEffect(() => {
    cacheCfg?.adapter.purge();
  });

  // tag with a fresh runId, reset attempts, then execute the real effect
  const tagged = sample({
    clock: toExec,
    source: $runId,
    fn: (id, r): Run<Params> => ({ runId: id + 1, params: r.params }),
  });
  $runId.on(tagged, (_id, t) => t.runId);
  $attempts.on(tagged, () => 0);
  // TAKE_LATEST: abort the superseded in-flight request before the new one starts
  // (registered before the runFx trigger so it fires first).
  sample({ clock: tagged, filter: () => strategy === 'TAKE_LATEST', target: abortInFlightFx });
  sample({ clock: tagged, target: runFx });

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
  const willRetry = (lastId: number, attempts: number, runId: number, error: Error) =>
    !!retryCfg &&
    isCurrent(lastId, runId) &&
    attempts < retryCfg.times &&
    retryCfg.filter({ error, attempt: attempts + 1 });

  const scheduleRetry = createEvent<Run<Params> & { error: Error }>();
  const finalFail = createEvent<{ params: Params; error: Error }>();
  const intermediateFail = createEvent<{ params: Params; error: Error }>();

  sample({
    clock: runFx.fail,
    source: { lastId: $runId, attempts: $attempts },
    filter: ({ lastId, attempts }, { params, error }) => willRetry(lastId, attempts, params.runId, error),
    fn: (_s, { params, error }) => ({ runId: params.runId, params: params.params, error }),
    target: scheduleRetry,
  });
  sample({
    clock: runFx.fail,
    source: { lastId: $runId, attempts: $attempts },
    filter: ({ lastId, attempts }, { params, error }) =>
      isCurrent(lastId, params.runId) && !willRetry(lastId, attempts, params.runId, error),
    fn: (_s, { params, error }) => ({ params: params.params, error }),
    target: finalFail,
  });
  sample({
    clock: runFx.fail,
    source: $runId,
    filter: (lastId, { params }) => !isCurrent(lastId, params.runId),
    fn: (_id, { params }) => ({ params: params.params }),
    target: aborted,
  });

  // retry: bump attempts, wait, re-run the same runId (unless superseded meanwhile)
  $attempts.on(scheduleRetry, (n) => n + 1);
  $retrying.on(scheduleRetry, () => true);
  sample({
    clock: scheduleRetry,
    source: $attempts,
    fn: (attempt, s): { ms: number; payload: unknown } => ({
      ms: (retryCfg?.delay ?? (() => 0))(attempt),
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

  // surface intermediate (retried) failures only when suppression is off
  sample({
    clock: scheduleRetry,
    filter: () => !!retryCfg && retryCfg.suppress === false,
    fn: ({ params, error }) => ({ params, error }),
    target: intermediateFail,
  });

  // ---- invalidation ----
  const invalidate = merge([reset, cancel]);
  $runId.on(invalidate, (id) => id + 1);
  $retrying.reset(invalidate);
  sample({ clock: invalidate, target: abortInFlightFx });

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
    .on(intermediateFail, (_e, { params, error }) => mapError({ error, params }))
    .reset([tagged, acceptedDone, cacheHit, reset]);

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
  sample({ clock: finishedDone, fn: ({ params }) => ({ params, status: 'done' as const }), target: finishedFinally });
  sample({ clock: finishedFail, fn: ({ params }) => ({ params, status: 'fail' as const }), target: finishedFinally });

  const refetch = refresh;

  return {
    start: start as EventCallable<Params>,
    refresh: refresh as EventCallable<Params>,
    refetch: refetch as EventCallable<Params>,
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

    __: {
      effect,
      runFx,
      purgeFx,
      setStrategy: (s) => {
        strategy = s;
      },
      setRetry: (cfg) => {
        retryCfg = cfg;
      },
      setCache: (cfg) => {
        cacheCfg = cfg;
      },
    },

    '@@unitShape': () => ({
      data: $data,
      error: $error,
      status: $status,
      pending: $pending,
      stale: $stale,
      enabled: $enabled,
      params: $params,
      start: start as EventCallable<Params>,
      refetch: refetch as EventCallable<Params>,
      refresh: refresh as EventCallable<Params>,
      reset,
      cancel,
    }),
  };
}
