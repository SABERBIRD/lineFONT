#!/usr/bin/env node
import fs from 'node:fs/promises';
import { validateFonts } from '../dist/index.js';
const json = process.argv[2] === '--json';
const files = process.argv.slice(json ? 3 : 2);
if (!files.length) {
  console.error('Usage: linefont-validate [--json] font.lint [more.lint ...]');
  process.exitCode = 2;
}
for (const file of files) {
  try {
    if ((await fs.stat(file)).size > 8_000_000) throw Error('Font file exceeds 8 MB');
    const [{ font, fingerprint }] = validateFonts([JSON.parse(await fs.readFile(file, 'utf8'))]);
    console.log(
      json
        ? JSON.stringify({ file, fingerprint, valid: true })
        : `${file}: ${font.name} ${font.version}, ${Object.keys(font.glyphs).length} glyphs, SHA-256 ${fingerprint}`
    );
  } catch (error) {
    const diagnostic = error.diagnostic ?? {
      code: error instanceof SyntaxError ? 'invalid_json' : 'file_error',
      path: '',
      glyph: null,
      commandIndex: null,
      message: String(error.message ?? error),
    };
    console.error(
      json
        ? JSON.stringify({ file, valid: false, diagnostic })
        : file +
            ': ' +
            error.message +
            (diagnostic.commandIndex == null
              ? ''
              : ' (command ' + (diagnostic.commandIndex + 1) + ')')
    );
    process.exitCode = 1;
  }
}
