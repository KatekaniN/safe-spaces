import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export type NeedKey =
  | "call_charge_wifi"
  | "escort_transport"
  | "basic_comfort"
  | "minor_medical"
  | "talk_report";

const BRAND = {
  purple: "#8764C1",
  blue: "#87A5DC",
  pink: "#EC96BE",
  purpleLight: "#F3EFFC",
  blueLight: "#EFF5FC",
  pinkLight: "#FDF3F8",
};

const NeedIcon = ({ name }: { name: NeedKey }) => {
  const common = { width: 26, height: 26, fill: "white" } as const;
  switch (name) {
    case "call_charge_wifi":
      return (
        <svg viewBox="0 0 24 24" {...common} aria-hidden>
          <path d="M12 6c-3.87 0-7 1.79-9 4.5l2 1.5C6.14 9.57 8.88 8 12 8s5.86 1.57 7 4l2-1.5C19 7.79 15.87 6 12 6z" />
          <path d="M12 10c-2.49 0-4.67 1.16-6 3l2 1.5c.92-1.26 2.36-2 4-2s3.08.74 4 2L18 13c-1.33-1.84-3.51-3-6-3z" />
          <circle cx="12" cy="16" r="2" />
        </svg>
      );
    case "escort_transport":
      return (
        <svg viewBox="0 0 24 24" {...common} aria-hidden>
          <path d="M13 5a2 2 0 11-4 0 2 2 0 014 0z" />
          <path d="M9 22v-5.5l-1.5-.9a2 2 0 01-.7-2.7l1.1-1.9a2 2 0 012.7-.7L12 11l2.5 1.5A2 2 0 0016 10l1-2 2 1-1 2a4 4 0 01-5.5 1.8L11 12.5l-.9 1.6L12 16v6H9z" />
          <path d="M17 7h-3l2-2h3l-2 2z" />
        </svg>
      );
    case "basic_comfort":
      return (
        <svg viewBox="0 0 24 24" {...common} aria-hidden>
          <path d="M4 10h12v4a6 6 0 01-12 0v-4z" />
          <path d="M16 10h3a2 2 0 010 4h-3" />
          <path
            d="M7 6v2M10 5v3M13 6v2"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "minor_medical":
      return (
        <svg viewBox="0 0 24 24" {...common} aria-hidden>
          <rect x="3" y="6" width="18" height="12" rx="3" opacity=".95" />
          <path d="M11 9h2v2h2v2h-2v2h-2v-2H9v-2h2V9z" fill="#fff" />
          <rect x="8" y="3" width="8" height="3" rx="1.5" />
        </svg>
      );
    case "talk_report":
      return (
        <svg viewBox="0 0 24 24" {...common} aria-hidden>
          <path
            d="M12 2l7 3v5c0 5-3.3 9.7-7 11-3.7-1.3-7-6-7-11V5l7-3z"
            opacity=".95"
          />
          <path d="M8 10h8v2H8zM8 13h5v2H8z" fill="#fff" />
        </svg>
      );
  }
};

export default function Level1Needs() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<NeedKey | null>(null);
  const [openNow, setOpenNow] = useState(true);

  const items = useMemo(
    () =>
      [
        {
          key: "call_charge_wifi",
          title: "Call / Charge / Get Online",
          desc: "Phone, charger, or Wi‑Fi access",
          color: BRAND.blue,
          bgColor: BRAND.blueLight,
        },
        {
          key: "escort_transport",
          title: "Walk / Escort to Transport",
          desc: "Walk with you or help with directions",
          color: BRAND.purple,
          bgColor: BRAND.purpleLight,
        },
        {
          key: "basic_comfort",
          title: "Basic Comfort",
          desc: "Water/tea, restroom, warmth",
          color: BRAND.pink,
          bgColor: BRAND.pinkLight,
        },
        {
          key: "minor_medical",
          title: "Minor Medical Help",
          desc: "First aid or quick assistance",
          color: BRAND.blue,
          bgColor: BRAND.blueLight,
        },
        {
          key: "talk_report",
          title: "Talk / Report (Non‑urgent)",
          desc: "Front desk or security assistance",
          color: BRAND.purple,
          bgColor: BRAND.purpleLight,
        },
      ] as const,
    []
  );

  const go = () => {
    if (!selected) return;
    const params = new URLSearchParams();
    params.set("level", "l1");
    params.set("need", selected);
    params.set("openNow", openNow ? "1" : "0");
    navigate(`/map?${params.toString()}`);
  };

  return (
    <div
      style={{
        minHeight: "calc(100dvh - 60px)",
        padding: "20px 16px calc(24px + env(safe-area-inset-bottom))",
        background: "#FAFAFA",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        {/* Top bar with Open Now toggle */}

        <h1
          style={{
            color: BRAND.purple,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            fontSize: 28,
            margin: "0 0 8px",
          }}
        >
          What do you need right now?
        </h1>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "12px 16px",
            margin: "0 0 20px 0",
            borderRadius: 16,
            background: BRAND.pinkLight,
            border: `2px solid ${BRAND.pink}`,
            boxShadow: "0 2px 8px rgba(236,150,190,0.12)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: BRAND.pink,
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="white"
                aria-hidden
              >
                <path d="M12 2a9 9 0 100 18 9 9 0 000-18zm1 9V6h-2v7h6v-2h-4z" />
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, color: "#1F2937", fontSize: 15 }}>
                Show places open now
              </div>
              <div style={{ color: "#6B7280", fontSize: 13 }}>
                Faster, safer options first
              </div>
            </div>
          </div>

          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={openNow}
              onChange={(e) => setOpenNow(e.target.checked)}
              style={{ display: "none" }}
            />
            <span
              style={{
                width: 52,
                height: 32,
                borderRadius: 999,
                background: openNow ? BRAND.pink : "#D1D5DB",
                position: "relative",
                transition: "background .2s ease",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 4,
                  left: openNow ? 26 : 4,
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: "#fff",
                  transition: "left .2s ease",
                  boxShadow: "0 2px 4px rgba(0,0,0,.15)",
                }}
              />
            </span>
          </label>
        </div>
        <p
          style={{
            color: "#6B7280",
            margin: "0 0 24px",
            fontSize: 15,
            lineHeight: 1.6,
          }}
        >
          Pick the kind of support you want. We'll show nearby safe places that
          match.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 12,
          }}
        >
          {items.map((it) => {
            const active = selected === it.key;
            return (
              <button
                key={it.key}
                onClick={() => setSelected(it.key as NeedKey)}
                style={{
                  textAlign: "left",
                  borderRadius: 20,
                  border: `2px solid ${active ? it.color : "#E5E7EB"}`,
                  background: active ? it.bgColor : "#fff",
                  padding: "18px",
                  boxShadow: active
                    ? `0 4px 16px ${it.color}20`
                    : "0 2px 8px rgba(0,0,0,0.04)",
                  cursor: "pointer",
                  transition: "all .2s ease",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 12px rgba(0,0,0,0.08)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 2px 8px rgba(0,0,0,0.04)";
                  }
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 14,
                      background: it.color,
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <NeedIcon name={it.key} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        color: "#1F2937",
                        fontSize: 16,
                        marginBottom: 4,
                      }}
                    >
                      {it.title}
                    </div>
                    <div
                      style={{
                        color: "#6B7280",
                        fontSize: 14,
                        lineHeight: 1.4,
                      }}
                    >
                      {it.desc}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <button
          disabled={!selected}
          onClick={go}
          style={{
            marginTop: 24,
            width: "100%",
            padding: "16px 20px",
            borderRadius: 16,
            border: "none",
            cursor: selected ? "pointer" : "not-allowed",
            background: selected ? BRAND.purple : "#D1D5DB",
            color: "#fff",
            fontWeight: 700,
            fontSize: 17,
            boxShadow: selected ? `0 4px 16px ${BRAND.purple}40` : "none",
            transition: "all .2s ease",
          }}
          onMouseEnter={(e) => {
            if (selected) {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = `0 6px 20px ${BRAND.purple}50`;
            }
          }}
          onMouseLeave={(e) => {
            if (selected) {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = `0 4px 16px ${BRAND.purple}40`;
            }
          }}
        >
          Show safe places
        </button>
      </div>
    </div>
  );
}
