/**
 * Infinite query demo against the Rick & Morty API (page-number pagination).
 *
 * Run: npx tsx examples/infinite-query.ts
 *
 * Note: the page effect is a plain Effect<{ params, pageParam }, Page>.
 */
import { allSettled, createEffect, fork } from 'effector';
import { createInfiniteQuery } from '../src';

interface Character {
  id: number;
  name: string;
}
interface CharactersPage {
  info: { next: string | null; pages: number };
  results: Character[];
}

const fetchCharactersPageFx = createEffect(
  ({ params, pageParam }: { params: { species: string }; pageParam: number }): Promise<CharactersPage> =>
    fetch(`https://rickandmortyapi.com/api/character?species=${params.species}&page=${pageParam}`).then((r) =>
      r.json(),
    ),
);

const characters = createInfiniteQuery({
  effect: fetchCharactersPageFx,
  initialPageParam: 1,
  // info.next is a URL (or null at the end) — advance the page number while it exists
  getNextPageParam: ({ lastPage, lastPageParam }) => (lastPage.info.next ? lastPageParam + 1 : null),
});

async function main() {
  const scope = fork();

  await allSettled(characters.start, { scope, params: { species: 'Human' } });
  log(scope);

  await allSettled(characters.fetchNext, { scope });
  log(scope);

  await allSettled(characters.fetchNext, { scope });
  log(scope);

  function log(s: typeof scope) {
    const pages = s.getState(characters.$pages);
    const all = pages.flatMap((p) => p.results);
    console.log(
      `pages=${pages.length} loaded=${all.length} hasNext=${s.getState(characters.$hasNextPage)} ` +
        `sample=${JSON.stringify(all.slice(0, 3).map((c) => c.name))}`,
    );
  }
}

main().catch((e) => console.error('demo failed:', e));
