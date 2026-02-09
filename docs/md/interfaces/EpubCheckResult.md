[**epubcheck-ts**](../README.md)

***

[epubcheck-ts](../globals.md) / EpubCheckResult

# Interface: EpubCheckResult

Defined in: types.ts:51

Result of EPUB validation

## Properties

### elapsedMs

> **elapsedMs**: `number`

Defined in: types.ts:69

Time taken for validation in milliseconds

***

### errorCount

> **errorCount**: `number`

Defined in: types.ts:59

Count of errors

***

### fatalCount

> **fatalCount**: `number`

Defined in: types.ts:57

Count of fatal errors

***

### infoCount

> **infoCount**: `number`

Defined in: types.ts:63

Count of info messages

***

### messages

> **messages**: [`ValidationMessage`](ValidationMessage.md)[]

Defined in: types.ts:55

All validation messages

***

### usageCount

> **usageCount**: `number`

Defined in: types.ts:65

Count of usage messages

***

### valid

> **valid**: `boolean`

Defined in: types.ts:53

Whether the EPUB is valid (no errors or fatal errors)

***

### version?

> `optional` **version**: [`EPUBVersion`](../type-aliases/EPUBVersion.md)

Defined in: types.ts:67

Detected EPUB version

***

### warningCount

> **warningCount**: `number`

Defined in: types.ts:61

Count of warnings
