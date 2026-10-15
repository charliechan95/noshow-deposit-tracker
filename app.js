/* No-Show Deposit Tracker — static UI. Renders from db.js, no backend. */
"use strict";

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* ---- i18n: status label maps (canonical stored values stay English) ------ */
const DEPOSIT_STATUS_KEY = {
  pending: "st_pending", paid: "st_paid", waived: "st_waived",
  forfeited: "st_forfeited", refunded: "st_refunded",
};
const APPT_STATUS_KEY = {
  scheduled: "ast_scheduled", completed: "ast_completed",
  no_show: "ast_noshow", cancelled: "ast_cancelled",
};
function depositStatusLabel(v) {
  const k = DEPOSIT_STATUS_KEY[v];
  return k ? t(k) : (v || "");
}
function apptStatusLabel(v) {
  const k = APPT_STATUS_KEY[v];
  return k ? t(k) : (v || "");
}

/* ---- Tabs --------------------------------------------------------------- */
document.querySelectorAll("[data-tab]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-tab]").forEach((b) =>
      b.classList.toggle("active", b === btn));
    document.querySelectorAll(".view").forEach((v) =>
      v.classList.toggle("active", v.id === "view-" + btn.dataset.tab));
  });
});

/* ---- Dashboard ----------------------------------------------------------- */
function renderDashboard() {
  const s = DB.stats();
  document.getElementById("st-total").textContent = s.total;
  document.getElementById("st-rate").textContent = s.no_show_rate + "%";
  document.getElementById("st-collected").textContent = Math.round(s.collected);
  document.getElementById("st-forfeited").textContent = Math.round(s.forfeited);

  const overdue = DB.overdueDeposits();
  const sec = document.getElementById("overdue-section");
  sec.style.display = overdue.length ? "" : "none";
  document.getElementById("overdue-body").innerHTML = overdue.map((a) => `
    <tr>
      <td><strong>${esc(a.customer_name)}</strong>
        <div class="muted">${esc(a.customer_phone)}</div></td>
      <td>${esc(a.service || "—")}</td>
      <td>${esc(a.appt_date)} ${esc(a.appt_time || "")}</td>
      <td>${Math.round(a.deposit_amount)} ${esc(a.currency)}</td>
      <td><div class="row-actions">
        <button data-wa="${a.id}" data-kind="reminder">${t("btn_remind")}</button>
        <button data-paid="${a.id}">${t("btn_paid")}</button>
      </div></td>
    </tr>`).join("");

  const upcoming = DB.list({ upcoming_only: true, appt_status: "scheduled" })
    .slice(0, 15);
  document.getElementById("upcoming-body").innerHTML = upcoming.length
    ? upcoming.map((a) => `
      <tr>
        <td><strong>${esc(a.customer_name)}</strong></td>
        <td>${esc(a.service || "—")}</td>
        <td>${esc(a.appt_date)} ${esc(a.appt_time || "")}</td>
        <td><span class="pill pill-${a.deposit_status}">${depositStatusLabel(a.deposit_status)}</span></td>
        <td>${apptStatusLabel(a.appt_status)}</td>
      </tr>`).join("")
    : `<tr><td colspan="5" class="muted">${t("no_upcoming")}</td></tr>`;
}

/* ---- Appointments list ------------------------------------------------------ */
const filters = { q: "", deposit_status: "", appt_status: "" };

function buildFilterOptions() {
  document.getElementById("f-deposit").innerHTML =
    `<option value="">${t("opt_all_deposits")}</option>` +
    DEPOSIT_STATUSES.map(([v]) =>
      `<option value="${v}">${depositStatusLabel(v)}</option>`).join("");
  document.getElementById("f-appt").innerHTML =
    `<option value="">${t("opt_all_appt")}</option>` +
    APPT_STATUSES.map(([v]) =>
      `<option value="${v}">${apptStatusLabel(v)}</option>`).join("");
}
buildFilterOptions();
window.onLangChange = function () { buildFilterOptions(); };

