import { describe, it, expect } from 'vitest';
// @ts-expect-error — plain .mjs helper, no type declarations
import { migrateCode } from '../codemod/transform.mjs';

const run = (code: string): string => migrateCode(code) as string;

describe('farfetched → effector-refetch codemod', () => {
  it('rewrites the import source', () => {
    const out = run(`import { createQuery, connectQuery } from '@farfetched/core';`);
    expect(out).toContain(`from 'effector-refetch'`);
    expect(out).not.toContain('@farfetched/core');
    expect(out).toContain('createQuery');
    expect(out).toContain('connectQuery');
  });

  it('folds retry/cache/concurrency operators into the createQuery config', () => {
    const out = run(`
import { createQuery, retry, cache, concurrency } from '@farfetched/core';
const userQuery = createQuery({ effect: fetchUserFx });
retry(userQuery, { times: 3 });
cache(userQuery, { staleAfter: 60000 });
concurrency(userQuery, { strategy: 'TAKE_LATEST' });
`);
    // operators folded inline
    expect(out).toContain('retry: { times: 3 }');
    expect(out).toContain('cache: { staleAfter: 60000 }');
    expect(out).toContain("concurrency: 'TAKE_LATEST'");
    // standalone calls removed
    expect(out).not.toMatch(/retry\(userQuery/);
    expect(out).not.toMatch(/cache\(userQuery/);
    expect(out).not.toMatch(/concurrency\(userQuery/);
    // now-unused operator imports dropped → only createQuery left in the import
    expect(out).toMatch(/import\s*{\s*createQuery\s*}\s*from 'effector-refetch'/);
  });

  it('cache() with no options folds to cache: true', () => {
    const out = run(`
import { createQuery, cache } from '@farfetched/core';
const q = createQuery({ effect: fx });
cache(q);
`);
    expect(out).toContain('cache: true');
    expect(out).not.toMatch(/cache\(q\)/);
  });

  it('leaves operators on a dynamic/unknown target untouched', () => {
    const out = run(`
import { createQuery, retry } from '@farfetched/core';
retry(someExternalQuery, { times: 2 });
`);
    // can't statically fold -> keep the call and the import
    expect(out).toMatch(/retry\(someExternalQuery/);
    expect(out).toContain('retry');
    expect(out).toContain(`from 'effector-refetch'`);
  });

  it('does not touch non-farfetched imports', () => {
    const code = `import { createStore } from 'effector';\nconst $x = createStore(0);\n`;
    expect(run(code)).toContain(`from 'effector'`);
  });
});
