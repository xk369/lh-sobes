const ACTIVE_INTERVIEW_RESULTS = new Set(["fit", "not_fit", "self_declined", "russian_low", "other"]);
const LOSS_REASONS = new Set(["date_time", "location", "circumstances", "conditions", "other_offer", "other"]);
const LEGACY_ROUTE_FILE_ID = "BQACAgIAAxkBAAEN-k5qfIMhAAEX8Gze0K4MJb99RKa6PfwAAmyjAAIyAeBLJj6vMEwvGvU9BA";
const LOFT_23_ROUTE_FILE_ID = "BAACAgIAAxkBAAEN-nBqfJNGc4zIAlyz1Vtm5coWB8LiigACWKQAAjIB4EsUwGqbL0OWxT0E";
const LEGACY_BOOKING_TEXT = "Вы записаны на собеседование. Сохраните адрес и приходите за 10 минут до начала.";
const LEGACY_LONG_BOOKING_MARKER = "РАБОТАЙТЕ В ОДНОМ ИЗ ЛУЧШИХ EVENT-ПРОЕКТОВ ДВУХ СТОЛИЦ!";
const LEGACY_BOOKING_PREFIXES = [
  "Вы записаны на собеседование:",
  "Ждем вас на собеседовании:"
];
const LEGACY_LOFT3_ADDRESS = "ул. Ленинская Слобода, 26с15";
const DEVELOPER_TELEGRAM_IDS = [
  "1294774551",
  "6774493976",
  "1711587497",
  "5950662713",
  "829555528",
  "1223141252",
  "342064797",
  "985283520",
  "5067088817", //Alim
];
const LOFT_23_MAP_URL = "https://yandex.ru/maps/-/CTsmF-9~";
const RECRUITING_CONTACT = "@LOFT_RECRUITING_MSK";
const SELF_EMPLOYMENT_BUTTON_URL =
  clean(globalThis.process?.env?.SELF_EMPLOYMENT_BUTTON_URL) ||
  "https://ravshik.github.io/sz/";
const STAFF_BOT_MESSAGE = `Для записи на доступные смены используйте бот:

@LoftHallStaffBot`;
const UNATTESTED_GROUP_MESSAGE = `Здесь публикуется важная информация для сотрудников, которые ещё не прошли аттестацию:

https://t.me/+tpUuI31XJyA2ZWFi

Обязательно вступите в группу и следите за сообщениями.`;
const HELPER_BOT_MESSAGE = `База знаний и Академия LOFT HALL: обучение, правила работы, материалы и тесты.

@LOFT_HELPER_V2_BOT`;
const SELF_EMPLOYMENT_MESSAGE = `Для получения выплат необходимо оформить самозанятость.

В LOFT HALL HELPER BOT есть актуальная инструкция по оформлению, выплатам и работе с самозанятостью.

Нажмите кнопку ниже, чтобы ознакомиться с инструкцией 👇`;
const SLOT_HOLDING_STATUSES = new Set([
  "booked",
  "confirmation_pending",
  "confirmed",
  "attended",
  "left_after_interview",
  "registration_pending",
  "registered",
  "ready_for_internship"
]);

export const resultLabels = {
  pending: "Итог не выставлен",
  fit: "Подходит",
  not_fit: "Не подходит",
  self_declined: "Сам отказался",
  russian_low: "Недостаточно русского",
  other: "Другая причина"
};

export const lossReasonLabels = {
  date_time: "Не подошла дата или время",
  location: "Неудобное расположение",
  circumstances: "Изменились обстоятельства",
  conditions: "Не устроили условия работы",
  other_offer: "Выбрал другое предложение",
  other: "Другое"
};

export function createSeedState(now = "2026-08-10T09:00:00.000Z") {
  return deriveState({
    schemaVersion: 3,
    version: 1,
    updatedAt: now,
    settings: defaultSettings(),
    slots: [
      {
        id: "slot-001",
        title: "Собеседование LOFT HALL",
        date: "2026-08-13",
        time: "12:00",
        venueId: "loft23",
        venue: "LOFT#2/3",
        venueAddress: "ул. Ленинская Слобода, 26с11",
        seats: 12,
        status: "open",
        bookingText: "Вы записаны на собеседование. Сохраните адрес и приходите за 10 минут до начала.",
        directionsVideoUrl: "",
        createdAt: now
      },
      {
        id: "slot-002",
        title: "Собеседование LOFT HALL",
        date: "2026-08-16",
        time: "15:30",
        venueId: "loft23",
        venue: "LOFT#2/3",
        venueAddress: "ул. Ленинская Слобода, 26с11",
        seats: 10,
        status: "open",
        bookingText: "Вы записаны на собеседование. Сохраните адрес и приходите за 10 минут до начала.",
        directionsVideoUrl: "",
        createdAt: now
      }
    ],
    candidates: [
      createCandidate(
        {
          id: "cand-001",
          telegramId: "100100100",
          telegram: "@m_aliyev",
          name: "Мухаммад Алиев",
          phone: "+7 900 100-10-10",
          source: "Telegram",
          availability: "Ближайшая дата",
          note: "Готов выйти на ближайший поток",
          status: "confirmed",
          candidateLayerStatus: "interview_confirmed",
          interviewSlotId: "slot-001",
          confirmationStatus: "confirmed",
          attendanceStatus: "unknown"
        },
        now
      ),
      createCandidate(
        {
          id: "cand-002",
          telegramId: "200200200",
          telegram: "@d_nechaeva",
          name: "Дарья Нечаева",
          phone: "+7 900 200-20-20",
          source: "HH",
          note: "После собеса проверить регистрацию руками",
          status: "attended",
          candidateLayerStatus: "resources_sent",
          interviewSlotId: "slot-001",
          confirmationStatus: "confirmed",
          attendanceStatus: "arrived",
          interviewResult: "pending",
          registrationStatus: "materials_sent",
          materialsSentAt: now,
          resourcesSentAt: now,
          resourceStepsSent: [{ type: "registration_bot", sentAt: now }],
          internshipStage: "candidate_resources_sent"
        },
        now
      ),
      createCandidate(
        {
          id: "cand-003",
          telegramId: "300300300",
          telegram: "@otabek_k",
          name: "Отабек Каримов",
          phone: "+7 900 300-30-30",
          source: "Рекомендация",
          note: "Ждет новую дату",
          status: "waitlist",
          candidateLayerStatus: "waiting_for_interview_date"
        },
        now
      ),
      createCandidate(
        {
          id: "cand-004",
          telegramId: "400400400",
          telegram: "@ivan_late",
          name: "Иван Ларионов",
          phone: "+7 900 400-40-40",
          source: "Авито",
          status: "no_show",
          candidateLayerStatus: "interview_no_show",
          interviewSlotId: "slot-001",
          confirmationStatus: "confirmed",
          attendanceStatus: "no_show"
        },
        now
      )
    ],
    notifications: [
      {
        id: "notif-001",
        candidateId: "cand-002",
        type: "resource_registration_bot",
        title: "",
        message: "Отправлена первая ссылка для регистрации в основной базе.",
        status: "sent",
        channel: "telegram_mock",
        createdAt: now,
        sentAt: now
      }
    ],
    events: [
      {
        id: "event-001",
        type: "seed_created",
        actor: "system",
        createdAt: now,
        details: "Начальное состояние MVP"
      }
    ]
  });
}

export function deriveState(input) {
  const state = clone(input || {});
  state.schemaVersion = Math.max(Number(state.schemaVersion || 0), 3);
  state.version = Number(state.version || 1);
  state.settings = normalizeSettings(state.settings);
  state.slots = Array.isArray(state.slots) ? state.slots : [];
  state.candidates = Array.isArray(state.candidates) ? state.candidates.map(normalizeCandidate) : [];
  state.notifications = Array.isArray(state.notifications) ? state.notifications.map(normalizeNotificationRecord) : [];
  state.events = Array.isArray(state.events) ? state.events : [];

  state.slots = state.slots.map((slot) => deriveSlot(slot, state.candidates, state.settings));
  state.stats = deriveStats(state);
  state.reasonStats = countBy(Object.keys(resultLabels), state.candidates, "interviewResult");
  state.lossReasonStats = countBy(Object.keys(lossReasonLabels), state.candidates, "lossReason");

  return state;
}

