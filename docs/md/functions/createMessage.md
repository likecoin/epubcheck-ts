[**epubcheck-ts**](../README.md)

***

[epubcheck-ts](../globals.md) / createMessage

# Function: createMessage()

> **createMessage**(`options`): [`ValidationMessage`](../interfaces/ValidationMessage.md) \| `null`

Defined in: messages/messages.ts:1287

Create a validation message with automatic severity lookup

## Parameters

### options

[`CreateMessageOptions`](../interfaces/CreateMessageOptions.md)

## Returns

[`ValidationMessage`](../interfaces/ValidationMessage.md) \| `null`

## Example

```typescript
const msg = createMessage({
  id: MessageId.PKG_006,
  message: 'Missing mimetype file',
  location: { path: 'mimetype' },
});
if (msg) context.messages.push(msg);
```
