# Introduction

## The problem

Almost every app does the same dance around data: kick off a request, track whether it's
loading, catch the error, show the result. Then reality piles on — the user double-clicks,
a second request races the first, the response is already stale, you want a retry, you'd
like to not refetch what you just fetched, and ideally none of this lives inside a React
component.

Hand-rolled, that's a swamp of `useState`/`useEffect`, race conditions, and logic welded
to the view. effector solves the _state_ part beautifully with events, stores and effects.
**effector-refetch** owns the _data-fetching_ part on top of it.

## The idea: build on real effects

The core decision is simple: **your effect is the unit of work.**

```ts
const fetchUserFx = createEffect((id: number) => api.user(id));
const userQuery = createQuery({ effect: fetchUserFx });
```

`userQuery` is a thin reactive shell around `fetchUserFx`. It adds `$data`, `$error`,
`$status`, `$pending`, lifecycle events, retry, cache and concurrency — but the effect
underneath is still your effect: visible in devtools, composable with `attach`, and
fork-friendly for SSR and tests. Nothing is hidden in a private executor.

That's the difference from a "black box" data layer: you keep effector's mental model
(events flow through a graph of rules) and just get the querying conveniences declaratively.

## What you get

- **Status & lifecycle** — `$data / $error / $status / $pending`, `finished.{done,fail}`.
- **Concurrency** — `TAKE_LATEST` (default), `TAKE_FIRST`, `TAKE_EVERY`; races just die.
- **Retry** — graph-level, each attempt a real effect call.
- **Caching** — staleAfter, SWR, GC, dedupe, persistence.
- **Real cancellation** — abort the in-flight request, not just ignore it.
- **Mutations & invalidation** — `createMutation`, `invalidate`, `update`, optimistic updates.
- **Validation** — schema contracts (zod / Standard Schema) turn bad responses into errors.
- **Declarative HTTP** — `createJsonQuery` over the global `fetch`.
- **Pagination** — `createInfiniteQuery` (bidirectional `fetchNext`/`fetchPrevious`).
- **Auto-refetch & polling** — `refetchInterval`, window-focus / reconnect helpers.
- **Barrier & offline** — `createBarrier` (401 → refresh → replay) and `createNetworkBarrier`.
- **Bindings** — `useUnit(query)` / `useQuery` for React, Vue and Solid, plus `useSuspenseQuery`.
- **Devtools** — visual panels for React, Vue and Solid + an introspection stream.

## Philosophy

- **Friendly by default, powerful underneath.** Inline options cover the 90%; the same
  features are standalone operators for the rest.
- **No magic.** It's plain effector units (`createStore` / `sample` / `createEffect`) you
  could have written — just composed for you.
- **Honest.** We tell you when _not_ to use it, and how it compares to
  [farfetched](/guide/vs-farfetched).

Ready? [Get started →](/guide/getting-started)