export function applyInterviewCommand(input, command, options = {}) {
  if (!command || typeof command.action !== "string") {
    throw new Error("Command action is required");
  }

  const state = deriveState(input);
  const payload = command.payload || {};
  const now = options.now || new Date().toISOString();
  const actor = payload.actor || command.actor || "recruiter";
  let result = {};

  switch (command.action) {
    case "upsert_candidate": {
      const candidate = upsertCandidate(state, payload, now);
      appendEvent(state, "candidate_profile_saved", actor, now, { candidateId: candidate.id });
      result = { candidateId: candidate.id };
      break;
    }

    case "book_slot": {
      const slot = requireSlot(state, payload.slotId);
      if (slot.status !== "open") throw new Error("Slot is not open");
      const candidate = upsertCandidate(state, payload.candidate || payload, now);
      if (availableSeatsForBooking(state, slot.id, candidate.id) < 1) throw new Error("No seats left for this slot");
      applyBooking(candidate, slot.id, now);
      appendNotification(state, candidate.id, "booking_created", now, {
        title: bookingCreatedTitle(),
        message: bookingCreatedMessage(slot),
        slotId: slot.id
      });
      appendBookingMaterials(state, candidate, slot, now);
      appendEvent(state, "candidate_booked_slot", actor, now, { candidateId: candidate.id, slotId: slot.id });
      result = { candidateId: candidate.id, slotId: slot.id };
      break;
    }

    case "join_waitlist": {
      const candidate = upsertCandidate(state, payload.candidate || payload, now);
      if (candidateHasActiveBooking(candidate)) {
        throw new Error("Сначала отмените текущую запись на собеседование");
      }
      rememberInterviewHistory(state, candidate, now, "joined_waitlist");
      candidate.status = "waitlist";
      candidate.candidateLayerStatus = "waiting_for_interview_date";
      candidate.interviewSlotId = null;
      candidate.waitlistJoinedAt = now;
      candidate.waitlistTargetSlotId = null;
      candidate.lastWaitlistNotifiedAt = null;
      candidate.confirmationStatus = "not_requested";
      candidate.attendanceStatus = "unknown";
      candidate.interviewResult = "pending";
      candidate.registrationStatus = "not_started";
      candidate.internshipStage = "candidate_layer";
      touch(candidate, now);
      appendNotification(state, candidate.id, "waitlist_joined", now, {
        title: waitlistJoinedTitle(),
        message: waitlistJoinedMessage()
      });
      appendEvent(state, "candidate_joined_waitlist", "candidate", now, { candidateId: candidate.id });
      result = { candidateId: candidate.id };
      break;
    }

    case "create_slot": {
      const venue = resolveInterviewVenue(state.settings, payload);
      const templateCleared = payload.templateCleared === true || payload.templateCleared === "true";
      const date = requireText(payload.date, "Slot date is required");
      const time = requireText(payload.time, "Slot time is required");
      const duplicate = findActiveSlotByDateTime(state, date, time);
      if (duplicate && duplicate.id !== payload.id) {
        throw new Error("На эту дату и время уже создано активное собеседование");
      }
      const slot = {
        id: payload.id || nextId("slot", state.slots),
        title: "Собеседование LOFT HALL",
        date,
        time,
        venueId: venue.id,
        venue: venue.name,
        venueAddress: venue.address,
        seats: Math.max(Number(payload.seats || 1), 1),
        status: payload.status === "closed" ? "closed" : "open",
        templateCleared,
        bookingText: templateCleared ? "" : clean(payload.bookingText || payload.confirmationText) || defaultBookingText(venue),
        directionsVideoUrl: templateCleared ? "" : clean(payload.directionsVideoUrl || payload.confirmationVideoUrl),
        createdAt: now
      };
      state.slots.push(slot);
      const notifiedCount = notifyWaitlist(state, slot.id, now);
      appendEvent(state, "slot_created", actor, now, { slotId: slot.id, notifiedCount });
      result = { slotId: slot.id, notifiedCount };
      break;
    }

    case "notify_waitlist": {
      const notifiedCount = notifyWaitlist(state, payload.slotId, now);
      appendEvent(state, "waitlist_notified", actor, now, {
        slotId: payload.slotId || null,
        notifiedCount
      });
      result = { notifiedCount };
      break;
    }

    case "waitlist_slot_response": {
      const candidate = requireCandidate(state, payload.candidateId);
      const slot = requireSlot(state, payload.slotId);
      const intent = payload.intent === "book" ? "book" : "stay";
      let alreadyHandled = false;

      if (intent === "book") {
        const alreadyBooked = candidate.interviewSlotId === slot.id && SLOT_HOLDING_STATUSES.has(candidate.status);
        if (!alreadyBooked) {
          if (candidate.status !== "waitlist" || candidate.waitlistTargetSlotId !== slot.id) {
            alreadyHandled = true;
          } else {
            if (slot.status !== "open") throw new Error("Slot is not open");
            if (availableSeatsForBooking(state, slot.id, candidate.id) < 1) throw new Error("No seats left for this slot");
            rememberInterviewHistory(state, candidate, now, "waitlist_booking");
            applyBooking(candidate, slot.id, now);
            appendNotification(state, candidate.id, "booking_created", now, {
              title: bookingCreatedTitle(),
              message: bookingCreatedMessage(slot),
              slotId: slot.id
            });
            appendBookingMaterials(state, candidate, slot, now);
          }
        }
      } else if (candidate.status === "waitlist") {
        candidate.status = "waitlist";
        candidate.candidateLayerStatus = "waiting_for_interview_date";
        candidate.waitlistTargetSlotId = slot.id;
        candidate.lastWaitlistNotifiedAt = candidate.lastWaitlistNotifiedAt || now;
      } else {
        alreadyHandled = true;
      }

      clearLatestNotificationActions(state, candidate.id, "waitlist_new_slot", slot.id, now);
      touch(candidate, now);
      appendEvent(state, "candidate_waitlist_slot_response", "candidate", now, {
        candidateId: candidate.id,
        slotId: slot.id,
        intent,
        alreadyHandled
      });
      result = { candidateId: candidate.id, slotId: slot.id, intent, alreadyHandled };
      break;
    }

    case "request_confirmation":
    case "send_due_confirmations": {
      const targets = getCandidateTargets(state, payload).filter((candidate) =>
        ["booked", "confirmation_pending"].includes(candidate.status) &&
        !["confirmed", "declined"].includes(candidate.confirmationStatus) &&
        !candidate.confirmationRequestedAt
      );
      for (const candidate of targets) {
        candidate.status = "confirmation_pending";
        candidate.candidateLayerStatus = "interview_confirmation_pending";
        candidate.confirmationStatus = "pending";
        candidate.confirmationRequestedAt = now;
        touch(candidate, now);
        const slot = candidate.interviewSlotId ? requireSlot(state, candidate.interviewSlotId) : null;
        appendNotification(state, candidate.id, "confirmation_request", now, {
          title: confirmationRequestTitle(),
          message: slot ? confirmationRequestMessage(slot) : "Подтвердите участие в собеседовании.",
          slotId: candidate.interviewSlotId,
          actions: [
            confirmationAction(candidate.id, "yes"),
            confirmationAction(candidate.id, "no")
          ]
        });
      }
      appendEvent(state, "confirmation_requested", actor, now, {
        slotId: payload.slotId || null,
        candidateId: payload.candidateId || null,
        dueDate: payload.dueDate || null,
        requestedCount: targets.length
      });
      result = { requestedCount: targets.length };
      break;
    }

    case "candidate_confirm": {
      const candidate = requireCandidate(state, payload.candidateId);
      if (["confirmed", "declined"].includes(candidate.confirmationStatus)) {
        clearLatestNotificationActions(state, candidate.id, "confirmation_request", candidate.interviewSlotId, now);
        appendEvent(state, "candidate_confirmation_answer_ignored", actor, now, {
          candidateId: candidate.id,
          decision: payload.decision,
          savedDecision: candidate.confirmationStatus === "confirmed" ? "yes" : "no"
        });
        result = {
          candidateId: candidate.id,
          decision: candidate.confirmationStatus === "confirmed" ? "yes" : "no",
          alreadyAnswered: true
        };
        break;
      }
      const wasDeclined =
        candidate.status === "declined_before_interview" || candidate.confirmationStatus === "declined";
      if (payload.decision === "yes") {
        candidate.status = "confirmed";
        candidate.candidateLayerStatus = "interview_confirmed";
        candidate.confirmationStatus = "confirmed";
        candidate.confirmedAt = now;
      } else {
        rememberInterviewHistory(state, candidate, now, "declined_confirmation");
        candidate.status = "declined_before_interview";
        candidate.candidateLayerStatus = "interview_declined_before";
        candidate.confirmationStatus = "declined";
        candidate.attendanceStatus = "declined_before";
        candidate.declinedAt = now;
        if (!wasDeclined) {
          appendNotification(state, candidate.id, "interview_declined_saved", now, {
            title: bookingCancelledTitle(),
            message: bookingCancelledMessage(),
            slotId: candidate.interviewSlotId
          });
        }
      }
      clearLatestNotificationActions(state, candidate.id, "confirmation_request", candidate.interviewSlotId, now);
      touch(candidate, now);
      appendEvent(state, "candidate_confirmation_answered", actor, now, {
        candidateId: candidate.id,
        decision: payload.decision
      });
      result = { candidateId: candidate.id, decision: payload.decision };
      break;
    }

    case "cancel_booking": {
      const candidate = requireCandidate(state, payload.candidateId);
      if (!candidateHasActiveBooking(candidate)) {
        result = { candidateId: candidate.id, alreadyHandled: true };
        break;
      }
      const previousSlotId = candidate.interviewSlotId;
      rememberInterviewHistory(state, candidate, now, "cancelled_booking");
      candidate.status = "declined_before_interview";
      candidate.candidateLayerStatus = "interview_declined_before";
      candidate.confirmationStatus = "declined";
      candidate.attendanceStatus = "declined_before";
      candidate.declinedAt = now;
      clearLatestNotificationActions(state, candidate.id, "confirmation_request", candidate.interviewSlotId, now);
      touch(candidate, now);
      appendNotification(state, candidate.id, "interview_declined_saved", now, {
        title: bookingCancelledTitle(),
        message: bookingCancelledMessage(),
        slotId: previousSlotId
      });
      appendEvent(state, "candidate_booking_cancelled", "candidate", now, {
        candidateId: candidate.id,
        slotId: previousSlotId
      });
      result = { candidateId: candidate.id };
      break;
    }

    case "mark_attendance": {
      const candidate = requireCandidate(state, payload.candidateId);
      const attendance = normalizeAttendance(payload.attendance);
      candidate.attendanceStatus = attendance;
      candidate.attendanceMarkedAt = now;

      if (attendance === "arrived") {
        candidate.status = "attended";
        candidate.candidateLayerStatus = "interview_attended";
      } else if (attendance === "declined_before") {
        rememberInterviewHistory(state, candidate, now, "declined_before_interview");
        candidate.status = "declined_before_interview";
        candidate.candidateLayerStatus = "interview_declined_before";
        candidate.confirmationStatus = "declined";
        appendNotification(state, candidate.id, "interview_declined_saved", now, {
          title: bookingCancelledTitle(),
          message: bookingCancelledMessage(),
          slotId: candidate.interviewSlotId
        });
      } else if (attendance === "no_confirmation") {
        candidate.status = "no_confirmation";
        candidate.candidateLayerStatus = "interview_no_confirmation";
        candidate.confirmationStatus = "no_response";
      } else {
        rememberInterviewHistory(state, candidate, now, "no_show");
        candidate.status = "no_show";
        candidate.candidateLayerStatus = "interview_no_show";
        appendNotification(state, candidate.id, "no_show_followup", now, {
          title: noShowTitle(),
          message: noShowMessage(),
          slotId: candidate.interviewSlotId
        });
      }

      touch(candidate, now);
      appendEvent(state, "attendance_marked", actor, now, { candidateId: candidate.id, attendance });
      result = { candidateId: candidate.id, attendance };
      break;
    }

    case "set_result": {
      const candidate = requireCandidate(state, payload.candidateId);
      if (candidate.attendanceStatus !== "arrived") {
        throw new Error("Result can be set only for arrived candidates");
      }

      const interviewResult = ACTIVE_INTERVIEW_RESULTS.has(payload.result) ? payload.result : "other";
      if (interviewResult === "fit") {
        markCandidatePassed(state, candidate, actor, now, { reason: payload.reason, notify: true });
      } else {
        candidate.interviewResult = interviewResult;
        candidate.resultReason = clean(payload.reason);
        candidate.resultMarkedAt = now;
        candidate.status = "rejected";
        candidate.candidateLayerStatus = "interview_rejected";
        candidate.registrationStatus = "not_started";
        candidate.internshipStage = "not_ready";
        if (interviewResult === "self_declined") {
          appendNotification(state, candidate.id, "cooperation_not_started", now, {
            title: cooperationStoppedTitle(),
            message: cooperationStoppedMessage(),
            slotId: candidate.interviewSlotId
          });
        }
        touch(candidate, now);
        appendEvent(state, "interview_result_set", actor, now, { candidateId: candidate.id, result: interviewResult });
      }
      result = { candidateId: candidate.id, result: interviewResult };
      break;
    }

    case "send_registration_materials": {
      const targets = payload.candidateId ? [requireCandidate(state, payload.candidateId)] : registrationTargets(state, payload.slotId);
      for (const candidate of targets) {
        candidate.registrationStatus = candidate.registrationStatus === "registered" ? "registered" : "materials_sent";
        candidate.materialsSentAt = now;
        candidate.internshipStage =
          candidate.registrationStatus === "registered" ? "ready_for_internship" : "candidate_ready_for_registration";
        touch(candidate, now);
        appendNotification(state, candidate.id, "registration_materials", now, {
          title: "",
          message: getResourceSteps(state).map(resourceStepMessage).join("\n\n---\n\n"),
          slotId: candidate.interviewSlotId
        });
      }
      appendEvent(state, "registration_materials_sent", actor, now, {
        slotId: payload.slotId || null,
        candidateId: payload.candidateId || null,
        sentCount: targets.length
      });
      result = { sentCount: targets.length };
      break;
    }

    case "send_resource_step":
    case "send_resources": {
      const targets = payload.candidateId ? [requireCandidate(state, payload.candidateId)] : resourceTargets(state, payload.slotId);
      const resourceStep = selectResourceStep(state, payload.resourceType, targets);
      if (!resourceStep) {
        result = { sentCount: 0, completed: true };
        break;
      }

      let sentCount = 0;
      for (const candidate of targets) {
        if (candidate.attendanceStatus !== "arrived" || candidate.status === "left_after_interview") continue;
        candidate.resourceStepsSent = Array.isArray(candidate.resourceStepsSent) ? candidate.resourceStepsSent : [];
        if (hasResourceStep(candidate, resourceStep.type)) continue;
        candidate.resourceStepsSent.push({ type: resourceStep.type, sentAt: now });
        sentCount += 1;
        candidate.registrationStatus = "materials_sent";
        candidate.materialsSentAt = now;
        candidate.resourcesSentAt = candidate.resourcesSentAt || now;
        candidate.candidateLayerStatus = "resources_sent";
        candidate.internshipStage = "candidate_resources_sent";
        touch(candidate, now);
        appendNotification(state, candidate.id, `resource_${resourceStep.type}`, now, {
          title: resourceStep.label,
          message: resourceStepMessage(resourceStep),
          slotId: candidate.interviewSlotId,
          actions: resourceStepActions(resourceStep)
        });
      }
      appendEvent(state, "resource_step_sent", actor, now, {
        slotId: payload.slotId || null,
        candidateId: payload.candidateId || null,
        resourceType: resourceStep.type,
        resourceLabel: resourceStep.label,
        sentCount
      });
      result = { resourceType: resourceStep.type, resourceLabel: resourceStep.label, sentCount };
      break;
    }

    case "mark_left_after_interview": {
      const candidate = requireCandidate(state, payload.candidateId);
      candidate.attendanceStatus = "arrived";
      candidate.status = "left_after_interview";
      candidate.candidateLayerStatus = "left_after_interview";
      candidate.leftAfterInterviewAt = now;
      candidate.internshipStage = "not_ready";
      touch(candidate, now);
      appendNotification(state, candidate.id, "cooperation_not_started", now, {
        title: cooperationStoppedTitle(),
        message: cooperationStoppedMessage(),
        slotId: candidate.interviewSlotId
      });
      appendEvent(state, "candidate_left_after_interview", actor, now, {
        candidateId: candidate.id
      });
      result = { candidateId: candidate.id };
      break;
    }

    case "complete_slot": {
      const slot = requireSlot(state, payload.slotId);
      const acceptedCandidates = state.candidates.filter(
        (candidate) =>
          candidate.interviewSlotId === slot.id &&
          candidate.attendanceStatus === "arrived" &&
          candidate.status !== "left_after_interview"
      );
      for (const candidate of acceptedCandidates) {
        if (candidate.interviewResult !== "fit") {
          markCandidatePassed(state, candidate, actor, now, { notify: false });
        }
      }
      slot.status = "completed";
      slot.completedAt = now;
      appendEvent(state, "slot_completed", actor, now, { slotId: slot.id });
      result = { slotId: slot.id, acceptedCount: acceptedCandidates.length };
      break;
    }

    case "mark_registration": {
      const candidate = requireCandidate(state, payload.candidateId);
      const registered = payload.registrationStatus !== "pending";
      candidate.registrationStatus = registered ? "registered" : "pending";
      candidate.status = registered ? "ready_for_internship" : "registration_pending";
      candidate.candidateLayerStatus = registered ? "ready_for_internship" : "interview_passed";
      candidate.internshipStage = registered ? "ready_for_internship" : "candidate_ready_for_registration";
      candidate.registrationConfirmedAt = registered ? now : null;
      touch(candidate, now);
      appendEvent(state, "registration_marked", actor, now, {
        candidateId: candidate.id,
        registrationStatus: candidate.registrationStatus
      });
      result = { candidateId: candidate.id, registrationStatus: candidate.registrationStatus };
      break;
    }

    case "mark_all_registered": {
      const targets = registrationTargets(state, payload.slotId).filter(
        (candidate) => candidate.registrationStatus !== "registered"
      );
      for (const candidate of targets) {
        candidate.registrationStatus = "registered";
        candidate.status = "ready_for_internship";
        candidate.candidateLayerStatus = "ready_for_internship";
        candidate.internshipStage = "ready_for_internship";
        candidate.registrationConfirmedAt = now;
        touch(candidate, now);
      }
      appendEvent(state, "slot_registered_all", actor, now, {
        slotId: payload.slotId || null,
        registeredCount: targets.length
      });
      result = { registeredCount: targets.length };
      break;
    }

    case "rebook_interest": {
      const candidate = requireCandidate(state, payload.candidateId);
      if (payload.intent === "not_interested") {
        const previousSlotId = candidate.interviewSlotId;
        candidate.status = "not_interested";
        candidate.candidateLayerStatus = "closed_not_interested";
        candidate.interviewSlotId = null;
        candidate.attendanceStatus = "declined_before";
        candidate.confirmationStatus = "declined";
        appendNotification(state, candidate.id, "candidate_not_interested", now, {
          title: "Спасибо за ответ",
          message: "Мы сняли вас с записи. Если позже работа в LOFT HALL снова станет актуальна, можно будет вернуться к новой дате собеседования.",
          slotId: previousSlotId
        });
      } else if (payload.intent === "book_slot" && payload.slotId) {
        const slot = requireSlot(state, payload.slotId);
        if (candidate.interviewSlotId === slot.id) throw new Error("Выберите другую дату собеседования");
        if (availableSeatsForBooking(state, slot.id, candidate.id) < 1) throw new Error("No seats left for this slot");
        rememberInterviewHistory(state, candidate, now, "rebooked");
        applyBooking(candidate, slot.id, now);
        appendNotification(state, candidate.id, "booking_created", now, {
          title: bookingCreatedTitle(),
          message: bookingCreatedMessage(slot),
          slotId: slot.id
        });
        appendBookingMaterials(state, candidate, slot, now);
      } else {
        if (candidateHasActiveBooking(candidate)) {
          throw new Error("Сначала отмените текущую запись на собеседование");
        }
        rememberInterviewHistory(state, candidate, now, "joined_waitlist");
        candidate.status = "waitlist";
        candidate.candidateLayerStatus = "waiting_for_interview_date";
        candidate.interviewSlotId = null;
        candidate.waitlistJoinedAt = now;
        candidate.waitlistTargetSlotId = null;
        candidate.confirmationStatus = "not_requested";
        candidate.attendanceStatus = "unknown";
        candidate.interviewResult = "pending";
        candidate.registrationStatus = "not_started";
        appendNotification(state, candidate.id, "waitlist_joined", now, {
          title: waitlistJoinedTitle(),
          message: waitlistJoinedMessage()
        });
      }
      touch(candidate, now);
      appendEvent(state, "candidate_rebook_interest", "candidate", now, {
        candidateId: candidate.id,
        intent: payload.intent || "waitlist"
      });
      result = { candidateId: candidate.id, intent: payload.intent || "waitlist" };
      break;
    }

    case "record_loss_reason": {
      const candidate = requireCandidate(state, payload.candidateId);
      candidate.lossReason = LOSS_REASONS.has(payload.reason) ? payload.reason : "other";
      candidate.lossReasonComment = clean(payload.comment);
      candidate.lossReasonMarkedAt = now;
      touch(candidate, now);
      appendEvent(state, "loss_reason_recorded", actor, now, {
        candidateId: candidate.id,
        reason: candidate.lossReason
      });
      result = { candidateId: candidate.id, reason: candidate.lossReason };
      break;
    }

    case "clear_archive": {
      const archivedSlotIds = new Set(state.slots.filter((slot) => slot.status === "completed").map((slot) => slot.id));
      const removedCandidateIds = new Set(
        state.candidates
          .filter((candidate) => archivedSlotIds.has(candidate.interviewSlotId))
          .map((candidate) => candidate.id)
      );
      state.slots = state.slots.filter((slot) => !archivedSlotIds.has(slot.id));
      state.candidates = state.candidates.filter((candidate) => !removedCandidateIds.has(candidate.id));
      state.notifications = state.notifications.filter(
        (notification) => !archivedSlotIds.has(notification.slotId) && !removedCandidateIds.has(notification.candidateId)
      );
      state.events = state.events.filter(
        (event) => !archivedSlotIds.has(event.slotId) && !removedCandidateIds.has(event.candidateId)
      );
      appendEvent(state, "archive_cleared", actor, now, {
        removedSlots: archivedSlotIds.size,
        removedCandidates: removedCandidateIds.size
      });
      result = { removedSlots: archivedSlotIds.size, removedCandidates: removedCandidateIds.size };
      break;
    }

    case "clear_recruiter_data": {
      const removedSlots = state.slots.length;
      const removedCandidates = state.candidates.length;
      state.slots = [];
      state.candidates = [];
      state.notifications = [];
      state.events = [];
      result = { removedSlots, removedCandidates };
      break;
    }

    case "record_link_click": {
      const candidate = requireCandidate(state, payload.candidateId);
      const linkType = clean(payload.linkType) || "unknown";
      candidate.linkClicks = Array.isArray(candidate.linkClicks) ? candidate.linkClicks : [];
      if (!candidate.linkClicks.some((click) => click.linkType === linkType)) {
        candidate.linkClicks.push({ linkType, clickedAt: now });
      }
      touch(candidate, now);
      appendEvent(state, "link_click_recorded", "candidate", now, {
        candidateId: candidate.id,
        linkType
      });
      result = { candidateId: candidate.id, linkType };
      break;
    }

    default:
      throw new Error(`Unknown command: ${command.action}`);
  }

  state.version = Number(state.version || 0) + 1;
  state.updatedAt = now;
  return { state: deriveState(state), result };
}

