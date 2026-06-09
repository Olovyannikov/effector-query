/**
 * Server-Sent Events: load the initial list with a query, then keep a live
 * *view* store fresh from the stream.
 *
 * One raw SSE "message" event is fanned out by patronum's `splitMap` into typed
 * events (`created` / `deleted`), and a plain store folds them in. The query
 * owns the fetch — no internal seams (`__.setData`).
 *
 * (Browser/Node-with-EventSource example; illustrative endpoints.)
 */
import { createEffect, createEvent, createStore, sample } from 'effector';
import { splitMap } from 'patronum';
import { createQuery } from '../src';

interface Notice {
  id: number;
  text: string;
}
type Message = { event: 'created'; notice: Notice } | { event: 'deleted'; id: number };

// 1) initial list via a normal query
const fetchNoticesFx = createEffect((): Promise<Notice[]> => fetch('/api/notices').then((r) => r.json()));
export const noticesQuery = createQuery({ effect: fetchNoticesFx });

// 2) raw SSE message -> typed events (patronum splitMap)
const messageReceived = createEvent<Message>();
const { created, deleted } = splitMap({
  source: messageReceived,
  cases: {
    created: (m) => (m.event === 'created' ? m.notice : undefined),
    deleted: (m) => (m.event === 'deleted' ? m.id : undefined),
  },
});

// 3) a plain view store: seeded from the query's public result, then patched by
//    the stream. No `query.__` — just the public `finished.done` + events.
export const $notices = createStore<Notice[]>([])
  .on(created, (list, notice) => [notice, ...list])
  .on(deleted, (list, id) => list.filter((n) => n.id !== id));

sample({ clock: noticesQuery.finished.done, fn: ({ result }) => result, target: $notices });

// 4) the SSE lifecycle is just a plain effect
export const openNoticesStreamFx = createEffect((url: string) => {
  const source = new EventSource(url);
  source.addEventListener('message', (event) => messageReceived(JSON.parse(event.data) as Message));
  return source; // keep the handle to close it later: source.close()
});

// usage (in a model / component):
//   noticesQuery.start();
//   openNoticesStreamFx('/api/notices/stream');
