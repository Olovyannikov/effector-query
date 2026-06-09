# Shared defaults (query factory)

effector-query has no global `QueryClient`. Instead, bake shared policy into a factory
with `createQueryFactory` — per-call options always override the defaults.

```ts
import { createQueryFactory } from 'effector-query';

const { createQuery, createMutation } = createQueryFactory({
  retry: 2,
  cache: { staleAfter: 30_000 },
  concurrency: 'TAKE_LATEST',
});

const todos = createQuery({ effect: fetchTodosFx }); // retry 2 + cache by default
const search = createQuery({ effect: searchFx, retry: 0 }); // override: no retry
```

## Make every query poll

The motivating case — one place to give all queries a polling interval:

```ts
const { createQuery } = createQueryFactory({ refetchInterval: 30_000 });

const stats = createQuery({ effect: fetchStatsFx }); // polls every 30s
const feed = createQuery({ effect: fetchFeedFx, refetchInterval: 5_000 }); // override to 5s
```

See the runnable [`examples/polling.ts`](https://github.com/Olovyannikov/effector-query/blob/main/examples/polling.ts).

## What a factory carries

Query defaults: `retry`, `cache`, `concurrency`, `refetchInterval`, `structuralSharing`,
`enabled`, `debug`. Mutations only inherit `retry`, `concurrency`, `debug` (cache /
polling don't apply to writes).

Need different policies per area (e.g. `shared/api` vs `internal/api`)? Just create
multiple factories.

::: tip Why not a global client?
effector is decentralized — a god-object `QueryClient` fights that model. A factory gives
you the same "defaults in one place" ergonomics while every query stays a plain, testable
effector unit.
:::
