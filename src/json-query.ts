import { createRequestFx, RequestError } from './request';
import { createQuery } from './create-query';
import type { CacheConfig, ConcurrencyStrategy, Query, RetryConfig } from './types';
import type { Contract } from './validation';
import type { Store } from 'effector';

export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
} as const;
export type HttpMethod = (typeof HTTP_METHODS)[keyof typeof HTTP_METHODS];

type QueryValue = string | number | boolean | null | undefined;

export interface JsonRequest<Params> {
  url: string | ((params: Params) => string);
  method?: HttpMethod;
  query?: (params: Params) => Record<string, QueryValue | QueryValue[]>;
  body?: (params: Params) => unknown;
  headers?: (params: Params) => Record<string, string>;
}

export interface CreateJsonQueryConfig<Params, Response> {
  request: JsonRequest<Params>;
  response?: { contract?: Contract<Response> };
  concurrency?: ConcurrencyStrategy | Store<ConcurrencyStrategy>;
  retry?: number | RetryConfig<RequestError>;
  cache?: boolean | CacheConfig<Params>;
  enabled?: Store<boolean>;
  initialData?: Response;
  name?: string;
}

function buildQueryString(query: Record<string, QueryValue | QueryValue[]>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const v of value) if (v != null) sp.append(key, String(v));
    } else {
      sp.append(key, String(value));
    }
  }
  return sp.toString();
}

/**
 * Declarative JSON query over the global `fetch` (no HTTP-client dependency).
 * Builds an abort-aware request effect + a validated query in one call.
 *
 *   const userQuery = createJsonQuery({
 *     request: { url: ({ id }) => `/api/users/${id}` },
 *     response: { contract: zodContract(UserSchema) },
 *     cache: true,
 *   });
 */
export function createJsonQuery<Params = void, Response = unknown>(
  config: CreateJsonQueryConfig<Params, Response>,
): Query<Params, Response, RequestError, Response> {
  const { request } = config;
  const method = request.method ?? 'GET';

  const requestFx = createRequestFx<Params, Response>(
    async (params, { signal }) => {
      const base = typeof request.url === 'function' ? request.url(params) : request.url;
      const qs = request.query ? buildQueryString(request.query(params)) : '';
      const url = qs ? `${base}${base.includes('?') ? '&' : '?'}${qs}` : base;

      const hasBody = request.body != null && method !== 'GET' && method !== 'DELETE';
      const headers: Record<string, string> = {
        ...(hasBody ? { 'content-type': 'application/json' } : {}),
        ...request.headers?.(params),
      };

      const res = await fetch(url, {
        method,
        headers,
        body: hasBody ? JSON.stringify(request.body!(params)) : undefined,
        signal,
      });

      if (!res.ok) {
        let data: unknown = null;
        try {
          data = await res.json();
        } catch {
          /* non-JSON error body */
        }
        throw new RequestError(`HTTP ${res.status} ${res.statusText}`.trim(), {
          status: res.status,
          data,
        });
      }
      return (await res.json()) as Response;
    },
    { name: config.name },
  );

  return createQuery<Params, Response, RequestError, Response>({
    effect: requestFx,
    contract: config.response?.contract,
    concurrency: config.concurrency,
    retry: config.retry,
    cache: config.cache,
    enabled: config.enabled,
    initialData: config.initialData,
    name: config.name,
  });
}
