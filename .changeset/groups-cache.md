---
"effector-query": minor
---

Cache & client surface (1.3):

- Factory group invalidation: `createQueryFactory().invalidate(predicate?)` — a
  scope-correct event that refetches every query the factory created (that has run),
  optionally narrowed by a predicate. The effector-flavored `invalidateQueries`.
- Imperative cache access: `getQueryData(query)` / `setQueryData(query, value | (prev) => next)`
  (backed by a new `query.__.setData` event).
