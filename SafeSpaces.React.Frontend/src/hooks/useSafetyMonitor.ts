import { useState, useEffect, useRef, useCallback } from 'react';
import { uploadRecording } from '../lib/api';

// --- Constants and Type Definitions ---
const RECORD_DURATION_MS = 10 * 1000;
const THREAT_COOLDOWN_MS = 45 * 1000;

const THREAT_PHRASES = [
    'help me', 'please help', 'call the police', 'call 10111', 'life in danger', 'i will kill you', 'ill kill you',
    'i will hurt you', 'ill hurt you', 'i will stab you', 'ill stab you', 'i will shoot you', 'ill shoot you',
    'i am going to kill you', 'im going to kill you', 'i am going to hurt you', 'im going to hurt you',
    'he is going to kill me', 'she is going to kill me', 'he is hurting me', 'she is hurting me', 'stop it',
    'stop hurting me', 'stop hurting her', 'stop hurting him', 'blood everywhere', "if you don't do that ill kill you",
    "if you dont do that ill kill you", "if you don't do that i will kill you", "if you dont do that i will kill you"
];

const THREAT_TOKENS = [
    'kill', 'killing', 'knife', 'gun', 'weapon', 'danger', 'dangerous', 'threat', 'threatening', 'violence',
    'violent', 'abuse', 'abusing', 'fight', 'fighting', 'attack', 'attacking', 'hurt', 'hurting', 'punch',
    'punching', 'kick', 'kicking', 'scream', 'screaming', 'shoot', 'shooting', 'stab', 'stabbing', 'blood',
    'bleeding', 'drown', 'drowning', 'strangle', 'strangling'
];

const RMS_THRESHOLD = 0.12;
const RMS_FRAMES_REQUIRED = 8;
const PEAK_THRESHOLD = 0.5;

const normalizeForThreatDetection = (text: string) => {
    return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
};

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    start: () => void;
    stop: () => void;
    onstart: (() => void) | null;
    onend: (() => void) | null;
    onresult: ((event: any) => void) | null;
    onerror: ((event: any) => void) | null;
}
declare var webkitSpeechRecognition: { new(): SpeechRecognition; };
declare var SpeechRecognition: { new(): SpeechRecognition; };

// --- THE FIX (Part 1): Singleton Engine ---
const recognitionEngine = {
    recognition: null as SpeechRecognition | null,
    isStarted: false,
    isStarting: false,
    retryCount: 0,
};

