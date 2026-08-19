import type { EPUBVersion } from '../types.js';
import { createLineIndex } from '../util/location.js';
import type {
  Collection,
  DCElement,
  GuideReference,
  LinkElement,
  ManifestItem,
  MetaElement,
  PackageDocument,
  SpineItemRef,
} from './types.js';

/**
 * Parse an OPF package document from XML string
 *
 * This is a simple parser that extracts the essential information.
 * For full schema validation, use libxml2-wasm with RelaxNG/Schematron.
 */

/**
 * Result of peeking at a package document's version attribute.
 *
 * `undeclared` and `unreadable` are kept apart on purpose: a package element with
 * no version cannot be validated against any ruleset and stops the check, whereas
 * an unreadable document (wrong encoding, malformed XML, not an OPF at all) must
 * fall through so the normal pipeline can report why.
 */
export type OpfVersionPeek =
  | { kind: 'declared'; version: EPUBVersion }
  | { kind: 'undeclared' }
  | { kind: 'unreadable' };

/** Attributes declared on the `<package>` element. */
interface PackageAttributes {
  /** undefined when no version attribute is declared */
  version: EPUBVersion | undefined;
  uniqueIdentifier: string;
}

/**
 * Read `version` and `unique-identifier` off the package element.
 *
 * Attributes come from one match of the opening tag. Matching each attribute with
 * its own `<package…>` pattern instead lets the variable-length sections multiply,
 * which is what made an unclosed `<package` tag backtrack superlinearly.
 */
function matchPackageElement(xml: string): PackageAttributes {
  const attributes = extractElementAttributes(xml, 'package');
  const declaredVersion = attributes.version;

  return {
    version: declaredVersion ? normalizeVersion(declaredVersion) : undefined,
    uniqueIdentifier: attributes['unique-identifier'] ?? '',
  };
}

/**
 * Extract the declared version from a package document without parsing it fully.
 *
 * The publication version has to be known before the container stage can decide
 * which checks apply and whether validation can continue at all. Java does the
 * same with PackageDocumentPeeker, ahead of any OPF checking.
 */
export function peekOpfVersion(xml: string): OpfVersionPeek {
  const { version } = matchPackageElement(xml);
  if (version) return { kind: 'declared', version };
  return /<package[\s>]/.test(xml) ? { kind: 'undeclared' } : { kind: 'unreadable' };
}

export function parseOPF(xml: string): PackageDocument {
  const packageAttrs = matchPackageElement(xml);
  const versionDeclared = packageAttrs.version !== undefined;
  const version: EPUBVersion = packageAttrs.version ?? '3.0';
  const uniqueIdentifier = packageAttrs.uniqueIdentifier;

  const nsRegex = /<package[^>]*\sxmlns=["']([^"']+)["']/;
  const isLegacyOebps12 =
    nsRegex.exec(xml)?.[1] === 'http://openebook.org/namespaces/oeb-package/1.0/';

  // Extract prefix declarations (EPUB 3)
  const prefixes = parsePrefixes(xml);

  // Extract dir attribute
  const dirRegex = /<package[^>]*\sdir=["']([^"']+)["']/;
  const dirMatch = dirRegex.exec(xml);

  // Offsets recorded by the section parsers are resolved against the original
  // document, so reported locations point at real source lines.
  const lineOf = createLineIndex(xml);

  // Parse metadata
  const metadataSection = extractSection(xml, 'metadata');
  const dcElements = parseDCElements(metadataSection, lineOf);
  const metaElements = parseMetaElements(metadataSection, lineOf);
  const linkElements = parseLinkElements(metadataSection, lineOf);

  // Parse manifest
  const manifestSection = extractSection(xml, 'manifest');
  const manifest = parseManifestItems(manifestSection, lineOf);

  // Parse spine
  const spineSection = extractSection(xml, 'spine');
  const spineAttrs = extractElementAttributes(xml, 'spine');
  const spineResult = parseSpine(spineSection, spineAttrs, lineOf);

  // Parse guide (EPUB 2)
  const guideSection = extractSection(xml, 'guide');
  const guide = parseGuide(guideSection.content);

  // Parse collections (EPUB 3)
  const collections = parseCollections(xml);

  // Detect bindings element (deprecated in EPUB 3.3)
  const hasBindings = /<bindings[\s>]/.test(xml);

  // Extract xml:lang attributes from OPF elements
  const xmlLangs: string[] = [];
  const xmlLangRegex = /xml:lang=["']([^"']*?)["']/g;
  let langMatch;
  while ((langMatch = xmlLangRegex.exec(xml)) !== null) {
    if (langMatch[1] !== undefined) {
      xmlLangs.push(langMatch[1]);
    }
  }

  // Build result with proper optional property handling
  const result: PackageDocument = {
    version,
    uniqueIdentifier,
    dcElements,
    metaElements,
    linkElements,
    manifest,
    spine: spineResult.spine,
    guide,
    collections,
  };

  // Only add optional properties if they have values
  if (!versionDeclared) {
    result.versionDeclared = false;
  }
  if (isLegacyOebps12) {
    result.isLegacyOebps12 = true;
  }
  if (Object.keys(prefixes).length > 0) {
    result.prefixes = prefixes;
  }
  if (dirMatch?.[1]) {
    result.dir = dirMatch[1];
  }
  if (spineResult.toc) {
    result.spineToc = spineResult.toc;
  }
  if (spineResult.pageProgressionDirection) {
    result.pageProgressionDirection = spineResult.pageProgressionDirection;
  }
  if (hasBindings) {
    result.hasBindings = true;
  }
  if (xmlLangs.length > 0) {
    result.xmlLangs = xmlLangs;
  }

  return result;
}

