import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { getUserProfile, reservePhone, setUserProfile } from "../lib/data";
import logoUrl from "../assets/safe-spaces.png";

const BRAND = {
  purple: "#8764C1",
  lightpurple: "#dbbaf4ff",
  blue: "#87A5DC",
  lightpink: "#ebbcd2ff",
  pink: "#EC96BE",
  purpleLight: "#F3EFFC",
};

export default function AuthPage() {
  const { user, loading, signIn, sendEmailLink } = useAuth();
  const [step, setStep] = useState<"welcome" | "signup" | "signin">("welcome");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState<string>(() => localStorage.getItem("phoneForSignIn") || "");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [agree, setAgree] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const navigate = useNavigate();

  // If we're already signed in, make sure phone exists then enter app
  useEffect(() => {
    async function syncPhoneAndEnter() {
      if (!user) return;
      try {
        const pendingJson = window.localStorage.getItem("pendingProfile");
        const pending = pendingJson ? JSON.parse(pendingJson) as { phone?: string; name?: string } : undefined;
        const storedPhone = pending?.phone || window.localStorage.getItem("phoneForSignIn") || phone;
        if (storedPhone) {
          const e164 = normalizePhone(storedPhone);
          if (!e164) throw new Error("Please enter a valid mobile number");
          const prof = await getUserProfile(user.uid);
          // Reserve phone (idempotent for same uid)
          await reservePhone(e164, user.uid);
          const toSave: any = { phone: e164 };
          if (pending?.name && !prof?.name) toSave.name = pending.name;
          await setUserProfile(user.uid, toSave);
          window.localStorage.removeItem("phoneForSignIn");
          window.localStorage.removeItem("pendingProfile");
        }
      } catch (e) {
        // Non-fatal
        console.warn("Failed to sync phone after auth", e);
      }
      navigate("/");
    }
    if (user && !loading) {
      syncPhoneAndEnter();
    }
  }, [user, loading, navigate, phone]);

  async function handleGoogle(mode: "signin" | "signup") {
    setError(null);
    setInfo(null);
    if (mode === "signup") {
      if (!phone) return setError("Please enter your mobile number");
      if (!agree) return setError("Please agree to the terms and privacy policy");
      const e164 = normalizePhone(phone);
      if (!e164) return setError("Please enter a valid mobile number");
      window.localStorage.setItem("phoneForSignIn", e164);
      const fullName = [firstName, lastName].filter(Boolean).join(" ").trim() || undefined;
      window.localStorage.setItem("pendingProfile", JSON.stringify({ phone: e164, name: fullName }));
    }
    try {
      await signIn();
      // For signup path, profile is handled in effect above
    } catch (e: any) {
      setError(e?.message || "Google sign-in failed");
    }
  }

  async function handleSendLink(mode: "signin" | "signup") {
    setError(null);
    setInfo(null);
    if (!email) {
      setError("Enter an email address");
      return;
    }
    try {
      setSending(true);
      window.localStorage.setItem("emailForSignIn", email);
      if (mode === "signup") {
        if (!phone) return setError("Please enter your mobile number");
        if (!agree) return setError("Please agree to the terms and privacy policy");
        const e164 = normalizePhone(phone);
        if (!e164) return setError("Please enter a valid mobile number");
        window.localStorage.setItem("phoneForSignIn", e164);
        const fullName = [firstName, lastName].filter(Boolean).join(" ").trim() || undefined;
        window.localStorage.setItem("pendingProfile", JSON.stringify({ phone: e164, name: fullName }));
      }
      await sendEmailLink(email);
      setInfo(`We sent a sign-in link to ${email}. Open it on this device to complete sign-in.`);
    } catch (e: any) {
      setError(e?.message || "Failed to send email link");
    } finally {
      setSending(false);
    }
  }

  // Welcome screen
  if (step === "welcome") {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: BRAND.lightpurple, color: "#fff", position: "relative", overflow: "hidden" }}>
        {/* Gradient decoration */}
        <div style={{ position: "absolute", top: -100, right: -100, width: 300, height: 300, background: BRAND.pink, borderRadius: "50%", opacity: 0.2, filter: "blur(80px)" }} />
        <div style={{ position: "absolute", bottom: -80, left: -80, width: 280, height: 280, background: BRAND.blue, borderRadius: "50%", opacity: 0.2, filter: "blur(80px)" }} />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px", zIndex: 1 }}>
          <img src={logoUrl} alt="Safe Spaces" width={140} height={140} style={{ marginBottom: 24, filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.15))" }} />
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em", textAlign: "center" }}>Safe Spaces</h1>
          <p style={{ margin: "12px 0 0", fontSize: 16, opacity: 0.9, textAlign: "center", maxWidth: 340, lineHeight: 1.5 }}>
            Your trusted companion for finding safe places and help when you need it most.
          </p>
        </div>

        <div style={{ padding: "0 20px 32px", zIndex: 1 }}>
          <button onClick={() => setStep("signup")} style={{ ...actionBtn(), background: "#fff", color: BRAND.purple, marginBottom: 12 }}>
            Create Account
          </button>
          <button onClick={() => setStep("signin")} style={{ ...actionBtn(), background: "transparent", color: "#fff", border: "2px solid rgba(255,255,255,0.3)" }}>
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // Sign up screen
  if (step === "signup") {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "#FAFAFA" }}>
        <header style={{ background: "#fff", borderBottom: "1px solid #E5E7EB", padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setStep("welcome")} style={{ border: "none", background: "transparent", fontSize: 24, cursor: "pointer", padding: 4, color: BRAND.purple }}>←</button>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1F2937" }}>Create Account</h2>
        </header>

        <div style={{ flex: 1, padding: "24px 20px", display: "flex", flexDirection: "column" }}>
          {error && <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "12px 14px", borderRadius: 12, marginBottom: 16, fontSize: 14 }}>{error}</div>}
          {info && <div style={{ background: BRAND.purpleLight, color: BRAND.purple, padding: "12px 14px", borderRadius: 12, marginBottom: 16, fontSize: 14 }}>{info}</div>}

          <div style={{ display: "grid", gap: 16 }}>
            <Field label="First name" required>
              <input type="text" placeholder="e.g. Thandi" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={inputStyle()} />
            </Field>
            <Field label="Last name" required>
              <input type="text" placeholder="e.g. Mokoena" value={lastName} onChange={(e) => setLastName(e.target.value)} style={inputStyle()} />
            </Field>
            <Field label="Mobile number" required>
              <input type="tel" placeholder="e.g. 082 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle()} />
            </Field>
            <Field label="Email (optional for passwordless sign-up)">
              <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle()} />
            </Field>

            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", userSelect: "none" }}>
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: 2, cursor: "pointer" }} />
              <span style={{ color: "#6B7280", fontSize: 13, lineHeight: 1.5 }}>
                I agree to the <a href="#" style={{ color: BRAND.purple, fontWeight: 600 }}>Terms of Service</a> and <a href="#" style={{ color: BRAND.purple, fontWeight: 600 }}>Privacy Policy</a>.
              </span>
            </label>
          </div>

          <div style={{ marginTop: "auto", paddingTop: 24 }}>
            <button onClick={() => handleGoogle("signup")} style={{ ...actionBtn(), background: BRAND.purple, color: "#fff", marginBottom: 10 }}>
              Continue with Google
            </button>
            {email && (
              <button onClick={() => handleSendLink("signup")} disabled={sending} style={{ ...actionBtn(), background: BRAND.blue, color: "#fff" }}>
                {sending ? "Sending…" : "Email me a sign-up link"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Sign in screen
  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "#FAFAFA" }}>
      <header style={{ background: "#fff", borderBottom: "1px solid #E5E7EB", padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => setStep("welcome")} style={{ border: "none", background: "transparent", fontSize: 24, cursor: "pointer", padding: 4, color: BRAND.purple }}>←</button>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1F2937" }}>Sign In</h2>
      </header>

      <div style={{ flex: 1, padding: "24px 20px", display: "flex", flexDirection: "column" }}>
        {error && <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "12px 14px", borderRadius: 12, marginBottom: 16, fontSize: 14 }}>{error}</div>}
        {info && <div style={{ background: BRAND.purpleLight, color: BRAND.purple, padding: "12px 14px", borderRadius: 12, marginBottom: 16, fontSize: 14 }}>{info}</div>}

        <div style={{ display: "grid", gap: 16 }}>
          <Field label="Email (optional for passwordless sign-in)">
            <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle()} />
          </Field>
        </div>

        <div style={{ marginTop: "auto", paddingTop: 24 }}>
          <button onClick={() => handleGoogle("signin")} style={{ ...actionBtn(), background: BRAND.purple, color: "#fff", marginBottom: 10 }}>
            Continue with Google
          </button>
          {email && (
            <button onClick={() => handleSendLink("signin")} disabled={sending} style={{ ...actionBtn(), background: BRAND.blue, color: "#fff" }}>
              {sending ? "Sending…" : "Email me a sign-in link"}
            </button>
          )}
          <p style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "#6B7280" }}>
            Don't have an account?{" "}
            <button onClick={() => setStep("signup")} style={{ background: "none", border: "none", color: BRAND.purple, fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}>
              Sign up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    border: "1.5px solid #E5E7EB",
    borderRadius: 12,
    padding: "14px",
    fontSize: 15,
    outline: "none",
    width: "100%",
  } as React.CSSProperties;
}

function actionBtn(): React.CSSProperties {
  return {
    width: "100%",
    border: "none",
    borderRadius: 14,
    padding: "16px",
    fontWeight: 800,
    fontSize: 16,
    cursor: "pointer",
    transition: "transform 0.15s ease",
  } as React.CSSProperties;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ color: "#374151", fontSize: 14, fontWeight: 600 }}>
        {label}{required && <span style={{ color: BRAND.pink }}> *</span>}
      </span>
      {children}
    </label>
  );
}

// Very light phone normalization to E.164-ish. For production, prefer libphonenumber.
function normalizePhone(input: string): string | null {
  const s = (input || "").replace(/[^0-9+]/g, "").trim();
  if (!s) return null;
  if (s.startsWith("+")) return s;
  // Assume South Africa if starts with 0 (basic heuristic)
  if (s.startsWith("0")) return "+27" + s.slice(1);
  // As fallback, treat as already international without plus
  return "+" + s;
}
