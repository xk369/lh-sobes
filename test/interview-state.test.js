import assert from "node:assert/strict";
import { test } from "node:test";
import { applyInterviewCommand, createSeedState, deriveState } from "../src/interview-state.js";

const RECRUITER_TELEGRAM_IDS = [
  "1294774551",
  "6774493976",
  "1711587497",
  "5950662713",
  "829555528",
  "1223141252",
  "342064797",
  "985283520",
  "5067088817"
];

test("passed interview preserves already sent resources and queues the success notification", () => {
  const state = createSeedState("2026-08-10T09:00:00.000Z");
  const candidate = state.candidates.find((item) => item.id === "cand-002");
  assert.equal(candidate.attendanceStatus, "arrived");

  const result = applyInterviewCommand(
    state,
    { action: "set_result", payload: { candidateId: candidate.id, result: "fit" } },
    { now: "2026-08-13T12:30:00.000Z" }
  );
  const updated = result.state.candidates.find((item) => item.id === candidate.id);
  const notification = result.state.notifications.find(
    (item) => item.candidateId === candidate.id && item.type === "registration_instructions"
  );

  assert.equal(result.result.result, "fit");
  assert.equal(updated.interviewResult, "fit");
  assert.equal(updated.status, "registration_pending");
  assert.equal(updated.candidateLayerStatus, "resources_sent");
  assert.equal(updated.registrationStatus, "materials_sent");
  assert.ok(notification);
  assert.equal(notification.status, "pending");
});

test("new interview date automatically notifies waitlist candidates", () => {
  let state = createSeedState("2026-08-10T09:00:00.000Z");

  const waitlistBefore = state.candidates.filter((candidate) => candidate.status === "waitlist").length;
  assert.ok(waitlistBefore > 0);

  const result = applyInterviewCommand(
    state,
    {
      action: "create_slot",
      payload: {
        date: "2026-08-20",
        time: "13:00",
        venueId: "loft23",
        seats: 8,
        bookingText: "Вход со стороны главной проходной.",
        directionsVideoUrl: "https://example.com/loft3-route"
      }
    },
    { now: "2026-08-10T10:00:00.000Z" }
  );

  state = result.state;
  const slot = state.slots.find((item) => item.id === result.result.slotId);
  assert.equal(result.result.notifiedCount, waitlistBefore);
  assert.equal(slot.title, "Собеседование LOFT HALL");
  assert.equal(slot.venue, "LOFT#2/3");
  assert.equal(slot.venueAddress, "ул. Ленинская Слобода, 26с11");
  assert.equal(slot.bookingText, "Вход со стороны главной проходной.");
  assert.equal(slot.directionsVideoUrl, "https://example.com/loft3-route");

  const waitlistCandidate = state.candidates.find((candidate) => candidate.id === "cand-003");
  assert.equal(waitlistCandidate.waitlistTargetSlotId, result.result.slotId);
  assert.ok(waitlistCandidate.lastWaitlistNotifiedAt);

  const notification = state.notifications.find(
    (item) => item.candidateId === "cand-003" && item.type === "waitlist_new_slot"
  );
  assert.equal(notification.slotId, result.result.slotId);
  assert.deepEqual(
    notification.actions.map((action) => action.callbackData),
    [`waitlist:book:${result.result.slotId}:cand-003`, `waitlist:stay:${result.result.slotId}:cand-003`]
  );
});

test("active interview date cannot be duplicated by date and time", () => {
  let state = createSeedState("2026-08-10T09:00:00.000Z");

  assert.throws(
    () =>
      applyInterviewCommand(
        state,
        {
          action: "create_slot",
          payload: {
            date: "2026-08-13",
            time: "12:00",
            venueId: "loft23",
            seats: 8
          }
        },
        { now: "2026-08-10T10:00:00.000Z" }
      ),
    /уже создано активное собеседование/
  );

  ({ state } = applyInterviewCommand(
    state,
    { action: "complete_slot", payload: { slotId: "slot-001" } },
    { now: "2026-08-13T14:00:00.000Z" }
  ));

  const result = applyInterviewCommand(
    state,
    {
      action: "create_slot",
      payload: {
        date: "2026-08-13",
        time: "12:00",
        venueId: "loft23",
        seats: 8
      }
    },
    { now: "2026-08-13T14:05:00.000Z" }
  );

  assert.ok(result.result.slotId);
});

