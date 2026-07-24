import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const projectRoot = path.resolve(import.meta.dirname, '..');
const sourceRoot = path.join(projectRoot, 'src');
const localesRoot = path.join(projectRoot, 'public', 'locales');
const baseLanguage = 'en';
const errors = [];

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const flattenLeaves = (value, prefix = '') => {
  if (typeof value === 'string') return new Map([[prefix, value]]);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return new Map([[prefix, value]]);
  }

  const leaves = new Map();
  for (const [key, child] of Object.entries(value)) {
    const childPrefix = prefix ? `${prefix}.${key}` : key;
    for (const [leafPath, leafValue] of flattenLeaves(child, childPrefix)) {
      leaves.set(leafPath, leafValue);
    }
  }
  return leaves;
};

const placeholders = (value) =>
  [...value.matchAll(/{{\s*([^}]+?)\s*}}/g)].map((match) => match[1]).sort();

const basePath = path.join(localesRoot, baseLanguage, 'translation.json');
const baseLeaves = flattenLeaves(readJson(basePath));

for (const language of fs.readdirSync(localesRoot).sort()) {
  const localePath = path.join(localesRoot, language, 'translation.json');
  if (!fs.existsSync(localePath)) continue;

  let localeLeaves;
  try {
    localeLeaves = flattenLeaves(readJson(localePath));
  } catch (error) {
    errors.push(`${language}: invalid JSON (${error instanceof Error ? error.message : error})`);
    continue;
  }

  const missing = [...baseLeaves.keys()].filter((key) => !localeLeaves.has(key));
  const extra = [...localeLeaves.keys()].filter((key) => !baseLeaves.has(key));
  if (missing.length > 0) errors.push(`${language}: missing keys: ${missing.join(', ')}`);
  if (extra.length > 0) errors.push(`${language}: extra keys: ${extra.join(', ')}`);

  for (const [key, baseValue] of baseLeaves) {
    const localeValue = localeLeaves.get(key);
    if (typeof localeValue !== 'string' || localeValue.trim().length === 0) {
      errors.push(`${language}: ${key} must be a non-empty string`);
      continue;
    }
    const basePlaceholders = placeholders(baseValue);
    const localePlaceholders = placeholders(localeValue);
    const requiredPlaceholders =
      key === 'timeUnits.format'
        ? basePlaceholders.filter((placeholder) => placeholder !== 'ago')
        : basePlaceholders;
    const hasMissingPlaceholder = requiredPlaceholders.some(
      (placeholder) => !localePlaceholders.includes(placeholder)
    );
    const hasUnknownPlaceholder = localePlaceholders.some(
      (placeholder) => !basePlaceholders.includes(placeholder)
    );
    if (hasMissingPlaceholder || hasUnknownPlaceholder) {
      errors.push(`${language}: ${key} has mismatched placeholders`);
    }
  }
}

const sourceFiles = [];
const collectSourceFiles = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(entryPath);
    } else if (
      /\.(ts|tsx)$/.test(entry.name) &&
      !entry.name.includes('.test.') &&
      !entry.name.includes('.integration.')
    ) {
      sourceFiles.push(entryPath);
    }
  }
};
collectSourceFiles(sourceRoot);

for (const filePath of sourceFiles) {
  const sourceText = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

  const visit = (node) => {
    if (ts.isCallExpression(node) && node.arguments.length > 0) {
      const callee = node.expression;
      const isTranslationCall =
        (ts.isIdentifier(callee) && callee.text === 't') ||
        (ts.isPropertyAccessExpression(callee) && callee.name.text === 't');
      const argument = node.arguments[0];
      if (
        isTranslationCall &&
        (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument)) &&
        !baseLeaves.has(argument.text)
      ) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(argument.getStart());
        errors.push(
          `en: missing source key ${JSON.stringify(argument.text)} at ${path.relative(projectRoot, filePath)}:${line + 1}`
        );
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}

if (errors.length > 0) {
  console.error(`Translation check failed with ${errors.length} error(s):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(
    `Translation check passed: ${fs.readdirSync(localesRoot).length} locales, ${baseLeaves.size} leaf keys.`
  );
}
