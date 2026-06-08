# Pagination

## createInfiniteQuery

Cursor/offset pagination that accumulates pages. `start` loads the first page
(resetting), `fetchNext` appends the next — driven by `getNextPageParam`.

```ts
import { createInfiniteQuery } from 'effector-query';

const feed = createInfiniteQuery({
  effect: fetchPageFx, // Effect<{ params, pageParam }, Page>
  initialPageParam: 0,
  getNextPageParam: ({ lastPage }) => lastPage.nextCursor ?? null, // null/undefined = done
});

feed.start({ tag: 'cats' });
feed.fetchNext(); // appends; no-op when $hasNextPage is false or already loading
```

Exposes `$pages` (= `$data`), `$pageParams`, `$hasNextPage`, `$status`, `$pending`,
`$error`, `finished.{done,fail}`, and `useUnit(feed)` support.

`getNextPageParam` receives `{ lastPage, allPages, lastPageParam, allPageParams }` and
returns the next page param, or `null`/`undefined` when there are no more pages.

::: tip
The page effect is a plain `Effect<{ params, pageParam }, Page>` — use a regular
`createEffect`/`handler`, not an abort-aware `createRequestFx` effect (which has a
different `{ params, signal }` calling convention).
:::

Built on `createQuery`, so the page fetch inherits concurrency and cancellation.