test("legacy auto booking messages migrate to empty booking text", () => {
  const state = createSeedState("2026-08-10T09:00:00.000Z");
  state.slots[0].bookingText = "Ждем вас на собеседовании: LOFT #8. После подтверждения отправим дополнительные материалы.";
  state.slots[1].bookingText = "РАБОТАЙТЕ В ОДНОМ ИЗ ЛУЧШИХ EVENT-ПРОЕКТОВ ДВУХ СТОЛИЦ!\n\nБольшой старый шаблон.";
  state.notifications.unshift({
    id: "notif-old",
    candidateId: "cand-001",
    type: "booking_materials",
    title: "Материалы к собеседованию",
    message: "Материалы к собеседованию\n\nРАБОТАЙТЕ В ОДНОМ ИЗ ЛУЧШИХ EVENT-ПРОЕКТОВ ДВУХ СТОЛИЦ!\n\nБольшой старый шаблон.",
    slotId: "slot-001",
    media: [],
    actions: [],
    status: "pending",
    channel: "telegram",
    createdAt: "2026-08-10T09:30:00.000Z",
    sentAt: null
  });

  const derived = deriveState(state);

  assert.equal(derived.slots[0].bookingText, "");
  assert.equal(derived.slots[1].bookingText, "");
  const legacyNotification = derived.notifications.find((item) => item.id === "notif-old");
  assert.equal(legacyNotification.title, "");
  assert.equal(legacyNotification.message, "");
  assert.equal(derived.notifications.find((item) => item.type === "resource_registration_bot").title, "");
  assert.deepEqual(derived.settings.developerTelegramIds, RECRUITER_TELEGRAM_IDS);
});

