import { describe, expect, it } from 'vitest';
import { decodeXmlBytes, sniffXmlEncoding } from './encoding.js';

const bytes = (...values: number[]) => new Uint8Array(values);

function encodeUtf16(text: string, littleEndian: boolean, bom = true): Uint8Array {
  const units = bom ? [0xfeff] : [];
  for (let i = 0; i < text.length; i++) units.push(text.charCodeAt(i));
  const out = new Uint8Array(units.length * 2);
  const view = new DataView(out.buffer);
  units.forEach((unit, i) => {
    view.setUint16(i * 2, unit, littleEndian);
  });
  return out;
}

function encodeUtf32(text: string, littleEndian: boolean, bom = false): Uint8Array {
  const codePoints = bom ? [0xfeff] : [];
  for (const char of text) codePoints.push(char.codePointAt(0) ?? 0);
  const out = new Uint8Array(codePoints.length * 4);
  const view = new DataView(out.buffer);
  codePoints.forEach((codePoint, i) => {
    view.setUint32(i * 4, codePoint, littleEndian);
  });
  return out;
}

describe('sniffXmlEncoding', () => {
  it('returns null for UTF-8, with or without a BOM', () => {
    expect(sniffXmlEncoding(new TextEncoder().encode('<?xml version="1.0"?>'))).toBeNull();
    expect(sniffXmlEncoding(bytes(0xef, 0xbb, 0xbf, 0x3c, 0x3f))).toBeNull();
    expect(
      sniffXmlEncoding(new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8"?>')),
    ).toBeNull();
  });

  it('detects UTF-16 from either BOM', () => {
    expect(sniffXmlEncoding(bytes(0xfe, 0xff, 0x00, 0x3c))).toBe('UTF-16');
    expect(sniffXmlEncoding(bytes(0xff, 0xfe, 0x3c, 0x00))).toBe('UTF-16');
  });

  it('detects UTF-16 from a BOM-less declaration', () => {
    expect(sniffXmlEncoding(bytes(0x00, 0x3c, 0x00, 0x3f))).toBe('UTF-16');
    expect(sniffXmlEncoding(bytes(0x3c, 0x00, 0x3f, 0x00))).toBe('UTF-16');
  });

  it('detects UCS-4 only where the UTF-16 table does not claim the prefix first', () => {
    expect(sniffXmlEncoding(bytes(0x00, 0x00, 0x00, 0x3c))).toBe('UCS-4');
    expect(sniffXmlEncoding(bytes(0x00, 0x00, 0xfe, 0xff))).toBe('UCS-4');
  });

  it('reports a UTF-32LE BOM as UTF-16, matching Java', () => {
    // XMLEncodingSniffer tests UTF16_MAGIC before UCS4_MAGIC, so FF FE 00 00
    // matches on its two-byte prefix. EPUBCheck reports RSC-027 here, not RSC-028.
    expect(sniffXmlEncoding(bytes(0xff, 0xfe, 0x00, 0x00))).toBe('UTF-16');
  });

  it('reads a declared non-UTF-8 encoding name', () => {
    const declared = (name: string) =>
      sniffXmlEncoding(new TextEncoder().encode(`<?xml version="1.0" encoding="${name}"?>`));
    expect(declared('ISO-8859-1')).toBe('ISO-8859-1');
    expect(declared('unknown')).toBe('UNKNOWN');
  });

  it('returns null for input too short to classify', () => {
    expect(sniffXmlEncoding(bytes())).toBeNull();
    expect(sniffXmlEncoding(bytes(0x3c))).toBeNull();
  });
});

describe('decodeXmlBytes', () => {
  const xml = '<?xml version="1.0"?><package/>';

  it('decodes UTF-8 unchanged', () => {
    expect(decodeXmlBytes(new TextEncoder().encode(xml))).toBe(xml);
  });

  it('decodes UTF-16 in both byte orders and strips the BOM', () => {
    expect(decodeXmlBytes(encodeUtf16(xml, false))).toBe(xml);
    expect(decodeXmlBytes(encodeUtf16(xml, true))).toBe(xml);
  });

  it('decodes BOM-less UTF-16 detected from the declaration', () => {
    expect(decodeXmlBytes(encodeUtf16(xml, false, false))).toBe(xml);
    expect(decodeXmlBytes(encodeUtf16(xml, true, false))).toBe(xml);
  });

  it('decodes UTF-32 in both byte orders, with and without a BOM', () => {
    expect(decodeXmlBytes(encodeUtf32(xml, false))).toBe(xml);
    expect(decodeXmlBytes(encodeUtf32(xml, true))).toBe(xml);
    expect(decodeXmlBytes(encodeUtf32(xml, false, true))).toBe(xml);
  });

  it('decodes UTF-32 documents larger than one code-point chunk', () => {
    // String.fromCodePoint is applied in chunks; a naive spread of the whole
    // document overflows the argument limit somewhere above ~100k code points.
    const large = `<package>${'x'.repeat(200_000)}</package>`;
    expect(decodeXmlBytes(encodeUtf32(large, false))).toBe(large);
  });

  it('substitutes U+FFFD for code points outside the Unicode range', () => {
    expect(decodeXmlBytes(bytes(0x00, 0x00, 0x00, 0x3c, 0xff, 0xff, 0xff, 0xff))).toBe('<�');
  });
});
