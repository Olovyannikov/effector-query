# Биндинги фреймворков

Query реализует протокол effector `@@unitShape`, поэтому его можно передать прямо в
`useUnit` из **effector-react**, **effector-vue** или **effector-solid** — без обёрток.

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

`useUnit(query)` отдаёт `{ data, error, status, pending, stale, enabled, params, start,
refetch, refresh, reset, cancel }`.

## Хелперы useQuery

Тонкие хелперы с производными флагами (`isInitial / isPending / isDone / isFail`):

```tsx
// React — effector-refetch/react
import { useQuery } from 'effector-refetch/react';
const { data, isPending, isFail, error, start } = useQuery(userQuery);
useEffect(() => start(id), [id]); // запросы не стартуют сами
```

```vue
<!-- Vue — effector-refetch/vue (возвращает ref-ы) -->
<script setup lang="ts">
import { useQuery } from 'effector-refetch/vue';
const { data, isPending, isDone, start } = useQuery(userQuery);
</script>
```

```tsx
// Solid — effector-refetch/solid (возвращает accessor-ы — вызывайте их)
import { useQuery } from 'effector-refetch/solid';

function UserCard(props: { id: number }) {
  const { data, isPending, isFail, start } = useQuery(userQuery);
  start(props.id); // запросы не стартуют сами
  return <div>{isPending() ? 'Loading…' : data()?.name}</div>;
}
```

React работает с `<Provider value={scope}>`, Vue — с `EffectorScopePlugin`, Solid — с
`<Provider>` из effector-solid; всё для SSR / `fork`. Биндинги требуют соответствующих
опциональных peer-зависимостей (`react`+`effector-react` / `vue`+`effector-vue` /
`solid-js`+`effector-solid`).
