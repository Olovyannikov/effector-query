import type { CacheAdapter, CacheEntry } from './types';

/** In-memory cache. Lives as long as the adapter instance. */
export function inMemoryCache(): CacheAdapter {
  const store = new Map<string, CacheEntry>();
  return {
    get: (key) => store.get(key) ?? null,
    set: (key, value, storedAt) => {
      store.set(key, { value, storedAt });
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
