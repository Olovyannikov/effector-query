/**
 * GraphQL with a tiny reusable client factory.
 *
 * `graphql(document)` builds an Abortable `createRequestFx` effect for one
 * GraphQL document; every query/mutation reuses the same endpoint, headers,
 * abort signal, and error handling. GraphQL `errors` become a RequestError, so
 * `retry`/`$error` behave like any other request.
 *
 * Run: npx tsx examples/graphql.ts
 */
import { allSettled, fork } from 'effector';
import { createMutation, createQuery, createRequestFx, RequestError } from '../src';

const ENDPOINT = 'https://countries.trevorblades.com/graphql';

interface GraphqlResponse<Data> {
  data?: Data;
  errors?: Array<{ message: string }>;
}

/** One GraphQL document -> an Abortable effect that takes its variables. */
function graphql<Data, Vars = Record<string, never>>(document: string) {
  return createRequestFx<Vars, Data>(async (variables, { signal }) => {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: document, variables }),
      signal,
    });
    const json = (await res.json()) as GraphqlResponse<Data>;
    if (json.errors?.length) {
      throw new RequestError(json.errors[0].message, { status: res.status, data: json.errors });
    }
    return json.data as Data;
  });
}

// --- a query with variables ---
interface Country {
  code: string;
  name: string;
  emoji: string;
}

const getCountriesFx = graphql<{ countries: Country[] }, { continent: string }>(/* GraphQL */ `
  query Countries($continent: String!) {
    countries(filter: { continent: { eq: $continent } }) {
      code
      name
      emoji
    }
  }
`);

export const countriesQuery = createQuery({ effect: getCountriesFx, cache: { staleAfter: 60_000 } });

// --- a mutation built on the very same factory (illustrative document) ---
const addReviewFx = graphql<{ addReview: { id: string } }, { code: string; stars: number }>(/* GraphQL */ `
  mutation AddReview($code: ID!, $stars: Int!) {
    addReview(code: $code, stars: $stars) {
      id
    }
  }
`);

export const addReviewMutation = createMutation({ effect: addReviewFx, retry: 1 });
// usage: addReviewMutation.start({ code: 'EU', stars: 5 })

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
