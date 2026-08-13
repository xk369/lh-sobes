import { createReadStream, existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createHmac, timingSafeEqual } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyInterviewCommand, createSeedState, deriveState } from "./src/interview-state.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3210);
const HOST = process.env.HOST || "127.0.0.1";
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const DATA_FILE = process.env.DATA_FILE || path.join(DATA_DIR, "interviews.json");
const PUBLIC_DIR = path.join(__dirname, "public");
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || "";
const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL || process.env.APP_URL || "https://sobes.151.244.243.164.sslip.io";
const TELEGRAM_ACTION_SECRET = process.env.TELEGRAM_ACTION_SECRET || TELEGRAM_BOT_TOKEN || "lh-sobes-local";
const SHARED_VENUE_DIR = path.resolve(
  __dirname,
  "../loft_hall_internship_unified_migration_integrate/public/assets/venues"
);

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"]
]);

await ensureDataFile();

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const isHead = req.method === "HEAD";

    if (req.method === "GET" && url.pathname === "/api/state") {
      const state = await loadState();
      sendJson(res, { ok: true, state });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/health") {
      sendJson(res, { ok: true, service: "loft-hall-interviews-mvp", updatedAt: new Date().toISOString() });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/telegram/action") {
      await handleTelegramActionUrl(url, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/command") {
      const command = await readJson(req);
      const state = await loadState();
      const next = applyInterviewCommand(state, command);
      const deliveredState = await deliverPendingNotifications(next.state);
      await saveState(deliveredState);
      sendJson(res, { ok: true, state: deliveredState, result: next.result });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/telegram/webhook") {
      const update = await readJson(req);
      await handleTelegramUpdate(update);
      sendJson(res, { ok: true });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/reset") {
      const state = createSeedState(new Date().toISOString());
      await saveState(state);
      sendJson(res, { ok: true, state });
      return;
    }

    if ((req.method === "GET" || isHead) && url.pathname.startsWith("/shared-assets/venues/")) {
      serveSharedVenueAsset(url.pathname, res, isHead);
      return;
    }

    if (req.method === "GET" || isHead) {
      servePublic(url.pathname, res, isHead);
      return;
    }

    sendJson(res, { ok: false, error: "Method not allowed" }, 405);
  } catch (error) {
    const status = error.status || 400;
    sendJson(res, { ok: false, error: error.message || "Unexpected error" }, status);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`LOFT HALL interviews MVP: http://${HOST}:${PORT}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is busy. Start with PORT=3211 npm start`);
    process.exit(1);
  }
  throw error;
});

async function ensureDataFile() {
  await mkdir(DATA_DIR, { recursive: true });
  if (!existsSync(DATA_FILE)) {
    await saveState(createSeedState(new Date().toISOString()));
  }
}

async function loadState() {
  const raw = await readFile(DATA_FILE, "utf8");
  return deriveState(JSON.parse(raw));
}

async function saveState(state) {
  await writeFile(DATA_FILE, `${JSON.stringify(deriveState(state), null, 2)}\n`, "utf8");
}

async function deliverPendingNotifications(state) {
  const nextState = deriveState(state);
  const now = new Date().toISOString();
  const pending = nextState.notifications.filter((notification) => notification.status === "pending");
  if (!pending.length) return nextState;

  if (!TELEGRAM_BOT_TOKEN) {
    for (const notification of pending) {
      notification.status = "sent";
      notification.channel = "telegram_mock";
      notification.sentAt = notification.sentAt || now;
      notification.deliveryNote = "TELEGRAM_BOT_TOKEN is not configured";
    }
    return deriveState(nextState);
  }

  for (const notification of pending) {
    const candidate = nextState.candidates.find((item) => item.id === notification.candidateId);
    if (!candidate?.telegramId) {
      notification.status = "failed";
      notification.channel = "telegram";
      notification.deliveryError = "telegram_id_missing";
      continue;
    }

    try {
      const messageText = [notification.title, notification.message].filter(Boolean).join("\n\n");
      if (messageText) {
        const chunks = splitTelegramText(messageText);
        for (const [index, text] of chunks.entries()) {
          await sendTelegramApi("sendMessage", {
            chat_id: candidate.telegramId,
            text,
            disable_web_page_preview: true,
            reply_markup: index === chunks.length - 1 ? replyMarkupForNotification(notification, candidate) : undefined
          });
        }
      }

      for (const media of notification.media || []) {
        await sendTelegramMedia(candidate.telegramId, media);
      }

      notification.status = "sent";
      notification.channel = "telegram";
      notification.sentAt = now;
      delete notification.deliveryError;
    } catch (error) {
      notification.status = "failed";
      notification.channel = "telegram";
      notification.deliveryError = error.message || "telegram_delivery_failed";
    }
  }

  return deriveState(nextState);
}

