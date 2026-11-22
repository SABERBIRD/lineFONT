# Integration

Install the versioned release in a Node or browser bundler project.

```sh
npm install https://github.com/SABERBIRD/lineFONT/releases/download/v0.0.1/saberbird-linefont-0.0.1.tgz
```

```ts
import { layout, parseFont } from '@saberbird/linefont';
import sample from '@saberbird/linefont/fonts/bagling-ua-en';

const font = parseFont(JSON.stringify(sample));
const result = layout([font], {
  text: 'Ґрунт / Ground',
  height: 4,
  lineHeight: 7.2,
  top: 1.2,
});
// result.glyphs contain M/L/C strokes in the chosen units.
```

The ESM package includes JavaScript, declarations and the WASM payload. Font data is imported separately. Use `rankFonts` to suggest a fallback order and `validateFonts` to validate a stack and get content fingerprints. Layout preserves UTF-16 ranges for text editing.

For Rust use `Engine::new`, `Engine::layout` and `Engine::rank` from the crate in `core/`. Native consumers can link the release library and include `core/include/linefont.h`. The C ABI accepts JSON requests through `lint_call` and releases result buffers with `lint_free`. See the header for signatures and [format](FORMAT.md) for resource limits.

Build from a checkout using Node 22.12+ and the Rust toolchain pinned in `core/rust-toolchain.toml`.

```sh
npm ci
node tools/convert-linefont.mjs
node tools/build-linefont.mjs
npm run build
npm run font:validate -- examples/SingleGlyph.lint
```

The Rust build normalizes local paths for reproducible WASM bytes. The font generator and its sources live in this repository. Use `npm pack` to create the distribution package.

## Inspect a font

Generate an SVG specimen from a source checkout after running `npm run build`.
Each page shows up to 40 glyphs at a shared scale with a fixed origin and baseline.
The dashed outline shows the layout bounds, including the logical advance space.
A card marks geometry or anchors that extend beyond its visible area.

The optional sample shows the requested text at 4 mm cap height at actual print size
and lists missing clusters. Omit the sample for a glyph-only sheet. An empty string
lets you choose another page without adding a sample.

```sh
npm run --silent font:preview -- font.lint > specimen.svg
npm run --silent font:preview -- font.lint 'Sample 0123' 2 > page-2.svg
```
