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

const kindLabels = {
  technical: "Technical phrase",
  phrase: "Sample phrase",
  alphabet: "Alphabet sample",
  name: "Language name sample",
  unavailable: "Paste a sample for this language.",
};
let previewFrame;
function renderPhrase() {
  const input = sampleInput.value;
  phrasePreview.replaceChildren();
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
    const result = layoutPreview(fonts, {
      text: input,
      height: 4,
      lineHeight: 7,
      wrapWidth: 192,
      top: 0,
      style: font.style,
    });
    const { x, y, width, height } = result.bounds;
    phrasePreview.setAttribute("width", `${width + 4}mm`);
    phrasePreview.setAttribute("height", `${height + 4}mm`);
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
    coverage.textContent = missing.length
      ? "Missing from this sample · " + missing.join(", ")
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
sampleInput.value = sample;
renderPhrase();