test("candidate can confirm, miss interview, and return to waitlist", () => {
  let state = createSeedState("2026-08-10T09:00:00.000Z");
  assert.equal(
    state.settings.directionMaterials.find((item) => item.id === "loft_23_route").telegramFileId,
    "BAACAgIAAxkBAAEN-nBqfJNGc4zIAlyz1Vtm5coWB8LiigACWKQAAjIB4EsUwGqbL0OWxT0E"
  );
  assert.equal(state.settings.directionMaterials.find((item) => item.id === "loft_23_route").telegramMethod, "video");
  assert.equal(
    state.settings.interviewVenues.find((item) => item.id === "loft23").address,
    "ул. Ленинская Слобода, 26с11"
  );
  assert.deepEqual(state.settings.interviewVenues.map((item) => item.id), ["loft23"]);

  ({ state } = applyInterviewCommand(
    state,
    {
      action: "book_slot",
      payload: {
        slotId: "slot-002",
        candidate: {
          telegramId: "555555555",
          telegram: "@test_candidate",
          name: "Тест Кандидат",
          phone: "+7 900 555-55-55",
          source: "Telegram"
        }
      }
    },
    { now: "2026-08-10T10:00:00.000Z" }
  ));

  const candidate = state.candidates.find((item) => item.telegramId === "555555555");
  assert.equal(candidate.status, "booked");
  const bookingMaterials = state.notifications.find(
    (item) => item.candidateId === candidate.id && item.type === "booking_materials"
  );
  assert.equal(bookingMaterials.slotId, "slot-002");
  assert.equal(bookingMaterials.title, "📌 Важная информация перед собеседованием");
  assert.match(bookingMaterials.message, /Ждём вас/);
  assert.match(bookingMaterials.message, /паспорт/);
  assert.match(bookingMaterials.message, /2 комплекта формы/);
  assert.equal(bookingMaterials.media.length, 1);
  assert.equal(bookingMaterials.media[0].type, "video");
  assert.equal(bookingMaterials.media[0].fileId, "BAACAgIAAxkBAAEN-nBqfJNGc4zIAlyz1Vtm5coWB8LiigACWKQAAjIB4EsUwGqbL0OWxT0E");
  assert.equal(bookingMaterials.media[0].caption, "");
  assert.match(
    state.notifications.find((item) => item.candidateId === candidate.id && item.type === "booking_created").message,
    /https:\/\/yandex\.ru\/maps\/-\/CTsmF-9~/
  );

  ({ state } = applyInterviewCommand(
    state,
    { action: "request_confirmation", payload: { candidateId: candidate.id } },
    { now: "2026-08-11T10:00:00.000Z" }
  ));
  assert.equal(state.candidates.find((item) => item.id === candidate.id).confirmationStatus, "pending");
  const confirmationRequest = state.notifications.find(
    (item) => item.candidateId === candidate.id && item.type === "confirmation_request"
  );
  assert.equal(confirmationRequest.actions.length, 2);
  assert.deepEqual(
    confirmationRequest.actions.map((action) => action.callbackData),
    [`confirm:yes:${candidate.id}`, `confirm:no:${candidate.id}`]
  );

  ({ state } = applyInterviewCommand(
    state,
    { action: "candidate_confirm", payload: { candidateId: candidate.id, decision: "yes" } },
    { now: "2026-08-12T10:00:00.000Z" }
  ));
  assert.equal(state.candidates.find((item) => item.id === candidate.id).status, "confirmed");
  assert.equal(
    state.notifications.find((item) => item.candidateId === candidate.id && item.type === "confirmation_request").actions.length,
    0
  );

  const secondConfirmation = applyInterviewCommand(
    state,
    { action: "candidate_confirm", payload: { candidateId: candidate.id, decision: "no" } },
    { now: "2026-08-12T10:01:00.000Z" }
  );
  state = secondConfirmation.state;
  assert.equal(secondConfirmation.result.alreadyAnswered, true);
  assert.equal(state.candidates.find((item) => item.id === candidate.id).status, "confirmed");
  assert.equal(state.candidates.find((item) => item.id === candidate.id).confirmationStatus, "confirmed");

  ({ state } = applyInterviewCommand(
    state,
    { action: "send_due_confirmations", payload: { slotId: "slot-002" } },
    { now: "2026-08-12T10:05:00.000Z" }
  ));
  assert.equal(state.candidates.find((item) => item.id === candidate.id).status, "confirmed");
  assert.equal(state.candidates.find((item) => item.id === candidate.id).confirmationStatus, "confirmed");

  assert.equal(
    state.notifications.filter((item) => item.candidateId === candidate.id && item.type === "confirmation_materials").length,
    0
  );

  ({ state } = applyInterviewCommand(
    state,
    { action: "mark_attendance", payload: { candidateId: candidate.id, attendance: "no_show" } },
    { now: "2026-08-13T12:05:00.000Z" }
  ));
  const noShow = state.candidates.find((item) => item.id === candidate.id);
  assert.equal(noShow.status, "no_show");
  const noShowFollowup = state.notifications.find((item) => item.candidateId === candidate.id && item.type === "no_show_followup");
  assert.ok(noShowFollowup);
  assert.match(noShowFollowup.message, /работа в LOFT HALL/);

  ({ state } = applyInterviewCommand(
    state,
    { action: "rebook_interest", payload: { candidateId: candidate.id, intent: "waitlist" } },
    { now: "2026-08-13T12:12:00.000Z" }
  ));
  assert.equal(state.candidates.find((item) => item.id === candidate.id).status, "waitlist");
});

test("waitlist candidate can book from new-date notification or stay in queue", () => {
  let state = createSeedState("2026-08-10T09:00:00.000Z");

  let result = applyInterviewCommand(
    state,
    {
      action: "create_slot",
      payload: {
        date: "2026-08-20",
        time: "17:00",
        venueId: "loft2",
        seats: 8
      }
    },
    { now: "2026-08-10T10:00:00.000Z" }
  );
  state = result.state;
  const slotId = result.result.slotId;

  result = applyInterviewCommand(
    state,
    { action: "waitlist_slot_response", payload: { candidateId: "cand-003", slotId, intent: "stay" } },
    { now: "2026-08-10T10:02:00.000Z" }
  );
  state = result.state;
  const stayed = state.candidates.find((candidate) => candidate.id === "cand-003");
  assert.equal(stayed.status, "waitlist");
  assert.equal(stayed.waitlistTargetSlotId, slotId);
  assert.equal(
    state.notifications.find((item) => item.candidateId === "cand-003" && item.type === "waitlist_new_slot").actions.length,
    0
  );

  ({ state } = applyInterviewCommand(
    state,
    { action: "notify_waitlist", payload: { slotId } },
    { now: "2026-08-10T10:05:00.000Z" }
  ));
  ({ state } = applyInterviewCommand(
    state,
    { action: "waitlist_slot_response", payload: { candidateId: "cand-003", slotId, intent: "book" } },
    { now: "2026-08-10T10:06:00.000Z" }
  ));

  const booked = state.candidates.find((candidate) => candidate.id === "cand-003");
  assert.equal(booked.status, "booked");
  assert.equal(booked.interviewSlotId, slotId);

  result = applyInterviewCommand(
    state,
    { action: "waitlist_slot_response", payload: { candidateId: "cand-003", slotId, intent: "stay" } },
    { now: "2026-08-10T10:07:00.000Z" }
  );
  state = result.state;
  assert.equal(result.result.alreadyHandled, true);
  assert.equal(state.candidates.find((candidate) => candidate.id === "cand-003").status, "booked");
});

