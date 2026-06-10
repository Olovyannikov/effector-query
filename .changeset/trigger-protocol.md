---
'effector-refetch': minor
---

`@@trigger` protocol. Every query and mutation now implements
[`@@trigger`](https://withease.effector.dev/protocols/trigger.html) — `query['@@trigger']()`
returns `{ fired, setup, teardown }` where `fired` is `finished.done` — so a unit can drive
farfetched's `keepFresh({ triggers })` (and any protocol consumer). It's scoped/fork-correct:
`fired` mirrors the unit's own (scoped) success, and `setup`/`teardown` are protocol placeholders
that don't gate firing.

`keepFresh` now accepts `triggers` in addition to `source`: `keepFresh(query, { triggers: [mutation, tabFocused] })`
refetches whenever any `@@trigger` (our queries/mutations, withease web-API triggers,
farfetched-compatible triggers) or a plain effector `Event` fires. `isTrigger` and the `Trigger`
type are exported.
