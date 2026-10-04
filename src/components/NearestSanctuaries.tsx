import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMapsLibrary } from "@vis.gl/react-google-maps";

type Sanctuary = {
  id: string;
  name: string;
  type: string;
  location: google.maps.LatLngLiteral;
  distanceKm: number;
  openNow?: boolean | null;
  address?: string;
};

const SAFE_TYPES = [
  "library",
  "hospital",
  "police",
  "pharmacy",
  "shopping_mall",
];

// Friendly "sanctuary" label + accent per place category
function categoryFor(type: string): { label: string; accent: string } {
  if (["hospital", "pharmacy", "doctor"].includes(type))
    return { label: "Medical Sanctuary", accent: "var(--brand-pink)" };
  if (["police", "fire_station"].includes(type))
    return { label: "Civil Safety Point", accent: "var(--brand-blue)" };
  return { label: "Community Safe Haven", accent: "var(--brand)" };
}

function haversineKm(
  a: google.maps.LatLngLiteral,
  b: google.maps.LatLngLiteral
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

function walkMinutes(km: number): number {
  return Math.max(1, Math.round((km / 4.8) * 60)); // ~4.8 km/h walking pace
}

export function NearestSanctuaries({
  center,
  onCount,
}: {
  center: google.maps.LatLngLiteral;
  onCount?: (n: number) => void;
}) {
  const placesLib = useMapsLibrary("places");
  const navigate = useNavigate();
  const [items, setItems] = useState<Sanctuary[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!placesLib || !center) return;
    let cancelled = false;

    (async () => {
      try {
        const Place = placesLib.Place;
        const buckets = await Promise.all(
          SAFE_TYPES.map(async (type) => {
            try {
              const { places } = await Place.searchNearby({
                locationRestriction: { center, radius: 5000 },
                includedPrimaryTypes: [type],
                maxResultCount: 5,
                fields: [
                  "id",
                  "location",
                  "displayName",
                  "currentOpeningHours",
                  "formattedAddress",
                ],
              });
              return (places || []).map((p: any) => {
                const loc =
                  p.location instanceof google.maps.LatLng
                    ? p.location.toJSON()
                    : p.location;
                return {
                  id: p.id,
                  name: p.displayName || "Safe space",
                  type,
                  location: loc,
                  distanceKm: haversineKm(center, loc),
                  openNow: p.currentOpeningHours?.openNow ?? null,
                  address: p.formattedAddress,
                } as Sanctuary;
              });
            } catch {
              return [];
            }
          })
        );

        const seen = new Set<string>();
        const top = buckets
          .flat()
          .filter((s) => s.location && !seen.has(s.id) && seen.add(s.id))
          .sort((a, b) => a.distanceKm - b.distanceKm)
          .slice(0, 3);

        if (!cancelled) {
          if (top.length === 0) setError(true);
          setItems(top);
          onCount?.(top.length);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placesLib, center?.lat, center?.lng]);

  if (error)
    return (
      <p style={{ color: "var(--muted)", fontSize: 14, textAlign: "center" }}>
        Couldn't load nearby safe spaces right now. Try the map instead.
      </p>
    );

  if (!items)
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="glass"
            style={{ height: 150, borderRadius: 20, opacity: 0.5 }}
          />
        ))}
      </div>
    );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 16,
      }}
    >
      {items.map((s) => {
        const cat = categoryFor(s.type);
        const dirUrl = `https://www.google.com/maps/dir/?api=1&destination=${s.location.lat},${s.location.lng}`;
        return (
          <div
            key={s.id}
            className="glass"
            style={{
              borderRadius: 20,
              padding: 18,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: cat.accent,
                }}
              >
                {cat.label}
              </span>
              <span style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>
                {s.distanceKm.toFixed(1)} km
              </span>
            </div>

            <div>
              <h3
                style={{
                  margin: "0 0 4px 0",
                  fontSize: 17,
                  fontWeight: 700,
                  color: "var(--text)",
                  lineHeight: 1.25,
                }}
              >
                {s.name}
              </h3>
              {s.address && (
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: "var(--muted)",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {s.address}
                </p>
              )}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 12 }}>
              {s.openNow != null && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    color: s.openNow ? "var(--success)" : "var(--danger)",
                    fontWeight: 700,
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "currentColor",
                    }}
                  />
                  {s.openNow ? "Open now" : "Closed"}
                </span>
              )}
              <span style={{ color: "var(--muted)" }}>
                ~{walkMinutes(s.distanceKm)} min walk
              </span>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
              <a
                href={dirUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: "var(--brand)",
                  color: "var(--on-brand)",
                  fontWeight: 700,
                  fontSize: 14,
                  textDecoration: "none",
                }}
              >
                Get Directions
              </a>
              <button
                onClick={() => navigate("/map?level=l1")}
                aria-label="View on map"
                title="View on map"
                className="chip"
                style={{ padding: "10px 14px" }}
              >
                Map
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
