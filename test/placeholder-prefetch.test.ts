import { describe, it, expect } from 'vitest';
import { allSettled, createEffect, fork } from 'effector';
import { createQuery, inMemoryCache } from '../src';

describe('placeholderData', () => {
  it('shows the placeholder until real data arrives, flagged via $isPlaceholderData', async () => {
    const fx = createEffect(async (id: number) => ({ id, name: `user-${id}` }));
    const query = createQuery({
      effect: fx,
      placeholderData: { id: 0, name: '…' },
    });
    const scope = fork();

    expect(scope.getState(query.$data)).toEqual({ id: 0, name: '…' });
    expect(scope.getState(query.$isPlaceholderData)).toBe(true);

    await allSettled(query.start, { scope, params: 7 });
    expect(scope.getState(query.$data)).toEqual({ id: 7, name: 'user-7' });
    expect(scope.getState(query.$isPlaceholderData)).toBe(false);

    await allSettled(query.reset, { scope });
    expect(scope.getState(query.$data)).toEqual({ id: 0, name: '…' });
    expect(scope.getState(query.$isPlaceholderData)).toBe(true);
  });

  it('supports a function placeholder', async () => {
    const query = createQuery({
      effect: createEffect(async () => 5),
      placeholderData: () => 0,
    });
    const scope = fork();
    expect(scope.getState(query.$data)).toBe(0);
    expect(scope.getState(query.$isPlaceholderData)).toBe(true);
  });

  it('initialData takes precedence and is not placeholder', () => {
    const query = createQuery({
      effect: createEffect(async () => 5),
      initialData: 1,
      placeholderData: 0,
    });
    const scope = fork();
    expect(scope.getState(query.$data)).toBe(1);
    expect(scope.getState(query.$isPlaceholderData)).toBe(false);
  });
});

describe('prefetch', () => {
  it('warms the cache without touching $data/$status', async () => {
    let calls = 0;
    const fx = createEffect(async (id: number) => {
      calls++;
      return id * 10;
    });
    const query = createQuery({ effect: fx, cache: true });
    const scope = fork();

    await allSettled(query.prefetch, { scope, params: 5 });
    // prefetch ran the effect and cached, but left the visible state untouched
    expect(calls).toBe(1);
    expect(scope.getState(query.$status)).toBe('initial');
    expect(scope.getState(query.$data)).toBeNull();

    // a real start now hits the warm cache — no extra effect call
    await allSettled(query.start, { scope, params: 5 });
    expect(calls).toBe(1);
    expect(scope.getState(query.$data)).toBe(50);
    expect(scope.getState(query.$status)).toBe('done');
  });

  it('is a no-op without a cache', async () => {
    let calls = 0;
    const fx = createEffect(async () => {
      calls++;
      return 1;
    });
    const query = createQuery({ effect: fx });
    const scope = fork();
    await allSettled(query.prefetch, { scope });
    expect(calls).toBe(0);
  });

  it('skips when the cached entry is already fresh', async () => {
    let calls = 0;
    const fx = createEffect(async (id: number) => {
      calls++;
      return id;
    });
    const query = createQuery({ effect: fx, cache: { adapter: inMemoryCache() } });
    const scope = fork();
    await allSettled(query.start, { scope, params: 1 }); // calls=1, cached
    await allSettled(query.prefetch, { scope, params: 1 }); // fresh -> skip
    expect(calls).toBe(1);
  });
});