test("candidate can rebook to another open slot and free previous seat", () => {
  let state = createSeedState("2026-08-10T09:00:00.000Z");

  ({ state } = applyInterviewCommand(
    state,
    {
      action: "book_slot",
      payload: {
        slotId: "slot-002",
        candidate: {
          telegramId: "555555556",
          telegram: "@rebook_candidate",
          name: "Кандидат Перезапись",
          phone: "+7 900 555-55-56",
          source: "Telegram"
        }
      }
    },
    { now: "2026-08-10T10:00:00.000Z" }
  ));

  const candidate = state.candidates.find((item) => item.telegramId === "555555556");
  const slotTwoBefore = state.slots.find((item) => item.id === "slot-002");
  const slotOneBefore = state.slots.find((item) => item.id === "slot-001");

  ({ state } = applyInterviewCommand(
    state,
    { action: "rebook_interest", payload: { candidateId: candidate.id, intent: "book_slot", slotId: "slot-001" } },
    { now: "2026-08-10T10:30:00.000Z" }
  ));

  const rebooked = state.candidates.find((item) => item.id === candidate.id);
  const slotTwoAfter = state.slots.find((item) => item.id === "slot-002");
  const slotOneAfter = state.slots.find((item) => item.id === "slot-001");

  assert.equal(rebooked.interviewSlotId, "slot-001");
  assert.equal(rebooked.status, "booked");
  assert.equal(rebooked.confirmationStatus, "not_requested");
  assert.equal(rebooked.attendanceStatus, "unknown");
  assert.equal(slotTwoAfter.availableSeats, slotTwoBefore.availableSeats + 1);
  assert.equal(slotOneAfter.availableSeats, slotOneBefore.availableSeats - 1);
});

test("due confirmation request is filtered by interview date and sent once", () => {
  let state = createSeedState("2026-08-10T09:00:00.000Z");

  ({ state } = applyInterviewCommand(
    state,
    {
      action: "book_slot",
      payload: {
        slotId: "slot-002",
        candidate: {
          telegramId: "555555557",
          telegram: "@due_candidate",
          name: "Кандидат Подтверждение",
          phone: "+7 900 555-55-57",
          source: "Telegram"
        }
      }
    },
    { now: "2026-08-10T10:00:00.000Z" }
  ));

  const candidate = state.candidates.find((item) => item.telegramId === "555555557");
  let result = applyInterviewCommand(
    state,
    { action: "send_due_confirmations", payload: { dueDate: "2026-08-16" } },
    { now: "2026-08-15T18:00:00.000Z" }
  );
  state = result.state;

  assert.equal(result.result.requestedCount, 1);
  assert.equal(state.candidates.find((item) => item.id === candidate.id).confirmationStatus, "pending");

  result = applyInterviewCommand(
    state,
    { action: "send_due_confirmations", payload: { dueDate: "2026-08-16" } },
    { now: "2026-08-15T18:01:00.000Z" }
  );
  state = result.state;

  assert.equal(result.result.requestedCount, 0);
  assert.equal(
    state.notifications.filter((item) => item.candidateId === candidate.id && item.type === "confirmation_request").length,
    1
  );
});

