# HTTP & validation

## createRequestFx

Wrap any HTTP client into a typed, abort-aware effector effect with normalized errors:

```ts
import { ofetch } from 'ofetch';
import { createRequestFx, createQuery } from 'effector-refetch';

const getUserFx = createRequestFx<{ id: number }, User>(({ id }, { signal }) =>
  ofetch(`/api/users/${id}`, { signal }),
);
const userQuery = createQuery({ effect: getUserFx, cache: true });
```

The handler receives an `AbortSignal`; the query owns the controller and fires it on
`cancel` / `reset` and on `TAKE_LATEST` supersede — so the request actually aborts.
Errors are normalized to `RequestError` (`status`, `data`).

It's just an effect, so anything works inside: multipart **FormData** uploads
([`examples/form-data.ts`](https://github.com/Olovyannikov/effector-refetch/blob/main/examples/form-data.ts)),
**GraphQL** (POST `{ query, variables }` — see the [GraphQL recipe](/recipes/graphql)),
or streaming updates ([SSE & WebSocket](/recipes/streaming)).

## createJsonQuery

Declarative endpoint over the global `fetch` (no HTTP-client dependency):

```ts
import { createJsonQuery, HTTP_METHODS, zodContract } from 'effector-refetch';

export const getProductsQuery = createJsonQuery({
  request: { url: 'https://api/products', query: ({ search }) => ({ search, limit: 20 }) },
  response: { contract: zodContract(ProductList) },
  concurrency: 'TAKE_LATEST',
  cache: { staleAfter: 30_000 },
});

export const createUser = createJsonQuery<NewUser, User>({
  request: { url: 'https://api/users', method: HTTP_METHODS.POST, body: (u) => u },
});
```

`request`: `{ url, method?, query?, body?, headers? }`. Each field is a function of params
(or, for `url`, a static string). Abort-aware, normalized `RequestError`, optional contract,
plus all the usual query options.

### Sourced fields (reactive, fork-correct)

Any request field can also be read from a `Store` — handy for an auth token or base URL that
lives in state. It's wired through `attach`, so each `fork`/SSR scope uses its own value:

```ts
const userQuery = createJsonQuery<{ id: number }>({
  request: {
    // combine a store with params via { source, fn }
    url: { source: $apiBase, fn: (base, { id }) => `${base}/users/${id}` },
    // or pass a Store directly
    headers: { source: $token, fn: (token) => ({ authorization: `Bearer ${token}` }) },
  },
});
```

A field is `(params) => T`, a `Store<T>`, or `{ source: Store, fn: (value, params) => T }`.
Stores are resolved per scope at request time — no global mutable client.

## createJsonMutation

The write-side mirror of `createJsonQuery`: same `request` shape (sourced fields included),
defaults to `POST`, returns a `Mutation` (no cache / refresh / stale).

```ts
import { createJsonMutation, invalidate } from 'effector-refetch';

const createUser = createJsonMutation<NewUser, User>({
  request: { url: 'https://api/users', body: (u) => u }, // method defaults to POST
});

const deleteUser = createJsonMutation<number>({
  request: { url: (id) => `https://api/users/${id}`, method: HTTP_METHODS.DELETE },
});

invalidate({ on: createUser, refetch: usersQuery }); // refetch the list on success
createUser.mutate({ name: 'Ada' });
```

## Validation (contracts)

Validate a response against a schema; a failure becomes a **retryable** `ValidationError`:

```ts
import { createQuery, zodContract, standardSchemaContract, createContract } from 'effector-refetch';

createQuery({ effect: getUserFx, contract: zodContract(UserSchema) }); // zod
createQuery({ effect: getUserFx, contract: standardSchemaContract(UserSchema) }); // valibot / zod 3.24+ / arktype
createQuery({ effect: getUserFx, contract: createContract({ isData: isUser }) }); // manual
createQuery({ effect: getPriceFx, validate: ({ result }) => result >= 0 || ['negative price'] });
```

Contracts are **structural** — the schema libraries are not imported; you pass your own
schema. On failure, `$error` is a `ValidationError` with `.validationErrors`.
