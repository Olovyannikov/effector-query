import { describe, it, expect } from 'vitest';
import { allSettled, createEffect, fork } from 'effector';
import { createQuery } from '../src';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('refetchInterval (polling)', () => {
  it('refetches on an interval, and reset stops it', async () => {
    let calls = 0;
    const fx = createEffect(async (p: number) => {
      calls++;
      return p;
    });
    const query = createQuery({ effect: fx, refetchInterval: 30 });
    const scope = fork();

    // a polling query never "settles", so don't await start — let it run
    const started = allSettled(query.start, { scope, params: 1 });
    await wait(120); // initial + several polls
    expect(calls).toBeGreaterThanOrEqual(2);

    await allSettled(query.reset, { scope }); // stop polling
    await started; // resolves once the pending poll is invalidated
    const after = calls;
    await wait(80);
    expect(calls).toBe(after); // no further polls
  });

  it('does not poll when interval is 0 (default)', async () => {
    let calls = 0;
    const fx = createEffect(async () => {
      calls++;
      return 1;
    });
    const query = createQuery({ effect: fx });
    const scope = fork();
    await allSettled(query.start, { scope });
    await wait(60);
    expect(calls).toBe(1);
  });

  it('polling is isolated per scope', async () => {
    let calls = 0;
    const fx = createEffect(async () => {
      calls++;
      return 1;
    });
    const query = createQuery({ effect: fx, refetchInterval: 30 });

    const a = fork();
    const startedA = allSettled(query.start, { scope: a });
    await wait(100);
    const polled = calls;
    expect(polled).toBeGreaterThanOrEqual(2);

    // a fresh scope that never started should not poll
    fork();
    await wait(60);
    expect(calls).toBeGreaterThanOrEqual(polled + 1); // only scope a keeps polling

    await allSettled(query.reset, { scope: a });
    await startedA;
  });
});
