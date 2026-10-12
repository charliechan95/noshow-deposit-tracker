# No-Show Deposit Tracker

A free, self-hosted deposit manager for appointment businesses
(salons, clinics, tutors, etc.). Reduces no-shows by collecting
a small deposit via Hong Kong FPS when booking.

## Stack (all free)

- **Flask** — web framework (open source)
- **SQLite** — database via Python stdlib (no server, no cost)
- **Vanilla HTML/CSS/JS** — no frontend framework, no build step
- **WhatsApp** — via free `wa.me` deep links (no Business API needed)
- **FPS** — Hong Kong Faster Payment System (free bank transfer)

There are **zero paid APIs** in this app.

## Quick start

```bash
cd noshow-deposit-tracker
pip install -r requirements.txt
python app.py
```

Open http://localhost:5002

## How it works

1. **Settings** — enter your business name, FPS ID, and default
   deposit amount once.
2. **New appointment** — add customer (name + phone with country code),
   service, date/time. Deposit amount pre-fills from settings.
3. **📩 WA button** — opens WhatsApp with a pre-written deposit request
   (includes your FPS details). You just hit send.
4. **✓ Paid** — when the customer sends their FPS screenshot, tap to
   confirm the deposit.
5. **✗ No-show** — marks the appointment as no-show and forfeits
   the deposit automatically.

## What it tracks

- **Dashboard** — no-show rate, deposits collected, deposits forfeited,
  pending-deposit alerts, upcoming appointments
- **Appointments** — full list with search, deposit/appointment status
  filters, one-tap actions
- **Overdue deposits** — scheduled appointments with unpaid deposits
  surface automatically, with a reminder WhatsApp template

## Why no WhatsApp API?

The official WhatsApp Business API is paid. This app uses `wa.me`
links instead — free, no signup, works from any phone. The trade-off:
you tap send manually (one tap per customer).

## Why no automatic FPS verification?

FPS has no free public API for personal accounts. Deposit confirmation
is one tap when you see the customer's payment screenshot — the same
effort as checking it in your banking app.

## Deploying to Render (free)

1. Push this folder to a GitHub repo
2. In Render: New → Blueprint → point at the repo (`render.yaml`)
3. The 1GB persistent disk keeps `deposits.db` across deploys

## Notes

- Data lives in `deposits.db` (`DB_PATH` env var overrides).
- Phone numbers need the country code for wa.me links
  (e.g. `85291234567` for Hong Kong).
