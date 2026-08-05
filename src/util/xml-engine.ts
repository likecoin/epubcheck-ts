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

/** A document that is not well-formed, as reported by the parser. */
export interface XmlParseFailure {
  message: string;
  line?: number;
  /**
   * True when the failure happened before any markup was read, so not even the
   * root element exists. Java's SAX handler is left empty in this case, which
   * is why EPUBCheck reports the version as missing rather than continuing with
   * a partially parsed document.
   */
  nothingParsed: boolean;
}

/**
 * libxml2 messages raised before any markup is read — the byte stream could not
 * be decoded, or held no element at all.
 *
 * Matching on message text is unpleasant, but `ErrorDetail` carries no numeric
 * code, and recovery-mode parsing is no help either: libxml2-wasm inspects the
 * error list and throws even with `XML_PARSE_RECOVER`, so there is no partial
 * document to inspect for a root element.
 */
const NOTHING_PARSED_PATTERNS = [
  /^Document is empty/,
  /^Unsupported encoding/,
  /^Invalid encoding/,
  /doesn't match auto-detected/,
  /^Start tag expected/,
];

/**
 * Parse `data` for well-formedness only, mirroring how Java hands raw bytes to
 * SAX and lets it detect the encoding itself (XMLParser.java:141-165). Returns
 * undefined when the document is well-formed.
 */
export function checkXmlWellFormed(data: Uint8Array): XmlParseFailure | undefined {
  let doc: Libxml2.XmlDocument | undefined;
  try {
    doc = getXmlDocument().fromBuffer(data);
    return undefined;
  } catch (error) {
    const first = (error as Partial<Libxml2.XmlLibError>).details?.[0];
    const message = (first?.message ?? (error as Error).message).trim();
    return {
      message,
      ...(first ? { line: first.line } : {}),
      nothingParsed: NOTHING_PARSED_PATTERNS.some((pattern) => pattern.test(message)),
    };
  } finally {
    doc?.dispose();
  }
}
