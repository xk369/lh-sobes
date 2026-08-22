const ui = {
  role: localStorage.getItem("lh_interviews_role") || "candidate",
  recruiterTab: "journal",
  candidateId: localStorage.getItem("lh_interviews_candidate_id") || "",
  selectedSlotId: "",
  recruiterSearch: "",
  archiveSearch: "",
  analyticsFrom: "",
  analyticsTo: "",
  analyticsFromInput: "",
  analyticsToInput: "",
  analyticsPreset: "all",
  analyticsView: "slots",
  analyticsCandidateSearch: "",
  stageHelpKey: "",
  createSlotFeedback: null,
  actionFeedback: {}
};

const app = document.querySelector("#app");
const toast = document.querySelector("#toast");
let state = null;
let toastTimer = null;
let autosaveTimer = null;

disableViewportZoom();
loadState();

document.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button || button.disabled) return;
  if (button.closest("summary")) {
    event.preventDefault();
  }

  const role = button.dataset.role;
  const tab = button.dataset.tab;
  const action = button.dataset.action;

  if (role) {
    if (role === "recruiter" && !canAccessRecruiter()) {
      showToast("Нет доступа к кабинету рекрута");
      ui.role = "candidate";
      localStorage.setItem("lh_interviews_role", ui.role);
      render();
      return;
    }
    ui.role = role;
    localStorage.setItem("lh_interviews_role", role);
    render();
    return;
  }

  if (tab) {
    ui.recruiterTab = tab;
    render();
    return;
  }

  if (!action) return;

  try {
    if (action === "select-slot") {
      ui.selectedSlotId = button.dataset.slotId || ui.selectedSlotId;
      rememberActionFeedback(button);
      render();
      showToast("Дата выбрана");
      return;
    }

    if (action === "show-stage-help") {
      ui.stageHelpKey = button.dataset.stageKey || "";
      render();
      return;
    }

    if (action === "export-analytics") {
      const delivery = await downloadAnalyticsXlsx();
      showToast(delivery === "share" ? "Файл готов для сохранения" : "Файл XLSX скачивается");
      return;
    }

    if (action === "set-analytics-view") {
      ui.analyticsView = normalizeAnalyticsView(button.dataset.analyticsView);
      render();
      return;
    }

    if (action === "set-analytics-preset") {
      setAnalyticsPreset(button.dataset.analyticsPreset || "all");
      render();
      return;
    }

    if (action === "reset-analytics-period") {
      setAnalyticsPreset("all");
      showToast("Период сброшен");
      render();
      return;
    }

    if (action === "book-slot") {
      const candidate = collectCandidateProfile();
      if (!candidate) return;
      const response = await runCommand("book_slot", {
        slotId: button.dataset.slotId,
        candidate
      }, button);
      rememberCandidate(response.result.candidateId);
      showToast("Запись на собеседование сохранена");
      return;
    }

    if (action === "join-waitlist") {
      const candidate = collectCandidateProfile();
      if (!candidate) return;
      const response = await runCommand("join_waitlist", { candidate }, button);
      rememberCandidate(response.result.candidateId);
      showToast("Кандидат добавлен в ожидание новой даты");
      return;
    }

    if (action === "candidate-confirm") {
      await runCommand("candidate_confirm", {
        candidateId: requireCurrentCandidateId(),
        decision: button.dataset.decision
      }, button);
      showToast(button.dataset.decision === "yes" ? "Участие подтверждено" : "Отказ сохранен");
      return;
    }

    if (action === "cancel-booking") {
      await runCommand("cancel_booking", {
        candidateId: requireCurrentCandidateId()
      }, button);
      showToast("Запись отменена");
      return;
    }

    if (action === "waitlist-slot-response") {
      await runCommand("waitlist_slot_response", {
        candidateId: button.dataset.candidateId || requireCurrentCandidateId(),
        slotId: button.dataset.slotId,
        intent: button.dataset.intent
      }, button);
      showToast(button.dataset.intent === "book" ? "Запись на дату сохранена" : "Оставили в очереди");
      return;
    }

    if (action === "rebook-interest") {
      await runCommand("rebook_interest", {
        candidateId: requireCurrentCandidateId(),
        intent: button.dataset.intent,
        slotId: button.dataset.slotId || undefined
      }, button);
      showToast("Выбор по повторной записи сохранен");
      return;
    }

    if (action === "request-confirmation") {
      await runCommand("request_confirmation", {
        candidateId: button.dataset.candidateId || undefined,
        slotId: button.dataset.slotId || ui.selectedSlotId || undefined
      }, button);
      showToast("Запрос подтверждения отправлен");
      return;
    }

    if (action === "send-due-confirmations") {
      await runCommand("send_due_confirmations", {
        slotId: button.dataset.slotId || ui.selectedSlotId || undefined
      }, button);
      showToast("Подтверждения за день отправлены");
      return;
    }

    if (action === "mark-arrived" || action === "mark-noshow" || action === "mark-no-confirmation" || action === "mark-declined-before") {
      const attendanceByAction = {
        "mark-arrived": "arrived",
        "mark-noshow": "no_show",
        "mark-no-confirmation": "no_confirmation",
        "mark-declined-before": "declined_before"
      };
      await runCommand("mark_attendance", {
        candidateId: button.dataset.candidateId,
        attendance: attendanceByAction[action]
      }, button);
      showToast("Журнал собеседования обновлен");
      return;
    }

    if (action === "send-registration-materials") {
      const payload = button.dataset.candidateId
        ? { candidateId: button.dataset.candidateId }
        : ui.role === "candidate"
          ? { candidateId: requireCurrentCandidateId() }
          : { slotId: ui.selectedSlotId || undefined };
      await runCommand("send_registration_materials", payload, button);
      showToast("Материалы регистрации отправлены");
      return;
    }

    if (action === "send-resource-step" || action === "send-resources") {
      const response = await runCommand("send_resource_step", {
        slotId: button.dataset.slotId || ui.selectedSlotId || undefined,
        resourceType: button.dataset.resourceType || undefined
      }, button);
      showToast(response.result.resourceLabel ? `${response.result.resourceLabel}: отправлено ${response.result.sentCount}` : "Все материалы уже отправлены");
      return;
    }

    if (action === "mark-left-after-interview") {
      await runCommand("mark_left_after_interview", {
        candidateId: button.dataset.candidateId
      }, button);
      showToast("Кандидат отмечен как не продолживший сотрудничество");
      return;
    }

    if (action === "complete-slot") {
      const slotId = button.dataset.slotId || ui.selectedSlotId;
      if (!await confirmAction("Завершить собеседование? Всем пришедшим без отказа будет назначена категория «Собеседование», затем бот отправит команду /start.")) return;
      const response = await runCommand("complete_slot", { slotId }, button);
      ui.selectedSlotId = firstActiveSlot()?.id || "";
      render();
      showToast(`Собеседование завершено. Обработано пользователей: ${response.result.puzzleBotProcessedCount || 0}`);
      return;
    }

    if (action === "copy-telegram") {
      await copyText(button.dataset.copyValue || "");
      showToast("Telegram скопирован");
      return;
    }

    if (action === "mark-registered" || action === "mark-registration-pending") {
      await runCommand("mark_registration", {
        candidateId: button.dataset.candidateId,
        registrationStatus: action === "mark-registration-pending" ? "pending" : "registered"
      }, button);
      showToast("Регистрация обновлена вручную");
      return;
    }

    if (action === "mark-all-registered") {
      await runCommand("mark_all_registered", { slotId: button.dataset.slotId || ui.selectedSlotId }, button);
      showToast("Группа отмечена зарегистрированной");
      return;
    }

    if (action === "notify-waitlist") {
      await runCommand("notify_waitlist", {
        slotId: button.dataset.slotId || ui.selectedSlotId || undefined
      }, button);
      showToast("Лист ожидания уведомлен");
      return;
    }

    if (action === "clear-archive") {
      if (!await confirmAction("Очистить архив завершенных собеседований? Активные даты и текущие кандидаты останутся.")) return;
      const response = await runCommand("clear_archive", {}, button);
      showToast(`Архив очищен: дат ${response.result.removedSlots}, кандидатов ${response.result.removedCandidates}`);
      return;
    }

    if (action === "clear-recruiter-data") {
      if (!isLocalDevelopmentAccess()) {
        showToast("Полный сброс отключен в рабочей версии");
        return;
      }
      if (!await confirmAction("Тестовый полный сброс удалит даты, кандидатов, ожидание, уведомления и события. Продовые данные так очищать нельзя.")) return;
      const confirmText = window.prompt("Введите ОЧИСТИТЬ для тестового полного сброса") || "";
      if (confirmText.trim() !== "ОЧИСТИТЬ") {
        showToast("Полный сброс отменен");
        return;
      }
      const response = await runCommand("clear_recruiter_data", { confirmText }, button);
      clearRememberedCandidate();
      ui.selectedSlotId = "";
      showToast(`Данные очищены: дат ${response.result.removedSlots}, кандидатов ${response.result.removedCandidates}`);
      return;
    }

    if (action === "record-link") {
      await runCommand("record_link_click", {
        candidateId: requireCurrentCandidateId(),
        linkType: button.dataset.linkType
      }, button);
      showToast("Переход зафиксирован");
      return;
    }

    if (action === "use-candidate") {
      rememberCandidate(button.dataset.candidateId);
      ui.role = "candidate";
      localStorage.setItem("lh_interviews_role", "candidate");
      render();
      return;
    }

    if (action === "reset-demo") {
      const response = await fetchJson("/api/reset", { method: "POST", headers: telegramAuthHeaders() });
      state = response.state;
      ui.selectedSlotId = state.slots[0]?.id || "";
      clearRememberedCandidate();
      render();
      showToast("Демо-данные сброшены");
    }
  } catch (error) {
    showToast(error.message || "Команда не выполнена");
  }
});

document.addEventListener("change", (event) => {
  if (event.target.matches("[data-selected-slot]")) {
    ui.selectedSlotId = event.target.value;
    render();
  }
});

document.addEventListener("input", (event) => {
  if (event.target.matches("[data-candidate-search]")) {
    ui.recruiterSearch = event.target.value;
    render();
    requestAnimationFrame(() => {
      const input = document.querySelector("[data-candidate-search]");
      if (!input) return;
      input.focus();
      input.setSelectionRange(ui.recruiterSearch.length, ui.recruiterSearch.length);
    });
    return;
  }

  if (event.target.matches("[data-archive-search]")) {
    ui.archiveSearch = event.target.value;
    render();
    requestAnimationFrame(() => {
      const input = document.querySelector("[data-archive-search]");
      if (!input) return;
      input.focus();
      input.setSelectionRange(ui.archiveSearch.length, ui.archiveSearch.length);
    });
    return;
  }

  if (event.target.matches("[data-analytics-date]")) {
    handleAnalyticsDateInput(event.target);
    return;
  }

  if (event.target.matches("[data-analytics-search]")) {
    ui.analyticsCandidateSearch = event.target.value;
    refreshAnalyticsCandidateResults();
    return;
  }

  if (event.target.closest("#candidate-form")) {
    scheduleCandidateAutosave();
  }
});

document.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  const submitButton = event.submitter?.closest("button");
  const originalSubmitText = submitButton?.textContent || "";

  try {
    if (form.id === "candidate-form") {
      if (!ui.candidateId) {
        showToast("Данные сохранятся после записи или ожидания");
        return;
      }
      const candidate = collectCandidateProfile();
      if (!candidate) return;
      const response = await runCommand("upsert_candidate", candidate);
      rememberCandidate(response.result.candidateId);
      showToast("Анкета сохранена");
    }

    if (form.id === "slot-form") {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.classList.add("is-loading");
        submitButton.textContent = "Создаем...";
      }
      const data = Object.fromEntries(new FormData(form));
      data.time = `${data.hour}:${data.minute}`;
      delete data.hour;
      delete data.minute;
      const response = await runCommand("create_slot", data, submitButton);
      ui.createSlotFeedback = {
        notifiedCount: response.result.notifiedCount || 0,
        createdAt: Date.now()
      };
      form.reset();
      render();
      window.setTimeout(() => {
        if (!ui.createSlotFeedback) return;
        ui.createSlotFeedback = null;
        render();
      }, 1800);
      showToast(`Дата создана, уведомлений: ${response.result.notifiedCount || 0}`);
    }
  } catch (error) {
    showToast(error.message || "Форма не сохранена");
  } finally {
    if (submitButton && document.contains(submitButton)) {
      submitButton.disabled = false;
      submitButton.classList.remove("is-loading");
      submitButton.textContent = originalSubmitText;
    }
  }
});

async function loadState() {
  const response = await fetchJson("/api/state", { headers: telegramAuthHeaders() });
  state = response.state;
  reconcileRememberedCandidate();
  if (isDeveloperUser() && !localStorage.getItem("lh_interviews_role")) {
    ui.role = "recruiter";
  } else if (ui.role === "recruiter" && !canAccessRecruiter()) {
    ui.role = "candidate";
    localStorage.setItem("lh_interviews_role", ui.role);
  }
  ui.selectedSlotId = ui.selectedSlotId || state.slots[0]?.id || "";
  render();
}

async function runCommand(action, payload, feedbackButton = null) {
  const response = await fetchJson("/api/command", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...telegramAuthHeaders() },
    body: JSON.stringify({ action, payload })
  });
  state = response.state;
  reconcileRememberedCandidate();
  rememberActionFeedback(feedbackButton);
  render();
  return response;
}

