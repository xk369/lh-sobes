import { randomUUID } from "node:crypto";
import pg from "pg";
import { defaultSettings, deriveState } from "./interview-state.js";

const { Pool } = pg;

const RESOURCE_SEQUENCE = [
  "registration_bot",
  "staff_bot",
  "unattested_group",
  "helper_bot",
  "self_employment"
];

const REPLACE_LOCK_ID = "871120260820";
const ACTIVE_PROFILE_STAGES = new Set([
  "candidate_created",
  "waiting_for_interview_date",
  "interview_booked",
  "interview_confirmation_pending",
  "interview_confirmed",
  "interview_declined_before",
  "interview_no_confirmation",
  "interview_no_show",
  "interview_attended",
  "interview_passed",
  "interview_rejected",
  "left_after_interview",
  "resources_sent",
  "candidate_ready_for_registration",
  "ready_for_internship",
  "closed_not_interested"
]);

export function createPostgresInterviewStorage(env = process.env) {
  const pool = new Pool({
    connectionString: requiredDatabaseUrl(env),
    ssl: postgresSslConfig(env),
    max: Number(env.POSTGRES_POOL_MAX || 10)
  });

  return {
    mode: "postgres",
    async ensure() {
      const client = await pool.connect();
      try {
        await assertInterviewRuntimeSchema(client);
      } finally {
        client.release();
      }
    },
    async loadState() {
      const client = await pool.connect();
      try {
        return await readInterviewState(client);
      } finally {
        client.release();
      }
    },
    async mutateState(mutator) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock($1::bigint)", [REPLACE_LOCK_ID]);
        const state = await readInterviewState(client);
        const mutation = await mutator(state, {
          prepareStateIds: (nextState, result) => prepareStateIds(client, nextState, result)
        });
        const savedState = await replaceInterviewState(client, mutation.state);
        await client.query("COMMIT");
        return { ...mutation, state: savedState };
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    },
    async close() {
      await pool.end();
    }
  };
}

function requiredDatabaseUrl(env) {
  const value = clean(env.DATABASE_URL);
  if (!value) throw new Error("DATABASE_URL is required for INTERVIEW_STORAGE_MODE=postgres");
  return value;
}

function postgresSslConfig(env) {
  const mode = clean(env.POSTGRES_SSL_MODE).toLowerCase();
  if (!mode || mode === "disable") return undefined;
  if (mode === "require") return { rejectUnauthorized: false };
  if (mode === "verify-full") return { rejectUnauthorized: true };
  throw new Error("POSTGRES_SSL_MODE must be disable, require, or verify-full");
}

async function assertInterviewRuntimeSchema(client) {
  const result = await client.query(`
    SELECT column_name
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'interview_participants'
       AND column_name IN ('legacy_id', 'interview_result', 'interview_history', 'resource_errors')
  `);
  if (result.rowCount !== 4) {
    throw new Error("PostgreSQL interview runtime fields are missing. Run migrations 003/004 first.");
  }
}

