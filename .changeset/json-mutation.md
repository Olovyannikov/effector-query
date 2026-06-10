---
'effector-refetch': minor
---

`createJsonMutation` — declarative HTTP for writes, the mirror of `createJsonQuery`. Same `request`
shape (including sourced `Store`/`{ source, fn }` fields), defaults to `POST`, returns a `Mutation`
(no cache/refresh/stale). The request-effect builder is now shared between the two.
