/**
 * XML encoding detection via BOM and XML declaration parsing.
 * Port of Java EPUBCheck's XMLEncodingSniffer.
 */

/**
 * Sniff the encoding of an XML document from its raw bytes.
 * Returns the detected encoding name (uppercase), or null if UTF-8/ASCII-compatible.
 */
export function sniffXmlEncoding(data: Uint8Array): string | null {
  if (data.length < 2) return null;

  // Check for UTF-32/UCS-4 BOMs (must check before UTF-16 since UTF-32 LE starts with FF FE 00 00)
  if (data.length >= 4) {
    if (data[0] === 0x00 && data[1] === 0x00 && data[2] === 0xfe && data[3] === 0xff) {
      return 'UCS-4';
    }
    if (data[0] === 0xff && data[1] === 0xfe && data[2] === 0x00 && data[3] === 0x00) {
      return 'UCS-4';
    }
    if (data[0] === 0x00 && data[1] === 0x00 && data[2] === 0xff && data[3] === 0xfe) {
      return 'UCS-4';
    }
    if (data[0] === 0xfe && data[1] === 0xff && data[2] === 0x00 && data[3] === 0x00) {
      return 'UCS-4';
    }
    // UCS-4 without BOM: null-byte patterns
    if (data[0] === 0x00 && data[1] === 0x00 && data[2] === 0x00 && data[3] === 0x3c) {
      return 'UCS-4';
    }
    if (data[0] === 0x3c && data[1] === 0x00 && data[2] === 0x00 && data[3] === 0x00) {
      return 'UCS-4';
    }
    if (data[0] === 0x00 && data[1] === 0x00 && data[2] === 0x3c && data[3] === 0x00) {
      return 'UCS-4';
    }
    if (data[0] === 0x00 && data[1] === 0x3c && data[2] === 0x00 && data[3] === 0x00) {
      return 'UCS-4';
    }
  }

  // Check for UTF-16 BOMs
  if (data[0] === 0xfe && data[1] === 0xff) {
    return 'UTF-16';
  }
  if (data[0] === 0xff && data[1] === 0xfe) {
    return 'UTF-16';
  }

  // Check for UTF-16 without BOM: null-interleaved patterns
  if (data.length >= 4) {
    if (data[0] === 0x00 && data[1] === 0x3c && data[2] === 0x00 && data[3] === 0x3f) {
      return 'UTF-16';
    }
    if (data[0] === 0x3c && data[1] === 0x00 && data[2] === 0x3f && data[3] === 0x00) {
      return 'UTF-16';
    }
  }

  // Check for UTF-8 BOM
  if (data.length >= 3 && data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf) {
    return null; // UTF-8 is fine
  }

  // Check for EBCDIC
  if (
    data.length >= 4 &&
    data[0] === 0x4c &&
    data[1] === 0x6f &&
    data[2] === 0xa7 &&
    data[3] === 0x94
  ) {
    return 'EBCDIC';
  }

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
