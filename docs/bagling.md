# bagLING integration profile

At extraction, bagLING routed Canvas, the editing overlay and SVG/PDF through
one adapter. The application's initial cap height is 4 mm, line step 7.2 mm,
letter spacing zero and stroke thickness 0.2 mm. Physical dimensions shown in
the editor account for the axes of the object's text transform. Resizing text
proportionally adjusts the line step and rounds it to the nearest 0.5 mm.
Increment buttons preserve exact halves and truncate other fractions before a
0.5 mm step. Direct input accepts fractions.

The editor embeds complete fonts, including its default, in the document's
`fontCatalog`. Each text object's `fontRefs` preserves fallback order.
Deduplicate by normalized content, using the fingerprint as a lookup index.
Different contents with equal author IDs coexist. The standalone integration
commit used document schema 21, a maximum of 1024 catalog entries and stacks
of 1–64 references. Invalid references are rejected. Older supported documents
can contain inline fonts. On load, reconstruct the ordered stacks and share
arrays for identical orders. The Ukrainian/English font is the default and the
Greek font can be appended explicitly.

The host decodes Markdown emphasis into visible text and temporary UTF-16 style
runs. Keep source punctuation and unedited markup when changing metrics.
Alignment belongs to the whole block. The editor owns selection, hit testing,
label layers, panel placement, defaults, snapping, keyboard focus and history.
An editing session previews changes immediately and commits once. Enter adds
a line, Ctrl+Enter finishes editing, and switching windows preserves the draft.
Notes use the initial font. The editor owns its notes UI and document migrations.

The conversion tool targets the original bagLING font source. It expands H/V/Q
and the bullet into supported paths and fills the atomic groups. A consumer can
use the packaged WASM synchronously without fetching another asset. Rebuilding
identical bytes requires the pinned Rust toolchain, Cargo.lock and build flags.
