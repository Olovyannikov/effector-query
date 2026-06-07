/**
 * Demo: the exact shape from the original request.
 *
 *   const someQuery = createQuery({ effect, retry, cache, concurrency })
 *   connectQuery({ source, fn, target })
 *
 * Run with: npx tsx examples/rick-and-morty.ts
 */
import { allSettled, attach, createEffect, fork, type Effect } from 'effector';
import { connectQuery, createQuery } from '../src';

// --- real effects: the unit of work is YOUR effect (here built with attach) ---
const baseRequestFx = createEffect(async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
});

interface Character {
  id: number;
  name: string;
  origin: { name: string; url: string };
}
interface Location {
  name: string;
  dimension: string;
}

const fetchCharacterFx = attach({
  effect: baseRequestFx,
  mapParams: (id: number) => `https://rickandmortyapi.com/api/character/${id}`,
}) as unknown as Effect<number, Character>;

const fetchLocationFx = attach({
  effect: baseRequestFx,
  mapParams: ({ url }: { url: string }) => url,
}) as unknown as Effect<{ url: string }, Location>;

// --- queries: friendly inline options ---
const characterQuery = createQuery({
  effect: fetchCharacterFx,
  retry: 3,
  cache: true,
  concurrency: 'TAKE_LATEST',
});

const originQuery = createQuery({
  effect: fetchLocationFx,
  cache: { staleAfter: 60_000 },
});

// --- wire them together: origin starts when a character resolves ---
connectQuery({
  source: characterQuery,
  fn: ({ result: character }) => ({ params: { url: character.origin.url } }),
  target: originQuery,
});

async function main() {
  const scope = fork();
  await allSettled(characterQuery.start, { scope, params: 1 });

  console.log('character:', scope.getState(characterQuery.$data)?.name);
  console.log('origin:', scope.getState(originQuery.$data));
  console.log('character status:', scope.getState(characterQuery.$status));
  console.log('origin status:', scope.getState(originQuery.$status));
}

main().catch((err) => {
  console.error('demo failed:', err);
});
