# Inspect a font

The preview CLI is part of the unreleased 0.0.2 checkout. From the repository root, run `npm ci` and `npm run build` with Node 22.12+. Try the bundled font first.

```sh
npm run --silent font:preview -- --html fonts/bagLING-UA-EN/bagLING-UA-EN.lint > specimen.html
```

Open `specimen.html` in your browser.

For a printable SVG, omit `--html`.
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
