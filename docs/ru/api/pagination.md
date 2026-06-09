# Пагинация

## createInfiniteQuery

Курсорная/offset-пагинация с накоплением страниц. `start` грузит первую страницу (со сбросом),
`fetchNext` докидывает следующую — по `getNextPageParam`.

```ts
import { createInfiniteQuery } from 'effector-refetch';

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

### Двунаправленность + окно

Добавьте `getPreviousPageParam`, чтобы включить `fetchPrevious` (вставка в начало), и
`maxPages`, чтобы ограничить окно (сбрасывает с противоположного конца):

```ts
const feed = createInfiniteQuery({
  effect: fetchPageFx,
  initialPageParam: 10, // старт с середины
  getNextPageParam: ({ lastPage }) => lastPage.next ?? null,
  getPreviousPageParam: ({ firstPage }) => firstPage.prev ?? null,
  maxPages: 3,
});

feed.fetchPrevious(); // prepend; гейт по $hasPreviousPage
```

Появляется `$hasPreviousPage` рядом с `$hasNextPage`.

## Параллельные запросы — `combineQueries`

Агрегирует несколько независимых запросов в общие сторы (эффектор-овский `useQueries`):

```ts
import { combineQueries } from 'effector-refetch';

const { $data, $pending, $isSuccess, $isError, $statuses, $errors } = combineQueries([userQuery, postsQuery]);
// $data: [User | null, Post[] | null]   $pending: любой в полёте   $isSuccess: все done
```

Запускайте запросы как обычно; `combineQueries` лишь читает их общее состояние.

::: tip
Эффект страницы — обычный `Effect<{ params, pageParam }, Page>` — используйте обычный
`createEffect`/`handler`, а не abort-aware `createRequestFx` (у него другое соглашение вызова
`{ params, signal }`).
:::

Построено на `createQuery`, поэтому загрузка страницы наследует concurrency и отмену.
