import { describe, it, expect } from 'vitest';
import { allSettled, createEffect, fork } from 'effector';
import { createQuery, inMemoryCache, voidCache, dehydrate, hydrate } from '../src';

describe('dehydrate / hydrate (cache transfer)', () => {
  it('dehydrates inMemoryCache entries and hydrates them into another adapter', async () => {
    const server = inMemoryCache();
    let calls = 0;
    const fx = createEffect(async (id: number) => {
      calls++;
      return { id, name: `user-${id}` };
    });

    // "server": run a cached query so the cache fills
    const serverQuery = createQuery({ effect: fx, cache: { adapter: server } });
    const scope = fork();
    await allSettled(serverQuery.start, { scope, params: 1 });
    expect(calls).toBe(1);

    // snapshot is plain JSON-able data
    const snapshot = dehydrate(server);
    expect(snapshot).toHaveLength(1);
    expect(snapshot[0]).toMatchObject({ value: { id: 1, name: 'user-1' } });
    expect(typeof snapshot[0].key).toBe('string');
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot); // serializable

    // "client": hydrate a fresh adapter, then the same query hits cache (no refetch)
    const client = inMemoryCache();
    hydrate(client, snapshot);

    const clientQuery = createQuery({ effect: fx, cache: { adapter: client } });
    const clientScope = fork();
    await allSettled(clientQuery.start, { scope: clientScope, params: 1 });

    expect(calls).toBe(1); // cache hit — effect not called again
    expect(clientScope.getState(clientQuery.$data)).toEqual({ id: 1, name: 'user-1' });
    expect(clientScope.getState(clientQuery.$status)).toBe('done');
  });

  it('roundtrips value + storedAt through dehydrate → hydrate', () => {
    const server = inMemoryCache();
    server.set('k', { x: 1 }, 1000); // storedAt = server fetch time

    const snapshot = dehydrate(server);
    expect(snapshot).toEqual([{ key: 'k', value: { x: 1 }, storedAt: 1000 }]);

    const client = inMemoryCache();
    hydrate(client, snapshot);
    expect(client.get('k')).toEqual({ value: { x: 1 }, storedAt: 1000 }); // storedAt preserved
  });

  it('returns [] for adapters without dump (e.g. voidCache)', () => {
    expect(dehydrate(voidCache())).toEqual([]);
  });
});
