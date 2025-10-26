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
// This object lives outside the hook's lifecycle. It's created once per session
// and survives all component re-renders and unmounts.
const recognitionEngine = {
    recognition: null as SpeechRecognition | null,
    isStarted: false,
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
        if (isRecording || threatCooldownRef.current) return;
        setStatusMessage(`${reason}. Starting recording...`);
        threatCooldownRef.current = true;
        setTimeout(() => { threatCooldownRef.current = false; }, THREAT_COOLDOWN_MS);
        try {
            const stream = monitorStreamRef.current || await navigator.mediaDevices.getUserMedia({ audio: true });
            if (!monitorStreamRef.current) monitorStreamRef.current = stream;
            audioChunksRef.current = [];
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.ondataavailable = e => { if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data); };
            mediaRecorder.onstart = () => {
                setIsRecording(true);
                setCountdown(RECORD_DURATION_MS / 1000);
                countdownTimerRef.current = setInterval(() => { setCountdown(prev => Math.max(0, prev - 1)); }, 1000);
            };
            mediaRecorder.onstop = async () => {
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
        } catch (err) { setStatusMessage('Could not start recording.'); console.error(err); }
    }, [isRecording, onUploadSuccess]);

    // --- THE FIX (Part 2): Main Lifecycle Effect ---
    useEffect(() => {
        console.log("DEBUG: SafetyListenerPage MOUNTED. Setting up listener.");

        const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognitionAPI) {
            setStatusMessage('Speech recognition not available in this browser.');
            return;
        }

        // If the engine hasn't been created yet, create and configure it once.
        if (!recognitionEngine.recognition) {
            console.log("DEBUG: Creating new SpeechRecognition instance.");
            recognitionEngine.recognition = new SpeechRecognitionAPI();
            const recognition = recognitionEngine.recognition;

            recognition.continuous = true;
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;

            recognition.onstart = () => {
                console.log('DEBUG: EVENT -> onstart fired.');
                setIsListening(true);
                setStatusMessage('Listener is active.');
            };

            recognition.onend = () => {
                console.log('DEBUG: EVENT -> onend fired.');
                setIsListening(false);
                if (recognitionEngine.isStarted) {
                    console.log("DEBUG: Listener ended unexpectedly, restarting...");
                    setStatusMessage('Listener connection lost. Reconnecting...');
                    setTimeout(() => recognition.start(), 500);
                }
            };

            recognition.onerror = (e: any) => {
                console.error('DEBUG: EVENT -> onerror fired.', e);
                setStatusMessage(`Speech recognition error: ${e.error}`);
            };

            recognition.onresult = (event: any) => {
                const transcript = event.results[event.results.length - 1][0].transcript.trim();
                console.log(`DEBUG: EVENT -> onresult fired. Transcript: "${transcript}"`);

                const normalized = normalizeForThreatDetection(transcript);
                if (!normalized) return;

                const customTriggersNormalized = triggerWordsRef.current.map(normalizeForThreatDetection);
                const customTriggerFound = customTriggersNormalized.find(t => normalized.includes(t));
                const threatPhraseFound = THREAT_PHRASES.find(p => normalized.includes(p));
                const threatTokenFound = THREAT_TOKENS.find(t => normalized.split(' ').includes(t));

                if (customTriggerFound) { startRecording(`Custom trigger "${customTriggerFound}" detected`); }
                else if (threatPhraseFound) { startRecording(`Safety phrase "${threatPhraseFound}" detected`); }
                else if (threatTokenFound) { startRecording(`Safety keyword "${threatTokenFound}" detected`); }
            };
        }

        // Start the engine if it's not already running
        const startEngine = async () => {
            if (!recognitionEngine.isStarted) {
                try {
                    // Ensure we have mic permission before starting
                    monitorStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
                    console.log("DEBUG: Calling recognition.start()");
                    recognitionEngine.isStarted = true;
                    recognitionEngine.recognition!.start();
                } catch (err) {
                    console.error("DEBUG: Microphone permission denied or failed.", err);
                    setStatusMessage('Microphone access is required for this app to function.');
                }
            }
        };

        startEngine();
        loadTriggers();

        // This cleanup function runs when the component unmounts.
        return () => {
            console.log("DEBUG: SafetyListenerPage UNMOUNTING. Listener will remain active.");
            // We intentionally DO NOT stop the listener here.
            // It will continue to run for the entire browser session.
        };
    }, [loadTriggers, startRecording]); // Dependencies are stable.

    const startRecordTrigger = () => {
        const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognitionAPI) return;
        // Temporarily stop the main listener
        if (recognitionEngine.isStarted) {
            recognitionEngine.isStarted = false; // Prevent auto-restart
            recognitionEngine.recognition?.stop();
        }
        setIsTriggerRecording(true);
        const triggerRecorder = new SpeechRecognitionAPI();
        triggerRecorderRef.current = triggerRecorder;
        triggerRecorder.continuous = false;
        triggerRecorder.interimResults = false;
        triggerRecorder.onresult = (event) => { const transcript = event.results[0][0].transcript.trim(); if (transcript) addTrigger(transcript); };
        triggerRecorder.onend = () => {
            setIsTriggerRecording(false);
            // Restart the main listener
            if (!recognitionEngine.isStarted) {
                recognitionEngine.isStarted = true;
                recognitionEngine.recognition?.start();
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