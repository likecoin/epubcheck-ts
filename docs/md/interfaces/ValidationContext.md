[**epubcheck-ts**](../README.md)

***

[epubcheck-ts](../globals.md) / ValidationContext

# Interface: ValidationContext

Defined in: types.ts:119

Internal validation context passed through the validation pipeline

## Properties

### contentFeatures?

> `optional` **contentFeatures**: `object`

Defined in: types.ts:170

Feature flags collected during content validation for cross-document checks

#### dictionaryContentPaths?

> `optional` **dictionaryContentPaths**: `Set`\<`string`\>

#### hasAudio?

> `optional` **hasAudio**: `boolean`

#### hasDictionary?

> `optional` **hasDictionary**: `boolean`

#### hasFigure?

> `optional` **hasFigure**: `boolean`

#### hasIndex?

> `optional` **hasIndex**: `boolean`

#### hasLOA?

> `optional` **hasLOA**: `boolean`

#### hasLOI?

> `optional` **hasLOI**: `boolean`

#### hasLOT?

> `optional` **hasLOT**: `boolean`

#### hasLOV?

> `optional` **hasLOV**: `boolean`

#### hasMicrodata?

> `optional` **hasMicrodata**: `boolean`

#### hasPageBreak?

> `optional` **hasPageBreak**: `boolean`

#### hasPageList?

> `optional` **hasPageList**: `boolean`

#### hasRDFa?

> `optional` **hasRDFa**: `boolean`

#### hasTable?

> `optional` **hasTable**: `boolean`

#### hasVideo?

> `optional` **hasVideo**: `boolean`

#### sectionCount?

> `optional` **sectionCount**: `number`

#### tocLinkCount?

> `optional` **tocLinkCount**: `number`

***

### data

> **data**: `Uint8Array`

Defined in: types.ts:121

EPUB file data

***

### files

> **files**: `Map`\<`string`, `Uint8Array`\<`ArrayBufferLike`\>\>

Defined in: types.ts:129

Files extracted from EPUB container

***

### hasContainer

> **hasContainer**: `boolean`

Defined in: types.ts:142

Whether an OCF container backs this validation.

Java splits the package document checks in two (OPFChecker.check): with a
container it runs checkPackage(), which owns the unique-identifier check,
the guide, and the whole reference-resolution pass; without one it runs
only checkContent(), the schema and handler checks. Single-file modes have
no container, so anything resolving a path against one is meaningless
there and Java stays silent rather than reporting an unresolvable target.

***

### mediaActiveClass?

> `optional` **mediaActiveClass**: `string`

Defined in: types.ts:164

OPF media:active-class value (if declared)

***

### mediaPlaybackActiveClass?

> `optional` **mediaPlaybackActiveClass**: `string`

Defined in: types.ts:166

OPF media:playback-active-class value (if declared)

***

### messages

> **messages**: [`ValidationMessage`](ValidationMessage.md)[]

Defined in: types.ts:127

Validation messages collected so far

***

### ncxUid?

> `optional` **ncxUid**: `string`

Defined in: types.ts:156

NCX UID for validation against OPF identifier

***

### obfuscatedResources?

> `optional` **obfuscatedResources**: `Set`\<`string`\>

Defined in: types.ts:168

Resources marked with IDPF font obfuscation in encryption.xml

***

### opfPath?

> `optional` **opfPath**: `string`

Defined in: types.ts:144

Path to the package document (OPF)

***

### options

> **options**: [`ResolvedEpubCheckOptions`](../type-aliases/ResolvedEpubCheckOptions.md)

Defined in: types.ts:123

Validation options

***

### overlayTextLinks?

> `optional` **overlayTextLinks**: `object`[]

Defined in: types.ts:162

Media overlay text link targets in order, for reading order validation (MED-015)

#### fragment?

> `optional` **fragment**: `string`

#### location

> **location**: `EPUBLocation`

#### targetResource

> **targetResource**: `string`

***

### packageDocument?

> `optional` **packageDocument**: `PackageDocument`

Defined in: types.ts:154

Parsed package document

***

### referencedUndeclaredResources?

> `optional` **referencedUndeclaredResources**: `Set`\<`string`\>

Defined in: types.ts:158

Resources referenced in content but not declared in manifest

***

### rootfiles

> **rootfiles**: `Rootfile`[]

Defined in: types.ts:131

Rootfiles found in container.xml

***

### tocLinks?

> `optional` **tocLinks**: `object`[]

Defined in: types.ts:160

TOC navigation link targets in order, for reading order validation (NAV-011)

#### fragment?

> `optional` **fragment**: `string`

#### location

> **location**: `EPUBLocation`

#### targetResource

> **targetResource**: `string`

***

### version

> **version**: `"2.0"` \| `"3.0"` \| `"3.1"` \| `"3.2"` \| `"3.3"`

Defined in: types.ts:125

Detected EPUB version

***

### xmlParseFailures?

> `optional` **xmlParseFailures**: `Map`\<`string`, `XmlParseFailure`\>

Defined in: types.ts:152

Paths whose XML is not well-formed, keyed by path. A fatal parse error is
reported once, at the point the document is read; later passes skip these
paths rather than reporting the same failure again in their own terms.
The failure records how far the parse got, which decides whether a
document model exists for those passes to work from.
