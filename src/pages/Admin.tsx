import React from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  CrimeReport,
  Incident,
  updateCrimeReport,
  getUserProfile,
  UserProfile,
  PanicAlert,
  updatePanicAlert,
  PoliceStation,
  upsertPoliceStations,
} from "../lib/data";
import { reverseGeocode, geocodePlace } from "../lib/geocode";
import { db } from "../lib/firebase";
import {
  collection,
  collectionGroup,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

const BRAND = {
  purple: "#8764C1",
  blue: "#87A5DC",
  pink: "#EC96BE",
  gray: "#6B7280",
  border: "#E5E7EB",
  bg: "#FAFAFA",
};

const STATUS_COLORS: Record<string, string> = {
  open: BRAND.purple,
  acknowledged: "#87A5DC", // brand blue
  resolved: BRAND.pink,
};

export default function AdminPage() {
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [crimeReports, setCrimeReports] = React.useState<CrimeReport[]>([]);
  const [incidents, setIncidents] = React.useState<
    (Incident & { uid?: string })[]
  >([]);
  const [error, setError] = React.useState<string | null>(null);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [panicAlerts, setPanicAlerts] = React.useState<PanicAlert[]>([]);
  const [addressCache, setAddressCache] = React.useState<
    Record<string, { formatted: string; placeId?: string }>
  >({});
  const [policeStations, setPoliceStations] = React.useState<PoliceStation[]>(
    []
  );
  const [importText, setImportText] = React.useState<string>("");
  const [importing, setImporting] = React.useState<boolean>(false);
  const [importNote, setImportNote] = React.useState<string>("");
  // Cache of uid -> display name for showing responder names
  const [userNameCache, setUserNameCache] = React.useState<
    Record<string, string>
  >({});

  React.useEffect(() => {
    let unsub1: undefined | (() => void);
    let unsub2: undefined | (() => void);
    let unsub3: undefined | (() => void);
    let unsub4: undefined | (() => void);
    let loaded1 = false; // crimeReports
    let loaded2 = false; // incidents
    let loaded3 = false; // panicAlerts
    const maybeDone = () => {
      if (loaded1 && loaded2 && loaded3) setLoading(false);
    };

    async function init() {
      try {
        setLoading(true);
        const p = user ? await getUserProfile(user.uid) : null;
        setProfile(p);
        const hasAccess = !!(
          p &&
          (p.isAdmin ||
            p.canAccessAdmin ||
            p.role === "admin" ||
            p.role === "law" ||
            p.role === "security")
        );
        if (!hasAccess) {
          loaded1 = true;
          loaded2 = true;
          maybeDone();
          return;
        }
      } catch {
        // ignore profile failures
      }

      try {
        const q1 = query(
          collection(db, "crimeReports"),
          orderBy("createdAt", "desc")
        );
        unsub1 = onSnapshot(
          q1,
          (snap) => {
            const list: CrimeReport[] = snap.docs.map((d) => ({
              id: d.id,
              ...(d.data() as CrimeReport),
            }));
            setCrimeReports(list);
            loaded1 = true;
            maybeDone();
          },
          (err) => {
            setError(err?.message || "Failed to subscribe to crime reports");
            loaded1 = true;
            maybeDone();
          }
        );

        const q2 = query(
          collectionGroup(db, "incidents"),
          orderBy("createdAt", "desc")
        );
        unsub2 = onSnapshot(
          q2,
          (snap) => {
            const list = snap.docs.map((d) => {
              const segments = d.ref.path.split("/");
              const uid = segments.length >= 2 ? segments[1] : undefined;
              return {
                id: d.id,
                uid,
                ...(d.data() as Incident),
              } as Incident & { uid?: string };
            });
            setIncidents(list);
            loaded2 = true;
            maybeDone();
          },
          (err) => {
            const msg = String(err?.message || "");
            const code = err?.code || "";
            if (
              code === "failed-precondition" ||
              msg.includes("COLLECTION_GROUP_DESC") ||
              msg.includes("create_exemption")
            ) {
              const qFallback = query(collectionGroup(db, "incidents"));
              unsub2 = onSnapshot(
                qFallback,
                (snap2) => {
                  const items = snap2.docs
                    .map((d) => {
                      const segments = d.ref.path.split("/");
                      const uid =
                        segments.length >= 2 ? segments[1] : undefined;
                      return {
                        id: d.id,
                        uid,
                        ...(d.data() as Incident),
                      } as Incident & { uid?: string };
                    })
                    .sort((a: any, b: any) => {
                      const ta =
                        a?.createdAt?.toMillis?.() ||
                        a?.createdAt?.seconds * 1000 ||
                        0;
                      const tb =
                        b?.createdAt?.toMillis?.() ||
                        b?.createdAt?.seconds * 1000 ||
                        0;
                      return tb - ta;
                    });
                  setIncidents(items);
                  loaded2 = true;
                  maybeDone();
                },
                (e2) => {
                  setError(
                    (e2?.message || msg) +
                      "\nTip: Create the collection group index for incidents.createdAt via the Firebase console link."
                  );
                  loaded2 = true;
                  maybeDone();
                }
              );
              return;
            }
            setError(err?.message || "Failed to subscribe to incidents");
            loaded2 = true;
            maybeDone();
          }
        );

        // Subscribe to live panic alerts for dashboards
        const q3 = query(
          collection(db, "panicAlerts"),
          orderBy("createdAt", "desc")
        );
        unsub3 = onSnapshot(
          q3,
          (snap) => {
            const list: PanicAlert[] = snap.docs.map((d) => ({
              id: d.id,
              ...(d.data() as PanicAlert),
            }));
            setPanicAlerts(list);
            // Proactively look up any responder names we don't have yet
            const uidsToFetch = Array.from(
              new Set(
                list
                  .map((a) => (a as any).responderUid)
                  .filter((u): u is string => !!u && typeof u === "string")
              )
            ).filter((u) => !(u in userNameCache));
            if (uidsToFetch.length) {
              (async () => {
                const entries: [string, string][] = [];
                for (const uid of uidsToFetch) {
                  try {
                    const prof = await getUserProfile(uid);
                    const name =
                      (prof?.preferredName || prof?.name || "").trim() ||
                      "Responder";
                    entries.push([uid, name]);
                  } catch {
                    entries.push([uid, "Responder"]);
                  }
                }
                if (entries.length) {
                  setUserNameCache((prev) => {
                    const next = { ...prev } as Record<string, string>;
                    for (const [uid, name] of entries) next[uid] = name;
                    return next;
                  });
                }
              })();
            }
            loaded3 = true;
            maybeDone();
          },
          (err) => {
            setError(err?.message || "Failed to subscribe to panic alerts");
            loaded3 = true;
            maybeDone();
          }
        );

        // Subscribe to police stations (non-blocking for page load)
        try {
          const q4 = query(collection(db, "policeStations"));
          unsub4 = onSnapshot(
            q4,
            (snap) => {
              const list: PoliceStation[] = snap.docs.map((d) => ({
                id: d.id,
                ...(d.data() as any),
              }));
              setPoliceStations(list);
            },
            () => {}
          );
        } catch {}
      } catch (e: any) {
        setError(e?.message || "Failed to initialize admin subscriptions");
        loaded1 = true;
        loaded2 = true;
        loaded3 = true;
        maybeDone();
      }
    }
    init();

    return () => {
      if (unsub1) unsub1();
      if (unsub2) unsub2();
      if (unsub3) unsub3();
      if (unsub4) unsub4();
    };
  }, [user]);

  // For any alert missing an address, fetch it on the fly and persist once
  React.useEffect(() => {
    async function fillAddresses() {
      const pending = panicAlerts.filter(
        (a) =>
          !!a.location && !a.address?.formatted && !addressCache[a.id || ""]
      );
      for (const a of pending) {
        try {
          const rev = await reverseGeocode(a.location as any);
          if (rev && a.id) {
            setAddressCache((prev) => ({
              ...prev,
              [a.id!]: {
                formatted: rev.formattedAddress,
                placeId: rev.placeId,
              },
            }));
            // Best-effort persist to Firestore so others see it too
            try {
              await updatePanicAlert(
                a.id!,
                {
                  address: {
                    formatted: rev.formattedAddress,
                    placeId: rev.placeId,
                  },
                } as any,
                a.uid
              );
            } catch {}
          }
        } catch {}
      }
    }
    if (panicAlerts.length) fillAddresses();
  }, [panicAlerts, addressCache]);

  async function markReviewed(r: CrimeReport, reviewed: boolean) {
    try {
      await updateCrimeReport(
        r.id!,
        { reviewed, reviewerUid: user?.uid },
        r.uid
      );
      setCrimeReports((prev) =>
        prev.map((x) =>
          x.id === r.id ? { ...x, reviewed, reviewerUid: user?.uid } : x
        )
      );
    } catch (e) {
      console.error(e);
      alert("Failed to update report");
    }
  }

  async function setTriage(
    r: CrimeReport,
    status: CrimeReport["triageStatus"]
  ) {
    try {
      await updateCrimeReport(r.id!, { triageStatus: status }, r.uid);
      setCrimeReports((prev) =>
        prev.map((x) => (x.id === r.id ? { ...x, triageStatus: status } : x))
      );
    } catch (e) {
      console.error(e);
      alert("Failed to update triage status");
    }
  }

  const hasAccess = !!(
    profile &&
    (profile.isAdmin ||
      profile.canAccessAdmin ||
      profile.role === "admin" ||
      profile.role === "law" ||
      profile.role === "security")
  );

  async function acknowledgeAlert(a: PanicAlert) {
    try {
      await updatePanicAlert(
        a.id!,
        { status: "acknowledged", responderUid: user?.uid || null },
        a.uid,
        (a as any).userAlertId || null
      );
    } catch (e) {
      console.error(e);
      alert("Failed to acknowledge alert");
    }
  }

  async function resolveAlert(a: PanicAlert) {
    // Enforce ordering: must be acknowledged before resolving
    if (a.status !== "acknowledged") {
      alert("Please acknowledge the alert before resolving.");
      return;
    }
    try {
      await updatePanicAlert(
        a.id!,
        { status: "resolved", responderUid: user?.uid || null },
        a.uid,
        (a as any).userAlertId || null
      );
    } catch (e) {
      console.error(e);
      alert("Failed to resolve alert");
    }
  }

  // Utilities for directions and nearest station
  function mapsDirectionsUrl(lat: number, lng: number) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
  }

  function haversineKm(
    a: { lat: number; lng: number },
    b: { lat: number; lng: number }
  ) {
    const R = 6371; // km
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const la1 = (a.lat * Math.PI) / 180;
    const la2 = (b.lat * Math.PI) / 180;
    const sinDLat = Math.sin(dLat / 2);
    const sinDLng = Math.sin(dLng / 2);
    const h =
      sinDLat * sinDLat + Math.cos(la1) * Math.cos(la2) * sinDLng * sinDLng;
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    return R * c;
  }

  function getNearestStation(loc?: { lat: number; lng: number }) {
    if (!loc || !policeStations?.length) return null;
    let best: { station: PoliceStation; dist: number } | null = null;
    for (const s of policeStations) {
      const sLat = (s as any).lat ?? (s as any).location?.lat;
      const sLng = (s as any).lng ?? (s as any).location?.lng;
      if (typeof sLat !== "number" || typeof sLng !== "number") continue;
      const d = haversineKm(loc, { lat: sLat, lng: sLng });
      if (!best || d < best.dist) best = { station: s, dist: d };
    }
    return best;
  }

  return (
    <div style={{ padding: 16, background: BRAND.bg, minHeight: "100%" }}>
      <h1 style={{ marginTop: 0, color: BRAND.purple }}>Admin Dashboard</h1>
      {profile && !hasAccess && (
        <div
          style={{
            background: "#FEF3C7",
            color: "#92400E",
            padding: 12,
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          Access denied. This page is restricted to administrators.
        </div>
      )}
      {error && (
        <div
          style={{
            background: "#FEE2E2",
            color: "#991B1B",
            padding: 12,
            borderRadius: 8,
            marginBottom: 12,
            whiteSpace: "pre-wrap",
          }}
        >
          {error}
        </div>
      )}
      {loading ? (
        <div>Loading…</div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 24,
            maxWidth: 1100,
            margin: "0 auto",
          }}
        >
          <section>
            <h2 style={{ color: BRAND.blue, margin: "0 0 12px" }}>
              Live Panic Alerts ({panicAlerts.length})
            </h2>
            {/* Guidance banner: enforce acknowledge-before-resolve */}
            <div
              style={{
                background: "#EFF6FF",
                border: `1.5px solid ${BRAND.blue}`,
                color: "#1F2937",
                padding: 10,
                borderRadius: 10,
                margin: "0 0 12px",
                fontSize: 13,
              }}
            >
              Note: Resolve is only enabled after an alert has been acknowledged
              first. Use “Acknowledge” to notify the system that you’re
              responding.
            </div>
            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              }}
            >
              {panicAlerts.map((a) => (
                <div
                  key={a.id}
                  style={{
                    border: `1.5px solid ${BRAND.border}`,
                    borderRadius: 12,
                    background: "#fff",
                    padding: 12,
                    display: "grid",
                    gap: 8,
                  }}
                >
                  {/* Per-card banner for OPEN alerts */}
                  {a.status === "open" && (
                    <div
                      style={{
                        background: "#FEF3C7",
                        border: "1.5px solid #FBBF24",
                        color: "#ce1e53ff",
                        padding: 8,
                        borderRadius: 10,
                        fontSize: 12,
                      }}
                    >
                      Action required: acknowledge this alert to enable
                      resolution.
                    </div>
                  )}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <strong style={{ color: BRAND.purple }}>
                      Panic alert {a.name ? `• ${a.name}` : ""}
                    </strong>
                    <span
                      style={chipSolid(
                        STATUS_COLORS[a.status || "open"] || BRAND.purple
                      )}
                    >
                      {a.status?.toUpperCase?.() || "OPEN"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {a.location && (
                      <a
                        href={mapsDirectionsUrl(a.location.lat, a.location.lng)}
                        target="_blank"
                        rel="noreferrer"
                        style={{ ...chip(BRAND.blue), textDecoration: "none" }}
                      >
                        Go to panic location
                      </a>
                    )}
                    {(a as any).liveTrackingUrl && (
                      <a
                        href={(a as any).liveTrackingUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ ...chip("#10B981"), textDecoration: "none" }}
                      >
                        Live
                      </a>
                    )}
                    {a.selfieUrl && (
                      <a
                        href={a.selfieUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ ...chip(), textDecoration: "none" }}
                      >
                        View User Selfie
                      </a>
                    )}
                    {a.respondedAt && (
                      <span style={chipSoft(BRAND.blue)}>
                        Acknowledged:{" "}
                        {new Date(
                          (a as any).respondedAt?.toDate?.() ||
                            (a as any).respondedAt
                        ).toLocaleString()}
                      </span>
                    )}
                    {a.resolvedAt && (
                      <span style={chipSoft(BRAND.pink)}>
                        Resolved:{" "}
                        {new Date(
                          (a as any).resolvedAt?.toDate?.() ||
                            (a as any).resolvedAt
                        ).toLocaleString()}
                      </span>
                    )}
                  </div>
                  {(a.address?.formatted ||
                    (a.id && addressCache[a.id]?.formatted)) && (
                    <div style={{ color: "#374151", fontSize: 13 }}>
                      {a.address?.formatted ||
                        (a.id ? addressCache[a.id]?.formatted : "")}
                    </div>
                  )}
                  {/* Nearest station enrichment */}
                  {a.location &&
                    (() => {
                      const nearest = getNearestStation(a.location);
                      if (!nearest) return null;
                      const st = nearest.station as any;
                      const phone =
                        st.phone ||
                        st.contactNumber ||
                        st.tel ||
                        st.phoneNumber;
                      return (
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                            alignItems: "center",
                            color: "#111827",
                            fontSize: 13,
                          }}
                        >
                          <span style={chip("#D1FAE5")}>
                            Nearest station: {st.name || st.title || "Unknown"}
                            {typeof nearest.dist === "number"
                              ? ` • ${nearest.dist.toFixed(1)} km`
                              : ""}
                          </span>
                          {phone && (
                            <a
                              href={`tel:${String(phone).replace(/\s+/g, "")}`}
                              style={{
                                ...btnOutline("#10B981"),
                                textDecoration: "none",
                              }}
                            >
                              Call station
                            </a>
                          )}
                        </div>
                      );
                    })()}
                  {/* Timeline */}
                  <div
                    style={{
                      borderTop: `1px solid ${BRAND.border}`,
                      paddingTop: 8,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: "#374151",
                        display: "grid",
                        gap: 4,
                      }}
                    >
                      <div>
                        <strong>Created:</strong>{" "}
                        {new Date(
                          (a as any).createdAt?.toDate?.() ||
                            (a as any).createdAt ||
                            Date.now()
                        ).toLocaleString()}
                      </div>
                      <div>
                        <strong>Acknowledged:</strong>{" "}
                        {a.respondedAt
                          ? new Date(
                              (a as any).respondedAt?.toDate?.() ||
                                (a as any).respondedAt
                            ).toLocaleString()
                          : "—"}
                        {a.respondedAt && (a as any).responderUid
                          ? ` • by ${
                              userNameCache[(a as any).responderUid] ||
                              "Responder"
                            }`
                          : ""}
                      </div>
                      <div>
                        <strong>Resolved:</strong>{" "}
                        {a.resolvedAt
                          ? new Date(
                              (a as any).resolvedAt?.toDate?.() ||
                                (a as any).resolvedAt
                            ).toLocaleString()
                          : "—"}
                        {a.resolvedAt && (a as any).responderUid
                          ? ` • by ${
                              userNameCache[(a as any).responderUid] ||
                              "Responder"
                            }`
                          : ""}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {(() => {
                      const canAck = a.status === "open";
                      const ackIsSolid =
                        a.status === "acknowledged" || a.status === "resolved";
                      const ackLabel = ackIsSolid
                        ? "Acknowledged"
                        : "Acknowledge";

                      const canResolve = a.status === "acknowledged"; // only after acknowledged
                      const resolveIsSolid = a.status === "resolved";
                      const resolveLabel = resolveIsSolid
                        ? "Resolved"
                        : "Resolve";
                      return (
                        <>
                          <button
                            onClick={() => canAck && acknowledgeAlert(a)}
                            disabled={!canAck}
                            style={
                              ackIsSolid
                                ? btnOutline(BRAND.purple)
                                : btnSolid(BRAND.purple)
                            }
                          >
                            {ackLabel}
                          </button>
                          <button
                            onClick={() => canResolve && resolveAlert(a)}
                            disabled={!canResolve}
                            style={
                              resolveIsSolid
                                ? btnOutline(BRAND.pink)
                                : btnSolid(BRAND.pink)
                            }
                          >
                            {resolveLabel}
                          </button>
                        </>
                      );
                    })()}
                  </div>
                </div>
              ))}
              {panicAlerts.length === 0 && (
                <div style={{ color: BRAND.gray, fontSize: 14 }}>
                  No live alerts.
                </div>
              )}
            </div>
          </section>

          {hasAccess && (
            <section>
              <h2 style={{ margin: "0 0 12px", color: BRAND.blue }}>
                Police Stations Data (Admin)
              </h2>
              <div
                style={{
                  display: "grid",
                  gap: 8,
                  border: `1.5px solid ${BRAND.border}`,
                  background: "#fff",
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <div style={{ color: BRAND.gray, fontSize: 13 }}>
                  Paste lines like: "Alexandra (Gauteng) (Phone: 011-3217621
                  E-mail: ALEXANDRA-SAPS@saps.gov.za)". We'll geocode and
                  import. Country assumed ZA.
                </div>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Paste Gauteng stations list here"
                  rows={6}
                  style={{
                    width: "100%",
                    border: `1.5px solid ${BRAND.border}`,
                    borderRadius: 10,
                    padding: 10,
                    fontFamily: "inherit",
                    fontSize: 13,
                  }}
                />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    disabled={importing || !importText.trim()}
                    onClick={async () => {
                      setImporting(true);
                      setImportNote("");
                      try {
                        const lines = importText
                          .split(/\r?\n/)
                          .map((l) => l.trim())
                          .filter((l) => !!l);
                        let successes: PoliceStation[] = [];
                        let fail = 0;
                        for (const ln of lines) {
                          // Parse "Name (Gauteng) (Phone: ... E-mail: ... )"
                          const name = ln.split("(Gauteng)")[0]?.trim();
                          const phoneMatch = ln.match(/Phone:\s*([^\)]+)\)?/i);
                          const emailMatch = ln.match(
                            /E-?mail:\s*([^\)]+)\)?/i
                          );
                          const phoneRaw =
                            phoneMatch?.[1]?.split(/E-?mail:/i)[0]?.trim() ||
                            "";
                          const phone =
                            phoneRaw.split(/[;,]/)[0]?.trim() || undefined;
                          const email = emailMatch?.[1]?.trim();
                          if (!name) {
                            fail++;
                            continue;
                          }
                          const query = `${name} Police Station, Gauteng, South Africa`;
                          const geo = await geocodePlace(query);
                          if (!geo) {
                            fail++;
                            continue;
                          }
                          successes.push({
                            name,
                            location: { lat: geo.lat, lng: geo.lng },
                            phone,
                            email,
                            address: geo.formattedAddress,
                          });
                          // small delay to avoid rate limit
                          await new Promise((r) => setTimeout(r, 150));
                        }
                        if (successes.length) {
                          await upsertPoliceStations(successes);
                        }
                        setImportNote(
                          `Imported ${successes.length} station(s)` +
                            (fail ? `, ${fail} failed to geocode` : "")
                        );
                      } catch (e: any) {
                        setImportNote(e?.message || "Import failed");
                      } finally {
                        setImporting(false);
                      }
                    }}
                    style={btnSolid(BRAND.blue)}
                  >
                    {importing ? "Importing…" : "Parse and import (geocode)"}
                  </button>
                  {importNote && (
                    <div style={{ color: "#374151", fontSize: 13 }}>
                      {importNote}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          <section>
            <h2 style={{ margin: "0 0 12px", color: BRAND.blue }}>
              Public Crime Reports ({crimeReports.length})
            </h2>
            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              }}
            >
              {crimeReports.map((r) => (
                <div
                  key={r.id}
                  style={{
                    border: `1.5px solid ${BRAND.border}`,
                    borderRadius: 12,
                    background: "#fff",
                    padding: 12,
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <strong style={{ color: BRAND.purple }}>
                      {r.type} {r.category ? `• ${r.category}` : ""}
                    </strong>
                    <span style={{ fontSize: 12, color: BRAND.gray }}>
                      {r.status.toUpperCase()}{" "}
                      {r.province ? `• ${r.province}` : ""}
                    </span>
                  </div>
                  {r.description && (
                    <div style={{ fontSize: 14, color: "#111827" }}>
                      {r.description}
                    </div>
                  )}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <span style={chip()}>
                      {r.occurredAt
                        ? new Date(
                            (r as any).occurredAt?.toDate?.() ||
                              (r as any).occurredAt
                          ).toLocaleString()
                        : "No time"}
                    </span>
                    {r.location && (
                      <span style={chip()}>
                        {r.location.lat.toFixed(4)}, {r.location.lng.toFixed(4)}
                      </span>
                    )}
                    <span style={chip(r.reviewed ? BRAND.pink : BRAND.purple)}>
                      {r.reviewed ? "Reviewed" : "Unreviewed"}
                    </span>
                    <span style={chip()}>{r.triageStatus || "new"}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      onClick={() => markReviewed(r, !r.reviewed)}
                      style={btnOutline(r.reviewed ? BRAND.pink : BRAND.purple)}
                    >
                      {r.reviewed ? "Mark Unreviewed" : "Mark Reviewed"}
                    </button>
                    <select
                      value={r.triageStatus || "new"}
                      onChange={(e) => setTriage(r, e.target.value as any)}
                      style={{
                        ...btnBase(),
                        border: `1.5px solid ${BRAND.border}`,
                      }}
                    >
                      <option value="new">new</option>
                      <option value="triaged">triaged</option>
                      <option value="escalated">escalated</option>
                      <option value="closed">closed</option>
                    </select>
                  </div>
                </div>
              ))}
              {crimeReports.length === 0 && (
                <div style={{ color: BRAND.gray, fontSize: 14 }}>
                  No crime reports yet.
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 style={{ margin: "0 0 12px", color: BRAND.blue }}>
              User Incident Logs ({incidents.length})
            </h2>
            <div
              style={{
                display: "grid",
                gap: 10,
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              }}
            >
              {incidents.map((i, idx) => (
                <div
                  key={i.id || idx}
                  style={{
                    border: `1.5px solid ${BRAND.border}`,
                    borderRadius: 12,
                    background: "#fff",
                    padding: 12,
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <strong style={{ color: BRAND.purple }}>
                      {i.type}
                      {i.category ? ` • ${i.category}` : ""}
                    </strong>
                    {i.province && (
                      <span style={{ fontSize: 12, color: BRAND.gray }}>
                        {i.province}
                      </span>
                    )}
                  </div>
                  {i.notes && (
                    <div style={{ fontSize: 14, overflowWrap: "anywhere" }}>
                      {i.notes}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={chip()}>
                      {i.occurredAt
                        ? new Date(
                            (i as any).occurredAt?.toDate?.() ||
                              (i as any).occurredAt
                          ).toLocaleString()
                        : "No time"}
                    </span>
                    {i.location && (
                      <span style={chip()}>
                        {i.location.lat.toFixed(4)}, {i.location.lng.toFixed(4)}
                      </span>
                    )}
                    {i.uid && <span style={chip()}>uid: {i.uid}</span>}
                  </div>
                </div>
              ))}
              {incidents.length === 0 && (
                <div style={{ color: BRAND.gray, fontSize: 14 }}>
                  No user incidents yet.
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function chip(color = "#E5E7EB"): React.CSSProperties {
  return {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    background: color === "#E5E7EB" ? "#F3F4F6" : color + "22",
    border: `1.5px solid ${color}`,
    color: "#374151",
    fontSize: 12,
    maxWidth: "100%",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  } as React.CSSProperties;
}

function btnBase(): React.CSSProperties {
  return {
    borderRadius: 10,
    padding: "8px 12px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    background: "#fff",
  } as React.CSSProperties;
}

function btnOutline(color: string): React.CSSProperties {
  return {
    ...btnBase(),
    border: `1.5px solid ${color}`,
    color,
  } as React.CSSProperties;
}

function btnSolid(color: string): React.CSSProperties {
  return {
    ...btnBase(),
    background: color,
    border: `1.5px solid ${color}`,
    color: "#fff",
  } as React.CSSProperties;
}

function chipSolid(color: string): React.CSSProperties {
  return {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    background: color,
    border: `1.5px solid ${color}`,
    color: "#fff",
    fontSize: 12,
    maxWidth: "100%",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  } as React.CSSProperties;
}

function chipSoft(color: string): React.CSSProperties {
  return {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    background: color + "22",
    border: `1.5px solid ${color}`,
    color: "#374151",
    fontSize: 12,
    maxWidth: "100%",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  } as React.CSSProperties;
}
