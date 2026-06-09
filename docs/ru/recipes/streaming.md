# Стриминг (SSE и WebSocket)

Запрос держит снапшот, а поток поддерживает его свежим. Загрузите начальные данные
запросом, затем **патчите его `$data` из потока** через шов `query.__.setData` —
scope-корректно, без рефетча.

## Server-Sent Events

```ts
import { createEffect, createEvent, sample } from 'effector';
import { createQuery } from 'effector-refetch';

const noticesQuery = createQuery({ effect: fetchNoticesFx });

const noticeReceived = createEvent<Notice>();
const openStreamFx = createEffect((url: string) => {
  const source = new EventSource(url);
  source.addEventListener('message', (e) => noticeReceived(JSON.parse(e.data)));
  return source; // source.close() чтобы остановить
});

// добавляем каждое событие потока в начало списка запроса
sample({
  clock: noticeReceived,
  source: noticesQuery.$data,
  fn: (current, notice) => [notice, ...(current ?? [])],
  target: noticesQuery.__.setData,
});

noticesQuery.start();
openStreamFx('/api/notices/stream');
```

## WebSocket

```ts
const pricesQuery = createQuery({ effect: fetchPricesFx });
const priceTick = createEvent<Tick>();

sample({
  clock: priceTick,
  source: pricesQuery.$data,
  fn: (current, tick) => ({ ...(current ?? {}), [tick.symbol]: tick.value }),
  target: pricesQuery.__.setData,
});
// открываем WebSocket, форвардим сообщения в priceTick, держим стор $connected…
```

Поскольку запрос — обычный effector, жизненный цикл сокета/SSE — это просто эффекты и
события: свободно собирайте reconnect, backoff или операторы [patronum](https://patronum.effector.dev/).

Рабочие примеры: [`examples/sse.ts`](https://github.com/Olovyannikov/effector-query/blob/main/examples/sse.ts),
[`examples/websocket.ts`](https://github.com/Olovyannikov/effector-query/blob/main/examples/websocket.ts).
