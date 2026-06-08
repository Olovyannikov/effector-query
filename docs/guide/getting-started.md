# Getting started

`effector-query` is a small, friendly query layer for [effector](https://effector.dev),
built on **real effects**. The unit of work is your own `Effect<Params, Result, Error>`
(including `attach`-built factory effects) — the query is just a thin reactive shell.

## Install

```bash
pnpm add effector-query effector
```

Framework bindings are optional peer-scoped subpaths:

```bash
pnpm add effector-react react       # for effector-query/react
pnpm add effector-vue vue           # for effector-query/vue
```

## Your first query

```ts
import { createEffect } from 'effector';
import { createQuery } from 'effector-query';

const fetchUserFx = createEffect((id: number) =>
  fetch(`/api/users/${id}`).then((r) => r.json()),
);

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
import { connectQuery } from 'effector-query';

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
