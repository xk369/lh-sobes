const ui = {
  role: localStorage.getItem("lh_interviews_role") || "candidate",
  recruiterTab: "journal",
  candidateId: localStorage.getItem("lh_interviews_candidate_id") || "",
  selectedSlotId: "",
  recruiterSearch: "",
  infoBoardCollapsed: localStorage.getItem("lh_interviews_info_collapsed") === "1"
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
    if (action === "book-slot") {
      const candidate = collectCandidateProfile();
      if (!candidate) return;
      const response = await runCommand("book_slot", {
        slotId: button.dataset.slotId,
        candidate
      });
      rememberCandidate(response.result.candidateId);
      showToast("Запись на собеседование сохранена");
      return;
    }

    if (action === "join-waitlist") {
      const candidate = collectCandidateProfile();
      if (!candidate) return;
      const response = await runCommand("join_waitlist", { candidate });
      rememberCandidate(response.result.candidateId);
      showToast("Кандидат добавлен в ожидание новой даты");
      return;
    }

    if (action === "candidate-confirm") {
      await runCommand("candidate_confirm", {
        candidateId: requireCurrentCandidateId(),
        decision: button.dataset.decision
      });
      showToast(button.dataset.decision === "yes" ? "Участие подтверждено" : "Отказ сохранен");
      return;
    }

    if (action === "rebook-interest") {
      await runCommand("rebook_interest", {
        candidateId: requireCurrentCandidateId(),
        intent: button.dataset.intent,
        slotId: button.dataset.slotId || undefined
      });
      showToast("Выбор по повторной записи сохранен");
      return;
    }

    if (action === "request-confirmation") {
      await runCommand("request_confirmation", {
        candidateId: button.dataset.candidateId || undefined,
        slotId: button.dataset.slotId || ui.selectedSlotId || undefined
      });
      showToast("Запрос подтверждения отправлен");
      return;
    }

    if (action === "send-due-confirmations") {
      await runCommand("send_due_confirmations", {
        slotId: button.dataset.slotId || ui.selectedSlotId || undefined
      });
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
      });
      showToast("Журнал собеседования обновлен");
      return;
    }

    if (action === "send-registration-materials") {
      const payload = button.dataset.candidateId
        ? { candidateId: button.dataset.candidateId }
        : ui.role === "candidate"
          ? { candidateId: requireCurrentCandidateId() }
          : { slotId: ui.selectedSlotId || undefined };
      await runCommand("send_registration_materials", payload);
      showToast("Материалы регистрации отправлены");
      return;
    }

    if (action === "send-resources") {
      const payload = button.dataset.candidateId
        ? { candidateId: button.dataset.candidateId }
        : ui.role === "candidate"
          ? { candidateId: requireCurrentCandidateId() }
          : { slotId: button.dataset.slotId || ui.selectedSlotId || undefined };
      await runCommand("send_resources", payload);
      showToast("Ресурсы отправлены");
      return;
    }

    if (action === "mark-left-after-interview") {
      await runCommand("mark_left_after_interview", {
        candidateId: button.dataset.candidateId
      });
      showToast("Кандидат отмечен как ушедший после собеса");
      return;
    }

    if (action === "complete-slot") {
      await runCommand("complete_slot", { slotId: button.dataset.slotId || ui.selectedSlotId });
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
      });
      showToast("Регистрация обновлена вручную");
      return;
    }

    if (action === "mark-all-registered") {
      await runCommand("mark_all_registered", { slotId: button.dataset.slotId || ui.selectedSlotId });
      showToast("Группа отмечена зарегистрированной");
      return;
    }

    if (action === "notify-waitlist") {
      await runCommand("notify_waitlist", {
        slotId: button.dataset.slotId || ui.selectedSlotId || undefined
      });
      showToast("Лист ожидания уведомлен");
      return;
    }

    if (action === "loss-reason") {
      await runCommand("record_loss_reason", {
        candidateId: button.dataset.candidateId || requireCurrentCandidateId(),
        reason: button.dataset.reason
      });
      showToast("Причина сохранена");
      return;
    }

    if (action === "record-link") {
      await runCommand("record_link_click", {
        candidateId: requireCurrentCandidateId(),
        linkType: button.dataset.linkType
      });
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

document.addEventListener(
  "toggle",
  (event) => {
    if (!event.target.matches("[data-info-board]")) return;
    ui.infoBoardCollapsed = !event.target.open;
    localStorage.setItem("lh_interviews_info_collapsed", ui.infoBoardCollapsed ? "1" : "0");
  },
  true
);

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

async function runCommand(action, payload) {
  const response = await fetchJson("/api/command", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload })
  });
  state = response.state;
  render();
  return response;
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

  if (!state.slots.some((slot) => slot.id === ui.selectedSlotId) && state.slots[0]) {
    ui.selectedSlotId = state.slots[0].id;
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
          <h2>Запись</h2>
          <span class="pill ok">${openSlots.length} дат</span>
        </div>
        <div class="date-list">
          ${openSlots.map((slot) => renderCandidateSlot(slot)).join("") || '<div class="empty">Открытых дат пока нет</div>'}
        </div>
        <button type="button" class="secondary" data-action="join-waitlist">Уведомить о следующем собеседовании</button>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2>Мой статус</h2>
          ${candidate ? renderStatusPill(candidate.status) : ""}
        </div>
        ${renderCandidateStatus(candidate)}
      </section>

      ${candidate ? renderCandidateRegistration(candidate) : ""}
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
        <input name="telegram" value="${escapeAttr(profile.telegram)}" placeholder="@username" />
      </label>
      <label>
        Телефон
        <input name="phone" value="${escapeAttr(profile.phone)}" autocomplete="tel" required />
      </label>
      <div class="form-autosave" id="candidateAutosaveStatus" aria-live="polite">
        ${candidate ? "Данные сохранены" : "Заполните ФИО и телефон"}
      </div>
    </form>
  `;
}

function renderCandidateSlot(slot) {
  return `
    <article class="date-card ${slot.availableSeats > 0 ? "selected" : "locked"}">
      <div class="date-head">
        <div>
          <div class="slot-title">${escapeHtml(slot.title)}</div>
          <div class="meta">${escapeHtml(slot.time)} · ${escapeHtml(slot.venue)}</div>
        </div>
        <span class="pill ${slot.availableSeats > 0 ? "ok" : "bad"}">${slot.availableSeats} мест</span>
      </div>
      <div class="date-summary">
        <div class="date-mark">${escapeHtml(dayNumber(slot.date))}</div>
        <div>
          <b>${escapeHtml(formatDate(slot.date))}</b>
          <span>${escapeHtml(slot.time)} · ${escapeHtml(slot.venue)}</span>
        </div>
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
  const shouldShow =
    Boolean(candidate.resourcesSentAt || candidate.materialsSentAt) ||
    ["registration_pending", "registered", "ready_for_internship"].includes(candidate.status);
  if (!shouldShow) return "";

  const links = state.settings?.registrationLinks || [];
  return `
    <section class="panel">
      <div class="panel-head">
        <h2>Ресурсы</h2>
        ${renderRegistrationPill(candidate.registrationStatus)}
      </div>
      <div class="notice">
        <b>Рекрут отправил ссылки LOFT HALL.</b><br>
        Переходы по ссылкам можно зафиксировать здесь, регистрацию дальше проверит рекрут.
      </div>
      <div class="link-grid">
        ${links.map((link) => renderRegistrationLink(link, candidate)).join("")}
      </div>
      <button type="button" class="secondary" data-action="send-resources">Отправить ресурсы повторно</button>
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
  return `
    <section class="recruiter-grid">
      <details class="panel info-panel" data-info-board ${ui.infoBoardCollapsed ? "" : "open"}>
        <summary class="info-summary">
          <span>Информационное табло</span>
          <span class="info-toggle" aria-hidden="true"></span>
        </summary>
        <section class="stats" aria-label="Статистика собеседований">
          ${renderStat(state.stats.waitlistCount, "ожидание")}
          ${renderStat(state.stats.bookedTotal, "записаны")}
          ${renderStat(state.stats.confirmedTotal, "подтвердили")}
          ${renderStat(state.stats.arrivedTotal, "пришли")}
          ${renderStat(state.stats.noShowTotal, "не пришли")}
          ${renderStat(state.stats.resourcesSentTotal, "ресурсы")}
        </section>
        <div class="info-actions">
          <button type="button" class="quiet danger-tool" data-action="reset-demo">Сбросить демо</button>
        </div>
      </details>

      <nav class="recruiter-nav" aria-label="Разделы рекрута">
        <button type="button" class="secondary" data-role="candidate">К форме записи</button>
        ${renderTab("journal", "Журнал")}
        ${renderTab("dates", "Даты")}
        ${renderTab("registration", "Ресурсы")}
        ${renderTab("analytics", "Аналитика")}
      </nav>

      ${renderRecruiterTab()}
    </section>
  `;
}

function renderRecruiterTab() {
  if (ui.recruiterTab === "dates") return renderDatesTab();
  if (ui.recruiterTab === "registration") return renderRegistrationTab();
  if (ui.recruiterTab === "analytics") return renderAnalyticsTab();
  return renderJournalTab();
}

function renderJournalTab() {
  const candidates = filterCandidates(state.candidates.filter((candidate) => candidate.interviewSlotId === ui.selectedSlotId));
  const slot = state.slots.find((item) => item.id === ui.selectedSlotId);
  const unmarked = candidates.filter(isUnmarkedCandidate);
  const arrived = candidates.filter(isArrivedCandidate);
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
        <button type="button" class="secondary" data-action="send-due-confirmations" data-slot-id="${escapeAttr(ui.selectedSlotId)}">Подтверждение за день</button>
        <button type="button" class="primary" data-action="send-resources" data-slot-id="${escapeAttr(ui.selectedSlotId)}">Ресурсы пришедшим</button>
        <button type="button" class="success" data-action="complete-slot" data-slot-id="${escapeAttr(ui.selectedSlotId)}">Собес завершен</button>
      </div>
      ${renderJournalGroup("Не отмечены", unmarked, "wait")}
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
          </div>
        </details>
        <div class="attendance-quick-actions" aria-label="Отметка явки">
          <button type="button" class="success" data-action="mark-arrived" data-candidate-id="${escapeAttr(candidate.id)}">Пришел</button>
          <button type="button" class="danger" data-action="mark-noshow" data-candidate-id="${escapeAttr(candidate.id)}">Не пришел</button>
        </div>
      </div>
      <div class="compact-person-row">
        ${telegram ? `<button type="button" class="queue-telegram" data-action="copy-telegram" data-copy-value="${escapeAttr(telegram)}">${escapeHtml(telegram)}</button>` : '<span class="queue-telegram muted">без Telegram</span>'}
        ${renderStatusPill(candidate.status, journalStatusLabel(candidate), true)}
        ${candidate.resourcesSentAt || candidate.materialsSentAt ? '<span class="pill ok">ресурсы отправлены</span>' : ""}
      </div>
      ${canContinue ? `
        <div class="candidate-actions">
          <button type="button" class="secondary" data-action="send-resources" data-candidate-id="${escapeAttr(candidate.id)}">Ресурсы</button>
          <button type="button" class="quiet" data-action="mark-left-after-interview" data-candidate-id="${escapeAttr(candidate.id)}">Ушел после собеса</button>
        </div>
      ` : ""}
    </article>
  `;
}

