// Idempotent publish for the changesets release flow.
//
// changesets/action runs this whenever there are no pending changesets, so it
// fires on *every* push to main after a "Version Packages" merge — including
// no-op pushes where the current version is already on npm. `pnpm publish` is
// not idempotent (it 403s on a republish), and `changeset publish` crashes on
// pnpm's output, so we check the registry ourselves and publish only when the
// current version is missing.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const { name, version } = JSON.parse(readFileSync('package.json', 'utf8'));

let alreadyPublished = false;
try {
  const out = execSync(`npm view ${name}@${version} version`, { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim();
  alreadyPublished = out === version;
} catch {
  alreadyPublished = false; // 404 — not on the registry yet
}

if (alreadyPublished) {
  console.log(`${name}@${version} is already published — nothing to do.`);
  process.exit(0);
}

console.log(`Publishing ${name}@${version}…`);
execSync('pnpm publish --no-git-checks', { stdio: 'inherit' });
