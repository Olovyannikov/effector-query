# vs. farfetched

[farfetched](https://ff.effector.dev) is the most complete data-fetching tool for effector and
the obvious reference point. It's mature, well-designed, and **open-source / not archived**. This
page is an honest comparison — including where farfetched is still ahead — so you can pick the
right tool, not a sales pitch.

The one-line difference: farfetched models a query as its **own event-based abstraction**
(a `RemoteOperation` built from a `handler`); effector-refetch wraps **your real `Effect`** and
exposes friendly inline config. Different philosophy, lots of overlap.

## Where farfetched is still ahead

Be aware of these before switching:

- **Maturity.** Years in production, a larger community, more accumulated recipes and edge-case
  fixes. effector-refetch is young (0.x) by comparison.
- **Sourced parameters everywhere.** In farfetched almost every field (url, headers, body, params)
  can be a `Store`/source. effector-refetch only sources a curated set — `enabled`, `concurrency`,
  `retry.times`, `cache.staleAfter`, `refetchInterval` — and expects the rest to come from the
  effect's params (often via `sample`).
- **Validation ecosystem.** Dedicated contract adapters: `@farfetched/{runtypes,io-ts,superstruct,
typed-contracts,zod}`. effector-refetch ships `zodContract`, `standardSchemaContract` (covers any
  Standard-Schema lib) and `createContract` — enough for most, but fewer ready-made adapters.
- **Declarative HTTP for writes.** farfetched has `createJsonMutation`; effector-refetch has
  `createJsonQuery` only (for mutations you bring your own effect via `createRequestFx`).
- **More operators.** `timeout`, `keepFresh` (refetch when sources change) and the standalone
  `applyBarrier` operator have no direct effector-refetch equivalent yet.
- **Official integrations.** `@farfetched/atomic-router` (router) and `@farfetched/dev-tools`, plus
  a richer Fetch helper and a deeper docs site.

## Where effector-refetch is different (and often nicer)

- **Effect-first.** The unit of work is your real `Effect` (incl. `attach` factories) — visible in
  devtools, composable, testable on its own. `query.__.effect` is exactly what you passed.
- **Friendly config.** `retry` / `cache` / `concurrency` are inline options on `createQuery`
  **and** standalone operators — sugar over the same machinery.
- **Real cancellation.** `createRequestFx` gives an `AbortSignal`; `TAKE_LATEST`/`cancel` actually
  abort the in-flight request, not just discard its result.
- **Built-in pagination.** `createInfiniteQuery` (bidirectional `fetchNext`/`fetchPrevious`,
  windowing) — farfetched has no built-in equivalent.
- **Built-in offline mode.** Both libraries have a `createBarrier` mutex (e.g. 401 → refresh →
  replay); effector-refetch adds a ready-made `createNetworkBarrier` that pauses queries while the
  browser is offline.
- **Tooling.** Visual devtools panels for **React, Vue and Solid**, an introspection event stream,
  an `llms.txt` + a Claude Code agent skill.
- **Bindings & Suspense.** `useUnit(query)` plus `useQuery` helpers for React / Vue / Solid, and
  `useSuspenseQuery` for React Suspense.
- **Small, dependency-free core** (~7 kB) under active development toward 1.0.

## Side by side

|                      | farfetched                                | effector-refetch                                                   |
| -------------------- | ----------------------------------------- | ------------------------------------------------------------------ |
| unit of work         | internal event-based executor             | your real `Effect` — first-class                                   |
| API style            | operators                                 | inline options **and** operators                                   |
| sourced config       | sourced **everything**                    | curated fields (`enabled`/`concurrency`/`retry`/`staleAfter`/poll) |
| validation           | runtypes / io-ts / zod / contracts        | zod / Standard Schema / `createContract`                           |
| declarative HTTP     | `createJsonQuery` + `createJsonMutation`  | `createJsonQuery` (+ bring-your-own effect)                        |
| pagination           | —                                         | `createInfiniteQuery` (bidirectional)                              |
| cancellation         | abort + discard                           | real `AbortSignal` via `createRequestFx`                           |
| barrier / mutex      | `createBarrier` + `applyBarrier` operator | `createBarrier` (the `barrier` option, `perform`)                  |
| offline mode         | build it on a barrier                     | built-in `createNetworkBarrier`                                    |
| devtools             | `@farfetched/dev-tools`                   | visual panels (React/Vue/Solid) + introspection stream             |
| bindings             | `@farfetched/solid` + `useUnit`           | react / vue / solid + `useQuery` + `useSuspenseQuery`              |
| SSR                  | `fork` / `allSettled`                     | `fork` / `allSettled`                                              |
| maturity / ecosystem | **larger, battle-tested**                 | young, actively developed                                          |

## Which should you use?

- **Use farfetched** if you want the most mature option today, lean heavily on sourced-everything
  config, or need its validation adapters / declarative mutations.
- **Use effector-refetch** if you prefer wrapping your own effects, want inline config, real
  cancellation, built-in pagination, the barrier/offline primitives, cross-framework devtools, or
  a small core on an actively-maintained project.

Already on farfetched and curious? The [migration guide](/guide/migration) + the
`npx effector-refetch-codemod` tool handle most of the mechanical changes.
