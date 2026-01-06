// Minimal IndexedDB wrapper for storing audio recordings locally
// Object store: 'recordings' with keyPath 'name'

export type RecordingEntry = {
  name: string;
  createdAt: number; // epoch ms
  blob: Blob;
};

const DB_NAME = "safe-spaces";
// v2 adds 'pendingUploads' store to queue uploads for background sync
const DB_VERSION = 2;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("recordings")) {
        const store = db.createObjectStore("recordings", { keyPath: "name" });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
      if (!db.objectStoreNames.contains("pendingUploads")) {
        db.createObjectStore("pendingUploads", { keyPath: "name" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveRecording(blob: Blob, name: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("recordings", "readwrite");
    const store = tx.objectStore("recordings");
    const rec: RecordingEntry = { name, createdAt: Date.now(), blob };
    const req = store.put(rec);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function listRecordings(): Promise<RecordingEntry[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("recordings", "readonly");
    const store = tx.objectStore("recordings");
    const req = store.getAll();
    req.onsuccess = () => {
      const out = (req.result as RecordingEntry[]).sort(
        (a, b) => b.createdAt - a.createdAt
      );
      resolve(out);
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function deleteRecording(name: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("recordings", "readwrite");
    const store = tx.objectStore("recordings");
    const req = store.delete(name);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

// Cloud (Firebase Storage + Firestore metadata)
import { storage } from "./firebase";
import {
  getDownloadURL,
  ref,
  uploadBytes,
  deleteObject,
} from "firebase/storage";
import { db as fsDb } from "./firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

export type CloudRecording = {
  id?: string;
  name: string;
  storagePath: string;
  size: number;
  createdAt?: any;
  uid: string;
  location?: { lat: number; lng: number } | null;
  downloadUrl?: string;
};

export async function uploadRecordingToCloud(
  uid: string,
  blob: Blob,
  name: string,
  location?: { lat: number; lng: number } | null
): Promise<CloudRecording> {
  const path = `recordings/${uid}/${name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, {
    contentType: blob.type || "audio/webm",
  });
  const url = await getDownloadURL(storageRef);
  const meta: Omit<CloudRecording, "id"> = {
    name,
    storagePath: path,
    size: blob.size,
    uid,
    location: location || null,
    downloadUrl: url,
  };
  const docRef = await addDoc(collection(fsDb, "users", uid, "recordings"), {
    ...meta,
    createdAt: serverTimestamp(),
  });
  return { id: docRef.id, ...meta, createdAt: new Date() as any };
}

export async function listCloudRecordings(
  uid: string
): Promise<CloudRecording[]> {
  const refCol = collection(fsDb, "users", uid, "recordings");
  const q = query(refCol, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  const list: CloudRecording[] = [];
  for (const d of snap.docs) {
    const data = d.data() as CloudRecording;
    list.push({ id: d.id, ...data });
  }
  return list;
}

export async function deleteCloudRecording(
  uid: string,
  rec: CloudRecording
): Promise<void> {
  const path = rec.storagePath;
  try {
    await deleteObject(ref(storage, path));
  } catch {}
  try {
    await deleteDoc(doc(fsDb, "users", uid, "recordings", rec.id!));
  } catch {}
}

// Background upload queue (for offline or failed cloud uploads)
export type PendingUpload = {
  name: string;
  createdAt: number;
  blob: Blob;
  location?: { lat: number; lng: number } | null;
};

export async function enqueuePendingUpload(
  blob: Blob,
  name: string,
  location?: { lat: number; lng: number } | null
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pendingUploads", "readwrite");
    const store = tx.objectStore("pendingUploads");
    const rec: PendingUpload = { name, createdAt: Date.now(), blob, location };
    const req = store.put(rec);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function listPendingUploads(): Promise<PendingUpload[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pendingUploads", "readonly");
    const store = tx.objectStore("pendingUploads");
    const req = store.getAll();
    req.onsuccess = () => {
      const out = (req.result as PendingUpload[]).sort(
        (a, b) => b.createdAt - a.createdAt
      );
      resolve(out);
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function removePendingUpload(name: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pendingUploads", "readwrite");
    const store = tx.objectStore("pendingUploads");
    const req = store.delete(name);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

// Process queue using Firebase SDK (requires auth context in page)
import { auth } from "./firebase";
import { listContacts } from "./data";
import type { Contact } from "./data";
import { normalizePhone } from "./phone";
import { reverseGeocode } from "./geocode";

export async function processPendingUploads(
  uidInput?: string
): Promise<{ uploaded: number; failed: number }> {
  const uid = uidInput || auth.currentUser?.uid;
  if (!uid) return { uploaded: 0, failed: 0 };
  const items = await listPendingUploads();
  let uploaded = 0;
  let failed = 0;
  for (const it of items) {
    try {
      await uploadRecordingToCloud(uid, it.blob, it.name, it.location || null);
      await removePendingUpload(it.name);
      uploaded++;
    } catch {
      failed++;
    }
  }
  return { uploaded, failed };
}

// Capture a quick selfie using the front camera and return as JPEG Blob
export async function captureSelfie(options?: {
  width?: number;
  height?: number;
  timeoutMs?: number;
}): Promise<Blob | null> {
  const width = options?.width ?? 640;
  const height = options?.height ?? 640;
  const timeoutMs = options?.timeoutMs ?? 4000;
  if (!navigator.mediaDevices?.getUserMedia) return null;
  let stream: MediaStream | null = null;
  const timer = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("selfie-timeout")), timeoutMs)
  );
  try {
    // Prefer front-facing camera
    const g = navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width, height },
      audio: false,
    });
    stream = (await Promise.race([g, timer])) as MediaStream;
    const track = stream.getVideoTracks()[0];
    const imageCapture = (window as any).ImageCapture
      ? new (window as any).ImageCapture(track)
      : null;
    // Use ImageCapture if available for better quality
    if (imageCapture?.grabFrame) {
      const bitmap = await imageCapture.grabFrame();
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no-2d");
      ctx.drawImage(bitmap, 0, 0, width, height);
      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.8)
      );
      track.stop();
      stream.getTracks().forEach((t) => t.stop());
      return blob;
    }
    // Fallback: draw current frame from a video element
    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true as any;
    await video.play().catch(() => {});
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no-2d");
    ctx.drawImage(video, 0, 0, width, height);
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.8)
    );
    stream.getTracks().forEach((t) => t.stop());
    return blob;
  } catch {
    try {
      stream?.getTracks().forEach((t) => t.stop());
    } catch {}
    return null;
  }
}

export type PanicAlertResult = {
  alertId?: string;
  selfieUrl?: string | null;
  mapUrl?: string | null;
  liveTrackingUrl?: string | null;
  contacts?: Contact[];
  shareText: string;
};

// Create a panic alert: upload selfie, store alert + recipients in Firestore
export async function triggerPanicAlert(
  uid: string,
  options: {
    location?: { lat: number; lng: number } | null;
    name?: string;
    liveTrackingUrl?: string | null; // optional prebuilt live/directions link
  }
): Promise<PanicAlertResult> {
  const { location, name, liveTrackingUrl } = options || {};
  const ts = new Date();
  const mapUrl = location
    ? `https://maps.google.com/?q=${location.lat},${location.lng}`
    : null;
  // Best-effort reverse geocoding to get a human-readable address
  let address: { formatted?: string; placeId?: string } | null = null;
  if (location) {
    try {
      const rev = await reverseGeocode(location);
      if (rev)
        address = { formatted: rev.formattedAddress, placeId: rev.placeId };
    } catch {}
  }
  // Try capture selfie (best-effort)
  const selfie = await captureSelfie().catch(() => null);
  let selfieUrl: string | null = null;
  try {
    if (selfie) {
      const sref = ref(
        storage,
        `alerts/${uid}/${ts.toISOString().replace(/[:.]/g, "-")}.jpg`
      );
      await uploadBytes(sref, selfie, { contentType: "image/jpeg" });
      selfieUrl = await getDownloadURL(sref);
    }
  } catch {
    // ignore upload failures
  }
  // Load contacts to include in the alert doc
  let contacts: Contact[] = [];
  try {
    contacts = await listContacts(uid);
  } catch {
    contacts = [];
  }
  // Create alert doc for back-end processing (e.g., WA Business API via Cloud Functions)
  const alertPayload: any = {
    type: "panic",
    uid,
    name: name || null,
    createdAt: serverTimestamp(),
    location: location || null,
    mapUrl,
    liveTrackingUrl: liveTrackingUrl || null,
    address,
    selfieUrl,
    recipients: contacts.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
    })),
    status: "open",
  };
  let alertId: string | undefined = undefined;
  try {
    const aref = await addDoc(
      collection(fsDb, "users", uid, "panicAlerts"),
      alertPayload
    );
    alertId = aref.id;
  } catch {}

  // Also surface to a top-level collection for dashboards/law enforcement
  try {
    await addDoc(collection(fsDb, "panicAlerts"), {
      ...alertPayload,
      userRef: doc(fsDb, "users", uid),
      userAlertId: alertId || null,
    });
  } catch {}

  const who = name ? name : "I";
  const shareText = [
    `${who} activated PANIC mode in Safe Spaces.`,
    address?.formatted ? `Address: ${address.formatted}` : undefined,
    location ? `Location: ${mapUrl}` : undefined,
    liveTrackingUrl ? `Live: ${liveTrackingUrl}` : undefined,
    selfieUrl ? `Selfie: ${selfieUrl}` : undefined,
    `Nearby law enforcement has been notified.`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    alertId,
    selfieUrl,
    mapUrl,
    liveTrackingUrl: liveTrackingUrl || null,
    contacts,
    shareText,
  };
}

// WhatsApp helpers
export function buildWhatsAppUrl(text: string, phoneE164?: string): string {
  const enc = encodeURIComponent(text);
  if (phoneE164) {
    const num = (
      phoneE164.startsWith("+") ? phoneE164.slice(1) : phoneE164
    ).replace(/\D/g, "");
    return `https://wa.me/${num}?text=${enc}`;
  }
  return `https://wa.me/?text=${enc}`;
}

export function getWhatsAppLinksForContacts(
  contacts: Contact[] | undefined,
  text: string
): { name: string; phone?: string; url: string }[] {
  const out: { name: string; phone?: string; url: string }[] = [];
  for (const c of contacts || []) {
    const e164 = normalizePhone(c.phone || "") || undefined;
    out.push({
      name: c.name || c.phone || "Contact",
      phone: e164,
      url: buildWhatsAppUrl(text, e164),
    });
  }
  if (out.length === 0) {
    // Fallback: generic share (user selects recipient)
    out.push({ name: "Choose in WhatsApp", url: buildWhatsAppUrl(text) });
  }
  return out;
}
