// app.js - client-side logic
(() => {
    // Elements
    const triggerInput = document.getElementById('triggerInput');
    const saveTriggerBtn = document.getElementById('saveTriggerBtn');
    const toggleListenBtn = document.getElementById('toggleListenBtn');
    const listeningText = document.getElementById('listeningText');
    const recordingText = document.getElementById('recordingText');
    const recordIndicator = document.getElementById('recordIndicator');
    const countdownEl = document.getElementById('countdown');
    const messages = document.getElementById('messages');
    const recordingsList = document.getElementById('recordingsList');

    // state
    let recognition = null;
    let listening = false;
    let mediaRecorder = null;
    let audioChunks = [];
    let countdownTimer = null;
    let countdownRemaining = 0;
    let triggerWord = localStorage.getItem('secretTrigger') || '';
    let triggerWordNormalized = triggerWord ? normalizeForThreatDetection(triggerWord) : '';
    const RECORD_DURATION_MS = 10 * 1000; // exactly 1 minute

    // keyword detection config
    const THREAT_PHRASES = [
        'help me',
        'please help',
        'call the police',
        'call 911',
        'life in danger',
        'i will kill you',
        'ill kill you',
        'i will hurt you',
        'ill hurt you',
        'i will stab you',
        'ill stab you',
        'i will shoot you',
        'ill shoot you',
        'i am going to kill you',
        'im going to kill you',
        'i am going to hurt you',
        'im going to hurt you',
        'he is going to kill me',
        'she is going to kill me',
        'he is hurting me',
        'she is hurting me',
        'stop it',
        'stop hurting me',
        'stop hurting her',
        'stop hurting him',
        'blood everywhere',
        "if you don't do that ill kill you",
        "if you dont do that ill kill you",
        "if you don't do that i will kill you",
        "if you dont do that i will kill you"
    ];

    const THREAT_TOKENS = [
        'kill',
        'killing',
        'knife',
        'gun',
        'weapon',
        'danger',
        'dangerous',
        'threat',
        'threatening',
        'violence',
        'violent',
        'abuse',
        'abusing',
        'fight',
        'fighting',
        'attack',
        'attacking',
        'hurt',
        'hurting',
        'punch',
        'punching',
        'kick',
        'kicking',
        'scream',
        'screaming',
        'shoot',
        'shooting',
        'stab',
        'stabbing',
        'blood',
        'bleeding',
        'drown',
        'drowning',
        'strangle',
        'strangling'
    ];

    // audio-based aggression thresholds
    const RMS_THRESHOLD = 0.12;            // slightly lowered
    const RMS_FRAMES_REQUIRED = 8;         // ~130ms at 60fps
    const PEAK_THRESHOLD = 0.5;            // instantaneous yell / scream
    const THREAT_COOLDOWN_MS = 45 * 1000;  // avoid duplicate recordings

    let monitorStream = null;
    let aggressionMonitor = null;
    let threatCooldownActive = false;
    let messageLockTimer = null;

    // initialize UI
    triggerInput.value = triggerWord;
    updateUI();

    // request microphone access on load so permissions prompt appears early
    async function requestMic() {
        try {
            const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            tempStream.getTracks().forEach(track => track.stop());
            showMessage('Microphone permission granted.');
        } catch (err) {
            showMessage('Microphone access denied or unavailable. App will not work without permission.', true);
        }
    }

    // Save trigger
    saveTriggerBtn.addEventListener('click', () => {
        const val = triggerInput.value.trim();
        if (!val) {
            showMessage('Trigger word cannot be empty.', true);
            return;
        }
        if (val.length > 50) {
            showMessage('Trigger word too long.', true);
            return;
        }
        triggerWord = val;
        triggerWordNormalized = normalizeForThreatDetection(triggerWord);
        localStorage.setItem('secretTrigger', triggerWord);
        showMessage(`Trigger saved: "${triggerWord}"`);
    });

    // Toggle listening
    toggleListenBtn.addEventListener('click', () => {
        if (listening) {
            stopRecognition();
        } else {
            startRecognition().catch(err => {
                console.error('Failed to start recognition', err);
                showMessage('Failed to start listening: ' + (err.message || err), true);
            });
        }
    });

    // show short messages
    function showMessage(text, isError = false) {
        if (messageLockTimer) {
            clearTimeout(messageLockTimer);
            messageLockTimer = null;
        }
        messages.textContent = text;
        messages.style.color = isError ? 'darkred' : '';
        // lock message for 600ms so "Heard: ..." doesn't instantly overwrite
        messageLockTimer = setTimeout(() => {
            messageLockTimer = null;
        }, 600);
    }

    function maybeShowMessage(text) {
        if (messageLockTimer) return;
        showMessage(text);
    }

    function updateUI() {
        listeningText.textContent = listening ? 'listening' : 'stopped';
        toggleListenBtn.textContent = listening ? 'Stop Listening' : 'Start Listening';
    }

    // load list of saved recordings
    async function loadRecordings() {
        recordingsList.innerHTML = '<div class="text-muted">Loading...</div>';
        try {
            const r = await fetch('/api/recordings/list');
            const list = await r.json();
            if (list.length === 0) {
                recordingsList.innerHTML = '<div class="text-muted">No recordings yet.</div>';
                return;
            }
            recordingsList.innerHTML = '';
            for (const item of list) {
                const div = document.createElement('div');
                div.className = 'list-group-item';
                div.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>${item.name}</div>
                    <div>
                        <a class="btn btn-sm btn-outline-secondary me-2" href="${item.url}">Download</a>
                    </div>
                </div>
                <audio controls src="${item.url}"></audio>
            `;
                recordingsList.appendChild(div);
            }
        } catch (err) {
            recordingsList.innerHTML = '<div class="text-danger">Failed to load recordings.</div>';
        }
    }

    // Speech recognition setup
    function createRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return null;
        const r = new SpeechRecognition();
        r.continuous = true;
        r.interimResults = false;
        r.lang = navigator.language || 'en-US';
        r.maxAlternatives = 1;

        r.onstart = () => {
            listening = true;
            updateUI();
            showMessage('Speech recognition started. Monitoring for safety keywords and tone.');
        };
        r.onerror = (e) => {
            console.error('SpeechRecognition error', e);
            showMessage('Speech recognition error: ' + (e.error || 'unknown'), true);
        };
        r.onend = () => {
            listening = false;
            updateUI();
            stopAggressionMonitor();
            showMessage('Speech recognition stopped.');
        };
        r.onresult = (event) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    const transcript = result[0].transcript.trim();
                    console.log('Recognized:', transcript);
                    maybeShowMessage(`Heard: "${transcript}"`);
                    checkForTriggers(transcript);
                }
            }
        };
        return r;
    }

    async function startRecognition() {
        if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
            showMessage('Web Speech API not available in this browser. Use Chrome/Edge (Chromium).', true);
            return;
        }
        recognition = createRecognition();
        if (!recognition) {
            showMessage('SpeechRecognition not supported.', true);
            return;
        }
        try {
            await startAggressionMonitor();
        } catch (err) {
            console.warn('Aggression monitor unavailable', err);
            showMessage('Aggression tone detection unavailable: ' + (err.message || err), true);
        }
        try {
            recognition.start();
            if (!triggerWord) {
                showMessage('Listening for built-in safety keywords and tone cues (no custom trigger set).');
            }
        } catch (err) {
            console.warn('recognition.start error', err);
        }
    }

    function stopRecognition() {
        if (recognition) {
            recognition.onresult = null;
            recognition.onend = null;
            try { recognition.stop(); } catch { }
            recognition = null;
        }
        listening = false;
        updateUI();
        stopAggressionMonitor();
    }

    async function ensureMonitorStream() {
        if (monitorStream && monitorStream.active) return monitorStream;
        monitorStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        return monitorStream;
    }

    async function startAggressionMonitor() {
        if (aggressionMonitor) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) {
            console.warn('AudioContext not supported; tone-based aggression detection disabled.');
            return;
        }
        const stream = await ensureMonitorStream();
        const ctx = new AudioContext();
        if (ctx.state === 'suspended') {
            try { await ctx.resume(); } catch (err) { console.warn('Unable to resume AudioContext', err); }
        }
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        const data = new Uint8Array(analyser.fftSize);
        const monitorState = {
            ctx,
            source,
            analyser,
            data,
            framesAbove: 0,
            rafId: null
        };

        const monitorLoop = () => {
            analyser.getByteTimeDomainData(data);
            let sum = 0;
            let peak = 0;
            for (let i = 0; i < data.length; i++) {
                const v = (data[i] - 128) / 128;
                sum += v * v;
                const abs = Math.abs(v);
                if (abs > peak) peak = abs;
            }
            const rms = Math.sqrt(sum / data.length);

            if (peak >= PEAK_THRESHOLD) {
                triggerRecording('High-intensity vocal spike detected');
                monitorState.framesAbove = 0;
            } else if (rms > RMS_THRESHOLD) {
                monitorState.framesAbove = Math.min(monitorState.framesAbove + 1, RMS_FRAMES_REQUIRED + 2);
                if (monitorState.framesAbove >= RMS_FRAMES_REQUIRED) {
                    triggerRecording('Aggressive tone detected');
                    monitorState.framesAbove = 0;
                }
            } else {
                monitorState.framesAbove = Math.max(0, monitorState.framesAbove - 1);
            }

            monitorState.rafId = requestAnimationFrame(monitorLoop);
        };

        monitorState.rafId = requestAnimationFrame(monitorLoop);
        aggressionMonitor = monitorState;
    }

    function stopAggressionMonitor() {
        if (!aggressionMonitor) return;
        if (aggressionMonitor.rafId) cancelAnimationFrame(aggressionMonitor.rafId);
        try { aggressionMonitor.source.disconnect(); } catch { }
        try { aggressionMonitor.analyser.disconnect(); } catch { }
        aggressionMonitor.ctx.close().catch(() => { });
        aggressionMonitor = null;
        if (monitorStream) {
            monitorStream.getTracks().forEach(track => track.stop());
            monitorStream = null;
        }
        threatCooldownActive = false;
    }

    function normalizeForThreatDetection(text) {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function checkForTriggers(transcript) {
        const normalized = normalizeForThreatDetection(transcript);
        if (!normalized) return;

        console.debug('Normalized transcript:', normalized);

        if (triggerWordNormalized && normalized.includes(triggerWordNormalized)) {
            console.debug('Matched custom trigger:', triggerWordNormalized);
            triggerRecording(`Trigger word "${triggerWord}" detected`);
            return;
        }

        for (const phrase of THREAT_PHRASES) {
            if (normalized.includes(phrase)) {
                console.debug('Matched threat phrase:', phrase);
                triggerRecording(`Safety phrase "${phrase}" detected`);
                return;
            }
        }

        const tokens = new Set(normalized.split(' '));
        for (const token of THREAT_TOKENS) {
            if (tokens.has(token)) {
                console.debug('Matched threat token:', token);
                triggerRecording(`Safety keyword "${token}" detected`);
                return;
            }
        }
    }

    function triggerRecording(reason) {
        if (!listening) return;
        if (threatCooldownActive) {
            console.debug(`Trigger suppressed (cooldown): ${reason}`);
            return;
        }
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            console.debug(`Trigger suppressed (already recording): ${reason}`);
            return;
        }
        console.info('Triggering recording:', reason);
        showMessage(`${reason}. Starting 60s recording...`);
        startRecordingFor60s().catch(err => {
            console.error('triggerRecording -> startRecordingFor60s error', err);
            showMessage('Could not start recording: ' + (err.message || err), true);
        });
        threatCooldownActive = true;
        setTimeout(() => { threatCooldownActive = false; }, THREAT_COOLDOWN_MS);
    }

    // Recording logic: start MediaRecorder for exactly 60 seconds
    async function startRecordingFor60s() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showMessage('Media devices API not available.', true);
            return;
        }
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            showMessage('Already recording.', true);
            return;
        }

        try {
            let stream;
            if (monitorStream && monitorStream.active) {
                const clonedTracks = monitorStream.getAudioTracks().map(track => track.clone());
                stream = new MediaStream(clonedTracks);
            } else {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            }
            audioChunks = [];
            mediaRecorder = new MediaRecorder(stream);

            mediaRecorder.ondataavailable = e => {
                if (e.data && e.data.size > 0) audioChunks.push(e.data);
            };

            mediaRecorder.onstart = () => {
                recordingText.textContent = 'recording';
                recordIndicator.style.display = 'inline';
                startCountdown(RECORD_DURATION_MS / 1000);
            };

            mediaRecorder.onstop = async () => {
                recordingText.textContent = 'idle';
                recordIndicator.style.display = 'none';
                stopCountdown();

                const blob = new Blob(audioChunks, { type: 'audio/webm' });
                const filenameBase = `recording`;
                const file = new File([blob], `${filenameBase}.webm`, { type: 'audio/webm' });

                // upload to server
                const fd = new FormData();
                fd.append('file', file, file.name);
                showMessage('Uploading recording...');
                try {
                    const res = await fetch('/api/recordings/upload', { method: 'POST', body: fd });
                    if (!res.ok) throw new Error('Upload failed');
                    const json = await res.json();
                    showMessage('Saved: ' + json.filename);
                    await loadRecordings();
                } catch (err) {
                    console.error(err);
                    showMessage('Upload failed.', true);
                } finally {
                    stream.getTracks().forEach(t => t.stop());
                }
            };

            mediaRecorder.start();

            // Stop after exact duration
            setTimeout(() => {
                if (mediaRecorder && mediaRecorder.state === 'recording') {
                    mediaRecorder.stop();
                }
            }, RECORD_DURATION_MS);

        } catch (err) {
            console.error('startRecordingFor60s error', err);
            showMessage('Could not start recording: ' + (err.message || err), true);
        }
    }

    // Countdown UI
    function startCountdown(seconds) {
        countdownRemaining = seconds;
        countdownEl.textContent = `(${countdownRemaining}s)`;
        countdownTimer = setInterval(() => {
            countdownRemaining--;
            countdownEl.textContent = `(${countdownRemaining}s)`;
            if (countdownRemaining <= 0) stopCountdown();
        }, 1000);
    }
    function stopCountdown() {
        if (countdownTimer) {
            clearInterval(countdownTimer);
            countdownTimer = null;
        }
        countdownEl.textContent = '';
    }

    // On load
    (async function init() {
        // request mic perms early
        await requestMic();
        // load recordings
        await loadRecordings();
        // show message about browser support
        if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
            showMessage('Note: Continuous speech recognition requires Web Speech API. Use Chrome/Edge (Chromium).', true);
        }
    })();

    // Ensure we stop recognition when the page unloads
    window.addEventListener('beforeunload', () => {
        stopRecognition();
        stopAggressionMonitor();
    });

})();