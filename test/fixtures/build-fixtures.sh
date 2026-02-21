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
# If $2 is "SELF_LINK", creates a nav with an empty href to avoid spine reference issues.
create_nav() {
  if [ "${2}" = "SELF_LINK" ]; then
    cat > "$1" << 'NAVEOF'
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en" lang="en">
<head><meta charset="utf-8"/><title>Nav</title></head>
<body>
<nav epub:type="toc"><ol><li><a href="">Content</a></li></ol></nav>
</body>
</html>
NAVEOF
  else
    local target="${2:-content_001.xhtml}"
    echo "$MINIMAL_NAV" | sed "s|content_001.xhtml|${target}|" > "$1"
  fi
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

  # Find the nav item href (the item with properties containing "nav")
  local nav_href
  nav_href=$(echo "$opf_content" | grep -o '<item[^>]*properties="[^"]*nav[^"]*"[^>]*>' | grep -o 'href="[^"]*"' | sed 's/href="//;s/"$//' | head -1 || true)
  # Also try the reverse attribute order (href before properties)
  if [ -z "$nav_href" ]; then
    nav_href=$(echo "$opf_content" | grep -o '<item[^>]*href="[^"]*"[^>]*properties="[^"]*nav[^"]*"[^>]*>' | grep -o 'href="[^"]*"' | sed 's/href="//;s/"$//' | head -1 || true)
  fi

  # Find a spine XHTML item for nav link target
  # Extract spine idrefs, then find matching manifest XHTML items
  local first_content_href=""
  local spine_idrefs
  spine_idrefs=$(echo "$opf_content" | grep -oE '<itemref[^>]*idref="[^"]*"' | sed 's/.*idref="//;s/"$//' || true)
  for idref in $spine_idrefs; do
    local item_line
    item_line=$(echo "$opf_content" | grep -E "id=\"${idref}\"" | head -1 || true)
    if echo "$item_line" | grep -q 'media-type="application/xhtml+xml"'; then
      first_content_href=$(echo "$item_line" | grep -o 'href="[^"]*"' | sed 's/href="//;s/"$//' | head -1 || true)
      break
    fi
  done
  if [ -z "$first_content_href" ]; then
    # No spine XHTML item found; use nav itself if it's in the spine, otherwise use fragment-only link
    local nav_in_spine=""
    local nav_id
    nav_id=$(echo "$opf_content" | grep -o '<item[^>]*properties="[^"]*nav[^"]*"[^>]*>' | grep -o 'id="[^"]*"' | sed 's/id="//;s/"$//' | head -1 || true)
    if [ -z "$nav_id" ]; then
      nav_id=$(echo "$opf_content" | grep -o '<item[^>]*href="[^"]*"[^>]*properties="[^"]*nav[^"]*"[^>]*>' | grep -o 'id="[^"]*"' | sed 's/id="//;s/"$//' | head -1 || true)
    fi
    if [ -n "$nav_id" ]; then
      nav_in_spine=$(echo "$opf_content" | grep "idref=\"${nav_id}\"" || true)
    fi
    if [ -n "$nav_in_spine" ]; then
      first_content_href="$nav_href"
    else
      first_content_href="SELF_LINK"
    fi
  fi

  # Extract all href references from manifest items and create appropriate stubs
  local all_hrefs
  all_hrefs=$(echo "$opf_content" | grep -oE 'href="[^"]*"' | sed 's/href="//;s/"$//' | sort -u || true)

  for href in $all_hrefs; do
    # Skip remote URLs, data URLs, and file URLs
    case "$href" in
      http://*|https://*|data:*|file:*) continue ;;
    esac
    local ext="${href##*.}"
    case "$ext" in
      xhtml|html)
        if [ "$href" = "$nav_href" ]; then
          create_nav "$tmpdir/EPUB/$href" "$first_content_href"
        else
          create_content "$tmpdir/EPUB/$href"
        fi
        ;;
      css)
        echo "body { margin: 0; }" > "$tmpdir/EPUB/$href"
        ;;
      js)
        touch "$tmpdir/EPUB/$href"
        ;;
      mp3|mpg)
        printf '\xff\xfb' > "$tmpdir/EPUB/$href"
        ;;
      mp4|aac|m4v)
        printf '\x00\x00\x00\x00' > "$tmpdir/EPUB/$href"
        ;;
      opus)
        printf 'OggS' > "$tmpdir/EPUB/$href"
        ;;
      webm)
        printf '\x1a\x45\xdf\xa3' > "$tmpdir/EPUB/$href"
        ;;
      ttf)
        printf '\x00\x01\x00\x00' > "$tmpdir/EPUB/$href"
        ;;
      otf)
        printf 'OTTO' > "$tmpdir/EPUB/$href"
        ;;
      woff)
        printf 'wOFF' > "$tmpdir/EPUB/$href"
        ;;
      woff2)
        printf 'wOF2' > "$tmpdir/EPUB/$href"
        ;;
      gif)
        printf 'GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x00\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;' > "$tmpdir/EPUB/$href"
        ;;
      jpg|jpeg)
        printf '\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xd9' > "$tmpdir/EPUB/$href"
        ;;
      png)
        printf '\x89PNG\r\n\x1a\n' > "$tmpdir/EPUB/$href"
        ;;
      webp)
        printf 'RIFF\x24\x00\x00\x00WEBPVP8 \x18\x00\x00\x000\x01\x00\x9d\x01\x2a\x01\x00\x01\x00\x01\x40\x25\xa4\x00\x03\x70\x00\xfe\xfb\x94\x00\x00' > "$tmpdir/EPUB/$href"
        ;;
      svg)
        echo '<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1"/></svg>' > "$tmpdir/EPUB/$href"
        ;;
      pls)
        echo '<?xml version="1.0" encoding="UTF-8"?><lexicon xmlns="http://www.w3.org/2005/01/pronunciation-lexicon" version="1.0" xml:lang="en" alphabet="ipa"><lexeme><grapheme>test</grapheme><phoneme>tɛst</phoneme></lexeme></lexicon>' > "$tmpdir/EPUB/$href"
        ;;
      vnd)
        touch "$tmpdir/EPUB/$href"
        ;;
      ncx)
        cat > "$tmpdir/EPUB/$href" << 'NCXEOF'
