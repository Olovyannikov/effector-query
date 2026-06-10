/**
 * Standalone operators: the inline createQuery options are sugar over these, but
 * you can also apply them to any query/mutation after creation. All composable.
 *
 * Run: npx tsx examples/operators.ts
 */
import { allSettled, createEffect, createStore, createEvent, fork } from 'effector';
import {
  createQuery,
  concurrency,
  retry,
  cache,
  timeout,
  keepFresh,
  applyBarrier,
  createBarrier,
  exponentialDelay,
  createRequestFx,
  type RequestError,
} from '../src';

interface Product {
  id: number;
  title: string;
}

const fetchProductsFx = createRequestFx<{ q: string }, Product[]>(({ q }, { signal }) =>
  fetch(`/api/products?q=${q}`, { signal }).then((r) => r.json()),
);

// build a bare query, then layer operators onto it
const productsQuery = createQuery({ effect: fetchProductsFx });

concurrency(productsQuery, { strategy: 'TAKE_LATEST' }); // new search aborts the previous
retry(productsQuery, {
  times: 3,
  delay: exponentialDelay(200),
  filter: ({ error }) => (error as RequestError).status !== 404, // don't retry 404
});
cache(productsQuery, { staleAfter: 30_000, swr: true }); // serve stale, revalidate in background
timeout(productsQuery, 5000); // abort + fail a single attempt after 5s

// refetch (with last params) whenever filters change
const setCategory = createEvent<string>();
const $category = createStore('all').on(setCategory, (_c, next) => next);
keepFresh(productsQuery, { source: $category });

// pause every run while a token refresh is in flight (401 → refresh → resume)
const refreshTokenFx = createEffect(async () => {
  /* refresh auth */
});
const authBarrier = createBarrier({ perform: refreshTokenFx });
applyBarrier(productsQuery, authBarrier);

async function main() {
  const scope = fork();
  await allSettled(productsQuery.start, { scope, params: { q: 'phone' } });
  console.log('status:', scope.getState(productsQuery.$status));

  // changing the source refetches with the last params ({ q: 'phone' })
  await allSettled(setCategory, { scope, params: 'electronics' });
  console.log('refetched on category change');
}

main().catch((e) => console.error('demo failed:', e));
