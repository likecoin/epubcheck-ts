import { MessageId, pushMessage } from '../messages/index.js';
import { checkUrlLeaking, isDataURL, isFileURL } from '../references/url.js';
import type { ValidationContext } from '../types.js';
import { parseOPF } from './parser.js';
import type { ManifestItem, PackageDocument } from './types.js';
import { ITEM_PROPERTIES, LINK_PROPERTIES, SPINE_PROPERTIES } from './types.js';

const VALID_VERSIONS = new Set(['2.0', '3.0', '3.1', '3.2', '3.3']);

const DEPRECATED_MEDIA_TYPES = new Set([
  'text/x-oeb1-document',
  'text/x-oeb1-css',
  'application/x-oeb1-package',
  'text/x-oeb1-html',
]);

const VALID_RELATOR_CODES = new Set([
  'abr',
  'acp',
  'act',
  'adi',
  'adp',
  'aft',
  'anl',
  'anm',
  'ann',
  'ant',
  'ape',
  'apl',
  'app',
  'aqt',
  'arc',
  'ard',
  'arr',
  'art',
  'asg',
  'asn',
  'ato',
  'att',
  'auc',
  'aud',
  'aui',
  'aus',
  'aut',
  'bdd',
  'bjd',
  'bkd',
  'bkp',
  'blw',
  'bnd',
  'bpd',
  'brd',
  'brl',
  'bsl',
  'cas',
  'ccp',
  'chr',
  'clb',
  'cli',
  'cll',
  'clr',
  'clt',
  'cmm',
  'cmp',
  'cmt',
  'cnd',
  'cng',
  'cns',
  'coe',
  'col',
  'com',
  'con',
  'cor',
  'cos',
  'cot',
  'cou',
  'cov',
  'cpc',
  'cpe',
  'cph',
  'cpl',
  'cpt',
  'cre',
  'crp',
  'crr',
  'crt',
  'csl',
  'csp',
  'cst',
  'ctb',
  'cte',
  'ctg',
  'ctr',
  'cts',
  'ctt',
  'cur',
  'cwt',
  'dbp',
  'dfd',
  'dfe',
  'dft',
  'dgc',
  'dgg',
  'dgs',
  'dis',
  'dln',
  'dnc',
  'dnr',
  'dpc',
  'dpt',
  'drm',
  'drt',
  'dsr',
  'dst',
  'dtc',
  'dte',
  'dtm',
  'dto',
  'dub',
  'edc',
  'edm',
  'edt',
  'egr',
  'elg',
  'elt',
  'eng',
  'enj',
  'etr',
  'evp',
  'exp',
  'fac',
  'fds',
  'fld',
  'flm',
  'fmd',
  'fmk',
  'fmo',
  'fmp',
  'fnd',
  'fpy',
  'frg',
  'gis',
  'grt',
  'his',
  'hnr',
  'hst',
  'ill',
  'ilu',
  'ins',
  'inv',
  'isb',
  'itr',
  'ive',
  'ivr',
  'jud',
  'jug',
  'lbr',
  'lbt',
  'ldr',
  'led',
  'lee',
  'lel',
  'len',
  'let',
  'lgd',
  'lie',
  'lil',
  'lit',
  'lsa',
  'lse',
  'lso',
  'ltg',
  'lyr',
  'mcp',
  'mdc',
  'med',
  'mfp',
  'mfr',
  'mod',
  'mon',
  'mrb',
  'mrk',
  'msd',
  'mte',
  'mtk',
  'mus',
  'nrt',
  'opn',
  'org',
  'orm',
  'osp',
  'oth',
  'own',
  'pad',
  'pan',
  'pat',
  'pbd',
  'pbl',
  'pdr',
  'pfr',
  'pht',
  'plt',
  'pma',
  'pmn',
  'pop',
  'ppm',
  'ppt',
  'pra',
  'prc',
  'prd',
  'pre',
  'prf',
  'prg',
  'prm',
  'prn',
  'pro',
  'prp',
  'prs',
  'prt',
  'prv',
  'pta',
  'pte',
  'ptf',
  'pth',
  'ptt',
  'pup',
  'rbr',
  'rcd',
  'rce',
  'rcp',
  'rdd',
  'red',
  'ren',
  'res',
  'rev',
  'rpc',
  'rps',
  'rpt',
  'rpy',
  'rse',
  'rsg',
  'rsp',
  'rsr',
  'rst',
  'rth',
  'rtm',
  'sad',
  'sce',
  'scl',
  'scr',
  'sds',
  'sec',
  'sgd',
  'sgn',
  'sht',
  'sll',
  'sng',
  'spk',
  'spn',
  'spy',
  'srv',
  'std',
  'stg',
  'stl',
  'stm',
  'stn',
  'str',
  'tcd',
  'tch',
  'ths',
  'tld',
  'tlp',
  'trc',
  'trl',
  'tyd',
  'tyg',
  'uvp',
  'vac',
  'vdg',
  'voc',
  'wac',
  'wal',
  'wam',
  'wat',
  'wdc',
  'wde',
  'win',
  'wit',
  'wpr',
  'wst',
]);

