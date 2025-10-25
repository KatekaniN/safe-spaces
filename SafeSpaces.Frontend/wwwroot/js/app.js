// wwwroot/js/app.js
(() => {
    'use strict';

    const API_BASE_URL = window.SafeSpacesConfig?.apiBaseUrl ?? '';

    const triggerInput = document.getElementById('triggerInput');
    const addTextTriggerBtn = document.getElementById('addTextTriggerBtn');
    const recordTriggerBtn = document.getElementById('recordTriggerBtn');
    const triggersList = document.getElementById('triggersList');
    const listeningText = document.getElementById('listeningText');
    const recordingText = document.getElementById('recordingText');
    const recordIndicator = document.getElementById('recordIndicator');
    const countdownEl = document.getElementById('countdown');
    const messages = document.getElementById('messages');
    const recordingsList = document.getElementById('recordingsList');

    let recognition = null;
    let triggerRecorderRecognition = null;
    let listening = false;
    let isPausingForTrigger = false;

    let mediaRecorder = null;
    let audioChunks = [];
    let countdownTimer = null;
    let countdownRemaining = 0;

    let triggerWords = [];
    let triggerWordsNormalized = [];

    const RECORD_DURATION_MS = 10 * 1000;

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
    const THREAT_COOLDOWN_MS = 45 * 1000;

    let monitorStream = null;
    let aggressionMonitor = null;
    let threatCooldownActive = false;
    let messageLockTimer = null;

    function renderTriggers() {
        triggersList.innerHTML = '';

        if (triggerWords.length === 0) {
            triggersList.innerHTML = '<div class="list-group-item text-muted small">No custom triggers added yet.</div>';
        } else {
            triggerWords.forEach(word => {
                const item = document.createElement('div');
                item.className = 'list-group-item d-flex justify-content-between align-items-center';

                const text = document.createElement('span');
                text.textContent = word;
                item.appendChild(text);

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn btn-sm btn-outline-danger';
                deleteBtn.innerHTML = '<span class="bi-trash"></span>';
                deleteBtn.setAttribute('aria-label', `Delete trigger: ${word}`);
                deleteBtn.onclick = () => deleteTrigger(word);
                item.appendChild(deleteBtn);

                triggersList.appendChild(item);
            });
        }

        triggerWordsNormalized = triggerWords.map(normalizeForThreatDetection);
    }

    function saveTriggersToStorage() {
        localStorage.setItem('safeSpacesTriggers', JSON.stringify(triggerWords));
    }

    function loadTriggersFromStorage() {
        const stored = localStorage.getItem('safeSpacesTriggers');
        try {
            triggerWords = JSON.parse(stored || '[]');
            if (!Array.isArray(triggerWords)) triggerWords = [];
        } catch {
            triggerWords = [];
        }
        renderTriggers();
    }

    function addTrigger(text) {
        const val = text.trim();
        if (!val) {
            showMessage('Trigger cannot be empty.', true);
            return false;
        }
        if (val.length > 50) {
            showMessage('Trigger is too long (max 50 chars).', true);
            return false;
        }

        const normalizedVal = normalizeForThreatDetection(val);
        if (triggerWordsNormalized.includes(normalizedVal)) {
            showMessage(`Trigger "${val}" already exists.`, true);
            return false;
        }

        triggerWords.push(val);
        saveTriggersToStorage();
        renderTriggers();
        showMessage(`Trigger added: "${val}"`);
        return true;
    }

    function deleteTrigger(wordToDelete) {
        triggerWords = triggerWords.filter(w => w !== wordToDelete);
        saveTriggersToStorage();
        renderTriggers();
        showMessage(`Trigger deleted: "${wordToDelete}"`);
    }

    updateUI();

    async function requestMic() {
        try {
            const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            tempStream.getTracks().forEach(track => track.stop());
            showMessage('Microphone permission granted.');
        } catch (err) {
            showMessage('Microphone access denied or unavailable. App will not work without permission.', true);
        }
    }

    addTextTriggerBtn.addEventListener('click', () => {
        if (addTrigger(triggerInput.value)) {
            triggerInput.value = '';
        }
    });

    triggerInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTextTriggerBtn.click();
        }
    });

    function startRecordTrigger() {
        if (triggerRecorderRecognition) return;

        if (listening) {
            isPausingForTrigger = true;
            stopRecognition();
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            showMessage('Speech recognition not available in this browser.', true);
            return;
        }

        triggerRecorderRecognition = new SpeechRecognition();
        triggerRecorderRecognition.continuous = false;
        triggerRecorderRecognition.interimResults = false;
        triggerRecorderRecognition.lang = navigator.language || 'en-US';

        triggerRecorderRecognition.onstart = () => {
            recordTriggerBtn.classList.add('btn-danger');
            recordTriggerBtn.classList.remove('btn-info');
            recordTriggerBtn.innerHTML = '<span class="bi-mic-fill"></span> Recording... Release to save';
        };

        triggerRecorderRecognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.trim();
            if (transcript) {
                addTrigger(transcript);
            } else {
                showMessage('Could not detect any speech for the trigger.', true);
            }
        };

        triggerRecorderRecognition.onerror = (event) => {
            console.error('Voice trigger recognition error:', event.error);
            showMessage(`Error recording trigger: ${event.error}`, true);
        };

        triggerRecorderRecognition.onend = () => {
            recordTriggerBtn.classList.add('btn-info');
            recordTriggerBtn.classList.remove('btn-danger');
            recordTriggerBtn.innerHTML = '<span class="bi-mic-fill"></span> Hold to Record Trigger';
            triggerRecorderRecognition = null;

            if (isPausingForTrigger) {
                isPausingForTrigger = false;
                setTimeout(() => {
                    startRecognition().catch(err => {
                        console.error('Failed to resume recognition', err);
                        showMessage('Failed to resume listening: ' + (err.message || err), true);
                    });
                }, 250);
            }
        };

        try {
            triggerRecorderRecognition.start();
        } catch (err) {
            console.error('Could not start voice trigger recording', err);
            showMessage('Could not start voice trigger recording.', true);
            triggerRecorderRecognition = null;
        }
    }

    function stopRecordTrigger() {
        if (triggerRecorderRecognition) {
            triggerRecorderRecognition.stop();
        }
    }

    recordTriggerBtn.addEventListener('mousedown', startRecordTrigger);
    recordTriggerBtn.addEventListener('mouseup', stopRecordTrigger);
    recordTriggerBtn.addEventListener('mouseleave', stopRecordTrigger);
    recordTriggerBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startRecordTrigger(); });
    recordTriggerBtn.addEventListener('touchend', (e) => { e.preventDefault(); stopRecordTrigger(); });

    function showMessage(text, isError = false) {
        if (messageLockTimer) {
            clearTimeout(messageLockTimer);
            messageLockTimer = null;
        }
        messages.textContent = text;
        messages.style.color = isError ? 'darkred' : '';
        messageLockTimer = setTimeout(() => {
            messageLockTimer = null;
        }, 600);
    }

    function maybeShowMessage(text) {
        if (messageLockTimer) return;
        showMessage(text);
    }

    function updateUI() {
        listeningText.textContent = listening ? 'active' : 'stopped';
    }

    async function loadRecordings() {
        recordingsList.innerHTML = '<div class="text-muted">Loading...</div>';
        try {
            const response = await fetch(`${API_BASE_URL}/recordings/list`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const list = await response.json();
            if (!Array.isArray(list) || list.length === 0) {
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
            console.error('Failed to load recordings', err);
            recordingsList.innerHTML = '<div class="text-danger">Failed to load recordings.</div>';
        }
    }

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
            if (e.error === 'no-speech' || e.error === 'aborted') {
                console.debug(`SpeechRecognition notice: ${e.error}`);
                return;
            }

            console.error('SpeechRecognition error', e);
            showMessage('Speech recognition error: ' + (e.error || 'unknown'), true);
        };

        r.onend = () => {
            const wasListening = listening;
            listening = false;

            if (recognition) recognition = null;

            updateUI();
            stopAggressionMonitor();

            if (isPausingForTrigger) {
                showMessage('Listening paused to record new trigger.');
                return;
            }

            if (wasListening) {
                maybeShowMessage('Listener connection lost. Reconnecting...');
                setTimeout(() => {
                    startRecognition().catch(err => {
                        console.error('Failed to auto-restart recognition', err);
                        showMessage('Failed to auto-restart listening: ' + (err.message || err), true);
                    });
                }, 1000);
            }
        };

        r.onresult = (event) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    const transcript = result[0].transcript.trim();
                    if (transcript) {
                        maybeShowMessage(`Heard: "${transcript}"`);
                        checkForTriggers(transcript);
                    }
                }
            }
        };

        return r;
    }

    async function startRecognition() {
        if (listening || recognition) {
            console.warn('startRecognition called while already active. Aborting.');
            return;
        }
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
            if (triggerWords.length === 0) {
                showMessage('Listening for built-in safety keywords and tone cues (no custom triggers set).');
            }
        } catch (err) {
            console.warn('recognition.start error', err);
        }
    }

    function stopRecognition() {
        if (recognition) {
            recognition.stop();
        }
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
            try {
                await ctx.resume();
            } catch (err) {
                console.warn('Unable to resume AudioContext', err);
            }
        }

        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        const data = new Uint8Array(analyser.fftSize);
        const monitorState = { ctx, source, analyser, data, framesAbove: 0, rafId: null };

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

        for (let i = 0; i < triggerWordsNormalized.length; i++) {
            const triggerNorm = triggerWordsNormalized[i];
            if (normalized.includes(triggerNorm)) {
                const originalTrigger = triggerWords[i];
                triggerRecording(`Trigger word "${originalTrigger}" detected`);
                return;
            }
        }

        for (const phrase of THREAT_PHRASES) {
            if (normalized.includes(phrase)) {
                triggerRecording(`Safety phrase "${phrase}" detected`);
                return;
            }
        }

        const tokens = new Set(normalized.split(' '));
        for (const token of THREAT_TOKENS) {
            if (tokens.has(token)) {
                triggerRecording(`Safety keyword "${token}" detected`);
                return;
            }
        }
    }

    function triggerRecording(reason) {
        if (!listening) return;
        if (threatCooldownActive) return;
        if (mediaRecorder && mediaRecorder.state === 'recording') return;

        showMessage(`${reason}. Starting 60s recording...`);
        startRecordingFor60s().catch(err => {
            console.error('triggerRecording -> startRecordingFor60s error', err);
            showMessage('Could not start recording: ' + (err.message || err), true);
        });

        threatCooldownActive = true;
        setTimeout(() => { threatCooldownActive = false; }, THREAT_COOLDOWN_MS);
    }

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

                const fd = new FormData();
                fd.append('file', file, file.name);

                showMessage('Uploading recording...');
                try {
                    const res = await fetch(`${API_BASE_URL}/recordings/upload`, {
                        method: 'POST',
                        body: fd
                    });
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

    (async function init() {
        loadTriggersFromStorage();
        await requestMic();
        await loadRecordings();

        if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
            showMessage('Note: Continuous speech recognition requires Web Speech API. Use Chrome/Edge (Chromium).', true);
        }

        startRecognition().catch(err => {
            console.error('Failed to start recognition on load', err);
            showMessage('Failed to start listening automatically: ' + (err.message || err), true);
        });
    })();

    window.addEventListener('beforeunload', () => {
        isPausingForTrigger = true;
        stopRecognition();
        stopAggressionMonitor();
    });

})();