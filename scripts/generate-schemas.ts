#!/usr/bin/env npx tsx
/**
 * Generate schemas.generated.ts from schema files
 *
 * This script reads all schema files from the schemas/ directory and generates
 * a TypeScript module that exports them as compressed base64 strings. Schemas
 * are decompressed lazily at runtime on first access.
 *
 * Uses gzip compression via fflate (already a dependency) for good compression
 * ratio with fast decompression.
 *
 * Usage: npx tsx scripts/generate-schemas.ts
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { gzipSync } from 'fflate';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '..');
const SCHEMAS_DIR = join(ROOT_DIR, 'schemas');
const OUTPUT_FILE = join(ROOT_DIR, 'src', 'schema', 'schemas.generated.ts');

// Schema file extensions to process
const SCHEMA_EXTENSIONS = ['.rng', '.rnc', '.sch', '.xsd'];

/**
 * Compress and base64-encode a string
 */
function compressToBase64(content: string): string {
  const data = new TextEncoder().encode(content);
  // Use maximum compression level (9)
  const compressed = gzipSync(data, { level: 9 });
  // Convert to base64
  return Buffer.from(compressed).toString('base64');
}

function main(): void {
  console.log('Generating schemas.generated.ts (compressed)...');

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
  const compressedData: string[] = [];
  let totalOriginal = 0;
  let totalCompressed = 0;

  for (const file of files.sort()) {
    const filePath = join(SCHEMAS_DIR, file);
    const content = readFileSync(filePath, 'utf-8');
    const compressed = compressToBase64(content);

    compressedData.push(`  '${file}': '${compressed}',`);

    const originalSize = Buffer.byteLength(content, 'utf-8');
    const compressedSize = compressed.length;
    totalOriginal += originalSize;
    totalCompressed += compressedSize;

    const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
    console.log(
      `  ${file}: ${String(originalSize)} -> ${String(compressedSize)} bytes (${ratio}% reduction)`,
    );
  }

  const output = `/**
 * Auto-generated compressed schema constants
 *
 * DO NOT EDIT MANUALLY - Run "npm run generate:schemas" to regenerate
 *
 * Schemas are gzip-compressed and base64-encoded. They are decompressed
 * lazily on first access for optimal bundle size with fast runtime access.
 *
 * Generated: ${new Date().toISOString()}
 */

import { gunzipSync, strFromU8 } from 'fflate';

/**
 * Base64-encoded gzip-compressed schema data
 */
const COMPRESSED_SCHEMAS: Record<string, string> = {
${compressedData.join('\n')}
};

/**
 * Cache for decompressed schemas
 */
const schemaCache = new Map<string, string>();

/**
 * Decode base64 string to Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  // Use atob for browser compatibility, Buffer for Node.js
  if (typeof atob === 'function') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

/**
 * Decompress a schema from its compressed form
 */
function decompressSchema(compressed: string): string {
  const data = base64ToUint8Array(compressed);
  const decompressed = gunzipSync(data);
  return strFromU8(decompressed);
}

/**
 * Get schema content by filename (decompresses lazily on first access)
 */
export function getSchema(filename: string): string | undefined {
  // Check cache first
  const cached = schemaCache.get(filename);
  if (cached !== undefined) {
    return cached;
  }

  // Get compressed data
  const compressed = COMPRESSED_SCHEMAS[filename];
  if (compressed === undefined) {
    return undefined;
  }

  // Decompress and cache
  const schema = decompressSchema(compressed);
  schemaCache.set(filename, schema);
  return schema;
}

/**
 * Get list of available schema filenames
 */
export function getSchemaNames(): string[] {
  return Object.keys(COMPRESSED_SCHEMAS);
}

/**
 * Preload all schemas into cache (useful if you need all schemas upfront)
 */
export function preloadSchemas(): void {
  for (const filename of Object.keys(COMPRESSED_SCHEMAS)) {
    getSchema(filename);
  }
}
`;

  writeFileSync(OUTPUT_FILE, output, 'utf-8');

  const overallRatio = ((1 - totalCompressed / totalOriginal) * 100).toFixed(1);
  console.log(`\nGenerated ${OUTPUT_FILE}`);
  console.log(`Original total: ${String(totalOriginal)} bytes`);
  console.log(`Compressed total: ${String(totalCompressed)} bytes (${overallRatio}% reduction)`);
  console.log(`Output file size: ${String(output.length)} bytes`);
}

main();
