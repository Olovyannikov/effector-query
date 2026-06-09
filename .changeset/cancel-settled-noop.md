---
'effector-refetch': patch
---

Fix: `cancel` on an already-settled query is now a no-op. Previously it always re-derived
`$status` from `$data`, so cancelling after a failure (with stale data from an earlier success
still present) flipped the status from `fail` back to `done`. Cancel now only settles the status
while a request is actually in flight (`status === 'pending'`); a finished `done`/`fail` state is
left untouched.
