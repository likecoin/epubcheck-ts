/**
 * Search Key Map (SKM) document validation
 *
 * Mirrors ../epubcheck/src/main/resources/com/adobe/epubcheck/schema/30/dict/search-key-map.rnc
 * and ../epubcheck/src/main/java/com/adobe/epubcheck/dict/SearchKeyMapHandler.java
 */

import { XmlDocument, type XmlElement } from 'libxml2-wasm';
import { MessageId, pushMessage } from '../messages/index.js';
import { resolvePath, tryDecodeUriComponent } from '../opf/validator.js';
import { ReferenceType, type Reference } from '../references/types.js';
import { parseURL } from '../references/url.js';
import type { ReferenceValidator } from '../references/validator.js';
import type { ValidationContext } from '../types.js';

const OPS_NS_URI = 'http://www.idpf.org/2007/ops';
const SKM_NS = { ops: OPS_NS_URI };

export class SKMValidator {
  validate(context: ValidationContext, path: string, refValidator?: ReferenceValidator): void {
    const data = context.files.get(path);
    if (!data) return;

    const content = typeof data === 'string' ? data : new TextDecoder().decode(data);

    let doc: XmlDocument | null = null;
    try {
      doc = XmlDocument.fromString(content);
    } catch {
      pushMessage(context.messages, {
        id: MessageId.RSC_016,
        message: 'Search Key Map document is not well-formed XML',
        location: { path },
      });
      return;
    }

    try {
      const root = doc.root;

      if (root.namespaceUri !== OPS_NS_URI || root.name !== 'search-key-map') {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message: `Root element must be "search-key-map" in the OPS namespace`,
          location: { path, line: root.line },
        });
        return;
      }

      const groups = root.find('./ops:search-key-group', SKM_NS);
      if (groups.length === 0) {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message: 'A "search-key-map" must contain at least one "search-key-group"',
          location: { path, line: root.line },
        });
      }

      for (const group of groups) {
        const groupEl = group as XmlElement;
        const href = groupEl.attr('href')?.value;
        if (!href) {
          pushMessage(context.messages, {
            id: MessageId.RSC_005,
            message: 'The "href" attribute is required on "search-key-group"',
            location: { path, line: groupEl.line },
          });
        } else if (refValidator) {
          registerSkmRef(refValidator, path, href, groupEl.line);
        }

        const matches = groupEl.find('./ops:match', SKM_NS);
        if (matches.length === 0) {
          pushMessage(context.messages, {
            id: MessageId.RSC_005,
            message: 'A "search-key-group" must contain at least one "match"',
            location: { path, line: groupEl.line },
          });
        }

        for (const match of matches) {
          const matchEl = match as XmlElement;
          const matchHref = matchEl.attr('href')?.value;
          if (matchHref && refValidator) {
            registerSkmRef(refValidator, path, matchHref, matchEl.line);
          }
        }
      }
    } finally {
      doc.dispose();
    }
  }
}

function registerSkmRef(
  refValidator: ReferenceValidator,
  path: string,
  href: string,
  line: number | undefined,
): void {
  const parsed = parseURL(href);
  const targetResource = resolvePath(path, tryDecodeUriComponent(parsed.resource)).normalize('NFC');

  const location = line != null ? { path, line } : { path };
  const ref: Reference = {
    url: parsed.hasFragment ? `${targetResource}#${parsed.fragment ?? ''}` : targetResource,
    targetResource,
    type: ReferenceType.SEARCH_KEY,
    location,
  };
  if (parsed.fragment !== undefined) ref.fragment = parsed.fragment;
  refValidator.addReference(ref);
}
