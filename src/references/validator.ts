/**
 * Cross-reference validator for EPUB resources
 */

import { MessageId, pushMessage } from '../messages/index.js';
import type { ValidationContext, EPUBVersion } from '../types.js';
import type { ResourceRegistry } from './registry.js';
import type { Reference } from './types.js';
import { ReferenceType, isPublicationResourceReference } from './types.js';
import {
  hasAbsolutePath,
  hasParentDirectoryReference,
  isDataURL,
  isFileURL,
  isHTTP,
  isHTTPS,
  isMalformedURL,
  isRemoteURL,
  parseURL,
} from './url.js';

/**
 * Validator for resource references
 */
export class ReferenceValidator {
  private registry: ResourceRegistry;
  private version: string;
  private references: Reference[] = [];

  constructor(registry: ResourceRegistry, version: string) {
    this.registry = registry;
    this.version = version;
  }

  /**
   * Register a reference for validation
   */
  addReference(reference: Reference): void {
    this.references.push(reference);
  }

  /**
   * Validate all registered references
   */
  validate(context: ValidationContext): void {
    for (const reference of this.references) {
      this.validateReference(context, reference);
    }

    this.checkUndeclaredResources(context);
  }

  /**
   * Validate a single reference
   */
  private validateReference(context: ValidationContext, reference: Reference): void {
    const url = reference.url;

    // Check for malformed URLs
    if (isMalformedURL(url)) {
      pushMessage(context.messages, {
        id: MessageId.RSC_020,
        message: `Malformed URL: ${url}`,
        location: reference.location,
      });
      return;
    }

    // Skip data URLs
    if (isDataURL(url)) {
      if (this.version.startsWith('3.')) {
        pushMessage(context.messages, {
          id: MessageId.RSC_029,
          message: 'Data URLs are not allowed in EPUB 3',
          location: reference.location,
        });
      }
      return;
    }

    if (isFileURL(url)) {
      pushMessage(context.messages, {
        id: MessageId.RSC_030,
        message: `File URLs are not allowed in EPUB, but found "${url}"`,
        location: reference.location,
      });
      return;
    }

    // Use targetResource if available, otherwise parse URL
    const resourcePath = reference.targetResource || parseURL(url).resource;
    const fragment = reference.fragment ?? parseURL(url).fragment;
    const hasFragment = fragment !== undefined && fragment !== '';

    // Validate relative URLs
    if (!isRemoteURL(url)) {
      this.validateLocalReference(context, reference, resourcePath);
    } else {
      this.validateRemoteReference(context, reference);
    }

    // Validate fragments
    if (hasFragment) {
      this.validateFragment(context, reference, resourcePath, fragment);
    }
  }

  /**
   * Validate a local (non-remote) reference
   */
  private validateLocalReference(
    context: ValidationContext,
    reference: Reference,
    resourcePath: string,
  ): void {
    // Check for absolute paths
    if (hasAbsolutePath(resourcePath)) {
      pushMessage(context.messages, {
        id: MessageId.RSC_027,
        message: 'Absolute paths are not allowed in EPUB',
        location: reference.location,
      });
    }

    // Check for parent directory references in original URL
    // Note: Parent directory references are allowed for stylesheets, images, and other resources
    // They are only forbidden for hyperlinks and navigation references
    const forbiddenParentDirTypes = [
      ReferenceType.HYPERLINK,
      ReferenceType.NAV_TOC_LINK,
      ReferenceType.NAV_PAGELIST_LINK,
    ];
    if (
      hasParentDirectoryReference(reference.url) &&
      forbiddenParentDirTypes.includes(reference.type)
    ) {
      pushMessage(context.messages, {
        id: MessageId.RSC_028,
        message: 'Parent directory references (..) are not allowed',
        location: reference.location,
      });
    }

    // Check if target resource exists in manifest
    if (!this.registry.hasResource(resourcePath)) {
      const fileExistsInContainer = context.files.has(resourcePath);

      if (fileExistsInContainer) {
        // File exists but not declared in manifest - report RSC-008
        if (!context.referencedUndeclaredResources?.has(resourcePath)) {
          pushMessage(context.messages, {
            id: MessageId.RSC_008,
            message: `Referenced resource "${resourcePath}" is not declared in the OPF manifest`,
            location: reference.location,
          });
          context.referencedUndeclaredResources ??= new Set();
          context.referencedUndeclaredResources.add(resourcePath);
        }
      } else {
        // File doesn't exist at all - report RSC-007
        const isLinkRef = reference.type === ReferenceType.LINK;
        pushMessage(context.messages, {
          id: isLinkRef ? MessageId.RSC_007w : MessageId.RSC_007,
          message: `Referenced resource not found in EPUB: ${resourcePath}`,
          location: reference.location,
        });
      }
      // Skip further validation since resource is not properly declared
      return;
    }

    const resource = this.registry.getResource(resourcePath);

    // Check if hyperlinks point to spine items
    if (reference.type === ReferenceType.HYPERLINK && !resource?.inSpine) {
      pushMessage(context.messages, {
        id: MessageId.RSC_011,
        message: 'Hyperlinks must reference spine items',
        location: reference.location,
      });
    }

    // Check if publication resources point to content documents
    // RSC-010: Hyperlinks and overlay text links must point to blessed content document types
    if (
      reference.type === ReferenceType.HYPERLINK ||
      reference.type === ReferenceType.OVERLAY_TEXT_LINK
    ) {
      const targetMimeType = resource?.mimeType;
      if (
        targetMimeType &&
        !this.isBlessedItemType(targetMimeType, context.version) &&
        !this.isDeprecatedBlessedItemType(targetMimeType) &&
        !resource.hasCoreMediaTypeFallback
      ) {
        pushMessage(context.messages, {
          id: MessageId.RSC_010,
          message: 'Publication resource references must point to content documents',
          location: reference.location,
        });
      }
    }
  }

