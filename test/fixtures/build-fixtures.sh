#!/usr/bin/env bash
# Build EPUB test fixtures from Java EPUBCheck source files
# Usage: bash test/fixtures/build-fixtures.sh
set -euo pipefail

JAVA_OPF_DIR="../epubcheck/src/test/resources/epub3/05-package-document/files"
JAVA_NAV_DIR="../epubcheck/src/test/resources/epub3/07-navigation-document/files"
FIXTURES_DIR="test/fixtures"

MIMETYPE="application/epub+zip"

CONTAINER_XML='<?xml version="1.0" encoding="UTF-8" ?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>'

MINIMAL_NAV='<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en" lang="en">
<head><meta charset="utf-8"/><title>Nav</title></head>
<body>
<nav epub:type="toc"><ol><li><a href="content_001.xhtml">Content</a></li></ol></nav>
</body>
</html>'

MINIMAL_CONTENT='<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
<head><meta charset="utf-8"/><title>Content</title></head>
<body><p>Content.</p></body>
</html>'

# Create a stub content file at $1
create_content() {
  echo "$MINIMAL_CONTENT" > "$1"
}

# Create a stub nav file at $1 (referencing $2 as main content href, default content_001.xhtml)
create_nav() {
  local target="${2:-content_001.xhtml}"
  echo "$MINIMAL_NAV" | sed "s|content_001.xhtml|${target}|" > "$1"
}

