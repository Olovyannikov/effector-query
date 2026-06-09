# Оптимистичные апдейты

Показать изменение мгновенно, откатить при ошибке, сверить с сервером при успехе — и при
желании ещё `invalidate`, чтобы подтвердить серверной правдой (паттерн в духе TanStack).

```ts
import { createQuery, createMutation, optimisticUpdate, invalidate } from 'effector-refetch';

const todosQuery = createQuery({ effect: fetchTodosFx });
const addTodo = createMutation({ effect: addTodoFx });

optimisticUpdate({
  query: todosQuery,
  on: addTodo,
  // применяется сразу на addTodo.mutate(...)
  update: ({ data, params }) => [{ id: -1, text: params.text, pending: true }, ...(data ?? [])],
  // сверить временный элемент с серверным результатом при успехе
  commit: ({ data, result }) => (data ?? []).map((t) => (t.id === -1 ? result : t)),
  // rollbackOnFailure по умолчанию true
});

// дополнительно сверяемся с серверной правдой
invalidate({ on: addTodo, refetch: todosQuery });

addTodo.mutate({ text: 'Купить молоко' });
```

## Как это работает

- На **start** `addTodo` предыдущее `$data` снимается в снапшот, применяется оптимистичное значение.
- При **ошибке** `$data` откатывается к снапшоту.
- При **успехе** `commit` сверяет (или оптимистичное значение остаётся, если `commit` нет).

::: warning
Оптимистичные апдейты предполагают фактически последовательные мутации на запрос (частый
случай). Сильно переплетённые конкурентные мутации одного запроса могут затереть снапшот
отката друг друга.
:::
