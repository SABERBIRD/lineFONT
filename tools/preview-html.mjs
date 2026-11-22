import { readFile } from "node:fs/promises";

const read = (relative) => readFile(new URL(relative, import.meta.url), "utf8");
const jsonScript = (value) => JSON.stringify(value).replace(/</g, "\\u003c");

import { escapeXml } from "./preview-xml.mjs";

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

export async function htmlPreview(font, sample, sheet, page = 1) {
  const [
    binding,
    wasm,
    viewer,
    catalog,
    notices,
    license,
    specimenSource,
    boundsSource,
    xmlSource,
    detailSource,
  ] = await Promise.all([
    read("../dist/index.js"),
    read("../dist/wasm.mjs"),
    read("./preview-browser.mjs"),
    read("./preview-language-samples.json"),
    read("./preview-language-samples.NOTICE.txt"),
    read("../LICENSES/Apache-2.0.txt"),
    read("./preview-specimen.mjs"),
    read("./preview-ink-bounds.mjs"),
    read("./preview-xml.mjs"),
    read("./preview-detail.mjs"),
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
  const browserSource = (source) =>
    source.replace(/^import .*;\n/gm, "").replace(/^export /gm, "");
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
  label { display: block; font-weight: 600; }
  input, select, textarea { display: block; width: 100%; border: 1px solid #778c97; border-radius: 4px; padding: 8px; font: inherit; color: inherit; background: white; }
  button { font: inherit; padding: 8px 12px; cursor: pointer; min-height: 44px; margin: 4px 0; }
  input, select { min-height: 44px; }
  input[type=checkbox] { width: 24px; min-height: 24px; margin: 0 8px 0 0; }
  :focus-visible { outline: 3px solid #376a91; outline-offset: 3px; }
  h2 { font-size: 1.1rem; }
  fieldset { min-width: 0; margin: 12px 0; border: 1px solid #778c97; }
  #detail-options label { display: flex; align-items: center; min-height: 44px; }
  .scroll-area { overflow: auto; max-width: 100%; }
  #detail-image > svg { display: block; width: 100%; height: 320px; }
  #glyph-sheet > svg { min-width: 680px; }
  #font-metrics, #detail-metrics, #compare-status, #comparison-coverage { overflow-wrap: anywhere; }
  #comparison-preview { display: block; max-width: none; }
  .pager { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 8px 0; }
  .pager span { flex-basis: 100%; order: -1; }
  #glyph-sheet [data-glyph] { cursor: pointer; }
  #glyph-sheet [data-glyph]:focus > rect { stroke: #376a91; stroke-width: 1; }
  [hidden] { display: none !important; }
  textarea { margin-bottom: 12px; resize: vertical; }
  #sample-kind, #coverage { margin: 4px 0 12px; overflow-wrap: anywhere; }
  #phrase-preview, #glyph-sheet > svg { display: block; max-width: 100%; height: auto; }
  #phrase-preview { margin-bottom: 8px; max-width: none; }
  #preview-scroll { overflow: auto; margin-top: 12px; }
  #language-search { margin-bottom: 12px; }
  #phrase-preview[hidden] { display: none; }
  #glyphs { margin: 16px 0; }
  #glyph-sheet > svg { margin-top: 8px; }
  pre { white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
<noscript><p role="alert">Interactive previews require JavaScript. Open this downloaded HTML in a browser with JavaScript enabled. The glyph sheet remains available below.</p></noscript>
<section aria-label="Sample">
  <h1 id="font-name">${escapeXml(font.name)}</h1>
  <label for="font-file">Open a local .lint font</label>
  <input id="font-file" type="file" accept=".lint,application/json">
  <p id="font-status" role="status"></p>
  <p id="font-metrics">${escapeXml(font.version)} · cap height ${font.metrics.capHeight} · baseline ${font.metrics.baseline} · default advance ${font.metrics.defaultAdvance}</p>
  <label for="compare-file">Compare with another .lint font</label>
  <input id="compare-file" type="file" accept=".lint,application/json">
  <button id="clear-comparison" type="button" disabled>Remove comparison</button>
  <p id="compare-status" role="status"></p>
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
  <div id="preview-scroll" class="scroll-area" tabindex="0" role="region" aria-label="Primary font sample"><svg id="phrase-preview" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Font sample"></svg></div>
  <div id="comparison" hidden>
    <h2 id="comparison-name"></h2>
    <div class="scroll-area" tabindex="0" role="region" aria-label="Second font sample"><svg id="comparison-preview" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Second font sample"></svg></div>
    <p id="comparison-coverage" role="status"></p>
  </div>
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
  <label for="glyph-search">Find a glyph by character or Unicode code</label>
  <input id="glyph-search" type="search" placeholder="Ґ or U+0490" autocomplete="off">
  <div class="pager">
  <button id="glyph-prev" type="button">Previous page</button>
  <span id="glyph-page" role="status"></span>
  <button id="glyph-next" type="button">Next page</button>
  </div>
  <label for="detail-glyph">Inspect a glyph</label>
  <select id="detail-glyph"><option value="">Choose a glyph</option></select>
  <div id="detail-panel" hidden>
    <p id="detail-metrics"></p>
    <fieldset id="detail-options"><legend>Glyph overlays</legend>
      <label><input type="checkbox" name="strokes" checked>Strokes and bounds</label>
      <label><input type="checkbox" name="directions">Stroke directions</label>
      <label><input type="checkbox" name="controls">Control points</label>
      <label><input type="checkbox" name="advance" checked>Advance</label>
      <label><input type="checkbox" name="anchors" checked>Anchors</label>
    </fieldset>
    <div id="detail-image"></div>
    <p id="detail-status" role="status"></p>
  </div>
  <div id="glyph-sheet" class="scroll-area" tabindex="0" role="region" aria-label="Glyph cards">${sheet}</div>
</section>
<details><summary>Language sample credits</summary><pre>${escapeXml(notices + "\n" + license)}</pre></details>
<script type="application/json" id="preview-data">${jsonScript({
    font,
    page,
    sample,
    samples: samples.map(({ id, kind, text }) => [id, { kind, text }]),
  })}</script>
<script>
(() => {
function loadLayout() {
${runtime}
return { layout, parseFont };
}
${browserSource(xmlSource)}
${browserSource(boundsSource)}
const layout = (...args) => getRuntime().layout(...args);
${browserSource(specimenSource)}
${browserSource(detailSource)}
${viewer}
})();
</script>
</html>
`;
}
