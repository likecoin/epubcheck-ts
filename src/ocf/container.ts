import { MessageId, pushMessage } from '../messages/index.js';
import { parseAttributes, stripXmlComments } from '../opf/parser.js';
import type { ValidationContext, ValidationMessage } from '../types.js';

const OPF_MEDIA_TYPE = 'application/oebps-package+xml';

const FULL_PATH_ATTR = /\bfull-path\s*=\s*["']([^"']*)["']/;
const MEDIA_TYPE_ATTR = /\bmedia-type\s*=\s*["']([^"']*)["']/;

/**
 * Rendition selection attributes per EPUB Multiple-Rendition spec §3.
 * Mirrors ../epubcheck/src/main/resources/com/adobe/epubcheck/schema/30/multiple-renditions/container.rnc
 */
const RENDITION_SELECT_RE = /\brendition:(?:media|layout|language|accessMode|label)\s*=/;

/**
 * Parse container.xml content to extract rootfiles and set opfPath on the context.
 */
export function parseContainerContent(
  content: string,
  context: ValidationContext,
  fileExists: (path: string) => boolean,
  getFileContent?: (path: string) => string | undefined,
): void {
  const containerPath = 'META-INF/container.xml';
  const stripped = stripXmlComments(content);

  const opfRootfileTags: string[] = [];
  for (const tagMatch of stripped.matchAll(/<rootfile\b([^>]*?)\/?>/g)) {
    const attrs = tagMatch[1] ?? '';
    const fullPathMatch = FULL_PATH_ATTR.exec(attrs);
    const mediaTypeMatch = MEDIA_TYPE_ATTR.exec(attrs);

    if (!fullPathMatch) {
      pushMessage(context.messages, {
        id: MessageId.OPF_016,
        message: 'The "rootfile" element is missing the required "full-path" attribute.',
        location: { path: containerPath },
      });
      continue;
    }

    const path = fullPathMatch[1] ?? '';
    if (path.trim() === '') {
      pushMessage(context.messages, {
        id: MessageId.OPF_017,
        message: 'The "full-path" attribute on the "rootfile" element must not be empty.',
        location: { path: containerPath },
      });
      continue;
    }

    const mediaType = (mediaTypeMatch?.[1] ?? 'unknown').trim();
    context.rootfiles.push({ path, mediaType });
    if (mediaType === OPF_MEDIA_TYPE) {
      opfRootfileTags.push(attrs);
      context.opfPath ??= path;
    }
  }

  if (opfRootfileTags.length === 0) {
    pushMessage(context.messages, {
      id: MessageId.RSC_003,
      message: 'No Package Document is declared in the container.xml file.',
      location: { path: containerPath },
    });
  } else if (opfRootfileTags.length > 1 && context.version === '2.0') {
    pushMessage(context.messages, {
      id: MessageId.PKG_013,
      message: 'The EPUB 2 publication declares more than one Package Document.',
      location: { path: containerPath },
    });
  }

  // Mirrors ../epubcheck/src/main/java/com/adobe/epubcheck/ocf/OCFChecker.java:137
  if (opfRootfileTags.length > 1 && context.version !== '2.0') {
    if (!fileExists('META-INF/metadata.xml')) {
      pushMessage(context.messages, {
        id: MessageId.RSC_019,
        message: 'EPUBs with Multiple Renditions should contain a META-INF/metadata.xml file.',
        location: { path: containerPath },
      });
    } else if (getFileContent) {
      const metadataContent = getFileContent('META-INF/metadata.xml');
      if (metadataContent !== undefined) {
        const stripped2 = stripXmlComments(metadataContent);
        let modifiedCount = 0;
        for (const m of stripped2.matchAll(/<meta\b([^>]*?)\/?>/g)) {
          const attrs = parseAttributes(m[1] ?? '');
          if (attrs.property?.trim() === 'dcterms:modified') modifiedCount++;
        }
        if (modifiedCount !== 1) {
          pushMessage(context.messages, {
            id: MessageId.RSC_005,
            message:
              'A "dcterms:modified" meta element must occur exactly once in the multiple-renditions metadata.xml file.',
            location: { path: 'META-INF/metadata.xml' },
          });
        }
      }
    }
    // Skip the first rootfile (primary); each subsequent must declare a selection attribute.
    for (let i = 1; i < opfRootfileTags.length; i++) {
      const attrs = opfRootfileTags[i] ?? '';
      if (!RENDITION_SELECT_RE.test(attrs)) {
        pushMessage(context.messages, {
          id: MessageId.RSC_017,
          message:
            'At least one rendition selection attribute should be specified for each non-first rootfile element.',
          location: { path: containerPath },
        });
      }
    }

    // Container <link rel="mapping"> checks
    const mappingLinks: { href: string; mediaType: string }[] = [];
    for (const linkMatch of stripped.matchAll(/<link\b([^>]*?)\/?>/g)) {
      const lattrs = parseAttributes(linkMatch[1] ?? '');
      if (lattrs.rel !== 'mapping') continue;
      mappingLinks.push({ href: lattrs.href ?? '', mediaType: lattrs['media-type'] ?? '' });
    }
    if (mappingLinks.length > 1) {
      pushMessage(context.messages, {
        id: MessageId.RSC_005,
        message: 'The Container Document must not reference more than one mapping document.',
        location: { path: containerPath },
      });
    }
    for (const ml of mappingLinks) {
      if (ml.mediaType && ml.mediaType !== 'application/xhtml+xml') {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message: 'The media type of Rendition Mapping Documents must be "application/xhtml+xml".',
          location: { path: containerPath },
        });
      }
    }

    // Mapping document content checks (Java MappingDocumentChecker)
    if (getFileContent && mappingLinks.length === 1) {
      const ml = mappingLinks[0];
      if (ml?.href) {
        const mappingContent = getFileContent(ml.href);
        if (mappingContent !== undefined) {
          validateMappingDocumentContent(mappingContent, ml.href, context);
        }
      }
    }
  }

  for (const rootfile of context.rootfiles) {
    if (!fileExists(rootfile.path)) {
      pushMessage(context.messages, {
        id: MessageId.PKG_010,
        message: `Rootfile "${rootfile.path}" not found in EPUB`,
        location: { path: containerPath },
      });
    }
  }
}

