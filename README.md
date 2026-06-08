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
- **`cache`** — `true` or `{ adapter?, staleAfter?, key?, purge?, swr?, dedupe? }`.
  - `swr: true` — serve a stale entry immediately and revalidate in the background (`$stale` flips `true` → `false` on fresh data).
  - `dedupe: true` — coalesce identical in-flight requests (by key) into a single effect run.
  - Adapters: `inMemoryCache({ maxAge?, maxEntries?, onHit?, onMiss?, onExpired?, onEvicted? })` (default, LRU GC + events), `localStorageCache({ version?, maxAge? })` / `sessionStorageCache({ version?, maxAge? })` (bump `version` to invalidate old data — migrations), `voidCache`.
- **`enabled`** — `Store<boolean>` gate.
- **`mapData` / `mapError`** — normalize result / error before they hit the stores.

#### Sourced (reactive) config

Inline `concurrency`, `retry.times` and `cache.staleAfter` accept a `Store` instead
of a constant — the engine reads it reactively and **fork-correctly** (each scope
sees its own value):

```ts
const $retries = createStore(0); // e.g. bump when online
createQuery({ effect: fx, retry: { times: $retries, delay: exponentialDelay(200) } });

createQuery({ effect: fx, concurrency: $strategy, cache: { staleAfter: $ttl } });
```

`enabled` is likewise a store. (Reactive sourcing is available through the inline
options; the standalone operators take constants.)

### Operators

`concurrency` / `retry` / `cache` are standalone, composable operators — the inline
options above are just sugar that applies them. Use them directly to compose or to
configure a query built elsewhere:

```ts
import { createQuery, concurrency, retry, cache } from 'effector-query';

const search = createQuery({ effect: searchFx });
concurrency(search, { strategy: 'TAKE_LATEST' });
retry(search, { times: 3, delay: exponentialDelay(200) });
cache(search, { staleAfter: 30_000, purge: loggedOut });
```

All three may be applied after creation; the engine carries the machinery and the
operators configure it. `createQuery({ retry, cache, concurrency })` === calling the
operators yourself.

### `connectQuery`

```ts
connectQuery({ source, fn, target, filter? });          // single source
connectQuery({ source: { a, b }, fn, target, filter? }); // multi (waits for all done)
```

`fn` receives `{ result, params }` per source and returns `{ params }` for the target.

## Mutations & invalidation

A mutation is a write-flavored query: the same effect-first engine (status, retry,
concurrency, lifecycle) without cache/refresh/stale, plus a `mutate` alias.
Concurrency defaults to `TAKE_EVERY` so independent writes don't cancel each other.

```ts
import { createMutation, invalidate } from 'effector-query';

const addTodo = createMutation({ effect: addTodoFx, retry: 2 });

// when the mutation succeeds, refetch the list (with its last params, bypassing cache)
invalidate({ on: addTodo, refetch: todosQuery });

addTodo.mutate({ text: 'Buy milk' }); // -> todosQuery refetches automatically
```

`invalidate({ on, refetch, filter? })`:
- **`on`** — a Mutation/Query (fires on success), an `Event`, or an `Effect`; or an array of them.
- **`refetch`** — a query or array of queries; each re-runs with its last params, only if it has run before (`status !== 'initial'`).
- **`filter`** — optional gate on the trigger payload (e.g. mutation `{ params, result }`).

A `Mutation` exposes `{ start, mutate, reset, cancel, $data, $error, $status, $pending, $params, finished, aborted }` and works with `useUnit(mutation)` too (`{ data, pending, mutate, ... }`).

### `update` & optimistic updates

Patch a query's `$data` directly from a mutation result — no refetch:

```ts
import { update, optimisticUpdate } from 'effector-query';

update({ query: todosQuery, on: addTodo, fn: ({ data, result }) => [...(data ?? []), result] });
```

Optimistic update: apply immediately on `start`, roll back on failure, optionally reconcile on success:

```ts
optimisticUpdate({
  query: todosQuery,
  on: addTodo,
  update: ({ data, params }) => [{ id: -1, ...params }, ...(data ?? [])], // shown instantly
  commit: ({ data, result }) => (data ?? []).map((t) => (t.id === -1 ? result : t)), // server id
});
```

Combine optimistic feedback with `invalidate` to reconcile against server truth (the TanStack-style pattern).

