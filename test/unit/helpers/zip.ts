import { ZipReader } from '../../../src/ocf/zip.js';

export class TestZipBuilder {
  private files = new Map<string, Uint8Array>();
  private originalOrder: string[] = [];

  addFile(path: string, content: string): this {
    this.files.set(path, new TextEncoder().encode(content));
    this.originalOrder.push(path);
    return this;
  }

  addBinary(path: string, data: Uint8Array): this {
    this.files.set(path, data);
    this.originalOrder.push(path);
    return this;
  }

  build(): ZipReader {
    const files: Record<string, Uint8Array> = {};
    for (const [path, data] of this.files.entries()) {
      files[path] = data;
    }

    const mockZipReader = Object.create(ZipReader.prototype) as ZipReader;
    Object.defineProperty(mockZipReader, 'files', { value: files });
    Object.defineProperty(mockZipReader, '_paths', {
      value: Array.from(this.files.keys()).sort(),
    });
    Object.defineProperty(mockZipReader, '_originalOrder', {
      value: [...this.originalOrder],
    });

    return mockZipReader;
  }
}

export function createMinimalValidZip(): TestZipBuilder {
  return new TestZipBuilder()
    .addFile('mimetype', 'application/epub+zip')
    .addFile(
      'META-INF/container.xml',
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">\n' +
        '  <rootfiles>\n' +
        '    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>\n' +
        '  </rootfiles>\n' +
        '</container>\n',
    )
    .addFile(
      'OEBPS/content.opf',
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">\n' +
        '  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n' +
        '    <dc:identifier id="bookid">urn:uuid:12345678-1234-1234-1234-123456789abc</dc:identifier>\n' +
        '    <dc:title>Test Book</dc:title>\n' +
        '    <dc:language>en</dc:language>\n' +
        '    <meta property="dcterms:modified">2023-01-01T00:00:00Z</meta>\n' +
        '  </metadata>\n' +
        '  <manifest>\n' +
        '    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>\n' +
        '    <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>\n' +
        '  </manifest>\n' +
        '  <spine>\n' +
        '    <itemref idref="chapter1"/>\n' +
        '  </spine>\n' +
        '</package>\n',
    )
    .addFile(
      'OEBPS/nav.xhtml',
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<html xmlns="http://www.w3.org/1999/xhtml">\n' +
        '  <head><title>Navigation</title></head>\n' +
        '  <body>\n' +
        '    <nav epub:type="toc" xmlns:epub="http://www.idpf.org/2007/ops">\n' +
        '      <ol><li><a href="chapter1.xhtml">Chapter 1</a></li></ol>\n' +
        '    </nav>\n' +
        '  </body>\n' +
        '</html>\n',
    )
    .addFile(
      'OEBPS/chapter1.xhtml',
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<html xmlns="http://www.w3.org/1999/xhtml">\n' +
        '  <head><title>Chapter 1</title></head>\n' +
        '  <body><p>Content</p></body>\n' +
        '</html>\n',
    );
}

export function createMinimalEpub2Zip(): TestZipBuilder {
  return new TestZipBuilder()
    .addFile('mimetype', 'application/epub+zip')
    .addFile(
      'META-INF/container.xml',
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">\n' +
        '  <rootfiles>\n' +
        '    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>\n' +
        '  </rootfiles>\n' +
        '</container>\n',
    )
    .addFile(
      'OEBPS/content.opf',
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="bookid">\n' +
        '  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n' +
        '    <dc:identifier id="bookid">urn:uuid:12345678-1234-1234-1234-123456789abc</dc:identifier>\n' +
        '    <dc:title>Test Book</dc:title>\n' +
        '    <dc:language>en</dc:language>\n' +
        '  </metadata>\n' +
        '  <manifest>\n' +
        '    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>\n' +
        '    <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>\n' +
        '  </manifest>\n' +
        '  <spine toc="ncx">\n' +
        '    <itemref idref="chapter1"/>\n' +
        '  </spine>\n' +
        '</package>\n',
    )
    .addFile(
      'OEBPS/toc.ncx',
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">\n' +
        '  <head><meta name="dtb:uid" content="urn:uuid:12345678-1234-1234-1234-123456789abc"/></head>\n' +
        '  <docTitle><text>Test Book</text></docTitle>\n' +
        '  <navMap><navPoint><navLabel><text>Chapter 1</text></navLabel><content src="chapter1.xhtml"/></navPoint></navMap>\n' +
        '</ncx>\n',
    )
    .addFile(
      'OEBPS/chapter1.xhtml',
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<html xmlns="http://www.w3.org/1999/xhtml">\n' +
        '  <head><title>Chapter 1</title></head>\n' +
        '  <body><p>Content</p></body>\n' +
        '</html>\n',
    );
}
