# Layout into shapes and along paths (draft)

Status: draft for review. The host application (bagLING) owns contour geometry
and prototypes the algorithm; lineFONT core owns text placement once it is
given line slots or a path. Move proven behavior into the core with shared
fixtures (ROADMAP 17) and keep it behind the core and ABI boundary (36). Line
breaking must follow the Unicode cluster policy (16).

## Division of work

| Host application | lineFONT core |
| --- | --- |
| Inset the contour by the margin, subtract obstacles grown by their margin | Break text into clusters, words and lines |
| Cut the free region into free intervals per baseline | Fill the intervals in order, align, hyphenate or clip |
| Provide a path as a polyline or M/L/C commands | Place glyphs along arc length and report overflow |

## 1. Layout into slots

```ts
type Interval = { x0: number; x1: number };
type Slot = { baseline: number; intervals: Interval[] };

layoutInSlots(fonts, options, slots, flow?): Layout & {
  overflow: { start: number } | null; // UTF-16 offset of the first unplaced cluster
  slotsUsed: number;
};
```

- `options` is the existing layout request without `wrapWidth`, `lineHeight` and `top`. `baseline` replaces them.
- Slots are consumed in order. Intervals of one slot are filled left to right. Text continues from one interval to the next, so a line may span two sides of an obstacle.
- `flow.alignment`: `left`, `center`, `right` or `justify`, applied per interval.
- `flow.overflow`: `stop` (default, report `overflow`), `clip` (drop the rest) or `shrink` (smallest height that fits, down to `minHeight`).
- `flow.hyphenate`: off by default. A word wider than every interval is split at a cluster boundary, never inside a cluster.
- Each result glyph gains `slot` and `interval` so the host can map it back.
- The host should supply intervals that are safe for the whole line band `[baseline - capHeight, baseline + descent]`. The core does not know the contour.

## 2. Layout along a path

```ts
type PathInput = { commands: Command[]; closed?: boolean };

layoutAlongPath(fonts, options, path, place): Layout & {
  overflow: { start: number } | null;
  length: number;
};
```

`place` fields:

| Field | Values | Meaning |
| --- | --- | --- |
| `side` | `on`, `above`, `below` | `on`: the baseline lies on the curve. `above`: the baseline is lifted by `offset`. `below`: the glyph body hangs under the curve, its cap line `offset` below it. |
| `offset` | number, default 0 | Distance from the curve in the font's request units. |
| `start` | number, default 0 | Arc-length position of the first glyph. |
| `align` | `start`, `center`, `end` | Alignment within the path length. |
| `reverse` | boolean | Walk the path backwards. |
| `closed` | boolean | Wrap around a closed path. |
| `inside` | boolean | For a closed path, put the text on the inner side. |

Rules:
- Glyph anchor is the centre of its advance. The tangent is the chord between the two ends of the advance, which is stable on tight curves.
- Each glyph is moved rigidly. Optional `bend: true` warps glyph strokes by the local curvature and needs a fixture decision.
- Result glyphs gain `x`, `y`, `angle`. Carets follow the same transform.
- On an open path, text that does not fit is reported through `overflow` and not drawn.

## 3. Fixtures

Add cases to `examples/conformance/cases.json`: a rectangle with one obstacle, a circle, a path with a sharp corner, an open overflowing path, and `on`, `above`, `below` on a semicircle. Compare slot assignment and overflow exactly, coordinates within the recorded tolerance.

## 4. Related tasks worth considering

- Alignment and justification inside intervals, with a minimum space and letter-spacing budget.
- Auto-size: the largest height that fits a shape, found by bisection with the slot builder.
- Overflow chaining: pass `overflow.start` to the next shape to continue text.
- Multi-column and per-column balance.
- Vertical text, upright and rotated.
- Kerning and per-pair adjustments (font metadata, format-version decision).
- Hyphenation and Unicode line-break classes (item 16).
- Bidirectional and right-to-left runs.
- Baseline grid shared across shapes, and recommended line height (item 34).
- Text on both sides of a path, repeated text pattern along a path, text spiral.
- Fill-to-width scaling of one line, and tab stops.
- Shaping marks over paths: diacritic anchors on curved baselines.
- Stroke order optimization after placement (item 29) for plotters.
- Warnings: glyphs that cross an obstacle on a tight curve, minimum legible height.
