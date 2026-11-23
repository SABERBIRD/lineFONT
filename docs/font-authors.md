# Create or contribute a font

Start with [SingleGlyph.lint](../examples/SingleGlyph.lint). It contains Ґ under the Unicode key `0490`. Copy the file, give your font its own ID, name, version and credits, then edit the glyph's `d` centerline. The metrics set cap height, baseline and default advance in font units. The [format specification](../spec/FORMAT.md) defines paths, anchors and the five complete-or-absent groups.

Use `linefont/1` for M/L/C paths readable by release 0.0.1. Use `linefont/0.0.2` for paths with Q/T/S/A in release 0.0.2. [Curve example](../examples/Curves.lint) · [JSON Schema](../spec/linefont.schema.json)

From the 0.0.2 repository root with Node 22.12+, validate a working copy and inspect it.

```sh
npm ci
npm run build
cp examples/SingleGlyph.lint /tmp/my-font.lint
npm run font:validate -- /tmp/my-font.lint
npm run --silent font:preview -- /tmp/my-font.lint Ґ > specimen.svg
```

Open the SVG and check the stroke endpoints, baseline and advance. For a contribution, place the font and its README in a family directory under `fonts/`, and document coverage, license and provenance. [Ukrainian and English font](../fonts/bagLING-UA-EN/README.md) · [Contribution guide](../CONTRIBUTING.md) · [Interactive preview](preview.md)

## Draw a glyph from an SVG template

Open the font in the [offline preview](preview.md). Under **Glyph inspection**,
open **Glyph SVG template** and choose the primary font or the loaded comparison
font. Enter a character or a Unicode code such as `U+0490`, then download the SVG.
An existing glyph uses its own advance when defined. A new glyph uses the font's
default advance.

In an SVG editor, draw open centerline paths inside the `linefont-glyph` group.
The blue line is the baseline, the green line marks the advance, and the gray
lines mark the origin and cap top. The SVG uses font units with Y increasing
downward. Keep the metadata and viewBox when saving. To enter the glyph manually
in .lint, copy its centerline path data in font coordinates into the glyph's
`d` field, then validate the file. Use [SingleGlyph.lint](../examples/SingleGlyph.lint)
for a minimal font containing only Ґ.

A standalone glyph is valid for a free symbol. The five complete-or-absent
groups are digits, punctuation and dashes, brackets, quotation marks, and
mathematical and technical symbols. Give a new font its own metadata and include
the required credits and license. [Block rules](../spec/FORMAT.md#six-blocks) · [Contributing](../CONTRIBUTING.md)

## Import, proof and submit Ґ

1. Open the Ukrainian and English font in the offline preview built from the
   0.0.3 checkout. Download the template for `U+0490`.
2. Draw or edit a centerline path in the artwork group. For a reproducible
   example, add `<path d="M1 10 V1 H6 V0"/>` inside that group. In a vector
   editor, convert drawing objects to paths and keep their transforms.
3. Choose **Import edited glyph SVG** with the same font and code selected.
   Inspect the imported pen path and the proof with «Ґ Г ґ» and «ґвинт».
   For example, the contributed upper-case Ґ should retain the raised end
   and the other letters in the proof should come from the source font.
4. Download the validated .lint. Run `npm run font:validate -- path/to/font.lint`
   and put the updated font in its family directory. Include the edited SVG
   and a proof image in the pull request so reviewers can compare strokes.

The importer takes SVG paths and nested group transforms. Template user
coordinates are font units. SVG viewport dimensions in px, mm, cm, in, pt or pc
do not rescale the path coordinates. For plain SVG, author coordinates at the
target font's baseline and capital height. Styles are discarded and arcs are
approximated as cubics. A filled outline may send the pen along both edges,
so compare the preview with the intended centerline. Convert other drawing
objects to paths before import.

**Download flattened font** resolves aliases and explicit composites to
independent centerlines, retaining resolved advances and anchors. Keep the
original if you want to edit its component references later.

## Bundled font catalog

| Font | Coverage | License |
| --- | --- | --- |
| [bagLING Ukrainian & English](../fonts/bagLING-UA-EN/README.md) | Ukrainian and English letters, digits and technical symbols | CC BY 4.0 |
| [bagLING Greek Letters](../fonts/bagLING-Greek-Letters/README.md) | Greek letters and selected combining marks | CC BY 4.0 |

For exact code points, inspect the .lint glyph keys or use the
[coverage CLI](integration.md#coverage-and-validation-002-checkout).
