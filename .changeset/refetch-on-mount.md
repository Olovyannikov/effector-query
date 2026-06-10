---
'effector-refetch': minor
---

`refetchOnMount` for the `useQuery` bindings (React, Vue, Solid) — `useQuery(query, { refetchOnMount: true | 'always' })`
refetches the query with its last params when the component subscribes (`true` only if stale,
`'always'` every mount). No-op until the query has run and is enabled. New shared `UseQueryOptions`
type re-exported from each binding entry.
