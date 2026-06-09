# Normalized list updates

When a mutation changes one item in a list query, you usually don't need a full refetch —
patch the item in place with [`update`](/api/mutations#update) (or `optimisticUpdate`).

## Patch an item by id

```ts
import { update } from 'effector-refetch';

// todosQuery.$data: Todo[]
update({
  query: todosQuery,
  on: toggleTodoMutation, // returns the updated Todo
  fn: ({ data, result: updated }) => (data ?? []).map((todo) => (todo.id === updated.id ? updated : todo)),
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
import { optimisticUpdate } from 'effector-refetch';

optimisticUpdate({
  query: todosQuery,
  on: toggleTodoMutation,
  update: ({ data, params: id }) => (data ?? []).map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
  // on success, reconcile with the server's version
  commit: ({ data, result: updated }) => (data ?? []).map((t) => (t.id === updated.id ? updated : t)),
});
```

## Paginated lists (`createInfiniteQuery`)

`update` / `optimisticUpdate` accept an infinite query too — there `data` is the **array of
pages**, so map over the pages and patch the item in place (no refetch, no flicker):

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

The same shape works with `optimisticUpdate` (its `update`/`commit` callbacks also receive the
page array). Patches go through the query's `__.setData` seam, so they're scope-correct.
