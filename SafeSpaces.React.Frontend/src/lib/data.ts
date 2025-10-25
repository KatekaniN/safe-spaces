import { db } from "./firebase";
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp, runTransaction } from "firebase/firestore";

export type UserProfile = {
  name?: string;
  phone?: string;
  email?: string;
  preferredName?: string;
  language?: string;
};

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function setUserProfile(uid: string, profile: UserProfile): Promise<void> {
  const ref = doc(db, "users", uid);
  await setDoc(ref, profile, { merge: true });
}

// Reserve a phone number uniquely for a user using a Firestore transaction.
// Creates/updates a document at phones/{e164} with { uid } if not taken.
// Throws if taken by a different uid.
export async function reservePhone(e164Phone: string, uid: string): Promise<void> {
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

export type IssueReport = {
  category: "place" | "app" | "safety" | "other";
  details: string;
  placeId?: string;
  location?: { lat: number; lng: number };
  uid?: string | null;
  createdAt?: any;
};

export async function createIssue(report: IssueReport) {
  const ref = collection(db, "issueReports");
  await addDoc(ref, { ...report, createdAt: serverTimestamp() });
}
