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
    inscription,
    glyphTemplate,
    catalog,
    notices,
    license,
    specimenSource,
    xmlSource,
    detailSource,
    i18n,
    stylesheet,
  ] = await Promise.all([
    read("../dist/index.js"),
    read("../dist/wasm.mjs"),
    read("./preview-browser.mjs"),
    read("./preview-inscription.mjs"),
    read("./preview-glyph-template.mjs"),
    read("./preview-language-samples.json"),
    read("./preview-language-samples.NOTICE.txt"),
    read("../LICENSES/Apache-2.0.txt"),
    read("./preview-specimen.mjs"),
    read("./preview-xml.mjs"),
    read("./preview-detail.mjs"),
    read("./preview-i18n.mjs"),
    read("./preview.css"),
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
${stylesheet}
</style>
<p id="script-status" role="status">Interactive previews require JavaScript. Open this downloaded HTML in a browser with JavaScript enabled. The glyph sheet is available below.</p>
<header class="mast"><strong>line<span>FONT</span></strong><nav aria-label="Workspace"><a href="#sample-workspace">Sample</a><a href="#inscription">Inscription</a><a href="#glyphs">Glyphs</a></nav><select id="ui-language" aria-label="Interface language / Мова інтерфейсу"><option value="en">English</option><option value="uk">Українська</option></select></header>
<main><header class="font-header">
  <h1 id="font-name">${escapeXml(font.name)}</h1>
  <p id="font-metrics">${escapeXml(font.version)} · cap height ${font.metrics.capHeight} · baseline ${font.metrics.baseline} · default advance ${font.metrics.defaultAdvance}</p>
</header>
<section id="inscription">
<details><summary>Inscription</summary>
  <form id="inscription-form">
    <label for="inscription-text">Inscription text</label>
    <textarea id="inscription-text" rows="6" maxlength="100000" spellcheck="false"></textarea>
    <label for="inscription-file">Open a text file</label>
    <input id="inscription-file" type="file" accept=".txt,text/plain">
    <div class="inscription-metrics">
      <label>Capital height (mm)<input name="height" type="number" min="0.01" step="any" value="4" required></label>
      <label>Line height (mm)<input name="lineHeight" type="number" min="0.01" step="any" value="7.2" required></label>
      <label>Letter spacing (mm)<input name="letterSpacing" type="number" min="0" step="any" value="0" required></label>
      <label>Wrap width (mm, optional)<input name="wrapWidth" type="number" min="0.01" step="any"></label>
      <label>Stroke width (mm)<input name="stroke" type="number" min="0.01" step="any" value="0.2" required></label>
      <label>Margin (mm)<input name="margin" type="number" min="0" step="any" value="2" required></label>
    </div>
    <button type="submit">Render inscription</button>
    <button type="button" id="save-inscription" disabled>Download inscription SVG</button>
    <button type="button" id="save-inscription-pdf" disabled>Download inscription PDF</button>
  </form>
  <p id="inscription-status" role="status"></p>
  <div id="inscription-preview" class="scroll-area" tabindex="0" role="region" aria-label="Inscription preview"></div>
</details>
</section>
<section id="sample-workspace" aria-label="Sample"><div class="workspace">
<div class="proof"><h2>Text preview</h2>
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
</div><aside><h2>Sample settings</h2>
  <label for="language-search">Find a language</label>
  <input id="language-search" type="search" placeholder="English, Українська…" autocomplete="off">
  <label for="language">Sample language</label>
  <select id="language">
    <option value="">Custom text</option>
    ${languageOptions(samples)}
  </select>
  <label for="sample-type">Sample type</label><select id="sample-type" disabled><option value="text">Technical phrase</option><option value="alphabet">Alphabet</option></select>
  <p id="sample-kind"></p><p id="alphabet-coverage" role="status"></p>
  <label for="sample">Sample text</label>
  <textarea id="sample" rows="2" maxlength="500" spellcheck="false"></textarea>
  <label for="sample-size">Capital height on screen (px)</label>
  <input id="sample-size" type="number" min="12" max="96" step="1" value="28">
<details class="files"><summary>Open or compare fonts</summary>  <label for="font-file">Open a local .lint font</label>
  <input id="font-file" type="file" accept=".lint,application/json">
  <p id="font-status" role="status"></p>

  <label for="compare-file">Compare with another .lint font</label>
  <input id="compare-file" type="file" accept=".lint,application/json">
  <button id="clear-comparison" type="button" disabled>Remove comparison</button>
  <p id="compare-status" role="status"></p>
</details></aside></div>
</section>
<section id="glyphs" aria-label="Glyph cards"><h2>Glyph inspection</h2><div class="tools-row"><div>
  <label for="glyph-search">Find a glyph by character or Unicode code</label>
  <input id="glyph-search" type="search" placeholder="Ґ or U+0490" autocomplete="off">
</div><div>  <label for="detail-glyph">Inspect a glyph</label>
  <select id="detail-glyph"><option value="">Choose a glyph</option></select>
</div></div>
<details>
  <summary>Glyph SVG template</summary>
  <form id="glyph-template-form">
    <label for="glyph-template-font">Template font</label>
    <select id="glyph-template-font" name="templateFont"><option value="primary">Primary font</option><option value="comparison">Comparison font</option></select>
    <label for="glyph-template-symbol">Character or Unicode code</label>
    <input id="glyph-template-symbol" value="Ґ" required>
    <button type="submit">Download glyph template</button>
    <p id="glyph-template-status" role="status"></p>
  </form>
  <label for="glyph-import-file">Import edited glyph SVG</label>
  <input id="glyph-import-file" type="file" accept=".svg,image/svg+xml">
  <p id="glyph-import-status" role="status"></p>
  <div id="glyph-import-preview" class="scroll-area" aria-label="Imported pen path"></div>
  <div id="glyph-import-proof" class="scroll-area" aria-label="Glyph in sample text"></div>
  <button type="button" id="glyph-import-save" disabled>Download validated font</button>
  <button type="button" id="glyph-export-flat">Download flattened font</button>
</details>
  <div class="pager">
  <button id="glyph-prev" type="button">Previous page</button>
  <span id="glyph-page" role="status"></span>
  <button id="glyph-next" type="button">Next page</button>
  </div>
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
</main><details class="credits"><summary>Language sample credits</summary><pre>${escapeXml(notices + "\n" + license)}</pre></details>
<script type="application/json" id="preview-data">${jsonScript({
    font,
    page,
    sample,
    samples: samples.map(({ id, kind, text, alphabet }) => [
      id,
      { kind, text, alphabet },
    ]),
  })}</script>
<script>
(() => {
function loadLayout() {
${runtime}
return { layout, parseFont, inkBounds, coverage, importSvgPaths, flattenFont };
}
${browserSource(i18n)}
${browserSource(xmlSource)}
const inkBounds = commands => getRuntime().inkBounds(commands);
const layout = (...args) => getRuntime().layout(...args);
${browserSource(specimenSource)}
${browserSource(detailSource)}
${browserSource(inscription)}
${browserSource(glyphTemplate)}
${viewer}
})();
</script>
</html>
`;
}