<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
<head><meta name="dtb:uid" content="NOID"/></head>
<docTitle><text>Title</text></docTitle>
<navMap><navPoint id="np1" playOrder="1"><navLabel><text>Content</text></navLabel><content src="content_001.xhtml"/></navPoint></navMap>
</ncx>
NCXEOF
        ;;
      smil)
        cat > "$tmpdir/EPUB/$href" << 'SMILEOF'
<?xml version="1.0" encoding="UTF-8"?>
<smil xmlns="http://www.w3.org/ns/SMIL" version="3.0">
<body><seq><par><text src="content_001.xhtml"/></par></seq></body>
</smil>
SMILEOF
        ;;
      xml)
        # handled below
        ;;
    esac
  done

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

  # D-vocabulary link stubs
  if echo "$opf_content" | grep -q 'href="record.atom"'; then
    echo '<?xml version="1.0"?><feed/>' > "$tmpdir/EPUB/record.atom"
  fi
  if echo "$opf_content" | grep -q 'href="title.mp3"'; then
    printf '\xff\xfb' > "$tmpdir/EPUB/title.mp3"
  fi
  if echo "$opf_content" | grep -q 'href="onix.xml"'; then
    echo '<?xml version="1.0"?><ONIXMessage/>' > "$tmpdir/EPUB/onix.xml"
  fi
  if echo "$opf_content" | grep -q 'href="other.xml"'; then
    echo '<?xml version="1.0"?><other/>' > "$tmpdir/EPUB/other.xml"
  fi
  # Deprecated rel keyword stubs
  if echo "$opf_content" | grep -q 'href="marc21-record.xml"'; then
    echo '<?xml version="1.0"?><marc21/>' > "$tmpdir/EPUB/marc21-record.xml"
  fi
  if echo "$opf_content" | grep -q 'href="mods-record.xml"'; then
    echo '<?xml version="1.0"?><mods/>' > "$tmpdir/EPUB/mods-record.xml"
  fi
  if echo "$opf_content" | grep -q 'href="onix-record.xml"'; then
    echo '<?xml version="1.0"?><onix/>' > "$tmpdir/EPUB/onix-record.xml"
  fi
  if echo "$opf_content" | grep -q 'href="xmp-record.xml"'; then
    echo '<?xml version="1.0"?><xmp/>' > "$tmpdir/EPUB/xmp-record.xml"
  fi
  if echo "$opf_content" | grep -q 'href="xml-signature.xml"'; then
    echo '<?xml version="1.0"?><signature/>' > "$tmpdir/EPUB/xml-signature.xml"
  fi

  # Build the EPUB
  mkdir -p "$(dirname "$epub_out")"
  (cd "$tmpdir" && zip -X0 "../epub.zip" mimetype && zip -Xr9 "../epub.zip" META-INF EPUB) > /dev/null 2>&1
  mv "$tmpdir/../epub.zip" "$epub_out"
  rm -rf "$tmpdir"
}

