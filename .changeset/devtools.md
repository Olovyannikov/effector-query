---
'effector-query': minor
---

Add a visual devtools panel: `EffectorQueryDevtools` from `effector-query/devtools`
(React). A floating, TanStack-style panel listing queries with live status, params,
data, error and a per-query event log (built on the introspection stream). Tree-shaken
out of the core bundle; render it only in development.
