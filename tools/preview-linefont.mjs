#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import { layout, parseFont } from "../dist/index.js";

const escapeXml = (value) =>
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
const number = (value) => Number(value.toPrecision(10));
const path = (commands) =>
  commands
    .map(({ code, values }) => code + values.map(number).join(" "))
    .join(" ");
const text = (x, y, value, size = 3) =>
  `<text x="${x}" y="${y}" font-size="${size}">${escapeXml(value)}</text>`;
const line = (x1, y1, x2, y2, color) =>
  `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${color}" stroke-width=".2" fill="none"/>`;

function glyphCard(font, key, index) {
  const { capHeight, baseline } = font.metrics;
  const definition = font.glyphs[key];
  const result = layout([font], {
    text: String.fromCodePoint(Number.parseInt(key, 16)),
    height: capHeight,
    lineHeight: capHeight,
    top: 0,
    style: font.style,
  });
  const glyph = result.glyphs[0];
  const x = 6 + (index % 5) * 40;
  const y = Math.floor(index / 5) * 30;
  const advance =
    glyph?.advance ?? definition.advance ?? font.metrics.defaultAdvance;
  const anchors = Object.entries(definition.anchors ?? {});
  if (definition.attach) anchors.push(["attach", definition.attach]);
  const commands = glyph?.fontIndex === 0 ? glyph.commands : [];
  const scale = Math.min(
    12 / capHeight,
    24 / Math.max(capHeight, font.metrics.defaultAdvance),
  );
  const px = (value) => number(7 + value * scale);
  const py = (value) => number(8 + value * scale);
  const outline = commands.length
    ? `<path transform="translate(${px(0)} ${py(0)}) scale(${number(scale)})" d="${path(commands)}" fill="none" stroke="#142b35" stroke-width="${number(0.36 / scale)}"/>`
    : "";
  const bounds = result.bounds;
  const frame =
    glyph?.fontIndex === 0
      ? `<rect class="glyph-layout-bounds" x="${px(bounds.x)}" y="${py(bounds.y)}" width="${number(bounds.width * scale)}" height="${number(bounds.height * scale)}" stroke="#9a5a16" stroke-width=".2" stroke-dasharray="1 .7" fill="none"/>`
      : "";
  const overflow =
    glyph?.fontIndex === 0 &&
    (px(bounds.x) < 1 ||
      px(bounds.x + bounds.width) > 37 ||
      py(bounds.y) < 5 ||
      py(bounds.y + bounds.height) > 24.5 ||
      anchors.some(([, point]) => {
        const x = px(point.x);
        const y = py(point.y + capHeight - baseline);
        return x < 1 || x > 37 || y < 5 || y > 24.5;
      }));
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
    ${!glyph || glyph.fontIndex === null ? text(2, 26.5, "Unresolved in text layout", 2.2) : overflow ? text(2, 26.5, "Extends beyond card", 2.2) : ""}
  </g>`;
}

function specimen(font, sample, page) {
  const keys = Object.keys(font.glyphs).sort(
    (a, b) => Number.parseInt(a, 16) - Number.parseInt(b, 16),
  );
  const pages = Math.max(1, Math.ceil(keys.length / 40));
  if (!Number.isInteger(page) || page < 1 || page > pages)
    throw Error(`Page must be 1–${pages}`);
  const shown = keys.slice((page - 1) * 40, page * 40);
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
  const coverage = `${keys.length} explicit glyphs · page ${page}/${pages}`;
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
  ${text(6, legendY, "Gray · cap top/origin   Blue · baseline   Green · advance   Magenta · anchor   Amber · layout bounds")}
  <g transform="translate(0 ${cardTop})">${shown.map((key, index) => glyphCard(font, key, index)).join("\n")}</g>
</svg>\n`;
}

const [file, sample = "", page = "1", ...extra] = process.argv.slice(2);
if (!file || extra.length) {
  console.error(
    "Usage: linefont-preview font.lint [sample text] [page] > specimen.svg",
  );
  process.exitCode = 2;
} else {
  try {
    if ((await stat(file)).size > 8_000_000)
      throw Error("Font file exceeds 8 MB");
    if (sample.length > 500)
      throw Error("Sample exceeds 500 UTF-16 code units");
    process.stdout.write(
      specimen(parseFont(await readFile(file, "utf8")), sample, Number(page)),
    );
  } catch (error) {
    console.error(
      `${file}: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  }
}
