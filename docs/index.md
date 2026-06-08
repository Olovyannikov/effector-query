---
layout: home

hero:
  name: effector-query
  text: Queries on real effects
  tagline: A friendly, maintained data layer for effector — built on real effects, not internal events.
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: Why not farfetched?
      link: /guide/vs-farfetched
    - theme: alt
      text: GitHub
      link: https://github.com/Olovyannikov/effector-query

features:
  - title: Effect-first
    details: The unit of work is your own Effect (incl. attach factories) — visible in devtools, fork-friendly. The query is a thin reactive shell.
  - title: Friendly by default
    details: retry / cache / concurrency are inline options with sane defaults — and standalone, composable operators for power users.
  - title: Real cancellation
    details: createRequestFx effects are abort-aware — cancel / reset / TAKE_LATEST actually abort the in-flight request.
  - title: Batteries included
    details: Mutations, invalidation, optimistic updates, validation contracts, createJsonQuery, pagination, SWR + cache GC.
  - title: Framework bindings
    details: useUnit(query) works directly in React and Vue via @@unitShape, plus thin useQuery helpers.
  - title: Introspection
    details: A lifecycle event stream + attachQueryLogger for devtools and structured logging.
---