function renderDatesTab() {
  const waitlist = state.candidates.filter((candidate) => candidate.status === "waitlist");

  return `
    <section class="grid">
      <section class="panel">
        <h2>Добавить дату</h2>
        <form id="slot-form" class="form-grid two">
          <label>
            Дата
            <input name="date" type="date" required />
          </label>
          <label>
            Время
            <input name="time" type="time" required />
          </label>
          <label>
            Площадка или зал
            <input name="venue" value="LOFT HALL" required />
          </label>
          <label>
            Мест
            <input name="seats" type="number" min="1" value="12" required />
          </label>
          <label>
            Рекрут
            <input name="recruiter" value="Рекрут" />
          </label>
          <label>
            Название
            <input name="title" value="Собеседование LOFT HALL" />
          </label>
          <label class="span-2">
            Заметка
            <textarea name="note"></textarea>
          </label>
          <div class="span-2 button-row">
            <button type="submit" class="primary">Создать и уведомить ожидание</button>
          </div>
        </form>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2>Ожидание</h2>
          <button type="button" class="secondary" data-action="notify-waitlist" data-slot-id="${escapeAttr(ui.selectedSlotId)}">Уведомить</button>
        </div>
        <div class="candidate-list">
          ${waitlist.map(renderWaitlistCandidate).join("") || '<div class="empty">Список ожидания пуст</div>'}
        </div>
      </section>

      <section class="panel span-2">
        <h2>Даты</h2>
        <div class="date-list">${state.slots.map(renderRecruiterSlot).join("")}</div>
      </section>
    </section>
  `;
}

