// Geometry and SVG dimensions share millimetres, including the stroke and margins.
function layoutInscription(fonts, text, options) {
  const { stroke, margin, ...layoutOptions } = options;
  const result = layout(fonts, { ...layoutOptions, text, top: 0 });
  const { x, y, width, height } = result.bounds;
  const padding = margin + stroke / 2;
  const pageWidth = width + 2 * padding;
  const pageHeight = height + 2 * padding;
  return {
    commands: result.glyphs.flatMap(({ commands }) => commands),
    missing: result.missing,
    stroke, x: x - padding, y: y - padding, width: pageWidth, height: pageHeight,
  };
}

function inscriptionSvg({ commands, stroke, x, y, width, height }) {
  const path = commands.map(({ code, values }) => code + values.join(" "))
    .join(" ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="${x} ${y} ${width} ${height}"><path d="${path}" fill="none" stroke="#142b35" stroke-width="${stroke}" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

// Each open SVG subpath maps to an open PDF subpath with the same stroke.
function inscriptionPdf({ commands, stroke, x, y, width, height }) {
  const pointsPerMm = 72 / 25.4;
  const unit = Math.max(1, Math.ceil(Math.max(width, height) * pointsPerMm / 14400));
  const scale = pointsPerMm / unit;
  const number = (value) => value.toFixed(8).replace(/\.?0+$/, "");
  const operators = { M: "m", L: "l", C: "c" };
  const path = commands.map(({ code, values }) => {
    const coords = values.map((value, index) =>
      number(scale * (index % 2 === 0 ? value - x : height - (value - y))),
    );
    return coords.join(" ") + " " + operators[code];
  }).join("\n");
  const stream = `0.078431 0.168627 0.207843 RG
${number(stroke * scale)} w
1 J
1 j
${path}
S
`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${number(width * scale)} ${number(height * scale)}] /UserUnit ${unit} /Resources << >> /Contents 4 0 R >>`,
    `<< /Length ${stream.length} >>\nstream\n${stream}endstream`,
  ];
  // All data is ASCII, so string offsets are the byte offsets in the download.
  let pdf = "%PDF-1.6\n";
  const offsets = objects.map((object, index) => {
    const offset = pdf.length;
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    return String(offset).padStart(10, "0") + " 00000 n \n";
  });
  return pdf + `xref\n0 5\n0000000000 65535 f \n${offsets.join("")}trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${pdf.length}\n%%EOF\n`;
}

function setupInscription(getFonts, t, errorDetail) {
  const form = document.getElementById("inscription-form");
  const input = document.getElementById("inscription-text");
  const fileInput = document.getElementById("inscription-file");
  const preview = document.getElementById("inscription-preview");
  const status = document.getElementById("inscription-status");
  const save = document.getElementById("save-inscription");
  const savePdf = document.getElementById("save-inscription-pdf");
  let svg;
  let inscription;
  let rendered = false;
  document.querySelector('nav a[href="#inscription"]').addEventListener("click", () => {
    form.closest("details").open = true;
  });

  function clear() {
    svg = undefined;
    save.disabled = savePdf.disabled = true;
    inscription = undefined;
    preview.replaceChildren();
    status.textContent = "";
  }

  function render() {
    clear();
    if (!rendered || !input.value || !form.checkValidity()) return;
    try {
      const values = new FormData(form);
      const options = Object.fromEntries(
        [...values].filter(([, value]) => value !== "").map(([key, value]) => [key, Number(value)]),
      );
      inscription = layoutInscription(getFonts(), input.value, options);
      svg = inscriptionSvg(inscription);
      // Only serialized numeric geometry and constant attributes enter this SVG.
      preview.innerHTML = svg;
      status.textContent = inscription.missing.length
        ? t("Missing characters · ") + inscription.missing.map(formatCluster).join(", ")
        : t("All characters in this sample are supported.");
      save.disabled = savePdf.disabled = false;
    } catch (error) {
      status.textContent = t("Cannot render the inscription · ") + errorDetail(error);
    }
  }

  form.addEventListener("input", () => {
    rendered = false;
    clear();
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    rendered = true;
    render();
  });

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;
    try {
      if (file.size > 400_000) throw Error(t("Text file is too large"));
      const text = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
      if (fileInput.files[0] !== file) return;
      if (text.length > input.maxLength) throw Error(t("Text file is too large"));
      input.value = text;
      rendered = true;
      render();
    } catch (error) {
      if (fileInput.files[0] === file)
        status.textContent = t("Cannot open text file · ") + error.message;
    }
  });

  function download(data, type, extension) {
    const url = URL.createObjectURL(new Blob([data], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "lineFONT-inscription." + extension;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  save.addEventListener("click", () => {
    if (svg) download(svg, "image/svg+xml", "svg");
  });
  savePdf.addEventListener("click", () => {
    if (inscription) download(inscriptionPdf(inscription), "application/pdf", "pdf");
  });
  return render;
}
