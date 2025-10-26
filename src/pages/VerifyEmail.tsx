import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { auth } from "../lib/firebase";
import { useNavigate } from "react-router-dom";

const BRAND = {
  purple: "#8764C1",
  pink: "#EC96BE",
};

export default function VerifyEmailPage() {
  const { user, sendVerification, signOut } = useAuth();
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function resend() {
    setError(null);
    setInfo(null);
    try {
      setBusy(true);
      await sendVerification();
      setInfo("Verification email sent. Please check your inbox.");
    } catch (e: any) {
      setError(e?.message || "Failed to send verification email");
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    setError(null);
    setInfo(null);
    try {
      setBusy(true);
      await auth.currentUser?.reload();
      if (auth.currentUser?.emailVerified) {
        navigate("/", { replace: true });
      } else {
        setInfo("Still not verified. Please check your email and try again.");
      }
    } catch (e: any) {
      setError(e?.message || "Failed to refresh");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 520, margin: "40px auto" }}>
      <h1 style={{ marginTop: 0 }}>Verify your email</h1>
      <p style={{ color: "#374151" }}>
        We sent a verification link to {user?.email}. Please click the link to
        verify your account before using the app.
      </p>
      {info && (
        <div
          style={{
            background: "#ECFDF5",
            color: "#065F46",
            padding: 12,
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          {info}
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
          }}
        >
          {error}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={resend}
          disabled={busy}
          style={btnOutline(BRAND.purple)}
        >
          Resend email
        </button>
        <button
          onClick={refresh}
          disabled={busy}
          style={btnSolid(BRAND.purple)}
        >
          I verified, refresh
        </button>
        <button onClick={signOut} style={btnOutline("#6B7280")}>
          Sign out
        </button>
      </div>
    </div>
  );
}

function btnSolid(color: string): React.CSSProperties {
  return {
    padding: "10px 14px",
    borderRadius: 10,
    background: color,
    color: "#fff",
    border: "none",
    fontWeight: 800,
    cursor: "pointer",
  } as React.CSSProperties;
}

function btnOutline(color: string): React.CSSProperties {
  return {
    padding: "10px 14px",
    borderRadius: 10,
    background: "transparent",
    color,
    border: `2px solid ${color}`,
    fontWeight: 800,
    cursor: "pointer",
  } as React.CSSProperties;
}
