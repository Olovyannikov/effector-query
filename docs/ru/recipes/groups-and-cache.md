# Группы и доступ к кэшу

## Инвалидация группы запросов

[Фабрика](/ru/recipes/defaults) регистрирует каждый созданный запрос, поэтому их можно
перезапросить вместе — эффектор-овский аналог `queryClient.invalidateQueries`:

```ts
import { createQueryFactory } from 'effector-query';

const { createQuery, invalidate } = createQueryFactory();

const todos = createQuery({ effect: fetchTodosFx });
const profile = createQuery({ effect: fetchProfileFx });

// перезапросить все запросы, которые уже запускались
invalidate();

// или сузить предикатом (получает объект запроса)
invalidate({ predicate: (q) => q === todos });
```

`invalidate` — обычное событие: scope-корректно (`allSettled(invalidate, { scope })` для
SSR/тестов) и композируемо: `sample({ clock: loggedOut, target: invalidate })`.
Перезапрашиваются только запросы, которые уже выполнялись, с их последними параметрами.

Нужны отдельные группы — используйте несколько фабрик.

## Императивные чтение и запись кэша

```ts
import { getQueryData, setQueryData } from 'effector-query';

const todos = getQueryData(todosQuery); // текущее $data
setQueryData(todosQuery, (prev) => [...(prev ?? []), newTodo]); // значение или (prev) => next
```

Они читают/пишут no-scope-стор — для одно-клиентского приложения. В scope-коде читайте
`scope.getState(query.$data)` и предпочитайте операторы [`update`](/ru/api/mutations#update) /
[`optimisticUpdate`](/ru/recipes/optimistic) (они scope-корректны).

## gcTime?

TanStack-овский `gcTime` выгружает записи кэша, когда у них не осталось наблюдателей.
effector-query не отслеживает наблюдателей (запросы — обычные юниты, не подписки), поэтому
ближайший аналог — выгрузка по возрасту в адаптере: `inMemoryCache({ maxAge })` /
`localStorageCache({ maxAge })`, плюс `maxEntries` для LRU-лимита.
