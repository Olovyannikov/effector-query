/**
 * Composing endpoints from a shared request factory — FSD `shared/api` style.
 *
 * A base factory bakes in baseURL + headers (api-key / auth token), then each
 * endpoint is one declarative line:
 *
 *     createCommonRequestFx<In, Out>((params) => ({ url, params, method }))
 *
 * wrapped by createQuery / createMutation. This mirrors the pattern from
 * https://github.com/Olovyannikov/FSD-example (shared/api/product/api.ts),
 * but built on effector-refetch's own `createRequestFx`.
 */
import { ofetch } from 'ofetch';
import {
  concurrency,
  createMutation,
  createQuery,
  createRequestFx,
  invalidate,
  type RequestContext,
} from '../src';

// ---------------------------------------------------------------------------
// shared/api — the common factory
// ---------------------------------------------------------------------------

export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
} as const;
type HttpMethod = (typeof HTTP_METHODS)[keyof typeof HTTP_METHODS];

interface RequestDescriptor {
  url: string;
  method?: HttpMethod;
  params?: Record<string, unknown>;
  body?: unknown;
}

interface FactoryOptions {
  baseURL: string;
  /** Computed per request, so auth tokens / api keys stay fresh. */
  headers?: () => Record<string, string>;
}

/**
 * Build a preconfigured request-effect factory. The returned function turns an
 * endpoint descriptor into an abort-aware effector effect (real cancellation,
 * normalized RequestError) — ready for `createQuery` / `createMutation`.
 */
function createRequestFactory(options: FactoryOptions) {
  return function requestFx<Params = void, Response = unknown>(
    descriptor: (params: Params) => RequestDescriptor,
  ) {
    return createRequestFx<Params, Response>((params: Params, { signal }: RequestContext) => {
      const { url, method = 'GET', params: query, body } = descriptor(params);
      return ofetch<Response>(url, {
        baseURL: options.baseURL,
        method,
        query,
        body: body as Record<string, unknown> | undefined,
        headers: options.headers?.(),
        signal,
      });
    });
  };
}

const API_URL = 'https://api.v2.react-learning.ru';

// shared config (set once at app start)
let apiKey = '';
let authToken = '';
export const setApiKey = (key: string) => {
  apiKey = key;
};
export const setAuthToken = (token: string) => {
  authToken = token;
};

/** Public endpoints — authenticate with an API key header. */
export const createCommonRequestFx = createRequestFactory({
  baseURL: API_URL,
  headers: () => ({ 'X-API-KEY': apiKey }),
});

/** Authenticated endpoints — bearer token. */
export const createInternalRequestFx = createRequestFactory({
  baseURL: API_URL,
  headers: () => ({ Authorization: `Bearer ${authToken}` }),
});

// ---------------------------------------------------------------------------
// entities/product — endpoints composed from the shared factories
// ---------------------------------------------------------------------------

interface Product {
  id: number;
  slug: string;
  title: string;
  likesCount: number;
}
interface ProductsRequest {
  search?: string;
  limit?: number;
}

export const getProductsQuery = createQuery({
  effect: createCommonRequestFx<ProductsRequest, Product[]>((params) => ({
    url: '/products',
    params: { ...params },
  })),
  cache: { staleAfter: 30_000 },
});
// keystroke-driven search: keep only the latest in-flight request
concurrency(getProductsQuery, { strategy: 'TAKE_LATEST' });

export const getProductBySlugQuery = createQuery({
  effect: createCommonRequestFx<string, Product>((slug) => ({
    url: `/products/by-slug/${slug}`,
  })),
  cache: true,
  retry: 2,
});

export const likeProductMutation = createMutation({
  effect: createInternalRequestFx<number, Product>((id) => ({
    url: `/products/${id}/likes`,
    method: HTTP_METHODS.PUT,
  })),
});

export const unlikeProductMutation = createMutation({
  effect: createInternalRequestFx<number, { id: number }>((id) => ({
    url: `/products/${id}/likes`,
    method: HTTP_METHODS.DELETE,
  })),
});

// likes change the list -> refetch it after either mutation succeeds
invalidate({ on: [likeProductMutation, unlikeProductMutation], refetch: getProductsQuery });

// Usage (in a component / model):
//   setApiKey(import.meta.env.VITE_API_KEY);
//   getProductsQuery.start({ search: 'phone' });
//   likeProductMutation.mutate(42); // -> getProductsQuery refetches