async function handleTelegramActionUrl(url, res) {
  const candidateId = url.searchParams.get("candidateId") || "";
  const decision = url.searchParams.get("decision") || "";
  const signature = url.searchParams.get("signature") || "";

  if (!candidateId || !["yes", "no"].includes(decision) || !isValidTelegramActionSignature(candidateId, decision, signature)) {
    sendTelegramActionPage(res, "Ссылка недействительна", "Откройте мини-приложение и повторите действие.", 400);
    return;
  }

  const state = await loadState();
  const next = applyInterviewCommand(state, {
    action: "candidate_confirm",
    actor: "telegram_link",
    payload: { candidateId, decision, actor: "telegram_link" }
  });
  const deliveredState = await deliverPendingNotifications(next.state);
  await saveState(deliveredState);

  sendTelegramActionPage(
    res,
    decision === "yes" ? "Участие подтверждено" : "Отказ сохранен",
    decision === "yes"
      ? "Спасибо. Рекрутер увидит подтверждение в журнале."
      : "Мы сняли вас с этой даты. Можно вернуться к записи в мини-приложении."
  );
}

async function handleTelegramUpdate(update) {
  const callback = update?.callback_query;
  if (!callback) return;

  const data = String(callback.data || "");
  const [scope, decision, candidateId] = data.split(":");
  if (scope !== "confirm" || !["yes", "no"].includes(decision) || !candidateId) {
    await answerTelegramCallback(callback.id, "Команда не распознана");
    return;
  }

  const state = await loadState();
  const next = applyInterviewCommand(state, {
    action: "candidate_confirm",
    actor: "candidate",
    payload: { candidateId, decision, actor: "telegram" }
  });
  const deliveredState = await deliverPendingNotifications(next.state);
  await saveState(deliveredState);
  await answerTelegramCallback(callback.id, decision === "yes" ? "Участие подтверждено" : "Отказ сохранен");
}

async function answerTelegramCallback(callbackQueryId, text) {
  if (!callbackQueryId || !TELEGRAM_BOT_TOKEN) return;
  await sendTelegramApi("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
    show_alert: false
  });
}

function splitTelegramText(text, limit = 3500) {
  const chunks = [];
  let rest = String(text || "").trim();

  while (rest.length > limit) {
    let boundary = rest.lastIndexOf("\n\n", limit);
    if (boundary < Math.floor(limit * 0.45)) boundary = rest.lastIndexOf("\n", limit);
    if (boundary < Math.floor(limit * 0.45)) boundary = rest.lastIndexOf(" ", limit);
    if (boundary < Math.floor(limit * 0.45)) boundary = limit;

    chunks.push(rest.slice(0, boundary).trim());
    rest = rest.slice(boundary).trim();
  }

  if (rest) chunks.push(rest);
  return chunks;
}

function replyMarkupForNotification(notification, candidate) {
  const actions = Array.isArray(notification.actions) ? notification.actions : [];
  const buttons = actions
    .filter((action) => action.label && action.callbackData)
    .map((action) => {
      const confirmationUrl = confirmationActionUrl(action, candidate);
      if (confirmationUrl) return { text: action.label, url: confirmationUrl };
      return { text: action.label, callback_data: action.callbackData };
    });
  return buttons.length ? { inline_keyboard: [buttons] } : undefined;
}

