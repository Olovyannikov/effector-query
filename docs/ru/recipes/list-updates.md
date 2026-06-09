# Апдейты списков

Когда мутация меняет один элемент списочного запроса, полный рефетч обычно не нужен —
патчите элемент на месте через [`update`](/ru/api/mutations#update) (или `optimisticUpdate`).

## Патч элемента по id

```ts
import { update } from 'effector-query';

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
import { optimisticUpdate } from 'effector-query';

optimisticUpdate({
  query: todosQuery,
  on: toggleTodoMutation,
  update: ({ data, params: id }) => (data ?? []).map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
  // при успехе сверяем с серверной версией
  commit: ({ data, result: updated }) => (data ?? []).map((t) => (t.id === updated.id ? updated : t)),
});
```

Для постраничного списка (`createInfiniteQuery`) патчите внутри `$pages` тем же способом —
мапьте по странице, где лежит элемент.
