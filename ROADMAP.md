# lineFONT roadmap

The next milestone is contributing a glyph from an SVG template (21) and
getting a validated .lint file back (22 → 25). Inscription mode (31) is
available. See item 28 for physical tests.

Item numbers are stable references. Open items are listed in recommended
order within each section. Releases are created on request. Changes to the
.lint schema require a format-version decision.

## Near-term features

- [ ] **22. SVG import.** Handle transforms, units, M/L/C conversion and report conversion losses. Show the pen path after importing a glyph. If a stroke was outlined as two edges, explain the risk of a double pass and let the author inspect it. Flat font export expands aliases and composites into paths while preserving advances.
- [ ] **25. Font author guide.** Document single-glyph editing and verification. Provide a font catalog with licenses and coverage, and an end-to-end SVG → .lint → composition → PR example. To contribute Ґ, import the edited template, check «Ґ Г ґ» and «ґвинт», then download the validated .lint. The [basic guide](docs/font-authors.md) already covers manual .lint editing.

## Application integration

- [ ] **26. External application quickstarts.** For each language, load a .lint, supply text and height, then inspect strokes and missing characters. Add a typed Rust request constructor with defaults and prepare the crate for Cargo installation. Test examples from clean projects (38).
- [ ] **39. Guide for binding authors.** Show how to choose between Rust, WASM and C ABI using one adapter. Cover buffer ownership, errors and switching between two documents. Compare strokes, UTF-16 positions and missing clusters against item 17's fixtures.
- [ ] **27. C and Python bindings.** A Linux C example exists. Decide supported operating systems and architectures. Provide C/C++ binaries, headers and a CMake target, plus typed access to strokes and errors. Provide Python wheels containing the core. Run a first layout on each supported platform without a local core build.
- [ ] **40. Batch CLI.** Read text from a file or stdin, take a font and height, and return inscription SVG or stroke JSON. Test SVG units, multiline input and a nonzero exit status for an invalid font.
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
- [ ] **24. CI for font contributions.** Validate fonts, block completeness and licenses. Generate review artifacts.
- [ ] **23. Compare versions.** Show changes in glyphs, advances and anchors with a visual overlay.
- [ ] **28. Physical tests.** Check small sizes, open strokes, tool lifts and diacritics on a plotter and engraver. Publish «Ґвинт М3 · ⌀6 ±0,1 мм · 45° · αβ» at 2, 3 and 4 mm, with source text, fonts, SVG, PDF, pen width and photos. Check that commas, periods and diacritics are legible in the photos.

## Later features and dependencies

- [ ] **34. Recommended line height.** Define an optional metric in font units and a rule for existing files. Scale it with capital height and allow manual adjustment. Test Ukrainian overhangs and accented Greek letters.
- [ ] **32. Inscription DXF.** After SVG and PDF, export strokes as standard CAD geometry. Open the result in an external CAD application and check physical dimensions and open paths.
- [ ] **33. Whole-font import.** Start with Hershey Text-compatible SVG fonts, then LibreCAD LFF. Preserve Unicode mappings and metrics and report conversion losses. List missing characters in incomplete mandatory blocks and let the author complete or omit the whole block. Consider SHP/SHX when AutoCAD users request it.
- [ ] **30. MCP adapter.** Once the tool APIs stabilize, provide validation, coverage, comparison and specimens with resource limits.

## Completed

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