test("declined confirmation clears actions, frees seat, and locks later answers", () => {
  let state = createSeedState("2026-08-10T09:00:00.000Z");
  const slotBeforeBooking = state.slots.find((item) => item.id === "slot-002");

  ({ state } = applyInterviewCommand(
    state,
    {
      action: "book_slot",
      payload: {
        slotId: "slot-002",
        candidate: {
          telegramId: "555555558",
          telegram: "@decline_candidate",
          name: "Кандидат Отказ",
          phone: "+7 900 555-55-58",
          source: "Telegram"
        }
      }
    },
    { now: "2026-08-10T10:00:00.000Z" }
  ));

  const candidate = state.candidates.find((item) => item.telegramId === "555555558");
  assert.equal(state.slots.find((item) => item.id === "slot-002").availableSeats, slotBeforeBooking.availableSeats - 1);

  ({ state } = applyInterviewCommand(
    state,
    { action: "request_confirmation", payload: { candidateId: candidate.id } },
    { now: "2026-08-15T18:00:00.000Z" }
  ));

  const request = state.notifications.find(
    (item) => item.candidateId === candidate.id && item.type === "confirmation_request"
  );
  assert.equal(request.actions.length, 2);

  ({ state } = applyInterviewCommand(
    state,
    { action: "candidate_confirm", payload: { candidateId: candidate.id, decision: "no" } },
    { now: "2026-08-15T18:02:00.000Z" }
  ));

  const declined = state.candidates.find((item) => item.id === candidate.id);
  assert.equal(declined.status, "declined_before_interview");
  assert.equal(declined.confirmationStatus, "declined");
  assert.equal(declined.attendanceStatus, "declined_before");
  assert.notEqual(declined.status, "waitlist");
  assert.equal(state.slots.find((item) => item.id === "slot-002").availableSeats, slotBeforeBooking.availableSeats);
  assert.equal(
    state.notifications.find((item) => item.candidateId === candidate.id && item.type === "confirmation_request").actions.length,
    0
  );
  assert.ok(
    state.notifications.find((item) => item.candidateId === candidate.id && item.type === "confirmation_request").keyboardClearedAt
  );

  const repeated = applyInterviewCommand(
    state,
    { action: "candidate_confirm", payload: { candidateId: candidate.id, decision: "yes" } },
    { now: "2026-08-15T18:03:00.000Z" }
  );
  state = repeated.state;
  const stillDeclined = state.candidates.find((item) => item.id === candidate.id);
  assert.equal(repeated.result.alreadyAnswered, true);
  assert.equal(repeated.result.decision, "no");
  assert.equal(stillDeclined.status, "declined_before_interview");
  assert.equal(stillDeclined.confirmationStatus, "declined");
  assert.equal(state.slots.find((item) => item.id === "slot-002").availableSeats, slotBeforeBooking.availableSeats);
});

test("candidate telegram is required for shared candidate records", () => {
  const state = createSeedState("2026-08-10T09:00:00.000Z");

  assert.throws(
    () =>
      applyInterviewCommand(
        state,
        {
          action: "upsert_candidate",
          payload: {
            name: "Кандидат Без Telegram",
            phone: "+7 900 000-00-00",
            source: "Мини-приложение"
          }
        },
        { now: "2026-08-10T10:00:00.000Z" }
      ),
    /Candidate Telegram is required/
  );
});

test("candidate profile requires readable full name and Russian phone", () => {
  const state = createSeedState("2026-08-10T09:00:00.000Z");

  assert.throws(
    () =>
      applyInterviewCommand(
        state,
        {
          action: "upsert_candidate",
          payload: {
            name: "Тест123",
            phone: "+7 900 000-00-00",
            telegram: "@bad_name",
            source: "Мини-приложение"
          }
        },
        { now: "2026-08-10T10:00:00.000Z" }
      ),
    /ФИО/
  );

  assert.throws(
    () =>
      applyInterviewCommand(
        state,
        {
          action: "upsert_candidate",
          payload: {
            name: "Нормальный Кандидат",
            phone: "+1 555 000-00-00",
            telegram: "@bad_phone",
            source: "Мини-приложение"
          }
        },
        { now: "2026-08-10T10:01:00.000Z" }
      ),
    /Телефон/
  );
});

test("candidate profiles are not implicitly merged by phone or telegram", () => {
  let state = createSeedState("2026-08-10T09:00:00.000Z");

  ({ state } = applyInterviewCommand(
    state,
    {
      action: "upsert_candidate",
      payload: {
        name: "Первый Кандидат",
        phone: "+7 900 111-11-11",
        telegram: "@same_profile",
        telegramId: "900111111"
      }
    },
    { now: "2026-08-10T10:00:00.000Z" }
  ));

  ({ state } = applyInterviewCommand(
    state,
    {
      action: "upsert_candidate",
      payload: {
        name: "Второй Кандидат",
        phone: "+7 900 111-11-11",
        telegram: "@same_profile",
        telegramId: "900111111"
      }
    },
    { now: "2026-08-10T10:05:00.000Z" }
  ));

  const matches = state.candidates.filter((candidate) => candidate.telegramId === "900111111");
  assert.equal(matches.length, 2);
  assert.deepEqual(matches.map((candidate) => candidate.name), ["Первый Кандидат", "Второй Кандидат"]);
});