export function useSafetyMonitor({ onUploadSuccess }: { onUploadSuccess: () => void }) {
    const [isListening, setIsListening] = useState(recognitionEngine.isStarted);
    const [isRecording, setIsRecording] = useState(false);
    const [isTriggerRecording, setIsTriggerRecording] = useState(false);
    const [statusMessage, setStatusMessage] = useState('Initializing...');
    const [countdown, setCountdown] = useState(0);
    const [triggerWords, setTriggerWords] = useState<string[]>([]);

    const triggerRecorderRef = useRef<SpeechRecognition | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const monitorStreamRef = useRef<MediaStream | null>(null);
    const aggressionMonitorRef = useRef<any>(null);
    const threatCooldownRef = useRef(false);
    const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
    const triggerWordsRef = useRef(triggerWords);

    useEffect(() => {
        triggerWordsRef.current = triggerWords;
    }, [triggerWords]);

    const loadTriggers = useCallback(() => {
        const stored = localStorage.getItem('safeSpacesTriggers');
        try {
            const parsed = JSON.parse(stored || '[]');
            setTriggerWords(Array.isArray(parsed) ? parsed : []);
        } catch { setTriggerWords([]); }
    }, []);

    const saveTriggers = (words: string[]) => {
        localStorage.setItem('safeSpacesTriggers', JSON.stringify(words));
        setTriggerWords(words);
    };

    const addTrigger = (text: string) => {
        const val = text.trim();
        if (!val) { setStatusMessage('Trigger cannot be empty.'); return false; }
        const normalizedVal = normalizeForThreatDetection(val);
        const currentNormalized = triggerWords.map(normalizeForThreatDetection);
        if (currentNormalized.includes(normalizedVal)) { setStatusMessage(`Trigger "${val}" already exists.`); return false; }
        saveTriggers([...triggerWords, val]);
        setStatusMessage(`Trigger added: "${val}"`);
        return true;
    };

    const deleteTrigger = (wordToDelete: string) => {
        const newWords = triggerWords.filter(w => w !== wordToDelete);
        saveTriggers(newWords);
        setStatusMessage(`Trigger deleted: "${wordToDelete}"`);
    };

    const startRecording = useCallback(async (reason: string) => {
        console.log('DEBUG: startRecording called', { reason, isRecording, threatCooldown: threatCooldownRef.current });
        if (isRecording || threatCooldownRef.current) {
            console.log('DEBUG: startRecording aborted due to isRecording or cooldown', { isRecording, cooldown: threatCooldownRef.current });
            return;
        }
        setStatusMessage(`${reason}. Starting recording...`);
        threatCooldownRef.current = true;
        setTimeout(() => { threatCooldownRef.current = false; }, THREAT_COOLDOWN_MS);
        try {
            const stream = monitorStreamRef.current || await navigator.mediaDevices.getUserMedia({ audio: true });
            if (!monitorStreamRef.current) monitorStreamRef.current = stream;
            audioChunksRef.current = [];

            // Try safer MediaRecorder creation with fallback
            let mediaRecorder: MediaRecorder;
            try {
                mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' } as any);
            } catch (err) {
                console.warn('DEBUG: MediaRecorder with mimeType audio/webm failed, trying default:', err);
                try {
                    mediaRecorder = new MediaRecorder(stream);
                } catch (err2) {
                    console.error('DEBUG: MediaRecorder creation failed', err2);
                    setStatusMessage('Recording not supported in this browser.');
                    return;
                }
            }

            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.ondataavailable = e => { if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data); };
            mediaRecorder.onstart = () => {
                console.log('DEBUG: mediaRecorder onstart');
                setIsRecording(true);
                setCountdown(RECORD_DURATION_MS / 1000);
                countdownTimerRef.current = setInterval(() => { setCountdown(prev => Math.max(0, prev - 1)); }, 1000);
            };
            mediaRecorder.onstop = async () => {
                console.log('DEBUG: mediaRecorder onstop, chunks:', audioChunksRef.current.length);
                setIsRecording(false);
                if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                setCountdown(0);
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const file = new File([blob], `recording.webm`, { type: 'audio/webm' });
                setStatusMessage('Uploading recording...');
                try {
                    const result = await uploadRecording(file);
                    setStatusMessage(`Saved: ${result.filename}`);
                    onUploadSuccess();
                } catch (err) { setStatusMessage('Upload failed.'); console.error(err); }
            };
            mediaRecorder.start();
            setTimeout(() => { if (mediaRecorderRef.current?.state === 'recording') { mediaRecorderRef.current.stop(); } }, RECORD_DURATION_MS);
        } catch (err) { setStatusMessage('Could not start recording.'); console.error('DEBUG: startRecording error', err); }
    }, [isRecording, onUploadSuccess]);

    // --- THE FIX (Part 2): Main Lifecycle Effect ---
    useEffect(() => {
        console.log("DEBUG: SafetyListenerPage MOUNTED. Setting up listener.");

        const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognitionAPI) {
            setStatusMessage('Speech recognition not available in this browser.');
            return;
        }

        const startRecognition = () => {
            const recognition = recognitionEngine.recognition;
            if (!recognition) return;
            if (recognitionEngine.isStarted || recognitionEngine.isStarting) {
                console.log('DEBUG: startRecognition skipped — already started/starting', { isStarted: recognitionEngine.isStarted, isStarting: recognitionEngine.isStarting });
                return;
            }
            recognitionEngine.isStarting = true;
            try {
                console.log('DEBUG: calling recognition.start() (safe)');
                recognition.start();
            } catch (err) {
                console.error('DEBUG: recognition.start() threw synchronously', err);
                recognitionEngine.isStarting = false;
            }
        };

        if (!recognitionEngine.recognition) {
            console.log("DEBUG: Creating new SpeechRecognition instance.");
            recognitionEngine.recognition = new SpeechRecognitionAPI();
            const recognition = recognitionEngine.recognition;

            recognition.continuous = true;
            // Enable interim results so partial transcripts arrive quickly — helps capture transient triggers
            recognition.interimResults = true;
            recognition.maxAlternatives = 1;
            recognition.lang = navigator.language || 'en-US';

            recognition.onstart = () => {
                console.log('DEBUG: EVENT -> onstart fired.');
                recognitionEngine.retryCount = 0;
                recognitionEngine.isStarted = true;
                recognitionEngine.isStarting = false;
                setIsListening(true);
                setStatusMessage('Listener is active.');
            };

            recognition.onend = () => {
                console.log('DEBUG: EVENT -> onend fired.');
                recognitionEngine.isStarted = false;
                recognitionEngine.isStarting = false;
                setIsListening(false);
                // If the engine was intended to be running, restart quickly
                if (recognitionEngine.isStarted) {
                    console.log("DEBUG: Listener ended unexpectedly, restarting...");
                    setStatusMessage('Listener connection lost. Reconnecting...');
                    setTimeout(() => startRecognition(), 500);
                }
            };

            recognition.onerror = (e: any) => {
                console.error('DEBUG: EVENT -> onerror fired.', e);
                recognitionEngine.isStarted = false;
                recognitionEngine.isStarting = false;
                const errCode = e?.error || e?.message || 'unknown';
                setStatusMessage(`Speech recognition error: ${errCode}`);

                // Treat no-speech as recoverable — restart listening quickly
                if (errCode === 'no-speech') {
                    console.log('DEBUG: no-speech -> restarting recognition quickly');
                    // give a tiny delay to allow engine state to settle
                    setTimeout(() => startRecognition(), 250);
                    return;
                }

                if (errCode === 'network') {
                    if (recognitionEngine.retryCount < 5) {
                        const delay = 1000 * Math.pow(2, recognitionEngine.retryCount);
                        recognitionEngine.retryCount++;
                        console.log(`DEBUG: network error -> will retry in ${delay}ms (attempt ${recognitionEngine.retryCount})`);
                        setTimeout(() => startRecognition(), delay);
                    } else {
                        setStatusMessage('Speech service unavailable. Check network or try again later.');
                    }
                    return;
                }

                if (errCode === 'not-allowed' || errCode === 'service-not-allowed' || errCode === 'security') {
                    recognitionEngine.isStarted = false;
                    setStatusMessage('Microphone permission denied. Please allow microphone access for the site.');
                    return;
                }
            };

            recognition.onresult = (event: any) => {
                try {
                    console.log('DEBUG: onresult event', event);
                    // iterate from the provided resultIndex — each result may be interim or final
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        const res = event.results[i];
                        const transcript = res[0].transcript.trim();
                        const isFinal = res.isFinal;
                        console.log('DEBUG: result item', { index: i, transcript, isFinal });
                        if (!transcript) continue;

                        const normalized = normalizeForThreatDetection(transcript);
                        if (!normalized) continue;

                        const customTriggersNormalized = triggerWordsRef.current.map(normalizeForThreatDetection);
                        const customTriggerFound = customTriggersNormalized.find(t => normalized.includes(t));
                        const threatPhraseFound = THREAT_PHRASES.find(p => normalized.includes(p));
                        const threatTokenFound = THREAT_TOKENS.find(t => normalized.split(' ').includes(t));

                        console.log('DEBUG: trigger checks', { customTriggerFound, threatPhraseFound, threatTokenFound, triggers: triggerWordsRef.current, isFinal });

                        // Prefer final results, but allow interim to trigger if it clearly contains the full trigger
                        if (customTriggerFound || threatPhraseFound || threatTokenFound) {
                            const label = customTriggerFound ? `Custom trigger "${customTriggerFound}"` :
                                threatPhraseFound ? `Safety phrase "${threatPhraseFound}"` :
                                    `Safety keyword "${threatTokenFound}"`;
                            console.log(`DEBUG: matched => ${label} (isFinal=${isFinal})`);
                            // start recording on match — if interim matched, it's okay to trigger immediately
                            startRecording(`${label} detected`);
                            // don't attempt multiple starts from multiple result entries
                            break;
                        }
                    }
                } catch (err) {
                    console.error('DEBUG: onresult handler error', err);
                }
            };
        }

        const startEngine = async () => {
            if (recognitionEngine.isStarted || recognitionEngine.isStarting) {
                console.log('DEBUG: startEngine skipped — recognition already started/starting');
                return;
            }
            try {
                monitorStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
                console.log("DEBUG: Microphone access granted; attempting to start recognition");
                startRecognition();
            } catch (err) {
                console.error("DEBUG: Microphone permission denied or failed.", err);
                recognitionEngine.isStarted = false;
                recognitionEngine.isStarting = false;
                setStatusMessage('Microphone access is required for this app to function.');
            }
        };

        startEngine();
        loadTriggers();

        return () => {
            console.log("DEBUG: SafetyListenerPage UNMOUNTING. Listener will remain active.");
        };
    }, [loadTriggers, startRecording]);

    const startRecordTrigger = () => {
        const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognitionAPI) return;
        if (recognitionEngine.isStarted || recognitionEngine.isStarting) {
            recognitionEngine.isStarted = false;
            recognitionEngine.isStarting = false;
            try { recognitionEngine.recognition?.stop(); } catch (err) { console.error('DEBUG: stop threw', err); }
        }
        setIsTriggerRecording(true);
        const triggerRecorder = new SpeechRecognitionAPI();
        triggerRecorderRef.current = triggerRecorder;
        triggerRecorder.continuous = false;
        triggerRecorder.interimResults = false;
        triggerRecorder.onresult = (event) => { const transcript = event.results[0][0].transcript.trim(); if (transcript) addTrigger(transcript); };
        triggerRecorder.onend = () => {
            setIsTriggerRecording(false);
            if (recognitionEngine.recognition) {
                setTimeout(() => {
                    try {
                        if (!recognitionEngine.isStarted && !recognitionEngine.isStarting) {
                            recognitionEngine.isStarting = true;
                            recognitionEngine.recognition!.start();
                        }
                    } catch (err) {
                        console.error('DEBUG: restart main recognizer failed', err);
                        recognitionEngine.isStarted = false;
                        recognitionEngine.isStarting = false;
                    }
                }, 200);
            }
        };
        triggerRecorder.start();
    };

    const stopRecordTrigger = () => { if (triggerRecorderRef.current) { triggerRecorderRef.current.stop(); } };

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
    };
}