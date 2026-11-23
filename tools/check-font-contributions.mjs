import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseFont } from "../dist/index.js";
import { specimen } from "./preview-specimen.mjs";

const report = process.argv[2];
if (!report) throw Error("Pass the review output directory");
const packed = process.argv[3] ? resolve(process.argv[3]) : undefined;
const root = new URL("../", import.meta.url);
const firstParty = new Set(["bagLING-UA-EN", "bagLING-Greek-Letters"]);
await mkdir(report, { recursive: true });
for (const family of await readdir(new URL("fonts/", root), { withFileTypes: true })) {
  if (!family.isDirectory()) continue;
  const folder = new URL("fonts/" + family.name + "/", root);
  for (const filename of (await readdir(folder)).filter((name) => name.endsWith(".lint"))) {
    const font = parseFont(await readFile(new URL(filename, folder), "utf8"));
    if (!firstParty.has(family.name)) {
      const manifest = "fonts/" + family.name + "/source.json";
      const source = JSON.parse(await readFile(new URL(manifest, root), "utf8"));
      for (const field of ["url", "version", "rightsHolder", "license", "changes"])
        if (typeof source[field] !== "string" || !source[field].trim())
          throw Error(manifest + " requires " + field);
      if (!["https:", "http:"].includes(new URL(source.url).protocol))
        throw Error(manifest + " requires an HTTP(S) upstream source");
      if (source.license !== font.license) throw Error(filename + " license differs from " + manifest);
      if (!Array.isArray(source.notices) || !source.notices.length)
        throw Error(manifest + " requires at least one notice");
      for (const notice of source.notices) {
        if (typeof notice !== "string" || !/^LICENSES\/[\w.-]+\.txt$/.test(notice))
          throw Error(manifest + " has an invalid notice path");
        const content = await readFile(new URL(notice, root));
        if (!content.length) throw Error(notice + " is empty");
        if (packed && !content.equals(await readFile(resolve(packed, notice))))
          throw Error(notice + " differs from the packaged notice");
      }
      if (packed) {
        const actual = await readFile(resolve(packed, manifest));
        const expected = await readFile(new URL(manifest, root));
        if (!expected.equals(actual)) throw Error(manifest + " differs from the packaged manifest");
        await readFile(resolve(packed, "fonts", family.name, filename));
      }
    }
    const name = filename.slice(0, -5);
    const keys = Object.keys(font.glyphs).sort();
    await writeFile(resolve(report, name + ".json"), JSON.stringify({
      name: font.name, license: font.license, glyphCount: keys.length, unicode: keys,
    }, null, 2));
    for (let page = 1; page <= Math.ceil(keys.length / 40); page++)
      await writeFile(resolve(report, name + "-" + page + ".svg"), specimen(font, "", page));
  }
}
