import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = new URL('../core/', import.meta.url);
const flags =
  process.env.CARGO_ENCODED_RUSTFLAGS !== undefined
    ? process.env.CARGO_ENCODED_RUSTFLAGS.split('\u001f').filter(Boolean)
    : (process.env.RUSTFLAGS ?? '').split(/\s+/).filter(Boolean);
flags.push(
  `--remap-path-prefix=${path.resolve(process.env.CARGO_HOME ?? path.join(os.homedir(), '.cargo'))}=/cargo`,
  `--remap-path-prefix=${fileURLToPath(root)}=/linefont/`
);
const result = spawnSync(
  'cargo',
  ['build', '--locked', '--release', '--target', 'wasm32-unknown-unknown'],
  {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, CARGO_ENCODED_RUSTFLAGS: flags.join('\u001f') },
  }
);
if (result.status !== 0) process.exit(result.status ?? 1);
const wasm = fs.readFileSync(new URL('target/wasm32-unknown-unknown/release/linefont.wasm', root));
fs.writeFileSync(new URL('../bindings/js/wasm.mjs', import.meta.url), `export default '${wasm.toString('base64')}';\n`);
