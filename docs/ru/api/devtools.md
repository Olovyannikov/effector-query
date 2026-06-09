# Devtools

Плавающая панель devtools — как у TanStack Query — со списком запросов, их живым статусом,
параметрами, данными, ошибкой и логом событий по каждому запросу. Только React, импорт из
`effector-query/devtools`, вытряхивается из основного бандла tree-shaking-ом.

```tsx
import { EffectorQueryDevtools } from 'effector-query/devtools';

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

## Как это выглядит

```
 ┌ effector-query · devtools ───────────────────── ✕ ┐
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

В свёрнутом виде настоящая панель — небольшая «пилюля» `⚡ queries (N)` в углу; клик разворачивает её.

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
