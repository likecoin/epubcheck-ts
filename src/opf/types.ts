import type { EPUBVersion } from '../types.js';

/**
 * Represents a manifest item in the OPF
 */
export interface ManifestItem {
  /** Unique identifier for this item */
  id: string;
  /** Path relative to the OPF file */
  href: string;
  /** MIME media type */
  mediaType: string;
  /** Fallback item ID for non-standard media types */
  fallback?: string;
  /** Media overlay ID */
  mediaOverlay?: string;
  /** Item properties (EPUB 3) - e.g., 'nav', 'scripted', 'svg', 'remote-resources' */
  properties?: string[];
}

/**
 * Represents a spine itemref in the OPF
 */
export interface SpineItemRef {
  /** Reference to manifest item ID */
  idref: string;
  /** Whether this item is part of the linear reading order */
  linear: boolean;
  /** Itemref properties (EPUB 3) - e.g., 'page-spread-left', 'page-spread-right' */
  properties?: string[];
}

/**
 * Represents a guide reference (EPUB 2)
 */
export interface GuideReference {
  /** Type of reference (cover, toc, etc.) */
  type: string;
  /** Title for display */
  title?: string;
  /** Path to the referenced item */
  href: string;
}

/**
 * Dublin Core metadata element
 */
export interface DCElement {
  /** The element name (title, creator, identifier, etc.) */
  name: string;
  /** The text content */
  value: string;
  /** The id attribute, if any */
  id?: string;
  /** Additional attributes */
  attributes?: Record<string, string>;
}

/**
 * EPUB 3 meta element
 */
export interface MetaElement {
  /** Property name (with optional prefix) */
  property: string;
  /** The text content */
  value: string;
  /** ID of the element this meta refines */
  refines?: string;
  /** Scheme for the value */
  scheme?: string;
  /** The id attribute, if any */
  id?: string;
}

/**
 * EPUB 3 link element
 */
export interface LinkElement {
  /** Relationship type */
  rel: string;
  /** URL to the linked resource */
  href: string;
  /** Media type of the linked resource */
  mediaType?: string;
  /** ID of the element this link refines */
  refines?: string;
  /** Link properties */
  properties?: string[];
  /** The id attribute, if any */
  id?: string;
  /** Language tag for the linked resource */
  hreflang?: string;
}

/**
 * Parsed OPF package document
 */
export interface PackageDocument {
  /** EPUB version from package@version */
  version: EPUBVersion;
  /** Unique identifier reference (package@unique-identifier) */
  uniqueIdentifier: string;
  /** Package prefix declarations (EPUB 3) */
  prefixes?: Record<string, string>;
  /** Package direction (rtl, ltr, auto) */
  dir?: string;
  /** Dublin Core metadata elements */
  dcElements: DCElement[];
  /** EPUB 3 meta elements */
  metaElements: MetaElement[];
  /** EPUB 3 link elements */
  linkElements: LinkElement[];
  /** Manifest items */
  manifest: ManifestItem[];
  /** Spine item references */
  spine: SpineItemRef[];
  /** Spine toc attribute (NCX reference for EPUB 2) */
  spineToc?: string;
  /** Spine page-progression-direction */
  pageProgressionDirection?: 'ltr' | 'rtl' | 'default';
  /** Guide references (EPUB 2) */
  guide: GuideReference[];
  /** Collections (EPUB 3) */
  collections: Collection[];
  /** Whether the bindings element is present (deprecated in EPUB 3.3) */
  hasBindings?: boolean;
  /** xml:lang attribute on elements (for validation) */
  xmlLangs?: string[];
}

/**
 * Represents a collection in the OPF (EPUB 3)
 */
export interface Collection {
  /** Collection role (dictionary, index, preview, etc.) */
  role: string;
  /** Collection identifier */
  id?: string;
  /** Collection name/label */
  name?: string;
  /** Resource hrefs in this collection (from link elements) */
  links: string[];
}

/**
 * Core Media Types that don't require fallbacks
 * @see https://www.w3.org/TR/epub-33/#sec-core-media-types
 */
export const CORE_MEDIA_TYPES = new Set([
  // Image types
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'image/webp',
  // Audio types
  'audio/mpeg',
  'audio/mp4',
  'audio/ogg',
  // CSS
  'text/css',
  // Fonts
  'font/otf',
  'font/ttf',
  'font/woff',
  'font/woff2',
  'application/font-sfnt', // deprecated alias for font/otf, font/ttf
  'application/font-woff', // deprecated alias for font/woff
  'application/vnd.ms-opentype', // deprecated alias
  // Content documents
  'application/xhtml+xml',
  'application/x-dtbncx+xml', // NCX
  // JavaScript (EPUB 3)
  'text/javascript',
  'application/javascript',
  // Media overlays
  'application/smil+xml',
  // PLS (Pronunciation Lexicon)
  'application/pls+xml',
]);

/**
 * Known item property values (EPUB 3)
 */
export const ITEM_PROPERTIES = new Set([
  'cover-image',
  'mathml',
  'nav',
  'remote-resources',
  'scripted',
  'svg',
  'switch',
]);

/**
 * Known link element property values (EPUB 3)
 */
export const LINK_PROPERTIES = new Set([
  'onix',
  'marc21xml-record',
  'mods-record',
  'xmp-record',
]);

/**
 * Known spine itemref property values (EPUB 3)
 */
export const SPINE_PROPERTIES = new Set([
  'page-spread-left',
  'page-spread-right',
  'rendition:spread-none',
  'rendition:spread-landscape',
  'rendition:spread-portrait',
  'rendition:spread-both',
  'rendition:spread-auto',
  'rendition:page-spread-center',
  'rendition:layout-reflowable',
  'rendition:layout-pre-paginated',
  'rendition:orientation-auto',
  'rendition:orientation-landscape',
  'rendition:orientation-portrait',
]);
