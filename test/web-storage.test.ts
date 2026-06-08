// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { localStorageCache, sessionStorageCache } from '../src';

describe('web storage cache', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('persists and restores entries', () => {
    const cache = localStorageCache();
    cache.set('k', { a: 1 }, 0);
    expect((cache.get('k') as { value: unknown }).value).toEqual({ a: 1 });
  });

  it('invalidates entries on version change (migration)', () => {
    localStorageCache({ version: 1 }).set('k', 'old', 0);

    const v2 = localStorageCache({ version: 2 });
    expect(v2.get('k')).toBeNull(); // stored under v1 -> dropped

    v2.set('k', 'new', 0);
    expect((v2.get('k') as { value: unknown }).value).toBe('new');
  });

  it('drops entries older than maxAge', () => {
    let t = 0;
    const cache = localStorageCache({ maxAge: 100, now: () => t });
    cache.set('k', 1, 0);
    t = 50;
    expect((cache.get('k') as { value: unknown }).value).toBe(1);
    t = 150;
    expect(cache.get('k')).toBeNull();
  });

  it('purge clears only prefixed keys', () => {
    localStorage.setItem('other', 'keep');
    const cache = sessionStorageCache();
    cache.set('k', 1, 0);
    cache.purge();
    expect(cache.get('k')).toBeNull();
    expect(localStorage.getItem('other')).toBe('keep');
  });
});
