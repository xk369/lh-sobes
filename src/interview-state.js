const ACTIVE_INTERVIEW_RESULTS = new Set(["fit", "not_fit", "self_declined", "russian_low", "other"]);
const LOSS_REASONS = new Set(["date_time", "location", "circumstances", "conditions", "other_offer", "other"]);
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
    schemaVersion: 2,
    version: 1,
    updatedAt: now,
    settings: defaultSettings(),
    slots: [
      {
        id: "slot-001",
        title: "Собеседование LOFT #8",
        date: "2026-08-13",
        time: "12:00",
        venue: "LOFT #8",
        seats: 12,
        status: "open",
        recruiter: "Анастасия",
        note: "Основной поток кандидатов на стажировку",
        createdAt: now
      },
      {
        id: "slot-002",
        title: "Собеседование LOFT #4",
        date: "2026-08-16",
        time: "15:30",
        venue: "LOFT #4",
        seats: 10,
        status: "open",
        recruiter: "Дежурный рекрут",
        note: "Резервная дата для листа ожидания",
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
        type: "resources",
        title: "Ресурсы LOFT HALL",
        message: "Отправлены ссылки на группу неаттестованных, Helper Bot и рабочий бот.",
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
  state.schemaVersion = Number(state.schemaVersion || 2);
  state.version = Number(state.version || 1);
  state.settings = { ...defaultSettings(), ...(state.settings || {}) };
  state.slots = Array.isArray(state.slots) ? state.slots : [];
  state.candidates = Array.isArray(state.candidates) ? state.candidates.map(normalizeCandidate) : [];
  state.notifications = Array.isArray(state.notifications) ? state.notifications : [];
  state.events = Array.isArray(state.events) ? state.events : [];

  state.slots = state.slots.map((slot) => deriveSlot(slot, state.candidates));
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
      if (availableSeats(state, slot.id) < 1) throw new Error("No seats left for this slot");

      const candidate = upsertCandidate(state, payload.candidate || payload, now);
      applyBooking(candidate, slot.id, now);
      appendNotification(state, candidate.id, "booking_created", now, {
        title: "Вы записаны на собеседование",
        message: `${slot.date} в ${slot.time}, ${slot.venue}. За день до собеседования придет запрос подтверждения.`,
        slotId: slot.id
      });
      appendEvent(state, "candidate_booked_slot", actor, now, { candidateId: candidate.id, slotId: slot.id });
      result = { candidateId: candidate.id, slotId: slot.id };
      break;
    }

    case "join_waitlist": {
      const candidate = upsertCandidate(state, payload.candidate || payload, now);
      candidate.status = "waitlist";
      candidate.candidateLayerStatus = "waiting_for_interview_date";
      candidate.interviewSlotId = null;
      candidate.waitlistJoinedAt = candidate.waitlistJoinedAt || now;
      candidate.confirmationStatus = "not_requested";
      candidate.attendanceStatus = "unknown";
      candidate.interviewResult = "pending";
      candidate.registrationStatus = "not_started";
      candidate.internshipStage = "candidate_layer";
      touch(candidate, now);
      appendNotification(state, candidate.id, "waitlist_joined", now, {
        title: "Вы в ожидании новой даты",
        message: "Когда рекрутер создаст новое собеседование, сюда придет уведомление с кнопкой записи."
      });
      appendEvent(state, "candidate_joined_waitlist", "candidate", now, { candidateId: candidate.id });
      result = { candidateId: candidate.id };
      break;
    }

    case "create_slot": {
      const slot = {
        id: payload.id || nextId("slot", state.slots),
        title: clean(payload.title) || "Собеседование LOFT HALL",
        date: requireText(payload.date, "Slot date is required"),
        time: requireText(payload.time, "Slot time is required"),
        venue: clean(payload.venue) || "LOFT HALL",
        seats: Math.max(Number(payload.seats || 1), 1),
        status: payload.status === "closed" ? "closed" : "open",
        recruiter: clean(payload.recruiter) || "Рекрут",
        note: clean(payload.note),
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

    case "request_confirmation":
    case "send_due_confirmations": {
      const targets = getCandidateTargets(state, payload).filter((candidate) =>
        ["booked", "confirmed", "confirmation_pending"].includes(candidate.status)
      );
      for (const candidate of targets) {
        candidate.status = "confirmation_pending";
        candidate.candidateLayerStatus = "interview_confirmation_pending";
        candidate.confirmationStatus = "pending";
        candidate.confirmationRequestedAt = now;
        touch(candidate, now);
        const slot = candidate.interviewSlotId ? requireSlot(state, candidate.interviewSlotId) : null;
        appendNotification(state, candidate.id, "confirmation_request", now, {
          title: "Подтвердите участие",
          message: slot
            ? `Собеседование ${slot.date} в ${slot.time}, ${slot.venue}. Выберите: да, приду или нет, не смогу.`
            : "Подтвердите участие в собеседовании.",
          slotId: candidate.interviewSlotId
        });
      }
      appendEvent(state, "confirmation_requested", actor, now, {
        slotId: payload.slotId || null,
        candidateId: payload.candidateId || null,
        requestedCount: targets.length
      });
      result = { requestedCount: targets.length };
      break;
    }

    case "candidate_confirm": {
      const candidate = requireCandidate(state, payload.candidateId);
      if (payload.decision === "yes") {
        candidate.status = "confirmed";
        candidate.candidateLayerStatus = "interview_confirmed";
        candidate.confirmationStatus = "confirmed";
        candidate.confirmedAt = now;
      } else {
        candidate.status = "declined_before_interview";
        candidate.candidateLayerStatus = "interview_declined_before";
        candidate.confirmationStatus = "declined";
        candidate.attendanceStatus = "declined_before";
        candidate.declinedAt = now;
      }
      touch(candidate, now);
      appendEvent(state, "candidate_confirmation_answered", "candidate", now, {
        candidateId: candidate.id,
        decision: payload.decision
      });
      result = { candidateId: candidate.id, decision: payload.decision };
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
        candidate.status = "declined_before_interview";
        candidate.candidateLayerStatus = "interview_declined_before";
        candidate.confirmationStatus = "declined";
      } else if (attendance === "no_confirmation") {
        candidate.status = "no_confirmation";
        candidate.candidateLayerStatus = "interview_no_confirmation";
        candidate.confirmationStatus = "no_response";
      } else {
        candidate.status = "no_show";
        candidate.candidateLayerStatus = "interview_no_show";
        appendNotification(state, candidate.id, "no_show_followup", now, {
          title: "Вы не пришли на собеседование",
          message: "Вы можете записаться на следующую дату, ждать уведомление о новом собеседовании или закрыть заявку.",
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
      candidate.interviewResult = interviewResult;
      candidate.resultReason = clean(payload.reason);
      candidate.resultMarkedAt = now;

      if (interviewResult === "fit") {
        candidate.status = candidate.registrationStatus === "registered" ? "ready_for_internship" : "registration_pending";
        candidate.candidateLayerStatus =
          candidate.registrationStatus === "registered" ? "ready_for_internship" : "interview_passed";
        candidate.registrationStatus =
          candidate.registrationStatus === "registered" ? "registered" : "instructions_sent";
        candidate.registrationInstructionsSentAt = candidate.registrationInstructionsSentAt || now;
        candidate.materialsAvailableAt = addMinutes(now, state.settings.autoMaterialDelayMinutes);
        candidate.internshipStage =
          candidate.registrationStatus === "registered" ? "ready_for_internship" : "candidate_ready_for_registration";
        appendNotification(state, candidate.id, "registration_instructions", now, {
          title: "Вы прошли собеседование",
          message: "Отправлена инструкция по регистрации в основном боте и базе сотрудников.",
          slotId: candidate.interviewSlotId
        });
      } else {
        candidate.status = "rejected";
        candidate.candidateLayerStatus = "interview_rejected";
        candidate.registrationStatus = "not_started";
        candidate.internshipStage = "not_ready";
        if (interviewResult === "self_declined") {
          appendNotification(state, candidate.id, "loss_reason_request", now, {
            title: "Уточните причину отказа",
            message: "Короткий ответ поможет понять, на каком этапе теряются кандидаты."
          });
        }
      }

      touch(candidate, now);
      appendEvent(state, "interview_result_set", actor, now, { candidateId: candidate.id, result: interviewResult });
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
          title: "Материалы для регистрации",
          message: "Отправлены ссылки на группу неаттестованных, Helper Bot и рабочий бот.",
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

    case "send_resources": {
      const targets = payload.candidateId ? [requireCandidate(state, payload.candidateId)] : resourceTargets(state, payload.slotId);
      for (const candidate of targets) {
        if (candidate.attendanceStatus !== "arrived") continue;
        candidate.registrationStatus = "materials_sent";
        candidate.materialsSentAt = now;
        candidate.resourcesSentAt = now;
        candidate.candidateLayerStatus = "resources_sent";
        candidate.internshipStage = "candidate_resources_sent";
        touch(candidate, now);
        appendNotification(state, candidate.id, "resources", now, {
          title: "Ресурсы LOFT HALL",
          message: "Отправлены ссылки на группу неаттестованных, Helper Bot и рабочий бот.",
          slotId: candidate.interviewSlotId
        });
      }
      appendEvent(state, "resources_sent", actor, now, {
        slotId: payload.slotId || null,
        candidateId: payload.candidateId || null,
        sentCount: targets.length
      });
      result = { sentCount: targets.length };
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
      appendNotification(state, candidate.id, "loss_reason_request", now, {
        title: "Уточните причину",
        message: "Если после собеседования вы не продолжаете путь, коротко отметьте причину.",
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
      slot.status = "completed";
      slot.completedAt = now;
      appendEvent(state, "slot_completed", actor, now, { slotId: slot.id });
      result = { slotId: slot.id };
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
        candidate.status = "not_interested";
        candidate.candidateLayerStatus = "closed_not_interested";
        candidate.interviewSlotId = null;
      } else if (payload.intent === "book_slot" && payload.slotId) {
        const slot = requireSlot(state, payload.slotId);
        if (availableSeats(state, slot.id) < 1) throw new Error("No seats left for this slot");
        applyBooking(candidate, slot.id, now);
      } else {
        candidate.status = "waitlist";
        candidate.candidateLayerStatus = "waiting_for_interview_date";
        candidate.interviewSlotId = null;
        candidate.waitlistJoinedAt = now;
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

function defaultSettings() {
  return {
    autoMaterialDelayMinutes: 5,
    registrationLinks: [
      {
        type: "unattested_group",
        label: "Группа неаттестованных",
        description: "Канал для сотрудников до аттестации",
        url: "https://t.me/loft_hall_unattested"
      },
      {
        type: "helper_bot",
        label: "Helper Bot",
        description: "Основной бот с материалами и регистрацией",
        url: "https://t.me/loft_helper_bot"
      },
      {
        type: "work_bot",
        label: "Рабочий бот",
        description: "Бот для смен и дальнейшего взаимодействия",
        url: "https://t.me/loft_work_bot"
      }
    ]
  };
}

function createCandidate(payload, now) {
  return normalizeCandidate({
    id: payload.id,
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
    leftAfterInterviewAt: payload.leftAfterInterviewAt || null,
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
    leftAfterInterviewAt: candidate.leftAfterInterviewAt || null,
    internshipStage: candidate.internshipStage || "candidate_layer",
    lossReason: clean(candidate.lossReason),
    lossReasonComment: clean(candidate.lossReasonComment),
    lossReasonMarkedAt: candidate.lossReasonMarkedAt || null,
    linkClicks: Array.isArray(candidate.linkClicks) ? candidate.linkClicks : [],
    createdAt: candidate.createdAt || candidate.updatedAt || new Date(0).toISOString(),
    updatedAt: candidate.updatedAt || candidate.createdAt || new Date(0).toISOString()
  };
}

function deriveSlot(slot, candidates) {
  const bySlot = candidates.filter((candidate) => candidate.interviewSlotId === slot.id);
  const bookedCount = bySlot.filter((candidate) => SLOT_HOLDING_STATUSES.has(candidate.status)).length;
  const confirmedCount = bySlot.filter((candidate) => candidate.confirmationStatus === "confirmed").length;
  const confirmationPendingCount = bySlot.filter((candidate) => candidate.confirmationStatus === "pending").length;
  const declinedBeforeCount = bySlot.filter((candidate) => candidate.attendanceStatus === "declined_before").length;
  const noConfirmationCount = bySlot.filter((candidate) => candidate.attendanceStatus === "no_confirmation").length;
  const arrivedCount = bySlot.filter((candidate) => candidate.attendanceStatus === "arrived").length;
  const noShowCount = bySlot.filter((candidate) => candidate.attendanceStatus === "no_show").length;
  const passedCount = bySlot.filter((candidate) => candidate.interviewResult === "fit").length;
  const registeredCount = bySlot.filter((candidate) => candidate.registrationStatus === "registered").length;
  const resourcesSentCount = bySlot.filter((candidate) => candidate.resourcesSentAt || candidate.materialsSentAt).length;

  return {
    ...slot,
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
    resourcesSentTotal: candidates.filter((candidate) => candidate.resourcesSentAt || candidate.materialsSentAt).length,
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
  const index = findCandidateIndex(state.candidates, payload);
  const candidate =
    index >= 0
      ? state.candidates[index]
      : createCandidate(
          {
            id: payload.id || payload.candidateId || nextId("cand", state.candidates),
            status: "waitlist",
            candidateLayerStatus: "candidate_created"
          },
          now
        );

  candidate.telegramId = clean(payload.telegramId || candidate.telegramId);
  candidate.telegram = clean(payload.telegram || candidate.telegram);
  candidate.name = requireText(payload.name || candidate.name, "Candidate name is required");
  candidate.phone = requireText(payload.phone || candidate.phone, "Candidate phone is required");
  candidate.source = clean(payload.source || candidate.source || "Не указан");
  candidate.availability = clean(payload.availability || candidate.availability);
  candidate.note = clean(payload.note || candidate.note);
  touch(candidate, now);

  if (index === -1) {
    state.candidates.push(candidate);
  }

  return candidate;
}

function applyBooking(candidate, slotId, now) {
  candidate.status = "booked";
  candidate.candidateLayerStatus = "interview_booked";
  candidate.interviewSlotId = slotId;
  candidate.waitlistTargetSlotId = null;
  candidate.confirmationStatus = "not_requested";
  candidate.attendanceStatus = "unknown";
  candidate.interviewResult = "pending";
  candidate.registrationStatus = "not_started";
  candidate.resourcesSentAt = null;
  candidate.leftAfterInterviewAt = null;
  candidate.internshipStage = "candidate_layer";
  candidate.lossReason = "";
  touch(candidate, now);
}

function notifyWaitlist(state, slotId, now) {
  const slot = slotId ? requireSlot(state, slotId) : state.slots.find((item) => item.status === "open");
  if (!slot) return 0;

  const waitlist = state.candidates.filter((candidate) => candidate.status === "waitlist");
  for (const candidate of waitlist) {
    candidate.lastWaitlistNotifiedAt = now;
    candidate.waitlistTargetSlotId = slot.id;
    touch(candidate, now);
    appendNotification(state, candidate.id, "waitlist_new_slot", now, {
      title: "Открыта новая дата собеседования",
      message: `${slot.date} в ${slot.time}, ${slot.venue}. Можно записаться на эту дату.`,
      slotId: slot.id
    });
  }
  return waitlist.length;
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

function getCandidateTargets(state, payload) {
  if (payload.candidateId) return [requireCandidate(state, payload.candidateId)];
  if (payload.slotId) {
    return state.candidates.filter((candidate) => candidate.interviewSlotId === payload.slotId);
  }
  return state.candidates.filter((candidate) => ["booked", "confirmation_pending", "confirmed"].includes(candidate.status));
}

function appendNotification(state, candidateId, type, now, payload = {}) {
  state.notifications.unshift({
    id: nextId("notif", state.notifications),
    candidateId,
    type,
    title: payload.title || "Уведомление",
    message: payload.message || "",
    slotId: payload.slotId || null,
    status: "sent",
    channel: "telegram_mock",
    createdAt: now,
    sentAt: now
  });
  state.notifications = state.notifications.slice(0, 200);
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
  return deriveSlot(requireSlot(state, slotId), state.candidates).availableSeats;
}

function findCandidateIndex(candidates, payload = {}) {
  const candidateId = payload.candidateId || payload.id;
  if (candidateId) return candidates.findIndex((candidate) => candidate.id === candidateId);

  const telegramId = clean(payload.telegramId);
  if (telegramId) {
    const byTelegramId = candidates.findIndex((candidate) => clean(candidate.telegramId) === telegramId);
    if (byTelegramId >= 0) return byTelegramId;
  }

  const phone = normalizePhone(payload.phone);
  if (phone) {
    const byPhone = candidates.findIndex((candidate) => normalizePhone(candidate.phone) === phone);
    if (byPhone >= 0) return byPhone;
  }

  const telegram = normalizeTelegram(payload.telegram);
  if (telegram) return candidates.findIndex((candidate) => normalizeTelegram(candidate.telegram) === telegram);

  return -1;
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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
