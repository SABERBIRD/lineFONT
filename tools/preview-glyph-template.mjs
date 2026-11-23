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
