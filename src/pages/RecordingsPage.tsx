import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  listRecordings,
  deleteRecording,
  type RecordingEntry,
  listCloudRecordings,
  deleteCloudRecording,
  type CloudRecording,
} from "../lib/api";
import {
  getUserSettings,
  setUserSettings,
  type UserSettings,
} from "../lib/data";

const BRAND = {
  purple: "#8764C1",
  blue: "#87A5DC",
  pink: "#EC96BE",
  purpleLight: "#F3EFFC",
  blueLight: "#EFF5FC",
  pinkLight: "#FDF3F8",
};

export default function RecordingsPage() {
  const { user } = useAuth();
  const [localItems, setLocalItems] = useState<RecordingEntry[]>([]);
  const [cloudItems, setCloudItems] = useState<CloudRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlockNeeded, setUnlockNeeded] = useState(false);
  const [hasHash, setHasHash] = useState(false);
  const [passInput, setPassInput] = useState("");
  const [passConfirm, setPassConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!user) return;
        const settings = (await getUserSettings(user.uid)) || {};
        const hash = settings.recordingsPasswordHash;
        const sessionKey = `rec_unlock_${user.uid}`;
        const unlocked = sessionStorage.getItem(sessionKey) === "1";
        setHasHash(!!hash);
        setUnlockNeeded(!!hash && !unlocked);
        if (!hash || unlocked) {
          const [loc, cloud] = await Promise.all([
            listRecordings().catch(() => []),
            listCloudRecordings(user.uid).catch(() => []),
          ]);
          if (alive) {
            setLocalItems(loc);
            setCloudItems(cloud);
          }
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  const combinedEmpty = useMemo(
    () => localItems.length === 0 && cloudItems.length === 0,
    [localItems, cloudItems]
  );

  async function sha256Hex(text: string): Promise<string> {
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest("SHA-256", enc.encode(text));
    const arr = Array.from(new Uint8Array(buf));
    return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  async function handleUnlock() {
    if (!user) return;
    setError(null);
    const settings = (await getUserSettings(user.uid)) || {};
    const hash = settings.recordingsPasswordHash || "";
    const attempt = await sha256Hex(passInput);
    if (attempt !== hash) {
      setError("Incorrect password");
      return;
    }
    sessionStorage.setItem(`rec_unlock_${user.uid}`, "1");
    setUnlockNeeded(false);
    setLoading(true);
    try {
      const [loc, cloud] = await Promise.all([
        listRecordings().catch(() => []),
        listCloudRecordings(user.uid).catch(() => []),
      ]);
      setLocalItems(loc);
      setCloudItems(cloud);
    } finally {
      setLoading(false);
    }
  }

  async function handleSetPassword() {
    if (!user) return;
    setError(null);
    if (!passInput || passInput !== passConfirm) {
      setError("Passwords do not match");
      return;
    }
    const hash = await sha256Hex(passInput);
    const existing = (await getUserSettings(user.uid)) || {};
    const payload: UserSettings = { ...existing, recordingsPasswordHash: hash };
    await setUserSettings(user.uid, payload);
    sessionStorage.setItem(`rec_unlock_${user.uid}`, "1");
    setHasHash(true);
    setUnlockNeeded(false);
  }

  if (unlockNeeded) {
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
        <div style={{ maxWidth: 420, width: "100%" }}>
          <div
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: "20px 20px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              border: "2px solid #E5E7EB",
              display: "grid",
              gap: 12,
            }}
          >
            <strong style={{ color: "#1F2937", fontSize: 16 }}>
              Enter recordings password
            </strong>
            <input
              type="password"
              value={passInput}
              onChange={(e) => setPassInput(e.target.value)}
              placeholder="Password"
              style={{ border: "1.5px solid #E5E7EB", borderRadius: 12, padding: 12 }}
            />
            {error && <div style={{ color: "#B91C1C", fontSize: 12 }}>{error}</div>}
            <button
              onClick={handleUnlock}
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                border: "none",
                background: BRAND.purple,
                color: "#fff",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Unlock
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (user && !hasHash) {
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
        <div style={{ maxWidth: 420, width: "100%" }}>
          <div
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: "20px 20px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              border: "2px solid #E5E7EB",
              display: "grid",
              gap: 12,
            }}
          >
            <strong style={{ color: "#1F2937", fontSize: 16 }}>
              Set a password for recordings
            </strong>
            <input
              type="password"
              value={passInput}
              onChange={(e) => setPassInput(e.target.value)}
              placeholder="New password"
              style={{ border: "1.5px solid #E5E7EB", borderRadius: 12, padding: 12 }}
            />
            <input
              type="password"
              value={passConfirm}
              onChange={(e) => setPassConfirm(e.target.value)}
              placeholder="Confirm password"
              style={{ border: "1.5px solid #E5E7EB", borderRadius: 12, padding: 12 }}
            />
            {error && <div style={{ color: "#B91C1C", fontSize: 12 }}>{error}</div>}
            <button
              onClick={handleSetPassword}
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                border: "none",
                background: BRAND.purple,
                color: "#fff",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Save Password
            </button>
          </div>
        </div>
      </div>
    );
  }

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
      <div style={{ maxWidth: 760, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <h1
            style={{
              color: BRAND.purple,
              margin: "0 0 6px 0",
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            Recordings
          </h1>
          <div style={{ color: "#6B7280", fontSize: 14 }}>
            Saved in the cloud when online; also kept locally on this device.
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: "20px 20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            border: "2px solid #E5E7EB",
          }}
        >
          {loading ? (
            <div style={{ padding: 16 }}>Loading…</div>
          ) : combinedEmpty ? (
            <div style={{ padding: 16, color: "#6B7280" }}>No recordings yet.</div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {cloudItems.map((it) => {
                const date = new Date((it as any).createdAt?.toDate?.() || (it as any).createdAt || Date.now());
                const pretty = date.toLocaleString();
                const link = (it as any).downloadUrl as string | undefined;
                const sizeKB = Math.round(((it as any).size || 0) / 1024);
                return (
                  <li
                    key={`cloud-${it.id}`}
                    style={{
                      padding: "12px 8px",
                      borderBottom: "1px solid #F3F4F6",
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ color: "#1F2937", fontWeight: 700 }}>
                        {pretty}
                        <span style={{ color: "#6B7280", marginLeft: 8, fontWeight: 500 }}>
                          {sizeKB} KB
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        {link && (
                          <a
                            href={link}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              padding: "8px 10px",
                              borderRadius: 10,
                              border: `2px solid ${BRAND.blue}`,
                              background: "transparent",
                              color: BRAND.blue,
                              fontWeight: 800,
                              textDecoration: "none",
                            }}
                          >
                            Open
                          </a>
                        )}
                        {link && navigator.share && (
                          <button
                            onClick={() => navigator.share({ title: it.name, url: link })}
                            style={{
                              padding: "8px 10px",
                              borderRadius: 10,
                              border: `2px solid ${BRAND.purple}`,
                              background: "transparent",
                              color: BRAND.purple,
                              fontWeight: 800,
                              cursor: "pointer",
                            }}
                          >
                            Share
                          </button>
                        )}
                        <button
                          onClick={async () => {
                            if (!user) return;
                            await deleteCloudRecording(user.uid, it);
                            setCloudItems((prev) => prev.filter((p) => p.id !== it.id));
                          }}
                          style={{
                            padding: "8px 10px",
                            borderRadius: 10,
                            border: `2px solid ${BRAND.pink}`,
                            background: "transparent",
                            color: BRAND.pink,
                            fontWeight: 800,
                            cursor: "pointer",
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {link ? (
                      <audio src={link} preload="metadata" controls style={{ width: "100%" }} />
                    ) : null}
                  </li>
                );
              })}
              {localItems.map((it) => {
                const url = URL.createObjectURL(it.blob);
                const date = new Date(it.createdAt);
                const pretty = date.toLocaleString();
                const sizeKB = Math.round(it.blob.size / 1024);
                return (
                  <li
                    key={`local-${it.name}`}
                    style={{
                      padding: "12px 8px",
                      borderBottom: "1px solid #F3F4F6",
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ color: "#1F2937", fontWeight: 700 }}>
                        {pretty}
                        <span style={{ color: "#6B7280", marginLeft: 8, fontWeight: 500 }}>
                          {sizeKB} KB
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <a
                          href={url}
                          download={it.name}
                          style={{
                            padding: "8px 10px",
                            borderRadius: 10,
                            border: `2px solid ${BRAND.blue}`,
                            background: "transparent",
                            color: BRAND.blue,
                            fontWeight: 800,
                            textDecoration: "none",
                          }}
                        >
                          Download
                        </a>
                        <button
                          onClick={async () => {
                            await deleteRecording(it.name);
                            setLocalItems((prev) => prev.filter((p) => p.name !== it.name));
                          }}
                          style={{
                            padding: "8px 10px",
                            borderRadius: 10,
                            border: `2px solid ${BRAND.pink}`,
                            background: "transparent",
                            color: BRAND.pink,
                            fontWeight: 800,
                            cursor: "pointer",
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <audio src={url} preload="metadata" controls style={{ width: "100%" }} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
