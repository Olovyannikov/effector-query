import { describe, it, expect } from 'vitest';
import { allSettled, createEffect, fork } from 'effector';
import { combineQueries, createQuery } from '../src';

describe('combineQueries', () => {
  it('aggregates data, pending and success across queries', async () => {
    const a = createQuery({ effect: createEffect(async () => 1) });
    const b = createQuery({ effect: createEffect(async () => 'two') });
    const combined = combineQueries([a, b]);

    const scope = fork();
    expect(scope.getState(combined.$data)).toEqual([null, null]);
    expect(scope.getState(combined.$isSuccess)).toBe(false);

    await allSettled(a.start, { scope });
    expect(scope.getState(combined.$pending)).toBe(false);
    expect(scope.getState(combined.$isSuccess)).toBe(false); // b not done

    await allSettled(b.start, { scope });
    expect(scope.getState(combined.$data)).toEqual([1, 'two']);
    expect(scope.getState(combined.$isSuccess)).toBe(true);
  });

  it('reflects pending and errors', async () => {
    const resolvers: Array<(v: number) => void> = [];
    const a = createQuery({ effect: createEffect((_p: void) => new Promise<number>((res) => resolvers.push(res))) });
    const b = createQuery({
      effect: createEffect(async (): Promise<number> => {
        throw new Error('boom');
      }),
    });
    const combined = combineQueries([a, b]);

    const scope = fork();
    const pa = allSettled(a.start, { scope }); // deferred — don't await (keeps scope busy)
    const pb = allSettled(b.start, { scope });
    expect(scope.getState(combined.$pending)).toBe(true); // a in flight

    for (let i = 0; i < 10 && !scope.getState(combined.$isError); i++) {
      await new Promise((r) => setTimeout(r, 0));
    }
    expect(scope.getState(combined.$isError)).toBe(true); // b failed

    resolvers[0](1);
    await Promise.all([pa, pb]);
    expect(scope.getState(combined.$pending)).toBe(false);
    expect(scope.getState(combined.$data)).toEqual([1, null]);
  });
});
