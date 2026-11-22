import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  convertFont,
  coverage,
  inkBounds,
  layout,
  parseFont,
  validateFonts,
} from "../dist/index.js";
const source = await readFile(
  new URL("../examples/Curves.lint", import.meta.url),
  "utf8",
);
const font = parseFont(source);
const options = { text: "A", height: 10, top: 0, lineHeight: 12 };
const withPath = (d) => ({ ...font, glyphs: { "0041": { d } } });
const draw = (d, settings = {}) =>
  layout([withPath(d)], { ...options, ...settings }).glyphs[0].commands;

test("version gate, typed field paths and zero-based source command indices", () => {
  assert.equal(font.glyphs["039F"].d, JSON.parse(source).glyphs["039F"].d);
  for (const [d, format] of [
    ["M0 0 Q0 5 10 0", "linefont/1"],
    ["M0 0 A4 4 0 2 1 4 4", font.format],
  ]) {
    assert.throws(
      () => validateFonts([{ ...withPath(d), format }]),
      (e) =>
        e.diagnostic.code === "invalid_path" &&
        e.diagnostic.commandIndex === 1 &&
        e.diagnostic.path === "/fonts/0/glyphs/0041/d" &&
        e.diagnostic.glyph === "0041",
    );
  }
  assert.throws(
    () =>
      validateFonts([
        { ...font, metrics: { ...font.metrics, baseline: "10" } },
      ]),
    (e) => e.diagnostic.path === "/fonts/0/metrics/baseline",
  );
});
test("quadratics and smooth Beziers preserve geometry and pen lifts", () => {
  assert.deepEqual(
    draw("M0 0 Q3 6 6 0 T12 0"),
    draw("M0 0 C2 4 4 4 6 0 C8 -4 10 -4 12 0"),
  );
  assert.deepEqual(
    draw("M0 0 C1 0 2 1 3 3 S5 5 7 7 M1 1 S3 3 4 4"),
    draw("M0 0 C1 0 2 1 3 3 C4 5 5 5 7 7 M1 1 C1 1 3 3 4 4"),
  );
  assert.deepEqual(inkBounds(draw("M0 0 Q3 6 6 0 M90 90")), {
    x: 0,
    y: 0,
    width: 6,
    height: 3,
  });
  assert.equal(inkBounds(draw("M3 3")), null);
});
test("circle chord deviation stays within document tolerance after scaling", () => {
  const d = "M10 0 A10 10 0 0 1 -10 0 A10 10 0 0 1 10 0";
  for (const height of [5, 40])
    for (const tolerance of [0.01, 0.1]) {
      const commands = draw(d, { height, tolerance, output: "lines" });
      assert(
        commands.length > 4 && commands.slice(1).every((c) => c.code === "L"),
      );
      for (let i = 1; i < commands.length; i++) {
        const [x, y] = commands[i].values.map(
          (v, j) => (v + commands[i - 1].values[j]) / 2,
        );
        assert(Math.abs(height - Math.hypot(x, y)) <= tolerance);
      }
      assert.deepEqual(commands.at(-1).values, [height, 0]);
    }
  assert.deepEqual(
    draw("M1 2 A0 2 45 0 0 3 4 A1 1 0 0 1 3 4"),
    draw("M1 2 L3 4"),
  );
  assert.throws(() => draw(d, { tolerance: 1e-30 }), /budget/);
  assert(
    draw("M0 0 C1 10 9 10 10 0", { output: "lines" }).every(
      (c) => c.code !== "C",
    ),
  );
});
test("coverage distinguishes reference types and NFC/NFD composition", () => {
  const f = {
    ...font,
    glyphs: {
      "0041": { d: "M0 0 L1 1", anchors: { top: { x: 1, y: 1 } } },
      "0301": { d: "M0 0 L1 0", attach: { x: 0, y: 0 } },
      "0042": { alias: "0041" },
      "0043": { composite: [{ code: "0041" }] },
    },
  };
  const result = coverage([f], "ABCÁA\u0301Ω");
  assert.deepEqual(
    Object.fromEntries(Object.entries(result).map(([k, v]) => [k, v.kind])),
    {
      A: "direct",
      B: "alias",
      C: "composite",
      Á: "composed",
      "A\u0301": "composed",
      Ω: "missing",
    },
  );
});

test("whole-font conversion produces a readable legacy font and preserves references", () => {
  const input = {
    ...font,
    glyphs: { ...font.glyphs, "0041": { alias: "0053" } },
  };
  for (const output of ["lines", "beziers"]) {
    const converted = convertFont(input, { output, tolerance: 0.05 });
    assert.equal(parseFont(JSON.stringify(converted)).format, "linefont/1");
    assert.deepEqual(converted.glyphs["0041"], input.glyphs["0041"]);
    assert.deepEqual(converted.metrics, input.metrics);
    assert.doesNotMatch(converted.glyphs["039F"].d, /[AQST]/);
    assert.equal(
      converted.glyphs["0053"].d.includes("C"),
      output === "beziers",
    );
  }
  assert.match(input.glyphs["039F"].d, /A/);
});

test("rotated ellipse tracks the selected sweep and large-arc flag", () => {
  const angle = (35 * Math.PI) / 180;
  const point = (t) => [
    6 * Math.cos(t) * Math.cos(angle) - 2 * Math.sin(t) * Math.sin(angle),
    6 * Math.cos(t) * Math.sin(angle) + 2 * Math.sin(t) * Math.cos(angle),
  ];
  const start = point(0);
  for (const span of [
    Math.PI / 2,
    -Math.PI / 2,
    (3 * Math.PI) / 2,
    (-3 * Math.PI) / 2,
  ]) {
    const end = point(span);
    const d =
      "M" +
      start.join(" ") +
      " A6 2 35 " +
      Number(Math.abs(span) > Math.PI) +
      " " +
      Number(span > 0) +
      " " +
      end.join(" ");
    const commands = draw(d, { output: "lines", tolerance: 0.01 });
    const n = commands.length - 1;
    for (let i = 1; i <= n; i++) {
      const want = point((span * (i - 0.5)) / n);
      const mid = commands[i].values.map(
        (v, j) => (v + commands[i - 1].values[j]) / 2,
      );
      assert(Math.hypot(mid[0] - want[0], mid[1] - want[1]) <= 0.01);
    }
  }
});
