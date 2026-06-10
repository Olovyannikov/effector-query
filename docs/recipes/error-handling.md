# Error handling

Errors are first-class: a failed effect drives `$error`, flips `$status` to `'fail'`, and emits
`finished.fail` — all scope-safe. This recipe covers reading errors, normalizing them, deciding
what to retry, and reacting globally.

## Reading the error

```ts
const userQuery = createQuery({ effect: fetchUserFx });

userQuery.$error; // Store<Error | null>
userQuery.$status; // 'initial' | 'pending' | 'done' | 'fail'
userQuery.finished.fail; // Event<{ params; error }>
```

In a component, the bindings expose it directly:

```ts
// React
const { error, status } = useQuery(userQuery);
// Vue
const { error, isFail } = useQuery(userQuery);
```

## Normalizing errors with `mapError`

Turn raw failures into a shape your UI understands before they ever reach `$error`:

```ts
const userQuery = createQuery({
  effect: fetchUserFx,
  mapError: ({ error, params }) => ({
    code: (error as RequestError).status ?? 0,
    message: error instanceof Error ? error.message : 'Unknown error',
    userId: params,
  }),
});
// userQuery.$error is now Store<{ code; message; userId } | null>
```

## Typed transport errors

`createRequestFx` rejects with a [`RequestError`](/api/http) carrying `status` and `data`, so you
can branch on the HTTP status. Wrapping a third-party client? `normalizeRequestError` coerces
axios/ofetch-style errors into the same shape:

```ts
import { createRequestFx, RequestError, normalizeRequestError } from 'effector-refetch';

const fetchUserFx = createRequestFx(async (id: number, { signal }) => {
  const res = await fetch(`/api/users/${id}`, { signal });
  if (!res.ok) throw new RequestError(`HTTP ${res.status}`, { status: res.status, data: await res.text() });
  return res.json();
});

// from axios/ofetch:
const fetchFx = createRequestFx(async (id: number) => {
  try {
    return (await api.get(`/users/${id}`)).data;
  } catch (e) {
    throw normalizeRequestError(e); // -> RequestError { status, data }
  }
});
```

## Deciding what to retry

By default `retry` repeats on any failure. Use `filter` to retry only the transient ones (skip
4xx), and `suppressIntermediateErrors` to keep `$error` clean until the final attempt:

```ts
const query = createQuery({
  effect: fetchUserFx,
  retry: {
    times: 3,
    delay: (attempt) => 2 ** attempt * 200, // backoff
    filter: ({ error }) => {
      const status = (error as RequestError).status ?? 0;
      return status === 0 || status >= 500; // network / server only
    },
    suppressIntermediateErrors: true, // $error stays null while retrying
  },
});
```

A failed validation ([contracts](/api/http)) throws a `ValidationError`, which flows through
the same path and **is retryable** — handy when a flaky upstream occasionally returns malformed
data.

## Reacting globally

`finished.fail` is a plain effector event — `sample` it into a toast, a logger, or Sentry:

```ts
import { sample } from 'effector';

sample({
  clock: [userQuery.finished.fail, todosQuery.finished.fail],
  fn: ({ error }) => (error instanceof Error ? error.message : 'Request failed'),
  target: showToastFx,
});
```

With a [shared factory](/recipes/defaults) you can wire this once for every query in a group via
its `finished.fail` events, instead of repeating it per query.

## 401 → refresh → replay

For "the token expired, refresh it and replay the failed requests", don't handle it per query —
pause the whole environment with a [barrier](/recipes/auth-barrier): on a 401 it locks, refreshes
the token, then releases the queued requests.

Runnable error shapes: [`examples/graphql.ts`](https://github.com/Olovyannikov/effector-refetch/blob/main/examples/graphql.ts)
(GraphQL `errors` → `RequestError`) and the [HTTP page](/api/http).
