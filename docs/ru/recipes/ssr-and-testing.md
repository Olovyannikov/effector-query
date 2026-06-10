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
const serialized = serialize(scope); // effector serialize — $data / $status / …
```

Биндинги учитывают scope: React через `<Provider value={scope}>`, Vue через
`EffectorScopePlugin({ scope })`.

### Перенос кэша (`dehydrate` / `hydrate`)

`serialize(scope)` сохраняет **состояние сторов**, но **кэш** запроса (dedupe / `staleAfter`)
живёт вне scope и туда не попадает. `dehydrate` снимает его снапшот, `hydrate` восстанавливает на
клиенте — и закэшированные параметры дают хит вместо перезапроса:

```ts
// сервер — рядом с serialize(scope)
const cache = inMemoryCache();
const todos = createQuery({ effect: fetchTodosFx, cache: { adapter: cache } });
// … прогоняем запросы под scope …
const payload = { values: serialize(scope), cache: dehydrate(cache) };

// клиент
hydrate(cache, payload.cache); // греем кэш (storedAt сохраняется → staleAfter стареет корректно)
const scope = fork({ values: payload.values }); // $data восстановлен — без мигания загрузки
```

Дегидрируются только адаптеры, умеющие перечислять записи (например `inMemoryCache`); web-storage
адаптеры персистят себя сами.

### Персист на клиенте

Два взаимодополняющих способа пережить перезагрузку в браузере:

- **Слой кэша** — используйте `localStorageCache` / `sessionStorageCache` как адаптер; кэш запроса
  переживает перезагрузку (а `version` инвалидирует старые данные).
- **Слой стора** — персистите `$data` напрямую через [`effector-storage`](https://github.com/yumauri/effector-storage):

  ```ts
  import { persist } from 'effector-storage/local';
  persist({ store: todosQuery.$data as StoreWritable<Todo[] | null>, key: 'todos:data' });
  ```

  (`$data` в публичном типе read-only, но писабельный в рантайме — кастуйте для `persist`.)

Полный рабочий поток: [`examples/ssr.ts`](https://github.com/Olovyannikov/effector-refetch/blob/main/examples/ssr.ts).

## Заметки

- Sourced-конфиг (`Store` для `concurrency` / `retry.times` / `cache.staleAfter` / `enabled`)
  **fork-корректен** — каждый scope видит своё значение.
- Адаптеры кэша держат состояние вне scope effector; для изолированного SSR создавайте
  запросы на каждый запрос (как обычно) или передавайте свежий адаптер.
- In-flight `AbortController`-ы отслеживаются на **инстанс** query; не шарьте один инстанс
  между конкурентными SSR-запросами, если ещё и вызываете `cancel`.