# Build an EPUB from a nav XHTML file
# $1 = source XHTML path, $2 = output EPUB path
# Parses href references from the nav source and creates stub files + manifest entries.
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

  local nav_content
  nav_content=$(cat "$nav_src")

  # Add IDs to nav document for self-references (href="#id")
  local self_frags
  self_frags=$(echo "$nav_content" | grep -oE 'href="#[^"]*"' | sed 's/href="#//;s/"$//' | sort -u || true)
  for frag in $self_frags; do
    # If the fragment ID doesn't already exist in the document, inject a hidden span
    if ! echo "$nav_content" | grep -q "id=\"${frag}\""; then
      sed -i '' "s|<body>|<body><span id=\"${frag}\" hidden=\"hidden\"/>|" "$tmpdir/EPUB/nav.xhtml"
    fi
  done

  local extra_manifest=""
  local extra_spine=""
  local item_counter=1

  # Collect all href values (file#fragment pairs, trimming leading/trailing spaces)
  local href_vals
  href_vals=$(echo "$nav_content" | grep -oE 'href="[^"]*"' | sed 's/href="//;s/"$//' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | grep -v '^$' || true)

  # Collect unique file paths (without fragment)
  local file_refs
  file_refs=$(echo "$href_vals" | sed 's/#.*//' | grep -v '^$' | sort -u || true)

  # For each referenced file, collect all fragment IDs targeting it
  for ref in $file_refs; do
    case "$ref" in
      content_001.xhtml) continue ;;
      http://*|https://*|mailto:*|tel:*|data:*) continue ;;
    esac
    local stub_path="$tmpdir/EPUB/${ref}"
    if [ -f "$stub_path" ]; then
      continue
    fi
    mkdir -p "$(dirname "$stub_path")"

    # Collect fragment IDs for this file
    local frags
    frags=$(echo "$href_vals" | grep "^${ref}#" | sed "s|^${ref}#||" | sort -u || true)

    # Build body content with div elements for each fragment ID
    local body_content="<p>Content.</p>"
    for frag in $frags; do
      body_content="${body_content}<div id=\"${frag}\">Section</div>"
    done

    cat > "$stub_path" << STUBEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
<head><meta charset="utf-8"/><title>Content</title></head>
<body>${body_content}</body>
</html>
STUBEOF

    local item_id="extra_${item_counter}"
    local ext="${ref##*.}"
    local media_type="application/xhtml+xml"
    case "$ext" in
      html) media_type="application/xhtml+xml" ;;
    esac
    extra_manifest="${extra_manifest}
    <item id=\"${item_id}\" href=\"${ref}\" media-type=\"${media_type}\"/>"
    extra_spine="${extra_spine}
    <itemref idref=\"${item_id}\" linear=\"no\"/>"
    item_counter=$((item_counter + 1))
  done

  # Handle src references (images) from the nav document
  local src_refs
  src_refs=$(echo "$nav_content" | grep -oE 'src="[^"]*"' | sed 's/src="//;s/"$//' | grep -v '^http' | grep -v '^https' | grep -v '^data:' | grep -v '^$' | sort -u || true)

  for ref in $src_refs; do
    local stub_path="$tmpdir/EPUB/${ref}"
    if [ -f "$stub_path" ]; then
      continue
    fi
    mkdir -p "$(dirname "$stub_path")"
    local ext="${ref##*.}"
    local media_type=""
    case "$ext" in
      jpg|jpeg) media_type="image/jpeg"; printf '\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xd9' > "$stub_path" ;;
      png) media_type="image/png"; printf '\x89PNG\r\n\x1a\n' > "$stub_path" ;;
      gif) media_type="image/gif"; printf 'GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x00\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;' > "$stub_path" ;;
      svg) media_type="image/svg+xml"; echo '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"/>' > "$stub_path" ;;
      *) continue ;;
    esac
    local item_id="extra_${item_counter}"
    extra_manifest="${extra_manifest}
    <item id=\"${item_id}\" href=\"${ref}\" media-type=\"${media_type}\"/>"
    item_counter=$((item_counter + 1))
  done

  cat > "$tmpdir/EPUB/package.opf" << OPFEOF
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
    <item id="content_001" href="content_001.xhtml" media-type="application/xhtml+xml"/>${extra_manifest}
  </manifest>
  <spine>
    <itemref idref="nav"/>
    <itemref idref="content_001"/>${extra_spine}
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
echo "=== Building Content Document fixtures (single-file XHTML) ==="

JAVA_CONTENT_DIR="../epubcheck/src/test/resources/epub3/06-content-document/files"

