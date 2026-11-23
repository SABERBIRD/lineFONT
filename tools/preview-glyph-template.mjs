import { escapeXml } from "./preview-xml.mjs";

export function glyphTemplateKey(value) {
  const input = value.trim() || (value === " " ? value : "");
  const hex = /^(?:U\+)?([0-9a-f]{4,6})$/i.exec(input);
  const scalar = hex ? Number.parseInt(hex[1], 16)
    : Array.from(input).length === 1 ? input.codePointAt(0) : NaN;
  if (!Number.isInteger(scalar) || scalar > 0x10ffff ||
      (scalar >= 0xd800 && scalar <= 0xdfff)) return null;
  return scalar.toString(16).toUpperCase().padStart(4, "0");
}

export function glyphTemplateSvg(font, key) {
  const { capHeight, baseline, defaultAdvance } = font.metrics;
  const advance = font.glyphs[key]?.advance ?? defaultAdvance;
  const capTop = baseline - capHeight;
  const pad = capHeight / 2;
  const right = Math.max(advance, capHeight) + pad;
  const metadata = {
    font: { id: font.id, name: font.name, version: font.version, format: font.format,
      authors: font.authors, license: font.license },
    glyph: key,
    metrics: { capHeight, baseline, advance, defaultAdvance },
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${capTop - pad} ${right + pad} ${2 * capHeight}">
  <title>${escapeXml(font.name)} · U+${key}</title>
  <metadata id="linefont-glyph-template">${escapeXml(JSON.stringify(metadata))}</metadata>
  <g id="linefont-guides" fill="none" stroke-width="${capHeight / 100}">
    <path id="cap-top" stroke="#888" d="M${-pad} ${capTop} H${right}"/>
    <path id="baseline" stroke="#2864b0" d="M${-pad} ${baseline} H${right}"/>
    <path id="origin" stroke="#888" d="M0 ${capTop - pad} V${baseline + pad}"/>
    <path id="advance" stroke="#147a55" d="M${advance} ${capTop - pad} V${baseline + pad}"/>
  </g>
  <g id="linefont-glyph" fill="none" stroke="#142b35" stroke-width="${capHeight / 50}"/>
</svg>`;
}

function setupGlyphTemplate(getFont, t) {
  const form = document.getElementById("glyph-template-form");
  const input = document.getElementById("glyph-template-symbol");
  const status = document.getElementById("glyph-template-status");
  input.addEventListener("input", () => { status.textContent = ""; });
  form.addEventListener("change", () => { status.textContent = ""; });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const key = glyphTemplateKey(input.value);
    const font = getFont(form.elements.namedItem("templateFont").value);
    if (!key || !font) {
      status.textContent = t(key ? "Load a comparison font first." : "Enter one character or a Unicode code.");
      return;
    }
    status.textContent = "";
    const url = URL.createObjectURL(new Blob([glyphTemplateSvg(font, key)], { type: "image/svg+xml" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `linefont-U+${key}-template.svg`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}

function readGlyphArtwork(source, font, key) {
  const doc = new DOMParser().parseFromString(source, "image/svg+xml");
  const root = doc.documentElement;
  if (root.localName !== "svg" || root.namespaceURI !== "http://www.w3.org/2000/svg")
    throw Error("Invalid SVG document");
  const metadata = JSON.parse(doc.getElementById("linefont-glyph-template")?.textContent ?? "null");
  if (metadata && (metadata.font?.id !== font.id || metadata.glyph !== key ||
      metadata.metrics?.capHeight !== font.metrics.capHeight ||
      metadata.metrics?.baseline !== font.metrics.baseline))
    throw Error("The SVG template belongs to another font or character");

  const paths = [];
  let filled = false;
  function visit(node, transforms, fill, depth) {
    if (depth > 64) throw Error("SVG nesting is too deep");
    if (["title", "desc", "metadata", "defs"].includes(node.localName) ||
        node.id === "linefont-guides") return;
    if (node.namespaceURI !== root.namespaceURI ||
        !["svg", "g", "path"].includes(node.localName) || (node.localName === "svg" && node !== root))
      throw Error("Unsupported SVG artwork element: " + node.localName);
    if (["class", "clip-path", "mask", "filter", "display", "visibility"].some((a) => node.hasAttribute(a)))
      throw Error("Unsupported SVG styling or clipping");
    const inline = document.createElement("span").style;
    inline.cssText = node.getAttribute("style") ?? "";
    if ([...inline].some((p) => !["fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "fill-rule", "fill-opacity", "stroke-opacity", "opacity"].includes(p)))
      throw Error("Unsupported SVG inline style");
    const transform = node.getAttribute("transform");
    if (transform) transforms = [...transforms, transform];
    fill = inline.fill || node.getAttribute("fill") || fill;
    if (node.localName === "path") {
      const d = node.getAttribute("d");
      if (d?.trim()) {
        paths.push({ d, transforms });
        filled ||= fill !== "none";
      }
      return;
    }
    for (const child of node.children) visit(child, transforms, fill, depth + 1);
  }
  // A template defines its user coordinates in font units. Physical viewport
  // dimensions affect display size but never change the authored path coordinates.
  if (metadata) visit(root, [], "black", 0);
  else {
    for (const dimension of ["width", "height"]) {
      const value = root.getAttribute(dimension);
      if (value && !/^\s*(?:\d+\.?\d*|\.\d+)\s*(?:px|mm|cm|in|pt|pc)?\s*$/i.test(value))
        throw Error("Unsupported SVG viewport unit");
    }
    visit(root, [], "black", 0);
  }
  if (!paths.length) throw Error("Draw at least one SVG path");
  const result = getRuntime().importSvgPaths(paths);
  if (!result.commands.some(({ code }) => code !== "M")) throw Error("Draw at least one stroke");
  return { ...result, filled };
}

function setupGlyphImport(getFont, t) {
  const form = document.getElementById("glyph-template-form");
  const fileInput = document.getElementById("glyph-import-file");
  const status = document.getElementById("glyph-import-status");
  const preview = document.getElementById("glyph-import-preview");
  const proof = document.getElementById("glyph-import-proof");
  const save = document.getElementById("glyph-import-save");
  const choice = () => form.elements.namedItem("templateFont").value;
  const key = () => glyphTemplateKey(document.getElementById("glyph-template-symbol").value);
  let revision = 0;
  let imported;

  function clear() {
    revision += 1;
    imported = undefined;
    status.textContent = "";
    preview.replaceChildren();
    proof.replaceChildren();
    save.disabled = true;
  }
  function download(font, suffix) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(font, null, 2) + "\n"], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "linefont-" + suffix + ".lint";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  form.addEventListener("input", clear);
  fileInput.addEventListener("change", async () => {
    clear();
    const file = fileInput.files[0];
    if (!file) return;
    const sourceFont = getFont(choice());
    const glyphKey = key();
    const current = revision;
    try {
      if (!sourceFont || !glyphKey) throw Error("Select a font and enter a Unicode character");
      if (file.size > 2_000_000) throw Error("SVG file is too large");
      const source = await file.text();
      if (revision !== current || sourceFont !== getFont(choice())) return;
      const { commands, approximated, filled } = readGlyphArtwork(source, sourceFont, glyphKey);
      const candidate = structuredClone(sourceFont);
      const original = candidate.glyphs[glyphKey];
      const entry = original?.alias || original?.composite
        ? getRuntime().flattenFont(sourceFont).glyphs[glyphKey]
        : original ?? {};
      delete entry.alias;
      delete entry.composite;
      entry.d = commands.map(({ code, values }) => code + values.join(" ")).join(" ");
      candidate.glyphs[glyphKey] = entry;
      imported = getRuntime().parseFont(JSON.stringify(candidate));
      const image = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      paintSample(image, { bounds: inkBounds(commands), glyphs: [{ commands }] }, 10);
      preview.append(image);
      const text = String.fromCodePoint(Number.parseInt(glyphKey, 16));
      const sample = text === "Ґ" ? "Ґ Г ґ\nґвинт" : text;
      const layout = getRuntime().layout([imported], { text: sample, height: 4, lineHeight: 7.2, top: 0 });
      const proofImage = document.createElementNS(image.namespaceURI, "svg");
      paintSample(proofImage, layout, 6);
      proof.append(proofImage);
      status.textContent = [
        t("Imported glyph validated."),
        t("SVG user coordinates are treated as font units. Styling is discarded."),
        approximated ? t("Arcs were approximated by cubic curves.") : "",
        filled ? t("Filled outlines may trace both edges. Inspect the preview for double passes.") : "",
        layout.missing.length ? t("Missing characters · ") + layout.missing.map(formatCluster).join(", ") : "",
      ].filter(Boolean).join(" ");
      save.disabled = false;
    } catch (error) {
      if (current === revision) {
        clear();
        status.textContent = error.message;
        fileInput.value = "";
      }
    } finally {
      if (current === revision) fileInput.value = "";
    }
  });
  save.addEventListener("click", () => {
    if (imported) download(imported, "edited");
  });
  document.getElementById("glyph-export-flat").addEventListener("click", () => {
    try {
      const font = imported ?? getFont(choice());
      if (!font) throw Error("Select a loaded font");
      download(getRuntime().flattenFont(font), "flat");
    } catch (error) {
      status.textContent = error.message;
    }
  });
  return clear;
}
