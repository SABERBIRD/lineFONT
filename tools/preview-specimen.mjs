import { layout } from "../dist/index.js";
import { escapeXml } from "./preview-xml.mjs";
import { inkBounds } from "./preview-ink-bounds.mjs";

export function matchingGlyphs(font, filter = "") {
  const keys = Object.keys(font.glyphs).sort(
    (a, b) => Number.parseInt(a, 16) - Number.parseInt(b, 16),
  );
  const query = filter.trim();
  const codeQuery = query.replace(/^U\+/i, "").toUpperCase();
  return query
    ? keys.filter(
        (key) =>
          String.fromCodePoint(Number.parseInt(key, 16)) === query ||
          key.includes(codeQuery),
      )
    : keys;
}

const number = (value) => Number(value.toPrecision(10));
const path = (commands) =>
  commands
    .map(({ code, values }) => code + values.map(number).join(" "))
    .join(" ");
const text = (x, y, value, size = 3) =>
  `<text x="${x}" y="${y}" font-size="${size}">${escapeXml(value)}</text>`;
const line = (x1, y1, x2, y2, color) =>
  `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${color}" stroke-width=".2" fill="none"/>`;

function specimenGeometry(font, keys, shown) {
  const { capHeight, baseline, defaultAdvance } = font.metrics;
  const fonts = [font];
  const visible = new Map(shown.map((key) => [key, null]));
  let left = 0;
  let top = 0;
  let right = defaultAdvance;
  let bottom = capHeight;

  for (const key of keys) {
    const definition = font.glyphs[key];
    const result = layout(fonts, {
      text: String.fromCodePoint(Number.parseInt(key, 16)),
      height: capHeight,
      lineHeight: capHeight,
      top: 0,
      style: font.style,
    });
    const glyph = result.glyphs[0];
    const advance = glyph?.advance ?? definition.advance ?? defaultAdvance;
    const anchors = Object.entries(definition.anchors ?? {});
    if (definition.attach) anchors.push(["attach", definition.attach]);
    right = Math.max(right, advance);
    if (glyph?.fontIndex === 0) {
      const { x, y, width, height } = result.bounds;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x + width);
      bottom = Math.max(bottom, y + height);
    }
    for (const [, point] of anchors) {
      const y = point.y + capHeight - baseline;
      left = Math.min(left, point.x);
      top = Math.min(top, y);
      right = Math.max(right, point.x);
      bottom = Math.max(bottom, y);
    }
    if (visible.has(key)) visible.set(key, { glyph, advance, anchors });
  }

  const width = right - left || capHeight;
  const height = bottom - top;
  const scale = Math.min(12 / capHeight, 32 / width, 17 / height);
  const px = (x) => number(3 + (32 - width * scale) / 2 + (x - left) * scale);
  const py = (y) => number(6.5 + (17 - height * scale) / 2 + (y - top) * scale);
  return { visible, scale, px, py };
}

