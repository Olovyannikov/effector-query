---
'effector-refetch': minor
---

`attachToRoute({ route, query, mapParams?, resetOnClose? })` — router integration: start a query
when a route opens (with its params) and reset it when the route closes. Structural (atomic-router
isn't imported — any object with `opened`/`closed` works) and pure `sample`, so it's
scope-correct for SSR. Documented in the Router recipe with an atomic-router example.
