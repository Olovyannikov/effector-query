/**
 * WebSocket: load an initial snapshot with a query, then keep a live *view*
 * store fresh from the socket.
 *
 * The socket emits one raw "message" event; patronum's `splitMap` fans it out
 * into typed events (`snapshot` / `tick`) by the message's discriminator, and a
 * plain store folds them in. The query owns fetching — no internal seams.
 *
 * (Browser/Node-with-WebSocket example; illustrative endpoints.)
 */
import { createEffect, createEvent, createStore, sample } from 'effector';
import { splitMap } from 'patronum';
import { createQuery } from '../src';

type Prices = Record<string, number>;
interface Tick {
  symbol: string;
  value: number;
}

// 1) initial snapshot via a normal query
const fetchPricesFx = createEffect((): Promise<Prices> => fetch('/api/prices').then((r) => r.json()));
export const pricesQuery = createQuery({ effect: fetchPricesFx });

// 2) one raw socket message event + connection status
const messageReceived = createEvent<{ type: string; payload: unknown }>();
const connectionChanged = createEvent<boolean>();
export const $connected = createStore(false).on(connectionChanged, (_was, next) => next);

// ...fanned out into typed events by `type` (patronum splitMap)
const { snapshot, tick } = splitMap({
  source: messageReceived,
  cases: {
    snapshot: (m) => (m.type === 'snapshot' ? (m.payload as Prices) : undefined),
    tick: (m) => (m.type === 'tick' ? (m.payload as Tick) : undefined),
  },
});

// 3) a plain view store: seeded from the query's public result, then patched by
//    the stream. Reads only the public surface — no `query.__`.
export const $prices = createStore<Prices>({})
  .on(snapshot, (_prices, snap) => snap)
  .on(tick, (prices, t) => ({ ...prices, [t.symbol]: t.value }));

sample({ clock: pricesQuery.finished.done, fn: ({ result }) => result, target: $prices });

// 4) the socket lifecycle is just effects/events
export const openPricesSocketFx = createEffect((url: string) => {
  const ws = new WebSocket(url);
  ws.addEventListener('open', () => connectionChanged(true));
  ws.addEventListener('close', () => connectionChanged(false));
  ws.addEventListener('message', (event) => messageReceived(JSON.parse(event.data)));
  return ws; // keep the handle: ws.close()
});

// usage:
//   pricesQuery.start();
//   openPricesSocketFx('wss://example.com/prices');