function confirmationActionUrl(action, candidate) {
  const [scope, decision, candidateId] = String(action.callbackData || "").split(":");
  if (scope !== "confirm" || !["yes", "no"].includes(decision) || !candidateId || candidate?.id !== candidateId) {
    return "";
  }
  const target = new URL("/api/telegram/action", PUBLIC_APP_URL);
  target.searchParams.set("candidateId", candidateId);
  target.searchParams.set("decision", decision);
  target.searchParams.set("signature", signTelegramAction(candidateId, decision));
  return target.toString();
}

function signTelegramAction(candidateId, decision) {
  return createHmac("sha256", TELEGRAM_ACTION_SECRET)
    .update(`${candidateId}:${decision}`)
    .digest("hex")
    .slice(0, 32);
}

function isValidTelegramActionSignature(candidateId, decision, signature) {
  const expected = signTelegramAction(candidateId, decision);
  const actual = String(signature || "");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

async function sendTelegramMedia(chatId, media) {
  const method = media.type === "video" ? "sendVideo" : "sendDocument";
  const fileField = method === "sendVideo" ? "video" : "document";
  await sendTelegramApi(method, {
    chat_id: chatId,
    [fileField]: media.fileId,
    caption: media.caption || undefined,
    supports_streaming: method === "sendVideo" ? true : undefined
  });
}

async function sendTelegramApi(method, payload) {
  const cleanPayload = Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined && value !== ""));
  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cleanPayload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    throw new Error(data.description || `Telegram ${method} failed`);
  }
  return data.result;
}

function servePublic(urlPath, res, headOnly = false) {
  const normalized = safeJoin(PUBLIC_DIR, urlPath === "/" ? "index.html" : urlPath);
  if (!normalized || !existsSync(normalized)) {
    sendText(res, "Not found", 404);
    return;
  }
  streamFile(normalized, res, null, headOnly);
}

function serveSharedVenueAsset(urlPath, res, headOnly = false) {
  const fileName = decodeURIComponent(urlPath.replace("/shared-assets/venues/", ""));
  const normalized = safeJoin(SHARED_VENUE_DIR, fileName);
  if (!normalized || !existsSync(normalized)) {
    sendText(res, "Not found", 404);
    return;
  }
  streamFile(normalized, res, "image/webp", headOnly);
}

function safeJoin(root, requestedPath) {
  const normalized = path.normalize(decodeURIComponent(requestedPath)).replace(/^(\.\.[/\\])+/, "");
  const fullPath = path.join(root, normalized);
  return fullPath.startsWith(root) ? fullPath : null;
}

function streamFile(filePath, res, forcedType = null, headOnly = false) {
  const type = forcedType || mimeTypes.get(path.extname(filePath).toLowerCase()) || "application/octet-stream";
  res.writeHead(200, {
    "Content-Type": type,
    "Cache-Control": "no-store"
  });
  if (headOnly) {
    res.end();
    return;
  }
  createReadStream(filePath).pipe(res);
}

function sendJson(res, payload, status = 200) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, payload, status = 200) {
  res.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(payload);
}

function sendTelegramActionPage(res, title, message, status = 200) {
  const html = `<!doctype html>
<html lang="ru">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0b0e;color:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <main style="width:min(100% - 32px,420px);display:grid;gap:10px;text-align:center">
    <h1 style="margin:0;font-size:28px;line-height:1.1">${escapeHtml(title)}</h1>
    <p style="margin:0;color:#9b9ca5;font-size:16px;line-height:1.4">${escapeHtml(message)}</p>
  </main>
</body>
</html>`;
  res.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(html);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(Object.assign(new Error("Payload too large"), { status: 413 }));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(Object.assign(new Error("Invalid JSON"), { status: 400 }));
      }
    });
    req.on("error", reject);
  });
}
