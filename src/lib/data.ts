import { db } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  runTransaction,
  query,
  orderBy,
  collectionGroup,
  writeBatch,
} from "firebase/firestore";

export type UserProfile = {
  name?: string;
  phone?: string;
  email?: string;
  preferredName?: string;
  language?: string;
  isAdmin?: boolean;
  agency?: string; // For admins/law enforcement org
  // Access and roles
  role?: "user" | "law" | "security" | "admin";
  canAccessAdmin?: boolean; // security/law users with dashboard access
  // General location (for all users)
  province?: Province;
  municipality?: string;
  // Law enforcement details (if applicable)
  lawBadgeNumber?: string; // legacy (kept for compatibility)
  lawForceNumber?: string; // SAPS 8-digit force number
  lawPoliceStation?: string;
  lawProvince?: Province;
  lawMunicipality?: string;
};

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function setUserProfile(
  uid: string,
  profile: UserProfile
): Promise<void> {
  const ref = doc(db, "users", uid);
  // Firestore doesn't allow undefined field values
  const clean = removeUndefined(profile);
  await setDoc(ref, clean, { merge: true });
}

// Reserve a phone number uniquely for a user using a Firestore transaction.
// Creates/updates a document at phones/{e164} with { uid } if not taken.
// Throws if taken by a different uid.
export async function reservePhone(
  e164Phone: string,
  uid: string
): Promise<void> {
  const phoneRef = doc(db, "phones", e164Phone);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(phoneRef);
    if (!snap.exists()) {
      tx.set(phoneRef, { uid, createdAt: serverTimestamp() });
      return;
    }
    const data = snap.data() as { uid?: string };
    if (data.uid && data.uid !== uid) {
      throw new Error("This mobile number is already in use.");
    }
    // If same uid, keep as is
  });
}

// Lookup uid by phone number (E.164). Returns uid or null if not reserved.
export async function getUidByPhone(e164Phone: string): Promise<string | null> {
  const phoneRef = doc(db, "phones", e164Phone);
  const snap = await getDoc(phoneRef);
  if (!snap.exists()) return null;
  const data = snap.data() as { uid?: string };
  return data?.uid || null;
}

// Release a phone reservation if it belongs to the same uid (safe no-op otherwise)
export async function releasePhone(
  e164Phone: string,
  uid: string
): Promise<void> {
  const phoneRef = doc(db, "phones", e164Phone);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(phoneRef);
    if (!snap.exists()) return; // nothing to release
    const data = snap.data() as { uid?: string };
    if (data.uid === uid) {
      tx.delete(phoneRef);
    }
  });
}

export type IssueReport = {
  category: "place" | "app" | "safety" | "other";
  details: string;
  placeId?: string;
  location?: { lat: number; lng: number };
  uid?: string | null;
  createdAt?: any;
};

export async function createIssue(report: IssueReport) {
  const topRef = doc(collection(db, "issueReports"));
  const id = topRef.id;
  const clean = removeUndefined(report);
  const payload = { ...clean, createdAt: serverTimestamp() } as any;
  const batch = writeBatch(db);
  batch.set(topRef, payload);
  if (report.uid) {
    const userRef = doc(db, "users", report.uid, "issues", id);
    batch.set(userRef, payload);
  }
  await batch.commit();
}

// Favorites (per-user saved places)
export type Favorite = {
  id?: string;
  placeId: string;
  name: string;
  type?: string; // place primary type
  location?: { lat: number; lng: number };
  address?: string;
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
};

export async function listFavorites(uid: string): Promise<Favorite[]> {
  const ref = collection(db, "users", uid, "favorites");
  const qy = query(ref, orderBy("createdAt", "desc"));
  const snap = await getDocs(qy);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Favorite) }));
}

