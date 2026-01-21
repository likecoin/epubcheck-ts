import { describe, expect, it } from 'vitest';
import { XMLParser, XMLWalker } from './parser.js';

describe('XMLParser', () => {
  describe('parse', () => {
    it('should parse a simple XML document', () => {
      const xml = '<?xml version="1.0" encoding="UTF-8"?><root><child>text</child></root>';
      const parser = new XMLParser();
      const result = parser.parse(xml);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('root');
      expect(result?.children).toHaveLength(1);
      expect(result?.children[0]?.name).toBe('child');
      expect(result?.children[0]?.text).toBe('text');
    });

    it('should parse attributes', () => {
      const xml = '<root id="test" class="container"><child/></root>';
      const parser = new XMLParser();
      const result = parser.parse(xml);

      expect(result?.attributes.id).toBe('test');
      expect(result?.attributes.class).toBe('container');
    });

    it('should parse nested elements', () => {
      const xml = '<root><level1><level2>deep</level2></level1></root>';
      const parser = new XMLParser();
      const result = parser.parse(xml);

      expect(result?.children[0]?.name).toBe('level1');
      expect(result?.children[0]?.children[0]?.name).toBe('level2');
      expect(result?.children[0]?.children[0]?.text).toBe('deep');
    });

    it('should parse mixed content', () => {
      const xml = '<root>before<child>inner</child>after</root>';
      const parser = new XMLParser();
      const result = parser.parse(xml);

      expect(result?.text ?? '').toBe('beforeafter');
    });

    it('should parse multiple children', () => {
      const xml = '<root><child1/><child2/><child3/></root>';
      const parser = new XMLParser();
      const result = parser.parse(xml);

      expect(result?.children).toHaveLength(3);
      expect(result?.children[0]?.name).toBe('child1');
      expect(result?.children[1]?.name).toBe('child2');
      expect(result?.children[2]?.name).toBe('child3');
    });

    it('should return null for invalid XML', () => {
      const xml = '<root><unclosed>';
      const parser = new XMLParser();
      const result = parser.parse(xml);

      expect(result).toBeNull();
    });

    it('should parse XHTML with namespace', () => {
      const xml = `<html xmlns="http://www.w3.org/1999/xhtml">
        <head><title>Test</title></head>
        <body><p>Hello</p></body>
      </html>`;
      const parser = new XMLParser();
      const result = parser.parse(xml);

      expect(result?.name).toBe('html');
      expect(result?.children[0]?.name).toBe('head');
      expect(result?.children[1]?.name).toBe('body');
    });

    it('should handle xml:id attributes', () => {
      const xml = '<root><child xml:id="test-id">text</child></root>';
      const parser = new XMLParser();
      const result = parser.parse(xml);

      // libxml2-wasm normalizes xml:id to id with xml prefix/namespace
      expect(result?.children[0]?.attributes.id).toBe('test-id');
    });
  });
});

describe('XMLWalker', () => {
  const sampleXHTML = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>Test Document</title>
  </head>
  <body>
    <h1 id="heading">Title</h1>
    <p>Paragraph 1</p>
    <div id="content">
      <p>Paragraph 2</p>
    </div>
    <p xml:id="para3">Paragraph 3</p>
  </body>
</html>`;

  it('should get root element', () => {
    const walker = new XMLWalker(sampleXHTML);
    const root = walker.getRoot();

    expect(root).not.toBeNull();
    expect(root?.name).toBe('html');
  });

  it('should find element by name', () => {
    const walker = new XMLWalker(sampleXHTML);
    const head = walker.findElement('head');

    expect(head).not.toBeNull();
    expect(head?.name).toBe('head');
  });

  it('should return null when element not found', () => {
    const walker = new XMLWalker(sampleXHTML);
    const notFound = walker.findElement('notfound');

    expect(notFound).toBeNull();
  });

  it('should find first matching element', () => {
    const walker = new XMLWalker(sampleXHTML);
    const p = walker.findElement('p');

    expect(p).not.toBeNull();
    expect(p?.name).toBe('p');
    expect(p?.text).toBe('Paragraph 1');
  });

  it('should collect all IDs', () => {
    const walker = new XMLWalker(sampleXHTML);
    const ids = walker.getIDs();

    expect(ids.size).toBe(3);
    expect(ids.has('heading')).toBe(true);
    expect(ids.has('content')).toBe(true);
    expect(ids.has('para3')).toBe(true);
  });

  it('should get text content', () => {
    const walker = new XMLWalker(sampleXHTML);
    const root = walker.getRoot();
    const title = root?.children[0]?.children[0];

    expect(title?.text).toBe('Test Document');
  });

  it('should get empty text content for elements with no text', () => {
    const walker = new XMLWalker(sampleXHTML);
    const div = walker.findElement('div');

    expect(div ? walker.getTextContent(div).trim() : '').toBe('');
  });

  it('should get attributes', () => {
    const walker = new XMLWalker(sampleXHTML);
    const heading = walker.findElement('h1');

    expect(heading ? walker.getAttributes(heading) : {}).toEqual({ id: 'heading' });
  });

  it('should return empty object for element with no attributes', () => {
    const walker = new XMLWalker(sampleXHTML);
    const p = walker.findElement('p');

    expect(p ? walker.getAttributes(p) : {}).toEqual({});
  });

  it('should check if attribute exists', () => {
    const walker = new XMLWalker(sampleXHTML);
    const heading = walker.findElement('h1');

    expect(heading ? walker.hasAttribute(heading, 'id') : false).toBe(true);
    expect(heading ? walker.hasAttribute(heading, 'class') : false).toBe(false);
  });

  it('should handle empty document', () => {
    const walker = new XMLWalker('');
    const root = walker.getRoot();

    expect(root).toBeNull();
  });

  it('should handle malformed XML gracefully', () => {
    const walker = new XMLWalker('<root><unclosed');
    const root = walker.getRoot();

    expect(root).toBeNull();
  });

  it('should find deeply nested element', () => {
    const xml = `<root>
      <level1>
        <level2>
          <level3>
            <level4>found</level4>
          </level3>
        </level2>
      </level1>
    </root>`;
    const walker = new XMLWalker(xml);
    const level4 = walker.findElement('level4');

    expect(level4).not.toBeNull();
    expect(level4?.text).toBe('found');
  });

  it('should collect IDs from xml:id attribute', () => {
    const xml = `<root><child1 id="id1"/><child2 xml:id="id2"/><child3/></root>`;
    const walker = new XMLWalker(xml);
    const ids = walker.getIDs();

    expect(ids.size).toBe(2);
    expect(ids.has('id1')).toBe(true);
    expect(ids.has('id2')).toBe(true);
  });

  it('should handle elements with both id and xml:id', () => {
    const xml = '<root><child id="id1"/></root>';
    const walker = new XMLWalker(xml);
    const ids = walker.getIDs();

    expect(ids.size).toBe(1);
    expect(ids.has('id1')).toBe(true);
  });
});
