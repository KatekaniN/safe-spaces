// Minimal IndexedDB wrapper for storing audio recordings locally
// Object store: 'recordings' with keyPath 'name'

export type RecordingEntry = {
  name: string;
  createdAt: number; // epoch ms
  blob: Blob;
};

const DB_NAME = "safe-spaces";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("recordings")) {
        const store = db.createObjectStore("recordings", { keyPath: "name" });
        store.createIndex("createdAt", "createdAt", { unique: false });
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
