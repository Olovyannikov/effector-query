# effector-query

## 0.2.0

### Minor Changes

- 683fd0f: Initial public preview. Effect-first query layer for effector:

  - `createQuery` / `createMutation` with inline `retry` / `cache` / `concurrency`, also as standalone composable operators
  - `connectQuery`, `invalidate`, `update`, `optimisticUpdate`
  - reactive (sourced) config, fork-correct
  - real request cancellation via `createRequestFx` (AbortSignal)
  - validation contracts (`zodContract` / `standardSchemaContract`) + `createJsonQuery`
  - `createInfiniteQuery` (pagination)
  - caching: SWR, GC (maxAge/maxEntries), dedupe, persistence with versioning, cache events
  - React & Vue bindings (`useUnit` via `@@unitShape`, plus `useQuery` helpers)
  - introspection: lifecycle event stream + `attachQueryLogger`
