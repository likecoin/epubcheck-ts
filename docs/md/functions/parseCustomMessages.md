[**epubcheck-ts**](../README.md)

***

[epubcheck-ts](../globals.md) / parseCustomMessages

# Function: parseCustomMessages()

> **parseCustomMessages**(`content`): `Map`\<`string`, [`MessageSeverity`](../type-aliases/MessageSeverity.md)\>

Defined in: messages/messages.ts:1388

Parse a custom messages file (TSV format compatible with Java EPUBCheck).

Format: one override per line, tab-separated: `ID\tSEVERITY`
Lines starting with # are comments. A header line starting with "id" is skipped.

## Parameters

### content

`string`

## Returns

`Map`\<`string`, [`MessageSeverity`](../type-aliases/MessageSeverity.md)\>

## Example

```
ACC-004\tWARNING
ACC-005\tWARNING
RSC-008\tSUPPRESSED
```
