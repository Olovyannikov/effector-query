# Стриминг (SSE и WebSocket)

Запрос владеет **снапшотом**, а поток поддерживает свежим живой **view-store**. Загрузите
начальные данные запросом, затем сворачивайте события потока в обычный стор, засеянный из
публичного `finished.done` запроса. Одно «сырое» сообщение потока раскладывается на
типизированные события через [`splitMap` из patronum](https://patronum.effector.dev/operators/split-map/) —
без внутренних швов запроса и без рефетча.

::: tip Зачем отдельный стор?
Запрос остаётся единственным владельцем загрузки; view-store владеет _смёрженным_ живым
состоянием. Так мы не лезем в приватные швы, а логика потока — обычный effector, который
легко тестировать и композировать.
:::

## Server-Sent Events

```ts
import { createEffect, createEvent, createStore, sample } from 'effector';
import { splitMap } from 'patronum';
import { createQuery } from 'effector-refetch';

const noticesQuery = createQuery({ effect: fetchNoticesFx });

// сырое SSE-сообщение -> типизированные события
const messageReceived = createEvent<Message>();
const { created, deleted } = splitMap({
  source: messageReceived,
  cases: {
    created: (m) => (m.event === 'created' ? m.notice : undefined),
    deleted: (m) => (m.event === 'deleted' ? m.id : undefined),
  },
});

// view-store: засеян из запроса, затем патчится потоком
const $notices = createStore<Notice[]>([])
  .on(created, (list, notice) => [notice, ...list])
  .on(deleted, (list, id) => list.filter((n) => n.id !== id));

sample({ clock: noticesQuery.finished.done, fn: ({ result }) => result, target: $notices });

const openStreamFx = createEffect((url: string) => {
  const source = new EventSource(url);
  source.addEventListener('message', (e) => messageReceived(JSON.parse(e.data)));
  return source; // source.close() чтобы остановить
});

noticesQuery.start();
openStreamFx('/api/notices/stream');
```

## WebSocket

```ts
const pricesQuery = createQuery({ effect: fetchPricesFx });

const messageReceived = createEvent<{ type: string; payload: unknown }>();
const { snapshot, tick } = splitMap({
  source: messageReceived,
  cases: {
    snapshot: (m) => (m.type === 'snapshot' ? (m.payload as Prices) : undefined),
    tick: (m) => (m.type === 'tick' ? (m.payload as Tick) : undefined),
  },
});

const $prices = createStore<Prices>({})
  .on(snapshot, (_prices, snap) => snap)
  .on(tick, (prices, t) => ({ ...prices, [t.symbol]: t.value }));

sample({ clock: pricesQuery.finished.done, fn: ({ result }) => result, target: $prices });
// открываем WebSocket, форвардим сообщения в messageReceived, держим стор $connected…
```

Поскольку запрос — обычный effector, жизненный цикл сокета/SSE — это просто эффекты и
события: свободно собирайте reconnect, backoff или другие операторы
[patronum](https://patronum.effector.dev/).

Рабочие примеры: [`examples/sse.ts`](https://github.com/Olovyannikov/effector-query/blob/main/examples/sse.ts),
[`examples/websocket.ts`](https://github.com/Olovyannikov/effector-query/blob/main/examples/websocket.ts).
