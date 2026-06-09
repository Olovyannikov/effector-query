---
'effector-refetch': minor
---

React Suspense — `useSuspenseQuery` from `effector-refetch/react`. Returns the data directly
(never null): auto-starts the query, suspends the nearest `<Suspense>` while loading, throws to
the nearest Error Boundary on failure, and returns the data when done. Client-side (CSR): reads
and triggers are scope-aware, the settle signal is observed globally.
