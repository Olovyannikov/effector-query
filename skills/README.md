# effector-refetch — Agent Skill

A [Claude Code Agent Skill](https://docs.claude.com/en/docs/claude-code/skills) that teaches AI
agents how to use **effector-refetch** correctly — the effect-first API, the bindings, and the
fork-correct idioms that are easy to get wrong.

## Install into your project

Copy the skill folder into your project's `.claude/skills/`:

```bash
# from a project that has effector-refetch installed
cp -R node_modules/effector-refetch/skills/effector-refetch .claude/skills/

# or fetch it straight from the repo
mkdir -p .claude/skills
curl -fsSL https://raw.githubusercontent.com/Olovyannikov/effector-query/main/skills/effector-refetch/SKILL.md \
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
