---
'effector-refetch': minor
---

Solid binding — `useQuery` from `effector-refetch/solid` (via `effector-solid`), at parity with
the React/Vue bindings. Returns Solid accessors (`data()`, `status()`, `isPending()`, …) plus
scope-bound triggers (`start`/`refresh`/`refetch`/`reset`/`cancel`); scope-aware via
effector-solid's `<Provider>`. The binding contains no JSX, so it needs no extra build/test
plugin. `effector-solid` + `solid-js` are optional peers.
