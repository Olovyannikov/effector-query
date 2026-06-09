import { describe, it, expect } from 'vitest';
import { allSettled, createEffect, fork } from 'effector';
import { createQuery } from '../src';
import { replaceEqualDeep } from '../src/utils';

describe('replaceEqualDeep', () => {
  it('keeps the previous reference when deeply equal', () => {
    const prev = { a: 1, list: [{ id: 1 }, { id: 2 }] };
    const next = { a: 1, list: [{ id: 1 }, { id: 2 }] };
    expect(replaceEqualDeep(prev, next)).toBe(prev);
  });

  it('reuses unchanged sub-trees, replaces changed ones', () => {
    const prev = { a: { x: 1 }, b: { y: 1 } };
    const next = { a: { x: 1 }, b: { y: 2 } };
    const out = replaceEqualDeep(prev, next);
    expect(out).not.toBe(prev);
    expect(out.a).toBe(prev.a); // unchanged sub-tree kept
    expect(out.b).toEqual({ y: 2 });
  });
});

describe('structuralSharing in a query', () => {
  it('preserves $data identity across equal results', async () => {
    let n = 0;
    const fx = createEffect(async () => {
      n++;
      return { items: [{ id: 1 }, { id: 2 }] }; // equal shape each time
    });
    const query = createQuery({ effect: fx, structuralSharing: true });
    const scope = fork();

    await allSettled(query.start, { scope });
    const first = scope.getState(query.$data);
    await allSettled(query.start, { scope });
    const second = scope.getState(query.$data);

    expect(n).toBe(2);
    expect(second).toBe(first); // same reference despite a fresh fetch
  });

  it('without structuralSharing, identity changes', async () => {
    const fx = createEffect(async () => ({ items: [{ id: 1 }] }));
    const query = createQuery({ effect: fx });
    const scope = fork();
    await allSettled(query.start, { scope });
    const first = scope.getState(query.$data);
    await allSettled(query.start, { scope });
    expect(scope.getState(query.$data)).not.toBe(first);
  });
});
