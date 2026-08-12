import assert from "node:assert/strict";
import { test } from "node:test";
import { applyInterviewCommand, createSeedState } from "../src/interview-state.js";

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
        venueId: "loft3",
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
  assert.equal(slot.venue, "LOFT#3");
  assert.equal(slot.venueAddress, "ул. Ленинская Слобода, 26с15");
  assert.equal(slot.bookingText, "Вход со стороны главной проходной.");
  assert.equal(slot.directionsVideoUrl, "https://example.com/loft3-route");

  const waitlistCandidate = state.candidates.find((candidate) => candidate.id === "cand-003");
  assert.equal(waitlistCandidate.waitlistTargetSlotId, result.result.slotId);
  assert.ok(waitlistCandidate.lastWaitlistNotifiedAt);

  const notification = state.notifications.find(
    (item) => item.candidateId === "cand-003" && item.type === "waitlist_new_slot"
  );
  assert.equal(notification.slotId, result.result.slotId);
});

test("candidate can confirm, miss interview, and return to waitlist", () => {
  let state = createSeedState("2026-08-10T09:00:00.000Z");
  assert.equal(
    state.settings.directionMaterials.find((item) => item.id === "loft_23_route").telegramFileId,
    "BQACAgIAAxkBAAEN-k5qfIMhAAEX8Gze0K4MJb99RKa6PfwAAmyjAAIyAeBLJj6vMEwvGvU9BA"
  );
  assert.equal(
    state.settings.directionMaterials.find((item) => item.id === "loft_4_route").telegramFileId,
    "BQACAgIAAxkBAAEN-k5qfIMhAAEX8Gze0K4MJb99RKa6PfwAAmyjAAIyAeBLJj6vMEwvGvU9BA"
  );
  assert.equal(state.settings.directionMaterials.find((item) => item.id === "loft_23_route").telegramMethod, "video");
  assert.equal(state.settings.directionMaterials.find((item) => item.id === "loft_4_route").telegramMethod, "video");

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
  assert.match(bookingMaterials.message, /2-й Кожуховский проезд/);
  assert.match(bookingMaterials.message, /видео/);
  assert.equal(bookingMaterials.media.length, 1);
  assert.equal(bookingMaterials.media[0].type, "video");
  assert.equal(bookingMaterials.media[0].fileId, "BQACAgIAAxkBAAEN-k5qfIMhAAEX8Gze0K4MJb99RKa6PfwAAmyjAAIyAeBLJj6vMEwvGvU9BA");

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
  assert.match(noShowFollowup.message, /неявку/);

  ({ state } = applyInterviewCommand(
    state,
    { action: "record_loss_reason", payload: { candidateId: candidate.id, reason: "date_time" } },
    { now: "2026-08-13T12:10:00.000Z" }
  ));
  assert.equal(state.candidates.find((item) => item.id === candidate.id).lossReason, "date_time");

  ({ state } = applyInterviewCommand(
    state,
    { action: "rebook_interest", payload: { candidateId: candidate.id, intent: "waitlist" } },
    { now: "2026-08-13T12:12:00.000Z" }
  ));
  assert.equal(state.candidates.find((item) => item.id === candidate.id).status, "waitlist");
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

test("arrived candidate receives resources without interview result buttons", () => {
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
    { now: "2026-08-13T12:30:00.000Z" }
  ));

  const withResources = state.candidates.find((item) => item.id === candidate.id);
  assert.equal(withResources.status, "attended");
  assert.equal(withResources.registrationStatus, "materials_sent");
  assert.ok(withResources.resourcesSentAt);
  assert.equal(withResources.resourceStepsSent.length, 1);
  assert.equal(withResources.resourceStepsSent[0].type, "registration_bot");
  assert.ok(
    state.notifications.some((item) => item.candidateId === candidate.id && item.type === "resource_registration_bot")
  );

  ({ state } = applyInterviewCommand(
    state,
    { action: "send_resource_step", payload: { slotId: "slot-002" } },
    { now: "2026-08-13T12:35:00.000Z" }
  ));

  const withSecondResource = state.candidates.find((item) => item.id === candidate.id);
  assert.equal(withSecondResource.resourceStepsSent.length, 2);
  assert.equal(withSecondResource.resourceStepsSent[1].type, "unattested_group");

  ({ state } = applyInterviewCommand(
    state,
    { action: "send_resource_step", payload: { slotId: "slot-002" } },
    { now: "2026-08-13T12:36:00.000Z" }
  ));

  const withThirdResource = state.candidates.find((item) => item.id === candidate.id);
  assert.equal(withThirdResource.resourceStepsSent.length, 3);
  assert.equal(withThirdResource.resourceStepsSent[2].type, "self_employment");

  ({ state } = applyInterviewCommand(
    state,
    { action: "record_link_click", payload: { candidateId: candidate.id, linkType: "registration_bot" } },
    { now: "2026-08-13T12:37:00.000Z" }
  ));
  assert.equal(state.candidates.find((item) => item.id === candidate.id).linkClicks.length, 1);
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
  assert.match(cooperationNotification.message, /не продолжили сотрудничество/);

  ({ state } = applyInterviewCommand(
    state,
    { action: "complete_slot", payload: { slotId: "slot-001" } },
    { now: "2026-08-13T14:00:00.000Z" }
  ));

  const slot = state.slots.find((item) => item.id === "slot-001");
  assert.equal(slot.status, "completed");
  assert.ok(slot.completedAt);
});