# Build an EPUB from an OPF file
# $1 = source OPF path, $2 = output EPUB path
build_opf_epub() {
  local opf_src="$1"
  local epub_out="$2"
  local tmpdir
  tmpdir=$(mktemp -d)

  echo -n "$MIMETYPE" > "$tmpdir/mimetype"
  mkdir -p "$tmpdir/META-INF" "$tmpdir/EPUB"
  echo "$CONTAINER_XML" > "$tmpdir/META-INF/container.xml"
  cp "$opf_src" "$tmpdir/EPUB/package.opf"

  local opf_content
  opf_content=$(cat "$opf_src")

  # Nav/content references
  if echo "$opf_content" | grep -q 'href="contents.xhtml"'; then
    create_nav "$tmpdir/EPUB/contents.xhtml" "contents.xhtml"
  fi
  if echo "$opf_content" | grep -q 'href="contents001.xhtml"'; then
    create_content "$tmpdir/EPUB/contents001.xhtml"
  fi
  if echo "$opf_content" | grep -q 'href="contents002.xhtml"'; then
    create_content "$tmpdir/EPUB/contents002.xhtml"
  fi
  if echo "$opf_content" | grep -q 'href="contents003.xhtml"'; then
    create_content "$tmpdir/EPUB/contents003.xhtml"
  fi
  if echo "$opf_content" | grep -q 'href="contents_1.xhtml"'; then
    create_nav "$tmpdir/EPUB/contents_1.xhtml" "contents_1.xhtml"
  fi
  if echo "$opf_content" | grep -q 'href="contents_2.xhtml"'; then
    create_nav "$tmpdir/EPUB/contents_2.xhtml" "contents_2.xhtml"
  fi
  if echo "$opf_content" | grep -q 'href="nav.xhtml"'; then
    create_nav "$tmpdir/EPUB/nav.xhtml"
  fi
  if echo "$opf_content" | grep -q 'href="content_001.xhtml"'; then
    create_content "$tmpdir/EPUB/content_001.xhtml"
  fi
  if echo "$opf_content" | grep -q 'href="content_002.xhtml"'; then
    create_content "$tmpdir/EPUB/content_002.xhtml"
  fi
  if echo "$opf_content" | grep -q 'href="content.xhtml"'; then
    create_content "$tmpdir/EPUB/content.xhtml"
  fi
  if echo "$opf_content" | grep -q 'href="cover.xhtml"'; then
    create_content "$tmpdir/EPUB/cover.xhtml"
  fi
  if echo "$opf_content" | grep -q 'href="transcription.xhtml"'; then
    create_content "$tmpdir/EPUB/transcription.xhtml"
  fi
  if echo "$opf_content" | grep -q 'href="impl.xhtml"'; then
    create_content "$tmpdir/EPUB/impl.xhtml"
  fi

  # Image files - create minimal stubs
  if echo "$opf_content" | grep -q 'href="cover.webp"'; then
    printf 'RIFF\x24\x00\x00\x00WEBPVP8 \x18\x00\x00\x000\x01\x00\x9d\x01\x2a\x01\x00\x01\x00\x01\x40\x25\xa4\x00\x03\x70\x00\xfe\xfb\x94\x00\x00' > "$tmpdir/EPUB/cover.webp"
  fi
  if echo "$opf_content" | grep -q 'href="image.jpg"'; then
    printf '\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xd9' > "$tmpdir/EPUB/image.jpg"
  fi
  if echo "$opf_content" | grep -q 'href="image.png"'; then
    printf '\x89PNG\r\n\x1a\n' > "$tmpdir/EPUB/image.png"
  fi
  # Unencoded space in filename
  if echo "$opf_content" | grep -q 'href="image 1.png"'; then
    printf '\x89PNG\r\n\x1a\n' > "$tmpdir/EPUB/image 1.png"
  fi

  # CSS
  if echo "$opf_content" | grep -q 'href="style.css"'; then
    echo "body { margin: 0; }" > "$tmpdir/EPUB/style.css"
  fi

  # NCX
  if echo "$opf_content" | grep -q 'href="ncx.ncx"'; then
    cat > "$tmpdir/EPUB/ncx.ncx" << 'NCXEOF'
<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
<head><meta name="dtb:uid" content="NOID"/></head>
<docTitle><text>Title</text></docTitle>
<navMap><navPoint id="np1" playOrder="1"><navLabel><text>Content</text></navLabel><content src="contents.xhtml"/></navPoint></navMap>
</ncx>
NCXEOF
  fi
  if echo "$opf_content" | grep -q 'href="toc.ncx"'; then
    cat > "$tmpdir/EPUB/toc.ncx" << 'NCXEOF'
<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
<head><meta name="dtb:uid" content="NOID"/></head>
<docTitle><text>Title</text></docTitle>
<navMap><navPoint id="np1" playOrder="1"><navLabel><text>Content</text></navLabel><content src="content_001.xhtml"/></navPoint></navMap>
</ncx>
NCXEOF
  fi

  # SVG
  if echo "$opf_content" | grep -q 'href="rect.svg"'; then
    cat > "$tmpdir/EPUB/rect.svg" << 'SVGEOF'
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="red"/></svg>
SVGEOF
  fi

  # SMIL media overlay
  if echo "$opf_content" | grep -q 'href="mediaoverlay_001.smil"'; then
    cat > "$tmpdir/EPUB/mediaoverlay_001.smil" << 'SMILEOF'
<?xml version="1.0" encoding="UTF-8"?>
<smil xmlns="http://www.w3.org/ns/SMIL" version="3.0">
<body><seq><par><text src="contents.xhtml"/></par></seq></body>
</smil>
SMILEOF
  fi

  # XML for slideshow/bindings tests
  if echo "$opf_content" | grep -q 'href="slideshow.xml"'; then
    echo '<?xml version="1.0"?><slideshow/>' > "$tmpdir/EPUB/slideshow.xml"
  fi

  # Record XML for link tests
  if echo "$opf_content" | grep -q 'href="record.xml"'; then
    echo '<?xml version="1.0"?><record/>' > "$tmpdir/EPUB/record.xml"
  fi

  # Build the EPUB
  mkdir -p "$(dirname "$epub_out")"
  (cd "$tmpdir" && zip -X0 "../epub.zip" mimetype && zip -Xr9 "../epub.zip" META-INF EPUB) > /dev/null 2>&1
  mv "$tmpdir/../epub.zip" "$epub_out"
  rm -rf "$tmpdir"
}

