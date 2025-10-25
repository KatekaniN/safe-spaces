import React from "react";

interface LocationControlsProps {
  isFollowMode: boolean;
  onToggleFollowMode: () => void;
  onRecenter: () => void;
  hasLocation: boolean;
  isLoading: boolean;
  error: string | null;
  onRequestPermission: () => void;
}

export const LocationControls = ({
  isFollowMode,
  onToggleFollowMode,
  onRecenter,
  hasLocation,
  isLoading,
  error,
  onRequestPermission,
}: LocationControlsProps) => {
  const containerStyle: React.CSSProperties = {
    position: "absolute",
    top: "10px",
    right: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    zIndex: 100,
  };

  const buttonBaseStyle: React.CSSProperties = {
    backgroundColor: "white",
    border: "none",
    borderRadius: "8px",
    padding: "12px",
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "48px",
    height: "48px",
    transition: "all 0.2s ease",
  };

  const buttonHoverStyle = {
    transform: "scale(1.05)",
    boxShadow: "0 4px 8px rgba(0,0,0,0.4)",
  };

  const activeButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    backgroundColor: "#87A5DC",
  };

  const messageBoxStyle: React.CSSProperties = {
    backgroundColor: "white",
    borderRadius: "8px",
    padding: "12px 16px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
    maxWidth: "250px",
    fontSize: "14px",
    lineHeight: "1.4",
  };

  return (
    <div style={containerStyle}>
      {/* Loading indicator */}
      {isLoading && (
        <div
          style={{
            ...messageBoxStyle,
            backgroundColor: "#87A5DC",
            color: "white",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "16px",
                height: "16px",
                border: "3px solid white",
                borderTop: "3px solid transparent",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <span>Getting your location...</span>
          </div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Error message with retry button */}
      {error && (
        <div
          style={{
            ...messageBoxStyle,
            backgroundColor: "#EC96BE",
            color: "white",
          }}
        >
          <div style={{ marginBottom: "8px", fontWeight: "500" }}>
            Location access needed
          </div>
          <div style={{ fontSize: "12px", marginBottom: "8px" }}>{error}</div>
          <button
            onClick={onRequestPermission}
            style={{
              width: "100%",
              padding: "8px",
              backgroundColor: "white",
              color: "#8764C1",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "12px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#f0f0f0";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "white";
            }}
          >
            Enable Location
          </button>
        </div>
      )}

      {/* Follow Mode Toggle */}
      {hasLocation && !error && (
        <button
          onClick={onToggleFollowMode}
          style={isFollowMode ? activeButtonStyle : buttonBaseStyle}
          title={
            isFollowMode ? "Following your location" : "Follow your location"
          }
          onMouseEnter={(e) => {
            if (!isFollowMode) {
              Object.assign(e.currentTarget.style, buttonHoverStyle);
            }
          }}
          onMouseLeave={(e) => {
            if (!isFollowMode) {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
            }
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 8C9.79 8 8 9.79 8 12C8 14.21 9.79 16 12 16C14.21 16 16 14.21 16 12C16 9.79 14.21 8 12 8ZM20.94 11C20.48 6.83 17.17 3.52 13 3.06V1H11V3.06C6.83 3.52 3.52 6.83 3.06 11H1V13H3.06C3.52 17.17 6.83 20.48 11 20.94V23H13V20.94C17.17 20.48 20.48 17.17 20.94 13H23V11H20.94ZM12 19C8.13 19 5 15.87 5 12C5 8.13 8.13 5 12 5C15.87 5 19 8.13 19 12C19 15.87 15.87 19 12 19Z"
              fill={isFollowMode ? "white" : "#8764C1"}
            />
          </svg>
        </button>
      )}

      {/* Re-center Button */}
      {hasLocation && !error && !isFollowMode && (
        <button
          onClick={onRecenter}
          style={buttonBaseStyle}
          title="Center map on your location"
          onMouseEnter={(e) => {
            Object.assign(e.currentTarget.style, buttonHoverStyle);
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM12 6C8.69 6 6 8.69 6 12C6 15.31 8.69 18 12 18C15.31 18 18 15.31 18 12C18 8.69 15.31 6 12 6ZM12 16C9.79 16 8 14.21 8 12C8 9.79 9.79 8 12 8C14.21 8 16 9.79 16 12C16 14.21 14.21 16 12 16Z"
              fill="#8764C1"
            />
          </svg>
        </button>
      )}
    </div>
  );
};
