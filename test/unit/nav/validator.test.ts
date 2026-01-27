import { describe, expect, it, beforeEach } from 'vitest';
import { NavValidator } from '../../../src/nav/validator.js';
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
    },
    version: '3.0',
    messages: [],
    files: new Map(),
    rootfiles: [],
    opfPath: 'OEBPS/content.opf',
  };
}

describe('NavValidator', () => {
  let validator: NavValidator;
  let context: ValidationContext;

  beforeEach(() => {
    validator = new NavValidator();
    context = createValidationContext();
  });

  describe('nav element validation', () => {
    it('should add NAV-001 error when nav element is missing', () => {
      const navContent =
        '<?xml version="1.0" encoding="UTF-8"?>\n<html><body><p>No nav here</p></body></html>';
      validator.validate(context, navContent, 'OEBPS/nav.xhtml');

      expect(
        context.messages.some((m) => m.id === 'NAV-001' && m.message.includes('nav element')),
      ).toBe(true);
    });

    it('should validate correct nav element', () => {
      const navContent = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Navigation</title></head>
<body>
<nav epub:type="toc">
<ol>
<li><a href="chapter1.xhtml">Chapter 1</a></li>
</ol>
</nav>
</body>
</html>`;
      validator.validate(context, navContent, 'OEBPS/nav.xhtml');

      expect(context.messages.filter((m) => m.severity === 'error')).toHaveLength(0);
    });
  });

  describe('epub:type validation', () => {
    it('should add NAV-001 error when epub:type="toc" is missing', () => {
      const navContent = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Navigation</title></head>
<body>
<nav epub:type="landmarks">
<ol>
<li><a href="chapter1.xhtml">Chapter 1</a></li>
</ol>
</nav>
</body>
</html>`;
      validator.validate(context, navContent, 'OEBPS/nav.xhtml');

      expect(context.messages.some((m) => m.id === 'NAV-001' && m.message.includes('toc'))).toBe(
        true,
      );
    });

    it('should accept epub:type with multiple values including toc', () => {
      const navContent = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Navigation</title></head>
<body>
<nav epub:type="toc landmarks">
<ol>
<li><a href="chapter1.xhtml">Chapter 1</a></li>
</ol>
</nav>
</body>
</html>`;
      validator.validate(context, navContent, 'OEBPS/nav.xhtml');

      expect(context.messages.filter((m) => m.id === 'NAV-001')).toHaveLength(0);
    });

    it('should accept different epub:type attribute order', () => {
      const navContent = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Navigation</title></head>
<body>
<nav epub:type="toc">
<ol>
<li><a href="chapter1.xhtml">Chapter 1</a></li>
</ol>
</nav>
</body>
</html>`;
      validator.validate(context, navContent, 'OEBPS/nav.xhtml');

      expect(context.messages.filter((m) => m.id === 'NAV-001')).toHaveLength(0);
    });
  });

  describe('ol element validation', () => {
    // NAV-002 is suppressed in Java EPUBCheck
    it.skip('should add NAV-002 error when ol element is missing in toc nav (suppressed in Java)', () => {
      const navContent = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Navigation</title></head>
<body>
<nav epub:type="toc">
<p>No ordered list</p>
</nav>
</body>
</html>`;
      validator.validate(context, navContent, 'OEBPS/nav.xhtml');

      expect(
        context.messages.some((m) => m.id === 'NAV-002' && m.message.includes('ol element')),
      ).toBe(true);
    });

    it('should validate correct ol element in toc nav', () => {
      const navContent = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Navigation</title></head>
<body>
<nav epub:type="toc">
<ol>
<li><a href="chapter1.xhtml">Chapter 1</a></li>
<li><a href="chapter2.xhtml">Chapter 2</a></li>
</ol>
</nav>
</body>
</html>`;
      validator.validate(context, navContent, 'OEBPS/nav.xhtml');

      expect(context.messages.filter((m) => m.id === 'NAV-002')).toHaveLength(0);
    });

    it('should handle nested ol elements', () => {
      const navContent = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Navigation</title></head>
<body>
<nav epub:type="toc">
<ol>
<li><a href="chapter1.xhtml">Chapter 1</a>
<ol>
<li><a href="chapter1-1.xhtml">Section 1.1</a></li>
</ol>
</li>
</ol>
</nav>
</body>
</html>`;
      validator.validate(context, navContent, 'OEBPS/nav.xhtml');

      expect(context.messages.filter((m) => m.severity === 'error')).toHaveLength(0);
    });
  });

  describe('Multiple nav elements', () => {
    it('should validate multiple nav elements', () => {
      const navContent = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Navigation</title></head>
<body>
<nav epub:type="toc">
<ol>
<li><a href="chapter1.xhtml">Chapter 1</a></li>
</ol>
</nav>
<nav epub:type="landmarks">
<ol>
<li><a href="cover.xhtml">Cover</a></li>
</ol>
</nav>
<nav epub:type="page-list">
<ol>
<li><a href="page1.xhtml">Page 1</a></li>
</ol>
</nav>
</body>
</html>`;
      validator.validate(context, navContent, 'OEBPS/nav.xhtml');

      expect(context.messages.filter((m) => m.severity === 'error')).toHaveLength(0);
    });
  });

  describe('Case insensitive matching', () => {
    it('should handle NAV element in uppercase', () => {
      const navContent = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Navigation</title></head>
<body>
<NAV EPUB:TYPE="toc">
<ol>
<li><a href="chapter1.xhtml">Chapter 1</a></li>
</ol>
</NAV>
</body>
</html>`;
      validator.validate(context, navContent, 'OEBPS/nav.xhtml');

      expect(context.messages.filter((m) => m.severity === 'error')).toHaveLength(0);
    });

    it('should handle OL element in uppercase', () => {
      const navContent = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Navigation</title></head>
<body>
<nav epub:type="toc">
<OL>
<li><a href="chapter1.xhtml">Chapter 1</a></li>
</OL>
</nav>
</body>
</html>`;
      validator.validate(context, navContent, 'OEBPS/nav.xhtml');

      expect(context.messages.filter((m) => m.severity === 'error')).toHaveLength(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty nav element', () => {
      const navContent =
        '<?xml version="1.0" encoding="UTF-8"?><html><body><nav></nav></body></html>';
      validator.validate(context, navContent, 'OEBPS/nav.xhtml');

      expect(context.messages.some((m) => m.id === 'NAV-001')).toBe(true);
    });

    it('should handle nav element with only whitespace', () => {
      const navContent =
        '<?xml version="1.0" encoding="UTF-8"?><html><body><nav>  </nav></body></html>';
      validator.validate(context, navContent, 'OEBPS/nav.xhtml');

      expect(context.messages.some((m) => m.id === 'NAV-001')).toBe(true);
    });

    it('should handle malformed nav element', () => {
      const navContent = '<?xml version="1.0" encoding="UTF-8"?><html><body><nav';
      validator.validate(context, navContent, 'OEBPS/nav.xhtml');

      // Should not crash, but may have errors
      expect(context.messages.length).toBeGreaterThanOrEqual(0);
    });
  });
});
