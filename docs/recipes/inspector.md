# effector inspector & logging

Beyond the [visual devtools](/api/devtools), effector-query plays well with the broader
effector tooling — the inspector and any logger.

## Name your queries

Give each query a `name` (or `debug: true`) so its units show up labelled in the inspector:

```ts
const todos = createQuery({ effect: fetchTodosFx, name: 'todos' });
// units: todos.start, todos.$data, todos.$status, todos.runFx, todos.inspect.*

const adhoc = createQuery({ effect: fx, debug: true }); // labelled as query.* without a name
```

## @effector/inspector

```ts
import { inspect } from '@effector/inspector';

inspect(); // renders the inspector; named query units are grouped and readable
```

## Custom logging with attachQueryLogger

For headless logging (server logs, analytics, your own panel), subscribe to the
lifecycle stream:

```ts
import { attachQueryLogger } from 'effector-query';

attachQueryLogger(todos, {
  name: 'todos',
  handler: (entry) => logger.debug('query', entry),
  // entry: { query, type, params?, attempt?, error?, durationMs? }
});
```

`type` is one of `start | run | done | fail | aborted | cache-hit | cache-miss | retry`.
Forward these into Sentry breadcrumbs, a custom timeline, or `console`.

## Low-level stream

If you need the raw effector events (e.g. to wire your own `sample`), use
`query.__.inspect` — see [Introspection](/api/introspection).
