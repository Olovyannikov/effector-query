# Апдейты списков

Когда мутация меняет один элемент списочного запроса, полный рефетч обычно не нужен —
патчите элемент на месте через [`update`](/ru/api/mutations#update) (или `optimisticUpdate`).

## Патч элемента по id

```ts
import { update } from 'effector-refetch';

// todosQuery.$data: Todo[]
update({
  query: todosQuery,
  on: toggleTodoMutation, // возвращает обновлённый Todo
  fn: ({ data, result: updated }) => (data ?? []).map((todo) => (todo.id === updated.id ? updated : todo)),
});
```

## Удаление элемента

```ts
update({
  query: todosQuery,
  on: deleteTodoMutation, // params: id
  fn: ({ data, params: id }) => (data ?? []).filter((todo) => todo.id !== id),
});
```

## Оптимистичный toggle с откатом

```ts
import { optimisticUpdate } from 'effector-refetch';

optimisticUpdate({
  query: todosQuery,
  on: toggleTodoMutation,
  update: ({ data, params: id }) => (data ?? []).map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
  // при успехе сверяем с серверной версией
  commit: ({ data, result: updated }) => (data ?? []).map((t) => (t.id === updated.id ? updated : t)),
});
```

## Постраничные списки (`createInfiniteQuery`)

`update` / `optimisticUpdate` принимают и infinite-запрос — там `data` это **массив страниц**,
поэтому мапьте по страницам и патчите элемент на месте (без рефетча и мигания):

```ts
update({
  query: todosInfinite, // createInfiniteQuery(...)
  on: toggleTodoMutation,
  fn: ({ data: pages, result: id }) =>
    (pages ?? []).map((page) => ({
      ...page,
      items: page.items.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    })),
});
```

Та же форма работает с `optimisticUpdate` (его колбэки `update`/`commit` тоже получают массив
страниц). Патчи идут через шов `__.setData`, поэтому scope-корректны.
