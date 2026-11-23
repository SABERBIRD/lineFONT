# Extended stroke geometry

The proposal introduced Q/T, C/S and A, M/L or M/L/C output, and an
approximation tolerance. These are implemented in [linefont/0.0.2](../FORMAT.md).
B-splines with knot vectors, NURBS and returning original arcs with their
placement transforms remain proposals.

## Geometry in the file

Preserve the author's original geometry. The proposal adds these absolute
SVG commands.

| Command | Geometry |
| --- | --- |
| M, L, C | Stroke start, line and cubic Bézier from the original format |
| Q | Quadratic Bézier with one control point |
| A | SVG elliptical arc with two radii, axis rotation, large-arc flag, sweep flag and endpoint |

Equal radii give a circle. Two arcs form a full circle. A zero radius gives
a straight segment. Identical endpoints add no segment. Both flags are 0 or 1.

A sequence of existing C commands represents a piecewise cubic Bézier spline.
Editable knots of other types require the spline family and parameters.
A cubic B-spline needs control points and a knot vector. NURBS also need
weights.

## Layout and interchange

A reader may return exact segment types with affine placement transforms for
arc export and further editing. A compatibility output uses M/L/C.

A quadratic Bézier converts exactly to a cubic. A nonrational cubic B-spline
can be split exactly into cubic Bézier segments by knot insertion. Arcs and
general rational curves need approximation in compatibility output. Define
the permitted deviation in output units, how scaling affects it and behavior
at the command limit. Both outputs preserve the source font data.

## Acceptance criteria

- Readers distinguish versions and preserve geometry, stroke order and advances for existing linefont/1 files.
- Shared fixtures cover Q, both A sweeps, large and small arcs, rotated ellipses, full circles and degenerate cases.
- Tests cover bounds and error after shear, reflection and nonuniform scaling.
- Exports state whether they preserve exact geometry or approximate it. Accuracy failures and command-limit violations produce explicit diagnostics.
