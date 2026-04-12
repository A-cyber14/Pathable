import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getAdminStats,
  getAdminBusinesses, updateAdminBusiness, deleteAdminBusiness,
  getAdminUsers,      deleteAdminUser,    unlinkBusinessUser,
  getAdminReviews,    deleteAdminReview,
  getAdminMedia,      deleteAdminMedia,
} from "../services/api";

// ---------------------------------------------------------------------------
// Tiny helpers
// ---------------------------------------------------------------------------

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: "28px" }}>
      <h2 style={{ fontSize: "15px", fontWeight: "700", color: "#111827", margin: "0 0 14px" }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function StatCard({ label, value, color = "#2563eb" }) {
  return (
    <div style={{
      flex: "1 1 120px",
      backgroundColor: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: "12px",
      padding: "16px 20px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      <div style={{ fontSize: "26px", fontWeight: "800", color }}>{value ?? "—"}</div>
      <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px", fontWeight: "500" }}>{label}</div>
    </div>
  );
}

function ActionButton({ label, onClick, color = "#dc2626", disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "5px 12px",
        fontSize: "12px",
        fontWeight: "600",
        borderRadius: "7px",
        border: "none",
        backgroundColor: color,
        color: "#fff",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "opacity 0.15s",
      }}
    >
      {label}
    </button>
  );
}

function SearchInput({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        maxWidth: "320px",
        padding: "8px 12px",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        fontSize: "13px",
        outline: "none",
        marginBottom: "12px",
        boxSizing: "border-box",
      }}
    />
  );
}

const TABLE_STYLE = { width: "100%", borderCollapse: "collapse", fontSize: "13px" };
const TH_STYLE = {
  textAlign: "left", padding: "8px 12px", borderBottom: "1px solid #e5e7eb",
  fontSize: "11px", color: "#6b7280", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.4px",
};
const TD_STYLE = { padding: "10px 12px", borderBottom: "1px solid #f3f4f6", color: "#374151", verticalAlign: "top" };

// ---------------------------------------------------------------------------
// Tab: Businesses
// ---------------------------------------------------------------------------

