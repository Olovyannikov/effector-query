import { describe, it, expect } from 'vitest';
import { allSettled, createEffect, fork } from 'effector';
import { createMutation } from '../src';

describe('createMutation', () => {
  it('runs and exposes status/data, with `mutate` alias', async () => {
    const fx = createEffect(async (text: string) => ({ id: 1, text }));
    const m = createMutation({ effect: fx });
    const scope = fork();

    expect(scope.getState(m.$status)).toBe('initial');

    await allSettled(m.mutate, { scope, params: 'hi' });

    expect(scope.getState(m.$status)).toBe('done');
    expect(scope.getState(m.$data)).toEqual({ id: 1, text: 'hi' });
    expect(scope.getState(m.$params)).toBe('hi');
    expect(m.__.effect).toBe(fx);
  });

  it('captures failures', async () => {
    const fx = createEffect(async () => {
      throw new Error('save failed');
    });
    const m = createMutation({ effect: fx });
    const scope = fork();

    await allSettled(m.start, { scope });

    expect(scope.getState(m.$status)).toBe('fail');
    expect((scope.getState(m.$error) as Error).message).toBe('save failed');
  });

  it('defaults to TAKE_EVERY — independent mutations both run', async () => {
    const resolvers: Array<(v: string) => void> = [];
    const fx = createEffect(
      (_p: number) =>
        new Promise<string>((res) => {
          resolvers.push(res);
        }),
    );
    const m = createMutation({ effect: fx });
    const scope = fork();

    const p1 = allSettled(m.mutate, { scope, params: 1 });
    const p2 = allSettled(m.mutate, { scope, params: 2 });

    expect(resolvers.length).toBe(2); // neither cancelled
    resolvers[0]('a');
    resolvers[1]('b');
    await Promise.all([p1, p2]);

    expect(scope.getState(m.$data)).toBe('b');
  });

  it('supports retry', async () => {
    let calls = 0;
    const fx = createEffect(async () => {
      calls++;
      if (calls < 2) throw new Error('flaky');
      return 'ok';
    });
    const m = createMutation({ effect: fx, retry: { times: 3, delay: 0 } });
    const scope = fork();
    await allSettled(m.start, { scope });
    expect(calls).toBe(2);
    expect(scope.getState(m.$data)).toBe('ok');
  });
});
