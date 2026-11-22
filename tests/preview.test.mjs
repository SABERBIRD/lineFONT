import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { parseFont } from "../dist/index.js";
import { matchingGlyphs, specimen } from "../tools/preview-specimen.mjs";

const font = parseFont(
  await readFile(
    new URL("../fonts/bagLING-UA-EN/bagLING-UA-EN.lint", import.meta.url),
    "utf8",
  ),
);

test("glyph search resolves literal characters and Unicode codes across pages", () => {
  assert.deepEqual(matchingGlyphs(font, "Ґ"), ["0490"]);
  assert.deepEqual(matchingGlyphs(font, "u+0490"), ["0490"]);
  assert.deepEqual(matchingGlyphs(font, "not a glyph"), []);
  const sheet = specimen(font, "", 1, "Ґ");
  assert.match(sheet, /U\+0490/);
  assert.doesNotMatch(sheet, /U\+0041/);
  assert.match(specimen(font, "", 1, "not a glyph"), /0\/\d+ glyphs/);
  assert.throws(() => specimen(font, "", 2, "Ґ"), /Page must be/);
});

test("specimen keeps font-provided text escaped when inserted into browser HTML", () => {
  const sheet = specimen(
    { ...font, name: "<img src=x onerror=alert(1)>" },
    "",
    1,
  );
  assert.doesNotMatch(sheet, /<img/);
  assert.match(sheet, /&lt;img/);
});
