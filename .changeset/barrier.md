---
"effector-query": minor
---

`createBarrier({ perform })` — a mutex to "pause the environment": gated queries (via the
`barrier` option on `createQuery`/`createMutation` or a factory default) wait while it's
locked, then resume. With `perform`, locking auto-runs an effect (e.g. token refresh) and
unlocks when it settles. Enables the classic 401 → refresh → replay-queue flow.

Also fixes a bug where `cancel` left `$status` stuck on `pending`: cancel now settles the
status (`done` if there's data, else `initial`) and clears `$pending` immediately, even
for non-abortable effects whose promise resolves later.
