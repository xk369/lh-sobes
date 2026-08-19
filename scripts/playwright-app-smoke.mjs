import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const rootDir = process.cwd();
const tmpDir = path.join(os.tmpdir(), "lh-sobes-playwright");
const dataFile = path.join(tmpDir, `app-smoke-${Date.now()}.json`);
const candidateName = "Кандидат Полный Тест";
const candidateTelegram = `@qa_${Date.now()}`;
const candidatePhone = "+7 900 999-99-99";

await mkdir(tmpDir, { recursive: true });

const port = await getFreePort();
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["server.js"], {
  cwd: rootDir,
  env: {
    ...process.env,
    HOST: "127.0.0.1",
    PORT: String(port),
    DATA_FILE: dataFile,
    TELEGRAM_BOT_TOKEN: "",
    DISABLE_CONFIRMATION_SCHEDULER: "true"
  },
  stdio: ["ignore", "pipe", "pipe"]
});

server.stdout.on("data", (chunk) => process.stdout.write(`[server] ${chunk}`));
server.stderr.on("data", (chunk) => process.stderr.write(`[server] ${chunk}`));

let browser;
try {
  await waitForHealth(baseUrl);
  await fetchJson(`${baseUrl}/api/reset`, { method: "POST" });
  await injectLegacyDuplicateSlot(dataFile);

  browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    colorScheme: "dark"
  });

  const page = await context.newPage();
  const browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator("#candidateView").waitFor({ timeout: 10000 });
  await assertNoViewportOverflow(page, "candidate initial");

  const visibleCandidateSlots = await page.locator("#candidateView .interview-date-card").count();
  assert.equal(visibleCandidateSlots, 2, "candidate should see deduplicated open slots");

  await page.locator("input[name='name']").fill(candidateName);
  await page.locator("input[name='telegram']").fill(candidateTelegram);
  await page.locator("input[name='phone']").fill(candidatePhone);
  await page.locator("#candidateView .interview-date-card").first().getByRole("button", { name: "Записаться" }).click();
  await page.waitForFunction(() => document.querySelectorAll("#candidateView button[data-action='book-slot']").length === 0);
  assert.equal(await page.locator("#candidateView button[data-action='book-slot']").count(), 0, "booked candidate should not see extra dates");
  await assertNoViewportOverflow(page, "candidate booked");

  await page.getByRole("button", { name: "Рекрут", exact: true }).click();
  await page.locator(".recruiter-grid").waitFor({ timeout: 10000 });
  await page.getByRole("button", { name: "Даты", exact: true }).click();
  await page.locator("#slot-form").waitFor({ timeout: 10000 });
  assert.equal(await page.getByText("Материалы после записи").count(), 0, "slot form should not show booking materials block");
  assert.equal(await page.locator("#slot-form [name='bookingText'], #slot-form [name='directionsVideoUrl']").count(), 0, "slot form should not expose manual materials inputs");
  assert.equal(await page.locator(".waitlist-action").count(), 0, "waitlist should not expose manual notify button");
  await assertSlotDateInputFits(page);
  await assertWaitlistActionFits(page);
  await assertNoViewportOverflow(page, "recruiter dates");
  await page.screenshot({ path: path.join(tmpDir, "app-dates-mobile.png"), fullPage: true });

  await page.getByRole("button", { name: "Журнал", exact: true }).click();
  assert.equal(await page.getByRole("button", { name: "Подтверждение за день", exact: true }).count(), 0, "manual confirmation button should be hidden");
  await page.locator("[data-candidate-search]").fill(candidateName);
  const unmarkedCard = page.locator(".recruiter-candidate-card", { hasText: candidateName }).first();
  await unmarkedCard.waitFor({ timeout: 10000 });
  await assertAttendanceButtonsStaySide(unmarkedCard);
  await assertNoViewportOverflow(page, "recruiter unmarked");

  await unmarkedCard.getByRole("button", { name: "Пришел", exact: true }).click();
  const arrivedGroup = page.locator(".journal-group", { hasText: "Пришли на собес" });
  const arrivedCard = arrivedGroup.locator(".recruiter-candidate-card", { hasText: candidateName }).first();
  await arrivedCard.waitFor({ timeout: 10000 });
  assert.equal(await arrivedCard.locator(".attendance-quick-actions").count(), 0, "marked candidate should not keep quick attendance buttons");
  await assertNoViewportOverflow(page, "recruiter arrived");

  await page.getByRole("button", { name: /Отправить: 1\/5.*Регистрация/ }).click();
  await page.locator(".resource-progress-panel .pill", { hasText: "1/5 отправлено" }).waitFor({ timeout: 10000 });

  await arrivedCard.locator("summary.candidate-name-summary").click();
  const gridColumns = await arrivedCard.locator(".candidate-info-grid").evaluate((element) =>
    getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean).length
  );
  assert.equal(gridColumns, 1, "recruiter candidate details should be a stable single column on mobile");
  await assertNoViewportOverflow(page, "recruiter details open");

  await arrivedCard.screenshot({ path: path.join(tmpDir, "app-arrived-card.png") });
  await page.screenshot({ path: path.join(tmpDir, "app-recruiter-mobile.png"), fullPage: true });

  await arrivedCard.getByRole("button", { name: "Отказ" }).click();
  const refusedGroup = page.locator(".journal-group", { hasText: "Отказ после собеса" });
  await refusedGroup.locator(".recruiter-candidate-card", { hasText: candidateName }).first().waitFor({ timeout: 10000 });
  await assertNoViewportOverflow(page, "recruiter refused after interview");

  await page.getByRole("button", { name: "Собес завершен", exact: true }).click();
  await page.getByRole("button", { name: "Даты", exact: true }).click();
  await page.locator(".archive-panel > summary").click();
  await page.locator("[data-archive-search]").fill(candidateName);
  const archivedCard = page.locator(".archive-candidate-card", { hasText: candidateName }).first();
  await archivedCard.waitFor({ timeout: 10000 });
  await assertArchiveCandidateCardCompact(archivedCard);
  await assertNoViewportOverflow(page, "archive candidate compact");
  await page.screenshot({ path: path.join(tmpDir, "app-archive-mobile.png"), fullPage: true });

  assert.deepEqual(browserErrors, [], "browser console/page errors should be empty");
  console.log(`ok - app smoke passed: ${baseUrl}`);
  console.log(`ok - screenshots: ${path.join(tmpDir, "app-recruiter-mobile.png")}`);
} finally {
  await browser?.close().catch(() => {});
  server.kill("SIGTERM");
}

