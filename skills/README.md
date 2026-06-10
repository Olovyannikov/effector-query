# effector-refetch — Agent Skill

A [Claude Code Agent Skill](https://docs.claude.com/en/docs/claude-code/skills) that teaches AI
agents how to use **effector-refetch** correctly — the effect-first API, the bindings, and the
fork-correct idioms that are easy to get wrong.

## Install with the `skills` CLI (recommended)

Using [vercel-labs/skills](https://github.com/vercel-labs/skills) (works with Claude Code and 70+
other agents):

```bash
npx skills add Olovyannikov/effector-refetch            # add to your project's agents
npx skills add Olovyannikov/effector-refetch --list     # preview first
npx skills add Olovyannikov/effector-refetch -a claude-code  # a specific agent
npx skills add Olovyannikov/effector-refetch -g         # global (all your projects)
```

## Install manually

Copy the skill folder into your project's `.claude/skills/`:

```bash
# from a project that has effector-refetch installed
cp -R node_modules/effector-refetch/skills/effector-refetch .claude/skills/

# or fetch it straight from the repo
mkdir -p .claude/skills
curl -fsSL https://raw.githubusercontent.com/Olovyannikov/effector-refetch/main/skills/effector-refetch/SKILL.md \
  -o .claude/skills/effector-refetch/SKILL.md
```

Agents will then load `effector-refetch/SKILL.md` automatically when a task involves data
fetching with the library (the skill's `description` drives that discovery).

## Use it everywhere

- **Per project:** `.claude/skills/effector-refetch/SKILL.md` (above).
- **Personal (all your projects):** `~/.claude/skills/effector-refetch/SKILL.md`.
- **Other agent tools:** the `SKILL.md` is plain Markdown with YAML frontmatter — point any
  agent/system-prompt loader at it, or paste it into your tool's rules/instructions file.

## What it covers

createQuery/createMutation, retry/cache/concurrency, connectQuery & combineQueries, HTTP
(`createRequestFx`/`createJsonQuery`), validation contracts, pagination, caching adapters/SWR,
React/Vue/Solid bindings + Suspense, SSR & testing with `fork`/`allSettled`, the auth/offline
barriers, devtools/introspection — plus a "common mistakes" checklist.
