import { describe, expect, it } from 'vitest';
import { parseOPF, peekOpfVersion } from './parser.js';

/**
 * A package document whose line numbers are known by construction: each entry is
 * one line, so the 1-based line of any element is its index + 1. The comment on
 * lines 5-6 is deliberate — comment blanking must not shift the lines below it.
 */
const LINE_NUMBER_OPF_LINES = [
  /*  1 */ '<?xml version="1.0" encoding="UTF-8"?>',
  /*  2 */ '<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">',
  /*  3 */ '  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">',
  /*  4 */ '    <dc:identifier id="uid">urn:uuid:0000</dc:identifier>',
  /*  5 */ '    <!-- a comment, spanning',
  /*  6 */ '         two lines -->',
  /*  7 */ '    <dc:title>Title</dc:title>',
  /*  8 */ '    <meta property="dcterms:modified">2024-01-01T00:00:00Z</meta>',
  /*  9 */ '  </metadata>',
  /* 10 */ '  <manifest>',
  /* 11 */ '    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
  /* 12 */ '    <item id="c1" href="c1.xhtml" media-type="application/xhtml+xml"/>',
  /* 13 */ '  </manifest>',
  /* 14 */ '  <spine>',
  /* 15 */ '    <itemref idref="c1"/>',
  /* 16 */ '  </spine>',
  /* 17 */ '</package>',
];

