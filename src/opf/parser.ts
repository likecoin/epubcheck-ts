import type { EPUBVersion } from '../types.js';
import type {
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
export function parseOPF(xml: string): PackageDocument {
  // Extract package element attributes
  const packageRegex =
    /<package[^>]*\sversion=["']([^"']+)["'][^>]*(?:\sunique-identifier=["']([^"']+)["'])?[^>]*>/;
  const packageRegexAlt =
    /<package[^>]*\sunique-identifier=["']([^"']+)["'][^>]*(?:\sversion=["']([^"']+)["'])?[^>]*>/;
  const packageMatch = packageRegex.exec(xml);
  const packageMatchAlt = packageRegexAlt.exec(xml);

  let version: EPUBVersion = '3.0';
  let uniqueIdentifier = '';

  if (packageMatch?.[1]) {
    version = normalizeVersion(packageMatch[1]);
    uniqueIdentifier = packageMatch[2] ?? '';
  }
  if (!uniqueIdentifier && packageMatchAlt?.[1]) {
    uniqueIdentifier = packageMatchAlt[1];
    if (!packageMatch) {
      version = normalizeVersion(packageMatchAlt[2] ?? '3.0');
    }
  }

  // Extract prefix declarations (EPUB 3)
  const prefixes = parsePrefixes(xml);

  // Extract dir attribute
  const dirRegex = /<package[^>]*\sdir=["']([^"']+)["']/;
  const dirMatch = dirRegex.exec(xml);

  // Parse metadata
  const metadataSection = extractSection(xml, 'metadata');
  const dcElements = parseDCElements(metadataSection);
  const metaElements = parseMetaElements(metadataSection);
  const linkElements = parseLinkElements(metadataSection);

  // Parse manifest
  const manifestSection = extractSection(xml, 'manifest');
  const manifest = parseManifestItems(manifestSection);

  // Parse spine
  const spineSection = extractSection(xml, 'spine');
  const spineResult = parseSpine(spineSection);

  // Parse guide (EPUB 2)
  const guideSection = extractSection(xml, 'guide');
  const guide = parseGuide(guideSection);

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
  };

  // Only add optional properties if they have values
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

/**
 * Extract a section from XML by tag name
 */
function extractSection(xml: string, tagName: string): string {
  // Handle both prefixed and non-prefixed tags
  const regex = new RegExp(`<(?:opf:)?${tagName}[^>]*>([\\s\\S]*?)</(?:opf:)?${tagName}>`, 'i');
  const match = xml.match(regex);
  return match?.[1] ?? '';
}

/**
 * Parse Dublin Core metadata elements
 */
function parseDCElements(metadataXml: string): DCElement[] {
  const elements: DCElement[] = [];

  // Match dc: prefixed elements
  const dcRegex = /<dc:(\w+)([^>]*)>([^<]*)<\/dc:\1>/g;
  let match;
  while ((match = dcRegex.exec(metadataXml)) !== null) {
    const name = match[1];
    const attrsStr = match[2] ?? '';
    const value = match[3] ?? '';

    if (!name) continue;

    const attrs = parseAttributes(attrsStr);
    const id = attrs['id'];
    delete attrs['id'];

    const element: DCElement = {
      name,
      value: decodeXmlEntities(value.trim()),
    };

    if (id) {
      element.id = id;
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
function parseMetaElements(metadataXml: string): MetaElement[] {
  const elements: MetaElement[] = [];

  // Match <meta property="...">value</meta> (EPUB 3)
  const metaRegex = /<meta([^>]*property=["'][^"']+["'][^>]*)>([^<]*)<\/meta>/g;
  let match;
  while ((match = metaRegex.exec(metadataXml)) !== null) {
    const attrsStr = match[1] ?? '';
    const value = match[2] ?? '';
    const attrs = parseAttributes(attrsStr);
    const property = attrs['property'];

    if (property) {
      const element: MetaElement = {
        property,
        value: decodeXmlEntities(value.trim()),
      };

      if (attrs['refines']) {
        element.refines = attrs['refines'];
      }
      if (attrs['scheme']) {
        element.scheme = attrs['scheme'];
      }
      if (attrs['id']) {
        element.id = attrs['id'];
      }

      elements.push(element);
    }
  }

  return elements;
}

/**
 * Parse EPUB 3 link elements
 */
function parseLinkElements(metadataXml: string): LinkElement[] {
  const elements: LinkElement[] = [];

  // Match <link rel="..." href="..." />
  const linkRegex = /<link([^>]+)\/?\s*>/g;
  let match;
  while ((match = linkRegex.exec(metadataXml)) !== null) {
    const attrsStr = match[1] ?? '';
    const attrs = parseAttributes(attrsStr);
    const rel = attrs['rel'];
    const href = attrs['href'];

    if (rel && href) {
      const element: LinkElement = {
        rel,
        href,
      };

      if (attrs['media-type']) {
        element.mediaType = attrs['media-type'];
      }
      if (attrs['refines']) {
        element.refines = attrs['refines'];
      }
      if (attrs['properties']) {
        element.properties = attrs['properties'].split(/\s+/);
      }
      if (attrs['id']) {
        element.id = attrs['id'];
      }

      elements.push(element);
    }
  }

  return elements;
}

/**
 * Parse manifest items
 */
function parseManifestItems(manifestXml: string): ManifestItem[] {
  const items: ManifestItem[] = [];

  // Match <item ... />
  const itemRegex = /<item([^>]+)\/?\s*>/g;
  let match;
  while ((match = itemRegex.exec(manifestXml)) !== null) {
    const attrsStr = match[1] ?? '';
    const attrs = parseAttributes(attrsStr);
    const id = attrs['id'];
    const href = attrs['href'];
    const mediaType = attrs['media-type'];

    if (id && href && mediaType) {
      const item: ManifestItem = {
        id,
        href: decodeXmlEntities(href),
        mediaType,
      };

      if (attrs['fallback']) {
        item.fallback = attrs['fallback'];
      }
      if (attrs['media-overlay']) {
        item.mediaOverlay = attrs['media-overlay'];
      }
      if (attrs['properties']) {
        item.properties = attrs['properties'].split(/\s+/);
      }

      items.push(item);
    }
  }

  return items;
}

/**
 * Parse spine element and itemrefs
 */
function parseSpine(spineXml: string): {
  spine: SpineItemRef[];
  toc: string | null;
  pageProgressionDirection: 'ltr' | 'rtl' | 'default' | null;
} {
  const spine: SpineItemRef[] = [];

  // Extract spine attributes from the opening tag
  const spineOpenRegex = /^([^>]*)/;
  const spineOpenMatch = spineOpenRegex.exec(spineXml);
  const spineAttrs = spineOpenMatch?.[1] ? parseAttributes(spineOpenMatch[1]) : {};
  const toc = spineAttrs['toc'] ?? null;
  const ppdRaw = spineAttrs['page-progression-direction'];
  const ppd: 'ltr' | 'rtl' | 'default' | null =
    ppdRaw === 'ltr' || ppdRaw === 'rtl' || ppdRaw === 'default' ? ppdRaw : null;

  // Match <itemref ... />
  const itemrefRegex = /<itemref([^>]+)\/?\s*>/g;
  let match;
  while ((match = itemrefRegex.exec(spineXml)) !== null) {
    const attrsStr = match[1] ?? '';
    const attrs = parseAttributes(attrsStr);
    const idref = attrs['idref'];

    if (idref) {
      const itemref: SpineItemRef = {
        idref,
        linear: attrs['linear'] !== 'no',
      };

      if (attrs['properties']) {
        itemref.properties = attrs['properties'].split(/\s+/);
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
    const type = attrs['type'];
    const href = attrs['href'];

    if (type && href) {
      const ref: GuideReference = {
        type,
        href: decodeXmlEntities(href),
      };

      if (attrs['title']) {
        ref.title = attrs['title'];
      }

      references.push(ref);
    }
  }

  return references;
}

/**
 * Parse XML attributes from a string
 */
function parseAttributes(attrsStr: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRegex = /(\S+)=["']([^"']*)["']/g;
  let match;
  while ((match = attrRegex.exec(attrsStr)) !== null) {
    const name = match[1];
    const value = match[2];
    if (name !== undefined && value !== undefined) {
      // Remove namespace prefix for common attributes
      const colonIdx = name.indexOf(':');
      const localName = colonIdx >= 0 ? name.slice(colonIdx + 1) : name;
      attrs[localName] = value;
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
