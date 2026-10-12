/* No-Show Deposit Tracker — small helpers, no frameworks. */
"use strict";

async function api(path, method, body) {
  const res = await fetch(path, {
    method: method || "GET",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || ("HTTP " + res.status));
  }
  return res.json();
}

function formToJson(form) {
  const data = {};
  new FormData(form).forEach((v, k) => {
    data[k] = v === "" ? null : v;
  });
  return data;
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

document.addEventListener("DOMContentLoaded", () => {
  // ---- Appointment list -----------------------------------------------------
  const rowsEl = document.getElementById("appt-rows");
  const filterForm = document.getElementById("filter-form");

  async function patchAppt(id, data) {
    await api("/api/appointments/" + id, "PATCH", data);
    loadAppointments();
  }

  async function loadAppointments() {
    if (!rowsEl) return;
    const q = new URLSearchParams();
    const v = (id) => document.getElementById(id).value.trim();
    if (v("f-q")) q.set("q", v("f-q"));
    if (v("f-deposit")) q.set("deposit_status", v("f-deposit"));
    if (v("f-appt")) q.set("appt_status", v("f-appt"));
    try {
      const items = await api("/api/appointments?" + q.toString());
      if (!items.length) {
        rowsEl.innerHTML =
          '<tr><td colspan="6" class="muted">No appointments found.</td></tr>';
        return;
      }
      rowsEl.innerHTML = items.map((a) => (
        "<tr>" +
        "<td><strong>" + esc(a.customer_name) + "</strong>" +
        '<div class="muted">' + esc(a.customer_phone) + "</div></td>" +
        "<td>" + esc(a.service || "—") + "</td>" +
        "<td>" + esc(a.appt_date) + " " + esc(a.appt_time || "") + "</td>" +
        '<td><span class="pill pill-' + a.deposit_status + '">' +
        a.deposit_status + "</span>" +
        '<div class="muted">' + Number(a.deposit_amount).toFixed(0) +
        " " + esc(a.currency) + "</div></td>" +
        "<td>" + esc(a.appt_status.replace("_", " ")) + "</td>" +
        '<td><div class="row-actions">' +
        '<button data-wa="' + a.id + '" data-kind="deposit">📩 WA</button>' +
        '<button data-paid="' + a.id + '">✓ Paid</button>' +
        '<button data-noshow="' + a.id + '">✗ No-show</button>' +
        '<button data-done="' + a.id + '">Done</button>' +
        "</div></td>" +
        "</tr>"
      )).join("");
      bindRowButtons();
    } catch (err) {
      rowsEl.innerHTML =
        '<tr><td colspan="6" class="muted">Error: ' + esc(err.message) +
        "</td></tr>";
    }
  }

  function bindRowButtons() {
    rowsEl.querySelectorAll("[data-wa]").forEach((b) =>
      b.addEventListener("click", async () => {
        try {
          const r = await api(
            "/api/appointments/" + b.getAttribute("data-wa") +
            "/whatsapp?kind=" + b.getAttribute("data-kind")
          );
          window.open(r.link, "_blank");
        } catch (err) { alert("Error: " + err.message); }
      }));
    rowsEl.querySelectorAll("[data-paid]").forEach((b) =>
      b.addEventListener("click", () =>
        patchAppt(b.getAttribute("data-paid"),
          { deposit_status: "paid" }).catch((e) => alert(e.message))));
    rowsEl.querySelectorAll("[data-noshow]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirm("Mark as no-show? Deposit will be forfeited."))
          return;
        try {
          await patchAppt(b.getAttribute("data-noshow"),
            { appt_status: "no_show", deposit_status: "forfeited" });
        } catch (e) { alert(e.message); }
      }));
    rowsEl.querySelectorAll("[data-done]").forEach((b) =>
      b.addEventListener("click", () =>
        patchAppt(b.getAttribute("data-done"),
          { appt_status: "completed" }).catch((e) => alert(e.message))));
  }

  // Dashboard buttons (same actions, page reload)
  document.querySelectorAll("[data-wa]").forEach((b) => {
    if (!rowsEl || !b.closest("#appt-rows"))
      b.addEventListener("click", async () => {
        try {
          const r = await api(
            "/api/appointments/" + b.getAttribute("data-wa") +
            "/whatsapp?kind=" + b.getAttribute("data-kind"));
          window.open(r.link, "_blank");
        } catch (err) { alert("Error: " + err.message); }
      });
  });
  document.querySelectorAll("[data-paid]").forEach((b) => {
    if (!b.closest("#appt-rows"))
      b.addEventListener("click", async () => {
        try {
          await api("/api/appointments/" + b.getAttribute("data-paid"),
            "PATCH", { deposit_status: "paid" });
          location.reload();
        } catch (err) { alert("Error: " + err.message); }
      });
  });

  if (filterForm) {
    filterForm.addEventListener("submit", (e) => {
      e.preventDefault();
      loadAppointments();
    });
    loadAppointments();
  }

  // ---- New appointment dialog -------------------------------------------------
  const dlg = document.getElementById("dlg-appt");
  const frm = document.getElementById("frm-appt");
  const btnNew = document.getElementById("btn-new-appt");
  const btnCancel = document.getElementById("btn-cancel-appt");

  if (btnNew) {
    btnNew.addEventListener("click", async () => {
      try {
        const s = await api("/api/settings");
        const amt = document.getElementById("f-deposit-amt");
        if (s.default_deposit) amt.value = s.default_deposit;
      } catch (e) { /* defaults stand */ }
      dlg.showModal();
    });
  }
  if (btnCancel) btnCancel.addEventListener("click", () => dlg.close());
  if (frm) {
    frm.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await api("/api/appointments", "POST", formToJson(frm));
        dlg.close();
        frm.reset();
        loadAppointments();
      } catch (err) { alert("Could not save: " + err.message); }
    });
  }

  // ---- Settings form ------------------------------------------------------------
  const frmSettings = document.getElementById("frm-settings");
  if (frmSettings) {
    api("/api/settings").then((s) => {
      document.getElementById("s-business").value = s.business_name || "";
      document.getElementById("s-fps-id").value = s.fps_id || "";
      document.getElementById("s-fps-name").value = s.fps_name || "";
      document.getElementById("s-deposit").value = s.default_deposit || "";
      document.getElementById("s-currency").value = s.currency || "HKD";
      document.getElementById("s-msg1").value = s.deposit_message || "";
      document.getElementById("s-msg2").value = s.reminder_message || "";
    }).catch(() => {});
    frmSettings.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await api("/api/settings", "POST", formToJson(frmSettings));
        document.getElementById("settings-saved").textContent =
          "Saved ✓";
        setTimeout(() => {
          document.getElementById("settings-saved").textContent = "";
        }, 2000);
      } catch (err) { alert("Could not save: " + err.message); }
    });
  }
});
