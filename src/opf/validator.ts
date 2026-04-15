import { MessageId, pushMessage } from '../messages/index.js';
import { checkUrlLeaking, isDataURL, isFileURL } from '../references/url.js';
import { isValidSmilClock, parseSmilClock } from '../smil/clock.js';
import { EPUB_VERSIONS, type EPUBProfile, type ValidationContext } from '../types.js';
import { parseDoctype } from '../util/doctype.js';
import { sniffXmlEncoding } from '../util/encoding.js';
import { parseOPF, stripXmlComments } from './parser.js';
import type { Collection, ManifestItem, PackageDocument } from './types.js';
import { ITEM_PROPERTIES, LINK_PROPERTIES, SPINE_PROPERTIES } from './types.js';

const DEPRECATED_MEDIA_TYPES = new Set([
  'text/x-oeb1-document',
  'text/x-oeb1-css',
  'application/x-oeb1-package',
  'text/x-oeb1-html',
]);

function getPreferredMediaType(mimeType: string, path: string): string | null {
  switch (mimeType) {
    case 'application/font-sfnt':
      if (path.endsWith('.ttf')) return 'font/ttf';
      if (path.endsWith('.otf')) return 'font/otf';
      return 'font/(ttf|otf)';
    case 'application/vnd.ms-opentype':
      return 'font/otf';
    case 'application/font-woff':
      return 'font/woff';
    case 'application/x-font-ttf':
      return 'font/ttf';
    case 'text/javascript':
    case 'application/ecmascript':
      return 'application/javascript';
    default:
      return null;
  }
}

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

const EXCLUSIVE_SPINE_GROUPS: readonly string[][] = [
  ['rendition:layout-reflowable', 'rendition:layout-pre-paginated'],
  [
    'rendition:orientation-auto',
    'rendition:orientation-landscape',
    'rendition:orientation-portrait',
  ],
  [
    'rendition:spread-auto',
    'rendition:spread-both',
    'rendition:spread-landscape',
    'rendition:spread-none',
    'rendition:spread-portrait',
  ],
  ['page-spread-left', 'page-spread-right', 'rendition:page-spread-center'],
  [
    'rendition:flow-auto',
    'rendition:flow-paginated',
    'rendition:flow-scrolled-continuous',
    'rendition:flow-scrolled-doc',
  ],
];

const RENDITION_META_RULES: readonly {
  property: string;
  allowedValues: ReadonlySet<string>;
  deprecated?: boolean;
  forbidRefines?: boolean;
  deprecatedValues?: ReadonlySet<string>;
  validateSyntax?: (value: string) => boolean;
}[] = [
  {
    property: 'rendition:layout',
    allowedValues: new Set(['reflowable', 'pre-paginated']),
    forbidRefines: true,
  },
  {
    property: 'rendition:orientation',
    allowedValues: new Set(['landscape', 'portrait', 'auto']),
    forbidRefines: true,
  },
  {
    property: 'rendition:spread',
    allowedValues: new Set(['none', 'landscape', 'portrait', 'both', 'auto']),
    forbidRefines: true,
    deprecatedValues: new Set(['portrait']),
  },
  {
    property: 'rendition:flow',
    allowedValues: new Set(['paginated', 'scrolled-continuous', 'scrolled-doc', 'auto']),
    forbidRefines: true,
  },
  {
    property: 'rendition:viewport',
    deprecated: true,
    allowedValues: new Set(),
    validateSyntax: (v: string) => /^(width=\d+,\s*height=\d+|height=\d+,\s*width=\d+)$/.test(v),
  },
];

const KNOWN_RENDITION_META_PROPERTIES = new Set(
  RENDITION_META_RULES.map((r) => r.property.slice('rendition:'.length)),
);

// a11y: vocabulary (EPUB Accessibility 1.1)
// Source: ../epubcheck/src/main/java/com/adobe/epubcheck/vocab/AccessibilityVocab.java
const KNOWN_A11Y_META_PROPERTIES = new Set(['certifiedBy', 'certifierCredential', 'exemption']);
const KNOWN_A11Y_LINKREL_PROPERTIES = new Set(['certifierCredential', 'certifierReport']);

// Required dc:type identifier per validation profile.
// Sources: ../epubcheck/src/main/resources/com/adobe/epubcheck/schema/30/
//   edupub/edu-opf.sch, dict/dict-opf.sch, previews/preview-pub-opf.sch
const PROFILE_DC_TYPE: Partial<Record<EPUBProfile, string>> = {
  edupub: 'edupub',
  dict: 'dictionary',
  preview: 'preview',
};

