/**
 * XML encoding detection via BOM and XML declaration parsing.
 * Port of Java EPUBCheck's XMLEncodingSniffer.
 */

/**
 * Byte-prefix tables, in the order Java's XMLEncodingSniffer tests them
 * (XMLEncodingSniffer.java:10-15). The order is load-bearing: a match is
 * taken on the prefix alone, so the two-byte UTF-16 entries claim byte
 * sequences the UCS-4 table would otherwise match. See sniffXmlEncoding.
 */
const UTF16_BE_BOM = [0xfe, 0xff];
const UTF16_LE_BOM = [0xff, 0xfe];
const UTF16_BE_DECL = [0x00, 0x3c, 0x00, 0x3f];
const UTF16_LE_DECL = [0x3c, 0x00, 0x3f, 0x00];

const UCS4_BE_BOM = [0x00, 0x00, 0xfe, 0xff];
const UCS4_LE_BOM = [0xff, 0xfe, 0x00, 0x00];
const UCS4_BE_DECL = [0x00, 0x00, 0x00, 0x3c];
const UCS4_LE_DECL = [0x3c, 0x00, 0x00, 0x00];

const UTF16_MAGIC = [UTF16_BE_BOM, UTF16_LE_BOM, UTF16_BE_DECL, UTF16_LE_DECL];

const UCS4_MAGIC = [
  UCS4_BE_BOM,
  UCS4_LE_BOM,
  [0x00, 0x00, 0xff, 0xfe],
  [0xfe, 0xff, 0x00, 0x00],
  UCS4_BE_DECL,
  [0x00, 0x00, 0x3c, 0x00],
  [0x00, 0x3c, 0x00, 0x00],
  UCS4_LE_DECL,
];

const UTF8_MAGIC = [[0xef, 0xbb, 0xbf]];

const EBCDIC_MAGIC = [[0x4c, 0x6f, 0xa7, 0x94]];

function startsWith(data: Uint8Array, prefix: number[]): boolean {
  return prefix.every((byte, i) => data[i] === byte);
}

function matchesMagic(table: number[][], data: Uint8Array): boolean {
  return table.some((magic) => startsWith(data, magic));
}

/**
 * Sniff the encoding of an XML document from its raw bytes.
 * Returns the detected encoding name (uppercase), or null if UTF-8/ASCII-compatible.
 */
export function sniffXmlEncoding(data: Uint8Array): string | null {
  if (data.length < 2) return null;

  // The UTF-16 table is tested first, so a UTF-32LE BOM (FF FE 00 00) matches
  // on its two-byte prefix and is reported as UTF-16. That is what Java does,
  // and it is why EPUBCheck reports RSC-027 rather than RSC-028 for UTF-32LE.
  if (matchesMagic(UTF16_MAGIC, data)) return 'UTF-16';
  if (matchesMagic(UCS4_MAGIC, data)) return 'UCS-4';
  if (matchesMagic(UTF8_MAGIC, data)) return null; // UTF-8 needs no report
  if (matchesMagic(EBCDIC_MAGIC, data)) return 'EBCDIC';

  // Try to parse XML declaration for encoding attribute
  const prefix = String.fromCharCode(...data.slice(0, Math.min(256, data.length)));
  const match = /^<\?xml[^?]*\bencoding\s*=\s*["']([^"']+)["']/.exec(prefix);
  if (match) {
    const declared = (match[1] ?? '').toUpperCase();
    if (declared === 'UTF-8') return null;
    return declared;
  }

  return null;
}

/**
 * Whether these bytes are UTF-32, and in which byte order.
 *
 * Tested before UTF-16, which is the opposite of sniffXmlEncoding: that
 * function reproduces which message Java reports, while this one has to
 * reproduce what the bytes actually mean. The two disagree on a UTF-32LE BOM
 * (FF FE 00 00), which Java reports as UTF-16.
 */
function utf32ByteOrder(data: Uint8Array): 'be' | 'le' | null {
  if (startsWith(data, UCS4_BE_BOM) || startsWith(data, UCS4_BE_DECL)) return 'be';
  if (startsWith(data, UCS4_LE_BOM) || startsWith(data, UCS4_LE_DECL)) return 'le';
  return null;
}

/** Code points per String.fromCodePoint call, kept well under the argument limit. */
const CODE_POINT_CHUNK = 4096;

/** TextDecoder has no UTF-32 decoder, so read the code points directly. */
function decodeUtf32(data: Uint8Array, littleEndian: boolean): string {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let decoded = '';
  let chunk: number[] = [];
  for (let offset = 0; offset + 4 <= view.byteLength; offset += 4) {
    const codePoint = view.getUint32(offset, littleEndian);
    if (codePoint === 0xfeff && offset === 0) continue; // byte order mark
    chunk.push(
      codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff) ? 0xfffd : codePoint,
    );
    if (chunk.length === CODE_POINT_CHUNK) {
      decoded += String.fromCodePoint(...chunk);
      chunk = [];
    }
  }
  return chunk.length > 0 ? decoded + String.fromCodePoint(...chunk) : decoded;
}

/**
 * Label for the TextDecoder that matches how the XML parser will read these
 * bytes, or null when UTF-8 (the default) applies.
 */
function utf16Label(data: Uint8Array): 'utf-16be' | 'utf-16le' | null {
  if (startsWith(data, UTF16_BE_BOM) || startsWith(data, UTF16_BE_DECL)) return 'utf-16be';
  if (startsWith(data, UTF16_LE_BOM) || startsWith(data, UTF16_LE_DECL)) return 'utf-16le';
  return null;
}

/**
 * Decode XML bytes to text using the encoding implied by the BOM, falling back
 * to UTF-8.
 *
 * Several parsers in this port are regex-based and consume strings rather than
 * bytes. Decoding every document as UTF-8 turns a UTF-16 package document into
 * mojibake, which those parsers then read as an empty document — so they must
 * decode the same way libxml2 does.
 */
export function decodeXmlBytes(data: Uint8Array): string {
  const byteOrder = utf32ByteOrder(data);
  if (byteOrder) return decodeUtf32(data, byteOrder === 'le');

  const label = utf16Label(data);
  return label ? new TextDecoder(label).decode(data) : new TextDecoder().decode(data);
}
