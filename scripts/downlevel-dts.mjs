// Post-build step: make the emitted declaration files consumable by older
// TypeScript toolchains (e.g. TS 4.4, used by some downstream apps).
//
// tsup bundles declarations with TypeScript 5, which emits per-specifier
// type-only modifiers like `export { type A, B }`. That syntax was introduced
// in TS 4.5, so a TS <4.5 consumer fails to even parse the .d.ts. Dropping the
// inline `type` keyword (`export { A, B }`) is valid on every TS version and is
// semantically identical for a declaration consumer.
//
// We use the TypeScript compiler API rather than a regex so that only
// AST-confirmed import/export specifier modifiers are removed — object-literal
// or enum members that happen to be named `type` are never touched.

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const distDir = fileURLToPath(new URL("../dist/", import.meta.url));

if (!existsSync(distDir)) {
  console.error("Error: dist/ not found (run the build before this step)");
  process.exit(1);
}

const collectDeclarationFiles = (dir) => {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectDeclarationFiles(full));
    } else if (/\.d\.(c|m)?ts$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
};

const stripInlineTypeModifiers = (text, filePath) => {
  const source = ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
  );
  const removals = []; // [{ start, end }] ranges covering the `type ` keyword + following whitespace

  const visit = (node) => {
    if (
      (ts.isImportSpecifier(node) || ts.isExportSpecifier(node)) &&
      node.isTypeOnly
    ) {
      const start = node.getStart(source);
      const nameStart = (node.propertyName ?? node.name).getStart(source);
      removals.push({ start, end: nameStart });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);

  if (removals.length === 0) {
    return null;
  }

  removals.sort((a, b) => b.start - a.start);
  let out = text;
  for (const { start, end } of removals) {
    out = out.slice(0, start) + out.slice(end);
  }
  return out;
};

let changed = 0;
for (const file of collectDeclarationFiles(distDir)) {
  const text = readFileSync(file, "utf8");
  const updated = stripInlineTypeModifiers(text, file);
  if (updated !== null) {
    writeFileSync(file, updated);
    changed += 1;
  }
}

console.log(
  `downlevel-dts: removed inline type specifiers from ${changed} declaration file(s)`,
);
