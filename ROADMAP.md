# Roadmap

The goal: an **effector-ecosystem-grade** data layer that is *maintained, effect-first, and reaches a stable 1.0* — the thing people reach for when they already have effects and want querying on top, without depending on a stalling library.

This is not "clone farfetched". It is: keep the friendly, effect-first core, then add the batteries that a serious app needs, with a predictable release cadence and a real 1.0.

## Positioning

- **Effect-first.** The unit of work is your real `Effect` (incl. `attach` factories), visible in devtools and fork-friendly. The query is a thin reactive shell, not a black box.
- **Friendly by default.** `retry` / `cache` / `concurrency` are inline options with sane defaults; the same capabilities are also exposed as composable operators for power users.
- **Maintained.** Semver, changelog, CI, an RFC process for API changes, and a committed path to 1.0.

## Milestones

### 0.1 — Core (done)
- [x] `createQuery` on a real effect, inline `retry` / `cache` / `concurrency`
- [x] `connectQuery` (single + multiple sources)
- [x] Cache adapters: in-memory / local / session / void
- [x] Retry delay helpers (linear / exponential + jitter)
- [x] React binding `useQuery` via `useUnit`
- [x] `@@unitShape` protocol — `useUnit(query)` works directly in **effector-react** and **effector-vue**
- [x] Tooling: pnpm + vite library build (ESM/CJS + d.ts), standalone vitest config
- [x] Test suite via `fork` / `allSettled` (+ happy-dom for React/Vue)

### 0.2 — Mutations & invalidation
- [x] `createMutation({ effect })` with the same status/lifecycle surface (+ `mutate` alias, `useUnit` support)
- [x] `invalidate({ on, refetch, filter })`: a mutation/event success refetches related queries with their last params
- [x] `update({ query, on, fn })`: patch query `$data` directly from a mutation result (no refetch)
- [x] `optimisticUpdate`: apply on start, roll back on failure, optional `commit` reconcile on success
- [x] `createRequestFx<Params, Response>` request factory (ofetch / axios) with normalized `RequestError`

### 0.3 — Operators & power-user surface
- [x] Real cancellation: `createRequestFx` effects are abort-aware; query aborts on cancel/reset and on TAKE_LATEST supersede
- [x] Engine refactor: `createBaseQuery` carries all machinery driven by live config; `concurrency()` / `retry()` / `cache()` are standalone, composable, post-hoc operators; inline `createQuery` options are sugar over them
- [x] Sourced configuration: inline `enabled`, `concurrency`, `retry.times`, `cache.staleAfter` accept a reactive `Store`, read fork-correctly (each scope sees its own value). Engine reads `sourcedStore ?? constant`; user stores are used directly in `source` (fork-safe), constants live in closures. (`delay` / `filter` / cache `key`+`adapter` remain static functions; standalone operators take constants.)

### 0.4 — Validation & declarative fetching
- [x] Contract/validation hook: `contract` + `validate` on `createQuery`; failures become retryable `ValidationError`. Adapters: `zodContract` (structural), `standardSchemaContract` (valibot / zod 3.24+ / arktype), `createContract`
- [x] `createJsonQuery` — declarative URL/method/query/body/headers over global `fetch`, abort-aware, normalized `RequestError`, optional contract, all query options

### 0.5 — Caching that scales
- [x] Cache GC: `inMemoryCache({ maxAge, maxEntries })` with LRU eviction
- [x] SWR mode (`cache: { swr: true }`) — serve stale, revalidate in background
- [x] Request dedupe (`cache: { dedupe: true }`) — in-flight coalescing by key
- [x] Observable cache events (`onHit/onMiss/onExpired/onEvicted` on `inMemoryCache`)
- [x] Persistence with versioning/migration (`localStorageCache`/`sessionStorageCache` `{ version, maxAge }`)

### 0.6 — Lists & pagination
- [x] `createInfiniteQuery` — cursor/offset pagination, `start` + `fetchNext`, `getNextPageParam`, `$pages`/`$hasNextPage`, built on `createQuery`
- [ ] Normalized list updates from mutations (patch a page item in place via `update`/optimistic)

### 0.7 — Framework bindings & DX
- [x] `@@unitShape` support for direct `useUnit(query)` (React + Vue)
- [x] React `useQuery` (`effector-query/react`) and Vue `useQuery` (`effector-query/vue`) helpers with derived flags
- [x] Devtools labelling: `name` config labels the public units (`<name>.start`, `<name>.$data`, `<name>.runFx`, …)
- [ ] Solid binding (`effector-query/solid` via `effector-solid`) — deferred: needs vite-plugin-solid + a separate JSX runtime that conflicts with the React/Vue plugins in one vitest config; will land with its own test project

