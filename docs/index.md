---
layout: home

hero:
  name: effector-refetch
  text: Data fetching that flows
  tagline: Queries, mutations, caching and pagination for effector — built on your real effects, not a black box. Friendly defaults, honest trade-offs, fork-ready for SSR.
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: Why effector-refetch?
      link: /guide/introduction
    - theme: alt
      text: GitHub
      link: https://github.com/Olovyannikov/effector-query

features:
  - icon: ⚡
    title: Effect-first
    details: The unit of work is your own Effect — visible in devtools, composable with attach, fork-friendly. The query is a thin reactive shell, never a black box.
  - icon: 🎛️
    title: Friendly, not magic
    details: retry, cache and concurrency are one-line options with sane defaults — and the same powers are standalone, composable operators when you need them.
  - icon: 🛑
    title: Real cancellation
    details: Effects from createRequestFx are abort-aware — cancel, reset and TAKE_LATEST actually abort the in-flight request, not just ignore it.
  - icon: 🧱
    title: Batteries included
    details: Mutations, invalidation, optimistic updates, validation contracts, createJsonQuery, pagination, SWR, cache GC and dedupe.
  - icon: 🧩
    title: React & Vue
    details: useUnit(query) works directly via @@unitShape — plus thin useQuery helpers. Solid is on the way.
  - icon: 🔍
    title: Observable
    details: A lifecycle event stream and attachQueryLogger make every run inspectable for devtools and logging.
---

## A 30-second taste

```ts
import { createEffect } from 'effector';
import { createQuery, createMutation, invalidate } from 'effector-refetch';

const fetchTodosFx = createEffect(() => fetch('/api/todos').then((r) => r.json()));
const addTodoFx = createEffect((text: string) =>
  fetch('/api/todos', { method: 'POST', body: JSON.stringify({ text }) }).then((r) => r.json()),
);

export const todos = createQuery({ effect: fetchTodosFx, cache: true, retry: 2 });
export const addTodo = createMutation({ effect: addTodoFx });

// when a todo is added, refresh the list
invalidate({ on: addTodo, refetch: todos });

todos.start();
addTodo.mutate('Buy milk'); // → todos refetches automatically
```

In a component, read it with one hook:

```tsx
const { data, pending } = useUnit(todos); // React or Vue
```

## Why not just use effects directly?

You can — and you still are. effector-refetch doesn't replace your effects; it wires the
boring, fiddly parts around them: loading/error status, retries, caching, request
cancellation, deduplication, validation. Your effect stays a first-class effector unit
you can see in devtools and test with `fork()`.

If you've felt the pain of hand-rolling "is it loading, did it fail, is this response
stale, did the user click twice, which request won the race" — that's the part this
library owns, declaratively.

## When it fits — and when it doesn't

**Reach for it** when you have real async with races, caching needs, or many endpoints,
and you want it testable without a renderer.

**Skip it** for a tiny app with a couple of `useState` calls, or a throwaway prototype —
plain effects (or even `fetch`) are honest there. We'd rather you under-use this than
cargo-cult it. See the [honest comparison with farfetched](/guide/vs-farfetched).

<div style="margin-top: 2rem; opacity: .7">

Pre-1.0 and actively developed · MIT · [Roadmap](https://github.com/Olovyannikov/effector-query/blob/main/ROADMAP.md)

</div>
