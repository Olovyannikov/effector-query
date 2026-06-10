# Сравнение с farfetched

[farfetched](https://ff.effector.dev) — самый полный инструмент для запросов в effector и
очевидная точка отсчёта. Он зрелый, хорошо спроектирован и **open-source / не заархивирован**.
Это честное сравнение — включая то, **где farfetched всё ещё впереди**, — чтобы вы выбрали
подходящий инструмент, а не повелись на рекламу.

Разница в одну строку: farfetched моделирует запрос как **собственную event-абстракцию**
(`RemoteOperation` из `handler`); effector-refetch оборачивает **ваш реальный `Effect`** и даёт
дружелюбный inline-конфиг. Разная философия, много пересечений.

## Где farfetched всё ещё впереди

Учтите это перед переходом:

- **Зрелость.** Годы в проде, больше сообщество, больше накопленных рецептов и фиксов краевых
  случаев. effector-refetch пока молодой (0.x).
- **Sourced-параметры везде.** В farfetched почти любое поле (url, headers, body, params) может
  быть `Store`/source. effector-refetch делает sourced только выборочный набор — `enabled`,
  `concurrency`, `retry.times`, `cache.staleAfter`, `refetchInterval`, — а остальное ожидает из
  параметров эффекта (обычно через `sample`).
- **Экосистема валидации.** Отдельные адаптеры контрактов: `@farfetched/{runtypes,io-ts,superstruct,
typed-contracts,zod}`. effector-refetch даёт `zodContract`, `standardSchemaContract` (покрывает
  любую Standard-Schema библиотеку) и `createContract` — достаточно для большинства, но готовых
  адаптеров меньше.
- **Декларативный HTTP для записей.** У farfetched есть `createJsonMutation`; у effector-refetch
  только `createJsonQuery` (для мутаций приносите свой эффект через `createRequestFx`).
- **Больше операторов.** `timeout`, `keepFresh` (рефетч при изменении источников) и отдельный
  оператор `applyBarrier` пока не имеют прямого аналога в effector-refetch.
- **Официальные интеграции.** `@farfetched/atomic-router` (роутер) и `@farfetched/dev-tools`, плюс
  более богатый Fetch-хелпер и более глубокий сайт доки.

## Чем effector-refetch отличается (и часто удобнее)

- **Effect-first.** Единица работы — ваш реальный `Effect` (в т.ч. `attach`-фабрики): виден в
  devtools, композируется, тестируется отдельно. `query.__.effect` — ровно то, что вы передали.
- **Дружелюбный конфиг.** `retry` / `cache` / `concurrency` — inline-опции `createQuery` **и**
  standalone-операторы (сахар над тем же движком).
- **Реальная отмена.** `createRequestFx` даёт `AbortSignal`; `TAKE_LATEST`/`cancel` реально
  прерывают запрос в полёте, а не просто отбрасывают результат.
- **Пагинация из коробки.** `createInfiniteQuery` (двунаправленные `fetchNext`/`fetchPrevious`,
  окно страниц) — у farfetched встроенного аналога нет.
- **Офлайн из коробки.** У обеих библиотек есть мьютекс `createBarrier` (например 401 → обновить
  токен → повторить); effector-refetch добавляет готовый `createNetworkBarrier`, который ставит
  запросы на паузу, пока браузер офлайн.
- **Тулинг.** Визуальные devtools-панели для **React, Vue и Solid**, поток интроспекции,
  `llms.txt` и скилл для Claude Code.
- **Биндинги и Suspense.** `useUnit(query)` плюс хелперы `useQuery` для React / Vue / Solid и
  `useSuspenseQuery` для React Suspense.
- **Маленькое ядро без зависимостей** (~7 КБ) в активной разработке к 1.0.

## Бок о бок

|                       | farfetched                                | effector-refetch                                                 |
| --------------------- | ----------------------------------------- | ---------------------------------------------------------------- |
| единица работы        | внутренний event-исполнитель              | ваш реальный `Effect` — first-class                              |
| стиль API             | операторы                                 | inline-опции **и** операторы                                     |
| sourced-конфиг        | sourced **всё**                           | выборочно (`enabled`/`concurrency`/`retry`/`staleAfter`/поллинг) |
| валидация             | runtypes / io-ts / zod / contracts        | zod / Standard Schema / `createContract`                         |
| декларативный HTTP    | `createJsonQuery` + `createJsonMutation`  | `createJsonQuery` (+ свой эффект)                                |
| пагинация             | —                                         | `createInfiniteQuery` (двунаправленная)                          |
| отмена                | abort + discard                           | реальный `AbortSignal` через `createRequestFx`                   |
| barrier / мьютекс     | `createBarrier` + оператор `applyBarrier` | `createBarrier` (опция `barrier`, `perform`)                     |
| офлайн-режим          | собирается на барьере                     | встроенный `createNetworkBarrier`                                |
| devtools              | `@farfetched/dev-tools`                   | визуальные панели (React/Vue/Solid) + поток интроспекции         |
| биндинги              | `@farfetched/solid` + `useUnit`           | react / vue / solid + `useQuery` + `useSuspenseQuery`            |
| SSR                   | `fork` / `allSettled`                     | `fork` / `allSettled`                                            |
| зрелость / экосистема | **больше, проверена в бою**               | молодой, активно развивается                                     |

## Что выбрать?

- **Берите farfetched**, если нужен самый зрелый вариант сегодня, вы активно полагаетесь на
  sourced-everything или нужны его адаптеры валидации / декларативные мутации.
- **Берите effector-refetch**, если предпочитаете оборачивать свои эффекты, хотите inline-конфиг,
  реальную отмену, встроенную пагинацию, примитивы barrier/offline, кросс-фреймворковые devtools
  или маленькое ядро на активно поддерживаемом проекте.

Уже на farfetched и интересно? [Гайд по миграции](/ru/guide/migration) и инструмент
`npx effector-refetch-codemod` берут на себя большую часть механических изменений.
