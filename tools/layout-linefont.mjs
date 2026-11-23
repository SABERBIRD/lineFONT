#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { layout, parseFont } from "../dist/index.js";
import { inscriptionSvg, layoutInscription } from "./preview-inscription.mjs";

try {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      font: { type: "string", multiple: true },
      height: { type: "string" },
      format: { type: "string", default: "svg" },
      help: { type: "boolean" },
    },
  });
  if (values.help) {
    console.log("Usage: linefont-layout --font FONT.lint --height MM [--format svg|json] [TEXTFILE|-]");
  } else {
    const height = Number(values.height);
    if (!values.font?.length || !Number.isFinite(height) || height <= 0 ||
        !["svg", "json"].includes(values.format) || positionals.length > 1)
      throw Error("Expected --font, a positive --height, and optionally --format svg|json and a text file");
    const fonts = await Promise.all(values.font.map(async (file) => parseFont(await readFile(file, "utf8"))));
    const file = positionals[0] ?? "-";
    const bytes = file === "-" ? Buffer.concat(await Array.fromAsync(process.stdin)) : await readFile(file);
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const options = { height, lineHeight: height * 1.8, top: 0 };
    if (values.format === "json") console.log(JSON.stringify(layout(fonts, { ...options, text })));
    else console.log(inscriptionSvg(layoutInscription(fonts, text, { ...options, stroke: 0.2, margin: 2 })));
  }
} catch (error) {
  console.error("linefont-layout: " + error.message);
  process.exitCode = 1;
}
