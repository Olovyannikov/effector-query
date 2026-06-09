# HTTP и валидация

## createRequestFx

Оборачивает любой HTTP-клиент в типизированный, abort-aware эффект с нормализованными ошибками:

```ts
import { ofetch } from 'ofetch';
import { createRequestFx, createQuery } from 'effector-query';

const getUserFx = createRequestFx<{ id: number }, User>(({ id }, { signal }) =>
  ofetch(`/api/users/${id}`, { signal }),
);
const userQuery = createQuery({ effect: getUserFx, cache: true });
```

Хендлер получает `AbortSignal`; контроллером владеет query и срабатывает им на `cancel` /
`reset` и при вытеснении `TAKE_LATEST` — так запрос реально прерывается. Ошибки нормализуются
в `RequestError` (`status`, `data`).

## createJsonQuery

Декларативный эндпоинт поверх глобального `fetch` (без зависимости от HTTP-клиента):

```ts
import { createJsonQuery, HTTP_METHODS, zodContract } from 'effector-query';

export const getProductsQuery = createJsonQuery({
  request: { url: 'https://api/products', query: ({ search }) => ({ search, limit: 20 }) },
  response: { contract: zodContract(ProductList) },
  concurrency: 'TAKE_LATEST',
  cache: { staleAfter: 30_000 },
});

export const createUser = createJsonQuery<NewUser, User>({
  request: { url: 'https://api/users', method: HTTP_METHODS.POST, body: (u) => u },
});
```

`request`: `{ url, method?, query?, body?, headers? }` (каждое — функция от параметров, кроме
`url`, который может быть строкой). Abort-aware, нормализованный `RequestError`,
опциональный контракт и все обычные опции запроса.

## Валидация (контракты)

Проверяет ответ по схеме; провал превращается в **ретраябельную** `ValidationError`:

```ts
import { createQuery, zodContract, standardSchemaContract, createContract } from 'effector-query';

createQuery({ effect: getUserFx, contract: zodContract(UserSchema) }); // zod
createQuery({ effect: getUserFx, contract: standardSchemaContract(UserSchema) }); // valibot / zod 3.24+ / arktype
createQuery({ effect: getUserFx, contract: createContract({ isData: isUser }) }); // вручную
createQuery({ effect: getPriceFx, validate: ({ result }) => result >= 0 || ['отрицательная цена'] });
```

Контракты **структурные** — сами библиотеки схем не импортируются, вы передаёте свою схему.
При провале `$error` — это `ValidationError` с `.validationErrors`.
