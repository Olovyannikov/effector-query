import { describe, it, expect } from 'vitest';
import { allSettled, createEffect, fork } from 'effector';
import { createQuery, inMemoryCache } from '../src';

describe('inMemoryCache GC', () => {
  it('evicts the least-recently-used beyond maxEntries', () => {
    const c = inMemoryCache({ maxEntries: 2 });
    c.set('a', 1, 0);
    c.set('b', 2, 0);
    c.set('c', 3, 0); // 'a' is oldest -> evicted
    expect(c.get('a')).toBeNull();
    expect((c.get('b') as { value: number }).value).toBe(2);
    expect((c.get('c') as { value: number }).value).toBe(3);
  });

  it('get() touches LRU order', () => {
    const c = inMemoryCache({ maxEntries: 2 });
    c.set('a', 1, 0);
    c.set('b', 2, 0);
    c.get('a'); // 'a' becomes most-recently-used
    c.set('c', 3, 0); // 'b' is now oldest -> evicted
    expect((c.get('a') as { value: number }).value).toBe(1);
    expect(c.get('b')).toBeNull();
  });

  it('drops entries older than maxAge', () => {
    let t = 0;
    const c = inMemoryCache({ maxAge: 100, now: () => t });
    c.set('a', 1, 0);
    t = 50;
    expect((c.get('a') as { value: number }).value).toBe(1);
    t = 150;
    expect(c.get('a')).toBeNull();
  });
});

describe('SWR (stale-while-revalidate)', () => {
  it('serves stale data immediately, then revalidates in the background', async () => {
    let calls = 0;
    const resolvers: Array<(v: string) => void> = [];
    const fx = createEffect((_p: number) => {
      calls++;
      if (calls === 1) return Promise.resolve('v1'); // first resolves immediately
      return new Promise<string>((res) => resolvers.push(res)); // later: deferred
    });
    const query = createQuery({ effect: fx, cache: { staleAfter: 0, swr: true } });
    const scope = fork();

    // first run caches 'v1' (immediately stale because staleAfter: 0)
    await allSettled(query.start, { scope, params: 1 });
    expect(scope.getState(query.$data)).toBe('v1');
    expect(calls).toBe(1);

    // second run: stale entry present -> serve 'v1' now + revalidate in background
    const p = allSettled(query.start, { scope, params: 1 });
    for (let i = 0; i < 30 && scope.getState(query.$stale) !== true; i++) {
      await new Promise((r) => setTimeout(r, 0));
    }
    expect(scope.getState(query.$data)).toBe('v1'); // stale served from cache
    expect(scope.getState(query.$stale)).toBe(true);
    expect(calls).toBe(2); // revalidation in flight

    resolvers[0]('v2');
    await p;
    expect(scope.getState(query.$data)).toBe('v2'); // fresh
    expect(scope.getState(query.$stale)).toBe(false);
  });

  it('without SWR a stale entry just refetches (no early stale serve)', async () => {
    let calls = 0;
    const fx = createEffect(async (p: number) => {
      calls++;
      return `${p}-${calls}`;
    });
    const query = createQuery({ effect: fx, cache: { staleAfter: 0 } }); // no swr
    const scope = fork();
    await allSettled(query.start, { scope, params: 1 });
    await allSettled(query.start, { scope, params: 1 });
    expect(calls).toBe(2);
    expect(scope.getState(query.$stale)).toBe(false);
  });
});
