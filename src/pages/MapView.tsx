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

  const NEED_LABELS: Record<string, string> = {
    call_charge_wifi: "Charge or get online",
    escort_transport: "Get home safely",
    basic_comfort: "Rest & recover",
    minor_medical: "Pharmacy & first aid",
    talk_report: "Talk to someone",
    police_security: "Police & security",
    hospital_emergency: "Emergency room",
    urgent_care: "Clinic or urgent care",
    fire_rescue: "Fire & rescue",
    roadside_assist: "Car trouble",
  };
  const headerLabel =
    (need && NEED_LABELS[need]) ||
    (level === "l2" ? "Urgent help" : "Safe places");

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
        background: "transparent",
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
          background: "var(--surface)",
          borderBottom: "1px solid var(--border-strong)",
        }}
      >
        <Link
          to="/levels"
          style={{
            textDecoration: "none",
            color: "var(--brand)",
            fontWeight: 700,
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid var(--border)",
          }}
        >
          &larr; Back
        </Link>
        <div style={{ color: "var(--muted)" }}>
          Near you:{" "}
          <strong style={{ color: "var(--brand)" }}>{headerLabel}</strong>
          {openNow && (
            <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 700 }}>
              · open now
            </span>
          )}
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
