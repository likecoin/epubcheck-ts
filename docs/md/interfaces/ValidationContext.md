[**epubcheck-ts**](../README.md)

***

[epubcheck-ts](../globals.md) / ValidationContext

# Interface: ValidationContext

Defined in: types.ts:93

Internal validation context passed through the validation pipeline

## Properties

### data

> **data**: `Uint8Array`

Defined in: types.ts:95

EPUB file data

***

### files

> **files**: `Map`\<`string`, `Uint8Array`\<`ArrayBufferLike`\>\>

Defined in: types.ts:103

Files extracted from EPUB container

***

### messages

> **messages**: [`ValidationMessage`](ValidationMessage.md)[]

Defined in: types.ts:101

Validation messages collected so far

***

### ncxUid?

> `optional` **ncxUid**: `string`

Defined in: types.ts:111

NCX UID for validation against OPF identifier

***

### opfPath?

> `optional` **opfPath**: `string`

Defined in: types.ts:107

Path to the package document (OPF)

***

### options

> **options**: `Required`\<[`EpubCheckOptions`](EpubCheckOptions.md)\>

Defined in: types.ts:97

Validation options

***

### packageDocument?

> `optional` **packageDocument**: `PackageDocument`

Defined in: types.ts:109

Parsed package document

***

### referencedUndeclaredResources?

> `optional` **referencedUndeclaredResources**: `Set`\<`string`\>

Defined in: types.ts:113

Resources referenced in content but not declared in manifest

***

### rootfiles

> **rootfiles**: `Rootfile`[]

Defined in: types.ts:105

Rootfiles found in container.xml

***

### version

> **version**: [`EPUBVersion`](../type-aliases/EPUBVersion.md)

Defined in: types.ts:99

Detected EPUB version
