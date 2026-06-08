import { describe, it, expect } from 'vitest';
import { allSettled, createEffect, createEvent, createStore, fork } from 'effector';
import { createQuery } from '../src';

describe('sourced config (reactive, fork-correct)', () => {
  it('retry.times driven by a Store — reactive and isolated per scope', async () => {
    const $times = createStore(0);
    const setTimes = createEvent<number>();
    $times.on(setTimes, (_n, v) => v);

    let calls = 0;
    const fx = createEffect(async () => {
      calls++;
      throw new Error('boom');
    });
    const query = createQuery({ effect: fx, retry: { times: $times, delay: 0 } });

    // scope A: times stays 0 -> a single attempt
    const a = fork();
    await allSettled(query.start, { scope: a });
    expect(calls).toBe(1);

    // scope B: bump times to 2 -> initial + 2 retries, without affecting scope A
    calls = 0;
    const b = fork();
    await allSettled(setTimes, { scope: b, params: 2 });
    await allSettled(query.start, { scope: b });
    expect(calls).toBe(3);

    // sanity: scope A's $times is untouched
    expect(a.getState($times)).toBe(0);
    expect(b.getState($times)).toBe(2);
  });

  it('cache.staleAfter driven by a Store — changing it re-validates', async () => {
    const $staleAfter = createStore(Infinity);
    const setStale = createEvent<number>();
    $staleAfter.on(setStale, (_n, v) => v);

    let calls = 0;
    const fx = createEffect(async (p: number) => {
      calls++;
      return p;
    });
    const query = createQuery({ effect: fx, cache: { staleAfter: $staleAfter } });

    const scope = fork();
    await allSettled(query.start, { scope, params: 1 }); // calls=1, cached (fresh forever)
    await allSettled(query.start, { scope, params: 1 }); // hit
    expect(calls).toBe(1);

    await allSettled(setStale, { scope, params: 0 }); // everything stale now
    await allSettled(query.start, { scope, params: 1 }); // must refetch
    expect(calls).toBe(2);
  });

  it('concurrency strategy driven by a Store', async () => {
    const $strategy = createStore<'TAKE_LATEST' | 'TAKE_FIRST'>('TAKE_FIRST');
    const resolvers: Array<(v: string) => void> = [];
    const fx = createEffect((_p: number) => new Promise<string>((res) => resolvers.push(res)));
    const query = createQuery({ effect: fx, concurrency: $strategy });

    const scope = fork();
    const p1 = allSettled(query.start, { scope, params: 1 });
    const p2 = allSettled(query.start, { scope, params: 2 });
    expect(resolvers.length).toBe(1); // TAKE_FIRST from the store dropped the second
    resolvers[0]('a');
    await Promise.all([p1, p2]);
    expect(scope.getState(query.$data)).toBe('a');
  });
});
