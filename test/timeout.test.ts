import { describe, it, expect } from 'vitest';
import { allSettled, createEffect, fork } from 'effector';
import { createQuery, createRequestFx } from '../src';

describe('timeout', () => {
  it('fails the run when the request exceeds the deadline', async () => {
    const slowFx = createEffect((): Promise<number> => new Promise((res) => setTimeout(() => res(1), 60)));
    const q = createQuery({ effect: slowFx, timeout: 10 });
    const scope = fork();

    await allSettled(q.start, { scope, params: undefined });

    expect(scope.getState(q.$status)).toBe('fail');
    expect((scope.getState(q.$error) as Error).message).toMatch(/timed out/i);
  });

  it('aborts an abort-aware request on timeout', async () => {
    let aborted = false;
    const fx = createRequestFx<void, number>(
      (_p, { signal }) =>
        new Promise((res) => {
          signal.addEventListener('abort', () => {
            aborted = true;
          });
          setTimeout(() => res(1), 60);
        }),
    );
    const q = createQuery({ effect: fx, timeout: 10 });
    const scope = fork();

    await allSettled(q.start, { scope, params: undefined });

    expect(aborted).toBe(true);
    expect(scope.getState(q.$status)).toBe('fail');
  });

  it('does not time out a request that completes in time', async () => {
    const fastFx = createEffect((): Promise<number> => new Promise((res) => setTimeout(() => res(42), 5)));
    const q = createQuery({ effect: fastFx, timeout: 100 });
    const scope = fork();

    await allSettled(q.start, { scope, params: undefined });

    expect(scope.getState(q.$status)).toBe('done');
    expect(scope.getState(q.$data)).toBe(42);
  });
});
