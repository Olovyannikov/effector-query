---
'effector-refetch': minor
---

`createJsonQuery` request fields can be **sourced from a `Store`** — `url` / `query` / `body` /
`headers` now accept `(params) => T`, a `Store<T>`, or `{ source: Store, fn: (value, params) => T }`
(in addition to the previous function form). Store-backed fields are wired through `attach`, so an
auth token / base URL in state is read **fork-correctly** per scope (SSR-safe), with no global
mutable client. The non-sourced path is unchanged.
