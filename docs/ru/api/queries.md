# Запросы

```ts
import { createQuery } from 'effector-query';

const query = createQuery({
  effect,                  // Effect<Params, Result, Error> (или `handler`)
  initialData,
  enabled,                 // Store<boolean>
  mapData, mapError,
  contract, validate,      // см. «HTTP и валидация»
  retry,                   // number | { times, delay?, filter?, suppressIntermediateErrors? }
  cache,                   // true | { adapter?, staleAfter?, key?, purge?, swr?, dedupe? }
  concurrency,             // 'TAKE_LATEST' (по умолчанию) | 'TAKE_FIRST' | 'TAKE_EVERY'
  name,                    // метка для devtools
});
```

## Опции

- **`effect`** — ваш `Effect<Params, Result, Error>`. `handler: async params => …` — сахар.
- **`concurrency`** — поведение при пересекающихся запусках:
  - `TAKE_LATEST` (по умолчанию) — новый запуск вытесняет и прерывает предыдущий.
  - `TAKE_FIRST` — игнорировать новые запуски, пока один в полёте.
  - `TAKE_EVERY` — применяются все (в `$data` побеждает последний результат).
- **`retry`** — `number` или `{ times, delay?, filter?, suppressIntermediateErrors? }`. Каждый ретрай — реальный вызов эффекта. Хелперы: `linearDelay`, `exponentialDelay`.
- **`cache`** — `true` или конфиг (см. [кэширование](#кэширование)).
- **`enabled`** — гейт `Store<boolean>`; пока `false`, `start`/`refresh` пропускаются.
- **`mapData` / `mapError`** — нормализация результата / ошибки перед сторами.

## Операторы

`concurrency` / `retry` / `cache` — это ещё и отдельные композируемые операторы; inline-опции
— сахар над ними. Применяйте напрямую, в том числе после создания:

```ts
import { createQuery, concurrency, retry, cache } from 'effector-query';

const search = createQuery({ effect: searchFx });
concurrency(search, { strategy: 'TAKE_LATEST' });
retry(search, { times: 3, delay: exponentialDelay(200) });
cache(search, { staleAfter: 30_000, purge: loggedOut });
```

## Кэширование

`cache: { adapter?, staleAfter?, key?, purge?, swr?, dedupe? }`

- **`swr: true`** — отдать устаревшую запись сразу, ревалидировать в фоне (`$stale` переходит `true` → `false`).
- **`dedupe: true`** — склеить одинаковые in-flight запросы (по ключу) в один прогон эффекта.
- Адаптеры: `inMemoryCache({ maxAge?, maxEntries?, onHit?, onMiss?, onExpired?, onEvicted? })` (LRU GC + события), `localStorageCache({ version?, maxAge? })` / `sessionStorageCache(...)` (поднимите `version`, чтобы инвалидировать старые данные), `voidCache`.

## Реактивный (sourced) конфиг

Inline `concurrency`, `retry.times`, `cache.staleAfter` (и `enabled`) принимают `Store`
вместо константы — читается реактивно и **fork-корректно** (каждый scope видит своё значение):

```ts
const $retries = createStore(0);
createQuery({ effect: fx, retry: { times: $retries, delay: exponentialDelay(200) } });
```

## connectQuery

```ts
connectQuery({ source, fn, target, filter? });           // один источник
connectQuery({ source: { a, b }, fn, target, filter? }); // несколько (ждёт done всех)
```

`fn` получает `{ result, params }` по каждому источнику и возвращает `{ params }` для цели.
