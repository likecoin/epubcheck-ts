# Third-party notices

`@likecoin/epubcheck-ts` is licensed under the BSD 3-Clause License (see
[LICENSE](./LICENSE)). It also contains, and redistributes in its published
`dist/` bundle, material derived from the works below. Each carries its own
copyright notice and license terms, reproduced here as those terms require.
This file must accompany any redistribution of this software.

---

## 1. W3C EPUBCheck — BSD 3-Clause License

<https://github.com/w3c/epubcheck>

The following material is taken from, or derived from, the Java EPUBCheck
project:

- **RELAX NG schemas** bundled in `schemas/` and embedded (gzipped) in the
  published bundle: `container.rng`, `datatypes.rng`, `epub-mathml3-inc.rng`,
  `epub-nav-30.rnc`, `epub-nav-30.rng`, `epub-prefix-attr.rng`,
  `epub-shared-inc.rng`, `epub-ssml-attrs.rng`, `epub-svg-30.rnc`,
  `epub-svg-30.rng`, `epub-svg-forgiving-inc.rng`, `epub-switch.rng`,
  `epub-trigger.rng`, `epub-type-attr.rng`, `epub-xhtml-30.rnc`,
  `epub-xhtml-30.rng`, `epub-xhtml-inc.rng`, `epub-xhtml-integration.rng`,
  `epub-xhtml-svg-mathml.rng`, `ncx.rng`, `ocf-container-30.rnc`,
  `ocf-container-30.rng`, `opf.rng`, `opf20.rng`, `package-30.rnc`,
  `package-30.rng`. Most are converted from EPUBCheck's RELAX NG compact
  (`.rnc`) sources and have their `<include>` directives inlined. A few carry
  small local edits — `opf20.rng`, for one, gains a `<start>` element so it can
  be used as a standalone grammar — but the grammars themselves are unchanged.
- **The message catalogue** in `src/messages/messages.ts`: message identifiers
  (`RSC-005`, `OPF-014`, …), their default severities and their wording follow
  EPUBCheck's `MessageBundle.properties`, so that both tools report the same
  problem under the same name.
- **Test fixtures and test scenarios** under `test/` are ported from
  EPUBCheck's test suite and test EPUBs. These are not part of the published
  package.

```
Copyright © 2007 Adobe Systems Incorporated
Copyright © 2008 IDPF
Copyright © 2017 W3C (MIT, ERCIM, Keio, Beihang)

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

---

## 2. RELAX NG Schema for (X)HTML 5 — MIT License

<https://github.com/validator/validator> (the Nu Html Checker)

These modules reach this project through EPUBCheck, which bundles them as the
basis of its EPUB 3 XHTML Content Document grammar. The following files in
`schemas/` are converted from those `.rnc` sources: `applications.rng`,
`aria.rng`, `block.rng`, `common.rng`, `core-scripting.rng`, `data.rng`,
`embed.rng`, `form-datatypes.rng`, `media.rng`, `meta.rng`, `microdata.rng`,
`phrase.rng`, `rdfa.rng`, `revision.rng`, `ruby.rng`, `sectional.rng`,
`structural.rng`, `tables.rng`, `web-components.rng`, `web-forms.rng`,
`web-forms2.rng`. Their content is also inlined into the generated
`epub-xhtml-30.rng` and `epub-nav-30.rng`.

```
Copyright (c) 2005-2007 Elika J. Etemad (fantasai) and Henri Sivonen (hsivonen)
Copyright (c) 2007-2012 Mozilla Foundation

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

---

## 3. MathML 3 and SVG 1.1 schemas — W3C Software Notice and License

The MathML 3 modules — `mathml3-common.rng`, `mathml3-content.rng`,
`mathml3-inc.rng`, `mathml3-presentation.rng`, `mathml3-strict-content.rng` —
and the SVG 1.1 modules inlined into `epub-svg-30.rng` and
`epub-xhtml-30.rng` are used and distributed under the W3C Software Notice and
License. They carry these notices, which remain present inside the schema files
themselves:

```
Copyright 1998-2010 W3C (MIT, ERCIM, Keio)
Copyright 2012 Mozilla Foundation
Copyright 2014-2019 W3C (MIT, ERCIM, Keio, Beihang)

Copyright 1998-2014 W3C (MIT, ERCIM, Keio, Beihang)

Use and distribution of this code are permitted under the terms of the
W3C Software Notice and License
http://www.w3.org/Consortium/Legal/2002/copyright-software-20021231
```

---

## 4. Runtime dependencies

These are declared dependencies, installed by the package manager with their
own license files; they are not bundled into `dist/`.

| Package | License |
| --- | --- |
| [css-tree](https://github.com/csstree/csstree) | MIT |
| [fflate](https://github.com/101arrowz/fflate) | MIT |
| [libxml2-wasm](https://github.com/jameslan/libxml2-wasm) | MIT |
