export function finishFontImport(result, omitIncomplete, validate) {
  if (result.blocks.length && !omitIncomplete) {
    const details = result.blocks.map(({ name, missing }) => name + ": " + missing.join(" ")).join("; ");
    throw Error("Complete or explicitly omit incomplete blocks: " + details);
  }
  const font = structuredClone(result.font);
  for (const { present } of result.blocks)
    for (const char of present)
      delete font.glyphs[char.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")];
  if (!Object.keys(font.glyphs).length) throw Error("No glyphs remain after omitting incomplete blocks");
  return validate(JSON.stringify(font));
}

function setupFontImport(t) {
  const form = document.getElementById("whole-font-import");
  const file = document.getElementById("whole-font-file");
  const status = document.getElementById("whole-font-status");
  const image = document.getElementById("whole-font-image");
  const save = document.getElementById("whole-font-save");
  let font;
  let revision = 0;
  function clear() {
    revision++;
    font = undefined;
    status.textContent = "";
    image.replaceChildren();
    save.disabled = true;
  }
  form.addEventListener("input", clear);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clear();
    const current = revision;
    const sourceFile = file.files[0];
    try {
      if (!sourceFile || sourceFile.size > 8_000_000) throw Error("Select an SVG or LFF font under 8 MB");
      const values = new FormData(form);
      const options = Object.fromEntries(["name", "author", "version", "license"]
        .filter((key) => values.get(key)?.trim()).map((key) => [key, values.get(key).trim()]));
      if (values.get("capHeight")) options.capHeight = Number(values.get("capHeight"));
      if (values.get("url") || values.get("sourceVersion"))
        options.source = { url: values.get("url"), version: values.get("sourceVersion") };
      const source = await sourceFile.text();
      if (current !== revision) return;
      const runtime = getRuntime();
      const result = runtime.importStrokeFont(source, options, /\.lff$/i.test(sourceFile.name) ? "lff" : "svg");
      const candidate = finishFontImport(result, values.has("omitIncomplete"), runtime.parseFont);
      const text = values.get("sample");
      const proof = runtime.layout([candidate], { text, height: 4, lineHeight: 7.2, top: 0 });
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      paintSample(svg, proof, 6);
      image.append(svg);
      const issues = [
        t("Imported glyphs: ") + Object.keys(candidate.glyphs).length,
        ...result.blocks.map(({ name, missing }) => "Omitted " + name + " · missing " + missing.join(" ")),
        ...result.warnings,
        ...(proof.missing.length ? [t("Missing characters · ") + proof.missing.map(formatCluster).join(", ")] : []),
      ];
      status.textContent = issues.join("\n");
      font = candidate;
      save.disabled = false;
    } catch (error) {
      if (current === revision) status.textContent = error.message;
    }
  });
  save.addEventListener("click", () => {
    if (!font) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(font, null, 2) + "\n"], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "imported-font.lint";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}
