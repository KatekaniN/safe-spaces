import React from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  CrimeReport,
  Incident,
  PanicAlert,
  PanicAlertStatus,
  updateCrimeReport,
  updatePanicAlert,
  upsertPoliceStations,
  getUserProfile,
  UserProfile,
} from "../lib/data";
import { DEMO_POLICE_STATIONS } from "../lib/policeStationsSeed";
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
  pink: "#EC96BE",
  blue: "#87A5DC",
  gray: "#6B7280",
  border: "#E5E7EB",
  bg: "#FAFAFA",
};

export default function AdminPage() {
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [crimeReports, setCrimeReports] = React.useState<CrimeReport[]>([]);
  const [incidents, setIncidents] = React.useState<
    (Incident & { uid?: string })[]
  >([]);
  const [panicAlerts, setPanicAlerts] = React.useState<PanicAlert[]>([]);
  const [seedBusy, setSeedBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);

  React.useEffect(() => {
    let unsub1: undefined | (() => void);
    let unsub2: undefined | (() => void);
    let unsub3: undefined | (() => void);
    let loaded1 = false;
    let loaded2 = false;
    let loaded3 = false;
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
          loaded3 = true;
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
            loaded3 = true;
            maybeDone();
          },
          (err) => {
            setError(err?.message || "Failed to subscribe to panic alerts");
            loaded3 = true;
            maybeDone();
          }
        );
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
    };
  }, [user]);

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

  async function acknowledgeAlert(alert: PanicAlert) {
    if (!alert.id) return;
    try {
      await updatePanicAlert(
        alert.id,
        {
          status: "acknowledged",
          responderUid: user?.uid,
        },
        alert.uid
      );
    } catch (e) {
      console.error(e);
      alertUser("Failed to acknowledge alert");
    }
  }

  async function resolveAlert(alert: PanicAlert) {
    if (!alert.id) return;
    try {
      await updatePanicAlert(
        alert.id,
        {
          status: "resolved",
          responderUid: user?.uid,
        },
        alert.uid
      );
    } catch (e) {
      console.error(e);
      alertUser("Failed to resolve alert");
    }
  }

  function alertUser(message: string) {
    if (typeof window !== "undefined") {
      window.alert(message);
    }
  }

  async function seedStations() {
    if (seedBusy) return;
    try {
      setSeedBusy(true);
      await upsertPoliceStations(DEMO_POLICE_STATIONS);
      alertUser("Seeded demo police stations.");
    } catch (e) {
      console.error(e);
      alertUser("Failed to seed police stations");
    } finally {
      setSeedBusy(false);
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

  return (
    <div style={{ padding: 16, background: BRAND.bg, minHeight: "100%" }}>
      <h1 style={{ marginTop: 0 }}>Admin Dashboard</h1>
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
            <h2 style={{ margin: "0 0 12px" }}>
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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                margin: "0 0 12px",
              }}
            >
              <h2 style={{ margin: 0 }}>
                Live Panic Alerts ({panicAlerts.length})
              </h2>
              {hasAccess && (
                <button
                  onClick={seedStations}
                  style={btnOutline(BRAND.purple)}
                  disabled={seedBusy}
                >
                  {seedBusy ? "Seeding…" : "Seed Demo Stations"}
                </button>
              )}
            </div>
            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              }}
            >
              {panicAlerts.map((alert) => {
                const createdAt = formatTimestamp(alert.createdAt);
                const respondedAt = formatTimestamp(alert.respondedAt);
                const resolvedAt = formatTimestamp(alert.resolvedAt);
                return (
                  <div
                    key={alert.id}
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
                      <strong style={{ color: BRAND.pink }}>Panic Alert</strong>
                      <span style={chip(chipColor(alert.status))}>
                        {alert.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: BRAND.gray }}>
                      Created: {createdAt || "Unknown"}
                    </div>
                    {respondedAt && (
                      <div style={{ fontSize: 13, color: BRAND.gray }}>
                        Acknowledged: {respondedAt}
                      </div>
                    )}
                    {resolvedAt && (
                      <div style={{ fontSize: 13, color: BRAND.gray }}>
                        Resolved: {resolvedAt}
                      </div>
                    )}
                    {alert.location && (
                      <div style={{ fontSize: 13 }}>
                        Location: {alert.location.lat.toFixed(4)},{" "}
                        {alert.location.lng.toFixed(4)}
                      </div>
                    )}
                    {alert.nearestStation && (
                      <div style={{ fontSize: 13 }}>
                        Station: {alert.nearestStation.name}
                        {alert.nearestStation.distanceKm !== undefined && (
                          <span>
                            {" "}
                            • {alert.nearestStation.distanceKm.toFixed(1)}
                            km
                          </span>
                        )}
                        {alert.nearestStation.phone && (
                          <div>📞 {alert.nearestStation.phone}</div>
                        )}
                        {alert.nearestStation.email && (
                          <div>✉️ {alert.nearestStation.email}</div>
                        )}
                      </div>
                    )}
                    {alert.userSnapshot && (
                      <div style={{ fontSize: 13 }}>
                        User: {alert.userSnapshot.name || "Unknown"}
                        {alert.userSnapshot.phone && (
                          <div>📱 {alert.userSnapshot.phone}</div>
                        )}
                        {alert.userSnapshot.email && (
                          <div>✉️ {alert.userSnapshot.email}</div>
                        )}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {alert.status === "open" && (
                        <button
                          onClick={() => acknowledgeAlert(alert)}
                          style={btnSolid(BRAND.pink)}
                        >
                          Acknowledge
                        </button>
                      )}
                      {alert.status !== "resolved" && (
                        <button
                          onClick={() => resolveAlert(alert)}
                          style={btnOutline(BRAND.purple)}
                        >
                          Mark Resolved
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {panicAlerts.length === 0 && (
                <div style={{ color: BRAND.gray, fontSize: 14 }}>
                  No panic alerts yet.
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 style={{ margin: "0 0 12px" }}>
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
    border: `1.5px solid ${color}`,
    background: color,
    color: "#fff",
  } as React.CSSProperties;
}

function formatTimestamp(value: any): string | null {
  if (!value) return null;
  const maybeDate =
    typeof value?.toDate === "function" ? value.toDate() : value;
  const date = maybeDate instanceof Date ? maybeDate : new Date(maybeDate);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
}

function chipColor(status: PanicAlertStatus): string {
  switch (status) {
    case "open":
      return BRAND.pink;
    case "acknowledged":
      return BRAND.blue;
    case "resolved":
      return "#10B981";
    default:
      return "#E5E7EB";
  }
}
