/**
 * GraphQL query via createRequestFx (POST { query, variables }) against the
 * public countries API. GraphQL errors become a RequestError.
 *
 * Run: npx tsx examples/graphql.ts
 */
import { allSettled, fork } from 'effector';
import { createQuery, createRequestFx, RequestError } from '../src';

interface Country {
  code: string;
  name: string;
  emoji: string;
}
interface CountriesData {
  countries: Country[];
}

const GET_COUNTRIES = /* GraphQL */ `
  query Countries($continent: String!) {
    countries(filter: { continent: { eq: $continent } }) {
      code
      name
      emoji
    }
  }
`;

const graphqlFx = createRequestFx<{ continent: string }, CountriesData>(async ({ continent }, { signal }) => {
  const res = await fetch('https://countries.trevorblades.com/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: GET_COUNTRIES, variables: { continent } }),
    signal,
  });
  const json = (await res.json()) as { data?: CountriesData; errors?: Array<{ message: string }> };
  if (json.errors?.length) {
    throw new RequestError(json.errors[0].message, { status: res.status, data: json.errors });
  }
  return json.data as CountriesData;
});

export const countriesQuery = createQuery({ effect: graphqlFx, cache: { staleAfter: 60_000 } });

async function main() {
  const scope = fork();
  await allSettled(countriesQuery.start, { scope, params: { continent: 'EU' } });
  const data = scope.getState(countriesQuery.$data);
  console.log(
    'countries:',
    data?.countries.slice(0, 5).map((c) => `${c.emoji} ${c.name}`),
  );
}

main().catch((e) => console.error('demo failed:', e));
