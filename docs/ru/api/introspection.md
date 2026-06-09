# Интроспекция

## Метки для devtools

Передайте `name`, чтобы пометить публичные юниты в инспекторе effector:

```ts
const todos = createQuery({ effect: fetchTodosFx, name: 'todos' });
// юниты появятся как todos.start, todos.$data, todos.$status, todos.runFx, todos.inspect.*
```

## Поток событий жизненного цикла

Каждый query предоставляет `query.__.inspect` — события effector для подписки:

| событие                  | payload                      |
| ------------------------ | ---------------------------- |
| `start`                  | `{ params }`                 |
| `run`                    | `{ params, attempt }`        |
| `done`                   | `{ params, result }`         |
| `fail`                   | `{ params, error }`          |
| `aborted`                | `{ params }`                 |
| `cacheHit` / `cacheMiss` | `{ params }`                 |
| `retry`                  | `{ params, attempt, error }` |

## attachQueryLogger

Превращает поток в структурные записи с замером времени:

```ts
import { attachQueryLogger } from 'effector-refetch';

const stop = attachQueryLogger(todos, { name: 'todos' });
// → { query: 'todos', type: 'run', params, attempt: 0 }
//   { query: 'todos', type: 'done', params, durationMs: 42 }
stop(); // отписаться
```

Передайте свой `handler`, чтобы форвардить записи в собственный логгер или инспектор
effector. Типы записей: `start | run | done | fail | aborted | cache-hit | cache-miss | retry`.
