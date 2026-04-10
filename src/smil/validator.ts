/**
 * Media Overlay (SMIL) document validation
 */

import { XmlDocument, type XmlElement } from 'libxml2-wasm';
import { EPUB_SSV_ALL } from '../vocab/epub-ssv.js';
import { MessageId, pushMessage } from '../messages/index.js';
import type { ManifestItem } from '../opf/types.js';
import type { ValidationContext } from '../types.js';
import { parseSmilClock } from './clock.js';

const SMIL_NS = { smil: 'http://www.w3.org/ns/SMIL' };

const BLESSED_AUDIO_TYPES = new Set(['audio/mpeg', 'audio/mp4']);
const BLESSED_AUDIO_PATTERN = /^audio\/ogg\s*;\s*codecs=opus$/i;

function isBlessedAudioType(mimeType: string): boolean {
  return BLESSED_AUDIO_TYPES.has(mimeType) || BLESSED_AUDIO_PATTERN.test(mimeType);
}

export interface SMILTextReference {
  /** Path to the referenced content document (without fragment) */
  docPath: string;
  /** Fragment identifier (element ID), if any */
  fragment: string | undefined;
  /** Line number in the SMIL document */
  line: number | undefined;
}

export interface SMILValidationResult {
  /** Content document paths referenced by text elements */
  textReferences: SMILTextReference[];
  /** Set of content document paths (without fragments) referenced by this overlay */
  referencedDocuments: Set<string>;
  /** Whether this overlay references remote audio resources */
  hasRemoteResources: boolean;
}

export class SMILValidator {
  private getAttribute(element: XmlElement, name: string): string | null {
    return element.attr(name)?.value ?? null;
  }

  private getEpubAttribute(element: XmlElement, localName: string): string | null {
    return element.attr(localName, 'epub')?.value ?? null;
  }

  validate(
    context: ValidationContext,
    path: string,
    manifestByPath?: Map<string, ManifestItem>,
  ): SMILValidationResult {
    const result: SMILValidationResult = {
      textReferences: [],
      referencedDocuments: new Set(),
      hasRemoteResources: false,
    };

    const data = context.files.get(path);
    if (!data) return result;

    const content = typeof data === 'string' ? data : new TextDecoder().decode(data);

    let doc: XmlDocument | null = null;
    try {
      doc = XmlDocument.fromString(content);
    } catch {
      pushMessage(context.messages, {
        id: MessageId.RSC_016,
        message: 'Media Overlay document is not well-formed XML',
        location: { path },
      });
      return result;
    }

    try {
      const root = doc.root;
      this.validateStructure(context, path, root);
      this.validateAudioElements(context, path, root, manifestByPath, result);
      this.validateEpubTypes(context, path, root);
      this.extractTextReferences(path, root, result);
    } finally {
      doc.dispose();
    }

    return result;
  }

