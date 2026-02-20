/**
 * Cross-reference validator for EPUB resources
 */

import { MessageId, pushMessage } from '../messages/index.js';
import { isCoreMediaType } from '../opf/types.js';
import type { EPUBVersion, ValidationContext } from '../types.js';
import type { ResourceRegistry } from './registry.js';
import type { Reference } from './types.js';
import { ReferenceType, isPublicationResourceReference } from './types.js';
import {
  checkUrlLeaking,
  hasAbsolutePath,
  hasParentDirectoryReference,
  isDataURL,
  isFileURL,
  isHTTP,
  isHTTPS,
  isMalformedURL,
  isRemoteURL,
  parseURL,
  resolveManifestHref,
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

    this.checkRemoteResources(context);
    this.checkUndeclaredResources(context);
    this.checkReadingOrder(context);
    this.checkNonLinearReachability(context);
  }

  /**
   * Validate a single reference
   */
  private validateReference(context: ValidationContext, reference: Reference): void {
    // Trim leading/trailing whitespace (XML attribute values are whitespace-normalized)
    const url = reference.url.trim();

    // Validate data URLs first (before malformed URL check, since base64 may contain whitespace)
    // Data URLs are allowed for images/audio/video/fonts with CMT or intrinsic fallback
    // but forbidden for hyperlinks (a href, area href), nav links, and cite references
    if (isDataURL(url)) {
      if (this.version.startsWith('3.')) {
        const forbiddenDataUrlTypes = [
          ReferenceType.HYPERLINK,
          ReferenceType.NAV_TOC_LINK,
          ReferenceType.NAV_PAGELIST_LINK,
          ReferenceType.CITE,
        ];
        if (forbiddenDataUrlTypes.includes(reference.type)) {
          pushMessage(context.messages, {
            id: MessageId.RSC_029,
            message: 'Data URLs are not allowed in this context',
            location: reference.location,
          });
        } else {
          // Check RSC-032 for data URLs with foreign MIME types
          const fallbackCheckedTypes = [
            ReferenceType.IMAGE,
            ReferenceType.AUDIO,
            ReferenceType.VIDEO,
            ReferenceType.GENERIC,
          ];
          if (fallbackCheckedTypes.includes(reference.type) && !reference.hasIntrinsicFallback) {
            const dataUrlMimeType = this.extractDataURLMimeType(url);
            if (dataUrlMimeType && !isCoreMediaType(dataUrlMimeType)) {
              pushMessage(context.messages, {
                id: MessageId.RSC_032,
                message: `Fallback must be provided for foreign resources, but found none for data URL of type "${dataUrlMimeType}"`,
                location: reference.location,
              });
            }
          }
        }
      }
      return;
    }

    // Check for malformed URLs (after data URL check)
    if (isMalformedURL(url)) {
      pushMessage(context.messages, {
        id: MessageId.RSC_020,
        message: `Malformed URL: ${url}`,
        location: reference.location,
      });
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

    // RSC-033: Relative URLs must not have a query component
    if (!isRemoteURL(url) && url.includes('?')) {
      pushMessage(context.messages, {
        id: MessageId.RSC_033,
        message: `Relative URL strings must not have a query component: "${url}"`,
        location: reference.location,
      });
    }

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
    // Check for absolute paths (RSC-026: URL leaks outside container)
    if (hasAbsolutePath(resourcePath)) {
      pushMessage(context.messages, {
        id: MessageId.RSC_026,
        message: 'Absolute paths are not allowed in EPUB',
        location: reference.location,
      });
    }

    // Check for parent directory references that escape the container (RSC-026)
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
        id: MessageId.RSC_026,
        message: 'Parent directory references (..) are not allowed',
        location: reference.location,
      });
    } else if (
      !hasAbsolutePath(resourcePath) &&
      !hasParentDirectoryReference(reference.url) &&
      checkUrlLeaking(reference.url)
    ) {
      // RSC-026: Check if the URL leaks outside the container
      // (only when not already caught by the more specific checks above)
      pushMessage(context.messages, {
        id: MessageId.RSC_026,
        message: `URL "${reference.url}" leaks outside the container`,
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

    // Check if hyperlinks point to spine items (EPUB 3 only)
    const isHyperlinkLike =
      reference.type === ReferenceType.HYPERLINK ||
      reference.type === ReferenceType.NAV_TOC_LINK ||
      reference.type === ReferenceType.NAV_PAGELIST_LINK;
    if (this.version.startsWith('3') && isHyperlinkLike && !resource?.inSpine) {
      pushMessage(context.messages, {
        id: MessageId.RSC_011,
        message: 'Hyperlinks must reference spine items',
        location: reference.location,
      });
    }

    // Check if publication resources point to content documents
    // RSC-010: Hyperlinks and overlay text links must point to blessed content document types
    if (isHyperlinkLike || reference.type === ReferenceType.OVERLAY_TEXT_LINK) {
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

    // RSC-032: Foreign resources (non-CMT) must have a fallback
    // Only IMAGE, AUDIO, VIDEO, and GENERIC types are checked;
    // FONT, TRACK, STYLESHEET, LINK, etc. are exempt per spec
    const fallbackCheckedTypes = [
      ReferenceType.IMAGE,
      ReferenceType.AUDIO,
      ReferenceType.VIDEO,
      ReferenceType.GENERIC,
    ];
    if (
      resource &&
      fallbackCheckedTypes.includes(reference.type) &&
      !isCoreMediaType(resource.mimeType) &&
      !resource.hasCoreMediaTypeFallback &&
      !reference.hasIntrinsicFallback
    ) {
      pushMessage(context.messages, {
        id: MessageId.RSC_032,
        message: `Fallback must be provided for foreign resources, but found none for resource "${resourcePath}" of type "${resource.mimeType}"`,
        location: reference.location,
      });
    }
  }

  /**
   * Validate a remote reference
   */
  private validateRemoteReference(context: ValidationContext, reference: Reference): void {
    const url = reference.url;

    // Check remote resource restrictions
    if (isPublicationResourceReference(reference.type)) {
      // RSC-031: Remote publication resources should use HTTPS
      if (isHTTP(url) && !isHTTPS(url)) {
        pushMessage(context.messages, {
          id: MessageId.RSC_031,
          message: 'Remote resources must use HTTPS',
          location: reference.location,
        });
      }
      const allowedRemoteRefTypes = new Set([
        ReferenceType.AUDIO,
        ReferenceType.VIDEO,
        ReferenceType.FONT,
      ]);

      const targetResource = reference.targetResource || url;
      const resource = this.registry.getResource(targetResource);

      // Allow if reference type is audio/video/font OR if the resource's MIME type
      // indicates audio/video/font (matching Java's isRemoteResourceType check)
      const isAllowedByRefType = allowedRemoteRefTypes.has(reference.type);
      const isAllowedByMimeType = resource && this.isRemoteResourceType(resource.mimeType);

      if (!isAllowedByRefType && !isAllowedByMimeType) {
        pushMessage(context.messages, {
          id: MessageId.RSC_006,
          message: 'Remote resources are only allowed for audio, video, and fonts',
          location: reference.location,
        });
        return;
      }

      if (!resource) {
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

    // RSC-009: Non-SVG image resources should not have fragment identifiers
    if (reference.type === ReferenceType.IMAGE && resource?.mimeType !== 'image/svg+xml') {
      pushMessage(context.messages, {
        id: MessageId.RSC_009,
        message: `Fragment identifier used on a non-SVG image resource: ${resourcePath}#${fragment}`,
        location: reference.location,
      });
      return;
    }

    // RSC-014: SVG fragment type mismatch
    if (resource?.mimeType === 'image/svg+xml' && reference.type === ReferenceType.HYPERLINK) {
      // svgView/viewBox fragments can only be referenced from SVG documents
      const hasSVGView = fragment.includes('svgView(') || fragment.includes('viewBox(');
      if (hasSVGView) {
        pushMessage(context.messages, {
          id: MessageId.RSC_014,
          message: 'SVG view fragments can only be referenced from SVG documents',
          location: reference.location,
        });
      }
    }
    // RSC-014: Hyperlink pointing to SVG symbol is incompatible (can be inline in XHTML too)
    if (reference.type === ReferenceType.HYPERLINK) {
      if (this.registry.isSVGSymbolID(resourcePath, fragment)) {
        pushMessage(context.messages, {
          id: MessageId.RSC_014,
          message: `Fragment identifier "${fragment}" defines an incompatible resource type (SVG symbol)`,
          location: reference.location,
        });
      }
    }

    // Check if fragment target exists (only for resource types we parse for IDs)
    // Skip remote resources since we can't parse their content
    // Skip svgView() fragments — they are functional, not ID-based
    const parsedMimeTypes = ['application/xhtml+xml', 'image/svg+xml'];
    if (
      resource &&
      parsedMimeTypes.includes(resource.mimeType) &&
      !isRemoteURL(resourcePath) &&
      !fragment.includes('svgView(') &&
      reference.type !== ReferenceType.SVG_SYMBOL
    ) {
      if (!this.registry.hasID(resourcePath, fragment)) {
        pushMessage(context.messages, {
          id: MessageId.RSC_012,
          message: `Fragment identifier not found: #${fragment}`,
          location: reference.location,
        });
      }
    }
  }

  /**
   * Check non-spine remote resources that have non-standard types.
   * Fires RSC-006 for remote items that aren't audio/video/font types
   * and aren't referenced as audio/video/font by content documents.
   * This mirrors Java's checkItemAfterResourceValidation behavior.
   */
  private checkRemoteResources(context: ValidationContext): void {
    if (!this.version.startsWith('3')) return;

    // Collect remote resources that are referenced as allowed types (font/audio/video)
    const referencedAsAllowed = new Set<string>();
    for (const ref of this.references) {
      if (isRemoteURL(ref.url) || isRemoteURL(ref.targetResource)) {
        if (
          ref.type === ReferenceType.FONT ||
          ref.type === ReferenceType.AUDIO ||
          ref.type === ReferenceType.VIDEO
        ) {
          referencedAsAllowed.add(ref.targetResource);
        }
      }
    }

    for (const resource of this.registry.getAllResources()) {
      if (!isRemoteURL(resource.url)) continue;
      if (resource.inSpine) continue; // Already checked in OPF validator
      if (this.isRemoteResourceType(resource.mimeType)) continue;
      if (referencedAsAllowed.has(resource.url)) continue;

      pushMessage(context.messages, {
        id: MessageId.RSC_006,
        message: `Remote resource reference is not allowed; resource "${resource.url}" must be located in the EPUB container`,
        location: { path: resource.url },
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
      if (resource.isNav) continue;
      if (resource.isNcx) continue;
      if (resource.isCoverImage) continue;

      pushMessage(context.messages, {
        id: MessageId.OPF_097,
        message: `Resource declared in manifest but not referenced: ${resource.url}`,
        location: { path: resource.url },
      });
    }
  }

  private checkReadingOrder(context: ValidationContext): void {
    if (!context.tocLinks || !context.packageDocument) return;

    const packageDoc = context.packageDocument;
    const spine = packageDoc.spine;
    const opfPath = context.opfPath ?? '';
    const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/')) : '';

    const spinePositionMap = new Map<string, number>();
    for (const [i, spineRef] of spine.entries()) {
      const item = packageDoc.manifest.find((m) => m.id === spineRef.idref);
      if (item) {
        spinePositionMap.set(resolveManifestHref(opfDir, item.href), i);
      }
    }

    let lastSpinePosition = -1;
    let lastAnchorPosition = -1;

    for (const link of context.tocLinks) {
      const spinePos = spinePositionMap.get(link.targetResource);
      if (spinePos === undefined) continue;

      if (spinePos < lastSpinePosition) {
        pushMessage(context.messages, {
          id: MessageId.NAV_011,
          message: `"toc" nav must be in reading order; link target "${link.targetResource}" is before the previous link's target in spine order`,
          location: link.location,
        });
        lastSpinePosition = spinePos;
        lastAnchorPosition = -1;
      } else {
        if (spinePos > lastSpinePosition) {
          lastSpinePosition = spinePos;
          lastAnchorPosition = -1;
        }

        const targetAnchorPosition = link.fragment
          ? this.registry.getIDPosition(link.targetResource, link.fragment)
          : -1;
        if (targetAnchorPosition > -1) {
          if (targetAnchorPosition < lastAnchorPosition) {
            const target = link.fragment
              ? `${link.targetResource}#${link.fragment}`
              : link.targetResource;
            pushMessage(context.messages, {
              id: MessageId.NAV_011,
              message: `"toc" nav must be in reading order; link target "${target}" is before the previous link's target in document order`,
              location: link.location,
            });
          }
          lastAnchorPosition = targetAnchorPosition;
        }
      }
    }
  }

  private checkNonLinearReachability(context: ValidationContext): void {
    if (!context.packageDocument) return;

    const spine = context.packageDocument.spine;
    const opfPath = context.opfPath ?? '';
    const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/')) : '';

    const hyperlinkTargets = new Set<string>();
    for (const ref of this.references) {
      if (
        ref.type === ReferenceType.HYPERLINK ||
        ref.type === ReferenceType.NAV_TOC_LINK ||
        ref.type === ReferenceType.NAV_PAGELIST_LINK
      ) {
        hyperlinkTargets.add(ref.targetResource);
      }
    }

    const hasScripts = context.packageDocument.manifest.some((m) =>
      m.properties?.includes('scripted'),
    );

    for (const spineItem of spine) {
      if (spineItem.linear) continue;

      const item = context.packageDocument.manifest.find((m) => m.id === spineItem.idref);
      if (!item) continue;

      const fullPath = resolveManifestHref(opfDir, item.href);

      if (!hyperlinkTargets.has(fullPath)) {
        pushMessage(context.messages, {
          id: hasScripts ? MessageId.OPF_096b : MessageId.OPF_096,
          message: `Non-linear content must be reachable, but found no hyperlink to "${fullPath}"`,
          location: { path: fullPath },
        });
      }
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

  private extractDataURLMimeType(url: string): string {
    const match = /^data:([^;,]+)/.exec(url);
    return match?.[1]?.trim().toLowerCase() ?? 'text/plain';
  }

  private isRemoteResourceType(mimeType: string): boolean {
    return (
      mimeType.startsWith('audio/') ||
      mimeType.startsWith('video/') ||
      mimeType.startsWith('font/') ||
      mimeType === 'application/font-sfnt' ||
      mimeType === 'application/font-woff' ||
      mimeType === 'application/font-woff2' ||
      mimeType === 'application/vnd.ms-opentype'
    );
  }
}