function actionFeedbackKey(action, parts = {}) {
  return [
    action || "",
    parts.slotId || ui.selectedSlotId || "",
    parts.candidateId || "",
    parts.resourceType || "",
    parts.decision || "",
    parts.intent || "",
    parts.reason || "",
    parts.linkType || ""
  ].join("|");
}

function actionFeedbackKeyFromButton(button) {
  if (!button?.dataset?.action) return "";
  return actionFeedbackKey(button.dataset.action, {
    slotId: button.dataset.slotId,
    candidateId: button.dataset.candidateId,
    resourceType: button.dataset.resourceType,
    decision: button.dataset.decision,
    intent: button.dataset.intent,
    reason: button.dataset.reason,
    linkType: button.dataset.linkType
  });
}

function rememberActionFeedback(button) {
  const key = actionFeedbackKeyFromButton(button);
  if (!key) return;
  ui.actionFeedback[key] = Date.now();
  window.setTimeout(() => {
    if (!ui.actionFeedback[key]) return;
    delete ui.actionFeedback[key];
    render();
  }, 1100);
}

function actionFeedbackClass(action, parts = {}) {
  return ui.actionFeedback[actionFeedbackKey(action, parts)] ? " action-just-done" : "";
}

function actionDoneClass(done, action, parts = {}) {
  return `${done ? " action-done" : ""}${actionFeedbackClass(action, parts)}`;
}

function disableViewportZoom() {
  ["gesturestart", "gesturechange", "gestureend"].forEach((eventName) => {
    document.addEventListener(eventName, (event) => event.preventDefault(), { passive: false });
  });

  let lastTouchEnd = 0;
  document.addEventListener(
    "touchend",
    (event) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    },
    { passive: false }
  );
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json();
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || "Server error");
  }
  return payload;
}

function render() {
  if (!state) {
    app.innerHTML = '<div class="loading">Загрузка</div>';
    return;
  }

  const active = activeSlots();
  const visibleActive = visibleActiveSlots();
  if (!active.some((slot) => slot.id === ui.selectedSlotId)) {
    ui.selectedSlotId = visibleActive[0]?.id || active[0]?.id || "";
  } else if (visibleActive.length && !visibleActive.some((slot) => slot.id === ui.selectedSlotId)) {
    ui.selectedSlotId = visibleActive[0].id;
  }

  const recruiterAccess = canAccessRecruiter();
  if (ui.role === "recruiter" && !recruiterAccess) {
    ui.role = "candidate";
    localStorage.setItem("lh_interviews_role", ui.role);
  }
  const candidate = getCurrentCandidate();
  const roleSwitchTarget = ui.role === "candidate" ? "recruiter" : "candidate";
  const roleSwitchLabel = ui.role === "candidate" ? "Кабинет рекрута" : "К форме записи";

  app.innerHTML = `
    <header class="top">
      <div class="shell-bar">
        <div class="shell-left">
          ${ui.role === "recruiter" && ui.recruiterTab !== "journal" ? `
            <button type="button" class="back-home-link" data-tab="journal" aria-label="Открыть журнал">
              <span>‹</span>
              <span>Журнал</span>
            </button>
          ` : ""}
        </div>
        ${recruiterAccess ? `
        <button class="role-toggle" data-role="${roleSwitchTarget}" type="button" aria-label="${roleSwitchLabel}" title="${roleSwitchLabel}">
          ${ui.role === "candidate" ? "Р" : "К"}
        </button>
        ` : ""}
      </div>
      <div class="head">
        <div>
          <h1>Собеседования</h1>
          <p class="lead">Запись, ожидание новой даты, подтверждение, журнал явки и отправка материалов после собеса.</p>
        </div>
      </div>
    </header>

    ${ui.role === "candidate" ? renderCandidateView(candidate) : renderRecruiterView()}
  `;
}

function renderCandidateView(candidate) {
  const hasBooking = candidateHasActiveBooking(candidate);
  const openSlots = hasBooking ? [] : uniqueOpenCandidateSlots(candidate);
  const bookedSlot = hasBooking ? state.slots.find((slot) => slot.id === candidate.interviewSlotId) : null;

  return `
    <section id="candidateView">
      <section class="panel">
        <div class="panel-head">
          <h2>Контакты</h2>
          ${candidate ? renderStatusPill(candidate.status) : '<span class="pill accent">Новый</span>'}
        </div>
        ${renderCandidateForm(candidate)}
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2>Мой статус</h2>
          ${candidate ? renderStatusPill(candidate.status) : ""}
        </div>
        ${renderCandidateStatus(candidate)}
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2>Запись</h2>
          <span class="pill ${hasBooking ? "wait" : "ok"}">${hasBooking ? "Дата выбрана" : `${openSlots.length} дат`}</span>
        </div>
        ${hasBooking ? renderLockedBookingNotice(bookedSlot, candidate) : `
          <div class="date-list">
            ${openSlots.map((slot) => renderCandidateSlot(slot)).join("") || '<div class="empty">Открытых дат пока нет</div>'}
          </div>
          <button type="button" class="secondary" data-action="join-waitlist">Уведомить о следующем собеседовании</button>
        `}
      </section>
    </section>
  `;
}

function renderLockedBookingNotice(slot, candidate) {
  const canCancel = canCancelBooking(candidate);
  return `
    <div class="notice locked-booking-notice">
      <div>
        <b>${slot ? escapeHtml(slotLabel(slot)) : "Дата собеседования выбрана"}</b>
        <span>${escapeHtml(journalStatusLabel(candidate))}</span>
      </div>
      ${canCancel ? `
        <button type="button" class="danger" data-action="cancel-booking" data-candidate-id="${escapeAttr(candidate.id)}">
          Отменить запись
        </button>
      ` : ""}
    </div>
  `;
}

function renderCandidateForm(candidate) {
  const profile = candidate || {};
  const telegramUser = telegramWebAppUser();
  const telegramId = profile.telegramId || telegramUser?.id || "";
  const telegramTag = profile.telegram || (telegramUser?.username ? `@${telegramUser.username}` : "");
  const telegramName = profile.name || [telegramUser?.first_name, telegramUser?.last_name].filter(Boolean).join(" ");
  return `
    <form id="candidate-form" class="form-grid candidate-short-form">
      <input type="hidden" name="telegramId" value="${escapeAttr(telegramId)}" />
      <label>
        ФИО
        <input name="name" value="${escapeAttr(telegramName)}" autocomplete="name" required placeholder="Иванов Иван" />
      </label>
      <label>
        Telegram
        <input name="telegram" value="${escapeAttr(telegramTag)}" autocomplete="username" required placeholder="@username" />
      </label>
      <label>
        Телефон
        <input name="phone" value="${escapeAttr(profile.phone)}" autocomplete="tel" required />
      </label>
      <div class="form-autosave" id="candidateAutosaveStatus" aria-live="polite">
        ${candidate ? "Данные сохранены" : "Заполните ФИО, Telegram и телефон"}
      </div>
    </form>
  `;
}

function telegramWebAppUser() {
  return window.Telegram?.WebApp?.initDataUnsafe?.user || null;
}

function confirmAction(message) {
  const webApp = window.Telegram?.WebApp;
  if (typeof webApp?.showConfirm !== "function") {
    return Promise.resolve(window.confirm(message));
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (confirmed) => {
      if (settled) return;
      settled = true;
      resolve(Boolean(confirmed));
    };

    try {
      webApp.showConfirm(message, finish);
    } catch {
      finish(window.confirm(message));
    }
  });
}

function telegramAuthHeaders() {
  const initData = window.Telegram?.WebApp?.initData || "";
  return initData ? { "X-Telegram-Init-Data": initData } : {};
}

function requestHeaders(extra = {}) {
  return { ...extra, ...telegramAuthHeaders() };
}

function canAccessRecruiter() {
  return isDeveloperUser() || isLocalDevelopmentAccess();
}

function isLocalDevelopmentAccess() {
  return ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname);
}

function renderCandidateSlot(slot) {
  return `
    <article class="date-card interview-date-card ${slot.availableSeats > 0 ? "selected" : "locked"}">
      <div class="interview-date-main">
        <div>
          <div class="slot-title">${escapeHtml(slot.title)}</div>
          <div class="slot-line">${escapeHtml(formatDate(slot.date))} · ${escapeHtml(slot.time)}</div>
        </div>
        <span class="pill ${slot.availableSeats > 0 ? "ok" : "bad"}">${slot.availableSeats} мест</span>
      </div>
      <div class="slot-place">
        <b>${escapeHtml(slot.venue)}</b>
        ${slot.venueAddress ? `<span>${escapeHtml(slot.venueAddress)}</span>` : ""}
      </div>
      <button type="button" class="primary" data-action="book-slot" data-slot-id="${escapeAttr(slot.id)}" ${slot.availableSeats < 1 ? "disabled aria-disabled=\"true\"" : ""}>
        Записаться
      </button>
    </article>
  `;
}

