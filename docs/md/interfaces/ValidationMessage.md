[**epubcheck-ts**](../README.md)

***

[epubcheck-ts](../globals.md) / ValidationMessage

# Interface: ValidationMessage

Defined in: types.ts:51

A validation message (error, warning, etc.)

## Properties

### id

> **id**: `string`

Defined in: types.ts:53

Unique message identifier

***

### location?

> `optional` **location**: `EPUBLocation`

Defined in: types.ts:59

Location where the issue was found

***

### message

> **message**: `string`

Defined in: types.ts:57

Human-readable message

***

### severity

> **severity**: [`Severity`](../type-aliases/Severity.md)

Defined in: types.ts:55

Severity level

***

### suggestion?

> `optional` **suggestion**: `string`

Defined in: types.ts:61

Suggestion for fixing the issue