async function readInterviewState(client) {
  const slotResult = await client.query(`
      SELECT *
        FROM interview_slots
       ORDER BY interview_date, interview_time, created_at
    `);
  const participantResult = await client.query(`
      SELECT
        p.*,
        cp.telegram_user_id,
        cp.telegram_chat_id,
        cp.telegram_username,
        cp.full_name,
        cp.phone,
        cp.source
      FROM interview_participants p
      JOIN candidate_profiles cp ON cp.id = p.candidate_profile_id
      ORDER BY
        p.waitlist_joined_at NULLS LAST,
        p.created_at,
        p.id
    `);
  const resourceResult = await client.query(`
      SELECT *
        FROM candidate_resource_deliveries
       ORDER BY sequence_no, created_at
    `);
  const clickResult = await client.query(`
      SELECT *
        FROM candidate_link_clicks
       ORDER BY clicked_at
    `);
  const notificationResult = await client.query(`
      SELECT *
        FROM notifications
       WHERE interview_participant_id IS NOT NULL
          OR interview_slot_id IS NOT NULL
       ORDER BY created_at DESC
       LIMIT 200
    `);
  const eventResult = await client.query(`
      SELECT *
        FROM candidate_events
       WHERE interview_participant_id IS NOT NULL
          OR interview_slot_id IS NOT NULL
       ORDER BY created_at DESC
       LIMIT 160
    `)
  ;

  const resourcesByParticipant = groupBy(resourceResult.rows, "interview_participant_id");
  const clicksByParticipant = groupBy(clickResult.rows, "interview_participant_id");
  const maxUpdatedAt = newestTimestamp([
    ...slotResult.rows.map((row) => row.updated_at),
    ...participantResult.rows.map((row) => row.updated_at),
    ...notificationResult.rows.map((row) => row.updated_at)
  ]);

  const slots = slotResult.rows.map(rowToSlot);
  const candidates = participantResult.rows.map((row) =>
    rowToCandidate(row, resourcesByParticipant.get(row.id) || [], clicksByParticipant.get(row.id) || [])
  );
  const notifications = notificationResult.rows.map(rowToNotification);
  const events = eventResult.rows.map(rowToEvent);

  return deriveState({
    schemaVersion: 3,
    version: Number(maxUpdatedAt ? Date.parse(maxUpdatedAt) : 1),
    updatedAt: maxUpdatedAt || new Date().toISOString(),
    settings: defaultSettings(),
    slots,
    candidates,
    notifications,
    events
  });
}

async function prepareStateIds(client, inputState, inputResult = {}) {
  const state = structuredClone(deriveState(inputState));
  const result = structuredClone(inputResult || {});
  const existing = await loadExistingIdentityMaps(client);
  const slotIdMap = new Map();
  const candidateIdMap = new Map();

  for (const slot of state.slots) {
    const oldId = clean(slot.id);
    const legacyId = clean(slot.legacyId || (!isUuid(oldId) ? oldId : ""));
    const mapped = isUuid(oldId)
      ? oldId
      : existing.slotIdByLegacyId.get(oldId) || existing.slotIdByLegacyId.get(legacyId) || randomUUID();
    slotIdMap.set(oldId, mapped);
    slot.id = mapped;
    slot.legacyId = legacyId || clean(slot.legacyId);
  }

  for (const candidate of state.candidates) {
    const oldId = clean(candidate.id);
    const legacyId = clean(candidate.legacyId || (!isUuid(oldId) ? oldId : ""));
    const mapped = isUuid(oldId)
      ? oldId
      : existing.participantIdByLegacyId.get(oldId) || existing.participantIdByLegacyId.get(legacyId) || randomUUID();
    candidateIdMap.set(oldId, mapped);
    candidate.id = mapped;
    candidate.legacyId = legacyId || clean(candidate.legacyId);
  }

  translateStateReferences(state, { slotIdMap, candidateIdMap });
  translateResultReferences(result, { slotIdMap, candidateIdMap });

  return { state: deriveState(state), result };
}

async function replaceInterviewState(client, inputState) {
  const state = deriveState(inputState);
  const existing = await loadExistingIdentityMaps(client);
  const profileIdByCandidateId = await upsertCandidateProfiles(client, state.candidates, existing);
  const slotRows = state.slots.map(slotToRow);
  const participantRows = state.candidates.map((candidate) => candidateToParticipantRow(candidate, profileIdByCandidateId));

  await deleteInterviewRuntimeRows(client);
  await insertSlots(client, slotRows);
  await insertParticipants(client, participantRows);
  await insertResourceDeliveries(client, state.candidates, profileIdByCandidateId);
  await insertLinkClicks(client, state.candidates, profileIdByCandidateId);
  await insertNotifications(client, state.notifications, state.candidates, profileIdByCandidateId);
  await insertEvents(client, state.events, state.candidates, profileIdByCandidateId);

  return await readInterviewState(client);
}

