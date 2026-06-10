---
layout: home

hero:
  name: effector-refetch
  text: Данные, которые текут
  tagline: Запросы, мутации, кэш и пагинация для effector — поверх ваших реальных эффектов, а не «чёрного ящика». Дружелюбные дефолты, честные компромиссы, готовность к SSR через fork.
  actions:
    - theme: brand
      text: Быстрый старт
      link: /ru/guide/getting-started
    - theme: alt
      text: Зачем это нужно?
      link: /ru/guide/introduction
    - theme: alt
      text: GitHub
      link: https://github.com/Olovyannikov/effector-refetch

features:
  - icon: ⚡
    title: На реальных эффектах
    details: Единица работы — ваш собственный Effect. Он виден в devtools, композируется через attach, дружит с fork. Query — тонкая реактивная обёртка, а не чёрный ящик.
  - icon: 🎛️
    title: Дружелюбно, без магии
    details: retry, cache и concurrency — это опции в одну строку с разумными дефолтами. А те же возможности доступны как отдельные композируемые операторы.
  - icon: 🛑
    title: Реальная отмена
    details: Эффекты из createRequestFx умеют abort — cancel, reset и TAKE_LATEST по-настоящему прерывают запрос, а не просто игнорируют результат.
  - icon: 🧱
    title: Всё в комплекте
    details: Мутации, инвалидация, оптимистичные апдейты, контракты валидации, createJsonQuery, пагинация, SWR, сборка мусора в кэше и дедупликация.
  - icon: 🧩
    title: React, Vue и Solid
    details: useUnit(query) работает напрямую через @@unitShape — плюс тонкие хелперы useQuery для всех трёх и useSuspenseQuery для React.
  - icon: 🔍
    title: Наблюдаемость
    details: Поток событий жизненного цикла и attachQueryLogger делают каждый прогон видимым для devtools и логирования.
---

## Установка

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

Биндинги фреймворков — опциональные peer-зависимости; ставьте нужные: `effector-react` + `react`,
`effector-vue` + `vue` или `effector-solid` + `solid-js`. Полный разбор — в
[Быстром старте](/ru/guide/getting-started).

## За 30 секунд

```ts
import { createEffect } from 'effector';
import { createQuery, createMutation, invalidate } from 'effector-refetch';

const fetchTodosFx = createEffect(() => fetch('/api/todos').then((r) => r.json()));
const addTodoFx = createEffect((text: string) =>
  fetch('/api/todos', { method: 'POST', body: JSON.stringify({ text }) }).then((r) => r.json()),
);

export const todos = createQuery({ effect: fetchTodosFx, cache: true, retry: 2 });
export const addTodo = createMutation({ effect: addTodoFx });

// после добавления задачи список обновится
invalidate({ on: addTodo, refetch: todos });

todos.start();
addTodo.mutate('Купить молоко'); // → todos автоматически перезапросится
```

В компоненте читаем одним хуком:

```tsx
const { data, pending } = useUnit(todos); // React / Vue / Solid
```

## Почему не «просто эффекты»?

Можно — и вы их по-прежнему используете. effector-refetch не заменяет эффекты, а берёт на
себя скучную и хрупкую обвязку: статусы загрузки/ошибки, ретраи, кэш, отмену запросов,
дедупликацию, валидацию. Ваш эффект остаётся полноценным юнитом effector, который видно в
devtools и который тестируется через `fork()`.

Если вы хоть раз руками разбирались с «грузится ли, упало ли, не устарел ли ответ, не
кликнул ли пользователь дважды, какой запрос выиграл гонку» — именно это библиотека берёт
на себя, декларативно.

## Когда подходит, а когда нет

**Берите**, если у вас реальная асинхронность с гонками, нужен кэш или много эндпоинтов, и
хочется тестировать логику без рендера.

**Пропустите** для крошечного приложения с парой `useState` или для одноразового прототипа —
там честнее обычные эффекты (или даже `fetch`). Лучше недо-использовать, чем тащить по
инерции. См. [честное сравнение с farfetched](/ru/guide/vs-farfetched).

<div style="margin-top: 2rem; opacity: .7">

Pre-1.0, в активной разработке · MIT · [Roadmap](https://github.com/Olovyannikov/effector-refetch/blob/main/ROADMAP.md)

</div>
