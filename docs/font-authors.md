# Create or contribute a font

Start with [SingleGlyph.lint](../examples/SingleGlyph.lint). It contains Ґ under the Unicode key `0490`. Copy the file, give your font its own ID, name, version and credits, then edit the glyph's `d` centerline. The metrics set cap height, baseline and default advance in font units. The [format specification](../spec/FORMAT.md) defines paths, anchors and the five complete-or-absent groups.

Use `linefont/1` for M/L/C paths readable by release 0.0.1. Use `linefont/0.0.2` for paths with Q/T/S/A in the development checkout. [Curve example](../examples/Curves.lint) · [JSON Schema](../spec/linefont.schema.json)

From the 0.0.2 repository root with Node 22.12+, validate a working copy and inspect it.

```sh
npm ci
npm run build
cp examples/SingleGlyph.lint /tmp/my-font.lint
npm run font:validate -- /tmp/my-font.lint
npm run --silent font:preview -- /tmp/my-font.lint Ґ > specimen.svg
```

Open the SVG and check the stroke endpoints, baseline and advance. For a contribution, place the font and its README in a family directory under `fonts/`, and document coverage, license and provenance. [Ukrainian and English font](../fonts/bagLING-UA-EN/README.md) · [Contribution guide](../CONTRIBUTING.md) · [Interactive preview](preview.md)
