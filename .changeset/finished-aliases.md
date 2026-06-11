---
'effector-refetch': minor
---

farfetched-compatible `finished` events. Every query/mutation's `finished` now also exposes
`success` (alias of `done`), `failure` (alias of `fail`), and `skip` (`{ params }`, fired when the
`enabled` gate blocks a run). Existing `done`/`fail`/`finally` are unchanged, and the broader
`aborted` event still fires for every discarded run (skip / cancel / reset / TAKE_LATEST supersede),
so it stays a superset of `skip`. Lets code written against farfetched's
`finished.success`/`finished.failure`/`finished.skip` work as-is.