async function loadExistingIdentityMaps(client) {
  const slotResult = await client.query("SELECT id, legacy_id FROM interview_slots");
  const participantResult = await client.query("SELECT id, legacy_id, candidate_profile_id FROM interview_participants");
  const profileResult = await client.query("SELECT id, telegram_user_id FROM candidate_profiles WHERE telegram_user_id IS NOT NULL");

  return {
    slotIdByLegacyId: new Map(slotResult.rows.map((row) => [clean(row.legacy_id), row.id]).filter(([key]) => key)),
    participantIdByLegacyId: new Map(participantResult.rows.map((row) => [clean(row.legacy_id), row.id]).filter(([key]) => key)),
    profileIdByParticipantId: new Map(participantResult.rows.map((row) => [row.id, row.candidate_profile_id])),
    profileIdByTelegramId: new Map(profileResult.rows.map((row) => [clean(row.telegram_user_id), row.id]).filter(([key]) => key))
  };
}

async function upsertCandidateProfiles(client, candidates, existing) {
  const profileIdByCandidateId = new Map();

  for (const candidate of candidates) {
    const telegramId = clean(candidate.telegramId) || null;
    const plannedProfileId =
      existing.profileIdByParticipantId.get(candidate.id) ||
      (telegramId ? existing.profileIdByTelegramId.get(telegramId) : null) ||
      randomUUID();
    const username = normalizeTelegramUsername(candidate.telegram);
    const stage = ACTIVE_PROFILE_STAGES.has(candidate.candidateLayerStatus)
      ? candidate.candidateLayerStatus
      : "candidate_created";

    if (telegramId) {
      const result = await client.query(`
        INSERT INTO candidate_profiles (
          id, telegram_user_id, telegram_chat_id, telegram_username,
          full_name, phone, source, current_stage, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (telegram_user_id) DO UPDATE
          SET telegram_chat_id = COALESCE(EXCLUDED.telegram_chat_id, candidate_profiles.telegram_chat_id),
              telegram_username = COALESCE(NULLIF(EXCLUDED.telegram_username, ''), candidate_profiles.telegram_username),
              full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), candidate_profiles.full_name),
              phone = COALESCE(NULLIF(EXCLUDED.phone, ''), candidate_profiles.phone),
              source = COALESCE(NULLIF(EXCLUDED.source, ''), candidate_profiles.source),
              current_stage = CASE
                WHEN candidate_profiles.current_stage LIKE 'internship_%' THEN candidate_profiles.current_stage
                ELSE EXCLUDED.current_stage
              END,
              updated_at = EXCLUDED.updated_at
        RETURNING id
      `, [
        plannedProfileId,
        telegramId,
        telegramId,
        username,
        clean(candidate.name),
        clean(candidate.phone),
        clean(candidate.source) || "sobes",
        stage,
        timestamp(candidate.createdAt),
        timestamp(candidate.updatedAt)
      ]);
      profileIdByCandidateId.set(candidate.id, result.rows[0].id);
    } else {
      await client.query(`
        INSERT INTO candidate_profiles (
          id, telegram_user_id, telegram_chat_id, telegram_username,
          full_name, phone, source, current_stage, created_at, updated_at
        ) VALUES ($1, NULL, NULL, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE
          SET telegram_username = EXCLUDED.telegram_username,
              full_name = EXCLUDED.full_name,
              phone = EXCLUDED.phone,
              source = EXCLUDED.source,
              current_stage = EXCLUDED.current_stage,
              updated_at = EXCLUDED.updated_at
      `, [
        plannedProfileId,
        username,
        clean(candidate.name),
        clean(candidate.phone),
        clean(candidate.source) || "sobes",
        stage,
        timestamp(candidate.createdAt),
        timestamp(candidate.updatedAt)
      ]);
      profileIdByCandidateId.set(candidate.id, plannedProfileId);
    }
  }

  return profileIdByCandidateId;
}

