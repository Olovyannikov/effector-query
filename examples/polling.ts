/**
 * Polling + a shared factory that makes *every* query poll by default.
 *
 * Run: npx tsx examples/polling.ts   (Ctrl+C to stop)
 */
import { allSettled, createEffect, fork } from 'effector';
import { attachQueryLogger, createQueryFactory } from '../src';

// One factory, shared defaults: every query polls every 3s and retries twice.
const { createQuery } = createQueryFactory({ refetchInterval: 3000, retry: 2 });

const countFx = createEffect(async () => {
  const res = await fetch('https://rickandmortyapi.com/api/character');
  const json = (await res.json()) as { info: { count: number } };
  return json.info.count;
});

const charactersCount = createQuery({ effect: countFx, name: 'count' });

// log each lifecycle event so you can watch the polling
attachQueryLogger(charactersCount, {
  name: 'count',
  handler: (e) => console.log(`[${e.type}]`, e.params ?? '', e.durationMs != null ? `${e.durationMs}ms` : ''),
});

const scope = fork();
// a polling query never "settles", so we don't await it
void allSettled(charactersCount.start, { scope });

console.log('polling every 3s — Ctrl+C to stop');
