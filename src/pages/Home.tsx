import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { APIProvider } from "@vis.gl/react-google-maps";
import { useAuth } from "../contexts/AuthContext";
import { useGeolocation } from "../hooks/useGeolocation";
import { NearestSanctuaries } from "../components/NearestSanctuaries";
import {
  createCrimeReport,
  type CrimeReport,
  addToWaitlist,
} from "../lib/data";

// Small inline icon for chips and status rows
function ChipIcon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="currentColor"
      aria-hidden
      style={{ flexShrink: 0, opacity: 0.75 }}
    >
      <path d={d} />
    </svg>
  );
}

// Map free-text intent to a support level + need key
function matchNeed(q: string): { level: string; need: string } {
  const t = q.toLowerCase();
  const has = (...w: string[]) => w.some((x) => t.includes(x));
  if (has("police", "security", "guard", "danger", "threat", "follow", "stalk"))
    return { level: "l2", need: "police_security" };
  if (
    has("medic", "medicine", "pharmacy", "hurt", "injur", "first aid", "sick", "clinic", "hospital")
  )
    return { level: "l1", need: "minor_medical" };
  if (has("charge", "wifi", "wi-fi", "phone", "battery"))
    return { level: "l1", need: "call_charge_wifi" };
  if (has("talk", "report", "counsel", "someone"))
    return { level: "l1", need: "talk_report" };
  if (has("transport", "escort", "walk", "taxi", "ride", "bus", "train"))
    return { level: "l1", need: "escort_transport" };
  return { level: "l1", need: "basic_comfort" };
}