async function deleteInterviewRuntimeRows(client) {
  await client.query(`
    DELETE FROM notifications
     WHERE interview_participant_id IS NOT NULL
        OR interview_slot_id IS NOT NULL
  `);
  await client.query(`
    DELETE FROM candidate_events
     WHERE interview_participant_id IS NOT NULL
        OR interview_slot_id IS NOT NULL
  `);
  await client.query("DELETE FROM candidate_link_clicks WHERE interview_participant_id IS NOT NULL");
  await client.query("DELETE FROM candidate_resource_deliveries WHERE interview_participant_id IS NOT NULL");
  await client.query("DELETE FROM interview_participants");
  await client.query("DELETE FROM interview_slots");
}

async function insertSlots(client, rows) {
  for (const row of rows) {
    await client.query(`
      INSERT INTO interview_slots (
        id, legacy_id, title, interview_date, interview_time, timezone,
        venue_id, venue_label, venue_address, seats, status,
        directions_material_id, booking_text, template_cleared,
        completed_at, created_by_telegram_user_id, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14,
        $15, $16, $17, $18
      )
    `, [
      row.id,
      row.legacyId,
      row.title,
      row.date,
      row.time,
      row.timezone,
      row.venueId,
      row.venue,
      row.venueAddress,
      row.seats,
      row.status,
      row.directionsMaterialId,
      row.bookingText,
      row.templateCleared,
      row.completedAt,
      row.createdByTelegramUserId,
      row.createdAt,
      row.updatedAt
    ]);
  }
}

async function insertParticipants(client, rows) {
  for (const row of rows) {
    await client.query(`
      INSERT INTO interview_participants (
        id, legacy_id, candidate_profile_id, interview_slot_id, waitlist_target_slot_id,
        status, candidate_layer_status, confirmation_status,
        confirmation_requested_at, confirmed_at, declined_at,
        attendance_status, attendance_marked_at,
        registration_status, registration_instructions_sent_at,
        registration_confirmed_at, materials_available_at, materials_sent_at,
        resources_sent_at, left_after_interview_at, waitlist_joined_at,
        last_waitlist_notified_at, internship_stage, recruiter_note,
        interview_result, result_reason, result_marked_at,
        loss_reason, loss_reason_comment, loss_reason_marked_at,
        interview_history, resource_errors,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8,
        $9, $10, $11,
        $12, $13,
        $14, $15,
        $16, $17, $18,
        $19, $20, $21,
        $22, $23, $24,
        $25, $26, $27,
        $28, $29, $30,
        $31::jsonb, $32::jsonb,
        $33, $34
      )
    `, [
      row.id,
      row.legacyId,
      row.candidateProfileId,
      row.interviewSlotId,
      row.waitlistTargetSlotId,
      row.status,
      row.candidateLayerStatus,
      row.confirmationStatus,
      row.confirmationRequestedAt,
      row.confirmedAt,
      row.declinedAt,
      row.attendanceStatus,
      row.attendanceMarkedAt,
      row.registrationStatus,
      row.registrationInstructionsSentAt,
      row.registrationConfirmedAt,
      row.materialsAvailableAt,
      row.materialsSentAt,
      row.resourcesSentAt,
      row.leftAfterInterviewAt,
      row.waitlistJoinedAt,
      row.lastWaitlistNotifiedAt,
      row.internshipStage,
      row.recruiterNote,
      row.interviewResult,
      row.resultReason,
      row.resultMarkedAt,
      row.lossReason,
      row.lossReasonComment,
      row.lossReasonMarkedAt,
      JSON.stringify(row.interviewHistory),
      JSON.stringify(row.resourceErrors),
      row.createdAt,
      row.updatedAt
    ]);
  }
}

async function insertResourceDeliveries(client, candidates, profileIdByCandidateId) {
  for (const candidate of candidates) {
    const profileId = profileIdByCandidateId.get(candidate.id);
    for (const step of Array.isArray(candidate.resourceStepsSent) ? candidate.resourceStepsSent : []) {
      const type = clean(step.type);
      if (!RESOURCE_SEQUENCE.includes(type)) continue;
      const sentAt = timestamp(step.sentAt || candidate.resourcesSentAt || candidate.materialsSentAt || candidate.updatedAt);
      await client.query(`
        INSERT INTO candidate_resource_deliveries (
          id, candidate_profile_id, interview_participant_id, resource_type,
          sequence_no, status, sent_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 'sent', $6, $6, $6)
        ON CONFLICT DO NOTHING
      `, [
        randomUUID(),
        profileId,
        candidate.id,
        type,
        RESOURCE_SEQUENCE.indexOf(type) + 1,
        sentAt
      ]);
    }
  }
}

