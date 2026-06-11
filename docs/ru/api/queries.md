# Запросы

```ts
import { createQuery } from 'effector-refetch';

const query = createQuery({
  effect, // Effect<Params, Result, Error> (или `handler`)
  initialData,
  enabled, // Store<boolean>
  mapData,
  mapError,
  contract,
  validate, // см. «HTTP и валидация»
  retry, // number | { times, delay?, filter?, suppressIntermediateErrors? }
  cache, // true | { adapter?, staleAfter?, key?, purge?, swr?, dedupe? }
  concurrency, // 'TAKE_LATEST' (по умолчанию) | 'TAKE_FIRST' | 'TAKE_EVERY'
  name, // метка для devtools
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
- **`refetchInterval`** — поллинг каждые N мс (`number` или `Store<number>`, 0 = выкл). См. [Авто-рефетч и поллинг](/ru/recipes/auto-refetch).
- **`timeout`** — дедлайн одной попытки в мс (`number` или `Store<number>`, 0 = выкл): если прогон превысил его, запрос в полёте прерывается и прогон **падает** (ретраится, композируется с `retry`). Не путать с `refetchInterval` (как _часто_ поллить) — `timeout` это _сколько_ может длиться одна попытка.
- **`structuralSharing`** — сохранять ссылочную идентичность неизменённых частей результата (меньше ре-рендеров).
- **`placeholderData`** — значение или `(prev) => …`, показываемое, пока нет реальных данных; `$isPlaceholderData` равно `true` до первого реального результата. В отличие от `initialData`, не считается закэшированным.
- **`mapData` / `mapError`** — нормализация результата / ошибки перед сторами.

`query.prefetch(params)` прогревает кэш под `params` **без** изменения `$data`/`$status`
(no-op без кэша, пропускает свежие записи) — например, префетч следующей страницы по hover.

::: tip keepPreviousData по умолчанию
`$data` не очищается на новый `start` — он держит предыдущий результат, пока не придёт
новый. То есть при смене параметров старые данные остаются видимыми, пока идёт новый
запрос (TanStack-овский `keepPreviousData`), из коробки. Для явной очистки — `reset()`.
:::

Разделите это между многими запросами через [фабрику](/ru/recipes/defaults).

## События жизненного цикла

```ts
query.finished.done; //    { params, result } — запуск успешен
query.finished.fail; //    { params, error }  — запуск упал
query.finished.finally; // { params, status: 'done' | 'fail' }
query.aborted; //          { params } — cancel / reset / вытеснение TAKE_LATEST / skip
```

Для **совместимости с farfetched** `finished` также отдаёт:

```ts
query.finished.success; // алиас finished.done   (то же событие)
query.finished.failure; // алиас finished.fail   (то же событие)
query.finished.skip; //    { params } — гейт `enabled` заблокировал запуск
```

`finished.skip` срабатывает только на skip по гейту `enabled` (запрос не выполнялся). Более широкое
событие `aborted` по-прежнему срабатывает на **любой** отброшенный запуск — skip, `cancel`, `reset`
и вытеснение `TAKE_LATEST`, — оставаясь надмножеством `skip`. (В отличие от farfetched,
`finished.finally` срабатывает только на `done`/`fail`, не на skip — отслеживайте skip через
`finished.skip` / `aborted`.)

## Операторы

`concurrency` / `retry` / `cache` — это ещё и отдельные композируемые операторы; inline-опции
— сахар над ними. Применяйте напрямую, в том числе после создания:

```ts
import { createQuery, concurrency, retry, cache } from 'effector-refetch';

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
