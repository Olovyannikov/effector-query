---
'effector-refetch': minor
---

`keepFresh(query, { source })` operator — refetch a query with its last params whenever a `source`
store (or array of stores) changes, keeping it fresh relative to external state (filters, locale,
viewer). No-op until the query has run (`status !== 'initial'`) and while it's disabled.
Dependency-based, complementing the time-based `refetchInterval`.
