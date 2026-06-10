import { describe, it, expect } from 'vitest';
import { allSettled, createEffect, createEvent, fork } from 'effector';
import { createQuery, attachToRoute } from '../src';

describe('attachToRoute', () => {
  it('starts the query on route open (with mapped params) and resets on close', async () => {
    let calls = 0;
    const fx = createEffect(async (id: number) => {
      calls++;
      return `user-${id}`;
    });
    const query = createQuery({ effect: fx });

    const opened = createEvent<{ params: { id: string } }>();
    const closed = createEvent();
    attachToRoute({
      route: { opened, closed },
      query,
      mapParams: ({ params }) => Number(params.id),
    });

    const scope = fork();
    await allSettled(opened, { scope, params: { params: { id: '5' } } });
    expect(calls).toBe(1);
    expect(scope.getState(query.$data)).toBe('user-5');
    expect(scope.getState(query.$params)).toBe(5);

    await allSettled(closed, { scope, params: undefined });
    expect(scope.getState(query.$status)).toBe('initial'); // reset on close
  });

  it('resetOnClose: false leaves the data in place', async () => {
    const fx = createEffect(async (id: number) => id);
    const query = createQuery({ effect: fx });
    const opened = createEvent<{ params: number }>();
    const closed = createEvent();
    attachToRoute({ route: { opened, closed }, query, resetOnClose: false });

    const scope = fork();
    await allSettled(opened, { scope, params: { params: 1 } });
    await allSettled(closed, { scope, params: undefined });
    expect(scope.getState(query.$status)).toBe('done'); // kept
  });
});
