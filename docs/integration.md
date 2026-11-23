# Integrate lineFONT

## JavaScript and TypeScript

Use Node 22.12+ or a browser bundler with ES modules and WebAssembly. The package includes TypeScript declarations and a synchronous WASM engine. Import each bundled font by its public subpath. For an external .lint file, pass its UTF-8 text to `parseFont`. Keep the same font stack while editing text.

For **released 0.0.2**, follow the [README installation and first layout](../README.md#first-layout-in-javascript). To try the **0.0.3 development checkout**, run these commands from its root. The checkout includes generated fonts and WASM.

```sh
npm ci
repo=$PWD
archive=$(npm pack --silent)
mkdir -p /tmp/linefont-js-example
cd /tmp/linefont-js-example
npm install "$repo/$archive"
cp "$repo/examples/integration/layout.mjs" .
node layout.mjs
```

To regenerate the font wrappers and WASM after changing their sources, install the pinned Rust toolchain with the wasm32-unknown-unknown target and run `node tools/convert-linefont.mjs`, `node tools/build-linefont.mjs` and `npm run build` from the repository root.

The example produces 14 glyphs with no missing clusters in the README example.

## Rust (0.0.3 development checkout)

From the repository root, create a separate Cargo application using the local crate. Use the Rust version in [rust-toolchain.toml](../core/rust-toolchain.toml).

```sh
repo=$PWD
cargo new --edition 2021 --name linefont_demo /tmp/linefont-rust-example
cd /tmp/linefont-rust-example
cargo add linefont --path "$repo/core"
cargo add serde_json@1
cp "$repo/examples/integration/layout.rs" src/main.rs
cargo run -- "$repo/examples/SingleGlyph.lint"
```

For a Git dependency, replace the local Cargo command with `cargo add linefont --git https://github.com/SABERBIRD/lineFONT --branch 003`. Pin a tested commit for reproducible builds. The typed `LayoutRequest::new(text, height)` defaults to upright left-aligned text at the origin, with line height 1.8 times the capital height. Override public fields for wrapping or other layout options.

The [Rust example](../examples/integration/layout.rs) loads the font, creates an independent engine and prints `glyphs=1 missing=0`.

## C and C++ (Linux)

From the repository root, build the shared library and compile the [C example](../examples/integration/layout.c). This example uses json-c development headers and pkg-config. Its JSON output includes the placed strokes under `ok.glyphs[0].commands`.

```sh
cargo build --manifest-path core/Cargo.toml --locked --release
cc -std=c11 examples/integration/layout.c -Icore/include -Lcore/target/release \
  -Wl,-rpath,"$PWD/core/target/release" -llinefont $(pkg-config --cflags --libs json-c) -o /tmp/linefont-c-example
/tmp/linefont-c-example examples/SingleGlyph.lint
```

C++ applications can include the same [C ABI header](../core/include/linefont.h). The [0.0.1 release](https://github.com/SABERBIRD/lineFONT/releases/tag/v0.0.1) also provides a prebuilt Linux x86-64 library and header.

## Layout and editing contract

Pass the whole visible string and an ordered stack of immutable fonts. The JS
binding caches the active stack by array identity. To edit a font, replace the
changed font object and pass a new array. An explicit call to `rankFonts`
suggests a new order based on occurrences in the text. To keep the current glyph sources when adding a fallback, append it to the stack.

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

## Geometry profiles in the development version

Read the original author path from `parseFont(source).glyphs[key].d`. For a
device working in millimetres, the following places 4 mm capitals and requests
line segments with a maximum curve approximation error of 0.02 mm.

```ts
const placed = layout([font], {
  text: "SΟ", height: 4, lineHeight: 7, top: 0,
  output: "lines", tolerance: 0.02,
});
const box = inkBounds(placed.glyphs.flatMap(glyph => glyph.commands));
```

Import `inkBounds` from the same package as `layout`. The default output
profile is `beziers` (M/L/C). Q/T are elevated exactly, S expands exactly, and
A becomes a sequence of chords. The `lines` profile further subdivides cubic
segments in placed coordinates. Supply a positive finite tolerance for a
device-specific error bound. It applies before any host transform. Recalculate
the tolerance if a downstream transform magnifies the geometry. Without an
explicit tolerance arcs use the font's cap height / 1000 sampling tolerance.
The engine rejects requests that exceed its command budget. It preserves move
commands and stroke order in both profiles.

`inkBounds(commands)` measures extrema of the **returned centerlines**,
including interior cubic extrema. An empty path or isolated moves return
`null`. Arcs converted to chords are measured as those chords. Stroke width
and pen diameter belong to the consumer. The Rust equivalent is
`linefont::ink_bounds`; C and WASM accept `{"op":"inkBounds","commands":[...]}`.

## Coverage and validation (0.0.2 checkout)

`coverage(fonts, text)`, Rust `Engine::coverage`, and the native `coverage`
operation report each distinct original grapheme, its first matching font
index and its source kind. Kinds are `direct`, `alias`, explicit `composite`,
anchor-based `composed`, and `missing` (null index). Search uses canonical
equivalence and the application's fallback order. For a reproducible language
report including decomposed spellings, run:

```sh
npm run font:coverage -- uk fonts/bagLING-UA-EN/bagLING-UA-EN.lint
npm run font:validate -- --json examples/Curves.lint
```

Native errors include a human-readable `error` and a `diagnostic` object.
The JS binding exposes the latter on thrown errors. `code` identifies the
category, `message` explains the problem, and `path` is a JSON Pointer
relative to the request. `glyph` is the font's Unicode key where applicable.
`commandIndex` counts parsed source segments from zero, including moves;
unrelated errors use null. The validator's JSON mode emits one record per
file (errors on stderr) and exits nonzero if any file fails.

For an application that consumes whole fonts, call
`convertFont(font, {output: "lines", tolerance: 0.01})`. Here the tolerance is
in **font units**. The result is a validated `linefont/1` font with the chosen
path vocabulary, original metrics, anchors, aliases and composites. The input
retains its authored curves. Native callers use `convert_font` or send
`{"op":"convert","font":...,"output":"beziers","tolerance":0.01}`.
