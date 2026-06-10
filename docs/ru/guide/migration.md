# Миграция

## Кодмод (автоматически)

Кодмод берёт на себя механическую часть — переписывает импорты и сворачивает standalone-операторы
в inline-конфиг `createQuery`:

```bash
npx effector-refetch-codemod "src/**/*.{ts,tsx}"
npx effector-refetch-codemod "src/**/*.ts" --dry   # только предпросмотр
```

Он переписывает `@farfetched/core` → `effector-refetch`, превращает `retry(q, …)` / `cache(q, …)` /
`concurrency(q, { strategy })` в `createQuery({ retry, cache, concurrency })` и убирает ставшие
ненужными импорты операторов. Операторы на запросе, который нельзя разрешить статически, остаются
как есть — просмотрите дифф и прогоните форматтер. Остальное покрывает ручная таблица ниже.

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

Чего пока нет (в сравнении с farfetched): полная sourced-поверхность на каждом поле,
`createJsonMutation` и ещё несколько адаптеров валидации. См.
[roadmap](https://github.com/Olovyannikov/effector-refetch/blob/main/ROADMAP.md).

## Внутри 0.x

До 1.0 API ещё может меняться между минорными версиями; ломающие изменения отмечаются в
changelog. Из заметного:

- Адаптеры web-storage теперь принимают **объект опций**: `localStorageCache({ version, maxAge })` (раньше — строку-префикс).
