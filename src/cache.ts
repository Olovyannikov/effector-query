import type { CacheAdapter, CacheEntry } from './types';

/** Optional observers for cache activity. */
export interface CacheEvents {
  onHit?: (key: string) => void;
  onMiss?: (key: string) => void;
  onExpired?: (key: string) => void;
  onEvicted?: (key: string) => void;
}

export interface InMemoryCacheOptions extends CacheEvents {
  /** Drop entries older than this (ms) on access. */
  maxAge?: number;
  /** Keep at most this many entries (LRU eviction). */
  maxEntries?: number;
  /** Clock, overridable in tests. Default: () => Date.now(). */
  now?: () => number;
}

/** In-memory cache with optional GC (maxAge / maxEntries, LRU) and events. */
export function inMemoryCache(options: InMemoryCacheOptions = {}): CacheAdapter {
  const { maxAge, maxEntries, now = () => Date.now(), onHit, onMiss, onExpired, onEvicted } = options;
  const store = new Map<string, CacheEntry>();

  const expired = (entry: CacheEntry) => maxAge != null && now() - entry.storedAt >= maxAge;

  return {
    get: (key) => {
      const entry = store.get(key);
      if (!entry) {
        onMiss?.(key);
        return null;
      }
      if (expired(entry)) {
        store.delete(key);
        onExpired?.(key);
        onMiss?.(key);
        return null;
      }
      // LRU touch: move to most-recently-used
      store.delete(key);
      store.set(key, entry);
      onHit?.(key);
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
          onEvicted?.(oldest);
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

interface StoredRecord extends CacheEntry {
  /** Schema/data version — a mismatch invalidates the entry (migration). */
  v?: string | number;
}

export interface WebStorageCacheOptions {
  prefix?: string;
  /** Bump to invalidate all previously stored entries (migration). */
  version?: string | number;
  /** Drop entries older than this (ms) on access. */
  maxAge?: number;
  now?: () => number;
}

function webStorageCache(getStorage: () => Storage, options: WebStorageCacheOptions): CacheAdapter {
  const { prefix = 'eq:', version, maxAge, now = () => Date.now() } = options;
  const k = (key: string) => `${prefix}${key}`;
  return {
    get: (key) => {
      try {
        const raw = getStorage().getItem(k(key));
        if (!raw) return null;
        const rec = JSON.parse(raw) as StoredRecord;
        if (version !== undefined && rec.v !== version) {
          getStorage().removeItem(k(key));
          return null;
        }
        if (maxAge != null && now() - rec.storedAt >= maxAge) {
          getStorage().removeItem(k(key));
          return null;
        }
        return { value: rec.value, storedAt: rec.storedAt };
      } catch {
        return null;
      }
    },
    set: (key, value, storedAt) => {
      try {
        const rec: StoredRecord = { value, storedAt, v: version };
        getStorage().setItem(k(key), JSON.stringify(rec));
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

export function localStorageCache(options: WebStorageCacheOptions = {}): CacheAdapter {
  return webStorageCache(() => localStorage, options);
}

export function sessionStorageCache(options: WebStorageCacheOptions = {}): CacheAdapter {
  return webStorageCache(() => sessionStorage, options);
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
