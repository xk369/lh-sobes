import assert from "node:assert/strict";
import { test } from "node:test";
import { createPuzzleBotClient } from "../src/puzzlebot-client.js";

test("PuzzleBot client replaces all categories with the interview category", async () => {
  let requestedUrl = null;
  const client = createPuzzleBotClient({
    token: "secret-token",
    privateChatId: "7961350221",
    interviewCategoryId: "983544",
    fetchImpl: async (url, options) => {
      requestedUrl = new URL(url);
      assert.equal(options.method, "GET");
      return jsonResponse({ code: 0, data: "ok" });
    }
  });

  const result = await client.replaceWithInterviewCategory("123456789");

  assert.equal(requestedUrl.searchParams.get("method"), "categoryReplace");
  assert.equal(requestedUrl.searchParams.get("user_id"), "123456789");
  assert.equal(requestedUrl.searchParams.get("tg_chat_id"), "7961350221");
  assert.equal(requestedUrl.searchParams.get("category_id"), "983544");
  assert.equal(requestedUrl.searchParams.get("token"), "secret-token");
  assert.deepEqual(result, {
    status: "replaced",
    categoryId: "983544",
    privateChatId: "7961350221"
  });
});

test("PuzzleBot client sends /start to a user", async () => {
  let requestedUrl = null;
  const client = createPuzzleBotClient({
    token: "secret-token",
    privateChatId: "7961350221",
    interviewCategoryId: "983544",
    fetchImpl: async (url, options) => {
      requestedUrl = new URL(url);
      assert.equal(options.method, "GET");
      return jsonResponse({ code: 0, data: "ok" });
    }
  });

  const result = await client.sendStartCommand("123456789");

  assert.equal(requestedUrl.searchParams.get("method"), "sendCommand");
  assert.equal(requestedUrl.searchParams.get("command_name"), "/start");
  assert.equal(requestedUrl.searchParams.get("tg_chat_id"), "123456789");
  assert.equal(requestedUrl.searchParams.get("token"), "secret-token");
  assert.deepEqual(result, {
    status: "sent",
    commandName: "/start",
    telegramUserId: "123456789"
  });
});

test("PuzzleBot client rejects API errors without exposing its token", async () => {
  const client = createPuzzleBotClient({
    token: "do-not-leak-this-token",
    privateChatId: "7961350221",
    interviewCategoryId: "983544",
    fetchImpl: async () => jsonResponse({ code: 201, description: "User not found!" })
  });

  await assert.rejects(
    () => client.replaceWithInterviewCategory("123456789"),
    (error) => {
      assert.equal(error.status, 502);
      assert.equal(error.code, "PUZZLEBOT_CATEGORY_SYNC_FAILED");
      assert.match(error.message, /код 201/);
      assert.doesNotMatch(error.message, /do-not-leak-this-token/);
      return true;
    }
  );
});

test("PuzzleBot client requires complete server-side configuration", async () => {
  const client = createPuzzleBotClient({});
  assert.equal(client.isConfigured, false);
  await assert.rejects(() => client.replaceWithInterviewCategory("123456789"), /Интеграция PuzzleBot не настроена/);
});

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return payload;
    }
  };
}
