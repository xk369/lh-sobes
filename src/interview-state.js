const ACTIVE_INTERVIEW_RESULTS = new Set(["fit", "not_fit", "self_declined", "russian_low", "other"]);
const LOSS_REASONS = new Set(["date_time", "location", "circumstances", "conditions", "other_offer", "other"]);
const LEGACY_ROUTE_FILE_ID = "BQACAgIAAxkBAAEN-k5qfIMhAAEX8Gze0K4MJb99RKa6PfwAAmyjAAIyAeBLJj6vMEwvGvU9BA";
const LOFT_23_ROUTE_FILE_ID = "BAACAgIAAxkBAAEN-nBqfJNGc4zIAlyz1Vtm5coWB8LiigACWKQAAjIB4EsUwGqbL0OWxT0E";
const LOFT_4_ROUTE_FILE_ID = "BAACAgIAAxkBAAEN-mtqfJMfDgp6Um1ZOtCAnaofrk7XtAAC34EAArrpUEsVzMBYFr-_DT0E";
const LEGACY_BOOKING_TEXT = "Вы записаны на собеседование. Сохраните адрес и приходите за 10 минут до начала.";
const DEFAULT_BOOKING_TEXT = `РАБОТАЙТЕ В ОДНОМ ИЗ ЛУЧШИХ EVENT-ПРОЕКТОВ ДВУХ СТОЛИЦ!

LOFT HALL – это комплекс из 7 особняков, более 30 event-пространств в самом центре Москвы. Обладатель премий: «Лучшая городская площадка для проведения свадьбы 2024», «Событие года», «Лучшая городская event-площадка 2023» и «Лучшая площадка России для проведения мероприятий 2025».

Каждый год проводим более 1900 мероприятий всех форматов, масштабы – от 30 до 5000 гостей.

Бизнес-тренинги и роскошные свадьбы на сотни гостей, презентации автомобилей и закрытые музыкальные тусовки – это не рабочая рутина, а причастность к созданию уникальных событий.

Мы – часть дома ивентов LOFT HALL, состоящего из авторских пространств в сердце Москвы и Санкт-Петербурга. Наша концепция – первоклассное обслуживание, изысканная кухня и топовое оборудование в стильных интерьерах от голландского дизайнера Placebo/25 Development.

Мы формируем команду для постоянной работы в пространствах LOFT#1, #2-3, #4, #8 ,THE BIRCH или подработки по графику, который выбираете вы. Круглый год у нас проходят мероприятия всех форматов с несколькими сотнями молодых сотрудников. Своя школа сервиса, гостеприимства и повышения качества.

🎉 Мы предлагаем:

• свободный график;
• бесплатное обучение тонкостям профессии и оплачиваемые стажировки;
• оплату с первого часа работы;
• плановое повышение ставок в сезоны высокой загрузки;
• выплаты раз в неделю в офисе компании или устройство по самозанятости;
• обед от наших поваров;
• компенсацию такси от 700 руб. после 00:35;
• возможность совмещения нескольких вакансий внутри департамента;
• работу в молодом коллективе и стильных пространствах в центре города;
• неформальные встречи, фотосессии внутри лофтов и многое другое.

Работайте на постоянной позиции или в графике, который подходит именно вам.
Совмещайте учёбу и карьерный рост, получайте уникальный опыт в сфере гостеприимства!

🎉 Действуйте, чтобы стать частью масштабного проекта LOFT HALL:

Этап 1. Оплачиваемые стажировочные смены для сотрудников без опыта работы:

Вы познакомитесь с компанией изнутри, изучите залы и техническое оснащение, инвентарь и логистику. Средняя загруженность полной рабочей смены – 10-12 ч, график выбираете вы себе сами, оплата от 400 руб/час. Разовая стажировка (по желанию) - 1000 рублей за 6 часов выполнения практических заданий от старшего официанта на банкете.

Этап 2. Бесплатный Welcome-тренинг (по желанию):

1я часть – теория: презентация LOFT HALL, обсуждение стандартов внутренних коммуникаций и корпоративной культуры, особенностей сервиса в индустрии гостеприимства.
2я часть – практика: знакомство с правилами обслуживания гостей на банкетных мероприятиях.

Этап 3. Переход из статуса стажера в опытные сотрудники:

На основе этапов 1 и 2 вам будет предложено пройти тестирование на усвоение материала. По итогу положительного прохождения стажировки вы сможете получать приглашения и выходить на все форматы мероприятий и фестивали в свободном режиме.

Этап 4. Профессиональное развитие и рост:

Проявляя инициативу, ответственность и пунктуальность, ориентируясь в наших пространствах и работая в сменах не менее 3 раз в неделю, вы можете стать «постоянным официантом» LOFT HALL по ставке от 450 руб/час.

🎉 Возможности карьерного роста для всех:

• Проявляйте коммуникативные и организационные навыки, обучайте новых сотрудников, помогайте банкетному менеджеру в построении зала к мероприятию, чтобы стать супервайзером по ставке от 500-550 руб/час;
• Вырастите из супервайзера в помощника банкетного менеджера на отличных условиях;
• Займите интересную позицию в любом из направлений компании Placebo/25, если интересна работа в других департаментах!

Станьте частью команды, организующей самые яркие события Москвы!

https://msk.lofthall.ru/mobile`;
const WORK_LINKS_MESSAGE = `Бот для записи на смену
@LoftHallStaffBot

Группа НЕАТТЕСТОВАННЫЕ
https://t.me/+tpUuI31XJyA2ZWFi

База знаний
@LOFT_HELPER_V2_BOT`;
const SELF_EMPLOYMENT_MESSAGE = `‼️📑ИНСТРУКЦИЯ
«КАК СТАТЬ САМОЗАНЯТЫМ»

Все, кто хочет получать зарплату на карту или уже писал в личные сообщения — внимательно следуйте инструкции ниже.

~~~

1. Установите два приложения:

- Jump.Работа
- Мой Налог

~~~

2. Зарегистрируйтесь в приложении «Мой Налог».

Бухгалтер сориентирует вас как все заполнить.

Нужно будет ввести ПАСПОРТНЫЕ ДАННЫЕ и данные БАНКОВСКОЙ КАРТЫ, на которую удобно получать заработную плату.

~~~

3. Переходите в телеграмм группу «Самозанятость МСК» и отправляете свои данные по шаблону:

«Самозанятость МСК»
👉 https://t.me/+XejcuYf5gmE2Nzdi

Шаблон:
Самозанятость официант Москва
ФИО
номер телефона (который прикрепили в «Мой налог»)
банк по СБП (который прикрепили в «Мой налог»)

Пример:
«Самозанятость официант Москва, Иванов Иван Иванович, +79991234567, Сбербанк»

⚠️ ВАЖНО:

На данный момент группа «Самозанятость МСК» закрыта до 15.05 - это примерная дата.
Вы не сможете туда отправлять сообщения. Поэтому свои данные вы «ВРЕМЕННО» отправляете бухгалтеру в лс. Телеграмм бухгалтера 👉🏼 @Dina_LoftHall

⚠️ Бухгалтеру вы отправляете только данные по шаблону и всё!
Вы не ведете диалог с бухгалтером, не пишите постоянно ей в ЛС.

~~~

4. Далее всю информацию, касаемо заработной платы вы будете получать в группе «Самозанятость МСК»

Все дальнейшее общение только в группе. НЕ ПИСАТЬ в лс бухгалтерии!

~~~

5. Ссылка на договор

Когда вы отправите данные бухгалтеру по шаблону, она ответным сообщением отправит вам ссылку на договор с нашей компанией.

Переходите по ссылке, он перенесет вас в приложение «Мой налог» внутри вы подпишите договор.

После переходите в приложение Jump.Работа и вновь подписываете договор.

⚠️ВАЖНО:
Только после этих двух шагов деньги начнут поступать на карту.

⚠️ ВАЖНО:
Данные в «Мой налог» и Jump.Работа должны полностью совпадать.

Это номер телефона, паспортные данные и данные банковской карты.

~~~

6. Выплаты и налог

💰 Выплаты приходят стабильно каждую пятницу — за прошлую рабочую неделю.
Дни недели могут смещаться. Мы заранее будем вас предупреждать об этом в группе «Неаттестованные».

🧾 Налог оплачивает сотрудник.

Если вы заработали 10 000 ₽ — на карту придёт 10 600 ₽,
и 600 ₽ - это налог.

Налог оплачиваете вы самостоятельно в конце или в начале следующего месяца за ПРЕДЫДУЩИЙ МЕСЯЦ работы.

Пример:
За месяц работы у вас на карте скопилось 5000₽ на оплату налога.
В приложении «Мой налог» появится уведомление о погашение прошлого периода (предыдущего месяца).
И вы просто спокойно оплачиваете его в приложении.

~~~

7. Выплаты на доверенное лицо

Если вы по каким-то причинам НЕ МОЖЕТЕ зарегистрироваться как самозанятый:

Вариант 1. 👉🏼 Получает ваш коллега.

Вы пишете расписку на сотрудника, который уже получает выплаты как СЗ в нашей компании.
Шаблон расписки можно получить в офисе.
Сдаёте оригинал в бухгалтерию.
Бухгалтерия будет фиксировать вам суммы, чтобы вы знали свою реальную заработанную сумму.

Вариант 2. 👉🏼 Получает человек, который НЕ РАБОТАЕТ в компании.

Действия такие же, как в варианте №1:

Делаете расписку
Человек получает деньги за вас

После чего переходите в Telegram-группу и пишите по шаблону:

«Самозанятость официант Москва, Иванов Иван Иванович (ФИО того, кто получает деньги), получает за Петрова Петра Петровича (ваше ФИО), номер телефона (человека, который получает деньги), банк».`;
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
        venueId: "loft2",
        venue: "LOFT#2",
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
        venueId: "loft4",
        venue: "LOFT #4",
        venueAddress: "2-й Кожуховский проезд, 29к6",
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
        title: "Материалы LOFT HALL: регистрация в основной базе",
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
  state.schemaVersion = Number(state.schemaVersion || 3);
  state.version = Number(state.version || 1);
  state.settings = normalizeSettings(state.settings);
  state.slots = Array.isArray(state.slots) ? state.slots : [];
  state.candidates = Array.isArray(state.candidates) ? state.candidates.map(normalizeCandidate) : [];
  state.notifications = Array.isArray(state.notifications) ? state.notifications : [];
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
      if (availableSeats(state, slot.id) < 1) throw new Error("No seats left for this slot");

      const candidate = upsertCandidate(state, payload.candidate || payload, now);
      applyBooking(candidate, slot.id, now);
      appendNotification(state, candidate.id, "booking_created", now, {
        title: "Вы записаны на собеседование",
        message: `${slot.date} в ${slot.time}, ${slotPlaceLine(slot)}. За день до собеседования придет запрос подтверждения.`,
        slotId: slot.id
      });
      appendBookingMaterials(state, candidate, slot, now);
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
      const venue = resolveInterviewVenue(state.settings, payload);
      const templateCleared = payload.templateCleared === true || payload.templateCleared === "true";
      const slot = {
        id: payload.id || nextId("slot", state.slots),
        title: "Собеседование LOFT HALL",
        date: requireText(payload.date, "Slot date is required"),
        time: requireText(payload.time, "Slot time is required"),
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

    case "request_confirmation":
    case "send_due_confirmations": {
      const targets = getCandidateTargets(state, payload).filter((candidate) =>
        ["booked", "confirmation_pending"].includes(candidate.status) &&
        !["confirmed", "declined"].includes(candidate.confirmationStatus)
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
            ? `Собеседование ${slot.date} в ${slot.time}, ${slotPlaceLine(slot)}. Выберите: да, приду или нет, не смогу.`
            : "Подтвердите участие в собеседовании.",
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
        requestedCount: targets.length
      });
      result = { requestedCount: targets.length };
      break;
    }

    case "candidate_confirm": {
      const candidate = requireCandidate(state, payload.candidateId);
      const wasDeclined =
        candidate.status === "declined_before_interview" || candidate.confirmationStatus === "declined";
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
        if (!wasDeclined) {
          appendNotification(state, candidate.id, "interview_declined_saved", now, {
            title: "Отказ от собеседования сохранен",
            message: "Мы сняли вас с этой даты. Если захотите вернуться, можно записаться на новую дату или перейти в ожидание следующего собеседования.",
            slotId: candidate.interviewSlotId
          });
        }
      }
      touch(candidate, now);
      appendEvent(state, "candidate_confirmation_answered", actor, now, {
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
          message: "Мы отметили неявку по этой дате. Если хотите попробовать снова, можно записаться на следующую дату или перейти в ожидание нового собеседования.",
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
          title: "Материалы LOFT HALL",
          message: WORK_LINKS_MESSAGE,
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
        if (candidate.attendanceStatus !== "arrived") continue;
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
          title: `Материалы LOFT HALL: ${resourceStep.label}`,
          message: resourceStepMessage(resourceStep),
          slotId: candidate.interviewSlotId
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
        title: "Сотрудничество не начато",
        message: "Мы отметили, что после собеседования вы не продолжили сотрудничество с LOFT HALL. Можно коротко указать причину в мини-приложении.",
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
        appendBookingMaterials(state, candidate, slot, now);
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
    interviewVenues: [
      {
        id: "loft1",
        name: "LOFT#1",
        address: "ул. Ленинская Слобода, 26, стр. 35",
        directionsMaterialId: ""
      },
      {
        id: "loft2",
        name: "LOFT#2",
        address: "ул. Ленинская Слобода, 26с11",
        directionsMaterialId: "loft_23_route"
      },
      {
        id: "loft3",
        name: "LOFT#3",
        address: "ул. Ленинская Слобода, 26с15",
        directionsMaterialId: "loft_23_route"
      },
      {
        id: "loft4",
        name: "LOFT#4",
        address: "2-й Кожуховский проезд, 29к6",
        directionsMaterialId: "loft_4_route"
      }
    ],
    directionMaterials: [
      {
        id: "loft_23_route",
        label: "Проходка LOFT 2/3",
        caption: "Проходка до LOFT 2/3",
        telegramFileId: LOFT_23_ROUTE_FILE_ID,
        telegramMethod: "video"
      },
      {
        id: "loft_4_route",
        label: "Проходка LOFT 4",
        caption: "Проходка до LOFT 4",
        telegramFileId: LOFT_4_ROUTE_FILE_ID,
        telegramMethod: "video"
      }
    ],
    resourceSteps: [
      {
        type: "registration_bot",
        label: "Регистрация в основной базе",
        description: "Ссылка на регистрацию в основной базе",
        url: "https://t.me/LoftHallRegistrationBot",
        message: "Ссылка на регистрацию в основной базе:\n@LoftHallRegistrationBot"
      },
      {
        type: "unattested_group",
        label: "Рабочие ссылки",
        description: "Бот смен, группа неаттестованных и база знаний",
        url: "",
        message: WORK_LINKS_MESSAGE
      },
      {
        type: "self_employment",
        label: "Оформление самозанятости",
        description: "Инструкция по оформлению самозанятости",
        url: "",
        message: SELF_EMPLOYMENT_MESSAGE
      }
    ],
    registrationLinks: [
      {
        type: "registration_bot",
        label: "Регистрация в основной базе",
        description: "Ссылка на регистрацию в основной базе",
        url: "https://t.me/LoftHallRegistrationBot",
        message: "Ссылка на регистрацию в основной базе:\n@LoftHallRegistrationBot"
      },
      {
        type: "unattested_group",
        label: "Рабочие ссылки",
        description: "Бот смен, группа неаттестованных и база знаний",
        url: "",
        message: WORK_LINKS_MESSAGE
      },
      {
        type: "self_employment",
        label: "Оформление самозанятости",
        description: "Инструкция по оформлению самозанятости",
        url: "",
        message: SELF_EMPLOYMENT_MESSAGE
      }
    ]
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
    interviewVenues: interviewVenues.map(normalizeVenue),
    directionMaterials: directionMaterials.map(normalizeDirectionMaterial),
    resourceSteps: resourceSteps.map(normalizeResourceStep),
    registrationLinks: registrationLinks.map(normalizeResourceStep)
  };
}

