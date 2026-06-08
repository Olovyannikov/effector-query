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
const serialized = serialize(scope); // effector serialize
```

Bindings are scope-aware: React via `<Provider value={scope}>`, Vue via the
`EffectorScopePlugin({ scope })`.

## Notes

- Sourced config (`Store` for `concurrency` / `retry.times` / `cache.staleAfter` / `enabled`)
  is **fork-correct** — each scope sees its own value.
- Cache adapters hold state outside the effector scope; for isolated SSR build queries
  per request (as usual), or pass a fresh adapter.
- In-flight `AbortController`s are tracked per query *instance*; avoid sharing one query
  instance across concurrent SSR requests if you also call `cancel`.
