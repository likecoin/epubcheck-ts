/**
 * epubcheck-ts - EPUB validation library for Node.js and browsers
 *
 * @packageDocumentation
 */

// Main checker class
export { EpubCheck } from './checker.js';

// Types
export type {
  EpubCheckOptions,
  EpubCheckResult,
  ValidationMessage,
  Severity,
  EPUBVersion,
  EPUBProfile,
  ValidationContext,
} from './types.js';

// Core components - report utilities
export {
  buildReport,
  countBySeverity,
  filterBySeverity,
  filterByPath,
  formatMessages,
  toJSONReport,
} from './core/report.js';

// Message IDs and registry
export { MessageId } from './messages/message-id.js';
export {
  MESSAGE_REGISTRY,
  MESSAGE_MAP,
  getDefaultSeverity,
  formatMessageList,
  createMessage,
  pushMessage,
} from './messages/message-registry.js';
export type {
  MessageInfo,
  MessageSeverity,
  CreateMessageOptions,
} from './messages/message-registry.js';

// Schema validation
export type { SchemaValidator } from './schema/index.js';
