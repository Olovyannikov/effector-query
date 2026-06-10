# Migration

## Codemod (automated)

A codemod handles the mechanical parts — rewriting imports and folding the standalone operators
into the inline `createQuery` config:

```bash
npx effector-refetch-codemod "src/**/*.{ts,tsx}"
npx effector-refetch-codemod "src/**/*.ts" --dry   # preview only
```

It rewrites `@farfetched/core` → `effector-refetch`, turns `retry(q, …)` / `cache(q, …)` /
`concurrency(q, { strategy })` into `createQuery({ retry, cache, concurrency })`, and drops the
now-unused operator imports. Operators on a query it can't resolve statically are left as-is —
review the diff and run your formatter after. The manual mapping below covers the rest.

## From farfetched

The mental model is close, so most code maps directly. The main shift: **bring your own
effect**, and inline options are available alongside operators.

| farfetched                             | effector-refetch                                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `createQuery({ handler })`             | `createQuery({ effect })` (or `{ handler }`)                                                      |
| `createJsonQuery({ ... })`             | `createJsonQuery({ request, response })`                                                          |
| `createJsonMutation({ ... })`          | `createJsonMutation({ request, response })`                                                       |
| `retry(query, { times, delay })`       | `retry(query, …)` **or** inline `createQuery({ retry })`                                          |
| `cache(query, { ... })`                | `cache(query, …)` **or** inline `createQuery({ cache })`                                          |
| `concurrency(query, { strategy })`     | `concurrency(query, …)` **or** inline `createQuery({ concurrency })`                              |
| `timeout(query, ms)`                   | `timeout(query, ms)` **or** inline `createQuery({ timeout })`                                     |
| `keepFresh(query, { triggers })`       | `keepFresh(query, { source, triggers })`                                                          |
| `connectQuery({ source, fn, target })` | identical                                                                                         |
| `createMutation`                       | `createMutation` (+ `mutate` alias)                                                               |
| `createBarrier` / `applyBarrier`       | `createBarrier` / `applyBarrier` (or inline `createQuery({ barrier })`)                           |
| `@farfetched/atomic-router`            | `attachToRoute({ route, query })` (structural)                                                    |
| `@@trigger` consumers / producers      | every query/mutation implements `@@trigger`; `keepFresh` consumes it                              |
| contracts                              | `zodContract` / `runtypesContract` / `ioTsContract` / `standardSchemaContract` / `createContract` |
| `$data / $error / $status / $pending`  | same names                                                                                        |

Notable differences:

- The query wraps a **real effect** (`query.__.effect`), visible in devtools.
- Cancellation is real for `createRequestFx` effects (AbortSignal), not just discard.
- Sourced config is available inline (a `Store` for `concurrency` / `retry.times` / `cache.staleAfter` / `enabled` / `timeout`), and `createJsonQuery`/`createJsonMutation` source `url` / `query` / `body` / `headers`.
- `useUnit(query)` works directly in React and Vue via `@@unitShape`.

What's not here yet (vs farfetched): the full sourced surface on _every_ field (we source the
declarative-HTTP fields + a curated config set), and the superstruct / typed-contracts validation
adapters specifically. See the [roadmap](https://github.com/Olovyannikov/effector-refetch/blob/main/ROADMAP.md).

## Within 0.x

Pre-1.0 the API may still change between minor versions; breaking changes are called out
in the changelog. Notable so far:

- Web-storage cache adapters take an **options object** now: `localStorageCache({ version, maxAge })` (previously a prefix string).