const BRAND = {
  purple: "var(--brand)",
  blue: "var(--brand-blue)",
  pink: "var(--brand-pink)",
  purpleLight: "var(--brand-tint)",
  blueLight: "var(--blue-tint)",
  pinkLight: "var(--pink-tint)",
};

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const { location: loc, loading: locLoading } = useGeolocation({
    watch: false,
  });
  const [showReport, setShowReport] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const PROVINCES = [
    "Eastern Cape",
    "Free State",
    "Gauteng",
    "KwaZulu-Natal",
    "Limpopo",
    "Mpumalanga",
    "Northern Cape",
    "North West",
    "Western Cape",
  ] as const;
  const SAPS_CRIME_CATEGORIES = [
    "Murder",
    "Attempted murder",
    "Rape / sexual offence",
    "Domestic violence",
    "Assault GBH",
    "Common assault",
    "Common robbery",
    "Robbery with aggravating circumstances",
    "Residential burglary",
    "Business burglary",
    "Vehicle hijacking",
    "Truck hijacking",
    "Cash-in-transit robbery",
    "Bank robbery",
    "Theft of motor vehicle",
    "Theft out of/from motor vehicle",
    "Stock theft",
    "Arson",
    "Malicious damage to property",
    "Drug-related crime",
    "Illegal firearms / ammunition",
    "Driving under the influence (DUI)",
    "Commercial crime",
    "Shoplifting",
    "Other serious crime",
  ] as const;
  const [form, setForm] = useState<{
    status: CrimeReport["status"];
    type: CrimeReport["type"];
    category?: string;
    description: string;
    province?: (typeof PROVINCES)[number] | "";
    occurredAt?: string;
    location?: { lat: number; lng: number } | null;
  }>({
    status: "ongoing",
    type: "Crime",
    description: "",
    province: "",
    occurredAt: "",
    location: null,
  });

  return (
    <div
      style={{
        minHeight: "calc(100dvh - 60px)",
        background: "transparent",
        padding: "24px 16px 48px",
      }}
    >
      <div style={{ maxWidth: 1100, width: "100%", margin: "0 auto" }}>
        <div className="home-hero">
          {/* Left: editorial hero + search */}
          <div>
            <span className="eyebrow" style={{ marginBottom: 14 }}>
              Safe space finder · No sign-in needed
            </span>
            <h1 className="hero-title" style={{ color: "var(--text)" }}>
              Where would you feel most{" "}
              <span style={{ color: "var(--brand)" }}>protected</span> right
              now?
            </h1>
            <p
              style={{
                color: "var(--muted)",
                fontSize: 16,
                lineHeight: 1.6,
                margin: "0 0 22px",
                maxWidth: 460,
              }}
            >
              Find verified safe places nearby — a short walk away — based on
              the kind of support you need.
            </p>
          {/* Search */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const { level, need } = matchNeed(searchText);
              navigate(`/map?level=${level}&need=${need}`);
            }}
            style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}
          >
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="What do you need? e.g. rest, medical, security desk"
              aria-label="What do you need right now?"
              style={{
                flex: "1 1 240px",
                padding: "14px 18px",
                borderRadius: 12,
                border: "1px solid var(--glass-border)",
                background: "var(--surface)",
                color: "var(--text)",
                fontSize: 15,
                outline: "none",
              }}
            />
            <button
              type="submit"
              style={{
                padding: "14px 24px",
                borderRadius: 12,
                border: "none",
                background: "var(--brand)",
                color: "var(--on-brand)",
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              Find
            </button>
          </form>

          {/* Quick picks */}
          <div style={{ marginBottom: 18 }}>
            <p
              style={{
                margin: "0 0 12px 0",
                color: "var(--text-2)",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              Or pick one:
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <Link className="chip" to="/map?level=l1&need=basic_comfort">
                <ChipIcon d="M4 12h16v6H4zm2-5h12v4H6z" /> Somewhere to rest
              </Link>
              <Link className="chip" to="/map?level=l1&need=minor_medical">
                <ChipIcon d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" /> Medical help
              </Link>
              <Link className="chip" to="/map?level=l2&need=police_security">
                <ChipIcon d="M12 2L4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3z" /> Police
              </Link>
              <Link
                className="chip"
                to="/map?level=l1&need=basic_comfort&openNow=1"
              >
                <ChipIcon d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 10.6V7h-2v6h6v-2h-4z" /> Open right now
              </Link>
            </div>
          </div>
          </div>

          {/* Right: live status panel */}
          <aside
            className="glass"
            style={{
              borderRadius: 24,
              padding: "24px 22px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <span className="eyebrow">Live status</span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontWeight: 700,
                fontSize: 16,
                color: "var(--text)",
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: loc ? "var(--success)" : "var(--muted)",
                  flexShrink: 0,
                }}
              />
              {loc
                ? count != null
                  ? `${count} safe space${count === 1 ? "" : "s"} within reach`
                  : "Location locked in"
                : locLoading
                ? "Finding you…"
                : "Location unavailable"}
            </div>
            <div
              style={{
                borderTop: "1px solid var(--border)",
                paddingTop: 14,
                display: "grid",
                gap: 10,
                fontSize: 13.5,
                color: "var(--muted)",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ChipIcon d="M12 1a5 5 0 00-5 5v3H6a2 2 0 00-2 2v9a2 2 0 002 2h12a2 2 0 002-2v-9a2 2 0 00-2-2h-1V6a5 5 0 00-5-5zm-3 8V6a3 3 0 016 0v3H9z" />
                Anonymous — no account or number needed
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ChipIcon d="M12 2a6 6 0 016 6c0 4.5-6 12-6 12S6 12.5 6 8a6 6 0 016-6zm0 8a2 2 0 100-4 2 2 0 000 4z" />
                Your location never leaves this device
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ChipIcon d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 006 6.9V21h2v-3.1A7 7 0 0019 11h-2z" />
                Recording Shield ready if things escalate
              </span>
            </div>
          </aside>
        </div>

        {/* Action bento */}
        <section className="bento" aria-label="Ways we can help">
          <Link to="/level1" className="tile span2">
            <span className="eyebrow">Everyday support</span>
            <div>
              <h2
                style={{
                  margin: "0 0 6px",
                  fontSize: 24,
                  color: "var(--text)",
                }}
              >
                A safe place nearby
              </h2>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>
                Rest, charge, get home — calm public places with staff.
              </p>
            </div>
            <span className="tile-arrow">→</span>
          </Link>
          <Link
            to="/level2"
            className="tile span2"
            style={{ borderColor: "color-mix(in srgb, var(--brand-pink) 55%, transparent)" }}
          >
            <span className="eyebrow" style={{ color: "var(--brand-pink)" }}>
              Emergency
            </span>
            <div>
              <h2
                style={{
                  margin: "0 0 6px",
                  fontSize: 24,
                  color: "var(--text)",
                }}
              >
                Urgent help now
              </h2>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>
                Police, hospitals, fire & rescue — official services, fast.
              </p>
            </div>
            <span className="tile-arrow">→</span>
          </Link>
          <Link to="/safety" className="tile">
            <span className="eyebrow">Tool</span>
            <h3 style={{ margin: 0, fontSize: 16, color: "var(--text)" }}>
              Recording Shield
            </h3>
            <span className="tile-arrow">→</span>
          </Link>
          <button
            type="button"
            className="tile"
            onClick={() => {
              setErrors({});
              setMsg(null);
              setShowReport(true);
            }}
          >
            <span className="eyebrow">Tool</span>
            <h3 style={{ margin: 0, fontSize: 16, color: "var(--text)" }}>
              Report an incident
            </h3>
            <span className="tile-arrow">→</span>
          </button>
          <Link to="/profile" className="tile">
            <span className="eyebrow">Yours</span>
            <h3 style={{ margin: 0, fontSize: 16, color: "var(--text)" }}>
              Saved places
            </h3>
            <span className="tile-arrow">→</span>
          </Link>
          <Link to="/map?level=l1&need=basic_comfort&openNow=1" className="tile">
            <span className="eyebrow">Fast</span>
            <h3 style={{ margin: 0, fontSize: 16, color: "var(--text)" }}>
              Open now near me
            </h3>
            <span className="tile-arrow">→</span>
          </Link>
        </section>

        {/* Nearest sanctuaries */}
        {loc ? (
          <section style={{ marginTop: 32 }}>
            <div style={{ marginBottom: 16 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--brand)",
                }}
              >
                Nearest to you
              </span>
              <h2
                style={{
                  margin: "4px 0 0",
                  fontSize: 22,
                  fontWeight: 800,
                  color: "var(--text)",
                }}
              >
                Verified safe spaces
              </h2>
            </div>
            <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
              <NearestSanctuaries center={loc} onCount={setCount} />
            </APIProvider>
          </section>
        ) : (
          <p
            style={{
              marginTop: 24,
              textAlign: "center",
              color: "var(--muted)",
              fontSize: 14,
            }}
          >
            Enable location to see the safe spaces nearest to you.
          </p>
        )}
      </div>

      {/* Floating SOS Button */}
      <button
        aria-label="SOS — start emergency recording and alert contacts"
        title="SOS"
        type="button"
        style={{
          position: "fixed",
          right: "calc(16px + env(safe-area-inset-right))",
          bottom: "calc(16px + env(safe-area-inset-bottom))",
          padding: "16px 26px",
          borderRadius: 12,
          background: BRAND.pink,
          color: "var(--on-brand)",
          border: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          fontWeight: 800,
          fontSize: 17,
          letterSpacing: "0.04em",
          boxShadow: `0 4px 16px ${BRAND.pink}50`,
          cursor: "pointer",
          zIndex: 30,
          outline: "none",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = `0 6px 20px ${BRAND.pink}60`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = `0 4px 16px ${BRAND.pink}50`;
        }}
        onFocus={(e) => {
          e.currentTarget.style.boxShadow = `0 0 0 3px ${BRAND.purpleLight}, 0 4px 16px ${BRAND.pink}50`;
        }}
        onBlur={(e) => {
          e.currentTarget.style.boxShadow = `0 4px 16px ${BRAND.pink}50`;
        }}
        onClick={() => navigate("/safety?start=1")}
      >
        {/* Siren icon */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M6 14V10C6 6.686 8.686 4 12 4C15.314 4 18 6.686 18 10V14H6Z"
            fill="white"
            opacity="0.9"
          />
          <rect
            x="4"
            y="14"
            width="16"
            height="6"
            rx="2"
            fill="white"
            opacity="0.9"
          />
          <path
            d="M12 2V4"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M4.93 4.93L6.34 6.34"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M19.07 4.93L17.66 6.34"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        SOS
      </button>

      {/* Report Incident Modal */}
      {showReport && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(17,24,39,0.45)",
            display: "grid",
            placeItems: "center",
            zIndex: 50,
            padding: 16,
          }}
          onClick={() => setShowReport(false)}
        >
          <div
            style={{
              width: "min(680px, 100%)",
              background: "var(--surface)",
              borderRadius: 16,
              boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
              border: "1px solid var(--border-strong)",
              maxHeight: "90dvh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                borderBottom: "1px solid var(--surface-3)",
              }}
            >
              <strong style={{ color: "var(--text)" }}>Report Incident</strong>
              <button
                onClick={() => setShowReport(false)}
                aria-label="Close"
                title="Close"
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: BRAND.purple,
                  fontSize: 20,
                }}
              >
                ×
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setSaving(true);
                setMsg(null);
                const errs: Record<string, string> = {};
                if (!form.category) errs.category = "Select a category";
                if (!form.province) errs.province = "Select a province";
                if (form.status === "past" && !form.occurredAt)
                  errs.occurredAt =
                    "Date & time is required for past incidents";
                setErrors(errs);
                if (Object.keys(errs).length > 0) {
                  setSaving(false);
                  return;
                }
                try {
                  const payload: Omit<CrimeReport, "id" | "createdAt"> = {
                    status: form.status,
                    type: form.type,
                    category: form.category || undefined,
                    description: form.description || undefined,
                    province: (form.province as any) || undefined,
                    occurredAt: form.occurredAt
                      ? new Date(form.occurredAt)
                      : form.status === "ongoing"
                      ? new Date()
                      : undefined,
                    location: form.location || undefined,
                    uid: user?.uid || null,
                  };
                  await createCrimeReport(payload);
                  setMsg("Thanks! Your report was submitted.");
                  setForm({
                    status: "ongoing",
                    type: "Crime",
                    description: "",
                    province: "",
                    occurredAt: "",
                    location: null,
                  });
                } catch (e: any) {
                  setMsg(e?.message || "Failed to submit report");
                } finally {
                  setSaving(false);
                }
              }}
              style={{
                padding: 16,
                display: "grid",
                gap: 12,
                overflowY: "auto",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gap: 10,
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                }}
              >
                <label style={{ display: "grid", gap: 6 }}>
                  <span
                    style={{ color: "var(--text-2)", fontSize: 13, fontWeight: 600 }}
                  >
                    Status
                  </span>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, status: e.target.value as any }))
                    }
                    style={{
                      border: "1px solid var(--border-strong)",
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <option value="ongoing">Ongoing</option>
                    <option value="past">Past</option>
                  </select>
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span
                    style={{ color: "var(--text-2)", fontSize: 13, fontWeight: 600 }}
                  >
                    Type
                  </span>
                  <select
                    value={form.type}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, type: e.target.value as any }))
                    }
                    style={{
                      border: "1px solid var(--border-strong)",
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    {(
                      [
                        "Crime",
                        "GBV",
                        "Accident",
                        "Breakdown",
                        "Medical",
                        "Other",
                      ] as const
                    ).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {form.type === "Crime" && (
                <label style={{ display: "grid", gap: 6 }}>
                  <span
                    style={{ color: "var(--text-2)", fontSize: 13, fontWeight: 600 }}
                  >
                    Crime category (SAPS)
                  </span>
                  <select
                    value={form.category || ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, category: e.target.value }))
                    }
                    aria-invalid={!!errors.category}
                    style={{
                      border: "1px solid var(--border-strong)",
                      borderRadius: 12,
                      padding: 12,
                      ...(errors.category ? { borderColor: "var(--danger)" } : {}),
                    }}
                  >
                    <option value="">Select category</option>
                    {SAPS_CRIME_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div
                style={{
                  display: "grid",
                  gap: 10,
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                }}
              >
                <label style={{ display: "grid", gap: 6 }}>
                  <span
                    style={{ color: "var(--text-2)", fontSize: 13, fontWeight: 600 }}
                  >
                    Province
                  </span>
                  <select
                    value={form.province || ""}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setForm((f) => ({ ...f, province: val }));
                      if (val && val !== "Gauteng") {
                        setInfo(
                          "Currently available in Gauteng only. Join the waitlist and we'll notify you."
                        );
                      } else {
                        setInfo(null);
                      }
                    }}
                    aria-invalid={!!errors.province}
                    style={{
                      border: "1px solid var(--border-strong)",
                      borderRadius: 12,
                      padding: 12,
                      ...(errors.province ? { borderColor: "var(--danger)" } : {}),
                    }}
                  >
                    <option value="">Select province</option>
                    {PROVINCES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span
                    style={{ color: "var(--text-2)", fontSize: 13, fontWeight: 600 }}
                  >
                    Date & time
                  </span>
                  <input
                    type="datetime-local"
                    value={form.occurredAt || ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, occurredAt: e.target.value }))
                    }
                    aria-invalid={!!errors.occurredAt}
                    style={{
                      border: "1px solid var(--border-strong)",
                      borderRadius: 12,
                      padding: 12,
                      ...(errors.occurredAt ? { borderColor: "var(--danger)" } : {}),
                    }}
                  />
                </label>
              </div>

              {form.province && form.province !== "Gauteng" && (
                <div
                  style={{
                    background: "var(--warn-tint)",
                    color: "var(--warn-text)",
                    padding: "10px 12px",
                    borderRadius: 10,
                    fontSize: 13,
                  }}
                >
                  Currently available in Gauteng only. Select Gauteng to submit
                  or join the waitlist below.
                  <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await addToWaitlist({
                            province: form.province as string,
                            uid: user?.uid || null,
                          });
                          setInfo(
                            "You're on the waitlist. We'll notify you when we launch in your province."
                          );
                        } catch (e: any) {
                          setMsg(e?.message || "Failed to add to waitlist");
                        }
                      }}
                      style={{
                        border: `2px solid ${BRAND.purple}`,
                        color: BRAND.purple,
                        background: "transparent",
                        borderRadius: 10,
                        padding: "8px 10px",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      Join Waitlist
                    </button>
                    {info && <span style={{ color: "var(--text-2)" }}>{info}</span>}
                  </div>
                </div>
              )}

              <label style={{ display: "grid", gap: 6 }}>
                <span
                  style={{ color: "var(--text-2)", fontSize: 13, fontWeight: 600 }}
                >
                  Details (optional)
                </span>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Short description"
                  style={{
                    border: "1px solid var(--border-strong)",
                    borderRadius: 12,
                    padding: 12,
                    resize: "vertical",
                  }}
                />
              </label>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (!navigator.geolocation) return;
                    navigator.geolocation.getCurrentPosition((pos) => {
                      setForm((f) => ({
                        ...f,
                        location: {
                          lat: pos.coords.latitude,
                          lng: pos.coords.longitude,
                        },
                      }));
                    });
                  }}
                  style={{
                    border: `2px solid ${BRAND.blue}`,
                    background: "transparent",
                    color: BRAND.blue,
                    borderRadius: 12,
                    padding: "10px 12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Use my location
                </button>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setShowReport(false)}
                    style={{
                      border: `2px solid ${BRAND.pink}`,
                      background: "transparent",
                      color: BRAND.pink,
                      borderRadius: 12,
                      padding: "10px 12px",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={
                      saving || (!!form.province && form.province !== "Gauteng")
                    }
                    style={{
                      border: "none",
                      background: BRAND.purple,
                      color: "var(--on-brand)",
                      borderRadius: 12,
                      padding: "10px 12px",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    {saving ? "Submitting…" : "Submit"}
                  </button>
                </div>
              </div>

              {msg && (
                <div style={{ color: "var(--text-2)", fontSize: 13 }}>{msg}</div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
