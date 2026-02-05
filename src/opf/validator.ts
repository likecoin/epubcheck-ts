import { MessageId, pushMessage } from '../messages/index.js';
import type { ValidationContext } from '../types.js';
import { parseOPF } from './parser.js';
import type { ManifestItem, PackageDocument } from './types.js';
import { ITEM_PROPERTIES, SPINE_PROPERTIES } from './types.js';

/**
 * Validates the OPF (Open Packaging Format) package document
 *
 * This includes:
 * - Package metadata validation
 * - Manifest item validation
 * - Spine validation
 * - Fallback chain validation
 * - Guide validation (EPUB 2)
 */
export class OPFValidator {
  private packageDoc: PackageDocument | null = null;
  private manifestById = new Map<string, ManifestItem>();
  private manifestByHref = new Map<string, ManifestItem>();

  /**
   * Validate the OPF package document
   */
  validate(context: ValidationContext): void {
    const opfPath = context.opfPath;
    if (!opfPath) {
      pushMessage(context.messages, {
        id: MessageId.OPF_002,
        message: 'No package document (OPF) path found in container.xml',
      });
      return;
    }

    // Read OPF content
    const opfData = context.files.get(opfPath);
    if (!opfData) {
      pushMessage(context.messages, {
        id: MessageId.OPF_002,
        message: `Package document not found: ${opfPath}`,
        location: { path: opfPath },
      });
      return;
    }

    const opfXml = new TextDecoder().decode(opfData);

    // Parse OPF
    try {
      this.packageDoc = parseOPF(opfXml);
    } catch (error) {
      pushMessage(context.messages, {
        id: MessageId.OPF_002,
        message: `Failed to parse package document: ${error instanceof Error ? error.message : 'Unknown error'}`,
        location: { path: opfPath },
      });
      return;
    }

    // Update context with detected version
    context.version = this.packageDoc.version;

    // Build lookup maps
    this.buildManifestMaps();

    // Store package doc in context for other validators
    context.packageDocument = this.packageDoc;

    // Run validations
    this.validatePackageAttributes(context, opfPath);
    this.validateMetadata(context, opfPath);
    this.validateLinkElements(context, opfPath);
    this.validateManifest(context, opfPath);
    this.validateSpine(context, opfPath);
    this.validateFallbackChains(context, opfPath);

    if (this.packageDoc.version === '2.0') {
      this.validateGuide(context, opfPath);
    }

    if (this.packageDoc.version.startsWith('3.')) {
      this.validateCollections(context, opfPath);
    }
  }

  /**
   * Build lookup maps for manifest items
   */
  private buildManifestMaps(): void {
    if (!this.packageDoc) return;

    for (const item of this.packageDoc.manifest) {
      this.manifestById.set(item.id, item);

      // Check for duplicates
      if (this.manifestByHref.has(item.href)) {
        // Will be reported in validateManifest
      }
      this.manifestByHref.set(item.href, item);
    }
  }

  /**
   * Validate package element attributes
   */
  private validatePackageAttributes(context: ValidationContext, opfPath: string): void {
    if (!this.packageDoc) return;

    const validVersions = new Set(['2.0', '3.0', '3.1', '3.2', '3.3']);
    if (!validVersions.has(this.packageDoc.version)) {
      pushMessage(context.messages, {
        id: MessageId.OPF_001,
        message: `Invalid package version "${this.packageDoc.version}"; must be one of: ${Array.from(validVersions).join(', ')}`,
        location: { path: opfPath },
      });
    }

    // Check unique-identifier
    if (!this.packageDoc.uniqueIdentifier) {
      pushMessage(context.messages, {
        id: MessageId.OPF_048,
        message: 'Package element is missing required unique-identifier attribute',
        location: { path: opfPath },
      });
    } else {
      // Verify the referenced identifier exists
      const refId = this.packageDoc.uniqueIdentifier;
      const matchingDc = this.packageDoc.dcElements.find(
        (dc) => dc.name === 'identifier' && dc.id === refId,
      );
      if (!matchingDc) {
        pushMessage(context.messages, {
          id: MessageId.OPF_030,
          message: `unique-identifier "${refId}" does not reference an existing dc:identifier`,
          location: { path: opfPath },
        });
      }
    }
  }

