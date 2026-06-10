---
'effector-refetch': minor
---

`applyBarrier(query, barrier)` operator — gate an already-created query/mutation on a barrier
(the composable equivalent of the `barrier` config option); pass `null` to detach. Backed by a new
`__.setBarrier` engine seam, so the barrier is now swappable at runtime.
