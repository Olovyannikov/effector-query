# Local development

Want to hack on **effector-refetch** itself (not just use it)? Here's how to get the repo running.

## Prerequisites

- **Node ≥ 22.13** (required by the pinned pnpm).
- **pnpm 11.5.1** — the repo pins it via `packageManager`. The easiest way is Corepack:

```bash
corepack enable
```

## Clone & install

```bash
git clone https://github.com/Olovyannikov/effector-query.git
cd effector-query
pnpm install
```

## Scripts

| script            | what it does                                         |
| ----------------- | ---------------------------------------------------- |
| `pnpm build`      | Build the library (`dist/`) — all entries + `.d.ts`  |
| `pnpm typecheck`  | `tsc --noEmit`                                       |
| `pnpm lint`       | ESLint (incl. `eslint-plugin-effector`)              |
| `pnpm format`     | Prettier write (`format:check` to verify only)       |
| `pnpm test`       | Run the Vitest suite once (`test:watch` for watch)   |
| `pnpm size`       | Check bundle budgets (size-limit)                    |
| `pnpm docs:dev`   | Run this documentation site locally                  |
| `pnpm docs:build` | Build the docs (also checks for dead links)          |
| `pnpm changeset`  | Record a changeset for your change (drives releases) |

## Making a change

1. Branch off `main`.
2. Make the change with a test (the suite runs under `fork`/`allSettled` for scope-safety).
3. Run the gate: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.
4. Add a changeset: `pnpm changeset` (pick `patch`/`minor`/`major` and write a line — it becomes
   the changelog entry).
5. Open a PR. On merge to `main`, CI opens a "Version Packages" PR; merging that publishes to npm.

## Trying it against an app

Run the examples directly from source (no build step) with [tsx](https://github.com/privatenumber/tsx):

```bash
npx tsx examples/graphql.ts
```

Or `pnpm build` and `pnpm pack` to get a tarball you can `pnpm add` into another project.
