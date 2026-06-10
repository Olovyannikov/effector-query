/**
 * React Router (data router) + effector-refetch: fetch in the route `loader` so
 * the page renders with data already present — no in-component loading flash.
 *
 * The loader drives the query through the app's effector scope; the component
 * reads it with `useUnit` (scope-aware via <Provider>). The loader returns
 * nothing useful — the data lives in the query's stores, not the loader result.
 */
import { createElement } from 'react';
import { allSettled, fork } from 'effector';
import { useUnit } from 'effector-react';
import { createBrowserRouter, type LoaderFunctionArgs } from 'react-router-dom';
import { createQuery, createRequestFx } from '../src';

interface User {
  id: number;
  name: string;
}

const fetchUserFx = createRequestFx<number, User>((id, { signal }) =>
  fetch(`/api/users/${id}`, { signal }).then((r) => r.json()),
);
const userQuery = createQuery({ effect: fetchUserFx, cache: { staleAfter: 30_000 }, name: 'user' });

// One scope for the whole app (also what you'd render under <Provider value={scope}>).
export const scope = fork();

// ---- route loader: kick off the query and wait for it to settle ----
async function userLoader({ params }: LoaderFunctionArgs) {
  await allSettled(userQuery.start, { scope, params: Number(params.id) });
  return null; // data is in userQuery.$data, read it in the component
}

function UserPage() {
  const { data, pending, error } = useUnit(userQuery);
  if (pending) return createElement('p', null, 'Loading…'); // only on a cache miss
  if (error) return createElement('p', null, 'Failed to load');
  return createElement('h1', null, data?.name ?? 'Unknown');
}

export const router = createBrowserRouter([
  {
    path: '/users/:id',
    loader: userLoader,
    Component: UserPage,
  },
]);

// Mount (e.g. in main.tsx):
//   import { Provider } from 'effector-react';
//   import { RouterProvider } from 'react-router-dom';
//   <Provider value={scope}><RouterProvider router={router} /></Provider>
//
// Notes:
//  - `cache` makes revisits instant (loader resolves from cache, no network);
//  - on the server, build a fresh scope per request and serialize(scope) → fork({values});
//  - no scope? In the loader await `userQuery.finished.finally` once instead of allSettled.