// Mirrors ../epubcheck/src/main/resources/com/adobe/epubcheck/schema/30/dict/dict-opf.sch
const DICTIONARY_TYPE_VALUES = new Set([
  'monolingual',
  'bilingual',
  'multilingual',
  'thesaurus',
  'encyclopedia',
  'spelling',
  'pronouncing',
  'etymological',
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

    // Check XML encoding before parsing
    const encoding = sniffXmlEncoding(opfData);
    if (encoding === 'UTF-16') {
      pushMessage(context.messages, {
        id: MessageId.RSC_027,
        message: `Detected non-UTF-8 encoding "${encoding}" in "${opfPath}"`,
        location: { path: opfPath },
      });
    } else if (encoding !== null) {
      pushMessage(context.messages, {
        id: MessageId.RSC_028,
        message: `Detected non-UTF-8 encoding "${encoding}" in "${opfPath}"`,
        location: { path: opfPath },
      });
    }

    const opfXml = new TextDecoder().decode(opfData);

    // HTM-009: EPUB 2 OPF DOCTYPE check.
    // Only the OEB 1.2 package DOCTYPE is allowed; any other PUBLIC/SYSTEM
    // identifier on an OPF file is reported. Mirrors Java DeclarationHandler:76-97.
    if (context.version === '2.0') {
      const info = parseDoctype(opfXml);
      if (
        info &&
        !(
          info.root === 'package' &&
          info.publicId === '+//ISBN 0-9673008-1-9//DTD OEB 1.2 Package//EN' &&
          info.systemId === 'http://openebook.org/dtds/oeb-1.2/oebpkg12.dtd'
        )
      ) {
        pushMessage(context.messages, {
          id: MessageId.HTM_009,
          message: 'Obsolete or irregular DOCTYPE declaration in OPF package document',
          location: { path: opfPath },
        });
      }
    }

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
    // EPUB 3 duplicate-id detection lives in validateMetadata (uses parsed data).
    // EPUB 2 has no such pass, so mirror Java's id-unique.sch Schematron here.
    if (this.packageDoc.version === '2.0') {
      this.validateOpfIdUniqueness(context, opfPath, opfXml);
    }
    this.validatePackageAttributes(context, opfPath);
    this.validateMetadata(context, opfPath);
    this.validateLinkElements(context, opfPath);
    this.validateManifest(context, opfPath);
    this.validateSpine(context, opfPath);
    this.validateFallbackChains(context, opfPath);
    this.validateUndeclaredResources(context, opfPath);

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

    // Accessibility metadata checks (EPUB 3 only)
    if (this.packageDoc.version.startsWith('3.')) {
      this.validateAccessibilityMetadata(context, opfPath);
      this.validateProfileDcType(context, opfPath);
      this.validateEdupubMetadata(context, opfPath);
      this.validateDictionaryMetadata(context, opfPath);
      this.validatePreviewMetadata(context, opfPath);
    }
  }

  // Mirrors ../epubcheck/src/main/resources/com/adobe/epubcheck/schema/30/previews/preview-pub-opf.sch
  private validatePreviewMetadata(context: ValidationContext, opfPath: string): void {
    if (!this.packageDoc) return;
    if (context.options.profile !== 'preview') return;

    const sources = this.packageDoc.dcElements.filter((dc) => dc.name === 'source');
    if (sources.length === 0) {
      pushMessage(context.messages, {
        id: MessageId.RSC_017,
        message:
          'An EPUB Preview publication should link back to its source Publication using a "dc:source" element.',
        location: { path: opfPath },
      });
      return;
    }

    // Self-source check: dc:source value must not equal the unique identifier value
    const uidRef = this.packageDoc.uniqueIdentifier;
    if (!uidRef) return;
    const uidElement = this.packageDoc.dcElements.find(
      (dc) => dc.name === 'identifier' && dc.id === uidRef,
    );
    const uidValue = uidElement?.value.trim();
    if (!uidValue) return;
    for (const source of sources) {
      if (source.value.trim() === uidValue) {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message:
            'A Preview Publication must not use the same package identifier as its source Publication.',
          location: { path: opfPath },
        });
      }
    }
  }

  // Mirrors ../epubcheck/src/main/resources/com/adobe/epubcheck/schema/30/dict/dict-opf.sch
  private validateDictionaryMetadata(context: ValidationContext, opfPath: string): void {
    if (!this.packageDoc) return;

    // dict.type: dictionary-type value must be in the controlled vocabulary.
    // This check fires regardless of profile — the meta property is part of
    // the default package vocabulary.
    for (const meta of this.packageDoc.metaElements) {
      if (meta.property.trim() !== 'dictionary-type') continue;
      const value = meta.value.trim();
      if (!DICTIONARY_TYPE_VALUES.has(value)) {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message: `EPUB Dictionaries "dictionary-type" metadata must be one of ${[...DICTIONARY_TYPE_VALUES].map((v) => `"${v}"`).join(', ')}. Found: "${value}"`,
          location: { path: opfPath },
        });
      }
    }

    if (context.options.profile !== 'dict') return;

    // dict.single-dict: when fewer than 2 dictionary collections exist, the
    // publication must contain exactly one manifest item with both
    // "search-key-map" and "dictionary" properties.
    const dictCollectionCount = this.packageDoc.collections.filter(
      (c) => c.role === 'dictionary',
    ).length;
    if (dictCollectionCount < 2) {
      const skmItems = this.packageDoc.manifest.filter(
        (item) =>
          item.properties?.includes('search-key-map') && item.properties.includes('dictionary'),
      );
      if (skmItems.length !== 1) {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message:
            'An EPUB Publication consisting of a single EPUB Dictionary must contain exactly one Search Key Map document for this dictionary (i.e. exactly one item with properties "search-key-map" and "dictionary").',
          location: { path: opfPath },
        });
      }
    }

    // dict.single-dict.lang: when no dictionary collections exist, the
    // single-dictionary package must declare source-language and target-language
    // metas. Also, source-language must not be declared more than once.
    const hasDictCollection = this.packageDoc.collections.some((c) => c.role === 'dictionary');
    if (!hasDictCollection) {
      const sourceLangs = this.packageDoc.metaElements.filter(
        (m) => m.property.trim() === 'source-language',
      );
      const targetLangs = this.packageDoc.metaElements.filter(
        (m) => m.property.trim() === 'target-language',
      );
      if (sourceLangs.length === 0) {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message:
            'An EPUB Dictionary must declare its source language using a "source-language" metadata.',
          location: { path: opfPath },
        });
      } else if (sourceLangs.length > 1) {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message: 'An EPUB Dictionary must not declare more than one source language.',
          location: { path: opfPath },
        });
      }
      if (targetLangs.length === 0) {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message:
            'An EPUB Dictionary must declare its target language using a "target-language" metadata.',
          location: { path: opfPath },
        });
      }
    }

    // dict.lang: source-language and target-language meta values must also be
    // declared as dc:language in package-level metadata.
    const declaredLangs = new Set(
      this.packageDoc.dcElements
        .filter((dc) => dc.name === 'language')
        .map((dc) => dc.value.trim()),
    );
    for (const meta of this.packageDoc.metaElements) {
      const property = meta.property.trim();
      if (property !== 'source-language' && property !== 'target-language') continue;
      const value = meta.value.trim();
      if (value && !declaredLangs.has(value)) {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message: `EPUB Dictionaries "source-language" and "target-language" must also be declared as "dc:language" in package-level metadata. Found: "${value}"`,
          location: { path: opfPath },
        });
      }
    }

    // Mirrors ../epubcheck/src/main/resources/com/adobe/epubcheck/schema/30/dict/dict-collection.sch
    // dict.collection.lang: each dictionary collection must have source-language
    // and target-language declared either in its own metadata or in package metadata.
    const dictCollections = this.packageDoc.collections.filter((c) => c.role === 'dictionary');
    const pkgHasSource = this.packageDoc.metaElements.some(
      (m) => m.property.trim() === 'source-language',
    );
    const pkgHasTarget = this.packageDoc.metaElements.some(
      (m) => m.property.trim() === 'target-language',
    );
    for (const collection of dictCollections) {
      const collMetas = collection.innerXml ? parseCollectionMetas(collection.innerXml) : [];
      const collHasSource = collMetas.some((m) => m.property === 'source-language');
      const collHasTarget = collMetas.some((m) => m.property === 'target-language');
      const srcLangs = collMetas.filter((m) => m.property === 'source-language');

      if (!pkgHasSource && !collHasSource) {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message:
            'An EPUB Dictionary must declare its source language using a "source-language" metadata.',
          location: { path: opfPath },
        });
      }
      if (!pkgHasTarget && !collHasTarget) {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message:
            'An EPUB Dictionary must declare its target language using a "target-language" metadata.',
          location: { path: opfPath },
        });
      }
      if (srcLangs.length > 1) {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message: 'An EPUB Dictionary must not declare more than one source language.',
          location: { path: opfPath },
        });
      }
      for (const m of collMetas) {
        if (m.property !== 'source-language' && m.property !== 'target-language') continue;
        if (m.value && !declaredLangs.has(m.value)) {
          pushMessage(context.messages, {
            id: MessageId.RSC_005,
            message: `EPUB Dictionaries "source-language" and "target-language" must also be declared as "dc:language" in package-level metadata. Found: "${m.value}"`,
            location: { path: opfPath },
          });
        }
      }
    }
  }

  // Mirrors ../epubcheck/src/main/resources/com/adobe/epubcheck/schema/30/edupub/edu-opf.sch
  private validateEdupubMetadata(context: ValidationContext, opfPath: string): void {
    if (!this.packageDoc) return;
    if (context.options.profile !== 'edupub') return;

    const a11yFeatures = this.packageDoc.metaElements.filter(
      (m) => m.property.trim() === 'schema:accessibilityFeature',
    );
    if (a11yFeatures.length === 0) {
      pushMessage(context.messages, {
        id: MessageId.RSC_005,
        message: 'At least one schema:accessibilityFeature declaration is required.',
        location: { path: opfPath },
      });
    } else if (a11yFeatures.some((m) => m.value.trim() === 'none')) {
      pushMessage(context.messages, {
        id: MessageId.RSC_005,
        message:
          'The schema:accessibilityFeature property value "none" is not valid in edupub. Use "tableOfContents" if no other values are applicable.',
        location: { path: opfPath },
      });
    }

    // edu.teacher.edition: a dc:type='teacher-edition' must be paired with dc:source
    const isTeacherEdition = this.packageDoc.dcElements.some(
      (dc) => dc.name === 'type' && dc.value.trim() === 'teacher-edition',
    );
    if (isTeacherEdition) {
      const hasSource = this.packageDoc.dcElements.some((dc) => dc.name === 'source');
      if (!hasSource) {
        pushMessage(context.messages, {
          id: MessageId.RSC_017,
          message:
            "A teacher's edition should identify the corresponding student edition in a dc:source element.",
          location: { path: opfPath },
        });
      }
    }
  }

  private validateProfileDcType(context: ValidationContext, opfPath: string): void {
    if (!this.packageDoc) return;
    const expected = PROFILE_DC_TYPE[context.options.profile];
    if (!expected) return;

    const hasType = this.packageDoc.dcElements.some(
      (dc) => dc.name === 'type' && dc.value.trim() === expected,
    );
    if (!hasType) {
      pushMessage(context.messages, {
        id: MessageId.RSC_005,
        message: `The dc:type identifier "${expected}" is required.`,
        location: { path: opfPath },
      });
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

    if (this.packageDoc.versionDeclared === false) {
      pushMessage(context.messages, {
        id: MessageId.OPF_001,
        message: 'The package element is missing the required "version" attribute.',
        location: { path: opfPath },
      });
    } else if (!(EPUB_VERSIONS as readonly string[]).includes(this.packageDoc.version)) {
      pushMessage(context.messages, {
        id: MessageId.OPF_001,
        message: `Invalid package version "${this.packageDoc.version}"; must be one of: ${EPUB_VERSIONS.join(', ')}`,
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
   * Validate accessibility metadata (ACC-002, ACC-003, ACC-010)
   */
  private validateAccessibilityMetadata(context: ValidationContext, opfPath: string): void {
    if (!this.packageDoc) return;

    const metaElements = this.packageDoc.metaElements;

    const a11yProperties = [
      'schema:accessMode',
      'schema:accessibilityFeature',
      'schema:accessibilityHazard',
      'schema:accessibilitySummary',
    ];
    const hasAnyA11y = metaElements.some((m) => a11yProperties.includes(m.property));
    if (!hasAnyA11y) {
      pushMessage(context.messages, {
        id: MessageId.ACC_003,
        message: 'Publication does not include any accessibility metadata',
        location: { path: opfPath },
      });
    }

    if (!metaElements.some((m) => m.property === 'schema:accessibilityFeature')) {
      pushMessage(context.messages, {
        id: MessageId.ACC_002,
        message: 'Missing "schema:accessibilityFeature" metadata',
        location: { path: opfPath },
      });
    }

    if (!metaElements.some((m) => m.property === 'schema:accessMode')) {
      pushMessage(context.messages, {
        id: MessageId.ACC_010,
        message: 'Missing "schema:accessMode" metadata',
        location: { path: opfPath },
      });
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
        id: MessageId.RSC_005,
        message: 'Metadata must include at least one dc:title element',
        location: { path: opfPath },
      });
    }

    if (!hasLanguage) {
      pushMessage(context.messages, {
        id: MessageId.RSC_005,
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

      // Validate dc:date: empty or invalid format
      // EPUB 3 -> OPF-053, EPUB 2 -> OPF-054 (mirrors Java OPFHandler:730-774)
      if (dc.name === 'date') {
        const value = dc.value.trim();
        const isInvalid = value === '' || !isValidW3CDateFormat(value);
        if (isInvalid) {
          const messageId = context.version === '2.0' ? MessageId.OPF_054 : MessageId.OPF_053;
          const detail = value === '' ? 'zero-length string' : `invalid format "${value}"`;
          pushMessage(context.messages, {
            id: messageId,
            message: `Invalid date: ${detail}; must be W3C date format (ISO 8601)`,
            location: { path: opfPath },
          });
        }
      }

      // OPF-055 (EPUB 2 only, warning): dc:title must not be empty
      // Mirrors Java OPFHandler:776-808
      if (context.version === '2.0' && dc.name === 'title') {
        const value = dc.value.trim();
        if (value === '') {
          pushMessage(context.messages, {
            id: MessageId.OPF_055,
            message: 'dc:title must not be empty',
            location: { path: opfPath },
          });
        }
      }

      // OPF-085: Validate UUID format for dc:identifier when:
      //   - value starts with 'urn:uuid:', OR
      //   - opf:scheme attribute is 'uuid' (case-insensitive)
      // Mirrors Java OPFHandler:714-726
      if (dc.name === 'identifier' && dc.value) {
        const val = dc.value.trim();
        const scheme = dc.attributes?.['opf:scheme'] ?? dc.attributes?.scheme;
        const isUuidScheme = scheme?.toLowerCase() === 'uuid';
        if (val.startsWith('urn:uuid:') || isUuidScheme) {
          const uuid = val.replace(/^urn:uuid:/, '');
          if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)) {
            pushMessage(context.messages, {
              id: MessageId.OPF_085,
              message: `Invalid UUID value "${uuid}"`,
              location: { path: opfPath },
            });
          }
        }
      }

      // OPF-052: Validate dc:creator with role attribute (OPF namespace).
      // Fixtures may use any prefix bound to the OPF namespace (e.g. opf:role, epub:role);
      // our parser stores both the prefixed and local name, so fall back to 'role' local name.
      if (dc.name === 'creator' && dc.attributes) {
        const role = dc.attributes['opf:role'] ?? dc.attributes.role;
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
      this.validateRenditionVocab(context, opfPath);
      this.validateMediaOverlaysVocab(context, opfPath);
      this.validateMediaOverlayItems(context, opfPath);
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
   * Validate rendition vocabulary meta properties (rendition:layout, orientation, spread, flow, viewport).
   * Ports the Schematron rules from package-30.sch for the rendition vocabulary.
   */
  private validateRenditionVocab(context: ValidationContext, opfPath: string): void {
    if (!this.packageDoc) return;

    const metas = this.packageDoc.metaElements;

    for (const rp of RENDITION_META_RULES) {
      const matching = metas.filter((m) => m.property === rp.property);

      for (const meta of matching) {
        if (meta.refines && rp.forbidRefines) {
          pushMessage(context.messages, {
            id: MessageId.RSC_005,
            message: `The "${rp.property}" property must not refine a publication resource`,
            location: { path: opfPath },
          });
          continue;
        }

        if (rp.deprecated) {
          pushMessage(context.messages, {
            id: MessageId.OPF_086,
            message: `The "${rp.property}" property is deprecated`,
            location: { path: opfPath },
          });
        }

        if (rp.validateSyntax) {
          if (!rp.validateSyntax(meta.value)) {
            pushMessage(context.messages, {
              id: MessageId.RSC_005,
              message: `The value of the "${rp.property}" property must be of the form "width=x, height=y"`,
              location: { path: opfPath },
            });
          }
        } else if (!rp.allowedValues.has(meta.value)) {
          pushMessage(context.messages, {
            id: MessageId.RSC_005,
            message: `The value of the "${rp.property}" property must be ${[...rp.allowedValues].map((v) => `"${v}"`).join(' or ')}`,
            location: { path: opfPath },
          });
        }

        if (rp.deprecatedValues?.has(meta.value)) {
          pushMessage(context.messages, {
            id: MessageId.OPF_086,
            message: `The "${rp.property}" property value "${meta.value}" is deprecated`,
            location: { path: opfPath },
          });
        }
      }

      // Check multiplicity — for viewport, only non-refining metas count;
      // for other rendition properties, all occurrences count (per Schematron)
      const countable = rp.forbidRefines ? matching : matching.filter((m) => !m.refines);
      if (countable.length > 1) {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message: `The "${rp.property}" property must not occur more than one time as a global value`,
          location: { path: opfPath },
        });
      }
    }

    // OPF-027: Unknown rendition: prefix meta properties
    for (const meta of metas) {
      if (meta.property.startsWith('rendition:')) {
        const localName = meta.property.slice('rendition:'.length);
        if (!KNOWN_RENDITION_META_PROPERTIES.has(localName)) {
          pushMessage(context.messages, {
            id: MessageId.OPF_027,
            message: `Undefined property: "${meta.property}"`,
            location: { path: opfPath },
          });
        }
      } else if (
        meta.property.startsWith('a11y:') &&
        !KNOWN_A11Y_META_PROPERTIES.has(meta.property.slice('a11y:'.length))
      ) {
        pushMessage(context.messages, {
          id: MessageId.OPF_027,
          message: `Undefined property: "${meta.property}"`,
          location: { path: opfPath },
        });
      }
    }
  }

  /**
   * Validate media overlays vocabulary meta properties (media:active-class, playback-active-class, duration).
   * Ports the Schematron rules from package-30.sch for the media overlays vocabulary.
   */
  private validateMediaOverlaysVocab(context: ValidationContext, opfPath: string): void {
    if (!this.packageDoc) return;

    const metas = this.packageDoc.metaElements;

    const matchingActive = metas.filter((m) => m.property === 'media:active-class');
    const matchingPlayback = metas.filter((m) => m.property === 'media:playback-active-class');

    for (const [prop, matching] of [
      ['media:active-class', matchingActive],
      ['media:playback-active-class', matchingPlayback],
    ] as const) {
      const displayName = prop.slice('media:'.length);
      if (matching.length > 1) {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message: `The '${displayName}' property must not occur more than one time in the package metadata`,
          location: { path: opfPath },
        });
      }
      for (const meta of matching) {
        if (meta.refines) {
          pushMessage(context.messages, {
            id: MessageId.RSC_005,
            message: `@refines must not be used with the ${prop} property`,
            location: { path: opfPath },
          });
        }
        if (meta.value.trim().includes(' ')) {
          pushMessage(context.messages, {
            id: MessageId.RSC_005,
            message: `the '${displayName}' property must define a single class name`,
            location: { path: opfPath },
          });
        }
      }
    }

    // Store active class values for CSS-029/CSS-030 validation in content documents
    if (matchingActive[0]) context.mediaActiveClass = matchingActive[0].value.trim();
    if (matchingPlayback[0]) context.mediaPlaybackActiveClass = matchingPlayback[0].value.trim();

    for (const meta of metas) {
      if (meta.property === 'media:duration') {
        if (!isValidSmilClock(meta.value.trim())) {
          pushMessage(context.messages, {
            id: MessageId.RSC_005,
            message: `The value of the "media:duration" property must be a valid SMIL3 clock value`,
            location: { path: opfPath },
          });
        }
      }
    }

    // MED-016: Total duration should be the sum of individual overlay durations
    const globalDuration = metas.find((m) => m.property === 'media:duration' && !m.refines);
    if (globalDuration) {
      const totalSeconds = parseSmilClock(globalDuration.value.trim());
      if (!Number.isNaN(totalSeconds)) {
        let sumSeconds = 0;
        let allValid = true;
        for (const meta of metas) {
          if (meta.property === 'media:duration' && meta.refines) {
            const s = parseSmilClock(meta.value.trim());
            if (Number.isNaN(s)) {
              allValid = false;
              break;
            }
            sumSeconds += s;
          }
        }
        if (allValid && Math.abs(totalSeconds - sumSeconds) > 1) {
          pushMessage(context.messages, {
            id: MessageId.MED_016,
            message: `Media Overlays total duration should be the sum of the durations of all Media Overlays documents.`,
            location: { path: opfPath },
          });
        }
      }
    }
  }

  /**
   * Validate media-overlay manifest item constraints:
   * - media-overlay must reference a SMIL item (application/smil+xml)
   * - media-overlay attribute only allowed on XHTML and SVG content documents
   * - Global media:duration required when overlays exist
   * - Per-item media:duration required for each overlay
   */
  private validateMediaOverlayItems(context: ValidationContext, opfPath: string): void {
    if (!this.packageDoc) return;

    const manifest = this.packageDoc.manifest;
    const metas = this.packageDoc.metaElements;

    const itemsWithOverlay = manifest.filter((item) => item.mediaOverlay);
    if (itemsWithOverlay.length === 0) return;

    for (const item of itemsWithOverlay) {
      const moId = item.mediaOverlay;
      if (!moId) continue;
      const moItem = this.manifestById.get(moId);

      if (moItem && moItem.mediaType !== 'application/smil+xml') {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message: `media overlay items must be of the "application/smil+xml" type (given type was "${moItem.mediaType}")`,
          location: { path: opfPath },
        });
      }

      if (item.mediaType !== 'application/xhtml+xml' && item.mediaType !== 'image/svg+xml') {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message: `The media-overlay attribute is only allowed on XHTML and SVG content documents.`,
          location: { path: opfPath },
        });
      }
    }

    if (!metas.some((m) => m.property === 'media:duration' && !m.refines)) {
      pushMessage(context.messages, {
        id: MessageId.RSC_005,
        message: `global media:duration meta element not set`,
        location: { path: opfPath },
      });
    }

    const overlayIds = new Set(
      itemsWithOverlay
        .map((item) => item.mediaOverlay)
        .filter((id): id is string => id != null && this.manifestById.has(id)),
    );
    for (const overlayId of overlayIds) {
      const refinesUri = `#${overlayId}`;
      if (!metas.some((m) => m.property === 'media:duration' && m.refines === refinesUri)) {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message: `item media:duration meta element not set (expecting: meta property='media:duration' refines='${refinesUri}')`,
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

      for (const kw of relKeywords) {
        if (
          kw.startsWith('a11y:') &&
          !KNOWN_A11Y_LINKREL_PROPERTIES.has(kw.slice('a11y:'.length))
        ) {
          pushMessage(context.messages, {
            id: MessageId.OPF_027,
            message: `Undefined property: "${kw}"`,
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
        context.options.mode !== 'opf' &&
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

      // Deprecated media types (OEB 1.x + text/html) only warn in EPUB 2.
      if (DEPRECATED_MEDIA_TYPES.has(item.mediaType) || item.mediaType === 'text/html') {
        if (this.packageDoc.version === '2.0' && item.mediaType === 'text/html') {
          pushMessage(context.messages, {
            id: this.packageDoc.isLegacyOebps12 ? MessageId.OPF_038 : MessageId.OPF_035,
            message: `XHTML Content Document "${item.id}" is declared as "text/html"`,
            location: { path: opfPath },
          });
        } else if (this.packageDoc.version === '2.0' && !this.packageDoc.isLegacyOebps12) {
          pushMessage(context.messages, {
            id: MessageId.OPF_037,
            message: `Found deprecated media-type "${item.mediaType}"`,
            location: { path: opfPath },
          });
        }
      }

      if (
        this.packageDoc.version === '2.0' &&
        this.packageDoc.isLegacyOebps12 &&
        item.mediaType === 'text/css' &&
        !item.fallback
      ) {
        pushMessage(context.messages, {
          id: MessageId.OPF_039,
          message: `Media type "${item.mediaType}" requires a fallback in legacy OEBPS 1.2 context`,
          location: { path: opfPath },
        });
      }

      // Check for non-preferred media types (OPF-090)
      const preferred = getPreferredMediaType(item.mediaType, fullPath);
      if (preferred !== null) {
        pushMessage(context.messages, {
          id: MessageId.OPF_090,
          message: `Encouraged to use media type "${preferred}" instead of "${item.mediaType}"`,
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

        // OPF-012: search-key-map requires application/vnd.epub.search-key-map+xml
        if (item.properties.includes('search-key-map')) {
          if (item.mediaType !== 'application/vnd.epub.search-key-map+xml') {
            pushMessage(context.messages, {
              id: MessageId.OPF_012,
              message: `The property "search-key-map" is not defined for media type "${item.mediaType}"`,
              location: { path: opfPath },
            });
          } else if (!item.href.toLowerCase().endsWith('.xml')) {
            // OPF-080: SKM document file should have .xml extension
            pushMessage(context.messages, {
              id: MessageId.OPF_080,
              message: 'A Search Key Map document file name should have the extension ".xml".',
              location: { path: opfPath },
              severityOverride: 'warning',
            });
          }
        }

        // OPF-012: data-nav requires application/xhtml+xml
        if (item.properties.includes('data-nav')) {
          if (item.mediaType !== 'application/xhtml+xml') {
            pushMessage(context.messages, {
              id: MessageId.OPF_012,
              message: `The property "data-nav" is not defined for media type "${item.mediaType}"`,
              location: { path: opfPath },
            });
          }
        }
      }

      // OPF-041 (EPUB 2): fallback-style must reference an existing manifest item
      if (item.fallbackStyle && !this.manifestById.has(item.fallbackStyle)) {
        pushMessage(context.messages, {
          id: MessageId.OPF_041,
          message: `Manifest item "${item.id}" fallback-style references non-existent item: "${item.fallbackStyle}"`,
          location: { path: opfPath },
        });
      }

      // RSC-020: Check for unencoded spaces in href
      if (item.href.includes(' ')) {
        pushMessage(context.messages, {
          id: MessageId.RSC_020,
          message: `"${item.href}" is not a valid URL (Illegal character in path segment: space is not allowed)`,
          location: { path: opfPath },
        });
      } else if (!isRemoteItem && (item.href.includes('%20') || item.href.includes('%09'))) {
        // PKG-010: filename contains spaces even when properly percent-encoded
        pushMessage(context.messages, {
          id: MessageId.PKG_010,
          message: `Filename "${item.href}" contains spaces`,
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

      // RSC-005: multiple data-nav items
      const dataNavItems = this.packageDoc.manifest.filter((item) =>
        item.properties?.includes('data-nav'),
      );
      if (dataNavItems.length > 1) {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message: 'The manifest must not include more than one Data Navigation Document.',
          location: { path: opfPath },
        });
      }
    }

    // dict.skm: SKM shared between multiple dictionary collections
    if (context.options.profile === 'dict') {
      const dictCollections = this.packageDoc.collections.filter((c) => c.role === 'dictionary');
      const skmCollectionCount = new Map<string, number>();
      for (const coll of dictCollections) {
        for (const href of coll.links) {
          const item = this.manifestByHref.get(href);
          if (item?.mediaType === 'application/vnd.epub.search-key-map+xml') {
            skmCollectionCount.set(href, (skmCollectionCount.get(href) ?? 0) + 1);
          }
        }
      }
      for (const [href, count] of skmCollectionCount) {
        if (count > 1) {
          pushMessage(context.messages, {
            id: MessageId.RSC_005,
            message: `Search Key Map Document "${href}" is referenced in more than one dictionary collection.`,
            location: { path: opfPath },
          });
        }
      }
    }
  }

  /**
   * RSC-005: all id attributes on elements in the OPF document must be unique.
   * Mirrors Java's id-unique.sch / opf.sch opf_idAttrUnique pattern, which
   * emits one assertion failure per offending element (so two duplicate ids
   * produce two RSC-005 messages).
   */
  private validateOpfIdUniqueness(
    context: ValidationContext,
    opfPath: string,
    opfXml: string,
  ): void {
    const stripped = stripXmlComments(opfXml);
    const counts = new Map<string, number>();
    for (const match of stripped.matchAll(/\sid\s*=\s*["']([^"']+)["']/g)) {
      const id = match[1]?.trim();
      if (!id) continue;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    for (const [id, count] of counts) {
      if (count < 2) continue;
      for (let i = 0; i < count; i++) {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message: `The "id" attribute value "${id}" is not unique`,
          location: { path: opfPath },
        });
      }
    }
  }

  /**
   * OPF-003: Report (usage) each resource that exists in the container but is
   * not declared in the manifest. Ignores mimetype, META-INF/* files, the OPF
   * document(s), and common OS files.
   */
  private validateUndeclaredResources(context: ValidationContext, opfPath: string): void {
    if (!this.packageDoc) return;
    if (context.options.mode === 'opf') return;

    const manifestPaths = new Set<string>();
    for (const item of this.packageDoc.manifest) {
      const hrefBase = item.href.split('?')[0] ?? item.href;
      if (/^[a-zA-Z][a-zA-Z0-9+\-.]*:/.test(hrefBase)) continue;
      manifestPaths.add(resolvePath(opfPath, tryDecodeUriComponent(hrefBase)).normalize('NFC'));
    }

    const rootfilePaths = new Set(context.rootfiles.map((r) => r.path.normalize('NFC')));

    for (const path of context.files.keys()) {
      if (path === 'mimetype') continue;
      if (path.startsWith('META-INF/')) continue;
      if (rootfilePaths.has(path)) continue;
      if (manifestPaths.has(path)) continue;
      if (isOSFile(path)) continue;

      pushMessage(context.messages, {
        id: MessageId.OPF_003,
        message: `Item "${path}" exists in the EPUB, but is not declared in the OPF manifest`,
        location: { path },
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

      // OPF-077: data-nav should not be in the spine
      if (item.properties?.includes('data-nav')) {
        pushMessage(context.messages, {
          id: MessageId.OPF_077,
          message: 'A Data Navigation Document should not be included in the spine.',
          location: { path: opfPath },
          severityOverride: 'warning',
        });
      }

      // Check that spine items have appropriate media types
      if (!isSpineMediaType(item.mediaType)) {
        // OPF-042 (EPUB 2 only): styles and images are never valid as spine items,
        // even with a fallback. EPUB 3 only requires a content-document fallback.
        if (this.packageDoc.version === '2.0' && isStyleOrImageMediaType(item.mediaType)) {
          pushMessage(context.messages, {
            id: MessageId.OPF_042,
            message: `"${item.mediaType}" is not a permissible spine media type`,
            location: { path: opfPath },
          });
        } else if (!item.fallback) {
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
          if (prop === 'rendition:spread-portrait') {
            pushMessage(context.messages, {
              id: MessageId.OPF_086,
              message: `The "rendition:spread-portrait" property is deprecated`,
              location: { path: opfPath },
            });
          }
        }

        const props = new Set(itemref.properties);
        for (const group of EXCLUSIVE_SPINE_GROUPS) {
          const found = group.filter((p) => props.has(p));
          if (found.length > 1) {
            pushMessage(context.messages, {
              id: MessageId.RSC_005,
              message: `Properties "${found.join('", "')}" are mutually exclusive`,
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

    // RSC-017 (warning): duplicate <reference> elements with same (type, href).
    // Mirrors Java opf.sch pattern 'opf_guideReferenceUnique' — every matching
    // duplicate reports once (so N dupes produce N warnings, not N-1).
    for (const ref of this.packageDoc.guide) {
      const type = ref.type.trim().toLowerCase();
      const href = ref.href.trim().toLowerCase();
      let matchCount = 0;
      for (const other of this.packageDoc.guide) {
        if (other.type.trim().toLowerCase() === type && other.href.trim().toLowerCase() === href) {
          matchCount++;
        }
      }
      if (matchCount > 1) {
        pushMessage(context.messages, {
          id: MessageId.RSC_017,
          message: `Duplicate "reference" elements with the same "type" and "href" attributes (${ref.type}, ${ref.href})`,
          location: { path: opfPath },
          severityOverride: 'warning',
        });
      }
    }

    const blessedContentTypes =
      context.version === '2.0'
        ? new Set(['application/xhtml+xml', 'application/x-dtbook+xml'])
        : new Set(['application/xhtml+xml', 'image/svg+xml']);
    const deprecatedBlessedTypes = new Set(['text/x-oeb1-document', 'text/html']);

    for (const ref of this.packageDoc.guide) {
      // Strip fragment from href for lookup
      const hrefBase = ref.href.split('#')[0] ?? ref.href;
      const fullPath = resolvePath(opfPath, hrefBase);

      // Check that href references a manifest item
      let matchedItem: ManifestItem | undefined;
      for (const [href, item] of this.manifestByHref) {
        if (resolvePath(opfPath, href) === fullPath) {
          matchedItem = item;
          break;
        }
      }

      if (!matchedItem) {
        pushMessage(context.messages, {
          id: MessageId.OPF_031,
          message: `Guide reference "${ref.type}" references item not in manifest: ${ref.href}`,
          location: { path: opfPath },
        });
        continue;
      }

      const type = matchedItem.mediaType;
      if (!blessedContentTypes.has(type) && !deprecatedBlessedTypes.has(type)) {
        pushMessage(context.messages, {
          id: MessageId.OPF_032,
          message: `Guide references resource of non-OPS media type "${type}": ${ref.href}`,
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

  // Mirrors ../epubcheck/src/main/resources/com/adobe/epubcheck/schema/30/collection-do-30.sch
  private validateDistributableObject(
    context: ValidationContext,
    opfPath: string,
    collection: Collection,
  ): void {
    const inner = collection.innerXml ?? '';
    // Extract the collection's top-level <metadata>...</metadata> block.
    // We want the metadata directly inside this collection (not inside
    // child <collection> elements). Child metadata would belong to a nested
    // distributable-object, which the recursion into children handles.
    const metadataOpen = /<metadata(\s[^>]*)?>/.exec(inner);
    if (!metadataOpen) {
      pushMessage(context.messages, {
        id: MessageId.RSC_005,
        message: 'A distributable-object collection must include a child metadata element.',
        location: { path: opfPath },
      });
      return;
    }
    const metadataStart = metadataOpen.index + metadataOpen[0].length;
    const metadataEnd = inner.indexOf('</metadata>', metadataStart);
    if (metadataEnd < 0) return;
    const metadataXml = stripXmlComments(inner.slice(metadataStart, metadataEnd));

    const hasIdentifier = /<dc:identifier[\s>]/.test(metadataXml);
    if (!hasIdentifier) {
      pushMessage(context.messages, {
        id: MessageId.RSC_005,
        message:
          'The distributable-object metadata must include exactly one identifier (dc:identifier).',
        location: { path: opfPath },
      });
    }
  }

  private validateCollectionHierarchy(
    context: ValidationContext,
    opfPath: string,
    collections: readonly Collection[],
    parent: Collection | null,
  ): void {
    for (const collection of collections) {
      if (collection.role === 'distributable-object') {
        this.validateDistributableObject(context, opfPath, collection);
      }
      if (collection.role === 'dictionary' && collection.children.length > 0) {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message: 'An EPUB Dictionary collection must not have sub-collections.',
          location: { path: opfPath },
        });
      }
      if (collection.role === 'index') {
        for (const child of collection.children) {
          if (child.role !== 'index-group') {
            pushMessage(context.messages, {
              id: MessageId.RSC_005,
              message:
                'An "index" collection must not have sub-collections other than "index-group" collections.',
              location: { path: opfPath },
            });
          }
        }
      }
      if (collection.role === 'index-group') {
        if (parent?.role !== 'index') {
          pushMessage(context.messages, {
            id: MessageId.RSC_005,
            message: 'An "index-group" collection must be a child of an "index" collection.',
            location: { path: opfPath },
          });
        }
        if (collection.children.length > 0) {
          pushMessage(context.messages, {
            id: MessageId.RSC_005,
            message: 'An "index-group" collection must not have child collections.',
            location: { path: opfPath },
          });
        }
      }
      this.validateCollectionHierarchy(context, opfPath, collection.children, collection);
    }
  }

  private validateCollections(context: ValidationContext, opfPath: string): void {
    if (!this.packageDoc) return;

    const collections = this.packageDoc.collections;
    if (collections.length === 0) {
      return;
    }

    // Hierarchy checks across nested collections.
    // Mirrors ../epubcheck/src/main/resources/com/adobe/epubcheck/schema/30/idx/idx-collection.sch
    this.validateCollectionHierarchy(context, opfPath, collections, null);

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
        // Mirrors ../epubcheck/src/main/java/com/adobe/epubcheck/opf/OPFChecker30.java:296-330
        let skmFound = false;
        for (const linkHref of collection.links) {
          const manifestItem = this.manifestByHref.get(linkHref);
          if (!manifestItem) {
            pushMessage(context.messages, {
              id: MessageId.OPF_081,
              message: `Dictionary collection resource "${linkHref}" was not found in the package manifest`,
              location: { path: opfPath },
            });
          } else if (manifestItem.mediaType === 'application/vnd.epub.search-key-map+xml') {
            if (skmFound) {
              pushMessage(context.messages, {
                id: MessageId.OPF_082,
                message:
                  'A dictionary collection must not contain more than one Search Key Map Document',
                location: { path: opfPath },
              });
            }
            skmFound = true;
          } else if (manifestItem.mediaType !== 'application/xhtml+xml') {
            pushMessage(context.messages, {
              id: MessageId.OPF_084,
              message: `Dictionary collection resource "${linkHref}" is neither a Search Key Map Document nor an XHTML Content Document`,
              location: { path: opfPath },
            });
          }
        }
        if (!skmFound) {
          pushMessage(context.messages, {
            id: MessageId.OPF_083,
            message: 'A dictionary collection contains no Search Key Map Document',
            location: { path: opfPath },
          });
        }
      }

      if (collection.role === 'index') {
        for (const linkHref of collection.links) {
          const manifestItem = this.manifestByHref.get(linkHref);
          if (manifestItem?.mediaType !== 'application/xhtml+xml') {
            // Mirrors ../epubcheck/src/main/java/com/adobe/epubcheck/opf/OPFChecker30.java:373
            pushMessage(context.messages, {
              id: MessageId.OPF_071,
              message: `Index collection item "${linkHref}" must be an XHTML document`,
              location: { path: opfPath },
            });
          }
        }
      }

      if (collection.role === 'preview') {
        // Mirrors ../epubcheck/src/main/resources/com/adobe/epubcheck/schema/30/previews/preview-collection.sch
        const manifestChildren = collection.children.filter((c) => c.role === 'manifest');
        if (manifestChildren.length !== 1) {
          pushMessage(context.messages, {
            id: MessageId.RSC_005,
            message: 'A "preview" collection must include exactly one child "manifest" collection',
            location: { path: opfPath },
          });
        }
        if (collection.links.length === 0) {
          pushMessage(context.messages, {
            id: MessageId.RSC_005,
            message:
              'A "preview" collection must include at least one child "link" element, pointing to an EPUB Content Document.',
            location: { path: opfPath },
          });
        }

        // Mirrors ../epubcheck/src/main/java/com/adobe/epubcheck/opf/OPFChecker30.java:383-407
        for (const linkHref of collection.links) {
          const manifestItem = this.manifestByHref.get(linkHref.split('#')[0] ?? linkHref);
          if (!manifestItem) {
            pushMessage(context.messages, {
              id: MessageId.OPF_073,
              message: `Collection link "${linkHref}" references non-existent manifest item`,
              location: { path: opfPath },
            });
          } else if (
            manifestItem.mediaType !== 'application/xhtml+xml' &&
            manifestItem.mediaType !== 'image/svg+xml'
          ) {
            pushMessage(context.messages, {
              id: MessageId.OPF_075,
              message: `Preview collection resource "${linkHref}" must be an XHTML or SVG content document`,
              location: { path: opfPath },
            });
          } else if (linkHref.includes('#epubcfi(')) {
            pushMessage(context.messages, {
              id: MessageId.OPF_076,
              message: `Preview collection link "${linkHref}" must not use EPUB CFI fragment identifiers`,
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

const OS_FILE_NAMES = new Set(['.DS_Store', 'Thumbs.db', 'thumbs.db', 'ehthumbs.db', '.localized']);

/**
 * Parse meta property/value pairs from a collection's inner XML.
 * Used for dictionary collection source-language/target-language checks.
 */
function parseCollectionMetas(innerXml: string): { property: string; value: string }[] {
  const results: { property: string; value: string }[] = [];
  const metaRegex = /<meta[^>]*\bproperty=["']([^"']+)["'][^>]*>([^<]*)<\/meta>/g;
  for (const match of innerXml.matchAll(metaRegex)) {
    const property = match[1]?.trim();
    const value = match[2]?.trim();
    if (property && value !== undefined) {
      results.push({ property, value });
    }
  }
  return results;
}

function isOSFile(path: string): boolean {
  const name = path.includes('/') ? (path.split('/').pop() ?? path) : path;
  return OS_FILE_NAMES.has(name);
}

function isStyleOrImageMediaType(mediaType: string): boolean {
  return (
    mediaType === 'text/css' ||
    mediaType === 'text/x-oeb1-css' ||
    mediaType === 'image/gif' ||
    mediaType === 'image/png' ||
    mediaType === 'image/jpeg' ||
    mediaType === 'image/webp'
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
export function resolvePath(basePath: string, relativePath: string): string {
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
export function tryDecodeUriComponent(encoded: string): string {
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