export async function addFavorite(
  uid: string,
  fav: Omit<Favorite, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const ref = collection(db, "users", uid, "favorites");
  const docRef = await addDoc(ref, {
    ...removeUndefined(fav),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateFavorite(
  uid: string,
  id: string,
  partial: Partial<Omit<Favorite, "id" | "createdAt">>
): Promise<void> {
  const ref = doc(db, "users", uid, "favorites", id);
  await updateDoc(ref, {
    ...removeUndefined(partial),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteFavorite(uid: string, id: string): Promise<void> {
  const ref = doc(db, "users", uid, "favorites", id);
  await deleteDoc(ref);
}

// Police Stations (public reference data)
export type PoliceStation = {
  id?: string;
  name: string;
  location: { lat: number; lng: number };
  phone?: string;
  email?: string;
  address?: string;
  updatedAt?: any;
};

export async function upsertPoliceStations(
  stations: PoliceStation[]
): Promise<void> {
  const batch = writeBatch(db);
  for (const s of stations || []) {
    const id =
      s.id ||
      s.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    const ref = doc(db, "policeStations", id);
    batch.set(
      ref,
      {
        name: s.name,
        location: s.location,
        phone: s.phone || null,
        email: s.email || null,
        address: s.address || null,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
  await batch.commit();
}

// Emergency Contacts
export type Contact = {
  id?: string;
  name: string;
  relation?: string;
  phone: string;
  createdAt?: any;
  updatedAt?: any;
};

export async function listContacts(uid: string): Promise<Contact[]> {
  const ref = collection(db, "users", uid, "contacts");
  const q = query(ref, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Contact) }));
}

export async function addContact(
  uid: string,
  contact: Omit<Contact, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const ref = collection(db, "users", uid, "contacts");
  const docRef = await addDoc(ref, {
    ...removeUndefined(contact),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateContact(
  uid: string,
  id: string,
  partial: Partial<Omit<Contact, "id" | "createdAt">>
): Promise<void> {
  const ref = doc(db, "users", uid, "contacts", id);
  await updateDoc(ref, {
    ...removeUndefined(partial),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteContact(uid: string, id: string): Promise<void> {
  const ref = doc(db, "users", uid, "contacts", id);
  await deleteDoc(ref);
}

// Medical Info
export type MedicalInfo = {
  bloodType?: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
  allergies?: string[]; // comma-separated in UI
  conditions?: string[]; // comma-separated in UI
  medications?: string[]; // comma-separated in UI
  medicalAidProvider?: string;
  medicalAidNumber?: string;
  organDonor?: boolean;
  notes?: string;
  updatedAt?: any;
};

export async function getMedicalInfo(uid: string): Promise<MedicalInfo | null> {
  // Store single medical info document at users/{uid}/medical/info
  const ref = doc(db, "users", uid, "medical", "info");
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as MedicalInfo) : null;
}

export async function setMedicalInfo(
  uid: string,
  info: MedicalInfo
): Promise<void> {
  // Store single medical info document at users/{uid}/medical/info
  const ref = doc(db, "users", uid, "medical", "info");
  await setDoc(
    ref,
    { ...removeUndefined(info), updatedAt: serverTimestamp() },
    { merge: true }
  );
}

// User Settings
export type UserSettings = {
  notificationsEnabled?: boolean;
  shareLocation?: boolean;
  // Recordings access password (SHA-256 hex)
  recordingsPasswordHash?: string;
  updatedAt?: any;
};

export async function getUserSettings(
  uid: string
): Promise<UserSettings | null> {
  // Store single preferences document at users/{uid}/settings/prefs
  const ref = doc(db, "users", uid, "settings", "prefs");
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as UserSettings) : null;
}

export async function setUserSettings(
  uid: string,
  settings: UserSettings
): Promise<void> {
  // Store single preferences document at users/{uid}/settings/prefs
  const ref = doc(db, "users", uid, "settings", "prefs");
  await setDoc(
    ref,
    { ...removeUndefined(settings), updatedAt: serverTimestamp() },
    { merge: true }
  );
}

// Incident History (per-user)
// Provinces (SA)
export type Province =
  | "Eastern Cape"
  | "Free State"
  | "Gauteng"
  | "KwaZulu-Natal"
  | "Limpopo"
  | "Mpumalanga"
  | "Northern Cape"
  | "North West"
  | "Western Cape";

// Incident model expanded to support SAPS-aligned capture fields
export type Incident = {
  id?: string;
  type: "Crime" | "GBV" | "Accident" | "Breakdown" | "Medical" | "Other";
  // When type is Crime (or GBV), category can be chosen from UI lists
  category?: string;
  notes?: string;
  location?: { lat: number; lng: number };
  province?: Province;
  occurredAt?: any; // Timestamp/Date when incident occurred (not just createdAt)
  reportedToSAPS?: boolean;
  policeStation?: string;
  caseNumber?: string;
  suspectsKnown?: boolean;
  weaponInvolved?: boolean;
  injurySeverity?: "None" | "Minor" | "Serious" | "Fatal";
  createdAt?: any;
};

export async function listIncidents(uid: string): Promise<Incident[]> {
  const ref = collection(db, "users", uid, "incidents");
  const qy = query(ref, orderBy("createdAt", "desc"));
  const snap = await getDocs(qy);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Incident) }));
}

export async function logIncident(
  uid: string,
  data: Omit<Incident, "id" | "createdAt">
): Promise<string> {
  const ref = collection(db, "users", uid, "incidents");
  const docRef = await addDoc(ref, {
    ...removeUndefined(data),
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

// Public Crime Reports (for admin dashboard / crime data API)
export type CrimeReport = {
  id?: string;
  status: "ongoing" | "past";
  type: Incident["type"]; // reuse types from Incident
  category?: string;
  description?: string;
  location?: { lat: number; lng: number };
  province?: Province;
  occurredAt?: any; // when it happened (optional for ongoing)
  uid?: string | null; // reporter uid (can be null for anonymous)
  reviewed?: boolean;
  reviewedAt?: any;
  reviewerUid?: string;
  triageStatus?: "new" | "triaged" | "escalated" | "closed";
  createdAt?: any;
};

export async function createCrimeReport(
  report: Omit<CrimeReport, "id" | "createdAt">
): Promise<string> {
  const ref = doc(collection(db, "crimeReports"));
  const id = ref.id;
  const payload = {
    ...removeUndefined(report as any),
    createdAt: serverTimestamp(),
  } as any;
  const batch = writeBatch(db);
  batch.set(ref, payload);
  if (report.uid) {
    const userRef = doc(db, "users", report.uid, "crimeReports", id);
    batch.set(userRef, payload);
  }
  await batch.commit();
  return id;
}

export async function updateCrimeReport(
  id: string,
  partial: Partial<Omit<CrimeReport, "id" | "createdAt">>,
  uid?: string | null
): Promise<void> {
  const ref = doc(db, "crimeReports", id);
  const payload: Record<string, any> = {
    ...removeUndefined(partial as any),
    updatedAt: serverTimestamp(),
  };
  if (partial.reviewed === true) {
    payload.reviewedAt = serverTimestamp();
  }
  const batch = writeBatch(db);
  batch.update(ref, payload);
  if (uid) {
    const uref = doc(db, "users", uid, "crimeReports", id);
    batch.update(uref, payload);
  }
  await batch.commit();
}

export async function listCrimeReports(): Promise<CrimeReport[]> {
  const ref = collection(db, "crimeReports");
  const qy = query(ref, orderBy("createdAt", "desc"));
  const snap = await getDocs(qy);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as CrimeReport) }));
}

export async function listUserCrimeReports(
  uid: string
): Promise<CrimeReport[]> {
  const ref = collection(db, "users", uid, "crimeReports");
  const qy = query(ref, orderBy("createdAt", "desc"));
  const snap = await getDocs(qy);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as CrimeReport) }));
}

// Panic Alerts (end-to-end alert/response)
export type PanicAlertStatus = "open" | "acknowledged" | "resolved";

export type PanicAlert = {
  id?: string;
  userAlertId?: string | null; // id of the per-user copy (users/{uid}/panicAlerts/{userAlertId})
  uid: string;
  name?: string | null;
  createdAt?: any;
  respondedAt?: any;
  resolvedAt?: any;
  responderUid?: string | null;
  status: PanicAlertStatus;
  location?: { lat: number; lng: number } | null;
  mapUrl?: string | null;
  liveTrackingUrl?: string | null;
  selfieUrl?: string | null;
  address?: { formatted?: string; placeId?: string } | null;
  recipients?: { id?: string; name?: string; phone?: string }[];
  nearestStation?: {
    id?: string;
    name: string;
    distanceKm?: number;
    phone?: string;
    email?: string;
  } | null;
  userSnapshot?: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
};

export async function updatePanicAlert(
  id: string,
  partial: Partial<Omit<PanicAlert, "id" | "uid" | "createdAt">>,
  uid?: string | null,
  userAlertId?: string | null
): Promise<void> {
  const clean = removeUndefined(partial as any);
  const updates: any = { ...clean };
  if (partial.status === "acknowledged") {
    updates.respondedAt = serverTimestamp();
  }
  if (partial.status === "resolved") {
    updates.resolvedAt = serverTimestamp();
  }
  // Always update top-level alert
  const topRef = doc(db, "panicAlerts", id);
  await updateDoc(topRef, updates);
  // Best-effort update per-user copy when we know the correct userAlertId
  if (uid && userAlertId) {
    try {
      const userRef = doc(db, "users", uid, "panicAlerts", userAlertId);
      await updateDoc(userRef, updates);
    } catch {
      // ignore if missing
    }
  }
}

// Admin invites (scaffolding): stored at adminInvites/{code}
export type AdminInvite = {
  active?: boolean; // if false, invite is disabled
  singleUse?: boolean; // when true, should be consumed after first use
  agency?: string;
  roles?: string[]; // future-proofing
  createdAt?: any;
  consumedAt?: any;
  consumedBy?: string; // uid
};

export async function getAdminInvite(
  code: string
): Promise<(AdminInvite & { id: string }) | null> {
  const ref = doc(db, "adminInvites", code);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as AdminInvite) };
}

