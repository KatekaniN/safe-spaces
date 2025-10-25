import { useEffect } from "react";
import { AdvancedMarker } from "@vis.gl/react-google-maps";

interface UserLocationMarkerProps {
  position: google.maps.LatLngLiteral;
}

export const UserLocationMarker = ({ position }: UserLocationMarkerProps) => {
  useEffect(() => {
    // Add pulsing animation styles
    const style = document.createElement("style");
    style.textContent = `
      @keyframes pulse {
        0% {
          transform: scale(1);
          opacity: 1;
        }
        50% {
          transform: scale(1.3);
          opacity: 0.6;
        }
        100% {
          transform: scale(1);
          opacity: 1;
        }
      }
      .pulse-animation {
        animation: pulse 2s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Create the pulsing blue dot marker - centered properly
  const markerContent = (
    <div
      style={{
        position: "relative",
        width: "20px",
        height: "20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Outer pulsing circle */}
      <div
        className="pulse-animation"
        style={{
          position: "absolute",
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          backgroundColor: "#87A5DC",
          opacity: 0.3,
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />
      {/* Middle circle */}
      <div
        style={{
          position: "absolute",
          width: "24px",
          height: "24px",
          borderRadius: "50%",
          backgroundColor: "#87A5DC",
          opacity: 0.5,
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />
      {/* Inner solid dot */}
      <div
        style={{
          position: "absolute",
          width: "16px",
          height: "16px",
          borderRadius: "50%",
          backgroundColor: "#87A5DC",
          border: "3px solid white",
          boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />
    </div>
  );

  return (
    <AdvancedMarker
      position={position}
      zIndex={1000} // Ensure user marker is always on top
    >
      {markerContent}
    </AdvancedMarker>
  );
};
