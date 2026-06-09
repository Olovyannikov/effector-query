import { describe, it, expect } from 'vitest';
import { allSettled, createEffect, createStore, fork, sample } from 'effector';
import { createBarrier, createQuery, createQueryFactory } from '../src';

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('cancel settles status (no stuck pending)', () => {
  it('cancel leaves status non-pending', async () => {
    const resolvers: Array<(v: number) => void> = [];
    const fx = createEffect((_p: number) => new Promise<number>((res) => resolvers.push(res)));
    const query = createQuery({ effect: fx });
    const scope = fork();

    const p = allSettled(query.start, { scope, params: 1 });
    expect(scope.getState(query.$status)).toBe('pending');
    expect(scope.getState(query.$pending)).toBe(true);

    // don't await cancel (the deferred effect keeps the scope busy); it settles synchronously
    const pc = allSettled(query.cancel, { scope });
    expect(scope.getState(query.$status)).toBe('initial'); // no data -> initial
    expect(scope.getState(query.$pending)).toBe(false);

    // even when the orphaned promise resolves later, state stays settled
    resolvers[0](1);
    await Promise.all([p, pc]);
    expect(scope.getState(query.$status)).toBe('initial');
    expect(scope.getState(query.$pending)).toBe(false);
  });

  it('cancel after data keeps status done', async () => {
    const fx = createEffect(async (p: number) => p);
    const query = createQuery({ effect: fx });
    const scope = fork();
    await allSettled(query.start, { scope, params: 1 });
    await allSettled(query.cancel, { scope });
    expect(scope.getState(query.$status)).toBe('done');
  });
});

describe('createBarrier', () => {
  it('queries wait while locked, then proceed on unlock', async () => {
    let calls = 0;
    const fx = createEffect(async (p: number) => {
      calls++;
      return p;
    });
    const barrier = createBarrier();
    const query = createQuery({ effect: fx, barrier });

    barrier.lock();
    query.start(1); // no-scope; should wait at the barrier
    await tick();
    await tick();
    expect(calls).toBe(0); // blocked

    barrier.unlock();
    await tick();
    await tick();
    expect(calls).toBe(1); // released
  });

  it('perform runs once on lock and unlocks on settle', async () => {
    let refreshes = 0;
    const refreshFx = createEffect(async () => {
      refreshes++;
      await tick();
    });
    const barrier = createBarrier({ perform: refreshFx });

    barrier.lock();
    barrier.lock(); // re-lock ignored while locked
    await tick();
    await tick();
    await tick();
    expect(refreshes).toBe(1);
    expect(barrier.$locked.getState()).toBe(false); // auto-unlocked after perform
  });

  it('401 auth refresh: queue, refresh, retry — all via the barrier', async () => {
    let token = 'expired';
    let refreshes = 0;
    const refreshFx = createEffect(async () => {
      refreshes++;
      await tick();
      token = 'fresh';
    });
    const barrier = createBarrier({ perform: refreshFx });
    const { createQuery: cq } = createQueryFactory({ barrier });

    let attempts = 0;
    const apiFx = createEffect(async () => {
      attempts++;
      if (token !== 'fresh') throw Object.assign(new Error('Unauthorized'), { status: 401 });
      return 'data';
    });
    const api = cq({
      effect: apiFx,
      retry: { times: 1, delay: 0, filter: ({ error }) => (error as { status?: number }).status === 401 },
    });

    // on 401, lock the barrier (kicks off refresh)
    sample({
      clock: api.finished.fail,
      target: barrier.lock,
    });
    // also lock on the failure that triggers a retry — drive the lock from the raw effect fail
    sample({
      clock: apiFx.failData,
      filter: (e) => (e as { status?: number }).status === 401,
      target: barrier.lock,
    });

    api.start();
    // let it fail (401) -> lock+refresh -> retry waits -> token fresh -> success
    for (let i = 0; i < 30 && api.$status.getState() !== 'done'; i++) await tick();

    expect(refreshes).toBe(1);
    expect(attempts).toBe(2); // first 401, retry after refresh
    expect(api.$data.getState()).toBe('data');
    expect(api.$status.getState()).toBe('done');
  });
});