# Build an EPUB from a nav XHTML file
# $1 = source XHTML path, $2 = output EPUB path
build_nav_epub() {
  local nav_src="$1"
  local epub_out="$2"
  local tmpdir
  tmpdir=$(mktemp -d)

  echo -n "$MIMETYPE" > "$tmpdir/mimetype"
  mkdir -p "$tmpdir/META-INF" "$tmpdir/EPUB"
  echo "$CONTAINER_XML" > "$tmpdir/META-INF/container.xml"
  cp "$nav_src" "$tmpdir/EPUB/nav.xhtml"
  create_content "$tmpdir/EPUB/content_001.xhtml"

  cat > "$tmpdir/EPUB/package.opf" << 'OPFEOF'
<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid"
    xmlns:dc="http://purl.org/dc/elements/1.1/">
  <metadata>
    <dc:title>Test</dc:title>
    <dc:language>en</dc:language>
    <dc:identifier id="uid">NOID</dc:identifier>
    <meta property="dcterms:modified">2019-01-01T12:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" properties="nav" media-type="application/xhtml+xml"/>
    <item id="content_001" href="content_001.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="nav"/>
    <itemref idref="content_001"/>
  </spine>
</package>
OPFEOF

  mkdir -p "$(dirname "$epub_out")"
  (cd "$tmpdir" && zip -X0 "../epub.zip" mimetype && zip -Xr9 "../epub.zip" META-INF EPUB) > /dev/null 2>&1
  mv "$tmpdir/../epub.zip" "$epub_out"
  rm -rf "$tmpdir"
}

echo "=== Building OPF fixtures ==="

OPF_ERRORS=(
  "metadata-identifier-empty-error"
  "metadata-language-empty-error"
  "metadata-language-not-well-formed-error"
  "metadata-title-empty-error"
  "metadata-title-missing-error"
  "metadata-meta-value-empty-error"
  "metadata-meta-property-empty-error"
  "metadata-meta-property-list-error"
  "metadata-meta-property-malformed-error"
  "metadata-meta-scheme-list-error"
  "metadata-meta-scheme-unknown-error"
  "metadata-modified-missing-error"
  "metadata-modified-syntax-error"
  "metadata-refines-not-relative-error"
  "metadata-refines-unknown-id-error"
  "metadata-refines-cycle-error"
  "metadata-date-multiple-error"
  "link-hreflang-not-well-formed-error"
  "link-hreflang-whitespace-error"
  "link-rel-record-properties-empty-error"
  "link-rel-record-properties-undefined-error"
  "link-to-package-document-id-error"
  "attr-id-duplicate-error"
  "attr-id-duplicate-with-spaces-error"
  "attr-lang-whitespace-error"
  "attr-lang-not-well-formed-error"
  "item-media-type-missing-error"
  "item-href-contains-spaces-unencoded-error"
  "item-href-with-fragment-error"
  "item-duplicate-resource-error"
  "item-property-unknown-error"
  "item-property-cover-image-multiple-error"
  "item-property-cover-image-wrongtype-error"
  "item-nav-missing-error"
  "item-nav-multiple-error"
  "item-nav-not-xhtml-error"
  "fallback-style-error"
  "collection-role-manifest-toplevel-error"
  "package-unique-identifier-unknown-error"
  "package-unique-identifier-not-targeting-identifier-error"
  "package-manifest-before-metadata-error"
  "package-no-metadata-element-error"
  "spine-empty-error"
  "spine-missing-error"
  "legacy-ncx-toc-attribute-missing-error"
  "legacy-ncx-toc-attribute-not-ncx-error"
)

OPF_WARNINGS=(
  "metadata-identifier-uuid-invalid-warning"
  "metadata-date-iso-syntax-error-warning"
  "metadata-date-unknown-format-warning"
  "metadata-refines-not-a-fragment-warning"
  "collection-role-url-invalid-error"
  "bindings-deprecated-warning"
)

