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
      context.messages.push({
        id: 'OPF-002',
        severity: 'fatal',
        message: 'No package document (OPF) path found in container.xml',
      });
      return;
    }

    // Read OPF content
    const opfData = context.files.get(opfPath);
    if (!opfData) {
      context.messages.push({
        id: 'OPF-002',
        severity: 'fatal',
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
      context.messages.push({
        id: 'OPF-002',
        severity: 'fatal',
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
    this.validateManifest(context, opfPath);
    this.validateSpine(context, opfPath);
    this.validateFallbackChains(context, opfPath);

    if (this.packageDoc.version === '2.0') {
      this.validateGuide(context, opfPath);
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
      context.messages.push({
        id: 'OPF-001',
        severity: 'error',
        message: `Invalid package version "${this.packageDoc.version}"; must be one of: ${Array.from(validVersions).join(', ')}`,
        location: { path: opfPath },
      });
    }

    // Check unique-identifier
    if (!this.packageDoc.uniqueIdentifier) {
      context.messages.push({
        id: 'OPF-048',
        severity: 'error',
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
        context.messages.push({
          id: 'OPF-030',
          severity: 'error',
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

    // Check required elements
    const hasIdentifier = dcElements.some((dc) => dc.name === 'identifier');
    const hasTitle = dcElements.some((dc) => dc.name === 'title');
    const hasLanguage = dcElements.some((dc) => dc.name === 'language');

    if (!hasIdentifier) {
      context.messages.push({
        id: 'OPF-015',
        severity: 'error',
        message: 'Metadata must include at least one dc:identifier element',
        location: { path: opfPath },
      });
    }

    if (!hasTitle) {
      context.messages.push({
        id: 'OPF-016',
        severity: 'error',
        message: 'Metadata must include at least one dc:title element',
        location: { path: opfPath },
      });
    }

    if (!hasLanguage) {
      context.messages.push({
        id: 'OPF-017',
        severity: 'error',
        message: 'Metadata must include at least one dc:language element',
        location: { path: opfPath },
      });
    }

    // Validate dc:language format
    for (const dc of dcElements) {
      if (dc.name === 'language' && dc.value) {
        if (!isValidLanguageTag(dc.value)) {
          context.messages.push({
            id: 'OPF-092',
            severity: 'error',
            message: `Invalid language tag: "${dc.value}"`,
            location: { path: opfPath },
          });
        }
      }

      // Validate dc:date format (OPF-053)
      if (dc.name === 'date' && dc.value) {
        if (!isValidW3CDateFormat(dc.value)) {
          context.messages.push({
            id: 'OPF-053',
            severity: 'error',
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
            'arr', 'aut', 'aut', 'ccp',
            'com', 'ctb', 'csl', 'edt', 'ill',
            'itr', 'pbl', 'pdr', 'prt', 'trl',
            'cre', 'art', 'ctb', 'edt', 'pfr',
            'red', 'rev', 'spn', 'dsx', 'pmc',
            'dte', 'ove', 'trc', 'ldr', 'led',
            'prg', 'rap', 'rce', 'rpc', 'rtr',
            'sad', 'sgn', 'tce', 'aac', 'acq',
            'ant', 'arr', 'art', 'ard', 'asg',
            'aus', 'aft', 'bdd', 'bdd', 'clb',
            'clc', 'drd', 'edt', 'edt', 'fmd',
            'flm', 'fmo', 'fpy', 'hnr', 'ill',
            'ilt', 'img', 'itr', 'lrg', 'lsa',
            'led', 'lee', 'lel', 'lgd', 'lse',
            'mfr', 'mod', 'mon', 'mus', 'nrt',
            'ogt', 'org', 'oth', 'pnt', 'ppa',
            'prv', 'pup', 'red', 'rev', 'rsg',
            'srv', 'stn', 'stl', 'trc', 'typ',
            'vdg', 'voc', 'wac', 'wdc',
          ]);
          if (!validRelatorCodes.has(relatorCode)) {
            context.messages.push({
              id: 'OPF-052',
              severity: 'error',
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
        context.messages.push({
          id: 'OPF-054',
          severity: 'error',
          message: 'EPUB 3 metadata must include a dcterms:modified meta element',
          location: { path: opfPath },
        });
      } else if (modifiedMeta.value && !isValidW3CDateFormat(modifiedMeta.value)) {
        context.messages.push({
          id: 'OPF-054',
          severity: 'error',
          message: `Invalid dcterms:modified date format "${modifiedMeta.value}"; must be W3C date format (ISO 8601)`,
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
        context.messages.push({
          id: 'OPF-074',
          severity: 'error',
          message: `Duplicate manifest item id: "${item.id}"`,
          location: { path: opfPath },
        });
      }
      seenIds.add(item.id);

      // Check for duplicate hrefs
      if (seenHrefs.has(item.href)) {
        context.messages.push({
          id: 'OPF-074',
          severity: 'error',
          message: `Duplicate manifest item href: "${item.href}"`,
          location: { path: opfPath },
        });
      }
      seenHrefs.add(item.href);

      // Check that referenced file exists
      const fullPath = resolvePath(opfPath, item.href);
      if (!context.files.has(fullPath) && !item.href.startsWith('http')) {
        context.messages.push({
          id: 'OPF-010',
          severity: 'error',
          message: `Manifest item "${item.id}" references missing file: ${item.href}`,
          location: { path: opfPath },
        });
      }

      // Validate media type format (RFC4288)
      if (!isValidMimeType(item.mediaType)) {
        context.messages.push({
          id: 'OPF-014',
          severity: 'error',
          message: `Invalid media-type format "${item.mediaType}" for item "${item.id}"`,
          location: { path: opfPath },
        });
      }

      // Check for deprecated media types (OEB 1.x)
      const deprecatedTypes = new Map<string, string>([
        ['text/x-oeb1-document', 'OPF-035'],
        ['text/x-oeb1-css', 'OPF-037'],
        ['application/x-oeb1-package', 'OPF-038'],
        ['text/x-oeb1-html', 'OPF-037'],
      ]);
      const deprecatedId = deprecatedTypes.get(item.mediaType);
      if (deprecatedId) {
        context.messages.push({
          id: deprecatedId,
          severity: 'warning',
          message: `Deprecated OEB 1.0 media-type "${item.mediaType}" should not be used`,
          location: { path: opfPath },
        });
      }

      // EPUB 3: Validate item properties
      if (this.packageDoc.version !== '2.0' && item.properties) {
        for (const prop of item.properties) {
          if (!ITEM_PROPERTIES.has(prop) && !prop.includes(':')) {
            context.messages.push({
              id: 'OPF-012',
              severity: 'warning',
              message: `Unknown item property: "${prop}" on item "${item.id}"`,
              location: { path: opfPath },
            });
          }
        }

        // Check nav property requirements
        if (item.properties.includes('nav')) {
          if (item.mediaType !== 'application/xhtml+xml') {
            context.messages.push({
              id: 'OPF-012',
              severity: 'error',
              message: `Item with "nav" property must be XHTML, found: ${item.mediaType}`,
              location: { path: opfPath },
            });
          }
        }
      }

      // Check for href fragment (EPUB 3)
      if (this.packageDoc.version !== '2.0' && item.href.includes('#')) {
        context.messages.push({
          id: 'OPF-091',
          severity: 'error',
          message: `Manifest item href must not contain fragment identifier: "${item.href}"`,
          location: { path: opfPath },
        });
      }

      // EPUB 3: Check for remote resources require remote-resources property (RSC-006b)
      if (this.packageDoc.version !== '2.0' && (item.href.startsWith('http://') || item.href.startsWith('https://'))) {
        if (!item.properties?.includes('remote-resources')) {
          context.messages.push({
            id: 'RSC-006',
            severity: 'error',
            message: `Manifest item "${item.id}" references remote resource but is missing "remote-resources" property`,
            location: { path: opfPath },
          });
        }
      }
    }

    // EPUB 3: Check for required nav document
    if (this.packageDoc.version !== '2.0') {
      const hasNav = this.packageDoc.manifest.some((item) => item.properties?.includes('nav'));
      if (!hasNav) {
        context.messages.push({
          id: 'OPF-013',
          severity: 'error',
          message: 'EPUB 3 must have exactly one manifest item with the "nav" property',
          location: { path: opfPath },
        });
      }
    }

    // Check for undeclared resources (RSC-008)
    this.checkUndeclaredResources(context, opfPath);
  }

  /**
   * Check for files in container that are not declared in manifest
   */
  private checkUndeclaredResources(context: ValidationContext, opfPath: string): void {
    if (!this.packageDoc) return;

    // Build set of declared manifest hrefs (resolved to full paths)
    const declaredPaths = new Set<string>();
    for (const item of this.packageDoc.manifest) {
      const fullPath = resolvePath(opfPath, item.href);
      declaredPaths.add(fullPath);
    }

    // Also add the OPF itself and META-INF files
    declaredPaths.add(opfPath);

    // Check each file in the container
    for (const filePath of context.files.keys()) {
      // Skip META-INF directory
      if (filePath.startsWith('META-INF/')) continue;

      // Skip mimetype file
      if (filePath === 'mimetype') continue;

      // Skip if declared in manifest
      if (declaredPaths.has(filePath)) continue;

      context.messages.push({
        id: 'RSC-008',
        severity: 'warning',
        message: `File in container is not declared in manifest: ${filePath}`,
        location: { path: filePath },
      });
    }
  }

  /**
   * Validate spine section
   */
  private validateSpine(context: ValidationContext, opfPath: string): void {
    if (!this.packageDoc) return;

    // Check that spine has items
    if (this.packageDoc.spine.length === 0) {
      context.messages.push({
        id: 'OPF-033',
        severity: 'error',
        message: 'Spine must contain at least one itemref',
        location: { path: opfPath },
      });
      return;
    }

    // Check for at least one linear item
    const hasLinear = this.packageDoc.spine.some((ref) => ref.linear);
    if (!hasLinear) {
      context.messages.push({
        id: 'OPF-033',
        severity: 'error',
        message: 'Spine must contain at least one linear itemref',
        location: { path: opfPath },
      });
    }

    // EPUB 2: Check for NCX reference
    if (this.packageDoc.version === '2.0') {
      const ncxId = this.packageDoc.spineToc;
      if (!ncxId) {
        context.messages.push({
          id: 'OPF-050',
          severity: 'warning',
          message: 'EPUB 2 spine should have a toc attribute referencing the NCX',
          location: { path: opfPath },
        });
      } else {
        const ncxItem = this.manifestById.get(ncxId);
        if (!ncxItem) {
          context.messages.push({
            id: 'OPF-049',
            severity: 'error',
            message: `Spine toc attribute references non-existent item: "${ncxId}"`,
            location: { path: opfPath },
          });
        } else if (ncxItem.mediaType !== 'application/x-dtbncx+xml') {
          context.messages.push({
            id: 'OPF-050',
            severity: 'error',
            message: `NCX item must have media-type "application/x-dtbncx+xml", found: "${ncxItem.mediaType}"`,
            location: { path: opfPath },
          });
        }
      }
    }

    const seenIdrefs = new Set<string>();

    for (const itemref of this.packageDoc.spine) {
      // Check that idref references a manifest item
      const item = this.manifestById.get(itemref.idref);
      if (!item) {
        context.messages.push({
          id: 'OPF-049',
          severity: 'error',
          message: `Spine itemref references non-existent manifest item: "${itemref.idref}"`,
          location: { path: opfPath },
        });
        continue;
      }

      // EPUB 2: Check for duplicate idrefs
      if (this.packageDoc.version === '2.0' && seenIdrefs.has(itemref.idref)) {
        context.messages.push({
          id: 'OPF-034',
          severity: 'error',
          message: `Duplicate spine itemref: "${itemref.idref}"`,
          location: { path: opfPath },
        });
      }
      seenIdrefs.add(itemref.idref);

      // Check that spine items have appropriate media types
      if (!isSpineMediaType(item.mediaType) && !item.fallback) {
        context.messages.push({
          id: 'OPF-043',
          severity: 'error',
          message: `Spine item "${item.id}" has non-standard media type "${item.mediaType}" without fallback`,
          location: { path: opfPath },
        });
      }

      // EPUB 3: Validate itemref properties
      if (this.packageDoc.version !== '2.0' && itemref.properties) {
        for (const prop of itemref.properties) {
          if (!SPINE_PROPERTIES.has(prop) && !prop.includes(':')) {
            context.messages.push({
              id: 'OPF-012',
              severity: 'warning',
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
            context.messages.push({
              id: 'OPF-045',
              severity: 'error',
              message: `Circular fallback chain detected starting from item "${item.id}"`,
              location: { path: opfPath },
            });
            break;
          }

          visited.add(currentFallback);
          const fallbackItem = this.manifestById.get(currentFallback);

          if (!fallbackItem) {
            context.messages.push({
              id: 'OPF-040',
              severity: 'error',
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
        context.messages.push({
          id: 'OPF-031',
          severity: 'error',
          message: `Guide reference "${ref.type}" references item not in manifest: ${ref.href}`,
          location: { path: opfPath },
        });
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
 * Validate MIME type format according to RFC4288
 */
function isValidMimeType(mediaType: string): boolean {
  const mimeTypePattern = /^[a-zA-Z][a-zA-Z0-9!#$&\-^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_+]*(?:\s*;\s*[a-zA-Z0-9-]+=[^;]+)?$/;

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
 * Accepts: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS[Z|+/-HH:MM]
 */
function isValidW3CDateFormat(dateStr: string): boolean {
  const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
  const dateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})?$/;

  if (dateOnlyPattern.test(dateStr)) {
    const parts = dateStr.split('-');
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    if (month < 1 || month > 12) return false;
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) return false;
    return true;
  }

  if (dateTimePattern.test(dateStr)) {
    const datePart = dateStr.substring(0, 10);
    const dateParts = datePart.split('-');
    const year = Number(dateParts[0]);
    const month = Number(dateParts[1]);
    const day = Number(dateParts[2]);
    if (month < 1 || month > 12) return false;
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) return false;

    const timePart = dateStr.substring(11, 19);
    const timeParts = timePart.split(':');
    const hours = Number(timeParts[0]);
    const minutes = Number(timeParts[1]);
    const seconds = Number(timeParts[2]);
    if (hours < 0 || hours > 23) return false;
    if (minutes < 0 || minutes > 59) return false;
    if (seconds < 0 || seconds > 59) return false;
    return true;
  }

  return false;
}
