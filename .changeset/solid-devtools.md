---
'effector-refetch': minor
---

Solid devtools panel — `EffectorQueryDevtools` from `effector-refetch/devtools/solid`, at parity
with the React and Vue panels (collapsible floating inspector with a query tab list and a
per-query detail pane: status, params, data, error, live event log). Same props
(`queries`, `initialIsOpen`, `position`); scope-aware via effector-solid's `<Provider>`. Built
with `solid-js/h` (no JSX), tree-shaken out of the core bundle.
