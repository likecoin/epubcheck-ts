import { beforeEach, describe, expect, it } from 'vitest';
import { SMILValidator } from '../../../src/smil/validator.js';
import type { ValidationContext } from '../../../src/types.js';

function createValidationContext(): ValidationContext {
  return {
    data: new Uint8Array(),
    options: {
      version: '3.0',
      profile: 'default',
      includeUsage: false,
      includeInfo: false,
      maxErrors: 0,
      locale: 'en',
      customMessages: new Map(),
    },
    version: '3.0',
    messages: [],
    files: new Map(),
    rootfiles: [],
    opfPath: 'OEBPS/content.opf',
  };
}

function createSmil(textSrc: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<smil xmlns="http://www.w3.org/ns/SMIL" xmlns:epub="http://www.idpf.org/2007/ops" version="3.0">
<body>
<par id="p1">
<text src="${textSrc}"/>
<audio src="audio.mp3" clipBegin="0s" clipEnd="10s"/>
</par>
</body>
</smil>`;
}

describe('SMILValidator text src resolution', () => {
  let validator: SMILValidator;
  let context: ValidationContext;

  beforeEach(() => {
    validator = new SMILValidator();
    context = createValidationContext();
  });

  it('resolves a plain ASCII text src relative to the overlay', () => {
    const smil = createSmil('chapter1.xhtml#p1');
    context.files.set('OEBPS/overlay.smil', new TextEncoder().encode(smil));

    const result = validator.validate(context, 'OEBPS/overlay.smil');

    expect(result.referencedDocuments.has('OEBPS/chapter1.xhtml')).toBe(true);
  });

  it('decodes percent-encoded CJK filenames to match the decoded ZIP path', () => {
    // Mirror the NCX fix: SMIL `<text src>` values are URI-space and must be
    // percent-decoded + NFC-normalized before flowing into downstream
    // context.files / registry / spine lookups.
    const smil = createSmil('%E6%99%82%E9%96%93%E7%9A%84%E8%A9%A6%E7%85%89.xhtml#p1');
    context.files.set('OEBPS/overlay.smil', new TextEncoder().encode(smil));

    const result = validator.validate(context, 'OEBPS/overlay.smil');

    expect(result.referencedDocuments.has('OEBPS/時間的試煉.xhtml')).toBe(true);
    expect(
      result.referencedDocuments.has('OEBPS/%E6%99%82%E9%96%93%E7%9A%84%E8%A9%A6%E7%85%89.xhtml'),
    ).toBe(false);
  });

  it('decodes percent-encoded spaces in filenames', () => {
    const smil = createSmil('chapter%201.xhtml#p1');
    context.files.set('OEBPS/overlay.smil', new TextEncoder().encode(smil));

    const result = validator.validate(context, 'OEBPS/overlay.smil');

    expect(result.referencedDocuments.has('OEBPS/chapter 1.xhtml')).toBe(true);
  });

  it('decodes percent-encoded epub:textref on seq elements', () => {
    const smil = `<?xml version="1.0" encoding="UTF-8"?>
<smil xmlns="http://www.w3.org/ns/SMIL" xmlns:epub="http://www.idpf.org/2007/ops" version="3.0">
<body>
<seq epub:textref="%E6%99%82%E9%96%93%E7%9A%84%E8%A9%A6%E7%85%89.xhtml">
<par id="p1"><text src="chapter1.xhtml#p1"/></par>
</seq>
</body>
</smil>`;
    context.files.set('OEBPS/overlay.smil', new TextEncoder().encode(smil));

    const result = validator.validate(context, 'OEBPS/overlay.smil');

    expect(result.referencedDocuments.has('OEBPS/時間的試煉.xhtml')).toBe(true);
  });
});
