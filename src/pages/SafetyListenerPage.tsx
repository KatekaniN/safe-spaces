import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useSafetyMonitor } from "../hooks/useSafetyMonitor";

const BRAND = {
  purple: "var(--brand)",
  blue: "var(--brand-blue)",
  pink: "var(--brand-pink)",
  purpleLight: "var(--brand-tint)",
  blueLight: "var(--blue-tint)",
  pinkLight: "var(--pink-tint)",
};

export default function SafetyListenerPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const startFlag = params.get("start");
  const [shareLive, setShareLive] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem("safe_share_live");
      return raw ? raw === "1" : true; // default on
    } catch {
      return true;
    }
  });
  const {
    isListening,
    isRecording,
    isTriggerRecording,
    statusMessage,
    countdown,
    triggerWords,
    addTrigger,
    deleteTrigger,
    startRecordTrigger,
    stopRecordTrigger,
    startEmergency,
    stopEmergency,
  } = useSafetyMonitor({
    onUploadSuccess: () => navigate("/recordings"),
    includeLiveTracking: shareLive,
  });

  const [manualTrigger, setManualTrigger] = useState("");

  useEffect(() => {
    if (startFlag === "1") {
      startEmergency();
    }
    // Only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        minHeight: "calc(100dvh - 60px)",
        background: "transparent",
        padding: "24px 16px 48px",
      }}
    >
      <div style={{ maxWidth: 720, width: "100%", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <span
            style={{
              display: "inline-block",
              padding: "6px 14px",
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "var(--brand)",
              background: "var(--brand-tint)",
              marginBottom: 14,
            }}
          >
            Personal Safety Guardian
          </span>
          <h1
            style={{
              color: "var(--text)",
              margin: "0 0 6px 0",
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            Recording Shield
          </h1>
          <p
            style={{
              color: "var(--muted)",
              fontSize: 15,
              margin: "0 auto",
              maxWidth: 460,
              lineHeight: 1.5,
            }}
          >
            Discreetly capture audio evidence and share your live location with
            responders. Nothing runs until you start it.
          </p>
          {statusMessage && (
            <div style={{ color: "var(--text-2)", fontSize: 14, marginTop: 8 }}>
              {statusMessage}
            </div>
          )}
        </div>

        <div
          className="glass"
          style={{
            borderRadius: 24,
            padding: "22px 20px",
            display: "grid",
            gap: 16,
          }}
        >
          <div style={{ display: "grid", gap: 12 }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "var(--text-2)",
                fontSize: 14,
              }}
            >
              <input
                type="checkbox"
                checked={shareLive}
                onChange={(e) => {
                  setShareLive(e.target.checked);
                  try {
                    localStorage.setItem(
                      "safe_share_live",
                      e.target.checked ? "1" : "0"
                    );
                  } catch {}
                }}
              />
              Share a live directions link with responders
            </label>
            <button
              type="button"
              onClick={isRecording ? stopEmergency : startEmergency}
              className={isRecording ? "" : "glow-pulse"}
              style={{
                width: "100%",
                padding: "18px",
                borderRadius: 16,
                border: "none",
                background: isRecording ? BRAND.pink : BRAND.purple,
                color: "var(--on-brand)",
                fontWeight: 800,
                fontSize: 17,
                cursor: "pointer",
              }}
            >
              {isRecording
                ? `Stop recording (${countdown}s)`
                : "Start silent recording"}
            </button>
            <Link to="/recordings" style={{ textDecoration: "none" }}>
              <button
                type="button"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: `2px solid ${BRAND.blue}`,
                  background: "transparent",
                  color: BRAND.blue,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                View recordings
              </button>
            </Link>
            {isRecording && (
              <div style={{ color: "var(--muted)", fontSize: 14 }}>
                Auto-stopping in <strong>{countdown}s</strong>
              </div>
            )}
            <div style={{ color: "var(--muted)", fontSize: 13 }}>
              Listener: {isListening ? "on" : "off"} · Trigger capture:{" "}
              {isTriggerRecording ? "recording" : "idle"}
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--surface-3)", margin: "4px 0" }} />

          <div style={{ display: "grid", gap: 12 }}>
            <strong style={{ color: "var(--text)", fontSize: 15 }}>
              Trigger words
            </strong>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={
                  isTriggerRecording ? stopRecordTrigger : startRecordTrigger
                }
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: `2px solid ${BRAND.purple}`,
                  background: isTriggerRecording ? BRAND.purple : "transparent",
                  color: isTriggerRecording ? "var(--on-brand)" : BRAND.purple,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {isTriggerRecording ? "Stop capture" : "Record a trigger"}
              </button>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addTrigger(manualTrigger);
                  setManualTrigger("");
                }}
                style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
              >
                <input
                  value={manualTrigger}
                  onChange={(e) => setManualTrigger(e.target.value)}
                  placeholder="Add trigger manually"
                  style={{
                    border: "1px solid var(--border-strong)",
                    borderRadius: 12,
                    padding: "10px 12px",
                    minWidth: 220,
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "none",
                    background: BRAND.purple,
                    color: "var(--on-brand)",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Add
                </button>
              </form>
            </div>

            {triggerWords.length > 0 ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {triggerWords.map((w) => (
                  <span
                    key={w}
                    style={{
                      background: BRAND.purpleLight,
                      color: BRAND.purple,
                      padding: "8px 10px",
                      borderRadius: 12,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    {w}
                    <button
                      aria-label={`Remove ${w}`}
                      onClick={() => deleteTrigger(w)}
                      style={{
                        marginLeft: 4,
                        border: "none",
                        background: "transparent",
                        color: BRAND.purple,
                        cursor: "pointer",
                        fontSize: 16,
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <div style={{ color: "var(--muted)", fontSize: 13 }}>
                No triggers yet. Record or add a phrase like "help me".
              </div>
            )}
          </div>
        </div>

        {/* Trusted circle */}
        <div
          className="glass"
          style={{
            borderRadius: 20,
            padding: "18px 20px",
            marginTop: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <strong
              style={{ color: "var(--text)", fontSize: 15, display: "block" }}
            >
              Trusted circle
            </strong>
            <span style={{ color: "var(--muted)", fontSize: 13 }}>
              People we alert when you trigger the shield.
            </span>
          </div>
          <Link to="/profile" style={{ textDecoration: "none" }}>
            <span className="chip">Manage contacts</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
