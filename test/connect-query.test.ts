import { describe, it, expect } from 'vitest';
import { allSettled, createEffect, fork } from 'effector';
import { connectQuery, createQuery } from '../src';

describe('connectQuery', () => {
  it('single source: feeds result into target params', async () => {
    const charFx = createEffect(async (id: number) => ({ id, origin: { url: `u${id}` } }));
    const originFx = createEffect(async (p: { originUrl: string }) => ({ name: `origin-${p.originUrl}` }));

    const characterQuery = createQuery({ effect: charFx });
    const originQuery = createQuery({ effect: originFx });

    connectQuery({
      source: characterQuery,
      fn: ({ result }) => ({ params: { originUrl: result.origin.url } }),
      target: originQuery,
    });

    const scope = fork();
    await allSettled(characterQuery.start, { scope, params: 1 });

    expect(scope.getState(originQuery.$data)).toEqual({ name: 'origin-u1' });
  });

  it('single source: filter can block the target', async () => {
    const aFx = createEffect(async (n: number) => n);
    const bFx = createEffect(async (n: number) => n + 1);
    const a = createQuery({ effect: aFx });
    const b = createQuery({ effect: bFx });

    connectQuery({
      source: a,
      fn: ({ result }) => ({ params: result }),
      target: b,
      filter: ({ result }) => result > 10,
    });

    const scope = fork();
    await allSettled(a.start, { scope, params: 5 });
    expect(scope.getState(b.$status)).toBe('initial');

    await allSettled(a.start, { scope, params: 20 });
    expect(scope.getState(b.$data)).toBe(21);
  });

  it('multiple sources: waits for all to be done', async () => {
    const aQ = createQuery({ effect: createEffect(async () => 2) });
    const bQ = createQuery({ effect: createEffect(async () => 3) });
    const sumQ = createQuery({ effect: createEffect(async (p: { x: number; y: number }) => p.x + p.y) });

    connectQuery({
      source: { a: aQ, b: bQ },
      fn: ({ a, b }) => ({ params: { x: a.result as number, y: b.result as number } }),
      target: sumQ,
    });

    const scope = fork();
    await allSettled(aQ.start, { scope });
    expect(scope.getState(sumQ.$status)).toBe('initial'); // b not done yet

    await allSettled(bQ.start, { scope });
    expect(scope.getState(sumQ.$data)).toBe(5);
  });
});
