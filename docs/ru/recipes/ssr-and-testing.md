# SSR и тесты

Поскольку под капотом query — обычный effector, `fork()` + `allSettled()` работают как
обычно — без специальных тестовых утилит.

## Тестирование запроса

```ts
import { fork, allSettled } from 'effector';

const scope = fork();
await allSettled(query.start, { scope, params: 1 });
expect(scope.getState(query.$data)).toEqual(/* ... */);
```

## SSR

```ts
const scope = fork();
await allSettled(query.start, { scope, params: req.params });
const html = renderToString(/* app */, scope);
const serialized = serialize(scope); // effector serialize
```

Биндинги учитывают scope: React через `<Provider value={scope}>`, Vue через
`EffectorScopePlugin({ scope })`.

## Заметки

- Sourced-конфиг (`Store` для `concurrency` / `retry.times` / `cache.staleAfter` / `enabled`)
  **fork-корректен** — каждый scope видит своё значение.
- Адаптеры кэша держат состояние вне scope effector; для изолированного SSR создавайте
  запросы на каждый запрос (как обычно) или передавайте свежий адаптер.
- In-flight `AbortController`-ы отслеживаются на **инстанс** query; не шарьте один инстанс
  между конкурентными SSR-запросами, если ещё и вызываете `cancel`.
