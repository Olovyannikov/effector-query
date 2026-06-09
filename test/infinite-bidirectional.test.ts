import { describe, it, expect } from 'vitest';
import { allSettled, createEffect, fork } from 'effector';
import { createInfiniteQuery } from '../src';

// pages are numbered 0..N; page param is the page index
function makeQuery(maxPages?: number) {
  const fetchPage = createEffect(async ({ pageParam }: { params: void; pageParam: number }) => ({
    index: pageParam,
    items: [`p${pageParam}`],
  }));
  return createInfiniteQuery({
    effect: fetchPage,
    initialPageParam: 5, // start in the middle
    getNextPageParam: ({ lastPageParam }) => (lastPageParam < 7 ? lastPageParam + 1 : null),
    getPreviousPageParam: ({ firstPageParam }) => (firstPageParam > 3 ? firstPageParam - 1 : null),
    maxPages,
  });
}

describe('bidirectional infinite query', () => {
  it('fetchPrevious prepends, fetchNext appends', async () => {
    const query = makeQuery();
    const scope = fork();
    await allSettled(query.start, { scope, params: undefined });
    expect(scope.getState(query.$pageParams)).toEqual([5]);
    expect(scope.getState(query.$hasNextPage)).toBe(true);
    expect(scope.getState(query.$hasPreviousPage)).toBe(true);

    await allSettled(query.fetchNext, { scope });
    expect(scope.getState(query.$pageParams)).toEqual([5, 6]);

    await allSettled(query.fetchPrevious, { scope });
    expect(scope.getState(query.$pageParams)).toEqual([4, 5, 6]);

    await allSettled(query.fetchPrevious, { scope });
    expect(scope.getState(query.$pageParams)).toEqual([3, 4, 5, 6]);
    expect(scope.getState(query.$hasPreviousPage)).toBe(false); // 3 is the start
  });

  it('maxPages caps the window, dropping the opposite end', async () => {
    const query = makeQuery(2);
    const scope = fork();
    await allSettled(query.start, { scope, params: undefined }); // [5]
    await allSettled(query.fetchNext, { scope }); // [5,6]
    await allSettled(query.fetchNext, { scope }); // append 7 -> cap 2 -> drop front -> [6,7]
    expect(scope.getState(query.$pageParams)).toEqual([6, 7]);

    await allSettled(query.fetchPrevious, { scope }); // prepend 5 -> cap 2 -> drop back -> [5,6]
    expect(scope.getState(query.$pageParams)).toEqual([5, 6]);
  });

  it('without getPreviousPageParam, fetchPrevious is a no-op', async () => {
    let calls = 0;
    const query = createInfiniteQuery({
      effect: createEffect(async ({ pageParam }: { params: void; pageParam: number }) => {
        calls++;
        return pageParam;
      }),
      initialPageParam: 0,
      getNextPageParam: () => null,
    });
    const scope = fork();
    await allSettled(query.start, { scope, params: undefined });
    expect(calls).toBe(1);
    expect(scope.getState(query.$hasPreviousPage)).toBe(false);
    await allSettled(query.fetchPrevious, { scope });
    expect(calls).toBe(1);
  });
});
