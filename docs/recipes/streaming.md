# Streaming (SSE & WebSocket)

A query owns a snapshot; a stream keeps it fresh. Load the initial data with a query, then
**patch its `$data` from the stream** via the `query.__.setData` seam — scope-correct, no
refetch.

## Server-Sent Events

```ts
import { createEffect, createEvent, sample } from 'effector';
import { createQuery } from 'effector-refetch';

const noticesQuery = createQuery({ effect: fetchNoticesFx });

const noticeReceived = createEvent<Notice>();
const openStreamFx = createEffect((url: string) => {
  const source = new EventSource(url);
  source.addEventListener('message', (e) => noticeReceived(JSON.parse(e.data)));
  return source; // source.close() to stop
});

// prepend each streamed notice to the query's list
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
// open a WebSocket, forward messages to priceTick, track a $connected store…
```

Because the query is plain effector, the socket/SSE lifecycle is just effects and events —
compose reconnect, backoff, or [patronum](https://patronum.effector.dev/) operators freely.

Runnable: [`examples/sse.ts`](https://github.com/Olovyannikov/effector-query/blob/main/examples/sse.ts),
[`examples/websocket.ts`](https://github.com/Olovyannikov/effector-query/blob/main/examples/websocket.ts).
