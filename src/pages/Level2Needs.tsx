import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { NeedKey } from "../lib/needs";

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
    case "police_security":
      return (
        <svg viewBox="0 0 24 24" {...common} aria-hidden>
          <path
            d="M12 2l7 3v5c0 5-3.3 9.7-7 11-3.7-1.3-7-6-7-11V5l7-3z"
            opacity=".95"
          />
          <path d="M8 10h8v2H8zM8 13h5v2H8z" fill="#fff" />
        </svg>
      );
    case "hospital_emergency":
      return (
        <svg viewBox="0 0 24 24" {...common} aria-hidden>
          <rect x="3" y="6" width="18" height="12" rx="3" opacity=".95" />
          <path d="M11 9h2v2h2v2h-2v2h-2v-2H9v-2h2V9z" fill="#fff" />
        </svg>
      );
    case "urgent_care":
      return (
        <svg viewBox="0 0 24 24" {...common} aria-hidden>
          <path d="M4 10h12v4a6 6 0 01-12 0v-4z" />
          <path d="M16 10h3a2 2 0 010 4h-3" />
        </svg>
      );
    case "fire_rescue":
      return (
        <svg viewBox="0 0 24 24" {...common} aria-hidden>
          <path d="M12 2c2 2 4 4 4 7 0 3-2 5-4 5s-4-2-4-5c0-3 2-5 4-7z" />
          <path d="M6 14c0 3.314 2.686 6 6 6s6-2.686 6-6c-1.5 1.333-3 2-6 2s-4.5-.667-6-2z" />
        </svg>
      );
    case "roadside_assist":
      return (
        <svg viewBox="0 0 24 24" {...common} aria-hidden>
          <path d="M7 17a2 2 0 11-4 0 2 2 0 014 0zm14-1v-2l-3-4h-4l-1 2H7a3 3 0 00-3 3v1h1.18A3 3 0 019 17h6a3 3 0 012.82-2H21zM17 17a2 2 0 104 0 2 2 0 00-4 0z" />
        </svg>
      );
    default:
      return null;
  }
};

export default function Level2Needs() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<NeedKey | null>(null);
  const [openNow, setOpenNow] = useState(true);

  const items = useMemo(
    () =>
      [
        {
          key: "police_security" as NeedKey,
          title: "Police / Security",
          desc: "Crime in progress, threats, harassment",
          color: BRAND.purple,
          bgColor: BRAND.purpleLight,
        },
        {
          key: "hospital_emergency" as NeedKey,
          title: "Emergency Medical (ER)",
          desc: "Serious injury or urgent medical help",
          color: BRAND.pink,
          bgColor: BRAND.pinkLight,
        },
        {
          key: "urgent_care" as NeedKey,
          title: "Minor Injury / Clinic",
          desc: "Stitches, check-up, non‑life‑threatening",
          color: BRAND.blue,
          bgColor: BRAND.blueLight,
        },
        {
          key: "fire_rescue" as NeedKey,
          title: "Fire / Accident",
          desc: "Fire department or rescue services",
          color: BRAND.purple,
          bgColor: BRAND.purpleLight,
        },
        {
          key: "roadside_assist" as NeedKey,
          title: "Roadside Assistance / Tow",
          desc: "Tow truck or car help nearby",
          color: BRAND.blue,
          bgColor: BRAND.blueLight,
        },
      ] as const,
    []
  );

  const go = () => {
    if (!selected) return;
    const params = new URLSearchParams();
    params.set("level", "l2");
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
        <h1
          style={{
            color: "#1F2937",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            fontSize: 28,
            margin: "0 0 8px",
          }}
        >
          Is it an emergency?
        </h1>
        <p
          style={{
            color: "#6B7280",
            margin: "0 0 16px",
            fontSize: 15,
            lineHeight: 1.6,
          }}
        >
          Tell us what happened or might happen. We'll find the right official
          services.
        </p>

        {/* Open Now toggle */}
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
                Hospitals and police are 24/7 in most areas
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
                onClick={() => setSelected(it.key)}
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
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
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
          Show emergency Safe Spaces
        </button>
      </div>
    </div>
  );
}