async function insertLinkClicks(client, candidates, profileIdByCandidateId) {
  for (const candidate of candidates) {
    const profileId = profileIdByCandidateId.get(candidate.id);
    for (const click of Array.isArray(candidate.linkClicks) ? candidate.linkClicks : []) {
      const linkType = clean(click.linkType || click.type);
      if (!linkType) continue;
      await client.query(`
        INSERT INTO candidate_link_clicks (
          id, candidate_profile_id, interview_participant_id,
          link_type, url, clicked_at, source
        ) VALUES ($1, $2, $3, $4, $5, $6, 'telegram_webapp')
        ON CONFLICT DO NOTHING
      `, [
        randomUUID(),
        profileId,
        candidate.id,
        linkType,
        clean(click.url),
        timestamp(click.clickedAt || candidate.updatedAt)
      ]);
    }
  }
}

async function insertNotifications(client, notifications, candidates, profileIdByCandidateId) {
  const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  for (const notification of notifications.slice(0, 200)) {
    const candidate = candidateById.get(notification.candidateId);
    const profileId = candidate ? profileIdByCandidateId.get(candidate.id) : null;
    await client.query(`
      INSERT INTO notifications (
        id, candidate_profile_id, interview_slot_id, interview_participant_id,
        type, chat_id, chat_target, text, title, channel, media, actions,
        status, telegram_message_id, error, idempotency_key, sent_at,
        keyboard_cleared_at, delivery_note, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, 'candidate', $7, $8, $9, $10::jsonb, $11::jsonb,
        $12, $13, $14, $15, $16,
        $17, $18, $19, $20
      )
    `, [
      isUuid(notification.id) ? notification.id : randomUUID(),
      profileId,
      clean(notification.slotId) || null,
      clean(notification.candidateId) || null,
      clean(notification.type || "interview_notification"),
      clean(notification.telegramChatId || candidate?.telegramId),
      notification.message || "",
      clean(notification.title),
      clean(notification.channel || "telegram"),
      JSON.stringify(Array.isArray(notification.media) ? notification.media : []),
      JSON.stringify(Array.isArray(notification.actions) ? notification.actions : []),
      normalizeNotificationStatus(notification.status),
      clean(notification.telegramMessageId) || null,
      clean(notification.deliveryError) || null,
      `interview:${clean(notification.id) || randomUUID()}`,
      optionalTimestamp(notification.sentAt),
      optionalTimestamp(notification.keyboardClearedAt),
      clean(notification.deliveryNote),
      timestamp(notification.createdAt),
      timestamp(notification.updatedAt || notification.sentAt || notification.createdAt)
    ]);
  }
}

async function insertEvents(client, events, candidates, profileIdByCandidateId) {
  const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  for (const event of events.slice(0, 160)) {
    const candidate = candidateById.get(event.candidateId);
    const profileId = candidate ? profileIdByCandidateId.get(candidate.id) : null;
    const slotId = clean(event.slotId) || null;
    const participantId = clean(event.candidateId) || null;
    if (!slotId && !participantId) continue;
    await client.query(`
      INSERT INTO candidate_events (
        id, candidate_profile_id, interview_slot_id, interview_participant_id,
        event_type, actor_type, actor_telegram_user_id, payload, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
    `, [
      isUuid(event.id) ? event.id : randomUUID(),
      profileId,
      slotId,
      participantId,
      clean(event.type || event.eventType || "interview_event"),
      normalizeActorType(event.actor),
      clean(event.actorTelegramUserId) || null,
      JSON.stringify(publicEventPayload(event)),
      timestamp(event.createdAt)
    ]);
  }
}

