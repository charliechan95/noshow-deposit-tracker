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
function _singleCurrency(list) {
  const set = new Set((list || []).map((a) => a.currency || "").filter(Boolean));
  return set.size === 1 ? [...set][0] : null;
}

function renderDashboard() {
  const s = DB.stats();
  document.getElementById("st-total").textContent = s.total;
  document.getElementById("st-rate").textContent = s.no_show_rate + "%";
  document.getElementById("st-collected").textContent = Math.round(s.collected);
  document.getElementById("st-forfeited").textContent = Math.round(s.forfeited);
  // Honest currency on the totals: show the real currency when every counted
  // row shares one; when currencies are mixed, leave it off rather than
  // mislabel the total.
  const paidCcy = _singleCurrency(DB.list({ deposit_status: "paid" }));
  const forfCcy = _singleCurrency(DB.list({ deposit_status: "forfeited" }));
  document.getElementById("lbl-collected").textContent =
    t("card_collected") + (paidCcy ? " (" + paidCcy + ")" : "");
  document.getElementById("lbl-forfeited").textContent =
    t("card_forfeited") + (forfCcy ? " (" + forfCcy + ")" : "");

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

  const pastdue = DB.pastDueDeposits();
  const psec = document.getElementById("pastdue-section");
  psec.style.display = pastdue.length ? "" : "none";
  document.getElementById("pastdue-body").innerHTML = pastdue.map((a) => `
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
    <button data-edit="${a.id}">${t("btn_edit")}</button>
    <button data-wa="${a.id}" data-kind="deposit">${t("btn_wa")}</button>
    <button data-paid="${a.id}">${t("btn_paid")}</button>
    <button data-noshow="${a.id}">${t("btn_noshow")}</button>
    <button data-done="${a.id}">${t("btn_done")}</button>
    <button data-del="${a.id}">${t("btn_delete")}</button>
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
    return;
  }
  const del = e.target.closest("[data-del]");
  if (del) {
    if (confirm(t("confirm_delete"))) {
      DB.remove(del.dataset.del);
      renderAll();
    }
    return;
  }
  const edit = e.target.closest("[data-edit]");
  if (edit) {
    openEditDialog(edit.dataset.edit);
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

/* ---- Edit appointment dialog (mirrors the new-appointment dialog) ------------ */
const editDlg = document.getElementById("dlg-edit-appt");

function buildEditStatusOptions() {
  document.getElementById("e-deposit-status").innerHTML =
    DEPOSIT_STATUSES.map(([v]) =>
      `<option value="${v}">${depositStatusLabel(v)}</option>`).join("");
  document.getElementById("e-appt-status").innerHTML =
    APPT_STATUSES.map(([v]) =>
      `<option value="${v}">${apptStatusLabel(v)}</option>`).join("");
}

function openEditDialog(id) {
  const a = DB.get(id);
  if (!a) return;
  buildEditStatusOptions(); // rebuilt at open time so labels match the language
  const f = document.getElementById("frm-edit-appt");
  f.elements.edit_id.value = String(a.id);
  f.elements.customer_name.value = a.customer_name || "";
  f.elements.customer_phone.value = a.customer_phone || "";
  f.elements.service.value = a.service || "";
  f.elements.appt_date.value = a.appt_date || "";
  f.elements.appt_time.value = a.appt_time || "";
  f.elements.deposit_amount.value =
    a.deposit_amount === 0 || a.deposit_amount ? Math.round(a.deposit_amount) : "";
  f.elements.currency.value = a.currency || "";
  f.elements.deposit_status.value = a.deposit_status || "pending";
  f.elements.appt_status.value = a.appt_status || "scheduled";
  f.elements.notes.value = a.notes || "";
  editDlg.showModal();
}
document.getElementById("btn-cancel-edit").addEventListener("click", () =>
  editDlg.close());
document.getElementById("frm-edit-appt").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = {};
  new FormData(e.target).forEach((v, k) => { data[k] = v === "" ? null : v; });
  const id = data.edit_id;
  delete data.edit_id;
  data.deposit_amount = parseFloat(data.deposit_amount) || 0; // mirror DB.create
  DB.update(id, data);
  editDlg.close();
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

/* ---- Storage failure signal (called from db.js _write/_nextId) ------------------ */
window.__ndtStorageFailed = function () {
  const el = document.getElementById("store-error");
  if (el) {
    el.textContent = t("storage_full");
    el.style.display = "";
  }
};
window.__ndtStorageOk = function () {
  const el = document.getElementById("store-error");
  if (el) el.style.display = "none";
};

/* ---- Backup export / import ------------------------------------------------------ */
function _depSeq() {
  try { return localStorage.getItem("dep_seq") || "0"; } catch { return "0"; }
}

document.getElementById("btn-export").addEventListener("click", () => {
  const backup = {
    app: "noshow-deposit-tracker",
    exported_at: DB.nowIso(),
    dep_appts: DB._read("dep_appts", []),
    dep_settings: DB._read("dep_settings", {}),
    dep_seq: _depSeq(),
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)],
    { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "deposit-tracker-backup.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

document.getElementById("btn-import").addEventListener("click", () =>
  document.getElementById("file-import").click());

// Shape-check BEFORE anything is written, so a bad file changes nothing.
function validateBackup(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  if (!Array.isArray(obj.dep_appts)) return false;
  if (!obj.dep_appts.every((a) => a && a.id !== undefined && a.id !== null)) return false;
  if (!obj.dep_settings || typeof obj.dep_settings !== "object" ||
    Array.isArray(obj.dep_settings)) return false;
  if (obj.dep_seq === undefined || obj.dep_seq === null ||
    isNaN(parseInt(obj.dep_seq, 10))) return false;
  return true;
}

document.getElementById("file-import").addEventListener("change", (e) => {
  const f = e.target.files && e.target.files[0];
  e.target.value = "";
  if (!f) return;
  const rd = new FileReader();
  rd.onload = () => {
    let obj = null;
    try { obj = JSON.parse(rd.result); } catch { obj = null; }
    const msg = document.getElementById("backup-msg");
    if (!validateBackup(obj)) {
      msg.textContent = t("import_invalid");
      return;
    }
    DB._write("dep_appts", obj.dep_appts);
    DB._write("dep_settings", obj.dep_settings);
    try {
      localStorage.setItem("dep_seq", String(parseInt(obj.dep_seq, 10) || 0));
      window.__ndtStorageOk();
    } catch { window.__ndtStorageFailed(); }
    loadSettings();
    renderAll();
    msg.textContent = t("import_done");
    setTimeout(() => { msg.textContent = ""; }, 3000);
  };
  rd.readAsText(f);
});
/* ---- Boot ------------------------------------------------------------------------ */
function renderAll() {
  renderDashboard();
  renderAppointments();
}
loadSettings();
renderAll();
applyI18n();
