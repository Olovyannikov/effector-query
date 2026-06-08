import { describe, it, expect } from 'vitest';
import { allSettled, createEffect, fork } from 'effector';
import { attachQueryLogger, createQuery, type QueryLogEntry } from '../src';

describe('attachQueryLogger', () => {
  it('logs start -> run -> done with duration', async () => {
    const entries: QueryLogEntry[] = [];
    const fx = createEffect(async (n: number) => n * 2);
    const query = createQuery({ effect: fx });
    attachQueryLogger(query, { name: 'q', handler: (e) => entries.push(e), now: () => 1000 });

    const scope = fork();
    await allSettled(query.start, { scope, params: 5 });

    const types = entries.map((e) => e.type);
    expect(types).toEqual(['start', 'run', 'done']);
    expect(entries[1]).toMatchObject({ type: 'run', params: 5, attempt: 0 });
    expect(entries[2]).toMatchObject({ type: 'done', params: 5, durationMs: 0 });
  });

  it('logs retries and the final failure', async () => {
    const entries: QueryLogEntry[] = [];
    let calls = 0;
    const fx = createEffect(async (): Promise<number> => {
      calls++;
      throw new Error('boom');
    });
    const query = createQuery({ effect: fx, retry: { times: 2, delay: 0 } });
    attachQueryLogger(query, { name: 'q', handler: (e) => entries.push(e) });

    const scope = fork();
    await allSettled(query.start, { scope });

    const types = entries.map((e) => e.type);
    // start, run, retry, run, retry, run, fail
    expect(types.filter((t) => t === 'run').length).toBe(3);
    expect(types.filter((t) => t === 'retry').length).toBe(2);
    expect(types[types.length - 1]).toBe('fail');
    expect(entries[entries.length - 1]).toMatchObject({ type: 'fail' });
  });

  it('logs cache hit/miss', async () => {
    const entries: QueryLogEntry[] = [];
    const fx = createEffect(async (n: number) => n);
    const query = createQuery({ effect: fx, cache: true });
    attachQueryLogger(query, { handler: (e) => entries.push(e) });

    const scope = fork();
    await allSettled(query.start, { scope, params: 1 }); // miss -> run -> done
    await allSettled(query.start, { scope, params: 1 }); // hit

    expect(entries.some((e) => e.type === 'cache-miss')).toBe(true);
    expect(entries.some((e) => e.type === 'cache-hit')).toBe(true);
  });

  it('unsubscribe stops logging', async () => {
    const entries: QueryLogEntry[] = [];
    const fx = createEffect(async (n: number) => n);
    const query = createQuery({ effect: fx });
    const stop = attachQueryLogger(query, { handler: (e) => entries.push(e) });
    stop();

    const scope = fork();
    await allSettled(query.start, { scope, params: 1 });
    expect(entries).toHaveLength(0);
  });
});
