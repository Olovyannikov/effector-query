# Introspection

## Devtools labelling

Pass `name` to label the public units in the effector inspector:

```ts
const todos = createQuery({ effect: fetchTodosFx, name: 'todos' });
// units appear as todos.start, todos.$data, todos.$status, todos.runFx, todos.inspect.*
```

## Lifecycle event stream

Every query exposes `query.__.inspect` — effector events you can subscribe to:

| event | payload |
| --- | --- |
| `start` | `{ params }` |
| `run` | `{ params, attempt }` |
| `done` | `{ params, result }` |
| `fail` | `{ params, error }` |
| `aborted` | `{ params }` |
| `cacheHit` / `cacheMiss` | `{ params }` |
| `retry` | `{ params, attempt, error }` |

## attachQueryLogger

Turn the stream into structured, timed log entries:

```ts
import { attachQueryLogger } from 'effector-query';

const stop = attachQueryLogger(todos, { name: 'todos' });
// → { query: 'todos', type: 'run', params, attempt: 0 }
//   { query: 'todos', type: 'done', params, durationMs: 42 }
stop(); // unsubscribe
```

Pass a custom `handler` to forward entries into your own logger or the effector
inspector. Entry types: `start | run | done | fail | aborted | cache-hit | cache-miss | retry`.