export function defaultSettings() {
  return {
    autoMaterialDelayMinutes: 5,
    developerTelegramIds: DEVELOPER_TELEGRAM_IDS,
    interviewVenues: [
      {
        id: "loft23",
        name: "LOFT#2/3",
        address: "ул. Ленинская Слобода, 26с11",
        directionsMaterialId: "loft_23_route",
        mapUrl: LOFT_23_MAP_URL
      }
    ],
    directionMaterials: [
      {
        id: "loft_23_route",
        label: "Проходка LOFT 2/3",
        caption: "",
        telegramFileId: LOFT_23_ROUTE_FILE_ID,
        telegramMethod: "video"
      }
    ],
    resourceSteps: [
      {
        type: "registration_bot",
        label: "1/5 — Регистрация",
        description: "Основная база сотрудников LOFT HALL",
        url: "https://t.me/LoftHallRegistrationBot",
        message: "Для начала зарегистрируйтесь в основной базе сотрудников LOFT HALL 👇\n\n@LoftHallRegistrationBot"
      },
      {
        type: "staff_bot",
        label: "📅 2/5 — Запись на смены",
        description: "Бот записи на доступные смены",
        url: "https://t.me/LoftHallStaffBot",
        message: STAFF_BOT_MESSAGE
      },
      {
        type: "unattested_group",
        label: "👥 3/5 — Группа «Неаттестованные»",
        description: "Группа для сотрудников до аттестации",
        url: "https://t.me/+tpUuI31XJyA2ZWFi",
        message: UNATTESTED_GROUP_MESSAGE
      },
      {
        type: "helper_bot",
        label: "📚 4/5 — LOFT HALL HELPER BOT",
        description: "База знаний и Академия LOFT HALL",
        url: "https://t.me/LOFT_HELPER_V2_BOT",
        message: HELPER_BOT_MESSAGE
      },
      {
        type: "self_employment",
        label: "💳 5/5 — Самозанятость и выплаты",
        description: "Инструкция по оформлению, выплатам и самозанятости",
        url: SELF_EMPLOYMENT_BUTTON_URL,
        message: SELF_EMPLOYMENT_MESSAGE,
        buttonLabel: "💳 Самозанятость и выплаты",
        buttonUrl: SELF_EMPLOYMENT_BUTTON_URL
      }
    ],
    registrationLinks: []
  };
}

