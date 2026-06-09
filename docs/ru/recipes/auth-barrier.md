# Авторизация и barrier (пауза окружения)

Иногда нужно **поставить на паузу все запросы**, что-то сделать и продолжить — классический
случай `401`: пауза, рефреш токена, доигрывание очереди запросов.

`createBarrier` — это мьютекс, на котором запросы ждут. Пока он заблокирован, любой
gated-запрос, который пытается выполниться, блокируется; при разблокировке очередь продолжается.

```ts
import { sample } from 'effector';
import { createBarrier, createQueryFactory } from 'effector-query';

// barrier запускает рефреш при блокировке и разблокируется, когда рефреш завершится
const authBarrier = createBarrier({ perform: refreshTokenFx });

// все query/мутации этой фабрики ждут на barrier
const { createQuery, createMutation } = createQueryFactory({ barrier: authBarrier });

const profile = createQuery({
  effect: getProfileFx, // бросает { status: 401 } при протухшем токене
  retry: { times: 1, filter: ({ error }) => error.status === 401 },
});

// при 401 — блокируем barrier, что запускает refreshTokenFx
sample({
  clock: getProfileFx.failData,
  filter: (error) => error.status === 401,
  target: authBarrier.lock,
});
```

Что происходит при протухшем токене:

1. `getProfileFx` падает с `401` → barrier **блокируется**, запускается `refreshTokenFx`.
2. `retry` планирует повтор — но он **ждёт на barrier**.
3. Другие запросы, стартовавшие тем временем, тоже встают в очередь.
4. `refreshTokenFx` завершается → barrier **разблокируется** → повтор (и очередь) выполняются со свежим токеном.

## API

```ts
const barrier = createBarrier({ perform?: Effect<void, any> });
barrier.lock();        // закрыть — gated-запросы ждут
barrier.unlock();      // открыть — очередь продолжается
barrier.$locked;       // Store<boolean>
```

С `perform` блокировка автоматически запускает эффект и разблокируется по его завершении
(успех **или** ошибка — без дедлока). Без него — управляйте `lock`/`unlock` сами.

Gate одного запроса без фабрики:

```ts
const q = createQuery({ effect: fx, barrier: authBarrier });
```

::: warning Клиентский механизм
Barrier читает no-scope-стор, поэтому рассчитан на одно работающее приложение, а не на
изоляцию по `fork`. (Пауза запросов редко нужна на SSR.)
:::