function rowToSlot(row) {
  return {
    id: row.id,
    legacyId: clean(row.legacy_id),
    title: row.title,
    date: dateOnly(row.interview_date),
    time: timeOnly(row.interview_time),
    timezone: row.timezone,
    venueId: row.venue_id,
    venue: row.venue_label,
    venueAddress: row.venue_address,
    seats: Number(row.seats),
    status: row.status,
    directionsMaterialId: row.directions_material_id,
    bookingText: row.booking_text,
    templateCleared: Boolean(row.template_cleared),
    completedAt: iso(row.completed_at),
    createdByTelegramUserId: clean(row.created_by_telegram_user_id),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at)
  };
}

function rowToCandidate(row, resourceRows, clickRows) {
  const failedResources = resourceRows
    .filter((item) => item.status === "failed")
    .map((item) => ({ type: item.resource_type, message: item.error || "Не удалось отправить" }));
  return {
    id: row.id,
    legacyId: clean(row.legacy_id),
    telegramId: clean(row.telegram_user_id),
    telegram: row.telegram_username ? `@${row.telegram_username}` : "",
    name: row.full_name,
    phone: row.phone,
    source: row.source || "sobes",
    note: row.recruiter_note,
    status: row.status,
    candidateLayerStatus: row.candidate_layer_status,
    interviewSlotId: row.interview_slot_id,
    waitlistJoinedAt: iso(row.waitlist_joined_at),
    waitlistTargetSlotId: row.waitlist_target_slot_id,
    lastWaitlistNotifiedAt: iso(row.last_waitlist_notified_at),
    confirmationStatus: row.confirmation_status,
    confirmationRequestedAt: iso(row.confirmation_requested_at),
    confirmedAt: iso(row.confirmed_at),
    declinedAt: iso(row.declined_at),
    attendanceStatus: row.attendance_status,
    attendanceMarkedAt: iso(row.attendance_marked_at),
    interviewResult: row.interview_result || "pending",
    resultReason: row.result_reason || "",
    resultMarkedAt: iso(row.result_marked_at),
    registrationStatus: row.registration_status,
    registrationInstructionsSentAt: iso(row.registration_instructions_sent_at),
    registrationConfirmedAt: iso(row.registration_confirmed_at),
    materialsAvailableAt: iso(row.materials_available_at),
    materialsSentAt: iso(row.materials_sent_at),
    resourcesSentAt: iso(row.resources_sent_at),
    resourceStepsSent: resourceRows
      .filter((item) => item.status === "sent")
      .map((item) => ({ type: item.resource_type, sentAt: iso(item.sent_at || item.created_at) })),
    resourceErrors: [...jsonArray(row.resource_errors), ...failedResources],
    leftAfterInterviewAt: iso(row.left_after_interview_at),
    interviewHistory: jsonArray(row.interview_history),
    internshipStage: row.internship_stage,
    lossReason: row.loss_reason,
    lossReasonComment: row.loss_reason_comment,
    lossReasonMarkedAt: iso(row.loss_reason_marked_at),
    linkClicks: clickRows.map((click) => ({
      linkType: click.link_type,
      url: click.url,
      clickedAt: iso(click.clicked_at)
    })),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at)
  };
}

function rowToNotification(row) {
  return {
    id: row.id,
    candidateId: row.interview_participant_id,
    slotId: row.interview_slot_id,
    type: row.type,
    title: row.title || "",
    message: row.text || "",
    media: jsonArray(row.media),
    actions: jsonArray(row.actions),
    status: normalizeNotificationStatus(row.status),
    channel: row.channel || row.chat_target || "telegram",
    telegramMessageId: clean(row.telegram_message_id),
    telegramChatId: clean(row.chat_id),
    deliveryError: clean(row.error),
    deliveryNote: clean(row.delivery_note),
    keyboardClearedAt: iso(row.keyboard_cleared_at),
    createdAt: iso(row.created_at),
    sentAt: iso(row.sent_at),
    updatedAt: iso(row.updated_at)
  };
}

