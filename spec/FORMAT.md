# Linefont .lint format

The extended geometry profile uses `linefont/0.0.2`. The original profile uses
`linefont/1`. The extension .lint comes from LInefoNT. Each UTF-8 JSON file
without a BOM contains one font, which may consist of a single letter.
Geometry describes pen centerlines. The initial scope covers Latin, Cyrillic,
Greek and technical symbols.

## Metadata and identity

Required fields are `format`, `id`, `name`, `version`, `authors`, `style`,
`metrics` and `glyphs`. Valid styles are `upright` and `italic`. The optional
`license` field accepts an SPDX expression. Redistribution requires
permission. Additional fields may include `description`, `languages`,
`scripts`, `family` and `x-…` extensions.

The ID is a stable label assigned by the author, such as
`SABERBIRD/BaglingSingleLine01`. Keep it when updating a font and change the
version. Independent forks should choose another ID. IDs are locally assigned
and may collide. Applications should allow different contents with the same
ID or version to coexist. The reference implementation indexes normalized
JSON with SHA-256 and compares the full normalized contents for deduplication.
The first integration references fonts by position in the saved list.

OpenType provides a string identifier in name ID 3, alongside family, style
and PostScript names. Font identifiers have no mandatory universal UUID
registry. [OpenType naming table](https://learn.microsoft.com/en-us/typography/opentype/spec/name)

## Metrics and geometry

`metrics.capHeight` is the positive capital height in font coordinates.
`baseline` gives the baseline Y coordinate. X increases rightward and Y
downward. The cap top is `baseline - capHeight`. `defaultAdvance` is the
nonnegative advance for glyphs without an explicit `advance`. The glyph
origin lies on the left reference line. Advance moves the origin for the next
character. Strokes may extend beyond it, particularly for marks and
overhangs. Empty glyphs such as spaces may have positive advance.

Curve extrema give exact ink bounds. Control points give conservative bounds.
The reference layout's `bounds` includes the control points and the logical
text rectangle. At capital height H, the scale is H divided by capHeight.
The baseline of a laid-out line is top + H plus the zero-based line number
times line height. Fonts may store additional metrics.

Each `glyphs` key is a Unicode scalar value in uppercase hexadecimal with
at least four digits, such as `0041`, `0407` or `1F600`. Surrogates are
invalid. Missing and shared glyphs preserve the input text's Unicode values.

A glyph has exactly one of these representations.

- `d` gives an absolute SVG path. The original profile supports `M`, `L`
  and `C`. Preserve stroke order and direction. `M` moves the pen without
  drawing. `L` draws a line and `C` draws a cubic Bézier with two control
  points. Close a path with an explicit line or curve back to its start.
  The device controller handles pen movement, routing and physical stroke
  width. Paths are unfilled. Empty `d` is valid for glyphs such as spaces.
- `alias` gives another glyph's Unicode key in the same file.
- `composite` gives a list of components such as
  `{ "code": "0406", "x": 0, "y": 0 }`. Offsets use font units. The
  first component supplies the advance unless the glyph specifies one.

The following example uses `linefont/1`, published with library 0.0.1.
The file's `version` describes this particular font. [Extended curve example](../examples/Curves.lint)

```json
{
  "format": "linefont/1",
  "id": "author/example",
  "name": "Example",
  "version": "0.1.0",
  "authors": ["Author"],
  "style": "upright",
  "metrics": { "capHeight": 10, "baseline": 10, "defaultAdvance": 8 },
  "glyphs": {
    "0406": {
      "d": "M4 0 L4 10",
      "anchors": { "top": { "x": 4, "y": -1 } }
    },
    "0308": {
      "d": "M-1 -1 L-1 -0.8 M1 -1 L1 -0.8",
      "advance": 0,
      "attach": { "x": 0, "y": 0 },
      "anchors": { "top": { "x": 0, "y": -3 } }
    }
  }
}
```

References must be acyclic and at most 32 levels deep. Unknown extra fields
are preserved on the font, metrics and glyph records and have no effect on
drawing. Extensions cannot override core fields.

## Six blocks

| Block | Complete set |
| --- | --- |
| Digits | `0 1 2 3 4 5 6 7 8 9` |
| Punctuation and dashes | `. , : ; … ! ? - – —` |
| Brackets | `( ) [ ] { }` |
| Quotation marks | `' " « » ‘ ’ ‚ “ ” „` |
| Mathematical and technical symbols | `+ − × ÷ = < > ≤ ≥ ≠ ≈ ± ∓ * / % ‰ ° ′ ″ ⌀` |
| Free | Remaining Unicode characters in any quantity |

A file includes each of the first five blocks in full or omits it entirely.
Unicode code points determine membership. Aliases and explicit composites
count toward completeness. Automatically composed glyphs are excluded from
this count. Space lies outside these blocks. Free characters may be supplied
individually, for example Ґ. U+02BC and U+2019 are distinct. U+002D, U+2013
and U+2014 are distinct from the mathematical minus U+2212.

Glyph keys describe explicit coverage. Composition can extend layout
coverage. The `languages` and `scripts` metadata describe intended use.
Authors can list verified alphabets in the font description. The block
sets are fixed for `linefont/1`. Previously valid files must remain valid
within the same format version.

## Fallback and diacritics

The engine visits fonts in stack order. In each font it looks for a ready
glyph, then tries canonical Unicode composition before moving on. The first
font that supplies a complete block supplies its symbols. A partial block
cannot be supplied through the free group.

The engine segments text into grapheme clusters and uses NFC for lookup.
Original characters and UTF-16 ranges are preserved. When a ready glyph is
missing, NFD identifies the base and combining marks. Components come from
one font. Visually similar letters in other scripts are distinct.

Automatic positioning handles combining classes 230 (`top`), 220 and 202
(`bottom`). The base supplies the corresponding `anchors` entry and the
mark supplies `attach`. The mark offset equals the base anchor minus
`attach`. A mark can supply the next anchor. Other classes require an
explicit `composite` or a ready glyph. Dot removal on i requires a ready
glyph or an explicit recipe using the appropriate Unicode base.

Missing clusters appear as boxes and are listed in `missing`. Indices are
computed after normalizing CRLF and standalone CR to LF. NFC lookup leaves
these indices intact. Ranking greedily picks the font covering the most
occurrences of uncovered clusters and preserves the previous order for ties.
Manual order takes precedence.

## Reference implementation limits

A stack can contain 64 fonts. Limits include 8 MB per imported file,
20,000 glyphs per font, 10,000 commands per expanded glyph, 200,000
commands per font and 200,000 component visits during validation. Text
layout is limited to 100,000 UTF-16 units and 2,000,000 commands. WASM
JSON requests are limited to 16 MB. Coordinates must be finite with
absolute values no greater than 1,000,000.

Kerning, complex shaping, language-specific forms, language-profile
validation and full SVG import are outside the current implementation.
`italic` describes the stored geometry. The caller sets stroke
thickness, size and line height.

## Style and layout

The optional `family` links upright and italic variants. Matching IDs alone
do not establish a family. For italic text, the library searches for an
italic variant in the relevant family. If none exists, it shears the
centerlines 15° from vertical around the baseline. Authored italics keep
their original angle. Without an upright variant, authored italics keep
their geometry for upright requests.

Layout accepts height, line height, additional grapheme spacing and left,
center, right or justified alignment. Justification requires `wrapWidth`
and expands inner spaces only on soft-wrapped lines. Final lines, explicit
line breaks and lines without inner spaces keep their spacing. Other modes
use the longest line as the reference width when `wrapWidth` is absent.

UTF-16 `styleRuns` apply upright or italic style to visible text without
moving components between fonts or altering character codes. Runs must be
sorted and nonoverlapping, with at most 10,000 entries. Applications parse
their own Markdown or other markup into text and ranges before layout.

A fixed width accounts for left and right overhangs after synthetic shear.
The overhang allowance occupies at most half the width. Wrapping and
alignment use the remainder. If a single grapheme exceeds the whole width,
horizontal scaling fits its line and caret positions while preserving
all strokes.

[Standard contributions](CONTRIBUTIONS.md) · [Conformance fixtures](../examples/conformance/)

## Geometry in linefont/0.0.2

Set `"format": "linefont/0.0.2"` for extended paths.

| Command | Parameters | Geometry |
| --- | --- | --- |
| M, L | x y | Pen move or straight segment |
| Q | cx cy x y | Quadratic Bézier |
| T | x y | Q/T continuation with reflected control point |
| C | cx1 cy1 cx2 cy2 x y | Cubic Bézier |
| S | cx2 cy2 x y | C/S continuation with reflected first control point |
| A | rx ry rotation largeArc sweep x y | SVG endpoint elliptical arc |

After a command from another family, T and S use the current point as the
first control point. A sequence of cubics forms a piecewise Bézier spline.
Arc radii are nonnegative, rotation is in degrees and both flags are 0 or 1.
SVG sweep and proportional radius correction rules apply. A zero radius
produces a line. Coincident endpoints skip the arc. Equal radii produce a
circle, which needs at least two arcs for a full revolution.

[Example font](../examples/Curves.lint) · [Output profiles and tolerances](../docs/integration.md#geometry-profiles-in-the-development-version)

The [JSON Schema for both versions](linefont.schema.json) describes structure,
Unicode keys, metrics and mutually exclusive glyph representations. The core
also checks version-specific path grammar, finite coordinates, references,
cycles, block completeness and expanded limits. Schema string lengths count
characters. Core input resource limits count bytes.
