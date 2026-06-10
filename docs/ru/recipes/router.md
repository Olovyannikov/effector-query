# Роутер и loaders

С data-роутером (React Router 6.4+, TanStack Router, …) можно грузить данные в **loader** маршрута,
и страница рендерится уже с данными — без мигания загрузки внутри компонента. effector-refetch
подходит, потому что query — обычный effector: loader гонит его через ваш scope, а компонент читает
через `useUnit`.

## Loader в React Router

```tsx
import { allSettled, fork } from 'effector';
import { useUnit } from 'effector-react';
import { createBrowserRouter } from 'react-router-dom';

const userQuery = createQuery({ effect: fetchUserFx, cache: { staleAfter: 30_000 } });
const scope = fork(); // тот же scope, под которым рендерите <Provider value={scope}>

const router = createBrowserRouter([
  {
    path: '/users/:id',
    // запускаем запрос и ждём до рендера маршрута
    loader: async ({ params }) => {
      await allSettled(userQuery.start, { scope, params: Number(params.id) });
      return null; // данные в userQuery.$data, а не в результате loader-а
    },
    Component: () => {
      const { data, pending, error } = useUnit(userQuery);
      if (error) return <p>Ошибка</p>;
      return <h1>{pending ? 'Загрузка…' : data?.name}</h1>; // pending только при cache miss
    },
  },
]);
```

- **`cache`** делает повторные заходы мгновенными — loader резолвится из кэша без сети.
- **SSR**: создайте свежий `scope` на каждый запрос, прогоните loader-ы, затем `serialize(scope)` →
  `fork({ values })` на клиенте (см. [SSR и тесты](/ru/recipes/ssr-and-testing)).
- **Без scope** (обычный SPA): в loader-е `userQuery.start(id)` и один раз `await` события
  `finished.finally` вместо `allSettled`.

Та же схема работает с `loader` у TanStack Router и любым фреймворком, который грузит данные до рендера.

Рабочий пример: [`examples/react-router.tsx`](https://github.com/Olovyannikov/effector-refetch/blob/main/examples/react-router.tsx).

## atomic-router

Для нативного роутера effector склейка — `attachToRoute`: стартует запрос, когда маршрут
**открывается** (с его параметрами), и сбрасывает, когда **закрывается** — без эффекта в компоненте.

```ts
import { createRoute } from 'atomic-router';
import { attachToRoute } from 'effector-refetch';

const userRoute = createRoute<{ id: string }>();

attachToRoute({
  route: userRoute,
  query: userQuery,
  mapParams: ({ params }) => Number(params.id), // параметры маршрута → параметры запроса
  // resetOnClose: true (по умолчанию)
});
```

Структурно (atomic-router не импортируется — подойдёт любой объект с `opened`/`closed`) и на
чистом `sample`, поэтому scope-корректно для SSR. `mapParams` опционален, если параметры маршрута
уже совпадают с параметрами запроса. Рабочий пример:
[`examples/atomic-router.ts`](https://github.com/Olovyannikov/effector-refetch/blob/main/examples/atomic-router.ts).
