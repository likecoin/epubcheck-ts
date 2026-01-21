#!/usr/bin/env npx tsx
/**
 * Inline RNG includes to create self-contained schema files
 *
 * This script resolves all <include href="..."> elements in RelaxNG XML schemas
 * and inlines their content, producing standalone schema files.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Parse XML to find include elements and their hrefs
 * Returns array of {start, end, href} for each include
 */
function findIncludes(xml: string): { start: number; end: number; href: string }[] {
  const includes: { start: number; end: number; href: string }[] = [];

  // Match self-closing includes: <include href="..."/>
  const selfClosingRegex = /<include\s+href=["']([^"']+)["']\s*\/>/g;
  let match;
  while ((match = selfClosingRegex.exec(xml)) !== null) {
    includes.push({
      start: match.index,
      end: match.index + match[0].length,
      href: match[1] ?? '',
    });
  }

  // Match includes with content: <include href="...">...</include>
  const withContentRegex = /<include\s+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/include>/g;
  while ((match = withContentRegex.exec(xml)) !== null) {
    includes.push({
      start: match.index,
      end: match.index + match[0].length,
      href: match[1] ?? '',
    });
  }

  // Sort by position (in reverse for easier replacement)
  return includes.sort((a, b) => b.start - a.start);
}

/**
 * Extract content from inside <grammar> tags
 */
function extractGrammarContent(xml: string): string {
  // Remove XML declaration
  xml = xml.replace(/<\?xml[^?]*\?>\s*/g, '');

  // Extract content inside grammar element
  const grammarRegex = /<grammar[^>]*>([\s\S]*)<\/grammar>/;
  const grammarMatch = grammarRegex.exec(xml);
  if (grammarMatch?.[1]) {
    return grammarMatch[1];
  }

  return xml;
}

/**
 * Add datatypeLibrary to grammar if missing
 */
function ensureDatatypeLibrary(xml: string): string {
  if (xml.includes('datatypeLibrary=')) {
    return xml;
  }
  return xml.replace(
    /<grammar\s/,
    '<grammar datatypeLibrary="http://www.w3.org/2001/XMLSchema-datatypes" ',
  );
}

/**
 * Recursively inline all includes
 */
function inlineIncludes(filePath: string, processedFiles = new Set<string>()): string {
  const absolutePath = resolve(filePath);

  if (processedFiles.has(absolutePath)) {
    console.warn(`  Warning: Circular include detected: ${filePath}`);
    return '';
  }
  processedFiles.add(absolutePath);

  if (!existsSync(absolutePath)) {
    console.warn(`  Warning: Include file not found: ${filePath}`);
    return '';
  }

  let xml = readFileSync(absolutePath, 'utf-8');
  const baseDir = dirname(absolutePath);

  // Find all includes
  const includes = findIncludes(xml);

  // Process in reverse order to preserve positions
  for (const include of includes) {
    const includePath = join(baseDir, include.href);
    console.log(`    Including: ${include.href}`);

    // Recursively process the included file
    const includedXml = inlineIncludes(includePath, new Set(processedFiles));
    const content = extractGrammarContent(includedXml);

    // Replace the include with the content
    const before = xml.substring(0, include.start);
    const after = xml.substring(include.end);
    xml = `${before}\n<!-- Inlined from ${include.href} -->\n${content}\n${after}`;
  }

  return xml;
}

/**
 * Process a schema file
 */
function processSchema(inputPath: string, outputPath: string): void {
  console.log(`Processing: ${inputPath}`);
  let inlined = inlineIncludes(inputPath);
  inlined = ensureDatatypeLibrary(inlined);
  writeFileSync(outputPath, inlined);
  console.log(`  Output: ${outputPath}`);
}

// Main execution
const schemasDir = join(__dirname, '..', 'schemas');

// List of main schema files to process
const mainSchemas = [
  'package-30.rng',
  'epub-nav-30.rng',
  'epub-xhtml-30.rng',
  'epub-svg-30.rng',
  'ocf-container-30.rng',
];

console.log('Inlining RNG includes...\n');

for (const schema of mainSchemas) {
  const inputPath = join(schemasDir, schema);
  if (existsSync(inputPath)) {
    processSchema(inputPath, inputPath);
  } else {
    console.warn(`Schema not found: ${schema}`);
  }
}

console.log('\nDone!');
