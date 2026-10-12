/* No-Show Deposit Tracker — static data layer.
   localStorage-backed, no backend. Mirrors the Flask models.py API.
   WhatsApp via wa.me deep links. FPS = manual confirm. */
"use strict";

const DEPOSIT_STATUSES = [
  ["pending", "Pending"], ["paid", "Paid"], ["waived", "Waived"],
  ["forfeited", "Forfeited"], ["refunded", "Refunded"],
];
const DEPOSIT_LABELS = Object.fromEntries(DEPOSIT_STATUSES);

const APPT_STATUSES = [
  ["scheduled", "Scheduled"], ["completed", "Completed"],
  ["no_show", "No-show"], ["cancelled", "Cancelled"],
];
const APPT_LABELS = Object.fromEntries(APPT_STATUSES);

const DEFAULT_SETTINGS = {
  business_name: "",
  fps_id: "",
  fps_name: "",
  default_deposit: "100",
  currency: "HKD",
  deposit_message:
    "Hi {name}! Your appointment for {service} on {date} at {time} " +
    "is reserved. Please pay a HKD {amount} deposit via FPS to " +
    "{fps_id} ({fps_name}) to confirm. Reply with your payment " +
    "screenshot. Thank you!",
  reminder_message:
    "Hi {name}! Just a reminder — your deposit of HKD {amount} for " +
    "{service} on {date} is still pending. Please FPS to {fps_id} " +
    "to keep your booking. Thank you!",
};

const DB = {
  _read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  _write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  _nextId() {
    const n = (parseInt(localStorage.getItem("dep_seq") || "0", 10) || 0) + 1;
    localStorage.setItem("dep_seq", String(n));
    return n;
  },
  nowIso() {
    return new Date().toISOString().slice(0, 19);
  },
  today() {
    return new Date().toISOString().slice(0, 10);
  },

  // ---- Settings ------------------------------------------------------------
  settings() {
    const stored = this._read("dep_settings", {});
    return { ...DEFAULT_SETTINGS, ...stored };
  },
  saveSettings(data) {
    const stored = this._read("dep_settings", {});
    for (const k of Object.keys(DEFAULT_SETTINGS)) {
      if (k in data) stored[k] = data[k];
    }
    this._write("dep_settings", stored);
  },

  // ---- Appointments ----------------------------------------------------------
  list({ deposit_status, appt_status, upcoming_only, search } = {}) {
    let list = this._read("dep_appts", []);
    if (deposit_status) list = list.filter((a) => a.deposit_status === deposit_status);
    if (appt_status) list = list.filter((a) => a.appt_status === appt_status);
    if (upcoming_only) list = list.filter((a) => (a.appt_date || "") >= this.today());
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((a) =>
        ((a.customer_name || "") + " " + (a.service || "")).toLowerCase().includes(q));
    }
    return [...list].sort((a, b) =>
      (a.appt_date || "").localeCompare(b.appt_date || "") ||
      (a.appt_time || "").localeCompare(b.appt_time || ""));
  },
  get(id) {
    return this._read("dep_appts", []).find(
      (a) => String(a.id) === String(id)) || null;
  },
  create(data) {
    const list = this._read("dep_appts", []);
    const ts = this.nowIso();
    const s = this.settings();
    const appt = {
      id: this._nextId(),
      customer_name: data.customer_name || "",
      customer_phone: data.customer_phone || "",
      service: data.service || null,
      appt_date: data.appt_date || "",
      appt_time: data.appt_time || null,
      deposit_amount: parseFloat(data.deposit_amount) || 0,
      currency: data.currency || s.currency || "HKD",
      deposit_status: "pending",
      appt_status: "scheduled",
      notes: data.notes || null,
      created_at: ts,
      updated_at: ts,
    };
    list.push(appt);
    this._write("dep_appts", list);
    return appt.id;
  },
  update(id, data) {
    const allowed = ["customer_name", "customer_phone", "service",
      "appt_date", "appt_time", "deposit_amount", "currency",
      "deposit_status", "appt_status", "notes"];
    const list = this._read("dep_appts", []);
    const a = list.find((x) => String(x.id) === String(id));
    if (!a) return false;
    for (const k of allowed) {
      if (!(k in data)) continue;
      if (k === "deposit_status" && !DEPOSIT_LABELS[data[k]]) continue;
      if (k === "appt_status" && !APPT_LABELS[data[k]]) continue;
      a[k] = data[k];
    }
    a.updated_at = this.nowIso();
    this._write("dep_appts", list);
    return true;
  },

  overdueDeposits() {
    return this._read("dep_appts", [])
      .filter((a) => a.deposit_status === "pending" &&
        a.appt_status === "scheduled" && (a.appt_date || "") >= this.today())
      .sort((a, b) => (a.appt_date || "").localeCompare(b.appt_date || ""));
  },

  stats() {
    const list = this._read("dep_appts", []);
    const noShows = list.filter((a) => a.appt_status === "no_show").length;
    const completed = list.filter((a) => a.appt_status === "completed").length;
    const collected = list.filter((a) => a.deposit_status === "paid")
      .reduce((s, a) => s + (a.deposit_amount || 0), 0);
    const forfeited = list.filter((a) => a.deposit_status === "forfeited")
      .reduce((s, a) => s + (a.deposit_amount || 0), 0);
    const denom = completed + noShows;
    return {
      total: list.length,
      no_shows: noShows,
      completed,
      no_show_rate: denom ? Math.round((noShows / denom) * 1000) / 10 : 0,
      collected,
      forfeited,
    };
  },

  // ---- WhatsApp ---------------------------------------------------------------
  renderMessage(template, appt) {
    const s = this.settings();
    return template
      .replaceAll("{name}", appt.customer_name || "")
      .replaceAll("{service}", appt.service || "your appointment")
      .replaceAll("{date}", appt.appt_date || "")
      .replaceAll("{time}", appt.appt_time || "")
      .replaceAll("{amount}", appt.deposit_amount || "")
      .replaceAll("{currency}", appt.currency || "HKD")
      .replaceAll("{fps_id}", s.fps_id || "")
      .replaceAll("{fps_name}", s.fps_name || "")
      .replaceAll("{business}", s.business_name || "");
  },
  whatsappLink(appt, kind) {
    const s = this.settings();
    const template = kind === "deposit" ? s.deposit_message : s.reminder_message;
    const message = this.renderMessage(template, appt);
    const digits = (appt.customer_phone || "").replace(/\D/g, "");
    return "https://wa.me/" + digits + "?text=" + encodeURIComponent(message);
  },
};
