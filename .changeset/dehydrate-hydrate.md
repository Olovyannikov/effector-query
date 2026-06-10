---
'effector-refetch': minor
---

Cache dehydrate/hydrate for SSR — `dehydrate(adapter)` snapshots a cache adapter into a
JSON-serializable array, `hydrate(adapter, snapshot)` restores it (original `storedAt` preserved,
so `staleAfter` ages from the server's fetch time). `CacheAdapter` gained an optional `dump()`
(implemented by `inMemoryCache`); adapters that can't enumerate return `[]`. Pairs with effector's
`serialize`/`fork({ values })` so the client starts warm — no refetch/flicker. New `examples/ssr.ts`
and an expanded SSR recipe (cache transfer + client persistence via `localStorageCache` or
`effector-storage`).
