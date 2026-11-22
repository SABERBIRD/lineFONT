// Inlined by preview-html.mjs.
const {
  font: initialFont,
  page: initialPage,
  sample,
  samples,
} = JSON.parse(document.getElementById("preview-data").textContent);
let font = initialFont;
let fonts = [font];
let compareFont = null;
let compareFonts = [];
const comparison = document.getElementById("comparison");
const comparisonPreview = document.getElementById("comparison-preview");
const comparisonCoverage = document.getElementById("comparison-coverage");
const compareStatus = document.getElementById("compare-status");
const clearComparison = document.getElementById("clear-comparison");
const languageSelect = document.getElementById("language");
const sampleInput = document.getElementById("sample");
const sampleKind = document.getElementById("sample-kind");
const phrasePreview = document.getElementById("phrase-preview");
const coverage = document.getElementById("coverage");
const samplesById = new Map(samples);
let runtime;
function getRuntime() {
  runtime ??= loadLayout();
  return runtime;
}
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
function paintSample(image, result, screenScale) {
  const { x, y, width, height } = result.bounds;
  image.setAttribute("width", `${(width + 4) * screenScale}px`);
  image.setAttribute("height", `${(height + 4) * screenScale}px`);
  image.setAttribute("viewBox", `${x - 2} ${y - 2} ${width + 4} ${height + 4}`);
  const strokes = document.createElementNS(image.namespaceURI, "path");
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
  image.append(strokes);
}

