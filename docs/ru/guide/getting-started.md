# Быстрый старт

Эта страница проведёт от нуля до рабочего запроса за пару минут. Про _зачем_ — сначала
прочитайте [Введение](/ru/guide/introduction).

`effector-refetch` — небольшой дружелюбный слой запросов для [effector](https://effector.dev),
построенный на **реальных эффектах**. Единица работы — ваш `Effect<Params, Result, Error>`
(в том числе собранный через `attach`); query — лишь тонкая реактивная обёртка.

::: tip Что нужно знать заранее
Пригодится базовое понимание effector (`createEffect`, сторы, `sample`). Если вы новичок —
полистайте [документацию effector](https://effector.dev): здесь всё это просто обычные
юниты effector, собранные за вас.
:::

## Установка

Пакет опубликован в npm как **`effector-refetch`** (`effector` — peer-зависимость):

::: code-group

```bash [pnpm]
pnpm add effector-refetch effector
```

```bash [npm]
npm install effector-refetch effector
```

```bash [yarn]
yarn add effector-refetch effector
```

:::

Биндинги фреймворков — опциональные subpath-импорты; ставьте нужные peer-зависимости:

::: code-group

```bash [React]
pnpm add effector-react react   # включает effector-refetch/react + /devtools
```

```bash [Vue]
pnpm add effector-vue vue        # включает effector-refetch/vue
```

:::

## Первый запрос

```ts
import { createEffect } from 'effector';
import { createQuery } from 'effector-refetch';

const fetchUserFx = createEffect((id: number) => fetch(`/api/users/${id}`).then((r) => r.json()));

const userQuery = createQuery({
  effect: fetchUserFx,
  retry: 2,
  cache: true,
  concurrency: 'TAKE_LATEST',
});

userQuery.start(1);
// userQuery.$data / $error / $status / $pending обновляются реактивно
```

## Связывание запросов

```ts
import { connectQuery } from 'effector-refetch';

connectQuery({
  source: characterQuery,
  fn: ({ result: character }) => ({ params: { url: character.origin.url } }),
  target: originQuery,
});
```

Когда `characterQuery` завершится, `originQuery` автоматически стартует с выведенными параметрами.

## Дальше

- [Основные идеи](/ru/guide/concepts) — модель «эффект прежде всего» и жизненный цикл.
- [API запросов](/ru/api/queries) — все опции.
- [Сравнение с farfetched](/ru/guide/vs-farfetched) — как это соотносится.