function renderWaitlistCandidate(candidate, index = 0) {
  return `
    <article class="candidate-card">
      <div class="candidate-card-head">
        <div class="candidate-title-line">
          <span class="candidate-number">${index + 1}</span>
          <b class="name">${escapeHtml(candidate.name)}</b>
        </div>
        ${renderStatusPill(candidate.status, null, true)}
      </div>
      ${renderCandidateMeta(candidate)}
      ${candidate.lastWaitlistNotifiedAt ? `<p class="candidate-note">Последнее уведомление: ${escapeHtml(formatDateTime(candidate.lastWaitlistNotifiedAt))}</p>` : ""}
    </article>
  `;
}

function renderRecruiterSlot(slot) {
  return `
    <article class="date-card ${slot.id === ui.selectedSlotId ? "selected" : ""}">
      <div class="date-head">
        <div>
          <div class="slot-title">${escapeHtml(slotLabel(slot))}</div>
        </div>
        <span class="pill ${slot.status === "open" ? "ok" : "bad"}">${escapeHtml(slot.status === "completed" ? "Завершена" : slot.status === "open" ? "Открыта" : "Закрыта")}</span>
      </div>
      <div class="candidate-actions">
        <button type="button" class="secondary" data-action="request-confirmation" data-slot-id="${escapeAttr(slot.id)}">Подтверждение</button>
        <button type="button" class="secondary" data-action="notify-waitlist" data-slot-id="${escapeAttr(slot.id)}">Ожидание</button>
        <button type="button" class="primary" data-action="send-resources" data-slot-id="${escapeAttr(slot.id)}">Ресурсы пришедшим</button>
        <button type="button" class="success" data-action="complete-slot" data-slot-id="${escapeAttr(slot.id)}">Собес завершен</button>
      </div>
    </article>
  `;
}

