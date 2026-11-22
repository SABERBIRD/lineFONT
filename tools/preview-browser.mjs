// Inlined by preview-html.mjs.
const { font, sample, samples } = JSON.parse(
  document.getElementById("preview-data").textContent,
);
const fonts = [font];
const languageSelect = document.getElementById("language");
const sampleInput = document.getElementById("sample");
const sampleKind = document.getElementById("sample-kind");
const phrasePreview = document.getElementById("phrase-preview");
const coverage = document.getElementById("coverage");
const samplesById = new Map(samples);
let layoutPreview;
const languageSearch = document.getElementById("language-search");
const languageChoices = Array.from(
  languageSelect.querySelectorAll("optgroup"),
  (group) => ({
    label: group.label,
    options: Array.from(
      group.options ?? group.querySelectorAll("option"),
      (option) => ({
        value: option.value,
        label: option.textContent,
      }),
    ),
  }),
);
const searchKey = (value) =>
  value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase();
languageSearch.addEventListener("input", () => {
  const selected = languageSelect.value;
  const query = searchKey(languageSearch.value.trim());
  languageSelect.replaceChildren(new Option("Custom text", ""));
  for (const group of languageChoices) {
    const matches = group.options.filter((option) =>
      searchKey(option.label).includes(query),
    );
    if (!matches.length) continue;
    const element = document.createElement("optgroup");
    element.label = group.label;
    element.append(
      ...matches.map((option) => new Option(option.label, option.value)),
    );
    languageSelect.append(element);
  }
  languageSelect.value = Array.from(languageSelect.options).some(
    (option) => option.value === selected,
  )
    ? selected
    : "";
});

const kindLabels = {
  technical: "Technical phrase",
  phrase: "Sample phrase",
  alphabet: "Alphabet sample",
  name: "Language name sample",
  unavailable: "Paste a sample for this language.",
};
const sampleSize = document.getElementById("sample-size");
const saveSvg = document.getElementById("save-svg");
const missingPanel = document.getElementById("missing-panel");
const missingSymbols = document.getElementById("missing-symbols");
let previewFrame;
function renderPhrase() {
  const input = sampleInput.value;
  phrasePreview.replaceChildren();
  saveSvg.disabled = true;
  missingPanel.hidden = true;
  missingSymbols.value = "";
  const empty = !input.trim();
  phrasePreview.toggleAttribute("hidden", empty);
  if (empty) {
    coverage.textContent = "Enter text or choose a language.";
    return;
  }

  try {
    if (typeof WebAssembly !== "object") {
      throw Error(
        "Open the downloaded HTML in a browser with WebAssembly support.",
      );
    }
    layoutPreview ??= loadLayout();
    const pixels = sampleSize.valueAsNumber;
    if (!Number.isFinite(pixels) || pixels < 12 || pixels > 96) {
      throw Error("Choose a capital height from 12 to 96 px.");
    }
    const screenScale = pixels / 4;
    const result = layoutPreview(fonts, {
      text: input,
      height: 4,
      lineHeight: 7,
      wrapWidth: Math.max(
        20,
        (document.getElementById("preview-scroll").clientWidth - 24) /
          screenScale,
      ),
      top: 0,
      style: font.style,
    });
    const { x, y, width, height } = result.bounds;
    phrasePreview.setAttribute("width", `${(width + 4) * screenScale}px`);
    phrasePreview.setAttribute("height", `${(height + 4) * screenScale}px`);
    phrasePreview.setAttribute(
      "viewBox",
      `${x - 2} ${y - 2} ${width + 4} ${height + 4}`,
    );
    const strokes = document.createElementNS(
      phrasePreview.namespaceURI,
      "path",
    );
    strokes.setAttribute(
      "d",
      result.glyphs
        .flatMap((glyph) => glyph.commands)
        .map(({ code, values }) => code + values.join(" "))
        .join(" "),
    );
    strokes.setAttribute("fill", "none");
    strokes.setAttribute("stroke", "currentColor");
    strokes.setAttribute("stroke-width", ".22");
    strokes.setAttribute("stroke-linecap", "round");
    strokes.setAttribute("stroke-linejoin", "round");
    phrasePreview.append(strokes);
    const missing = result.missing.map((cluster) => {
      const codes = Array.from(
        cluster,
        (char) =>
          "U+" +
          char.codePointAt(0).toString(16).toUpperCase().padStart(4, "0"),
      ).join(" ");
      return `${cluster} (${codes})`;
    });
    missingSymbols.value = missing.join("\n");
    missingPanel.hidden = missing.length === 0;
    saveSvg.disabled = false;
    coverage.textContent = missing.length
      ? "Missing character clusters · " + missing.length
      : "All characters in this sample are supported.";
  } catch (error) {
    phrasePreview.setAttribute("hidden", "");
    coverage.textContent = "Cannot render the sample · " + error.message;
  }
}

languageSelect.addEventListener("change", () => {
  const preset = samplesById.get(languageSelect.value);
  sampleInput.value = preset?.text ?? "";
  sampleKind.textContent = kindLabels[preset?.kind] ?? "";
  renderPhrase();
});
sampleInput.addEventListener("input", () => {
  languageSelect.value = "";
  sampleKind.textContent = "";
  cancelAnimationFrame(previewFrame);
  previewFrame = requestAnimationFrame(renderPhrase);
});
if (typeof ResizeObserver === "function") {
  new ResizeObserver(() => {
    cancelAnimationFrame(previewFrame);
    previewFrame = requestAnimationFrame(renderPhrase);
  }).observe(document.getElementById("preview-scroll"));
}
sampleInput.value = sample;
renderPhrase();

sampleSize.addEventListener("input", renderPhrase);
saveSvg.addEventListener("click", () => {
  if (saveSvg.disabled) return;
  const image = phrasePreview.cloneNode(true);
  image.removeAttribute("id");
  image.removeAttribute("hidden");
  image.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  image.setAttribute("color", "#142b35");
  const blob = new Blob([new XMLSerializer().serializeToString(image)], {
    type: "image/svg+xml",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "lineFONT-sample.svg";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
document.getElementById("copy-missing").addEventListener("click", async () => {
  const status = document.getElementById("copy-status");
  try {
    await navigator.clipboard.writeText(missingSymbols.value);
    status.textContent = "Copied.";
  } catch {
    missingSymbols.focus();
    missingSymbols.select();
    status.textContent = "Selected. Use your device’s Copy command.";
  }
});
