import { readFile } from "node:fs/promises";

const read = (relative) => readFile(new URL(relative, import.meta.url), "utf8");
const jsonScript = (value) => JSON.stringify(value).replace(/</g, "\\u003c");

export async function htmlPreview(font, sample, sheet) {
  const [binding, wasm, viewer, catalog, notices, license] = await Promise.all([
    read("../dist/index.js"),
    read("../dist/wasm.mjs"),
    read("./preview-browser.mjs"),
    read("./preview-language-samples.json"),
    read("./preview-language-samples.NOTICE.txt"),
    read("../LICENSES/Apache-2.0.txt"),
  ]);
  // Inline the build's WASM bytes so a file:// preview needs no server.
  const wasmImport = /^import bytes from ['"]\.\/wasm\.mjs['"];$/m;
  const wasmExport = /^export default ('[A-Za-z0-9+/=]+');?\s*$/;
  const bytes = wasm.match(wasmExport)?.[1];
  if (!wasmImport.test(binding) || !bytes)
    throw Error("Cannot embed the compiled lineFONT WASM binding");
  const runtime = binding.replace(
    wasmImport,
    () => "const bytes = " + bytes + ";",
  );
  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>lineFONT · Font preview</title>
<style>
  :root { font: 16px/1.5 system-ui, sans-serif; color: #142b35; background: #eef3f5; }
  * { box-sizing: border-box; }
  body { max-width: 840px; margin: auto; padding: 20px 12px; }
  h1 { margin: 0 0 16px; font-size: 1.45rem; }
  section { padding: 16px; background: white; border: 1px solid #b5c4ca; border-radius: 8px; }
  label { font-weight: 600; }
  select, textarea { display: block; width: 100%; border: 1px solid #778c97; border-radius: 4px; padding: 8px; font: inherit; color: inherit; background: white; }
  textarea { margin-bottom: 12px; resize: vertical; }
  #sample-kind, #coverage { margin: 4px 0 12px; overflow-wrap: anywhere; }
  #phrase-preview, #glyphs > svg { display: block; max-width: 100%; height: auto; }
  #phrase-preview { margin-bottom: 8px; }
  #phrase-preview[hidden] { display: none; }
  #glyphs { margin: 16px 0; }
  #glyphs label { display: block; }
  #glyphs.show-bounds .glyph-layout-bounds { display: inline; }
  #glyphs > svg { margin-top: 8px; }
  pre { white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
<section aria-label="Sample">
  <h1 id="font-name">Font preview</h1>
  <label for="language">Sample language</label>
  <select id="language"><option value="">Custom text</option></select>
  <p id="sample-kind"></p>
  <label for="sample">Sample text</label>
  <textarea id="sample" rows="2" maxlength="500" spellcheck="false"></textarea>
  <svg id="phrase-preview" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sample at 4 mm cap height at 100% print scale"></svg>
  <p id="coverage" role="status">Enter text or choose a language.</p>
</section>
<section id="glyphs" aria-label="Glyph cards">
  <label><input type="checkbox" id="bounds"> Show layout bounds (purple dashes)</label>
  ${sheet}
</section>
<details><summary>Language sample credits</summary><pre id="notices"></pre></details>
<script type="application/json" id="preview-data">${jsonScript({
    font,
    sample,
    catalog: JSON.parse(catalog),
    credits: notices + "\n" + license,
  })}</script>
<script type="module">
${runtime}
${viewer}
</script>
</html>
`;
}
