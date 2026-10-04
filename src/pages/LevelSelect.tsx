import { useNavigate } from "react-router-dom";

const paths = [
  {
    key: "l1",
    to: "/level1",
    eyebrow: "Everyday support",
    accent: "var(--brand)",
    title: "A safe place nearby",
    desc: "A calm, public spot with staff who can help — rest, charge your phone, or get home safely.",
    examples: "Libraries · Pharmacies · Cafes · Malls · Parks",
  },
  {
    key: "l2",
    to: "/level2",
    eyebrow: "Emergency",
    accent: "var(--brand-pink)",
    title: "Urgent help now",
    desc: "Something serious is happening or might happen — get to official emergency services fast.",
    examples: "Police · Hospitals · Fire & rescue · Urgent clinics",
  },
] as const;

export default function LevelSelect() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "calc(100dvh - 60px)",
        background: "transparent",
        padding: "24px 16px 48px",
      }}
    >
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <header style={{ margin: "8px 0 28px" }}>
          <span className="eyebrow">We're with you</span>
          <h1
            className="hero-title"
            style={{ color: "var(--text)", margin: "6px 0 10px" }}
          >
            How can we help
            <br />
            right now?
          </h1>
          <p style={{ color: "var(--muted)", margin: 0, fontSize: 16 }}>
            Pick the one that matches your situation. You can switch any time.
          </p>
        </header>

        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          }}
        >
          {paths.map((p) => (
            <section
              key={p.key}
              role="button"
              tabIndex={0}
              aria-label={p.title}
              onClick={() => navigate(p.to)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") navigate(p.to);
              }}
              className="glass"
              style={{
                position: "relative",
                overflow: "hidden",
                borderRadius: 28,
                padding: "28px 24px 24px",
                minHeight: 300,
                display: "flex",
                flexDirection: "column",
                cursor: "pointer",
                transition:
                  "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.borderColor = p.accent;
                e.currentTarget.style.boxShadow = "var(--shadow-lg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = "var(--glass-border)";
                e.currentTarget.style.boxShadow = "var(--glass-shadow)";
              }}
            >
              {/* Accent arch motif */}
              <svg
                aria-hidden
                width="54"
                height="54"
                viewBox="0 0 32 32"
                fill="none"
                style={{ marginBottom: 14 }}
              >
                <path
                  d="M16 3C8.8 3 4 8.6 4 16v12a1 1 0 001 1h5a1 1 0 001-1v-9a5 5 0 0110 0v9a1 1 0 001 1h5a1 1 0 001-1V16c0-7.4-4.8-13-12-13z"
                  fill={p.accent}
                  opacity="0.9"
                />
                <circle cx="16" cy="15.5" r="2.4" fill="var(--surface)" />
              </svg>

              <span className="eyebrow" style={{ color: p.accent }}>
                {p.eyebrow}
              </span>
              <h2
                style={{
                  margin: "10px 0 10px",
                  fontSize: 30,
                  color: "var(--text)",
                  maxWidth: "80%",
                }}
              >
                {p.title}
              </h2>
              <p
                style={{
                  margin: 0,
                  color: "var(--muted)",
                  fontSize: 15,
                  lineHeight: 1.6,
                  maxWidth: "88%",
                }}
              >
                {p.desc}
              </p>

              <div
                style={{
                  marginTop: "auto",
                  paddingTop: 22,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: "var(--text-2)",
                    letterSpacing: "0.02em",
                  }}
                >
                  {p.examples}
                </span>
                <span
                  aria-hidden
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                    background: p.accent,
                    color: "var(--on-brand)",
                    fontSize: 18,
                  }}
                >
                  →
                </span>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
