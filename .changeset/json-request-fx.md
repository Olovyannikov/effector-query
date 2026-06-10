---
'effector-refetch': minor
---

`createJsonRequestFx(request)` — exposes the declarative request **effect** (url / query / body /
headers, sourced `Store` fields, abort-aware, normalized `RequestError`) that powers
`createJsonQuery`/`createJsonMutation`. Use it anywhere an effect is expected — `createQuery`,
`createMutation`, `createInfiniteQuery`, `connectQuery` — instead of hand-writing `createRequestFx`.
Also adds a consolidated **Operators** docs page + a runnable `examples/operators.ts`.
