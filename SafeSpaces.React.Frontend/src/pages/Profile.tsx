import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getUserProfile, setUserProfile, type UserProfile } from "../lib/data";

const BRAND = {
  purple: "#8764C1",
  blue: "#87A5DC",
  pink: "#EC96BE",
};

function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "grid",
        placeItems: "center",
        zIndex: 100,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(680px, 100%)",
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
          border: "2px solid #E5E7EB",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderBottom: "1px solid #F3F4F6",
          }}
        >
          <strong style={{ color: "#1F2937" }}>{title}</strong>
          <button
            onClick={onClose}
            style={{
              border: "1px solid #E5E7EB",
              background: "#fff",
              borderRadius: 8,
              padding: "6px 10px",
              cursor: "pointer",
              color: BRAND.purple,
              fontWeight: 700,
            }}
          >
            Close
          </button>
        </div>
        <div style={{ padding: 16 }}>{children}</div>
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, loading, signIn, sendEmailLink } = useAuth();
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editForm, setEditForm] = useState<Required<UserProfile>>({
    name: "",
    phone: "",
    email: "",
    preferredName: "",
    language: "",
  });

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    getUserProfile(user.uid).then(setProfile);
  }, [user]);
  const [showContact, setShowContact] = useState(false);
  const [showMedical, setShowMedical] = useState(false);
  const [showIssue, setShowIssue] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showIncident, setShowIncident] = useState(false);
  const [emailToLink, setEmailToLink] = useState("");
  const [sendingLink, setSendingLink] = useState(false);
  const [linkSent, setLinkSent] = useState<string | null>(null);

  function openEditProfile() {
    // Prefill form with existing profile or user info
    setEditForm({
      name: (profile?.name || user?.displayName || "").trim(),
      email: (profile?.email || user?.email || "").trim(),
      phone: (profile?.phone || "").trim(),
      preferredName: (profile?.preferredName || "").trim(),
      language: (profile?.language || navigator.language || "").trim(),
    });
    setShowEditProfile(true);
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      signIn();
      return;
    }
    try {
      setSavingProfile(true);
      const payload: UserProfile = {
        name: editForm.name || undefined,
        email: editForm.email || undefined,
        phone: editForm.phone || undefined,
        preferredName: editForm.preferredName || undefined,
        language: editForm.language || undefined,
      };
      await setUserProfile(user.uid, payload);
      // Optimistically update local state
      setProfile((prev) => ({ ...(prev || {}), ...payload }));
      setShowEditProfile(false);
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "calc(100dvh - 60px)",
        padding: "20px 16px calc(24px + env(safe-area-inset-bottom))",
        background: "#FAFAFA",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <header style={{ marginBottom: 16 }}>
          <h1
            style={{
              color: "#1F2937",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              fontSize: 28,
              margin: 0,
            }}
          >
            Your Profile
          </h1>
          <p style={{ color: "#6B7280", margin: "8px 0 0", fontSize: 15 }}>
            Keep your details and emergency info up to date. Your data is private to your account.
          </p>
        </header>

        {!loading && !user && (
          <div style={{
            background: "#fff",
            border: "2px solid #E5E7EB",
            borderRadius: 16,
            padding: 16,
            marginBottom: 12,
            textAlign: "center",
          }}>
            <p style={{ color: "#6B7280", margin: "0 0 12px", fontSize: 14 }}>
              Sign in to save your profile, contacts, and medical info securely.
            </p>
            <button onClick={signIn} style={pillBtn()}>Sign in with Google</button>
            <div style={{ height: 10 }} />
            <div style={{ display: "grid", gap: 8, justifyItems: "center" }}>
              <div style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600 }}>— or —</div>
              <div style={{ display: "flex", gap: 8, width: "100%", justifyContent: "center" }}>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={emailToLink}
                  onChange={(e) => setEmailToLink(e.target.value)}
                  style={{ ...inputStyle(), width: 260 }}
                />
                <button
                  onClick={async () => {
                    if (!emailToLink) return;
                    try {
                      setSendingLink(true);
                      await sendEmailLink(emailToLink);
                      setLinkSent(emailToLink);
                    } finally {
                      setSendingLink(false);
                    }
                  }}
                  disabled={sendingLink || !emailToLink}
                  style={pillBtn({ color: BRAND.blue })}
                >
                  {sendingLink ? "Sending…" : "Email sign-in link"}
                </button>
              </div>
              {linkSent && (
                <p style={{ ...muted(), marginTop: 4 }}>
                  We’ve sent a sign-in link to <strong style={{ color: BRAND.purple }}>{linkSent}</strong>.
                  Open it on this device to complete sign-in.
                </p>
              )}
            </div>
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 12,
          }}
        >
          {/* My Details */}
          <section
            style={{
              background: "#fff",
              border: "2px solid #E5E7EB",
              borderRadius: 20,
              padding: 16,
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <strong style={{ color: "#1F2937" }}>My Details</strong>
              <button onClick={() => (user ? openEditProfile() : signIn())} style={pillBtn()}>
                Edit
              </button>
            </div>
            <p style={{ color: "#6B7280", margin: 0, fontSize: 14 }}>
              {user ? (
                <>
                  {(profile?.name || user.displayName) || "Name not set"} · {user.email || profile?.email || "Email not set"}
                </>
              ) : (
                "Name, phone, email, preferred name, language."
              )}
            </p>
          </section>

          {/* Emergency Contacts */}
          <section style={card()}>
            <div style={cardHeader()}>
              <strong style={{ color: "#1F2937" }}>Emergency Contacts</strong>
              <button onClick={() => setShowContact(true)} style={pillBtn({ color: BRAND.purple })}>Add</button>
            </div>
            <p style={muted()}>Add people we can call or message quickly.</p>
          </section>

          {/* Medical Info */}
          <section style={card()}>
            <div style={cardHeader()}>
              <strong style={{ color: "#1F2937" }}>Medical Info</strong>
              <button onClick={() => setShowMedical(true)} style={pillBtn({ color: BRAND.pink })}>Edit</button>
            </div>
            <p style={muted()}>Allergies, conditions, medicines, blood type, notes.</p>
          </section>

          {/* Favorites */}
          <section style={card()}>
            <div style={cardHeader()}>
              <strong style={{ color: "#1F2937" }}>Favorites</strong>
              <button style={pillBtn({ outline: true })}>Manage</button>
            </div>
            <p style={muted()}>Saved safe spaces with your notes.</p>
          </section>

          {/* Incident History */}
          <section style={card()}>
            <div style={cardHeader()}>
              <strong style={{ color: "#1F2937" }}>Incident History</strong>
              <button onClick={() => setShowIncident(true)} style={pillBtn({ outline: true })}>View</button>
            </div>
            <p style={muted()}>Your recent activity and self‑logged incidents.</p>
          </section>

          {/* Settings */}
          <section style={card()}>
            <div style={cardHeader()}>
              <strong style={{ color: "#1F2937" }}>Settings</strong>
              <button onClick={() => setShowSettings(true)} style={pillBtn({ color: BRAND.blue })}>Open</button>
            </div>
            <p style={muted()}>Notifications, privacy, location, export/clear data.</p>
          </section>

          {/* Report an Issue */}
          <section style={card()}>
            <div style={cardHeader()}>
              <strong style={{ color: "#1F2937" }}>Report an Issue</strong>
              <button onClick={() => setShowIssue(true)} style={pillBtn({ color: BRAND.purple })}>Report</button>
            </div>
            <p style={muted()}>App problem, place mismatch, or a safety concern.</p>
          </section>
        </div>
      </div>

      {/* Modals (placeholders for now) */}
      <Modal open={showEditProfile} onClose={() => setShowEditProfile(false)} title="Edit Profile">
        <form onSubmit={handleSaveProfile} style={{ display: "grid", gap: 12 }}>
          <Field label="Full name">
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Thandi N. Mokoena"
              style={inputStyle()}
            />
          </Field>
          <Field label="Preferred name (optional)">
            <input
              type="text"
              value={editForm.preferredName}
              onChange={(e) => setEditForm((f) => ({ ...f, preferredName: e.target.value }))}
              placeholder="What should we call you?"
              style={inputStyle()}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="you@example.com"
              style={inputStyle()}
            />
          </Field>
          <Field label="Phone">
            <input
              type="tel"
              value={editForm.phone}
              onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="e.g. +27 82 123 4567"
              style={inputStyle()}
            />
          </Field>
          <Field label="Language">
            <input
              type="text"
              value={editForm.language}
              onChange={(e) => setEditForm((f) => ({ ...f, language: e.target.value }))}
              placeholder="e.g. English, isiZulu"
              style={inputStyle()}
            />
          </Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" onClick={() => setShowEditProfile(false)} style={pillBtn({ outline: true })}>
              Cancel
            </button>
            <button type="submit" disabled={savingProfile} style={pillBtn({ color: BRAND.purple })}>
              {savingProfile ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </Modal>
      <Modal open={showContact} onClose={() => setShowContact(false)} title="Add Emergency Contact">
        <p style={muted()}>Form to add name, relation, phone. Quick Call/SMS after save.</p>
      </Modal>
      <Modal open={showMedical} onClose={() => setShowMedical(false)} title="Edit Medical Info">
        <p style={muted()}>Tag editors for allergies, conditions, meds; blood type and notes.</p>
      </Modal>
      <Modal open={showIncident} onClose={() => setShowIncident(false)} title="Incident History">
        <p style={muted()}>Timeline of events; tap a row for details.</p>
      </Modal>
      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Settings">
        <p style={muted()}>Notifications, privacy, location permissions, export/clear data.</p>
      </Modal>
      <Modal open={showIssue} onClose={() => setShowIssue(false)} title="Report an Issue">
        <p style={muted()}>Select category (Place, App, Safety), add details, optional location.</p>
      </Modal>
    </div>
  );
}

// Small styling helpers
function card(): React.CSSProperties {
  return {
    background: "#fff",
    border: "2px solid #E5E7EB",
    borderRadius: 20,
    padding: 16,
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  } as React.CSSProperties;
}

function cardHeader(): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  } as React.CSSProperties;
}

function pillBtn(opts?: { color?: string; outline?: boolean }): React.CSSProperties {
  const color = opts?.color || "#8764C1";
  const outline = opts?.outline || false;
  return {
    border: `1.5px solid ${color}`,
    background: outline ? "transparent" : color,
    color: outline ? color : "#fff",
    borderRadius: 12,
    padding: "8px 12px",
    fontWeight: 700,
    cursor: "pointer",
  } as React.CSSProperties;
}

function muted(): React.CSSProperties {
  return { color: "#6B7280", margin: 0, fontSize: 14 } as React.CSSProperties;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ color: "#374151", fontSize: 13, fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    border: "1.5px solid #E5E7EB",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 14,
    outline: "none",
  } as React.CSSProperties;
}
