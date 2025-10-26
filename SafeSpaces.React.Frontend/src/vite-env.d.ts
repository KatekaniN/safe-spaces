/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY: string;
  // Add more env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

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

// 2. Extend the global Window interface to include these non-standard APIs
interface Window {
    // For Safari and older Chrome versions
    webkitAudioContext: typeof AudioContext;

    // For modern Chrome/Edge
    SpeechRecognition: { new(): SpeechRecognition; };

    // For Safari and older Chrome versions
    webkitSpeechRecognition: { new(): SpeechRecognition; };
}