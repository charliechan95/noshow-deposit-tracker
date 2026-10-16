/* i18n — EN / 繁中 language switch for the no-show deposit tracker.
   UI language only; user data is never translated. Persisted per browser. */
"use strict";

const I18N = {
  en: {
    title: "No-Show Deposit Tracker",
    brand: "📅 Deposit Tracker",
    tab_dashboard: "Dashboard", tab_appointments: "Appointments",
    tab_settings: "Settings",
    dash_title: "Dashboard",
    card_appointments: "Appointments", card_noshow_rate: "No-show rate",
    card_collected: "Deposits collected (HKD)", card_forfeited: "Forfeited (HKD)",
    overdue_title: "⚠️ Deposits pending",
    th_customer: "Customer", th_service: "Service", th_date: "Date",
    th_deposit: "Deposit", th_status: "Status", th_appt: "Appt",
    upcoming_title: "Upcoming appointments",
    appt_title: "Appointments", ph_search: "Search customer…",
    opt_all_deposits: "All deposits", opt_all_appt: "All statuses",
    btn_filter: "Filter", btn_new_appt: "+ New appointment",
    settings_title: "Business settings",
    settings_note: "Your FPS details go into the WhatsApp messages automatically.",
    lbl_business_name: "Business name",
    lbl_fps_id: "FPS ID (phone / email / FPS proxy)",
    ph_example_phone: "e.g. 91234567",
    lbl_fps_name: "FPS account name", ph_fps_name: "e.g. Chan Tai Man",
    lbl_default_deposit: "Default deposit amount", lbl_currency: "Currency",
    lbl_deposit_msg: "Deposit request message", lbl_reminder_msg: "Reminder message",
    vars_label: "Available:", btn_save: "Save settings",
    btn_save_form: "Save",
    dlg_new_appt: "New appointment",
    lbl_customer_name: "Customer name",
    lbl_phone_cc: "Phone (with country code, e.g. 85291234567)",
    lbl_service: "Service", ph_service: "e.g. Haircut + Colour",
    lbl_date: "Date", lbl_time: "Time",
    lbl_deposit_amount: "Deposit amount", lbl_notes: "Notes",
    btn_cancel: "Cancel",
    btn_wa: "📩 WA", btn_remind: "📩 Remind",
    btn_paid: "✓ Paid", btn_noshow: "✗ No-show", btn_done: "Done", btn_delete: "Delete",
    st_pending: "Pending", st_paid: "Paid", st_waived: "Waived",
    st_forfeited: "Forfeited", st_refunded: "Refunded",
    ast_scheduled: "Scheduled", ast_completed: "Completed",
    ast_noshow: "No-show", ast_cancelled: "Cancelled",
    no_upcoming: "No upcoming appointments.",
    no_records: "No appointments found.",
    confirm_noshow: "Mark as no-show? Deposit will be forfeited.",
    confirm_delete: "Delete this appointment? This cannot be undone.",
    saved: "Saved ✓",
  },
  zh: {
    title: "訂金追蹤",
    brand: "📅 訂金追蹤",
    tab_dashboard: "主頁", tab_appointments: "預約",
    tab_settings: "設定",
    dash_title: "主頁",
    card_appointments: "預約", card_noshow_rate: "客人未到率",
    card_collected: "已收訂金 (HKD)", card_forfeited: "沒收訂金 (HKD)",
    overdue_title: "⚠️ 待收訂金",
    th_customer: "客人", th_service: "服務", th_date: "日期",
    th_deposit: "訂金", th_status: "狀態", th_appt: "預約",
    upcoming_title: "即將到來的預約",
    appt_title: "預約", ph_search: "搜尋客人…",
    opt_all_deposits: "全部訂金狀態", opt_all_appt: "全部預約狀態",
    btn_filter: "篩選", btn_new_appt: "+ 新增預約",
    settings_title: "商戶設定",
    settings_note: "您的 FPS 資料會自動加入 WhatsApp 訊息。",
    lbl_business_name: "商戶名稱",
    lbl_fps_id: "FPS ID（電話 / 電郵 / 轉數快代號）",
    ph_example_phone: "例如 91234567",
    lbl_fps_name: "FPS 戶口名稱", ph_fps_name: "例如 Chan Tai Man",
    lbl_default_deposit: "預設訂金金額", lbl_currency: "貨幣",
    lbl_deposit_msg: "訂金請求訊息", lbl_reminder_msg: "提醒訊息",
    vars_label: "可用：", btn_save: "儲存設定",
    btn_save_form: "儲存",
    dlg_new_appt: "新增預約",
    lbl_customer_name: "客人姓名",
    lbl_phone_cc: "電話（含區號，例如 85291234567）",
    lbl_service: "服務", ph_service: "例如 剪髮 + 染髮",
    lbl_date: "日期", lbl_time: "時間",
    lbl_deposit_amount: "訂金金額", lbl_notes: "備註",
    btn_cancel: "取消",
    btn_wa: "📩 WhatsApp", btn_remind: "📩 提醒",
    btn_paid: "✓ 已收", btn_noshow: "✗ 客人未到", btn_done: "完成", btn_delete: "刪除",
    st_pending: "待收", st_paid: "已收", st_waived: "豁免",
    st_forfeited: "沒收", st_refunded: "已退回",
    ast_scheduled: "已預約", ast_completed: "已完成",
    ast_noshow: "客人未到", ast_cancelled: "已取消",
    no_upcoming: "未有即將到來的預約。",
    no_records: "未有預約記錄。",
    confirm_noshow: "標記為客人未到？訂金將被沒收。",
    confirm_delete: "刪除此預約？此操作無法復原。",
    saved: "已儲存 ✓",
  },
};

let LANG = "en";
try {
  LANG = localStorage.getItem("ndt_lang") === "zh" ? "zh" : "en";
} catch { /* storage unavailable: keep default */ }

function t(key) {
  return (I18N[LANG] && I18N[LANG][key]) || I18N.en[key] || key;
}

function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPh);
  });
  document.querySelectorAll("[data-lang-btn]").forEach((b) =>
    b.classList.toggle("active", b.dataset.langBtn === LANG));
  document.documentElement.lang = LANG === "zh" ? "zh-Hant" : "en";
  document.title = t("title");
}

function setLang(next) {
  if (next !== "zh" && next !== "en") return;
  LANG = next;
  try { localStorage.setItem("ndt_lang", LANG); } catch { /* ignore */ }
  applyI18n();
  if (typeof renderAll === "function") renderAll();
  if (typeof window.onLangChange === "function") window.onLangChange();
}

document.querySelectorAll("[data-lang-btn]").forEach((b) =>
  b.addEventListener("click", () => setLang(b.dataset.langBtn)));
