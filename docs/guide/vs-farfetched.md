# vs. farfetched

[farfetched](https://ff.effector.dev) is the most complete data-fetching tool for
effector and the obvious reference point. It is **open-source and not archived** — but
its cadence has slowed: it is still pre-1.0, the original "1.0 by end of 2024" target
has slipped, and the issue backlog keeps growing. `effector-query` exists to be the
**maintained, effect-first** option with a smaller, friendlier surface — not to claim
farfetched is dead.

|                             | farfetched                                | effector-query                                                                      |
| --------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------- |
| unit of work                | internal event-based executor             | your real `Effect` — first-class                                                    |
| primary input               | `handler` (wrapped); `effect` is one path | `effect` is the main input; `handler` is sugar                                      |
| retry / cache / concurrency | separate operators                        | inline options **and** standalone operators                                         |
| sourced config              | sourced fields                            | reactive `Store` for `enabled` / `concurrency` / `retry.times` / `cache.staleAfter` |
| validation                  | `contract`, `validate`                    | `contract` (zod / Standard Schema) + `validate`                                     |
| declarative HTTP            | `createJsonQuery`                         | `createJsonQuery` (global `fetch`, zero deps)                                       |
| pagination                  | —                                         | `createInfiniteQuery`                                                               |
| cancellation                | abort + discard                           | real `AbortSignal` via `createRequestFx`                                            |
| bindings                    | react / solid / vue                       | `useUnit(query)` (react + vue) + `useQuery` helpers                                 |

**Honest trade-off.** farfetched still ships more in some areas (sourced everything,
JSON contracts ecosystem, maturity). `effector-query` is simpler, closer to bare
effector ("I already have an effect, wrap it"), and intends to reach a stable 1.0.
If you need farfetched's full surface today, use it; if you want an effect-first API
on a maintained project, use this.
