# effector inspector и логирование

Помимо [визуальных devtools](/ru/api/devtools), effector-refetch дружит с общим
инструментарием effector — инспектором и любым логгером.

## Именуйте запросы

Дайте запросу `name` (или `debug: true`), чтобы его юниты были подписаны в инспекторе:

```ts
const todos = createQuery({ effect: fetchTodosFx, name: 'todos' });
// юниты: todos.start, todos.$data, todos.$status, todos.runFx, todos.inspect.*

const adhoc = createQuery({ effect: fx, debug: true }); // подписаны как query.* без name
```

## @effector/inspector

```ts
import { inspect } from '@effector/inspector';

inspect(); // рендерит инспектор; именованные юниты сгруппированы и читаемы
```

## Своё логирование через attachQueryLogger

Для безголового логирования (серверные логи, аналитика, своя панель) подпишитесь на поток
жизненного цикла:

```ts
import { attachQueryLogger } from 'effector-refetch';

attachQueryLogger(todos, {
  name: 'todos',
  handler: (entry) => logger.debug('query', entry),
  // entry: { query, type, params?, attempt?, error?, durationMs? }
});
```

`type` — одно из `start | run | done | fail | aborted | cache-hit | cache-miss | retry`.
Форвардите в breadcrumbs Sentry, свой таймлайн или `console`.

## Низкоуровневый поток

Если нужны сырые события effector (например, чтобы завести свой `sample`), используйте
`query.__.inspect` — см. [Интроспекцию](/ru/api/introspection).
