import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export type NeedKey =
  | "call_charge_wifi"
  | "escort_transport"
  | "basic_comfort"
  | "minor_medical"
  | "talk_report";

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
          title: "Charge or get online",
          desc: "Make a call, charge your phone, find Wi‑Fi",
          color: BRAND.blue,
          bgColor: BRAND.blueLight,
        },
        {
          key: "escort_transport",
          title: "Get home safely",
          desc: "Staff to walk with you or help find transport",
          color: BRAND.purple,
          bgColor: BRAND.purpleLight,
        },
        {
          key: "basic_comfort",
          title: "Rest & recover",
          desc: "Sit down, restroom, water or tea",
          color: BRAND.pink,
          bgColor: BRAND.pinkLight,
        },
        {
          key: "minor_medical",
          title: "Pharmacy & first aid",
          desc: "Medicine, plasters, quick medical help",
          color: BRAND.blue,
          bgColor: BRAND.blueLight,
        },
        {
          key: "talk_report",
          title: "Talk to someone",
          desc: "A front desk or security person who will listen",
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
        background: "transparent",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        {/* Top bar with Open Now toggle */}

        <h1
          style={{
            color: "var(--text)",
            fontWeight: 700,
            fontSize: 30,
            margin: "0 0 8px",
          }}
        >
          What would help most?
        </h1>
        <p
          style={{
            color: "var(--muted)",
            margin: "0 0 16px",
            fontSize: 15,
            lineHeight: 1.6,
          }}
        >
          We'll show welcoming public places nearby that can offer it.
        </p>
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
                onClick={() => setSelected(it.key as NeedKey)}
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
            background: selected ? BRAND.purple : "var(--border-strong)",
            color: "var(--on-brand)",
            fontWeight: 700,
            fontSize: 17,
            boxShadow: selected ? "var(--shadow-md)" : "none",
            transition: "all .2s ease",
          }}
        >
          Show safe places
        </button>
        </div>
      </div>
    </div>
  );
}
