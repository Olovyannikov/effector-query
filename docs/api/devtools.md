# Devtools

A floating devtools panel — like TanStack Query's — that lists your queries with live
status, params, data, error and a per-query event log. React-only, imported from
`effector-refetch/devtools`, and tree-shaken out of your core bundle.

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

Collapsed, the real panel is a small `⚡ queries (N)` pill in the corner; click to expand.

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
