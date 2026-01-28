/**
 * Navigation document validation
 */

import { MessageId } from '../messages/message-id.js';
import { pushMessage } from '../messages/message-registry.js';
import type { ValidationContext } from '../types.js';

/**
 * Validator for EPUB 3 navigation documents
 */
export class NavValidator {
  /**
   * Validate navigation document
   */
  validate(context: ValidationContext, navContent: string, navPath: string): void {
    this.checkNavElement(context, navContent, navPath);
    this.checkNavTypes(context, navContent, navPath);
    this.checkNavLinks(context, navContent, navPath);
  }

  /**
   * Check for nav element
   */
  private checkNavElement(context: ValidationContext, content: string, path: string): void {
    if (!/<nav/i.test(content)) {
      pushMessage(context.messages, {
        id: MessageId.NAV_001,
        message: 'Navigation document must contain a nav element',
        location: { path },
      });
    }
  }

  /**
   * Check epub:type attributes on nav elements
   */
  private checkNavTypes(context: ValidationContext, content: string, path: string): void {
    // Check for toc nav
    const tocMatch = /<nav[^>]*epub:type\s*=\s*["'][^"']*toc[^"']*["']/i.exec(content);
    if (!tocMatch) {
      // Find first nav element for line number
      const navMatch = /<nav/i.exec(content);
      const location: { path: string; line?: number } = { path };
      if (navMatch) {
        location.line = content.substring(0, navMatch.index).split('\n').length;
      }
      pushMessage(context.messages, {
        id: MessageId.NAV_001,
        message: 'Navigation document must have a nav element with epub:type="toc"',
        location,
      });
    }
  }

  /**
   * Check nav structure (ol element)
   */
  private checkNavLinks(context: ValidationContext, content: string, path: string): void {
    // Find the toc nav
    const tocMatch =
      /<nav[^>]*epub:type\s*=\s*["'][^"']*toc[^"']*["'][^>]*>([\s\S]*?)<\/nav>/i.exec(content);

    if (tocMatch?.[1]) {
      const navContent = tocMatch[1];
      const line = content.substring(0, tocMatch.index).split('\n').length;

      // Check for ol element inside nav
      if (!/<ol[\s>]/i.test(navContent)) {
        pushMessage(context.messages, {
          id: MessageId.NAV_002,
          message: 'Navigation document toc nav must contain an ol element',
          location: { path, line },
        });
      }
    }
  }
}
