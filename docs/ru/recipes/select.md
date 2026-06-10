# Выбор срезов (select)

Иногда компоненту нужен только **срез** данных запроса, и ре-рендериться он должен лишь при
изменении этого среза (в TanStack это `select`). Добавлять ничего не нужно — `$data` запроса это
обычный стор effector, и нативные примитивы уже это умеют.

::: tip select vs `mapData`
`mapData` меняет форму данных для **всего запроса** (все потребители видят преобразованное
значение). Срез — **per-consumer**: каждый компонент выводит свой вид, не трогая запрос. Берите
`mapData`, когда форма глобальна, и срез — когда локальна.
:::

## React / Solid — `useStoreMap`

`useStoreMap` подписывается на производное значение и ре-рендерит только при его реальном
изменении:

```ts
// React — effector-react
import { useStoreMap } from 'effector-react';
const name = useStoreMap(userQuery.$data, (u) => u?.name ?? '');

// Solid — effector-solid (возвращает accessor)
import { useStoreMap } from 'effector-solid';
const name = useStoreMap(userQuery.$data, (u) => u?.name ?? '');
// используйте name()
```

Нужны параметры в ключе селектора? Полная форма: `useStoreMap({ store, keys: [id], fn })`.

## Vue — `computed`

В effector-vue нет `useStoreMap`, но `computed` поверх привязанного ref эквивалентен:

```ts
import { useUnit } from 'effector-vue/composition';
import { computed } from 'vue';

const data = useUnit(userQuery.$data);
const name = computed(() => data.value?.name ?? '');
```

## Headless / код модели

Вне компонента выведите стор один раз через `.map` — он обновляется только при изменении среза:

```ts
const $userName = userQuery.$data.map((u) => u?.name ?? null);
```

Это тот самый строительный блок, что используют биндинги; создавайте его на уровне модуля (не на
каждый рендер) и подписывайтесь где угодно.
