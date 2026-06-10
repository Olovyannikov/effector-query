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
git clone https://github.com/Olovyannikov/effector-refetch.git
cd effector-refetch
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

## PR previews & canary builds

Every pull request gets two automatic stands:

- **Docs preview** — the site is built and uploaded as a downloadable workflow **artifact**
  (`docs-preview-pr-<N>`). _(The production docs own the single GitHub Pages source, so previews
  aren't a live URL; for that, deploy previews to an external host — see below.)_
- **Canary package** — [pkg.pr.new](https://pkg.pr.new) publishes a preview build you can install
  straight from the PR: `npm i https://pkg.pr.new/Olovyannikov/effector-refetch@<sha>` (no npm
  pollution). The bot comments the exact command.

## Continuous integration (GitHub Actions)

Workflows under `.github/workflows/`:

| Workflow              | Trigger         | What it does                                                              |
| --------------------- | --------------- | ------------------------------------------------------------------------- |
| `ci.yml`              | push / PR       | typecheck · lint · test · build · size-limit                              |
| `release.yml`         | push to `main`  | changesets: opens a "Version Packages" PR; on its merge, publishes to npm |
| `docs.yml`            | push to `main`  | builds the docs and deploys them to GitHub Pages (Actions artifact)       |
| `pr-preview.yml`      | pull_request    | builds the PR docs and uploads them as a downloadable artifact            |
| `pkg-pr-new.yml`      | push / PR       | publishes a canary via pkg.pr.new                                         |
| `release-codemod.yml` | manual dispatch | publishes the `effector-refetch-codemod` package (in `codemod/`) to npm   |

### Required repository setup

These need to be enabled once by a maintainer (Actions can't configure them itself):

1. **Pages** — Settings → Pages → Source: **GitHub Actions**. (`docs.yml` deploys the built site
   via the Pages artifact.)
2. **Workflow permissions** — Settings → Actions → General → **Read and write permissions**, and
   **Allow GitHub Actions to create and approve pull requests** (for the Version Packages PR).
3. **`NPM_TOKEN` secret** — a classic **Automation** token (bypasses 2FA) or a Granular token with
   read+write on packages. Drives `release.yml` and `release-codemod.yml`.
4. **pkg.pr.new GitHub App** — install [`pkg-pr-new`](https://github.com/apps/pkg-pr-new) on the
   repo so the canary workflow can publish (it's a no-op / non-blocking until then).

Want **live** per-PR doc URLs? Point `pr-preview.yml` at an external host (Cloudflare Pages,
Netlify, Vercel) — that needs an account and a token secret, but leaves the production Pages
deploy untouched.

The docs generators (`scripts/gen-api.mjs`, `scripts/gen-llms.mjs`) run inside `docs:build`, so
both `docs.yml` and `pr-preview.yml` always ship a fresh API reference and `llms.txt`.
