# Авто-рефетч и поллинг

## Поллинг — `refetchInterval`

Перезапрос по таймеру, пока запрос запущен и включён:

```ts
const stats = createQuery({ effect: fetchStatsFx, refetchInterval: 5000 }); // каждые 5с
stats.start();
```

После каждого завершения (успех или ошибка) запрос ждёт `refetchInterval` мс и делает
`refresh` с последними параметрами (минуя кэш). Пауза, пока `$enabled` = `false`, остановка
на `reset`, и всё fork-корректно (каждый scope поллит независимо). Интервал может быть
реактивным — передайте `Store<number>` и меняйте на лету (например, чаще, пока вкладка активна):

```ts
createQuery({ effect: fx, refetchInterval: $pollMs });
```

## По фокусу окна / реконнекту

Opt-in, только браузер, tree-shakeable:

```ts
import { refetchOnWindowFocus, refetchOnReconnect } from 'effector-refetch';

const stop1 = refetchOnWindowFocus(userQuery);
const stop2 = refetchOnReconnect(userQuery);
// вызовите stop1() / stop2(), чтобы отписаться
```

Оба перезапрашивают с последними параметрами запроса, только если он уже запускался и
включён. Они читают no-scope-стор, поэтому рассчитаны на одно-клиентское приложение; для
scope-приложений дёргайте `query.refetch` сами через `scopeBind`.

## Offline / сетевой режим

`createNetworkBarrier()` — это [barrier](/ru/recipes/auth-barrier), который **блокируется, пока
браузер офлайн**, и разблокируется при реконнекте. Подключите его к запросам — и их прогоны
встают на паузу при потере сети, а затем сами продолжаются при её возврате, без обвязки на
каждый запрос:

```ts
import { createNetworkBarrier, refetchOnReconnect } from 'effector-refetch';

const offline = createNetworkBarrier();

const userQuery = createQuery({ effect: fetchUserFx, barrier: offline });
// или на всю группу: createQueryFactory({ barrier: offline })

offline.$online; // Store<boolean> — для баннера «вы офлайн»
refetchOnReconnect(userQuery); // опционально: ещё и обновить уже загруженные данные
offline.stop(); // отвязать слушатели online/offline при размонтировании
```

Прогон, запущенный офлайн, висит в `pending` (тело эффекта не вызывается), пока сеть не вернётся.
Только браузер — на сервере барьер остаётся открытым (онлайн).

## Композиция с patronum

Триггеры запроса — обычные события effector, поэтому их можно гонять любым оператором
[patronum](https://patronum.effector.dev/operators/) — без специального API:

```ts
import { interval, debounce, throttle } from 'patronum';

// debounce поиска по мере ввода
debounce({ source: queryChanged, timeout: 300, target: searchQuery.start });

// свой поллинг с управлением start/stop
const { tick } = interval({ timeout: 10_000, start: pageOpened, stop: pageClosed });
sample({ clock: tick, source: searchQuery.$params, target: searchQuery.refetch });

// throttle кнопки обновления
throttle({ source: refreshClicked, timeout: 1000, target: dashboard.refresh });
```

Для типового случая используйте встроенный `refetchInterval`; берите patronum, когда нужны
явные start/stop, debounce или throttle.
