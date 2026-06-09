/**
 * FormData upload as a mutation (multipart/form-data) via createRequestFx.
 *
 * Run: npx tsx examples/form-data.ts
 */
import { allSettled, fork } from 'effector';
import { createMutation, createRequestFx } from '../src';

interface UploadResult {
  url: string;
  files: Record<string, string>;
  form: Record<string, string>;
}

// Build FormData per call. Do NOT set Content-Type — the runtime adds the
// multipart boundary automatically.
const uploadFx = createRequestFx<{ file: Blob; name: string; tags: string[] }, UploadResult>(
  ({ file, name, tags }, { signal }) => {
    const body = new FormData();
    body.append('file', file, 'upload.txt');
    body.append('name', name);
    tags.forEach((tag) => body.append('tags', tag));
    return fetch('https://httpbin.org/post', { method: 'POST', body, signal }).then((r) => r.json());
  },
);

export const uploadMutation = createMutation({ effect: uploadFx, retry: 1 });

async function main() {
  const scope = fork();
  const file = new Blob(['hello effector-refetch'], { type: 'text/plain' });

  await allSettled(uploadMutation.mutate, {
    scope,
    params: { file, name: 'demo', tags: ['a', 'b'] },
  });

  console.log('status:', scope.getState(uploadMutation.$status));
  console.log('echoed form:', scope.getState(uploadMutation.$data)?.form);
}

main().catch((e) => console.error('demo failed:', e));