test("candidate can cancel booking without entering waitlist and frees seat", () => {
  let state = createSeedState("2026-08-10T09:00:00.000Z");
  const slotBefore = state.slots.find((item) => item.id === "slot-002");

  ({ state } = applyInterviewCommand(
    state,
    {
      action: "book_slot",
      payload: {
        slotId: "slot-002",
        candidate: {
          telegramId: "666666666",
          telegram: "@cancel_candidate",
          name: "Кандидат Отмена",
          phone: "8 900 666-66-66",
          source: "Telegram"
        }
      }
    },
    { now: "2026-08-10T10:00:00.000Z" }
  ));

  const candidate = state.candidates.find((item) => item.telegramId === "666666666");
  assert.equal(candidate.phone, "+79006666666");
  assert.equal(state.slots.find((item) => item.id === "slot-002").availableSeats, slotBefore.availableSeats - 1);

  ({ state } = applyInterviewCommand(
    state,
    { action: "cancel_booking", payload: { candidateId: candidate.id } },
    { now: "2026-08-10T10:10:00.000Z" }
  ));

  const cancelled = state.candidates.find((item) => item.id === candidate.id);
  assert.equal(cancelled.status, "declined_before_interview");
  assert.equal(cancelled.confirmationStatus, "declined");
  assert.notEqual(cancelled.status, "waitlist");
  assert.equal(cancelled.interviewHistory[0].outcome, "cancelled_booking");
  assert.equal(state.slots.find((item) => item.id === "slot-002").availableSeats, slotBefore.availableSeats);
});

test("waitlist notifications follow queue order and seat limit", () => {
  let state = createSeedState("2026-08-10T09:00:00.000Z");

  ({ state } = applyInterviewCommand(
    state,
    {
      action: "join_waitlist",
      payload: {
        candidate: {
          telegramId: "888888888",
          telegram: "@second_wait",
          name: "Второй Ожидающий",
          phone: "+7 900 888-88-88",
          source: "Telegram"
        }
      }
    },
    { now: "2026-08-10T09:10:00.000Z" }
  ));

  const result = applyInterviewCommand(
    state,
    {
      action: "create_slot",
      payload: {
        date: "2026-08-22",
        time: "12:00",
        venueId: "loft23",
        seats: 1
      }
    },
    { now: "2026-08-10T10:00:00.000Z" }
  );

  state = result.state;
  assert.equal(result.result.notifiedCount, 1);
  assert.equal(state.candidates.find((candidate) => candidate.id === "cand-003").waitlistTargetSlotId, result.result.slotId);
  assert.equal(state.candidates.find((candidate) => candidate.telegramId === "888888888").waitlistTargetSlotId, null);
});

test("slot template can be cleared without restoring default booking text", () => {
  let state = createSeedState("2026-08-10T09:00:00.000Z");

  const result = applyInterviewCommand(
    state,
    {
      action: "create_slot",
      payload: {
        date: "2026-08-21",
        time: "18:00",
        venueId: "loft2",
        seats: 6,
        templateCleared: "true"
      }
    },
    { now: "2026-08-10T10:00:00.000Z" }
  );

  state = result.state;
  const slot = state.slots.find((item) => item.id === result.result.slotId);
  assert.equal(slot.templateCleared, true);
  assert.equal(slot.bookingText, "");
  assert.equal(slot.directionsVideoUrl, "");
});

