#!/usr/bin/env npx tsx
/**
 * Generate schemas.generated.ts from schema files
 *
 * This script reads all schema files from the schemas/ directory and generates
 * a TypeScript module that exports them as string constants. This allows schemas
 * to be bundled into the JavaScript output, enabling use in browsers and test
 * environments without file system access.
 *
 * Usage: npx tsx scripts/generate-schemas.ts
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '..');
const SCHEMAS_DIR = join(ROOT_DIR, 'schemas');
const OUTPUT_FILE = join(ROOT_DIR, 'src', 'schema', 'schemas.generated.ts');

// Schema file extensions to process
const SCHEMA_EXTENSIONS = ['.rng', '.rnc', '.sch', '.xsd'];

/**
 * Convert filename to a valid TypeScript constant name
 * e.g., "package-30.rnc" -> "PACKAGE_30_RNC"
 */
function toConstantName(filename: string): string {
  return filename
    .toUpperCase()
    .replace(/[.-]/g, '_')
    .replace(/[^A-Z0-9_]/g, '');
}

/**
 * Escape a string for use in a template literal
 */
function escapeTemplateString(content: string): string {
  return content.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

function main(): void {
  console.log('Generating schemas.generated.ts...');

  // Read all schema files
  const files = readdirSync(SCHEMAS_DIR).filter((file) =>
    SCHEMA_EXTENSIONS.some((ext) => file.endsWith(ext)),
  );

  if (files.length === 0) {
    console.error('No schema files found in', SCHEMAS_DIR);
    process.exit(1);
  }

  console.log(`Found ${String(files.length)} schema files`);

  // Generate the TypeScript content
  const exports: string[] = [];
  const schemaMap: string[] = [];

  for (const file of files.sort()) {
    const filePath = join(SCHEMAS_DIR, file);
    const content = readFileSync(filePath, 'utf-8');
    const constName = toConstantName(file);
    const escapedContent = escapeTemplateString(content);

    exports.push(`export const ${constName} = \`${escapedContent}\`;`);
    schemaMap.push(`  '${file}': ${constName},`);

    console.log(`  ${file} -> ${constName} (${String(content.length)} bytes)`);
  }

  const output = `/**
 * Auto-generated schema constants
 *
 * DO NOT EDIT MANUALLY - Run "npm run generate:schemas" to regenerate
 *
 * Generated: ${new Date().toISOString()}
 */

${exports.join('\n\n')}

/**
 * Map of schema filenames to their content
 */
export const SCHEMAS: Record<string, string> = {
${schemaMap.join('\n')}
};

/**
 * Get schema content by filename
 */
export function getSchema(filename: string): string | undefined {
  return SCHEMAS[filename];
}
`;

  writeFileSync(OUTPUT_FILE, output, 'utf-8');
  console.log(`\nGenerated ${OUTPUT_FILE}`);
  console.log(`Total size: ${String(output.length)} bytes`);
}

main();
