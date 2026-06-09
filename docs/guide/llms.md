# LLMs & AI agents

effector-refetch ships machine-readable docs and an installable agent skill, so AI coding agents
write idiomatic, fork-correct code with the library.

## Agent skill

A [Claude Code skill](https://github.com/Olovyannikov/effector-query/tree/main/skills) teaching
the effect-first API, the bindings, and the fork-correct idioms (plus a "common mistakes"
checklist). It works with Claude Code and 70+ other agents (Cursor, Codex, OpenCode, …).

### Install with the `skills` CLI (recommended)

Using [vercel-labs/skills](https://github.com/vercel-labs/skills):

```bash
# add the effector-refetch skill to the agents in your project
npx skills add Olovyannikov/effector-query

# preview what's in the repo first
npx skills add Olovyannikov/effector-query --list

# target a specific agent, or install globally for all your projects
npx skills add Olovyannikov/effector-query -a claude-code
npx skills add Olovyannikov/effector-query -g
```

### Install manually

```bash
# from a project that already has the package installed
cp -R node_modules/effector-refetch/skills/effector-refetch .claude/skills/
```

Or copy [`skills/effector-refetch/SKILL.md`](https://github.com/Olovyannikov/effector-query/blob/main/skills/effector-refetch/SKILL.md)
into your project's `.claude/skills/` (or `~/.claude/skills/` for all projects). It's plain
Markdown with YAML frontmatter — any agent/system-prompt loader can read it.

## llms.txt

Following the [llms.txt convention](https://llmstxt.org), the docs site exposes two plain-text
files for LLM context:

- **[`/llms.txt`](https://olovyannikov.github.io/effector-query/llms.txt)** — an index: title,
  summary, and links to every documentation page.
- **[`/llms-full.txt`](https://olovyannikov.github.io/effector-query/llms-full.txt)** — the full
  text of the documentation in one file, ready to paste into a model's context.

Point your tool at the URL, or download it:

```bash
curl -fsSL https://olovyannikov.github.io/effector-query/llms-full.txt -o effector-refetch-docs.txt
```

Both files are regenerated on every docs build from the English docs.
