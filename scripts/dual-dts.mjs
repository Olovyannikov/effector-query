// After `vite build`, emit a `.d.cts` next to each rolled-up `.d.ts`.
//
// The package is `"type": "module"`, so a `.d.ts` is interpreted as ESM types.
// CJS consumers (require, under node16/nodenext) need a CommonJS-flavored
// declaration, otherwise the types "masquerade as ESM". The rolled-up `.d.ts`
// are self-contained (no relative imports), so a verbatim copy is valid as
// `.d.cts` — only the extension signals the module kind.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'dist';
const decls = readdirSync(dir).filter((f) => f.endsWith('.d.ts'));

if (decls.length === 0) {
  console.error('dual-dts: no .d.ts files in dist/ — did `vite build` run first?');
  process.exit(1);
}

for (const file of decls) {
  const cts = file.replace(/\.d\.ts$/, '.d.cts');
  writeFileSync(join(dir, cts), readFileSync(join(dir, file)));
}

console.log(`dual-dts: wrote ${decls.length} .d.cts file(s)`);
