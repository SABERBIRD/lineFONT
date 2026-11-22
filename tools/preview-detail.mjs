import { translate } from "./preview-i18n.mjs";
import { inkBounds, layout } from "../dist/index.js";
import { escapeXml } from "./preview-xml.mjs";

export function glyphDetail(font, key, options, locale = "en") {
  const definition = font.glyphs[key];
  if (!definition) throw Error("Choose a glyph from this font");
  const { capHeight, baseline, defaultAdvance } = font.metrics;
  const result = layout([font], {
    text: String.fromCodePoint(Number.parseInt(key, 16)),
    height: capHeight,
    lineHeight: capHeight,
    top: 0,
    style: font.style,
  });
  const glyph = result.glyphs[0];
  const commands = glyph?.fontIndex === 0 ? glyph.commands : [];
  const advance = glyph?.advance ?? definition.advance ?? defaultAdvance;
  const anchors = Object.entries(definition.anchors ?? {});
  if (definition.attach) anchors.push(["attach", definition.attach]);
  const xs = [
    0,
    advance,
    result.bounds.x,
    result.bounds.x + result.bounds.width,
  ];
  const ys = [
    0,
    capHeight,
    result.bounds.y,
    result.bounds.y + result.bounds.height,
  ];
  for (const [, point] of anchors) {
    xs.push(point.x);
    ys.push(point.y + capHeight - baseline);
  }
  for (const command of commands) {
    for (let i = 0; i < command.values.length; i += 2) {
      xs.push(command.values[i]);
      ys.push(command.values[i + 1]);
    }
  }
  const left = Math.min(...xs),
    top = Math.min(...ys);
  const width = Math.max(...xs) - left,
    height = Math.max(...ys) - top;
  const unit = Math.max(width, height, capHeight) / 100;
  const margin = unit * 12;
  const d = commands
    .map(({ code, values }) => code + values.join(" "))
    .join(" ");
  const stroke = (value) => value * unit;
  const circle = (x, y, color) =>
    `<circle cx="${x}" cy="${y}" r="${stroke(1)}" fill="${color}"/>`;
  const handles = [],
    arrows = [];
  let current = [0, 0];
  for (const { code, values } of commands) {
    const end = values.slice(-2);
    if (code === "C") {
      handles.push(
        `<path d="M${current.join(" ")} L${values.slice(0, 2).join(" ")} M${end.join(" ")} L${values.slice(2, 4).join(" ")}" stroke="#72499d" stroke-width="${stroke(0.35)}"/>`,
      );
      handles.push(
        circle(values[0], values[1], "#72499d"),
        circle(values[2], values[3], "#72499d"),
      );
    }
    if (code !== "M") {
      handles.push(
        circle(current[0], current[1], "#376a91"),
        circle(end[0], end[1], "#376a91"),
      );
      const midpoint =
        code === "C"
          ? current.map(
              (v, i) => (v + 3 * values[i] + 3 * values[i + 2] + end[i]) / 8,
            )
          : current.map((v, i) => (v + end[i]) / 2);
      const tangent =
        code === "C"
          ? current.map(
              (v, i) => (3 * (end[i] + values[i + 2] - values[i] - v)) / 4,
            )
          : current.map((v, i) => end[i] - v);
      const length = Math.hypot(...tangent);
      if (length) {
        const dx = (tangent[0] / length) * unit * 3,
          dy = (tangent[1] / length) * unit * 3;
        arrows.push(
          `<path d="M${midpoint[0] - dx + dy * 0.5} ${midpoint[1] - dy - dx * 0.5} L${midpoint.join(" ")} L${midpoint[0] - dx - dy * 0.5} ${midpoint[1] - dy + dx * 0.5}" stroke="#9a5a16" stroke-width="${stroke(0.7)}"/>`,
        );
      }
    }
    current = end;
  }
  const bounds = inkBounds(commands);
  const boundRect = bounds
    ? `<rect x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" stroke="#9a5a16" stroke-width="${stroke(0.3)}" stroke-dasharray="${stroke(1)} ${stroke(1)}"/>`
    : "";
  const anchorMarks = anchors
    .map(([name, point]) => {
      const y = point.y + capHeight - baseline;
      return `<g>${circle(point.x, y, "#9d1761")}<text x="${point.x + unit * 2}" y="${y - unit * 2}" fill="#9d1761" font-size="${unit * 4}">${escapeXml(name)}</text></g>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${left - margin} ${top - margin} ${width + margin * 2} ${height + margin * 2}" role="img" aria-label="${translate(locale, "Glyph")} U+${key} · ${translate(locale, "detail")}" fill="none">
    <path d="M${left - margin} ${capHeight} H${left + width + margin}" stroke="#376a91" stroke-width="${stroke(0.3)}"/>
    ${options.strokes ? `<path d="${d}" stroke="#142b35" stroke-width="${stroke(0.8)}" stroke-linecap="round"/>${boundRect}` : ""}
    ${options.directions ? arrows.join("") : ""}
    ${options.controls ? handles.join("") : ""}
    ${options.advance ? `<path d="M0 ${top - margin} V${top + height + margin} M${advance} ${top - margin} V${top + height + margin}" stroke="#267351" stroke-width="${stroke(0.4)}"/>` : ""}
    ${options.anchors ? anchorMarks : ""}
  </svg>`;
}