describe('parseOPF', () => {
  describe('package element', () => {
    it('should parse EPUB 3 version', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">test-id</dc:identifier>
    <dc:title>Test</dc:title>
    <dc:language>en</dc:language>
  </metadata>
  <manifest></manifest>
  <spine></spine>
</package>`;
      const result = parseOPF(xml);
      expect(result.version).toBe('3.0');
      expect(result.uniqueIdentifier).toBe('uid');
    });

    it('should parse EPUB 2 version', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">test-id</dc:identifier>
  </metadata>
  <manifest></manifest>
  <spine></spine>
</package>`;
      const result = parseOPF(xml);
      expect(result.version).toBe('2.0');
    });

    it('should handle attributes in any order', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<package unique-identifier="uid" version="3.0" xmlns="http://www.idpf.org/2007/opf">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">test-id</dc:identifier>
  </metadata>
  <manifest></manifest>
  <spine></spine>
</package>`;
      const result = parseOPF(xml);
      expect(result.version).toBe('3.0');
      expect(result.uniqueIdentifier).toBe('uid');
    });
  });

  describe('metadata parsing', () => {
    it('should parse Dublin Core elements', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">urn:uuid:12345</dc:identifier>
    <dc:title>Test Book</dc:title>
    <dc:language>en</dc:language>
    <dc:creator>John Doe</dc:creator>
  </metadata>
  <manifest></manifest>
  <spine></spine>
</package>`;
      const result = parseOPF(xml);

      expect(result.dcElements).toHaveLength(4);

      const identifier = result.dcElements.find((dc) => dc.name === 'identifier');
      expect(identifier?.value).toBe('urn:uuid:12345');
      expect(identifier?.id).toBe('uid');

      const title = result.dcElements.find((dc) => dc.name === 'title');
      expect(title?.value).toBe('Test Book');

      const creator = result.dcElements.find((dc) => dc.name === 'creator');
      expect(creator?.value).toBe('John Doe');
    });

    it('should parse EPUB 3 meta elements', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">test</dc:identifier>
    <meta property="dcterms:modified">2024-01-01T00:00:00Z</meta>
    <meta property="role" refines="#creator">aut</meta>
  </metadata>
  <manifest></manifest>
  <spine></spine>
</package>`;
      const result = parseOPF(xml);

      expect(result.metaElements).toHaveLength(2);

      const modified = result.metaElements.find((m) => m.property === 'dcterms:modified');
      expect(modified?.value).toBe('2024-01-01T00:00:00Z');

      const role = result.metaElements.find((m) => m.property === 'role');
      expect(role?.refines).toBe('#creator');
    });
  });

  describe('manifest parsing', () => {
    it('should parse manifest items', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">test</dc:identifier>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
    <item id="style" href="style.css" media-type="text/css"/>
    <item id="cover" href="cover.jpg" media-type="image/jpeg" properties="cover-image"/>
  </manifest>
  <spine></spine>
</package>`;
      const result = parseOPF(xml);

      expect(result.manifest).toHaveLength(4);

      const nav = result.manifest.find((i) => i.id === 'nav');
      expect(nav?.href).toBe('nav.xhtml');
      expect(nav?.mediaType).toBe('application/xhtml+xml');
      expect(nav?.properties).toEqual(['nav']);

      const cover = result.manifest.find((i) => i.id === 'cover');
      expect(cover?.properties).toEqual(['cover-image']);
    });

    it('should handle fallback references', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">test</dc:identifier>
  </metadata>
  <manifest>
    <item id="video" href="video.mp4" media-type="video/mp4" fallback="poster"/>
    <item id="poster" href="poster.jpg" media-type="image/jpeg"/>
  </manifest>
  <spine></spine>
</package>`;
      const result = parseOPF(xml);

      const video = result.manifest.find((i) => i.id === 'video');
      expect(video?.fallback).toBe('poster');
    });

    it('should decode XML entities in href', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">test</dc:identifier>
  </metadata>
  <manifest>
    <item id="ch1" href="Chapter%201%20&amp;%20Introduction.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine></spine>
</package>`;
      const result = parseOPF(xml);

      const ch1 = result.manifest.find((i) => i.id === 'ch1');
      expect(ch1?.href).toBe('Chapter%201%20&%20Introduction.xhtml');
    });
  });

  describe('spine parsing', () => {
    it('should parse spine itemrefs', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">test</dc:identifier>
  </metadata>
  <manifest>
    <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
    <item id="chapter2" href="chapter2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine page-progression-direction="ltr">
    <itemref idref="chapter1"/>
    <itemref idref="chapter2" linear="no"/>
  </spine>
</package>`;
      const result = parseOPF(xml);

      expect(result.spine).toHaveLength(2);
      expect(result.pageProgressionDirection).toBe('ltr');

      expect(result.spine[0]?.idref).toBe('chapter1');
      expect(result.spine[0]?.linear).toBe(true);

      expect(result.spine[1]?.idref).toBe('chapter2');
      expect(result.spine[1]?.linear).toBe(false);
    });

    it('should parse EPUB 2 spine with toc attribute', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">test</dc:identifier>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="chapter1"/>
  </spine>
</package>`;
      const result = parseOPF(xml);

      expect(result.spineToc).toBe('ncx');
    });

    it('should parse spine itemref properties', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">test</dc:identifier>
  </metadata>
  <manifest></manifest>
  <spine>
    <itemref idref="cover" properties="page-spread-right"/>
    <itemref idref="chapter1" properties="page-spread-left"/>
  </spine>
</package>`;
      const result = parseOPF(xml);

      expect(result.spine[0]?.properties).toEqual(['page-spread-right']);
      expect(result.spine[1]?.properties).toEqual(['page-spread-left']);
    });
  });

  describe('guide parsing (EPUB 2)', () => {
    it('should parse guide references', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">test</dc:identifier>
  </metadata>
  <manifest></manifest>
  <spine></spine>
  <guide>
    <reference type="cover" title="Cover" href="cover.xhtml"/>
    <reference type="toc" title="Table of Contents" href="toc.xhtml"/>
  </guide>
</package>`;
      const result = parseOPF(xml);

      expect(result.guide).toHaveLength(2);

      expect(result.guide[0]?.type).toBe('cover');
      expect(result.guide[0]?.title).toBe('Cover');
      expect(result.guide[0]?.href).toBe('cover.xhtml');
    });
  });

  describe('collection parsing (EPUB 3)', () => {
    it('should parse collections with role attribute', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">test</dc:identifier>
  </metadata>
  <manifest>
    <item id="idx1" href="index1.xhtml" media-type="application/xhtml+xml"/>
    <item id="idx2" href="index2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine></spine>
  <collection role="index">
    <link href="index1.xhtml"/>
    <link href="index2.xhtml"/>
  </collection>
</package>`;
      const result = parseOPF(xml);

      expect(result.collections).toHaveLength(1);
      expect(result.collections[0]?.role).toBe('index');
      expect(result.collections[0]?.links).toHaveLength(2);
    });

    it('should parse dictionary collections with name', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">test</dc:identifier>
  </metadata>
  <manifest>
    <item id="dict1" href="dictionary.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine></spine>
  <collection role="dictionary" id="dict-collection">
    <metadata>
      <dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">English Dictionary</dc:title>
    </metadata>
    <link href="dictionary.xhtml"/>
  </collection>
</package>`;
      const result = parseOPF(xml);

      expect(result.collections).toHaveLength(1);
      expect(result.collections[0]?.role).toBe('dictionary');
      expect(result.collections[0]?.id).toBe('dict-collection');
    });

    it('should parse multiple collections', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">test</dc:identifier>
  </metadata>
  <manifest>
    <item id="idx1" href="index.xhtml" media-type="application/xhtml+xml"/>
    <item id="preview1" href="preview.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine></spine>
  <collection role="index">
    <link href="index.xhtml"/>
  </collection>
  <collection role="preview">
    <link href="preview.xhtml"/>
  </collection>
</package>`;
      const result = parseOPF(xml);

      expect(result.collections).toHaveLength(2);
      expect(result.collections[0]?.role).toBe('index');
      expect(result.collections[1]?.role).toBe('preview');
    });

    it('should return empty collections array when none present', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">test</dc:identifier>
  </metadata>
  <manifest></manifest>
  <spine></spine>
</package>`;
      const result = parseOPF(xml);

      expect(result.collections).toHaveLength(0);
    });
  });

  describe('line numbers', () => {
    const result = parseOPF(LINE_NUMBER_OPF_LINES.join('\n'));

    // Section parsers record offsets within their own slice, so without the
    // section offset every element would land near the top of the document.
    it('should record the line of each manifest item', () => {
      expect(result.manifest.map((item) => item.line)).toEqual([11, 12]);
    });

    it('should record the line of each spine itemref', () => {
      expect(result.spine.map((itemref) => itemref.line)).toEqual([15]);
    });

    it('should record the line of Dublin Core elements after a multi-line comment', () => {
      expect(result.dcElements.find((el) => el.name === 'identifier')?.line).toBe(4);
      expect(result.dcElements.find((el) => el.name === 'title')?.line).toBe(7);
    });

    it('should record the line of meta elements', () => {
      expect(result.metaElements.find((meta) => meta.property === 'dcterms:modified')?.line).toBe(
        8,
      );
    });

    it('should shift recorded lines when a line is inserted above', () => {
      const withBlankLine = [
        ...LINE_NUMBER_OPF_LINES.slice(0, 9),
        '',
        ...LINE_NUMBER_OPF_LINES.slice(9),
      ].join('\n');

      expect(parseOPF(withBlankLine).manifest.map((item) => item.line)).toEqual([12, 13]);
    });
  });
});

