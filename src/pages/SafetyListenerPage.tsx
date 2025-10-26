import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useSafetyMonitor } from "../hooks/useSafetyMonitor";

const BRAND = {
  purple: "#8764C1",
  blue: "#87A5DC",
  pink: "#EC96BE",
  purpleLight: "#F3EFFC",
  blueLight: "#EFF5FC",
  pinkLight: "#FDF3F8",
};

export default function SafetyListenerPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const startFlag = params.get("start");
  const {
    isListening,
    isRecording,
    isTriggerRecording,
    statusMessage,
    countdown,
    activeAlertStatus,
    alertNotification,
    dismissAlertNotification,
    triggerWords,
    addTrigger,
    deleteTrigger,
    startRecordTrigger,
    stopRecordTrigger,
    startEmergency,
    stopEmergency,
  } = useSafetyMonitor({ onUploadSuccess: () => navigate("/recordings") });

  const [manualTrigger, setManualTrigger] = useState("");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [persistedNotification, setPersistedNotification] = useState<
    string | null
  >(null);
  const hasUnreadNotification = Boolean(alertNotification);

  useEffect(() => {
    if (alertNotification) {
      setPersistedNotification(alertNotification);
      setNotificationOpen(false);
    }
  }, [alertNotification]);

  useEffect(() => {
    if (activeAlertStatus === "open" && !alertNotification) {
      setPersistedNotification(null);
      setNotificationOpen(false);
    }
  }, [activeAlertStatus, alertNotification]);

  const handleNotificationClick = () => {
    if (!persistedNotification) return;
    setNotificationOpen((prev) => {
      const next = !prev;
      if (!prev) {
        dismissAlertNotification();
      }
      return next;
    });
  };

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
        background: "#FAFAFA",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
      }}
    >
      <div style={{ maxWidth: 640, width: "100%" }}>
        <div
          style={{
            position: "relative",
            textAlign: "center",
            marginBottom: 16,
            paddingRight: persistedNotification ? 56 : 0,
          }}
        >
          <h1
            style={{
              color: BRAND.purple,
              margin: "0 0 6px 0",
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            Emergency Mode
          </h1>
          {statusMessage && (
            <div style={{ color: "#374151", fontSize: 14 }}>
              {statusMessage}
            </div>
          )}
          {persistedNotification && (
            <>
              <button
                type="button"
                onClick={handleNotificationClick}
                aria-label={
                  notificationOpen
                    ? "Hide emergency notification"
                    : "Show emergency notification"
                }
                title="Notifications"
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  border: `2px solid ${BRAND.pink}`,
                  background: notificationOpen ? BRAND.pink : "#fff",
                  color: notificationOpen ? "#fff" : BRAND.pink,
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  boxShadow: notificationOpen
                    ? "0 8px 16px rgba(236,150,190,0.35)"
                    : "0 4px 10px rgba(236,150,190,0.25)",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                }}
              >
                <span aria-hidden="true" style={{ fontSize: 20 }}>
                  🔔
                </span>
                {hasUnreadNotification && (
                  <span
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 9,
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: "#EF4444",
                      border: "2px solid #fff",
                    }}
                  />
                )}
              </button>
              {notificationOpen && persistedNotification && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 10px)",
                    right: 0,
                    background: "#fff",
                    borderRadius: 12,
                    border: `1.5px solid ${BRAND.pink}`,
                    boxShadow: "0 12px 28px rgba(0,0,0,0.12)",
                    padding: "12px 14px",
                    minWidth: 220,
                    maxWidth: 280,
                    textAlign: "left",
                    color: "#374151",
                    fontSize: 14,
                    zIndex: 10,
                  }}
                >
                  <strong
                    style={{
                      display: "block",
                      color: BRAND.purple,
                      marginBottom: 4,
                      fontSize: 13,
                    }}
                  >
                    Notification
                  </strong>
                  <span>{persistedNotification}</span>
                </div>
              )}
            </>
          )}
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: "20px 20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            border: "2px solid #E5E7EB",
            display: "grid",
            gap: 16,
          }}
        >
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={startEmergency}
                disabled={isRecording}
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "none",
                  background: BRAND.pink,
                  color: "#fff",
                  fontWeight: 800,
                  cursor: isRecording ? "not-allowed" : "pointer",
                }}
              >
                {isRecording ? "Recording…" : "Start Recording Now"}
              </button>
              <button
                type="button"
                onClick={stopEmergency}
                disabled={!isRecording}
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: `2px solid ${BRAND.pink}`,
                  background: "transparent",
                  color: BRAND.pink,
                  fontWeight: 800,
                  cursor: !isRecording ? "not-allowed" : "pointer",
                }}
              >
                Stop
              </button>
              <Link to="/recordings" style={{ textDecoration: "none" }}>
                <button
                  type="button"
                  style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: `2px solid ${BRAND.blue}`,
                    background: "transparent",
                    color: BRAND.blue,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  View Recordings
                </button>
              </Link>
            </div>
            {isRecording && (
              <div style={{ color: "#6B7280", fontSize: 14 }}>
                Auto-stopping in <strong>{countdown}s</strong>
              </div>
            )}
            <div style={{ color: "#6B7280", fontSize: 13 }}>
              Listener: {isListening ? "on" : "off"} · Trigger capture:{" "}
              {isTriggerRecording ? "recording" : "idle"}
            </div>
          </div>

          <div style={{ borderTop: "1px solid #F3F4F6", margin: "4px 0" }} />

          <div style={{ display: "grid", gap: 12 }}>
            <strong style={{ color: "#1F2937", fontSize: 15 }}>
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
                  color: isTriggerRecording ? "#fff" : BRAND.purple,
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
                    border: "1.5px solid #E5E7EB",
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
                    color: "#fff",
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
                      borderRadius: 999,
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
              <div style={{ color: "#6B7280", fontSize: 13 }}>
                No triggers yet. Record or add a phrase like "help me".
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
