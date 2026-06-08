import type { CacheAdapter, CacheEntry } from './types';

export interface InMemoryCacheOptions {
  /** Drop entries older than this (ms) on access. */
  maxAge?: number;
  /** Keep at most this many entries (LRU eviction). */
  maxEntries?: number;
  /** Clock, overridable in tests. Default: () => Date.now(). */
  now?: () => number;
}

/** In-memory cache with optional GC (maxAge / maxEntries, LRU). */
export function inMemoryCache(options: InMemoryCacheOptions = {}): CacheAdapter {
  const { maxAge, maxEntries, now = () => Date.now() } = options;
  const store = new Map<string, CacheEntry>();

  const expired = (entry: CacheEntry) => maxAge != null && now() - entry.storedAt >= maxAge;

  return {
    get: (key) => {
      const entry = store.get(key);
      if (!entry) return null;
      if (expired(entry)) {
        store.delete(key);
        return null;
      }
      // LRU touch: move to most-recently-used
      store.delete(key);
      store.set(key, entry);
      return entry;
    },
    set: (key, value, storedAt) => {
      store.delete(key);
      store.set(key, { value, storedAt });
      if (maxEntries != null) {
        while (store.size > maxEntries) {
          const oldest = store.keys().next().value;
          if (oldest === undefined) break;
          store.delete(oldest);
        }
      }
    },
    remove: (key) => {
      store.delete(key);
    },
    purge: () => {
      store.clear();
    },
  };
}

function webStorageCache(getStorage: () => Storage, prefix: string): CacheAdapter {
  const k = (key: string) => `${prefix}${key}`;
  return {
    get: (key) => {
      try {
        const raw = getStorage().getItem(k(key));
        return raw ? (JSON.parse(raw) as CacheEntry) : null;
      } catch {
        return null;
      }
    },
    set: (key, value, storedAt) => {
      try {
        getStorage().setItem(k(key), JSON.stringify({ value, storedAt }));
      } catch {
        /* quota / serialization — ignore */
      }
    },
    remove: (key) => {
      try {
        getStorage().removeItem(k(key));
      } catch {
        /* ignore */
      }
    },
    purge: () => {
      try {
        const storage = getStorage();
        const keys: string[] = [];
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key && key.startsWith(prefix)) keys.push(key);
        }
        keys.forEach((key) => storage.removeItem(key));
      } catch {
        /* ignore */
      }
    },
  };
}

export function localStorageCache(prefix = 'eq:'): CacheAdapter {
  return webStorageCache(() => localStorage, prefix);
}

export function sessionStorageCache(prefix = 'eq:'): CacheAdapter {
  return webStorageCache(() => sessionStorage, prefix);
}

/** Never stores, never restores. Useful for tests. */
export function voidCache(): CacheAdapter {
  return {
    get: () => null,
    set: () => {},
    remove: () => {},
    purge: () => {},
  };
}
