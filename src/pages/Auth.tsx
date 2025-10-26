import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  getUserProfile,
  reservePhone,
  setUserProfile,
  getAdminInvite,
  consumeAdminInvite,
  addToWaitlist,
} from "../lib/data";
import { normalizePhone } from "../lib/phone";
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
  const {
    user,
    loading,
    signIn,
    signInEmail,
    signUpEmail,
    resetPassword,
    sendVerification,
  } = useAuth();
  const [step, setStep] = useState<"welcome" | "signup" | "signin">("welcome");
  const [phone, setPhone] = useState<string>(
    () => localStorage.getItem("phoneForSignIn") || ""
  );
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [adminCandidate, setAdminCandidate] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [agency, setAgency] = useState("");
  const [leBadgeNumber, setLeBadgeNumber] = useState("");
  const [lePoliceStation, setLePoliceStation] = useState("");
  const [leProvince, setLeProvince] = useState("");
  const [leMunicipality, setLeMunicipality] = useState("");
  const [affiliation, setAffiliation] = useState<"SAPS" | "Private Security">(
    "SAPS"
  );
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const navigate = useNavigate();

  const PROVINCES = [
    "Eastern Cape",
    "Free State",
    "Gauteng",
    "KwaZulu-Natal",
    "Limpopo",
    "Mpumalanga",
    "Northern Cape",
    "North West",
    "Western Cape",
  ];
  const GAUTENG_MUNICIPALITIES = [
    "City of Ekurhuleni Metropolitan",
    "City of Johannesburg Metropolitan",
    "City of Tshwane Metropolitan",
    "Sedibeng District",
    "Emfuleni Local",
    "Lesedi Local",
    "Midvaal Local",
    "West Rand District",
    "Merafong City Local",
    "Mogale City Local",
    "Rand West City Local",
  ];

  // If we're already signed in, make sure phone exists then enter app
  useEffect(() => {
    async function syncPhoneAndEnter() {
      if (!user) return;
      let prof: any = null;
      let saved: any = null;
      try {
        const pendingJson = window.localStorage.getItem("pendingProfile");
        const pending = pendingJson
          ? (JSON.parse(pendingJson) as {
              phone?: string;
              name?: string;
              adminCandidate?: boolean;
              inviteCode?: string;
              agency?: string;
              badgeNumber?: string;
              forceNumber?: string;
              policeStation?: string;
              province?: string;
              municipality?: string;
              affiliation?: "SAPS" | "Private Security";
            })
          : undefined;
        const storedPhone =
          pending?.phone ||
          window.localStorage.getItem("phoneForSignIn") ||
          phone;
        if (storedPhone) {
          const e164 = normalizePhone(storedPhone);
          if (!e164) throw new Error("Please enter a valid mobile number");
          prof = await getUserProfile(user.uid);
          // Reserve phone (idempotent for same uid)
          await reservePhone(e164, user.uid);
          const toSave: any = { phone: e164 };
          if (pending?.name && !prof?.name) toSave.name = pending.name;
          // Persist LE details if provided (regardless of invite status)
          const forceNum = pending?.forceNumber || pending?.badgeNumber;
          if (forceNum) toSave.lawForceNumber = forceNum;
          if (pending?.policeStation)
            toSave.lawPoliceStation = pending.policeStation;
          if (pending?.province) {
            if (pending?.adminCandidate)
              toSave.lawProvince = pending.province as any;
            else toSave.province = pending.province as any;
          }
          if (pending?.municipality) {
            if (pending?.adminCandidate)
              toSave.lawMunicipality = pending.municipality;
            else toSave.municipality = pending.municipality;
          }
          if (pending?.agency) toSave.agency = pending.agency;
          if (pending?.affiliation === "SAPS") toSave.role = "law";
          if (pending?.affiliation === "Private Security")
            toSave.role = "security";
          // Optional admin/law enforcement onboarding via invite code
          if (pending?.adminCandidate && pending.inviteCode) {
            try {
              const invite = await getAdminInvite(pending.inviteCode);
              if (invite && invite.active !== false) {
                // role mapping from invite roles
                const roles = Array.isArray(invite.roles)
                  ? (invite.roles as string[])
                  : [];
                if (roles.includes("admin")) toSave.isAdmin = true;
                if (roles.includes("admin") || roles.includes("dashboard"))
                  toSave.canAccessAdmin = true;
                if (roles.includes("security")) toSave.role = "security";
                if (roles.includes("law")) toSave.role = "law";
                if (pending.agency || invite.agency) {
                  toSave.agency = pending.agency || invite.agency;
                }
                if (invite.singleUse) {
                  await consumeAdminInvite(invite.id, user.uid);
                }
              }
            } catch (e) {
              // ignore invite failures, proceed as regular user
            }
          }
          await setUserProfile(user.uid, toSave);
          saved = toSave;
          window.localStorage.removeItem("phoneForSignIn");
          window.localStorage.removeItem("pendingProfile");
        }
      } catch (e) {
        // Non-fatal
        console.warn("Failed to sync phone after auth", e);
      }
      // Choose landing route based on role/access (admins, law, security go to admin dashboard)
      const hasAdminAccess = (p: any) =>
        !!(
          p &&
          (p.isAdmin ||
            p.canAccessAdmin ||
            p.role === "admin" ||
            p.role === "law" ||
            p.role === "security")
        );
      const dest =
        hasAdminAccess(saved) || hasAdminAccess(prof) ? "/admin" : "/";
      navigate(dest);
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
      if (!agree)
        return setError("Please agree to the terms and privacy policy");
      if (adminCandidate) {
        if (!inviteCode.trim())
          return setError(
            "An organization invite code is required for admin signup"
          );
        if (affiliation === "SAPS") {
          if (leProvince && leProvince !== "Gauteng") {
            setInfo(
              "We're launching in your province soon. Join the waitlist and we'll notify you."
            );
            return setError("Currently available in Gauteng only");
          }
          const isEightDigits = /^\d{8}$/.test(leBadgeNumber.trim());
          if (
            !isEightDigits ||
            !lePoliceStation.trim() ||
            !leProvince ||
            !leMunicipality.trim()
          ) {
            return setError(
              "Please provide an 8-digit force number, police station, province, and municipality"
            );
          }
        } else if (affiliation === "Private Security") {
          if (!agency.trim()) {
            return setError("Please provide your security company/agency");
          }
        }
      } else {
        // Normal users: require Gauteng and municipality
        if (!leProvince) return setError("Please select your province");
        if (leProvince !== "Gauteng") {
          setInfo(
            "We're launching in your province soon. Join the waitlist and we'll notify you."
          );
          return setError("Currently available in Gauteng only");
        }
        if (!leMunicipality.trim())
          return setError("Please select your municipality");
      }
      const e164 = normalizePhone(phone);
      if (!e164) return setError("Please enter a valid mobile number");
      window.localStorage.setItem("phoneForSignIn", e164);
      const fullName =
        [firstName, lastName].filter(Boolean).join(" ").trim() || undefined;
      window.localStorage.setItem(
        "pendingProfile",
        JSON.stringify({
          phone: e164,
          name: fullName,
          adminCandidate: adminCandidate || undefined,
          inviteCode: adminCandidate ? inviteCode.trim() : undefined,
          agency: adminCandidate ? agency.trim() || undefined : undefined,
          forceNumber: adminCandidate ? leBadgeNumber.trim() : undefined,
          policeStation: adminCandidate ? lePoliceStation.trim() : undefined,
          province: leProvince || undefined,
          municipality: leMunicipality.trim() || undefined,
          affiliation: adminCandidate ? affiliation : undefined,
        })
      );
    }
    try {
      await signIn();
      // For signup path, profile is handled in effect above
    } catch (e: any) {
      setError(e?.message || "Google sign-in failed");
    }
  }

  async function handleEmail(mode: "signin" | "signup") {
    setError(null);
    setInfo(null);
    // Reuse the same validations as Google flow for signup
    if (mode === "signup") {
      if (!phone) return setError("Please enter your mobile number");
      if (!agree)
        return setError("Please agree to the terms and privacy policy");
      if (!email.trim()) return setError("Please enter your email");
      if (password.length < 6)
        return setError("Password must be at least 6 characters");
      if (adminCandidate) {
        if (!inviteCode.trim())
          return setError(
            "An organization invite code is required for admin signup"
          );
        if (affiliation === "SAPS") {
          if (leProvince && leProvince !== "Gauteng") {
            setInfo(
              "We're launching in your province soon. Join the waitlist and we'll notify you."
            );
            return setError("Currently available in Gauteng only");
          }
          const isEightDigits = /^\d{8}$/.test(leBadgeNumber.trim());
          if (
            !isEightDigits ||
            !lePoliceStation.trim() ||
            !leProvince ||
            !leMunicipality.trim()
          ) {
            return setError(
              "Please provide an 8-digit force number, police station, province, and municipality"
            );
          }
        } else if (affiliation === "Private Security") {
          if (!agency.trim()) {
            return setError("Please provide your security company/agency");
          }
        }
      } else {
        if (!leProvince) return setError("Please select your province");
        if (leProvince !== "Gauteng") {
          setInfo(
            "We're launching in your province soon. Join the waitlist and we'll notify you."
          );
          return setError("Currently available in Gauteng only");
        }
        if (!leMunicipality.trim())
          return setError("Please select your municipality");
      }
      const e164 = normalizePhone(phone);
      if (!e164) return setError("Please enter a valid mobile number");
      window.localStorage.setItem("phoneForSignIn", e164);
      const fullName =
        [firstName, lastName].filter(Boolean).join(" ").trim() || undefined;
      window.localStorage.setItem(
        "pendingProfile",
        JSON.stringify({
          phone: e164,
          name: fullName,
          adminCandidate: adminCandidate || undefined,
          inviteCode: adminCandidate ? inviteCode.trim() : undefined,
          agency: adminCandidate ? agency.trim() || undefined : undefined,
          forceNumber: adminCandidate ? leBadgeNumber.trim() : undefined,
          policeStation: adminCandidate ? lePoliceStation.trim() : undefined,
          province: leProvince || undefined,
          municipality: leMunicipality.trim() || undefined,
          affiliation: adminCandidate ? affiliation : undefined,
        })
      );
    }
    try {
      if (mode === "signup") {
        await signUpEmail(email.trim(), password);
        // Best-effort: send verification email but don't block login
        try {
          await sendVerification();
          setInfo(
            "We sent a verification email. You can continue using the app while you verify."
          );
        } catch {}
      } else {
        await signInEmail(email.trim(), password);
      }
    } catch (e: any) {
      setError(e?.message || "Email authentication failed");
    }
  }

  async function handleReset() {
    setError(null);
    setInfo(null);
    if (!email.trim())
      return setError("Enter your email to reset your password");
    try {
      await resetPassword(email.trim());
      setInfo("Password reset email sent. Please check your inbox.");
    } catch (e: any) {
      setError(e?.message || "Failed to send password reset email");
    }
  }

  // Welcome screen
  if (step === "welcome") {
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          background: BRAND.lightpurple,
          color: "#fff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px 20px",
            zIndex: 1,
          }}
        >
          <img
            src={logoUrl}
            alt="Safe Spaces"
            width={140}
            height={140}
            style={{
              marginBottom: 24,
              filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.15))",
            }}
          />
          <h1
            style={{
              margin: 0,
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              textAlign: "center",
            }}
          >
            Safe Spaces
          </h1>
          <p
            style={{
              margin: "12px 0 0",
              fontSize: 16,
              opacity: 0.9,
              textAlign: "center",
              maxWidth: 340,
              lineHeight: 1.5,
            }}
          >
            Your trusted companion for finding safe places and help when you
            need it most.
          </p>
        </div>

        <div style={{ padding: "0 20px 32px", zIndex: 1 }}>
          <button
            onClick={() => setStep("signup")}
            style={{
              ...actionBtn(),
              background: "#fff",
              color: BRAND.purple,
              marginBottom: 12,
            }}
          >
            Create Account
          </button>
          <button
            onClick={() => setStep("signin")}
            style={{
              ...actionBtn(),
              background: "transparent",
              color: "#fff",
              border: "2px solid rgba(255,255,255,0.3)",
            }}
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // Sign up screen
  if (step === "signup") {
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          background: "#FAFAFA",
        }}
      >
        <header
          style={{
            background: "#fff",
            borderBottom: "1px solid #E5E7EB",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <button
            onClick={() => setStep("welcome")}
            style={{
              border: "none",
              background: "transparent",
              fontSize: 24,
              cursor: "pointer",
              padding: 4,
              color: BRAND.purple,
            }}
          >
            ←
          </button>
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              color: "#1F2937",
            }}
          >
            Create Account
          </h2>
        </header>

        <div
          style={{
            flex: 1,
            padding: "24px 20px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {error && (
            <div
              style={{
                background: "#FEE2E2",
                color: "#991B1B",
                padding: "12px 14px",
                borderRadius: 12,
                marginBottom: 16,
                fontSize: 14,
              }}
            >
              {error}
            </div>
          )}
          {/* info message removed with email link flow */}

          <div style={{ display: "grid", gap: 16 }}>
            {/* Email + password for account login */}
            <Field label="Email" required>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle()}
              />
            </Field>
            <Field label="Password" required>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ ...inputStyle(), paddingRight: 96 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: 8,
                    height: 32,
                    padding: "0 10px",
                    borderRadius: 8,
                    border: `1px solid ${BRAND.purple}`,
                    background: "#fff",
                    color: BRAND.purple,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <PasswordStrength password={password} />
            </Field>
            <Field label="First name" required>
              <input
                type="text"
                placeholder="e.g. Thandi"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                style={inputStyle()}
              />
            </Field>
            <Field label="Last name" required>
              <input
                type="text"
                placeholder="e.g. Mokoena"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                style={inputStyle()}
              />
            </Field>
            <Field label="Mobile number" required>
              <input
                type="tel"
                placeholder="e.g. 082 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={inputStyle()}
              />
            </Field>
            {/* Location (Gauteng-only) */}
            <Field label="Province" required>
              <select
                value={leProvince}
                onChange={(e) => setLeProvince(e.target.value)}
                style={{ ...inputStyle(), paddingRight: 28 }}
              >
                <option value="">Select province</option>
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
            {leProvince === "Gauteng" ? (
              <Field label="Municipality" required>
                <select
                  value={leMunicipality}
                  onChange={(e) => setLeMunicipality(e.target.value)}
                  style={{ ...inputStyle(), paddingRight: 28 }}
                >
                  <option value="">Select municipality</option>
                  {GAUTENG_MUNICIPALITIES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <Field label="Municipality">
                <input
                  type="text"
                  placeholder="Municipality"
                  value={leMunicipality}
                  onChange={(e) => setLeMunicipality(e.target.value)}
                  style={inputStyle()}
                  disabled
                />
              </Field>
            )}
            {leProvince && leProvince !== "Gauteng" && (
              <div
                style={{
                  background: "#FEF3C7",
                  color: "#92400E",
                  padding: "10px 12px",
                  borderRadius: 10,
                  fontSize: 13,
                }}
              >
                Currently available in Gauteng only. Join the waitlist below.
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    marginTop: 8,
                  }}
                >
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const e164 = normalizePhone(phone || "");
                        await addToWaitlist({
                          phone: e164 || undefined,
                          name:
                            [firstName, lastName].filter(Boolean).join(" ") ||
                            undefined,
                          province: leProvince,
                          municipality: leMunicipality || undefined,
                          uid: null,
                        });
                        setInfo(
                          "You're on the waitlist. We will notify you when we launch in your province."
                        );
                      } catch (e: any) {
                        setError(e?.message || "Failed to add to waitlist");
                      }
                    }}
                    style={{
                      border: `2px solid ${BRAND.purple}`,
                      color: BRAND.purple,
                      background: "transparent",
                      borderRadius: 10,
                      padding: "10px 12px",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Join Waitlist
                  </button>
                  {info && (
                    <span style={{ color: "#374151", fontSize: 13 }}>
                      {info}
                    </span>
                  )}
                </div>
              </div>
            )}
            {/* Email field removed (passwordless disabled) */}

            {/* Admin / Law Enforcement (optional) */}
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                checked={adminCandidate}
                onChange={(e) => setAdminCandidate(e.target.checked)}
                style={{ marginTop: 2, cursor: "pointer" }}
              />
              <span style={{ color: "#374151", fontSize: 13, fontWeight: 600 }}>
                I am law enforcement personnel and would like to sign up as an
                admin for my organization.
              </span>
            </label>
            {adminCandidate && (
              <>
                <Field label="Affiliation">
                  <select
                    value={affiliation}
                    onChange={(e) => setAffiliation(e.target.value as any)}
                    style={{ ...inputStyle(), paddingRight: 28 }}
                  >
                    <option value="SAPS">SAPS (Law Enforcement)</option>
                    <option value="Private Security">Private Security</option>
                  </select>
                </Field>
                <Field label="Organization invite code" required>
                  <input
                    type="text"
                    placeholder="Enter organization code"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    style={inputStyle()}
                  />
                </Field>
                <Field label="Agency / Department (optional)">
                  <input
                    type="text"
                    placeholder="e.g. SAPS, City of Cape Town Safety"
                    value={agency}
                    onChange={(e) => setAgency(e.target.value)}
                    style={inputStyle()}
                  />
                </Field>
                {affiliation === "SAPS" && (
                  <Field label="Force number (8 digits)" required>
                    <input
                      type="text"
                      placeholder="e.g. 12345678"
                      value={leBadgeNumber}
                      onChange={(e) => setLeBadgeNumber(e.target.value)}
                      style={inputStyle()}
                    />
                  </Field>
                )}
                <Field
                  label={
                    affiliation === "SAPS"
                      ? "Police station"
                      : "Office / Branch"
                  }
                  required={affiliation === "SAPS"}
                >
                  <input
                    type="text"
                    placeholder={
                      affiliation === "SAPS"
                        ? "e.g. Sunnyside SAPS"
                        : "e.g. ABC Security Pretoria North"
                    }
                    value={lePoliceStation}
                    onChange={(e) => setLePoliceStation(e.target.value)}
                    style={inputStyle()}
                  />
                </Field>
              </>
            )}

            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                style={{ marginTop: 2, cursor: "pointer" }}
              />
              <span style={{ color: "#6B7280", fontSize: 13, lineHeight: 1.5 }}>
                I agree to the{" "}
                <a href="#" style={{ color: BRAND.purple, fontWeight: 600 }}>
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="#" style={{ color: BRAND.purple, fontWeight: 600 }}>
                  Privacy Policy
                </a>
                .
              </span>
            </label>
          </div>

          <div style={{ marginTop: "auto", paddingTop: 24 }}>
            <button
              onClick={() => handleEmail("signup")}
              style={{
                ...actionBtn(),
                background: "#111827",
                color: "#fff",
                marginBottom: 10,
              }}
              disabled={leProvince !== "" && leProvince !== "Gauteng"}
            >
              Continue with Email
            </button>
            <button
              onClick={() => handleGoogle("signup")}
              style={{
                ...actionBtn(),
                background: BRAND.purple,
                color: "#fff",
                marginBottom: 10,
              }}
              disabled={leProvince !== "" && leProvince !== "Gauteng"}
            >
              Continue with Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Sign in screen
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "#FAFAFA",
      }}
    >
      <header
        style={{
          background: "#fff",
          borderBottom: "1px solid #E5E7EB",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          onClick={() => setStep("welcome")}
          style={{
            border: "none",
            background: "transparent",
            fontSize: 24,
            cursor: "pointer",
            padding: 4,
            color: BRAND.purple,
          }}
        >
          ←
        </button>
        <h2
          style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1F2937" }}
        >
          Sign In
        </h2>
      </header>

      <div
        style={{
          flex: 1,
          padding: "24px 20px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {error && (
          <div
            style={{
              background: "#FEE2E2",
              color: "#991B1B",
              padding: "12px 14px",
              borderRadius: 12,
              marginBottom: 16,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}
        {/* info message removed with email link flow */}

        {/* Email input removed (passwordless disabled) */}

        <div style={{ marginTop: "auto", paddingTop: 24 }}>
          <div style={{ display: "grid", gap: 16, marginBottom: 12 }}>
            <Field label="Email">
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle()}
              />
            </Field>
            <Field label="Password">
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ ...inputStyle(), paddingRight: 96 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: 8,
                    height: 32,
                    padding: "0 10px",
                    borderRadius: 8,
                    border: `1px solid ${BRAND.purple}`,
                    background: "#fff",
                    color: BRAND.purple,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </Field>
            <button
              onClick={() => handleEmail("signin")}
              style={{
                ...actionBtn(),
                background: BRAND.purple,
                color: "#fff",
              }}
            >
              Sign in with Email
            </button>
            <button
              onClick={handleReset}
              style={{
                ...actionBtn(),
                background: "transparent",
                color: BRAND.purple,
                border: `2px solid ${BRAND.purple}`,
              }}
            >
              Forgot password?
            </button>
          </div>
          <button
            onClick={() => handleGoogle("signin")}
            style={{
              ...actionBtn(),
              background: BRAND.purple,
              color: "#fff",
              marginBottom: 10,
            }}
          >
            <svg
              width={20}
              height={20}
              viewBox="-3 0 262 262"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMidYMid"
              fill="#000000"
            >
              <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
              <g
                id="SVGRepo_tracerCarrier"
                strokeLinecap="round"
                strokeLinejoin="round"
              ></g>
              <g id="SVGRepo_iconCarrier">
                <path
                  d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
                  fill="#4285F4"
                ></path>
                <path
                  d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
                  fill="#34A853"
                ></path>
                <path
                  d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"
                  fill="#FBBC05"
                ></path>
                <path
                  d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
                  fill="#EB4335"
                ></path>
              </g>
            </svg>
            &nbsp;&nbsp; Continue with Google
          </button>
          <p
            style={{
              textAlign: "center",
              marginTop: 16,
              fontSize: 13,
              color: "#6B7280",
            }}
          >
            Don't have an account?{" "}
            <button
              onClick={() => setStep("signup")}
              style={{
                background: "none",
                border: "none",
                color: BRAND.purple,
                fontWeight: 700,
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
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

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ color: "#374151", fontSize: 14, fontWeight: 600 }}>
        {label}
        {required && <span style={{ color: BRAND.pink }}> *</span>}
      </span>
      {children}
    </label>
  );
}

// normalizePhone moved to shared util in lib/phone

function PasswordStrength({ password }: { password: string }) {
  const score = getStrengthScore(password);
  const color = score <= 1 ? "#F59E0B" : score === 2 ? "#10B981" : "#16A34A";
  const label =
    score <= 1
      ? "Weak"
      : score === 2
      ? "Good"
      : score === 3
      ? "Strong"
      : "Very strong";
  const width = Math.min(100, (score / 4) * 100);
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ height: 6, background: "#E5E7EB", borderRadius: 999 }}>
        <div
          style={{
            width: `${width}%`,
            height: "100%",
            background: color,
            borderRadius: 999,
          }}
        />
      </div>
      <div style={{ fontSize: 12, color: "#6B7280", marginTop: 6 }}>
        {label}
      </div>
    </div>
  );
}

function getStrengthScore(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^\w\s]/.test(pw)) s++;
  return s; // 0..4
}