function renderRegistrationTab() {
  const candidates = filterCandidates(
    state.candidates.filter(
      (candidate) =>
        (!ui.selectedSlotId || candidate.interviewSlotId === ui.selectedSlotId) &&
        candidate.status !== "left_after_interview" &&
        (candidate.attendanceStatus === "arrived" || candidate.resourcesSentAt || candidate.materialsSentAt)
    )
  );

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
        <button type="button" class="primary" data-action="send-resources" data-slot-id="${escapeAttr(ui.selectedSlotId)}">Отправить ресурсы пришедшим</button>
      </div>
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
        ${renderStatusPill(candidate.status, candidate.resourcesSentAt || candidate.materialsSentAt ? "Ресурсы отправлены" : journalStatusLabel(candidate), true)}
      </div>
      <div class="candidate-info-grid">
        <div class="candidate-info-item">
          <span>Ресурсы</span>
          <b>${escapeHtml(candidate.resourcesSentAt || candidate.materialsSentAt ? formatDateTime(candidate.resourcesSentAt || candidate.materialsSentAt) : "не отправлены")}</b>
        </div>
        <div class="candidate-info-item">
          <span>Переходы</span>
          <b>${candidate.linkClicks?.length || 0}/${state.settings?.registrationLinks?.length || 3}</b>
        </div>
      </div>
      <div class="candidate-actions">
        <button type="button" class="primary" data-action="send-resources" data-candidate-id="${escapeAttr(candidate.id)}">Ресурсы</button>
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
  return candidates.filter((candidate) => {
    return [
      candidate.name,
      candidate.telegram,
      candidate.telegramId,
      candidate.phone,
      candidate.source
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });
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
  return state.slots
    .map((slot) => `<option value="${slot.id}" ${slot.id === ui.selectedSlotId ? "selected" : ""}>${escapeHtml(slotLabel(slot))}</option>`)
    .join("");
}

function renderStat(value, label) {
  return `<div class="stat"><b>${Number(value || 0)}</b><span>${escapeHtml(label)}</span></div>`;
}

function renderStep(label, done) {
  return `<div class="step ${done ? "done" : ""}">${escapeHtml(label)}</div>`;
}

function renderTab(tab, label) {
  return `<button type="button" data-tab="${tab}" class="subtab ${ui.recruiterTab === tab ? "active" : ""}">${escapeHtml(label)}</button>`;
}

function renderStageTrack(candidate) {
  const stages = [
    { label: "Запись", icon: "file", done: ["booked", "confirmation_pending", "confirmed", "attended", "registration_pending", "ready_for_internship"].includes(candidate.status) },
    { label: "Подтв.", icon: "chat", done: candidate.confirmationStatus === "confirmed" },
    { label: "Собес", icon: "check", done: candidate.attendanceStatus === "arrived" },
    { label: "Рег.", icon: "send", done: ["instructions_sent", "materials_sent", "pending", "registered"].includes(candidate.registrationStatus) },
    { label: "Стаж.", icon: "flag", done: candidate.status === "ready_for_internship" }
  ];
  const firstOpen = stages.findIndex((stage) => !stage.done);
  const currentIndex = firstOpen === -1 ? stages.length - 1 : firstOpen;

  return `
    <div class="stage-track five" aria-label="Путь кандидата">
      ${stages
        .map((stage, index) => {
          const stateClass = stage.done ? "done" : index === currentIndex ? "current" : "";
          return `
            <button class="stage-node ${stateClass}" type="button" aria-label="${escapeAttr(stage.label)}">
              <span class="stage-dot">${stageIcon(stage.icon)}</span>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function stageIcon(name) {
  const icons = {
    file: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg>',
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
        <b>${escapeHtml(candidate.resourcesSentAt || candidate.materialsSentAt ? "отправлены" : "не отправлены")}</b>
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

  if (!candidate.name || !candidate.phone) {
    showToast("ФИО и телефон обязательны");
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
    if (!data.name?.trim() || !data.phone?.trim()) {
      status.textContent = "Заполните ФИО и телефон";
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
  if (candidate.status === "waitlist") return "Ожидание даты";
  if (["booked", "confirmation_pending", "confirmed"].includes(candidate.status)) return "До собеседования";
  if (candidate.resourcesSentAt || candidate.materialsSentAt) return "Ресурсы отправлены";
  if (candidate.status === "attended") return "На собеседовании";
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
  if (candidate.resourcesSentAt || candidate.materialsSentAt) return "Ресурсы отправлены";
  if (candidate.attendanceStatus === "arrived" && candidate.confirmationStatus === "confirmed") return "Подтвердил и пришел";
  if (candidate.attendanceStatus === "no_show" && candidate.confirmationStatus === "confirmed") return "Подтвердил, но не пришел";
  if (candidate.attendanceStatus === "declined_before" || candidate.confirmationStatus === "declined") return "Заранее отказался";
  if (candidate.attendanceStatus === "no_confirmation" || candidate.confirmationStatus === "pending") return "Не подтвердил участие";
  if (candidate.attendanceStatus === "arrived") return "Пришел";
  if (candidate.attendanceStatus === "no_show") return "Не пришел";
  return "Ожидаем собеседование";
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
    slot_completed: "Собес завершен",
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
