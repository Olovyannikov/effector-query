# Devtools

Плавающая панель devtools — как у TanStack Query — со списком запросов, их живым статусом,
параметрами, данными, ошибкой и логом событий по каждому запросу. Доступна для **React**
(`effector-refetch/devtools`), **Vue** (`effector-refetch/devtools/vue`) и **Solid**
(`effector-refetch/devtools/solid`) с одинаковыми пропсами, вытряхивается из основного бандла
tree-shaking-ом.

```tsx
import { EffectorQueryDevtools } from 'effector-refetch/devtools';

function App() {
  return (
    <>
      <Routes />
      {import.meta.env.DEV && <EffectorQueryDevtools queries={{ user: userQuery, todos: todosQuery }} />}
    </>
  );
}
```

Передайте запросы, которые хотите инспектировать, ключами по отображаемому имени. Панель
учитывает scope через `<Provider>` из effector-react (работает с SSR / `fork`).

## Vue

Та же панель для Vue — идентичные пропсы, scope через `EffectorScopePlugin` из effector-vue:

```vue
<script setup>
import { EffectorQueryDevtools } from 'effector-refetch/devtools/vue';
import { userQuery, todosQuery } from './model';
</script>

<template>
  <RouterView />
  <EffectorQueryDevtools v-if="import.meta.env.DEV" :queries="{ user: userQuery, todos: todosQuery }" />
</template>
```

## Solid

Та же панель для Solid — идентичные пропсы, scope через `<Provider>` из effector-solid:

```tsx
import { EffectorQueryDevtools } from 'effector-refetch/devtools/solid';

function App() {
  return (
    <>
      <Routes />
      {import.meta.env.DEV && <EffectorQueryDevtools queries={{ user: userQuery, todos: todosQuery }} />}
    </>
  );
}
```

## Как это выглядит

```
 ┌ effector-refetch · devtools ───────────────────── ✕ ┐
 │ ● user        │  ● user   done                     │
 │ ● todos  •••  │  PARAMS   7                         │
 │               │  DATA     { "id": 7, "name": "…" }  │
 │               │  LOG      start                     │
 │               │           run #0                    │
 │               │           done (42ms)               │
 └───────────────┴────────────────────────────────────┘
```

## Попробовать вживую

Настоящий query, подключённый к библиотеке — жмите кнопки и смотрите, как обновляются
статус, данные и лог событий (с ретраем при ошибке):

<DevtoolsDemo />

### Несколько запросов

Та же панель, встроенная прямо в страницу (как `DevtoolsPanel` у TanStack), инспектирует
**сразу несколько живых запросов**. Нажмите **⚡ queries**, чтобы открыть её, выберите запрос
в списке-табах слева и управляйте им — каждый таб хранит свой статус, params, data, error и лог:

<DevtoolsWidget />

В виджете также связаны два отношения, срабатывание которых видно вживую:

- **`connectQuery`** — успешная загрузка `users` каскадом запускает `profile` (его параметры
  выводятся из результата), так что оба таба загораются по очереди.
- **`invalidate`** — _Invalidate all_ рефетчит каждый уже запускавшийся запрос с его последними
  параметрами, в обход свежести кэша.

```ts
import { connectQuery, invalidate } from 'effector-refetch';

// успешная загрузка users запускает profile с выведенными параметрами
connectQuery({
  source: usersQuery,
  fn: ({ result }) => ({ params: { id: result[0].id } }),
  target: profileQuery,
});

// один сигнал рефетчит всё, что уже запускалось (например, после мутации)
invalidate({ on: dataChanged, refetch: [usersQuery, todosQuery, profileQuery] });
```

В свёрнутом виде плавающая панель — небольшая «пилюля» `⚡ queries (N)` в углу; клик разворачивает её.

- Цветная точка у каждого запроса: серый `initial`, янтарный `pending`, зелёный `done`, красный `fail`.
- Панель деталей показывает **params**, **data** и **error** как JSON, плюс живой **log**
  (`start / run / done / fail / aborted / cache-hit / cache-miss / retry`) с длительностью
  прогона — на том же [потоке интроспекции](/ru/api/introspection).

## Пропсы

| проп            | тип                               | по умолчанию     |
| --------------- | --------------------------------- | ---------------- |
| `queries`       | `Record<string, Query>`           | —                |
| `initialIsOpen` | `boolean`                         | `false`          |
| `position`      | `'bottom-right' \| 'bottom-left'` | `'bottom-right'` |

::: tip
Рендерите только в дев-режиме (`import.meta.env.DEV`) — тогда панель не попадёт в прод.
Нужно безголовое логирование? Используйте [`attachQueryLogger`](/ru/api/introspection#attachquerylogger).
:::
