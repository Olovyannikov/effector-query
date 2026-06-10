# Router & loaders

With a data router (React Router 6.4+, TanStack Router, …) you can fetch in the route **loader**,
so a page renders with its data already present — no in-component loading flash. effector-refetch
fits because a query is plain effector: the loader drives it through your scope, the component
reads it with `useUnit`.

## React Router loader

```tsx
import { allSettled, fork } from 'effector';
import { useUnit } from 'effector-react';
import { createBrowserRouter } from 'react-router-dom';

const userQuery = createQuery({ effect: fetchUserFx, cache: { staleAfter: 30_000 } });
const scope = fork(); // the same scope you render under <Provider value={scope}>

const router = createBrowserRouter([
  {
    path: '/users/:id',
    // run the query and wait for it before the route renders
    loader: async ({ params }) => {
      await allSettled(userQuery.start, { scope, params: Number(params.id) });
      return null; // data lives in userQuery.$data, not the loader result
    },
    Component: () => {
      const { data, pending, error } = useUnit(userQuery);
      if (error) return <p>Failed</p>;
      return <h1>{pending ? 'Loading…' : data?.name}</h1>; // pending only on a cache miss
    },
  },
]);
```

- **`cache`** makes revisits instant — the loader resolves from cache with no network call.
- **SSR**: build a fresh `scope` per request, run the loaders, then `serialize(scope)` →
  `fork({ values })` on the client (see [SSR & testing](/recipes/ssr-and-testing)).
- **No scope** (plain SPA): in the loader, `userQuery.start(id)` and `await` the query's
  `finished.finally` once, instead of `allSettled`.

The same shape works for TanStack Router's `loader`, or any framework that fetches before render.

Runnable: [`examples/react-router.tsx`](https://github.com/Olovyannikov/effector-refetch/blob/main/examples/react-router.tsx).

## atomic-router

For effector's own router, `attachToRoute` is the glue: start the query when the route **opens**
(with its params) and reset it when the route **closes** — no component effect.

```ts
import { createRoute } from 'atomic-router';
import { attachToRoute } from 'effector-refetch';

const userRoute = createRoute<{ id: string }>();

attachToRoute({
  route: userRoute,
  query: userQuery,
  mapParams: ({ params }) => Number(params.id), // route params → query params
  // resetOnClose: true (default)
});
```

It's structural (atomic-router isn't imported — any object with `opened`/`closed` works) and pure
`sample` under the hood, so it's scope-correct for SSR. `mapParams` is optional when the route
params already match the query's. Runnable:
[`examples/atomic-router.ts`](https://github.com/Olovyannikov/effector-refetch/blob/main/examples/atomic-router.ts).
