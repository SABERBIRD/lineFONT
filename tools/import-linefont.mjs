#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import { parseArgs } from "node:util";
import { importStrokeFont, parseFont } from "../dist/index.js";
import { finishFontImport } from "./preview-font-import.mjs";

try {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: Object.fromEntries([
      ...["name", "id", "author", "version", "license", "cap-height", "source-url", "source-version"]
        .map((key) => [key, { type: "string" }]),
      ["omit-incomplete", { type: "boolean" }],
      ["help", { type: "boolean" }],
    ]),
  });
  if (values.help) {
    console.log("Usage: linefont-import [--name NAME] [--id ID] [--author AUTHOR] [--version VERSION] [--license LICENSE] [--cap-height HEIGHT] [--source-url URL --source-version VERSION] [--omit-incomplete] FONT.svg|FONT.lff");
  } else {
    if (positionals.length !== 1 || (await stat(positionals[0])).size > 8_000_000)
      throw Error("Pass one SVG or LFF font under 8 MB");
    const options = Object.fromEntries(["name", "id", "author", "version", "license"]
      .filter((key) => values[key] !== undefined).map((key) => [key, values[key]]));
    if (values["cap-height"] !== undefined) {
      options.capHeight = Number(values["cap-height"]);
      if (!Number.isFinite(options.capHeight) || options.capHeight <= 0) throw Error("Invalid cap height");
    }
    if (values["source-url"] || values["source-version"]) {
      if (!values["source-url"] || !values["source-version"]) throw Error("Provide both source URL and version");
      options.source = { url: values["source-url"], version: values["source-version"] };
    }
    const source = await readFile(positionals[0], "utf8");
    const result = importStrokeFont(source, options, /\.lff$/i.test(positionals[0]) ? "lff" : "svg");
    for (const warning of result.warnings) console.error(warning);
    const font = finishFontImport(result, values["omit-incomplete"], parseFont);
    for (const { name, missing } of result.blocks)
      console.error("Omitted " + name + " · missing " + missing.join(" "));
    console.log(JSON.stringify(font, null, 2));
  }
} catch (error) {
  console.error("linefont-import: " + error.message);
  process.exitCode = 1;
}
