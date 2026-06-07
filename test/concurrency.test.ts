import { describe, it, expect } from 'vitest';
import { allSettled, createEffect, fork } from 'effector';
import { createQuery } from '../src';

/** Effect whose pending promises are resolved manually, in test-controlled order. */
function deferredEffect() {
  const resolvers: Array<(v: string) => void> = [];
  const fx = createEffect(
    (_p: number) =>
      new Promise<string>((res) => {
        resolvers.push(res);
      }),
  );
  return { fx, resolvers };
}

describe('concurrency', () => {
  it('TAKE_LATEST keeps the latest, discards the stale result', async () => {
    const { fx, resolvers } = deferredEffect();
    const q = createQuery({ effect: fx, concurrency: 'TAKE_LATEST' });
    const scope = fork();

    const p1 = allSettled(q.start, { scope, params: 1 });
    const p2 = allSettled(q.start, { scope, params: 2 });

    expect(resolvers.length).toBe(2);
    // resolve the latest first, then the stale one
    resolvers[1]('two');
    resolvers[0]('one');
    await Promise.all([p1, p2]);

    expect(scope.getState(q.$data)).toBe('two');
  });

  it('TAKE_FIRST ignores starts while busy', async () => {
    const { fx, resolvers } = deferredEffect();
    const q = createQuery({ effect: fx, concurrency: 'TAKE_FIRST' });
    const scope = fork();

    const p1 = allSettled(q.start, { scope, params: 1 });
    const p2 = allSettled(q.start, { scope, params: 2 });

    expect(resolvers.length).toBe(1); // second start was dropped
    resolvers[0]('first');
    await Promise.all([p1, p2]);

    expect(scope.getState(q.$data)).toBe('first');
  });

  it('TAKE_EVERY applies every result', async () => {
    const { fx, resolvers } = deferredEffect();
    const q = createQuery({ effect: fx, concurrency: 'TAKE_EVERY' });
    const scope = fork();

    const p1 = allSettled(q.start, { scope, params: 1 });
    const p2 = allSettled(q.start, { scope, params: 2 });

    expect(resolvers.length).toBe(2);
    resolvers[0]('one');
    resolvers[1]('two');
    await Promise.all([p1, p2]);

    expect(scope.getState(q.$data)).toBe('two');
  });

  it('cancel discards an in-flight result', async () => {
    const { fx, resolvers } = deferredEffect();
    const q = createQuery({ effect: fx, concurrency: 'TAKE_LATEST' });
    const scope = fork();

    const p1 = allSettled(q.start, { scope, params: 1 });
    const pc = allSettled(q.cancel, { scope });
    resolvers[0]('late');
    await Promise.all([p1, pc]);

    expect(scope.getState(q.$data)).toBeNull();
    expect(scope.getState(q.$status)).not.toBe('done');
  });
});
