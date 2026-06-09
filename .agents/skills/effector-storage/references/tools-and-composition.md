# Tools and Composition

## Contents
- `async`
- `either`
- `farcached`
- Composition recipes

## `async`

Wraps sync adapters so init/read/write become async.

Use when immediate synchronous restore causes ordering issues (for example, handlers attached after `persist`).

```ts
persist({ adapter: async(local), store: $state, key: 'state' })
```

## `either`

Selects first adapter unless it is `noop`, otherwise falls back.

```ts
persist({
  adapter: either(local, log),
  store: $state,
  key: 'state',
})
```

Use for SSR/universal code where browser-only adapters become no-op on server.

## `farcached`

Wraps `@farfetched/core` cache adapter as a persist adapter.

Use when you need cache TTL/invalidation semantics and optional adapter injection per scope.

## Composition Recipes

- Rate-limit writes: use adapter `timeout` or explicit `clock` unit.
- Manual refresh from storage: use `pickup` event/effect/store.
- Environment fallback: `either(local, memory)` or `either(local, nil)`.
- Shared defaults: `createPersist({ keyPrefix: 'app/' })`.