/**
 * Normalize EPUB version string to supported version
 */
function normalizeVersion(versionStr: string): EPUBVersion {
  const v = versionStr.trim();
  if (v === '2.0' || v === '2') return '2.0';
  if (v === '3.0' || v === '3') return '3.0';
  if (v === '3.1') return '3.1';
  if (v === '3.2') return '3.2';
  if (v === '3.3') return '3.3';
  // Default to 3.0 for unknown versions
  return '3.0';
}

/**
 * Parse prefix declarations from package element
 */
function parsePrefixes(xml: string): Record<string, string> {
  const prefixes: Record<string, string> = {};
  const prefixRegex = /<package[^>]*\sprefix=["']([^"']+)["']/;
  const prefixMatch = prefixRegex.exec(xml);
  if (prefixMatch?.[1]) {
    const prefixStr = prefixMatch[1];
    // Format: "prefix: uri prefix2: uri2"
    const parts = prefixStr.split(/\s+/);
    for (let i = 0; i < parts.length - 1; i += 2) {
      const prefix = parts[i]?.replace(/:$/, '');
      const uri = parts[i + 1];
      if (prefix && uri) {
        prefixes[prefix] = uri;
      }
    }
  }
  return prefixes;
}

const XML_COMMENT = /<!--[\s\S]*?-->/g;

export function stripXmlComments(xml: string): string {
  return xml.replace(XML_COMMENT, '');
}

/**
 * Blank out XML comments, preserving every character offset and line break.
 *
 * Unlike {@link stripXmlComments} this keeps the document the same length, so
 * offsets taken from the result still map onto the original source. That is what
 * lets the section parsers below report real line numbers.
 */
function blankXmlComments(xml: string): string {
  return xml.replace(XML_COMMENT, (comment) => comment.replace(/[^\n]/g, ' '));
}

/** A section of the package document, with its offset in the original source. */
interface Section {
  content: string;
  /** Offset of `content` within the full document */
  offset: number;
}

/** Maps a character offset in the package document to a 1-based line number. */
type LineLookup = (offset: number) => number;

/**
 * Extract a section from XML by tag name (returns content between tags)
 *
 * Comments are blanked rather than removed so that `offset` stays meaningful.
 */
function extractSection(xml: string, tagName: string): Section {
  // Handle both prefixed and non-prefixed tags. The opening tag is captured so the
  // content's offset can be derived without searching for it.
  const regex = new RegExp(`<((?:opf:)?${tagName}[^>]*)>([\\s\\S]*?)</(?:opf:)?${tagName}>`, 'i');
  const match = regex.exec(xml);
  const openTag = match?.[1];
  const content = match?.[2];
  if (match === null || openTag === undefined || content === undefined) {
    return { content: '', offset: 0 };
  }
  // '<' + openTag + '>'
  return { content: blankXmlComments(content), offset: match.index + openTag.length + 2 };
}

/**
 * Extract an element's opening tag attributes
 */
function extractElementAttributes(xml: string, tagName: string): Record<string, string> {
  // Match the opening tag with its attributes
  const regex = new RegExp(`<(?:opf:)?${tagName}([^>]*)>`, 'i');
  const match = regex.exec(xml);
  if (match?.[1]) {
    return parseAttributes(match[1]);
  }
  return {};
}

/**
 * Parse Dublin Core metadata elements
 */