function uniqueOpenCandidateSlots(candidate = null) {
  const seen = new Set();
  return state.slots
    .filter((slot) => slot.status === "open" && slot.availableSeats > 0)
    .sort(compareSlotsAsc)
    .filter((slot) => !candidate?.interviewSlotId || slot.id !== candidate.interviewSlotId)
    .filter((slot) => {
      const key = [slot.date, slot.time, slot.venueId || slot.venue].map((value) => String(value || "").trim().toLowerCase()).join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function renderNotification(notification) {
  const slot = notification.slotId ? state.slots.find((item) => item.id === notification.slotId) : null;
  const candidate = state.candidates.find((item) => item.id === notification.candidateId);
  const canAnswerWaitlist =
    slot &&
    notification.type === "waitlist_new_slot" &&
    candidate?.status === "waitlist" &&
    !notification.keyboardClearedAt;
  return `
    <article class="notice notification-card">
      <div class="queue-notice-head">
        <b>${escapeHtml(notification.title)}</b>
        <span>${escapeHtml(formatDateTime(notification.createdAt))}</span>
      </div>
      <p>${escapeHtml(notification.message)}</p>
      ${canAnswerWaitlist ? `
        <div class="button-row">
          <button
            type="button"
            class="primary"
            data-action="waitlist-slot-response"
            data-intent="book"
            data-slot-id="${escapeAttr(slot.id)}"
            data-candidate-id="${escapeAttr(notification.candidateId)}"
          >
            Записаться
          </button>
          <button
            type="button"
            class="secondary"
            data-action="waitlist-slot-response"
            data-intent="stay"
            data-slot-id="${escapeAttr(slot.id)}"
            data-candidate-id="${escapeAttr(notification.candidateId)}"
          >
            Ждать следующую дату
          </button>
        </div>
      ` : ""}
    </article>
  `;
}

function renderCandidateStatus(candidate) {
  if (!candidate) {
    return '<div class="empty">Сохраните анкету, чтобы видеть статус</div>';
  }

  const slot = candidate.interviewSlotId ? state.slots.find((item) => item.id === candidate.interviewSlotId) : null;
  const canRebook = ["no_show", "declined_before_interview", "no_confirmation"].includes(candidate.status);

  return `
    <div class="status-hero">
      <div class="status-hero-title">
        <div>
          <h3>${escapeHtml(candidate.name)}</h3>
          <p class="muted">${escapeHtml(candidateLayerLabel(candidate))}</p>
        </div>
        ${renderStatusPill(candidate.status)}
      </div>
      ${slot ? `
        <div class="date-summary">
          <div class="date-mark">${escapeHtml(dayNumber(slot.date))}</div>
          <div>
            <b>${escapeHtml(slotLabel(slot))}</b>
            <span>${escapeHtml(journalStatusLabel(candidate))}</span>
          </div>
        </div>
      ` : ""}
      <div class="candidate-stage">
        <div class="candidate-stage-label">Этап: <b>${escapeHtml(stageLabel(candidate))}</b></div>
        ${renderStageTrack(candidate)}
      </div>
      ${renderCandidateHistory(candidate)}
      ${canRebook ? `
        <div class="candidate-actions">
          <button type="button" class="primary" data-action="rebook-interest" data-intent="waitlist">Ждать следующую дату</button>
          <button type="button" class="danger" data-action="rebook-interest" data-intent="not_interested">Больше не интересно</button>
        </div>
      ` : ""}
    </div>
  `;
}

function renderCandidateHistory(candidate) {
  const items = Array.isArray(candidate.interviewHistory) ? candidate.interviewHistory.slice(0, 3) : [];
  if (!items.length && !candidate.interviewSlotId) return "";
  const currentSlot = candidate.interviewSlotId ? state.slots.find((slot) => slot.id === candidate.interviewSlotId) : null;
  const historyItems = [
    currentSlot
      ? {
          slotId: currentSlot.id,
          date: currentSlot.date,
          time: currentSlot.time,
          venue: currentSlot.venue,
          outcome: candidate.status,
          attendanceStatus: candidate.attendanceStatus,
          confirmationStatus: candidate.confirmationStatus
        }
      : null,
    ...items
  ].filter(Boolean);
  const uniqueItems = [];
  const seen = new Set();
  for (const item of historyItems) {
    const key = `${item.slotId || item.date}|${item.outcome || item.status || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueItems.push(item);
  }

  return `
    <div class="candidate-history">
      <b>История собеседований</b>
      <div class="candidate-history-list">
        ${uniqueItems.slice(0, 3).map(renderCandidateHistoryItem).join("")}
      </div>
    </div>
  `;
}

function renderCandidateHistoryItem(item) {
  return `
    <div class="candidate-history-item">
      <span>${escapeHtml([formatDate(item.date), item.time, item.venue].filter(Boolean).join(" · "))}</span>
      <b>${escapeHtml(historyOutcomeLabel(item))}</b>
    </div>
  `;
}

function renderCandidateRegistration(candidate) {
  const links = resourceLinksForCandidate(candidate);
  const shouldShow =
    links.length > 0 ||
    ["registration_pending", "registered", "ready_for_internship"].includes(candidate.status);
  if (!shouldShow) return "";

  return `
    <section class="panel">
      <div class="panel-head">
        <h2>Материалы</h2>
        ${renderRegistrationPill(candidate.registrationStatus)}
      </div>
      <div class="notice">
        <b>Рекрут отправил ссылки LOFT HALL.</b>
      </div>
      <div class="link-grid">
        ${links.map((link) => renderRegistrationLink(link, candidate)).join("") || '<div class="empty">Материалы пока не отправлены</div>'}
      </div>
    </section>
  `;
}

function renderRegistrationLink(link, candidate) {
  const clicked = candidate.linkClicks?.some((item) => item.linkType === link.type);
  return `
    <article class="queue-candidate-card">
      <div class="queue-candidate-main">
        <b class="queue-candidate-name">${escapeHtml(link.label)}</b>
        <span class="queue-candidate-limits">${escapeHtml(link.description)}</span>
      </div>
      <button type="button" class="${clicked ? "success" : "secondary"}" data-action="record-link" data-link-type="${escapeAttr(link.type)}">
        ${clicked ? "Переход зафиксирован" : "Зафиксировать переход"}
      </button>
    </article>
  `;
}

function renderRecruiterView() {
  if (!canAccessRecruiter()) {
    return `
      <section class="panel access-denied-panel">
        <div class="panel-head">
          <h2>Нет доступа</h2>
          <span class="pill bad">Рекрут</span>
        </div>
        <p class="muted">Кабинет рекрута доступен только разрешенным Telegram ID.</p>
        <button type="button" class="secondary" data-role="candidate">К форме записи</button>
      </section>
    `;
  }

  if (!["journal", "dates", "analytics"].includes(ui.recruiterTab)) {
    ui.recruiterTab = "journal";
  }

  return `
    <section class="recruiter-grid">
      <nav class="recruiter-nav" aria-label="Разделы рекрута">
        ${renderTab("journal", "Журнал")}
        ${renderTab("dates", "Даты")}
        ${renderTab("analytics", "Аналитика")}
      </nav>

      ${renderRecruiterTab()}
    </section>
  `;
}

function renderRecruiterTab() {
  if (ui.recruiterTab === "dates") return renderDatesTab();
  if (ui.recruiterTab === "analytics") return renderAnalyticsTab();
  return renderJournalTab();
}

function renderJournalTab() {
  const slotCandidates = candidatesForSlot(ui.selectedSlotId).sort(compareJournalCandidates);
  const candidates = filterCandidates(slotCandidates);
  const slot = state.slots.find((item) => item.id === ui.selectedSlotId);
  const confirmation = slotConfirmationState(ui.selectedSlotId);
  const slotOpen = slot?.status === "open";
  const unmarked = candidates.filter(isUnmarkedCandidate);
  const arrived = candidates.filter(isArrivedCandidate);
  const arrivedAll = slotCandidates.filter(isArrivedCandidate);
  const refusedAfterInterview = candidates.filter(isPostInterviewRefusal);
  const missed = candidates.filter(isMissedCandidate);

  return `
    <section class="panel">
      <div class="toolbar">
        <label>
          Дата собеседования
          <select data-selected-slot>${renderSlotOptions()}</select>
        </label>
        <label>
          Поиск
          <input data-candidate-search value="${escapeAttr(ui.recruiterSearch)}" placeholder="ФИО, Telegram, телефон" />
        </label>
        <button
          type="button"
          class="danger${actionFeedbackClass("complete-slot", { slotId: ui.selectedSlotId })}"
          data-action="complete-slot"
          data-slot-id="${escapeAttr(ui.selectedSlotId)}"
          ${!slotOpen ? "disabled aria-disabled=\"true\"" : ""}
        >
          Завершить собес
        </button>
      </div>
      ${renderConfirmationStatusPanel(confirmation)}
      ${renderJournalGroup("Не отмечены", unmarked, "wait")}
      ${renderSlotResourceControls(slot, arrivedAll)}
      ${renderJournalGroup("Пришли на собес", arrived, "ok")}
      ${renderJournalGroup("Отказ после собеса", refusedAfterInterview, "bad")}
      ${renderJournalGroup("Не пришли / слились", missed, "bad")}
    </section>
  `;
}

function renderJournalGroup(title, candidates, tone) {
  return `
    <section class="journal-group">
      <div class="journal-group-head">
        <h3>${escapeHtml(title)}</h3>
        <span class="pill ${tone}">${candidates.length}</span>
      </div>
      <div class="candidate-list compact-candidate-list">
        ${candidates.map(renderRecruiterCandidate).join("") || '<div class="empty">Пусто</div>'}
      </div>
    </section>
  `;
}

function slotConfirmationState(slotId) {
  const candidates = state.candidates.filter((candidate) => candidate.interviewSlotId === slotId);
  const relevant = candidates.filter(
    (candidate) =>
      ["booked", "confirmation_pending", "confirmed", "declined_before_interview"].includes(candidate.status) ||
      ["pending", "confirmed", "declined", "no_response"].includes(candidate.confirmationStatus)
  );
  const sendable = relevant.filter(
    (candidate) =>
      ["booked", "confirmation_pending"].includes(candidate.status) &&
      !["confirmed", "declined"].includes(candidate.confirmationStatus)
  );

  return {
    total: relevant.length,
    sendableCount: sendable.length,
    confirmedCount: relevant.filter((candidate) => candidate.confirmationStatus === "confirmed").length,
    declinedCount: relevant.filter(
      (candidate) => candidate.confirmationStatus === "declined" || candidate.attendanceStatus === "declined_before"
    ).length,
    pendingCount: relevant.filter((candidate) => candidate.confirmationStatus === "pending").length,
    notRequestedCount: relevant.filter(
      (candidate) => !candidate.confirmationRequestedAt && candidate.confirmationStatus === "not_requested"
    ).length,
    noResponseCount: relevant.filter((candidate) => candidate.confirmationStatus === "no_response").length
  };
}

function renderConfirmationStatusPanel(confirmation) {
  if (!confirmation.total) return "";
  return `
    <div class="confirmation-status-panel" aria-label="Статусы подтверждения">
      <span class="confirmation-mini ok">Подтвердили: ${confirmation.confirmedCount}</span>
      <span class="confirmation-mini bad">Слились: ${confirmation.declinedCount}</span>
      <span class="confirmation-mini wait">Ждут: ${confirmation.pendingCount}</span>
      <span class="confirmation-mini accent">Без запроса: ${confirmation.notRequestedCount}</span>
      ${confirmation.noResponseCount ? `<span class="confirmation-mini bad">Не ответили: ${confirmation.noResponseCount}</span>` : ""}
    </div>
  `;
}

function waitlistNotifiedForSlot(slotId) {
  return state.candidates.some(
    (candidate) => candidate.status === "waitlist" && candidate.waitlistTargetSlotId === slotId && candidate.lastWaitlistNotifiedAt
  );
}

function activeSlots() {
  return state.slots.filter((slot) => slot.status !== "completed").sort(compareSlotsAsc);
}

function visibleActiveSlots() {
  return collapseEmptyDuplicateSlots(activeSlots());
}

function collapseEmptyDuplicateSlots(slots) {
  const groups = new Map();
  for (const slot of slots) {
    const key = [slot.date, slot.time, slot.venueId || slot.venue].map((value) => String(value || "").trim().toLowerCase()).join("|");
    groups.set(key, [...(groups.get(key) || []), slot]);
  }

  return Array.from(groups.values()).flatMap((group) => {
    const withCandidates = group.filter((slot) => candidatesForSlot(slot.id).length > 0);
    return withCandidates.length ? withCandidates : [group[0]];
  });
}

function archivedSlots() {
  return state.slots.filter((slot) => slot.status === "completed").sort(compareArchivedSlots);
}

function firstActiveSlot() {
  return activeSlots()[0] || null;
}

function renderSlotResourceControls(slot, candidates) {
  if (!slot) return "";
  const progress = resourceProgressForCandidates(candidates);
  const nextStep = progress.nextStep;
  const disabled = candidates.length === 0 || !nextStep;

  return `
    <section class="resource-progress-panel">
      <div class="resource-progress-head">
        <div>
          <h3>Материалы без отказа</h3>
          <span>${candidates.length ? `Получателей: ${candidates.length}` : "Пришедших без отказа пока нет"}</span>
        </div>
        <span class="pill accent">${progress.sent}/${progress.total} отправлено</span>
      </div>
      <button
        type="button"
        class="${nextStep ? "primary" : "success"}"
        data-action="send-resource-step"
        data-slot-id="${escapeAttr(slot.id)}"
        data-resource-type="${escapeAttr(nextStep?.type || "")}"
        ${disabled ? "disabled aria-disabled=\"true\"" : ""}
      >
        ${nextStep ? `Отправить: ${nextStep.label}` : "Все материалы отправлены"}
      </button>
    </section>
  `;
}

function resourceProgressForCandidates(candidates) {
  const targets = candidates.filter((candidate) => candidate.attendanceStatus === "arrived" && candidate.status !== "left_after_interview");
  const steps = resourceSteps();
  const doneTypes = new Set(
    steps
      .filter((step) => targets.length > 0 && targets.every((candidate) => resourceStepSent(candidate, step.type)))
      .map((step) => step.type)
  );
  const nextStep = steps.find((step) => !doneTypes.has(step.type)) || null;

  return {
    steps,
    doneTypes,
    nextStep,
    sent: doneTypes.size,
    total: steps.length
  };
}

function resourceLinksForCandidate(candidate) {
  const sentTypes = new Set((candidate.resourceStepsSent || []).map((step) => step.type));
  return resourceSteps().filter((step) => sentTypes.has(step.type));
}

function resourceSteps() {
  const steps = state.settings?.resourceSteps?.length ? state.settings.resourceSteps : state.settings?.registrationLinks || [];
  return steps.filter((step) => step.type && step.label);
}

function resourceStepSent(candidate, type) {
  return (candidate.resourceStepsSent || []).some((step) => step.type === type);
}

function renderCandidateResourceExceptions(candidate) {
  const errors = candidate.resourceErrors || [];
  if (!errors.length) return "";
  return `
    <div class="resource-exceptions">
      ${errors.map((error) => `<span class="pill bad">${escapeHtml(error.message)}</span>`).join("")}
    </div>
  `;
}

function renderConfirmationMini(candidate) {
  const badge = confirmationBadge(candidate);
  return `<span class="confirmation-mini ${badge.tone}">${escapeHtml(badge.label)}</span>`;
}

function confirmationBadge(candidate) {
  if (candidate.status === "left_after_interview") return { label: "Отказ после собеса", tone: "bad" };
  if (candidate.attendanceStatus === "no_show" && candidate.confirmationStatus === "confirmed") {
    return { label: "Подтвердил, не пришел", tone: "bad" };
  }
  if (candidate.confirmationStatus === "confirmed") return { label: "Подтвердил выход", tone: "ok" };
  if (candidate.confirmationStatus === "declined" || candidate.attendanceStatus === "declined_before") {
    return { label: "Слился", tone: "bad" };
  }
  if (candidate.confirmationStatus === "pending") return { label: "Ждет ответ", tone: "wait" };
  if (candidate.confirmationStatus === "no_response" || candidate.attendanceStatus === "no_confirmation") {
    return { label: "Не ответил", tone: "bad" };
  }
  if (candidate.confirmationRequestedAt) return { label: "Запрос отправлен", tone: "accent" };
  return { label: "Без запроса", tone: "muted" };
}

function renderRecruiterCandidate(candidate, index = 0) {
  const arrived = isArrivedCandidate(candidate);
  const canContinue = arrived && candidate.status !== "left_after_interview";
  const marked = !isUnmarkedCandidate(candidate);
  const telegram = cleanTelegram(candidate.telegram);
  return `
    <article class="candidate-card recruiter-candidate-card ${marked ? "marked" : ""} ${candidateCardTone(candidate)}">
      <div class="candidate-mark-row">
        <details class="recruiter-person-details">
          <summary class="candidate-name-summary">
            <span class="candidate-title-stack">
              <span class="candidate-title-line">
                <span class="candidate-number">${index + 1}</span>
                <b class="name">${escapeHtml(candidate.name)}</b>
              </span>
              ${marked ? "" : renderConfirmationMini(candidate)}
            </span>
            ${renderAttendanceControl(candidate)}
          </summary>
          <div class="candidate-details-body">
            ${renderCandidateMeta(candidate)}
            ${candidate.note ? `<p class="candidate-note">${escapeHtml(candidate.note)}</p>` : ""}
            ${renderAttendanceCorrection(candidate)}
          </div>
        </details>
      </div>
      <div class="compact-person-row">
        ${telegram ? `<button type="button" class="queue-telegram" data-action="copy-telegram" data-copy-value="${escapeAttr(telegram)}">${escapeHtml(telegram)}</button>` : '<span class="queue-telegram muted">без Telegram</span>'}
      </div>
      ${renderCandidateResourceExceptions(candidate)}
      ${canContinue ? `
        <div class="candidate-actions">
          <span class="attendance-state ok">Без отказа</span>
          <button type="button" class="quiet" data-action="mark-left-after-interview" data-candidate-id="${escapeAttr(candidate.id)}">Отказ</button>
        </div>
      ` : ""}
    </article>
  `;
}

function renderAttendanceControl(candidate) {
  if (isUnmarkedCandidate(candidate)) {
    return `
      <div class="attendance-quick-actions" aria-label="Отметка явки">
        <button type="button" class="success" data-action="mark-arrived" data-candidate-id="${escapeAttr(candidate.id)}">Пришел</button>
        <button type="button" class="danger" data-action="mark-noshow" data-candidate-id="${escapeAttr(candidate.id)}">Не пришел</button>
      </div>
    `;
  }

  const tone = isArrivedCandidate(candidate) ? "ok" : "bad";
  return `<span class="attendance-state ${tone}">${escapeHtml(attendanceMarkLabel(candidate))}</span>`;
}

function renderAttendanceCorrection(candidate) {
  if (isUnmarkedCandidate(candidate)) return "";
  return `
    <div class="attendance-correction">
      <span>Изменить отметку</span>
      <div class="attendance-correction-actions">
        <button
          type="button"
          class="success"
          data-action="mark-arrived"
          data-candidate-id="${escapeAttr(candidate.id)}"
          ${isArrivedCandidate(candidate) ? "disabled aria-disabled=\"true\"" : ""}
        >
          Пришел
        </button>
        <button
          type="button"
          class="danger"
          data-action="mark-noshow"
          data-candidate-id="${escapeAttr(candidate.id)}"
          ${isMissedCandidate(candidate) ? "disabled aria-disabled=\"true\"" : ""}
        >
          Не пришел
        </button>
      </div>
    </div>
  `;
}

function renderDatesTab() {
  const waitlist = state.candidates
    .filter((candidate) => candidate.status === "waitlist")
    .sort(compareWaitlistCandidates);
  const shownActiveSlots = visibleActiveSlots();
  const visibleArchivedSlots = filterArchivedSlots(archivedSlots());
  const createFeedback = ui.createSlotFeedback;

  return `
    <section class="grid">
      <section class="panel">
        <h2>Добавить дату</h2>
        <form id="slot-form" class="form-grid two">
          <label>
            Дата
            <input name="date" type="date" required lang="ru-RU" />
          </label>
          <label>
            Время МСК
            <span class="time-select-row">
              <select name="hour" required aria-label="Часы">${renderHourOptions()}</select>
              <select name="minute" required aria-label="Минуты">${renderMinuteOptions()}</select>
            </span>
          </label>
          <label>
            Площадка
            <select name="venueId" required>${renderVenueOptions()}</select>
          </label>
          <label>
            Мест
            <input name="seats" type="number" min="1" value="12" required />
          </label>
          <div class="span-2 button-row slot-form-actions">
            <button
              type="submit"
              class="primary${createFeedback ? " action-done" : ""}${actionFeedbackClass("create-slot-submit")}"
              data-action="create-slot-submit"
            >
              ${createFeedback ? `Создано · уведомлено ${createFeedback.notifiedCount}` : "Создать и уведомить лист"}
            </button>
          </div>
          ${createFeedback ? `
            <div class="span-2 form-feedback success-feedback" role="status">
              Дата создана. Лист ожидания уведомлен: ${createFeedback.notifiedCount}
            </div>
          ` : ""}
        </form>
      </section>

      <section class="panel waitlist-panel">
        <div class="panel-head">
          <div class="panel-title-stack">
            <h2>Лист ожидания</h2>
            <span>Автоуведомление идет при создании новой даты, по очереди и по количеству мест.</span>
          </div>
          <span class="pill accent">${waitlist.length}</span>
        </div>
        <div class="candidate-list">
          ${waitlist.map(renderWaitlistCandidate).join("") || '<div class="empty">Список ожидания пуст</div>'}
        </div>
      </section>

      <section class="panel span-2">
        <div class="panel-head">
          <h2>Активные даты</h2>
          <span class="pill ok">${shownActiveSlots.length}</span>
        </div>
        <div class="date-list">${shownActiveSlots.map(renderRecruiterSlot).join("") || '<div class="empty">Активных дат пока нет</div>'}</div>
        <details class="archive-panel" ${ui.archiveSearch.trim() ? "open" : ""}>
          <summary>
            <span>Архив собесов</span>
            <b>${archivedSlots().length}</b>
          </summary>
          <label class="archive-search">
            Поиск в архиве
            <input data-archive-search value="${escapeAttr(ui.archiveSearch)}" placeholder="ФИО, Telegram, телефон, дата" />
          </label>
          <div class="date-list archive-date-list">
            ${visibleArchivedSlots.map(renderArchivedSlot).join("") || '<div class="empty">В архиве ничего не найдено</div>'}
          </div>
        </details>
        ${renderDataToolsPanel()}
      </section>
    </section>
  `;
}

function renderDataToolsPanel() {
  const activeCount = activeSlots().length;
  const archivedCount = archivedSlots().length;
  const candidateCount = state.candidates.length;
  const canFullReset = isLocalDevelopmentAccess();

  return `
    <section class="data-tools-panel">
      <div class="data-tools-copy">
        <b>Очистка данных</b>
        <span>${canFullReset ? "Полный сброс доступен только локально и требует ручного слова подтверждения." : "В рабочей версии доступна только очистка архива. Полный сброс отключен, чтобы случайно не снести продукт."}</span>
      </div>
      <div class="data-tools-actions">
        <button
          type="button"
          class="danger${actionFeedbackClass("clear-archive")}"
          data-action="clear-archive"
          ${archivedCount === 0 ? "disabled aria-disabled=\"true\"" : ""}
        >
          Очистить архив
        </button>
        ${canFullReset ? `
          <button
            type="button"
            class="danger${actionFeedbackClass("clear-recruiter-data")}"
            data-action="clear-recruiter-data"
            ${activeCount === 0 && archivedCount === 0 && candidateCount === 0 ? "disabled aria-disabled=\"true\"" : ""}
          >
            Тестовый полный сброс
          </button>
        ` : '<span class="danger-lock">Полный сброс только через техподтверждение</span>'}
      </div>
    </section>
  `;
}

function renderWaitlistCandidate(candidate, index = 0) {
  const telegram = cleanTelegram(candidate.telegram);
  return `
    <article class="candidate-card recruiter-candidate-card waitlist-candidate-card">
      <details class="recruiter-person-details">
        <summary class="candidate-name-summary">
          <span class="candidate-title-line">
            <span class="candidate-number">${index + 1}</span>
            <b class="name">${escapeHtml(candidate.name)}</b>
          </span>
        </summary>
        <div class="candidate-details-body">
          ${renderCandidateMeta(candidate)}
          ${candidate.lastWaitlistNotifiedAt ? `<p class="candidate-note">Последнее уведомление: ${escapeHtml(formatDateTime(candidate.lastWaitlistNotifiedAt))}</p>` : ""}
        </div>
      </details>
      <div class="compact-person-row">
        ${telegram ? `<button type="button" class="queue-telegram" data-action="copy-telegram" data-copy-value="${escapeAttr(telegram)}">${escapeHtml(telegram)}</button>` : '<span class="queue-telegram muted">без Telegram</span>'}
      </div>
    </article>
  `;
}

function compareWaitlistCandidates(left, right) {
  const leftDate = left.waitlistJoinedAt || left.createdAt || "";
  const rightDate = right.waitlistJoinedAt || right.createdAt || "";
  const byDate = String(leftDate).localeCompare(String(rightDate));
  if (byDate !== 0) return byDate;
  return String(left.id).localeCompare(String(right.id));
}

function renderArchivedSlot(slot) {
  const candidates = archiveCandidatesForSlot(slot);
  const query = ui.archiveSearch.trim();
  const hasQuery = Boolean(query);
  const visibleCandidates = hasQuery
    ? candidates.filter((candidate) => candidateMatchesQuery(candidate, query))
    : candidates;

  return `
    <details class="archive-slot-card" ${hasQuery ? "open" : ""}>
      <summary>
        <span class="archive-slot-main">
          <b>${escapeHtml(slotLabel(slot))}</b>
          <span>${escapeHtml(slot.completedAt ? `Закрыт: ${formatDateTime(slot.completedAt)}` : "Закрыт")}</span>
        </span>
        <span class="pill bad">${candidates.length}</span>
      </summary>
      <div class="candidate-list compact-candidate-list">
        ${visibleCandidates.map(renderArchiveCandidate).join("") || '<div class="empty">Кандидатов по поиску нет</div>'}
      </div>
    </details>
  `;
}

function renderArchiveCandidate(candidate, index = 0) {
  const telegram = cleanTelegram(candidate.telegram);
  return `
    <article class="candidate-card archive-candidate-card ${candidateCardTone(candidate)}">
      <details class="archive-person-details">
        <summary class="archive-person-summary">
          <span class="archive-person-main">
            <span class="candidate-number">${index + 1}</span>
            <b>${escapeHtml(candidate.name)}</b>
          </span>
          ${renderArchiveStatusChip(candidate)}
        </summary>
        <div class="candidate-details-body archive-person-details-body">
          ${renderCandidateMeta(candidate)}
        </div>
      </details>
      <div class="archive-person-footer">
        ${telegram ? `<button type="button" class="archive-telegram-button" data-action="copy-telegram" data-copy-value="${escapeAttr(telegram)}">${escapeHtml(telegram)}</button>` : '<span class="archive-telegram-button muted">без Telegram</span>'}
      </div>
    </article>
  `;
}

function renderArchiveStatusChip(candidate) {
  const label = attendanceMarkLabel(candidate);
  const tone = isArrivedCandidate(candidate) ? "ok" : isMissedCandidate(candidate) || isPostInterviewRefusal(candidate) ? "bad" : statusTone(candidate.status);
  return `<span class="archive-status-chip ${tone}">${escapeHtml(label)}</span>`;
}

function renderRecruiterSlot(slot) {
  const booked = Math.max(Number(slot.seats || 0) - Number(slot.availableSeats || 0), 0);
  return `
    <article class="date-card interview-date-card ${slot.id === ui.selectedSlotId ? "selected" : ""}">
      <div class="interview-date-main">
        <div>
          <div class="slot-title">${escapeHtml(slot.title)}</div>
          <div class="slot-line">${escapeHtml(formatDate(slot.date))} · ${escapeHtml(slot.time)}</div>
        </div>
        <span class="pill ${slot.status === "open" ? "ok" : "bad"}">${escapeHtml(slot.status === "completed" ? "Завершена" : slot.status === "open" ? "Открыта" : "Закрыта")}</span>
      </div>
      <div class="slot-place">
        <b>${escapeHtml(slot.venue)}</b>
        ${slot.venueAddress ? `<span>${escapeHtml(slot.venueAddress)}</span>` : ""}
      </div>
      <div class="slot-capacity-line" aria-label="Места на дате">
        <span>Создано мест: <b>${Number(slot.seats || 0)}</b></span>
        <span>Свободно: <b>${Number(slot.availableSeats || 0)}</b></span>
        <span>Записано: <b>${booked}</b></span>
      </div>
      <div class="candidate-actions">
        <button
          type="button"
          class="${slot.id === ui.selectedSlotId ? "success action-done" : "secondary"}${actionFeedbackClass("select-slot", { slotId: slot.id })}"
          data-action="select-slot"
          data-slot-id="${escapeAttr(slot.id)}"
          ${slot.id === ui.selectedSlotId ? "aria-pressed=\"true\"" : ""}
        >
          ${slot.id === ui.selectedSlotId ? "Выбрана" : "Выбрать дату"}
        </button>
      </div>
    </article>
  `;
}

function renderRegistrationTab() {
  const slotCandidates = (!ui.selectedSlotId ? state.candidates : candidatesForSlot(ui.selectedSlotId)).sort(compareJournalCandidates);
  const candidates = filterCandidates(
    slotCandidates.filter(
      (candidate) =>
        candidate.status !== "left_after_interview" &&
        (candidate.attendanceStatus === "arrived" || candidate.resourceStepsSent?.length > 0)
    )
  );
  const slot = state.slots.find((item) => item.id === ui.selectedSlotId);
  const arrivedAll = slotCandidates.filter(isArrivedCandidate);

  return `
    <section class="panel">
      <div class="toolbar">
        <label>
          Дата собеседования
          <select data-selected-slot>${renderSlotOptions()}</select>
        </label>
        <label>
          Поиск
          <input data-candidate-search value="${escapeAttr(ui.recruiterSearch)}" placeholder="ФИО, Telegram, телефон" />
        </label>
      </div>
      ${renderSlotResourceControls(slot, arrivedAll)}
      <div class="candidate-list">
        ${candidates.map(renderResourceCandidate).join("") || '<div class="empty">Пришедших кандидатов пока нет</div>'}
      </div>
    </section>
  `;
}

function renderResourceCandidate(candidate, index = 0) {
  const telegram = cleanTelegram(candidate.telegram);
  return `
    <article class="candidate-card recruiter-candidate-card ${candidateCardTone(candidate)} marked">
      <details class="recruiter-person-details">
        <summary class="candidate-name-summary">
          <span class="candidate-title-line">
            <span class="candidate-number">${index + 1}</span>
            <b class="name">${escapeHtml(candidate.name)}</b>
          </span>
        </summary>
        <div class="candidate-details-body">
          ${renderCandidateMeta(candidate)}
        </div>
      </details>
      <div class="compact-person-row">
        ${telegram ? `<button type="button" class="queue-telegram" data-action="copy-telegram" data-copy-value="${escapeAttr(telegram)}">${escapeHtml(telegram)}</button>` : '<span class="queue-telegram muted">без Telegram</span>'}
      </div>
      ${renderCandidateResourceExceptions(candidate)}
      <div class="candidate-actions">
        <button type="button" class="quiet" data-action="mark-left-after-interview" data-candidate-id="${escapeAttr(candidate.id)}">Отказ</button>
        <button type="button" class="quiet" data-action="use-candidate" data-candidate-id="${escapeAttr(candidate.id)}">Открыть</button>
      </div>
    </article>
  `;
}

function renderAnalyticsTab() {
  const analytics = analyticsData();
  ui.analyticsView = normalizeAnalyticsView(ui.analyticsView);
  return `
    <section class="panel analytics-panel">
      <div class="panel-head">
        <div class="panel-title-stack">
          <h2>Аналитика</h2>
          <span data-analytics-period-label>${escapeHtml(analytics.periodLabel)}</span>
        </div>
        <button
          type="button"
          class="secondary"
          data-action="export-analytics"
          ${analytics.rows.length === 0 && analytics.slots.length === 0 ? "disabled aria-disabled=\"true\"" : ""}
        >
          Скачать XLSX
        </button>
      </div>

      ${renderAnalyticsPeriodControls()}
      ${renderAnalyticsResults(analytics)}
    </section>
  `;
}

function renderAnalyticsPeriodControls() {
  const presets = [
    ["all", "Все время"],
    ["today", "Сегодня"],
    ["7d", "7 дней"],
    ["30d", "30 дней"],
    ["custom", "Период"]
  ];
  const hasPeriod = ui.analyticsPreset !== "all" || ui.analyticsFromInput || ui.analyticsToInput;
  return `
    <div class="analytics-period-panel">
      <div class="analytics-preset-row">
        ${presets.map(([preset, label]) => `
          <button
            type="button"
            class="analytics-preset ${ui.analyticsPreset === preset ? "active" : ""}"
            data-action="set-analytics-preset"
            data-analytics-preset="${escapeAttr(preset)}"
          >
            ${escapeHtml(label)}
          </button>
        `).join("")}
      </div>
      <div class="analytics-filter">
        <label>
          С
          <input
            type="text"
            inputmode="numeric"
            autocomplete="off"
            data-analytics-date="from"
            value="${escapeAttr(ui.analyticsFromInput)}"
            placeholder="дд.мм.гггг"
          />
        </label>
        <label>
          По
          <input
            type="text"
            inputmode="numeric"
            autocomplete="off"
            data-analytics-date="to"
            value="${escapeAttr(ui.analyticsToInput)}"
            placeholder="дд.мм.гггг"
          />
        </label>
        <button type="button" class="quiet analytics-reset" data-action="reset-analytics-period" ${hasPeriod ? "" : "disabled aria-disabled=\"true\""}>
          Сбросить
        </button>
      </div>
    </div>
  `;
}

function renderAnalyticsEntryGrid(analytics) {
  return `
    <div class="analytics-entry-grid">
      ${renderAnalyticsEntry("slots", "Собесы", analytics.metrics.slots, "Даты за выбранный период")}
      ${renderAnalyticsEntry("candidates", "Кандидаты", analytics.metrics.candidates, "Все кандидаты в периоде")}
    </div>
  `;
}

function renderAnalyticsEntry(view, label, value, note) {
  return `
    <button
      type="button"
      class="analytics-entry ${ui.analyticsView === view ? "active" : ""}"
      data-action="set-analytics-view"
      data-analytics-view="${escapeAttr(view)}"
    >
      <span>${escapeHtml(label)}</span>
      <b>${escapeHtml(value)}</b>
      <small>${escapeHtml(note)}</small>
    </button>
  `;
}

function renderAnalyticsResults(analytics) {
  return `
    <div class="analytics-results" data-analytics-results>
      ${renderAnalyticsResultsBody(analytics)}
    </div>
  `;
}

function renderAnalyticsResultsBody(analytics) {
  return `
    ${renderAnalyticsEntryGrid(analytics)}
    ${renderAnalyticsDetail(analytics)}
  `;
}

function renderAnalyticsDetail(analytics) {
  if (ui.analyticsView === "candidates") {
    return renderAnalyticsCandidatesView("Кандидаты", analytics.rows, "Кандидаты сгруппированы по итоговому состоянию. Детали открываются по нажатию на ФИО.");
  }

  return renderAnalyticsSlotsView(analytics);
}

function renderAnalyticsSlotsView(analytics) {
  const slots = analytics.slots.slice().sort(compareSlotsDesc);
  const firstSlotWithCandidates = slots.findIndex((slot) => analytics.rows.some((row) => row.slot?.id === slot.id));
  const openSlotIndex = firstSlotWithCandidates >= 0 ? firstSlotWithCandidates : 0;
  return `
    <section class="analytics-detail-section">
      <div class="panel-head compact">
        <div class="panel-title-stack">
          <h3>Собесы</h3>
          <span>Новые даты сверху, внутри даты кандидаты идут по статусам</span>
        </div>
        <span class="pill accent">${slots.length}</span>
      </div>
      <div class="analytics-slot-list">
        ${slots.map((slot, index) => renderAnalyticsSlot(slot, analytics.rows, index === openSlotIndex)).join("") || '<div class="empty">Собесов за период нет</div>'}
      </div>
    </section>
  `;
}

function renderAnalyticsSlot(slot, allRows, open = false) {
  const rows = allRows.filter((row) => row.slot?.id === slot.id);
  const groups = groupedAnalyticsRows(rows, { slotOrder: true });
  return `
    <details class="analytics-slot-card" ${open ? "open" : ""}>
      <summary>
        <span class="analytics-slot-main">
          <b>${escapeHtml(slotLabel(slot))}</b>
          <span>${escapeHtml(slot.venueAddress || "адрес не указан")}</span>
        </span>
        <span class="analytics-slot-counts">
          ${renderAnalyticsMiniCount("Всего", rows.length)}
          ${renderAnalyticsMiniCount("5/5", rows.filter((row) => row.groupKey === "completed").length)}
          ${renderAnalyticsMiniCount("Не пришли", rows.filter((row) => row.groupKey === "no_show").length)}
        </span>
      </summary>
      <div class="analytics-group-list">
        ${groups.map((group) => renderAnalyticsGroup(group, { collapsible: true })).join("") || '<div class="empty">Кандидатов на этой дате нет</div>'}
      </div>
    </details>
  `;
}

function renderAnalyticsMiniCount(label, value) {
  return `
    <span class="analytics-mini-count">
      <small>${escapeHtml(label)}</small>
      <b>${escapeHtml(value)}</b>
    </span>
  `;
}

function renderAnalyticsCandidatesView(title, rows, note) {
  const filteredRows = filteredAnalyticsRows(rows);
  return `
    <section class="analytics-detail-section">
      <div class="panel-head compact">
        <div class="panel-title-stack">
          <h3>${escapeHtml(title)}</h3>
          <span>${escapeHtml(note)}</span>
        </div>
        <span class="pill accent" data-analytics-candidates-count>${filteredRows.length}</span>
      </div>
      <label class="analytics-search">
        Поиск
        <input data-analytics-search value="${escapeAttr(ui.analyticsCandidateSearch)}" placeholder="ФИО, Telegram, телефон" />
      </label>
      <div class="analytics-group-list" data-analytics-candidates-results>
        ${renderAnalyticsCandidateGroups(filteredRows)}
      </div>
    </section>
  `;
}

function renderAnalyticsCandidateGroups(rows) {
  const groups = groupedAnalyticsRows(rows);
  return groups.map((group) => renderAnalyticsGroup(group, { collapsible: true })).join("") || '<div class="empty">Кандидатов за период нет</div>';
}

function renderAnalyticsGroup(group, options = {}) {
  const head = `
    <div class="analytics-group-title">
      <b>${escapeHtml(group.title)}</b>
      <span class="pill ${group.tone}">${group.rows.length}</span>
    </div>
  `;
  if (options.collapsible) {
    return `
      <details class="analytics-group analytics-group-details">
        <summary class="analytics-group-head">
          ${head}
        </summary>
        <div class="analytics-person-list">
          ${group.rows.map((row, index) => renderAnalyticsCandidateCard(row, index)).join("")}
        </div>
      </details>
    `;
  }

  return `
    <section class="analytics-group">
      <div class="analytics-group-head">
        ${head}
      </div>
      <div class="analytics-person-list">
        ${group.rows.map((row, index) => renderAnalyticsCandidateCard(row, index)).join("")}
      </div>
    </section>
  `;
}

function renderAnalyticsCandidateCard(row, index = 0) {
  return `
    <details class="analytics-person-card ${row.tone}">
      <summary>
        <span class="analytics-person-title">
          <span class="candidate-number">${index + 1}</span>
          <span>
            <b>${escapeHtml(row.name)}</b>
            <small>${escapeHtml(row.telegram)} · ${escapeHtml(row.slotShortLabel)}</small>
          </span>
        </span>
        <span class="analytics-status-chip ${row.tone}">${escapeHtml(row.finalLabel)}</span>
      </summary>
      <div class="analytics-person-body">
        <div class="analytics-person-grid">
          ${renderAnalyticsInfo("Телефон", row.phone)}
          ${renderAnalyticsInfo("Telegram", row.telegram)}
          ${renderAnalyticsInfo("Собес", row.slotLabel)}
          ${renderAnalyticsInfo("Адрес", row.slot?.venueAddress || "без адреса")}
          ${renderAnalyticsInfo("Явка", row.attendance)}
          ${renderAnalyticsInfo("Материалы", row.materials)}
        </div>
        ${row.telegram && row.telegram !== "без Telegram" ? `
          <button type="button" class="queue-telegram" data-action="copy-telegram" data-copy-value="${escapeAttr(row.telegram)}">
            ${escapeHtml(row.telegram)}
          </button>
        ` : ""}
      </div>
    </details>
  `;
}

function renderAnalyticsInfo(label, value) {
  return `
    <div class="analytics-info-item">
      <span>${escapeHtml(label)}</span>
      <b>${escapeHtml(value || "нет данных")}</b>
    </div>
  `;
}

function analyticsData() {
  const slots = state.slots.filter(slotInAnalyticsRange).sort(compareSlotsDesc);
  const slotIds = new Set(slots.map((slot) => slot.id));
  const rows = state.candidates
    .filter((candidate) => candidateInAnalyticsRange(candidate, slotIds))
    .map(analyticsCandidateRow)
    .sort(compareAnalyticsRows);
  const completedMaterials = rows.filter((row) => row.materialsDone >= row.materialsTotal && row.materialsTotal > 0).length;

  return {
    slots,
    rows,
    periodLabel: analyticsPeriodLabel(),
    metrics: {
      slots: slots.length,
      candidates: rows.length,
      booked: rows.filter((row) => row.raw.interviewSlotId && !["waitlist", "candidate_created"].includes(row.raw.status)).length,
      arrived: rows.filter((row) => row.raw.attendanceStatus === "arrived").length,
      noShow: rows.filter((row) => row.raw.attendanceStatus === "no_show").length,
      leftAfter: rows.filter((row) => row.raw.status === "left_after_interview").length,
      cancelled: rows.filter((row) => row.groupKey === "cancelled").length,
      noConfirmation: rows.filter((row) => row.groupKey === "no_confirmation").length,
      losses: rows.filter((row) => ["no_show", "left_after", "cancelled", "no_confirmation"].includes(row.groupKey)).length,
      needsMaterials: rows.filter((row) => row.groupKey === "needs_materials").length,
      bookedPending: rows.filter((row) => row.groupKey === "booked_pending").length,
      completedMaterials,
      waitlist: rows.filter((row) => row.raw.status === "waitlist").length
    }
  };
}

function analyticsCandidateRow(candidate) {
  const slot = candidate.interviewSlotId ? state.slots.find((item) => item.id === candidate.interviewSlotId) : null;
  const materialsDone = candidate.resourceStepsSent?.length || 0;
  const materialsTotal = resourceSteps().length || 0;
  const lastResourceAt = lastResourceSentAt(candidate);
  const bookedAt = candidateSlotEventAt(candidate.id, slot?.id, "candidate_booked_slot") || candidate.createdAt || "";
  const group = analyticsCandidateGroup(candidate, materialsDone, materialsTotal);
  return {
    raw: candidate,
    sortDate: slot?.date || candidate.createdAt || "",
    slot,
    name: candidate.name || "Без ФИО",
    telegram: cleanTelegram(candidate.telegram) || "без Telegram",
    phone: candidate.phone || "без телефона",
    slotLabel: slot ? slotLabel(slot) : "без даты",
    slotShortLabel: slot ? `${formatDate(slot.date)} · ${slot.time}` : "без даты",
    finalLabel: group.label,
    groupKey: group.key,
    tone: group.tone,
    attendance: analyticsAttendanceLabel(candidate),
    materials: `${materialsDone}/${materialsTotal}`,
    materialsDone,
    materialsTotal,
    bookedAt,
    lastResourceAt
  };
}

function analyticsCandidateGroup(candidate, materialsDone, materialsTotal) {
  if (materialsTotal > 0 && materialsDone >= materialsTotal) {
    return { key: "completed", label: "5/5", tone: "ok" };
  }
  if (candidate.status === "left_after_interview") {
    return { key: "left_after", label: "Отказ", tone: "bad" };
  }
  if (candidate.attendanceStatus === "no_show" || candidate.status === "no_show") {
    return { key: "no_show", label: "Не пришел", tone: "bad" };
  }
  if (candidate.status === "no_confirmation" || candidate.attendanceStatus === "no_confirmation") {
    return { key: "no_confirmation", label: "Не подтвердил", tone: "wait" };
  }
  if (["declined_before_interview", "not_interested"].includes(candidate.status) || candidate.attendanceStatus === "declined_before") {
    return { key: "cancelled", label: "Отказ заранее", tone: "wait" };
  }
  if (candidate.attendanceStatus === "arrived") {
    return { key: "needs_materials", label: "Материалы не все", tone: "ok" };
  }
  if (candidate.status === "waitlist") {
    return { key: "waitlist", label: "Ожидает дату", tone: "accent" };
  }
  return { key: "booked_pending", label: "Ждет собес", tone: "wait" };
}

function analyticsGroups() {
  return [
    { key: "completed", title: "Дошли до 5/5", note: "Все материалы отправлены", tone: "ok" },
    { key: "needs_materials", title: "Пришли, материалы не все", note: "Нужно довести отправку до 5/5", tone: "ok" },
    { key: "booked_pending", title: "Записаны / ждут собес", note: "Дата выбрана, итог еще не закрыт", tone: "wait" },
    { key: "no_show", title: "Не пришли", note: "Рекрут отметил неявку", tone: "bad" },
    { key: "left_after", title: "Отказ после собеса", note: "Пришли, но сотрудничество не начали", tone: "bad" },
    { key: "cancelled", title: "Отказались заранее", note: "Отменили запись до собеса", tone: "wait" },
    { key: "no_confirmation", title: "Не подтвердили", note: "Не ответили на запрос выхода", tone: "wait" },
    { key: "waitlist", title: "Ожидают дату", note: "Сейчас находятся в очереди", tone: "accent" }
  ];
}

function groupedAnalyticsRows(rows, options = {}) {
  return analyticsGroups()
    .map((group) => ({
      ...group,
      rows: rows
        .filter((row) => row.groupKey === group.key)
        .sort(options.slotOrder ? compareAnalyticsRowsByBooking : compareAnalyticsRowsInsideGroup)
    }))
    .filter((group) => group.rows.length > 0);
}

function filteredAnalyticsRows(rows) {
  const query = ui.analyticsCandidateSearch.trim().toLowerCase();
  if (!query) return rows;
  return rows.filter((row) => [
    row.name,
    row.telegram,
    row.phone,
    row.slotLabel,
    row.finalLabel,
    row.attendance
  ].some((value) => String(value || "").toLowerCase().includes(query)));
}

function slotInAnalyticsRange(slot) {
  return dateInRange(slot.date, ui.analyticsFrom, ui.analyticsTo);
}

function candidateInAnalyticsRange(candidate, slotIds) {
  if (candidate.interviewSlotId && slotIds.has(candidate.interviewSlotId)) return true;
  if (candidate.interviewSlotId) return false;
  return dateInRange(String(candidate.createdAt || "").slice(0, 10), ui.analyticsFrom, ui.analyticsTo);
}

function dateInRange(date, from, to) {
  const value = String(date || "").slice(0, 10);
  if (!value) return !from && !to;
  if (from && value < from) return false;
  if (to && value > to) return false;
  return true;
}

function analyticsPeriodLabel() {
  const from = ui.analyticsFrom ? formatDate(ui.analyticsFrom) : "с начала";
  const to = ui.analyticsTo ? formatDate(ui.analyticsTo) : "по сегодня";
  return `${from} - ${to}`;
}

function normalizeAnalyticsView(view) {
  return view === "candidates" ? "candidates" : "slots";
}

function handleAnalyticsDateInput(input) {
  const field = input.dataset.analyticsDate === "to" ? "To" : "From";
  const inputKey = `analytics${field}Input`;
  const valueKey = `analytics${field}`;
  const rawValue = input.value;
  const digitsBeforeCursor = rawValue.slice(0, input.selectionStart ?? rawValue.length).replace(/\D/g, "").length;
  const formatted = formatRuDateInput(input.value);
  ui.analyticsPreset = "custom";
  ui[inputKey] = formatted;
  ui[valueKey] = parseRuDateInput(formatted);

  if (input.value !== formatted) {
    input.value = formatted;
    const cursor = cursorForDateDigits(formatted, digitsBeforeCursor);
    input.setSelectionRange(cursor, cursor);
  }

  refreshAnalyticsPeriodState();
  refreshAnalyticsResults();
}

function refreshAnalyticsPeriodState() {
  document.querySelectorAll("[data-analytics-preset]").forEach((button) => {
    button.classList.toggle("active", button.dataset.analyticsPreset === ui.analyticsPreset);
  });
  const reset = document.querySelector("[data-action='reset-analytics-period']");
  if (reset) {
    const hasPeriod = ui.analyticsPreset !== "all" || ui.analyticsFromInput || ui.analyticsToInput;
    reset.disabled = !hasPeriod;
    reset.setAttribute("aria-disabled", String(!hasPeriod));
  }
}

function refreshAnalyticsResults() {
  if (!state) return;
  ui.analyticsView = normalizeAnalyticsView(ui.analyticsView);
  const analytics = analyticsData();
  const period = document.querySelector("[data-analytics-period-label]");
  if (period) period.textContent = analytics.periodLabel;
  const exportButton = document.querySelector("[data-action='export-analytics']");
  if (exportButton) {
    const disabled = analytics.rows.length === 0 && analytics.slots.length === 0;
    exportButton.disabled = disabled;
    exportButton.setAttribute("aria-disabled", String(disabled));
  }
  const results = document.querySelector("[data-analytics-results]");
  if (!results) {
    render();
    return;
  }
  results.innerHTML = renderAnalyticsResultsBody(analytics);
}

function refreshAnalyticsCandidateResults() {
  if (!state) return;
  const rows = filteredAnalyticsRows(analyticsData().rows);
  const count = document.querySelector("[data-analytics-candidates-count]");
  if (count) count.textContent = String(rows.length);
  const container = document.querySelector("[data-analytics-candidates-results]");
  if (!container) return;
  container.innerHTML = renderAnalyticsCandidateGroups(rows);
}

function formatRuDateInput(value) {
  const text = String(value || "").trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[3]}.${iso[2]}.${iso[1]}`;
  const digits = text.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

function cursorForDateDigits(formatted, digitCount) {
  if (digitCount <= 0) return 0;
  let seen = 0;
  for (let index = 0; index < formatted.length; index += 1) {
    if (/\d/.test(formatted[index])) seen += 1;
    if (seen >= digitCount) return index + 1;
  }
  return formatted.length;
}

async function downloadAnalyticsXlsx() {
  const analytics = analyticsData();
  const rows = [
    ["Период", analytics.periodLabel],
    ["Собесов", analytics.metrics.slots],
    ["Кандидатов", analytics.metrics.candidates],
    ["Пришли", analytics.metrics.arrived],
    ["Потеряны", analytics.metrics.losses],
    ["Получили 5/5", analytics.metrics.completedMaterials],
    ["Отказ после собеса", analytics.metrics.leftAfter],
    ["Не пришли", analytics.metrics.noShow],
    [],
    ["Разбор"],
    ["Записаны / ждут собес", analytics.metrics.bookedPending],
    ["Пришли, материалы не все", analytics.metrics.needsMaterials],
    ["Отказались заранее", analytics.metrics.cancelled],
    ["Не подтвердили", analytics.metrics.noConfirmation],
    [],
    ["Собесы"],
    ["Дата", "Адрес", "Кандидатов", "Получили 5/5", "Не пришли", "Отказ после собеса"],
    ...analytics.slots.map((slot) => {
      const slotRows = analytics.rows.filter((row) => row.slot?.id === slot.id);
      return [
        slotLabel(slot),
        slot.venueAddress || "",
        slotRows.length,
        slotRows.filter((row) => row.groupKey === "completed").length,
        slotRows.filter((row) => row.groupKey === "no_show").length,
        slotRows.filter((row) => row.groupKey === "left_after").length
      ];
    }),
    [],
    ["Кандидаты"],
    ["ФИО", "Telegram", "Телефон", "Собес", "Итог", "Явка", "Материалы", "Последний материал"],
    ...analytics.rows.map((row) => [row.name, row.telegram, row.phone, row.slotLabel, row.finalLabel, row.attendance, row.materials, row.lastResourceAt ? formatDateTime(row.lastResourceAt) : ""])
  ];
  const blob = createXlsxBlob(rows);
  const fileName = `sobes-analytics-${ui.analyticsFrom || "start"}-${ui.analyticsTo || "today"}.xlsx`;

  if (typeof File !== "undefined" && navigator.share && navigator.canShare) {
    const file = new File([blob], fileName, {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Аналитика собеседований LOFT HALL" });
        return "share";
      } catch (error) {
        if (error?.name === "AbortError") return "share";
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return "download";
}

function setAnalyticsPreset(preset) {
  ui.analyticsPreset = preset;
  if (preset === "all") {
    ui.analyticsFrom = "";
    ui.analyticsTo = "";
  } else if (preset === "today") {
    const today = localIsoDate();
    ui.analyticsFrom = today;
    ui.analyticsTo = today;
  } else if (preset === "7d") {
    const today = localIsoDate();
    ui.analyticsFrom = addDaysIso(today, -6);
    ui.analyticsTo = today;
  } else if (preset === "30d") {
    const today = localIsoDate();
    ui.analyticsFrom = addDaysIso(today, -29);
    ui.analyticsTo = today;
  } else {
    ui.analyticsFrom = parseRuDateInput(ui.analyticsFromInput);
    ui.analyticsTo = parseRuDateInput(ui.analyticsToInput);
  }

  if (preset !== "custom") {
    ui.analyticsFromInput = ui.analyticsFrom ? isoDateToRuInput(ui.analyticsFrom) : "";
    ui.analyticsToInput = ui.analyticsTo ? isoDateToRuInput(ui.analyticsTo) : "";
  }
}

function parseRuDateInput(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(text) && isRealIsoDate(text)) return text;

  const digits = text.replace(/\D/g, "");
  if (digits.length !== 8) return "";
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  const iso = `${year}-${month}-${day}`;
  return isRealIsoDate(iso) ? iso : "";
}

function isRealIsoDate(value) {
  const [year, month, day] = String(value || "").split("-").map(Number);
  const date = new Date(`${value}T12:00:00`);
  return (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    Number.isInteger(day) &&
    date.getFullYear() === year &&
    date.getMonth() + 1 === month &&
    date.getDate() === day
  );
}

function isoDateToRuInput(value) {
  const [year, month, day] = String(value || "").split("-");
  return year && month && day ? `${day}.${month}.${year}` : "";
}

function localIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysIso(iso, days) {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + Number(days || 0));
  return localIsoDate(date);
}

function compareSlotsDesc(left, right) {
  const leftKey = `${left.date || ""}T${left.time || "00:00"}`;
  const rightKey = `${right.date || ""}T${right.time || "00:00"}`;
  return rightKey.localeCompare(leftKey) || String(right.id).localeCompare(String(left.id));
}

function compareSlotsAsc(left, right) {
  return slotDateTimeKey(left).localeCompare(slotDateTimeKey(right)) ||
    String(left.createdAt || "").localeCompare(String(right.createdAt || "")) ||
    String(left.id).localeCompare(String(right.id));
}

function compareArchivedSlots(left, right) {
  const leftKey = left.completedAt || slotDateTimeKey(left);
  const rightKey = right.completedAt || slotDateTimeKey(right);
  return String(rightKey).localeCompare(String(leftKey)) || String(right.id).localeCompare(String(left.id));
}

function slotDateTimeKey(slot = {}) {
  return `${slot.date || "9999-12-31"}T${slot.time || "23:59"}`;
}

function compareJournalCandidates(left, right) {
  return candidateBookingSortTime(left).localeCompare(candidateBookingSortTime(right)) ||
    String(left.name || "").localeCompare(String(right.name || "")) ||
    String(left.id).localeCompare(String(right.id));
}

function compareArchiveCandidates(left, right) {
  const leftPriority = archiveCandidatePriority(left);
  const rightPriority = archiveCandidatePriority(right);
  if (leftPriority !== rightPriority) return leftPriority - rightPriority;
  return compareJournalCandidates(left, right);
}

function archiveCandidatePriority(candidate) {
  if (isArrivedCandidate(candidate) && candidate.status !== "left_after_interview") return 0;
  if (isPostInterviewRefusal(candidate)) return 1;
  if (isMissedCandidate(candidate)) return 2;
  if (candidate.status === "declined_before_interview" || candidate.status === "no_confirmation") return 3;
  return 4;
}

function candidateBookingSortTime(candidate) {
  return candidateSlotEventAt(candidate.id, candidate.interviewSlotId, "candidate_booked_slot") ||
    candidate.createdAt ||
    candidate.updatedAt ||
    "";
}

function compareAnalyticsRows(left, right) {
  const leftGroup = analyticsGroups().findIndex((group) => group.key === left.groupKey);
  const rightGroup = analyticsGroups().findIndex((group) => group.key === right.groupKey);
  if (leftGroup !== rightGroup) return leftGroup - rightGroup;
  return compareAnalyticsRowsInsideGroup(left, right);
}

function compareAnalyticsRowsInsideGroup(left, right) {
  if (left.groupKey === "completed") {
    return String(right.lastResourceAt || right.raw.updatedAt || "").localeCompare(String(left.lastResourceAt || left.raw.updatedAt || "")) || left.name.localeCompare(right.name);
  }
  if (["no_show", "left_after", "cancelled"].includes(left.groupKey)) {
    return String(right.raw.updatedAt || "").localeCompare(String(left.raw.updatedAt || "")) || left.name.localeCompare(right.name);
  }
  return compareAnalyticsRowsByBooking(left, right);
}

function compareAnalyticsRowsByBooking(left, right) {
  return String(left.bookedAt || left.raw.createdAt || "").localeCompare(String(right.bookedAt || right.raw.createdAt || "")) || left.name.localeCompare(right.name);
}

function lastResourceSentAt(candidate) {
  return (candidate.resourceStepsSent || [])
    .map((step) => step.sentAt)
    .filter(Boolean)
    .sort()
    .at(-1) || "";
}

function candidateSlotEventAt(candidateId, slotId, type) {
  return (state.events || [])
    .filter((event) => event.candidateId === candidateId && (!slotId || event.slotId === slotId) && (!type || event.type === type))
    .map((event) => event.createdAt)
    .filter(Boolean)
    .sort()[0] || "";
}

function analyticsAttendanceLabel(candidate) {
  if (candidate.status === "left_after_interview") return "Пришел, отказ после собеса";
  if (candidate.attendanceStatus === "arrived") return "Пришел";
  if (candidate.attendanceStatus === "no_show") return "Не пришел";
  if (candidate.attendanceStatus === "declined_before") return "Отказался заранее";
  if (candidate.attendanceStatus === "no_confirmation") return "Не подтвердил";
  if (candidate.confirmationStatus === "confirmed") return "Подтвердил, ждем собес";
  if (candidate.confirmationStatus === "pending") return "Запрос отправлен";
  return "Не отмечен";
}

function createXlsxBlob(rows) {
  const files = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Аналитика" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`,
    "xl/worksheets/sheet1.xml": worksheetXml(rows)
  };
  return new Blob([zipStore(files)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
}

function worksheetXml(rows) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    ${rows.map((row, index) => worksheetRowXml(row, index + 1)).join("\n")}
  </sheetData>
</worksheet>`;
}

function worksheetRowXml(row, rowIndex) {
  return `<row r="${rowIndex}">${(row || []).map((value, columnIndex) => worksheetCellXml(value, rowIndex, columnIndex)).join("")}</row>`;
}

function worksheetCellXml(value, rowIndex, columnIndex) {
  const ref = `${xlsxColumnName(columnIndex)}${rowIndex}`;
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${ref}"><v>${value}</v></c>`;
  }
  return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(String(value ?? ""))}</t></is></c>`;
}

function xlsxColumnName(index) {
  let value = index + 1;
  let label = "";
  while (value > 0) {
    const modulo = (value - 1) % 26;
    label = String.fromCharCode(65 + modulo) + label;
    value = Math.floor((value - modulo) / 26);
  }
  return label;
}

function zipStore(files) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const [name, content] of Object.entries(files)) {
    const nameBytes = encoder.encode(name);
    const dataBytes = encoder.encode(content);
    const crc = crc32(dataBytes);
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, 0, true);
    localView.setUint16(12, 0, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, dataBytes.length, true);
    localView.setUint32(22, dataBytes.length, true);
    localView.setUint16(26, nameBytes.length, true);
    localView.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);
    localParts.push(localHeader, dataBytes);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, 0, true);
    centralView.setUint16(14, 0, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, dataBytes.length, true);
    centralView.setUint32(24, dataBytes.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);
    centralParts.push(centralHeader);
    offset += localHeader.length + dataBytes.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, Object.keys(files).length, true);
  endView.setUint16(10, Object.keys(files).length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);

  return new Blob([...localParts, ...centralParts, end]);
}

function crc32(bytes) {
  let crc = -1;
  for (const byte of bytes) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ byte) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function renderStatsMap(stats, labelFn) {
  return Object.entries(stats || {})
    .filter(([key, count]) => key !== "pending" && count > 0)
    .map(([key, count]) => `
      <div class="reason-card">
        <b>${escapeHtml(labelFn(key))}</b>
        <span class="pill">${count}</span>
      </div>
    `)
    .join("") || '<div class="empty">Данных пока нет</div>';
}

function filterCandidates(candidates) {
  const query = ui.recruiterSearch.trim().toLowerCase();
  if (!query) return candidates;
  return candidates.filter((candidate) => candidateMatchesQuery(candidate, query));
}

function filterArchivedSlots(slots) {
  const query = ui.archiveSearch.trim().toLowerCase();
  if (!query) return slots;
  return slots.filter((slot) => {
    const slotValues = [
      slot.title,
      slot.date,
      slot.time,
      formatDate(slot.date),
      slot.venue,
      slot.venueAddress,
      slotLabel(slot)
    ];
    return (
      slotValues.filter(Boolean).some((value) => String(value).toLowerCase().includes(query)) ||
      archiveCandidatesForSlot(slot).some((candidate) => candidateMatchesQuery(candidate, query))
    );
  });
}

function archiveCandidatesForSlot(slot) {
  return candidatesForSlot(slot.id).sort(compareArchiveCandidates);
}

function candidateMatchesQuery(candidate, query) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  if (!normalizedQuery) return true;
  return [
    candidate.name,
    candidate.telegram,
    candidate.telegramId,
    candidate.phone,
    candidate.source,
    stageLabel(candidate),
    statusLabel(candidate.status)
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalizedQuery));
}

function isUnmarkedCandidate(candidate) {
  return ["unknown", "not_requested", ""].includes(candidate.attendanceStatus || "unknown");
}

function isPostInterviewRefusal(candidate) {
  return candidate.status === "left_after_interview";
}

function isArrivedCandidate(candidate) {
  return candidate.attendanceStatus === "arrived" && !isPostInterviewRefusal(candidate);
}

function isMissedCandidate(candidate) {
  return !isPostInterviewRefusal(candidate) && ["no_show", "declined_before", "no_confirmation"].includes(candidate.attendanceStatus);
}

function candidateHasActiveBooking(candidate) {
  if (!candidate?.interviewSlotId) return false;
  const slot = state.slots.find((item) => item.id === candidate.interviewSlotId);
  if (!slot || slot.status === "completed") return false;
  return ["booked", "confirmation_pending", "confirmed", "attended", "registration_pending", "registered", "ready_for_internship"].includes(candidate.status);
}

function canCancelBooking(candidate) {
  return candidateHasActiveBooking(candidate) && ["booked", "confirmation_pending", "confirmed"].includes(candidate.status);
}

function candidateCardTone(candidate) {
  if (candidate.status === "left_after_interview") return "left";
  if (isArrivedCandidate(candidate)) return "arrived";
  if (isMissedCandidate(candidate)) return "missed";
  return "unmarked";
}

function renderEvent(event) {
  const target = event.candidateId ? state.candidates.find((candidate) => candidate.id === event.candidateId) : null;
  return `
    <div class="event-card">
      <div>
        <b>${escapeHtml(eventTypeLabel(event.type))}</b>
        <div class="meta">
          <span>${escapeHtml(formatDateTime(event.createdAt))}</span>
          ${target ? `<span>${escapeHtml(target.name)}</span>` : ""}
        </div>
      </div>
      <span class="pill">${escapeHtml(event.actor || "system")}</span>
    </div>
  `;
}

function renderSlotOptions() {
  const slots = visibleActiveSlots();
  return slots.length
    ? slots
    .map((slot) => `<option value="${slot.id}" ${slot.id === ui.selectedSlotId ? "selected" : ""}>${escapeHtml(slotLabel(slot))}</option>`)
    .join("")
    : '<option value="">Нет активных дат</option>';
}

function candidatesForSlot(slotId) {
  return state.candidates.filter((candidate) => candidate.interviewSlotId === slotId);
}

function renderVenueOptions() {
  const venues = state.settings?.interviewVenues || [];
  return venues
    .map((venue) => `
      <option value="${escapeAttr(venue.id)}">${escapeHtml(venue.name || "LOFT HALL")}</option>
    `)
    .join("");
}

function renderHourOptions() {
  return Array.from({ length: 24 }, (_, hour) => {
    const value = String(hour).padStart(2, "0");
    const selected = value === "12" ? "selected" : "";
    return `<option value="${value}" ${selected}>${value}</option>`;
  }).join("");
}

function renderMinuteOptions() {
  return ["00", "15", "30", "45"]
    .map((value) => `<option value="${value}" ${value === "00" ? "selected" : ""}>${value}</option>`)
    .join("");
}

function renderStep(label, done) {
  return `<div class="step ${done ? "done" : ""}">${escapeHtml(label)}</div>`;
}

function renderTab(tab, label) {
  return `<button type="button" data-tab="${tab}" class="subtab ${ui.recruiterTab === tab ? "active" : ""}">${escapeHtml(label)}</button>`;
}

function renderStageTrack(candidate) {
  const stages = candidateStages(candidate);
  const currentIndex = currentStageIndex(candidate, stages);
  const selectedHelp = stages.find((stage) => stage.key === ui.stageHelpKey) || stages[currentIndex] || stages[0];

  return `
    <div class="stage-track five" aria-label="Путь кандидата">
      ${stages
        .map((stage, index) => {
          const stateClass = index < currentIndex ? "done" : index === currentIndex ? "current" : "";
          return `
            <button
              class="stage-node ${stateClass}"
              type="button"
              data-action="show-stage-help"
              data-stage-key="${escapeAttr(stage.key)}"
              aria-label="${escapeAttr(stage.label)}"
              ${selectedHelp?.key === stage.key ? "aria-pressed=\"true\"" : ""}
            >
              <span class="stage-dot">${stageIcon(stage.icon)}</span>
              <span class="stage-caption">${escapeHtml(stage.label)}</span>
            </button>
          `;
        })
        .join("")}
    </div>
    ${selectedHelp ? `
      <div class="stage-help">
        <b>${escapeHtml(selectedHelp.title)}</b>
        <span>${escapeHtml(selectedHelp.description)}</span>
      </div>
    ` : ""}
  `;
}

function candidateStages(candidate) {
  const resourceCount = candidate.resourceStepsSent?.length || 0;
  const resourceTotal = resourceSteps().length || 0;
  return [
    {
      key: "profile",
      label: "Анкета",
      title: "Анкета сохранена",
      description: "ФИО, Telegram и телефон лежат в общем слое кандидатов.",
      icon: "file"
    },
    {
      key: "booking",
      label: "Запись",
      title: candidate.status === "waitlist" ? "Ожидает дату" : candidate.interviewSlotId ? "Дата выбрана" : "Без даты",
      description: candidate.status === "waitlist"
        ? "Кандидат в общем листе ожидания и получит уведомление о новой дате."
        : candidate.interviewSlotId
          ? "Кандидат записан на конкретную дату собеседования."
          : "Кандидат заполнил контакты, но еще не записался и не вставал в очередь.",
      icon: "calendar"
    },
    {
      key: "confirmation",
      label: "Подтв.",
      title: "Подтверждение участия",
      description: "За день до собеса кандидат отвечает, придет он или нет.",
      icon: "chat"
    },
    {
      key: "interview",
      label: "Собес",
      title: "Отметка явки",
      description: "Рекрут отмечает, пришел кандидат на собеседование или нет.",
      icon: "check"
    },
    {
      key: "resources",
      label: "Материалы",
      title: resourceCount ? `Материалы ${resourceCount}/${resourceTotal}` : "Материалы после собеса",
      description: "Пришедшим отправляются регистрация, бот смен, группа, база знаний и самозанятость.",
      icon: "send"
    }
  ];
}

function currentStageIndex(candidate, stages = candidateStages(candidate)) {
  if ((candidate.resourceStepsSent?.length || 0) > 0 || ["registration_pending", "registered", "ready_for_internship"].includes(candidate.status)) {
    return stages.findIndex((stage) => stage.key === "resources");
  }
  if (["arrived", "no_show", "declined_before", "no_confirmation"].includes(candidate.attendanceStatus) || ["attended", "left_after_interview", "no_show"].includes(candidate.status)) {
    return stages.findIndex((stage) => stage.key === "interview");
  }
  if (["pending", "confirmed", "declined"].includes(candidate.confirmationStatus)) {
    return stages.findIndex((stage) => stage.key === "confirmation");
  }
  if (candidate.interviewSlotId && candidate.status !== "waitlist") {
    return stages.findIndex((stage) => stage.key === "booking");
  }
  return 0;
}

function stageIcon(name) {
  const icons = {
    file: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v4M17 3v4M4 9h16M6 5h12a2 2 0 0 1 2 2v12H4V7a2 2 0 0 1 2-2z"/><path d="M8 13h3M8 17h6"/></svg>',
    chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14v9H8l-3 3V6z"/><path d="M8 10h8M8 13h5"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l4 4L19 6"/></svg>',
    send: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 3L10 14"/><path d="M21 3l-7 18-4-7-7-4 18-7z"/></svg>',
    flag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 21V4h10l-1 4 1 4H6"/></svg>'
  };
  return icons[name] || icons.check;
}

function renderCandidateMeta(candidate) {
  return `
    <div class="candidate-info-grid">
      <div class="candidate-info-item">
        <span>Никнейм</span>
        <b>${escapeHtml(candidate.telegram || "не указан")}</b>
      </div>
      <div class="candidate-info-item">
        <span>Телефон</span>
        <b>${escapeHtml(candidate.phone || "без телефона")}</b>
      </div>
    </div>
  `;
}

function renderStatusPill(status, label = null, candidateStyle = false) {
  return `<span class="pill ${candidateStyle ? "candidate-status " : ""}${statusTone(status)}">${escapeHtml(label || statusLabel(status))}</span>`;
}

function renderRegistrationPill(status) {
  const tone = status === "registered" ? "ok" : status === "pending" ? "wait" : "accent";
  return `<span class="pill ${tone}">${escapeHtml(registrationLabel(status))}</span>`;
}

function renderSourceOptions(value) {
  const options = ["Telegram", "HH", "Рекомендация", "Авито", "Instagram", "Другое", "Не указан"];
  return options
    .map((option) => `<option value="${escapeAttr(option)}" ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`)
    .join("");
}

function collectCandidateProfile() {
  const form = document.querySelector("#candidate-form");
  if (!form) {
    showToast("Форма кандидата не найдена");
    return null;
  }

  const data = Object.fromEntries(new FormData(form));
  const candidate = {
    candidateId: ui.candidateId || undefined,
    telegramId: data.telegramId?.trim(),
    telegram: data.telegram?.trim(),
    name: data.name?.trim(),
    phone: data.phone?.trim(),
    source: data.source?.trim() || "Мини-приложение",
    availability: data.availability?.trim(),
    note: data.note?.trim()
  };

  const validation = validateCandidateProfile(candidate);
  if (!validation.ok) {
    showToast(validation.message);
    return null;
  }

  candidate.name = validation.name;
  candidate.phone = validation.phone;
  candidate.telegram = cleanTelegram(candidate.telegram);
  return candidate;
}

function scheduleCandidateAutosave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(async () => {
    const form = document.querySelector("#candidate-form");
    const status = document.querySelector("#candidateAutosaveStatus");
    if (!form || !status) return;
    if (!ui.candidateId) {
      status.textContent = "Данные сохранятся после записи или ожидания";
      return;
    }

    const data = Object.fromEntries(new FormData(form));
    const validation = validateCandidateProfile({
      name: data.name?.trim(),
      telegram: data.telegram?.trim(),
      phone: data.phone?.trim()
    });
    if (!validation.ok) {
      status.textContent = validation.message;
      return;
    }

    status.textContent = "Сохраняем...";
    try {
      const payload = {
        action: "upsert_candidate",
        payload: {
          candidateId: ui.candidateId || undefined,
          telegramId: data.telegramId?.trim(),
          name: validation.name,
          phone: validation.phone,
          telegram: cleanTelegram(data.telegram),
          source: "Мини-приложение"
        }
      };
      const response = await fetchJson("/api/command", {
        method: "POST",
        headers: requestHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload)
      });
      state = response.state;
      rememberCandidate(response.result.candidateId);
      status.textContent = "Сохранено";
    } catch (error) {
      status.textContent = "Не сохранено";
    }
  }, 650);
}

function requireCurrentCandidateId() {
  if (!ui.candidateId) {
    throw new Error("Сначала сохраните анкету кандидата");
  }
  return ui.candidateId;
}

function rememberCandidate(candidateId) {
  if (!candidateId) return;
  ui.candidateId = candidateId;
  localStorage.setItem("lh_interviews_candidate_id", candidateId);
}

function clearRememberedCandidate() {
  ui.candidateId = "";
  localStorage.removeItem("lh_interviews_candidate_id");
}

function reconcileRememberedCandidate() {
  if (!ui.candidateId || !state) return;
  const candidate = state.candidates.find((item) => item.id === ui.candidateId);
  if (!candidate) {
    clearRememberedCandidate();
    return;
  }
  const telegramId = String(telegramWebAppUser()?.id || "");
  if (telegramId && candidate.telegramId && String(candidate.telegramId) !== telegramId) {
    clearRememberedCandidate();
  }
}

function getCurrentCandidate() {
  if (!ui.candidateId) return null;
  return state.candidates.find((candidate) => candidate.id === ui.candidateId) || null;
}

function isDeveloperUser() {
  const telegramId = String(telegramWebAppUser()?.id || "");
  const developerIds = (state?.settings?.developerTelegramIds || []).map((id) => String(id));
  return Boolean(telegramId && developerIds.includes(telegramId));
}

async function copyText(value) {
  if (!value) return;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function cleanTelegram(value) {
  const tag = String(value || "").trim();
  if (!tag) return "";
  return tag.startsWith("@") ? tag : `@${tag}`;
}

function validateCandidateProfile(candidate = {}) {
  const name = String(candidate.name || "").trim().replace(/\s+/g, " ");
  if (!isValidFullName(name)) {
    return { ok: false, message: "ФИО нужно русскими буквами: Иванов Иван" };
  }

  const phone = normalizeRussianPhoneInput(candidate.phone);
  if (!phone) {
    return { ok: false, message: "Телефон нужен в формате +7XXXXXXXXXX" };
  }

  if (!String(candidate.telegram || "").trim()) {
    return { ok: false, message: "Telegram обязателен" };
  }

  return { ok: true, name: normalizeFullName(name), phone };
}

function isValidFullName(value) {
  const text = String(value || "").trim();
  if (text.length < 5 || text.length > 120) return false;
  if (/[\d_/@#$%^&*=+{}[\]<>|~]/.test(text)) return false;
  const parts = text.split(" ").filter(Boolean);
  if (parts.length < 2) return false;
  return parts.every((part) => /^[А-Яа-яЁё-]{2,}$/.test(part));
}

function normalizeFullName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map(normalizeNameWord)
    .join(" ");
}

function normalizeNameWord(word) {
  return word
    .split("-")
    .map((part) => {
      const lower = part.toLocaleLowerCase("ru-RU");
      return lower ? `${lower.slice(0, 1).toLocaleUpperCase("ru-RU")}${lower.slice(1)}` : "";
    })
    .join("-");
}

function normalizeRussianPhoneInput(value) {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");
  if (raw.startsWith("+7") && digits.length === 11 && digits.startsWith("7")) return `+${digits}`;
  if (!raw.startsWith("+") && digits.length === 11 && digits.startsWith("8")) return `+7${digits.slice(1)}`;
  if (!raw.startsWith("+") && digits.length === 11 && digits.startsWith("7")) return `+${digits}`;
  if (!raw.startsWith("+") && digits.length === 10 && digits.startsWith("9")) return `+7${digits}`;
  return "";
}

function candidateNotifications(candidateId) {
  return (state.notifications || [])
    .filter((notification) => notification.candidateId === candidateId)
    .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
}

function slotLabel(slot) {
  return `${formatDate(slot.date)} · ${slot.time} · ${slot.venue}`;
}

function statusLabel(status) {
  const labels = {
    candidate_created: "Анкета",
    waitlist: "Ожидает дату",
    booked: "Записан",
    confirmation_pending: "Ждет подтверждение",
    confirmed: "Подтвердил",
    declined_before_interview: "Отказ заранее",
    no_confirmation: "Не подтвердил",
    attended: "Пришел",
    left_after_interview: "Отказ",
    no_show: "Не пришел",
    registration_pending: "Регистрация",
    registered: "Зарегистрирован",
    ready_for_internship: "Готов к стажировке",
    rejected: "Не прошел",
    not_interested: "Не актуально"
  };
  return labels[status] || status || "Статус";
}

function historyOutcomeLabel(item = {}) {
  const outcome = item.outcome || item.status || "";
  if (outcome === "no_show") return "Не пришел";
  if (outcome === "cancelled_booking" || outcome === "declined_confirmation" || outcome === "declined_before_interview") return "Отказ";
  if (outcome === "joined_waitlist") return "Лист ожидания";
  if (outcome === "waitlist_booking" || outcome === "rebooked" || outcome === "booked") return "Запись";
  if (outcome === "confirmed") return "Подтвердил";
  if (item.attendanceStatus === "arrived") return "Пришел";
  if (item.attendanceStatus === "no_show") return "Не пришел";
  if (item.attendanceStatus === "declined_before") return "Отказ";
  return statusLabel(outcome);
}

function stageLabel(candidate) {
  if (candidate.resourceStepsSent?.length > 0) return `Материалы ${candidate.resourceStepsSent.length}/${resourceSteps().length || 0}`;
  if (candidate.status === "candidate_created") return "Анкета сохранена";
  if (candidate.status === "waitlist") return "В листе ожидания";
  if (candidate.status === "booked") return "Записан на собеседование";
  if (candidate.status === "confirmation_pending") return "Ждет подтверждение";
  if (candidate.status === "confirmed") return "Подтвердил участие";
  if (candidate.status === "attended") return "Пришел на собес";
  if (candidate.status === "left_after_interview") return "Отказ после собеседования";
  if (candidate.status === "registration_pending") return "Регистрация";
  if (candidate.status === "ready_for_internship") return "Стажировка";
  if (["no_show", "declined_before_interview", "no_confirmation"].includes(candidate.status)) return "Повторная запись или отказ";
  if (candidate.status === "rejected") return "Закрыт после собеседования";
  return "Кандидат";
}

function candidateLayerLabel(candidate) {
  const labels = {
    waiting_for_interview_date: "Ждет новую дату собеседования",
    interview_booked: "Записан на собеседование",
    interview_confirmation_pending: "Нужно подтвердить участие",
    interview_confirmed: "Участие подтверждено",
    interview_declined_before: "Отказался до собеседования",
    interview_no_confirmation: "Не дал подтверждение",
    interview_attended: "Пришел на собеседование",
    resources_sent: "Материалы отправлены",
    left_after_interview: "Отказ после собеседования",
    interview_no_show: "Не пришел на собеседование",
    interview_passed: "После собеседования",
    ready_for_internship: "Готов к стажировке",
    interview_rejected: "Не продолжает путь"
  };
  return labels[candidate.candidateLayerStatus] || stageLabel(candidate);
}

function journalStatusLabel(candidate) {
  if (candidate.status === "left_after_interview") return "Отказ после собеса";
  if (candidate.attendanceStatus === "arrived" && candidate.confirmationStatus === "confirmed") return "Подтвердил и пришел";
  if (candidate.attendanceStatus === "no_show" && candidate.confirmationStatus === "confirmed") return "Подтвердил, но не пришел";
  if (candidate.attendanceStatus === "declined_before" || candidate.confirmationStatus === "declined") return "Заранее отказался";
  if (candidate.attendanceStatus === "no_confirmation" || candidate.confirmationStatus === "pending") return "Не подтвердил участие";
  if (candidate.attendanceStatus === "arrived") return "Пришел";
  if (candidate.attendanceStatus === "no_show") return "Не пришел";
  return "Ожидаем собеседование";
}

function attendanceMarkLabel(candidate) {
  if (candidate.status === "left_after_interview") return "Отказ";
  if (candidate.attendanceStatus === "arrived") return "Пришел";
  if (candidate.attendanceStatus === "declined_before") return "Отказ";
  if (candidate.attendanceStatus === "no_confirmation") return "Не подтвердил";
  return "Не пришел";
}

function attendanceLabel(value) {
  const labels = {
    arrived: "Пришли",
    no_show: "Не пришли",
    no_confirmation: "Не подтвердили",
    left_after: "Отказ после собеса"
  };
  return labels[value] || value || "Статус";
}

function registrationLabel(status) {
  const labels = {
    not_started: "Не начинали",
    instructions_sent: "Инструкция отправлена",
    materials_scheduled: "Материалы запланированы",
    materials_sent: "Материалы отправлены",
    pending: "Ждем регистрацию",
    registered: "Зареган"
  };
  return labels[status] || status || "Регистрация";
}

function statusTone(status) {
  if (["ready_for_internship", "registered", "attended", "confirmed"].includes(status)) return "ok";
  if (["waitlist", "confirmation_pending", "registration_pending", "booked", "no_confirmation"].includes(status)) return "wait";
  if (["rejected", "no_show", "declined_before_interview", "not_interested", "left_after_interview"].includes(status)) return "bad";
  return "accent";
}

function eventTypeLabel(type) {
  const labels = {
    seed_created: "Демо создано",
    candidate_profile_saved: "Анкета сохранена",
    candidate_booked_slot: "Запись на собес",
    candidate_joined_waitlist: "Ожидание даты",
    slot_created: "Дата создана",
    waitlist_notified: "Ожидание уведомлено",
    confirmation_requested: "Запрос подтверждения",
    candidate_confirmation_answered: "Ответ кандидата",
    candidate_confirmation_answer_ignored: "Повторный ответ",
    candidate_booking_cancelled: "Запись отменена",
    attendance_marked: "Журнал явки",
    interview_result_set: "Итог собеса",
    resources_sent: "Материалы отправлены",
    resource_step_sent: "Материалы отправлены",
    slot_completed: "Дата закрыта",
    candidate_left_after_interview: "Отказ после собеса",
    registration_materials_sent: "Материалы регистрации",
    registration_marked: "Регистрация",
    slot_registered_all: "Все зареганы",
    candidate_rebook_interest: "Повторная запись",
    loss_reason_recorded: "Потеря кандидата",
    link_click_recorded: "Переход по ссылке"
  };
  return labels[type] || type;
}

function formatDate(value) {
  if (!value) return "Дата";
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "short",
    day: "2-digit",
    month: "short"
  }).format(new Date(`${value}T12:00:00`));
}

function dayNumber(value) {
  if (!value) return "•";
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit" }).format(new Date(`${value}T12:00:00`));
}

function formatDateTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2600);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}
