"""Database models for the No-Show Deposit Tracker.

SQLite via stdlib — no paid APIs, no external services.
WhatsApp integration is via wa.me deep links (free, no API key).
FPS is Hong Kong's free Faster Payment System — no API, manual confirm.
"""
import os
import sqlite3
from datetime import datetime

DB_PATH = os.environ.get("DB_PATH", "deposits.db")

DEPOSIT_STATUSES = [
    ("pending", "Pending"),
    ("paid", "Paid"),
    ("waived", "Waived"),
    ("forfeited", "Forfeited"),
    ("refunded", "Refunded"),
]
DEPOSIT_LABELS = dict(DEPOSIT_STATUSES)

APPT_STATUSES = [
    ("scheduled", "Scheduled"),
    ("completed", "Completed"),
    ("no_show", "No-show"),
    ("cancelled", "Cancelled"),
]
APPT_LABELS = dict(APPT_STATUSES)


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_name TEXT NOT NULL,
            customer_phone TEXT NOT NULL,
            service TEXT,
            appt_date TEXT NOT NULL,
            appt_time TEXT,
            deposit_amount REAL NOT NULL DEFAULT 0,
            currency TEXT NOT NULL DEFAULT 'HKD',
            deposit_status TEXT NOT NULL DEFAULT 'pending',
            appt_status TEXT NOT NULL DEFAULT 'scheduled',
            notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )
    conn.commit()
    conn.close()


def now_iso():
    return datetime.utcnow().isoformat(timespec="seconds")


# ---- Settings ---------------------------------------------------------------

DEFAULT_SETTINGS = {
    "business_name": "",
    "fps_id": "",
    "fps_name": "",
    "default_deposit": "100",
    "currency": "HKD",
    "deposit_message": (
        "Hi {name}! Your appointment for {service} on {date} at {time} "
        "is reserved. Please pay a HKD {amount} deposit via FPS to "
        "{fps_id} ({fps_name}) to confirm. Reply with your payment "
        "screenshot. Thank you!"
    ),
    "reminder_message": (
        "Hi {name}! Just a reminder — your deposit of HKD {amount} for "
        "{service} on {date} is still pending. Please FPS to {fps_id} "
        "to keep your booking. Thank you!"
    ),
}


def get_settings():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT key, value FROM settings")
    stored = {r["key"]: r["value"] for r in cur.fetchall()}
    conn.close()
    merged = dict(DEFAULT_SETTINGS)
    merged.update(stored)
    return merged


def save_settings(data):
    conn = get_db()
    cur = conn.cursor()
    for key in DEFAULT_SETTINGS:
        if key in data:
            cur.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
                (key, data[key]),
            )
    conn.commit()
    conn.close()


# ---- Appointments -------------------------------------------------------------

def create_appointment(data):
    conn = get_db()
    cur = conn.cursor()
    ts = now_iso()
    cur.execute(
        """INSERT INTO appointments
           (customer_name, customer_phone, service, appt_date, appt_time,
            deposit_amount, currency, deposit_status, appt_status,
            notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            data.get("customer_name"),
            data.get("customer_phone"),
            data.get("service"),
            data.get("appt_date"),
            data.get("appt_time"),
            data.get("deposit_amount", 0),
            data.get("currency", "HKD"),
            data.get("deposit_status", "pending"),
            data.get("appt_status", "scheduled"),
            data.get("notes"),
            ts,
            ts,
        ),
    )
    aid = cur.lastrowid
    conn.commit()
    conn.close()
    return aid


def list_appointments(deposit_status=None, appt_status=None,
                      upcoming_only=False, search=None):
    conn = get_db()
    cur = conn.cursor()
    clauses, params = [], []
    if deposit_status:
        clauses.append("deposit_status = ?")
        params.append(deposit_status)
    if appt_status:
        clauses.append("appt_status = ?")
        params.append(appt_status)
    if upcoming_only:
        today = datetime.utcnow().date().isoformat()
        clauses.append("appt_date >= ?")
        params.append(today)
    if search:
        like = f"%{search}%"
        clauses.append("(customer_name LIKE ? OR service LIKE ?)")
        params.extend([like, like])
    q = "SELECT * FROM appointments"
    if clauses:
        q += " WHERE " + " AND ".join(clauses)
    q += " ORDER BY appt_date, appt_time"
    cur.execute(q, params)
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows


def get_appointment(aid):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM appointments WHERE id = ?", (aid,))
    row = cur.fetchone()
    conn.close()
    return dict(row) if row else None


def update_appointment(aid, data):
    allowed = [
        "customer_name", "customer_phone", "service", "appt_date",
        "appt_time", "deposit_amount", "currency", "deposit_status",
        "appt_status", "notes",
    ]
    sets, params = [], []
    for key in allowed:
        if key in data:
            if key == "deposit_status" and data[key] not in DEPOSIT_LABELS:
                continue
            if key == "appt_status" and data[key] not in APPT_LABELS:
                continue
            sets.append(f"{key} = ?")
            params.append(data[key])
    if not sets:
        return False
    sets.append("updated_at = ?")
    params.append(now_iso())
    params.append(aid)
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        f"UPDATE appointments SET {', '.join(sets)} WHERE id = ?", params
    )
    conn.commit()
    ok = cur.rowcount > 0
    conn.close()
    return ok


def overdue_deposits():
    """Scheduled appointments with deposit still pending and date approaching."""
    conn = get_db()
    cur = conn.cursor()
    today = datetime.utcnow().date().isoformat()
    cur.execute(
        """SELECT * FROM appointments
           WHERE deposit_status = 'pending'
             AND appt_status = 'scheduled'
             AND appt_date >= ?
           ORDER BY appt_date""",
        (today,),
    )
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows


def stats():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) AS n FROM appointments")
    total = cur.fetchone()["n"]
    cur.execute(
        "SELECT COUNT(*) AS n FROM appointments WHERE appt_status='no_show'"
    )
    no_shows = cur.fetchone()["n"]
    cur.execute(
        "SELECT COUNT(*) AS n FROM appointments WHERE appt_status='completed'"
    )
    completed = cur.fetchone()["n"]
    cur.execute(
        """SELECT COALESCE(SUM(deposit_amount), 0) AS s FROM appointments
           WHERE deposit_status = 'paid'"""
    )
    collected = cur.fetchone()["s"]
    cur.execute(
        """SELECT COALESCE(SUM(deposit_amount), 0) AS s FROM appointments
           WHERE deposit_status = 'forfeited'"""
    )
    forfeited = cur.fetchone()["s"]
    conn.close()
    denom = completed + no_shows
    no_show_rate = (no_shows / denom * 100) if denom else 0
    return {
        "total": total,
        "no_shows": no_shows,
        "completed": completed,
        "no_show_rate": round(no_show_rate, 1),
        "collected": collected,
        "forfeited": forfeited,
    }
