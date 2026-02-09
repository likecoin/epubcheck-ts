[**epubcheck-ts**](../README.md)

***

[epubcheck-ts](../globals.md) / SchemaValidator

# Interface: SchemaValidator

Defined in: schema/validator.ts:15

Interface for schema validators

## Methods

### dispose()

> **dispose**(): `void`

Defined in: schema/validator.ts:28

Dispose of any resources held by the validator

#### Returns

`void`

***

### validate()

> **validate**(`xml`, `schemaPath`): `Promise`\<[`ValidationMessage`](ValidationMessage.md)[]\>

Defined in: schema/validator.ts:23

Validate XML content against a schema

#### Parameters

##### xml

`string`

The XML content to validate

##### schemaPath

`string`

Path to the schema file

#### Returns

`Promise`\<[`ValidationMessage`](ValidationMessage.md)[]\>

Array of validation messages
