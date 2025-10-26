import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  connectAuthEmulator,
} from "firebase/auth";
import {
  getFirestore,
  enableIndexedDbPersistence,
  connectFirestoreEmulator,
} from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
setPersistence(auth, browserLocalPersistence);

export const db = getFirestore(app);
// Enable offline persistence (best-effort)
enableIndexedDbPersistence(db).catch(() => {
  // Ignore (multiple tabs or unsupported)
});

// Storage initialization: respect the configured bucket exactly.
// If VITE_FIREBASE_STORAGE_BUCKET is set, pass it explicitly to getStorage.
// Accept both plain bucket names and full gs:// URLs.
function makeStorage() {
  try {
    const bucket = (firebaseConfig as any).storageBucket as string | undefined;
    if (bucket && typeof bucket === "string" && bucket.trim() !== "") {
      const gsUrl = bucket.startsWith("gs://") ? bucket : `gs://${bucket}`;
      return getStorage(app, gsUrl);
    }
    return getStorage(app);
  } catch {
    return getStorage(app);
  }
}

export const storage = makeStorage();

// Optional: connect to local emulators during development to avoid hitting
// remote quotas (e.g., email link daily limits). Enable with VITE_USE_FIREBASE_EMULATORS=true
if (import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true") {
  try {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    try {
      connectStorageEmulator(storage, "127.0.0.1", 9199);
    } catch {}
    // Note: Do not use emulators in production builds
    // eslint-disable-next-line no-console
    console.info(
      "[Firebase] Connected to local emulators (Auth:9099, Firestore:8080)"
    );
  } catch {
    // Best-effort: if emulator not running, ignore
  }
}

export default app;
