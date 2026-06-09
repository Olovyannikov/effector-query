# Getting started

This page gets you from zero to a working query in a couple of minutes. For the _why_,
read the [Introduction](/guide/introduction) first.

`effector-refetch` is a small, friendly query layer for [effector](https://effector.dev),
built on **real effects**. The unit of work is your own `Effect<Params, Result, Error>`
(including `attach`-built factory effects) — the query is just a thin reactive shell.

::: tip Prerequisites
You'll want a basic feel for effector (`createEffect`, stores, `sample`). If you're new,
skim the [effector docs](https://effector.dev) — everything here is just plain effector
units composed for you.
:::

## Install

The package is published on npm as **`effector-refetch`** (`effector` is a peer dependency):

::: code-group

```bash [pnpm]
pnpm add effector-refetch effector
```

```bash [npm]
npm install effector-refetch effector
```

```bash [yarn]
yarn add effector-refetch effector
```

:::

Framework bindings are optional peer-scoped subpaths — install the peers you use:

::: code-group

```bash [React]
pnpm add effector-react react   # enables effector-refetch/react + /devtools
```

```bash [Vue]
pnpm add effector-vue vue       # enables effector-refetch/vue
```

:::

## Your first query

```ts
import { createEffect } from 'effector';
import { createQuery } from 'effector-refetch';

const fetchUserFx = createEffect((id: number) => fetch(`/api/users/${id}`).then((r) => r.json()));

const userQuery = createQuery({
  effect: fetchUserFx,
  retry: 2,
  cache: true,
  concurrency: 'TAKE_LATEST',
});

userQuery.start(1);
// userQuery.$data / $error / $status / $pending update reactively
```

## Connecting queries

```ts
import { connectQuery } from 'effector-refetch';

connectQuery({
  source: characterQuery,
  fn: ({ result: character }) => ({ params: { url: character.origin.url } }),
  target: originQuery,
});
```

When `characterQuery` resolves, `originQuery` starts automatically with the derived params.

## Next

- [Core concepts](/guide/concepts) — the effect-first model and lifecycle.
- [Queries API](/api/queries) — every option.
- [vs. farfetched](/guide/vs-farfetched) — how this compares.