  /**
   * Validate a remote reference
   */
  private validateRemoteReference(context: ValidationContext, reference: Reference): void {
    const url = reference.url;

    // Check if using HTTPS
    if (isHTTP(url) && !isHTTPS(url)) {
      pushMessage(context.messages, {
        id: MessageId.RSC_031,
        message: 'Remote resources must use HTTPS',
        location: reference.location,
      });
    }

    // Check remote resource restrictions
    if (isPublicationResourceReference(reference.type)) {
      const allowedRemoteTypes = new Set([
        ReferenceType.AUDIO,
        ReferenceType.VIDEO,
        ReferenceType.FONT,
      ]);

      if (!allowedRemoteTypes.has(reference.type)) {
        pushMessage(context.messages, {
          id: MessageId.RSC_006,
          message: 'Remote resources are only allowed for audio, video, and fonts',
          location: reference.location,
        });
        return;
      }

      const targetResource = reference.targetResource || url;
      if (!this.registry.hasResource(targetResource)) {
        pushMessage(context.messages, {
          id: MessageId.RSC_008,
          message: `Referenced resource "${targetResource}" is not declared in the OPF manifest`,
          location: reference.location,
        });
      }
    }
  }

  /**
   * Validate a fragment identifier
   */
  private validateFragment(
    context: ValidationContext,
    reference: Reference,
    resourcePath: string,
    fragment: string,
  ): void {
    if (!fragment || !this.registry.hasResource(resourcePath)) {
      return;
    }

    const resource = this.registry.getResource(resourcePath);

    // RSC-013: Stylesheets should not have fragment identifiers
    if (reference.type === ReferenceType.STYLESHEET) {
      pushMessage(context.messages, {
        id: MessageId.RSC_013,
        message: 'Stylesheet references must not have fragment identifiers',
        location: reference.location,
      });
      return;
    }

    // RSC-014: SVG fragment type mismatch
    // SVG views (svgView(...) or viewBox(...)) can only be referenced from SVG documents
    if (resource?.mimeType === 'image/svg+xml') {
      const hasSVGView = fragment.includes('svgView(') || fragment.includes('viewBox(');

      if (hasSVGView && reference.type === ReferenceType.HYPERLINK) {
        pushMessage(context.messages, {
          id: MessageId.RSC_014,
          message: 'SVG view fragments can only be referenced from SVG documents',
          location: reference.location,
        });
      }
    }

    // Check if fragment target exists
    if (!this.registry.hasID(resourcePath, fragment)) {
      pushMessage(context.messages, {
        id: MessageId.RSC_012,
        message: `Fragment identifier not found: #${fragment}`,
        location: reference.location,
      });
    }
  }

  /**
   * Check for resources that were never referenced
   * Following Java EPUBCheck OPFChecker30.java logic:
   * - Skip items in spine (implicitly referenced)
   * - Skip nav and NCX resources
   * - Only check for "publication resource references" (not HYPERLINK)
   */
  private checkUndeclaredResources(context: ValidationContext): void {
    const referencedResources = new Set(
      this.references
        .filter((ref) => {
          if (!isPublicationResourceReference(ref.type)) {
            return false;
          }
          const targetResource = ref.targetResource || parseURL(ref.url).resource;
          return this.registry.hasResource(targetResource);
        })
        .map((ref) => ref.targetResource || parseURL(ref.url).resource),
    );

    for (const resource of this.registry.getAllResources()) {
      if (resource.inSpine) continue;
      if (referencedResources.has(resource.url)) continue;
      if (resource.url.includes('nav')) continue;
      if (resource.url.includes('toc.ncx') || resource.url.includes('.ncx')) continue;
      if (resource.url.includes('cover-image')) continue;

      pushMessage(context.messages, {
        id: MessageId.OPF_097,
        message: `Resource declared in manifest but not referenced: ${resource.url}`,
        location: { path: resource.url },
      });
    }
  }

  /**
   * Check if a MIME type is a blessed content document type
   */
  private isBlessedItemType(mimeType: string, version: EPUBVersion): boolean {
    if (version === '2.0') {
      return mimeType === 'application/xhtml+xml' || mimeType === 'application/x-dtbook+xml';
    } else {
      return mimeType === 'application/xhtml+xml' || mimeType === 'image/svg+xml';
    }
  }

  /**
   * Check if a MIME type is a deprecated blessed content document type
   */
  private isDeprecatedBlessedItemType(mimeType: string): boolean {
    return mimeType === 'text/x-oeb1-document' || mimeType === 'text/html';
  }
}
