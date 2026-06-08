# Normalized list updates

When a mutation changes one item in a list query, you usually don't need a full refetch —
patch the item in place with [`update`](/api/mutations#update) (or `optimisticUpdate`).

## Patch an item by id

```ts
import { update } from 'effector-query';

// todosQuery.$data: Todo[]
update({
  query: todosQuery,
  on: toggleTodoMutation, // returns the updated Todo
  fn: ({ data, result: updated }) =>
    (data ?? []).map((todo) => (todo.id === updated.id ? updated : todo)),
});
```

## Remove an item

```ts
update({
  query: todosQuery,
  on: deleteTodoMutation, // params: id
  fn: ({ data, params: id }) => (data ?? []).filter((todo) => todo.id !== id),
});
```

## Optimistic toggle with rollback

```ts
import { optimisticUpdate } from 'effector-query';

optimisticUpdate({
  query: todosQuery,
  on: toggleTodoMutation,
  update: ({ data, params: id }) =>
    (data ?? []).map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
  // on success, reconcile with the server's version
  commit: ({ data, result: updated }) =>
    (data ?? []).map((t) => (t.id === updated.id ? updated : t)),
});
```

For a paginated list (`createInfiniteQuery`), patch within `$pages` the same way —
map over the page that contains the item.
