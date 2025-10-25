import { useMemo } from "react";
import { useLocation, Link } from "react-router-dom";
import { APIProvider } from "@vis.gl/react-google-maps";
import { SafeSpacesMapWrapper } from "../components/map";
import { getTypesForNeed } from "../lib/needs";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function MapView() {
  const query = useQuery();
  const level = (query.get("level") || "l1") as "l1" | "l2";
  const need = query.get("need");
  const openNow = query.get("openNow") === "1";

  const allowedTypes = useMemo(() => {
    // If a specific need is chosen (for either level), use its mapping
    const typesForNeed = getTypesForNeed(need);
    if (typesForNeed && typesForNeed.length) return typesForNeed;

    // Fallbacks per level
    if (level === "l2") {
      return ["police", "hospital"]; // default law/security fallback
    }
    return ["pharmacy", "restaurant", "cafe", "bar", "park", "lodging"];
  }, [level, need]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateRows: "auto 1fr",
        minHeight: "100dvh",
        background: "#fff",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          padding: "calc(8px + env(safe-area-inset-top)) 12px 8px 12px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "saturate(160%) blur(6px)",
          borderBottom: "1px solid #F3F4F6",
        }}
      >
        <Link
          to="/levels"
          style={{
            textDecoration: "none",
            color: "#8764C1",
            fontWeight: 700,
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid #E5E7EB",
          }}
        >
          &larr; Back
        </Link>
        <div style={{ color: "#4B5563" }}>
          Showing:{" "}
          <strong style={{ color: "#8764C1" }}>
            {level === "l2"
              ? "Level 2 (Law/Security)"
              : "Level 1 (General Help)"}
          </strong>
        </div>
      </header>
      <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
        <div style={{ width: "100%", height: "100%" }}>
          <SafeSpacesMapWrapper allowedTypes={allowedTypes} openNow={openNow} />
        </div>
      </APIProvider>
    </div>
  );
}
