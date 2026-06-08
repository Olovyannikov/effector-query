# Быстрый старт

Эта страница проведёт от нуля до рабочего запроса за пару минут. Про *зачем* — сначала
прочитайте [Введение](/ru/guide/introduction).

`effector-query` — небольшой дружелюбный слой запросов для [effector](https://effector.dev),
построенный на **реальных эффектах**. Единица работы — ваш `Effect<Params, Result, Error>`
(в том числе собранный через `attach`); query — лишь тонкая реактивная обёртка.

::: tip Что нужно знать заранее
Пригодится базовое понимание effector (`createEffect`, сторы, `sample`). Если вы новичок —
полистайте [документацию effector](https://effector.dev): здесь всё это просто обычные
юниты effector, собранные за вас.
:::

## Установка

```bash
pnpm add effector-query effector
```

Биндинги фреймворков — опциональные subpath-импорты:

```bash
pnpm add effector-react react       # для effector-query/react
pnpm add effector-vue vue           # для effector-query/vue
```

## Первый запрос

```ts
import { createEffect } from 'effector';
import { createQuery } from 'effector-query';

const fetchUserFx = createEffect((id: number) =>
  fetch(`/api/users/${id}`).then((r) => r.json()),
);

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
import { connectQuery } from 'effector-query';

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
