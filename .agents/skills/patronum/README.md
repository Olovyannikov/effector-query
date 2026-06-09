# Patronum Skill

Human-facing overview for the `patronum` skill.

## What this skill is for

This skill helps choose and apply Patronum operators in Effector projects with concise, practical examples.
It is focused on Patronum **v2.x** usage.

## Folder structure

- `SKILL.md` - machine-facing skill instructions and workflow.
- `agents/openai.yaml` - UI metadata for Codex skill list/chips.
- `references/operator-matrix.md` - full operator lookup table.
- `references/recipes.md` - task-based ready-to-use snippets.
- `references/pitfalls.md` - common mistakes and caveats.
- `references/migration-notes.md` - legacy-to-modern mapping notes.

## Quick use

Invoke the skill explicitly:

```text
Use $patronum to choose the right Patronum operator and provide a minimal working Effector snippet.
```

## Scope

- Included: Patronum operator selection, API explanation, composition guidance, migration hints.
- Not included: contribution workflow for Patronum internals (writing new operators/tests in the Patronum repo).
