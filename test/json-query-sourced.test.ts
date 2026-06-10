import { describe, it, expect, afterEach } from 'vitest';
import { allSettled, createStore, fork } from 'effector';
import { createJsonQuery, createJsonRequestFx, createQuery } from '../src';

const calls: Array<{ url: string; headers: Record<string, string> }> = [];
const originalFetch = globalThis.fetch;

function stub() {
  calls.length = 0;
  globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
    calls.push({ url: String(url), headers: (init?.headers as Record<string, string>) ?? {} });
    return { ok: true, status: 200, statusText: '', json: async () => ({ ok: true }) } as unknown as Response;
  }) as typeof fetch;
}

describe('createJsonQuery — sourced fields', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('reads `{ source, fn }` and `Store` fields fork-correctly (per scope)', async () => {
    stub();
    const $token = createStore('');
    const $base = createStore('https://api.test');

    const q = createJsonQuery<{ id: number }>({
      request: {
        url: { source: $base, fn: (base, { id }) => `${base}/users/${id}` },
        headers: { source: $token, fn: (token) => ({ authorization: `Bearer ${token}` }) },
      },
    });

    const sA = fork({
      values: [
        [$token, 'tokA'],
        [$base, 'https://a.test'],
      ],
    });
    const sB = fork({
      values: [
        [$token, 'tokB'],
        [$base, 'https://b.test'],
      ],
    });

    await allSettled(q.start, { scope: sA, params: { id: 1 } });
    await allSettled(q.start, { scope: sB, params: { id: 2 } });

    expect(calls).toHaveLength(2);
    expect(calls[0]).toMatchObject({
      url: 'https://a.test/users/1',
      headers: { authorization: 'Bearer tokA' },
    });
    expect(calls[1]).toMatchObject({
      url: 'https://b.test/users/2',
      headers: { authorization: 'Bearer tokB' },
    });
  });

  it('plain `Store` field uses the current scoped value', async () => {
    stub();
    const $headers = createStore<Record<string, string>>({ 'x-env': 'prod' });
    const q = createJsonQuery<void>({
      request: { url: 'https://api.test/me', headers: $headers },
    });

    const scope = fork({ values: [[$headers, { 'x-env': 'staging' }]] });
    await allSettled(q.start, { scope, params: undefined });

    expect(calls[0].headers).toMatchObject({ 'x-env': 'staging' });
  });

  it('createJsonRequestFx builds a reusable declarative effect', async () => {
    stub();
    const getItemFx = createJsonRequestFx<{ id: number }, { ok: boolean }>({
      url: ({ id }) => `https://api.test/items/${id}`,
      query: ({ id }) => ({ ref: id }),
    });
    const q = createQuery({ effect: getItemFx });

    const scope = fork();
    await allSettled(q.start, { scope, params: { id: 5 } });

    expect(calls[0].url).toBe('https://api.test/items/5?ref=5');
  });
});
