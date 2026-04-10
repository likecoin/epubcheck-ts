/**
 * DOCTYPE declaration parsing.
 *
 * Used by HTM-004, HTM-009, and OPF-073 checks, which all need to scan the
 * first few KB of an XML/HTML document for <!DOCTYPE ...> declarations.
 * libxml2-wasm does not expose DOCTYPE information, so we scan raw text.
 */

export interface DoctypeInfo {
  root: string;
  publicId: string;
  systemId: string;
}

const DOCTYPE_RE = /<!DOCTYPE\s+(\w+)\s*([^>]*)>/i;
const PUBLIC_ID_RE = /\bPUBLIC\s+"([^"]*)"\s+"([^"]*)"/i;
const SYSTEM_ID_RE = /\bSYSTEM\s+"([^"]*)"/i;

const DEFAULT_MAX_BYTES = 2048;

/**
 * Parse the first DOCTYPE declaration in `content`.
 * Returns null when no DOCTYPE is present (or root name doesn't match `expectedRoot`).
 * Scans at most `maxBytes` characters (default 2048) to avoid reading entire large files.
 */
export function parseDoctype(
  content: string,
  options: { expectedRoot?: string; maxBytes?: number } = {},
): DoctypeInfo | null {
  const { expectedRoot, maxBytes = DEFAULT_MAX_BYTES } = options;
  const scanned = content.length > maxBytes ? content.slice(0, maxBytes) : content;
  const doctypeMatch = DOCTYPE_RE.exec(scanned);
  if (!doctypeMatch) return null;

  const root = doctypeMatch[1] ?? '';
  if (expectedRoot && root.toLowerCase() !== expectedRoot.toLowerCase()) return null;

  const inner = doctypeMatch[2] ?? '';
  const publicMatch = PUBLIC_ID_RE.exec(inner);
  if (publicMatch) {
    return { root, publicId: publicMatch[1] ?? '', systemId: publicMatch[2] ?? '' };
  }
  const systemMatch = SYSTEM_ID_RE.exec(inner);
  if (systemMatch) {
    return { root, publicId: '', systemId: systemMatch[1] ?? '' };
  }
  return { root, publicId: '', systemId: '' };
}
