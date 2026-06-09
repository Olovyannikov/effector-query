import type { Query } from './types';

type AnyQuery = Query<any, any, any, any>;

const noop = () => {};

function onWindow(event: string, handler: () => void): () => void {
  if (typeof window === 'undefined') return noop;
  window.addEventListener(event, handler);
  return () => window.removeEventListener(event, handler);
}

function refetchIfActive(query: AnyQuery) {
  const params = query.$params.getState();
  if (params !== null && query.$enabled.getState()) query.refetch(params as never);
}

/**
 * Refetch the query when the window regains focus (browser only). The query must
 * have run at least once and be enabled. Returns an unsubscribe function.
 *
 * Reads the last params via `getState`, so it targets the no-scope store — ideal
 * for a single-client app. For scoped apps, drive `query.refetch` yourself with
 * `scopeBind`.
 */
export function refetchOnWindowFocus(query: AnyQuery): () => void {
  return onWindow('focus', () => refetchIfActive(query));
}

/** Refetch the query when the network comes back online (browser only). */
export function refetchOnReconnect(query: AnyQuery): () => void {
  return onWindow('online', () => refetchIfActive(query));
}
