import { readFile } from "node:fs/promises";

const read = (relative) => readFile(new URL(relative, import.meta.url), "utf8");
const jsonScript = (value) => JSON.stringify(value).replace(/</g, "\\u003c");

export const escapeXml = (value) =>
  String(value)
    .replace(
      /[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu,
      "�",
    )
    .replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&apos;",
        })[char],
    );
function languageOptions(samples) {
  return [
    ["Latn", "Latin"],
    ["Cyrl", "Cyrillic"],
    ["Grek", "Greek"],
  ]
    .map(([script, label]) => {
      const options = samples
        .filter((entry) => entry.script === script)
        .map(({ id, name, autonym }) => {
          const title =
            autonym && autonym.toLowerCase() !== name.toLowerCase()
              ? `${name} · ${autonym}`
              : name;
          return `<option value="${escapeXml(id)}">${escapeXml(title)} [${escapeXml(id.replaceAll("_", "-"))}]</option>`;
        })
        .join("\n");
      return `<optgroup label="${label}">${options}</optgroup>`;
    })
    .join("\n");
}

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
  const runtime = binding
    .replace(wasmImport, () => "const bytes = " + bytes + ";")
    .replace(/^export (?=function )/gm, "");
  const { samples } = JSON.parse(catalog);
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
  input, select, textarea { display: block; width: 100%; border: 1px solid #778c97; border-radius: 4px; padding: 8px; font: inherit; color: inherit; background: white; }
  button { font: inherit; padding: 8px 12px; cursor: pointer; }
  [hidden] { display: none !important; }
  textarea { margin-bottom: 12px; resize: vertical; }
  #sample-kind, #coverage { margin: 4px 0 12px; overflow-wrap: anywhere; }
  #phrase-preview, #glyphs > svg { display: block; max-width: 100%; height: auto; }
  #phrase-preview { margin-bottom: 8px; max-width: none; }
  #preview-scroll { overflow: auto; margin-top: 12px; }
  #language-search { margin-bottom: 12px; }
  #phrase-preview[hidden] { display: none; }
  #glyphs { margin: 16px 0; }
  #glyphs > svg { margin-top: 8px; }
  pre { white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
<section aria-label="Sample">
  <h1>${escapeXml(font.name)}</h1>
  <label for="language-search">Find a language</label>
  <input id="language-search" type="search" placeholder="English, Українська…" autocomplete="off">
  <label for="language">Sample language</label>
  <select id="language">
    <option value="">Custom text</option>
    ${languageOptions(samples)}
  </select>
  <p id="sample-kind"></p>
  <label for="sample">Sample text</label>
  <textarea id="sample" rows="2" maxlength="500" spellcheck="false"></textarea>
  <label for="sample-size">Capital height on screen (px)</label>
  <input id="sample-size" type="number" min="12" max="96" step="1" value="28">
  <div id="preview-scroll"><svg id="phrase-preview" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Font sample"></svg></div>
  <button id="save-svg" type="button" disabled>Download sample SVG</button>
  <div id="missing-panel" hidden>
    <label for="missing-symbols">Missing characters and Unicode codes</label>
    <textarea id="missing-symbols" readonly rows="3"></textarea>
    <button id="copy-missing" type="button">Copy missing characters</button>
    <p id="copy-status" role="status"></p>
  </div>
  <p id="coverage" role="status">To render this sample interactively, open the downloaded HTML in a browser with JavaScript enabled.</p>
</section>
<section id="glyphs" aria-label="Glyph cards">
  ${sheet}
</section>
<details><summary>Language sample credits</summary><pre>${escapeXml(notices + "\n" + license)}</pre></details>
<script type="application/json" id="preview-data">${jsonScript({
    font,
    sample,
    samples: samples.map(({ id, kind, text }) => [id, { kind, text }]),
  })}</script>
<script>
(() => {
function loadLayout() {
${runtime}
return layout;
}
${viewer}
})();
</script>
</html>
`;
}
