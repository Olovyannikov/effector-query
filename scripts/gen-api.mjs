// Generates docs/api/reference.md — the public API surface, derived from the
// TypeScript types (src entry points), so it can't drift from the build.
// Run as part of `docs:build` / `docs:dev`.
import { Project, SyntaxKind } from 'ts-morph';
import { writeFileSync } from 'node:fs';
import { relative } from 'node:path';

const REPO = 'https://github.com/Olovyannikov/effector-refetch/blob/main';
const cwd = process.cwd();

const entries = [
  { file: 'src/index.ts', import: 'effector-refetch' },
  { file: 'src/react.ts', import: 'effector-refetch/react' },
  { file: 'src/vue.ts', import: 'effector-refetch/vue' },
  { file: 'src/solid.ts', import: 'effector-refetch/solid' },
];

const project = new Project({ tsConfigFilePath: 'tsconfig.json', skipAddingFilesFromTsConfig: false });

const kindOf = (d) => {
  switch (d.getKind()) {
    case SyntaxKind.FunctionDeclaration:
      return 'function';
    case SyntaxKind.ClassDeclaration:
      return 'class';
    case SyntaxKind.InterfaceDeclaration:
      return 'interface';
    case SyntaxKind.TypeAliasDeclaration:
      return 'type';
    case SyntaxKind.EnumDeclaration:
      return 'enum';
    case SyntaxKind.VariableDeclaration:
      return 'const';
    default:
      return 'value';
  }
};

const trunc = (s, n = 100) => {
  const flat = s.replace(/\s+/g, ' ').trim();
  return flat.length > n ? `${flat.slice(0, n)}…` : flat;
};

/** A compact one-line signature for callables; empty for plain types. */
const signatureOf = (name, decl) => {
  try {
    const calls = decl.getType().getCallSignatures();
    if (!calls.length) return '';
    const c = calls[0];
    const params = c
      .getParameters()
      .map((p) => p.getName())
      .join(', ');
    const ret = trunc(c.getReturnType().getText(decl), 40);
    return `${name}(${params}): ${ret}`;
  } catch {
    return '';
  }
};

const sourceLink = (decl) => {
  try {
    const rel = relative(cwd, decl.getSourceFile().getFilePath());
    return `${REPO}/${rel}#L${decl.getStartLineNumber()}`;
  } catch {
    return '';
  }
};

const order = { function: 0, const: 1, class: 2, type: 3, interface: 3, enum: 3, value: 4 };

let out = `# API reference\n\n`;
out += `> Auto-generated from the public type entry points — always in sync with the build.\n`;
out += `> For prose and examples, see the [API](/api/queries) and [Recipes](/recipes/ssr-and-testing) sections.\n`;

for (const entry of entries) {
  const sf = project.getSourceFile(entry.file);
  if (!sf) continue;
  const rows = [];
  for (const [name, decls] of sf.getExportedDeclarations()) {
    const decl = decls[0];
    if (!decl) continue;
    const kind = kindOf(decl);
    rows.push({ name, kind, sig: signatureOf(name, decl), link: sourceLink(decl) });
  }
  rows.sort((a, b) => (order[a.kind] ?? 9) - (order[b.kind] ?? 9) || a.name.localeCompare(b.name));

  out += `\n## \`${entry.import}\`\n\n`;
  out += `| Export | Kind | Signature |\n| --- | --- | --- |\n`;
  for (const r of rows) {
    const exp = r.link ? `[\`${r.name}\`](${r.link})` : `\`${r.name}\``;
    const sig = r.sig ? `\`${r.sig}\`` : '';
    out += `| ${exp} | ${r.kind} | ${sig} |\n`;
  }
}

writeFileSync('docs/api/reference.md', out);
const total = entries.reduce(
  (n, e) => n + (project.getSourceFile(e.file)?.getExportedDeclarations().size ?? 0),
  0,
);
console.log(`gen-api: wrote docs/api/reference.md (${total} exports across ${entries.length} entry points)`);
