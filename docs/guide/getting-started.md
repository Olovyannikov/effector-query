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

Hover the identifiers below — these snippets are **type-checked** with [Twoslash](https://twoslash.netlify.app/)
against the real types:

```ts twoslash
import { createEffect } from 'effector';
import { createQuery } from 'effector-refetch';

interface User {
  id: number;
  name: string;
}

// your effect — fetch / axios / ofetch, anything returning a Promise
const fetchUserFx = createEffect(async (id: number): Promise<User> => {
  return { id, name: 'Ada' };
});

const userQuery = createQuery({
  effect: fetchUserFx,
  retry: 2,
  cache: true,
  concurrency: 'TAKE_LATEST',
});

userQuery.start(1);
// hover userQuery.$data → Store<User | null>, $status, $pending, … all typed
```

## Connecting queries

```ts twoslash
import { createEffect } from 'effector';
import { createQuery, connectQuery } from 'effector-refetch';

interface Character {
  origin: { url: string };
}
const characterQuery = createQuery({
  effect: createEffect(async (id: number): Promise<Character> => ({ origin: { url: `/o/${id}` } })),
});
const originQuery = createQuery({
  effect: createEffect(async (p: { url: string }): Promise<{ name: string }> => ({ name: 'Earth' })),
});
// ---cut---
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
