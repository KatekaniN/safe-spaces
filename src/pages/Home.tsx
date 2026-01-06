import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logoUrl from "../assets/safe-spaces.png";
import { useAuth } from "../contexts/AuthContext";
import {
  createCrimeReport,
  type CrimeReport,
  addToWaitlist,
} from "../lib/data";

const BRAND = {
  purple: "#8764C1",
  blue: "#87A5DC",
  pink: "#EC96BE",
  purpleLight: "#F3EFFC",
  blueLight: "#EFF5FC",
  pinkLight: "#FDF3F8",
};

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
        background: "#FAFAFA",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
      }}
    >
      <div style={{ maxWidth: 520, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img
            src={logoUrl}
            alt="Safe Spaces"
            width={180}
            height={180}
            style={{
              display: "inline-block",
              marginBottom: 16,
              filter: "drop-shadow(0 2px 8px rgba(135,100,193,0.15))",
            }}
          />
          <h1
            style={{
              color: BRAND.purple,
              margin: "0 0 12px 0",
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            You're Safe Here
          </h1>
          <p
            style={{
              color: "#6B7280",
              fontSize: 16,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Find nearby places that can help you based on the kind of support
            you need right now.
          </p>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: "28px 24px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            border: "2px solid #E5E7EB",
          }}
        >
          <div style={{ display: "grid", gap: 16, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: BRAND.purple,
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
                </svg>
              </div>
              <div style={{ textAlign: "left" }}>
                <strong
                  style={{
                    color: "#1F2937",
                    display: "block",
                    fontSize: 15,
                    fontWeight: 700,
                  }}
                >
                  Confidential & Safe
                </strong>
                <span style={{ color: "#6B7280", fontSize: 13 }}>
                  Your privacy matters
                </span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: BRAND.blue,
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
              </div>
              <div style={{ textAlign: "left" }}>
                <strong
                  style={{
                    color: "#1F2937",
                    display: "block",
                    fontSize: 15,
                    fontWeight: 700,
                  }}
                >
                  Always Nearby
                </strong>
                <span style={{ color: "#6B7280", fontSize: 13 }}>
                  Find support close to you
                </span>
              </div>
            </div>
          </div>

          <Link to="/levels" style={{ textDecoration: "none" }}>
            <button
              style={{
                width: "100%",
                padding: "16px 20px",
                borderRadius: 16,
                background: BRAND.purple,
                color: "#fff",
                border: "none",
                fontWeight: 700,
                fontSize: 17,
                boxShadow: `0 4px 16px ${BRAND.purple}40`,
                cursor: "pointer",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = `0 6px 20px ${BRAND.purple}50`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = `0 4px 16px ${BRAND.purple}40`;
              }}
            >
              Find Safe Space Now
            </button>
          </Link>

          {/* Report Incident secondary CTA */}
          <button
            onClick={() => {
              setErrors({});
              setMsg(null);
              setShowReport(true);
            }}
            style={{
              marginTop: 12,
              width: "100%",
              padding: "14px 20px",
              borderRadius: 16,
              background: "transparent",
              color: BRAND.purple,
              border: `2px solid ${BRAND.purple}`,
              fontWeight: 800,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Report an Incident
          </button>
        </div>
      </div>

      {/* Floating Panic Button */}
      <button
        aria-label="Panic"
        title="Panic"
        type="button"
        style={{
          position: "fixed",
          right: "calc(16px + env(safe-area-inset-right))",
          bottom: "calc(16px + env(safe-area-inset-bottom))",
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: BRAND.pink,
          color: "#fff",
          border: "none",
          display: "grid",
          placeItems: "center",
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
          width="28"
          height="28"
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
              background: "#fff",
              borderRadius: 16,
              boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
              border: "2px solid #E5E7EB",
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
                borderBottom: "1px solid #F3F4F6",
              }}
            >
              <strong style={{ color: "#1F2937" }}>Report Incident</strong>
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
                    style={{ color: "#374151", fontSize: 13, fontWeight: 600 }}
                  >
                    Status
                  </span>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, status: e.target.value as any }))
                    }
                    style={{
                      border: "1.5px solid #E5E7EB",
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
                    style={{ color: "#374151", fontSize: 13, fontWeight: 600 }}
                  >
                    Type
                  </span>
                  <select
                    value={form.type}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, type: e.target.value as any }))
                    }
                    style={{
                      border: "1.5px solid #E5E7EB",
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
                    style={{ color: "#374151", fontSize: 13, fontWeight: 600 }}
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
                      border: "1.5px solid #E5E7EB",
                      borderRadius: 12,
                      padding: 12,
                      ...(errors.category ? { borderColor: "#EF4444" } : {}),
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
                    style={{ color: "#374151", fontSize: 13, fontWeight: 600 }}
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
                      border: "1.5px solid #E5E7EB",
                      borderRadius: 12,
                      padding: 12,
                      ...(errors.province ? { borderColor: "#EF4444" } : {}),
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
                    style={{ color: "#374151", fontSize: 13, fontWeight: 600 }}
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
                      border: "1.5px solid #E5E7EB",
                      borderRadius: 12,
                      padding: 12,
                      ...(errors.occurredAt ? { borderColor: "#EF4444" } : {}),
                    }}
                  />
                </label>
              </div>

              {form.province && form.province !== "Gauteng" && (
                <div
                  style={{
                    background: "#FEF3C7",
                    color: "#92400E",
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
                    {info && <span style={{ color: "#374151" }}>{info}</span>}
                  </div>
                </div>
              )}

              <label style={{ display: "grid", gap: 6 }}>
                <span
                  style={{ color: "#374151", fontSize: 13, fontWeight: 600 }}
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
                    border: "1.5px solid #E5E7EB",
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
                      color: "#fff",
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
                <div style={{ color: "#374151", fontSize: 13 }}>{msg}</div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
