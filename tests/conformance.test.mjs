import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { layout, parseFont } from "../dist/index.js";

const root = new URL("../examples/conformance/", import.meta.url);
const { cases, geometryTolerance } = JSON.parse(
  await readFile(new URL("cases.json", root), "utf8"),
);

function close(actual, expected) {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) => {
    assert.ok(
      Math.abs(value - expected[index]) <= geometryTolerance,
      `${value} ≠ ${expected[index]}`,
    );
  });
}

for (const fixture of cases) {
  test(fixture.name, async () => {
    const fonts = await Promise.all(
      fixture.fonts.map(async (name) =>
        parseFont(await readFile(new URL(name, root), "utf8")),
      ),
    );
    const actual = layout(fonts, fixture.request);
    assert.deepEqual(actual.missing, fixture.expected.missing);
    close(
      actual.carets.map(({ x }) => x),
      fixture.expected.caretsX,
    );
    assert.equal(actual.glyphs.length, fixture.expected.glyphs.length);
    actual.glyphs.forEach((glyph, index) => {
      const expected = fixture.expected.glyphs[index];
      assert.deepEqual([glyph.start, glyph.end], expected.range);
      assert.equal(glyph.fontIndex, expected.fontIndex);
      close([glyph.advance], [expected.advance]);
      assert.equal(glyph.commands.length, expected.commands.length);
      glyph.commands.forEach(({ code, values }, commandIndex) => {
        const [expectedCode, ...coordinates] = expected.commands[commandIndex];
        assert.equal(code, expectedCode);
        close(values, coordinates);
      });
    });
  });
}
