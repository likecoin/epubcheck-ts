[**epubcheck-ts**](../README.md)

***

[epubcheck-ts](../globals.md) / EPUB\_PROFILES

# Variable: EPUB\_PROFILES

> `const` **EPUB\_PROFILES**: readonly \[`"default"`, `"dict"`, `"edupub"`, `"idx"`, `"preview"`\]

Defined in: types.ts:25

EPUB validation profiles

Declared as a runtime list first, like EPUB_VERSIONS above, so callers that
must validate user input have something to check against. Left as a bare
union, every such caller hand-copied the members: the CLI and the parity
harness each grew their own list, and a profile added here would have been
silently rejected by both.
