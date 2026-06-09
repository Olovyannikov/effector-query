# Сравнение с farfetched

[farfetched](https://ff.effector.dev) — самый полный инструмент получения данных для
effector и очевидная точка отсчёта. Он **с открытым исходным кодом и не заархивирован** — но
темп замедлился: всё ещё pre-1.0, изначальная цель «1.0 к концу 2024» сдвинута, бэклог
issues растёт. `effector-refetch` существует, чтобы быть **поддерживаемым, effect-first**
вариантом с меньшей и более дружелюбной поверхностью — а не чтобы заявлять, что farfetched
мёртв.

|                             | farfetched                                          | effector-refetch                                                                      |
| --------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------- |
| единица работы              | внутренний event-based исполнитель                  | ваш реальный `Effect` — first-class                                                   |
| основной вход               | `handler` (оборачивается); `effect` — один из путей | `effect` — основной вход; `handler` — сахар                                           |
| retry / cache / concurrency | отдельные операторы                                 | inline-опции **и** отдельные операторы                                                |
| sourced-конфиг              | sourced-поля                                        | реактивный `Store` для `enabled` / `concurrency` / `retry.times` / `cache.staleAfter` |
| валидация                   | `contract`, `validate`                              | `contract` (zod / Standard Schema) + `validate`                                       |
| декларативный HTTP          | `createJsonQuery`                                   | `createJsonQuery` (глобальный `fetch`, без зависимостей)                              |
| пагинация                   | —                                                   | `createInfiniteQuery`                                                                 |
| отмена                      | abort + discard                                     | реальный `AbortSignal` через `createRequestFx`                                        |
| биндинги                    | react / solid / vue                                 | `useUnit(query)` (react + vue) + хелперы `useQuery`                                   |

**Честный компромисс.** В некоторых местах farfetched всё ещё богаче (sourced везде,
экосистема JSON-контрактов, зрелость). `effector-refetch` проще, ближе к голому effector
(«у меня уже есть эффект, оберни его») и нацелен дойти до стабильной 1.0. Нужна вся
поверхность farfetched сегодня — берите его; хотите effect-first API на поддерживаемом
проекте — берите это.
