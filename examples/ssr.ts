/**
 * SSR: fetch on the server, hand the data to the client with no refetch/flicker,
 * then persist it in the browser.
 *
 * Two layers travel from server to client:
 *   1. store state ($data / $status / …) — effector's `serialize(scope)` → `fork({ values })`;
 *   2. the query *cache* (lives outside the scope) — our `dehydrate` → `hydrate`.
 *
 * On the client we also persist across reloads, shown two ways:
 *   - cache layer: use `localStorageCache` as the adapter (the cache survives reloads);
 *   - store layer: `effector-storage`'s `persist($data)` (the store survives reloads).
 *
 * Illustrative (fake effect + payload); wire into your real SSR framework.
 */
import { allSettled, createEffect, fork, serialize, type StoreWritable } from 'effector';
import { persist } from 'effector-storage/local';
import {
  createQuery,
  inMemoryCache,
  localStorageCache,
  dehydrate,
  hydrate,
  type DehydratedEntry,
} from '../src';

interface Todo {
  id: number;
  title: string;
}

const fetchTodosFx = createEffect(
  (userId: number): Promise<Todo[]> => fetch(`/api/users/${userId}/todos`).then((r) => r.json()),
);

interface SsrPayload {
  values: Record<string, unknown>; // effector store values
  cache: DehydratedEntry[]; // query cache snapshot
}

// ---- server ----
export async function renderOnServer(userId: number): Promise<SsrPayload> {
  const cache = inMemoryCache();
  const todosQuery = createQuery({ effect: fetchTodosFx, cache: { adapter: cache, staleAfter: 60_000 } });

  const scope = fork();
  await allSettled(todosQuery.start, { scope, params: userId });

  return {
    values: serialize(scope), // $data, $status, … per scope
    cache: dehydrate(cache), // cached entries (keyed by params)
  };
}

// ---- client ----
export function bootstrapOnClient(payload: SsrPayload) {
  // cache layer: a localStorage-backed adapter that ALSO survives reloads
  const cache = localStorageCache({ version: 1, maxAge: 60_000 });
  hydrate(cache, payload.cache); // warm it with the server's entries

  const todosQuery = createQuery({ effect: fetchTodosFx, cache: { adapter: cache, staleAfter: 60_000 } });

  // $data / $status restored — UI renders immediately, no loading flash, no refetch
  const scope = fork({ values: payload.values });

  // store layer: keep $data in localStorage across reloads (effector-storage).
  // $data is exposed read-only but is writable at runtime — cast for persist.
  persist({ store: todosQuery.$data as StoreWritable<Todo[] | null>, key: 'todos:data' });

  return { todosQuery, scope };
}

// usage (server): const payload = await renderOnServer(1); // -> inline into HTML as JSON
// usage (client): const { todosQuery, scope } = bootstrapOnClient(window.__SSR__);
