# Migration

## From farfetched

The mental model is close, so most code maps directly. The main shift: **bring your own
effect**, and inline options are available alongside operators.

| farfetched | effector-query |
| --- | --- |
| `createQuery({ handler })` | `createQuery({ effect })` (or `{ handler }`) |
| `createJsonQuery({ ... })` | `createJsonQuery({ request, response })` |
| `retry(query, { times, delay })` | `retry(query, …)` **or** inline `createQuery({ retry })` |
| `cache(query, { ... })` | `cache(query, …)` **or** inline `createQuery({ cache })` |
| `concurrency(query, { strategy })` | `concurrency(query, …)` **or** inline `createQuery({ concurrency })` |
| `connectQuery({ source, fn, target })` | identical |
| `createMutation` | `createMutation` (+ `mutate` alias) |
| contracts | `zodContract` / `standardSchemaContract` / `createContract` |
| `$data / $error / $status / $pending` | same names |

Notable differences:

- The query wraps a **real effect** (`query.__.effect`), visible in devtools.
- Cancellation is real for `createRequestFx` effects (AbortSignal), not just discard.
- Sourced config is available inline (a `Store` for `concurrency` / `retry.times` / `cache.staleAfter` / `enabled`).
- `useUnit(query)` works directly in React and Vue via `@@unitShape`.

What's not here yet (vs farfetched): a Solid binding, the full sourced surface on every
field, and some JSON-contract conveniences. See the [roadmap](https://github.com/Olovyannikov/effector-query/blob/main/ROADMAP.md).

## Within 0.x

Pre-1.0 the API may still change between minor versions; breaking changes are called out
in the changelog. Notable so far:

- Web-storage cache adapters take an **options object** now: `localStorageCache({ version, maxAge })` (previously a prefix string).