function parseDCElements(metadata: Section, lineOf: LineLookup): DCElement[] {
  const elements: DCElement[] = [];

  // Match dc: prefixed elements
  const dcRegex = /<dc:(\w+)([^>]*)>([^<]*)<\/dc:\1>/g;
  let match;
  while ((match = dcRegex.exec(metadata.content)) !== null) {
    const name = match[1];
    const attrsStr = match[2] ?? '';
    const value = match[3] ?? '';

    if (!name) continue;

    const attrs = parseAttributes(attrsStr);
    const id = attrs.id;
    delete attrs.id;

    const element: DCElement = {
      name,
      value: decodeXmlEntities(value.trim()),
      line: lineOf(metadata.offset + match.index),
    };

    if (id) {
      element.id = id.trim();
    }
    if (Object.keys(attrs).length > 0) {
      element.attributes = attrs;
    }

    elements.push(element);
  }

  return elements;
}

/**
 * Parse EPUB 3 meta elements
 */
function parseMetaElements(metadata: Section, lineOf: LineLookup): MetaElement[] {
  const elements: MetaElement[] = [];

  // <meta> may carry a namespace prefix (e.g. <opf:meta>) when the OPF
  // namespace is bound to "opf" on the root; both forms are the same element.
  const metaRegex =
    /<(?:[A-Za-z_][\w.-]*:)?meta([^>]*property=["'][^"']+["'][^>]*)>([^<]*)<\/(?:[A-Za-z_][\w.-]*:)?meta>/g;
  let match;
  while ((match = metaRegex.exec(metadata.content)) !== null) {
    const attrsStr = match[1] ?? '';
    const value = match[2] ?? '';
    const attrs = parseAttributes(attrsStr);
    const property = attrs.property;

    if (property) {
      const element: MetaElement = {
        property,
        value: decodeXmlEntities(value.trim()),
        line: lineOf(metadata.offset + match.index),
      };

      if (attrs.refines) {
        element.refines = attrs.refines;
      }
      if (attrs.scheme) {
        element.scheme = attrs.scheme;
      }
      if (attrs.id) {
        element.id = attrs.id.trim();
      }

      elements.push(element);
    }
  }

  return elements;
}

/**
 * Parse EPUB 3 link elements
 */
function parseLinkElements(metadata: Section, lineOf: LineLookup): LinkElement[] {
  const elements: LinkElement[] = [];

  // Match <link rel="..." href="..." />
  const linkRegex = /<link([^>]+)\/?\s*>/g;
  let match;
  while ((match = linkRegex.exec(metadata.content)) !== null) {
    const attrsStr = match[1] ?? '';
    const attrs = parseAttributes(attrsStr);
    const rel = attrs.rel;
    const href = attrs.href;

    if (rel && href) {
      const element: LinkElement = {
        rel,
        href,
        line: lineOf(metadata.offset + match.index),
      };

      if (attrs['media-type']) {
        element.mediaType = attrs['media-type'];
      }
      if (attrs.refines) {
        element.refines = attrs.refines;
      }
      if (attrs.properties) {
        element.properties = attrs.properties.split(/\s+/);
      }
      if (attrs.id) {
        element.id = attrs.id.trim();
      }
      if (attrs.hreflang !== undefined) {
        element.hreflang = attrs.hreflang;
      }

      elements.push(element);
    }
  }

  return elements;
}

/**
 * Parse manifest items
 */
function parseManifestItems(manifest: Section, lineOf: LineLookup): ManifestItem[] {
  const items: ManifestItem[] = [];

  // Match <item ... />
  const itemRegex = /<item([^>]+)\/?\s*>/g;
  let match;
  while ((match = itemRegex.exec(manifest.content)) !== null) {
    const attrsStr = match[1] ?? '';
    const attrs = parseAttributes(attrsStr);
    const id = attrs.id?.trim();
    const href = attrs.href;
    const mediaType = attrs['media-type'];

    if (id && href && mediaType) {
      const item: ManifestItem = {
        id,
        href: decodeXmlEntities(href),
        mediaType,
        line: lineOf(manifest.offset + match.index),
      };

      if (attrs.fallback) {
        item.fallback = attrs.fallback;
      }
      if (attrs['fallback-style']) {
        item.fallbackStyle = attrs['fallback-style'];
      }
      if (attrs['media-overlay']) {
        item.mediaOverlay = attrs['media-overlay'];
      }
      if (attrs.properties) {
        item.properties = attrs.properties.split(/\s+/);
      }

      items.push(item);
    }
  }

  return items;
}

/**
 * Parse spine element and itemrefs
 */
