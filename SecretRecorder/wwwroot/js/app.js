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
    const RECORD_DURATION_MS = 10 * 1000; // exactly 1 minute

    // initialize UI
    triggerInput.value = triggerWord;
    updateUI();

    // request microphone access on load so permissions prompt appears early
    async function requestMic() {
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
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
        localStorage.setItem('secretTrigger', triggerWord);
        showMessage(`Trigger saved: "${triggerWord}"`);
    });

    // Toggle listening
    toggleListenBtn.addEventListener('click', () => {
        listening ? stopRecognition() : startRecognition();
    });

    // show short messages
    function showMessage(text, isError = false) {
        messages.textContent = text;
        messages.style.color = isError ? 'darkred' : '';
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
            showMessage('Speech recognition started.');
        };
        r.onerror = (e) => {
            console.error('SpeechRecognition error', e);
            showMessage('Speech recognition error: ' + (e.error || 'unknown'), true);
        };
        r.onend = () => {
            listening = false;
            updateUI();
            showMessage('Speech recognition stopped.');
        };
        r.onresult = (event) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    const transcript = result[0].transcript.trim();
                    console.log('Recognized:', transcript);
                    showMessage(`Heard: "${transcript}"`);
                    if (triggerWord && transcript.toLowerCase().includes(triggerWord.toLowerCase())) {
                        showMessage(`Trigger word detected: "${triggerWord}". Starting 60s recording...`);
                        startRecordingFor60s();
                    }
                }
            }
        };
        return r;
    }

    function startRecognition() {
        if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
            showMessage('Web Speech API not available in this browser. Use Chrome/Edge (Chromium).', true);
            return;
        }
        if (!triggerWord) {
            showMessage('Set a trigger word before starting listening.', true);
            return;
        }
        recognition = createRecognition();
        if (!recognition) {
            showMessage('SpeechRecognition not supported.', true);
            return;
        }
        try {
            recognition.start();
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
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
                    // stop tracks to free mic
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
    });

})();