function renderPhrase() {
  const input = sampleInput.value;
  phrasePreview.replaceChildren();
  comparisonPreview.replaceChildren();
  comparison.hidden = true;
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

    const pixels = sampleSize.valueAsNumber;
    if (!Number.isFinite(pixels) || pixels < 12 || pixels > 96) {
      throw Error("Choose a capital height from 12 to 96 px.");
    }
    const screenScale = pixels / 4;
    const options = {
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
    };
    const result = getRuntime().layout(fonts, options);
    paintSample(phrasePreview, result, screenScale);
    comparison.hidden = !compareFont;
    if (compareFont) {
      const other = getRuntime().layout(compareFonts, options);
      paintSample(comparisonPreview, other, screenScale);
      comparisonCoverage.textContent = other.missing.length
        ? "Missing from second font · " +
          other.missing
            .map(
              (cluster) =>
                cluster +
                " (" +
                Array.from(
                  cluster,
                  (char) =>
                    "U+" +
                    char
                      .codePointAt(0)
                      .toString(16)
                      .toUpperCase()
                      .padStart(4, "0"),
                ).join(" ") +
                ")",
            )
            .join(", ")
        : "All characters in this sample are supported.";
    }
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

const glyphSearch = document.getElementById("glyph-search");
const glyphSheet = document.getElementById("glyph-sheet");
const previousPage = document.getElementById("glyph-prev");
const nextPage = document.getElementById("glyph-next");
const glyphPage = document.getElementById("glyph-page");
const fontStatus = document.getElementById("font-status");
let currentPage = initialPage;
let totalPages = 1;
function updateGlyphControls() {
  const count = matchingGlyphs(font, glyphSearch.value).length;
  totalPages = Math.max(1, Math.ceil(count / 40));
  currentPage = Math.min(currentPage, totalPages);
  previousPage.disabled = currentPage <= 1;
  nextPage.disabled = currentPage >= totalPages;
  glyphPage.textContent = count
    ? "Page " + currentPage + " / " + totalPages + " · " + count + " glyphs"
    : "No matching glyphs";
}
function renderGlyphs() {
  updateGlyphControls();
  try {
    glyphSheet.innerHTML = specimen(font, "", currentPage, glyphSearch.value);
    activateCards();
  } catch (error) {
    fontStatus.textContent = "Cannot render glyphs · " + error.message;
  }
}
glyphSearch.addEventListener("input", () => {
  currentPage = 1;
  renderGlyphs();
});
previousPage.addEventListener("click", () => {
  currentPage--;
  renderGlyphs();
});
nextPage.addEventListener("click", () => {
  currentPage++;
  renderGlyphs();
});
let fileRequest = 0;
document
  .getElementById("font-file")
  .addEventListener("change", async (event) => {
    const request = ++fileRequest;
    const file = event.target.files[0];
    if (!file) return;
    fontStatus.textContent = "Opening " + file.name;
    try {
      if (file.size > 8_000_000) throw Error("Font file exceeds 8 MB");
      const source = await file.text();
      if (request !== fileRequest) return;
      const candidate = getRuntime().parseFont(source);
      const sheet = specimen(candidate, "", 1);
      font = candidate;
      fonts = [font];
      glyphSearch.value = "";
      currentPage = 1;
      glyphSheet.innerHTML = sheet;
      document.getElementById("font-name").textContent = font.name;
      document.getElementById("font-metrics").textContent =
        font.version +
        " · cap height " +
        font.metrics.capHeight +
        " · baseline " +
        font.metrics.baseline +
        " · default advance " +
        font.metrics.defaultAdvance;
      updateGlyphControls();
      populateDetails();
      renderPhrase();
      fontStatus.textContent = "Opened " + file.name;
    } catch (error) {
      if (request !== fileRequest) return;
      fontStatus.textContent = "Cannot open font · " + error.message;
      renderPhrase();
    } finally {
      if (request === fileRequest) event.target.value = "";
    }
  });
updateGlyphControls();

const detailGlyph = document.getElementById("detail-glyph");
const detailPanel = document.getElementById("detail-panel");
const detailImage = document.getElementById("detail-image");
const detailOptions = document.getElementById("detail-options");
function activateCards() {
  for (const card of glyphSheet.querySelectorAll("[data-glyph]")) {
    card.setAttribute("tabindex", "0");
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", "Inspect U+" + card.dataset.glyph);
  }
}
function populateDetails() {
  detailGlyph.replaceChildren(new Option("Choose a glyph", ""));
  for (const key of matchingGlyphs(font)) {
    detailGlyph.append(
      new Option(
        "U+" + key + " · " + String.fromCodePoint(Number.parseInt(key, 16)),
        key,
      ),
    );
  }
  detailPanel.hidden = true;
  detailImage.replaceChildren();
  activateCards();
}
function renderDetail() {
  const key = detailGlyph.value;
  detailPanel.hidden = !key;
  if (!key) return;
  try {
    const options = Object.fromEntries(
      Array.from(detailOptions.querySelectorAll("input"), (input) => [
        input.name,
        input.checked,
      ]),
    );
    detailImage.innerHTML = glyphDetail(font, key, options);
    const definition = font.glyphs[key];
    const resolved = getRuntime().layout(fonts, {
      text: String.fromCodePoint(Number.parseInt(key, 16)),
      height: font.metrics.capHeight,
      lineHeight: font.metrics.capHeight,
      top: 0,
      style: font.style,
    });
    document.getElementById("detail-metrics").textContent =
      "U+" +
      key +
      " · advance " +
      (resolved.glyphs[0]?.advance ??
        definition.advance ??
        font.metrics.defaultAdvance) +
      " · baseline " +
      font.metrics.baseline +
      (definition.alias ? " · alias U+" + definition.alias : "") +
      (definition.composite
        ? " · composite " +
          definition.composite.map((part) => "U+" + part.code).join(" + ")
        : "");
    document.getElementById("detail-status").textContent =
      resolved.glyphs[0]?.fontIndex === 0
        ? ""
        : "This glyph could not be resolved in text layout.";
  } catch (error) {
    detailImage.replaceChildren();
    document.getElementById("detail-status").textContent = error.message;
  }
}
detailGlyph.addEventListener("change", renderDetail);
detailOptions.addEventListener("change", renderDetail);
function inspectCard(event) {
  const card = event.target.closest("[data-glyph]");
  if (!card) return;
  detailGlyph.value = card.dataset.glyph;
  renderDetail();
  detailGlyph.focus();
}
glyphSheet.addEventListener("click", inspectCard);
glyphSheet.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    if (!event.target.closest("[data-glyph]")) return;
    event.preventDefault();
    inspectCard(event);
  }
});
populateDetails();
let compareRequest = 0;
document
  .getElementById("compare-file")
  .addEventListener("change", async (event) => {
    const request = ++compareRequest;
    const file = event.target.files[0];
    if (!file) return;
    compareStatus.textContent = "Opening " + file.name;
    try {
      if (file.size > 8_000_000) throw Error("Font file exceeds 8 MB");
      const source = await file.text();
      if (request !== compareRequest) return;
      const candidate = getRuntime().parseFont(source);
      compareFont = candidate;
      compareFonts = [candidate];
      document.getElementById("comparison-name").textContent = candidate.name;
      clearComparison.disabled = false;
      renderPhrase();
      compareStatus.textContent =
        "Comparing with " + candidate.name + " · " + candidate.version;
    } catch (error) {
      if (request !== compareRequest) return;
      compareStatus.textContent =
        "Cannot open comparison font · " + error.message;
      renderPhrase();
    } finally {
      if (request === compareRequest) event.target.value = "";
    }
  });
clearComparison.addEventListener("click", () => {
  compareRequest++;
  compareFont = null;
  compareFonts = [];
  clearComparison.disabled = true;
  compareStatus.textContent = "";
  document.getElementById("compare-file").focus();
  renderPhrase();
});
