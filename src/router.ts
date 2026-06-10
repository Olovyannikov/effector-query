import { sample, type Event, type EventCallable } from 'effector';

/**
 * Minimal structural shape of an atomic-router `RouteInstance` (the library is
 * not imported — anything with `opened`/`closed` works).
 */
export interface RouteLike<RouteParams> {
  opened: Event<{ params: RouteParams; query?: Record<string, string> }>;
  closed?: Event<unknown>;
}

export interface AttachToRouteConfig<RouteParams, QueryParams> {
  route: RouteLike<RouteParams>;
  /** A Query or InfiniteQuery (anything with `start` + `reset`). */
  query: { start: EventCallable<QueryParams>; reset: EventCallable<void> };
  /** Map the route's `opened` payload to the query's params. Default: the route params. */
  mapParams?: (opened: { params: RouteParams; query?: Record<string, string> }) => QueryParams;
  /** Reset the query when the route closes. Default: true. */
  resetOnClose?: boolean;
}

/**
 * Start a query when a route opens (with its params) and reset it when the route
 * closes — the atomic-router glue, without importing atomic-router:
 *
 *   attachToRoute({ route: userRoute, query: userQuery, mapParams: ({ params }) => Number(params.id) });
 *
 * Pure `sample` under the hood, so it's scope-correct/SSR-friendly.
 */
export function attachToRoute<RouteParams, QueryParams = RouteParams>(
  config: AttachToRouteConfig<RouteParams, QueryParams>,
): void {
  const { route, query, mapParams, resetOnClose = true } = config;

  sample({
    clock: route.opened,
    fn: mapParams ?? ((opened) => opened.params as unknown as QueryParams),
    target: query.start,
  });

  if (resetOnClose && route.closed) {
    sample({ clock: route.closed, target: query.reset });
  }
}
