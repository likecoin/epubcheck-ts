/**
 * Types for resource reference validation
 */

import type { EPUBLocation } from '../types.js';

/**
 * Types of resource references
 */
export enum ReferenceType {
  // Linked resources
  LINK = 'link',
  // Publication resources
  GENERIC = 'generic',
  STYLESHEET = 'stylesheet',
  MEDIA_OVERLAY = 'media-overlay',
  HYPERLINK = 'hyperlink',
  FONT = 'font',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  TRACK = 'track',
  CITE = 'cite',
  // SVG-specific
  SVG_PAINT = 'svg-paint',
  SVG_CLIP_PATH = 'svg-clip-path',
  SVG_SYMBOL = 'svg-symbol',
  // Navigation
  REGION_BASED_NAV = 'region-based-nav',
  NAV_TOC_LINK = 'nav-toc-link',
  NAV_PAGELIST_LINK = 'nav-pagelist-link',
  OVERLAY_TEXT_LINK = 'overlay-text-link',
  SEARCH_KEY = 'search-key',
}

/**
 * Check if a reference type is a publication resource reference
 */
export function isPublicationResourceReference(type: ReferenceType): boolean {
  return [
    ReferenceType.GENERIC,
    ReferenceType.STYLESHEET,
    ReferenceType.FONT,
    ReferenceType.IMAGE,
    ReferenceType.AUDIO,
    ReferenceType.VIDEO,
    ReferenceType.TRACK,
    ReferenceType.MEDIA_OVERLAY,
  ].includes(type);
}

/**
 * Parsed URL information for a reference
 */
export interface ParsedURL {
  /** Full URL string */
  url: string;
  /** URL without fragment identifier */
  resource: string;
  /** Fragment identifier (ID), if present */
  fragment?: string;
  /** Whether the URL has a fragment */
  hasFragment: boolean;
}

/**
 * A resource reference from the EPUB
 */
export interface Reference {
  /** Full URL with fragment */
  url: string;
  /** Target resource without fragment */
  targetResource: string;
  /** Fragment identifier if present */
  fragment?: string;
  /** Type of reference */
  type: ReferenceType;
  /** Location where reference was found */
  location: EPUBLocation;
  /** Whether reference has intrinsic fallback */
  hasIntrinsicFallback?: boolean;
}

/**
 * A resource (manifest item) in the EPUB
 */
export interface Resource {
  /** URL of the resource */
  url: string;
  /** MIME type */
  mimeType: string;
  /** Whether resource is in spine */
  inSpine: boolean;
  /** Whether resource has core media type fallback */
  hasCoreMediaTypeFallback?: boolean;
  /** IDs defined in this resource */
  ids: Set<string>;
}