  private validateStructure(context: ValidationContext, path: string, root: XmlElement): void {
    try {
      // seq must not have direct text/audio children
      for (const text of root.find('.//smil:seq/smil:text', SMIL_NS)) {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message: "element 'text' not allowed here; expected 'seq' or 'par'",
          location: { path, line: text.line },
        });
      }
      for (const audio of root.find('.//smil:seq/smil:audio', SMIL_NS)) {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message: "element 'audio' not allowed here; expected 'seq' or 'par'",
          location: { path, line: audio.line },
        });
      }
    } catch {
      // XPath may fail
    }

    try {
      // par must not have seq children
      for (const seq of root.find('.//smil:par/smil:seq', SMIL_NS)) {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message: "element 'seq' not allowed here; expected 'text' or 'audio'",
          location: { path, line: seq.line },
        });
      }

      // par must have at most one text child
      const parElements = root.find('.//smil:par', SMIL_NS);
      for (const par of parElements) {
        const textChildren = (par as XmlElement).find('./smil:text', SMIL_NS);
        for (let i = 1; i < textChildren.length; i++) {
          const extra = textChildren[i];
          if (!extra) continue;
          pushMessage(context.messages, {
            id: MessageId.RSC_005,
            message: "element 'text' not allowed here; only one 'text' element is allowed in 'par'",
            location: { path, line: extra.line },
          });
        }
      }
    } catch {
      // XPath may fail
    }

    try {
      // head must only contain metadata, not meta or other elements
      // Use wildcard child query then check names
      const headMetaElements = root.find('.//smil:head/smil:meta', SMIL_NS);
      for (const meta of headMetaElements) {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message: "element 'meta' not allowed here; expected 'metadata'",
          location: { path, line: meta.line },
        });
      }
    } catch {
      // XPath may fail
    }
  }

  private validateAudioElements(
    context: ValidationContext,
    path: string,
    root: XmlElement,
    manifestByPath: Map<string, ManifestItem> | undefined,
    result: SMILValidationResult,
  ): void {
    try {
      const audioElements = root.find('.//smil:audio', SMIL_NS);
      for (const audio of audioElements) {
        const elem = audio as XmlElement;
        const src = this.getAttribute(elem, 'src');

        if (src) {
          if (/^https?:\/\//i.test(src)) {
            result.hasRemoteResources = true;
          }

          if (src.includes('#')) {
            pushMessage(context.messages, {
              id: MessageId.MED_014,
              message: `Media overlay audio file URLs must not have a fragment: "${src}"`,
              location: { path, line: audio.line },
            });
          }

          if (manifestByPath) {
            const audioPath = this.resolveRelativePath(path, src.split('#')[0] ?? src);
            const audioItem = manifestByPath.get(audioPath);
            if (audioItem && !isBlessedAudioType(audioItem.mediaType)) {
              pushMessage(context.messages, {
                id: MessageId.MED_005,
                message: `Media Overlay audio reference "${src}" to non-standard audio type "${audioItem.mediaType}"`,
                location: { path, line: audio.line },
              });
            }
          }
        }

        // MED-008 / MED-009: clipBegin/clipEnd timing
        const clipBegin = this.getAttribute(elem, 'clipBegin');
        const clipEnd = this.getAttribute(elem, 'clipEnd');
        this.checkClipTiming(context, path, audio.line, clipBegin, clipEnd);
      }
    } catch {
      // XPath may fail
    }
  }

  private checkClipTiming(
    context: ValidationContext,
    path: string,
    line: number | undefined,
    clipBegin: string | null,
    clipEnd: string | null,
  ): void {
    if (clipEnd === null) return;

    const beginStr = clipBegin ?? '0';
    const start = parseSmilClock(beginStr);
    const end = parseSmilClock(clipEnd);
    const location = line != null ? { path, line } : { path };

    // RSC-005: report invalid clock values (mirrors Java's SMIL clock validator).
    // Each clip attribute with a non-parseable value is reported separately.
    if (clipBegin !== null && Number.isNaN(start)) {
      pushMessage(context.messages, {
        id: MessageId.RSC_005,
        message: `Invalid SMIL clock value "${clipBegin}" in clipBegin attribute`,
        location,
      });
    }
    if (Number.isNaN(end)) {
      pushMessage(context.messages, {
        id: MessageId.RSC_005,
        message: `Invalid SMIL clock value "${clipEnd}" in clipEnd attribute`,
        location,
      });
    }
    if (Number.isNaN(start) || Number.isNaN(end)) return;

    if (start > end) {
      pushMessage(context.messages, {
        id: MessageId.MED_008,
        message: 'The time specified in the clipBegin attribute must not be after clipEnd',
        location,
      });
    } else if (start === end) {
      pushMessage(context.messages, {
        id: MessageId.MED_009,
        message: 'The time specified in the clipBegin attribute must not be the same as clipEnd',
        location,
      });
    }
  }

  /**
   * Validate epub:type attribute values against the EPUB SSV vocabulary.
   * Only emits OPF-088 (usage) for unknown local names. Prefixed values
   * from declared vocabularies are allowed.
   */
  private validateEpubTypes(context: ValidationContext, path: string, root: XmlElement): void {
    try {
      const epubTypeElements = root.find('.//*[@epub:type]', {
        epub: 'http://www.idpf.org/2007/ops',
      });
      for (const elem of epubTypeElements) {
        const elemTyped = elem as XmlElement;
        const epubTypeAttr = elemTyped.attr('type', 'epub');
        if (!epubTypeAttr?.value) continue;
        for (const part of epubTypeAttr.value.split(/\s+/)) {
          if (!part || part.includes(':')) continue;
          if (!EPUB_SSV_ALL.has(part)) {
            pushMessage(context.messages, {
              id: MessageId.OPF_088,
              message: `Unrecognized epub:type value "${part}"`,
              location: { path, line: elem.line },
            });
          }
        }
      }
    } catch {
      // XPath may fail
    }
  }

  private extractTextReferences(
    path: string,
    root: XmlElement,
    result: SMILValidationResult,
  ): void {
    try {
      // Extract text src references
      const textElements = root.find('.//smil:text', SMIL_NS);
      for (const text of textElements) {
        const src = this.getAttribute(text as XmlElement, 'src');
        if (!src) continue;

        const hashIndex = src.indexOf('#');
        const docRef = hashIndex >= 0 ? src.substring(0, hashIndex) : src;
        const fragment = hashIndex >= 0 ? src.substring(hashIndex + 1) : undefined;
        const docPath = this.resolveRelativePath(path, docRef);

        result.textReferences.push({ docPath, fragment, line: text.line });
        result.referencedDocuments.add(docPath);
      }

      // Extract epub:textref references from body and seq
      const bodyElements = root.find('.//smil:body', SMIL_NS);
      const seqElements = root.find('.//smil:seq', SMIL_NS);
      for (const elem of [...bodyElements, ...seqElements]) {
        const textref = this.getEpubAttribute(elem as XmlElement, 'textref');
        if (!textref) continue;

        const hashIndex = textref.indexOf('#');
        const docRef = hashIndex >= 0 ? textref.substring(0, hashIndex) : textref;
        const fragment = hashIndex >= 0 ? textref.substring(hashIndex + 1) : undefined;
        const docPath = this.resolveRelativePath(path, docRef);
        result.textReferences.push({ docPath, fragment, line: elem.line });
        result.referencedDocuments.add(docPath);
      }
    } catch {
      // XPath may fail
    }
  }

  private resolveRelativePath(basePath: string, relativePath: string): string {
    if (relativePath.startsWith('/') || /^[a-zA-Z]+:/.test(relativePath)) {
      return relativePath;
    }
    const baseDir = basePath.includes('/') ? basePath.substring(0, basePath.lastIndexOf('/')) : '';
    if (!baseDir) return relativePath;
    const segments = `${baseDir}/${relativePath}`.split('/');
    const resolved: string[] = [];
    for (const seg of segments) {
      if (seg === '..') {
        resolved.pop();
      } else if (seg !== '.') {
        resolved.push(seg);
      }
    }
    return resolved.join('/');
  }
}
