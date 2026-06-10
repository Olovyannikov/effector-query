---
'effector-refetch': minor
---

`timeout` — a per-attempt deadline. `createQuery({ timeout: 5000 })` (or the standalone
`timeout(query, 5000)` operator, or a reactive `Store<number>` via the inline option) aborts the
in-flight request and fails the run with a timeout `RequestError` if it exceeds the deadline. It's
retryable, so it composes with `retry`, and it's distinct from `refetchInterval` (poll cadence).
Implemented inside `runFx` via `Promise.race` + the run's AbortController, threaded fork-correctly
through the run/retry payloads.