function parseSpine(
  spineSection: Section,
  spineAttrs: Record<string, string>,
  lineOf: LineLookup,
): {
  spine: SpineItemRef[];
  toc: string | null;
  pageProgressionDirection: 'ltr' | 'rtl' | 'default' | null;
} {
  const spine: SpineItemRef[] = [];

  // Use the passed-in attributes from the spine element
  const toc = spineAttrs.toc ?? null;
  const ppdRaw = spineAttrs['page-progression-direction'];
  const ppd: 'ltr' | 'rtl' | 'default' | null =
    ppdRaw === 'ltr' || ppdRaw === 'rtl' || ppdRaw === 'default' ? ppdRaw : null;

  // Match <itemref ... />
  const itemrefRegex = /<itemref([^>]+)\/?\s*>/g;
  let match;
  while ((match = itemrefRegex.exec(spineSection.content)) !== null) {
    const attrsStr = match[1] ?? '';
    const attrs = parseAttributes(attrsStr);
    const idref = attrs.idref?.trim();

    if (idref) {
      const itemref: SpineItemRef = {
        idref,
        linear: attrs.linear !== 'no',
        line: lineOf(spineSection.offset + match.index),
      };

      if (attrs.id) {
        itemref.id = attrs.id.trim();
      }

      if (attrs.properties) {
        itemref.properties = attrs.properties.split(/\s+/);
      }

      spine.push(itemref);
    }
  }

  return { spine, toc, pageProgressionDirection: ppd };
}

/**
 * Parse guide references (EPUB 2)
 */
function parseGuide(guideXml: string): GuideReference[] {
  const references: GuideReference[] = [];

  // Match <reference ... />
  const refRegex = /<reference([^>]+)\/?\s*>/g;
  let match;
  while ((match = refRegex.exec(guideXml)) !== null) {
    const attrsStr = match[1] ?? '';
    const attrs = parseAttributes(attrsStr);
    const type = attrs.type;
    const href = attrs.href;

    if (type && href) {
      const ref: GuideReference = {
        type,
        href: decodeXmlEntities(href),
      };

      if (attrs.title) {
        ref.title = attrs.title;
      }

      references.push(ref);
    }
  }

  return references;
}

/**
 * Parse XML attributes from a string
 */
export function parseAttributes(attrsStr: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRegex = /(\S+?)\s*=\s*["']([^"']*)["']/g;
  let match;
  while ((match = attrRegex.exec(attrsStr)) !== null) {
    const name = match[1];
    const value = match[2];
    if (name !== undefined && value !== undefined) {
      attrs[name] = value;
      // Also store by local name for convenience
      const colonIdx = name.indexOf(':');
      if (colonIdx >= 0) {
        const localName = name.slice(colonIdx + 1);
        if (!(localName in attrs)) {
          attrs[localName] = value;
        }
      }
    }
  }
  return attrs;
}

/**
 * Decode common XML entities
 */
function decodeXmlEntities(str: string): string {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"');
}

// Only these roles need innerXml captured for later content inspection
// (distributable-object metadata requires dc:identifier scanning).
const ROLES_NEEDING_INNER_XML = new Set(['distributable-object', 'dictionary']);

function parseCollections(xml: string): Collection[] {
  if (!xml.includes('<collection')) return [];

  // Strip XML comments to avoid parsing commented-out elements
  const stripped = stripXmlComments(xml);

  // Walk <collection> open/close tags in document order, building a tree
  // based on nesting depth. Links attach to the innermost currently-open
  // collection only (not to parents).
  const tokenRegex = /<collection(\s[^>]*)?>|<\/collection\s*>|<link(\s[^>]*?)\/?>/g;
  const stack: { collection: Collection; contentStart: number }[] = [];
  const roots: Collection[] = [];

  for (const match of stripped.matchAll(tokenRegex)) {
    const text = match[0];
    const matchIndex = match.index;
    if (text.startsWith('</collection')) {
      const frame = stack.pop();
      if (frame && ROLES_NEEDING_INNER_XML.has(frame.collection.role)) {
        frame.collection.innerXml = stripped.slice(frame.contentStart, matchIndex);
      }
      continue;
    }
    if (text.startsWith('<collection')) {
      const attrs = match[1] ?? '';
      const role = /\brole=["']([^"']+)["']/.exec(attrs)?.[1];
      if (!role) continue;
      const collection: Collection = { role, links: [], children: [] };
      const idValue = /\bid=["']([^"']+)["']/.exec(attrs)?.[1];
      if (idValue) collection.id = idValue;
      const nameValue = /\bname=["']([^"']+)["']/.exec(attrs)?.[1];
      if (nameValue) collection.name = nameValue;
      const parent = stack[stack.length - 1];
      if (parent) {
        parent.collection.children.push(collection);
      } else {
        roots.push(collection);
      }
      stack.push({ collection, contentStart: matchIndex + text.length });
      continue;
    }
    const top = stack[stack.length - 1];
    if (!top) continue;
    const href = /\bhref=["']([^"']+)["']/.exec(match[2] ?? '')?.[1];
    if (href) {
      top.collection.links.push(decodeXmlEntities(href));
    }
  }

  return roots;
}