function normalizeSettings(settings = {}) {
  const defaults = defaultSettings();
  const resourceSteps = mergeDefaultResourceSteps(Array.isArray(settings.resourceSteps) && settings.resourceSteps.length
    ? settings.resourceSteps
    : defaults.resourceSteps, defaults.resourceSteps);
  const interviewVenues = mergeDefaultVenues(Array.isArray(settings.interviewVenues) && settings.interviewVenues.length
    ? settings.interviewVenues
    : defaults.interviewVenues, defaults.interviewVenues);
  const directionMaterials = mergeDefaultDirectionMaterials(
    Array.isArray(settings.directionMaterials) && settings.directionMaterials.length
      ? settings.directionMaterials
      : defaults.directionMaterials,
    defaults.directionMaterials
  );
  const registrationLinks = mergeDefaultResourceSteps(
    Array.isArray(settings.registrationLinks) && settings.registrationLinks.length
      ? settings.registrationLinks
      : resourceSteps,
    resourceSteps
  );

  return {
    ...defaults,
    ...settings,
    developerTelegramIds: normalizeDeveloperTelegramIds(settings.developerTelegramIds || defaults.developerTelegramIds),
    interviewVenues: interviewVenues.map(normalizeVenue),
    directionMaterials: directionMaterials.map(normalizeDirectionMaterial),
    resourceSteps: resourceSteps.map(normalizeResourceStep),
    registrationLinks: registrationLinks.map(normalizeResourceStep)
  };
}

function normalizeDeveloperTelegramIds(ids = []) {
  const values = Array.isArray(ids) ? ids : [ids];
  const normalized = values.map((id) => clean(id)).filter(Boolean);
  for (const id of DEVELOPER_TELEGRAM_IDS) {
    if (!normalized.includes(id)) normalized.push(id);
  }
  return normalized;
}

function mergeDefaultResourceSteps(steps = [], defaults = []) {
  const incomingByType = new Map();
  for (const step of Array.isArray(steps) ? steps : []) {
    const type = clean(step?.type || step?.id);
    if (type && !incomingByType.has(type)) incomingByType.set(type, step);
  }
  return defaults.map((defaultStep) => {
    const type = clean(defaultStep.type || defaultStep.id);
    return { ...(incomingByType.get(type) || {}), ...defaultStep };
  });
}

