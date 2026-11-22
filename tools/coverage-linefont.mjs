#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { parseFont, coverage } from "../dist/index.js";
const [language, ...files] = process.argv.slice(2);
const { samples } = JSON.parse(
  await readFile(new URL("./preview-language-samples.json", import.meta.url)),
);
try {
  const profile = samples.find(
    (s) => s.id === language || s.id.split("_")[0] === language,
  );
  if (!profile || !files.length)
    throw Error(
      "Usage: linefont-coverage <language> <font.lint> [fallback.lint …]\nLanguages: " +
        samples.map((s) => s.id).join(", "),
    );
  const fonts = await Promise.all(
    files.map(async (file) => parseFont(await readFile(file, "utf8"))),
  );
  console.log(
    JSON.stringify(
      {
        language: profile.id,
        fonts: files,
        alphabet: coverage(fonts, profile.alphabet),
        decomposed: coverage(fonts, profile.alphabet.normalize("NFD")),
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
