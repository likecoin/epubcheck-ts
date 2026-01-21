/**
 * Cross-reference validator for EPUB resources
 */

import type { ValidationContext } from '../types.js';
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
      context.messages.push({
        id: 'RSC-020',
        severity: 'error',
        message: `Malformed URL: ${url}`,
        location: reference.location,
      });
      return;
    }

    // Skip data URLs
    if (isDataURL(url)) {
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
    if (isFileURL(url)) {
      context.messages.push({
        id: 'RSC-026',
        severity: 'error',
        message: 'File URLs are not allowed',
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
      context.messages.push({
        id: 'RSC-027',
        severity: 'error',
        message: 'Absolute paths are not allowed in EPUB',
        location: reference.location,
      });
    }

    // Check for parent directory references in original URL
    if (hasParentDirectoryReference(reference.url)) {
      context.messages.push({
        id: 'RSC-028',
        severity: 'error',
        message: 'Parent directory references (..) are not allowed',
        location: reference.location,
      });
    }

    // Check if target resource exists
    if (!this.registry.hasResource(resourcePath)) {
      const isLinkRef = reference.type === ReferenceType.LINK;
      context.messages.push({
        id: isLinkRef ? 'RSC-007w' : 'RSC-007',
        severity: isLinkRef ? 'warning' : 'error',
        message: `Referenced resource not found in manifest: ${resourcePath}`,
        location: reference.location,
      });
      return;
    }

    const resource = this.registry.getResource(resourcePath);

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
  private validateRemoteReference(context: ValidationContext, reference: Reference): void {
    const url = reference.url;

    // Check if using HTTPS
    if (isHTTP(url) && !isHTTPS(url)) {
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
    resourcePath: string,
    fragment: string,
  ): void {
    if (!fragment || !this.registry.hasResource(resourcePath)) {
      return;
    }

    const resource = this.registry.getResource(resourcePath);

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
    if (!this.registry.hasID(resourcePath, fragment)) {
      context.messages.push({
        id: 'RSC-012',
        severity: 'error',
        message: `Fragment identifier not found: #${fragment}`,
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