function mergeDefaultResourceSteps(steps = [], defaults = []) {
  const defaultsByType = new Map(defaults.map((step) => [clean(step.type || step.id), step]));
  const merged = Array.isArray(steps)
    ? steps.map((step) => {
        const type = clean(step?.type || step?.id);
        return defaultsByType.has(type) ? { ...step, ...defaultsByType.get(type) } : step;
      })
    : [];
  const knownTypes = new Set(merged.map((step) => clean(step?.type || step?.id)));
  for (const defaultStep of defaults) {
    const type = clean(defaultStep.type || defaultStep.id);
    if (!knownTypes.has(type)) {
      merged.push(defaultStep);
      knownTypes.add(type);
    }
  }
  return merged;
}

function mergeDefaultVenues(venues = [], defaults = []) {
  const defaultsById = new Map(defaults.map((venue) => [clean(venue.id), venue]));
  const merged = Array.isArray(venues)
    ? venues.map((venue) => ({ ...(defaultsById.get(clean(venue?.id)) || {}), ...venue }))
    : [];
  const knownIds = new Set(merged.map((venue) => clean(venue?.id)));
  for (const defaultVenue of defaults) {
    const id = clean(defaultVenue.id);
    if (!knownIds.has(id)) {
      merged.push(defaultVenue);
      knownIds.add(id);
    }
  }
  return merged;
}