  /**
   * Validate metadata section
   */
  private validateMetadata(context: ValidationContext, opfPath: string): void {
    if (!this.packageDoc) return;

    const dcElements = this.packageDoc.dcElements;

    if (dcElements.length === 0 && this.packageDoc.metaElements.length === 0) {
      pushMessage(context.messages, {
        id: MessageId.OPF_072,
        message: 'Metadata section is empty',
        location: { path: opfPath },
      });
      return;
    }

    // Check required elements
    const hasIdentifier = dcElements.some((dc) => dc.name === 'identifier');
    const hasTitle = dcElements.some((dc) => dc.name === 'title');
    const hasLanguage = dcElements.some((dc) => dc.name === 'language');

    if (!hasIdentifier) {
      pushMessage(context.messages, {
        id: MessageId.OPF_015,
        message: 'Metadata must include at least one dc:identifier element',
        location: { path: opfPath },
      });
    }

    if (!hasTitle) {
      pushMessage(context.messages, {
        id: MessageId.OPF_016,
        message: 'Metadata must include at least one dc:title element',
        location: { path: opfPath },
      });
    }

    if (!hasLanguage) {
      pushMessage(context.messages, {
        id: MessageId.OPF_017,
        message: 'Metadata must include at least one dc:language element',
        location: { path: opfPath },
      });
    }

    // Validate dc:language format
    for (const dc of dcElements) {
      if (dc.name === 'language' && dc.value) {
        if (!isValidLanguageTag(dc.value)) {
          pushMessage(context.messages, {
            id: MessageId.OPF_092,
            message: `Invalid language tag: "${dc.value}"`,
            location: { path: opfPath },
          });
        }
      }

      // Validate dc:date format (OPF-053)
      if (dc.name === 'date' && dc.value) {
        if (!isValidW3CDateFormat(dc.value)) {
          pushMessage(context.messages, {
            id: MessageId.OPF_053,
            message: `Invalid date format "${dc.value}"; must be W3C date format (ISO 8601)`,
            location: { path: opfPath },
          });
        }
      }

      // OPF-052: Validate dc:creator with opf:role attribute
      if (dc.name === 'creator' && dc.attributes) {
        const opfRole = dc.attributes['opf:role'];
        if (opfRole?.startsWith('marc:')) {
          const relatorCode = opfRole.substring(5);
          const validRelatorCodes = new Set([
            'arr',
            'aut',
            'aut',
            'ccp',
            'com',
            'ctb',
            'csl',
            'edt',
            'ill',
            'itr',
            'pbl',
            'pdr',
            'prt',
            'trl',
            'cre',
            'art',
            'ctb',
            'edt',
            'pfr',
            'red',
            'rev',
            'spn',
            'dsx',
            'pmc',
            'dte',
            'ove',
            'trc',
            'ldr',
            'led',
            'prg',
            'rap',
            'rce',
            'rpc',
            'rtr',
            'sad',
            'sgn',
            'tce',
            'aac',
            'acq',
            'ant',
            'arr',
            'art',
            'ard',
            'asg',
            'aus',
            'aft',
            'bdd',
            'bdd',
            'clb',
            'clc',
            'drd',
            'edt',
            'edt',
            'fmd',
            'flm',
            'fmo',
            'fpy',
            'hnr',
            'ill',
            'ilt',
            'img',
            'itr',
            'lrg',
            'lsa',
            'led',
            'lee',
            'lel',
            'lgd',
            'lse',
            'mfr',
            'mod',
            'mon',
            'mus',
            'nrt',
            'ogt',
            'org',
            'oth',
            'pnt',
            'ppa',
            'prv',
            'pup',
            'red',
            'rev',
            'rsg',
            'srv',
            'stn',
            'stl',
            'trc',
            'typ',
            'vdg',
            'voc',
            'wac',
            'wdc',
          ]);
          if (!validRelatorCodes.has(relatorCode)) {
            pushMessage(context.messages, {
              id: MessageId.OPF_052,
              message: `Unknown MARC relator code "${relatorCode}" in dc:creator`,
              location: { path: opfPath },
            });
          }
        }
      }
    }

    // EPUB 3: Check for dcterms:modified meta
    if (this.packageDoc.version !== '2.0') {
      const modifiedMeta = this.packageDoc.metaElements.find(
        (meta) => meta.property === 'dcterms:modified',
      );
      if (!modifiedMeta) {
        pushMessage(context.messages, {
          id: MessageId.OPF_054,
          message: 'EPUB 3 metadata must include a dcterms:modified meta element',
          location: { path: opfPath },
        });
      } else if (modifiedMeta.value && !isValidW3CDateFormat(modifiedMeta.value)) {
        pushMessage(context.messages, {
          id: MessageId.OPF_054,
          message: `Invalid dcterms:modified date format "${modifiedMeta.value}"; must be W3C date format (ISO 8601)`,
          location: { path: opfPath },
        });
      }
    }
  }