function BusinessesTab() {
  const [rows,    setRows]    = useState(null);
  const [query,   setQuery]   = useState("");
  const [editing, setEditing] = useState(null); // { id, name, address, website, phone }
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    try { setRows(await getAdminBusinesses()); }
    catch (e) { setError(e.message); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = (rows || []).filter((b) =>
    !query || b.name?.toLowerCase().includes(query.toLowerCase()) ||
    b.address?.toLowerCase().includes(query.toLowerCase())
  );

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteAdminBusiness(id);
      setRows((r) => r.filter((b) => b.id !== id));
    } catch (e) { alert(e.message); }
  };

  const startEdit = (b) =>
    setEditing({ id: b.id, name: b.name || "", address: b.address || "", website: b.website || "", phone: b.phone || "" });

  const saveEdit = async () => {
    setSaving(true);
    setError(null);
    try {
      const { id, ...fields } = editing;
      const payload = Object.fromEntries(Object.entries(fields).filter(([, v]) => v));
      await updateAdminBusiness(id, payload);
      setRows((r) => r.map((b) => b.id === id ? { ...b, ...payload } : b));
      setEditing(null);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  if (!rows) return <p style={{ color: "#6b7280", fontSize: "13px" }}>Loading…</p>;

  return (
    <>
      {error && <p style={{ color: "#dc2626", fontSize: "13px", marginBottom: "8px" }}>{error}</p>}
      <SearchInput value={query} onChange={setQuery} placeholder="Search by name or address…" />

      {editing && (
        <div style={{
          backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px",
          padding: "16px 20px", marginBottom: "16px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
        }}>
          <div style={{ fontWeight: "700", fontSize: "14px", marginBottom: "12px", color: "#111827" }}>
            Edit Business
          </div>
          {["name", "address", "website", "phone"].map((field) => (
            <div key={field} style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "11px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", display: "block", marginBottom: "3px" }}>
                {field}
              </label>
              <input
                value={editing[field]}
                onChange={(e) => setEditing((ed) => ({ ...ed, [field]: e.target.value }))}
                style={{ width: "100%", padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: "7px", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
              />
            </div>
          ))}
          <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
            <ActionButton label={saving ? "Saving…" : "Save"} onClick={saveEdit} color="#2563eb" disabled={saving} />
            <ActionButton label="Cancel" onClick={() => setEditing(null)} color="#6b7280" />
          </div>
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={TABLE_STYLE}>
          <thead>
            <tr>
              {["Name", "Address", "Reviews", "Score", "Actions"].map((h) => (
                <th key={h} style={TH_STYLE}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ ...TD_STYLE, color: "#9ca3af", textAlign: "center", padding: "24px" }}>No businesses found</td></tr>
            )}
            {filtered.map((b) => (
              <tr key={b.id}>
                <td style={TD_STYLE}>
                  <div style={{ fontWeight: "600", color: "#111827" }}>{b.name}</div>
                  <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "2px" }}>{b.id}</div>
                </td>
                <td style={{ ...TD_STYLE, maxWidth: "200px" }}>{b.address || "—"}</td>
                <td style={TD_STYLE}>{b.review_count ?? 0}</td>
                <td style={TD_STYLE}>{b.community_score != null ? Number(b.community_score).toFixed(1) : "—"}</td>
                <td style={{ ...TD_STYLE, whiteSpace: "nowrap" }}>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <ActionButton label="Edit" onClick={() => startEdit(b)} color="#2563eb" />
                    <ActionButton label="Delete" onClick={() => handleDelete(b.id, b.name)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Tab: Users
// ---------------------------------------------------------------------------

function UsersTab() {
  const [rows,  setRows]  = useState(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try { setRows(await getAdminUsers()); }
    catch (e) { setError(e.message); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = (rows || []).filter((u) =>
    !query ||
    u.email?.toLowerCase().includes(query.toLowerCase()) ||
    u.displayName?.toLowerCase().includes(query.toLowerCase()) ||
    u.uid?.toLowerCase().includes(query.toLowerCase())
  );

  const handleDelete = async (uid, label) => {
    if (!window.confirm(`Delete user "${label}"? This cannot be undone.`)) return;
    try {
      await deleteAdminUser(uid);
      setRows((r) => r.filter((u) => u.uid !== uid));
    } catch (e) { alert(e.message); }
  };

  const handleUnlink = async (uid) => {
    if (!window.confirm("Unlink this user from their business?")) return;
    try {
      await unlinkBusinessUser(uid);
      setRows((r) => r.map((u) => u.uid === uid ? { ...u, accountType: "user", businessId: null } : u));
    } catch (e) { alert(e.message); }
  };

  const typeColor = (t) => ({ admin: "#7c3aed", business: "#2563eb", user: "#16a34a" }[t] || "#6b7280");

  if (!rows) return <p style={{ color: "#6b7280", fontSize: "13px" }}>Loading…</p>;

  return (
    <>
      {error && <p style={{ color: "#dc2626", fontSize: "13px", marginBottom: "8px" }}>{error}</p>}
      <SearchInput value={query} onChange={setQuery} placeholder="Search by name or email…" />
      <div style={{ overflowX: "auto" }}>
        <table style={TABLE_STYLE}>
          <thead>
            <tr>
              {["User", "Type", "Business ID", "Activity", "Actions"].map((h) => (
                <th key={h} style={TH_STYLE}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ ...TD_STYLE, color: "#9ca3af", textAlign: "center", padding: "24px" }}>No users found</td></tr>
            )}
            {filtered.map((u) => (
              <tr key={u.uid}>
                <td style={TD_STYLE}>
                  <div style={{ fontWeight: "600", color: "#111827" }}>{u.displayName || u.email || "—"}</div>
                  <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "2px" }}>{u.uid}</div>
                  {u.email && u.displayName && (
                    <div style={{ fontSize: "11px", color: "#9ca3af" }}>{u.email}</div>
                  )}
                </td>
                <td style={TD_STYLE}>
                  <span style={{
                    display: "inline-block", padding: "2px 8px", borderRadius: "999px",
                    backgroundColor: typeColor(u.accountType) + "18",
                    color: typeColor(u.accountType), fontSize: "11px", fontWeight: "700",
                  }}>
                    {u.accountType || "none"}
                  </span>
                </td>
                <td style={{ ...TD_STYLE, fontSize: "11px", maxWidth: "160px", wordBreak: "break-all" }}>
                  {u.businessId || "—"}
                </td>
                <td style={TD_STYLE}>{(u.reviewCount || 0) + (u.contributionCount || 0)}</td>
                <td style={{ ...TD_STYLE, whiteSpace: "nowrap" }}>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {u.businessId && (
                      <ActionButton label="Unlink" onClick={() => handleUnlink(u.uid)} color="#d97706" />
                    )}
                    <ActionButton label="Delete" onClick={() => handleDelete(u.uid, u.displayName || u.email || u.uid)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Tab: Reviews
// ---------------------------------------------------------------------------

function ReviewsTab() {
  const [rows,  setRows]  = useState(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try { setRows(await getAdminReviews()); }
    catch (e) { setError(e.message); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = (rows || []).filter((r) =>
    !query ||
    r.comment?.toLowerCase().includes(query.toLowerCase()) ||
    r.business_id?.toLowerCase().includes(query.toLowerCase())
  );

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this review? This cannot be undone.")) return;
    try {
      await deleteAdminReview(id);
      setRows((r) => r.filter((rev) => rev.id !== id));
    } catch (e) { alert(e.message); }
  };

  if (!rows) return <p style={{ color: "#6b7280", fontSize: "13px" }}>Loading…</p>;

  return (
    <>
      {error && <p style={{ color: "#dc2626", fontSize: "13px", marginBottom: "8px" }}>{error}</p>}
      <SearchInput value={query} onChange={setQuery} placeholder="Search by comment or business ID…" />
      <div style={{ overflowX: "auto" }}>
        <table style={TABLE_STYLE}>
          <thead>
            <tr>
              {["Comment", "Rating", "Business", "Date", "Actions"].map((h) => (
                <th key={h} style={TH_STYLE}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ ...TD_STYLE, color: "#9ca3af", textAlign: "center", padding: "24px" }}>No reviews found</td></tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id}>
                <td style={{ ...TD_STYLE, maxWidth: "280px" }}>
                  <div style={{ color: "#374151", lineHeight: "1.5" }}>"{r.comment}"</div>
                  <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "2px" }}>{r.reviewerName || r.submittedBy || "anonymous"}</div>
                </td>
                <td style={TD_STYLE}>{"★".repeat(r.rating || 0)}</td>
                <td style={{ ...TD_STYLE, fontSize: "11px", maxWidth: "140px", wordBreak: "break-all" }}>
                  {r.business_id}
                </td>
                <td style={{ ...TD_STYLE, whiteSpace: "nowrap", fontSize: "12px" }}>
                  {r.submitted_at
                    ? new Date(r.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : "—"}
                </td>
                <td style={TD_STYLE}>
                  <ActionButton label="Delete" onClick={() => handleDelete(r.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Tab: Media
// ---------------------------------------------------------------------------

function MediaTab() {
  const [rows,  setRows]  = useState(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try { setRows(await getAdminMedia()); }
    catch (e) { setError(e.message); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = (rows || []).filter((p) =>
    !query || p.business_id?.toLowerCase().includes(query.toLowerCase())
  );

  const handleDelete = async (bizId, photoId) => {
    if (!window.confirm("Delete this photo? This cannot be undone.")) return;
    try {
      await deleteAdminMedia(bizId, photoId);
      setRows((r) => r.filter((p) => p.id !== photoId));
    } catch (e) { alert(e.message); }
  };

  if (!rows) return <p style={{ color: "#6b7280", fontSize: "13px" }}>Loading…</p>;

  return (
    <>
      {error && <p style={{ color: "#dc2626", fontSize: "13px", marginBottom: "8px" }}>{error}</p>}
      <SearchInput value={query} onChange={setQuery} placeholder="Search by business ID…" />
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: "12px",
      }}>
        {filtered.length === 0 && (
          <p style={{ color: "#9ca3af", fontSize: "13px", gridColumn: "1/-1", textAlign: "center", padding: "24px 0" }}>
            No photos found
          </p>
        )}
        {filtered.map((p) => (
          <div key={p.id} style={{
            backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "10px",
            overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}>
            {p.url ? (
              <img
                src={p.url}
                alt=""
                style={{ width: "100%", height: "120px", objectFit: "cover", display: "block" }}
              />
            ) : (
              <div style={{ width: "100%", height: "120px", backgroundColor: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: "11px" }}>
                No preview
              </div>
            )}
            <div style={{ padding: "8px 10px" }}>
              <div style={{ fontSize: "10px", color: "#9ca3af", marginBottom: "6px", wordBreak: "break-all" }}>
                {p.business_id}
              </div>
              <ActionButton label="Delete" onClick={() => handleDelete(p.business_id, p.id)} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// AdminPage
// ---------------------------------------------------------------------------

const TABS = ["Businesses", "Users", "Reviews", "Media"];

export default function AdminPage() {
  const { userProfile, logout } = useAuth();
  const [stats,      setStats]     = useState(null);
  const [activeTab,  setActiveTab] = useState("Businesses");
  const [statsError, setStatsError] = useState(null);

  useEffect(() => {
    getAdminStats()
      .then(setStats)
      .catch((e) => setStatsError(e.message));
  }, []);

  // Access guard (belt + suspenders — App.jsx already guards this route)
  if (userProfile?.accountType !== "admin") {
    return (
      <div style={{ padding: "48px 24px", textAlign: "center" }}>
        <p style={{ fontSize: "15px", color: "#374151" }}>Admin access required.</p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight:       "100vh",
      backgroundColor: "#f9fafb",
      fontFamily:      "sans-serif",
      padding:         "28px 32px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: "20px", fontWeight: "800", color: "#111827" }}>
            Admin Dashboard
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
            Pathable platform management
          </p>
        </div>
        <button
          onClick={logout}
          style={{
            padding: "8px 16px", backgroundColor: "#fff", border: "1px solid #e5e7eb",
            borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer", color: "#374151",
          }}
        >
          Sign out
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "28px" }}>
        {statsError ? (
          <p style={{ color: "#dc2626", fontSize: "13px" }}>{statsError}</p>
        ) : (
          <>
            <StatCard label="Users"      value={stats?.users}      color="#2563eb" />
            <StatCard label="Businesses" value={stats?.businesses} color="#7c3aed" />
            <StatCard label="Reviews"    value={stats?.reviews}    color="#16a34a" />
            <StatCard label="Photos"     value={stats?.media}      color="#d97706" />
          </>
        )}
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "20px", borderBottom: "1px solid #e5e7eb" }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "8px 18px",
              border: "none",
              borderBottom: activeTab === tab ? "2px solid #2563eb" : "2px solid transparent",
              backgroundColor: "transparent",
              fontSize: "13px",
              fontWeight: activeTab === tab ? "700" : "500",
              color: activeTab === tab ? "#2563eb" : "#6b7280",
              cursor: "pointer",
              marginBottom: "-1px",
              transition: "color 0.15s",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{
        backgroundColor: "#fff",
        border:          "1px solid #e5e7eb",
        borderRadius:    "12px",
        padding:         "20px",
        boxShadow:       "0 1px 3px rgba(0,0,0,0.04)",
      }}>
        {activeTab === "Businesses" && <BusinessesTab />}
        {activeTab === "Users"      && <UsersTab />}
        {activeTab === "Reviews"    && <ReviewsTab />}
        {activeTab === "Media"      && <MediaTab />}
      </div>
    </div>
  );
}
