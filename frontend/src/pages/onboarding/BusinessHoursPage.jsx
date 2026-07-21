import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboardBusiness, updateDashboardBusiness, updateProfile } from "../../services/api";
import { WEEKDAYS } from "../../constants/accessibility";

// ---------------------------------------------------------------------------
// BusinessHoursPage
// Route: /business-setup/hours
//
// Structured per-day hours editor. Each day is either:
//   - "legacy": an existing free-text string from before this editor existed
//     ("9:00 AM - 5:00 PM", "Closed") — shown read-only with an Edit action
//     so nothing is silently overwritten until the owner explicitly touches it.
//   - "structured": a list of {open, close} 24h periods (empty = closed,
//     multiple = split hours like lunch/dinner).
// Skippable — hours are optional but count toward profile completion once set.
// ---------------------------------------------------------------------------

const WEEKEND_KEYS  = ["sat", "sun"];
const WEEKDAY_KEYS  = ["mon", "tue", "wed", "thu", "fri"];
const DEFAULT_PERIOD = { open: "09:00", close: "17:00" };

function emptyPeriodRow() { return { open: "", close: "" }; }

export default function BusinessHoursPage() {
  const navigate = useNavigate();

  const [structured, setStructured] = useState({}); // { day: [{open,close}] }
  const [legacy,     setLegacy]     = useState({}); // { day: "original string" }
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState(null);

  useEffect(() => {
    // Guards against React StrictMode's dev-only double-invoke firing this
    // fetch twice and a stale response overwriting anything the user has
    // already started editing.
    let ignore = false;
    getDashboardBusiness()
      .then((biz) => {
        if (ignore) return;
        const raw = biz.hours || {};
        const nextStructured = {};
        const nextLegacy = {};
        WEEKDAYS.forEach(({ key }) => {
          const v = raw[key];
          if (Array.isArray(v)) nextStructured[key] = v.length ? v : [];
          else if (typeof v === "string" && v.trim()) nextLegacy[key] = v;
          else nextStructured[key] = [];
        });
        setStructured(nextStructured);
        setLegacy(nextLegacy);
      })
      .catch(() => { if (!ignore) setError("Failed to load your business hours."); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, []);

  const isOpen = (day) => (structured[day]?.length ?? 0) > 0;

  const editLegacyDay = (day) => {
    setLegacy((l) => { const next = { ...l }; delete next[day]; return next; });
    setStructured((s) => ({ ...s, [day]: [] }));
  };

  const toggleOpen = (day) => {
    setStructured((s) => ({ ...s, [day]: isOpen(day) ? [] : [{ ...DEFAULT_PERIOD }] }));
  };

  const addPeriod = (day) => {
    setStructured((s) => ({ ...s, [day]: [...(s[day] || []), emptyPeriodRow()] }));
  };

  const removePeriod = (day, idx) => {
    setStructured((s) => ({ ...s, [day]: s[day].filter((_, i) => i !== idx) }));
  };

  const updatePeriod = (day, idx, field, value) => {
    setStructured((s) => ({
      ...s,
      [day]: s[day].map((p, i) => (i === idx ? { ...p, [field]: value } : p)),
    }));
  };

  const open24 = (day) => {
    setStructured((s) => ({ ...s, [day]: [{ open: "00:00", close: "23:59" }] }));
  };

  // Quick actions — all claim any legacy days they touch into structured first.
  const claimForQuickAction = (days) => {
    setLegacy((l) => {
      const next = { ...l };
      days.forEach((d) => delete next[d]);
      return next;
    });
  };

  const copyMondayToWeekdays = () => {
    const monPeriods = structured.mon || [];
    claimForQuickAction(WEEKDAY_KEYS);
    setStructured((s) => {
      const next = { ...s };
      WEEKDAY_KEYS.forEach((d) => { next[d] = monPeriods.map((p) => ({ ...p })); });
      return next;
    });
  };

  const applyToAllDays = () => {
    const monPeriods = structured.mon || [];
    const allDays = WEEKDAYS.map((w) => w.key);
    claimForQuickAction(allDays);
    setStructured((s) => {
      const next = { ...s };
      allDays.forEach((d) => { next[d] = monPeriods.map((p) => ({ ...p })); });
      return next;
    });
  };

  const closedWeekends = () => {
    claimForQuickAction(WEEKEND_KEYS);
    setStructured((s) => ({ ...s, sat: [], sun: [] }));
  };

  const validate = () => {
    for (const { key, label } of WEEKDAYS) {
      for (const p of structured[key] || []) {
        if (p.open && p.close && p.close <= p.open) {
          setError(`${label}: closing time must be after opening time.`);
          return false;
        }
      }
    }
    setError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (saving) return;
    if (!validate()) return;
    setSaving(true);

    const hours = { ...legacy };
    WEEKDAYS.forEach(({ key }) => {
      if (key in structured) {
        // Drop incomplete rows (only one of open/close filled) rather than blocking submit.
        hours[key] = structured[key].filter((p) => p.open && p.close);
      }
    });

    try {
      await updateDashboardBusiness({ hours });
      try { await updateProfile({ onboardingStep: "business-accessibility" }); } catch { /* non-blocking */ }
      navigate("/business-setup/accessibility");
    } catch (err) {
      setError(err.message || "Failed to save your hours. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => navigate("/business-setup/accessibility");

  if (loading) return <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb" }} />;

  const quickActionStyle = {
    padding: "7px 12px", backgroundColor: "#fff", color: "#374151",
    border: "1.5px solid #e5e7eb", borderRadius: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer",
  };

  return (
    <div style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb", minHeight: "100vh", padding: "32px 20px 60px" }}>
      <div style={{ maxWidth: "620px", margin: "0 auto" }}>

        <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#111827", margin: "0 0 6px" }}>Operating hours</h1>
        <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 20px", lineHeight: "1.5" }}>
          Optional, but helps visitors know when to visit. You can add multiple periods per day (e.g. a lunch and dinner service).
        </p>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
          <button type="button" onClick={copyMondayToWeekdays} style={quickActionStyle}>Copy Monday to weekdays</button>
          <button type="button" onClick={applyToAllDays} style={quickActionStyle}>Apply to all days</button>
          <button type="button" onClick={closedWeekends} style={quickActionStyle}>Closed weekends</button>
        </div>

        <div style={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "8px 22px", marginBottom: "16px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          {WEEKDAYS.map(({ key, label }, i) => (
            <div key={key} style={{ padding: "14px 0", borderTop: i === 0 ? "none" : "1px solid #f3f4f6" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: legacy[key] || isOpen(key) ? "10px" : 0 }}>
                <span style={{ fontSize: "14px", fontWeight: "600", color: "#111827", width: "100px", flexShrink: 0 }}>{label}</span>

                {!(key in legacy) && (
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#374151", cursor: "pointer" }}>
                    <input type="checkbox" checked={isOpen(key)} onChange={() => toggleOpen(key)} style={{ cursor: "pointer" }} />
                    {isOpen(key) ? "Open" : "Closed"}
                  </label>
                )}
              </div>

              {/* Legacy free-text day — read-only until explicitly edited */}
              {key in legacy && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", backgroundColor: "#f9fafb", border: "1px solid #f3f4f6", borderRadius: "8px", padding: "8px 12px" }}>
                  <span style={{ fontSize: "13px", color: "#6b7280" }}>{legacy[key]}</span>
                  <button type="button" onClick={() => editLegacyDay(key)} style={{ background: "none", border: "none", color: "#2563eb", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>
                    Edit
                  </button>
                </div>
              )}

              {/* Structured periods */}
              {!(key in legacy) && isOpen(key) && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {(structured[key] || []).map((p, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="time"
                        aria-label={`${label} opening time, period ${idx + 1}`}
                        value={p.open}
                        onChange={(e) => updatePeriod(key, idx, "open", e.target.value)}
                        style={{ padding: "7px 10px", fontSize: "13px", border: "1.5px solid #d1d5db", borderRadius: "8px" }}
                      />
                      <span style={{ color: "#9ca3af", fontSize: "13px" }}>to</span>
                      <input
                        type="time"
                        aria-label={`${label} closing time, period ${idx + 1}`}
                        value={p.close}
                        onChange={(e) => updatePeriod(key, idx, "close", e.target.value)}
                        style={{ padding: "7px 10px", fontSize: "13px", border: "1.5px solid #d1d5db", borderRadius: "8px" }}
                      />
                      <button
                        type="button"
                        onClick={() => removePeriod(key, idx)}
                        aria-label={`Remove period ${idx + 1} for ${label}`}
                        style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "16px", cursor: "pointer", padding: "0 4px" }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: "12px", marginTop: "2px" }}>
                    <button type="button" onClick={() => addPeriod(key)} style={{ background: "none", border: "none", color: "#2563eb", fontSize: "12px", fontWeight: "600", cursor: "pointer", padding: 0 }}>
                      + Add period
                    </button>
                    <button type="button" onClick={() => open24(key)} style={{ background: "none", border: "none", color: "#2563eb", fontSize: "12px", fontWeight: "600", cursor: "pointer", padding: 0 }}>
                      Open 24 hours
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {error && <p role="alert" style={{ color: "#dc2626", fontSize: "13px", margin: "0 0 14px" }}>{error}</p>}

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => navigate(-1)}
            style={{ padding: "14px 18px", backgroundColor: "#fff", color: "#374151", border: "1.5px solid #e5e7eb", borderRadius: "10px", fontSize: "14px", fontWeight: "600", cursor: "pointer", minHeight: "48px" }}
          >
            ← Back
          </button>
          <button
            onClick={handleSkip}
            style={{ padding: "14px 18px", backgroundColor: "#fff", color: "#374151", border: "1.5px solid #e5e7eb", borderRadius: "10px", fontSize: "14px", fontWeight: "600", cursor: "pointer", minHeight: "48px" }}
          >
            Skip for now
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              flex: 1, padding: "14px", backgroundColor: "#111827", color: "#fff", border: "none",
              borderRadius: "10px", fontSize: "15px", fontWeight: "600",
              cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, minHeight: "48px",
            }}
          >
            {saving ? "Saving…" : "Continue →"}
          </button>
        </div>
      </div>
    </div>
  );
}
