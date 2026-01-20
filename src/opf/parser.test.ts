import { describe, expect, it } from 'vitest';
import { parseOPF } from './parser.js';

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
});
