# effector-refetch

## 0.8.0

### Minor Changes

- 9e81a57: `update` / `optimisticUpdate` now accept an `InfiniteQuery` — patch a page item in place from a
  mutation (no refetch). For an infinite query the callbacks' `data` is the **array of pages**; map
  over the pages to patch the item. Patches flow through a new `infiniteQuery.__.setData` write seam
  (the panel's `$pages`/`$data` are derived, so they can't be a `sample` target directly). The
  `query` accepted by `update`/`optimisticUpdate` is now the structural `Patchable<QM>` type.

## 0.7.0

### Minor Changes

- f6a0ded: Solid devtools panel — `EffectorQueryDevtools` from `effector-refetch/devtools/solid`, at parity
  with the React and Vue panels (collapsible floating inspector with a query tab list and a
  per-query detail pane: status, params, data, error, live event log). Same props
  (`queries`, `initialIsOpen`, `position`); scope-aware via effector-solid's `<Provider>`. Built
  with `solid-js/h` (no JSX), tree-shaken out of the core bundle.

## 0.6.0

### Minor Changes

- bfa0914: Offline / network mode — `createNetworkBarrier()` (browser). A barrier that locks while the
  browser is offline and unlocks on reconnect: gate queries with it (the `barrier` option or a
  factory default) and their runs pause when the connection drops, then resume automatically when
  it returns. Exposes `$online: Store<boolean>` for UI and `stop()` to detach listeners; pairs with
  `refetchOnReconnect`.

### Patch Changes

- 8cbf62f: Ship a Claude Code Agent Skill (`skills/effector-refetch/SKILL.md`, now included in the published
  package). Copy it into a project's `.claude/skills/` so AI agents know the effect-first API and
  the fork-correct idioms (createQuery/createMutation, bindings, SSR via fork/allSettled, barriers,
  common mistakes). See `skills/README.md` for install.

## 0.5.0

### Minor Changes

- 2dc9292: Solid binding — `useQuery` from `effector-refetch/solid` (via `effector-solid`), at parity with
  the React/Vue bindings. Returns Solid accessors (`data()`, `status()`, `isPending()`, …) plus
  scope-bound triggers (`start`/`refresh`/`refetch`/`reset`/`cancel`); scope-aware via
  effector-solid's `<Provider>`. The binding contains no JSX, so it needs no extra build/test
  plugin. `effector-solid` + `solid-js` are optional peers.
- 15da7ee: React Suspense — `useSuspenseQuery` from `effector-refetch/react`. Returns the data directly
  (never null): auto-starts the query, suspends the nearest `<Suspense>` while loading, throws to
  the nearest Error Boundary on failure, and returns the data when done. Client-side (CSR): reads
  and triggers are scope-aware, the settle signal is observed globally.

## 0.4.0

### Minor Changes

