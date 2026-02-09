[**epubcheck-ts**](../README.md)

***

[epubcheck-ts](../globals.md) / pushMessage

# Function: pushMessage()

> **pushMessage**(`messages`, `options`): `void`

Defined in: messages/messages.ts:1329

Create and push a validation message to the messages array.
Automatically handles suppressed messages by not pushing them.

## Parameters

### messages

[`ValidationMessage`](../interfaces/ValidationMessage.md)[]

### options

[`CreateMessageOptions`](../interfaces/CreateMessageOptions.md)

## Returns

`void`

## Example

```typescript
pushMessage(context.messages, {
  id: MessageId.PKG_006,
  message: 'Missing mimetype file',
  location: { path: 'mimetype' },
});
```