test("arrived candidate without refusal receives resources one step at a time", () => {
  let state = createSeedState("2026-08-10T09:00:00.000Z");

  ({ state } = applyInterviewCommand(
    state,
    {
      action: "book_slot",
      payload: {
        slotId: "slot-002",
        candidate: {
          telegramId: "777777777",
          telegram: "@ready_candidate",
          name: "Готовый Кандидат",
          phone: "+7 900 777-77-77",
          source: "HH"
        }
      }
    },
    { now: "2026-08-10T10:00:00.000Z" }
  ));

  const candidate = state.candidates.find((item) => item.telegramId === "777777777");

  ({ state } = applyInterviewCommand(
    state,
    { action: "request_confirmation", payload: { candidateId: candidate.id } },
    { now: "2026-08-11T10:00:00.000Z" }
  ));
  ({ state } = applyInterviewCommand(
    state,
    { action: "candidate_confirm", payload: { candidateId: candidate.id, decision: "yes" } },
    { now: "2026-08-12T10:00:00.000Z" }
  ));
  ({ state } = applyInterviewCommand(
    state,
    { action: "mark_attendance", payload: { candidateId: candidate.id, attendance: "arrived" } },
    { now: "2026-08-13T12:05:00.000Z" }
  ));

  ({ state } = applyInterviewCommand(
    state,
    { action: "send_resource_step", payload: { slotId: "slot-002" } },
    { now: "2026-08-13T12:20:00.000Z" }
  ));

  const withResources = state.candidates.find((item) => item.id === candidate.id);
  assert.equal(withResources.status, "attended");
  assert.equal(withResources.registrationStatus, "materials_sent");
  assert.ok(withResources.resourcesSentAt);
  assert.equal(withResources.resourceStepsSent.length, 1);
  assert.equal(withResources.resourceStepsSent[0].type, "registration_bot");
  const registrationNotification = state.notifications.find(
    (item) => item.candidateId === candidate.id && item.type === "resource_registration_bot"
  );
  assert.ok(registrationNotification);
  assert.equal(registrationNotification.title, "1/5 — Регистрация");
  assert.match(registrationNotification.message, /@LoftHallRegistrationBot/);

  ({ state } = applyInterviewCommand(
    state,
    { action: "send_resource_step", payload: { slotId: "slot-002" } },
    { now: "2026-08-13T12:35:00.000Z" }
  ));

  const withSecondResource = state.candidates.find((item) => item.id === candidate.id);
  assert.equal(withSecondResource.resourceStepsSent.length, 2);
  assert.equal(withSecondResource.resourceStepsSent[1].type, "staff_bot");
  const staffBotNotification = state.notifications.find(
    (item) => item.candidateId === candidate.id && item.type === "resource_staff_bot"
  );
  assert.equal(staffBotNotification.title, "📅 2/5 — Запись на смены");
  assert.match(staffBotNotification.message, /@LoftHallStaffBot/);

  ({ state } = applyInterviewCommand(
    state,
    { action: "send_resource_step", payload: { slotId: "slot-002" } },
    { now: "2026-08-13T12:36:00.000Z" }
  ));

  const withThirdResource = state.candidates.find((item) => item.id === candidate.id);
  assert.equal(withThirdResource.resourceStepsSent.length, 3);
  assert.equal(withThirdResource.resourceStepsSent[2].type, "unattested_group");
  const unattestedNotification = state.notifications.find(
    (item) => item.candidateId === candidate.id && item.type === "resource_unattested_group"
  );
  assert.equal(unattestedNotification.title, "👥 3/5 — Группа «Неаттестованные»");
  assert.match(unattestedNotification.message, /не прошли аттестацию/);

  ({ state } = applyInterviewCommand(
    state,
    { action: "send_resource_step", payload: { slotId: "slot-002" } },
    { now: "2026-08-13T12:37:00.000Z" }
  ));

  const withFourthResource = state.candidates.find((item) => item.id === candidate.id);
  assert.equal(withFourthResource.resourceStepsSent.length, 4);
  assert.equal(withFourthResource.resourceStepsSent[3].type, "helper_bot");
  const helperBotNotification = state.notifications.find(
    (item) => item.candidateId === candidate.id && item.type === "resource_helper_bot"
  );
  assert.equal(helperBotNotification.title, "📚 4/5 — LOFT HALL HELPER BOT");
  assert.match(helperBotNotification.message, /@LOFT_HELPER_V2_BOT/);

  ({ state } = applyInterviewCommand(
    state,
    { action: "send_resource_step", payload: { slotId: "slot-002" } },
    { now: "2026-08-13T12:38:00.000Z" }
  ));

  const withFifthResource = state.candidates.find((item) => item.id === candidate.id);
  assert.equal(withFifthResource.resourceStepsSent.length, 5);
  assert.equal(withFifthResource.resourceStepsSent[4].type, "self_employment");
  const selfEmploymentNotification = state.notifications.find(
    (item) => item.candidateId === candidate.id && item.type === "resource_self_employment"
  );
  assert.equal(selfEmploymentNotification.title, "💳 5/5 — Самозанятость и выплаты");
  assert.match(
    selfEmploymentNotification.message,
    /самозанятость/
  );
  assert.deepEqual(selfEmploymentNotification.actions, [
    {
      label: "💳 Самозанятость и выплаты",
      callbackData: "",
      url: "https://ravshik.github.io/sz/"
    }
  ]);

  ({ state } = applyInterviewCommand(
    state,
    { action: "record_link_click", payload: { candidateId: candidate.id, linkType: "registration_bot" } },
    { now: "2026-08-13T12:39:00.000Z" }
  ));
  assert.equal(state.candidates.find((item) => item.id === candidate.id).linkClicks.length, 1);
});

