# Биндинги фреймворков

Query реализует протокол effector `@@unitShape`, поэтому его можно передать прямо в
`useUnit` из **effector-react** или **effector-vue** — без обёрток.

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
// React — effector-query/react
import { useQuery } from 'effector-query/react';
const { data, isPending, isFail, error, start } = useQuery(userQuery);
useEffect(() => start(id), [id]); // запросы не стартуют сами
```

```vue
<!-- Vue — effector-query/vue (возвращает ref-ы) -->
<script setup lang="ts">
import { useQuery } from 'effector-query/vue';
const { data, isPending, isDone, start } = useQuery(userQuery);
</script>
```

React работает с `<Provider value={scope}>`, Vue — с `EffectorScopePlugin`, для SSR.
Биндинги требуют опциональных peer-зависимостей `react`+`effector-react` /
`vue`+`effector-vue`. Биндинг Solid — в планах.
