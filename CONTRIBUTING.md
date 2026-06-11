# Contributing to effector-refetch

Thanks for taking the time to contribute! This is a friendly, effect-first query layer for
[effector](https://effector.dev), and contributions of all sizes are welcome — bug reports, docs
fixes, recipes, and features.

This file is the quick start. The fuller local-development guide (scripts, CI, PR previews, canary
builds) lives at **[the Contributing docs page](https://olovyannikov.github.io/effector-refetch/guide/contributing)**
(source: `docs/guide/contributing.md`).

## Ways to contribute

- **Report a bug** — open an [issue](https://github.com/Olovyannikov/effector-refetch/issues) with
  a minimal reproduction. Because everything is plain effector, a `fork()` + `allSettled` snippet
  (no real network/timers) is the ideal repro and usually pinpoints it immediately. Include the
  `effector-refetch` and `effector` versions.
- **Suggest a feature** — open an issue first to discuss fit. The direction is tracked in
  [`ROADMAP.md`](./ROADMAP.md); "parity with farfetched" and "TanStack-style ergonomics" are the
  guiding stars, but this is **not** a farfetched clone.
- **Improve docs** — the docs are bilingual (English under `docs/`, Russian under `docs/ru/`).
  Please update **both** when changing user-facing content.
- **Send a PR** — see below.

## Development quickstart

Prerequisites: **Node ≥ 22.13** (for the pinned pnpm) and **pnpm 11.5.1** (pinned via
`packageManager` — `corepack enable` gives you the right version). The published package itself
supports Node ≥ 18 (`engines`).

```bash
git clone https://github.com/Olovyannikov/effector-refetch.git
cd effector-refetch
pnpm install
```

Useful scripts: `pnpm test:watch`, `pnpm typecheck`, `pnpm lint`, `pnpm docs:dev`. Run an example
against source with no build step: `npx tsx examples/graphql.ts`.

## Making a change

1. **Branch off `main`.**
2. **Write a test.** The suite runs under `fork()` / `allSettled` for scope-safety (no real timers
   or network in unit tests) — mirror the existing tests in `test/`.
3. **Run the full gate** (the same checks CI enforces):
   ```bash
   pnpm typecheck && pnpm lint && pnpm format:check && pnpm test:coverage && pnpm build && pnpm attw && pnpm size
   ```
4. **Add a changeset:** `pnpm changeset` — pick `patch` / `minor` / `major` and write one line. It
   becomes the changelog entry and drives the release. PRs that change `src/` should include one
   (docs-only changes don't need it).
5. **Open the PR.** On merge to `main`, CI opens a "Version Packages" PR; merging _that_ publishes
   to npm. Every PR also gets a [pkg.pr.new](https://pkg.pr.new) canary build you can install.

## Conventions & guardrails

These keep the library small, predictable, and effector-idiomatic:

- **Effect-first.** The unit of work is the user's real `Effect`. `query.__.effect` must always be
  exactly what they passed — the query is a thin reactive shell, not a black box.
- **Inline option == operator sugar.** Anything offered as a `createQuery({ … })` option is thin
  sugar over a public, composable operator — power users are never boxed in.
- **No silent behavior.** Dropped/aborted runs surface via `aborted`; truncation and limits are
  observable. Don't hide state.
- **Fork-correct.** Read config through stores at sample time or via `attach({ source })` — never
  through module-level mutable globals. Every feature must pass under `fork`/SSR.
- **Dependency-free core.** The core has no runtime dependencies; framework bindings are optional,
  peer-scoped subpath entries (`/react`, `/vue`, `/solid`).
- **Lint clean.** Code passes `eslint-plugin-effector` (e.g. effect-typed units end in `Fx`).
- **Coverage & types gated.** Coverage thresholds and `@arethetypeswrong/cli` (published-type
  correctness) run in CI — keep them green.
- **Honesty over features.** If something isn't feasible cleanly, say so in the PR rather than
  shipping a fragile or fake implementation.

## Git hooks

`pnpm install` sets up [lefthook](https://lefthook.dev) hooks automatically (via the `prepare`
script). They run the same checks as CI so problems surface before you push:

- **pre-commit** — Prettier (auto-fixes & re-stages), ESLint, and `tsc --noEmit` on your change.
- **commit-msg** — [commitlint](https://commitlint.js.org) enforces
  [Conventional Commits](https://www.conventionalcommits.org).
- **pre-push** — the full test suite with coverage.

In a pinch, bypass with `git commit --no-verify` (or `LEFTHOOK=0 git commit …`).

## Commit & PR style

- **Conventional Commits.** Messages follow `type(scope): subject` — `feat`, `fix`, `docs`,
  `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`. e.g. `feat(cache): add SWR mode`.
  commitlint enforces this on commit.
- Keep PRs focused; describe the _why_, not just the _what_.
- Match the surrounding code style (Prettier handles formatting — `pnpm format`).
- Update docs (EN + RU) and add/adjust tests in the same PR as the code change.

## License

By contributing, you agree that your contributions are licensed under the project's
[MIT License](./LICENSE).
