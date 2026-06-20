/**
 * Lazy loader for libxml2-wasm.
 *
 * libxml2-wasm is ESM-only and uses a top-level await to instantiate its WASM
 * module. A static `import` of it makes every importing module a top-level-await
 * module, which (a) propagates async-ness through the whole graph and (b) makes
 * the CJS build do a synchronous `require('libxml2-wasm')` that throws
 * `ERR_REQUIRE_ASYNC_MODULE` (and, under bundlers like webpack, silently yields
 * a partial namespace where `XmlDocument` is undefined).
 *
 * Loading it via a deferred `await import()` instead keeps our entry points
 * synchronously importable from both ESM and CJS. The async entry points call
 * `loadXmlEngine()` once before any parsing; the synchronous validators then
 * reach the engine through `getXmlDocument()`.
 */
import type * as Libxml2 from 'libxml2-wasm';

let engine: typeof Libxml2 | undefined;

/**
 * Load and cache the libxml2-wasm module. Idempotent — safe to call from every
 * entry point. Must resolve before any synchronous use of `getXmlDocument()`.
 */
export async function loadXmlEngine(): Promise<void> {
  engine ??= await import('libxml2-wasm');
}

/**
 * Synchronous accessor for `XmlDocument`. Throws if `loadXmlEngine()` has not
 * resolved yet, which would indicate a parsing path that bypassed the async
 * entry-point initialization.
 */
export function getXmlDocument(): typeof Libxml2.XmlDocument {
  if (!engine) {
    throw new Error('libxml2-wasm not initialized — call loadXmlEngine() first');
  }
  return engine.XmlDocument;
}

/**
 * Synchronous accessor for the `XmlElement` constructor, needed for `instanceof`
 * checks. Throws if `loadXmlEngine()` has not resolved yet.
 */
export function getXmlElement(): typeof Libxml2.XmlElement {
  if (!engine) {
    throw new Error('libxml2-wasm not initialized — call loadXmlEngine() first');
  }
  return engine.XmlElement;
}
