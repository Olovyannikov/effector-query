---
'effector-refetch': patch
---

Fix published TypeScript declarations for `node16`/`nodenext` and CommonJS consumers.
`@arethetypeswrong/cli` flagged the previous single ESM-flavored `.d.ts` (served for both
`import` and `require`) as "masquerading as ESM" under CJS, plus internal resolution errors from
extensionless relative imports. The declarations are now rolled up per entry (no relative imports),
ship a `.d.cts` for the `require` condition, and the `exports` map carries per-condition `types`.
With `typesVersions` for subpaths, every entry resolves cleanly under node10 / node16 (CJS + ESM) /
bundler. Added an `attw --pack` CI gate and an `engines: node >=18` field. No API or runtime change.
