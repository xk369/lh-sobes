import { createReadStream, existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createHmac, timingSafeEqual } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyInterviewCommand, createSeedState, deriveState } from "./src/interview-state.js";
import { createPostgresInterviewStorage } from "./src/interview-postgres-storage.js";
import { createPuzzleBotClient } from "./src/puzzlebot-client.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3210);
const HOST = process.env.HOST || "127.0.0.1";
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const DATA_FILE = process.env.DATA_FILE || path.join(DATA_DIR, "interviews.json");
const PUBLIC_DIR = path.join(__dirname, "public");
const INTERVIEW_STORAGE_MODE = String(process.env.INTERVIEW_STORAGE_MODE || process.env.SOBES_STORAGE_MODE || "json").trim().toLowerCase();
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || "";
const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL || process.env.APP_URL || `http://${HOST}:${PORT}`;
const TELEGRAM_ACTION_SECRET = process.env.TELEGRAM_ACTION_SECRET || TELEGRAM_BOT_TOKEN || "lh-sobes-local";
const puzzleBotClient = createPuzzleBotClient({
  token: process.env.PUZZLEBOT_API_TOKEN,
  privateChatId: process.env.PUZZLEBOT_PRIVATE_CHAT_ID,
  interviewCategoryId: process.env.PUZZLEBOT_INTERVIEW_CATEGORY_ID,
  apiUrl: process.env.PUZZLEBOT_API_URL,
  timeoutMs: process.env.PUZZLEBOT_API_TIMEOUT_MS
});
const CONFIRMATION_SEND_HOUR_MOSCOW = 21;
const CONFIRMATION_SCHEDULER_INTERVAL_MS = Number(process.env.CONFIRMATION_SCHEDULER_INTERVAL_MS || 60_000);
const DISABLE_CONFIRMATION_SCHEDULER = process.env.DISABLE_CONFIRMATION_SCHEDULER === "true";
const SHARED_VENUE_DIR = path.resolve(
  __dirname,
  "../loft_hall_internship_unified_migration_integrate/public/assets/venues"
);
const RECRUITER_COMMANDS = new Set([
  "create_slot",
  "notify_waitlist",
  "request_confirmation",
  "send_due_confirmations",
  "mark_attendance",
  "set_result",
  "send_registration_materials",
  "send_resource_step",
  "send_resources",
  "mark_left_after_interview",
  "complete_slot",
  "mark_registration",
  "mark_all_registered",
  "record_loss_reason",
  "clear_archive",
  "clear_recruiter_data"
]);
const CANDIDATE_OWN_COMMANDS = new Set([
  "upsert_candidate",
  "book_slot",
  "join_waitlist",
  "candidate_confirm",
  "cancel_booking",
  "rebook_interest",
  "record_link_click",
  "waitlist_slot_response"
]);

