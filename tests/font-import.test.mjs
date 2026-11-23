import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { importStrokeFont, layout, parseFont } from "../dist/index.js";
import { finishFontImport } from "../tools/preview-font-import.mjs";

for (const family of ["NormStroke", "ReliefSingleLine"]) {
  test(`reproduce the bundled ${family} conversion and verify coverage`, async () => {
    const path = new URL(`../fonts/${family}/`, import.meta.url);
    const original = await readFile(new URL(`source/${family}.svg`, path), "utf8");
    const saved = parseFont(await readFile(new URL(`${family}.lint`, path), "utf8"));
    const result = importStrokeFont(original, {
      author: saved.authors[0], license: saved.license, source: saved["x-source"],
    });
    assert(result.blocks.length);
    assert.throws(() => finishFontImport(result, false, parseFont), /incomplete blocks/);
    const font = finishFontImport(result, true, parseFont);
    assert.deepEqual(font, saved);
    const proof = layout([font], { text: "A1Ґ", height: 4, lineHeight: 7.2, top: 0 });
    assert(proof.glyphs[0].commands.some(({ code }) => code === "L" || code === "C"));
    assert.deepEqual(proof.missing, ["Ґ"]);
  });
}

test("LFF imports references, pen lifts, arcs, word spacing and Y-up geometry", () => {
  const source = `# Name: Test
# LetterSpacing: 2
# WordSpacing: 5
[0041] A
0,0;3,9;6,0
0,3;6,3
[0042] B
C0041
0,0;2,0,A1`;
  const result = importStrokeFont(source, {}, "lff");
  assert.match(result.warnings.join(" "), /circular arcs/);
  const font = finishFontImport(result, false, parseFont);
  assert.equal(font.metrics.capHeight, 9);
  assert.equal(font.glyphs["0041"].d, "M0 0 L3 -9 L6 0 M0 -3 L6 -3");
  assert.equal(font.glyphs["0041"].advance, 8);
  assert.equal(font.glyphs["0020"].advance, 5);
  assert.match(font.glyphs["0042"].d, /M0 0 C/);
  assert.throws(() => importStrokeFont("[0041]\nC0041", {}, "lff"), /Cyclic/);
});
