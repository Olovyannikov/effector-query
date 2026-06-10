/**
 * atomic-router integration: start a query when its route opens (with the route
 * params) and reset it when the route closes — via `attachToRoute`.
 *
 * Illustrative (fake effect; wire `createHistoryRouter` to a real history).
 */
import { createRoute } from 'atomic-router';
import { createQuery, createRequestFx, attachToRoute } from '../src';

interface User {
  id: number;
  name: string;
}

const fetchUserFx = createRequestFx<number, User>((id, { signal }) =>
  fetch(`/api/users/${id}`, { signal }).then((r) => r.json()),
);
export const userQuery = createQuery({ effect: fetchUserFx, cache: { staleAfter: 30_000 } });

// a route like `/users/:id`
export const userRoute = createRoute<{ id: string }>();

// opening the route runs the query with its params; closing it resets the query
attachToRoute({
  route: userRoute,
  query: userQuery,
  mapParams: ({ params }) => Number(params.id),
  // resetOnClose: true (default)
});

// Now, wherever you render the route, `userQuery.$data` is already loading/loaded
// from the route — no effect in the component. Wire the history to activate routes:
//   import { createHistoryRouter } from 'atomic-router';
//   const router = createHistoryRouter({ routes: [{ route: userRoute, path: '/users/:id' }] });
//   router.setHistory(createBrowserHistory());