async function injectLegacyDuplicateSlot(filePath) {
  const state = JSON.parse(await readFile(filePath, "utf8"));
  const duplicate = {
    ...state.slots[0],
    id: "slot-legacy-duplicate",
    seats: 5,
    createdAt: new Date().toISOString()
  };
  state.slots.push(duplicate);
  await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

async function assertAttendanceButtonsStaySide(card) {
  const layout = await card.locator(".attendance-quick-actions").evaluate((element) => {
    const actionBox = element.getBoundingClientRect();
    const summaryBox = element.closest("summary").getBoundingClientRect();
    return {
      actionLeft: actionBox.left,
      summaryLeft: summaryBox.left,
      summaryWidth: summaryBox.width
    };
  });

  assert.ok(
    layout.actionLeft > layout.summaryLeft + layout.summaryWidth * 0.42,
    `attendance buttons should stay on the right side: ${JSON.stringify(layout)}`
  );
}

async function assertWaitlistActionFits(page) {
  const button = page.locator(".waitlist-action").first();
  if ((await button.count()) === 0) return;
  const metrics = await button.evaluate((element) => ({
    width: element.getBoundingClientRect().width,
    scrollWidth: element.scrollWidth,
    height: element.getBoundingClientRect().height,
    text: element.textContent.trim()
  }));
  assert.ok(metrics.scrollWidth <= Math.ceil(metrics.width), `waitlist action text should not overflow: ${JSON.stringify(metrics)}`);
  assert.ok(metrics.height < 52, `waitlist action should stay compact: ${JSON.stringify(metrics)}`);
}

async function assertSlotDateInputFits(page) {
  const metrics = await page.locator("#slot-form input[type='date']").evaluate((element) => {
    const input = element.getBoundingClientRect();
    const form = element.closest("#slot-form").getBoundingClientRect();
    const panel = element.closest(".panel").getBoundingClientRect();
    return {
      input: input.toJSON(),
      form: form.toJSON(),
      panel: panel.toJSON(),
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth
    };
  });

  assert.ok(metrics.input.left >= metrics.panel.left - 1, `date input should stay inside panel left edge: ${JSON.stringify(metrics)}`);
  assert.ok(metrics.input.right <= metrics.panel.right + 1, `date input should stay inside panel right edge: ${JSON.stringify(metrics)}`);
  assert.ok(metrics.input.right <= metrics.form.right + 1, `date input should stay inside form right edge: ${JSON.stringify(metrics)}`);
  assert.ok(metrics.scrollWidth <= metrics.clientWidth + 1, `date input content should not force internal overflow: ${JSON.stringify(metrics)}`);
}

async function assertArchiveCandidateCardCompact(card) {
  const metrics = await card.evaluate((element) => {
    const cardBox = element.getBoundingClientRect();
    const status = element.querySelector(".archive-status-chip")?.getBoundingClientRect();
    return {
      card: cardBox.toJSON(),
      status: status?.toJSON() || null,
      largeStatusPills: element.querySelectorAll(".candidate-status.pill").length
    };
  });

  assert.equal(metrics.largeStatusPills, 0, "archive card should not reuse the large candidate status pill");
  assert.ok(metrics.card.height <= 112, `archive candidate card should remain compact before details open: ${JSON.stringify(metrics)}`);
  assert.ok(metrics.status && metrics.status.width <= 122, `archive status chip should stay small: ${JSON.stringify(metrics)}`);
}

async function assertNoViewportOverflow(page, label) {
  const result = await page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const offenders = Array.from(document.body.querySelectorAll("*"))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.right > viewportWidth + 1 || rect.left < -1;
      })
      .slice(0, 8)
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        className: String(element.className || ""),
        text: String(element.textContent || "").replace(/\s+/g, " ").slice(0, 80),
        rect: element.getBoundingClientRect().toJSON()
      }));

    return {
      viewportWidth,
      scrollWidth: document.documentElement.scrollWidth,
      offenders
    };
  });

  assert.ok(
    result.scrollWidth <= result.viewportWidth + 1 && result.offenders.length === 0,
    `${label} has horizontal overflow: ${JSON.stringify(result, null, 2)}`
  );
}

async function waitForHealth(baseUrl) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 8000) {
    try {
      const health = await fetchJson(`${baseUrl}/api/health`);
      if (health.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  }
  throw new Error("local app server did not become healthy");
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json();
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || `Request failed: ${response.status}`);
  }
  return payload;
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const port = probe.address().port;
      probe.close(() => resolve(port));
    });
  });
}