OPF_VALIDS=(
  "metadata-meta-scheme-valid"
  "metadata-date-single-year-valid"
  "metadata-date-with-whitespace-valid"
  "metadata-source-valid"
  "metadata-type-valid"
  "link-hreflang-valid"
  "link-hreflang-empty-valid"
  "link-rel-multiple-properties-valid"
  "link-to-spine-item-valid"
  "attr-dir-auto-valid"
  "attr-id-with-spaces-valid"
  "attr-lang-empty-valid"
  "attr-lang-three-char-code-valid"
  "item-property-cover-image-webp-valid"
  "collection-role-url-valid"
  "spine-item-svg-valid"
)

for name in "${OPF_ERRORS[@]}"; do
  src="$JAVA_OPF_DIR/${name}.opf"
  out="$FIXTURES_DIR/invalid/opf/${name}.epub"
  if [ -f "$src" ]; then
    echo "  Building $out"
    build_opf_epub "$src" "$out"
  else
    echo "  WARNING: Source not found: $src"
  fi
done

for name in "${OPF_WARNINGS[@]}"; do
  src="$JAVA_OPF_DIR/${name}.opf"
  out="$FIXTURES_DIR/warnings/${name}.epub"
  if [ -f "$src" ]; then
    echo "  Building $out"
    build_opf_epub "$src" "$out"
  else
    echo "  WARNING: Source not found: $src"
  fi
done

for name in "${OPF_VALIDS[@]}"; do
  src="$JAVA_OPF_DIR/${name}.opf"
  out="$FIXTURES_DIR/valid/${name}.epub"
  if [ -f "$src" ]; then
    echo "  Building $out"
    build_opf_epub "$src" "$out"
  else
    echo "  WARNING: Source not found: $src"
  fi
done

echo ""
echo "=== Building Nav fixtures ==="

NAV_ERRORS=(
  "content-model-heading-empty-error"
  "content-model-heading-p-error"
  "content-model-li-label-missing-error"
  "content-model-li-label-empty-error"
  "content-model-li-leaf-with-no-link-error"
  "content-model-a-empty-error"
  "content-model-a-span-empty-error"
  "content-model-ol-empty-error"
  "nav-page-list-multiple-error"
  "nav-landmarks-link-type-missing-error"
  "nav-landmarks-multiple-error"
  "nav-landmarks-type-twice-same-resource-error"
  "nav-other-heading-missing-error"
  "hidden-attribute-invalid-error"
)

NAV_VALIDS=(
  "content-model-li-label-multiple-images-valid"
  "content-model-a-multiple-images-valid"
  "content-model-a-with-leading-trailing-spaces-valid"
  "nav-toc-nested-valid"
  "nav-page-list-valid"
  "nav-landmarks-valid"
  "nav-landmarks-type-twice-valid"
  "nav-other-lot-valid"
  "nav-type-missing-not-restricted-valid"
  "hidden-nav-valid"
)

for name in "${NAV_ERRORS[@]}"; do
  src="$JAVA_NAV_DIR/${name}.xhtml"
  out="$FIXTURES_DIR/invalid/nav/${name}.epub"
  if [ -f "$src" ]; then
    echo "  Building $out"
    build_nav_epub "$src" "$out"
  else
    echo "  WARNING: Source not found: $src"
  fi
done

for name in "${NAV_VALIDS[@]}"; do
  src="$JAVA_NAV_DIR/${name}.xhtml"
  out="$FIXTURES_DIR/valid/${name}.epub"
  if [ -f "$src" ]; then
    echo "  Building $out"
    build_nav_epub "$src" "$out"
  else
    echo "  WARNING: Source not found: $src"
  fi
done

echo ""
echo "=== Done ==="
echo "Total OPF errors: ${#OPF_ERRORS[@]}"
echo "Total OPF warnings: ${#OPF_WARNINGS[@]}"
echo "Total OPF valid: ${#OPF_VALIDS[@]}"
echo "Total Nav errors: ${#NAV_ERRORS[@]}"
echo "Total Nav valid: ${#NAV_VALIDS[@]}"
