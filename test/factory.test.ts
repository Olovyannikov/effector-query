import { describe, it, expect } from 'vitest';
import { allSettled, createEffect, fork } from 'effector';
import { createQueryFactory } from '../src';

describe('createQueryFactory', () => {
  it('applies shared defaults to queries; per-call config overrides', async () => {
    let calls = 0;
    const fx = createEffect(async (): Promise<number> => {
      calls++;
      throw new Error('x');
    });
    const { createQuery } = createQueryFactory({ retry: 2 });

    const withDefault = createQuery({ effect: fx });
    const scope = fork();
    await allSettled(withDefault.start, { scope });
    expect(calls).toBe(3); // initial + 2 retries from the default

    // per-call override wins
    calls = 0;
    const noRetry = createQuery({ effect: fx, retry: 0 });
    const scope2 = fork();
    await allSettled(noRetry.start, { scope: scope2 });
    expect(calls).toBe(1);
  });

  it('default cache applies', async () => {
    let calls = 0;
    const fx = createEffect(async (p: number) => {
      calls++;
      return p;
    });
    const { createQuery } = createQueryFactory({ cache: true });
    const q = createQuery({ effect: fx });
    const scope = fork();
    await allSettled(q.start, { scope, params: 1 });
    await allSettled(q.start, { scope, params: 1 }); // cache hit from the default
    expect(calls).toBe(1);
  });

  it('createMutation gets retry/concurrency defaults but not cache', async () => {
    let calls = 0;
    const fx = createEffect(async (): Promise<number> => {
      calls++;
      if (calls < 2) throw new Error('flaky');
      return 1;
    });
    const { createMutation } = createQueryFactory({ retry: 3 });
    const m = createMutation({ effect: fx });
    const scope = fork();
    await allSettled(m.start, { scope });
    expect(calls).toBe(2); // retried once
    expect(scope.getState(m.$status)).toBe('done');
  });
});
