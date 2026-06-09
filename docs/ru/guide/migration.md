# Миграция

## С farfetched

Модель близка, поэтому большая часть кода переносится напрямую. Главный сдвиг: **приносите
свой эффект**, а inline-опции доступны наравне с операторами.

| farfetched                             | effector-refetch                                                      |
| -------------------------------------- | --------------------------------------------------------------------- |
| `createQuery({ handler })`             | `createQuery({ effect })` (или `{ handler }`)                         |
| `createJsonQuery({ ... })`             | `createJsonQuery({ request, response })`                              |
| `retry(query, { times, delay })`       | `retry(query, …)` **или** inline `createQuery({ retry })`             |
| `cache(query, { ... })`                | `cache(query, …)` **или** inline `createQuery({ cache })`             |
| `concurrency(query, { strategy })`     | `concurrency(query, …)` **или** inline `createQuery({ concurrency })` |
| `connectQuery({ source, fn, target })` | идентично                                                             |
| `createMutation`                       | `createMutation` (+ алиас `mutate`)                                   |
| контракты                              | `zodContract` / `standardSchemaContract` / `createContract`           |
| `$data / $error / $status / $pending`  | те же имена                                                           |

Заметные отличия:

- Query оборачивает **реальный эффект** (`query.__.effect`), видимый в devtools.
- Отмена реальная для эффектов из `createRequestFx` (AbortSignal), а не только discard.
- Sourced-конфиг доступен inline (`Store` для `concurrency` / `retry.times` / `cache.staleAfter` / `enabled`).
- `useUnit(query)` работает напрямую в React и Vue через `@@unitShape`.

Чего пока нет (в сравнении с farfetched): биндинг Solid, полная sourced-поверхность на
каждом поле и часть удобств JSON-контрактов. См.
[roadmap](https://github.com/Olovyannikov/effector-query/blob/main/ROADMAP.md).

## Внутри 0.x

До 1.0 API ещё может меняться между минорными версиями; ломающие изменения отмечаются в
changelog. Из заметного:

- Адаптеры web-storage теперь принимают **объект опций**: `localStorageCache({ version, maxAge })` (раньше — строку-префикс).
