import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { parseFont } from "../../dist/index.js";
import { htmlPreview } from "../../tools/preview-html.mjs";
import { specimen } from "../../tools/preview-specimen.mjs";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test(
  "offline preview supports glyph overlays, comparison and mobile input",
  { timeout: 60000 },
  async (t) => {
    const profile = await mkdtemp(join(tmpdir(), "linefont-browser-"));
    const browser = spawn(
      process.env.CHROME_BIN || "google-chrome",
      [
        "--headless",
        "--no-sandbox",
        "--disable-gpu",
        "--remote-debugging-port=0",
        "--user-data-dir=" + profile,
        "about:blank",
      ],
      { stdio: "ignore" },
    );
    let spawnError;
    browser.on("error", (error) => {
      spawnError = error;
    });
    t.after(async () => {
      browser.kill();
      await delay(300);
      await rm(profile, { recursive: true, force: true, maxRetries: 3 });
    });
    let port;
    for (let attempt = 0; attempt < 100 && !port; attempt++) {
      if (spawnError) throw spawnError;
      try {
        [port] = (
          await readFile(join(profile, "DevToolsActivePort"), "utf8")
        ).split("\n");
      } catch {
        await delay(100);
      }
    }
    assert(port, "Chrome debugging port is available");
    const pages = await (
      await fetch("http://127.0.0.1:" + port + "/json/list")
    ).json();
    const socket = new WebSocket(pages[0].webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", reject, { once: true });
    });
    t.after(() => socket.close());
    let requestId = 0;
    function command(method, params = {}) {
      const id = ++requestId;
      return new Promise((resolve, reject) => {
        function receive(event) {
          const message = JSON.parse(event.data);
          if (message.id !== id) return;
          socket.removeEventListener("message", receive);
          if (message.error) reject(Error(message.error.message));
          else resolve(message.result);
        }
        socket.addEventListener("message", receive);
        socket.send(JSON.stringify({ id, method, params }));
      });
    }
    async function evaluate(expression) {
      const result = await command("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
      return result.result.value;
    }
    const source = await readFile(
      new URL("../../fonts/bagLING-UA-EN/bagLING-UA-EN.lint", import.meta.url),
      "utf8",
    );
    const font = parseFont(source);
    const html = await htmlPreview(font, "AB 123", specimen(font, "", 1));
    const { frameTree } = await command("Page.getFrameTree");
    await command("Emulation.setDeviceMetricsOverride", {
      width: 320,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await command("Emulation.setTouchEmulationEnabled", { enabled: true });
    await command("Page.setDocumentContent", {
      frameId: frameTree.frame.id,
      html,
    });
    const template = await evaluate(`(async () => {
      let blob;
      const originalUrl = URL.createObjectURL;
      const originalClick = HTMLAnchorElement.prototype.click;
      URL.createObjectURL = (value) => { blob = value; return "blob:fixture"; };
      HTMLAnchorElement.prototype.click = () => {};
      try {
        const form = document.querySelector("#glyph-template-form");
        const input = document.querySelector("#glyph-template-symbol");
        input.value = "U+D800";
        form.requestSubmit();
        const rejected = !blob && !!document.querySelector("#glyph-template-status").textContent;
        input.value = "U+1F642";
        form.requestSubmit();
        const xml = new DOMParser().parseFromString(await blob.text(), "image/svg+xml");
        return {
          rejected,
          metadata: JSON.parse(xml.querySelector("metadata").textContent),
          baseline: xml.querySelector("#baseline").getAttribute("d"),
          paths: xml.querySelector("#linefont-glyph").children.length,
        };
      } finally {
        URL.createObjectURL = originalUrl;
        HTMLAnchorElement.prototype.click = originalClick;
      }
    })()`);
    assert(template.rejected);
    assert.equal(template.metadata.glyph, "1F642");
    assert.equal(template.metadata.font.id, font.id);
    assert.equal(template.metadata.metrics.advance, font.metrics.defaultAdvance);
    assert.equal(template.metadata.metrics.capHeight, font.metrics.capHeight);
    assert.match(template.baseline, new RegExp(" " + font.metrics.baseline + " H"));
    assert.equal(template.paths, 0);

    const edited = await evaluate(`(async () => {
      const input = document.querySelector("#glyph-import-file");
      const status = document.querySelector("#glyph-import-status");
      async function open(svg) {
        const transfer = new DataTransfer();
        transfer.items.add(new File([svg], "glyph.svg"));
        input.files = transfer.files;
        input.dispatchEvent(new Event("change"));
        for (let i = 0; i < 100 && !status.textContent; i++)
          await new Promise((resolve) => setTimeout(resolve, 20));
      }
      await open('<svg xmlns="http://www.w3.org/2000/svg"><use href="#missing"/></svg>');
      const rejectsUse = status.textContent.includes("Unsupported SVG artwork");
      document.querySelector("#glyph-template-symbol").value = "Ґ";
      await open('<svg xmlns="http://www.w3.org/2000/svg" width="25mm"><g transform="translate(1 0)"><path d="m0 10 v-9 h5 v-1"/></g></svg>');
      const save = document.querySelector("#glyph-import-save");
      const captured = [];
      const originalUrl = URL.createObjectURL;
      const originalClick = HTMLAnchorElement.prototype.click;
      URL.createObjectURL = (blob) => { captured.push(blob); return "blob:fixture"; };
      HTMLAnchorElement.prototype.click = () => {};
      try {
        save.click();
        document.querySelector("#glyph-export-flat").click();
      } finally {
        URL.createObjectURL = originalUrl;
        HTMLAnchorElement.prototype.click = originalClick;
      }
      return {
        rejectsUse,
        warning: status.textContent,
        visible: !!document.querySelector("#glyph-import-proof svg path"),
        downloads: await Promise.all(captured.map(async (blob) => JSON.parse(await blob.text()))),
      };
    })()`);
    assert(edited.rejectsUse);
    assert(edited.visible);
    assert.match(edited.warning, /both edges/);
    assert.equal(edited.downloads.length, 2);
    for (const download of edited.downloads)
      assert.equal(parseFont(JSON.stringify(download)).glyphs["0490"].d, "M1 10 L1 1 L6 1 L6 0");

    const wholeFont = await evaluate(`(async () => {
      const file = document.querySelector("#whole-font-file");
      const form = document.querySelector("#whole-font-import");
      const status = document.querySelector("#whole-font-status");
      const svg = '<svg xmlns="http://www.w3.org/2000/svg"><defs><font id="Demo" horiz-adv-x="8"><font-face cap-height="10"/><glyph unicode="A" d="M0 0 L4 10 L8 0"/><glyph unicode="1" d="M4 0 L4 10"/></font></defs></svg>';
      const transfer = new DataTransfer();
      transfer.items.add(new File([svg], "demo.svg"));
      file.files = transfer.files;
      async function convert() {
        form.requestSubmit();
        for (let i = 0; i < 100 && !status.textContent; i++)
          await new Promise((resolve) => setTimeout(resolve, 10));
        return status.textContent;
      }
      const first = await convert();
      form.elements.namedItem("omitIncomplete").checked = true;
      const second = await convert();
      return {
        first, second,
        drawn: !!document.querySelector("#whole-font-image svg path"),
        ready: !document.querySelector("#whole-font-save").disabled,
      };
    })()`);
    assert.match(wholeFont.first, /digits.*0 2 3/);
    assert.match(wholeFont.second, /Omitted digits/);
    assert(wholeFont.drawn && wholeFont.ready);

    const inscription = await evaluate(`(async () => {
      const form = document.querySelector("#inscription-form");
      form.closest("details").open = true;
      document.querySelector("#inscription-text").value = "Ґ\\n".repeat(260) + "Ґ";
      form.requestSubmit();
      const svg = document.querySelector("#inscription-preview svg");
      const downloads = [];
      const originalUrl = URL.createObjectURL;
      const originalClick = HTMLAnchorElement.prototype.click;
      URL.createObjectURL = (blob) => { downloads.push(blob); return "blob:fixture"; };
      HTMLAnchorElement.prototype.click = () => {};
      try {
        document.querySelector("#save-inscription").click();
        document.querySelector("#save-inscription-pdf").click();
      } finally {
        URL.createObjectURL = originalUrl;
        HTMLAnchorElement.prototype.click = originalClick;
      }
      const [exportedSvg, pdf] = await Promise.all(downloads.map((blob) => blob.text()));
      document.querySelector("#inscription-text").value = "Ґ😀";
      form.requestSubmit();
      return {
        pdf,
        exportedSvg,
        width: svg.getAttribute("width"),
        height: svg.getAttribute("height"),
        moves: svg.querySelector("path").getAttribute("d").match(/M/g).length,
        status: document.querySelector("#inscription-status").textContent,
        canDownload: !document.querySelector("#save-inscription").disabled,
      };
    })()`);
    assert.match(inscription.width, /mm$/);
    assert(parseFloat(inscription.height) > 1800);
    assert.equal(inscription.moves, 261);
    assert.match(inscription.status, /U\+1F600/);
    assert(inscription.canDownload);
    assert.match(inscription.exportedSvg, /height="[0-9.]+mm"/);
    assert.match(inscription.pdf, /\/Count 1\b/);
    assert.equal(inscription.pdf.match(/ m$/gm).length, 261);
    assert.equal(inscription.pdf.match(/ l$/gm).length, 783);
    assert.doesNotMatch(inscription.pdf, /^h$/m);
    const [, widthPt, heightPt, unit] = inscription.pdf.match(
      /\/MediaBox \[0 0 ([0-9.]+) ([0-9.]+)\] \/UserUnit ([0-9]+)/,
    ).map(Number);
    assert(Math.abs(widthPt * unit * 25.4 / 72 - parseFloat(inscription.width)) < 1e-6);
    assert(Math.abs(heightPt * unit * 25.4 / 72 - parseFloat(inscription.height)) < 1e-6);
    const xref = Number(inscription.pdf.match(/startxref\n([0-9]+)/)[1]);
    assert.equal(inscription.pdf.slice(xref, xref + 4), "xref");

    await evaluate('document.querySelector("#inscription details").open = false');

    const result = await evaluate(`(async () => {
    const picker = document.querySelector('#detail-glyph');
    picker.value = '0042'; picker.dispatchEvent(new Event('change'));
    const before = document.querySelector('#detail-image').innerHTML;
    document.querySelector('[name=controls]').click();
    const controls = document.querySelector('#detail-image').innerHTML;
    document.querySelector('[name=directions]').click();
    const directions = document.querySelector('#detail-image').innerHTML;
    const fileInput = document.querySelector('#compare-file');
    async function open(source) {
      const transfer = new DataTransfer();
      transfer.items.add(new File([source], 'comparison.lint'));
      fileInput.files = transfer.files;
      fileInput.dispatchEvent(new Event('change'));
      for (let i=0; i<100; i++) {
        await new Promise(resolve => setTimeout(resolve,20));
        if (!document.querySelector('#compare-status').textContent.startsWith('Opening')) return;
      }
      throw Error('Comparison file did not finish loading');
    }
    await open(${JSON.stringify(source)});
    const first = document.querySelector('#phrase-preview');
    const second = document.querySelector('#comparison-preview');
    const equal = first.getAttribute('viewBox') === second.getAttribute('viewBox') &&
      first.querySelector('path').getAttribute('d') === second.querySelector('path').getAttribute('d');
    await open('invalid JSON');
    const errorKeptComparison = !document.querySelector('#comparison').hidden && document.querySelector('#compare-status').textContent.startsWith('Cannot open');
    document.querySelector('[data-glyph="0041"]').focus();
    return {overlays:before!==controls && controls!==directions, equal, errorKeptComparison,
      noPageOverflow:document.documentElement.scrollWidth <= innerWidth};
  })()`);
    assert.deepEqual(result, {
      overlays: true,
      equal: true,
      errorKeptComparison: true,
      noPageOverflow: true,
    });
    await command("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: "Enter",
      code: "Enter",
      windowsVirtualKeyCode: 13,
    });
    await command("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: "Enter",
      code: "Enter",
      windowsVirtualKeyCode: 13,
    });
    assert.equal(
      await evaluate('document.querySelector("#detail-glyph").value'),
      "0041",
    );
    const target = await evaluate(`(() => {
    const control = document.querySelector('[name=controls]');
    control.scrollIntoView({block:'center'});
    const bounds = control.getBoundingClientRect();
    return {x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2,checked:control.checked};
  })()`);
    await command("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: target.x, y: target.y }],
    });
    await command("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    assert.notEqual(
      await evaluate('document.querySelector("[name=controls]").checked'),
      target.checked,
    );
    await evaluate('document.querySelector("#clear-comparison").click()');
    assert(await evaluate('document.querySelector("#comparison").hidden'));
    await command("Emulation.setDeviceMetricsOverride", {
      width: 1024,
      height: 768,
      deviceScaleFactor: 1,
      mobile: false,
    });
    assert(
      await evaluate("document.documentElement.scrollWidth <= innerWidth"),
    );
    const localized = await evaluate(`(() => {
      function select(id,value) {
        const control = document.getElementById(id);
        control.value = value; control.dispatchEvent(new Event("change"));
      }
      select("language","uk_Cyrl");
      select("sample-type","alphabet");
      select("ui-language","uk");
      return [document.documentElement.lang,document.querySelector("#save-svg").textContent,
        document.querySelector("#sample").value.includes("ґ"),document.querySelector("#alphabet-coverage").textContent,
        !!document.querySelector("#phrase-preview path")];
    })()`);
    assert.deepEqual(localized.slice(0, 3), [
      "uk",
      "Завантажити зразок у SVG",
      true,
    ]);
    assert.match(localized[3], /Покриття абетки.*відсутні 0/);
    assert(localized[4]);
    await command("Emulation.setScriptExecutionDisabled", { value: true });
    await command("Page.setDocumentContent", {
      frameId: frameTree.frame.id,
      html,
    });
    assert(
      await evaluate(
        'document.querySelector("#script-status").getBoundingClientRect().height > 0',
      ),
    );
    assert(await evaluate('!!document.querySelector("#glyph-sheet svg")'));
  },
);
