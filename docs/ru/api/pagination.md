# Пагинация

## createInfiniteQuery

Курсорная/offset-пагинация с накоплением страниц. `start` грузит первую страницу (со сбросом),
`fetchNext` докидывает следующую — по `getNextPageParam`.

```ts
import { createInfiniteQuery } from 'effector-query';

const feed = createInfiniteQuery({
  effect: fetchPageFx, // Effect<{ params, pageParam }, Page>
  initialPageParam: 0,
  getNextPageParam: ({ lastPage }) => lastPage.nextCursor ?? null, // null/undefined = конец
});

feed.start({ tag: 'cats' });
feed.fetchNext(); // докидывает; no-op, если $hasNextPage = false или уже грузится
```

Предоставляет `$pages` (= `$data`), `$pageParams`, `$hasNextPage`, `$status`, `$pending`,
`$error`, `finished.{done,fail}` и поддержку `useUnit(feed)`.

`getNextPageParam` получает `{ lastPage, allPages, lastPageParam, allPageParams }` и
возвращает параметр следующей страницы либо `null`/`undefined`, когда страниц больше нет.

::: tip
Эффект страницы — обычный `Effect<{ params, pageParam }, Page>` — используйте обычный
`createEffect`/`handler`, а не abort-aware `createRequestFx` (у него другое соглашение вызова
`{ params, signal }`).
:::

Построено на `createQuery`, поэтому загрузка страницы наследует concurrency и отмену.
