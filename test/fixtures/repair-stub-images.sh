#!/usr/bin/env bash
# Replace header-only placeholder images inside built fixtures with the real
# 1x1 images in assets/.
#
# Usage: bash test/fixtures/repair-stub-images.sh
#
# The original stubs were a 22-byte JPEG (SOI + APP0 + EOI, no SOF segment) and
# an 8-byte PNG signature (no IHDR). Neither carries dimensions, so Java's
# ImageIO cannot read them and EPUBCheck reports PKG-021 on every fixture that
# contains one. build-fixtures.sh no longer emits them; this repairs the EPUBs
# that were built before that change.
#
# Entries are updated in place rather than by rebuilding the archive, so the
# stored-first `mimetype` entry and every other entry's bytes are preserved.
set -euo pipefail

FIXTURES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ASSETS="$FIXTURES_DIR/assets"

# A complete 1x1 GIF is 43 bytes and a complete 1x1 PNG is 70, so a threshold of
# 200 sits above every real image we ship while still catching both stubs.
MAX_STUB_BYTES=200

# python3 reads the central directory directly; `unzip -l` mangles non-ASCII
# entry names in the fixtures that exist to test filename handling.
list_stubs() {
  python3 - "$MAX_STUB_BYTES" "$FIXTURES_DIR" <<'PY'
import os, sys, zipfile
limit, root = int(sys.argv[1]), sys.argv[2]
for dirpath, _, filenames in sorted(os.walk(root)):
    for name in sorted(filenames):
        if not name.endswith('.epub'):
            continue
        path = os.path.join(dirpath, name)
        try:
            with zipfile.ZipFile(path) as zf:
                infos = zf.infolist()
        except zipfile.BadZipFile:
            continue  # fixtures that are deliberately corrupt archives
        for info in infos:
            ext = info.filename.rsplit('.', 1)[-1].lower()
            if ext in ('jpg', 'jpeg', 'png') and info.file_size < limit:
                print('%s\t%s' % (path, info.filename))
PY
}

count=0
list_stubs | while IFS="$(printf '\t')" read -r epub entry; do
  ext=$(printf '%s' "${entry##*.}" | tr '[:upper:]' '[:lower:]')
  case "$ext" in
    jpg | jpeg) src="$ASSETS/stub.jpg" ;;
    png) src="$ASSETS/stub.png" ;;
    *) continue ;;
  esac

  tmpdir=$(mktemp -d)
  mkdir -p "$tmpdir/$(dirname "$entry")"
  cp "$src" "$tmpdir/$entry"
  (cd "$tmpdir" && zip -X9 -q "$epub" "$entry")
  rm -rf "$tmpdir"

  count=$((count + 1))
  echo "  ${epub#"$FIXTURES_DIR/"} <- $entry"
done

echo "done"
