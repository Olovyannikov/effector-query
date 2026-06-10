# Operators

Every inline `createQuery` option is sugar over a **standalone operator** — `import` them and apply
to any query/mutation (even one built elsewhere). They're composable and tree-shakeable.

```ts
import { concurrency, retry, cache, timeout, keepFresh, applyBarrier } from 'effector-refetch';
```

## `concurrency`

How overlapping runs behave: `TAKE_LATEST` (default), `TAKE_FIRST`, `TAKE_EVERY`.

```ts
concurrency(searchQuery, { strategy: 'TAKE_LATEST' }); // new run aborts the previous
```

## `retry`

`retry(query, 3)` or a config. Each attempt is a real effect call; `filter` decides which failures
retry, `suppressIntermediateErrors` keeps `$error` clean until the final attempt.

```ts
import { exponentialDelay } from 'effector-refetch';

retry(userQuery, {
  times: 3,
  delay: exponentialDelay(200),
  filter: ({ error }) => (error as RequestError).status !== 404, // don't retry 404
});
```

## `cache`

`cache(query)` (in-memory) or a config (adapter / `staleAfter` / `key` / `swr` / `dedupe` / `purge`).

```ts
cache(productsQuery, { staleAfter: 30_000, swr: true, purge: loggedOut });
```

## `timeout`

Per-attempt deadline (ms): aborts the in-flight request and **fails** the run (retryable) if it
exceeds it. `0` disables it. Distinct from `refetchInterval` (poll cadence).

```ts
timeout(reportQuery, 5000); // give up a single attempt after 5s
```

## `keepFresh`

Refetch the query with its **last params** whenever a `source` store changes — dependency-based
freshness (filters, locale, viewer). No-op until it has run and while disabled.

```ts
keepFresh(productsQuery, { source: $filters }); // or source: [$filters, $locale]
```

## `applyBarrier`

Gate an already-created query/mutation on a [barrier](/recipes/auth-barrier) (e.g. 401 → token
refresh → resume). Pass `null` to detach.

```ts
const auth = createBarrier({ perform: refreshTokenFx });
applyBarrier(userQuery, auth);
```

---

All of these equal the corresponding `createQuery({ … })` option — use whichever reads better.
Runnable: [`examples/operators.ts`](https://github.com/Olovyannikov/effector-refetch/blob/main/examples/operators.ts).
