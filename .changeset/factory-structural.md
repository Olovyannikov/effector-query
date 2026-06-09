---
'effector-refetch': minor
---

Shared defaults + data UX:

- `createQueryFactory(defaults)` — bake shared policy (retry / cache / concurrency /
  refetchInterval / structuralSharing / enabled / debug) into `createQuery` and
  `createMutation`; per-call options override. The effector-flavored alternative to a
  global QueryClient (e.g. make every query poll in one place).
- `structuralSharing: true` — preserve referential identity of unchanged parts of the
  result (fewer re-renders). `keepPreviousData` is the default and now documented.