# Build an EPUB from a single XHTML document file
# $1 = source XHTML path, $2 = output EPUB path
# Detects SVG/MathML/script content and sets OPF properties accordingly.
# Creates stub files for locally referenced resources.
build_single_xhtml_epub() {
  local xhtml_src="$1"
  local epub_out="$2"
  local tmpdir
  tmpdir=$(mktemp -d)

  local xhtml_content
  xhtml_content=$(cat "$xhtml_src")

  echo -n "$MIMETYPE" > "$tmpdir/mimetype"
  mkdir -p "$tmpdir/META-INF" "$tmpdir/EPUB"
  echo "$CONTAINER_XML" > "$tmpdir/META-INF/container.xml"
  cp "$xhtml_src" "$tmpdir/EPUB/content.xhtml"
  create_nav "$tmpdir/EPUB/nav.xhtml" "content.xhtml"

  # Detect content properties
  local props=""
  if echo "$xhtml_content" | grep -q '<svg\b\|<svg:'; then
    props="${props:+$props }svg"
  fi
  if echo "$xhtml_content" | grep -q '<math\b\|<m:math\|<mml:math'; then
    props="${props:+$props }mathml"
  fi
  if echo "$xhtml_content" | grep -q '<script\b'; then
    props="${props:+$props }scripted"
  fi
  if echo "$xhtml_content" | grep -q 'epub:switch\b'; then
    props="${props:+$props }switch"
  fi

  local content_props=""
  if [ -n "$props" ]; then
    content_props=" properties=\"${props}\""
  fi

  # Create stub files for locally referenced resources and build manifest/spine entries
  local extra_manifest=""
  local extra_spine=""
  local item_counter=1

  # Collect all href/src values (with fragments intact)
  local all_refs
  all_refs=$(echo "$xhtml_content" | grep -oE '(href|src)="[^"]*"' | sed 's/.*="\(.*\)"/\1/' | grep -v '^http' | grep -v '^https' | grep -v '^mailto' | grep -v '^tel:' | grep -v '^data:' | grep -v '^#' | grep -v '^$' || true)

  # Unique file paths (without fragments)
  local refs
  refs=$(echo "$all_refs" | sed 's/#.*//' | sort -u || true)

  for ref in $refs; do
    # Skip empty, absolute paths, and parent directory references
    case "$ref" in
      ""| /* | ../*) continue ;;
    esac
    # Determine media type and create stub
    local ext="${ref##*.}"
    local media_type=""
    case "$ext" in
      xhtml|html) media_type="application/xhtml+xml" ;;
      css) media_type="text/css" ;;
      js) media_type="application/javascript" ;;
      svg) media_type="image/svg+xml" ;;
      jpg|jpeg) media_type="image/jpeg" ;;
      png) media_type="image/png" ;;
      gif) media_type="image/gif" ;;
      xml) media_type="application/xml" ;;
      dtd) media_type="application/xml-dtd" ;;
      *) continue ;;
    esac

    local stub_path="$tmpdir/EPUB/${ref}"
    if [ -f "$stub_path" ]; then
      continue
    fi
    mkdir -p "$(dirname "$stub_path")"

    case "$ext" in
      xhtml|html)
        # Collect fragment IDs targeting this file
        local frags
        frags=$(echo "$all_refs" | grep "^${ref}#" | sed "s|^${ref}#||" | sort -u || true)
        local body_content="<p>Content.</p>"
        for frag in $frags; do
          body_content="${body_content}<div id=\"${frag}\">Section</div>"
        done
        cat > "$stub_path" << STUBEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
<head><meta charset="utf-8"/><title>Content</title></head>
<body>${body_content}</body>
</html>
STUBEOF
        ;;
      css)
        echo "body { margin: 0; }" > "$stub_path"
        ;;
      svg)
        echo '<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1"/></svg>' > "$stub_path"
        ;;
      jpg|jpeg)
        printf '\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xd9' > "$stub_path"
        ;;
      png)
        printf '\x89PNG\r\n\x1a\n' > "$stub_path"
        ;;
      gif)
        printf 'GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x00\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;' > "$stub_path"
        ;;
      *)
        touch "$stub_path"
        ;;
    esac

    local item_id="extra_${item_counter}"
    extra_manifest="${extra_manifest}
    <item id=\"${item_id}\" href=\"${ref}\" media-type=\"${media_type}\"/>"
    # Add XHTML stubs to spine so hyperlinks can resolve
    if [ "$ext" = "xhtml" ] || [ "$ext" = "html" ]; then
      extra_spine="${extra_spine}
    <itemref idref=\"${item_id}\" linear=\"no\"/>"
    fi
    item_counter=$((item_counter + 1))
  done

  cat > "$tmpdir/EPUB/package.opf" << OPFEOF
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
    <item id="content" href="content.xhtml"${content_props} media-type="application/xhtml+xml"/>${extra_manifest}
  </manifest>
  <spine>
    <itemref idref="nav"/>
    <itemref idref="content"/>${extra_spine}
  </spine>
</package>
OPFEOF

  mkdir -p "$(dirname "$epub_out")"
  (cd "$tmpdir" && zip -X0 "../epub.zip" mimetype && zip -Xr9 "../epub.zip" META-INF EPUB) > /dev/null 2>&1
  mv "$tmpdir/../epub.zip" "$epub_out"
  rm -rf "$tmpdir"
}

# Build an EPUB from a single SVG document file
# $1 = source SVG path, $2 = output EPUB path
build_single_svg_epub() {
  local svg_src="$1"
  local epub_out="$2"
  local tmpdir
  tmpdir=$(mktemp -d)

  echo -n "$MIMETYPE" > "$tmpdir/mimetype"
  mkdir -p "$tmpdir/META-INF" "$tmpdir/EPUB"
  echo "$CONTAINER_XML" > "$tmpdir/META-INF/container.xml"
  cp "$svg_src" "$tmpdir/EPUB/content.svg"
  create_nav "$tmpdir/EPUB/nav.xhtml" "content.svg"

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
    <item id="content" href="content.svg" media-type="image/svg+xml"/>
  </manifest>
  <spine>
    <itemref idref="nav"/>
    <itemref idref="content"/>
  </spine>
</package>
OPFEOF

  mkdir -p "$(dirname "$epub_out")"
  (cd "$tmpdir" && zip -X0 "../epub.zip" mimetype && zip -Xr9 "../epub.zip" META-INF EPUB) > /dev/null 2>&1
  mv "$tmpdir/../epub.zip" "$epub_out"
  rm -rf "$tmpdir"
}

# Build an EPUB from a Java content-document directory fixture
# $1 = source directory, $2 = output EPUB path
build_content_epub() {
  local src_dir="$1"
  local epub_out="$2"
  local tmpdir
  tmpdir=$(mktemp -d)

  cp -r "$src_dir"/* "$tmpdir/"

  mkdir -p "$(dirname "$epub_out")"
  (cd "$tmpdir" && zip -X0 "../epub.zip" mimetype && zip -Xr9 "../epub.zip" META-INF EPUB) > /dev/null 2>&1
  mv "$tmpdir/../epub.zip" "$epub_out"
  rm -rf "$tmpdir"
}

# --- XHTML single-file fixtures ---

XHTML_VALID=(
  "minimal"
  "canvas-valid"
  "custom-elements-valid"
  "attrs-case-insensitive-valid"
  "attrs-custom-ns-valid"
  "attrs-its-valid"
  "rdfa-valid"
  "data-attr-valid"
  "id-not-ncname-valid"
  "id-ref-non-ncname-valid"
  "lang-empty-valid"
  "lang-three-char-code-valid"
  "main-valid"
  "li-with-value-attr-valid"
  "doctype-valid"
  "doctype-legacy-compat-valid"
  "entities-character-references-valid"
  "entities-comments-cdata-valid"
  "entities-internal-valid"
  "a-href-valid"
  "img-alt-missing-error"
  "img-alt-missing-with-title-valid"
  "img-alt-missing-in-figure-valid"
  "http-equiv-valid"
  "http-equiv-case-valid"
  "link-alt-style-tags-known-valid"
  "link-alt-style-tags-unknown-valid"
  "link-rel-stylesheet-alternate-valid"
  "map-valid"
  "style-valid"
  "style-attr-valid"
  "svg-valid"
  "svg-regression-valid"
  "svg-id-valid"
  "svg-epubtype-valid"
  "svg-foreignObject-valid"
  "svg-foreignObject-requiredExtensions-valid"
  "svg-title-content-valid"
  "svg-rdf-valid"
  "svg-aria-valid"
  "mathml-prefixed-valid"
  "mathml-unprefixed-valid"
  "mathml-deprecated-valid"
  "mathml-anno-tex-valid"
  "mathml-anno-contentmathml-valid"
  "mathml-anno-presmathml-valid"
  "mathml-anno-xhtml-with-mathml-valid"
  "mathml-anno-xhtml-valid"
  "mathml-anno-xhtml-noname-valid"
  "mathml-anno-xhtml-contentequiv-valid"
  "mathml-anno-xhtml-html-encoding-valid"
  "mathml-anno-svg-valid"
  "microdata-valid"
  "table-border-valid"
  "time-valid"
  "url-valid"
  "ssml-valid"
  "schematron-valid"
  "epubtype-valid"
  "epubtype-reserved-vocab-valid"
  "epubtype-declared-vocab-valid"
  "aria-role-a-nohref-valid"
  "aria-roles-footer-valid"
  "aria-roles-h1-h6-valid"
  "aria-roles-header-valid"
  "aria-roles-img-valid"
  "aria-roles-nav-valid"
  "aria-roles-section-valid"
)

XHTML_ERRORS=(
  "doctype-obsolete-error"
  "encoding-utf16-error"
  "entities-external-error"
  "entities-no-semicolon-error"
  "entities-unknown-error"
  "id-duplicate-error"
  "id-ref-not-found-error"
  "data-attr-invalid-error"
  "img-src-empty-error"
  "http-equiv-non-utf8-error"
  "http-equiv-and-charset-error"
  "link-rel-stylesheet-alternate-no-title-error"
  "map-usemap-error"
  "style-no-type-error"
  "style-in-body-error"
  "style-attr-syntax-error"
  "table-border-error"
  "time-error"
  "time-nested-error"
  "url-invalid-error"
  "url-host-unparseable-warning"
  "xml11-error"
  "title-empty-error"
  "microdata-error"
  "mathml-contentmathml-error"
  "mathml-anno-noname-error"
  "mathml-anno-name-error"
  "mathml-anno-encoding-error"
  "mathml-anno-xhtml-encoding-error"
  "obsolete-typemustmatch-error"
  "obsolete-contextmenu-error"
  "obsolete-dropzone-error"
  "obsolete-keygen-error"
  "obsolete-menu-features-error"
  "obsolete-pubdate-error"
  "obsolete-seamless-error"
  "attrs-custom-ns-reserved-error"
  "aria-describedAt-error"
  "schematron-error"
  "epubtype-disallowed-error"
  "svg-foreignObject-with-body-error"
  "svg-foreignObject-html-invalid-error"
  "svg-foreignObject-not-flow-content-error"
  "svg-title-content-not-html-error"
  "svg-title-content-invalid-html-error"
)

XHTML_WARNINGS=(
  "title-missing-warning"
  "ssml-empty-ph-warning"
  "url-unregistered-scheme-warning"
  "aria-roles-li-deprecated-warning"
)

XHTML_USAGE=(
  "discouraged-base-warning"
  "discouraged-embed-warning"
  "discouraged-rp-warning"
  "epubtype-unknown-usage"
  "epubtype-deprecated-usage"
  "epubtype-misuse-usage"
  "mathml-noalt-usage"
  "svg-invalid-usage"
  "link-alt-style-tags-conflict-usage"
  "ns-epub-unknown-info"
)

XHTML_SWITCH_TRIGGER=(
  "switch-deprecated-warning"
  "switch-mathml-error"
  "switch-default-before-case-error"
  "switch-multiple-default-error"
  "switch-no-case-error"
  "switch-no-default-error"
  "switch-no-case-namespace-error"
  "trigger-deprecated-warning"
  "trigger-badrefs-error"
)

for name in "${XHTML_VALID[@]}"; do
  src="$JAVA_CONTENT_DIR/${name}.xhtml"
  out="$FIXTURES_DIR/valid/${name}.epub"
  if [ -f "$src" ]; then
    echo "  Building $out"
    build_single_xhtml_epub "$src" "$out"
  else
    echo "  WARNING: Source not found: $src"
  fi
done

for name in "${XHTML_ERRORS[@]}"; do
  src="$JAVA_CONTENT_DIR/${name}.xhtml"
  out="$FIXTURES_DIR/invalid/content/${name}.epub"
  if [ -f "$src" ]; then
    echo "  Building $out"
    build_single_xhtml_epub "$src" "$out"
  else
    echo "  WARNING: Source not found: $src"
  fi
done

for name in "${XHTML_WARNINGS[@]}"; do
  src="$JAVA_CONTENT_DIR/${name}.xhtml"
  out="$FIXTURES_DIR/warnings/${name}.epub"
  if [ -f "$src" ]; then
    echo "  Building $out"
    build_single_xhtml_epub "$src" "$out"
  else
    echo "  WARNING: Source not found: $src"
  fi
done

for name in "${XHTML_USAGE[@]}"; do
  src="$JAVA_CONTENT_DIR/${name}.xhtml"
  out="$FIXTURES_DIR/valid/${name}.epub"
  if [ -f "$src" ]; then
    echo "  Building $out"
    build_single_xhtml_epub "$src" "$out"
  else
    echo "  WARNING: Source not found: $src"
  fi
done

for name in "${XHTML_SWITCH_TRIGGER[@]}"; do
  src="$JAVA_CONTENT_DIR/${name}.xhtml"
  out="$FIXTURES_DIR/invalid/content/${name}.epub"
  if [ -f "$src" ]; then
    echo "  Building $out"
    build_single_xhtml_epub "$src" "$out"
  else
    echo "  WARNING: Source not found: $src"
  fi
done

echo ""
echo "=== Building Content Document fixtures (single-file SVG) ==="

SVG_VALID=(
  "ns-custom-valid"
  "data-attribute-valid"
  "font-face-empty-valid"
  "link-valid"
  "image-fragment-valid"
  "style-no-type-valid"
  "rdf-valid"
  "foreignObject-valid"
  "foreignObject-requiredExtensions-valid"
  "title-content-valid"
  "aria-attributes-valid"
  "epubtype-valid"
)

SVG_ERRORS=(
  "id-duplicate-error"
  "id-invalid-error"
  "foreignObject-not-html-error"
  "foreignObject-not-flow-content-error"
  "foreignObject-multiple-body-error"
  "foreignObject-html-invalid-error"
  "title-content-not-html-error"
  "title-content-invalid-html-error"
  "epubtype-not-allowed-error"
  "unknown-epub-attribute-error"
)

SVG_USAGE=(
  "svg-invalid-usage"
  "link-label-valid"
)

for name in "${SVG_VALID[@]}"; do
  src="$JAVA_CONTENT_DIR/${name}.svg"
  out="$FIXTURES_DIR/valid/${name}-svg.epub"
  if [ -f "$src" ]; then
    echo "  Building $out"
    build_single_svg_epub "$src" "$out"
  else
    echo "  WARNING: Source not found: $src"
  fi
done

for name in "${SVG_ERRORS[@]}"; do
  src="$JAVA_CONTENT_DIR/${name}.svg"
  out="$FIXTURES_DIR/invalid/content/${name}-svg.epub"
  if [ -f "$src" ]; then
    echo "  Building $out"
    build_single_svg_epub "$src" "$out"
  else
    echo "  WARNING: Source not found: $src"
  fi
done

for name in "${SVG_USAGE[@]}"; do
  src="$JAVA_CONTENT_DIR/${name}.svg"
  out="$FIXTURES_DIR/valid/${name}-svg.epub"
  if [ -f "$src" ]; then
    echo "  Building $out"
    build_single_svg_epub "$src" "$out"
  else
    echo "  WARNING: Source not found: $src"
  fi
done

echo ""
echo "=== Building D-vocabulary fixtures ==="

JAVA_DVOCAB_DIR="../epubcheck/src/test/resources/epub3/D-vocabularies/files"

DVOCAB_ERRORS=(
  # meta-properties errors
  "metadata-meta-authority-refines-disallowed-error"
  "metadata-meta-authority-no-term-error"
  "metadata-meta-authority-cardinality-error"
  "metadata-meta-collection-refines-non-collection-error"
  "metadata-meta-collection-type-refines-missing-error"
  "metadata-meta-collection-type-refines-non-collection-error"
  "metadata-meta-collection-type-cardinality-error"
  "metadata-meta-display-seq-cardinality-error"
  "metadata-meta-file-as-cardinality-error"
  "metadata-meta-group-position-cardinality-error"
  "metadata-meta-identifier-type-refines-disallowed-error"
  "metadata-meta-identifier-type-cardinality-error"
  "metadata-meta-role-refines-disallowed-error"
  "metadata-meta-source-of-value-unknown-error"
  "metadata-meta-source-of-refines-missing-error"
  "metadata-meta-source-of-refines-not-dcsource-error"
  "metadata-meta-source-of-cardinality-error"
  "metadata-meta-term-refines-disallowed-error"
  "metadata-meta-term-no-authority-error"
  "metadata-meta-term-cardinality-error"
  "metadata-meta-title-type-refines-disallowed-error"
  "metadata-meta-title-type-cardinality-error"
  # link-rel errors
  "link-rel-alternate-with-other-keyword-error"
  "link-rel-record-mediatype-missing-error"
  "link-rel-record-refines-error"
  "link-rel-voicing-as-publication-metadata-error"
  "link-rel-voicing-mediatype-missing-error"
  "link-rel-voicing-mediatype-not-audio-error"
)

DVOCAB_WARNINGS=(
  "metadata-meta-meta-auth-deprecated-warning"
  "link-rel-record-deprecated-warning"
  "link-rel-xml-signature-deprecated-warning"
)

DVOCAB_VALIDS=(
  "metadata-meta-authority-valid"
  "metadata-meta-collection-valid"
  "metadata-meta-display-seq-valid"
  "metadata-meta-file-as-valid"
  "metadata-meta-group-position-valid"
  "metadata-meta-pageBreakSource-valid"
  "metadata-meta-role-valid"
  "metadata-meta-source-of-valid"
  "metadata-meta-term-valid"
  "metadata-meta-title-type-valid"
  "link-rel-acquire-valid"
  "link-rel-alternate-valid"
  "link-rel-record-local-valid"
  "link-rel-record-remote-valid"
  "link-rel-record-with-other-keyword-valid"
  "link-rel-record-properties-valid"
  "link-rel-voicing-valid"
)

for name in "${DVOCAB_ERRORS[@]}"; do
  src="$JAVA_DVOCAB_DIR/${name}.opf"
  out="$FIXTURES_DIR/invalid/opf/${name}.epub"
  if [ -f "$src" ]; then
    echo "  Building $out"
    build_opf_epub "$src" "$out"
  else
    echo "  WARNING: Source not found: $src"
  fi
done

for name in "${DVOCAB_WARNINGS[@]}"; do
  src="$JAVA_DVOCAB_DIR/${name}.opf"
  out="$FIXTURES_DIR/warnings/${name}.epub"
  if [ -f "$src" ]; then
    echo "  Building $out"
    build_opf_epub "$src" "$out"
  else
    echo "  WARNING: Source not found: $src"
  fi
done

for name in "${DVOCAB_VALIDS[@]}"; do
  src="$JAVA_DVOCAB_DIR/${name}.opf"
  out="$FIXTURES_DIR/valid/${name}.epub"
  if [ -f "$src" ]; then
    echo "  Building $out"
    build_opf_epub "$src" "$out"
  else
    echo "  WARNING: Source not found: $src"
  fi
done

echo ""
echo "=== Building 03-resources fixtures ==="

JAVA_RESOURCES_DIR="../epubcheck/src/test/resources/epub3/03-resources/files"

RESOURCES_OPF_VALIDS=(
  "resources-core-media-types-valid"
  "resources-remote-audio-valid"
  "fallback-to-xhtml-valid"
  "fallback-to-svg-valid"
  "fallback-chain-valid"
  "xml-encoding-utf8-declared-valid"
  "xml-encoding-utf8-BOM-valid"
  "xml-encoding-utf8-no-declaration-valid"
)

RESOURCES_OPF_ERRORS=(
  "fallback-missing-error"
  "fallback-chain-circular-error"
  "conformance-xml-malformed-error"
  "conformance-xml-undeclared-namespace-error"
  "data-url-in-manifest-item-error"
  "data-url-in-manifest-item-in-spine-error"
  "data-url-in-package-link-error"
  "file-url-in-package-document-error"
)

for name in "${RESOURCES_OPF_VALIDS[@]}"; do
  src="$JAVA_RESOURCES_DIR/${name}.opf"
  out="$FIXTURES_DIR/valid/${name}.epub"
  if [ -f "$src" ]; then
    echo "  Building $out"
    build_opf_epub "$src" "$out"
  else
    echo "  WARNING: Source not found: $src"
  fi
done

for name in "${RESOURCES_OPF_ERRORS[@]}"; do
  src="$JAVA_RESOURCES_DIR/${name}.opf"
  out="$FIXTURES_DIR/invalid/content/${name}.epub"
  if [ -f "$src" ]; then
    echo "  Building $out"
    build_opf_epub "$src" "$out"
  else
    echo "  WARNING: Source not found: $src"
  fi
done

# XHTML single-file fixtures for data/file URL tests
RESOURCES_XHTML_ERRORS=(
  "data-url-in-html-a-href-error"
  "data-url-in-html-area-href-error"
  "data-url-in-svg-a-href-error"
  "file-url-in-xhtml-content-error"
)

for name in "${RESOURCES_XHTML_ERRORS[@]}"; do
  src="$JAVA_RESOURCES_DIR/${name}.xhtml"
  out="$FIXTURES_DIR/invalid/content/${name}.epub"
  if [ -f "$src" ]; then
    echo "  Building $out"
    build_single_xhtml_epub "$src" "$out"
  else
    echo "  WARNING: Source not found: $src"
  fi
done

# SVG single-file fixture for file URL test
RESOURCES_SVG_ERRORS=(
  "file-url-in-svg-content-error"
)

for name in "${RESOURCES_SVG_ERRORS[@]}"; do
  src="$JAVA_RESOURCES_DIR/${name}.svg"
  out="$FIXTURES_DIR/invalid/content/${name}.epub"
  if [ -f "$src" ]; then
    echo "  Building $out"
    build_single_svg_epub "$src" "$out"
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
echo "Total XHTML valid: ${#XHTML_VALID[@]}"
echo "Total XHTML errors: ${#XHTML_ERRORS[@]}"
echo "Total XHTML warnings: ${#XHTML_WARNINGS[@]}"
echo "Total XHTML usage: ${#XHTML_USAGE[@]}"
echo "Total XHTML switch/trigger: ${#XHTML_SWITCH_TRIGGER[@]}"
echo "Total SVG valid: ${#SVG_VALID[@]}"
echo "Total SVG errors: ${#SVG_ERRORS[@]}"
echo "Total SVG usage: ${#SVG_USAGE[@]}"
echo "Total D-vocabulary errors: ${#DVOCAB_ERRORS[@]}"
echo "Total D-vocabulary warnings: ${#DVOCAB_WARNINGS[@]}"
echo "Total D-vocabulary valid: ${#DVOCAB_VALIDS[@]}"
echo "Total Resources OPF valid: ${#RESOURCES_OPF_VALIDS[@]}"
echo "Total Resources OPF errors: ${#RESOURCES_OPF_ERRORS[@]}"
echo "Total Resources XHTML errors: ${#RESOURCES_XHTML_ERRORS[@]}"
echo "Total Resources SVG errors: ${#RESOURCES_SVG_ERRORS[@]}"
