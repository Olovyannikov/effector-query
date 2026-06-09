---
'effector-refetch': minor
---

Lists & parallelism (1.4):

- Bidirectional infinite queries: `getPreviousPageParam` enables `fetchPrevious`
  (prepends) with `$hasPreviousPage`, and `maxPages` caps the window (dropping from the
  opposite end).
- `combineQueries([...])` — aggregate independent queries into combined stores
  (`$data` tuple, `$pending`, `$statuses`, `$errors`, `$isError`, `$isSuccess`); the
  effector-flavored `useQueries`.