  /**
   * Validate EPUB 3 link elements in metadata
   */
  private validateLinkElements(context: ValidationContext, opfPath: string): void {
    if (!this.packageDoc) return;

    const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/')) : '';

    for (const link of this.packageDoc.linkElements) {
      const href = link.href;
      const decodedHref = tryDecodeUriComponent(href);

      const basePath = href.includes('#') ? href.substring(0, href.indexOf('#')) : href;
      const basePathDecoded = decodedHref.includes('#')
        ? decodedHref.substring(0, decodedHref.indexOf('#'))
        : decodedHref;

      if (href.startsWith('#')) {
        continue;
      }

      const isRemote = /^[a-zA-Z][a-zA-Z0-9+\-.]*:/.test(href);
      if (isRemote) {
        continue;
      }

      if (!link.mediaType) {
        pushMessage(context.messages, {
          id: MessageId.OPF_093,
          message:
            'The "media-type" attribute is required for linked resources located in the EPUB container',
          location: { path: opfPath },
        });
      }

      const resolvedPath = resolvePath(opfDir, basePath);
      const resolvedPathDecoded =
        basePathDecoded !== basePath ? resolvePath(opfDir, basePathDecoded) : resolvedPath;

      const fileExists = context.files.has(resolvedPath) || context.files.has(resolvedPathDecoded);
      const inManifest =
        this.manifestByHref.has(basePath) || this.manifestByHref.has(basePathDecoded);

      if (!fileExists && !inManifest) {
        pushMessage(context.messages, {
          id: MessageId.RSC_007w,
          message: `Referenced resource "${resolvedPath}" could not be found in the EPUB`,
          location: { path: opfPath },
        });
      }
    }
  }

