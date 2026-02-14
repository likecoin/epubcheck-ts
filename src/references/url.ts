/**
 * URL parsing and validation utilities
 */

import type { ParsedURL } from './types.js';

/**
 * Parse an EPUB-internal URL into its components
 */
export function parseURL(urlString: string): ParsedURL {
  const hashIndex = urlString.indexOf('#');

  if (hashIndex === -1) {
    return {
      url: urlString,
      resource: urlString,
      hasFragment: false,
    };
  }

  const resource = urlString.substring(0, hashIndex);
  const fragment = urlString.substring(hashIndex + 1);

  const result: ParsedURL = {
    url: urlString,
    resource,
    hasFragment: true,
  };

  if (fragment) {
    result.fragment = fragment;
  }

  return result;
}

/**
 * Check if a URL is a data URL
 */
export function isDataURL(url: string): boolean {
  return url.startsWith('data:');
}

/**
 * Check if a URL is a file URL
 */
export function isFileURL(url: string): boolean {
  return url.startsWith('file:');
}

/**
 * Check if a URL is relative (not absolute)
 */
export function isRelativeURL(url: string): boolean {
  const regex = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;
  return regex.exec(url) === null;
}

/**
 * Check if a URL has an absolute path (starts with /)
 */
export function hasAbsolutePath(url: string): boolean {
  return url.startsWith('/');
}

/**
 * Check if a URL tries to escape with parent directory (..)
 */
export function hasParentDirectoryReference(url: string): boolean {
  return url.includes('..');
}

/**
 * Check if a URL is malformed
 */
export function isMalformedURL(url: string): boolean {
  if (!url) return true;

  try {
    // Trim leading/trailing whitespace (XML attribute values are whitespace-trimmed)
    const trimmed = url.trim();
    if (!trimmed) return true;
    // Check for invalid characters (whitespace within URL, angle brackets)
    if (/[\s<>]/.test(trimmed)) return true;
    return false;
  } catch {
    return true;
  }
}

/**
 * Check if a URL is HTTPS
 */
export function isHTTPS(url: string): boolean {
  return url.startsWith('https://');
}

/**
 * Check if a URL is HTTP
 */
export function isHTTP(url: string): boolean {
  return url.startsWith('http://');
}

/**
 * Check if a URL is remote (not relative)
 */
export function isRemoteURL(url: string): boolean {
  return isHTTP(url) || isHTTPS(url);
}

export function resolveManifestHref(opfDir: string, href: string): string {
  if (isRemoteURL(href)) return href;
  try {
    const decoded = decodeURIComponent(href);
    const path = opfDir ? `${opfDir}/${decoded}` : decoded;
    return path.normalize('NFC');
  } catch {
    const path = opfDir ? `${opfDir}/${href}` : href;
    return path.normalize('NFC');
  }
}
