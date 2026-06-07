import { describe, it, expect } from 'vitest';
import { allSettled, createEffect, fork } from 'effector';
import { createQuery, exponentialDelay, linearDelay } from '../src';

describe('retry', () => {
  it('retries until success', async () => {
    let calls = 0;
    const fx = createEffect(async () => {
      calls++;
      if (calls < 3) throw new Error('boom');
      return 'ok';
    });
    const q = createQuery({ effect: fx, retry: { times: 5, delay: 0 } });
    const scope = fork();

    await allSettled(q.start, { scope });

    expect(calls).toBe(3);
    expect(scope.getState(q.$status)).toBe('done');
    expect(scope.getState(q.$data)).toBe('ok');
    expect(scope.getState(q.$error)).toBeNull();
  });

  it('gives up after the configured number of retries', async () => {
    let calls = 0;
    const fx = createEffect(async () => {
      calls++;
      throw new Error('always');
    });
    const q = createQuery({ effect: fx, retry: { times: 2, delay: 0 } });
    const scope = fork();

    await allSettled(q.start, { scope });

    expect(calls).toBe(3); // initial + 2 retries
    expect(scope.getState(q.$status)).toBe('fail');
    expect((scope.getState(q.$error) as Error).message).toBe('always');
  });

  it('retry: number is shorthand for { times }', async () => {
    let calls = 0;
    const fx = createEffect(async () => {
      calls++;
      throw new Error('x');
    });
    const q = createQuery({ effect: fx, retry: 1 });
    const scope = fork();
    await allSettled(q.start, { scope });
    expect(calls).toBe(2);
  });

  it('filter can stop retries early', async () => {
    let calls = 0;
    const fx = createEffect(async () => {
      calls++;
      throw new Error('fatal');
    });
    const q = createQuery({
      effect: fx,
      retry: { times: 5, delay: 0, filter: ({ error }) => (error as Error).message !== 'fatal' },
    });
    const scope = fork();
    await allSettled(q.start, { scope });
    expect(calls).toBe(1);
  });

  it('delay helpers compute expected values', () => {
    expect(linearDelay(100)(1)).toBe(100);
    expect(linearDelay(100)(3)).toBe(300);
    expect(exponentialDelay(100)(1)).toBe(100);
    expect(exponentialDelay(100)(3)).toBe(400);
  });
});