- c341b96: Vue devtools panel — `EffectorQueryDevtools` from `effector-refetch/devtools/vue`, a
  TanStack-style floating inspector at parity with the React panel (live status, params, data,
  error, per-query event log; scope-aware via effector-vue's `EffectorScopePlugin`). Same props
  (`queries`, `initialIsOpen`, `position`). Built as render functions, tree-shaken out of the core
  bundle.

### Patch Changes

- 10d91a1: Fix: `cancel` on an already-settled query is now a no-op. Previously it always re-derived
  `$status` from `$data`, so cancelling after a failure (with stale data from an earlier success
  still present) flipped the status from `fail` back to `done`. Cancel now only settles the status
  while a request is actually in flight (`status === 'pending'`); a finished `done`/`fail` state is
  left untouched.
- d1d2fbb: Deep devtools labelling: `name` (or `debug: true`) now labels every internal seam in the
  effector inspector — `requested`, `proceed`, `toExec`, `lookupFx`, `toRun`, `rawDone`,
  `acceptedDone`, `scheduleRetry`, `failed`, `finalFail`, `$runId`, `$attempts`, the lifecycle
  events, and the poll/prefetch effects — not just the public entry points. Without a name the
  internal units stay anonymous, so production inspector output is unchanged.

## 0.3.0

### Minor Changes

- 62c6108: Automatic refetching (1.1): `refetchInterval` polling option on `createQuery`
  (number or reactive `Store<number>`, paused while disabled, stops on reset,
  fork-correct), plus opt-in browser operators `refetchOnWindowFocus` and
  `refetchOnReconnect`. New "Auto-refetch & polling" recipe, including composing
  with patronum (`interval` / `debounce` / `throttle`).
- 7f51c68: `createBarrier({ perform })` — a mutex to "pause the environment": gated queries (via the
  `barrier` option on `createQuery`/`createMutation` or a factory default) wait while it's
  locked, then resume. With `perform`, locking auto-runs an effect (e.g. token refresh) and
  unlocks when it settles. Enables the classic 401 → refresh → replay-queue flow.

  Also fixes a bug where `cancel` left `$status` stuck on `pending`: cancel now settles the
  status (`done` if there's data, else `initial`) and clears `$pending` immediately, even
  for non-abortable effects whose promise resolves later.

- 4bb0808: Add a `debug` option to `createQuery`/`createMutation` that labels the public and
  inspect units for the effector inspector even without a `name`. New "Inspector &
  logging" recipe covering `@effector/inspector` and `attachQueryLogger`.
- 3efd634: Add a visual devtools panel: `EffectorQueryDevtools` from `effector-refetch/devtools`
  (React). A floating, TanStack-style panel listing queries with live status, params,
  data, error and a per-query event log (built on the introspection stream). Tree-shaken
  out of the core bundle; render it only in development.
- f28e482: Shared defaults + data UX:
  - `createQueryFactory(defaults)` — bake shared policy (retry / cache / concurrency /
    refetchInterval / structuralSharing / enabled / debug) into `createQuery` and
    `createMutation`; per-call options override. The effector-flavored alternative to a
    global QueryClient (e.g. make every query poll in one place).
  - `structuralSharing: true` — preserve referential identity of unchanged parts of the
    result (fewer re-renders). `keepPreviousData` is the default and now documented.

- 50382fe: Cache & client surface (1.3):
  - Factory group invalidation: `createQueryFactory().invalidate(predicate?)` — a
    scope-correct event that refetches every query the factory created (that has run),
    optionally narrowed by a predicate. The effector-flavored `invalidateQueries`.
  - Imperative cache access: `getQueryData(query)` / `setQueryData(query, value | (prev) => next)`
    (backed by a new `query.__.setData` event).

- 2b1929e: Lists & parallelism (1.4):
  - Bidirectional infinite queries: `getPreviousPageParam` enables `fetchPrevious`
    (prepends) with `$hasPreviousPage`, and `maxPages` caps the window (dropping from the
    opposite end).
  - `combineQueries([...])` — aggregate independent queries into combined stores
    (`$data` tuple, `$pending`, `$statuses`, `$errors`, `$isError`, `$isSuccess`); the
    effector-flavored `useQueries`.

- cabaf3d: Data UX (1.2): `placeholderData` (value or `(prev) => …`) with a `$isPlaceholderData`
  store, and `query.prefetch(params)` to warm the cache without touching `$data`/`$status`
  (no-op without a cache, skips when fresh).

## 0.2.0

### Minor Changes

- 683fd0f: Initial public preview. Effect-first query layer for effector:
  - `createQuery` / `createMutation` with inline `retry` / `cache` / `concurrency`, also as standalone composable operators
  - `connectQuery`, `invalidate`, `update`, `optimisticUpdate`
  - reactive (sourced) config, fork-correct
  - real request cancellation via `createRequestFx` (AbortSignal)
  - validation contracts (`zodContract` / `standardSchemaContract`) + `createJsonQuery`
  - `createInfiniteQuery` (pagination)
  - caching: SWR, GC (maxAge/maxEntries), dedupe, persistence with versioning, cache events
  - React & Vue bindings (`useUnit` via `@@unitShape`, plus `useQuery` helpers)
  - introspection: lifecycle event stream + `attachQueryLogger`
