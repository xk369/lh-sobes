import { createServer } from "node:http";
import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const PUBLIC_APP_URL = process.env.PLAYWRIGHT_PUBLIC_URL || "https://sobes.151.244.243.164.sslip.io";
const tmpDir = path.join(os.tmpdir(), "lh-sobes-playwright");

const checks = [];

function pass(name, details = "") {
  checks.push({ name, status: "ok", details });
  console.log(`ok - ${name}${details ? `: ${details}` : ""}`);
}

function fail(name, error) {
  const details = error?.message || String(error);
  checks.push({ name, status: "fail", details });
  console.error(`fail - ${name}: ${details}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function createDiagnosticsServer() {
  const html = `<!doctype html>
    <html lang="ru">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <title>Playwright diagnostics</title>
        <style>
          body { margin: 0; min-height: 100dvh; font: 16px system-ui, sans-serif; background: #f5f5f7; color: #111116; }
          main { padding: 24px; }
          button, input { width: 100%; min-height: 48px; border-radius: 8px; border: 1px solid #c9c4ff; font: inherit; }
          button { background: #806dff; color: white; font-weight: 700; }
          input { margin: 12px 0; padding: 0 12px; background: white; }
          .status { margin-top: 12px; font-weight: 700; }
        </style>
      </head>
      <body>
        <main>
          <h1>Playwright diagnostics</h1>
          <input id="name" placeholder="ФИО" />
          <button id="action" type="button">Проверить</button>
          <div id="status" class="status">Ждет</div>
          <script>
            document.querySelector("#action").addEventListener("click", async () => {
              const ping = await fetch("/api/ping").then((response) => response.json());
              localStorage.setItem("lh_pw_diag", document.querySelector("#name").value);
              document.querySelector("#status").textContent = ping.ok ? "Готово" : "Ошибка";
            });
          </script>
        </main>
      </body>
    </html>`;

  const server = createServer((req, res) => {
    if (req.url === "/api/ping") {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: true, at: new Date().toISOString() }));
      return;
    }

    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(html);
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, url: `http://127.0.0.1:${address.port}` });
    });
  });
}

async function run() {
  await mkdir(tmpDir, { recursive: true });

  pass("environment", `${process.platform}/${process.arch}, node ${process.version}`);

  let browser;
  let diagnosticsServer;
  try {
    diagnosticsServer = await createDiagnosticsServer();
    pass("local diagnostics server", diagnosticsServer.url);

    browser = await chromium.launch();
    pass("chromium launch");

    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true
    });

    await page.goto(diagnosticsServer.url, { waitUntil: "networkidle" });
    await page.locator("#name").fill("Тест Playwright");
    await page.locator("#action").click();
    await page.locator("#status", { hasText: "Готово" }).waitFor({ timeout: 5000 });
    const stored = await page.evaluate(() => localStorage.getItem("lh_pw_diag"));
    assert(stored === "Тест Playwright", "localStorage value was not saved");
    const viewport = await page.evaluate(() => `${window.innerWidth}x${window.innerHeight}, touch=${navigator.maxTouchPoints}`);
    const localScreenshot = path.join(tmpDir, "local-mobile.png");
    await page.screenshot({ path: localScreenshot, fullPage: true });
    pass("page automation", viewport);
    pass("local screenshot", localScreenshot);

    const appPage = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true
    });
    await appPage.goto(PUBLIC_APP_URL, { waitUntil: "networkidle", timeout: 20000 });
    await appPage.locator("text=Собеседования").first().waitFor({ timeout: 10000 });
    const title = await appPage.title();
    const bodyText = (await appPage.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 180);
    const publicScreenshot = path.join(tmpDir, "sobes-public-mobile.png");
    await appPage.screenshot({ path: publicScreenshot, fullPage: true });
    pass("public sobes page", `${title} | ${bodyText}`);
    pass("public screenshot", publicScreenshot);
  } catch (error) {
    fail("playwright diagnostics", error);
    process.exitCode = 1;
  } finally {
    await browser?.close().catch(() => {});
    diagnosticsServer?.server?.close();
  }

  const failed = checks.filter((check) => check.status === "fail").length;
  console.log(JSON.stringify({ ok: failed === 0, checks }, null, 2));
}

await run();
