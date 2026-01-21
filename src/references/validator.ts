/**
 * Cross-reference validator for EPUB resources
 */

import type { ValidationContext } from '../types.js';
import type { ResourceRegistry } from './registry.js';
import type { Reference } from './types.js';
import { type ParsedURL, ReferenceType, isPublicationResourceReference } from './types.js';
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
    const parsed = parseURL(reference.url);

    // Check for malformed URLs
    if (isMalformedURL(parsed.url)) {
      context.messages.push({
        id: 'RSC-020',
        severity: 'error',
        message: `Malformed URL: ${parsed.url}`,
        location: reference.location,
      });
      return;
    }

    // Skip data URLs
    if (isDataURL(parsed.url)) {
      if (this.version.startsWith('3.')) {
        context.messages.push({
          id: 'RSC-029',
          severity: 'error',
          message: 'Data URLs are not allowed in EPUB 3',
          location: reference.location,
        });
      }
      return;
    }

    // Check for file URLs
    if (isFileURL(parsed.url)) {
      context.messages.push({
        id: 'RSC-026',
        severity: 'error',
        message: 'File URLs are not allowed',
        location: reference.location,
      });
      return;
    }

    // Validate relative URLs
    if (!isRemoteURL(parsed.url)) {
      this.validateLocalReference(context, reference, parsed);
    } else {
      this.validateRemoteReference(context, reference, parsed);
    }

    // Validate fragments
    if (parsed.hasFragment) {
      this.validateFragment(context, reference, parsed);
    }
  }

  /**
   * Validate a local (non-remote) reference
   */
  private validateLocalReference(
    context: ValidationContext,
    reference: Reference,
    parsed: ParsedURL,
  ): void {
    // Check for absolute paths
    if (hasAbsolutePath(parsed.resource)) {
      context.messages.push({
        id: 'RSC-027',
        severity: 'error',
        message: 'Absolute paths are not allowed in EPUB',
        location: reference.location,
      });
    }

    // Check for parent directory references
    if (hasParentDirectoryReference(parsed.resource)) {
      context.messages.push({
        id: 'RSC-028',
        severity: 'error',
        message: 'Parent directory references (..) are not allowed',
        location: reference.location,
      });
    }

    // Check if target resource exists
    if (!this.registry.hasResource(parsed.resource)) {
      // RSC-007w: LINK references get a warning (may be external/optional)
      // RSC-007: Other references get an error
      const isLinkRef = reference.type === ReferenceType.LINK;
      context.messages.push({
        id: isLinkRef ? 'RSC-007w' : 'RSC-007',
        severity: isLinkRef ? 'warning' : 'error',
        message: `Referenced resource not found in manifest: ${parsed.resource}`,
        location: reference.location,
      });
      return;
    }

    const resource = this.registry.getResource(parsed.resource);

    // Check if hyperlinks point to spine items
    if (reference.type === ReferenceType.HYPERLINK && !resource?.inSpine) {
      context.messages.push({
        id: 'RSC-011',
        severity: 'error',
        message: 'Hyperlinks must reference spine items',
        location: reference.location,
      });
    }

    // Check if publication resources point to content documents
    if (isPublicationResourceReference(reference.type) && !resource?.inSpine) {
      context.messages.push({
        id: 'RSC-010',
        severity: 'error',
        message: 'Publication resource references must point to content documents',
        location: reference.location,
      });
    }
  }

  /**
   * Validate a remote reference
   */
  private validateRemoteReference(
    context: ValidationContext,
    reference: Reference,
    parsed: ParsedURL,
  ): void {
    // Check if using HTTPS
    if (isHTTP(parsed.url) && !isHTTPS(parsed.url)) {
      context.messages.push({
        id: 'RSC-031',
        severity: 'error',
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
        context.messages.push({
          id: 'RSC-006',
          severity: 'error',
          message: 'Remote resources are only allowed for audio, video, and fonts',
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
    parsed: ParsedURL,
  ): void {
    if (!parsed.fragment || !this.registry.hasResource(parsed.resource)) {
      return;
    }

    const resource = this.registry.getResource(parsed.resource);

    // RSC-013: Stylesheets should not have fragment identifiers
    if (reference.type === ReferenceType.STYLESHEET) {
      context.messages.push({
        id: 'RSC-013',
        severity: 'error',
        message: 'Stylesheet references must not have fragment identifiers',
        location: reference.location,
      });
      return;
    }

    // RSC-014: SVG fragment type mismatch
    // SVG views (svgView(...) or viewBox(...)) can only be referenced from SVG documents
    if (resource?.mimeType === 'image/svg+xml') {
      const fragment = parsed.fragment;
      const hasSVGView = fragment.includes('svgView(') || fragment.includes('viewBox(');

      if (hasSVGView && reference.type === ReferenceType.HYPERLINK) {
        context.messages.push({
          id: 'RSC-014',
          severity: 'error',
          message: 'SVG view fragments can only be referenced from SVG documents',
          location: reference.location,
        });
      }
    }

    // Check if fragment target exists
    if (!this.registry.hasID(parsed.resource, parsed.fragment)) {
      context.messages.push({
        id: 'RSC-012',
        severity: 'error',
        message: `Fragment identifier not found: #${parsed.fragment}`,
        location: reference.location,
      });
    }
  }

  /**
   * Check for resources that were never referenced
   */
  private checkUndeclaredResources(context: ValidationContext): void {
    // Get all resources that are referenced
    const referencedResources = new Set(
      this.references
        .filter((ref) => {
          // Only count references that point to existing resources
          const parsed = parseURL(ref.url);
          return this.registry.hasResource(parsed.resource);
        })
        .map((ref) => parseURL(ref.url).resource),
    );

    for (const resource of this.registry.getAllResources()) {
      // Skip resources that are referenced
      if (referencedResources.has(resource.url)) continue;

      // Skip resources that don't typically need to be referenced
      // (this is a simplified check - real EPUBCheck has more complex logic)
      const skipPatterns = ['nav', 'cover-image', 'toc.ncx'];
      if (skipPatterns.some((pattern) => resource.url.includes(pattern))) {
        continue;
      }

      context.messages.push({
        id: 'OPF-097',
        severity: 'warning',
        message: `Resource declared in manifest but not referenced: ${resource.url}`,
        location: { path: resource.url },
      });
    }
  }
}
