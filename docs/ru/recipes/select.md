# Выбор срезов (select)

Иногда компоненту нужен только **срез** данных запроса, и ре-рендериться он должен лишь при
изменении этого среза (в TanStack это `select`). Добавлять ничего не нужно — `$data` запроса это
обычный стор effector, и нативные примитивы уже это умеют.

::: tip select vs `mapData`
`mapData` меняет форму данных для **всего запроса** (все потребители видят преобразованное
значение). Срез — **per-consumer**: каждый компонент выводит свой вид, не трогая запрос. Берите
`mapData`, когда форма глобальна, и срез — когда локальна.
:::

## В компоненте — `useStoreMap`

`useStoreMap` есть у каждого биндинга: он подписывается на производное значение и обновляется
только при его реальном изменении.

```ts
// React — effector-react
import { useStoreMap } from 'effector-react';
const name = useStoreMap(userQuery.$data, (u) => u?.name ?? '');

// Solid — effector-solid (возвращает accessor — вызывайте: name())
import { useStoreMap } from 'effector-solid';
const name = useStoreMap(userQuery.$data, (u) => u?.name ?? '');
```

```ts
// Vue — effector-vue/composition (форма с конфигом; возвращает ComputedRef — name.value)
import { useStoreMap } from 'effector-vue/composition';
const name = useStoreMap({ store: userQuery.$data, fn: (u) => u?.name ?? '' });
```

Нужны параметры в ключе селектора (например, взять элемент по id)? Передайте `keys`:
`useStoreMap({ store, keys: [id], fn: (list, [id]) => list.find((x) => x.id === id) })`
(React/Solid принимают и короткую форму `useStoreMap(store, fn)`).

## Headless / код модели

Вне компонента выведите стор один раз через `.map` — он обновляется только при изменении среза:

```ts
const $userName = userQuery.$data.map((u) => u?.name ?? null);
```

Это тот самый строительный блок, что используют биндинги; создавайте его на уровне модуля (не на
каждый рендер) и подписывайтесь где угодно.
