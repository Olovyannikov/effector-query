/**
 * Server-Sent Events: load initial data with a query, then patch it live from
 * an SSE stream — no refetch. The stream feeds the query's `__.setData` seam,
 * so updates stay scope-correct.
 *
 * (Browser/Node-with-EventSource example; illustrative endpoints.)
 */
import { createEffect, createEvent, sample } from 'effector';
import { createQuery } from '../src';

interface Notice {
  id: number;
  text: string;
}

// 1) initial list via a normal query
const fetchNoticesFx = createEffect((): Promise<Notice[]> => fetch('/api/notices').then((r) => r.json()));
export const noticesQuery = createQuery({ effect: fetchNoticesFx });

// 2) SSE stream -> an effector event
const noticeReceived = createEvent<Notice>();

export const openNoticesStreamFx = createEffect((url: string) => {
  const source = new EventSource(url);
  source.addEventListener('message', (event) => {
    noticeReceived(JSON.parse(event.data) as Notice);
  });
  return source; // keep the handle to close it later: source.close()
});

// 3) each streamed notice is prepended to the query's data (scope-correct)
sample({
  clock: noticeReceived,
  source: noticesQuery.$data,
  fn: (current, notice) => [notice, ...(current ?? [])],
  target: noticesQuery.__.setData,
});

// usage (in a model / component):
//   noticesQuery.start();
//   openNoticesStreamFx('/api/notices/stream');
