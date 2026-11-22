#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import { layout, parseFont } from "../dist/index.js";
import { htmlPreview } from "./preview-html.mjs";

import { specimen } from "./preview-specimen.mjs";

const args = process.argv.slice(2);
const interactive = args[0] === "--html";
if (interactive) args.shift();
const [file, sample = "", page = "1", ...extra] = args;
if (!file || extra.length) {
  console.error(
    "Usage: linefont-preview [--html] font.lint [sample text] [page]",
  );
  process.exitCode = 2;
} else {
  try {
    if ((await stat(file)).size > 8_000_000)
      throw Error("Font file exceeds 8 MB");
    if (sample.length > 500)
      throw Error("Sample exceeds 500 UTF-16 code units");
    const font = parseFont(await readFile(file, "utf8"));
    const sheet = specimen(font, interactive ? "" : sample, Number(page));
    process.stdout.write(
      interactive
        ? await htmlPreview(font, sample, sheet, Number(page))
        : sheet,
    );
  } catch (error) {
    console.error(
      `${file}: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  }
}
