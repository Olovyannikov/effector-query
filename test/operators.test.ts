import { describe, it, expect } from 'vitest';
import { allSettled, createEffect, createEvent, fork } from 'effector';
import { cache, concurrency, createQuery, retry } from '../src';

/** A query with no inline options — operators are applied standalone afterwards. */
function bareQuery<P, R>(handler: (p: P) => Promise<R>) {
  return createQuery<P, R>({ handler });
}

describe('standalone operators (post-hoc, composable)', () => {
  it('concurrency(query, { strategy }) applied after creation', async () => {
    const resolvers: Array<(v: string) => void> = [];
    const fx = createEffect(
      (_p: number) => new Promise<string>((res) => resolvers.push(res)),
    );
    const query = createQuery({ effect: fx }); // default TAKE_LATEST
    concurrency(query, { strategy: 'TAKE_FIRST' }); // override post-hoc

    const scope = fork();
    const p1 = allSettled(query.start, { scope, params: 1 });
    const p2 = allSettled(query.start, { scope, params: 2 });

    expect(resolvers.length).toBe(1); // TAKE_FIRST dropped the second
    resolvers[0]('first');
    await Promise.all([p1, p2]);
    expect(scope.getState(query.$data)).toBe('first');
  });

  it('retry(query, n) applied standalone', async () => {
    let calls = 0;
    const query = bareQuery<void, string>(async () => {
      calls++;
      if (calls < 3) throw new Error('flaky');
      return 'ok';
    });
    retry(query, { times: 5, delay: 0 });

    const scope = fork();
    await allSettled(query.start, { scope });
    expect(calls).toBe(3);
    expect(scope.getState(query.$data)).toBe('ok');
  });

  it('cache(query) applied standalone, with purge', async () => {
    let calls = 0;
    const purge = createEvent();
    const query = bareQuery<number, number>(async (p) => {
      calls++;
      return p * 2;
    });
    cache(query, { purge });

    const scope = fork();
    await allSettled(query.start, { scope, params: 5 });
    await allSettled(query.start, { scope, params: 5 }); // hit
    expect(calls).toBe(1);

    await allSettled(purge, { scope });
    await allSettled(query.start, { scope, params: 5 }); // miss after purge
    expect(calls).toBe(2);
  });

  it('operators compose: retry + cache + concurrency on one query', async () => {
    let calls = 0;
    const query = bareQuery<string, string>(async (q) => {
      calls++;
      if (calls === 1) throw new Error('first fails');
      return `${q}-${calls}`;
    });
    retry(query, { times: 1, delay: 0 });
    cache(query, true);
    concurrency(query, { strategy: 'TAKE_LATEST' });

    const scope = fork();
    await allSettled(query.start, { scope, params: 'q' });
    // first attempt fails, retry succeeds -> calls=2, cached
    expect(calls).toBe(2);
    expect(scope.getState(query.$data)).toBe('q-2');
    expect(scope.getState(query.$status)).toBe('done');

    await allSettled(query.start, { scope, params: 'q' }); // cache hit
    expect(calls).toBe(2);
  });

  it('inline options stay equivalent to operators', async () => {
    let calls = 0;
    const inline = createQuery<number, number>({
      handler: async (p) => {
        calls++;
        return p;
      },
      cache: true,
    });
    const scope = fork();
    await allSettled(inline.start, { scope, params: 1 });
    await allSettled(inline.start, { scope, params: 1 });
    expect(calls).toBe(1); // inline cache behaves like cache(query)
  });
});