/**
 * Mirrors ../epubcheck/src/main/java/com/adobe/epubcheck/multiplerenditions/MappingDocumentChecker.java
 * Validates the rendition mapping document referenced from container.xml.
 */
function validateMappingDocumentContent(
  xml: string,
  mappingPath: string,
  context: ValidationContext,
): void {
  const stripped = stripXmlComments(xml);

  let hasVersionMeta = false;
  for (const m of stripped.matchAll(/<meta\b([^>]*?)\/?>/g)) {
    const attrs = parseAttributes(m[1] ?? '');
    if (attrs.name === 'epub.multiple.renditions.version' && attrs.content === '1.0') {
      hasVersionMeta = true;
      break;
    }
  }
  if (!hasVersionMeta) {
    pushMessage(context.messages, {
      id: MessageId.RSC_005,
      message:
        'A meta tag with the name "epub.multiple.renditions.version" and value "1.0" is required in a Rendition Mapping Document.',
      location: { path: mappingPath },
    });
  }

  let resourceMapCount = 0;
  for (const navMatch of stripped.matchAll(/<nav\b([^>]*)>/g)) {
    const navAttrs = parseAttributes(navMatch[1] ?? '');
    const epubType = navAttrs['epub:type'];
    if (!epubType) {
      pushMessage(context.messages, {
        id: MessageId.RSC_005,
        message:
          'A nav element of a Rendition Mapping Document must identify its nature in an epub:type attribute.',
        location: { path: mappingPath },
      });
      continue;
    }
    if (epubType.split(/\s+/).includes('resource-map')) {
      resourceMapCount++;
    }
  }

  if (resourceMapCount !== 1) {
    pushMessage(context.messages, {
      id: MessageId.RSC_005,
      message: 'A Rendition Mapping Document must contain exactly one "resource-map" nav element.',
      location: { path: mappingPath },
    });
  }
}

/** Disallowed ASCII characters in EPUB filenames: " * : < > ? \ | */
const DISALLOWED_ASCII = new Set([0x22, 0x2a, 0x3a, 0x3c, 0x3e, 0x3f, 0x5c, 0x7c]);