function rowActions(a) {
  return `<div class="row-actions">
    <button data-wa="${a.id}" data-kind="deposit">${t("btn_wa")}</button>
    <button data-paid="${a.id}">${t("btn_paid")}</button>
    <button data-noshow="${a.id}">${t("btn_noshow")}</button>
    <button data-done="${a.id}">${t("btn_done")}</button>
  </div>`;
}

function renderAppointments() {
  const list = DB.list({
    deposit_status: filters.deposit_status || null,
    appt_status: filters.appt_status || null,
    search: filters.q || null,
  });
  document.getElementById("appt-rows").innerHTML = list.length
    ? list.map((a) => `
      <tr>
        <td><strong>${esc(a.customer_name)}</strong>
          <div class="muted">${esc(a.customer_phone)}</div></td>
        <td>${esc(a.service || "—")}</td>
        <td>${esc(a.appt_date)} ${esc(a.appt_time || "")}</td>
        <td><span class="pill pill-${a.deposit_status}">${depositStatusLabel(a.deposit_status)}</span>
          <div class="muted">${Math.round(a.deposit_amount)} ${esc(a.currency)}</div></td>
        <td>${apptStatusLabel(a.appt_status)}</td>
        <td>${rowActions(a)}</td>
      </tr>`).join("")
    : `<tr><td colspan="6" class="muted">${t("no_records")}</td></tr>`;
}

document.getElementById("f-apply").addEventListener("click", () => {
  filters.q = document.getElementById("f-q").value.trim();
  filters.deposit_status = document.getElementById("f-deposit").value;
  filters.appt_status = document.getElementById("f-appt").value;
  renderAppointments();
});

/* ---- Global row actions (delegated) ------------------------------------------ */
document.addEventListener("click", (e) => {
  const wa = e.target.closest("[data-wa]");
  if (wa) {
    const a = DB.get(wa.dataset.wa);
    if (a) window.open(DB.whatsappLink(a, wa.dataset.kind), "_blank");
    return;
  }
  const paid = e.target.closest("[data-paid]");
  if (paid) {
    DB.update(paid.dataset.paid, { deposit_status: "paid" });
    renderAll();
    return;
  }
  const noshow = e.target.closest("[data-noshow]");
  if (noshow) {
    if (confirm(t("confirm_noshow"))) {
      DB.update(noshow.dataset.noshow,
        { appt_status: "no_show", deposit_status: "forfeited" });
      renderAll();
    }
    return;
  }
  const done = e.target.closest("[data-done]");
  if (done) {
    DB.update(done.dataset.done, { appt_status: "completed" });
    renderAll();
  }
});

/* ---- New appointment dialog ---------------------------------------------------- */
const dlg = document.getElementById("dlg-appt");
document.getElementById("btn-new-appt").addEventListener("click", () => {
  const s = DB.settings();
  if (s.default_deposit) {
    document.getElementById("f-deposit-amt").value = s.default_deposit;
  }
  dlg.showModal();
});
document.getElementById("btn-cancel-appt").addEventListener("click", () =>
  dlg.close());
document.getElementById("frm-appt").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = {};
  new FormData(e.target).forEach((v, k) => { data[k] = v === "" ? null : v; });
  DB.create(data);
  e.target.reset();
  dlg.close();
  renderAll();
});

/* ---- Settings ------------------------------------------------------------------ */
function loadSettings() {
  const s = DB.settings();
  document.getElementById("s-business").value = s.business_name || "";
  document.getElementById("s-fps-id").value = s.fps_id || "";
  document.getElementById("s-fps-name").value = s.fps_name || "";
  document.getElementById("s-deposit").value = s.default_deposit || "";
  document.getElementById("s-currency").value = s.currency || "HKD";
  document.getElementById("s-msg1").value = s.deposit_message || "";
  document.getElementById("s-msg2").value = s.reminder_message || "";
}
document.getElementById("frm-settings").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = {};
  new FormData(e.target).forEach((v, k) => { data[k] = v; });
  DB.saveSettings(data);
  const el = document.getElementById("settings-saved");
  el.textContent = t("saved");
  setTimeout(() => { el.textContent = ""; }, 2000);
});

/* ---- Boot ------------------------------------------------------------------------ */
function renderAll() {
  renderDashboard();
  renderAppointments();
}
loadSettings();
renderAll();
applyI18n();
