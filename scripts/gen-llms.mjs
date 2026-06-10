// Generates docs/public/llms.txt (index) and docs/public/llms-full.txt (full text)
// from the English docs, following the llms.txt convention (https://llmstxt.org).
// Run before `vitepress build` (wired into the `docs:build` script).
import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DOCS = 'docs';
const PUBLIC = join(DOCS, 'public');
const BASE = 'https://olovyannikov.github.io/effector-refetch';
const SKIP_DIRS = new Set(['.vitepress', 'public', 'ru']);
// top-level sections in display order
const ORDER = ['guide', 'api', 'recipes'];

/** Recursively collect English markdown files (skips ru/.vitepress/public). */
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (!SKIP_DIRS.has(name)) out.push(...walk(full));
    } else if (name.endsWith('.md')) {
      out.push(full);
    }
  }
  return out;
}

function stripFrontmatter(src) {
  if (src.startsWith('---')) {
    const end = src.indexOf('\n---', 3);
    if (end !== -1) return src.slice(src.indexOf('\n', end + 1) + 1);
  }
  return src;
}

function firstHeading(body, fallback) {
  const m = body.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : fallback;
}

function firstParagraph(body) {
  const text = body
    .replace(/^#.*$/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .trim();
  const para = text.split('\n\n').find((p) => p.trim().length > 0) ?? '';
  return para.replace(/\s+/g, ' ').trim().slice(0, 200);
}

function urlFor(relPath) {
  const clean = relPath
    .replace(/\\/g, '/')
    .replace(/index\.md$/, '')
    .replace(/\.md$/, '.html');
  return `${BASE}/${clean}`;
}

const files = walk(DOCS)
  .map((path) => {
    const rel = path.slice(DOCS.length + 1);
    const body = stripFrontmatter(readFileSync(path, 'utf8')).trim();
    const section = rel.includes('/') ? rel.split('/')[0] : 'root';
    return {
      rel,
      body,
      section,
      title: firstHeading(body, rel),
      summary: firstParagraph(body),
      url: urlFor(rel),
    };
  })
  .sort((a, b) => {
    const ai = ORDER.indexOf(a.section);
    const bi = ORDER.indexOf(b.section);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.rel.localeCompare(b.rel);
  });

const sectionTitles = { guide: 'Guide', api: 'API', recipes: 'Recipes', root: 'Overview' };

// ---- llms.txt (index) ----
let index = `# effector-refetch\n\n`;
index += `> Friendly, effect-first query layer for effector — createQuery/createMutation built on real effects, with caching, retries, concurrency, pagination, validation, React/Vue/Solid bindings, SSR via fork/allSettled, devtools and an offline/auth barrier.\n\n`;
index += `Full documentation as plain text: [llms-full.txt](${BASE}/llms-full.txt). Repo: https://github.com/Olovyannikov/effector-refetch\n`;

let lastSection = '';
for (const f of files) {
  if (f.section !== lastSection) {
    index += `\n## ${sectionTitles[f.section] ?? f.section}\n\n`;
    lastSection = f.section;
  }
  index += `- [${f.title}](${f.url})${f.summary ? `: ${f.summary}` : ''}\n`;
}

// ---- llms-full.txt (full text) ----
let full = `# effector-refetch — full documentation\n\n`;
full += `Source: ${BASE} • https://github.com/Olovyannikov/effector-refetch\n`;
full += `Generated from the English docs. Sections: guide, api, recipes.\n`;
for (const f of files) {
  full += `\n\n${'='.repeat(80)}\n# ${f.title}\nURL: ${f.url}\n${'='.repeat(80)}\n\n${f.body}\n`;
}

mkdirSync(PUBLIC, { recursive: true });
writeFileSync(join(PUBLIC, 'llms.txt'), index);
writeFileSync(join(PUBLIC, 'llms-full.txt'), full);
console.log(
  `gen-llms: wrote llms.txt + llms-full.txt (${files.length} pages, ${(full.length / 1024).toFixed(1)} kB)`,
);
