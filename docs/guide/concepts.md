# Core concepts

## Effect-first

A query wraps your **real effector `Effect`**. It is not a black box with an internal
executor — your effect is a first-class unit: visible in devtools, composable with
`attach`, and fork-friendly for SSR and tests.

```ts
const query = createQuery({ effect: myFx });
query.__.effect === myFx; // the real effect
```

## Lifecycle & status

`$status` moves through `'initial' → 'pending' → 'done' | 'fail'`. A query exposes:

| store/event                    | meaning                                              |
| ------------------------------ | ---------------------------------------------------- |
| `$data`                        | latest (validated, mapped) result                    |
| `$error`                       | latest error                                         |
| `$status`                      | `initial \| pending \| done \| fail`                 |
| `$pending`                     | request (or retry) in flight                         |
| `$stale`                       | current data is past `staleAfter`                    |
| `$params`                      | last params the query ran with                       |
| `finished.{done,fail,finally}` | lifecycle events                                     |
| `aborted`                      | a result was discarded (concurrency / cancel / skip) |

## Triggers

- `start(params)` — run, honoring cache / concurrency / enabled.
- `refresh(params)` / `refetch(params)` — run, bypassing cache freshness.
- `reset()` — back to initial, abort in-flight.
- `cancel()` — abort in-flight, keep data.

## The engine

Internally the query is a graph of plain effector units (`createStore` / `createEvent`
/ `sample`). All machinery (concurrency, retry, cache) lives in the engine and is
configured by **operators**; the inline `createQuery` options are sugar over them.
Config values can be constants or reactive `Store`s — see [sourced config](/api/queries#sourced-reactive-config).

## SSR & tests

Because it's plain effector, `fork()` + `allSettled()` work as usual — no special
test utilities. See [SSR & testing](/recipes/ssr-and-testing).