function glyphCard(font, geometry, key, index) {
  const { capHeight, baseline } = font.metrics;
  const { visible, scale, px, py } = geometry;
  const { glyph, advance, anchors } = visible.get(key);
  const x = 6 + (index % 5) * 40;
  const y = Math.floor(index / 5) * 30;
  const commands = glyph?.fontIndex === 0 ? glyph.commands : [];
  const outline = commands.length
    ? `<path transform="translate(${px(0)} ${py(0)}) scale(${number(scale)})" d="${path(commands)}" fill="none" stroke="#142b35" stroke-width="${number(0.36 / scale)}"/>`
    : "";
  const bounds = inkBounds(commands);
  const frame = bounds
    ? `<rect class="glyph-ink-bounds" x="${px(bounds.x)}" y="${py(bounds.y)}" width="${number(bounds.width * scale)}" height="${number(bounds.height * scale)}" stroke="#9a5a16" stroke-width=".2" stroke-dasharray=".7 .5" fill="none"/>`
    : "";
  const points = anchors
    .map(
      ([name, point]) =>
        `<circle cx="${px(point.x)}" cy="${py(point.y + capHeight - baseline)}" r=".65" fill="#9d1761"><title>${escapeXml(name)}</title></circle>`,
    )
    .join("");
  const rect = `<rect x="0" y="0" width="38" height="28" rx="1" fill="#fff" stroke="#b5c4ca" stroke-width=".2"/>`;
  const label = `U+${key} · advance ${number(advance)}`;
  return `<g transform="translate(${x} ${y})">${rect}${text(2, 4, label, 2.6)}
    <svg x="0" y="5" width="38" height="19.5" viewBox="0 5 38 19.5" overflow="hidden">
      ${line(2, py(0), 36, py(0), "#9eafb7")}${line(2, py(capHeight), 36, py(capHeight), "#376a91")}
      ${line(px(0), 5, px(0), 24.5, "#9eafb7")}${line(px(advance), 5, px(advance), 24.5, "#267351")}
      ${frame}${outline}${points}
    </svg>
    ${!glyph || glyph.fontIndex === null ? text(2, 26.5, "Unresolved in text layout", 2.2) : ""}
  </g>`;
}

export function specimen(font, sample, page, filter = "") {
  const keys = matchingGlyphs(font);
  const filtered = matchingGlyphs(font, filter);
  const pages = Math.max(1, Math.ceil(filtered.length / 40));
  if (!Number.isInteger(page) || page < 1 || page > pages)
    throw Error(`Page must be 1–${pages}`);
  const shown = filtered.slice((page - 1) * 40, page * 40);
  const geometry = specimenGeometry(font, keys, shown);
  const sampleLayout = sample
    ? layout([font], {
        text: sample,
        height: 4,
        lineHeight: 7,
        wrapWidth: 198,
        top: 0,
        style: font.style,
      })
    : null;
  const bounds = sampleLayout?.bounds;
  const missing = (sampleLayout?.missing ?? []).map((cluster) =>
    [...cluster]
      .map(
        (char) =>
          "U+" +
          char.codePointAt(0).toString(16).toUpperCase().padStart(4, "0"),
      )
      .join("+"),
  );
  const sampleHeight = bounds ? Math.max(7, bounds.height) : 0;
  const legendY = bounds ? number(35 + sampleHeight) : 21;
  const cardTop = legendY + 6;
  const height = number(cardTop + Math.ceil(shown.length / 5) * 30 + 4);
  const coverage = `${filtered.length}/${keys.length} glyphs · page ${page}/${pages}`;
  const missingLabel = missing.length
    ? missing.slice(0, 9).join(", ") +
      (missing.length > 9 ? ` … (${missing.length} total)` : "")
    : "none";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="${height}mm" viewBox="0 0 210 ${height}" font-family="sans-serif" fill="#142b35">
  <title>${escapeXml(font.name)} — lineFONT specimen</title>
  <rect width="210" height="${height}" fill="#eef3f5"/>
  ${text(6, 9, font.name, 5)}
  ${text(6, 15, coverage)}
  ${
    sampleLayout && bounds
      ? `
  ${text(6, 21, "Sample · 4 mm cap height at 100% print scale")}
  <g transform="translate(${number(6 - bounds.x)} ${number(24 - bounds.y)})" fill="none" stroke="#142b35" stroke-width=".22" stroke-linecap="round" stroke-linejoin="round">
  ${sampleLayout.glyphs.map((glyph) => `<path d="${path(glyph.commands)}"/>`).join("\n  ")}
  </g>
  ${text(6, number(29 + sampleHeight), "Missing in sample · " + missingLabel)}
  `
      : ""
  }
  ${text(6, legendY, "Gray · cap top/origin   Blue · baseline   Green · advance   Magenta · anchor   Amber · stroke bounds")}
  <g transform="translate(0 ${cardTop})">${shown.map((key, index) => glyphCard(font, geometry, key, index)).join("\n")}</g>
</svg>\n`;
}
