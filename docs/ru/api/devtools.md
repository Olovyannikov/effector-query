# Devtools

Плавающая панель devtools — как у TanStack Query — со списком запросов, их живым статусом,
параметрами, данными, ошибкой и логом событий по каждому запросу. Доступна для **React**
(`effector-refetch/devtools`) и **Vue** (`effector-refetch/devtools/vue`) с одинаковыми пропсами,
вытряхивается из основного бандла tree-shaking-ом.

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
**сразу несколько живых запросов**. Выберите запрос в списке-табах слева и управляйте им —
каждый таб хранит свой статус, params, data, error и лог:

<DevtoolsWidget />

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