  /**
   * Validate manifest section
   */
  private validateManifest(context: ValidationContext, opfPath: string): void {
    if (!this.packageDoc) return;

    const seenIds = new Set<string>();
    const seenHrefs = new Set<string>();

    for (const item of this.packageDoc.manifest) {
      // Check for duplicate IDs
      if (seenIds.has(item.id)) {
        pushMessage(context.messages, {
          id: MessageId.OPF_074,
          message: `Duplicate manifest item id: "${item.id}"`,
          location: { path: opfPath },
        });
      }
      seenIds.add(item.id);

      // Check for duplicate hrefs
      if (seenHrefs.has(item.href)) {
        pushMessage(context.messages, {
          id: MessageId.OPF_074,
          message: `Duplicate manifest item href: "${item.href}"`,
          location: { path: opfPath },
        });
      }
      seenHrefs.add(item.href);

      // Check for self-referencing manifest item (OPF-099)
      // The manifest must not list the package document itself
      // Note: href may be URL-encoded (e.g., table%20us%202.png) but file paths are not
      const fullPath = resolvePath(opfPath, item.href);
      if (fullPath === opfPath) {
        pushMessage(context.messages, {
          id: MessageId.OPF_099,
          message: 'The manifest must not list the package document',
          location: { path: opfPath },
        });
      }

      // Check for URL leaking outside container (RSC-026)
      // Using the same trick as Java EPUBCheck: resolve against two different test bases
      // If the resolved URL doesn't start with both test base paths, it leaks outside the container
      if (!item.href.startsWith('http') && !item.href.startsWith('mailto:')) {
        const leaked = checkUrlLeaking(item.href);
        if (leaked) {
          pushMessage(context.messages, {
            id: MessageId.RSC_026,
            message: `URL "${item.href}" leaks outside the container (it is not a valid-relative-ocf-URL-with-fragment string)`,
            location: { path: opfPath },
          });
        }
      }

      // Check that referenced file exists (RSC-001 per Java EPUBCheck)
      // Also try URL-decoded version for comparison
      const decodedHref = tryDecodeUriComponent(item.href);
      const fullPathDecoded =
        decodedHref !== item.href ? resolvePath(opfPath, decodedHref) : fullPath;

      if (
        !context.files.has(fullPath) &&
        !context.files.has(fullPathDecoded) &&
        !item.href.startsWith('http')
      ) {
        pushMessage(context.messages, {
          id: MessageId.RSC_001,
          message: `Referenced resource "${item.href}" could not be found in the EPUB`,
          location: { path: opfPath },
        });
      }

      // EPUB 3: Check for publication resources in META-INF
      if (this.packageDoc.version !== '2.0' && fullPath.startsWith('META-INF/')) {
        pushMessage(context.messages, {
          id: MessageId.PKG_025,
          message: `Publication resource must not be located in META-INF: ${item.href}`,
          location: { path: opfPath },
        });
      }

      // Validate media type format (RFC4288)
      if (!isValidMimeType(item.mediaType)) {
        pushMessage(context.messages, {
          id: MessageId.OPF_014,
          message: `Invalid media-type format "${item.mediaType}" for item "${item.id}"`,
          location: { path: opfPath },
        });
      }

      // Check for deprecated media types (OEB 1.x)
      const deprecatedTypes = new Set<string>([
        'text/x-oeb1-document',
        'text/x-oeb1-css',
        'application/x-oeb1-package',
        'text/x-oeb1-html',
      ]);
      if (deprecatedTypes.has(item.mediaType)) {
        pushMessage(context.messages, {
          id: MessageId.OPF_037,
          message: `Found deprecated media-type "${item.mediaType}"`,
          location: { path: opfPath },
        });
      }

      // EPUB 3: Validate item properties
      if (this.packageDoc.version !== '2.0' && item.properties) {
        for (const prop of item.properties) {
          if (!ITEM_PROPERTIES.has(prop)) {
            pushMessage(context.messages, {
              id: MessageId.OPF_027,
              message: `Undefined property: "${prop}"`,
              location: { path: opfPath },
            });
          }
        }

        // Check nav property requirements
        if (item.properties.includes('nav')) {
          if (item.mediaType !== 'application/xhtml+xml') {
            pushMessage(context.messages, {
              id: MessageId.OPF_012,
              message: `Item with "nav" property must be XHTML, found: ${item.mediaType}`,
              location: { path: opfPath },
            });
          }
        }
      }

      // Check for href fragment (EPUB 3)
      if (this.packageDoc.version !== '2.0' && item.href.includes('#')) {
        pushMessage(context.messages, {
          id: MessageId.OPF_091,
          message: `Manifest item href must not contain fragment identifier: "${item.href}"`,
          location: { path: opfPath },
        });
      }

      // EPUB 3: Check for remote resources in spine require remote-resources property (RSC-006)
      // Per Java EPUBCheck, this check only applies to spine items, not all manifest items
      if (
        this.packageDoc.version !== '2.0' &&
        (item.href.startsWith('http://') || item.href.startsWith('https://'))
      ) {
        const inSpine = this.packageDoc.spine.some((s) => s.idref === item.id);
        if (inSpine && !item.properties?.includes('remote-resources')) {
          pushMessage(context.messages, {
            id: MessageId.RSC_006,
            message: `Manifest item "${item.id}" references remote resource but is missing "remote-resources" property`,
            location: { path: opfPath },
          });
        }
      }
    }

    // EPUB 3: Check for required nav document (Schematron in Java, reports RSC-005)
    if (this.packageDoc.version !== '2.0') {
      const hasNav = this.packageDoc.manifest.some((item) => item.properties?.includes('nav'));
      if (!hasNav) {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message: 'Exactly one manifest item must declare the "nav" property',
          location: { path: opfPath },
        });
      }
    }
  }

  /**
   * Validate spine section
   */
  private validateSpine(context: ValidationContext, opfPath: string): void {
    if (!this.packageDoc) return;

    // Check that spine has items
    if (this.packageDoc.spine.length === 0) {
      pushMessage(context.messages, {
        id: MessageId.OPF_033,
        message: 'Spine must contain at least one itemref',
        location: { path: opfPath },
      });
      return;
    }

    // Check for at least one linear item
    const hasLinear = this.packageDoc.spine.some((ref) => ref.linear);
    if (!hasLinear) {
      pushMessage(context.messages, {
        id: MessageId.OPF_033,
        message: 'Spine must contain at least one linear itemref',
        location: { path: opfPath },
      });
    }

    // Check for NCX reference (required in EPUB 2, optional in EPUB 3)
    const ncxId = this.packageDoc.spineToc;
    if (this.packageDoc.version === '2.0' && !ncxId) {
      // EPUB 2 requires toc attribute
      pushMessage(context.messages, {
        id: MessageId.OPF_050,
        message: 'EPUB 2 spine should have a toc attribute referencing the NCX',
        location: { path: opfPath },
      });
    } else if (ncxId) {
      // If toc attribute is present (EPUB 2 or 3), validate it points to NCX
      const ncxItem = this.manifestById.get(ncxId);
      if (!ncxItem) {
        pushMessage(context.messages, {
          id: MessageId.OPF_049,
          message: `Spine toc attribute references non-existent item: "${ncxId}"`,
          location: { path: opfPath },
        });
      } else if (ncxItem.mediaType !== 'application/x-dtbncx+xml') {
        pushMessage(context.messages, {
          id: MessageId.OPF_050,
          message: `Spine toc attribute must reference an NCX document (media-type "application/x-dtbncx+xml"), found: "${ncxItem.mediaType}"`,
          location: { path: opfPath },
        });
      }
    }

    const seenIdrefs = new Set<string>();

    for (const itemref of this.packageDoc.spine) {
      // Check that idref references a manifest item
      const item = this.manifestById.get(itemref.idref);
      if (!item) {
        pushMessage(context.messages, {
          id: MessageId.OPF_049,
          message: `Spine itemref references non-existent manifest item: "${itemref.idref}"`,
          location: { path: opfPath },
        });
        continue;
      }

      // Check for duplicate idrefs (applies to both EPUB 2 and 3)
      if (seenIdrefs.has(itemref.idref)) {
        pushMessage(context.messages, {
          id: MessageId.OPF_034,
          message: `Duplicate spine itemref: "${itemref.idref}"`,
          location: { path: opfPath },
        });
      }
      seenIdrefs.add(itemref.idref);

      // Check that spine items have appropriate media types
      if (!isSpineMediaType(item.mediaType) && !item.fallback) {
        pushMessage(context.messages, {
          id: MessageId.OPF_043,
          message: `Spine item "${item.id}" has non-standard media type "${item.mediaType}" without fallback`,
          location: { path: opfPath },
        });
      }

      // EPUB 3: Validate itemref properties
      if (this.packageDoc.version !== '2.0' && itemref.properties) {
        for (const prop of itemref.properties) {
          if (!SPINE_PROPERTIES.has(prop) && !prop.includes(':')) {
            pushMessage(context.messages, {
              id: MessageId.OPF_012,
              message: `Unknown spine itemref property: "${prop}"`,
              location: { path: opfPath },
            });
          }
        }
      }
    }
  }

  /**
   * Validate fallback chains
   */
  private validateFallbackChains(context: ValidationContext, opfPath: string): void {
    if (!this.packageDoc) return;

    for (const item of this.packageDoc.manifest) {
      if (item.fallback) {
        const visited = new Set<string>();
        let currentFallback: string | undefined = item.fallback;

        while (currentFallback) {
          if (visited.has(currentFallback)) {
            pushMessage(context.messages, {
              id: MessageId.OPF_045,
              message: `Circular fallback chain detected starting from item "${item.id}"`,
              location: { path: opfPath },
            });
            break;
          }

          visited.add(currentFallback);
          const fallbackItem = this.manifestById.get(currentFallback);

          if (!fallbackItem) {
            pushMessage(context.messages, {
              id: MessageId.OPF_040,
              message: `Fallback item "${currentFallback}" not found in manifest`,
              location: { path: opfPath },
            });
            break;
          }

          currentFallback = fallbackItem.fallback;
        }
      }
    }
  }

  /**
   * Validate guide section (EPUB 2)
   */
  private validateGuide(context: ValidationContext, opfPath: string): void {
    if (!this.packageDoc) return;

    for (const ref of this.packageDoc.guide) {
      // Strip fragment from href for lookup
      const hrefBase = ref.href.split('#')[0] ?? ref.href;
      const fullPath = resolvePath(opfPath, hrefBase);

      // Check that href references a manifest item
      const found = Array.from(this.manifestByHref.entries()).some(([href]) => {
        const itemFullPath = resolvePath(opfPath, href);
        return itemFullPath === fullPath;
      });

      if (!found) {
        pushMessage(context.messages, {
          id: MessageId.OPF_031,
          message: `Guide reference "${ref.type}" references item not in manifest: ${ref.href}`,
          location: { path: opfPath },
        });
      }
    }
  }

  private validateCollections(context: ValidationContext, opfPath: string): void {
    if (!this.packageDoc) return;

    const collections = this.packageDoc.collections;
    if (collections.length === 0) {
      return;
    }

    const validRoles = new Set(['dictionary', 'index', 'preview', 'recordings']);

    for (const collection of collections) {
      if (!validRoles.has(collection.role)) {
        pushMessage(context.messages, {
          id: MessageId.OPF_071,
          message: `Unknown collection role: "${collection.role}"`,
          location: { path: opfPath },
        });
      }

      if (collection.role === 'dictionary') {
        if (!collection.name || collection.name.trim() === '') {
          pushMessage(context.messages, {
            id: MessageId.OPF_072,
            message: 'Dictionary collection must have a name attribute',
            location: { path: opfPath },
          });
        }

        for (const linkHref of collection.links) {
          const manifestItem = this.manifestByHref.get(linkHref);
          if (!manifestItem) {
            pushMessage(context.messages, {
              id: MessageId.OPF_073,
              message: `Collection link "${linkHref}" references non-existent manifest item`,
              location: { path: opfPath },
            });
            continue;
          }

          if (
            manifestItem.mediaType !== 'application/xhtml+xml' &&
            manifestItem.mediaType !== 'image/svg+xml'
          ) {
            pushMessage(context.messages, {
              id: MessageId.OPF_074,
              message: `Dictionary collection item "${linkHref}" must be an XHTML or SVG document`,
              location: { path: opfPath },
            });
          }
        }
      }

      if (collection.role === 'index') {
        for (const linkHref of collection.links) {
          const manifestItem = this.manifestByHref.get(linkHref);
          if (!manifestItem) {
            pushMessage(context.messages, {
              id: MessageId.OPF_073,
              message: `Collection link "${linkHref}" references non-existent manifest item`,
              location: { path: opfPath },
            });
            continue;
          }

          if (manifestItem.mediaType !== 'application/xhtml+xml') {
            pushMessage(context.messages, {
              id: MessageId.OPF_075,
              message: `Index collection item "${linkHref}" must be an XHTML document`,
              location: { path: opfPath },
            });
          }
        }
      }

      if (collection.role === 'preview') {
        for (const linkHref of collection.links) {
          const manifestItem = this.manifestByHref.get(linkHref);
          if (!manifestItem) {
            pushMessage(context.messages, {
              id: MessageId.OPF_073,
              message: `Collection link "${linkHref}" references non-existent manifest item`,
              location: { path: opfPath },
            });
          }
        }
      }
    }
  }
}