function mergeDefaultVenues(venues = [], defaults = []) {
  const incomingById = new Map();
  for (const venue of Array.isArray(venues) ? venues : []) {
    const id = normalizeVenueId(venue?.id || venue?.name || venue?.venue);
    if (id && !incomingById.has(id)) incomingById.set(id, venue);
  }
  return defaults.map((defaultVenue) => {
    const id = clean(defaultVenue.id);
    return { ...(incomingById.get(id) || {}), ...defaultVenue };
  });
}

function mergeDefaultDirectionMaterials(materials = [], defaults = []) {
  const incomingById = new Map();
  for (const material of Array.isArray(materials) ? materials : []) {
    const id = clean(material?.id || material?.type);
    if (id && !incomingById.has(id)) incomingById.set(id, material);
  }
  return defaults.map((defaultMaterial) => {
    const id = clean(defaultMaterial.id || defaultMaterial.type);
    return { ...(incomingById.get(id) || {}), ...defaultMaterial };
  });
}

function normalizeVenue(venue = {}) {
  return {
    id: normalizeVenueId(venue.id || venue.name || venue.venue),
    name: clean(venue.name || venue.venue || "LOFT HALL"),
    address: clean(venue.address),
    directionsMaterialId: clean(venue.directionsMaterialId || venue.routeMaterialId),
    mapUrl: clean(venue.mapUrl || venue.mapsUrl || venue.url)
  };
}

function normalizeDirectionMaterial(material = {}) {
  const id = clean(material.id || material.type || "route");
  const defaultFileId = id === "loft_23_route" ? LOFT_23_ROUTE_FILE_ID : "";
  const fileId = defaultFileId || clean(material.telegramFileId || material.fileId || material.file_id);
  const rawMethod = clean(material.telegramMethod || material.method || "video") || "video";
  const telegramMethod = rawMethod === "document" && [LEGACY_ROUTE_FILE_ID, LOFT_23_ROUTE_FILE_ID].includes(fileId)
    ? "video"
    : rawMethod;
  return {
    id,
    label: clean(material.label || material.name || "Проходка"),
    caption: clean(material.caption),
    telegramFileId: fileId,
    telegramMethod,
    publicUrl: clean(material.publicUrl || material.url)
  };
}

function normalizeResourceStep(step = {}) {
  return {
    type: clean(step.type || step.id || "resource"),
    label: clean(step.label || step.name || "Материалы"),
    description: clean(step.description || "Ссылка LOFT HALL"),
    url: clean(step.url),
    message: clean(step.message),
    buttonLabel: clean(step.buttonLabel || step.buttonText),
    buttonUrl: clean(step.buttonUrl || step.button_url)
  };
}

function normalizeResourceStepsSent(candidate = {}) {
  if (Array.isArray(candidate.resourceStepsSent)) {
    return candidate.resourceStepsSent
      .map((step) => ({ type: clean(step.type), sentAt: step.sentAt || candidate.resourcesSentAt || candidate.materialsSentAt || "" }))
      .filter((step) => step.type);
  }

  if (candidate.resourcesSentAt || candidate.materialsSentAt) {
    return [{ type: "registration_bot", sentAt: candidate.resourcesSentAt || candidate.materialsSentAt }];
  }

  return [];
}

function normalizeResourceErrors(candidate = {}) {
  return Array.isArray(candidate.resourceErrors)
    ? candidate.resourceErrors
        .map((error) => ({
          type: clean(error.type),
          message: clean(error.message || "Не удалось отправить")
        }))
        .filter((error) => error.type)
    : [];
}

function normalizeInterviewHistory(candidate = {}) {
  return Array.isArray(candidate.interviewHistory)
    ? candidate.interviewHistory
        .map((item) => ({
          slotId: clean(item.slotId),
          date: clean(item.date),
          time: clean(item.time),
          venue: clean(item.venue),
          venueAddress: clean(item.venueAddress),
          status: clean(item.status),
          attendanceStatus: clean(item.attendanceStatus),
          confirmationStatus: clean(item.confirmationStatus),
          outcome: clean(item.outcome),
          recordedAt: item.recordedAt || ""
        }))
        .filter((item) => item.slotId || item.date)
    : [];
}

function resolveInterviewVenue(settings, payload = {}) {
  const rawVenue = clean(payload.venueId || payload.venue);
  const fromSettings = resolveVenueReference(settings, rawVenue);
  if (fromSettings.id) {
    return fromSettings;
  }

  return normalizeVenue(defaultSettings().interviewVenues[0]);
}

function resolveVenueReference(settings, value) {
  const venues = Array.isArray(settings?.interviewVenues) ? settings.interviewVenues : defaultSettings().interviewVenues;
  const normalizedValue = normalizeVenueKey(value);
  const normalizedId = normalizeVenueId(value);
  const venue = venues.find((item) => item.id === normalizedId || item.id === value || normalizeVenueKey(item.name) === normalizedValue);
  if (venue) return normalizeVenue(venue);
  return normalizeVenue(defaultSettings().interviewVenues[0]);
}

function resolveDirectionMaterial(settings, value) {
  const materials = Array.isArray(settings?.directionMaterials) ? settings.directionMaterials : defaultSettings().directionMaterials;
  const material = materials.find((item) => item.id === value);
  return material ? normalizeDirectionMaterial(material) : null;
}

function defaultBookingText(venue = {}) {
  return "";
}

function normalizeBookingText(slot = {}, venue = {}) {
  const text = clean(slot.bookingText || slot.confirmationText);
  const isLegacyText =
    text === LEGACY_BOOKING_TEXT ||
    text.includes(LEGACY_LONG_BOOKING_MARKER) ||
    LEGACY_BOOKING_PREFIXES.some((prefix) => text.startsWith(prefix));
  if (!text || isLegacyText) return defaultBookingText(venue);
  return text;
}

function slotPlaceLine(slot = {}) {
  return [slot.venue, slot.venueAddress].filter(Boolean).join(", ") || "LOFT HALL";
}

function waitlistJoinedTitle() {
  return "🔔 Вы в листе ожидания";
}

function waitlistJoinedMessage() {
  return `Как только откроется новая дата собеседования, мы пришлём её сюда.

Вы сможете сразу записаться или остаться ждать следующую дату.`;
}

function waitlistNewSlotTitle() {
  return "📅 Открыта новая дата собеседования";
}

function waitlistNewSlotMessage(slot = {}) {
  return `${formatInterviewDateForMessage(slot)}
${clean(slot.time)}

📍 ${clean(slot.venue) || "LOFT HALL"}
${clean(slot.venueAddress)}

Если дата подходит — записывайтесь 👇`;
}

function bookingCreatedTitle() {
  return "✅ Вы записаны на собеседование";
}

function bookingCreatedMessage(slot = {}) {
  return `📅 ${formatInterviewDateForMessage(slot)}
🕒 ${clean(slot.time)}
📍 ${clean(slot.venue) || "LOFT HALL"}
${clean(slot.venueAddress)}

🗺 Открыть в Яндекс Картах:
${slotMapUrl(slot)}

За день до собеседования мы пришлём сообщение — нужно будет подтвердить, что вы придёте.

Если появятся вопросы, напишите в отдел рекрутинга:
💬 ${RECRUITING_CONTACT}`;
}

function bookingMaterialsTitle() {
  return "📌 Важная информация перед собеседованием";
}

function confirmationRequestTitle() {
  return "👋 Подтвердите участие";
}

function confirmationRequestMessage(slot = {}) {
  return `Напоминаем, вы записаны на собеседование:

📅 ${formatInterviewDateForMessage(slot)}
🕒 ${clean(slot.time)}
📍 ${clean(slot.venue) || "LOFT HALL"}
${clean(slot.venueAddress)}

Пожалуйста, подтвердите, сможете ли вы прийти.`;
}

function bookingCancelledTitle() {
  return "Запись отменена";
}

function bookingCancelledMessage() {
  return `Мы сняли вас с этой даты.

Если работа в LOFT HALL всё ещё интересна, вы можете записаться на другую дату.

Если подходящих дат пока нет — можно дождаться следующего приглашения.`;
}

function noShowTitle() {
  return "👋 Вы не пришли на собеседование";
}

function noShowMessage() {
  return `Если работа в LOFT HALL всё ещё интересна, вы можете записаться на другую дату.

Если подходящих дат пока нет — можно дождаться следующего приглашения.`;
}

function cooperationStoppedTitle() {
  return "Спасибо за встречу!";
}

function cooperationStoppedMessage() {
  return `Спасибо, что пришли на собеседование и познакомились с LOFT HALL.

По итогам встречи мы не продолжаем дальнейшее сотрудничество.

Желаем вам успехов!`;
}

function resolveSlotVenueAddress(slot = {}, venue = {}) {
  if (venue.address && slot.venueId) return clean(venue.address);
  return clean(slot.venueAddress || venue.address);
}

function formatInterviewDateForMessage(slot = {}) {
  const date = clean(slot.date);
  if (!date) return "Дата уточняется";

  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Moscow"
  }).format(new Date(`${date}T00:00:00+03:00`));
}

function formatInterviewDateTimeForMessage(slot = {}) {
  const date = clean(slot.date);
  const time = clean(slot.time);
  if (!date) return time || "в назначенное время";

  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) {
    return [date, time].filter(Boolean).join(" в ");
  }

  const formattedDate = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Moscow"
  }).format(new Date(`${date}T00:00:00+03:00`));

  return time ? `${formattedDate} в ${time}` : formattedDate;
}

