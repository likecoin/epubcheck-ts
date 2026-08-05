import { describe, expect, it } from 'vitest';
import { EpubCheck, type EpubCheckResult } from '../../src/index.js';

/**
 * Single-file validation modes (--mode xhtml / --mode svg).
 *
 * OPF-014 reports a mismatch between the features a content document uses and the
 * properties its manifest item declares. Single-file mode has no manifest, so the
 * comparison is meaningless and every detected feature would otherwise be reported
 * as undeclared. Java guards the same check with `context.container.isPresent()`
 * (OPSHandler30.checkProperties).
 *
 * Each feature is asserted twice: once in single-file mode (must validate clean)
 * and once inside a container whose manifest item omits the property (must name
 * that property in an OPF-014). The paired assertion keeps the single-file case
 * from passing vacuously if feature detection itself regresses.
 */

const encode = (s: string): Uint8Array => new TextEncoder().encode(s);

function xhtml(title: string, bodyContent: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en" lang="en">
\t<head>
\t\t<meta charset="utf-8"/>
\t\t<title>${title}</title>
\t</head>
\t<body>
${bodyContent}
\t</body>
</html>
`;
}

/** Feature-bearing XHTML documents, keyed by the manifest property they would need. */
const XHTML_FEATURES = [
  {
    property: 'scripted',
    body: '\t\t<script type="text/javascript">var answer = 42;</script>',
  },
  {
    property: 'mathml',
    body: '\t\t<p><math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi></math></p>',
  },
  {
    property: 'svg',
    body: '\t\t<p><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg></p>',
  },
  {
    property: 'remote-resources',
    body: '\t\t<p><audio src="https://example.org/sound.mp3"/></p>',
  },
] as const;

const SVG_WITH_REMOTE_RESOURCE = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 10 10">
\t<title>Remote image</title>
\t<image xlink:href="https://example.org/image.png" width="10" height="10"/>
</svg>
`;

const CONTAINER_XML = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
\t<rootfiles>
\t\t<rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/>
\t</rootfiles>
</container>
`;

/**
 * An expanded EPUB whose single content document is `content`, manifested with no
 * properties at all — the state that makes an undeclared feature reportable.
 */
function expandedEpubWith(
  contentHref: string,
  contentMediaType: string,
  content: string,
): Map<string, Uint8Array> {
  const packageOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" xml:lang="en" unique-identifier="q">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
  <dc:title id="title">Feature EPUB</dc:title>
  <dc:language>en</dc:language>
  <dc:identifier id="q">NOID</dc:identifier>
  <meta property="dcterms:modified">2017-06-14T00:00:01Z</meta>
</metadata>
<manifest>
  <item id="content" href="${contentHref}" media-type="${contentMediaType}"/>
  <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
</manifest>
<spine>
  <itemref idref="content" />
</spine>
</package>
`;

  // The toc must link the content document it ships with, or the EPUB reports an
  // unrelated RSC-007 that would drown out the OPF-014 under test.
  const nav = xhtml(
    'Nav',
    `\t\t<nav epub:type="toc">
\t\t\t<ol>
\t\t\t\t<li><a href="${contentHref}">content</a></li>
\t\t\t</ol>
\t\t</nav>`,
  );

  return new Map<string, Uint8Array>([
    ['mimetype', encode('application/epub+zip')],
    ['META-INF/container.xml', encode(CONTAINER_XML)],
    ['EPUB/package.opf', encode(packageOpf)],
    ['EPUB/nav.xhtml', encode(nav)],
    [`EPUB/${contentHref}`, encode(content)],
  ]);
}

function opf014Messages(result: EpubCheckResult): string[] {
  return result.messages.filter((m) => m.id === 'OPF-014').map((m) => m.message);
}

describe('Integration Tests - Single-file validation modes', () => {
  describe('XHTML (--mode xhtml)', () => {
    for (const feature of XHTML_FEATURES) {
      it(`validates a document using "${feature.property}" clean with no Package Document`, async () => {
        const result = await EpubCheck.validateSingleFile(
          encode(xhtml('Feature document', feature.body)),
          'content.xhtml',
          { mode: 'xhtml', version: '3.0' },
        );
        // Asserting the whole report, not just the absence of OPF-014: a crash in
        // single-file mode surfaces as PKG-008 and would otherwise pass silently.
        expect(result.messages).toEqual([]);
      });

      it(`still reports OPF-014 for undeclared "${feature.property}" inside a container`, async () => {
        const files = expandedEpubWith(
          'content.xhtml',
          'application/xhtml+xml',
          xhtml('Feature document', feature.body),
        );
        const result = await EpubCheck.validateExpanded(files);
        expect(opf014Messages(result)).toEqual([expect.stringContaining(`"${feature.property}"`)]);
      });
    }
  });

  describe('SVG (--mode svg)', () => {
    it('validates a document using remote resources clean with no Package Document', async () => {
      const result = await EpubCheck.validateSingleFile(
        encode(SVG_WITH_REMOTE_RESOURCE),
        'content.svg',
        { mode: 'svg', version: '3.0' },
      );
      expect(result.messages).toEqual([]);
    });

    it('still reports OPF-014 for undeclared remote resources inside a container', async () => {
      const files = expandedEpubWith('content.svg', 'image/svg+xml', SVG_WITH_REMOTE_RESOURCE);
      const result = await EpubCheck.validateExpanded(files);
      expect(opf014Messages(result)).toEqual([expect.stringContaining('"remote-resources"')]);
    });
  });
});
