# effector-refetch-codemod

Migrate [farfetched](https://ff.effector.dev) (`@farfetched/core`) usage to
[effector-refetch](https://github.com/Olovyannikov/effector-refetch).

```bash
npx effector-refetch-codemod "src/**/*.{ts,tsx}"
npx effector-refetch-codemod "src/**/*.ts" --dry   # preview, write nothing
```

## What it does

- Rewrites imports: `@farfetched/core` → `effector-refetch`.
- Folds the standalone operators into the inline `createQuery` config and removes the now-unused
  operator imports:

  ```ts
  // before
  import { createQuery, retry, cache, concurrency } from '@farfetched/core';
  const userQuery = createQuery({ effect: fetchUserFx });
  retry(userQuery, { times: 3 });
  cache(userQuery, { staleAfter: 60_000 });
  concurrency(userQuery, { strategy: 'TAKE_LATEST' });

  // after
  import { createQuery } from 'effector-refetch';
  const userQuery = createQuery({
    effect: fetchUserFx,
    retry: { times: 3 },
    cache: { staleAfter: 60_000 },
    concurrency: 'TAKE_LATEST',
  });
  ```

`connectQuery` / `createMutation` keep the same API — only their import is rewritten. Operators
applied to a query the codemod can't resolve statically (e.g. imported from another module) are
left untouched, so review the diff and run your formatter afterwards.
