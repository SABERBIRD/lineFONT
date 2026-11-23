# Write a lineFONT binding

| Host | Entry point |
| --- | --- |
| Rust | Keep one `linefont::Engine` per document and pass a `LayoutRequest`. |
| JavaScript or TypeScript | Use the npm API. It handles WASM memory, request serialization and stack activation. |
| Native languages with foreign function interfaces | Wrap the C ABI in [linefont.h](../core/include/linefont.h). The [Python adapter](../bindings/python/linefont/__init__.py) is a working example. |

## Call the C ABI

Encode the request as UTF-8 JSON and pass the byte length to `lint_call`.
Copy the returned bytes before calling `lint_free` with the exact pointer and
length. Free replies on every path, including decoding and core errors.
The response is either `{"ok": ...}` or an error plus a structured
`diagnostic`. Carry the diagnostic into the host error type.

The font stack belongs to the calling thread and is shared by adapters in
that thread. For two documents, keep separate ordered font lists in the host.
Activate the requested document with a `fonts` call immediately before
`layout` on the same thread. Repeat activation after switching documents
and whenever calls move to another thread. The Python adapter activates on
every layout call, which also works when several adapters share a thread.
Keep activation and layout together, with no asynchronous yield between them.

## Validate against shared cases

Use the [conformance fixtures](../examples/conformance/) to check centerline
commands within the stated tolerance, glyph source ranges and missing
clusters. Source ranges and carets use UTF-16 offsets after normalizing
CRLF and CR. Keep these offsets even when the host indexes by code points
or bytes. Preserve move commands and font fallback order. Return coordinates
in the caller's units.

The [Python consumer check](../examples/integration/layout.py) installs as
described in the [integration guide](integration.md#python-linux-x86-64).
It compares commands, advances, caret positions, font selection, UTF-16
ranges and missing clusters with the same fixtures used by the JS tests.
It also switches between two documents and checks core error propagation.