const DEPRECATED_LINK_REL = new Set([
  'marc21xml-record',
  'mods-record',
  'onix-record',
  'xmp-record',
  'xml-signature',
]);

const GRANDFATHERED_LANG_TAGS = new Set([
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
        if (lang !== lang.trim() || !isValidLanguageTag(lang)) {
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

    if (!VALID_VERSIONS.has(this.packageDoc.version)) {
      pushMessage(context.messages, {
        id: MessageId.OPF_001,
        message: `Invalid package version "${this.packageDoc.version}"; must be one of: ${Array.from(VALID_VERSIONS).join(', ')}`,
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
        const role = dc.attributes['opf:role'];
        if (role && !VALID_RELATOR_CODES.has(role) && !role.startsWith('oth.')) {
          pushMessage(context.messages, {
            id: MessageId.OPF_052,
            message: `Invalid role value "${role}" in dc:creator`,
            location: { path: opfPath },
          });
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
      for (const itemref of this.packageDoc.spine) {
        if (itemref.id) allIdSources.push({ id: itemref.id, normalized: itemref.id.trim() });
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
        // Only fire when refines resolves to a manifest item href (Java compat)
        if (!refines.startsWith('#')) {
          const isManifestHref = this.packageDoc.manifest.some((item) => item.href === refines);
          if (isManifestHref) {
            pushMessage(context.messages, {
              id: MessageId.RSC_017,
              message: `@refines should instead refer to "${refines}" using a fragment identifier pointing to its manifest item`,
              location: { path: opfPath },
            });
          }
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

    // EPUB 3: Validate meta element vocabulary (D-vocabularies Schematron)
    if (this.packageDoc.version !== '2.0') {
      this.validateMetaPropertiesVocab(context, opfPath, dcElements);
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
   * Validate EPUB 3 meta element vocabulary (D-vocabularies: meta-properties)
   * Ports package-30.sch Schematron patterns for authority, term, belongs-to-collection,
   * collection-type, display-seq, file-as, group-position, identifier-type, meta-auth,
   * role, source-of, and title-type.
   */
  private validateMetaPropertiesVocab(
    context: ValidationContext,
    opfPath: string,
    dcElements: { name: string; value: string; id?: string; attributes?: Record<string, string> }[],
  ): void {
    if (!this.packageDoc) return;

    const metaElements = this.packageDoc.metaElements;

    // Build meta id → property map
    const metaIdToProp = new Map<string, string>();
    for (const meta of metaElements) {
      if (meta.id) metaIdToProp.set(meta.id.trim(), meta.property.trim());
    }

    // opf.dc.subject.authority-term: for each dc:subject with an id, check authority/term counts
    for (const dc of dcElements) {
      if (dc.name !== 'subject' || !dc.id) continue;
      const subjectId = dc.id.trim();
      // Schematron uses substring(refines, 2) which strips first char, so "#id".substring(1) = "id"
      const authorityCount = metaElements.filter(
        (m) => m.property.trim() === 'authority' && m.refines?.trim().substring(1) === subjectId,
      ).length;
      const termCount = metaElements.filter(
        (m) => m.property.trim() === 'term' && m.refines?.trim().substring(1) === subjectId,
      ).length;
      if (authorityCount > 1 || termCount > 1) {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message:
            'Only one pair of authority and term properties can be associated with a dc:subject',
          location: { path: opfPath },
        });
      } else if (authorityCount === 1 && termCount === 0) {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message:
            'A term property must be associated with a dc:subject when an authority is specified',
          location: { path: opfPath },
        });
      } else if (authorityCount === 0 && termCount === 1) {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message:
            'An authority property must be associated with a dc:subject when a term is specified',
          location: { path: opfPath },
        });
      }
    }

    // Track seen (property + ":" + refines) for cardinality checks
    const seenPropertyRefines = new Set<string>();

    for (const meta of metaElements) {
      const prop = meta.property.trim();
      const refines = meta.refines?.trim();

      switch (prop) {
        case 'authority': {
          // Must refine a dc:subject: concat('#', id) = refines
          const ok = dcElements.some(
            (dc) => dc.name === 'subject' && dc.id && '#' + dc.id.trim() === refines,
          );
          if (!ok) {
            pushMessage(context.messages, {
              id: MessageId.RSC_005,
              message: 'Property "authority" must refine a "subject" property.',
              location: { path: opfPath },
            });
          }
          break;
        }

        case 'term': {
          // Must refine a dc:subject: concat('#', id) = refines
          const ok = dcElements.some(
            (dc) => dc.name === 'subject' && dc.id && '#' + dc.id.trim() === refines,
          );
          if (!ok) {
            pushMessage(context.messages, {
              id: MessageId.RSC_005,
              message: 'Property "term" must refine a "subject" property.',
              location: { path: opfPath },
            });
          }
          break;
        }

        case 'belongs-to-collection': {
          // If refines, target (by substring(1)) must be another belongs-to-collection meta
          if (refines) {
            const targetId = refines.substring(1);
            if (metaIdToProp.get(targetId) !== 'belongs-to-collection') {
              pushMessage(context.messages, {
                id: MessageId.RSC_005,
                message:
                  'Property "belongs-to-collection" can only refine other "belongs-to-collection" properties.',
                location: { path: opfPath },
              });
            }
          }
          break;
        }

        case 'collection-type': {
          // Must refine a belongs-to-collection meta (no refines = error too)
          if (!refines) {
            pushMessage(context.messages, {
              id: MessageId.RSC_005,
              message: 'Property "collection-type" must refine a "belongs-to-collection" property.',
              location: { path: opfPath },
            });
          } else {
            const targetId = refines.substring(1);
            if (metaIdToProp.get(targetId) !== 'belongs-to-collection') {
              pushMessage(context.messages, {
                id: MessageId.RSC_005,
                message:
                  'Property "collection-type" must refine a "belongs-to-collection" property.',
                location: { path: opfPath },
              });
            }
          }
          // Cardinality
          const ctKey = `${prop}:${refines ?? ''}`;
          if (seenPropertyRefines.has(ctKey)) {
            pushMessage(context.messages, {
              id: MessageId.RSC_005,
              message:
                '"collection-type" cannot be declared more than once to refine the same "belongs-to-collection" expression.',
              location: { path: opfPath },
            });
          }
          seenPropertyRefines.add(ctKey);
          break;
        }

        case 'display-seq': {
          const key = `${prop}:${refines ?? ''}`;
          if (seenPropertyRefines.has(key)) {
            pushMessage(context.messages, {
              id: MessageId.RSC_005,
              message:
                '"display-seq" cannot be declared more than once to refine the same expression.',
              location: { path: opfPath },
            });
          }
          seenPropertyRefines.add(key);
          break;
        }

        case 'file-as': {
          const key = `${prop}:${refines ?? ''}`;
          if (seenPropertyRefines.has(key)) {
            pushMessage(context.messages, {
              id: MessageId.RSC_005,
              message: '"file-as" cannot be declared more than once to refine the same expression.',
              location: { path: opfPath },
            });
          }
          seenPropertyRefines.add(key);
          break;
        }

        case 'group-position': {
          const key = `${prop}:${refines ?? ''}`;
          if (seenPropertyRefines.has(key)) {
            pushMessage(context.messages, {
              id: MessageId.RSC_005,
              message:
                '"group-position" cannot be declared more than once to refine the same expression.',
              location: { path: opfPath },
            });
          }
          seenPropertyRefines.add(key);
          break;
        }

        case 'identifier-type': {
          // Must refine dc:identifier or dc:source: concat('#', id) = refines
          const ok = dcElements.some(
            (dc) =>
              (dc.name === 'identifier' || dc.name === 'source') &&
              dc.id &&
              '#' + dc.id.trim() === refines,
          );
          if (!ok) {
            pushMessage(context.messages, {
              id: MessageId.RSC_005,
              message:
                'Property "identifier-type" must refine an "identifier" or "source" property.',
              location: { path: opfPath },
            });
          }
          // Cardinality
          const itKey = `${prop}:${refines ?? ''}`;
          if (seenPropertyRefines.has(itKey)) {
            pushMessage(context.messages, {
              id: MessageId.RSC_005,
              message:
                '"identifier-type" cannot be declared more than once to refine the same expression.',
              location: { path: opfPath },
            });
          }
          seenPropertyRefines.add(itKey);
          break;
        }

        case 'meta-auth': {
          pushMessage(context.messages, {
            id: MessageId.RSC_017,
            message: 'Use of the meta-auth property is deprecated',
            location: { path: opfPath },
          });
          break;
        }

        case 'role': {
          // Must refine dc:creator, dc:contributor, or dc:publisher: concat('#', id) = refines
          const ok = dcElements.some(
            (dc) =>
              (dc.name === 'creator' || dc.name === 'contributor' || dc.name === 'publisher') &&
              dc.id &&
              '#' + dc.id.trim() === refines,
          );
          if (!ok) {
            pushMessage(context.messages, {
              id: MessageId.RSC_005,
              message:
                'Property "role" must refine a "creator", "contributor", or "publisher" property.',
              location: { path: opfPath },
            });
          }
          break;
        }

        case 'source-of': {
          // Value must be 'pagination'
          if (meta.value.trim() !== 'pagination') {
            pushMessage(context.messages, {
              id: MessageId.RSC_005,
              message: 'The "source-of" property must have the value "pagination"',
              location: { path: opfPath },
            });
          }
          // Must refine dc:source: uses substring(refines, 2) form
          const hasSourceRefines = dcElements.some(
            (dc) => dc.name === 'source' && dc.id && refines?.substring(1) === dc.id.trim(),
          );
          if (!hasSourceRefines) {
            pushMessage(context.messages, {
              id: MessageId.RSC_005,
              message: 'The "source-of" property must refine a "source" property.',
              location: { path: opfPath },
            });
          }
          // Cardinality
          const soKey = `${prop}:${refines ?? ''}`;
          if (seenPropertyRefines.has(soKey)) {
            pushMessage(context.messages, {
              id: MessageId.RSC_005,
              message:
                '"source-of" cannot be declared more than once to refine the same "source" expression.',
              location: { path: opfPath },
            });
          }
          seenPropertyRefines.add(soKey);
          break;
        }

        case 'title-type': {
          // Must refine dc:title: concat('#', id) = refines
          const ok = dcElements.some(
            (dc) => dc.name === 'title' && dc.id && '#' + dc.id.trim() === refines,
          );
          if (!ok) {
            pushMessage(context.messages, {
              id: MessageId.RSC_005,
              message: 'Property "title-type" must refine a "title" property.',
              location: { path: opfPath },
            });
          }
          // Cardinality
          const ttKey = `${prop}:${refines ?? ''}`;
          if (seenPropertyRefines.has(ttKey)) {
            pushMessage(context.messages, {
              id: MessageId.RSC_005,
              message:
                '"title-type" cannot be declared more than once to refine the same "title" expression.',
              location: { path: opfPath },
            });
          }
          seenPropertyRefines.add(ttKey);
          break;
        }
      }
    }
  }

  /**
   * Validate EPUB 3 link elements in metadata
   */
  private validateLinkElements(context: ValidationContext, opfPath: string): void {
    if (!this.packageDoc) return;

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

      // Parse rel keywords
      const relKeywords = link.rel ? link.rel.trim().split(/\s+/).filter(Boolean) : [];
      const hasRecord = relKeywords.includes('record');
      const hasVoicing = relKeywords.includes('voicing');
      const hasAlternate = relKeywords.includes('alternate');

      // OPF-089: alternate must not be combined with other rel keywords
      if (hasAlternate && relKeywords.length > 1) {
        pushMessage(context.messages, {
          id: MessageId.OPF_089,
          message: `The "alternate" keyword must not be combined with other keywords in the "rel" attribute`,
          location: { path: opfPath },
        });
      }

      // OPF-086: deprecated rel keywords
      for (const kw of relKeywords) {
        if (DEPRECATED_LINK_REL.has(kw)) {
          pushMessage(context.messages, {
            id: MessageId.OPF_086,
            message: `The rel keyword "${kw}" is deprecated`,
            location: { path: opfPath },
          });
        }
      }

      // RSC-005: "record" links must not have a refines attribute
      if (hasRecord && link.refines) {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message:
            '"record" links only applies to the Publication (must not have a "refines" attribute).',
          location: { path: opfPath },
        });
      }

      // RSC-005: "voicing" links must have a refines attribute
      if (hasVoicing && !link.refines) {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message: '"voicing" links must have a "refines" attribute.',
          location: { path: opfPath },
        });
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

      // RSC-029: data URLs are not allowed in link hrefs
      if (isDataURL(href)) {
        pushMessage(context.messages, {
          id: MessageId.RSC_029,
          message: `Data URLs are not allowed in the package document link href`,
          location: { path: opfPath },
        });
        continue;
      }

      // RSC-030: file URLs are not allowed in link hrefs
      if (isFileURL(href)) {
        pushMessage(context.messages, {
          id: MessageId.RSC_030,
          message: `File URLs are not allowed in the package document`,
          location: { path: opfPath },
        });
        continue;
      }

      const isRemote = /^[a-zA-Z][a-zA-Z0-9+\-.]*:/.test(href);

      // RSC-033: Relative URLs must not have a query component
      if (!isRemote && href.includes('?')) {
        pushMessage(context.messages, {
          id: MessageId.RSC_033,
          message: `Relative URL strings must not have a query component: "${href}"`,
          location: { path: opfPath },
        });
      }

      // OPF-095: voicing media-type must be audio (applies to both local and remote)
      if (hasVoicing && link.mediaType && !link.mediaType.startsWith('audio/')) {
        pushMessage(context.messages, {
          id: MessageId.OPF_095,
          message: `The "voicing" link media type must be an audio type, but found "${link.mediaType}"`,
          location: { path: opfPath },
        });
      }

      // OPF-094: record/voicing require media-type for remote URLs
      if (isRemote && !link.mediaType && (hasRecord || hasVoicing)) {
        pushMessage(context.messages, {
          id: MessageId.OPF_094,
          message: `The "media-type" attribute is required for "record" and "voicing" links`,
          location: { path: opfPath },
        });
      }

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

      // Strip query strings for path resolution
      const basePathNoQuery = basePath.includes('?')
        ? basePath.substring(0, basePath.indexOf('?'))
        : basePath;
      const basePathDecodedNoQuery = basePathDecoded.includes('?')
        ? basePathDecoded.substring(0, basePathDecoded.indexOf('?'))
        : basePathDecoded;

      const resolvedPath = resolvePath(opfPath, basePathNoQuery);
      const resolvedPathDecoded =
        basePathDecodedNoQuery !== basePathNoQuery
          ? resolvePath(opfPath, basePathDecodedNoQuery)
          : resolvedPath;

      const fileExists = context.files.has(resolvedPath) || context.files.has(resolvedPathDecoded);
      const inManifest =
        this.manifestByHref.has(basePathNoQuery) || this.manifestByHref.has(basePathDecodedNoQuery);

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

      // RSC-029: data URLs are not allowed in manifest item hrefs
      if (isDataURL(item.href)) {
        pushMessage(context.messages, {
          id: MessageId.RSC_029,
          message: `Data URLs are not allowed in the manifest item href`,
          location: { path: opfPath },
        });
        continue;
      }

      // RSC-033: Relative URLs must not have a query component
      const isRemoteItem = /^[a-zA-Z][a-zA-Z0-9+\-.]*:/.test(item.href);
      if (!isRemoteItem && item.href.includes('?')) {
        pushMessage(context.messages, {
          id: MessageId.RSC_033,
          message: `Relative URL strings must not have a query component: "${item.href}"`,
          location: { path: opfPath },
        });
      }

      // Strip query string for path resolution
      const itemHrefBase = item.href.includes('?')
        ? item.href.substring(0, item.href.indexOf('?'))
        : item.href;

      // Check for self-referencing manifest item (OPF-099)
      // The manifest must not list the package document itself
      // Note: href may be URL-encoded (e.g., table%20us%202.png) but file paths are not
      const fullPath = resolvePath(opfPath, itemHrefBase);
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
      // Also try URL-decoded version for comparison (use query-stripped href)
      const decodedHref = tryDecodeUriComponent(itemHrefBase);
      const fullPathDecoded =
        decodedHref !== itemHrefBase
          ? resolvePath(opfPath, decodedHref).normalize('NFC')
          : fullPath;

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
      if (DEPRECATED_MEDIA_TYPES.has(item.mediaType)) {
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
          item.mediaType === 'application/font-woff2' ||
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
  return GRANDFATHERED_LANG_TAGS.has(tag);
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
