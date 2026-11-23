import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const flags = ["tools/layout-linefont.mjs", "--font", "examples/SingleGlyph.lint", "--height", "4"];
function run(args, input = "") {
  return spawnSync(process.execPath, args, { cwd: root, encoding: "utf8", input });
}

test("batch CLI reads multiline stdin and exports physical SVG and layout JSON", () => {
  const svg = run(flags, "Ґ\nҐ");
  assert.equal(svg.status, 0, svg.stderr);
  assert.match(svg.stdout, /width="[^"]+mm" height="[^"]+mm"/);
  assert.equal((svg.stdout.match(/M/g) ?? []).length, 2);
  const json = run([...flags, "--format", "json"], "Ґ\nҐ");
  assert.equal(json.status, 0, json.stderr);
  assert.deepEqual(JSON.parse(json.stdout).glyphs.map(({ line }) => line), [0, 1]);
  const invalid = run([...flags, "--font", "package.json"], "Ґ");
  assert.equal(invalid.status, 1);
  assert.equal(invalid.stdout, "");
  assert.match(invalid.stderr, /linefont-layout:/);
});
