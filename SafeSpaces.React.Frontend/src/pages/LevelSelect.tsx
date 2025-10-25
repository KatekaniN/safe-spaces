import { useNavigate } from "react-router-dom";

const BRAND = {
  purple: "#8764C1",
  blue: "#87A5DC",
  pink: "#EC96BE",
  purpleLight: "#F3EFFC",
  blueLight: "#EFF5FC",
  pinkLight: "#FDF3F8",
};

export default function LevelSelect() {
  const navigate = useNavigate();

  const handleChoose = (level: "l1" | "l2") => {
    if (level === "l1") {
      navigate("/level1");
    } else {
      navigate("/level2");
    }
  };

  return (
    <div
      style={{
        minHeight: "calc(100dvh - 60px)",
        background: "#FAFAFA",
        padding: "24px 16px",
      }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <header style={{ marginBottom: 28, textAlign: "center" }}>
          <h2
            style={{
              color: BRAND.purple,
              margin: "0 0 8px 0",
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            Choose support level
          </h2>
          <p
            style={{
              color: "#6B7280",
              margin: 0,
              fontSize: 15,
              lineHeight: 1.6,
            }}
          >
            Pick the type of safe space you need right now.
          </p>
        </header>

        <main style={{ display: "grid", gap: 16 }}>
          <section
            onClick={() => handleChoose("l1")}
            style={{
              border: `2px solid ${BRAND.purple}`,
              borderRadius: 20,
              padding: "20px 18px",
              cursor: "pointer",
              background: "#fff",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              transition:
                "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = `0 4px 16px ${BRAND.purple}20`;
              e.currentTarget.style.borderColor = BRAND.blue;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
              e.currentTarget.style.borderColor = BRAND.purple;
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: BRAND.purple,
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <svg viewBox="0 0 24 24" width="26" height="26" fill="white">
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                </svg>
              </div>
              <div>
                <h3
                  style={{
                    margin: "0 0 6px 0",
                    color: BRAND.purple,
                    fontSize: 18,
                    fontWeight: 700,
                  }}
                >
                  Level 1 · General Help
                </h3>
                <p
                  style={{
                    margin: 0,
                    color: "#1F2937",
                    fontSize: 14,
                    lineHeight: 1.5,
                  }}
                >
                  For everyday assistance: ask staff to walk you to transport,
                  call a ride, or help with small issues.
                </p>
              </div>
            </div>
            <p style={{ margin: "0 0 0 66px", color: "#6B7280", fontSize: 13 }}>
              Examples: pharmacies, cafes, restaurants, parks, lodging.
            </p>
          </section>

          <section
            onClick={() => handleChoose("l2")}
            style={{
              border: `2px solid ${BRAND.pink}`,
              borderRadius: 20,
              padding: "20px 18px",
              cursor: "pointer",
              background: "#fff",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              transition:
                "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = `0 4px 16px ${BRAND.pink}20`;
              e.currentTarget.style.borderColor = BRAND.purple;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
              e.currentTarget.style.borderColor = BRAND.pink;
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: BRAND.pink,
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <svg viewBox="0 0 24 24" width="26" height="26" fill="white">
                  <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm-1 16.5l-4.5-4.5L8 12.5l3 3 7-7 1.5 1.5-8.5 8.5z" />
                </svg>
              </div>
              <div>
                <h3
                  style={{
                    margin: "0 0 6px 0",
                    color: BRAND.pink,
                    fontSize: 18,
                    fontWeight: 700,
                  }}
                >
                  Level 2 · Law Enforcement / Security
                </h3>
                <p
                  style={{
                    margin: 0,
                    color: "#1F2937",
                    fontSize: 14,
                    lineHeight: 1.5,
                  }}
                >
                  For serious emergencies or protection: find official police or
                  emergency services.
                </p>
              </div>
            </div>
            <p style={{ margin: "0 0 0 66px", color: "#6B7280", fontSize: 13 }}>
              Examples: police stations, hospitals.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