/**
 * Check if a media type is valid for spine items
 */
function isSpineMediaType(mediaType: string): boolean {
  return (
    mediaType === 'application/xhtml+xml' ||
    mediaType === 'image/svg+xml' ||
    // EPUB 2 also allows these in spine
    mediaType === 'application/x-dtbook+xml'
  );
}

/**
 * Validate a BCP 47 language tag (simplified check)
 */
function isValidLanguageTag(tag: string): boolean {
  // Basic pattern: 2-3 letter primary subtag, optional script/region/variant
  // This is simplified; full BCP 47 is more complex
  const pattern =
    /^[a-zA-Z]{2,3}(-[a-zA-Z]{4})?(-[a-zA-Z]{2}|-\d{3})?(-([a-zA-Z\d]{5,8}|\d[a-zA-Z\d]{3}))*$/;
  return pattern.test(tag);
}

/**
 * Resolve a relative path against a base path
 */
function resolvePath(basePath: string, relativePath: string): string {
  if (relativePath.startsWith('/')) {
    return relativePath.slice(1);
  }

  const baseDir = basePath.includes('/') ? basePath.substring(0, basePath.lastIndexOf('/')) : '';

  if (!baseDir) {
    return relativePath;
  }

  // Handle ../ and ./ in relative path
  const parts = baseDir.split('/');
  const relParts = relativePath.split('/');

  for (const part of relParts) {
    if (part === '..') {
      parts.pop();
    } else if (part !== '.') {
      parts.push(part);
    }
  }

  return parts.join('/');
}

