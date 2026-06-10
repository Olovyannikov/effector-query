# SSR & testing

Because a query is plain effector under the hood, `fork()` + `allSettled()` work as
usual — no special test utilities.

## Testing a query

```ts
import { fork, allSettled } from 'effector';

const scope = fork();
await allSettled(query.start, { scope, params: 1 });
expect(scope.getState(query.$data)).toEqual(/* ... */);
```

## SSR

```ts
const scope = fork();
await allSettled(query.start, { scope, params: req.params });
const html = renderToString(/* app */, scope);
const serialized = serialize(scope); // effector serialize — $data / $status / …
```

Bindings are scope-aware: React via `<Provider value={scope}>`, Vue via the
`EffectorScopePlugin({ scope })`.

### Transferring the cache (`dehydrate` / `hydrate`)

`serialize(scope)` captures the **store state**, but the query **cache** (dedupe / `staleAfter`)
lives outside the scope, so it isn't included. `dehydrate` snapshots it; `hydrate` restores it on
the client — so cached params hit instead of refetching:

```ts
// server — alongside serialize(scope)
const cache = inMemoryCache();
const todos = createQuery({ effect: fetchTodosFx, cache: { adapter: cache } });
// … run queries under the scope …
const payload = { values: serialize(scope), cache: dehydrate(cache) };

// client
hydrate(cache, payload.cache); // warm the cache (storedAt preserved → staleAfter ages correctly)
const scope = fork({ values: payload.values }); // $data restored — no loading flash
```

Only adapters that can enumerate entries (e.g. `inMemoryCache`) are dehydratable; web-storage
adapters already persist themselves.

### Persisting on the client

Two complementary ways to keep data across reloads in the browser:

- **Cache layer** — use `localStorageCache` / `sessionStorageCache` as the adapter; the query
  cache survives reloads (and `version` lets you invalidate old data).
- **Store layer** — persist `$data` directly with [`effector-storage`](https://github.com/yumauri/effector-storage):

  ```ts
  import { persist } from 'effector-storage/local';
  persist({ store: todosQuery.$data as StoreWritable<Todo[] | null>, key: 'todos:data' });
  ```

  (`$data` is read-only in the public type but writable at runtime — cast for `persist`.)

Full runnable flow: [`examples/ssr.ts`](https://github.com/Olovyannikov/effector-refetch/blob/main/examples/ssr.ts).

## Notes

- Sourced config (`Store` for `concurrency` / `retry.times` / `cache.staleAfter` / `enabled`)
  is **fork-correct** — each scope sees its own value.
- Cache adapters hold state outside the effector scope; for isolated SSR build queries
  per request (as usual), or pass a fresh adapter.
- In-flight `AbortController`s are tracked per query _instance_; avoid sharing one query
  instance across concurrent SSR requests if you also call `cancel`.
