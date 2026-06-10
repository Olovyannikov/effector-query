# Операторы

Каждая inline-опция `createQuery` — это сахар над **standalone-оператором**. Импортируй и применяй
к любому query/mutation (в т.ч. созданному в другом месте). Композируемы и tree-shakeable.

```ts
import { concurrency, retry, cache, timeout, keepFresh, applyBarrier } from 'effector-refetch';
```

## `concurrency`

Поведение пересекающихся прогонов: `TAKE_LATEST` (по умолчанию), `TAKE_FIRST`, `TAKE_EVERY`.

```ts
concurrency(searchQuery, { strategy: 'TAKE_LATEST' }); // новый прогон отменяет предыдущий
```

## `retry`

`retry(query, 3)` или конфиг. Каждая попытка — реальный вызов эффекта; `filter` решает, какие сбои
ретраить, `suppressIntermediateErrors` держит `$error` чистым до финальной попытки.

```ts
import { exponentialDelay } from 'effector-refetch';

retry(userQuery, {
  times: 3,
  delay: exponentialDelay(200),
  filter: ({ error }) => (error as RequestError).status !== 404, // не ретраить 404
});
```

## `cache`

`cache(query)` (in-memory) или конфиг (adapter / `staleAfter` / `key` / `swr` / `dedupe` / `purge`).

```ts
cache(productsQuery, { staleAfter: 30_000, swr: true, purge: loggedOut });
```

## `timeout`

Дедлайн одной попытки (мс): прерывает запрос в полёте и **роняет** прогон (ретраябельно), если
превышен. `0` — выкл. Не путать с `refetchInterval` (частота поллинга).

```ts
timeout(reportQuery, 5000); // сдаёмся на одной попытке через 5с
```

## `keepFresh`

Рефетчит запрос его **последними параметрами** при изменении стора-`source` — свежесть по
зависимости (фильтры, локаль, пользователь). No-op до первого запуска и пока disabled.

```ts
keepFresh(productsQuery, { source: $filters }); // или source: [$filters, $locale]
```

## `applyBarrier`

Навешивает на готовый query/mutation [barrier](/ru/recipes/auth-barrier) (например 401 → обновить
токен → продолжить). `null` — отвязать.

```ts
const auth = createBarrier({ perform: refreshTokenFx });
applyBarrier(userQuery, auth);
```

---

Всё это эквивалентно соответствующей опции `createQuery({ … })` — выбирай, что читается лучше.
Рабочий пример: [`examples/operators.ts`](https://github.com/Olovyannikov/effector-refetch/blob/main/examples/operators.ts).
