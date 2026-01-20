import type { EpubCheckResult, EPUBVersion, Severity, ValidationMessage } from '../types.js';

/**
 * Build a validation result from messages
 */
export function buildReport(
  messages: ValidationMessage[],
  version: EPUBVersion | undefined,
  elapsedMs: number,
): EpubCheckResult {
  const counts = countBySeverity(messages);

  return {
    valid: counts.fatal === 0 && counts.error === 0,
    messages,
    fatalCount: counts.fatal,
    errorCount: counts.error,
    warningCount: counts.warning,
    infoCount: counts.info,
    usageCount: counts.usage,
    version,
    elapsedMs,
  };
}

/**
 * Count messages by severity
 */
export function countBySeverity(messages: ValidationMessage[]): Record<Severity, number> {
  const counts: Record<Severity, number> = {
    fatal: 0,
    error: 0,
    warning: 0,
    info: 0,
    usage: 0,
  };

  for (const msg of messages) {
    counts[msg.severity]++;
  }

  return counts;
}

/**
 * Filter messages by severity
 */
export function filterBySeverity(
  messages: ValidationMessage[],
  severity: Severity,
): ValidationMessage[] {
  return messages.filter((msg) => msg.severity === severity);
}

/**
 * Filter messages by path
 */
export function filterByPath(messages: ValidationMessage[], path: string): ValidationMessage[] {
  return messages.filter((msg) => msg.location?.path === path);
}

/**
 * Format messages as a string for display
 */
export function formatMessages(messages: ValidationMessage[]): string {
  return messages
    .map((msg) => {
      const loc = msg.location;
      const position = loc
        ? `${loc.path}${loc.line !== undefined ? `:${String(loc.line)}` : ''}${loc.column !== undefined ? `:${String(loc.column)}` : ''}`
        : '';
      return `${msg.severity.toUpperCase()}(${msg.id}): ${msg.message}${position ? ` [${position}]` : ''}`;
    })
    .join('\n');
}

/**
 * Convert result to JSON report format (compatible with EPUBCheck JSON output)
 */
export function toJSONReport(result: EpubCheckResult): string {
  return JSON.stringify(
    {
      checker: {
        name: 'epubcheck-ts',
        version: '0.1.0',
      },
      publication: {
        version: result.version,
      },
      messages: result.messages.map((msg) => ({
        ID: msg.id,
        severity: msg.severity,
        message: msg.message,
        ...(msg.location && {
          locations: [
            {
              path: msg.location.path,
              line: msg.location.line ?? -1,
              column: msg.location.column ?? -1,
              context: msg.location.context,
            },
          ],
        }),
        ...(msg.suggestion && { suggestion: msg.suggestion }),
      })),
      fatals: result.fatalCount,
      errors: result.errorCount,
      warnings: result.warningCount,
      infos: result.infoCount,
      usages: result.usageCount,
      elapsedTime: result.elapsedMs,
    },
    null,
    2,
  );
}

/**
 * @deprecated Use individual functions instead. This class will be removed in a future version.
 */
export const Report = {
  build: buildReport,
  countBySeverity,
  filterBySeverity,
  filterByPath,
  format: formatMessages,
  toJSON: toJSONReport,
};