function rowToEvent(row) {
  return {
    id: row.id,
    type: row.event_type,
    actor: row.actor_type,
    candidateId: row.interview_participant_id,
    slotId: row.interview_slot_id,
    createdAt: iso(row.created_at),
    ...jsonObject(row.payload)
  };
}

function slotToRow(slot) {
  return {
    id: slot.id,
    legacyId: clean(slot.legacyId || (!isUuid(slot.id) ? slot.id : "")) || null,
    title: clean(slot.title) || "Собеседование LOFT HALL",
    date: slot.date,
    time: slot.time,
    timezone: clean(slot.timezone) || "Europe/Moscow",
    venueId: clean(slot.venueId || "loft23"),
    venue: clean(slot.venue || "LOFT#2/3"),
    venueAddress: clean(slot.venueAddress),
    seats: Math.max(Number(slot.seats || 1), 1),
    status: clean(slot.status || "open"),
    directionsMaterialId: clean(slot.directionsMaterialId),
    bookingText: clean(slot.bookingText),
    templateCleared: Boolean(slot.templateCleared),
    completedAt: optionalTimestamp(slot.completedAt),
    createdByTelegramUserId: clean(slot.createdByTelegramUserId) || null,
    createdAt: timestamp(slot.createdAt),
    updatedAt: timestamp(slot.updatedAt || slot.createdAt)
  };
}

function candidateToParticipantRow(candidate, profileIdByCandidateId) {
  return {
    id: candidate.id,
    legacyId: clean(candidate.legacyId || (!isUuid(candidate.id) ? candidate.id : "")) || null,
    candidateProfileId: profileIdByCandidateId.get(candidate.id),
    interviewSlotId: clean(candidate.interviewSlotId) || null,
    waitlistTargetSlotId: clean(candidate.waitlistTargetSlotId) || null,
    status: clean(candidate.status || "waitlist"),
    candidateLayerStatus: clean(candidate.candidateLayerStatus || "candidate_created"),
    confirmationStatus: clean(candidate.confirmationStatus || "not_requested"),
    confirmationRequestedAt: optionalTimestamp(candidate.confirmationRequestedAt),
    confirmedAt: optionalTimestamp(candidate.confirmedAt),
    declinedAt: optionalTimestamp(candidate.declinedAt),
    attendanceStatus: clean(candidate.attendanceStatus || "unknown"),
    attendanceMarkedAt: optionalTimestamp(candidate.attendanceMarkedAt),
    registrationStatus: clean(candidate.registrationStatus || "not_started"),
    registrationInstructionsSentAt: optionalTimestamp(candidate.registrationInstructionsSentAt),
    registrationConfirmedAt: optionalTimestamp(candidate.registrationConfirmedAt),
    materialsAvailableAt: optionalTimestamp(candidate.materialsAvailableAt),
    materialsSentAt: optionalTimestamp(candidate.materialsSentAt),
    resourcesSentAt: optionalTimestamp(candidate.resourcesSentAt),
    leftAfterInterviewAt: optionalTimestamp(candidate.leftAfterInterviewAt),
    waitlistJoinedAt: optionalTimestamp(candidate.waitlistJoinedAt),
    lastWaitlistNotifiedAt: optionalTimestamp(candidate.lastWaitlistNotifiedAt),
    internshipStage: clean(candidate.internshipStage || "candidate_layer"),
    recruiterNote: clean(candidate.note),
    interviewResult: clean(candidate.interviewResult || "pending"),
    resultReason: clean(candidate.resultReason),
    resultMarkedAt: optionalTimestamp(candidate.resultMarkedAt),
    lossReason: clean(candidate.lossReason),
    lossReasonComment: clean(candidate.lossReasonComment),
    lossReasonMarkedAt: optionalTimestamp(candidate.lossReasonMarkedAt),
    interviewHistory: Array.isArray(candidate.interviewHistory) ? candidate.interviewHistory : [],
    resourceErrors: Array.isArray(candidate.resourceErrors) ? candidate.resourceErrors : [],
    createdAt: timestamp(candidate.createdAt),
    updatedAt: timestamp(candidate.updatedAt || candidate.createdAt)
  };
}

