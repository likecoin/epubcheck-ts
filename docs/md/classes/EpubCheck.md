[**epubcheck-ts**](../README.md)

***

[epubcheck-ts](../globals.md) / EpubCheck

# Class: EpubCheck

Defined in: checker.ts:50

Main EPUB validation class

## Example

```typescript
import { EpubCheck } from 'epubcheck-ts';

// Validate from a Uint8Array (works in Node.js and browsers)
const result = await EpubCheck.validate(epubData);

if (result.valid) {
  console.log('EPUB is valid!');
} else {
  console.log(`Found ${result.errorCount} errors`);
  for (const msg of result.messages) {
    console.log(`${msg.severity}: ${msg.message}`);
  }
}
```

## Constructors

### Constructor

> **new EpubCheck**(`options?`): `EpubCheck`

Defined in: checker.ts:56

Create a new EpubCheck instance with custom options

#### Parameters

##### options?

[`EpubCheckOptions`](../interfaces/EpubCheckOptions.md) = `{}`

#### Returns

`EpubCheck`

## Accessors

### version

#### Get Signature

> **get** **version**(): [`EPUBVersion`](../type-aliases/EPUBVersion.md)

Defined in: checker.ts:161

Get the current EPUB version being validated against

##### Returns

[`EPUBVersion`](../type-aliases/EPUBVersion.md)

## Methods

### addMessage()

> `protected` **addMessage**(`messages`, `message`): `void`

Defined in: checker.ts:222

Add a validation message to the context

#### Parameters

##### messages

[`ValidationMessage`](../interfaces/ValidationMessage.md)[]

##### message

[`ValidationMessage`](../interfaces/ValidationMessage.md)

#### Returns

`void`

***

### check()

> **check**(`data`): `Promise`\<[`EpubCheckResult`](../interfaces/EpubCheckResult.md)\>

Defined in: checker.ts:66

Validate an EPUB file

#### Parameters

##### data

`Uint8Array`

The EPUB file as a Uint8Array

#### Returns

`Promise`\<[`EpubCheckResult`](../interfaces/EpubCheckResult.md)\>

Validation result

***

### validate()

> `static` **validate**(`data`, `options?`): `Promise`\<[`EpubCheckResult`](../interfaces/EpubCheckResult.md)\>

Defined in: checker.ts:150

Static method to validate an EPUB file with default options

#### Parameters

##### data

`Uint8Array`

The EPUB file as a Uint8Array

##### options?

[`EpubCheckOptions`](../interfaces/EpubCheckOptions.md) = `{}`

Optional validation options

#### Returns

`Promise`\<[`EpubCheckResult`](../interfaces/EpubCheckResult.md)\>

Validation result
