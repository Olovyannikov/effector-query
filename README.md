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

## Framework bindings

A query implements effector's `@@unitShape` protocol, so you can pass it straight
to `useUnit` from **effector-react** or **effector-vue** — no wrapper needed:

```tsx
// React
import { useUnit } from 'effector-react';

function UserCard({ id }: { id: number }) {
  const { data, pending, error, refetch } = useUnit(userQuery);
  // useUnit(query) -> { data, error, status, pending, stale, enabled, params,
  //                     start, refetch, refresh, reset, cancel }
  return pending ? <Spinner /> : <div onClick={() => refetch(id)}>{data?.name}</div>;
}
```

```vue
<!-- Vue -->
<script setup lang="ts">
import { useUnit } from 'effector-vue/composition';
const { data, pending, refetch } = useUnit(userQuery);
</script>
```

For React there's also a thin `useQuery` helper that adds derived booleans:

```tsx
import { useQuery } from 'effector-query/react';

const { data, isPending, isFail, error, start, refetch } = useQuery(userQuery);
useEffect(() => start(id), [id]); // queries never auto-start
```

`useQuery` returns the unit shape plus `isInitial / isPending / isDone / isFail`.
Works with `<Provider value={scope}>` for SSR. React binding requires the optional
`react` + `effector-react` peers.

## Development

Uses **pnpm** and **vite**.

```bash
pnpm install
pnpm typecheck   # tsc --noEmit
pnpm test        # vitest (node + happy-dom for React/Vue)
pnpm build       # vite library build -> dist/{index,react}.{mjs,cjs} + d.ts
```

## SSR / tests

Everything is plain effector under the hood, so `fork()` + `allSettled()` work as usual:

```ts
const scope = fork();
await allSettled(characterQuery.start, { scope, params: 1 });
expect(scope.getState(originQuery.$data)).toBeTruthy();
```

> Note: cache adapters hold state outside the effector scope, so cache is shared across scopes unless you pass a fresh adapter per scope.

## vs. farfetched

[farfetched](https://ff.effector.dev) is the most complete data-fetching tool for effector and the obvious reference point. It is **open-source and not archived** — but its cadence has slowed: it is still **pre-1.0**, the original "1.0 by end of 2024" target has slipped well past, the last release was **0.15.0 (Jan 2026)**, and the issue backlog keeps growing. effector-query exists to be the **maintained, effect-first** option with a smaller, friendlier surface and a committed road to 1.0 — not to claim farfetched is dead.

| | farfetched | effector-query |
| --- | --- | --- |
| unit of work | internal event-based Executor; query is a self-contained abstraction | your real `Effect` is first-class; query wraps it |
| primary input | `handler` (wrapped internally); `effect` is one path | `effect` is the main input; `handler` is sugar |
| retry / cache / concurrency | separate operators `retry()/cache()/concurrency()` | inline options on `createQuery` (default concurrency `TAKE_LATEST`) |
| connectQuery | yes | yes (compatible shape) |
| validation | `contract`, `validate`, sourced params | `mapData` / `mapError` (contracts on the roadmap) |
| ready-made | `createJsonQuery`, storage adapters w/ GC, dedupe, mutations | bring your own effect (factories on the roadmap) |
| SSR / tests | fork-friendly | fork-friendly |
| status | pre-1.0, slowed cadence | pre-1.0, actively building toward 1.0 |

**Honest trade-off.** *Today* farfetched ships more batteries — contracts, `createJsonQuery`, sourced configuration, request dedupe, cache adapters with GC, mutations. effector-query is currently simpler and closer to bare effector ("I already have an effect, wrap it"). We treat farfetched's extra surface as our [roadmap](./ROADMAP.md), not as a reason to depend on a stalling library. If you need those batteries *right now*, farfetched still has them; if you want an effect-first API on a project that intends to be maintained, use this.

## Status

Pre-1.0, actively developed. Core (`createQuery`, `connectQuery`, retry/cache/concurrency, React binding) is implemented and tested (24 tests via `fork`/`allSettled` + jsdom). See the [roadmap](./ROADMAP.md). Run `npm test` and `npm run typecheck`.
