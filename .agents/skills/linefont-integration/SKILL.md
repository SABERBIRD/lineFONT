---
name: linefont-integration
description: Use when connecting an application to lineFONT, adding a language binding, or verifying that a packaged integration example works for an external consumer.
---

# Integrate lineFONT

Paths below are relative to the repository root.

1. Identify the host language, target platform and lineFONT version. Check the version table in `README.md` and use the corresponding artifact. The first layout examples in `examples/integration/` and their build commands in `docs/integration.md` are the starting point.
2. Choose the existing entry point. JS/TS imports the package and a font through its public exports. Rust creates an independent `linefont::Engine`. A native binding can wrap `core/include/linefont.h`. The current C ABI needs an active font stack on each calling thread and each response buffer must be freed once, including error responses.
3. For a new binding, keep shaping and geometry in the Rust core. Translate native strings, errors and ownership into the host language. Preserve the ordered fallback stack, caller-defined units, UTF-16 source offsets and missing-cluster reporting. Use `examples/conformance/cases.json` for expected results and numerical tolerances.
4. Exercise the documented installation from a clean consumer project. For JS, run `npm ci`, `npm run build`, and `npm test` in the checkout, then install an `npm pack` archive in the consumer. For Rust and C, run the matching example from the integration guide. Verify that Ґ produces strokes from `examples/SingleGlyph.lint` and that an unsupported character appears in the missing list.
5. Record the supported artifact, platform and runnable command in the integration guide. Use `ROADMAP.md` for planned bindings and formats.
