#!/usr/bin/env node
import fs from 'node:fs/promises';
import { validateFonts } from '../dist/index.js';
const files = process.argv.slice(2);
if (!files.length) {
  console.error('Usage: linefont-validate font.lint [more.lint ...]');
  process.exitCode = 2;
}
for (const file of files) {
  try {
    if ((await fs.stat(file)).size > 8_000_000) throw Error('Font file exceeds 8 MB');
    const [{ font, fingerprint }] = validateFonts([JSON.parse(await fs.readFile(file, 'utf8'))]);
    console.log(
      `${file}: ${font.name} ${font.version}, ${Object.keys(font.glyphs).length} glyphs, SHA-256 ${fingerprint}`
    );
  } catch (error) {
    console.error(`${file}: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
