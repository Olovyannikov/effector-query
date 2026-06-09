// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { createEffect } from 'effector';
import { createQuery, refetchOnReconnect, refetchOnWindowFocus } from '../src';

describe('refetchOnWindowFocus / refetchOnReconnect (no-scope)', () => {
  const teardowns: Array<() => void> = [];
  afterEach(() => {
    teardowns.splice(0).forEach((t) => t());
  });

  it('refetches on window focus once the query has run', async () => {
    let calls = 0;
    const fx = createEffect(async (id: number) => {
      calls++;
      return id;
    });
    const query = createQuery({ effect: fx });
    teardowns.push(refetchOnWindowFocus(query));

    // before any run, focus does nothing
    window.dispatchEvent(new Event('focus'));
    await Promise.resolve();
    expect(calls).toBe(0);

    query.start(1);
    await new Promise((r) => setTimeout(r, 0));
    expect(calls).toBe(1);

    window.dispatchEvent(new Event('focus'));
    await new Promise((r) => setTimeout(r, 0));
    expect(calls).toBe(2);
  });

  it('refetches when coming back online', async () => {
    let calls = 0;
    const fx = createEffect(async (id: number) => {
      calls++;
      return id;
    });
    const query = createQuery({ effect: fx });
    teardowns.push(refetchOnReconnect(query));

    query.start(5);
    await new Promise((r) => setTimeout(r, 0));
    expect(calls).toBe(1);

    window.dispatchEvent(new Event('online'));
    await new Promise((r) => setTimeout(r, 0));
    expect(calls).toBe(2);
  });

  it('unsubscribe stops listening', async () => {
    let calls = 0;
    const query = createQuery({
      effect: createEffect(async (id: number) => {
        calls++;
        return id;
      }),
    });
    const stop = refetchOnWindowFocus(query);
    query.start(1);
    await new Promise((r) => setTimeout(r, 0));
    stop();
    window.dispatchEvent(new Event('focus'));
    await new Promise((r) => setTimeout(r, 0));
    expect(calls).toBe(1);
  });
});