/**
 * Safely decode a URI component, returning the original if decoding fails
 *
 * This is needed because OPF hrefs may be URL-encoded (e.g., "table%20us%202.png")
 * but the actual file paths in the ZIP are not encoded (e.g., "table us 2.png").
 */
function tryDecodeUriComponent(encoded: string): string {
  try {
    return decodeURIComponent(encoded);
  } catch {
    // If decoding fails (e.g., invalid encoding), return original
    return encoded;
  }
}

/**
 * Check if a URL "leaks" outside the container
 *
 * Uses the same trick as Java EPUBCheck: resolve against two different test bases.
 * If the resolved URL doesn't start with both test base paths, it "leaks" above root.
 *
 * Example: "../../../../EPUB/content.xhtml" would resolve to "/EPUB/content.xhtml"
 * from base "A/" but to something outside from base "B/"
 */
function checkUrlLeaking(href: string): boolean {
  const TEST_BASE_A = 'https://a.example.org/A/';
  const TEST_BASE_B = 'https://b.example.org/B/';

  try {
    const urlA = new URL(href, TEST_BASE_A).toString();
    const urlB = new URL(href, TEST_BASE_B).toString();

    // If either resolved URL doesn't start with its test base path, the URL leaks
    return !urlA.startsWith(TEST_BASE_A) || !urlB.startsWith(TEST_BASE_B);
  } catch {
    // Invalid URL, don't report as leaking (other validation will catch it)
    return false;
  }
}

