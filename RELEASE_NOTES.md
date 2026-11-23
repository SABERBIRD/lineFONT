# lineFONT release notes

## 0.0.3 (unreleased)

- Imports edited SVG glyph paths into the offline viewer and exports validated .lint fonts.
- Exports flattened fonts while preserving resolved glyph advances and anchors.
- Adds a typed Rust layout request constructor and external integration examples.
- Adds a multiline batch layout CLI with SVG and JSON output, a Linux x86-64 Python wheel and a CMake package with a C++ adapter.

## 0.0.2

- Adds the `linefont/0.0.2` file format for absolute quadratic Béziers (Q/T), smooth cubic Béziers (S) and circular or elliptical arcs (A), alongside M/L/C. Existing `linefont/1` files remain readable. [Curve example](examples/Curves.lint)
- Can convert a font or lay out text using M/L/C or only M/L, with a caller-specified tolerance. The original font retains its authored paths.
- Clarifies stroke order, metrics, Unicode coverage and fallback. Adds reference layout vectors with UTF-16 ranges and numerical tolerances, a JSON Schema and structured validation diagnostics.
- Adds printable SVG specimens and an offline HTML font preview with glyph inspection, font comparison and language coverage.

- The offline viewer includes a multiline inscription workspace with SVG and single-page vector PDF export in millimetres, and downloadable SVG glyph templates. Physical printing and plotting were not tested.
- Release assets include the npm archive, bundled fonts, WASM and a native Linux x86-64 library with its C header.

## 0.0.1

Initial release of the `linefont/1` format, layout engine and two bagLING fonts. This file format uses absolute M/L/C stroke commands. [Published release and downloads](https://github.com/SABERBIRD/lineFONT/releases/tag/v0.0.1)
