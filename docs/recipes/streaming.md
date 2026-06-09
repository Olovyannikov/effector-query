# Streaming (SSE & WebSocket)

A query owns the **snapshot**; a stream keeps a live **view store** fresh. Load the initial
data with a query, then fold stream events into a plain store seeded from the query's public
`finished.done`. One raw stream message is fanned out into typed events with
[patronum's `splitMap`](https://patronum.effector.dev/operators/split-map/) — no query
internals, no refetch.

::: tip Why a separate store?
The query stays the single owner of fetching; the view store owns the _merged_ live state.
This avoids reaching into private seams and keeps the stream logic plain effector you can test
and compose.
:::

## Server-Sent Events

```ts
import { createEffect, createEvent, createStore, sample } from 'effector';
import { splitMap } from 'patronum';
import { createQuery } from 'effector-refetch';

const noticesQuery = createQuery({ effect: fetchNoticesFx });

// raw SSE message -> typed events
const messageReceived = createEvent<Message>();
const { created, deleted } = splitMap({
  source: messageReceived,
  cases: {
    created: (m) => (m.event === 'created' ? m.notice : undefined),
    deleted: (m) => (m.event === 'deleted' ? m.id : undefined),
  },
});

// view store: seeded from the query, then patched by the stream
const $notices = createStore<Notice[]>([])
  .on(created, (list, notice) => [notice, ...list])
  .on(deleted, (list, id) => list.filter((n) => n.id !== id));

sample({ clock: noticesQuery.finished.done, fn: ({ result }) => result, target: $notices });

const openStreamFx = createEffect((url: string) => {
  const source = new EventSource(url);
  source.addEventListener('message', (e) => messageReceived(JSON.parse(e.data)));
  return source; // source.close() to stop
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
// open a WebSocket, forward messages to messageReceived, track a $connected store…
```

Because the query is plain effector, the socket/SSE lifecycle is just effects and events —
compose reconnect, backoff, or other [patronum](https://patronum.effector.dev/) operators freely.

Runnable: [`examples/sse.ts`](https://github.com/Olovyannikov/effector-query/blob/main/examples/sse.ts),
[`examples/websocket.ts`](https://github.com/Olovyannikov/effector-query/blob/main/examples/websocket.ts).
