const ui = {
  role: localStorage.getItem("lh_interviews_role") || "candidate",
  recruiterTab: "journal",
  candidateId: localStorage.getItem("lh_interviews_candidate_id") || "",
  selectedSlotId: "",
  recruiterSearch: "",
  archiveSearch: "",
  stageHelpKey: "",
  actionFeedback: {}
};

const app = document.querySelector("#app");
const toast = document.querySelector("#toast");
let state = null;
let toastTimer = null;
let autosaveTimer = null;

const lossReasons = [
  ["date_time", "Дата или время"],
  ["location", "Расположение"],
  ["circumstances", "Обстоятельства"],
  ["conditions", "Условия работы"],
  ["other_offer", "Другое предложение"],
  ["other", "Другое"]
];

disableViewportZoom();
loadState();

document.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button || button.disabled) return;

  const role = button.dataset.role;
  const tab = button.dataset.tab;
  const action = button.dataset.action;

  if (role) {
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

    if (action === "clear-slot-template") {
      const form = button.closest("#slot-form");
      if (!form) return;
      form.elements.bookingText.value = "";
      form.elements.directionsVideoUrl.value = "";
      form.elements.templateCleared.value = "true";
      rememberActionFeedback(button);
      showToast("Шаблон очищен");
      return;
    }

    if (action === "show-stage-help") {
      ui.stageHelpKey = button.dataset.stageKey || "";
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
      showToast(response.result.resourceLabel ? `${response.result.resourceLabel}: отправлено ${response.result.sentCount}` : "Все ресурсы уже отправлены");
      return;
    }

    if (action === "mark-left-after-interview") {
      await runCommand("mark_left_after_interview", {
        candidateId: button.dataset.candidateId
      }, button);
      showToast("Кандидат отмечен как ушедший после собеса");
      return;
    }

    if (action === "complete-slot") {
      await runCommand("complete_slot", { slotId: button.dataset.slotId || ui.selectedSlotId }, button);
      ui.selectedSlotId = firstActiveSlot()?.id || "";
      render();
      showToast("Собеседование завершено");
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

    if (action === "loss-reason") {
      await runCommand("record_loss_reason", {
        candidateId: button.dataset.candidateId || requireCurrentCandidateId(),
        reason: button.dataset.reason
      }, button);
      showToast("Причина сохранена");
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
      const response = await fetchJson("/api/reset", { method: "POST" });
      state = response.state;
      ui.selectedSlotId = state.slots[0]?.id || "";
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

  if (event.target.matches("#slot-form [name='bookingText'], #slot-form [name='directionsVideoUrl']")) {
    const form = event.target.closest("#slot-form");
    if (form?.elements.templateCleared) {
      form.elements.templateCleared.value = "";
    }
  }

  if (event.target.closest("#candidate-form")) {
    scheduleCandidateAutosave();
  }
});

document.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;

  try {
    if (form.id === "candidate-form") {
      const candidate = collectCandidateProfile();
      if (!candidate) return;
      const response = await runCommand("upsert_candidate", candidate);
      rememberCandidate(response.result.candidateId);
      showToast("Анкета сохранена");
    }

    if (form.id === "slot-form") {
      const data = Object.fromEntries(new FormData(form));
      data.time = `${data.hour}:${data.minute}`;
      delete data.hour;
      delete data.minute;
      if (data.bookingText?.trim() || data.directionsVideoUrl?.trim()) {
        data.templateCleared = "";
      }
      const response = await runCommand("create_slot", data);
      form.reset();
      showToast(`Дата создана, уведомлений: ${response.result.notifiedCount || 0}`);
    }
  } catch (error) {
    showToast(error.message || "Форма не сохранена");
  }
});

async function loadState() {
  const response = await fetchJson("/api/state");
  state = response.state;
  ui.selectedSlotId = ui.selectedSlotId || state.slots[0]?.id || "";
  render();
}

