import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { saveRecording, uploadRecordingToCloud } from "../lib/api.ts";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import {
  createPanicAlert,
  getUserProfile,
  listPoliceStations,
  pickNearestStation,
  type PoliceStation,
  type PanicAlertStatus,
} from "../lib/data";

type Options = {
  onUploadSuccess?: () => void;
  emergencyDurationSec?: number; // default 20
};

let policeStationsCache: PoliceStation[] | null = null;
let policeStationsPromise: Promise<PoliceStation[]> | null = null;

async function getPoliceStationsCached(): Promise<PoliceStation[]> {
  if (policeStationsCache) return policeStationsCache;
  if (!policeStationsPromise) {
    policeStationsPromise = listPoliceStations()
      .then((stations) => {
        policeStationsCache = stations;
        return stations;
      })
      .catch((err) => {
        policeStationsPromise = null;
        throw err;
      });
  }
  return policeStationsPromise.catch(() => []);
}

function requestLocation(
  geoRef: MutableRefObject<{ lat: number; lng: number } | null>,
  timeoutMs = 5000
): Promise<{ lat: number; lng: number } | null> {
  if (!("geolocation" in navigator)) {
    geoRef.current = null;
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      settled = true;
      resolve(null);
    }, timeoutMs);
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (settled) return;
          window.clearTimeout(timer);
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          geoRef.current = coords;
          settled = true;
          resolve(coords);
        },
        () => {
          if (settled) return;
          window.clearTimeout(timer);
          geoRef.current = null;
          settled = true;
          resolve(null);
        },
        { maximumAge: 15000, enableHighAccuracy: true }
      );
    } catch {
      if (settled) return;
      window.clearTimeout(timer);
      geoRef.current = null;
      settled = true;
      resolve(null);
    }
  });
}

