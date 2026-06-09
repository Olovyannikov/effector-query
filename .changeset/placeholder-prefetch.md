---
'effector-refetch': minor
---

Data UX (1.2): `placeholderData` (value or `(prev) => …`) with a `$isPlaceholderData`
store, and `query.prefetch(params)` to warm the cache without touching `$data`/`$status`
(no-op without a cache, skips when fresh).
