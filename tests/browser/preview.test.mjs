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
    await command("Emulation.setScriptExecutionDisabled", { value: true });
    await command("Page.setDocumentContent", {
      frameId: frameTree.frame.id,
      html,
    });
    assert(
      await evaluate(
        'document.querySelector("noscript").getBoundingClientRect().height > 0',
      ),
    );
    assert(await evaluate('!!document.querySelector("#glyph-sheet svg")'));
  },
);
