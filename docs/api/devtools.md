# Devtools

A floating devtools panel — like TanStack Query's — that lists your queries with live
status, params, data, error and a per-query event log. Available for **React**
(`effector-refetch/devtools`), **Vue** (`effector-refetch/devtools/vue`) and **Solid**
(`effector-refetch/devtools/solid`) with the same props, and tree-shaken out of your core bundle.

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

Pass the queries you want to inspect, keyed by display name. The panel is scope-aware via
effector-react's `<Provider>` (so it works with SSR / `fork`).

## Vue

The same panel for Vue — identical props, scope-aware via effector-vue's `EffectorScopePlugin`:

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

Same panel for Solid — identical props, scope-aware via effector-solid's `<Provider>`:

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

## What it looks like

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

## Try it live

A real query wired to the library — click the buttons and watch status, data and the
event log update (with retry on failure):

<DevtoolsDemo />

### Multiple queries

The same panel, embedded inline (like TanStack's `DevtoolsPanel`), inspecting **several real
queries at once**. Click **⚡ queries** to open it, pick a query in the left tab list, then
drive it — each tab keeps its own status, params, data, error and log:

<DevtoolsWidget />

The widget also wires two relationships you can watch fire:

- **`connectQuery`** — loading `users` cascades into `profile` (its params derived from the result),
  so both tabs light up in sequence.
- **`invalidate`** — _Invalidate all_ refetches every query that has already run, with its last
  params, bypassing cache freshness.

```ts
import { connectQuery, invalidate } from 'effector-refetch';

// a successful users load starts profile with derived params
connectQuery({
  source: usersQuery,
  fn: ({ result }) => ({ params: { id: result[0].id } }),
  target: profileQuery,
});

// one signal refetches everything that has run (e.g. after a mutation)
invalidate({ on: dataChanged, refetch: [usersQuery, todosQuery, profileQuery] });
```

Collapsed, the floating panel is a small `⚡ queries (N)` pill in the corner; click to expand.

- A colored dot per query: grey `initial`, amber `pending`, green `done`, red `fail`.
- The detail pane shows **params**, **data** and **error** as JSON, plus a live **log**
  (`start / run / done / fail / aborted / cache-hit / cache-miss / retry`) with per-run
  duration — powered by the same [introspection stream](/api/introspection).

## Props

| prop            | type                              | default          |
| --------------- | --------------------------------- | ---------------- |
| `queries`       | `Record<string, Query>`           | —                |
| `initialIsOpen` | `boolean`                         | `false`          |
| `position`      | `'bottom-right' \| 'bottom-left'` | `'bottom-right'` |

::: tip
Render it only in development (`import.meta.env.DEV`) and it won't ship to production.
Prefer headless logging instead? Use [`attachQueryLogger`](/api/introspection#attachquerylogger).
:::
