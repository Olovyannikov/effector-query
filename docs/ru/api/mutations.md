# Мутации и инвалидация

## createMutation

Мутация — это «пишущий» вариант запроса: тот же effect-first движок (статус, retry,
concurrency, жизненный цикл) без cache/refresh/stale, плюс алиас `mutate`. Concurrency по
умолчанию `TAKE_EVERY`, чтобы независимые записи не отменяли друг друга.

```ts
import { createMutation } from 'effector-query';

const addTodo = createMutation({ effect: addTodoFx, retry: 2 });
addTodo.mutate({ text: 'Купить молоко' });
```

Предоставляет `{ start, mutate, reset, cancel, $data, $error, $status, $pending, $params,
finished, aborted }` и работает с `useUnit(mutation)`.

## invalidate

Перезапросить запросы, когда что-то завершилось успешно:

```ts
import { invalidate } from 'effector-query';

invalidate({ on: addTodo, refetch: todosQuery });
```

- **`on`** — Mutation/Query (по успеху), `Event` или `Effect`; либо массив.
- **`refetch`** — запрос или массив; каждый перезапускается с последними параметрами, только если уже запускался (`status !== 'initial'`), минуя свежесть кэша.
- **`filter`** — опциональный гейт по payload триггера (например, `{ params, result }`).

## update

Патчит `$data` запроса прямо из результата — без рефетча:

```ts
import { update } from 'effector-query';

update({ query: todosQuery, on: addTodo, fn: ({ data, result }) => [...(data ?? []), result] });
```

## optimisticUpdate

Применяет сразу на `start`, откатывает при ошибке, опционально сверяет с сервером на успехе:

```ts
import { optimisticUpdate } from 'effector-query';

optimisticUpdate({
  query: todosQuery,
  on: addTodo,
  update: ({ data, params }) => [{ id: -1, ...params }, ...(data ?? [])],
  commit: ({ data, result }) => (data ?? []).map((t) => (t.id === -1 ? result : t)),
});
```

Сочетайте оптимистичный фидбек с `invalidate`, чтобы сверяться с серверной правдой.
