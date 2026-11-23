# lineFONT roadmap

The SVG glyph contribution workflow (21 → 22 → 25) and external quickstarts
(26) are available in the 0.0.3 checkout. See item 28 for physical tests.

Item numbers are stable references. Open items are listed in recommended
order within each section. Releases are created on request. Changes to the
.lint schema require a format-version decision.


## Application integration

- [ ] **38. Release integration checks.** Run documented examples in clean consumer projects. JS installs the tarball, Rust consumes the crate and C compiles against public headers and the library. Check glyph counts, missing clusters and strokes, plus the version table and instructions against tagged artifacts.
- [ ] **41. Integration support matrix.** For each released package, document language, OS, architecture, installation command and verified minimal example. Update the table based on clean installation checks (38).

## Compatibility and maintenance

- [ ] **20. Version compatibility.** Cover geometry, metrics, unknown fields and document reproduction.
- [ ] **16. Unicode policy.** Record the data version, update process and unsupported-cluster behavior.
- [ ] **15. Diacritic corpus.** Cover NFC/NFD, multiple marks, uppercase and lowercase, and a nonzero baseline.
- [ ] **17. Reproducible layout.** Use common Rust, JS/WASM and C fixtures with numeric tolerances. Run the JS fixtures in `examples/conformance/` through Rust and C and compare strokes, metrics and caret positions.
- [ ] **35. Separate preview build.** Move the browser entry point and modules into `apps/preview/`. Replace regex-based import/export rewriting with module bundling. Test the installed CLI, a self-contained HTML file opened offline via file://, and matching card geometry in HTML and SVG.
- [ ] **36. Core and ABI boundary.** Move JSON dispatch, buffer management and thread state out of `core/src/lib.rs`. Check public signatures, responses and diagnostics against the item 17 corpus.
- [ ] **18. Limits and fuzzing.** Cover malformed files, composites, command counts, time and memory.

## Author and device checks

- [ ] **8. Mobile accessibility, partly complete.** Larger touch targets, visible focus, keyboard card access, local scrolling and a script-blocking notice are implemented. Tested in Chromium at 320 px with touch input. Verify file picking, pinch zoom, copying and SVG download on physical Android and iOS devices.
- [ ] **10. Language sample quality, partly complete.** There are technical phrases and separate alphabet checks for 19 languages. Native-speaker review is pending. Each sample's status is stored in the catalog.
- [ ] **23. Compare versions.** Show changes in glyphs, advances and anchors with a visual overlay.
- [ ] **28. Physical tests.** Check small sizes, open strokes, tool lifts and diacritics on a plotter and engraver. Publish «Ґвинт М3 · ⌀6 ±0,1 мм · 45° · αβ» at 2, 3 and 4 mm, with source text, fonts, SVG, PDF, pen width and photos. Check that commas, periods and diacritics are legible in the photos.

## Later features and dependencies

- [ ] **42. Additional font formats.** Consider SHP/SHX when AutoCAD users request it.
- [ ] **34. Recommended line height.** Define an optional metric in font units and a rule for existing files. Scale it with capital height and allow manual adjustment. Test Ukrainian overhangs and accented Greek letters.
- [ ] **32. Inscription DXF.** After SVG and PDF, export strokes as standard CAD geometry. Open the result in an external CAD application and check physical dimensions and open paths.
- [ ] **30. MCP adapter.** Once the tool APIs stabilize, provide validation, coverage, comparison and specimens with resource limits.

## Completed

- [x] **24. CI for font contributions.** Validate .lint and block completeness, require third-party provenance and matching license notices, verify packaged notices, and publish coverage and visual specimens.
- [x] **33. Whole-font import.** Convert Hershey Text-compatible SVG and LibreCAD LFF from the CLI and offline viewer. Preview strokes and missing characters, report losses and require explicit permission to omit incomplete blocks. NormStroke and Relief are reproducible bundled conversions.
- [x] **39. Guide for binding authors.** Documented Rust, WASM and C ABI entry points, buffer ownership, diagnostics and document switching. The installed Python adapter runs the shared layout fixtures.
- [x] **27. C, C++ and Python packages.** CI builds and tests Ubuntu 24.04 Linux x86-64 artifacts. The archive provides CMake targets and a typed C++ adapter. The wheel includes the native core.
- [x] **40. Batch CLI.** Reads UTF-8 text from a file or stdin and emits millimetre SVG or layout JSON. Tests cover multiline layout, physical SVG dimensions and faulty fonts.
- [x] **22. SVG import.** Import path geometry and nested transforms in font units, convert to M/L/C and report arc approximation and outline risks. Preview the pen path and export a validated .lint. Flat export resolves aliases and composites while retaining effective advances.
- [x] **25. Font author guide.** Includes a font catalog, licenses and an end-to-end SVG template, Ґ edit, composition proof and PR workflow.
- [x] **26. External application quickstarts.** Added a typed Rust request with defaults and a packageable Cargo crate, plus verified clean-project examples for JS, Rust and C.
- [x] **21. Glyph SVG template.** Download a template for a selected font and character with metrics, guides and metadata. The author guide covers the five complete blocks, free characters, licensing and a minimal .lint.
- [x] **31. Offline inscription mode.** Multiline text, UTF-8 .txt import, millimetre controls, wrapping, SVG and single-page PDF. Chromium checks cover the last line, page dimensions and open strokes. Physical printing at 100% and pen passes have not been tested.
- [x] **37. Getting started by task.** Three README entry points, a version table, separate integration, authoring and preview guides, and JS, Rust and C examples.
- [x] **1. On-screen specimen size.** Capital height 12–96 CSS px with wrapping to available width.
- [x] **2. Missing characters.** Show original clusters and Unicode codes with a copy action.
- [x] **3. Specimen SVG download.** Preserve the current phrase, size and line breaks.
- [x] **4. Local .lint in HTML.** Validate with the core, update metrics, phrase and cards, and recover after errors.
- [x] **5. Glyph search.** Search all pages by character or Unicode code without regenerating the HTML.
- [x] **6. Glyph detail.** Toggle paths, directions, control points, advance and anchors.
- [x] **7. Two-font comparison.** Use a shared phrase, height and layout settings.
- [x] **9. Preview localization.** Ukrainian and English labels, errors and accessible names.
- [x] **11. Exact ink bounds API.** Rust curve extrema and shared examples for bindings, preview and export.
- [x] **12. JSON Schema.** Structural schema and a defined boundary for geometry validation.
- [x] **13. Structured diagnostics.** Error code, field path, glyph Unicode and command position.
- [x] **14. Language coverage.** Alphabets, combining marks, direct and composed glyphs, and missing characters.
- [x] **19. Performance measurement.** Large texts and collections, font registration, lookup and layout.
- [x] **29. Route optimization.** Pen-up travel distance, result checks and preservation of canonical order.