export async function consumeAdminInvite(
  code: string,
  uid: string
): Promise<void> {
  const ref = doc(db, "adminInvites", code);
  await updateDoc(ref, {
    active: false,
    consumedAt: serverTimestamp(),
    consumedBy: uid,
  });
}

// List all user incidents via collection group
export async function listAllIncidents(): Promise<
  (Incident & { uid?: string })[]
> {
  const cg = collectionGroup(db, "incidents");
  const qy = query(cg, orderBy("createdAt", "desc"));
  const snap = await getDocs(qy);
  return snap.docs.map((d) => {
    // path: users/{uid}/incidents/{id}
    const segments = d.ref.path.split("/");
    const uid = segments.length >= 2 ? segments[1] : undefined;
    return { id: d.id, uid, ...(d.data() as Incident) };
  });
}

// Waitlist: capture interest for unsupported provinces
export type WaitlistEntry = {
  phone?: string;
  name?: string;
  province: Province | string;
  municipality?: string;
  uid?: string | null;
  createdAt?: any;
};

export async function addToWaitlist(
  entry: Omit<WaitlistEntry, "createdAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "waitlist"), {
    ...removeUndefined(entry as any),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// Utility: remove keys with undefined values (Firestore rejects undefined)
function removeUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v !== undefined) (out as any)[k] = v;
  }
  return out;
}