/**
 * Validate a single filename for disallowed characters (PKG-009),
 * whitespace (PKG-010), trailing period (PKG-011), and non-ASCII (PKG-012).
 */
export function validateFilenameCharacters(path: string, messages: ValidationMessage[]): void {
  const filename = path.includes('/') ? (path.split('/').pop() ?? path) : path;

  if (filename === '' || filename === '.' || filename === '..') {
    pushMessage(messages, {
      id: MessageId.PKG_009,
      message: `Invalid filename: "${path}"`,
      location: { path },
    });
    return;
  }

  const disallowed: string[] = [];
  let hasSpaces = false;
  let hasNonASCII = false;

  for (let i = 0; i < filename.length; i++) {
    const code = filename.charCodeAt(i);

    if (DISALLOWED_ASCII.has(code)) {
      const char = filename[i] ?? '';
      disallowed.push(`U+${code.toString(16).toUpperCase().padStart(4, '0')} (${char})`);
    } else if (code <= 0x1f || code === 0x7f || (code >= 0x80 && code <= 0x9f)) {
      disallowed.push(`U+${code.toString(16).toUpperCase().padStart(4, '0')} (CONTROL)`);
    } else if (code >= 0xe000 && code <= 0xf8ff) {
      disallowed.push(`U+${code.toString(16).toUpperCase().padStart(4, '0')} (PRIVATE USE)`);
    } else if (code >= 0xfff0 && code <= 0xffff) {
      disallowed.push(`U+${code.toString(16).toUpperCase().padStart(4, '0')} (SPECIALS)`);
    }

    if (code > 0x7f) hasNonASCII = true;
    if (code === 0x20 || code === 0x09 || code === 0x0a || code === 0x0d) hasSpaces = true;
  }

  if (filename.endsWith('.')) {
    pushMessage(messages, {
      id: MessageId.PKG_011,
      message: `Filename must not end with a period: "${path}"`,
      location: { path },
    });
  }

  if (disallowed.length > 0) {
    pushMessage(messages, {
      id: MessageId.PKG_009,
      message: `Filename "${path}" contains disallowed characters: ${disallowed.join(', ')}`,
      location: { path },
    });
  }

  if (hasSpaces) {
    pushMessage(messages, {
      id: MessageId.PKG_010,
      message: `Filename "${path}" contains spaces`,
      location: { path },
      severityOverride: 'warning',
    });
  }

  if (hasNonASCII && disallowed.length === 0) {
    pushMessage(messages, {
      id: MessageId.PKG_012,
      message: `Filename "${path}" contains non-ASCII characters`,
      location: { path },
    });
  }
}

// Common full case folding mappings that toLowerCase doesn't handle
const CASE_FOLD_MAP: Record<string, string> = {
  '\u00DF': 'ss',
  '\u1E9E': 'ss',
  '\uFB00': 'ff',
  '\uFB01': 'fi',
  '\uFB02': 'fl',
  '\uFB03': 'ffi',
  '\uFB04': 'ffl',
  '\uFB05': 'st',
  '\uFB06': 'st',
  '\u0130': 'i\u0307',
};

/**
 * Apply Unicode Canonical Case Fold Normalization (NFD + full case folding).
 */
export function canonicalCaseFold(str: string): string {
  const nfd = str.normalize('NFD');
  let folded = '';
  for (const char of nfd) {
    folded += CASE_FOLD_MAP[char] ?? char.toLowerCase();
  }
  return folded;
}

/**
 * Check for duplicate filenames after Unicode normalization and case folding (OPF-060).
 * The `paths` iterable should yield file paths (not directory entries).
 */
export function validateDuplicateFilenames(
  paths: Iterable<string>,
  messages: ValidationMessage[],
): void {
  const normalizedPaths = new Map<string, string>();

  for (const path of paths) {
    const normalized = canonicalCaseFold(path);
    const existing = normalizedPaths.get(normalized);
    if (existing !== undefined) {
      pushMessage(messages, {
        id: MessageId.OPF_060,
        message: `Duplicate filename after Unicode normalization: "${path}" conflicts with "${existing}"`,
        location: { path },
      });
    } else {
      normalizedPaths.set(normalized, path);
    }
  }
}
