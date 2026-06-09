import { describe, it, expect } from 'vitest';
import { allSettled, createEffect, fork } from 'effector';
import { createInfiniteQuery, createMutation, update, optimisticUpdate } from '../src';

interface Item {
  id: number;
  title: string;
  done: boolean;
}
interface Page {
  items: Item[];
  next: number | null;
}

function makeQuery() {
  const fetchPage = createEffect(
    async ({ pageParam }: { params: void; pageParam: number }): Promise<Page> => ({
      items: [
        { id: pageParam * 2, title: `t${pageParam * 2}`, done: false },
        { id: pageParam * 2 + 1, title: `t${pageParam * 2 + 1}`, done: false },
      ],
      next: pageParam < 1 ? pageParam + 1 : null,
    }),
  );
  return createInfiniteQuery({
    effect: fetchPage,
    initialPageParam: 0,
    getNextPageParam: ({ lastPage }) => lastPage.next,
  });
}

// patch one item across all pages
const patchItem = (pages: Page[] | null, id: number, fn: (i: Item) => Item): Page[] =>
  (pages ?? []).map((p) => ({ ...p, items: p.items.map((i) => (i.id === id ? fn(i) : i)) }));

describe('update / optimisticUpdate on an infinite query', () => {
  it('update patches a page item in place from a mutation', async () => {
    const query = makeQuery();
    const toggleFx = createEffect(async (id: number) => id);
    const toggle = createMutation({ effect: toggleFx });

    update({
      query,
      on: toggle,
      fn: ({ data, result: id }) => patchItem(data, id, (i) => ({ ...i, done: !i.done })),
    });

    const scope = fork();
    await allSettled(query.start, { scope, params: undefined });
    await allSettled(query.fetchNext, { scope });
    // two pages, 4 items (ids 0..3)
    expect(scope.getState(query.$pages).flatMap((p) => p.items).length).toBe(4);

    await allSettled(toggle.start, { scope, params: 3 });
    const items = scope.getState(query.$pages).flatMap((p) => p.items);
    expect(items.find((i) => i.id === 3)!.done).toBe(true);
    expect(items.find((i) => i.id === 0)!.done).toBe(false); // others untouched
  });

  it('optimisticUpdate patches immediately and rolls back on failure', async () => {
    const query = makeQuery();
    let shouldFail = false;
    const renameFx = createEffect(async (p: { id: number; title: string }) => {
      if (shouldFail) throw new Error('nope');
      return p;
    });
    const rename = createMutation({ effect: renameFx });

    optimisticUpdate({
      query,
      on: rename,
      update: ({ data, params }) =>
        patchItem(data as Page[], params.id, (i) => ({ ...i, title: params.title })),
    });

    const scope = fork();
    await allSettled(query.start, { scope, params: undefined });

    // success: optimistic value stays
    await allSettled(rename.start, { scope, params: { id: 1, title: 'renamed' } });
    expect(
      scope
        .getState(query.$pages)
        .flatMap((p) => p.items)
        .find((i) => i.id === 1)!.title,
    ).toBe('renamed');

    // failure: rolls back to the previous title
    shouldFail = true;
    await allSettled(rename.start, { scope, params: { id: 0, title: 'broken' } });
    expect(
      scope
        .getState(query.$pages)
        .flatMap((p) => p.items)
        .find((i) => i.id === 0)!.title,
    ).toBe('t0');
  });
});
