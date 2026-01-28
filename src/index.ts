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
export {
  MessageId,
  getDefaultSeverity,
  getMessageInfo,
  getAllMessages,
  formatMessageList,
  createMessage,
  pushMessage,
} from './messages/index.js';
export type {
  MessageInfo,
  MessageSeverity,
  CreateMessageOptions,
} from './messages/index.js';

// Schema validation
export type { SchemaValidator } from './schema/index.js';
