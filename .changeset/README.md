# Changesets

This folder is managed by [changesets](https://github.com/changesets/changesets).

Add a changeset for any user-facing change:

```bash
pnpm changeset
```

Pick a bump (patch / minor / major) and describe the change. On merge to `main`, the
Release workflow opens/updates a "Version Packages" PR; merging it versions and
publishes the package.
