import { MessageId, pushMessage } from '../messages/index.js';
import { stripXmlComments } from '../opf/parser.js';
import type { ValidationContext, ValidationMessage } from '../types.js';

const OPF_MEDIA_TYPE = 'application/oebps-package+xml';

const FULL_PATH_ATTR = /\bfull-path\s*=\s*["']([^"']*)["']/;
const MEDIA_TYPE_ATTR = /\bmedia-type\s*=\s*["']([^"']*)["']/;

/**
 * Parse container.xml content to extract rootfiles and set opfPath on the context.
 */
export function parseContainerContent(
  content: string,
  context: ValidationContext,
  fileExists: (path: string) => boolean,
): void {
  const containerPath = 'META-INF/container.xml';
  const stripped = stripXmlComments(content);

  let opfRootfileCount = 0;
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
      opfRootfileCount++;
      context.opfPath ??= path;
    }
  }

  if (opfRootfileCount === 0) {
    pushMessage(context.messages, {
      id: MessageId.RSC_003,
      message: 'No Package Document is declared in the container.xml file.',
      location: { path: containerPath },
    });
  } else if (opfRootfileCount > 1 && context.version === '2.0') {
    pushMessage(context.messages, {
      id: MessageId.PKG_013,
      message: 'The EPUB 2 publication declares more than one Package Document.',
      location: { path: containerPath },
    });
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
