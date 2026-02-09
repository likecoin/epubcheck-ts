[**epubcheck-ts**](../README.md)

***

[epubcheck-ts](../globals.md) / EpubCheckOptions

# Interface: EpubCheckOptions

Defined in: types.ts:75

Options for EpubCheck

## Properties

### includeInfo?

> `optional` **includeInfo**: `boolean`

Defined in: types.ts:83

Whether to include info messages

***

### includeUsage?

> `optional` **includeUsage**: `boolean`

Defined in: types.ts:81

Whether to include usage messages

***

### locale?

> `optional` **locale**: `string`

Defined in: types.ts:87

Locale for messages (e.g., 'en', 'de', 'fr')

***

### maxErrors?

> `optional` **maxErrors**: `number`

Defined in: types.ts:85

Maximum number of errors before stopping (0 = unlimited)

***

### profile?

> `optional` **profile**: [`EPUBProfile`](../type-aliases/EPUBProfile.md)

Defined in: types.ts:79

Validation profile

***

### version?

> `optional` **version**: [`EPUBVersion`](../type-aliases/EPUBVersion.md)

Defined in: types.ts:77

EPUB version to validate against (auto-detected if not specified)
