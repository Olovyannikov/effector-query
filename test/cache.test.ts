import { describe, it, expect } from 'vitest';
import { allSettled, createEffect, createEvent, fork } from 'effector';
import { createQuery, inMemoryCache } from '../src';

describe('cache', () => {
  it('serves a fresh hit without re-running the effect', async () => {
    let calls = 0;
    const fx = createEffect(async (p: number) => {
      calls++;
      return p * 2;
    });
    const q = createQuery({ effect: fx, cache: true });
    const scope = fork();

    await allSettled(q.start, { scope, params: 5 });
    expect(calls).toBe(1);
    expect(scope.getState(q.$data)).toBe(10);

    await allSettled(q.start, { scope, params: 5 }); // hit
    expect(calls).toBe(1);
    expect(scope.getState(q.$status)).toBe('done');

    await allSettled(q.start, { scope, params: 6 }); // miss
    expect(calls).toBe(2);
    expect(scope.getState(q.$data)).toBe(12);
  });

  it('refresh bypasses the cache', async () => {
    let calls = 0;
    const fx = createEffect(async (p: number) => {
      calls++;
      return p;
    });
    const q = createQuery({ effect: fx, cache: true });
    const scope = fork();

    await allSettled(q.start, { scope, params: 1 });
    await allSettled(q.refresh, { scope, params: 1 });
    expect(calls).toBe(2);
  });

  it('purge clears the cache', async () => {
    let calls = 0;
    const purge = createEvent();
    const fx = createEffect(async (p: number) => {
      calls++;
      return p;
    });
    const q = createQuery({ effect: fx, cache: { adapter: inMemoryCache(), purge } });
    const scope = fork();

    await allSettled(q.start, { scope, params: 1 });
    await allSettled(purge, { scope });
    await allSettled(q.start, { scope, params: 1 });
    expect(calls).toBe(2);
  });

  it('staleAfter forces a refetch once expired', async () => {
    let calls = 0;
    const fx = createEffect(async (p: number) => {
      calls++;
      return p;
    });
    // staleAfter: 0 means any entry is immediately stale -> always refetch
    const q = createQuery({ effect: fx, cache: { staleAfter: 0 } });
    const scope = fork();
    await allSettled(q.start, { scope, params: 1 });
    await allSettled(q.start, { scope, params: 1 });
    expect(calls).toBe(2);
  });
});
