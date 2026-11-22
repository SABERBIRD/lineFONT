# Integration

Install the versioned release in a Node or browser bundler project.

```sh
npm install https://github.com/SABERBIRD/lineFONT/releases/download/v0.0.1/saberbird-linefont-0.0.1.tgz
```

```ts
import { layout, parseFont } from "@saberbird/linefont";
import sample from "@saberbird/linefont/fonts/bagling-ua-en";

const font = parseFont(JSON.stringify(sample));
const result = layout([font], {
  text: "Ґрунт / Ground",
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

## Layout and editing contract

Pass the whole visible string and an ordered stack of immutable fonts. The JS
binding caches the active stack by array identity. To edit a font, replace the
changed font object and pass a new array. An explicit call to `rankFonts`
suggests a new order based on occurrences in the text. Import appends to the
stack so that existing glyphs keep their source. Keep a manually chosen order
while typing.

Normalize CRLF and CR to LF before mapping textarea selections or style runs.
Offsets count UTF-16 code units in that visible string. Interior offsets of a
grapheme share its starting caret. A missing cluster keeps its original text
and offsets, appears in `missing`, and can acquire geometry when a font is added.

Each placed glyph reports its source font index, source range, line, advance,
style and cell origin. Its M/L/C commands already include placement. Draw the
commands in object-local coordinates, applying the object transform once.
`width`, `height` and `lines` describe the logical layout; `bounds` also
encloses stroke control points. Use the returned carets for editing and the
same layout for screen rendering, measurements and vector export.

## Native request lifecycle

Build the native library with `cargo build --manifest-path core/Cargo.toml
--locked --release`. On each calling thread, send a `fonts` request before
`layout` or `rank`. A successful `fonts` request replaces that thread's active
catalog. Reactivate the desired stack when switching between documents on one
thread. Rust callers can keep separate `Engine` instances.

| Request to lint_call | Value inside the ok response |
| --- | --- |
| `{"op":"fonts","fonts":[...]}` | Validated fonts and their fingerprints under `fonts` |
| `{"op":"rank","text":"ҐA"}` | Ranked indices in the active stack |
| `{"op":"layout","text":"ҐA","height":4,"lineHeight":7.2,"top":1.2}` | Placed glyphs, metrics, carets and missing clusters |

Pass a readable buffer and its exact UTF-8 byte length. Decode the returned
buffer using its length, handle the JSON `error` response and free every result
once with `lint_free(pointer, length)`, including error results.
`lint_request` packs a pointer and length for WASM. Native callers receive
the two fields directly from `lint_call`. See [the ABI header](../core/include/linefont.h).

## bagLING integration profile

At extraction, bagLING routed Canvas, the editing overlay and SVG/PDF through
one adapter. The application's initial cap height is 4 mm, line step 7.2 mm,
letter spacing zero and stroke thickness 0.2 mm. Physical dimensions shown in
the editor account for the axes of the object's text transform. Resizing text
proportionally adjusts the line step and rounds it to the nearest 0.5 mm.
Increment buttons preserve exact halves and truncate other fractions before a
0.5 mm step. Direct input accepts fractions.

The editor embeds complete fonts, including its default, in the document's
`fontCatalog`. Each text object's `fontRefs` preserves fallback order.
Deduplicate by normalized content, using the fingerprint as a lookup index.
Different contents with equal author IDs coexist. The standalone integration
commit used document schema 21, a maximum of 1024 catalog entries and stacks
of 1–64 references. Invalid references are rejected. Older supported documents
can contain inline fonts. On load, reconstruct the ordered stacks and share
arrays for identical orders. The Ukrainian/English font is the default and the
Greek font can be appended explicitly.

The host decodes Markdown emphasis into visible text and temporary UTF-16 style
runs. Keep source punctuation and unedited markup when changing metrics.
Alignment belongs to the whole block. The editor owns selection, hit testing,
label layers, panel placement, defaults, snapping, keyboard focus and history.
An editing session previews changes immediately and commits once. Enter adds
a line, Ctrl+Enter finishes editing, and switching windows preserves the draft.
Notes use the initial font. The editor owns its notes UI and document migrations.

The conversion tool targets the original bagLING font source. It expands H/V/Q
and the bullet into supported paths and fills the atomic groups. A consumer can
use the packaged WASM synchronously without fetching another asset. Rebuilding
identical bytes requires the pinned Rust toolchain, Cargo.lock and build flags.

## Inspect a font

Generate an SVG specimen from a source checkout after running `npm run build`.
Each page shows up to 40 glyphs at a shared scale with a fixed origin and baseline.
The orange outline encloses each glyph’s strokes using exact cubic extrema.
Advance space, anchors and other glyphs do not enlarge this outline. Empty glyphs
have no outline. Every card keeps a shared scale, origin and baseline across pages.
The green line marks each glyph’s own advance.

The optional sample shows the requested text at 4 mm cap height at actual print size
and lists missing clusters. Omit the sample for a glyph-only sheet. An empty string
lets you choose another page without adding a sample.

```sh
npm run --silent font:preview -- font.lint > specimen.svg
npm run --silent font:preview -- font.lint 'Sample 0123' 2 > page-2.svg
```

For an interactive, offline preview, generate an HTML file and open it directly in
a browser with JavaScript and WebAssembly enabled. A file preview that blocks
scripts can display the glyph cards.

```sh
npm run --silent font:preview -- --html fonts/bagLING-UA-EN/bagLING-UA-EN.lint > specimen.html
```

Search the curated list of 19 Latin, Cyrillic, and Greek language profiles by
English name, native name, or language identifier. Each profile provides a short
technical phrase about cutting, width, and angle. Translations are draft samples
open to corrections from native speakers. Edit the JSON catalog to contribute
another language. The editable sample reports missing grapheme clusters.
On screen the cap height defaults to 28 CSS pixels and can be adjusted from 12 to
96 pixels, with wrapping to the available width. Missing clusters and their Unicode
codes appear in a copyable list. Download the current sample as SVG using the
preview’s displayed size and line breaks.
The installed CLI accepts the same options as `linefont-preview`.

Use **Open a local .lint font** to replace the current font after core validation.
The sample text and screen size are preserved. Invalid files report the error and
keep the previous font available. The file limit is 8 MB.
Glyph cards support page navigation and filtering by a literal character or a
hexadecimal code, such as Ґ, 0490, or U+0490. The same renderer generates the CLI
SVG and the browser cards, including their stroke bounds and shared baseline.

Select a glyph using **Inspect a glyph**, click its card, or focus its card and
press Enter or Space. The enlarged view has independent switches for strokes
and bounds, direction arrows, control points, advance guides, and anchors.
The blue horizontal guide is the baseline; coordinates follow the layout’s
cap-top coordinate system. Alias and composite metadata appear beside the view.

Use **Compare with another .lint font** to load a second font independently.
Both samples use the same text, cap height, line height, wrap width, and the
primary font’s requested style. Each font reports its own missing clusters.
Samples are laid out independently. Invalid replacement files keep
the last valid comparison. **Download sample SVG** saves the primary sample.

Controls provide visible keyboard focus and touch targets of at least 44 CSS px.
Glyph sheets scroll within their own region on narrow screens; browser zoom is
enabled. A static message remains visible when scripts are disabled. The current
CI browser check exercises a 320 px touch viewport and a desktop viewport in Chrome.
Real-device Android and iOS file selection, zoom, clipboard, and SVG download
remain pending physical verification.