function normalizeLoftNameForMessage(value) {
  const venue = clean(value).replace(/LOFT\s*#\s*/i, "LOFT#");
  return venue || "LOFT HALL";
}

function bookingMaterialsMessage(slot = {}) {
  if (slot.templateCleared) return "";
  const venue = normalizeLoftNameForMessage(slot.venue);
  const address = clean(slot.venueAddress) || "адрес площадки уточнит рекрутер";
  const date = formatInterviewDateForMessage(slot);
  const time = clean(slot.time);
  return `Ждём вас ${date} в ${time} в ${venue}.

📍 Адрес: ${address}

Пожалуйста, приходите строго ко времени. Когда будете на КПП, напишите в этот чат — менеджер вас встретит.

Самостоятельно проходить в залы нельзя: в это время на площадке могут проходить мероприятия.

С собой:
- паспорт;
- ручка.

👥 Собеседование проходит в групповом формате — вместе с вами будут другие кандидаты.

👔 Форму на собеседование приносить не нужно.

Но для дальнейшего выхода на мероприятия вам понадобятся 2 комплекта формы:

1. Классика
Белая классическая рубашка, чёрные классические брюки, чёрные ботинки под кожу или лоферы.

2. Второй комплект
Чёрные джинсы, чёрные или белые кроссовки, бандана и цепь. Фирменную рубашку выдаём мы.

Ниже отправляем видео, как пройти до площадки 👇`;
}

function slotMapUrl(slot = {}) {
  const directUrl = clean(slot.mapUrl);
  if (directUrl) return directUrl;
  return LOFT_23_MAP_URL;
}

function createCandidate(payload, now) {
  return normalizeCandidate({
    id: payload.id,
    legacyId: payload.legacyId,
    telegramId: clean(payload.telegramId),
    telegram: clean(payload.telegram),
    name: clean(payload.name),
    phone: clean(payload.phone),
    source: clean(payload.source || "Не указан"),
    availability: clean(payload.availability),
    note: clean(payload.note),
    status: payload.status || "waitlist",
    candidateLayerStatus: payload.candidateLayerStatus || "candidate_created",
    interviewSlotId: payload.interviewSlotId || null,
    confirmationStatus: payload.confirmationStatus || "not_requested",
    attendanceStatus: payload.attendanceStatus || "unknown",
    interviewResult: payload.interviewResult || "pending",
    registrationStatus: payload.registrationStatus || "not_started",
    registrationInstructionsSentAt: payload.registrationInstructionsSentAt || null,
    materialsSentAt: payload.materialsSentAt || null,
    materialsAvailableAt: payload.materialsAvailableAt || null,
    resourcesSentAt: payload.resourcesSentAt || null,
    resourceStepsSent: normalizeResourceStepsSent(payload),
    resourceErrors: normalizeResourceErrors(payload),
    leftAfterInterviewAt: payload.leftAfterInterviewAt || null,
    interviewHistory: normalizeInterviewHistory(payload),
    internshipStage: payload.internshipStage || "candidate_layer",
    lossReason: payload.lossReason || "",
    linkClicks: Array.isArray(payload.linkClicks) ? payload.linkClicks : [],
    createdAt: payload.createdAt || now,
    updatedAt: payload.updatedAt || now
  });
}

function normalizeCandidate(candidate) {
  return {
    id: candidate.id,
    legacyId: clean(candidate.legacyId),
    telegramId: clean(candidate.telegramId),
    telegram: clean(candidate.telegram),
    name: clean(candidate.name),
    phone: clean(candidate.phone),
    source: clean(candidate.source || "Не указан"),
    availability: clean(candidate.availability),
    note: clean(candidate.note),
    status: candidate.status || "waitlist",
    candidateLayerStatus: candidate.candidateLayerStatus || "candidate_created",
    interviewSlotId: candidate.interviewSlotId || null,
    waitlistJoinedAt: candidate.waitlistJoinedAt || null,
    waitlistTargetSlotId: candidate.waitlistTargetSlotId || null,
    lastWaitlistNotifiedAt: candidate.lastWaitlistNotifiedAt || null,
    confirmationStatus: candidate.confirmationStatus || "not_requested",
    confirmationRequestedAt: candidate.confirmationRequestedAt || null,
    confirmedAt: candidate.confirmedAt || null,
    declinedAt: candidate.declinedAt || null,
    attendanceStatus: candidate.attendanceStatus || "unknown",
    attendanceMarkedAt: candidate.attendanceMarkedAt || null,
    interviewResult: candidate.interviewResult || "pending",
    resultReason: clean(candidate.resultReason),
    resultMarkedAt: candidate.resultMarkedAt || null,
    registrationStatus: candidate.registrationStatus || "not_started",
    registrationInstructionsSentAt: candidate.registrationInstructionsSentAt || null,
    registrationConfirmedAt: candidate.registrationConfirmedAt || null,
    materialsAvailableAt: candidate.materialsAvailableAt || null,
    materialsSentAt: candidate.materialsSentAt || null,
    resourcesSentAt: candidate.resourcesSentAt || null,
    resourceStepsSent: normalizeResourceStepsSent(candidate),
    resourceErrors: normalizeResourceErrors(candidate),
    leftAfterInterviewAt: candidate.leftAfterInterviewAt || null,
    interviewHistory: normalizeInterviewHistory(candidate),
    internshipStage: candidate.internshipStage || "candidate_layer",
    lossReason: clean(candidate.lossReason),
    lossReasonComment: clean(candidate.lossReasonComment),
    lossReasonMarkedAt: candidate.lossReasonMarkedAt || null,
    linkClicks: Array.isArray(candidate.linkClicks) ? candidate.linkClicks : [],
    createdAt: candidate.createdAt || candidate.updatedAt || new Date(0).toISOString(),
    updatedAt: candidate.updatedAt || candidate.createdAt || new Date(0).toISOString()
  };
}

function deriveSlot(slot, candidates, settings = defaultSettings()) {
  const bySlot = candidates.filter((candidate) => candidate.interviewSlotId === slot.id);
  const venue = resolveVenueReference(settings, slot.venueId || slot.venue);
  const directionsMaterial = resolveDirectionMaterial(settings, slot.directionsMaterialId || venue.directionsMaterialId);
  const bookedCount = bySlot.filter((candidate) => SLOT_HOLDING_STATUSES.has(candidate.status)).length;
  const confirmedCount = bySlot.filter((candidate) => candidate.confirmationStatus === "confirmed").length;
  const confirmationPendingCount = bySlot.filter((candidate) => candidate.confirmationStatus === "pending").length;
  const declinedBeforeCount = bySlot.filter((candidate) => candidate.attendanceStatus === "declined_before").length;
  const noConfirmationCount = bySlot.filter((candidate) => candidate.attendanceStatus === "no_confirmation").length;
  const arrivedCount = bySlot.filter((candidate) => candidate.attendanceStatus === "arrived").length;
  const noShowCount = bySlot.filter((candidate) => candidate.attendanceStatus === "no_show").length;
  const passedCount = bySlot.filter((candidate) => candidate.interviewResult === "fit").length;
  const registeredCount = bySlot.filter((candidate) => candidate.registrationStatus === "registered").length;
  const resourcesSentCount = bySlot.filter((candidate) => candidate.resourceStepsSent.length > 0).length;

  return {
    ...slot,
    title: clean(slot.title) || "Собеседование LOFT HALL",
    venueId: clean(venue.id || slot.venueId),
    venue: clean(venue.name || slot.venue) || "LOFT HALL",
    venueAddress: resolveSlotVenueAddress(slot, venue),
    mapUrl: clean(venue.mapUrl || slot.mapUrl),
    directionsMaterialId: clean(slot.directionsMaterialId || venue.directionsMaterialId || directionsMaterial?.id),
    directionsMaterial,
    templateCleared: Boolean(slot.templateCleared),
    bookingText: slot.templateCleared ? "" : normalizeBookingText(slot, venue),
    directionsVideoUrl: slot.templateCleared ? "" : clean(slot.directionsVideoUrl || slot.confirmationVideoUrl),
    confirmationText: slot.templateCleared ? "" : normalizeBookingText(slot, venue),
    confirmationVideoUrl: slot.templateCleared ? "" : clean(slot.confirmationVideoUrl || slot.directionsVideoUrl),
    bookedCount,
    confirmedCount,
    confirmationPendingCount,
    declinedBeforeCount,
    noConfirmationCount,
    arrivedCount,
    noShowCount,
    passedCount,
    registeredCount,
    resourcesSentCount,
    availableSeats: Math.max(Number(slot.seats || 0) - bookedCount, 0)
  };
}

function deriveStats(state) {
  const candidates = state.candidates;
  return {
    totalCandidates: candidates.length,
    waitlistCount: candidates.filter((candidate) => candidate.status === "waitlist").length,
    bookedTotal: candidates.filter((candidate) => SLOT_HOLDING_STATUSES.has(candidate.status)).length,
    confirmationPendingTotal: candidates.filter((candidate) => candidate.confirmationStatus === "pending").length,
    confirmedTotal: candidates.filter((candidate) => candidate.confirmationStatus === "confirmed").length,
    declinedBeforeTotal: candidates.filter((candidate) => candidate.status === "declined_before_interview").length,
    noConfirmationTotal: candidates.filter((candidate) => candidate.status === "no_confirmation").length,
    arrivedTotal: candidates.filter((candidate) => candidate.attendanceStatus === "arrived").length,
    noShowTotal: candidates.filter((candidate) => candidate.attendanceStatus === "no_show").length,
    passedTotal: candidates.filter((candidate) => candidate.interviewResult === "fit").length,
    rejectedTotal: candidates.filter((candidate) => candidate.status === "rejected").length,
    registrationPendingTotal: candidates.filter((candidate) => candidate.status === "registration_pending").length,
    registeredTotal: candidates.filter((candidate) => candidate.registrationStatus === "registered").length,
    readyTotal: candidates.filter((candidate) => candidate.status === "ready_for_internship").length,
    resourcesSentTotal: candidates.filter((candidate) => candidate.resourceStepsSent.length > 0).length,
    leftAfterTotal: candidates.filter((candidate) => candidate.status === "left_after_interview").length,
    openSlots: state.slots.filter((slot) => slot.status === "open").length,
    completedSlots: state.slots.filter((slot) => slot.status === "completed").length,
    notificationsTotal: state.notifications.length
  };
}

function countBy(keys, candidates, field) {
  return Object.fromEntries(keys.map((key) => [key, candidates.filter((candidate) => candidate[field] === key).length]));
}

function upsertCandidate(state, payload, now) {
  const profile = normalizeCandidateProfilePayload(payload);
  const index = findCandidateIndex(state.candidates, payload);
  const createId = clean(payload.id && !payload.candidateId ? payload.id : "");
  const candidate =
    index >= 0
      ? state.candidates[index]
      : createCandidate(
          {
            id: createId || nextId("cand", state.candidates),
            status: "waitlist",
            candidateLayerStatus: "candidate_created"
          },
          now
        );

  candidate.telegramId = clean(profile.telegramId || candidate.telegramId);
  candidate.telegram = requireText(profile.telegram || candidate.telegram, "Candidate Telegram is required");
  candidate.name = requireText(profile.name || candidate.name, "Candidate name is required");
  candidate.phone = requireText(profile.phone || candidate.phone, "Candidate phone is required");
  candidate.source = clean(profile.source || candidate.source || "Не указан");
  candidate.availability = clean(profile.availability || candidate.availability);
  candidate.note = clean(profile.note || candidate.note);
  touch(candidate, now);

  if (index === -1) {
    state.candidates.push(candidate);
  }

  return candidate;
}

function normalizeCandidateProfilePayload(payload = {}) {
  const name = requireText(payload.name, "Candidate name is required");
  if (!isValidFullName(name)) {
    throw new Error("ФИО должно содержать имя и фамилию без цифр и лишних символов");
  }

  const phone = normalizeRussianPhone(payload.phone);
  if (!phone) {
    throw new Error("Телефон должен быть российским номером в формате +7XXXXXXXXXX");
  }

  const telegram = requireText(payload.telegram, "Candidate Telegram is required");

  return {
    ...payload,
    name: normalizeFullName(name),
    phone,
    telegram
  };
}

function isValidFullName(value) {
  const text = clean(value).replace(/\s+/g, " ");
  if (text.length < 5 || text.length > 120) return false;
  if (/[\d_/@#$%^&*=+{}[\]<>|~]/.test(text)) return false;
  const parts = text.split(" ").filter(Boolean);
  if (parts.length < 2) return false;
  return parts.every((part) => /^[A-Za-zА-Яа-яЁё-]{2,}$/.test(part));
}

function normalizeFullName(value) {
  return clean(value).replace(/\s+/g, " ");
}

function normalizeRussianPhone(value) {
  const raw = clean(value);
  const digits = raw.replace(/\D/g, "");
  if (raw.startsWith("+7") && digits.length === 11 && digits.startsWith("7")) return `+${digits}`;
  if (!raw.startsWith("+") && digits.length === 11 && digits.startsWith("8")) return `+7${digits.slice(1)}`;
  if (!raw.startsWith("+") && digits.length === 11 && digits.startsWith("7")) return `+${digits}`;
  if (!raw.startsWith("+") && digits.length === 10 && digits.startsWith("9")) return `+7${digits}`;
  return "";
}

function candidateHasActiveBooking(candidate = {}) {
  return Boolean(
    candidate.interviewSlotId &&
      ["booked", "confirmation_pending", "confirmed", "attended", "registration_pending", "registered", "ready_for_internship"].includes(candidate.status)
  );
}

function rememberInterviewHistory(state, candidate, now, outcome) {
  if (!candidate?.interviewSlotId) return;
  candidate.interviewHistory = Array.isArray(candidate.interviewHistory) ? candidate.interviewHistory : [];
  if (candidate.interviewHistory.some((item) => item.slotId === candidate.interviewSlotId && item.outcome === outcome)) return;
  const slot = state.slots.find((item) => item.id === candidate.interviewSlotId);
  candidate.interviewHistory.unshift({
    slotId: candidate.interviewSlotId,
    date: clean(slot?.date),
    time: clean(slot?.time),
    venue: clean(slot?.venue),
    venueAddress: clean(slot?.venueAddress),
    status: clean(candidate.status),
    attendanceStatus: clean(candidate.attendanceStatus),
    confirmationStatus: clean(candidate.confirmationStatus),
    outcome: clean(outcome),
    recordedAt: now
  });
  candidate.interviewHistory = candidate.interviewHistory.slice(0, 12);
}

function applyBooking(candidate, slotId, now) {
  candidate.status = "booked";
  candidate.candidateLayerStatus = "interview_booked";
  candidate.interviewSlotId = slotId;
  candidate.waitlistTargetSlotId = null;
  candidate.confirmationStatus = "not_requested";
  candidate.confirmationRequestedAt = null;
  candidate.confirmedAt = null;
  candidate.attendanceStatus = "unknown";
  candidate.attendanceMarkedAt = null;
  candidate.interviewResult = "pending";
  candidate.resultReason = "";
  candidate.resultMarkedAt = null;
  candidate.registrationStatus = "not_started";
  candidate.registrationInstructionsSentAt = null;
  candidate.registrationConfirmedAt = null;
  candidate.materialsSentAt = null;
  candidate.materialsAvailableAt = null;
  candidate.resourcesSentAt = null;
  candidate.resourceStepsSent = [];
  candidate.resourceErrors = [];
  candidate.leftAfterInterviewAt = null;
  candidate.declinedAt = null;
  candidate.internshipStage = "candidate_layer";
  candidate.lossReason = "";
  candidate.lossReasonComment = "";
  candidate.lossReasonMarkedAt = null;
  candidate.linkClicks = [];
  touch(candidate, now);
}

function notifyWaitlist(state, slotId, now) {
  const slot = slotId ? requireSlot(state, slotId) : state.slots.find((item) => item.status === "open");
  if (!slot) return 0;

  const seats = availableSeats(state, slot.id);
  if (seats < 1) return 0;

  const waitlist = state.candidates
    .filter((candidate) => candidate.status === "waitlist")
    .filter((candidate) => !candidate.interviewSlotId)
    .filter((candidate) => candidate.waitlistTargetSlotId !== slot.id)
    .sort(compareWaitlistCandidates)
    .slice(0, seats);
  for (const candidate of waitlist) {
    candidate.lastWaitlistNotifiedAt = now;
    candidate.waitlistTargetSlotId = slot.id;
    touch(candidate, now);
    appendNotification(state, candidate.id, "waitlist_new_slot", now, {
      title: waitlistNewSlotTitle(),
      message: waitlistNewSlotMessage(slot),
      slotId: slot.id,
      actions: [
        waitlistAction(candidate.id, slot.id, "book"),
        waitlistAction(candidate.id, slot.id, "stay")
      ]
    });
  }
  return waitlist.length;
}

function compareWaitlistCandidates(left, right) {
  const leftDate = left.waitlistJoinedAt || left.createdAt || "";
  const rightDate = right.waitlistJoinedAt || right.createdAt || "";
  const byDate = String(leftDate).localeCompare(String(rightDate));
  if (byDate !== 0) return byDate;
  return String(left.id).localeCompare(String(right.id));
}

function appendBookingMaterials(state, candidate, slot, now) {
  const routeMedia = routeMediaForSlot(slot);
  const message = bookingMaterialsMessage(slot);
  if (!message && !routeMedia.length) return;
  appendNotification(state, candidate.id, "booking_materials", now, {
    title: message ? bookingMaterialsTitle() : "",
    message,
    slotId: slot.id,
    media: routeMedia
  });
}

function routeMediaForSlot(slot = {}) {
  const material = slot.directionsMaterial;
  if (!material?.telegramFileId) return [];
  return [
    {
      type: material.telegramMethod || "document",
      fileId: material.telegramFileId,
      caption: ""
    }
  ];
}

function registrationTargets(state, slotId) {
  return state.candidates.filter((candidate) => {
    if (slotId && candidate.interviewSlotId !== slotId) return false;
    return candidate.interviewResult === "fit" || candidate.registrationStatus === "registered";
  });
}

function resourceTargets(state, slotId) {
  return state.candidates.filter((candidate) => {
    if (slotId && candidate.interviewSlotId !== slotId) return false;
    return candidate.attendanceStatus === "arrived" && candidate.status !== "left_after_interview";
  });
}

function markCandidatePassed(state, candidate, actor, now, options = {}) {
  const registered = candidate.registrationStatus === "registered";
  const resourcesAlreadySent =
    candidate.registrationStatus === "materials_sent" ||
    Boolean(candidate.resourcesSentAt) ||
    (candidate.resourceStepsSent || []).length > 0;

  candidate.interviewResult = "fit";
  candidate.resultReason = clean(options.reason);
  candidate.resultMarkedAt = now;
  candidate.status = registered ? "ready_for_internship" : "registration_pending";
  candidate.registrationStatus = registered ? "registered" : resourcesAlreadySent ? "materials_sent" : "instructions_sent";
  candidate.candidateLayerStatus = registered
    ? "ready_for_internship"
    : resourcesAlreadySent
      ? "resources_sent"
      : "interview_passed";
  candidate.registrationInstructionsSentAt = candidate.registrationInstructionsSentAt || now;
  candidate.materialsAvailableAt = candidate.materialsAvailableAt || addMinutes(now, state.settings.autoMaterialDelayMinutes);
  candidate.internshipStage = registered
    ? "ready_for_internship"
    : resourcesAlreadySent
      ? "candidate_resources_sent"
      : "candidate_ready_for_registration";

  if (options.notify) {
    appendNotification(state, candidate.id, "registration_instructions", now, {
      title: "Вы прошли собеседование",
      message: "Отправлена инструкция по регистрации в основном боте и базе сотрудников.",
      slotId: candidate.interviewSlotId
    });
  }

  touch(candidate, now);
  appendEvent(state, "interview_result_set", actor, now, { candidateId: candidate.id, result: "fit" });
}

function selectResourceStep(state, resourceType, targets) {
  const steps = getResourceSteps(state);
  const requested = clean(resourceType);
  if (requested) return steps.find((step) => step.type === requested) || null;
  return steps.find((step) => targets.some((candidate) => !hasResourceStep(candidate, step.type))) || null;
}

function getResourceSteps(state) {
  const settingsSteps = state.settings?.resourceSteps;
  if (Array.isArray(settingsSteps) && settingsSteps.length) return settingsSteps.map(normalizeResourceStep);
  return defaultSettings().resourceSteps;
}

function hasResourceStep(candidate, type) {
  return Array.isArray(candidate.resourceStepsSent) && candidate.resourceStepsSent.some((step) => step.type === type);
}

function resourceStepMessage(step = {}) {
  if (step.message) return step.message;
  return [step.description, step.url].filter(Boolean).join(". ");
}

function resourceStepActions(step = {}) {
  const label = clean(step.buttonLabel);
  const url = clean(step.buttonUrl || step.url);
  return label && url ? [{ label, url }] : [];
}

function getCandidateTargets(state, payload) {
  if (payload.candidateId) return [requireCandidate(state, payload.candidateId)];
  if (payload.slotId) {
    return state.candidates.filter((candidate) => candidate.interviewSlotId === payload.slotId);
  }
  if (payload.dueDate) {
    const dueSlotIds = new Set(state.slots.filter((slot) => slot.date === payload.dueDate).map((slot) => slot.id));
    return state.candidates.filter((candidate) => dueSlotIds.has(candidate.interviewSlotId));
  }
  return state.candidates.filter((candidate) => ["booked", "confirmation_pending", "confirmed"].includes(candidate.status));
}

function appendNotification(state, candidateId, type, now, payload = {}) {
  state.notifications.unshift({
    id: nextId("notif", state.notifications),
    candidateId,
    type,
    title: Object.hasOwn(payload, "title") ? clean(payload.title) : "Уведомление",
    message: payload.message || "",
    slotId: payload.slotId || null,
    media: normalizeNotificationMedia(payload.media),
    actions: normalizeNotificationActions(payload.actions),
    status: "pending",
    channel: "telegram",
    createdAt: now,
    sentAt: null
  });
  state.notifications = state.notifications.slice(0, 200);
}

function normalizeNotificationRecord(notification = {}) {
  const normalized = {
    ...notification,
    title: clean(notification.title),
    message: clean(notification.message),
    media: normalizeNotificationMedia(notification.media),
    actions: normalizeNotificationActions(notification.actions)
  };

  if (normalized.type === "booking_materials" && normalized.message.includes(LEGACY_LONG_BOOKING_MARKER)) {
    normalized.title = "";
    normalized.message = "";
  }

  if (normalized.type.startsWith("resource_") && normalized.title.startsWith("Материалы LOFT HALL:")) {
    normalized.title = "";
  }

  return normalized;
}

function normalizeNotificationMedia(media = []) {
  return Array.isArray(media)
    ? media
        .map((item) => ({
          type: clean(item.type || "document") === "video" ? "video" : "document",
          fileId: clean(item.fileId || item.telegramFileId || item.file_id),
          caption: clean(item.caption || "")
        }))
        .filter((item) => item.fileId)
    : [];
}

function normalizeNotificationActions(actions = []) {
  return Array.isArray(actions)
    ? actions
        .map((action) => ({
          label: clean(action.label || action.text),
          callbackData: clean(action.callbackData || action.callback_data),
          url: clean(action.url)
        }))
        .filter((action) => action.label && (action.callbackData || action.url))
    : [];
}

function confirmationAction(candidateId, decision) {
  return {
    label: decision === "yes" ? "✅ Да, приду" : "❌ Не смогу",
    callbackData: `confirm:${decision}:${candidateId}`
  };
}

function waitlistAction(candidateId, slotId, intent) {
  return {
    label: intent === "book" ? "Записаться" : "Ждать следующую дату",
    callbackData: `waitlist:${intent}:${slotId}:${candidateId}`
  };
}

function clearLatestNotificationActions(state, candidateId, type, slotId, now) {
  const notification = state.notifications.find(
    (item) =>
      item.candidateId === candidateId &&
      item.type === type &&
      (!slotId || item.slotId === slotId) &&
      Array.isArray(item.actions) &&
      item.actions.length > 0
  );
  if (!notification) return;
  notification.actions = [];
  notification.keyboardClearedAt = now;
}

function appendEvent(state, type, actor, now, details = {}) {
  state.events.unshift({
    id: nextId("event", state.events),
    type,
    actor,
    createdAt: now,
    ...details
  });
  state.events = state.events.slice(0, 160);
}

function normalizeAttendance(attendance) {
  if (attendance === "arrived") return "arrived";
  if (attendance === "declined_before") return "declined_before";
  if (attendance === "no_confirmation") return "no_confirmation";
  return "no_show";
}

function availableSeats(state, slotId) {
  return deriveSlot(requireSlot(state, slotId), state.candidates, state.settings).availableSeats;
}

function availableSeatsForBooking(state, slotId, candidateId = "") {
  const candidates = candidateId
    ? state.candidates.filter((candidate) => candidate.id !== candidateId)
    : state.candidates;
  return deriveSlot(requireSlot(state, slotId), candidates, state.settings).availableSeats;
}

function findActiveSlotByDateTime(state, date, time) {
  const normalizedDate = clean(date);
  const normalizedTime = clean(time);
  return state.slots.find(
    (slot) =>
      slot.status !== "completed" &&
      clean(slot.date) === normalizedDate &&
      clean(slot.time) === normalizedTime
  );
}

function findCandidateIndex(candidates, payload = {}) {
  const candidateId = clean(payload.candidateId || payload.id);
  return candidateId ? candidates.findIndex((candidate) => candidate.id === candidateId) : -1;
}

function requireSlot(state, slotId) {
  const slot = state.slots.find((item) => item.id === slotId);
  if (!slot) throw new Error("Slot not found");
  return slot;
}

function requireCandidate(state, candidateId) {
  const candidate = state.candidates.find((item) => item.id === candidateId);
  if (!candidate) throw new Error("Candidate not found");
  return candidate;
}

function nextId(prefix, records) {
  const usedIds = new Set(records.map((record) => record.id));
  let index = records.length + 1;
  let id = `${prefix}-${String(index).padStart(3, "0")}`;
  while (usedIds.has(id)) {
    index += 1;
    id = `${prefix}-${String(index).padStart(3, "0")}`;
  }
  return id;
}

function addMinutes(iso, minutes) {
  return new Date(new Date(iso).getTime() + Number(minutes || 0) * 60_000).toISOString();
}

function touch(record, now) {
  record.updatedAt = now;
}

function requireText(value, message) {
  const text = clean(value);
  if (!text) throw new Error(message);
  return text;
}

function clean(value) {
  return String(value || "").trim();
}

function normalizePhone(value) {
  return clean(value).replace(/[^\d+]/g, "");
}

function normalizeTelegram(value) {
  return clean(value).replace(/^@/, "").toLowerCase();
}

function normalizeVenueKey(value) {
  return clean(value).replace(/\s+/g, "").replace("#", "").toLowerCase();
}

function normalizeVenueId(value) {
  const key = normalizeVenueKey(value);
  if (["loft2", "loft3", "loft23", "loft2/3", "loft#2/3", "loft#2", "loft#3"].includes(key)) {
    return "loft23";
  }
  return clean(value);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
