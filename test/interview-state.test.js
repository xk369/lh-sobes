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

  ({ state } = applyInterviewCommand(
    state,
    { action: "request_confirmation", payload: { candidateId: candidate.id } },
    { now: "2026-08-11T10:00:00.000Z" }
  ));
  assert.equal(state.candidates.find((item) => item.id === candidate.id).confirmationStatus, "pending");

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
  assert.ok(state.notifications.some((item) => item.candidateId === candidate.id && item.type === "no_show_followup"));

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

  ({ state } = applyInterviewCommand(
    state,
    { action: "complete_slot", payload: { slotId: "slot-001" } },
    { now: "2026-08-13T14:00:00.000Z" }
  ));

  const slot = state.slots.find((item) => item.id === "slot-001");
  assert.equal(slot.status, "completed");
  assert.ok(slot.completedAt);
});
