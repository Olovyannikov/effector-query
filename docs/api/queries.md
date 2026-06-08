# Queries

```ts
import { createQuery } from 'effector-query';

const query = createQuery({
  effect,                  // Effect<Params, Result, Error> (or `handler`)
  initialData,
  enabled,                 // Store<boolean>
  mapData, mapError,
  contract, validate,      // see HTTP & validation
  retry,                   // number | { times, delay?, filter?, suppressIntermediateErrors? }
  cache,                   // true | { adapter?, staleAfter?, key?, purge?, swr?, dedupe? }
  concurrency,             // 'TAKE_LATEST' (default) | 'TAKE_FIRST' | 'TAKE_EVERY'
  name,                    // devtools label
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
- **`mapData` / `mapError`** — normalize result / error before the stores.

## Operators

`concurrency` / `retry` / `cache` are also standalone, composable operators — the inline
options are sugar over them. Apply them directly, even after creation:

```ts
import { createQuery, concurrency, retry, cache } from 'effector-query';

const search = createQuery({ effect: searchFx });
concurrency(search, { strategy: 'TAKE_LATEST' });
retry(search, { times: 3, delay: exponentialDelay(200) });
cache(search, { staleAfter: 30_000, purge: loggedOut });
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
