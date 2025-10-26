import type React from "react";
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  getUserProfile,
  setUserProfile,
  type UserProfile,
  listContacts,
  addContact,
  deleteContact,
  type Contact,
  getMedicalInfo,
  setMedicalInfo,
  type MedicalInfo,
  getUserSettings,
  setUserSettings,
  type UserSettings,
  listIncidents,
  logIncident,
  type Incident,
  createIssue,
  listFavorites,
  deleteFavorite,
  type Favorite,
  reservePhone,
  releasePhone,
} from "../lib/data";
import { normalizePhone } from "../lib/phone";

const BRAND = {
  purple: "#8764C1",
  blue: "#87A5DC",
  pink: "#EC96BE",
};

function Modal({
  open,
  onClose,
  title,
  showHeaderClose = true,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  showHeaderClose?: boolean;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(17,24,39,0.45)",
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
          maxHeight: "90dvh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
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
          {showHeaderClose && (
            <button
              onClick={onClose}
              aria-label="Close"
              title="Close"
              style={iconBtn(BRAND.purple)}
            >
              {XIcon({ color: BRAND.purple })}
            </button>
          )}
        </div>
        <div style={{ padding: 16, overflowY: "auto", flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, loading, signIn } = useAuth();
  const MAX_CONTACTS = 5;
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editForm, setEditForm] = useState<{
    name: string;
    phone: string;
    email: string;
    preferredName: string;
    language: string;
  }>({
    name: "",
    phone: "",
    email: "",
    preferredName: "",
    language: "",
  });

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setContacts([]);
      setFavorites([]);
      return;
    }
    getUserProfile(user.uid).then(setProfile);
    listContacts(user.uid)
      .then(setContacts)
      .catch(() => setContacts([]));
    // Prefetch favorites for count on the card
    listFavorites(user.uid)
      .then(setFavorites)
      .catch(() => setFavorites([]));
    // Prefetch settings & medical (best-effort)
    if (user) {
      getMedicalInfo(user.uid)
        .then((m) => {
          if (m) {
            setMedical(m);
            setMedForm({
              bloodType: (m.bloodType as any) || "O+",
              allergies: m.allergies || [],
              conditions: m.conditions || [],
              medications: m.medications || [],
              medicalAidProvider: m.medicalAidProvider || "",
              medicalAidNumber: m.medicalAidNumber || "",
              organDonor: !!m.organDonor,
              notes: m.notes || "",
              updatedAt: undefined as any,
            });
          }
        })
        .catch(() => {});
      getUserSettings(user.uid)
        .then((s) => {
          if (s) {
            setSettings(s);
            setSettingsForm({
              notificationsEnabled: !!s.notificationsEnabled,
              shareLocation: !!s.shareLocation,
              recordingsPasswordHash: s.recordingsPasswordHash || "",
              updatedAt: undefined as any,
            });
          }
        })
        .catch(() => {});
      listIncidents(user.uid)
        .then(setIncidents)
        .catch(() => setIncidents([]));
    }
  }, [user]);
  const [showContact, setShowContact] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactForm, setContactForm] = useState({
    name: "",
    relation: "",
    phone: "",
  });
  const [relationOther, setRelationOther] = useState("");
  const [savingContact, setSavingContact] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [showMedical, setShowMedical] = useState(false);
  const [showIssue, setShowIssue] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showIncident, setShowIncident] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [favLoading, setFavLoading] = useState(false);
  const [favError, setFavError] = useState<string | null>(null);
  // Passwordless email sign-in removed

  // Medical info state
  const BLOOD_TYPES = [
    "A+",
    "A-",
    "B+",
    "B-",
    "AB+",
    "AB-",
    "O+",
    "O-",
  ] as const;
  const MEDICAL_AIDS = [
    "Discovery",
    "Bonitas",
    "Momentum",
    "Medshield",
    "GEMS",
    "Fedhealth",
    "Bestmed",
    "Medihelp",
    "CompCare",
    "Other",
  ] as const;
  const [, /* medical */ setMedical] = useState<MedicalInfo | null>(null);
  const [medForm, setMedForm] = useState<Required<MedicalInfo>>({
    bloodType: "O+",
    allergies: [],
    conditions: [],
    medications: [],
    medicalAidProvider: "",
    medicalAidNumber: "",
    organDonor: false,
    notes: "",
    updatedAt: undefined as any,
  });
  const [medProviderOther, setMedProviderOther] = useState("");
  const [savingMedical, setSavingMedical] = useState(false);
  const [medErrors, setMedErrors] = useState<Record<string, string>>({});
  // Settings state
  const [, /* settings */ setSettings] = useState<UserSettings | null>(null);
  const [settingsForm, setSettingsForm] = useState<Required<UserSettings>>({
    notificationsEnabled: true,
    shareLocation: false,
    recordingsPasswordHash: "",
    updatedAt: undefined as any,
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Incident state
  const INCIDENT_TYPES: Incident["type"][] = [
    "Crime",
    "GBV",
    "Accident",
    "Breakdown",
    "Medical",
    "Other",
  ];
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
  ] as const;
  // Selected high-frequency SAPS crime categories (top-level) for quick capture
  const SAPS_CRIME_CATEGORIES = [
    "Murder",
    "Attempted murder",
    "Rape / sexual offence",
    "Domestic violence",
    "Assault GBH",
    "Common assault",
    "Common robbery",
    "Robbery with aggravating circumstances",
    "Residential burglary",
    "Business burglary",
    "Vehicle hijacking",
    "Truck hijacking",
    "Cash-in-transit robbery",
    "Bank robbery",
    "Theft of motor vehicle",
    "Theft out of/from motor vehicle",
    "Stock theft",
    "Arson",
    "Malicious damage to property",
    "Drug-related crime",
    "Illegal firearms / ammunition",
    "Driving under the influence (DUI)",
    "Commercial crime",
    "Shoplifting",
    "Other serious crime",
  ] as const;
  const INJURY_LEVELS = ["None", "Minor", "Serious", "Fatal"] as const;
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [incForm, setIncForm] = useState<{
    type: Incident["type"];
    category?: string;
    notes: string;
    location?: { lat: number; lng: number } | null;
    province?: (typeof PROVINCES)[number] | "";
    occurredAt?: string; // datetime-local value
    reportedToSAPS?: boolean;
    policeStation?: string;
    caseNumber?: string;
    suspectsKnown?: boolean;
    weaponInvolved?: boolean;
    injurySeverity?: (typeof INJURY_LEVELS)[number] | "";
  }>({
    type: "Crime",
    category: "",
    notes: "",
    location: null,
    province: "",
    occurredAt: "",
    reportedToSAPS: false,
    policeStation: "",
    caseNumber: "",
    suspectsKnown: false,
    weaponInvolved: false,
    injurySeverity: "",
  });
  const [savingIncident, setSavingIncident] = useState(false);
  const [incErrors, setIncErrors] = useState<Record<string, string>>({});

  // Report Issue state
  const [issueForm, setIssueForm] = useState<{
    category: "place" | "app" | "safety" | "other";
    details: string;
    location?: { lat: number; lng: number } | null;
  }>({ category: "safety", details: "", location: null });
  const [savingIssue, setSavingIssue] = useState(false);
  const [issueMsg, setIssueMsg] = useState<string | null>(null);
  const [issueErrors, setIssueErrors] = useState<Record<string, string>>({});

  function normalizeHomeLanguage(input: string): string {
    const v = (input || "").toLowerCase();
    const map: Record<string, string> = {
      en: "English",
      "en-za": "English",
      af: "Afrikaans",
      zu: "isiZulu",
      xh: "isiXhosa",
      nr: "isiNdebele",
      nso: "Sepedi",
      st: "Sesotho",
      tn: "Setswana",
      ts: "Xitsonga",
      ss: "siSwati",
      ve: "Tshivenda",
      nbl: "isiNdebele",
    };
    // direct matches
    if (map[v]) return map[v];
    // partial: match by code prefix before '-'
    const base = v.split("-")[0];
    if (map[base]) return map[base];
    // already a full name?
    const options = SA_LANGUAGES;
    const found = options.find((o) => o.toLowerCase() === v);
    return found || "";
  }

  const SA_LANGUAGES = [
    "Afrikaans",
    "English",
    "isiNdebele",
    "isiXhosa",
    "isiZulu",
    "Sepedi",
    "Sesotho",
    "Setswana",
    "siSwati",
    "Tshivenda",
    "Xitsonga",
  ] as const;

  function openEditProfile() {
    // Prefill form with existing profile or user info
    setEditForm({
      name: (profile?.name || user?.displayName || "").trim(),
      email: (profile?.email || user?.email || "").trim(),
      phone: (profile?.phone || "").trim(),
      preferredName: (profile?.preferredName || "").trim(),
      language: normalizeHomeLanguage(
        (profile?.language || navigator.language || "").trim()
      ),
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
      // Normalize and enforce unique phone mapping
      let nextPhone: string | undefined = undefined;
      if (editForm.phone && editForm.phone.trim()) {
        const e164 = normalizePhone(editForm.phone);
        if (!e164) {
          window.alert("Please enter a valid mobile number");
          setSavingProfile(false);
          return;
        }
        // If phone changed, reserve new phone first (will throw if taken)
        if (e164 !== (profile?.phone || "")) {
          await reservePhone(e164, user.uid);
        }
        nextPhone = e164;
      }
      const payload: UserProfile = {
        name: editForm.name || undefined,
        email: editForm.email || undefined,
        phone: nextPhone || undefined,
        preferredName: editForm.preferredName || undefined,
        language: editForm.language || undefined,
      };
      await setUserProfile(user.uid, payload);
      // Optionally release old phone if changed OR cleared and previously set
      // - If user changed to a new number, nextPhone will be the new E.164 and differ from old
      // - If user cleared the phone, nextPhone will be undefined and we should release the old mapping
      if (profile?.phone && profile.phone !== nextPhone) {
        try {
          await releasePhone(profile.phone, user.uid);
        } catch (e) {
          // Non-fatal, ignore release failures
          console.warn("Failed to release old phone", e);
        }
      }
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
              color: BRAND.purple,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              fontSize: 28,
              margin: 0,
            }}
          >
            Your Profile
          </h1>
          <p style={{ color: "#6B7280", margin: "8px 0 0", fontSize: 15 }}>
            Keep your details and emergency info up to date. Your data is
            private to your account.
          </p>
        </header>

        {!loading && !user && (
          <div
            style={{
              background: "#fff",
              border: "2px solid #E5E7EB",
              borderRadius: 16,
              padding: 16,
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            <p style={{ color: "#6B7280", margin: "0 0 12px", fontSize: 14 }}>
              Sign in to save your profile, contacts, and medical info securely.
            </p>
            <button onClick={signIn} style={pillBtn()}>
              Sign in with Google
            </button>
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <strong style={{ color: BRAND.purple }}>My Details</strong>
              <button
                onClick={() => (user ? openEditProfile() : signIn())}
                aria-label="Edit details"
                title="Edit details"
                style={iconBtn(BRAND.purple)}
              >
                {PencilIcon({ color: BRAND.pink })}
              </button>
            </div>
            <p style={{ color: "#6B7280", margin: 0, fontSize: 14 }}>
              {user ? (
                <>
                  {profile?.name || user.displayName || "Name not set"} ·{" "}
                  {user.email || profile?.email || "Email not set"}
                </>
              ) : (
                "Name, phone, email, preferred name, home language."
              )}
            </p>
          </section>

          {/* Emergency Contacts */}
          <section style={card()}>
            <div style={cardHeader()}>
              <strong style={{ color: BRAND.purple }}>
                Emergency Contacts
              </strong>
              <button
                onClick={() => setShowContact(true)}
                aria-label="Add contact"
                title="Add contact"
                style={iconBtn(BRAND.purple)}
              >
                {PlusIcon({ color: BRAND.pink })}
              </button>
            </div>
            <p style={muted()}>
              {contacts.length > 0
                ? `${contacts.length} contact${
                    contacts.length > 1 ? "s" : ""
                  } saved`
                : "Add people we can call or message quickly."}
            </p>
          </section>

          {/* Medical Info */}
          <section style={card()}>
            <div style={cardHeader()}>
              <strong style={{ color: BRAND.purple }}>Medical Info</strong>
              <button
                onClick={() => setShowMedical(true)}
                aria-label="Edit medical info"
                title="Edit medical info"
                style={iconBtn(BRAND.purple)}
              >
                {PencilIcon({ color: BRAND.pink })}
              </button>
            </div>
            <p style={muted()}>
              Allergies, conditions, medicines, blood type, notes.
            </p>
          </section>

          {/* Favorites */}
          <section style={card()}>
            <div style={cardHeader()}>
              <strong style={{ color: BRAND.purple }}>
                Favorite Safe Spaces
              </strong>
              <button
                onClick={() => {
                  setShowFavorites(true);
                }}
                aria-label="Manage favorites"
                title="Manage favorites"
                style={iconBtn(BRAND.purple)}
              >
                {HeartIcon({ color: BRAND.pink })}
              </button>
            </div>
            <p style={muted()}>
              {favorites.length > 0
                ? `${favorites.length} favorite${
                    favorites.length > 1 ? "s" : ""
                  } safe space${favorites.length > 1 ? "s" : ""} saved`
                : "Saved safe spaces with your notes."}
            </p>
          </section>

          {/* Incident History */}
          <section style={card()}>
            <div style={cardHeader()}>
              <strong style={{ color: BRAND.purple }}>Incident History</strong>
              <button
                onClick={() => setShowIncident(true)}
                aria-label="View incident history"
                title="View incident history"
                style={iconBtn(BRAND.purple)}
              >
                {EyeIcon({ color: BRAND.pink })}
              </button>
            </div>
            <p style={muted()}>
              Your recent activity and self‑logged incidents.
            </p>
          </section>

          {/* Settings */}
          <section style={card()}>
            <div style={cardHeader()}>
              <strong style={{ color: BRAND.purple }}>Settings</strong>
              <button
                onClick={() => setShowSettings(true)}
                aria-label="Open settings"
                title="Open settings"
                style={iconBtn(BRAND.purple)}
              >
                {GearIcon({ color: BRAND.pink })}
              </button>
            </div>
            <p style={muted()}>
              Notifications, privacy, location, export/clear data.
            </p>
          </section>

          {/* Report an Issue */}
          <section style={card()}>
            <div style={cardHeader()}>
              <strong style={{ color: BRAND.purple }}>Report an Issue</strong>
              <button
                onClick={() => setShowIssue(true)}
                aria-label="Report an issue"
                title="Report an issue"
                style={iconBtn(BRAND.purple)}
              >
                {FlagIcon({ color: BRAND.pink })}
              </button>
            </div>
            <p style={muted()}>
              App problem, place mismatch, or a safety concern.
            </p>
          </section>
        </div>
      </div>

      {/* Modals (placeholders for now) */}
      <Modal
        open={showFavorites}
        onClose={() => setShowFavorites(false)}
        title="Your Favorites"
        showHeaderClose={true}
      >
        <FavoritesList
          userId={user?.uid || null}
          open={showFavorites}
          favorites={favorites}
          setFavorites={setFavorites}
          loading={favLoading}
          setLoading={setFavLoading}
          error={favError}
          setError={setFavError}
        />
      </Modal>

      <Modal
        open={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        title="Edit Profile"
        showHeaderClose={false}
      >
        <form onSubmit={handleSaveProfile} style={{ display: "grid", gap: 12 }}>
          <Field label="Full name">
            <input
              type="text"
              value={editForm.name}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, name: e.target.value }))
              }
              placeholder="e.g. Thandi N. Mokoena"
              style={inputStyle()}
            />
          </Field>
          <Field label="Preferred name (optional)">
            <input
              type="text"
              value={editForm.preferredName}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, preferredName: e.target.value }))
              }
              placeholder="What should we call you?"
              style={inputStyle()}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={editForm.email}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, email: e.target.value }))
              }
              placeholder="you@example.com"
              style={inputStyle()}
            />
          </Field>
          <Field label="Phone">
            <input
              type="tel"
              value={editForm.phone}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, phone: e.target.value }))
              }
              placeholder="e.g. +27 82 123 4567"
              style={inputStyle()}
            />
          </Field>
          <Field label="Language">
            <select
              value={editForm.language}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, language: e.target.value }))
              }
              style={{ ...inputStyle(), paddingRight: 28 }}
            >
              <option value="">Select home language</option>
              {SA_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="button"
              onClick={() => setShowEditProfile(false)}
              aria-label="Close"
              title="Close"
              style={iconBtn(BRAND.pink)}
            >
              {XIcon({ color: BRAND.pink })}
            </button>
            <button
              type="submit"
              disabled={savingProfile}
              aria-label="Save"
              title="Save"
              style={iconBtn(BRAND.purple)}
            >
              {savingProfile
                ? SpinnerIcon({ color: BRAND.purple })
                : CheckIcon({ color: BRAND.purple })}
            </button>
          </div>
        </form>
      </Modal>
      <Modal
        open={showContact}
        onClose={() => setShowContact(false)}
        title="Add Emergency Contact"
        showHeaderClose={false}
      >
        <div style={{ display: "grid", gap: 12 }}>
          <p style={{ ...muted(), marginBottom: 0 }}>
            You can add multiple contacts—each one will appear below after you
            save.
          </p>
          {contacts.length >= MAX_CONTACTS && (
            <div
              style={{
                background: "#FEF3C7",
                color: "#92400E",
                padding: "10px 12px",
                borderRadius: 10,
                fontSize: 13,
              }}
            >
              You’ve reached the maximum of {MAX_CONTACTS} emergency contacts.
              Remove one to add another.
            </div>
          )}
          {contactError && (
            <div
              style={{
                background: "#FEE2E2",
                color: "#991B1B",
                padding: "10px 12px",
                borderRadius: 10,
                fontSize: 13,
              }}
            >
              {contactError}
            </div>
          )}

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setContactError(null);
              if (!user) return;
              if (contacts.length >= MAX_CONTACTS) {
                setContactError(
                  `You can only save up to ${MAX_CONTACTS} emergency contacts.`
                );
                return;
              }
              const { name, phone } = contactForm;
              if (!name.trim()) return setContactError("Name is required");
              if (!phone.trim()) return setContactError("Phone is required");
              try {
                setSavingContact(true);
                const payload = {
                  name: contactForm.name.trim(),
                  relation:
                    (contactForm.relation === "Other"
                      ? relationOther
                      : contactForm.relation
                    ).trim() || undefined,
                  phone: contactForm.phone.trim(),
                };
                const id = await addContact(user.uid, payload);
                setContacts((prev) => [{ id, ...payload }, ...prev]);
                setContactForm({ name: "", relation: "", phone: "" });
                setRelationOther("");
              } catch (err: any) {
                setContactError(err?.message || "Failed to add contact");
              } finally {
                setSavingContact(false);
              }
            }}
            style={{ display: "grid", gap: 10 }}
          >
            <Field label={`Name (${contacts.length}/${MAX_CONTACTS})`}>
              <input
                type="text"
                value={contactForm.name}
                onChange={(e) =>
                  setContactForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Sipho Dlamini"
                style={inputStyle()}
                disabled={contacts.length >= MAX_CONTACTS}
              />
            </Field>
            <Field label="Relation (optional)">
              <select
                value={contactForm.relation}
                onChange={(e) =>
                  setContactForm((f) => ({ ...f, relation: e.target.value }))
                }
                style={{ ...inputStyle(), paddingRight: 28 }}
                disabled={contacts.length >= MAX_CONTACTS}
              >
                <option value="">Select relation</option>
                <option value="Parent">Parent</option>
                <option value="Spouse/Partner">Spouse/Partner</option>
                <option value="Child">Child</option>
                <option value="Sibling">Sibling</option>
                <option value="Friend">Friend</option>
                <option value="Colleague">Colleague</option>
                <option value="Neighbor">Neighbor</option>
                <option value="Doctor">Doctor</option>
                <option value="Other">Other</option>
              </select>
              {contactForm.relation === "Other" && (
                <div style={{ marginTop: 8 }}>
                  <input
                    type="text"
                    value={relationOther}
                    onChange={(e) => setRelationOther(e.target.value)}
                    placeholder="Specify relation"
                    style={inputStyle()}
                    disabled={contacts.length >= MAX_CONTACTS}
                  />
                </div>
              )}
            </Field>
            <Field label="Phone">
              <input
                type="tel"
                value={contactForm.phone}
                onChange={(e) =>
                  setContactForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="e.g. 082 123 4567"
                style={inputStyle()}
                disabled={contacts.length >= MAX_CONTACTS}
              />
            </Field>
            <div
              style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
            >
              <button
                type="button"
                onClick={() => setShowContact(false)}
                aria-label="Close"
                title="Close"
                style={iconBtn(BRAND.pink)}
              >
                {XIcon({ color: BRAND.pink })}
              </button>
              <button
                type="submit"
                disabled={savingContact || contacts.length >= MAX_CONTACTS}
                aria-label="Save contact"
                title="Save contact"
                style={iconBtn(BRAND.purple)}
              >
                {savingContact
                  ? SpinnerIcon({ color: BRAND.purple })
                  : CheckIcon({ color: BRAND.purple })}
              </button>
            </div>
          </form>

          {contacts.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <strong style={{ color: "#111827", fontSize: 14 }}>
                Your Contacts
              </strong>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: "8px 0 0",
                  display: "grid",
                  gap: 8,
                }}
              >
                {contacts.map((c) => (
                  <li
                    key={c.id}
                    style={{
                      border: "1px solid #E5E7EB",
                      borderRadius: 10,
                      padding: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          color: "#1F2937",
                          fontWeight: 700,
                          fontSize: 14,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {c.name} {c.relation ? `· ${c.relation}` : ""}
                      </div>
                      <div style={{ color: "#6B7280", fontSize: 13 }}>
                        {c.phone}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <a
                        aria-label="Call"
                        href={`tel:${phoneHref(c.phone)}`}
                        style={iconBtn(BRAND.purple)}
                      >
                        {PhoneIcon({ color: BRAND.purple })}
                      </a>
                      <a
                        aria-label="Send SMS"
                        href={`sms:${phoneHref(c.phone)}`}
                        style={iconBtn(BRAND.blue)}
                      >
                        {SmsIcon({ color: BRAND.blue })}
                      </a>
                      <button
                        aria-label="Remove"
                        onClick={async () => {
                          if (!user || !c.id) return;
                          if (!window.confirm("Remove this contact?")) return;
                          const prev = contacts;
                          setContacts((list) =>
                            list.filter((x) => x.id !== c.id)
                          );
                          try {
                            await deleteContact(user.uid, c.id);
                          } catch {
                            // rollback on failure
                            setContacts(prev);
                          }
                        }}
                        style={iconBtn(BRAND.pink)}
                      >
                        {TrashIcon({ color: BRAND.pink })}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Modal>
      <Modal
        open={showMedical}
        onClose={() => setShowMedical(false)}
        title="Edit Medical Info"
        showHeaderClose={false}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!user) return;
            setSavingMedical(true);
            try {
              // Validate: blood type required; if provider selected, number required; if provider Other, need Other name
              const mErr: Record<string, string> = {};
              if (!medForm.bloodType) mErr.bloodType = "Blood type is required";
              const hasProvider = !!(
                medForm.medicalAidProvider && medForm.medicalAidProvider.trim()
              );
              if (hasProvider && !medForm.medicalAidNumber?.trim()) {
                mErr.medicalAidNumber = "Medical aid number is required";
              }
              if (
                medForm.medicalAidProvider === "Other" &&
                !medProviderOther.trim()
              ) {
                mErr.medicalAidProvider = "Please specify the provider";
              }
              setMedErrors(mErr);
              if (Object.keys(mErr).length > 0) {
                setSavingMedical(false);
                return;
              }
              const payload: MedicalInfo = {
                bloodType: medForm.bloodType,
                allergies: medForm.allergies?.filter(Boolean),
                conditions: medForm.conditions?.filter(Boolean),
                medications: medForm.medications?.filter(Boolean),
                medicalAidProvider:
                  (medForm.medicalAidProvider === "Other"
                    ? medProviderOther
                    : medForm.medicalAidProvider) || undefined,
                medicalAidNumber: medForm.medicalAidNumber || undefined,
                organDonor: !!medForm.organDonor,
                notes: medForm.notes || undefined,
              };
              await setMedicalInfo(user.uid, payload);
              setMedical(payload);
              setShowMedical(false);
              setMedErrors({});
            } finally {
              setSavingMedical(false);
            }
          }}
          style={{ display: "grid", gap: 12 }}
        >
          <Field label="Blood type">
            <select
              value={medForm.bloodType || ""}
              onChange={(e) =>
                setMedForm((f) => ({ ...f, bloodType: e.target.value as any }))
              }
              aria-invalid={!!medErrors.bloodType}
              style={{
                ...inputStyle(),
                paddingRight: 28,
                ...(medErrors.bloodType ? { borderColor: "#EF4444" } : {}),
              }}
            >
              <option value="">Select blood type</option>
              {BLOOD_TYPES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            {medErrors.bloodType && (
              <div style={{ color: "#B91C1C", fontSize: 12, marginTop: 4 }}>
                {medErrors.bloodType}
              </div>
            )}
          </Field>
          <Field label="Allergies">
            <input
              type="text"
              value={(medForm.allergies || []).join(", ")}
              onChange={(e) =>
                setMedForm((f) => ({
                  ...f,
                  allergies: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                }))
              }
              placeholder="e.g. Penicillin, Nuts"
              style={inputStyle()}
            />
          </Field>
          <Field label="Medical Conditions">
            <input
              type="text"
              value={(medForm.conditions || []).join(", ")}
              onChange={(e) =>
                setMedForm((f) => ({
                  ...f,
                  conditions: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                }))
              }
              placeholder="e.g. Asthma, Hypertension"
              style={inputStyle()}
            />
          </Field>
          <Field label="Medications">
            <input
              type="text"
              value={(medForm.medications || []).join(", ")}
              onChange={(e) =>
                setMedForm((f) => ({
                  ...f,
                  medications: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                }))
              }
              placeholder="e.g. Ventolin, Metformin"
              style={inputStyle()}
            />
          </Field>
          <Field label="Medical aid provider (optional)">
            <select
              value={medForm.medicalAidProvider || ""}
              onChange={(e) =>
                setMedForm((f) => ({
                  ...f,
                  medicalAidProvider: e.target.value,
                }))
              }
              aria-invalid={!!medErrors.medicalAidProvider}
              style={{
                ...inputStyle(),
                paddingRight: 28,
                ...(medErrors.medicalAidProvider
                  ? { borderColor: "#EF4444" }
                  : {}),
              }}
            >
              <option value="">Select provider</option>
              {MEDICAL_AIDS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            {medForm.medicalAidProvider === "Other" && (
              <div style={{ marginTop: 8 }}>
                <input
                  type="text"
                  value={medProviderOther}
                  onChange={(e) => setMedProviderOther(e.target.value)}
                  placeholder="Specify provider"
                  aria-invalid={!!medErrors.medicalAidProvider}
                  style={{
                    ...inputStyle(),
                    ...(medErrors.medicalAidProvider
                      ? { borderColor: "#EF4444" }
                      : {}),
                  }}
                />
              </div>
            )}
          </Field>
          <Field label="Medical aid number">
            <input
              type="text"
              value={medForm.medicalAidNumber || ""}
              onChange={(e) =>
                setMedForm((f) => ({
                  ...f,
                  medicalAidNumber: e.target.value,
                }))
              }
              placeholder="e.g. 1234 5678 9012"
              aria-invalid={!!medErrors.medicalAidNumber}
              style={{
                ...inputStyle(),
                ...(medErrors.medicalAidNumber
                  ? { borderColor: "#EF4444" }
                  : {}),
              }}
            />
            {medErrors.medicalAidNumber && (
              <div style={{ color: "#B91C1C", fontSize: 12, marginTop: 4 }}>
                {medErrors.medicalAidNumber}
              </div>
            )}
          </Field>
          <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              checked={!!medForm.organDonor}
              onChange={(e) =>
                setMedForm((f) => ({ ...f, organDonor: e.target.checked }))
              }
            />
            <span style={{ color: "#374151", fontSize: 13, fontWeight: 600 }}>
              I’m an organ donor
            </span>
          </label>
          <Field label="Notes (optional)">
            <textarea
              rows={3}
              value={medForm.notes || ""}
              onChange={(e) =>
                setMedForm((f) => ({ ...f, notes: e.target.value }))
              }
              placeholder="Anything responders should know"
              style={{ ...inputStyle(), resize: "vertical" }}
            />
          </Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="button"
              onClick={() => setShowMedical(false)}
              aria-label="Close"
              title="Close"
              style={iconBtn(BRAND.pink)}
            >
              {XIcon({ color: BRAND.pink })}
            </button>
            <button
              type="submit"
              disabled={savingMedical}
              aria-label="Save"
              title="Save"
              style={iconBtn(BRAND.purple)}
            >
              {savingMedical
                ? SpinnerIcon({ color: BRAND.purple })
                : CheckIcon({ color: BRAND.purple })}
            </button>
          </div>
        </form>
      </Modal>
      <Modal
        open={showIncident}
        onClose={() => setShowIncident(false)}
        title="Incident History"
      >
        <div style={{ display: "grid", gap: 12 }}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!user) return;
              setSavingIncident(true);
              try {
                // Validate required fields
                const errs: Record<string, string> = {};
                if (!incForm.province) errs.province = "Province is required";
                if (!incForm.occurredAt)
                  errs.occurredAt = "Date & time is required";
                if (incForm.type === "Crime" && !incForm.category)
                  errs.category = "Select a crime category";
                if (incForm.reportedToSAPS) {
                  const hasStation = !!(
                    incForm.policeStation && incForm.policeStation.trim()
                  );
                  const hasCase = !!(
                    incForm.caseNumber && incForm.caseNumber.trim()
                  );
                  if (!hasStation && !hasCase) {
                    errs.reported = "Provide a police station or a case number";
                  }
                }
                setIncErrors(errs);
                if (Object.keys(errs).length > 0) {
                  setSavingIncident(false);
                  return;
                }
                const payload = {
                  type: incForm.type,
                  notes: incForm.notes || undefined,
                  location: incForm.location || undefined,
                  category:
                    incForm.type === "Crime" && incForm.category
                      ? incForm.category
                      : undefined,
                  province: incForm.province || undefined,
                  occurredAt: incForm.occurredAt
                    ? new Date(incForm.occurredAt)
                    : undefined,
                  reportedToSAPS: incForm.reportedToSAPS || undefined,
                  policeStation: incForm.reportedToSAPS
                    ? incForm.policeStation || undefined
                    : undefined,
                  caseNumber: incForm.reportedToSAPS
                    ? incForm.caseNumber || undefined
                    : undefined,
                  suspectsKnown: incForm.suspectsKnown || undefined,
                  weaponInvolved: incForm.weaponInvolved || undefined,
                  injurySeverity: incForm.injurySeverity || undefined,
                } as Omit<Incident, "id" | "createdAt">;
                const id = await logIncident(user.uid, payload);
                setIncidents((prev) => [
                  { id, createdAt: new Date() as any, ...payload },
                  ...prev,
                ]);
                setIncForm({
                  type: "Crime",
                  category: "",
                  notes: "",
                  location: null,
                  province: "",
                  occurredAt: "",
                  reportedToSAPS: false,
                  policeStation: "",
                  caseNumber: "",
                  suspectsKnown: false,
                  weaponInvolved: false,
                  injurySeverity: "",
                });
                setIncErrors({});
              } finally {
                setSavingIncident(false);
              }
            }}
            style={{
              display: "grid",
              gap: 10,
              borderBottom: "1px solid #F3F4F6",
              paddingBottom: 12,
            }}
          >
            <div
              style={{
                display: "grid",
                gap: 10,
                gridTemplateColumns: "minmax(0,1fr) auto",
                alignItems: "end",
              }}
            >
              <Field label="Type">
                <select
                  value={incForm.type}
                  onChange={(e) =>
                    setIncForm((f) => ({ ...f, type: e.target.value as any }))
                  }
                  style={{ ...inputStyle(), paddingRight: 28 }}
                >
                  {INCIDENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  aria-label="Use my location"
                  title="Use my location"
                  style={iconBtn(BRAND.blue)}
                  onClick={() => {
                    if (!navigator.geolocation) return;
                    navigator.geolocation.getCurrentPosition((pos) => {
                      setIncForm((f) => ({
                        ...f,
                        location: {
                          lat: pos.coords.latitude,
                          lng: pos.coords.longitude,
                        },
                      }));
                    });
                  }}
                >
                  {LocationIcon({ color: BRAND.blue })}
                </button>
                <button
                  type="submit"
                  aria-label="Log incident"
                  title="Log incident"
                  disabled={savingIncident}
                  style={iconBtn(BRAND.purple)}
                >
                  {savingIncident
                    ? SpinnerIcon({ color: BRAND.purple })
                    : PlusIcon({ color: BRAND.purple })}
                </button>
              </div>
            </div>
            {incForm.type === "Crime" && (
              <Field label="Crime category (SAPS)">
                <select
                  value={incForm.category || ""}
                  onChange={(e) =>
                    setIncForm((f) => ({ ...f, category: e.target.value }))
                  }
                  aria-invalid={!!incErrors.category}
                  style={{
                    ...inputStyle(),
                    paddingRight: 28,
                    ...(incErrors.category ? { borderColor: "#EF4444" } : {}),
                  }}
                >
                  <option value="">Select category</option>
                  {SAPS_CRIME_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {incErrors.category && (
                  <div style={{ color: "#B91C1C", fontSize: 12, marginTop: 4 }}>
                    {incErrors.category}
                  </div>
                )}
              </Field>
            )}
            <div
              style={{
                display: "grid",
                gap: 10,
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              }}
            >
              <Field label="Province">
                <select
                  value={incForm.province || ""}
                  onChange={(e) =>
                    setIncForm((f) => ({
                      ...f,
                      province: e.target.value as any,
                    }))
                  }
                  aria-invalid={!!incErrors.province}
                  style={{
                    ...inputStyle(),
                    paddingRight: 28,
                    ...(incErrors.province ? { borderColor: "#EF4444" } : {}),
                  }}
                >
                  <option value="">Select province</option>
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Date & time occurred">
                <input
                  type="datetime-local"
                  value={incForm.occurredAt || ""}
                  onChange={(e) =>
                    setIncForm((f) => ({ ...f, occurredAt: e.target.value }))
                  }
                  aria-invalid={!!incErrors.occurredAt}
                  style={{
                    ...inputStyle(),
                    ...(incErrors.occurredAt ? { borderColor: "#EF4444" } : {}),
                  }}
                />
              </Field>
            </div>
            {(incErrors.province || incErrors.occurredAt) && (
              <div style={{ color: "#B91C1C", fontSize: 12 }}>
                {incErrors.province || incErrors.occurredAt}
              </div>
            )}
            <Field label="Notes (optional)">
              <input
                type="text"
                value={incForm.notes}
                onChange={(e) =>
                  setIncForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Short description"
                style={inputStyle()}
              />
            </Field>
            <div
              style={{
                display: "grid",
                gap: 10,
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              }}
            >
              <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="checkbox"
                  checked={!!incForm.reportedToSAPS}
                  onChange={(e) =>
                    setIncForm((f) => ({
                      ...f,
                      reportedToSAPS: e.target.checked,
                    }))
                  }
                />
                <span
                  style={{ color: "#374151", fontSize: 13, fontWeight: 600 }}
                >
                  Reported to SAPS
                </span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="checkbox"
                  checked={!!incForm.suspectsKnown}
                  onChange={(e) =>
                    setIncForm((f) => ({
                      ...f,
                      suspectsKnown: e.target.checked,
                    }))
                  }
                />
                <span
                  style={{ color: "#374151", fontSize: 13, fontWeight: 600 }}
                >
                  Suspect known
                </span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="checkbox"
                  checked={!!incForm.weaponInvolved}
                  onChange={(e) =>
                    setIncForm((f) => ({
                      ...f,
                      weaponInvolved: e.target.checked,
                    }))
                  }
                />
                <span
                  style={{ color: "#374151", fontSize: 13, fontWeight: 600 }}
                >
                  Weapon involved
                </span>
              </label>
            </div>
            <div
              style={{
                display: "grid",
                gap: 10,
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              }}
            >
              <Field label="Injury severity">
                <select
                  value={incForm.injurySeverity || ""}
                  onChange={(e) =>
                    setIncForm((f) => ({
                      ...f,
                      injurySeverity: e.target.value as any,
                    }))
                  }
                  style={{ ...inputStyle(), paddingRight: 28 }}
                >
                  <option value="">Select</option>
                  {INJURY_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </Field>
              {incForm.reportedToSAPS && (
                <Field label="SAPS case number (optional)">
                  <input
                    type="text"
                    value={incForm.caseNumber || ""}
                    onChange={(e) =>
                      setIncForm((f) => ({ ...f, caseNumber: e.target.value }))
                    }
                    placeholder="e.g. CAS 123/10/2025"
                    style={inputStyle()}
                  />
                </Field>
              )}
            </div>
            {incForm.reportedToSAPS && incErrors.reported && (
              <div style={{ color: "#B91C1C", fontSize: 12 }}>
                {incErrors.reported}
              </div>
            )}
            {incForm.reportedToSAPS && (
              <Field label="Police station (optional)">
                <input
                  type="text"
                  value={incForm.policeStation || ""}
                  onChange={(e) =>
                    setIncForm((f) => ({ ...f, policeStation: e.target.value }))
                  }
                  placeholder="Nearest SAPS station"
                  style={inputStyle()}
                />
              </Field>
            )}
          </form>
          <div>
            <strong style={{ color: "#111827", fontSize: 14 }}>
              Recent incidents
            </strong>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: "8px 0 0",
                display: "grid",
                gap: 8,
              }}
            >
              {incidents.map((i) => (
                <li
                  key={i.id}
                  style={{
                    border: "1px solid #E5E7EB",
                    borderRadius: 10,
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        color: "#1F2937",
                        fontWeight: 700,
                        fontSize: 14,
                      }}
                    >
                      {i.type}
                      {i.category ? ` · ${i.category}` : ""}
                    </div>
                    <div style={{ color: "#6B7280", fontSize: 12 }}>
                      {i.occurredAt
                        ? `Occurred: ${formatDate(i.occurredAt)} · `
                        : ""}
                      {formatDate(i.createdAt)}
                    </div>
                  </div>
                  {(i.province || i.caseNumber) && (
                    <div
                      style={{ color: "#6B7280", fontSize: 12, marginTop: 2 }}
                    >
                      {i.province ? `${i.province}` : ""}
                      {i.province && i.caseNumber ? " · " : ""}
                      {i.caseNumber ? `${i.caseNumber}` : ""}
                    </div>
                  )}
                  {i.notes && (
                    <div
                      style={{ color: "#374151", fontSize: 13, marginTop: 4 }}
                    >
                      {i.notes}
                    </div>
                  )}
                </li>
              ))}
              {incidents.length === 0 && (
                <li style={{ color: "#6B7280", fontSize: 13 }}>
                  No incidents logged yet.
                </li>
              )}
            </ul>
          </div>
        </div>
      </Modal>
      <Modal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        title="Settings"
        showHeaderClose={false}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!user) return;
            setSavingSettings(true);
            try {
              const payload: UserSettings = {
                notificationsEnabled: !!settingsForm.notificationsEnabled,
                shareLocation: !!settingsForm.shareLocation,
              };
              await setUserSettings(user.uid, payload);
              setSettings(payload);
              setShowSettings(false);
            } finally {
              setSavingSettings(false);
            }
          }}
          style={{ display: "grid", gap: 12 }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 12px",
              border: "1.5px solid #E5E7EB",
              borderRadius: 10,
            }}
          >
            <span style={{ color: "#374151", fontSize: 13, fontWeight: 600 }}>
              Push notifications
            </span>
            <input
              type="checkbox"
              checked={!!settingsForm.notificationsEnabled}
              onChange={(e) =>
                setSettingsForm((f) => ({
                  ...f,
                  notificationsEnabled: e.target.checked,
                }))
              }
              style={{ accentColor: BRAND.purple }}
            />
          </label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 12px",
              border: "1.5px solid #E5E7EB",
              borderRadius: 10,
            }}
          >
            <span style={{ color: "#374151", fontSize: 13, fontWeight: 600 }}>
              Share location for safety features
            </span>
            <input
              type="checkbox"
              checked={!!settingsForm.shareLocation}
              onChange={(e) =>
                setSettingsForm((f) => ({
                  ...f,
                  shareLocation: e.target.checked,
                }))
              }
              style={{ accentColor: BRAND.purple }}
            />
          </label>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              aria-label="Close"
              title="Close"
              style={iconBtn(BRAND.pink)}
            >
              {XIcon({ color: BRAND.pink })}
            </button>
            <button
              type="submit"
              disabled={savingSettings}
              aria-label="Save"
              title="Save"
              style={iconBtn(BRAND.purple)}
            >
              {savingSettings
                ? SpinnerIcon({ color: BRAND.purple })
                : CheckIcon({ color: BRAND.purple })}
            </button>
          </div>
        </form>
      </Modal>
      <Modal
        open={showIssue}
        onClose={() => setShowIssue(false)}
        title="Report an Issue"
        showHeaderClose={false}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSavingIssue(true);
            setIssueMsg(null);
            try {
              const errs: Record<string, string> = {};
              if (!issueForm.category) errs.category = "Select a category";
              if (!issueForm.details.trim())
                errs.details = "Details are required";
              setIssueErrors(errs);
              if (Object.keys(errs).length > 0) {
                setSavingIssue(false);
                return;
              }
              await createIssue({
                category: issueForm.category,
                details: issueForm.details.trim(),
                location: issueForm.location || undefined,
                uid: user?.uid || null,
              });
              setIssueMsg("Thanks! Your report was submitted.");
              setIssueForm({ category: "safety", details: "", location: null });
              setIssueErrors({});
            } catch (e: any) {
              setIssueMsg(e?.message || "Failed to submit issue");
            } finally {
              setSavingIssue(false);
            }
          }}
          style={{ display: "grid", gap: 12 }}
        >
          <Field label="Category">
            <select
              value={issueForm.category}
              onChange={(e) =>
                setIssueForm((f) => ({ ...f, category: e.target.value as any }))
              }
              aria-invalid={!!issueErrors.category}
              style={{
                ...inputStyle(),
                paddingRight: 28,
                ...(issueErrors.category ? { borderColor: "#EF4444" } : {}),
              }}
            >
              <option value="place">Place</option>
              <option value="app">App</option>
              <option value="safety">Safety</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Details">
            <textarea
              rows={3}
              value={issueForm.details}
              onChange={(e) =>
                setIssueForm((f) => ({ ...f, details: e.target.value }))
              }
              placeholder="What happened or what's wrong?"
              aria-invalid={!!issueErrors.details}
              style={{
                ...inputStyle(),
                resize: "vertical",
                ...(issueErrors.details ? { borderColor: "#EF4444" } : {}),
              }}
            />
          </Field>
          {(issueErrors.category || issueErrors.details) && (
            <div style={{ color: "#B91C1C", fontSize: 12 }}>
              {issueErrors.category || issueErrors.details}
            </div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <button
              type="button"
              aria-label="Use my location"
              title="Use my location"
              style={iconBtn(BRAND.blue)}
              onClick={() => {
                if (!navigator.geolocation) return;
                navigator.geolocation.getCurrentPosition((pos) => {
                  setIssueForm((f) => ({
                    ...f,
                    location: {
                      lat: pos.coords.latitude,
                      lng: pos.coords.longitude,
                    },
                  }));
                });
              }}
            >
              {LocationIcon({ color: BRAND.blue })}
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => setShowIssue(false)}
                aria-label="Close"
                title="Close"
                style={iconBtn(BRAND.pink)}
              >
                {XIcon({ color: BRAND.pink })}
              </button>
              <button
                type="submit"
                disabled={savingIssue}
                aria-label="Submit"
                title="Submit"
                style={iconBtn(BRAND.purple)}
              >
                {savingIssue
                  ? SpinnerIcon({ color: BRAND.purple })
                  : CheckIcon({ color: BRAND.purple })}
              </button>
            </div>
          </div>
          {issueMsg && (
            <div style={{ color: "#374151", fontSize: 13 }}>{issueMsg}</div>
          )}
        </form>
      </Modal>
    </div>
  );
}