const postgresStorage = INTERVIEW_STORAGE_MODE === "postgres"
  ? createPostgresInterviewStorage(process.env)
  : null;

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
      sendJson(res, { ok: true, state: stateForRequest(req, state) });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/health") {
      sendJson(res, {
        ok: true,
        service: "loft-hall-interviews-mvp",
        interviewStorageMode: INTERVIEW_STORAGE_MODE,
        interviewStorageWritable: true,
        updatedAt: new Date().toISOString()
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/telegram/action") {
      await handleTelegramActionUrl(url, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/command") {
      const command = await readJson(req);
      const mutation = await mutateState(async (state, tools) => {
        const resolvedCommand = resolveCommandReferences(command, state);
        if (RECRUITER_COMMANDS.has(resolvedCommand.action)) {
          assertRecruiterRequest(req, state);
        } else if (CANDIDATE_OWN_COMMANDS.has(resolvedCommand.action)) {
          assertCandidateRequest(req, state, candidateIdFromCommand(resolvedCommand));
        }
        const next = applyInterviewCommand(state, resolvedCommand);
        const prepared = tools.prepareStateIds
          ? await tools.prepareStateIds(next.state, next.result)
          : next;
        if (resolvedCommand.action === "complete_slot") {
          const acceptedCandidates = prepared.state.candidates.filter(
            (candidate) =>
              candidate.interviewSlotId === prepared.result.slotId &&
              candidate.attendanceStatus === "arrived" &&
              candidate.status !== "left_after_interview" &&
              candidate.interviewResult === "fit"
          );
          for (const candidate of acceptedCandidates) {
            await puzzleBotClient.replaceWithInterviewCategory(candidate.telegramId);
            await puzzleBotClient.sendStartCommand(candidate.telegramId);
          }
          prepared.result.puzzleBotProcessedCount = acceptedCandidates.length;
        }
        const deliveredState = await deliverPendingNotifications(prepared.state);
        return { state: deliveredState, result: prepared.result };
      });
      sendJson(res, { ok: true, state: stateForRequest(req, mutation.state, mutation.result), result: mutation.result });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/telegram/webhook") {
      const update = await readJson(req);
      await handleTelegramUpdate(update);
      sendJson(res, { ok: true });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/reset") {
      assertRecruiterRequest(req, await loadState());
      const mutation = await mutateState(async (_state, tools) => {
        const seed = createSeedState(new Date().toISOString());
        return tools.prepareStateIds
          ? await tools.prepareStateIds(seed, {})
          : { state: seed, result: {} };
      });
      sendJson(res, { ok: true, state: mutation.state });
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
  startConfirmationScheduler();
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is busy. Start with PORT=3211 npm start`);
    process.exit(1);
  }
  throw error;
});

async function ensureDataFile() {
  if (postgresStorage) {
    await postgresStorage.ensure();
    return;
  }
  await mkdir(DATA_DIR, { recursive: true });
  if (!existsSync(DATA_FILE)) {
    await saveState(createSeedState(new Date().toISOString()));
  }
}

async function loadState() {
  if (postgresStorage) return postgresStorage.loadState();
  const raw = await readFile(DATA_FILE, "utf8");
  return deriveState(JSON.parse(raw));
}

async function saveState(state) {
  if (postgresStorage) {
    throw new Error("Direct saveState is disabled in PostgreSQL mode; use mutateState.");
  }
  await writeFile(DATA_FILE, `${JSON.stringify(deriveState(state), null, 2)}\n`, "utf8");
}

async function mutateState(mutator) {
  if (postgresStorage) return postgresStorage.mutateState(mutator);
  const state = await loadState();
  const mutation = await mutator(state, {});
  await writeFile(DATA_FILE, `${JSON.stringify(deriveState(mutation.state), null, 2)}\n`, "utf8");
  return { ...mutation, state: deriveState(mutation.state) };
}

function assertRecruiterRequest(req, state) {
  if (isRecruiterRequest(req, state)) return;

  const error = new Error("Нет доступа к кабинету рекрута");
  error.status = 403;
  throw error;
}

function assertCandidateRequest(req, state, candidateId) {
  if (!candidateId || isRecruiterRequest(req, state)) return;
  const candidate = state.candidates.find((item) => item.id === candidateId);
  if (!candidate || !candidate.telegramId) return;
  const telegramUser = telegramUserFromRequest(req);
  if (telegramUser?.id && String(telegramUser.id) === String(candidate.telegramId)) return;

  const error = new Error("Нет доступа к карточке кандидата");
  error.status = 403;
  throw error;
}

function isRecruiterRequest(req, state) {
  const telegramUser = telegramUserFromRequest(req);
  const allowedIds = new Set((state.settings?.developerTelegramIds || []).map((id) => String(id)));
  return Boolean(telegramUser?.id && allowedIds.has(String(telegramUser.id)));
}

function stateForRequest(req, state, result = {}) {
  const normalized = deriveState(state);
  if (isRecruiterRequest(req, normalized)) return normalized;
  return publicStateForRequest(req, normalized, result);
}

function publicStateForRequest(req, state, result = {}) {
  const candidate = visibleCandidateForRequest(req, state, result.candidateId);
  const slots = publicSlotsForCandidate(state, candidate);
  return {
    ...state,
    settings: publicSettings(state.settings),
    slots,
    candidates: candidate ? [candidate] : [],
    notifications: candidate ? state.notifications.filter((item) => item.candidateId === candidate.id) : [],
    events: [],
    stats: {
      openSlots: slots.filter((slot) => slot.status === "open").length
    }
  };
}

function publicSettings(settings = {}) {
  return {
    ...settings,
    developerTelegramIds: [],
    directionMaterials: []
  };
}

function publicSlotsForCandidate(state, candidate) {
  const ownSlotIds = new Set([
    candidate?.interviewSlotId,
    ...(candidate?.interviewHistory || []).map((item) => item.slotId)
  ].filter(Boolean));
  return state.slots.filter((slot) => slot.status === "open" || ownSlotIds.has(slot.id));
}

function visibleCandidateForRequest(req, state, resultCandidateId = "") {
  const directCandidate = resultCandidateId
    ? state.candidates.find((candidate) => candidate.id === resultCandidateId)
    : null;
  if (directCandidate) return directCandidate;

  const telegramId = String(telegramUserFromRequest(req)?.id || "");
  if (!telegramId) return null;

  return state.candidates
    .filter((candidate) => String(candidate.telegramId || "") === telegramId)
    .sort((left, right) => String(right.updatedAt || right.createdAt || "").localeCompare(String(left.updatedAt || left.createdAt || "")))[0] || null;
}

function candidateIdFromCommand(command = {}) {
  const payload = command.payload || {};
  return clean(payload.candidateId || payload.id || payload.candidate?.candidateId || payload.candidate?.id);
}

function resolveCommandReferences(command = {}, state) {
  const next = structuredClone(command);
  const payload = next.payload || {};
  next.payload = payload;

  rewritePayloadReference(payload, "slotId", state.slots, "legacyId");
  rewritePayloadReference(payload, "candidateId", state.candidates, "legacyId");

  if (next.action === "create_slot") {
    rewritePayloadReference(payload, "id", state.slots, "legacyId");
  } else {
    rewritePayloadReference(payload, "id", state.candidates, "legacyId");
  }

  if (payload.candidate && typeof payload.candidate === "object") {
    rewritePayloadReference(payload.candidate, "candidateId", state.candidates, "legacyId");
    rewritePayloadReference(payload.candidate, "id", state.candidates, "legacyId");
    rewritePayloadReference(payload.candidate, "slotId", state.slots, "legacyId");
  }

  return next;
}

function rewritePayloadReference(payload, field, records, legacyField) {
  const raw = clean(payload?.[field]);
  if (!raw) return;
  const match = records.find((item) => item.id === raw || item[legacyField] === raw);
  if (match) payload[field] = match.id;
}

function clean(value) {
  return String(value || "").trim();
}

function telegramUserFromRequest(req) {
  const initData = String(req.headers["x-telegram-init-data"] || "");
  const verified = verifyTelegramWebAppInitData(initData);
  if (verified) return verified;

  if (!TELEGRAM_BOT_TOKEN && process.env.NODE_ENV !== "production" && isLocalRequest(req)) {
    return { id: req.headers["x-dev-telegram-id"] || "1294774551" };
  }

  return null;
}

function verifyTelegramWebAppInitData(initData) {
  if (!TELEGRAM_BOT_TOKEN || !initData) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get("hash") || "";
  if (!hash) return null;
  params.delete("hash");

  const dataCheckString = Array.from(params.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(TELEGRAM_BOT_TOKEN).digest();
  const expected = createHmac("sha256", secret).update(dataCheckString).digest("hex");
  if (!safeCompare(hash, expected)) return null;

  try {
    const user = JSON.parse(params.get("user") || "{}");
    return user?.id ? { ...user, id: String(user.id) } : null;
  } catch {
    return null;
  }
}

function safeCompare(left, right) {
  const actual = String(left || "");
  const expected = String(right || "");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

function isLocalRequest(req) {
  const address = req.socket?.remoteAddress || "";
  return ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(address);
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
      const telegramText = telegramMessageText(notification);
      if (telegramText.text) {
        const chunks = splitTelegramText(telegramText.text);
        for (const [index, text] of chunks.entries()) {
          const replyMarkup = index === chunks.length - 1 ? replyMarkupForNotification(notification, candidate) : undefined;
          const message = await sendTelegramApi("sendMessage", {
            chat_id: candidate.telegramId,
            text,
            parse_mode: telegramText.parseMode,
            disable_web_page_preview: true,
            reply_markup: replyMarkup
          });
          if (replyMarkup && message?.message_id) {
            notification.telegramMessageId = message.message_id;
            notification.telegramChatId = String(message.chat?.id || candidate.telegramId);
          }
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

function telegramMessageText(notification = {}) {
  const title = clean(notification.title);
  const message = String(notification.message || "").trim();
  if (!title) return { text: message, parseMode: undefined };
  return {
    text: [`<b>${escapeTelegramHtml(title)}</b>`, escapeTelegramHtml(message)].filter(Boolean).join("\n\n"),
    parseMode: "HTML"
  };
}

function escapeTelegramHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function handleTelegramActionUrl(url, res) {
  const kind = url.searchParams.get("kind") || "confirm";
  const candidateId = url.searchParams.get("candidateId") || "";
  const signature = url.searchParams.get("signature") || "";

  if (kind === "waitlist") {
    await handleTelegramWaitlistActionUrl(url, res, candidateId, signature);
    return;
  }

  const decision = url.searchParams.get("decision") || "";
  if (!candidateId || !["yes", "no"].includes(decision) || !isValidTelegramConfirmationSignature(candidateId, decision, signature)) {
    sendTelegramActionPage(res, "Ссылка недействительна", "Откройте мини-приложение и повторите действие.", 400);
    return;
  }

  const next = await mutateState(async (state, tools) => {
    const resolvedCommand = resolveCommandReferences({
      action: "candidate_confirm",
      actor: "telegram_link",
      payload: { candidateId, decision, actor: "telegram_link" }
    }, state);
    const applied = applyInterviewCommand(state, resolvedCommand);
    const prepared = tools.prepareStateIds
      ? await tools.prepareStateIds(applied.state, applied.result)
      : applied;
    const deliveredState = await deliverPendingNotifications(prepared.state);
    await clearLatestTelegramKeyboard(deliveredState, prepared.result.candidateId || candidateId, "confirmation_request");
    return { state: deliveredState, result: prepared.result };
  });

  const savedDecision = next.result.decision || decision;
  sendTelegramActionPage(
    res,
    next.result.alreadyAnswered ? "Ответ уже сохранен" : savedDecision === "yes" ? "Участие подтверждено" : "Отказ сохранен",
    savedDecision === "yes"
      ? "Спасибо. Рекрутер увидит подтверждение в журнале."
      : "Мы сняли вас с этой даты. Можно вернуться к записи в мини-приложении."
  );
}

async function handleTelegramWaitlistActionUrl(url, res, candidateId, signature) {
  const intent = url.searchParams.get("intent") || "";
  const slotId = url.searchParams.get("slotId") || "";
  if (!candidateId || !slotId || !["book", "stay"].includes(intent) || !isValidTelegramWaitlistSignature(candidateId, intent, slotId, signature)) {
    sendTelegramActionPage(res, "Ссылка недействительна", "Откройте мини-приложение и повторите действие.", 400);
    return;
  }

  const next = await mutateState(async (state, tools) => {
    const resolvedCommand = resolveCommandReferences({
      action: "waitlist_slot_response",
      actor: "telegram_link",
      payload: { candidateId, slotId, intent, actor: "telegram_link" }
    }, state);
    const applied = applyInterviewCommand(state, resolvedCommand);
    const prepared = tools.prepareStateIds
      ? await tools.prepareStateIds(applied.state, applied.result)
      : applied;
    const deliveredState = await deliverPendingNotifications(prepared.state);
    await clearLatestTelegramKeyboard(
      deliveredState,
      prepared.result.candidateId || candidateId,
      "waitlist_new_slot",
      prepared.result.slotId || slotId
    );
    return { state: deliveredState, result: prepared.result };
  });

  sendTelegramActionPage(
    res,
    next.result.alreadyHandled ? "Действие уже обработано" : intent === "book" ? "Запись сохранена" : "Оставили вас в очереди",
    next.result.alreadyHandled
      ? "Текущий статус кандидата уже сохранен в системе."
      : intent === "book"
        ? "Вы записаны на эту дату. Подробности отправлены в чат."
        : "Хорошо, вы остаетесь в листе ожидания следующей даты."
  );
}

async function handleTelegramUpdate(update) {
  const callback = update?.callback_query;
  if (!callback) return;

  const data = String(callback.data || "");
  const [scope, action, firstId, secondId] = data.split(":");
  if (scope === "waitlist" && ["book", "stay"].includes(action) && firstId && secondId) {
    const slotId = firstId;
    const candidateId = secondId;
    const next = await mutateState(async (state, tools) => {
      const resolvedCommand = resolveCommandReferences({
        action: "waitlist_slot_response",
        actor: "telegram",
        payload: { candidateId, slotId, intent: action, actor: "telegram" }
      }, state);
      const applied = applyInterviewCommand(state, resolvedCommand);
      const prepared = tools.prepareStateIds
        ? await tools.prepareStateIds(applied.state, applied.result)
        : applied;
      const deliveredState = await deliverPendingNotifications(prepared.state);
      await clearCallbackMessageKeyboard(callback);
      await clearLatestTelegramKeyboard(
        deliveredState,
        prepared.result.candidateId || candidateId,
        "waitlist_new_slot",
        prepared.result.slotId || slotId
      );
      return { state: deliveredState, result: prepared.result };
    });
    await answerTelegramCallback(
      callback.id,
      next.result.alreadyHandled ? "Действие уже было обработано" : action === "book" ? "Запись сохранена" : "Вы остаетесь в очереди"
    );
    return;
  }

  const decision = action;
  const candidateId = firstId;
  if (scope !== "confirm" || !["yes", "no"].includes(decision) || !candidateId) {
    await answerTelegramCallback(callback.id, "Команда не распознана");
    return;
  }

  const next = await mutateState(async (state, tools) => {
    const resolvedCommand = resolveCommandReferences({
      action: "candidate_confirm",
      actor: "candidate",
      payload: { candidateId, decision, actor: "telegram" }
    }, state);
    const applied = applyInterviewCommand(state, resolvedCommand);
    const prepared = tools.prepareStateIds
      ? await tools.prepareStateIds(applied.state, applied.result)
      : applied;
    const deliveredState = await deliverPendingNotifications(prepared.state);
    await clearCallbackMessageKeyboard(callback);
    await clearLatestTelegramKeyboard(deliveredState, prepared.result.candidateId || candidateId, "confirmation_request");
    return { state: deliveredState, result: prepared.result };
  });
  await answerTelegramCallback(
    callback.id,
    next.result.alreadyAnswered ? "Ответ уже был сохранен" : decision === "yes" ? "Участие подтверждено" : "Отказ сохранен"
  );
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
    .filter((action) => action.label && (action.callbackData || action.url))
    .map((action) => {
      if (action.url) return { text: action.label, url: action.url };
      const actionUrl = telegramActionUrl(action, candidate);
      if (actionUrl) return { text: action.label, url: actionUrl };
      return { text: action.label, callback_data: action.callbackData };
    });
  return buttons.length ? { inline_keyboard: [buttons] } : undefined;
}

function telegramActionUrl(action, candidate) {
  const [scope, actionName, firstId, secondId] = String(action.callbackData || "").split(":");
  const target = new URL("/api/telegram/action", PUBLIC_APP_URL);
  if (scope === "confirm" && ["yes", "no"].includes(actionName) && firstId && candidate?.id === firstId) {
    target.searchParams.set("candidateId", firstId);
    target.searchParams.set("decision", actionName);
    target.searchParams.set("signature", signTelegramConfirmationAction(firstId, actionName));
    return target.toString();
  }
  if (scope === "waitlist" && ["book", "stay"].includes(actionName) && firstId && secondId && candidate?.id === secondId) {
    target.searchParams.set("kind", "waitlist");
    target.searchParams.set("candidateId", secondId);
    target.searchParams.set("slotId", firstId);
    target.searchParams.set("intent", actionName);
    target.searchParams.set("signature", signTelegramWaitlistAction(secondId, actionName, firstId));
    return target.toString();
  }
  return "";
}

function signTelegramConfirmationAction(candidateId, decision) {
  return createHmac("sha256", TELEGRAM_ACTION_SECRET)
    .update(`${candidateId}:${decision}`)
    .digest("hex")
    .slice(0, 32);
}

function signTelegramWaitlistAction(candidateId, intent, slotId) {
  return createHmac("sha256", TELEGRAM_ACTION_SECRET)
    .update(`waitlist:${candidateId}:${intent}:${slotId}`)
    .digest("hex")
    .slice(0, 32);
}

function isValidTelegramConfirmationSignature(candidateId, decision, signature) {
  const expected = signTelegramConfirmationAction(candidateId, decision);
  const actual = String(signature || "");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

function isValidTelegramWaitlistSignature(candidateId, intent, slotId, signature) {
  const expected = signTelegramWaitlistAction(candidateId, intent, slotId);
  const actual = String(signature || "");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

async function clearCallbackMessageKeyboard(callback) {
  const chatId = callback?.message?.chat?.id;
  const messageId = callback?.message?.message_id;
  if (!chatId || !messageId || !TELEGRAM_BOT_TOKEN) return;
  await sendTelegramApi("editMessageReplyMarkup", {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: { inline_keyboard: [] }
  }).catch(() => {});
}

async function clearLatestTelegramKeyboard(state, candidateId, type, slotId = null) {
  const candidate = state.candidates.find((item) => item.id === candidateId);
  const notification = state.notifications.find(
    (item) =>
      item.candidateId === candidateId &&
      item.type === type &&
      (!slotId || item.slotId === slotId) &&
      item.telegramMessageId
  );
  if (!notification) return;
  notification.actions = [];
  notification.keyboardClearedAt = notification.keyboardClearedAt || new Date().toISOString();
  if (!TELEGRAM_BOT_TOKEN) return;
  try {
    await sendTelegramApi("editMessageReplyMarkup", {
      chat_id: notification.telegramChatId || candidate?.telegramId,
      message_id: notification.telegramMessageId,
      reply_markup: { inline_keyboard: [] }
    });
    delete notification.keyboardClearError;
  } catch (error) {
    notification.keyboardClearError = error.message || "telegram_keyboard_clear_failed";
  }
}

function startConfirmationScheduler() {
  if (DISABLE_CONFIRMATION_SCHEDULER) return;
  const run = () => {
    runScheduledConfirmations().catch((error) => {
      console.error(`confirmation scheduler failed: ${error.message || error}`);
    });
  };
  run();
  const timer = setInterval(run, CONFIRMATION_SCHEDULER_INTERVAL_MS);
  timer.unref?.();
}

async function runScheduledConfirmations(nowDate = new Date()) {
  const nowMoscow = moscowDateTimeParts(nowDate);
  if (nowMoscow.hour < CONFIRMATION_SEND_HOUR_MOSCOW) return;
  const dueDate = addDaysToMoscowDate(nowMoscow.date, 1);

  const next = await mutateState(async (state, tools) => {
    const resolvedCommand = resolveCommandReferences(
      {
        action: "send_due_confirmations",
        actor: "system",
        payload: { dueDate, actor: "system" }
      },
      state
    );
    const applied = applyInterviewCommand(
      state,
      resolvedCommand,
      { now: nowDate.toISOString() }
    );
    const prepared = tools.prepareStateIds
      ? await tools.prepareStateIds(applied.state, applied.result)
      : applied;
    if (!prepared.result.requestedCount) return prepared;
    const deliveredState = await deliverPendingNotifications(prepared.state);
    return { state: deliveredState, result: prepared.result };
  });
  if (!next.result.requestedCount) return;
  console.log(`confirmation scheduler sent ${next.result.requestedCount} reminders for ${dueDate}`);
}

function moscowDateTimeParts(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${byType.year}-${byType.month}-${byType.day}`,
    hour: Number(byType.hour),
    minute: Number(byType.minute)
  };
}

function addDaysToMoscowDate(date, days) {
  const next = new Date(`${date}T00:00:00+03:00`);
  next.setUTCDate(next.getUTCDate() + Number(days || 0));
  return moscowDateTimeParts(next).date;
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