async function runCommand(action, payload, feedbackButton = null) {
  const response = await fetchJson("/api/command", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload })
  });
  state = response.state;
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

  if (!activeSlots().some((slot) => slot.id === ui.selectedSlotId)) {
    ui.selectedSlotId = firstActiveSlot()?.id || "";
  }

  const candidate = getCurrentCandidate();
  const roleSwitchTarget = ui.role === "candidate" ? "recruiter" : "candidate";
  const roleSwitchLabel = ui.role === "candidate" ? "Кабинет рекрута" : "К форме записи";

  app.innerHTML = `
    <header class="top">
      <div class="shell-bar">
        <a class="back-home-link" href="/" aria-label="Вернуться в главное меню">
          <span>‹</span>
          <span>Главное меню</span>
        </a>
        <button class="role-toggle" data-role="${roleSwitchTarget}" type="button" aria-label="${roleSwitchLabel}" title="${roleSwitchLabel}">
          ${ui.role === "candidate" ? "Р" : "К"}
        </button>
      </div>
      <div class="head">
        <div>
          <h1>Собеседования</h1>
          <p class="lead">Запись, ожидание новой даты, подтверждение, журнал явки и отправка ресурсов после собеса.</p>
        </div>
      </div>
    </header>

    <nav class="tabs" aria-label="Роль">
      <button type="button" data-role="candidate" class="tab ${ui.role === "candidate" ? "active" : ""}">Кандидат</button>
      <button type="button" data-role="recruiter" class="tab ${ui.role === "recruiter" ? "active" : ""}">Рекрут</button>
    </nav>

    ${ui.role === "candidate" ? renderCandidateView(candidate) : renderRecruiterView()}
  `;
}

