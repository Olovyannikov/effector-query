import { describe, it, expect } from 'vitest';
import { allSettled, createEffect, fork } from 'effector';
import { createQuery } from '../src';

describe('createQuery — basics', () => {
  it('goes pending -> done and stores data', async () => {
    const fx = createEffect(async (p: number) => p * 2);
    const q = createQuery({ effect: fx });
    const scope = fork();

    await allSettled(q.start, { scope, params: 21 });

    expect(scope.getState(q.$status)).toBe('done');
    expect(scope.getState(q.$data)).toBe(42);
    expect(scope.getState(q.$error)).toBeNull();
    expect(scope.getState(q.$pending)).toBe(false);
    expect(scope.getState(q.$params)).toBe(21);
  });

  it('captures failures', async () => {
    const fx = createEffect(async () => {
      throw new Error('nope');
    });
    const q = createQuery({ effect: fx });
    const scope = fork();

    await allSettled(q.start, { scope });

    expect(scope.getState(q.$status)).toBe('fail');
    expect((scope.getState(q.$error) as Error).message).toBe('nope');
    expect(scope.getState(q.$data)).toBeNull();
  });

  it('mapData transforms the result', async () => {
    const fx = createEffect(async (id: number) => ({ id, name: `n${id}` }));
    const q = createQuery({ effect: fx, mapData: ({ result }) => result.name });
    const scope = fork();

    await allSettled(q.start, { scope, params: 7 });
    expect(scope.getState(q.$data)).toBe('n7');
  });

  it('respects enabled gate (skips, emits aborted)', async () => {
    const fx = createEffect(async () => 1);
    const { createStore } = await import('effector');
    const $enabled = createStore(false);
    const q = createQuery({ effect: fx, enabled: $enabled });
    const scope = fork();

    const seen: unknown[] = [];
    q.aborted.watch((p) => seen.push(p));

    await allSettled(q.start, { scope });
    expect(scope.getState(q.$status)).toBe('initial');
    expect(seen.length).toBe(1);
  });

  it('reset clears state', async () => {
    const fx = createEffect(async (p: number) => p);
    const q = createQuery({ effect: fx });
    const scope = fork();
    await allSettled(q.start, { scope, params: 5 });
    await allSettled(q.reset, { scope });
    expect(scope.getState(q.$status)).toBe('initial');
    expect(scope.getState(q.$data)).toBeNull();
  });

  it('exposes the real underlying effect', () => {
    const fx = createEffect(async () => 1);
    const q = createQuery({ effect: fx });
    expect(q.__.effect).toBe(fx);
  });
});
