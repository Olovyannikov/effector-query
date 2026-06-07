# effector-query

A small, friendly query layer for [effector](https://effector.dev), built on **real effects**.

The unit of work is your own `Effect<Params, Result, Error>` (including `attach`-built factory effects) — the query is just a thin reactive shell around it. `retry`, `cache` and `concurrency` are inline options on `createQuery`, not separate operators.

```ts
import { createQuery, connectQuery } from 'effector-query';

const characterQuery = createQuery({
  effect: fetchCharacterFx,      // a real effector Effect
  retry: 3,
  cache: true,
  concurrency: 'TAKE_LATEST',
});

const originQuery = createQuery({ effect: fetchLocationFx });

connectQuery({
  source: characterQuery,
  fn: ({ result: character }) => ({ params: { url: character.origin.url } }),
  target: originQuery,
});

characterQuery.start(1); // origin loads automatically when the character resolves
```

## Query API

`createQuery(config)` returns a `Query` object:

| member | type | meaning |
| --- | --- | --- |
| `start` | `EventCallable<Params>` | run (honoring cache / concurrency / enabled) |
| `refresh` | `EventCallable<Params>` | run, bypassing cache freshness |
| `reset` | `EventCallable<void>` | reset to initial + invalidate in-flight |
| `cancel` | `EventCallable<void>` | drop in-flight result, keep data |
| `$data` | `Store<Mapped \| null>` | latest result |
| `$error` | `Store<Error \| null>` | latest error |
| `$status` | `Store<'initial'\|'pending'\|'done'\|'fail'>` | |
| `$pending` | `Store<boolean>` | request (or retry) in flight |
| `$stale` | `Store<boolean>` | current data is past `staleAfter` |
| `$enabled` | `Store<boolean>` | gate |
| `$params` | `Store<Params \| null>` | last params the query ran with |
| `finished.{done,fail,finally}` | `Event<…>` | lifecycle |
| `aborted` | `Event<{ params }>` | result discarded (concurrency / cancel / skip) |
| `__.effect` / `__.runFx` | `Effect` | escape hatch to the real effects |

### Options

- **`effect`** — your `Effect<Params, Result, Error>`. (`handler: async params => …` is sugar that wraps it in `createEffect`.)
- **`concurrency`** — `'TAKE_LATEST'` (default), `'TAKE_FIRST'`, `'TAKE_EVERY'`.
- **`retry`** — `number` or `{ times, delay?, filter?, suppressIntermediateErrors? }`. Each retry is a real effect call (graph-level), visible in devtools. Helpers: `linearDelay`, `exponentialDelay`.
- **`cache`** — `true` or `{ adapter?, staleAfter?, key?, purge? }`. Adapters: `inMemoryCache` (default), `localStorageCache`, `sessionStorageCache`, `voidCache`.
- **`enabled`** — `Store<boolean>` gate.
- **`mapData` / `mapError`** — normalize result / error before they hit the stores.

### `connectQuery`

```ts
connectQuery({ source, fn, target, filter? });          // single source
connectQuery({ source: { a, b }, fn, target, filter? }); // multi (waits for all done)
```

`fn` receives `{ result, params }` per source and returns `{ params }` for the target.

## React

```tsx
import { useQuery } from 'effector-query/react';

function UserCard({ id }: { id: number }) {
  const { data, isPending, isFail, error, start } = useQuery(userQuery);

  useEffect(() => start(id), [id]);

  if (isPending) return <Spinner />;
  if (isFail) return <Error message={String(error)} />;
  return <div>{data?.name}</div>;
}
```

`useQuery` binds the query's stores and triggers to the current effector scope via
effector-react's `useUnit` (works with `<Provider value={scope}>` for SSR). It does
not auto-start — call `start`/`refresh` yourself. Returns `{ data, error, status,
pending, stale, enabled, params, isInitial, isPending, isDone, isFail, start,
refresh, reset, cancel }`. Requires the optional `react` + `effector-react` peers.

## SSR / tests

Everything is plain effector under the hood, so `fork()` + `allSettled()` work as usual:

```ts
const scope = fork();
await allSettled(characterQuery.start, { scope, params: 1 });
expect(scope.getState(originQuery.$data)).toBeTruthy();
```

> Note: cache adapters hold state outside the effector scope, so cache is shared across scopes unless you pass a fresh adapter per scope.

## vs. farfetched

[farfetched](https://ff.effector.dev) is the mature, full-featured data-fetching tool for effector. This library is a smaller, opinionated take.

| | farfetched | effector-query |
| --- | --- | --- |
| unit of work | internal event-based Executor; query is a self-contained abstraction | your real `Effect` is first-class; query wraps it |
| primary input | `handler` (wrapped internally); `effect` is one path | `effect` is the main input; `handler` is sugar |
| retry | operator `retry(query, …)` | inline `retry` option (same graph-level semantics) |
| cache | operator `cache(query, …)` | inline `cache` option |
| concurrency | operator `concurrency(query, …)` | inline `concurrency` option (default `TAKE_LATEST`) |
| connectQuery | yes | yes (compatible shape) |
| validation | `contract`, `validate`, sourced params | `mapData` / `mapError` only |
| ready-made | `createJsonQuery`, storage adapters w/ maxAge, dedupe | bring your own effect |
| SSR/tests | fork-friendly | fork-friendly |

**Trade-offs.** farfetched is richer (contracts, sourced params, JSON factories, dedupe) and its operator style composes and tree-shakes better. This library is simpler to start with and closer to bare effector — great for "I already have an effect, wrap it" — but reimplements a slice of farfetched. If you need contracts, sourced configuration, or declarative HTTP, prefer farfetched.

## Status

Reference implementation / design exploration. Not published. Run `npm test` and `npm run typecheck`.
