/**
 * WebSocket: load an initial snapshot with a query, then merge live ticks from
 * a socket into the query's data via the `__.setData` seam. Also tracks a
 * `$connected` store.
 *
 * (Browser/Node-with-WebSocket example; illustrative endpoints.)
 */
import { createEffect, createEvent, createStore, sample } from 'effector';
import { createQuery } from '../src';

interface Tick {
  symbol: string;
  value: number;
}

// 1) initial snapshot
const fetchPricesFx = createEffect(
  (): Promise<Record<string, number>> => fetch('/api/prices').then((r) => r.json()),
);
export const pricesQuery = createQuery({ effect: fetchPricesFx });

// 2) socket -> events
const priceTick = createEvent<Tick>();
const connectionChanged = createEvent<boolean>();
export const $connected = createStore(false).on(connectionChanged, (_was, next) => next);

export const openPricesSocketFx = createEffect((url: string) => {
  const ws = new WebSocket(url);
  ws.addEventListener('open', () => connectionChanged(true));
  ws.addEventListener('close', () => connectionChanged(false));
  ws.addEventListener('message', (event) => priceTick(JSON.parse(event.data) as Tick));
  return ws; // keep the handle: ws.close()
});

// 3) merge each tick into the prices map (scope-correct, no refetch)
sample({
  clock: priceTick,
  source: pricesQuery.$data,
  fn: (current, tick) => ({ ...(current ?? {}), [tick.symbol]: tick.value }),
  target: pricesQuery.__.setData,
});

// usage:
//   pricesQuery.start();
//   openPricesSocketFx('wss://example.com/prices');
