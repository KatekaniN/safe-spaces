import { useCallback, useEffect, useRef, useState } from "react";
import {
  saveRecording,
  uploadRecordingToCloud,
  enqueuePendingUpload,
} from "../lib/api.ts";
import { triggerPanicAlert, getWhatsAppLinksForContacts } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

type Options = {
  onUploadSuccess?: () => void;
  emergencyDurationSec?: number; // default 20
  includeLiveTracking?: boolean; // when true, include a directions link in alert
};

export function useSafetyMonitor(opts: Options = {}) {
  const {
    onUploadSuccess,
    emergencyDurationSec = 20,
    includeLiveTracking = false,
  } = opts;
  const { user } = useAuth();
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTriggerRecording, setIsTriggerRecording] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [countdown, setCountdown] = useState<number>(emergencyDurationSec);
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

  const startEmergency = useCallback(async () => {
    if (isRecording) return;
    setStatusMessage("Requesting microphone permission…");
    try {
      try {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              geoRef.current = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              };
            },
            () => {
              geoRef.current = null;
            },
            { maximumAge: 15000 }
          );
        }
      } catch {}
      // Fire off panic alert immediately (best-effort) with location + selfie
      if (user?.uid) {
        (async () => {
          try {
            const liveUrl =
              includeLiveTracking && geoRef.current
                ? `https://www.google.com/maps/dir/?api=1&destination=${geoRef.current.lat},${geoRef.current.lng}&travelmode=driving`
                : null;
            const res = await triggerPanicAlert(user.uid, {
              location: geoRef.current,
              name: user.displayName || undefined,
              liveTrackingUrl: liveUrl,
            });
            // Only attempt WhatsApp if the user has saved emergency contacts
            const hasContacts = (res.contacts || []).length > 0;
            if (hasContacts) {
              const links = getWhatsAppLinksForContacts(
                res.contacts,
                res.shareText
              );
              // Prefer opening a single chooser if multiple; otherwise first contact
              const target =
                links.length > 1
                  ? { url: links[0].url }
                  : { url: links[0].url };
              try {
                window.open(target.url, "_blank");
                setStatusMessage("Opened WhatsApp to notify contacts");
              } catch {
                // Fallback: navigate current tab
                try {
                  window.location.href = target.url;
                } catch {}
              }
            } else {
              setStatusMessage(
                "Add emergency contacts in Profile to enable WhatsApp alerts"
              );
            }
          } catch {
            // ignore failures
          }
        })();
      }
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
              // Queue for background sync if cloud upload fails (offline, CORS, etc.)
              try {
                await enqueuePendingUpload(
                  blob,
                  name,
                  geoRef.current || undefined
                );
                if ("serviceWorker" in navigator) {
                  try {
                    const reg = await navigator.serviceWorker.ready;
                    // Register a sync; tag handled in sw to trigger app-side processing
                    // if SyncManager unsupported, this will throw and we ignore
                    // Fallback processing will happen on next app start/online event
                    // @ts-ignore
                    await reg.sync?.register?.("upload-recordings");
                  } catch {}
                }
              } catch {}
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
    } catch (e: any) {
      setStatusMessage(e?.message || "Microphone permission denied");
    }
  }, [
    emergencyDurationSec,
    includeLiveTracking,
    isRecording,
    onUploadSuccess,
    stopEmergency,
  ]);

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

  return {
    isListening,
    isRecording,
    isTriggerRecording,
    statusMessage,
    countdown,
    triggerWords,
    addTrigger,
    deleteTrigger,
    startRecordTrigger,
    stopRecordTrigger,
    startEmergency,
    stopEmergency,
  };
}
