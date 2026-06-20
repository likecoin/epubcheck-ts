import { beforeAll } from 'vitest';
import { loadXmlEngine } from '../src/util/xml-engine.js';

// The libxml2-wasm engine is lazy-loaded and normally initialized by the async
// EpubCheck entry points. Unit tests that drive the synchronous validators
// (NCX/SMIL/SKM/Content) or XMLParser directly bypass those entry points, so
// load the engine once before any test file runs.
beforeAll(async () => {
  await loadXmlEngine();
});