/**
 * Validate MIME type format according to RFC4288
 */
function isValidMimeType(mediaType: string): boolean {
  // RFC 4288 allows: letters, digits, and !#$&-^_.+ in type/subtype
  const mimeTypePattern =
    /^[a-zA-Z][a-zA-Z0-9!#$&\-^_.]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_.+]*(?:\s*;\s*[a-zA-Z0-9-]+=[^;]+)?$/;

  if (!mimeTypePattern.test(mediaType)) {
    return false;
  }

  const [type, subtypeWithParams] = mediaType.split('/');
  if (!type || !subtypeWithParams) return false;

  const subtype = subtypeWithParams.split(';')[0]?.trim();
  if (!subtype) return false;

  if (type.length > 127 || subtype.length > 127) {
    return false;
  }

  return true;
}

/**
 * Validate W3C date format (ISO 8601)
 * Based on Java EPUBCheck DateParser
 */
function isValidW3CDateFormat(dateStr: string): boolean {
  const trimmed = dateStr.trim();

  const yearOnlyPattern = /^\d{4}$/;
  if (yearOnlyPattern.test(trimmed)) {
    const year = Number(trimmed);
    return year >= 0 && year <= 9999;
  }

  const yearMonthPattern = /^(\d{4})-(\d{2})$/;
  const yearMonthMatch = yearMonthPattern.exec(trimmed);
  if (yearMonthMatch) {
    const year = Number(yearMonthMatch[1]);
    const month = Number(yearMonthMatch[2]);
    if (year < 0 || year > 9999) return false;
    if (month < 1 || month > 12) return false;
    return true;
  }

  const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;
  const dateMatch = dateOnlyPattern.exec(trimmed);
  if (dateMatch) {
    const year = Number(dateMatch[1]);
    const month = Number(dateMatch[2]);
    const day = Number(dateMatch[3]);
    if (year < 0 || year > 9999) return false;
    if (month < 1 || month > 12) return false;
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) return false;
    return true;
  }

  const dateTimePattern =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})?$/;
  const dateTimeMatch = dateTimePattern.exec(trimmed);
  if (dateTimeMatch) {
    const year = Number(dateTimeMatch[1]);
    const month = Number(dateTimeMatch[2]);
    const day = Number(dateTimeMatch[3]);
    if (year < 0 || year > 9999) return false;
    if (month < 1 || month > 12) return false;
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) return false;

    const hours = Number(dateTimeMatch[4]);
    const minutes = Number(dateTimeMatch[5]);
    const seconds = Number(dateTimeMatch[6]);
    if (hours < 0 || hours > 23) return false;
    if (minutes < 0 || minutes > 59) return false;
    if (seconds < 0 || seconds > 59) return false;
    return true;
  }

  return false;
}