function translateStateReferences(state, maps) {
  for (const candidate of state.candidates) {
    candidate.interviewSlotId = mapNullable(candidate.interviewSlotId, maps.slotIdMap);
    candidate.waitlistTargetSlotId = mapNullable(candidate.waitlistTargetSlotId, maps.slotIdMap);
    candidate.interviewHistory = (candidate.interviewHistory || []).map((item) => ({
      ...item,
      slotId: mapNullable(item.slotId, maps.slotIdMap)
    }));
  }

  for (const notification of state.notifications) {
    notification.candidateId = mapNullable(notification.candidateId, maps.candidateIdMap);
    notification.slotId = mapNullable(notification.slotId, maps.slotIdMap);
    notification.actions = (notification.actions || []).map((action) => ({
      ...action,
      callbackData: translateCallbackData(action.callbackData, maps)
    }));
  }

  for (const event of state.events) {
    event.candidateId = mapNullable(event.candidateId, maps.candidateIdMap);
    event.slotId = mapNullable(event.slotId, maps.slotIdMap);
  }
}

function translateResultReferences(result, maps) {
  if (result.candidateId) result.candidateId = mapNullable(result.candidateId, maps.candidateIdMap);
  if (result.slotId) result.slotId = mapNullable(result.slotId, maps.slotIdMap);
}

function translateCallbackData(value, maps) {
  const parts = clean(value).split(":");
  if (parts[0] === "confirm" && parts.length >= 3) {
    parts[2] = mapNullable(parts[2], maps.candidateIdMap) || parts[2];
    return parts.join(":");
  }
  if (parts[0] === "waitlist" && parts.length >= 4) {
    parts[2] = mapNullable(parts[2], maps.slotIdMap) || parts[2];
    parts[3] = mapNullable(parts[3], maps.candidateIdMap) || parts[3];
    return parts.join(":");
  }
  return value;
}

function mapNullable(value, map) {
  const key = clean(value);
  if (!key) return null;
  return map.get(key) || key;
}

function normalizeTelegramUsername(value) {
  return clean(value).replace(/^@+/, "");
}

function normalizeNotificationStatus(value) {
  const status = clean(value || "pending");
  return ["pending", "sending", "sent", "skipped", "failed"].includes(status) ? status : "pending";
}

function normalizeActorType(value) {
  const actor = clean(value || "system");
  if (["candidate", "trainee", "recruiter", "mentor", "system", "worker", "migration"].includes(actor)) return actor;
  if (["telegram", "telegram_link"].includes(actor)) return "candidate";
  return "system";
}

function publicEventPayload(event = {}) {
  const payload = { ...event };
  delete payload.id;
  delete payload.type;
  delete payload.eventType;
  delete payload.actor;
  delete payload.actorTelegramUserId;
  delete payload.candidateId;
  delete payload.slotId;
  delete payload.createdAt;
  return payload;
}

function groupBy(rows, field) {
  const groups = new Map();
  for (const row of rows) {
    const key = row[field];
    if (!key) continue;
    const group = groups.get(key) || [];
    group.push(row);
    groups.set(key, group);
  }
  return groups;
}

function newestTimestamp(values) {
  const times = values
    .map((value) => (value ? Date.parse(value instanceof Date ? value.toISOString() : value) : 0))
    .filter(Boolean);
  if (!times.length) return new Date().toISOString();
  return new Date(Math.max(...times)).toISOString();
}

function optionalTimestamp(value) {
  const raw = clean(value);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function timestamp(value) {
  return optionalTimestamp(value) || new Date().toISOString();
}

function iso(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function dateOnly(value) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function timeOnly(value) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

function jsonArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function jsonObject(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (!value) return {};
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clean(value));
}

function clean(value) {
  return String(value || "").trim();
}