### 0.8 — Devtools & introspection
- [x] Lifecycle event stream `query.__.inspect` (`start / run / done / fail / aborted / cacheHit / cacheMiss / retry`)
- [x] `attachQueryLogger(query, { name, handler })` — structured, timed log entries (per-run `durationMs`); default logs to console, custom handler forwards anywhere
- [x] Public-unit labelling via `name` (start/$data/$status/runFx + inspect.* units)
- [x] Visual devtools panel (TanStack-style) — `EffectorQueryDevtools` (`effector-query/devtools`, React): live status, params, data, error, per-query event log; docs page with a visual mock
- [x] `debug` flag — label the public/inspect units for the inspector even without a `name`
- [x] `@effector/inspector` / logging recipe page
- [ ] Deep labelling of every internal unit (lookup/retry/concurrency seams) — needs a domain-based pass
- [ ] Vue devtools component (parity with the React panel)

### 0.9 — Documentation site (VitePress)
- [x] `docs/` VitePress site: Guide (getting-started, concepts, vs-farfetched), API reference (queries, mutations, http+validation, pagination, bindings, introspection), Recipes (SSR/testing, optimistic, shared factory)
- [x] `docs:dev` / `docs:build` / `docs:preview` scripts; local search; build verified
- [x] i18n: English + Russian (`/ru/`) with a language switcher; warmer example-first home + Introduction; branded theme
- [x] GitHub Pages deploy workflow (`.github/workflows/docs.yml`) + CI gate (`ci.yml`: typecheck/test/build)
- [ ] Type-checked snippets (Twoslash) and embedded runnable examples
- [ ] Versioned docs from 0.x → 1.0; API docs generated/checked from `.d.ts`

### 1.0 — Stabilize
- [x] Migration guide (from farfetched and within 0.x) — `docs/guide/migration`
- [x] Bundle-size budget (`size-limit`, core ~5.5 kB), `sideEffects: false` tree-shaking, ESM/CJS builds + typed `exports`
- [x] CI: typecheck / tests / build / size-limit (`ci.yml`); release automation via changesets (`release.yml` + `.changeset/`)
- [x] Normalized list updates from mutations — `update`/`optimisticUpdate` recipe + spec (`docs/recipes/list-updates`)
- [ ] API freeze + tag 1.0 — maintainer decision once the API has soaked; pre-1.0 minors may still break (called out in the changelog)

## Compared to TanStack Query — gaps to close

Where we already match TanStack Query: queries + status, caching (`staleAfter` ≈ staleTime,
`maxAge`/`maxEntries` ≈ gcTime-ish), SWR, request dedupe, retry + backoff, cancellation,
dependent queries (`connectQuery`), mutations + optimistic + invalidation, forward infinite
queries, devtools, SSR via `fork`/`allSettled`, validation, declarative HTTP (`createJsonQuery`).

What's missing, planned as effector-flavored features (post-1.0, order TBD):

### 1.1 — Automatic refetching
- [x] Polling: `refetchInterval` (number | `Store<number>`), paused while disabled, stops on reset, fork-correct
- [x] `refetchOnWindowFocus` / `refetchOnReconnect` — opt-in, tree-shakeable browser operators
- [x] Recipe: composing with patronum (`interval` / `debounce` / `throttle`) since triggers are plain events
- [ ] Refetch-stale-on-subscribe helper for the bindings (TanStack's `refetchOnMount`)

### 1.2 — Data UX
- [ ] `keepPreviousData` / `placeholderData` — keep showing previous/placeholder data while a new params-set loads (great for search & pagination)
- [ ] `prefetch(query, params)` — warm the cache without subscribing
- [ ] Structural sharing — preserve referential identity of unchanged data
- [ ] `select`-style derived subscription (lighter than `mapData` for per-consumer slices)

### 1.3 — Cache & client surface (effector-flavored, no global client)
- [ ] Bulk invalidation by key/predicate over a lightweight query registry
- [ ] Imperative cache read/write helpers (`getQueryData` / `setQueryData` analogues)
- [ ] `gcTime`: drop cache entries with no subscribers after N ms
- [ ] Dehydrate/hydrate the whole cache (beyond per-query storage adapters)

### 1.4 — Lists & parallelism
- [ ] Bidirectional infinite query: `fetchPreviousPage`, `getPreviousPageParam`, `maxPages`
- [ ] Parallel/dynamic queries helper (TanStack's `useQueries`)

### 1.5 — Framework integration
- [ ] React Suspense binding (`useSuspenseQuery`) + error-boundary (`throwOnError`)
- [ ] Network mode / offline: pause runs when offline, resume on reconnect
- [ ] Vue & Solid devtools parity

### Deliberately not copied
- A central mutable `QueryClient` — effector is decentralized; we use operators + a small
  registry instead of a god-object.
- Hook-first configuration — config lives on the query unit, framework-agnostic.

## Engineering guardrails

- Every feature lands with tests driven by `fork`/`allSettled` (no real timers/network in unit tests).
- Inline option == thin sugar over a public operator, so power users are never boxed in.
- No silent behavior: dropped/aborted runs surface via `aborted`; truncation/limits are observable.
- Keep the core dependency-free; framework bindings are optional peer-scoped subpaths.
