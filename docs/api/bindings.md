# Framework bindings

A query implements effector's `@@unitShape` protocol, so you can pass it straight to
`useUnit` from **effector-react** or **effector-vue** — no wrapper needed.

```tsx
// React
import { useUnit } from 'effector-react';

function UserCard({ id }: { id: number }) {
  const { data, pending, error, refetch } = useUnit(userQuery);
  return pending ? <Spinner /> : <div onClick={() => refetch(id)}>{data?.name}</div>;
}
```

```vue
<!-- Vue -->
<script setup lang="ts">
import { useUnit } from 'effector-vue/composition';
const { data, pending, refetch } = useUnit(userQuery);
</script>
```

`useUnit(query)` yields `{ data, error, status, pending, stale, enabled, params, start,
refetch, refresh, reset, cancel }`.

## useQuery helpers

Thin helpers that add derived booleans (`isInitial / isPending / isDone / isFail`):

```tsx
// React — effector-query/react
import { useQuery } from 'effector-query/react';
const { data, isPending, isFail, error, start } = useQuery(userQuery);
useEffect(() => start(id), [id]); // queries never auto-start
```

```vue
<!-- Vue — effector-query/vue (returns refs) -->
<script setup lang="ts">
import { useQuery } from 'effector-query/vue';
const { data, isPending, isDone, start } = useQuery(userQuery);
</script>
```

React works with `<Provider value={scope}>`, Vue with the `EffectorScopePlugin`, for SSR.
Bindings require the optional `react`+`effector-react` / `vue`+`effector-vue` peers.
A Solid binding is on the roadmap.
