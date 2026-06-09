import { Node, Project, SyntaxKind } from 'ts-morph';

const FARFETCHED = '@farfetched/core';
const TARGET = 'effector-refetch';
// standalone operators that fold into the inline createQuery config
const FOLDABLE = new Set(['retry', 'cache', 'concurrency']);

/**
 * Migrate one ts-morph SourceFile in place. Returns whether anything changed.
 *
 *  - rewrites imports from `@farfetched/core` to `effector-refetch`;
 *  - folds `retry(q, opts)` / `cache(q, opts)` / `concurrency(q, { strategy })`
 *    into the `createQuery({ … })` config of `q` (when statically resolvable),
 *    removing the now-redundant operator calls and unused imports.
 */
export function transformSourceFile(sf) {
  let changed = false;

  // 1) import module specifier: @farfetched/core -> effector-refetch
  for (const imp of sf.getImportDeclarations()) {
    if (imp.getModuleSpecifierValue() === FARFETCHED) {
      imp.setModuleSpecifier(TARGET);
      changed = true;
    }
  }

  // 2) map each `const q = createQuery({ … })` to its config object literal
  const configs = new Map();
  for (const vd of sf.getDescendantsOfKind(SyntaxKind.VariableDeclaration)) {
    const init = vd.getInitializer();
    if (!init || init.getKind() !== SyntaxKind.CallExpression) continue;
    if (init.getExpression().getText() !== 'createQuery') continue;
    const arg = init.getArguments()[0];
    if (arg && arg.getKind() === SyntaxKind.ObjectLiteralExpression) configs.set(vd.getName(), arg);
  }

  // 3) fold operator expression-statements into the matching config
  for (const stmt of sf.getStatements()) {
    if (stmt.getKind() !== SyntaxKind.ExpressionStatement) continue;
    const call = stmt.getExpression();
    if (call.getKind() !== SyntaxKind.CallExpression) continue;
    const name = call.getExpression().getText();
    if (!FOLDABLE.has(name)) continue;

    const args = call.getArguments();
    const cfg = configs.get(args[0]?.getText());
    if (!cfg) continue; // dynamic target — leave the operator call untouched

    const opt = args[1];
    if (name === 'concurrency') {
      const strategy =
        opt && opt.getKind() === SyntaxKind.ObjectLiteralExpression
          ? opt.getProperty('strategy')?.getInitializer()?.getText()
          : undefined;
      if (!strategy) continue; // unexpected shape — leave it
      if (!cfg.getProperty('concurrency'))
        cfg.addPropertyAssignment({ name: 'concurrency', initializer: strategy });
    } else if (!cfg.getProperty(name)) {
      cfg.addPropertyAssignment({ name, initializer: opt ? opt.getText() : 'true' });
    }
    stmt.remove();
    changed = true;
  }

  // 4) drop operator names from the import if they are no longer referenced
  for (const imp of sf.getImportDeclarations()) {
    if (imp.getModuleSpecifierValue() !== TARGET) continue;
    for (const spec of imp.getNamedImports()) {
      const local = spec.getName();
      if (!FOLDABLE.has(local)) continue;
      // count real reference positions — excluding the import specifier itself and
      // object-literal property *names* (the folded `retry:`/`cache:`/`concurrency:` keys,
      // which are identifiers with the same text but a different symbol)
      const uses = sf.getDescendantsOfKind(SyntaxKind.Identifier).filter((id) => {
        if (id.getText() !== local) return false;
        const p = id.getParent();
        if (Node.isImportSpecifier(p)) return false;
        if (Node.isPropertyAssignment(p) && p.getNameNode() === id) return false;
        if (Node.isShorthandPropertyAssignment(p)) return false;
        return true;
      }).length;
      if (uses === 0) {
        spec.remove();
        changed = true;
      }
    }
  }

  return changed;
}

/** Transform a code string and return the result (used by tests). */
export function migrateCode(code, fileName = 'input.tsx') {
  const project = new Project({ useInMemoryFileSystem: true });
  const sf = project.createSourceFile(fileName, code, { overwrite: true });
  transformSourceFile(sf);
  return sf.getFullText();
}
