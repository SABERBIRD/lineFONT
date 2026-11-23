import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { flattenFont, importSvgPaths, layout, parseFont } from "../dist/index.js";

test("SVG paths normalize relative segments, nested transforms and closure", () => {
  const result = importSvgPaths([{
    d: "m1 2 h3 v4 z",
    transforms: ["translate(10 20)", "scale(2)"],
  }]);
  assert.deepEqual(result, {
    commands: [
      { code: "M", values: [12, 24] },
      { code: "L", values: [18, 24] },
      { code: "L", values: [18, 32] },
      { code: "L", values: [12, 24] },
    ],
    approximated: false,
  });
  const curves = importSvgPaths([{ d: "M0 0 Q3 3 6 0 A3 3 0 0 1 12 0", transforms: [] }]);
  assert(curves.approximated);
  assert.deepEqual(curves.commands[1], { code: "C", values: [2, 2, 4, 2, 6, 0] });
  assert.throws(() => importSvgPaths([{ d: "M0 0 L?", transforms: [] }]));
});

test("flattened aliases and composites preserve effective layout", async () => {
  const base = parseFont(await readFile(new URL("../examples/SingleGlyph.lint", import.meta.url), "utf8"));
  base.glyphs["0041"] = { alias: "0490", advance: 9 };
  base.glyphs["0042"] = { composite: [{ code: "0041", x: 1, y: 0 }] };
  const flat = flattenFont(base);
  assert.equal(flat.format, "linefont/1");
  for (const key of ["0041", "0042"]) {
    assert.equal(flat.glyphs[key].advance, 9);
    assert.equal(typeof flat.glyphs[key].d, "string");
    assert(!flat.glyphs[key].alias && !flat.glyphs[key].composite);
  }
  const options = { text: "ҐAB", height: 4, lineHeight: 7.2, top: 0 };
  assert.deepEqual(layout([flat], options), layout([base], options));
});