function FavoritesList({
  userId,
  open,
  favorites,
  setFavorites,
  loading,
  setLoading,
  error,
  setError,
}: {
  userId: string | null;
  open: boolean;
  favorites: Favorite[];
  setFavorites: React.Dispatch<React.SetStateAction<Favorite[]>>;
  loading: boolean;
  setLoading: (v: boolean) => void;
  error: string | null;
  setError: (v: string | null) => void;
}) {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!open) return;
      if (!userId) return;
      setLoading(true);
      setError(null);
      try {
        const list = await listFavorites(userId);
        if (!cancelled) setFavorites(list);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load favorites");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, userId]);

  if (!userId) {
    return (
      <div style={{ color: "#6B7280", fontSize: 14 }}>
        Sign in to view and manage your favorite spaces.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {loading && (
        <div style={{ color: "#6B7280", fontSize: 13 }}>Loading…</div>
      )}
      {error && (
        <div
          style={{
            background: "#FEE2E2",
            color: "#991B1B",
            padding: "10px 12px",
            borderRadius: 10,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "grid",
          gap: 8,
        }}
      >
        {favorites.map((f) => (
          <li
            key={f.id}
            style={{
              border: "1px solid #E5E7EB",
              borderRadius: 10,
              padding: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  color: "#1F2937",
                  fontWeight: 700,
                  fontSize: 14,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {f.name} {f.type ? `· ${f.type}` : ""}
              </div>
              <div style={{ color: "#6B7280", fontSize: 12 }}>
                {f.address ||
                  (f.location
                    ? `${f.location.lat.toFixed(4)}, ${f.location.lng.toFixed(
                        4
                      )}`
                    : "")}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                aria-label="Remove"
                title="Remove"
                onClick={async () => {
                  if (!userId || !f.id) return;
                  const prev = favorites;
                  setFavorites((list) => list.filter((x) => x.id !== f.id));
                  try {
                    await deleteFavorite(userId, f.id);
                  } catch {
                    setFavorites(prev);
                  }
                }}
                style={iconBtn("#EC96BE")}
              >
                {TrashIcon({ color: "#EC96BE" })}
              </button>
            </div>
          </li>
        ))}
        {favorites.length === 0 && !loading && (
          <li style={{ color: "#6B7280", fontSize: 13 }}>
            No favorite spaces saved yet.
          </li>
        )}
      </ul>
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

function pillBtn(opts?: {
  color?: string;
  outline?: boolean;
}): React.CSSProperties {
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ color: "#374151", fontSize: 13, fontWeight: 600 }}>
        {label}
      </span>
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

// Format Firestore Timestamp or Date
function formatDate(ts: any): string {
  let d: Date | null = null;
  if (ts && typeof ts.toDate === "function") d = ts.toDate();
  else if (ts instanceof Date) d = ts;
  if (!d) return "";
  return (
    d.toLocaleDateString() +
    " " +
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
}

// Helper: compact phone into href-safe digits/plus only
function phoneHref(p: string): string {
  return (p || "").replace(/[^0-9+]/g, "");
}

// Small icon-only button style (uniform app colours)
function iconBtn(color: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    borderRadius: 10,
    border: `1.5px solid ${color}`,
    background: "#fff",
    color,
    cursor: "pointer",
  } as React.CSSProperties;
}

// Minimal inline icons (SVG) with currentColor tint
function PhoneIcon({ color = BRAND.purple }: { color?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 2c.6 0 1.1.2 1.5.6l2 2c.8.8.8 2 0 2.8L8.7 8.2c1 2 2.7 3.7 4.7 4.7l.8-.8c.8-.8 2-.8 2.8 0l2 2c.8.8.8 2 0 2.8l-1.1 1.1c-.8.8-2 1.2-3.1.9-2.9-.7-6.1-3.9-6.8-6.8-.3-1.1.1-2.3.9-3.1L8.6 6C8.2 5.6 8 5.1 8 4.6V4c0-1.1-.9-2-2-2z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SmsIcon({ color = BRAND.blue }: { color?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="3"
        y="4"
        width="18"
        height="12"
        rx="2.5"
        stroke={color}
        strokeWidth="1.5"
      />
      <path
        d="M8 16l-1 4 4-4"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 8h11"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M6.5 11h7"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TrashIcon({ color = BRAND.pink }: { color?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 7h16"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M10 3h4a2 2 0 012 2v2H8V5a2 2 0 012-2z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <rect
        x="6"
        y="7"
        width="12"
        height="13"
        rx="1.5"
        stroke={color}
        strokeWidth="1.5"
      />
      <path
        d="M10 11v6M14 11v6"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlusIcon({ color = BRAND.purple }: { color?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 5v14M5 12h14"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PencilIcon({ color = BRAND.purple }: { color?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M14.06 6.19l2.12-2.12a1.5 1.5 0 012.12 0l1.63 1.63a1.5 1.5 0 010 2.12l-2.12 2.12"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EyeIcon({ color = BRAND.purple }: { color?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

function GearIcon({ color = BRAND.blue }: { color?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 8a4 4 0 100 8 4 4 0 000-8z"
        stroke={color}
        strokeWidth="1.5"
      />
      <path
        d="M4 12a8 8 0 011.1-4L3 6l3-3 2 2A8 8 0 0112 4c1.4 0 2.7.3 3.9.9l2-2 3 3-2 2A8 8 0 0120 12c0 1.4-.3 2.7-.9 3.9l2 2-3 3-2-2A8 8 0 0112 20a8 8 0 01-4-1.1l-2 2-3-3 2-2A8 8 0 014 12z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HeartIcon({ color = BRAND.purple }: { color?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 20s-7-4.35-9-8.5C1.6 8.3 3.5 6 6 6c1.7 0 3 .9 4 2 1-1.1 2.3-2 4-2 2.5 0 4.4 2.3 3 5.5-2 4.15-9 8.5-9 8.5z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FlagIcon({ color = BRAND.purple }: { color?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5 3v18"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M5 5h10l-1.5 3H19l-2 4h-8"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function XIcon({ color = BRAND.purple }: { color?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon({ color = BRAND.purple }: { color?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5 13l4 4L19 7"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LocationIcon({ color = BRAND.blue }: { color?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 21s7-6.5 7-11a7 7 0 10-14 0c0 4.5 7 11 7 11z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.5" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

function SpinnerIcon({ color = BRAND.purple }: { color?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="12"
        cy="12"
        r="8"
        stroke={color}
        strokeWidth="1.5"
        opacity="0.3"
      />
      <path
        d="M20 12a8 8 0 00-8-8"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
function setEditForm(arg0: {
  name: any;
  email: any;
  phone: any;
  preferredName: any;
  language: string;
}) {
  throw new Error("Function not implemented.");
}
