import { MessageId, pushMessage } from '../messages/index.js';
import type { ValidationContext } from '../types.js';
import { parseOPF } from './parser.js';
import type { ManifestItem, PackageDocument } from './types.js';
import { ITEM_PROPERTIES, LINK_PROPERTIES, SPINE_PROPERTIES } from './types.js';

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

      // RSC-017: bindings element is deprecated
      if (this.packageDoc.hasBindings) {
        pushMessage(context.messages, {
          id: MessageId.RSC_017,
          message: 'Use of the bindings element is deprecated',
          location: { path: opfPath },
        });
      }
    }

    // OPF-092: Validate xml:lang attributes in OPF
    if (this.packageDoc.xmlLangs) {
      for (const lang of this.packageDoc.xmlLangs) {
        if (lang === '') continue;
        if (lang !== lang.trim()) {
          pushMessage(context.messages, {
            id: MessageId.OPF_092,
            message: `Language tag "${lang}" is not well-formed`,
            location: { path: opfPath },
          });
        } else if (!isValidLanguageTag(lang)) {
          pushMessage(context.messages, {
            id: MessageId.OPF_092,
            message: `Language tag "${lang}" is not well-formed`,
            location: { path: opfPath },
          });
        }
      }
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
      // Verify the referenced identifier exists and points to dc:identifier
      const refId = this.packageDoc.uniqueIdentifier;
      const matchingDc = this.packageDoc.dcElements.find(
        (dc) => dc.name === 'identifier' && dc.id === refId,
      );
      if (!matchingDc) {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message: `package element unique-identifier attribute does not resolve to a dc:identifier element (given reference was "${refId}")`,
          location: { path: opfPath },
        });
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

      // OPF-085: Validate UUID format for dc:identifier starting with urn:uuid:
      if (dc.name === 'identifier' && dc.value) {
        const val = dc.value.trim();
        if (val.startsWith('urn:uuid:')) {
          const uuid = val.substring(9);
          if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)) {
            pushMessage(context.messages, {
              id: MessageId.OPF_085,
              message: `Invalid UUID value "${uuid}"`,
              location: { path: opfPath },
            });
          }
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

    // EPUB 3: Validate meta element property and scheme attributes
    if (this.packageDoc.version !== '2.0') {
      for (const meta of this.packageDoc.metaElements) {
        // OPF-025: property/scheme must not be a whitespace-separated list
        if (meta.property && /\s/.test(meta.property.trim())) {
          pushMessage(context.messages, {
            id: MessageId.OPF_025,
            message: `Property value must be a single value, not a list: "${meta.property}"`,
            location: { path: opfPath },
          });
        }
        if (meta.scheme && /\s/.test(meta.scheme.trim())) {
          pushMessage(context.messages, {
            id: MessageId.OPF_025,
            message: `Scheme value must be a single value, not a list: "${meta.scheme}"`,
            location: { path: opfPath },
          });
        }

        // OPF-026: property name must be well-formed (valid prefix:localname)
        if (meta.property && !/\s/.test(meta.property.trim())) {
          const prop = meta.property.trim();
          if (prop.includes(':') && /:\s*$/.test(prop)) {
            pushMessage(context.messages, {
              id: MessageId.OPF_026,
              message: `Malformed property name: "${prop}"`,
              location: { path: opfPath },
            });
          }
        }

        // OPF-027: scheme must be a known value or use a prefix
        if (meta.scheme) {
          const scheme = meta.scheme.trim();
          if (scheme && !scheme.includes(':')) {
            pushMessage(context.messages, {
              id: MessageId.OPF_027,
              message: `Undefined property: "${scheme}"`,
              location: { path: opfPath },
            });
          }
        }
      }
    }

    // EPUB 3: Validate refines attributes
    if (this.packageDoc.version !== '2.0') {
      // Collect all IDs from the OPF document
      const allIds = new Set<string>();
      for (const dc of dcElements) {
        if (dc.id) allIds.add(dc.id);
      }
      for (const meta of this.packageDoc.metaElements) {
        if (meta.id) allIds.add(meta.id);
      }
      for (const link of this.packageDoc.linkElements) {
        if (link.id) allIds.add(link.id);
      }
      for (const item of this.packageDoc.manifest) {
        allIds.add(item.id);
      }

      // Check for duplicate IDs across all elements
      const seenGlobalIds = new Set<string>();
      const allIdSources: { id: string; normalized: string }[] = [];
      for (const dc of dcElements) {
        if (dc.id) allIdSources.push({ id: dc.id, normalized: dc.id.trim() });
      }
      for (const meta of this.packageDoc.metaElements) {
        if (meta.id) allIdSources.push({ id: meta.id, normalized: meta.id.trim() });
      }
      for (const link of this.packageDoc.linkElements) {
        if (link.id) allIdSources.push({ id: link.id, normalized: link.id.trim() });
      }
      for (const item of this.packageDoc.manifest) {
        allIdSources.push({ id: item.id, normalized: item.id.trim() });
      }
      for (const src of allIdSources) {
        if (seenGlobalIds.has(src.normalized)) {
          pushMessage(context.messages, {
            id: MessageId.RSC_005,
            message: `Duplicate "${src.normalized}"`,
            location: { path: opfPath },
          });
        }
        seenGlobalIds.add(src.normalized);
      }

      for (const meta of this.packageDoc.metaElements) {
        if (!meta.refines) continue;

        const refines = meta.refines;

        // RSC-005: refines must be a relative URL (not absolute)
        if (/^[a-zA-Z][a-zA-Z0-9+\-.]*:/.test(refines)) {
          pushMessage(context.messages, {
            id: MessageId.RSC_005,
            message: '@refines must be a relative URL',
            location: { path: opfPath },
          });
          continue;
        }

        // RSC-017: refines should use a fragment ID (start with #)
        if (!refines.startsWith('#')) {
          pushMessage(context.messages, {
            id: MessageId.RSC_017,
            message: `@refines should instead refer to "${refines}" using a fragment identifier pointing to its manifest item`,
            location: { path: opfPath },
          });
          continue;
        }

        // RSC-005: refines fragment must target an existing ID
        const targetId = refines.substring(1);
        if (!allIds.has(targetId)) {
          pushMessage(context.messages, {
            id: MessageId.RSC_005,
            message: `@refines missing target id: "${targetId}"`,
            location: { path: opfPath },
          });
        }
      }

      // OPF-065: Detect refines cycles
      this.detectRefinesCycles(context, opfPath);
    }

    // EPUB 3: Check for dcterms:modified meta
    if (this.packageDoc.version !== '2.0') {
      const modifiedMetas = this.packageDoc.metaElements.filter(
        (meta) => meta.property === 'dcterms:modified',
      );
      const modifiedMeta = modifiedMetas[0];
      if (modifiedMetas.length > 1) {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message: 'package dcterms:modified meta element must occur exactly once',
          location: { path: opfPath },
        });
      }
      if (!modifiedMeta) {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message: 'package dcterms:modified meta element must occur exactly once',
          location: { path: opfPath },
        });
        pushMessage(context.messages, {
          id: MessageId.OPF_054,
          message: 'EPUB 3 metadata must include a dcterms:modified meta element',
          location: { path: opfPath },
        });
      } else if (modifiedMeta.value) {
        // Check for strict CCYY-MM-DDThh:mm:ssZ format (Schematron check)
        const strictModifiedPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
        if (!strictModifiedPattern.test(modifiedMeta.value.trim())) {
          pushMessage(context.messages, {
            id: MessageId.RSC_005,
            message: `dcterms:modified illegal syntax (expecting: "CCYY-MM-DDThh:mm:ssZ")`,
            location: { path: opfPath },
          });
        }
        if (!isValidW3CDateFormat(modifiedMeta.value)) {
          pushMessage(context.messages, {
            id: MessageId.OPF_054,
            message: `Invalid dcterms:modified date format "${modifiedMeta.value}"; must be W3C date format (ISO 8601)`,
            location: { path: opfPath },
          });
        }
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
      // OPF-092: Validate hreflang well-formedness
      if (link.hreflang !== undefined && link.hreflang !== '') {
        const lang = link.hreflang;
        if (lang !== lang.trim()) {
          pushMessage(context.messages, {
            id: MessageId.OPF_092,
            message: `Language tag must not have leading or trailing whitespace: "${lang}"`,
            location: { path: opfPath },
          });
        } else if (!isValidLanguageTag(lang)) {
          pushMessage(context.messages, {
            id: MessageId.OPF_092,
            message: `Invalid language tag: "${lang}"`,
            location: { path: opfPath },
          });
        }
      }

      // OPF-027: Validate link properties
      if (link.properties) {
        for (const prop of link.properties) {
          if (!LINK_PROPERTIES.has(prop) && !prop.includes(':')) {
            pushMessage(context.messages, {
              id: MessageId.OPF_027,
              message: `Undefined property: "${prop}"`,
              location: { path: opfPath },
            });
          }
        }
      }

      const href = link.href;
      const decodedHref = tryDecodeUriComponent(href);

      const basePath = href.includes('#') ? href.substring(0, href.indexOf('#')) : href;
      const basePathDecoded = decodedHref.includes('#')
        ? decodedHref.substring(0, decodedHref.indexOf('#'))
        : decodedHref;

      if (href.startsWith('#')) {
        // OPF-098: link href must not target an element in the package document
        pushMessage(context.messages, {
          id: MessageId.OPF_098,
          message: `The "href" attribute must reference resources, not elements in the package document, but found URL "${href}".`,
          location: { path: opfPath },
        });
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
        decodedHref !== item.href ? resolvePath(opfPath, decodedHref).normalize('NFC') : fullPath;

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
              id: MessageId.RSC_005,
              message: `The manifest item representing the Navigation Document must be of the "application/xhtml+xml" type (given type was "${item.mediaType}")`,
              location: { path: opfPath },
            });
            pushMessage(context.messages, {
              id: MessageId.OPF_012,
              message: `Item with "nav" property must be XHTML, found: ${item.mediaType}`,
              location: { path: opfPath },
            });
          }
        }

        // OPF-012: cover-image property must only be used on image media types
        if (item.properties.includes('cover-image')) {
          if (!item.mediaType.startsWith('image/')) {
            pushMessage(context.messages, {
              id: MessageId.OPF_012,
              message: `Item with "cover-image" property must be an image, found: ${item.mediaType}`,
              location: { path: opfPath },
            });
          }
        }
      }

      // RSC-020: Check for unencoded spaces in href
      if (item.href.includes(' ')) {
        pushMessage(context.messages, {
          id: MessageId.RSC_020,
          message: `"${item.href}" is not a valid URL (Illegal character in path segment: space is not allowed)`,
          location: { path: opfPath },
        });
      }

      // Check for href fragment (EPUB 3)
      if (this.packageDoc.version !== '2.0' && item.href.includes('#')) {
        pushMessage(context.messages, {
          id: MessageId.OPF_091,
          message: `Manifest item href must not contain fragment identifier: "${item.href}"`,
          location: { path: opfPath },
        });
      }

      // EPUB 3: Check remote resource constraints (RSC-006)
      if (
        this.packageDoc.version !== '2.0' &&
        (item.href.startsWith('http://') || item.href.startsWith('https://'))
      ) {
        const isAllowedRemoteType =
          item.mediaType.startsWith('audio/') ||
          item.mediaType.startsWith('video/') ||
          item.mediaType.startsWith('font/') ||
          item.mediaType === 'application/font-sfnt' ||
          item.mediaType === 'application/font-woff' ||
          item.mediaType === 'application/vnd.ms-opentype';

        const inSpine = this.packageDoc.spine.some((s) => s.idref === item.id);

        // Spine items that are remote with non-standard types are never allowed
        if (inSpine) {
          if (!isAllowedRemoteType) {
            pushMessage(context.messages, {
              id: MessageId.RSC_006,
              message: `Remote resource reference is not allowed in this context; resource "${item.href}" must be located in the EPUB container`,
              location: { path: opfPath },
            });
          }
          if (!item.properties?.includes('remote-resources')) {
            pushMessage(context.messages, {
              id: MessageId.RSC_006,
              message: `Manifest item "${item.id}" references remote resource but is missing "remote-resources" property`,
              location: { path: opfPath },
            });
          }
        }

        // Non-spine remote items with non-standard types are checked later
        // by the reference validator (which has content reference context)
      }
    }

    // EPUB 3: Check nav and cover-image property counts
    if (this.packageDoc.version !== '2.0') {
      const navItems = this.packageDoc.manifest.filter((item) => item.properties?.includes('nav'));
      if (navItems.length === 0) {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message: 'Exactly one manifest item must declare the "nav" property',
          location: { path: opfPath },
        });
      } else if (navItems.length > 1) {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message: `Exactly one manifest item must declare the "nav" property (number of "nav" items: ${String(navItems.length)}).`,
          location: { path: opfPath },
        });
      }

      const coverItems = this.packageDoc.manifest.filter((item) =>
        item.properties?.includes('cover-image'),
      );
      if (coverItems.length > 1) {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message: `Multiple occurrences of the "cover-image" property (number of "cover-image" items: ${String(coverItems.length)}).`,
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
    } else if (!ncxId && this.packageDoc.version !== '2.0') {
      // EPUB 3: If NCX is in manifest, spine toc attribute must be set
      const hasNcxInManifest = this.packageDoc.manifest.some(
        (item) => item.mediaType === 'application/x-dtbncx+xml',
      );
      if (hasNcxInManifest) {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message:
            'spine element toc attribute must be set when an NCX is included in the publication',
          location: { path: opfPath },
        });
      }
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
      if (!isSpineMediaType(item.mediaType)) {
        if (!item.fallback) {
          pushMessage(context.messages, {
            id: MessageId.OPF_043,
            message: `Spine item "${item.id}" has non-standard media type "${item.mediaType}" without fallback`,
            location: { path: opfPath },
          });
        } else if (!this.fallbackChainResolvesToContentDocument(item.id)) {
          pushMessage(context.messages, {
            id: MessageId.OPF_044,
            message: `Spine item "${item.id}" has non-standard media type "${item.mediaType}" and its fallback chain does not resolve to a content document`,
            location: { path: opfPath },
          });
        }
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

  private detectRefinesCycles(context: ValidationContext, opfPath: string): void {
    if (!this.packageDoc) return;

    // Build graph: id -> ids it refines (via meta elements that refine it)
    const refinesGraph = new Map<string, string[]>();
    for (const meta of this.packageDoc.metaElements) {
      if (!meta.refines || !meta.id) continue;
      if (!meta.refines.startsWith('#')) continue;
      const targetId = meta.refines.substring(1);
      // meta.id refines targetId — so there's an edge from meta.id to targetId
      const existing = refinesGraph.get(meta.id);
      if (existing) {
        existing.push(targetId);
      } else {
        refinesGraph.set(meta.id, [targetId]);
      }
    }

    // Detect cycles using DFS
    const visited = new Set<string>();
    const inStack = new Set<string>();
    const reportedCycles = new Set<string>();

    const dfs = (node: string): boolean => {
      if (inStack.has(node)) return true;
      if (visited.has(node)) return false;
      visited.add(node);
      inStack.add(node);

      const neighbors = refinesGraph.get(node) ?? [];
      for (const neighbor of neighbors) {
        if (dfs(neighbor)) {
          if (!reportedCycles.has(node)) {
            reportedCycles.add(node);
            pushMessage(context.messages, {
              id: MessageId.OPF_065,
              message: `Invalid metadata declaration, probably due to a cycle in "refines" metadata.`,
              location: { path: opfPath },
            });
          }
          return true;
        }
      }

      inStack.delete(node);
      return false;
    };

    for (const node of refinesGraph.keys()) {
      dfs(node);
    }
  }

  private validateCollections(context: ValidationContext, opfPath: string): void {
    if (!this.packageDoc) return;

    const collections = this.packageDoc.collections;
    if (collections.length === 0) {
      return;
    }

    for (const collection of collections) {
      // RSC-005: manifest collection must not be at the top level
      if (collection.role === 'manifest') {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message: 'Collection with role "manifest" must be a child of another collection',
          location: { path: opfPath },
        });
      }

      // OPF-070: collection role URL must be valid if it looks like a URL
      if (collection.role.includes(':')) {
        try {
          new URL(collection.role);
        } catch {
          pushMessage(context.messages, {
            id: MessageId.OPF_070,
            message: `Invalid collection role URL: "${collection.role}"`,
            location: { path: opfPath },
          });
        }
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

  private fallbackChainResolvesToContentDocument(itemId: string): boolean {
    const visited = new Set<string>();
    let currentId: string | undefined = itemId;
    while (currentId) {
      if (visited.has(currentId)) return false;
      visited.add(currentId);
      const item = this.manifestById.get(currentId);
      if (!item) return false;
      if (isSpineMediaType(item.mediaType)) return true;
      currentId = item.fallback;
    }
    return false;
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
  // BCP 47 language tag validation
  // Supports: primary subtag, script, region, variants, extensions, and private-use
  // Also supports grandfathered tags (simplified: allow single-letter singletons)
  const pattern =
    /^[a-zA-Z]{2,3}(-[a-zA-Z]{4})?(-[a-zA-Z]{2}|-\d{3})?(-([a-zA-Z\d]{5,8}|\d[a-zA-Z\d]{3}))*(-[a-wyzA-WYZ](-[a-zA-Z\d]{2,8})+)*(-x(-[a-zA-Z\d]{1,8})+)?$/;
  if (pattern.test(tag)) return true;
  // Private-use only tags (e.g., "x-custom")
  if (/^x(-[a-zA-Z\d]{1,8})+$/.test(tag)) return true;
  // Grandfathered irregular tags
  const grandfathered = new Set([
    'en-GB-oed',
    'i-ami',
    'i-bnn',
    'i-default',
    'i-enochian',
    'i-hak',
    'i-klingon',
    'i-lux',
    'i-mingo',
    'i-navajo',
    'i-pwn',
    'i-tao',
    'i-tay',
    'i-tsu',
    'sgn-BE-FR',
    'sgn-BE-NL',
    'sgn-CH-DE',
    'art-lojban',
    'cel-gaulish',
    'no-bok',
    'no-nyn',
    'zh-guoyu',
    'zh-hakka',
    'zh-min',
    'zh-min-nan',
    'zh-xiang',
  ]);
  return grandfathered.has(tag);
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
