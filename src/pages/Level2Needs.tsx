import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { NeedKey } from "../lib/needs";

const BRAND = {
  purple: "var(--brand)",
  blue: "var(--brand-blue)",
  pink: "var(--brand-pink)",
  purpleLight: "var(--brand-tint)",
  blueLight: "var(--blue-tint)",
  pinkLight: "var(--pink-tint)",
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
          title: "Police & security",
          desc: "Crime, threats, harassment — get protection",
          color: BRAND.purple,
          bgColor: BRAND.purpleLight,
        },
        {
          key: "hospital_emergency" as NeedKey,
          title: "Emergency room",
          desc: "Serious injury or urgent medical care — go now",
          color: BRAND.pink,
          bgColor: BRAND.pinkLight,
        },
        {
          key: "urgent_care" as NeedKey,
          title: "Clinic or urgent care",
          desc: "Stitches, check‑ups — not life‑threatening",
          color: BRAND.blue,
          bgColor: BRAND.blueLight,
        },
        {
          key: "fire_rescue" as NeedKey,
          title: "Fire & rescue",
          desc: "Fire, accident, or someone trapped",
          color: BRAND.purple,
          bgColor: BRAND.purpleLight,
        },
        {
          key: "roadside_assist" as NeedKey,
          title: "Car trouble",
          desc: "Breakdown, tow truck, or a safe garage",
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
        background: "transparent",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <h1
          style={{
            color: "var(--text)",
            fontWeight: 700,
            fontSize: 30,
            margin: "0 0 8px",
          }}
        >
          What's happening?
        </h1>
        <p
          style={{
            color: "var(--muted)",
            margin: "0 0 16px",
            fontSize: 15,
            lineHeight: 1.6,
          }}
        >
          We'll route you to the right official service nearby.
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
              <div style={{ fontWeight: 700, color: "var(--text)", fontSize: 15 }}>
                Show places open now
              </div>
              <div style={{ color: "var(--muted)", fontSize: 13 }}>
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
                background: openNow ? BRAND.pink : "var(--border-strong)",
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
                  background: "var(--surface)",
                  transition: "left .2s ease",
                  boxShadow: "0 2px 4px rgba(0,0,0,.15)",
                }}
              />
            </span>
          </label>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {items.map((it, i) => {
            const active = selected === it.key;
            return (
              <button
                key={it.key}
                onClick={() => setSelected(it.key)}
                aria-pressed={active}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  width: "100%",
                  textAlign: "left",
                  padding: "16px 18px",
                  borderRadius: 18,
                  border: `1.5px solid ${
                    active ? it.color : "var(--glass-border)"
                  }`,
                  background: active ? it.bgColor : "var(--glass-bg)",
                  backdropFilter: "blur(14px)",
                  WebkitBackdropFilter: "blur(14px)",
                  cursor: "pointer",
                  transition: "all .18s ease",
                }}
                onMouseEnter={(e) => {
                  if (!active)
                    e.currentTarget.style.borderColor = "var(--border-strong)";
                }}
                onMouseLeave={(e) => {
                  if (!active)
                    e.currentTarget.style.borderColor = "var(--glass-border)";
                }}
              >
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 13,
                    background: it.color,
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <NeedIcon name={it.key} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      color: "var(--text)",
                      fontSize: 16,
                      marginBottom: 2,
                    }}
                  >
                    {it.title}
                  </div>
                  <div
                    style={{
                      color: "var(--muted)",
                      fontSize: 13.5,
                      lineHeight: 1.4,
                    }}
                  >
                    {it.desc}
                  </div>
                </div>
                <span
                  aria-hidden
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    flexShrink: 0,
                    display: "grid",
                    placeItems: "center",
                    border: `2px solid ${
                      active ? it.color : "var(--border-strong)"
                    }`,
                    background: active ? it.color : "transparent",
                    color: "var(--on-brand)",
                    fontSize: 14,
                    transition: "all .18s ease",
                  }}
                >
                  {active ? "✓" : ""}
                </span>
              </button>
            );
          })}
        </div>

        <div
          style={{
            position: "sticky",
            bottom: 12,
            marginTop: 20,
            zIndex: 5,
          }}
        >
        <button
          disabled={!selected}
          onClick={go}
          style={{
            width: "100%",
            padding: "16px 20px",
            borderRadius: 16,
            border: "none",
            cursor: selected ? "pointer" : "not-allowed",
            background: selected ? BRAND.pink : "var(--border-strong)",
            color: "var(--on-brand)",
            fontWeight: 700,
            fontSize: 17,
            boxShadow: selected ? "var(--shadow-md)" : "none",
            transition: "all .2s ease",
          }}
        >
          Show emergency services near me
        </button>
        </div>
      </div>
    </div>
  );
}
