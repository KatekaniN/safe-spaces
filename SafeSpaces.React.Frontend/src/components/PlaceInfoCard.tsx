import { useMemo } from "react";

interface PlaceInfoCardProps {
  placeName: string;
  placeType: string;
  placeLocation: google.maps.LatLngLiteral;
  userLocation: google.maps.LatLngLiteral | null;
  onNavigate: () => void;
  onClose: () => void;
  distance?: number;
  duration?: string;
  isNavigating: boolean;
  // Details
  loadingDetails?: boolean;
  isOpen?: boolean;
  todaysHours?: string;
  phoneNumber?: string;
  address?: string;
  nextChangeLabel?: string; // e.g., "Closes in 1h 20m" or "Opens in 30m"
}

export const PlaceInfoCard = ({
  placeName,
  placeType,
  placeLocation,
  userLocation,
  onNavigate,
  onClose,
  distance,
  duration,
  isNavigating,
  loadingDetails,
  isOpen,
  todaysHours,
  phoneNumber,
  address,
  nextChangeLabel,
}: PlaceInfoCardProps) => {
  // Inline SVG icons for a crisp, modern look without extra deps
  const IconPhone = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V21a1 1 0 01-1 1C10.07 22 2 13.93 2 3a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.24 1.01l-2.2 2.2z" />
    </svg>
  );
  const IconNav = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 2l4.5 15.5L12 14l-4.5 3.5L12 2z" />
    </svg>
  );
  const IconDistance = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 2a6 6 0 016 6c0 4.5-6 12-6 12s-6-7.5-6-12a6 6 0 016-6zm0 8a2 2 0 110-4 2 2 0 010 4z" />
    </svg>
  );
  const IconClock = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 10.59V7h-2v6h6v-2h-4z" />
    </svg>
  );
  // Calculate straight-line distance if not provided
  const calculatedDistance = useMemo(() => {
    if (distance !== undefined) return distance;
    if (!userLocation) return null;

    const R = 6371e3; // Earth's radius in meters
    const φ1 = (userLocation.lat * Math.PI) / 180;
    const φ2 = (placeLocation.lat * Math.PI) / 180;
    const Δφ = ((placeLocation.lat - userLocation.lat) * Math.PI) / 180;
    const Δλ = ((placeLocation.lng - userLocation.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }, [distance, userLocation, placeLocation]);

  const formatDistance = (meters: number | null) => {
    if (meters === null) return "Unknown";
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatPlaceType = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const cardOverlayStyle: React.CSSProperties = {
    position: "absolute",
    bottom: 0,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 200,
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "12px",
  };

  const closeButtonStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px",
    color: "#666",
    fontSize: "24px",
    lineHeight: "1",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: "18px",
    fontWeight: "600",
    color: "#8764C1",
    margin: "0 0 4px 0",
  };

  const typeStyle: React.CSSProperties = {
    fontSize: "14px",
    color: "#666",
    textTransform: "capitalize",
  };

  const infoRowStyle: React.CSSProperties = {
    display: "flex",
    gap: "12px",
    marginBottom: "16px",
    fontSize: "14px",
  };
  const infoBadgeStyle: React.CSSProperties = {
    backgroundColor: "#87A5DC", // app blue
    color: "#FFFFFF",
    padding: "6px 10px",
    borderRadius: "999px",
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  };

  const statusBadgeStyle = (open?: boolean): React.CSSProperties => ({
    backgroundColor: open ? "#87A5DC" : "#EC96BE", // blue when open, pink when closed
    color: "#FFFFFF",
    padding: "6px 10px",
    borderRadius: "12px",
    fontWeight: 600,
    fontSize: "12px",
    display: "inline-block",
  });

  const smallTextStyle: React.CSSProperties = {
    color: "#555",
    fontSize: "13px",
    marginTop: "6px",
  };

  const buttonStyle: React.CSSProperties = {
    width: "100%",
    padding: "14px",
    backgroundColor: isNavigating ? "#EC96BE" : "#8764C1", // pink when active, purple otherwise
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontSize: "16px",
    fontWeight: 700,
    cursor: "pointer",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
  };

  const secondaryButtonStyle: React.CSSProperties = {
    width: "100%",
    padding: "14px",
    backgroundColor: "#ffffff",
    color: "#8764C1",
    border: "2px solid #8764C1",
    borderRadius: "10px",
    fontSize: "16px",
    fontWeight: 700,
    cursor: "pointer",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
  };

  const actionsRowStyle: React.CSSProperties = { display: "grid", gap: "12px" };

  return (
    <>
      <style>{`
        @keyframes slideUp {
          from { transform: translateX(-50%) translateY(100%); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }

        .ss-card {
          background: rgba(255,255,255,0.98);
          backdrop-filter: saturate(180%) blur(6px);
          border-radius: 16px;
          padding: 16px 16px calc(16px + env(safe-area-inset-bottom));
          box-shadow: 0 10px 30px rgba(0,0,0,0.15);
          width: calc(100vw - 24px);
          max-width: 480px;
          margin: 12px;
          animation: slideUp 0.28s ease-out;
        }

        @media (min-width: 600px) {
          .ss-card { width: 420px; }
          .ss-actions.two { grid-template-columns: 1fr 1fr; }
        }

        .ss-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 10px; }
        .ss-title { font-size: 18px; font-weight: 700; color: #8764C1; margin: 0 0 2px 0; }
        .ss-type { font-size: 14px; color: #6B7280; text-transform: capitalize; margin: 0; }
        .ss-close { background:none; border:none; cursor:pointer; padding:4px; color:#6B7280; font-size:22px; line-height:1; }
        .ss-close:hover { color:#8764C1; }
        .ss-small { color:#555; font-size:13px; margin-top:6px; }
        .ss-divider { height:1px; background: #F3F4F6; margin: 12px 0; }
      `}</style>
      <div style={cardOverlayStyle}>
        <div className="ss-card">
          <div style={headerStyle}>
            <div>
              <h3 className="ss-title" style={titleStyle}>
                {placeName}
              </h3>
              <p className="ss-type" style={typeStyle}>
                {formatPlaceType(placeType)}
              </p>
            </div>
            <button
              onClick={onClose}
              style={closeButtonStyle}
              className="ss-close"
            >
              ×
            </button>
          </div>

          {/* Status + Hours */}
          <div style={{ marginBottom: "12px" }}>
            {loadingDetails ? (
              <div style={{ ...smallTextStyle }}>Loading details…</div>
            ) : (
              <>
                {typeof isOpen === "boolean" && (
                  <span style={statusBadgeStyle(isOpen)}>
                    {isOpen ? "Open now" : "Closed"}
                  </span>
                )}
                {nextChangeLabel && (
                  <div style={smallTextStyle}>{nextChangeLabel}</div>
                )}
                {todaysHours && (
                  <div style={smallTextStyle}>Today: {todaysHours}</div>
                )}
              </>
            )}
          </div>

          {/* Address & Phone */}
          {(address || phoneNumber) && (
            <div style={{ marginBottom: "12px" }}>
              {address && (
                <div className="ss-small" style={smallTextStyle}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <IconDistance style={{ color: "#8764C1" }} /> {address}
                  </span>
                </div>
              )}
              {phoneNumber && (
                <div className="ss-small" style={smallTextStyle}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <IconPhone style={{ color: "#8764C1" }} />
                    <a
                      href={`tel:${phoneNumber}`}
                      style={{
                        color: "#8764C1",
                        textDecoration: "none",
                        fontWeight: 700,
                      }}
                    >
                      {phoneNumber}
                    </a>
                  </span>
                </div>
              )}
            </div>
          )}

          <div style={infoRowStyle}>
            {calculatedDistance !== null && (
              <div style={infoBadgeStyle}>
                <IconDistance /> {formatDistance(calculatedDistance)}
              </div>
            )}
            {duration && (
              <div style={infoBadgeStyle}>
                <IconClock /> {duration}
              </div>
            )}
          </div>

          {phoneNumber ? (
            <div style={actionsRowStyle} className="ss-actions two">
              <a href={`tel:${phoneNumber}`} style={{ textDecoration: "none" }}>
                <button
                  style={secondaryButtonStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.02)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 12px rgba(0,0,0,0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <IconPhone /> Call
                </button>
              </a>
              <button
                onClick={onNavigate}
                style={{ ...buttonStyle }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.02)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 12px rgba(0,0,0,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <IconNav />{" "}
                {isNavigating ? "Stop Navigation" : "Get Directions"}
              </button>
            </div>
          ) : (
            <button
              onClick={onNavigate}
              style={buttonStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.02)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <IconNav /> {isNavigating ? "Stop Navigation" : "Get Directions"}
            </button>
          )}
        </div>
      </div>
    </>
  );
};
