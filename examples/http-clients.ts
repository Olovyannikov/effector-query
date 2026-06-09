/**
 * Full example: building request effects with `createRequestFx` over ofetch and
 * axios, then wiring queries + mutations + invalidation + optimistic updates.
 *
 * Run: npx tsx examples/http-clients.ts
 */
import { ofetch } from 'ofetch';
import axios from 'axios';
import { allSettled, fork } from 'effector';
import {
  createMutation,
  createQuery,
  createRequestFx,
  invalidate,
  optimisticUpdate,
  type RequestError,
} from '../src';

const API = 'https://jsonplaceholder.typicode.com';

interface Post {
  id: number;
  userId: number;
  title: string;
  body: string;
}

// --- ofetch: a request factory (the shape from the request) ---
//   createRequestFx<Params, Response>((params, { signal }) => ...)
const getPostsFx = createRequestFx<{ userId: number }, Post[]>(
  ({ userId }, { signal }) => ofetch(`${API}/posts`, { query: { userId }, signal }),
  { name: 'getPostsFx' },
);

// --- axios: another factory; note the error normalization is shared ---
const createPostFx = createRequestFx<{ userId: number; title: string }, Post>(
  async (body, { signal }) => {
    const res = await axios.post<Post>(`${API}/posts`, body, { signal });
    return res.data;
  },
  { name: 'createPostFx' },
);

// --- queries & mutations on top of the real effects ---
const postsQuery = createQuery({
  effect: getPostsFx,
  cache: { staleAfter: 30_000 },
  retry: 2,
});

const addPost = createMutation({ effect: createPostFx });

// after a successful create, refetch the list with its last params
invalidate({ on: addPost, refetch: postsQuery });

// ...and show the new post instantly (optimistic), reconciling with the server id
optimisticUpdate({
  query: postsQuery,
  on: addPost,
  update: ({ data, params }) => [
    { id: -1, userId: params.userId, title: params.title, body: '' },
    ...(data ?? []),
  ],
  commit: ({ data, result }) => (data ?? []).map((p) => (p.id === -1 ? result : p)),
});

async function main() {
  const scope = fork();

  await allSettled(postsQuery.start, { scope, params: { userId: 1 } });
  const initial = scope.getState(postsQuery.$data);
  console.log('loaded posts:', initial?.length);

  await allSettled(addPost.mutate, { scope, params: { userId: 1, title: 'Hello effector-refetch' } });
  const after = scope.getState(postsQuery.$data);
  console.log('after create — first title:', after?.[0]?.title);
  console.log('mutation status:', scope.getState(addPost.$status));

  const err = scope.getState(postsQuery.$error) as RequestError | null;
  if (err) console.log('error status:', err.status);
}

main().catch((e) => console.error('demo failed:', e));
