/**
 * Standalone operators: the inline createQuery options are sugar over these, but
 * you can also apply them to any query/mutation after creation. All composable.
 *
 * Run: npx tsx examples/operators.ts
 */
import { allSettled, createEffect, createStore, createEvent, fork } from 'effector';
import {
  createQuery,
  createMutation,
  concurrency,
  retry,
  cache,
  timeout,
  keepFresh,
  applyBarrier,
  createBarrier,
  exponentialDelay,
  createRequestFx,
  isTrigger,
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

// …and also whenever a write succeeds (a mutation IS a @@trigger: fired = finished.done)
const createProductFx = createRequestFx<{ title: string }, Product>((body, { signal }) =>
  fetch('/api/products', { method: 'POST', body: JSON.stringify(body), signal }).then((r) => r.json()),
);
const createProductMutation = createMutation({ effect: createProductFx });
console.log('mutation is a @@trigger?', isTrigger(createProductMutation)); // true
keepFresh(productsQuery, { triggers: [createProductMutation] });

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

  // a successful mutation refetches the list too (via its @@trigger)
  await allSettled(createProductMutation.start, { scope, params: { title: 'New phone' } });
  console.log('refetched after the create mutation succeeded');
}

main().catch((e) => console.error('demo failed:', e));
