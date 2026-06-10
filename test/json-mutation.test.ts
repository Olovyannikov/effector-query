import { describe, it, expect, afterEach } from 'vitest';
import { allSettled, createStore, fork } from 'effector';
import { createJsonMutation } from '../src';

const calls: Array<{ url: string; method?: string; body?: unknown; headers: Record<string, string> }> = [];
const originalFetch = globalThis.fetch;

function stub(body: unknown = { ok: true }) {
  calls.length = 0;
  globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
    calls.push({
      url: String(url),
      method: init?.method,
      body: init?.body ? JSON.parse(init.body as string) : undefined,
      headers: (init?.headers as Record<string, string>) ?? {},
    });
    return { ok: true, status: 200, statusText: '', json: async () => body } as unknown as Response;
  }) as typeof fetch;
}

interface NewUser {
  name: string;
}

describe('createJsonMutation', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('defaults to POST, sends a JSON body, returns the response', async () => {
    stub({ id: 7, name: 'Ada' });
    const createUser = createJsonMutation<NewUser, { id: number; name: string }>({
      request: { url: 'https://api.test/users', body: (u) => u },
    });

    const scope = fork();
    await allSettled(createUser.start, { scope, params: { name: 'Ada' } });

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('POST');
    expect(calls[0].url).toBe('https://api.test/users');
    expect(calls[0].body).toEqual({ name: 'Ada' });
    expect(calls[0].headers['content-type']).toBe('application/json');
    expect(scope.getState(createUser.$data)).toEqual({ id: 7, name: 'Ada' });
    expect(scope.getState(createUser.$status)).toBe('done');
  });

  it('supports sourced headers fork-correctly', async () => {
    stub();
    const $token = createStore('');
    const del = createJsonMutation<number>({
      request: {
        url: (id) => `https://api.test/users/${id}`,
        method: 'DELETE',
        headers: { source: $token, fn: (token) => ({ authorization: `Bearer ${token}` }) },
      },
    });

    const scope = fork({ values: [[$token, 'secret']] });
    await allSettled(del.start, { scope, params: 9 });

    expect(calls[0].method).toBe('DELETE');
    expect(calls[0].url).toBe('https://api.test/users/9');
    expect(calls[0].headers.authorization).toBe('Bearer secret');
  });
});