export function useSafetyMonitor(opts: Options = {}) {
  const { onUploadSuccess, emergencyDurationSec = 20 } = opts;
  const { user } = useAuth();
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTriggerRecording, setIsTriggerRecording] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [countdown, setCountdown] = useState<number>(emergencyDurationSec);
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);
  const [activeAlertStatus, setActiveAlertStatus] =
    useState<PanicAlertStatus | null>(null);
  const [alertNotification, setAlertNotification] = useState<string | null>(
    null
  );
  const [triggerWords, setTriggerWords] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("safe_triggers");
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  // Media
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recChunksRef = useRef<Blob[]>([]);
  const activeAlertUnsubRef = useRef<(() => void) | null>(null);
  const lastAlertStatusRef = useRef<PanicAlertStatus | null>(null);

  // Speech
  const recRef = useRef<any | null>(null);
  const supportsSpeech = !!(
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );

  const saveTriggers = (list: string[]) => {
    setTriggerWords(list);
    try {
      localStorage.setItem("safe_triggers", JSON.stringify(list));
    } catch {}
  };

  const addTrigger = useCallback(
    (text: string) => {
      const t = text.trim().toLowerCase();
      if (!t) return false;
      if (triggerWords.includes(t)) return false;
      const next = [...triggerWords, t];
      saveTriggers(next);
      setStatusMessage("Trigger saved");
      return true;
    },
    [triggerWords]
  );

  const deleteTrigger = useCallback(
    (text: string) => {
      const next = triggerWords.filter((w) => w !== text);
      saveTriggers(next);
    },
    [triggerWords]
  );

  // Emergency recording lifecycle
  const stopEmergency = useCallback(async () => {
    try {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    } catch {
    } finally {
      setIsRecording(false);
      setCountdown(emergencyDurationSec);
    }
  }, [emergencyDurationSec]);

  const geoRef = useRef<{ lat: number; lng: number } | null>(null);

  // Attach real-time listener for the active panic alert so the user is notified when status changes
  useEffect(() => {
    if (!user?.uid || !activeAlertId) {
      activeAlertUnsubRef.current?.();
      activeAlertUnsubRef.current = null;
      return;
    }
    const alertDoc = doc(db, "users", user.uid, "panicAlerts", activeAlertId);
    const unsub = onSnapshot(alertDoc, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as { status?: PanicAlertStatus | string };
      const nextStatus = (data?.status as PanicAlertStatus | undefined) || null;
      if (!nextStatus) return;
      setActiveAlertStatus(nextStatus);
      if (nextStatus !== lastAlertStatusRef.current) {
        lastAlertStatusRef.current = nextStatus;
        if (nextStatus === "acknowledged") {
          setAlertNotification("Alert acknowledged, authorities alerted");
          setStatusMessage("");
        } else if (nextStatus === "resolved") {
          setAlertNotification(null);
          setStatusMessage(
            "Emergency marked resolved by responders. Follow their instructions."
          );
        }
      }
    });
    activeAlertUnsubRef.current = unsub;
    return () => {
      unsub();
      if (activeAlertUnsubRef.current === unsub) {
        activeAlertUnsubRef.current = null;
      }
    };
  }, [user?.uid, activeAlertId]);

  // On auth change, pull the latest panic alert so returning users know the current status
  useEffect(() => {
    if (!user?.uid) {
      setActiveAlertId(null);
      setActiveAlertStatus(null);
      setAlertNotification(null);
      lastAlertStatusRef.current = null;
      activeAlertUnsubRef.current?.();
      activeAlertUnsubRef.current = null;
      return;
    }
    if (activeAlertId) return;
    let cancelled = false;
    (async () => {
      try {
        const latestQuery = query(
          collection(db, "users", user.uid, "panicAlerts"),
          orderBy("createdAt", "desc"),
          limit(1)
        );
        const snap = await getDocs(latestQuery);
        if (cancelled || snap.empty) return;
        const docSnap = snap.docs[0];
        const data = docSnap.data() as { status?: PanicAlertStatus | string };
        const status = (data?.status as PanicAlertStatus | undefined) || "open";
        lastAlertStatusRef.current = status;
        setActiveAlertStatus(status);
        setActiveAlertId(docSnap.id);
        if (status === "acknowledged") {
          setAlertNotification("Alert acknowledged, authorities alerted");
          setStatusMessage("");
        } else if (status === "resolved") {
          setAlertNotification(null);
          setStatusMessage(
            "Emergency marked resolved by responders. Follow their instructions."
          );
        }
      } catch (err) {
        console.warn("Failed to load latest panic alert", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, activeAlertId]);

  const startEmergency = useCallback(async () => {
    if (isRecording) return;
    setStatusMessage("Requesting microphone permission…");
    try {
      const locationPromise = requestLocation(geoRef);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      recChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      recorderRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recChunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        try {
          const blob = new Blob(recChunksRef.current, { type: "audio/webm" });
          const name = `recording_${new Date().toISOString()}.webm`;
          await saveRecording(blob, name);
          if (user?.uid) {
            try {
              await uploadRecordingToCloud(
                user.uid,
                blob,
                name,
                geoRef.current
              );
            } catch (e) {
              // cloud upload failed; local save still exists
            }
          }
          setStatusMessage("Recording saved");
          onUploadSuccess && onUploadSuccess();
        } catch (e: any) {
          setStatusMessage(e?.message || "Failed to save recording");
        }
      };
      mr.start();
      setIsRecording(true);
      setStatusMessage("Emergency recording started");
      // countdown timer
      let remaining = emergencyDurationSec;
      setCountdown(remaining);
      const id = window.setInterval(() => {
        remaining -= 1;
        setCountdown(remaining);
        if (remaining <= 0) {
          window.clearInterval(id);
          stopEmergency();
        }
      }, 1000);

      let currentLocation: { lat: number; lng: number } | null = null;
      try {
        currentLocation = await locationPromise;
      } catch {
        currentLocation = geoRef.current;
      }

      if (!geoRef.current && currentLocation) {
        geoRef.current = currentLocation;
      }

      if (user?.uid) {
        try {
          const [profile, stations] = await Promise.all([
            getUserProfile(user.uid),
            getPoliceStationsCached().catch(() => []),
          ]);
          const nearest = currentLocation
            ? pickNearestStation(stations, currentLocation)
            : null;
          const alertId = await createPanicAlert({
            uid: user.uid,
            location: currentLocation || undefined,
            nearestStation: nearest
              ? {
                  id: nearest.id,
                  name: nearest.name,
                  phone: nearest.phone,
                  email: nearest.email,
                  distanceKm: nearest.distanceKm,
                }
              : undefined,
            userSnapshot: profile
              ? {
                  name: profile.preferredName || profile.name,
                  phone: profile.phone,
                  email: profile.email,
                  province: profile.province,
                }
              : undefined,
          });
          setActiveAlertId(alertId);
          setActiveAlertStatus("open");
          lastAlertStatusRef.current = "open";
          setAlertNotification(null);
          setStatusMessage(
            "Emergency alert sent. Nearby responders are notified."
          );
        } catch (err) {
          console.warn("panic alert publication failed", err);
        }
      }
    } catch (e: any) {
      setStatusMessage(e?.message || "Microphone permission denied");
    }
  }, [emergencyDurationSec, isRecording, onUploadSuccess, stopEmergency]);

  // Background speech listener
  useEffect(() => {
    if (!supportsSpeech) {
      setStatusMessage(
        "Speech recognition not supported in this browser. Panic button still works."
      );
      return;
    }
    const Ctor: any =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase();
        if (triggerWords.some((w) => transcript.includes(w))) {
          setStatusMessage("Trigger phrase detected");
          startEmergency();
          break;
        }
      }
    };
    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    try {
      rec.start();
      setIsListening(true);
    } catch {}
    recRef.current = rec;
    return () => {
      try {
        rec.stop();
      } catch {}
      recRef.current = null;
    };
  }, [startEmergency, triggerWords, supportsSpeech]);

  // Record trigger phrase via speech to text (optional)
  const startRecordTrigger = useCallback(() => {
    if (!supportsSpeech) {
      setStatusMessage("Speech recognition not supported");
      return;
    }
    setIsTriggerRecording(true);
    const Ctor: any =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    const once = new Ctor();
    once.continuous = false;
    once.interimResults = false;
    once.lang = "en-US";
    once.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript.toLowerCase();
      addTrigger(transcript);
      setIsTriggerRecording(false);
    };
    once.onend = () => setIsTriggerRecording(false);
    try {
      once.start();
    } catch {
      setIsTriggerRecording(false);
    }
    recRef.current = once;
  }, [addTrigger, supportsSpeech]);

  const stopRecordTrigger = useCallback(() => {
    try {
      (recRef.current as any)?.stop?.();
    } catch {}
    setIsTriggerRecording(false);
  }, []);

  const dismissAlertNotification = useCallback(() => {
    setAlertNotification(null);
  }, []);

  return {
    isListening,
    isRecording,
    isTriggerRecording,
    statusMessage,
    countdown,
    activeAlertId,
    activeAlertStatus,
    alertNotification,
    dismissAlertNotification,
    triggerWords,
    addTrigger,
    deleteTrigger,
    startRecordTrigger,
    stopRecordTrigger,
    startEmergency,
    stopEmergency,
  };
}
