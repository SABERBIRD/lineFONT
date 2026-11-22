import { copyFileSync } from 'node:fs';
copyFileSync(new URL('../bindings/js/wasm.mjs', import.meta.url), new URL('../dist/wasm.mjs', import.meta.url));
