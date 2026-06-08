import { describe, it, expect } from 'vitest';
import { allSettled, createEffect, fork } from 'effector';
import { createQuery, inMemoryCache } from '../src';

const tick = () => new Promise((r) => setTimeout(r, 0));
async function waitUntil(cond: () => boolean) {
  for (let i = 0; i < 20 && !cond(); i++) await tick();
}

describe('request dedupe', () => {
  it('coalesces identical in-flight requests into one effect run', async () => {
    let calls = 0;
    const resolvers: Array<(v: string) => void> = [];
    const fx = createEffect((_p: number) => {
      calls++;
      return new Promise<string>((res) => resolvers.push(res));
    });
    const query = createQuery({ effect: fx, concurrency: 'TAKE_EVERY', cache: { dedupe: true } });
    const scope = fork();

    // cache lookup is async, so the effect runs a tick after start
    const p1 = allSettled(query.start, { scope, params: 1 });
    const p2 = allSettled(query.start, { scope, params: 1 }); // same key -> coalesced
    await waitUntil(() => calls >= 1);
    await tick(); // give the duplicate a chance to (not) run

    expect(calls).toBe(1);
    resolvers[0]('shared');
    await Promise.all([p1, p2]);
    expect(scope.getState(query.$data)).toBe('shared');
  });

  it('different keys are not coalesced', async () => {
    let calls = 0;
    const resolvers: Array<(v: number) => void> = [];
    const fx = createEffect((_p: number) => {
      calls++;
      return new Promise<number>((res) => resolvers.push(res));
    });
    const query = createQuery({ effect: fx, concurrency: 'TAKE_EVERY', cache: { dedupe: true } });
    const scope = fork();

    const p1 = allSettled(query.start, { scope, params: 1 });
    const p2 = allSettled(query.start, { scope, params: 2 }); // different key -> runs
    await waitUntil(() => calls >= 2);

    expect(calls).toBe(2);
    resolvers.forEach((r, i) => r(i));
    await Promise.all([p1, p2]);
  });
});

describe('inMemoryCache events', () => {
  it('emits hit / miss / evicted', () => {
    const events: Array<[string, string]> = [];
    const c = inMemoryCache({
      maxEntries: 1,
      onHit: (k) => events.push(['hit', k]),
      onMiss: (k) => events.push(['miss', k]),
      onEvicted: (k) => events.push(['evicted', k]),
    });
    c.get('a'); // miss
    c.set('a', 1, 0);
    c.get('a'); // hit
    c.set('b', 2, 0); // evicts 'a'

    expect(events).toContainEqual(['miss', 'a']);
    expect(events).toContainEqual(['hit', 'a']);
    expect(events).toContainEqual(['evicted', 'a']);
  });

  it('emits expired when maxAge passes', () => {
    const events: string[] = [];
    let t = 0;
    const c = inMemoryCache({ maxAge: 100, now: () => t, onExpired: (k) => events.push(k) });
    c.set('a', 1, 0);
    t = 150;
    c.get('a');
    expect(events).toEqual(['a']);
  });
});
