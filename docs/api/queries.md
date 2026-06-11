# Queries

```ts
import { createQuery } from 'effector-refetch';

const query = createQuery({
  effect, // Effect<Params, Result, Error> (or `handler`)
  initialData,
  enabled, // Store<boolean>
  mapData,
  mapError,
  contract,
  validate, // see HTTP & validation
  retry, // number | { times, delay?, filter?, suppressIntermediateErrors? }
  cache, // true | { adapter?, staleAfter?, key?, purge?, swr?, dedupe? }
  concurrency, // 'TAKE_LATEST' (default) | 'TAKE_FIRST' | 'TAKE_EVERY'
  name, // devtools label
});
```

## Options

- **`effect`** — your `Effect<Params, Result, Error>`. `handler: async params => …` is sugar.
- **`concurrency`** — how overlapping runs behave:
  - `TAKE_LATEST` (default) — new run supersedes & aborts the previous.
  - `TAKE_FIRST` — ignore new runs while one is in flight.
  - `TAKE_EVERY` — every run applies (last result wins `$data`).
- **`retry`** — `number` or `{ times, delay?, filter?, suppressIntermediateErrors? }`. Each retry is a real effect call. Helpers: `linearDelay`, `exponentialDelay`.
- **`cache`** — `true` or a config (see [caching](#caching)).
- **`enabled`** — `Store<boolean>` gate; while `false`, `start`/`refresh` are skipped.
- **`refetchInterval`** — poll every N ms (`number` or `Store<number>`, 0 = off). See [Auto-refetch & polling](/recipes/auto-refetch).
- **`timeout`** — per-attempt deadline in ms (`number` or `Store<number>`, 0 = off): if a run exceeds it, the in-flight request is aborted and the run **fails** (retryable, so it composes with `retry`). Distinct from `refetchInterval` (how _often_ to poll) — `timeout` is how _long_ one attempt may take.
- **`structuralSharing`** — preserve referential identity of unchanged parts of the result (fewer re-renders).
- **`placeholderData`** — a value or `(prev) => …` shown while there's no real data; `$isPlaceholderData` is `true` until the first real result. Unlike `initialData`, it's not treated as cached.
- **`mapData` / `mapError`** — normalize result / error before the stores.

`query.prefetch(params)` warms the cache for `params` **without** touching `$data`/`$status`
(no-op without a cache, skips when already fresh) — e.g. prefetch the next page on hover.

::: tip keepPreviousData by default
`$data` isn't cleared on a new `start` — it keeps the previous result until the new one
arrives. So when params change, the old data stays visible while the new fetch runs
(TanStack's `keepPreviousData`), out of the box. Use `reset()` to clear explicitly.
:::

Share these across many queries with a [factory](/recipes/defaults).

## Lifecycle events

```ts
query.finished.done; //    { params, result } — a run succeeded
query.finished.fail; //    { params, error }  — a run failed
query.finished.finally; // { params, status: 'done' | 'fail' }
query.aborted; //          { params } — cancel / reset / TAKE_LATEST supersede / skip
```

For **farfetched compatibility**, `finished` also exposes:

```ts
query.finished.success; // alias of finished.done   (same event)
query.finished.failure; // alias of finished.fail   (same event)
query.finished.skip; //    { params } — the `enabled` gate blocked a run
```

`finished.skip` fires only on the `enabled`-gate skip (the query didn't execute). The broader
`aborted` event still fires for **every** discarded run — skip, `cancel`, `reset`, and a
`TAKE_LATEST` supersede — so it stays a superset of `skip`. (Unlike farfetched, `finished.finally`
fires on `done`/`fail` only, not on skip — observe skips via `finished.skip` / `aborted`.)

## Operators

`concurrency` / `retry` / `cache` are also standalone, composable operators — the inline
options are sugar over them. Apply them directly, even after creation:

```ts
import { createQuery, concurrency, retry, cache, timeout } from 'effector-refetch';

const search = createQuery({ effect: searchFx });
concurrency(search, { strategy: 'TAKE_LATEST' });
retry(search, { times: 3, delay: exponentialDelay(200) });
cache(search, { staleAfter: 30_000, purge: loggedOut });
timeout(search, 5000); // abort + fail a run that takes over 5s
```

## Caching

`cache: { adapter?, staleAfter?, key?, purge?, swr?, dedupe? }`

- **`swr: true`** — serve a stale entry immediately, revalidate in the background (`$stale` flips `true` → `false`).
- **`dedupe: true`** — coalesce identical in-flight requests (by key) into one effect run.
- Adapters: `inMemoryCache({ maxAge?, maxEntries?, onHit?, onMiss?, onExpired?, onEvicted? })` (LRU GC + events), `localStorageCache({ version?, maxAge? })` / `sessionStorageCache(...)` (bump `version` to invalidate old data), `voidCache`.

## Sourced (reactive) config

Inline `concurrency`, `retry.times`, `cache.staleAfter` (and `enabled`) accept a `Store`
instead of a constant — read reactively and **fork-correctly** (each scope sees its own value):

```ts
const $retries = createStore(0);
createQuery({ effect: fx, retry: { times: $retries, delay: exponentialDelay(200) } });
```

## connectQuery

```ts
connectQuery({ source, fn, target, filter? });           // single source
connectQuery({ source: { a, b }, fn, target, filter? }); // multiple (waits for all done)
```

`fn` receives `{ result, params }` per source and returns `{ params }` for the target.
