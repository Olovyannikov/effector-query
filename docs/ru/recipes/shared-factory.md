# Общая фабрика запросов

Заложите `baseURL` + заголовки/авторизацию в фабрику один раз, а дальше объявляйте эндпоинты
одной строкой — паттерн FSD `shared/api`.

```ts
import { ofetch } from 'ofetch';
import { createRequestFx, createQuery, createMutation, concurrency, invalidate } from 'effector-query';

const HTTP_METHODS = { GET: 'GET', POST: 'POST', PUT: 'PUT', DELETE: 'DELETE' } as const;

function createRequestFactory(opts: { baseURL: string; headers?: () => Record<string, string> }) {
  return <Params = void, Response = unknown>(
    descriptor: (params: Params) => { url: string; method?: string; params?: Record<string, unknown>; body?: unknown },
  ) =>
    createRequestFx<Params, Response>((params, { signal }) => {
      const { url, method = 'GET', params: query, body } = descriptor(params);
      return ofetch<Response>(url, { baseURL: opts.baseURL, method, query, body, headers: opts.headers?.(), signal });
    });
}

let apiKey = '';
export const createCommonRequestFx = createRequestFactory({ baseURL: API_URL, headers: () => ({ 'X-API-KEY': apiKey }) });
export const createInternalRequestFx = createRequestFactory({ baseURL: API_URL, headers: () => ({ Authorization: `Bearer ${token}` }) });
```

Эндпоинты:

```ts
export const getProductsQuery = createQuery({
  effect: createCommonRequestFx<ProductsRequest, Product[]>((params) => ({ url: '/products', params })),
  cache: { staleAfter: 30_000 },
});
concurrency(getProductsQuery, { strategy: 'TAKE_LATEST' });

export const likeProductMutation = createMutation({
  effect: createInternalRequestFx<number, Product>((id) => ({ url: `/products/${id}/likes`, method: HTTP_METHODS.PUT })),
});

invalidate({ on: likeProductMutation, refetch: getProductsQuery });
```

Полный рабочий пример: [`examples/shared-factory.ts`](https://github.com/Olovyannikov/effector-query/blob/main/examples/shared-factory.ts).