function renderCandidateView(candidate) {
  const openSlots = state.slots.filter((slot) => slot.status === "open");

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
          <span class="pill ok">${openSlots.length} дат</span>
        </div>
        <div class="date-list">
          ${openSlots.map((slot) => renderCandidateSlot(slot)).join("") || '<div class="empty">Открытых дат пока нет</div>'}
        </div>
        <button type="button" class="secondary" data-action="join-waitlist">Уведомить о следующем собеседовании</button>
      </section>

      ${candidate ? renderLossReasonSurvey(candidate) : ""}
    </section>
  `;
}

function renderCandidateForm(candidate) {
  const profile = candidate || {};
  return `
    <form id="candidate-form" class="form-grid candidate-short-form">
      <label>
        ФИО
        <input name="name" value="${escapeAttr(profile.name)}" autocomplete="name" required placeholder="Иванов Иван" />
      </label>
      <label>
        Telegram
        <input name="telegram" value="${escapeAttr(profile.telegram)}" autocomplete="username" required placeholder="@username" />
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

function renderNotification(notification) {
  const slot = notification.slotId ? state.slots.find((item) => item.id === notification.slotId) : null;
  return `
    <article class="notice notification-card">
      <div class="queue-notice-head">
        <b>${escapeHtml(notification.title)}</b>
        <span>${escapeHtml(formatDateTime(notification.createdAt))}</span>
      </div>
      <p>${escapeHtml(notification.message)}</p>
      ${slot && notification.type === "waitlist_new_slot" ? `
        <div class="button-row">
          <button type="button" class="primary" data-action="book-slot" data-slot-id="${escapeAttr(slot.id)}">Записаться на эту дату</button>
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
  const canConfirm = candidate.confirmationStatus === "pending";
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
      ${canConfirm ? `
        <div class="candidate-actions">
          <button type="button" class="success" data-action="candidate-confirm" data-decision="yes">Да, приду</button>
          <button type="button" class="danger" data-action="candidate-confirm" data-decision="no">Нет, не смогу</button>
        </div>
      ` : ""}
      ${canRebook ? `
        <div class="candidate-actions">
          <button type="button" class="primary" data-action="rebook-interest" data-intent="waitlist">Уведомить о следующем</button>
          ${state.slots.find((item) => item.status === "open" && item.availableSeats > 0) ? `
            <button type="button" class="secondary" data-action="rebook-interest" data-intent="book_slot" data-slot-id="${escapeAttr(state.slots.find((item) => item.status === "open" && item.availableSeats > 0).id)}">Записаться снова</button>
          ` : ""}
          <button type="button" class="danger" data-action="rebook-interest" data-intent="not_interested">Больше не интересно</button>
        </div>
      ` : ""}
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
        <h2>Ресурсы</h2>
        ${renderRegistrationPill(candidate.registrationStatus)}
      </div>
      <div class="notice">
        <b>Рекрут отправил ссылки LOFT HALL.</b>
      </div>
      <div class="link-grid">
        ${links.map((link) => renderRegistrationLink(link, candidate)).join("") || '<div class="empty">Ресурсы пока не отправлены</div>'}
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

function renderLossReasonSurvey(candidate) {
  const needsReason = ["no_show", "declined_before_interview", "no_confirmation", "rejected", "not_interested"].includes(candidate.status);
  if (!needsReason) return "";

  return `
    <section class="panel">
      <div class="panel-head">
        <h2>Причина отказа</h2>
        ${candidate.lossReason ? '<span class="pill ok">сохранено</span>' : '<span class="pill wait">нужно</span>'}
      </div>
      <div class="candidate-actions">
        ${lossReasons
          .map(([reason, label]) => `
            <button type="button" class="${candidate.lossReason === reason ? "success" : "secondary"}" data-action="loss-reason" data-reason="${escapeAttr(reason)}">
              ${escapeHtml(label)}
            </button>
          `)
          .join("")}
      </div>
    </section>
  `;
}

function renderRecruiterView() {
  if (!["journal", "dates", "analytics"].includes(ui.recruiterTab)) {
    ui.recruiterTab = "journal";
  }

  return `
    <section class="recruiter-grid">
      <nav class="recruiter-nav" aria-label="Разделы рекрута">
        <button type="button" class="secondary" data-role="candidate">К форме записи</button>
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
  const slotCandidates = state.candidates.filter((candidate) => candidate.interviewSlotId === ui.selectedSlotId);
  const candidates = filterCandidates(slotCandidates);
  const slot = state.slots.find((item) => item.id === ui.selectedSlotId);
  const confirmationsRequested = slotConfirmationRequested(ui.selectedSlotId);
  const slotOpen = slot?.status === "open";
  const unmarked = candidates.filter(isUnmarkedCandidate);
  const arrived = candidates.filter(isArrivedCandidate);
  const arrivedAll = slotCandidates.filter(isArrivedCandidate);
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
          class="${confirmationsRequested ? "success" : "secondary"}${actionDoneClass(confirmationsRequested, "send-due-confirmations", { slotId: ui.selectedSlotId })}"
          data-action="send-due-confirmations"
          data-slot-id="${escapeAttr(ui.selectedSlotId)}"
          ${!slotOpen ? "disabled aria-disabled=\"true\"" : ""}
        >
          ${confirmationsRequested ? "Подтверждение отправлено" : "Подтверждение за день"}
        </button>
        <button
          type="button"
          class="danger${actionFeedbackClass("complete-slot", { slotId: ui.selectedSlotId })}"
          data-action="complete-slot"
          data-slot-id="${escapeAttr(ui.selectedSlotId)}"
          ${!slotOpen ? "disabled aria-disabled=\"true\"" : ""}
        >
          Собес завершен
        </button>
      </div>
      ${renderJournalGroup("Не отмечены", unmarked, "wait")}
      ${renderSlotResourceControls(slot, arrivedAll)}
      ${renderJournalGroup("Пришли на собес", arrived, "ok")}
      ${renderJournalGroup("Не пришли / отказ", missed, "bad")}
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

function slotConfirmationRequested(slotId) {
  return state.candidates.some((candidate) => candidate.interviewSlotId === slotId && candidate.confirmationRequestedAt);
}

function waitlistNotifiedForSlot(slotId) {
  return state.candidates.some(
    (candidate) => candidate.status === "waitlist" && candidate.waitlistTargetSlotId === slotId && candidate.lastWaitlistNotifiedAt
  );
}

function activeSlots() {
  return state.slots.filter((slot) => slot.status !== "completed");
}

function archivedSlots() {
  return state.slots.filter((slot) => slot.status === "completed");
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
          <h3>Ресурсы пришедшим</h3>
          <span>${candidates.length ? `Пришедших: ${candidates.length}` : "Пришедших пока нет"}</span>
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
        ${nextStep ? `Отправить: ${nextStep.label}` : "Все ресурсы отправлены"}
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

function renderRecruiterCandidate(candidate, index = 0) {
  const arrived = isArrivedCandidate(candidate);
  const canContinue = arrived && candidate.status !== "left_after_interview";
  const marked = !isUnmarkedCandidate(candidate);
  const telegram = cleanTelegram(candidate.telegram);
  return `
    <article class="candidate-card recruiter-candidate-card ${marked ? "marked" : ""} ${candidateCardTone(candidate)}">
      <div class="candidate-mark-row ${isLongCandidateName(candidate.name) ? "long-name" : ""}">
        <details class="recruiter-person-details">
          <summary class="candidate-name-summary">
            <span class="candidate-title-line">
              <span class="candidate-number">${index + 1}</span>
              <b class="name">${escapeHtml(candidate.name)}</b>
            </span>
          </summary>
          <div class="candidate-details-body">
            ${renderCandidateMeta(candidate)}
            ${candidate.note ? `<p class="candidate-note">${escapeHtml(candidate.note)}</p>` : ""}
            ${renderAttendanceCorrection(candidate)}
          </div>
        </details>
        ${renderAttendanceControl(candidate)}
      </div>
      <div class="compact-person-row">
        ${telegram ? `<button type="button" class="queue-telegram" data-action="copy-telegram" data-copy-value="${escapeAttr(telegram)}">${escapeHtml(telegram)}</button>` : '<span class="queue-telegram muted">без Telegram</span>'}
      </div>
      ${renderCandidateResourceExceptions(candidate)}
      ${canContinue ? `
        <div class="candidate-actions">
          <button type="button" class="quiet" data-action="mark-left-after-interview" data-candidate-id="${escapeAttr(candidate.id)}">Ушел после собеса</button>
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
  const waitlist = state.candidates.filter((candidate) => candidate.status === "waitlist");
  const selectedSlot = activeSlots().find((slot) => slot.id === ui.selectedSlotId);
  const waitlistNotified = waitlistNotifiedForSlot(ui.selectedSlotId);
  const visibleActiveSlots = activeSlots();
  const visibleArchivedSlots = filterArchivedSlots(archivedSlots());

  return `
    <section class="grid">
      <section class="panel">
        <h2>Добавить дату</h2>
        <form id="slot-form" class="form-grid two">
          <input type="hidden" name="templateCleared" value="" />
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
          <div class="form-subhead span-2">Материалы после записи</div>
          <label class="span-2">
            Текст
            <textarea name="bookingText" placeholder="Короткая инструкция, которую кандидат получит сразу после записи"></textarea>
          </label>
          <label class="span-2">
            Видео-проходка
            <input name="directionsVideoUrl" placeholder="https://..." />
          </label>
          <div class="span-2 button-row slot-form-actions">
            <button type="button" class="quiet" data-action="clear-slot-template">Очистить шаблон</button>
            <button type="submit" class="primary">Создать и уведомить лист</button>
          </div>
        </form>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div class="panel-title-stack">
            <h2>Общий лист ожидания</h2>
            ${selectedSlot ? `<span>Дата для рассылки: ${escapeHtml(slotLabel(selectedSlot))}</span>` : ""}
          </div>
          <button
            type="button"
            class="${waitlistNotified ? "success" : "secondary"}${actionDoneClass(waitlistNotified, "notify-waitlist", { slotId: ui.selectedSlotId })}"
            data-action="notify-waitlist"
            data-slot-id="${escapeAttr(ui.selectedSlotId)}"
            ${!waitlist.length || !selectedSlot ? "disabled aria-disabled=\"true\"" : ""}
          >
            ${waitlistNotified ? "Лист уведомлен" : "Уведомить лист"}
          </button>
        </div>
        <div class="candidate-list">
          ${waitlist.map(renderWaitlistCandidate).join("") || '<div class="empty">Список ожидания пуст</div>'}
        </div>
      </section>

      <section class="panel span-2">
        <div class="panel-head">
          <h2>Активные даты</h2>
          <span class="pill ok">${visibleActiveSlots.length}</span>
        </div>
        <div class="date-list">${visibleActiveSlots.map(renderRecruiterSlot).join("") || '<div class="empty">Активных дат пока нет</div>'}</div>
        <details class="archive-panel">
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
      </section>
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

function renderArchivedSlot(slot) {
  const candidates = archiveCandidatesForSlot(slot);
  const query = ui.archiveSearch.trim();
  const visibleCandidates = query
    ? candidates.filter((candidate) => candidateMatchesQuery(candidate, query))
    : candidates;

  return `
    <details class="archive-slot-card">
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
    <article class="candidate-card recruiter-candidate-card archive-candidate-card ${candidateCardTone(candidate)}">
      <details class="recruiter-person-details">
        <summary class="candidate-name-summary">
          <span class="candidate-title-line">
            <span class="candidate-number">${index + 1}</span>
            <b class="name">${escapeHtml(candidate.name)}</b>
          </span>
          ${renderStatusPill(candidate.status)}
        </summary>
        <div class="candidate-details-body">
          ${renderCandidateMeta(candidate)}
        </div>
      </details>
      <div class="compact-person-row">
        ${telegram ? `<button type="button" class="queue-telegram" data-action="copy-telegram" data-copy-value="${escapeAttr(telegram)}">${escapeHtml(telegram)}</button>` : '<span class="queue-telegram muted">без Telegram</span>'}
      </div>
    </article>
  `;
}

function renderRecruiterSlot(slot) {
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
  const slotCandidates = state.candidates.filter((candidate) => !ui.selectedSlotId || candidate.interviewSlotId === ui.selectedSlotId);
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
        <button type="button" class="quiet" data-action="mark-left-after-interview" data-candidate-id="${escapeAttr(candidate.id)}">Ушел после собеса</button>
        <button type="button" class="quiet" data-action="use-candidate" data-candidate-id="${escapeAttr(candidate.id)}">Открыть</button>
      </div>
    </article>
  `;
}

function renderAnalyticsTab() {
  return `
    <section class="grid">
      <section class="panel">
        <h2>Воронка</h2>
        <div class="timeline">
          ${renderStep("Запись", state.stats.bookedTotal > 0)}
          ${renderStep("Подтверждение", state.stats.confirmedTotal > 0)}
          ${renderStep("Явка", state.stats.arrivedTotal > 0)}
          ${renderStep("Регистрация", state.stats.registeredTotal > 0)}
        </div>
      </section>
      <section class="panel">
        <h2>Журнал явки</h2>
        <div class="reason-grid">${renderStatsMap({
          arrived: state.stats.arrivedTotal,
          no_show: state.stats.noShowTotal,
          no_confirmation: state.stats.noConfirmationTotal,
          left_after: state.stats.leftAfterTotal
        }, attendanceLabel)}</div>
      </section>
      <section class="panel">
        <h2>Причины потерь</h2>
        <div class="reason-grid">${renderStatsMap(state.lossReasonStats, lossReasonLabel)}</div>
      </section>
      <section class="panel">
        <h2>Последние события</h2>
        <div class="event-list">${state.events.slice(0, 8).map(renderEvent).join("")}</div>
      </section>
    </section>
  `;
}

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
  return state.candidates.filter((candidate) => candidate.interviewSlotId === slot.id);
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

function isArrivedCandidate(candidate) {
  return candidate.attendanceStatus === "arrived";
}

function isMissedCandidate(candidate) {
  return ["no_show", "declined_before", "no_confirmation"].includes(candidate.attendanceStatus);
}

function candidateCardTone(candidate) {
  if (candidate.status === "left_after_interview") return "left";
  if (isArrivedCandidate(candidate)) return "arrived";
  if (isMissedCandidate(candidate)) return "missed";
  return "unmarked";
}

function isLongCandidateName(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  return parts.length > 2 || String(name || "").length > 26;
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
  return activeSlots().length
    ? activeSlots()
    .map((slot) => `<option value="${slot.id}" ${slot.id === ui.selectedSlotId ? "selected" : ""}>${escapeHtml(slotLabel(slot))}</option>`)
    .join("")
    : '<option value="">Нет активных дат</option>';
}

function renderVenueOptions() {
  const venues = state.settings?.interviewVenues || [];
  return venues
    .map((venue) => `
      <option value="${escapeAttr(venue.id)}">${escapeHtml([venue.name, venue.address].filter(Boolean).join(" · "))}</option>
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
      title: candidate.status === "waitlist" ? "Ожидает дату" : "Дата выбрана",
      description: candidate.status === "waitlist"
        ? "Кандидат в общем листе ожидания и получит уведомление о новой дате."
        : "Кандидат записан на конкретную дату собеседования.",
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
      label: "Ресурсы",
      title: resourceCount ? `Ресурсы ${resourceCount}/${resourceTotal}` : "Ресурсы после собеса",
      description: "Пришедшим отправляются регистрация, группа неаттестованных и оформление самозанятости.",
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
  const slot = candidate.interviewSlotId ? state.slots.find((item) => item.id === candidate.interviewSlotId) : null;
  return `
    <div class="candidate-info-grid">
      <div class="candidate-info-item">
        <span>Telegram ID</span>
        <b>${escapeHtml(candidate.telegramId || "не указан")}</b>
      </div>
      <div class="candidate-info-item">
        <span>Никнейм</span>
        <b>${escapeHtml(candidate.telegram || "не указан")}</b>
      </div>
      <div class="candidate-info-item">
        <span>Телефон</span>
        <b>${escapeHtml(candidate.phone || "без телефона")}</b>
      </div>
      <div class="candidate-info-item">
        <span>Этап</span>
        <b>${escapeHtml(stageLabel(candidate))}</b>
      </div>
      <div class="candidate-info-item">
        <span>Собес</span>
        <b>${escapeHtml(slot ? slotLabel(slot) : "не выбран")}</b>
      </div>
      <div class="candidate-info-item">
        <span>Ресурсы</span>
        <b>${escapeHtml(`${candidate.resourceStepsSent?.length || 0}/${resourceSteps().length || 0} отправлено`)}</b>
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

  if (!candidate.name || !candidate.telegram || !candidate.phone) {
    showToast("ФИО, Telegram и телефон обязательны");
    return null;
  }

  return candidate;
}

function scheduleCandidateAutosave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(async () => {
    const form = document.querySelector("#candidate-form");
    const status = document.querySelector("#candidateAutosaveStatus");
    if (!form || !status) return;

    const data = Object.fromEntries(new FormData(form));
    if (!data.name?.trim() || !data.telegram?.trim() || !data.phone?.trim()) {
      status.textContent = "Заполните ФИО, Telegram и телефон";
      return;
    }

    status.textContent = "Сохраняем...";
    try {
      const payload = {
        action: "upsert_candidate",
        payload: {
          candidateId: ui.candidateId || undefined,
          name: data.name.trim(),
          phone: data.phone.trim(),
          telegram: data.telegram?.trim(),
          source: "Мини-приложение"
        }
      };
      const response = await fetchJson("/api/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

function getCurrentCandidate() {
  if (!ui.candidateId) return null;
  return state.candidates.find((candidate) => candidate.id === ui.candidateId) || null;
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
    waitlist: "Ожидает дату",
    booked: "Записан",
    confirmation_pending: "Ждет подтверждение",
    confirmed: "Подтвердил",
    declined_before_interview: "Отказ заранее",
    no_confirmation: "Не подтвердил",
    attended: "Пришел",
    left_after_interview: "Ушел после собеса",
    no_show: "Не пришел",
    registration_pending: "Регистрация",
    registered: "Зарегистрирован",
    ready_for_internship: "Готов к стажировке",
    rejected: "Не прошел",
    not_interested: "Не актуально"
  };
  return labels[status] || status || "Статус";
}

function stageLabel(candidate) {
  if (candidate.resourceStepsSent?.length > 0) return `Ресурсы ${candidate.resourceStepsSent.length}/${resourceSteps().length || 0}`;
  if (candidate.status === "waitlist") return "В листе ожидания";
  if (candidate.status === "booked") return "Записан на собеседование";
  if (candidate.status === "confirmation_pending") return "Ждет подтверждение";
  if (candidate.status === "confirmed") return "Подтвердил участие";
  if (candidate.status === "attended") return "Пришел на собес";
  if (candidate.status === "left_after_interview") return "Ушел после собеседования";
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
    resources_sent: "Ресурсы отправлены",
    left_after_interview: "Ушел после собеседования",
    interview_no_show: "Не пришел на собеседование",
    interview_passed: "После собеседования",
    ready_for_internship: "Готов к стажировке",
    interview_rejected: "Не продолжает путь"
  };
  return labels[candidate.candidateLayerStatus] || stageLabel(candidate);
}

function journalStatusLabel(candidate) {
  if (candidate.status === "left_after_interview") return "Ушел после собеса";
  if (candidate.attendanceStatus === "arrived" && candidate.confirmationStatus === "confirmed") return "Подтвердил и пришел";
  if (candidate.attendanceStatus === "no_show" && candidate.confirmationStatus === "confirmed") return "Подтвердил, но не пришел";
  if (candidate.attendanceStatus === "declined_before" || candidate.confirmationStatus === "declined") return "Заранее отказался";
  if (candidate.attendanceStatus === "no_confirmation" || candidate.confirmationStatus === "pending") return "Не подтвердил участие";
  if (candidate.attendanceStatus === "arrived") return "Пришел";
  if (candidate.attendanceStatus === "no_show") return "Не пришел";
  return "Ожидаем собеседование";
}

function attendanceMarkLabel(candidate) {
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
    left_after: "Ушли после собеса"
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

function lossReasonLabel(reason) {
  return lossReasons.find(([key]) => key === reason)?.[1] || reason || "Причина";
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
    attendance_marked: "Журнал явки",
    interview_result_set: "Итог собеса",
    resources_sent: "Ресурсы отправлены",
    resource_step_sent: "Ресурс отправлен",
    slot_completed: "Дата закрыта",
    candidate_left_after_interview: "Ушел после собеса",
    registration_materials_sent: "Материалы регистрации",
    registration_marked: "Регистрация",
    slot_registered_all: "Все зареганы",
    candidate_rebook_interest: "Повторная запись",
    loss_reason_recorded: "Причина отказа",
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
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}
