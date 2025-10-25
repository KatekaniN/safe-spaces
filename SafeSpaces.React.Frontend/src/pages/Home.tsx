import { Link } from "react-router-dom";
import logoUrl from "../assets/safe-spaces.png";

const BRAND = {
  purple: "#8764C1",
  blue: "#87A5DC",
  pink: "#EC96BE",
  purpleLight: "#F3EFFC",
  blueLight: "#EFF5FC",
  pinkLight: "#FDF3F8",
};

export default function Home() {
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
        </div>
      </div>

      {/* Floating Panic Button (no-op for now) */}
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
        // Intentionally no onClick yet — no-op by request
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
    </div>
  );
}
