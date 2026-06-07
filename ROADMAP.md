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
- [ ] `update` wiring: patch query `$data` directly from a mutation result (no refetch)
- [ ] Optimistic updates with rollback on failure

### 0.3 — Operators & power-user surface
- [ ] Standalone `retry(query, …)` / `cache(query, …)` / `concurrency(query, …)` operators (inline options become sugar over them)
- [ ] Sourced configuration (retry `times`/`delay`, `enabled`, cache `key` driven by stores)
- [ ] Real cancellation: `AbortSignal` threaded into effects that opt in

### 0.4 — Validation & declarative fetching
- [ ] Contract/validation hook with adapters (`zod`, `valibot`, `runtypes`)
- [ ] `createJsonQuery` factory (declarative URL/method/headers/body, response contract)

### 0.5 — Caching that scales
- [ ] Cache GC: `maxAge` / `maxEntries`, observable `hit/miss/expired/evicted`
- [ ] Request dedupe (in-flight coalescing by key)
- [ ] SWR mode (serve stale, revalidate in background) as a first-class option
- [ ] Persistence adapters with versioning/migration

### 0.6 — Lists & pagination
- [ ] Pagination / infinite-query helpers (cursor + offset)
- [ ] Normalized list updates from mutations

### 0.7 — Framework bindings & DX
- [x] `@@unitShape` support for direct `useUnit(query)` (React + Vue)
- [ ] Dedicated Vue `useQuery` helper + Solid binding (`effector-solid`)
- [ ] effector devtools / inspector integration and labelling

### 1.0 — Stabilize
- [ ] API freeze + migration guide from 0.x and from farfetched
- [ ] Documentation site with recipes (SSR, testing, mutations, pagination)
- [ ] Bundle-size budget + tree-shaking guarantees, ESM/CJS builds, typed `exports`
- [ ] CI: typecheck, tests, size-limit, release automation (changesets)

## Engineering guardrails

- Every feature lands with tests driven by `fork`/`allSettled` (no real timers/network in unit tests).
- Inline option == thin sugar over a public operator, so power users are never boxed in.
- No silent behavior: dropped/aborted runs surface via `aborted`; truncation/limits are observable.
- Keep the core dependency-free; framework bindings are optional peer-scoped subpaths.
