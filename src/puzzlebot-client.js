const DEFAULT_API_URL = "https://api.puzzlebot.top/";
const DEFAULT_TIMEOUT_MS = 10_000;

export function createPuzzleBotClient(options = {}) {
  const token = clean(options.token);
  const privateChatId = clean(options.privateChatId);
  const interviewCategoryId = clean(options.interviewCategoryId);
  const apiUrl = clean(options.apiUrl) || DEFAULT_API_URL;
  const timeoutMs = positiveNumber(options.timeoutMs, DEFAULT_TIMEOUT_MS);
  const fetchImpl = options.fetchImpl || globalThis.fetch;

  return {
    isConfigured: Boolean(token && privateChatId && interviewCategoryId),

    async replaceWithInterviewCategory(userId) {
      const telegramUserId = clean(userId);
      if (!token || !privateChatId || !interviewCategoryId) {
        throw puzzleBotError("Интеграция PuzzleBot не настроена", 503);
      }
      if (!telegramUserId) {
        throw puzzleBotError("У кандидата отсутствует Telegram ID", 400);
      }
      if (typeof fetchImpl !== "function") {
        throw puzzleBotError("HTTP-клиент PuzzleBot недоступен", 503);
      }

      const url = new URL(apiUrl);
      url.searchParams.set("token", token);
      url.searchParams.set("method", "categoryReplace");
      url.searchParams.set("user_id", telegramUserId);
      url.searchParams.set("tg_chat_id", privateChatId);
      url.searchParams.set("category_id", interviewCategoryId);

      let response;
      try {
        response = await fetchImpl(url, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(timeoutMs)
        });
      } catch (error) {
        const detail = error?.name === "TimeoutError" ? "таймаут" : "сетевая ошибка";
        throw puzzleBotError(`PuzzleBot недоступен: ${detail}`, 502);
      }

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw puzzleBotError(`PuzzleBot вернул HTTP ${response.status}`, 502);
      }
      if (!payload || Number(payload.code) !== 0) {
        const code = Number.isFinite(Number(payload?.code)) ? ` (код ${payload.code})` : "";
        const description = safeDescription(payload?.description);
        throw puzzleBotError(`PuzzleBot не заменил категорию${code}${description ? `: ${description}` : ""}`, 502);
      }

      return {
        status: "replaced",
        categoryId: interviewCategoryId,
        privateChatId
      };
    },

    async sendStartCommand(userId) {
      const telegramUserId = clean(userId);
      if (!token || !privateChatId || !interviewCategoryId) {
        throw puzzleBotError("Интеграция PuzzleBot не настроена", 503, "PUZZLEBOT_COMMAND_SEND_FAILED");
      }
      if (!telegramUserId) {
        throw puzzleBotError("У кандидата отсутствует Telegram ID", 400, "PUZZLEBOT_COMMAND_SEND_FAILED");
      }
      if (typeof fetchImpl !== "function") {
        throw puzzleBotError("HTTP-клиент PuzzleBot недоступен", 503, "PUZZLEBOT_COMMAND_SEND_FAILED");
      }

      const url = new URL(apiUrl);
      url.searchParams.set("token", token);
      url.searchParams.set("method", "sendCommand");
      url.searchParams.set("command_name", "/start");
      url.searchParams.set("tg_chat_id", telegramUserId);

      let response;
      try {
        response = await fetchImpl(url, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(timeoutMs)
        });
      } catch (error) {
        const detail = error?.name === "TimeoutError" ? "таймаут" : "сетевая ошибка";
        throw puzzleBotError(`PuzzleBot недоступен: ${detail}`, 502, "PUZZLEBOT_COMMAND_SEND_FAILED");
      }

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw puzzleBotError(`PuzzleBot вернул HTTP ${response.status}`, 502, "PUZZLEBOT_COMMAND_SEND_FAILED");
      }
      if (!payload || Number(payload.code) !== 0) {
        const code = Number.isFinite(Number(payload?.code)) ? ` (код ${payload.code})` : "";
        const description = safeDescription(payload?.description);
        throw puzzleBotError(
          `PuzzleBot не отправил команду /start${code}${description ? `: ${description}` : ""}`,
          502,
          "PUZZLEBOT_COMMAND_SEND_FAILED"
        );
      }

      return {
        status: "sent",
        commandName: "/start",
        telegramUserId
      };
    }
  };
}

function puzzleBotError(message, status, code = "PUZZLEBOT_CATEGORY_SYNC_FAILED") {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function safeDescription(value) {
  return clean(value).replace(/[\r\n]+/g, " ").slice(0, 180);
}

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function clean(value) {
  return String(value || "").trim();
}
