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

`request`: `{ url, method?, query?, body?, headers? }` (each a function of params, except
`url` which may be a string). Abort-aware, normalized `RequestError`, optional contract,
plus all the usual query options.

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