test("completing a slot accepts arrived candidates without refusal and preserves sent resources", () => {
  let state = createSeedState("2026-08-10T09:00:00.000Z");

  const completed = applyInterviewCommand(
    state,
    { action: "complete_slot", payload: { slotId: "slot-001" } },
    { now: "2026-08-13T14:00:00.000Z" }
  );
  state = completed.state;

  assert.equal(completed.result.acceptedCount, 1);
  const accepted = state.candidates.find((item) => item.id === "cand-002");
  assert.equal(accepted.interviewResult, "fit");
  assert.equal(accepted.status, "registration_pending");
  assert.equal(accepted.registrationStatus, "materials_sent");
  assert.equal(accepted.candidateLayerStatus, "resources_sent");
  assert.equal(accepted.resourceStepsSent.length, 1);
  assert.equal(
    state.notifications.some((item) => item.candidateId === accepted.id && item.type === "registration_instructions"),
    false
  );
  assert.equal(state.candidates.find((item) => item.id === "cand-001").interviewResult, "pending");
  assert.equal(state.candidates.find((item) => item.id === "cand-004").interviewResult, "pending");
});

test("recruiter can mark candidate left after interview and complete slot", () => {
  let state = createSeedState("2026-08-10T09:00:00.000Z");

  const candidate = state.candidates.find((item) => item.id === "cand-002");
  assert.equal(candidate.attendanceStatus, "arrived");

  ({ state } = applyInterviewCommand(
    state,
    { action: "mark_left_after_interview", payload: { candidateId: candidate.id } },
    { now: "2026-08-13T13:10:00.000Z" }
  ));
  const left = state.candidates.find((item) => item.id === candidate.id);
  assert.equal(left.status, "left_after_interview");
  assert.equal(left.candidateLayerStatus, "left_after_interview");
  const cooperationNotification = state.notifications.find(
    (item) => item.candidateId === candidate.id && item.type === "cooperation_not_started"
  );
  assert.ok(cooperationNotification);
  assert.match(cooperationNotification.message, /Спасибо, что пришли/);

  let completed;
  ({ state, result: completed } = applyInterviewCommand(
    state,
    { action: "complete_slot", payload: { slotId: "slot-001" } },
    { now: "2026-08-13T14:00:00.000Z" }
  ));

  assert.equal(completed.acceptedCount, 0);

  const slot = state.slots.find((item) => item.id === "slot-001");
  assert.equal(slot.status, "completed");
  assert.ok(slot.completedAt);
});

test("recruiter can clear archive and all interview data", () => {
  let state = createSeedState("2026-08-10T09:00:00.000Z");

  ({ state } = applyInterviewCommand(
    state,
    { action: "complete_slot", payload: { slotId: "slot-001" } },
    { now: "2026-08-13T14:00:00.000Z" }
  ));

  ({ state } = applyInterviewCommand(
    state,
    { action: "clear_archive", payload: {} },
    { now: "2026-08-13T14:05:00.000Z" }
  ));

  assert.equal(state.slots.some((slot) => slot.id === "slot-001"), false);
  assert.equal(state.slots.some((slot) => slot.id === "slot-002"), true);
  assert.equal(state.candidates.some((candidate) => candidate.interviewSlotId === "slot-001"), false);
  assert.deepEqual(state.settings.developerTelegramIds, RECRUITER_TELEGRAM_IDS);

  ({ state } = applyInterviewCommand(
    state,
    { action: "clear_recruiter_data", payload: {} },
    { now: "2026-08-13T14:10:00.000Z" }
  ));

  assert.equal(state.slots.length, 0);
  assert.equal(state.candidates.length, 0);
  assert.equal(state.notifications.length, 0);
  assert.equal(state.events.length, 0);
  assert.deepEqual(state.settings.interviewVenues.map((venue) => venue.id), ["loft23"]);
});