describe('peekOpfVersion', () => {
  it('should read a version declared before unique-identifier', () => {
    expect(peekOpfVersion('<package version="3.0" unique-identifier="uid">')).toEqual({
      kind: 'declared',
      version: '3.0',
    });
  });

  it('should read a version declared after unique-identifier', () => {
    expect(peekOpfVersion('<package unique-identifier="uid" version="2.0">')).toEqual({
      kind: 'declared',
      version: '2.0',
    });
  });

  it('should normalize an abbreviated version', () => {
    expect(peekOpfVersion('<package version="3">')).toEqual({ kind: 'declared', version: '3.0' });
  });

  it('should report a package element with no version as undeclared', () => {
    expect(peekOpfVersion('<package unique-identifier="uid">')).toEqual({ kind: 'undeclared' });
  });

  it('should report a bare package element as undeclared', () => {
    expect(peekOpfVersion('<package>\n</package>')).toEqual({ kind: 'undeclared' });
  });

  // Kept apart from `undeclared` on purpose: an unreadable document must fall
  // through so the normal pipeline can report why, rather than stopping at OPF-001.
  it('should report a document with no package element as unreadable', () => {
    expect(peekOpfVersion('<html xmlns="http://www.w3.org/1999/xhtml"></html>')).toEqual({
      kind: 'unreadable',
    });
  });

  it('should report an empty document as unreadable', () => {
    expect(peekOpfVersion('')).toEqual({ kind: 'unreadable' });
  });

  /**
   * A `<package` that never closes used to be matched by two patterns carrying
   * three chained `[^>]*` each. Those multiply: 2.6 KB of unclosed tag took 105 ms
   * and grew faster than the square of the input, so a document a publisher could
   * plausibly upload stalled the parse. Sized well above any real budget so the
   * test reports a genuine regression rather than CI jitter.
   */
  it('does not backtrack on an unclosed package element', () => {
    const unclosed = `<package ${'unique-identifier="a" '.repeat(2500)}`;

    const start = performance.now();
    const peek = peekOpfVersion(unclosed);
    const elapsed = performance.now() - start;

    // `undeclared`, not `unreadable`: the element is there, its version is not.
    expect(peek).toEqual({ kind: 'undeclared' });
    expect(elapsed).toBeLessThan(500);
  });
});
