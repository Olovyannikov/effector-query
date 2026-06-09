---
'effector-refetch': minor
---

Offline / network mode — `createNetworkBarrier()` (browser). A barrier that locks while the
browser is offline and unlocks on reconnect: gate queries with it (the `barrier` option or a
factory default) and their runs pause when the connection drops, then resume automatically when
it returns. Exposes `$online: Store<boolean>` for UI and `stop()` to detach listeners; pairs with
`refetchOnReconnect`.
