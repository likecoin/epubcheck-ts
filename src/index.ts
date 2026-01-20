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

// Message IDs
export { MessageId } from './messages/message-id.js';

// Schema validation
export type { SchemaValidator } from './schema/index.js';
