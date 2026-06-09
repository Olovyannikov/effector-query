---
'effector-refetch': minor
---

`update` / `optimisticUpdate` now accept an `InfiniteQuery` — patch a page item in place from a
mutation (no refetch). For an infinite query the callbacks' `data` is the **array of pages**; map
over the pages to patch the item. Patches flow through a new `infiniteQuery.__.setData` write seam
(the panel's `$pages`/`$data` are derived, so they can't be a `sample` target directly). The
`query` accepted by `update`/`optimisticUpdate` is now the structural `Patchable<QM>` type.
