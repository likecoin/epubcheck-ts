[**epubcheck-ts**](../README.md)

***

[epubcheck-ts](../globals.md) / ValidationMessage

# Interface: ValidationMessage

Defined in: types.ts:35

A validation message (error, warning, etc.)

## Properties

### id

> **id**: `string`

Defined in: types.ts:37

Unique message identifier

***

### location?

> `optional` **location**: `EPUBLocation`

Defined in: types.ts:43

Location where the issue was found

***

### message

> **message**: `string`

Defined in: types.ts:41

Human-readable message

***

### severity

> **severity**: [`Severity`](../type-aliases/Severity.md)

Defined in: types.ts:39

Severity level

***

### suggestion?

> `optional` **suggestion**: `string`

Defined in: types.ts:45

Suggestion for fixing the issue
