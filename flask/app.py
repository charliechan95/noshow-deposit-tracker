"""No-Show Deposit Tracker — Flask backend.

Free stack: Flask + SQLite (stdlib). No paid APIs.
WhatsApp via wa.me deep links (free). FPS = manual confirm (free).
Run with:  python app.py   →  http://localhost:5002
"""
import os
import urllib.parse

from flask import Flask, jsonify, render_template, request

import models

app = Flask(__name__)


@app.before_request
def _ensure_db():
    models.init_db()


def build_whatsapp_link(phone, message):
    """Build a wa.me deep link. Phone should include country code."""
    digits = "".join(c for c in phone if c.isdigit())
    return (
        "https://wa.me/" + digits
        + "?text=" + urllib.parse.quote(message)
    )


def render_message(template, appt, settings):
    return template.format(
        name=appt.get("customer_name", ""),
        service=appt.get("service", "your appointment"),
        date=appt.get("appt_date", ""),
        time=appt.get("appt_time", ""),
        amount=appt.get("deposit_amount", ""),
        currency=appt.get("currency", "HKD"),
        fps_id=settings.get("fps_id", ""),
        fps_name=settings.get("fps_name", ""),
        business=settings.get("business_name", ""),
    )


# ---- Pages -----------------------------------------------------------------

@app.route("/")
def dashboard():
    s = models.stats()
    overdue = models.overdue_deposits()
    upcoming = models.list_appointments(
        appt_status="scheduled", upcoming_only=True
    )[:10]
    return render_template(
        "dashboard.html", stats=s, overdue=overdue, upcoming=upcoming
    )


@app.route("/appointments")
def appointments_page():
    return render_template(
        "appointments.html",
        deposit_statuses=models.DEPOSIT_STATUSES,
        appt_statuses=models.APPT_STATUSES,
    )


@app.route("/settings")
def settings_page():
    return render_template("settings.html")


# ---- JSON API ---------------------------------------------------------------

@app.route("/api/settings", methods=["GET", "POST"])
def api_settings():
    if request.method == "POST":
        models.save_settings(request.get_json(force=True))
        return jsonify({"ok": True})
    return jsonify(models.get_settings())


@app.route("/api/appointments", methods=["GET", "POST"])
def api_appointments():
    if request.method == "POST":
        data = request.get_json(force=True)
        if not data.get("customer_name") or not data.get("appt_date"):
            return jsonify(
                {"error": "customer_name and appt_date are required"}
            ), 400
        aid = models.create_appointment(data)
        return jsonify({"id": aid}), 201
    return jsonify(
        models.list_appointments(
            deposit_status=request.args.get("deposit_status") or None,
            appt_status=request.args.get("appt_status") or None,
            search=request.args.get("q", "").strip() or None,
        )
    )


@app.route("/api/appointments/<int:aid>", methods=["GET", "PATCH"])
def api_appointment_detail(aid):
    if request.method == "PATCH":
        ok = models.update_appointment(aid, request.get_json(force=True))
        if not ok:
            return jsonify({"error": "not found or no changes"}), 404
        return jsonify({"ok": True})
    appt = models.get_appointment(aid)
    if not appt:
        return jsonify({"error": "not found"}), 404
    return jsonify(appt)


@app.route("/api/appointments/<int:aid>/whatsapp")
def api_whatsapp_link(aid):
    kind = request.args.get("kind", "deposit")
    appt = models.get_appointment(aid)
    if not appt:
        return jsonify({"error": "not found"}), 404
    settings = models.get_settings()
    template = settings["deposit_message"] if kind == "deposit" \
        else settings["reminder_message"]
    message = render_message(template, appt, settings)
    link = build_whatsapp_link(appt["customer_phone"], message)
    return jsonify({"link": link, "message": message})


@app.route("/api/stats")
def api_stats():
    return jsonify(models.stats())


@app.route("/api/overdue")
def api_overdue():
    return jsonify(models.overdue_deposits())


if __name__ == "__main__":
    models.init_db()
    port = int(os.environ.get("PORT", 5002))
    app.run(host="0.0.0.0", port=port)
