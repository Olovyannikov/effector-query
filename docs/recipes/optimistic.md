# Optimistic updates

Show a change instantly, roll back on failure, reconcile with the server on success —
then optionally `invalidate` to confirm against server truth (the TanStack pattern).

```ts
import { createQuery, createMutation, optimisticUpdate, invalidate } from 'effector-refetch';

const todosQuery = createQuery({ effect: fetchTodosFx });
const addTodo = createMutation({ effect: addTodoFx });

optimisticUpdate({
  query: todosQuery,
  on: addTodo,
  // applied immediately on addTodo.mutate(...)
  update: ({ data, params }) => [{ id: -1, text: params.text, pending: true }, ...(data ?? [])],
  // reconcile the temp item with the server result on success
  commit: ({ data, result }) => (data ?? []).map((t) => (t.id === -1 ? result : t)),
  // rollbackOnFailure defaults to true
});

// reconcile against server truth as well
invalidate({ on: addTodo, refetch: todosQuery });

addTodo.mutate({ text: 'Buy milk' });
```

## How it works

- On `addTodo` **start**, the previous `$data` is snapshotted and the optimistic value applied.
- On **failure**, `$data` is rolled back to the snapshot.
- On **success**, `commit` reconciles (or the optimistic value is kept if no `commit`).

::: warning
Optimistic updates assume effectively-serial mutations per query (the common case).
Heavily interleaved concurrent mutations on the same query can clobber each other's
rollback snapshot.
:::