function mergeDefaultDirectionMaterials(materials = [], defaults = []) {
  const defaultsById = new Map(defaults.map((material) => [clean(material.id || material.type), material]));
  const merged = Array.isArray(materials)
    ? materials.map((material) => {
        const id = clean(material?.id || material?.type);
        return defaultsById.has(id) ? { ...material, ...defaultsById.get(id) } : material;
      })
    : [];
  const knownIds = new Set(merged.map((material) => clean(material?.id || material?.type)));
  for (const defaultMaterial of defaults) {
    const id = clean(defaultMaterial.id || defaultMaterial.type);
    if (!knownIds.has(id)) {
      merged.push(defaultMaterial);
      knownIds.add(id);
    }
  }
  return merged;
}

function normalizeVenue(venue = {}) {
  return {
    id: clean(venue.id),
    name: clean(venue.name || venue.venue || "LOFT HALL"),
    address: clean(venue.address),
    directionsMaterialId: clean(venue.directionsMaterialId || venue.routeMaterialId)
  };
}

function normalizeDirectionMaterial(material = {}) {
  const id = clean(material.id || material.type || "route");
  const defaultFileId =
    id === "loft_23_route" ? LOFT_23_ROUTE_FILE_ID : id === "loft_4_route" ? LOFT_4_ROUTE_FILE_ID : "";
  const fileId = defaultFileId || clean(material.telegramFileId || material.fileId || material.file_id);
  const rawMethod = clean(material.telegramMethod || material.method || "video") || "video";
  const telegramMethod = rawMethod === "document" && [LEGACY_ROUTE_FILE_ID, LOFT_23_ROUTE_FILE_ID, LOFT_4_ROUTE_FILE_ID].includes(fileId)
    ? "video"
    : rawMethod;
  return {
    id,
    label: clean(material.label || material.name || "Проходка"),
    caption: clean(material.caption || material.description || "Проходка до площадки"),
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
    message: clean(step.message)
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

function resolveInterviewVenue(settings, payload = {}) {
  const rawVenue = clean(payload.venueId || payload.venue);
  const fromSettings = resolveVenueReference(settings, rawVenue);
  if (fromSettings.id || fromSettings.name !== rawVenue) {
    return fromSettings;
  }

  return {
    id: clean(payload.venueId),
    name: clean(payload.venue) || "LOFT HALL",
    address: clean(payload.venueAddress)
  };
}

function resolveVenueReference(settings, value) {
  const venues = Array.isArray(settings?.interviewVenues) ? settings.interviewVenues : defaultSettings().interviewVenues;
  const normalizedValue = normalizeVenueKey(value);
  const venue = venues.find((item) => item.id === value || normalizeVenueKey(item.name) === normalizedValue);
  if (venue) return normalizeVenue(venue);
  return { id: "", name: clean(value) || "LOFT HALL", address: "", directionsMaterialId: "" };
}

function resolveDirectionMaterial(settings, value) {
  const materials = Array.isArray(settings?.directionMaterials) ? settings.directionMaterials : defaultSettings().directionMaterials;
  const material = materials.find((item) => item.id === value);
  return material ? normalizeDirectionMaterial(material) : null;
}

function defaultBookingText(venue = {}) {
  return DEFAULT_BOOKING_TEXT;
}

function normalizeBookingText(slot = {}, venue = {}) {
  const text = clean(slot.bookingText || slot.confirmationText);
  if (!text || text === LEGACY_BOOKING_TEXT) return defaultBookingText(venue);
  return text;
}

function slotPlaceLine(slot = {}) {
  return [slot.venue, slot.venueAddress].filter(Boolean).join(", ") || "LOFT HALL";
}

function bookingMaterialsMessage(slot = {}) {
  const lines = [];
  if (slot.bookingText) lines.push(slot.bookingText);
  if (slot.venueAddress) lines.push(`Адрес: ${slot.venueAddress}.`);
  if (slot.directionsVideoUrl) lines.push(`Проходка: ${slot.directionsVideoUrl}`);
  if (slot.directionsMaterial?.telegramFileId) lines.push("Проходка до площадки прикреплена отдельным видео.");
  return lines.join(" ");
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
    resourceStepsSent: normalizeResourceStepsSent(payload),
    resourceErrors: normalizeResourceErrors(payload),
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
    resourceStepsSent: normalizeResourceStepsSent(candidate),
    resourceErrors: normalizeResourceErrors(candidate),
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
    venueId: clean(slot.venueId || venue.id),
    venue: clean(slot.venue || venue.name) || "LOFT HALL",
    venueAddress: clean(slot.venueAddress || venue.address),
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
  candidate.telegram = requireText(payload.telegram || candidate.telegram, "Candidate Telegram is required");
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
  candidate.resourceStepsSent = [];
  candidate.resourceErrors = [];
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
      message: `${slot.date} в ${slot.time}, ${slotPlaceLine(slot)}. Можно записаться на эту дату.`,
      slotId: slot.id
    });
  }
  return waitlist.length;
}

function appendBookingMaterials(state, candidate, slot, now) {
  const routeMedia = routeMediaForSlot(slot);
  if (!slot.bookingText && !slot.directionsVideoUrl && !slot.venueAddress && !routeMedia.length) return;
  appendNotification(state, candidate.id, "booking_materials", now, {
    title: "Материалы к собеседованию",
    message: bookingMaterialsMessage(slot),
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
      caption: material.caption || material.label || "Проходка до площадки"
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
    media: normalizeNotificationMedia(payload.media),
    actions: normalizeNotificationActions(payload.actions),
    status: "pending",
    channel: "telegram",
    createdAt: now,
    sentAt: null
  });
  state.notifications = state.notifications.slice(0, 200);
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
          callbackData: clean(action.callbackData || action.callback_data)
        }))
        .filter((action) => action.label && action.callbackData)
    : [];
}

function confirmationAction(candidateId, decision) {
  return {
    label: decision === "yes" ? "Да, приду" : "Нет, не смогу",
    callbackData: `confirm:${decision}:${candidateId}`
  };
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

function normalizeVenueKey(value) {
  return clean(value).replace(/\s+/g, "").replace("#", "").toLowerCase();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
