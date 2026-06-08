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

import type {
  ConcurrencyStrategy,
  CreateQueryConfig,
  CreateQueryHandlerConfig,
  Query,
  QueryStatus,
  ResolvedCache,
  ResolvedRetry,
  SourcedConfig,
} from './types';
import { ValidationError } from './validation';

interface Run<P> {
  runId: number;
  params: P;
}
interface ExecDone<P, R> extends Run<P> {
  result: R;
}

/**
 * The engine. Contains ALL machinery (concurrency / retry / cache) always.
 *
 * Config is read fork-correctly through two layers:
 *  - reactive "sourced" stores ($strategySrc / $retryTimesSrc / $staleAfterSrc) —
 *    either the user's own Store (passed by `createQuery` for inline `Store` options)
 *    or a `createStore(null)` placeholder;
 *  - constant closures (strategyConst / retryTimesConst / staleAfterConst + retryRef /
 *    cacheRef) set by the standalone operators (post-hoc, fork-safe because config is
 *    global, not scoped state).
 *
 * Effective value = sourcedStoreValue ?? constant.
 */
export function createBaseQuery<Params, Result, Error = unknown, Mapped = Result>(
  config:
    | CreateQueryConfig<Params, Result, Error, Mapped>
    | CreateQueryHandlerConfig<Params, Result, Error, Mapped>,
  sourced: SourcedConfig = {},
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

  // devtools labelling: name the public units when a `name` (or `debug`) is given
  const ns = config.name ?? (config.debug ? 'query' : undefined);
  const nm = (suffix: string) => (ns ? { name: `${ns}.${suffix}` } : undefined);
  const evName = (suffix: string): string | undefined => (ns ? `${ns}.${suffix}` : undefined);

  // ---- config: reactive sourced stores (fork-correct) + constant closures ----
  const $strategySrc: Store<ConcurrencyStrategy | null> =
    sourced.strategy ?? createStore<ConcurrencyStrategy | null>(null);
  const $retryTimesSrc: Store<number | null> = sourced.retryTimes ?? createStore<number | null>(null);
  const $staleAfterSrc: Store<number | null> = sourced.staleAfter ?? createStore<number | null>(null);

  let strategyConst: ConcurrencyStrategy = 'TAKE_LATEST';
  let retryTimesConst = 0;
  let staleAfterConst = Infinity;
  let retryRef: { delay: ResolvedRetry<Error>['delay']; filter: ResolvedRetry<Error>['filter']; suppress: boolean } | null =
    null;
  let cacheRef:
    | { adapter: ResolvedCache<Params>['adapter']; key: (p: Params) => string; swr: boolean; dedupe: boolean }
    | null = null;
  // keys with a request currently in flight (for dedupe coalescing)
  const inflightKeys = new Set<string>();
  const dedupeKey = (params: Params): string | null =>
    cacheRef && cacheRef.dedupe ? cacheRef.key(params) : null;
  let validateRef: ((result: unknown, params: Params) => string[] | null) | null = null;

  const swrOf = () => !!cacheRef && cacheRef.swr;
  const stratOf = (v: ConcurrencyStrategy | null): ConcurrencyStrategy => v ?? strategyConst;
  const timesOf = (v: number | null): number => v ?? retryTimesConst;
  const staleOf = (v: number | null): number => v ?? staleAfterConst;
  const isCurrent = (strategy: ConcurrencyStrategy, lastId: number, runId: number) =>
    strategy === 'TAKE_EVERY' ? true : runId === lastId;

  // ---- public units ----
  const start = createEvent<Params>(evName('start'));
  const refresh = createEvent<Params>(evName('refresh'));
  const reset = createEvent<void>(evName('reset'));
  const cancel = createEvent<void>(evName('cancel'));

  const $enabled = config.enabled ?? createStore(true);
  const $data = createStore<Mapped | null>(config.initialData ?? null, nm('$data'));
  const $error = createStore<Error | null>(null, nm('$error'));
  const $status = createStore<QueryStatus>('initial', nm('$status'));
  const $stale = createStore(false, nm('$stale'));
  const $params = createStore<Params | null>(null, nm('$params'));

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

  const runFx = createEffect<Run<Params>, ExecDone<Params, Result>, Error>({
    name: ns ? `${ns}.runFx` : undefined,
    handler: async ({ runId, params }) => {
    const key = dedupeKey(params);
    if (key) inflightKeys.add(key);
    const controller = isAbortable ? new AbortController() : null;
    if (controller) controllers.add(controller);
    try {
      const result = await callEffect(params, controller?.signal ?? new AbortController().signal);
      return { runId, params, result };
    } finally {
      if (key) inflightKeys.delete(key);
      if (controller) controllers.delete(controller);
    }
    },
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

  // concurrency gate (TAKE_FIRST drops while busy) — strategy sourced
  const proceed = createEvent<{ params: Params; fresh: boolean }>();
  sample({
    clock: allowed,
    source: { busy: runFx.pending, strat: $strategySrc },
    filter: ({ busy, strat }) => !(stratOf(strat) === 'TAKE_FIRST' && busy),
    fn: (_s, r) => r,
    target: proceed,
  });
  sample({
    clock: allowed,
    source: { busy: runFx.pending, strat: $strategySrc },
    filter: ({ busy, strat }) => stratOf(strat) === 'TAKE_FIRST' && busy,
    fn: (_s, r) => ({ params: r.params }),
    target: aborted,
  });

  // cache lookup / exec branch — presence via cacheRef, staleAfter sourced
  const toExec = createEvent<{ params: Params }>();
  const cacheHit = createEvent<{ params: Params; result: Result }>();
  // current-run success, before validation (carries runId for the retry path)
  const rawDone = createEvent<{ runId: number; params: Params; result: Result }>();
  // validated success — drives $data, cache write, finished.done
  const acceptedDone = createEvent<{ params: Params; result: Result }>();
  // SWR: a stale cache entry served immediately while a background refetch runs
  const staleServe = createEvent<{ params: Params; result: Result }>();

  const lookupFx = createEffect(async ({ params, staleAfter }: { params: Params; staleAfter: number }) => {
    const cfg = cacheRef;
    if (!cfg) return { entry: null, params, fresh: false };
    const entry = await cfg.adapter.get(cfg.key(params));
    const fresh = entry != null && Date.now() - entry.storedAt < staleAfter;
    return { entry, params, fresh };
  });
  sample({
    clock: proceed,
    filter: (r) => !cacheRef || r.fresh,
    fn: (r) => ({ params: r.params }),
    target: toExec,
  });
  sample({
    clock: proceed,
    source: $staleAfterSrc,
    filter: (_s, r) => !!cacheRef && !r.fresh,
    fn: (s, r) => ({ params: r.params, staleAfter: staleOf(s) }),
    target: lookupFx,
  });
  sample({
    clock: lookupFx.doneData,
    filter: ({ fresh }) => fresh,
    fn: ({ entry, params }) => ({ params, result: (entry as { value: Result }).value }),
    target: cacheHit,
  });
  // SWR: stale entry present -> serve it now AND revalidate in the background
  sample({
    clock: lookupFx.doneData,
    filter: ({ fresh, entry }) => !fresh && entry != null && swrOf(),
    fn: ({ entry, params }) => ({ params, result: (entry as { value: Result }).value }),
    target: staleServe,
  });
  sample({
    clock: lookupFx.doneData,
    filter: ({ fresh, entry }) => !fresh && entry != null && swrOf(),
    fn: ({ params }) => ({ params }),
    target: toExec,
  });
  // miss, or stale without SWR -> just execute
  sample({
    clock: lookupFx.doneData,
    filter: ({ fresh, entry }) => !fresh && !(entry != null && swrOf()),
    fn: ({ params }) => ({ params }),
    target: toExec,
  });

  const setFx = createEffect((p: { params: Params; result: Result }) => {
    const cfg = cacheRef;
    if (cfg) cfg.adapter.set(cfg.key(p.params), p.result, Date.now());
  });
  sample({ clock: acceptedDone, filter: () => !!cacheRef, target: setFx });

  const purgeFx = createEffect(() => {
    cacheRef?.adapter.purge();
  });

  // dedupe gate: drop a run whose key is already in flight (coalesce)
  const toRun = createEvent<{ params: Params }>();
  sample({
    clock: toExec,
    filter: (r) => {
      const key = dedupeKey(r.params);
      return !key || !inflightKeys.has(key);
    },
    target: toRun,
  });

  // tag with a fresh runId, reset attempts, then execute the real effect
  const tagged = sample({
    clock: toRun,
    source: $runId,
    fn: (id, r): Run<Params> => ({ runId: id + 1, params: r.params }),
  });
  $runId.on(tagged, (_id, t) => t.runId);
  $attempts.on(tagged, () => 0);
  // TAKE_LATEST: abort the superseded in-flight request before the new one starts
  sample({ clock: tagged, source: $strategySrc, filter: (s) => stratOf(s) === 'TAKE_LATEST', target: abortInFlightFx });
  sample({ clock: tagged, target: runFx });

  $params.on(tagged, (_p, t) => t.params ?? null);
  $params.on(cacheHit, (_p, h) => h.params ?? null);

  // ---- result acceptance (concurrency) ----
  sample({
    clock: runFx.done,
    source: { lastId: $runId, strat: $strategySrc },
    filter: ({ lastId, strat }, { result }) => isCurrent(stratOf(strat), lastId, result.runId),
    fn: (_s, { result }) => ({ runId: result.runId, params: result.params, result: result.result }),
    target: rawDone,
  });
  sample({
    clock: runFx.done,
    source: { lastId: $runId, strat: $strategySrc },
    filter: ({ lastId, strat }, { result }) => !isCurrent(stratOf(strat), lastId, result.runId),
    fn: (_s, { result }) => ({ params: result.params }),
    target: aborted,
  });

  // ---- failure / retry ----
  const willRetry = (
    strategy: ConcurrencyStrategy,
    lastId: number,
    attempts: number,
    times: number,
    runId: number,
    error: Error,
  ) =>
    !!retryRef && isCurrent(strategy, lastId, runId) && attempts < times && retryRef.filter({ error, attempt: attempts + 1 });

  const scheduleRetry = createEvent<Run<Params> & { error: Error }>();
  const finalFail = createEvent<{ params: Params; error: Error }>();
  const intermediateFail = createEvent<{ params: Params; error: Error }>();
  // unified failure stream: transport failures + validation failures
  const failed = createEvent<{ runId: number; params: Params; error: Error }>();

  // validation gate: a current-run success must pass the contract / validate fn,
  // otherwise it becomes a (retryable) ValidationError failure.
  sample({
    clock: rawDone,
    filter: ({ params, result }) => !validateRef || validateRef(result, params) === null,
    fn: ({ params, result }) => ({ params, result }),
    target: acceptedDone,
  });
  sample({
    clock: rawDone,
    filter: ({ params, result }) => !!validateRef && validateRef(result, params) !== null,
    fn: ({ runId, params, result }) => ({
      runId,
      params,
      error: new ValidationError(validateRef!(result, params) ?? [], result) as unknown as Error,
    }),
    target: failed,
  });
  // transport failures into the same stream
  sample({
    clock: runFx.fail,
    fn: ({ params, error }) => ({ runId: params.runId, params: params.params, error }),
    target: failed,
  });

  const failSource = { lastId: $runId, attempts: $attempts, timesSrc: $retryTimesSrc, strat: $strategySrc };
  sample({
    clock: failed,
    source: failSource,
    filter: ({ lastId, attempts, timesSrc, strat }, { runId, error }) =>
      willRetry(stratOf(strat), lastId, attempts, timesOf(timesSrc), runId, error),
    fn: (_s, { runId, params, error }) => ({ runId, params, error }),
    target: scheduleRetry,
  });
  sample({
    clock: failed,
    source: failSource,
    filter: ({ lastId, attempts, timesSrc, strat }, { runId, error }) =>
      isCurrent(stratOf(strat), lastId, runId) &&
      !willRetry(stratOf(strat), lastId, attempts, timesOf(timesSrc), runId, error),
    fn: (_s, { params, error }) => ({ params, error }),
    target: finalFail,
  });
  sample({
    clock: failed,
    source: { lastId: $runId, strat: $strategySrc },
    filter: ({ lastId, strat }, { runId }) => !isCurrent(stratOf(strat), lastId, runId),
    fn: (_s, { params }) => ({ params }),
    target: aborted,
  });

  // retry: bump attempts, wait, re-run the same runId (unless superseded meanwhile)
  $attempts.on(scheduleRetry, (n) => n + 1);
  $retrying.on(scheduleRetry, () => true);
  sample({
    clock: scheduleRetry,
    source: $attempts,
    fn: (attempt, s): { ms: number; payload: unknown } => ({
      ms: (retryRef?.delay ?? (() => 0))(attempt),
      payload: { runId: s.runId, params: s.params } as Run<Params>,
    }),
    target: sleepFx,
  });
  sample({
    clock: sleepFx.doneData,
    source: { lastId: $runId, strat: $strategySrc },
    filter: ({ lastId, strat }, payload) => isCurrent(stratOf(strat), lastId, (payload as Run<Params>).runId),
    fn: (_s, payload) => payload as Run<Params>,
    target: runFx,
  });
  $retrying.reset(sleepFx.done);

  // surface intermediate (retried) failures only when suppression is off
  sample({
    clock: scheduleRetry,
    filter: () => !!retryRef && retryRef.suppress === false,
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
    .on(staleServe, () => 'done' as const)
    .on(tagged, () => 'pending' as const)
    .on(acceptedDone, () => 'done' as const)
    .on(cacheHit, () => 'done' as const)
    .on(finalFail, () => 'fail' as const)
    .reset(reset);

  $data
    .on(acceptedDone, (_d, { params, result }) => mapData({ result, params }))
    .on(cacheHit, (_d, { params, result }) => mapData({ result, params }))
    .on(staleServe, (_d, { params, result }) => mapData({ result, params }))
    .reset(reset);

  $error
    .on(finalFail, (_e, { params, error }) => mapError({ error, params }))
    .on(intermediateFail, (_e, { params, error }) => mapError({ error, params }))
    .reset([tagged, acceptedDone, cacheHit, reset]);

  $stale
    .on(staleServe, () => true)
    .on(acceptedDone, () => false)
    .on(cacheHit, () => false)
    .reset(reset);
  $params.on(staleServe, (_p, h) => h.params ?? null);

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

  // ---- introspection (devtools / logger) ----
  const inspectStart = createEvent<{ params: Params }>(evName('inspect.start'));
  const inspectRun = createEvent<{ params: Params; attempt: number }>(evName('inspect.run'));
  const inspectCacheHit = createEvent<{ params: Params }>(evName('inspect.cacheHit'));
  const inspectCacheMiss = createEvent<{ params: Params }>(evName('inspect.cacheMiss'));
  const inspectRetry = createEvent<{ params: Params; attempt: number; error: Error }>(evName('inspect.retry'));

  sample({ clock: requested, fn: ({ params }) => ({ params }), target: inspectStart });
  sample({
    clock: runFx,
    source: $attempts,
    fn: (attempt, run) => ({ params: run.params, attempt }),
    target: inspectRun,
  });
  sample({ clock: cacheHit, fn: ({ params }) => ({ params }), target: inspectCacheHit });
  sample({
    clock: lookupFx.doneData,
    filter: ({ fresh }) => !fresh,
    fn: ({ params }) => ({ params }),
    target: inspectCacheMiss,
  });
  sample({
    clock: scheduleRetry,
    source: $attempts,
    fn: (attempt, s) => ({ params: s.params, attempt, error: s.error }),
    target: inspectRetry,
  });

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
      inspect: {
        start: inspectStart,
        run: inspectRun,
        done: finishedDone,
        fail: finishedFail,
        aborted,
        cacheHit: inspectCacheHit,
        cacheMiss: inspectCacheMiss,
        retry: inspectRetry,
      },
      setStrategy: (s) => {
        strategyConst = s;
      },
      setRetry: (cfg) => {
        if (!cfg) {
          retryRef = null;
          retryTimesConst = 0;
          return;
        }
        retryRef = { delay: cfg.delay, filter: cfg.filter, suppress: cfg.suppress };
        retryTimesConst = cfg.times;
      },
      setCache: (cfg) => {
        if (!cfg) {
          cacheRef = null;
          return;
        }
        cacheRef = { adapter: cfg.adapter, key: cfg.key, swr: cfg.swr, dedupe: cfg.dedupe };
        staleAfterConst = cfg.staleAfter;
      },
      setValidate: (fn) => {
        validateRef = fn;
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