## Request factory (ofetch / axios)

`createRequestFx<Params, Response>(handler)` wraps any HTTP client into a typed,
devtools-visible effector effect, with shared error normalization (`RequestError`
with `status` / `data`):

```ts
import { ofetch } from 'ofetch';
import axios from 'axios';
import { createRequestFx, createQuery, createMutation } from 'effector-query';

// ofetch
const getPostsFx = createRequestFx<{ userId: number }, Post[]>(
  ({ userId }, { signal }) => ofetch('/api/posts', { query: { userId }, signal }),
);

// axios
const createPostFx = createRequestFx<NewPost, Post>(
  (body, { signal }) => axios.post('/api/posts', body, { signal }).then((r) => r.data),
);

const postsQuery = createQuery({ effect: getPostsFx, cache: true, retry: 2 });
const addPost = createMutation({ effect: createPostFx });
```

See [`examples/http-clients.ts`](./examples/http-clients.ts) for a full query +
mutation + invalidate + optimistic flow.

### Composing from a shared factory

Bake `baseURL` + headers/auth into a factory once, then declare endpoints in one
line each — the FSD `shared/api` pattern:

```ts
const createCommonRequestFx = createRequestFactory({
  baseURL: API_URL,
  headers: () => ({ 'X-API-KEY': apiKey }),
});

export const getProductsQuery = createQuery({
  effect: createCommonRequestFx<ProductsRequest, Product[]>((params) => ({ url: '/products', params })),
  cache: { staleAfter: 30_000 },
});
concurrency(getProductsQuery, { strategy: 'TAKE_LATEST' });

export const likeProductMutation = createMutation({
  effect: createInternalRequestFx<number, Product>((id) => ({ url: `/products/${id}/likes`, method: 'PUT' })),
});
invalidate({ on: likeProductMutation, refetch: getProductsQuery });
```

Full runnable version (with the `createRequestFactory` helper, api-key vs bearer
factories, and product endpoints): [`examples/shared-factory.ts`](./examples/shared-factory.ts).

### Real cancellation

Effects built with `createRequestFx` are **abort-aware**: the query owns an
`AbortController` per run and fires the handler's `signal` when the request is
cancelled — so ofetch/axios actually stop:

- `query.cancel()` / `query.reset()` abort all in-flight requests;
- under `TAKE_LATEST`, starting a new request aborts the superseded one;
- `TAKE_EVERY` never aborts earlier requests.

Plain effects (without `createRequestFx`) keep the previous behavior — their
stale results are simply ignored.

> SSR note: in-flight controllers are tracked per query *instance* (a closure
> `Set`), not per scope. For isolated SSR you already build per-request units, so
> this is a non-issue; just avoid sharing one query instance across concurrent
> requests if you also call `cancel`.

## Validation (contracts)

Validate a response against a schema; a failure becomes a `ValidationError`
(retryable like any other failure):

```ts
import { createQuery, zodContract, standardSchemaContract, createContract } from 'effector-query';

createQuery({ effect: getUserFx, contract: zodContract(UserSchema) });           // zod
createQuery({ effect: getUserFx, contract: standardSchemaContract(UserSchema) }); // valibot / zod 3.24+ / arktype
createQuery({ effect: getUserFx, contract: createContract({ isData: (r) => isUser(r) }) }); // manual
createQuery({ effect: getPriceFx, validate: ({ result }) => result >= 0 || ['negative price'] }); // ad-hoc
```

Contracts are **structural** — the schema libraries aren't imported, you pass your
own schema. On failure, `$error` is a `ValidationError` with `.validationErrors`.

## `createJsonQuery` — declarative HTTP

Declare an endpoint over the global `fetch` (no HTTP-client dependency), with
abort-aware cancellation, normalized `RequestError`, optional contract, and all the
usual options:

```ts
import { createJsonQuery, HTTP_METHODS, zodContract } from 'effector-query';

export const getProductsQuery = createJsonQuery({
  request: { url: 'https://api/products', query: ({ search }) => ({ search, limit: 20 }) },
  response: { contract: zodContract(ProductList) },
  concurrency: 'TAKE_LATEST',
  cache: { staleAfter: 30_000 },
});

export const createUser = createJsonQuery<NewUser, User>({
  request: { url: 'https://api/users', method: HTTP_METHODS.POST, body: (u) => u },
});
```

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
