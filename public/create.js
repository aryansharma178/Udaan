const cameraPreview = document.getElementById("cameraPreview");
const cameraMessage = document.getElementById("cameraMessage");

const recordBtn = document.getElementById("recordBtn");
const switchCameraBtn = document.getElementById("switchCameraBtn");

const timerBtn = document.getElementById("timerBtn");
const durationBtn = document.getElementById("durationBtn");
const effectsBtn = document.getElementById("effectsBtn");
const zoomBtn = document.getElementById("zoomBtn");
const cameraFocusBtn = document.getElementById("cameraFocusBtn");
const moreBtn = document.getElementById("moreBtn");
const soundBtn = document.getElementById("soundBtn");
const aiBtn = document.getElementById("aiBtn");
const addMediaBtn = document.getElementById("addMediaBtn");

const recordingBadge = document.getElementById("recordingBadge");
const timerEl = document.getElementById("timer");

const recordedPreview = document.getElementById("recordedPreview");
const recordedVideo = document.getElementById("recordedVideo");
const publishBtn = document.getElementById("publishBtn");
const closeRecordedBtn = document.getElementById("closeRecordedBtn");

const modeButtons = document.querySelectorAll(".mode-btn");

let cameraStream = null;
let mediaRecorder = null;
let recordedChunks = [];

let facingMode = "user";
let currentMode = "live";

let recordTimer = null;
let recordSeconds = 0;

let recordedBlob = null;
let selectedDuration = 15;
let selectedZoom = 1;


/* =========================
   CAMERA
========================= */

async function startCamera() {

    stopCamera();

    try {

        cameraMessage.textContent = "Camera starting...";

        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: {
                    ideal: facingMode
                },
                width: {
                    ideal: 1920
                },
                height: {
                    ideal: 1080
                }
            },
            audio: true
        });

        cameraPreview.srcObject = cameraStream;

        await cameraPreview.play();

        cameraMessage.textContent = "";

    } catch (error) {

        console.error("Camera error:", error);

        cameraMessage.textContent =
            "Camera permission denied or camera unavailable.";

    }
}


function stopCamera() {

    if (!cameraStream) return;

    cameraStream.getTracks().forEach(track => {
        track.stop();
    });

    cameraStream = null;
}


/* =========================
   SWITCH CAMERA
========================= */

async function switchCamera() {

    facingMode =
        facingMode === "user"
            ? "environment"
            : "user";

    await startCamera();
}


switchCameraBtn?.addEventListener(
    "click",
    switchCamera
);


/* =========================
   RECORD
========================= */

function getRecorderOptions() {

    const types = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm"
    ];

    for (const type of types) {

        if (
            window.MediaRecorder &&
            MediaRecorder.isTypeSupported(type)
        ) {
            return {
                mimeType: type
            };
        }
    }

    return {};
}


function startRecording() {

    if (!cameraStream) {

        cameraMessage.textContent =
            "Camera is not ready.";

        return;
    }

    recordedChunks = [];

    try {

        mediaRecorder =
            new MediaRecorder(
                cameraStream,
                getRecorderOptions()
            );

    } catch (error) {

        console.error(error);

        cameraMessage.textContent =
            "Recording is not supported on this device.";

        return;
    }

    mediaRecorder.ondataavailable = event => {

        if (event.data && event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };

    mediaRecorder.onstop = finishRecording;

    mediaRecorder.start(500);

    recordSeconds = 0;

    updateTimer();

    recordTimer = setInterval(() => {

        recordSeconds++;

        updateTimer();

        /* Short 15 second limit */

        if (
            currentMode === "short" &&
            recordSeconds >= selectedDuration
        ) {
            stopRecording();
        }

    }, 1000);

    recordBtn.classList.add("recording");

    recordingBadge.classList.remove("hidden");
}


function stopRecording() {

    if (
        mediaRecorder &&
        mediaRecorder.state !== "inactive"
    ) {
        mediaRecorder.stop();
    }

    clearInterval(recordTimer);
    recordTimer = null;

    recordBtn.classList.remove("recording");

    recordingBadge.classList.add("hidden");
}


function toggleRecording() {

    /* LIVE mode: never use MediaRecorder.
       Open the real Live Streaming screen. */

    if (currentMode === "live") {

        stopCamera();

        location.href = "/live.html";

        return;
    }

    if (
        mediaRecorder &&
        mediaRecorder.state === "recording"
    ) {

        stopRecording();

    } else {

        startRecording();

    }
}


recordBtn?.addEventListener(
    "click",
    toggleRecording
);


/* =========================
   TIMER
========================= */

function updateTimer() {

    const minutes =
        Math.floor(recordSeconds / 60)
            .toString()
            .padStart(2, "0");

    const seconds =
        (recordSeconds % 60)
            .toString()
            .padStart(2, "0");

    timerEl.textContent =
        `${minutes}:${seconds}`;
}


/* =========================
   FINISH RECORDING
========================= */

function finishRecording() {

    if (!recordedChunks.length) {
        return;
    }

    recordedBlob =
        new Blob(
            recordedChunks,
            {
                type: "video/webm"
            }
        );

    const url =
        URL.createObjectURL(recordedBlob);

    recordedVideo.src = url;

    recordedPreview.classList.remove(
        "hidden"
    );

    stopCamera();
}


/* =========================
   PUBLISH
========================= */

publishBtn?.addEventListener(
    "click",
    async () => {

        if (!recordedBlob) {
            return;
        }

        const formData =
            new FormData();

        const title =
            prompt(
                "Enter video title:"
            );

        if (!title) {
            return;
        }

        formData.append(
            "video",
            recordedBlob,
            "udaan-recording.webm"
        );

        formData.append(
            "title",
            title
        );

        formData.append(
            "isShort",
            currentMode === "short"
                ? "true"
                : "false"
        );

        publishBtn.disabled = true;
        publishBtn.textContent =
            "Uploading...";

        try {

            const token =
                localStorage.getItem(
                    "token"
                );

            const response =
                await fetch(
                    "/api/videos/upload",
                    {
                        method: "POST",
                        headers: token
                            ? {
                                Authorization:
                                    `Bearer ${token}`
                            }
                            : {},
                        body: formData
                    }
                );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Upload failed"
                );
            }

            alert(
                "Video uploaded successfully!"
            );

            location.href =
                "/home.html";

        } catch (error) {

            console.error(error);

            alert(
                error.message ||
                "Upload failed."
            );

            publishBtn.disabled = false;
            publishBtn.textContent =
                "Continue to Publish";
        }

    }
);


/* =========================
   CLOSE PREVIEW
========================= */

closeRecordedBtn?.addEventListener(
    "click",
    () => {

        recordedPreview.classList.add(
            "hidden"
        );

        recordedVideo.pause();

        startCamera();
    }
);


/* =========================
   MODES
========================= */

modeButtons.forEach(button => {

    button.addEventListener(
        "click",
        async () => {

            const mode =
                button.dataset.mode;

            currentMode = mode;

            modeButtons.forEach(btn =>
                btn.classList.remove(
                    "active"
                )
            );

            button.classList.add(
                "active"
            );

            if (mode === "live") {

                stopCamera();

                location.href =
                    "/live.html";

                return;
            }

            if (mode === "post") {

                location.href =
                    "/upload.html";

                return;
            }

            await startCamera();
        }
    );
});


/* =========================
   DURATION
========================= */

durationBtn?.addEventListener(
    "click",
    () => {

        selectedDuration =
            selectedDuration === 15
                ? 30
                : selectedDuration === 30
                    ? 60
                    : 15;

        durationBtn.textContent =
            `${selectedDuration}s`;
    }
);


/* =========================
   ZOOM
========================= */

zoomBtn?.addEventListener(
    "click",
    () => {

        selectedZoom =
            selectedZoom === 1
                ? 2
                : selectedZoom === 2
                    ? 3
                    : 1;

        zoomBtn.textContent =
            `${selectedZoom}x`;

        cameraPreview.style.transform =
            `scale(${selectedZoom})`;
    }
);


/* =========================
   TIMER BUTTON
========================= */

timerBtn?.addEventListener(
    "click",
    () => {

        const value =
            prompt(
                "Timer seconds:",
                "3"
            );

        if (value !== null) {

            timerBtn.innerHTML =
                `<span>◷</span><small>${value}s</small>`;
        }
    }
);


/* =========================
   EFFECTS
========================= */

effectsBtn?.addEventListener(
    "click",
    () => {

        openCreatorTools("effects");
    }
);


/* =========================
   AI
========================= */

aiBtn?.addEventListener(
    "click",
    () => {

        openCreatorTools("ai");
    }
);


/* =========================
   SOUND
========================= */

soundBtn?.addEventListener(
    "click",
    () => {

        openCreatorTools("sound");
    }
);


/* =========================
   MORE
========================= */

moreBtn?.addEventListener(
    "click",
    () => {

        alert(
            "More camera tools coming soon."
        );
    }
);


/* =========================
   ADD MEDIA
========================= */

addMediaBtn?.addEventListener(
    "click",
    () => {

        const input =
            document.createElement(
                "input"
            );

        input.type = "file";
        input.accept =
            "video/*,image/*";

        input.onchange = () => {

            if (input.files.length) {

                cameraMessage.textContent =
                    `${input.files[0].name} selected`;
            }
        };

        input.click();
    }
);


/* =========================
   PAGE START
========================= */

window.addEventListener(
    "load",
    async () => {

        currentMode = "live";

        try {
            await startCamera();
        } catch (error) {
            console.error("Initial camera start:", error);
        }
    }
);


/* =========================
   CLEANUP
========================= */

window.addEventListener(
    "beforeunload",
    () => {

        if (
            mediaRecorder &&
            mediaRecorder.state !== "inactive"
        ) {
            mediaRecorder.stop();
        }

        stopCamera();
    }
);


// =====================================================
// UDAAN CREATOR TOOLS - SOUND / EFFECTS / AI
// =====================================================

let creatorToolsPanel = null;
let selectedSound = null;
let selectedEffect = "none";
let aiEnhanced = false;

function closeCreatorTools() {
    if (creatorToolsPanel) {
        creatorToolsPanel.remove();
        creatorToolsPanel = null;
    }

    if (cameraPreview) {
        cameraPreview.style.filter = "";
    }
}

function openCreatorTools(type) {
    closeCreatorTools();

    const panel = document.createElement("div");
    panel.className = "creator-tools-panel";

    let title = "";
    let content = "";

    if (type === "sound") {
        title = "🎵 Add Sound";

        content = `
            <div class="tools-card">
                <div class="tools-icon">🎵</div>
                <div>
                    <strong>Choose a sound</strong>
                    <small>Select an audio file from your phone.</small>
                </div>
            </div>

            <input id="creatorSoundFile"
                   type="file"
                   accept="audio/*"
                   hidden>

            <button class="tools-action" id="chooseSoundBtn">
                🎧 Choose from device
            </button>

            <div id="soundInfo" class="tools-info">
                No sound selected
            </div>

            <audio id="creatorSoundPreview"
                   controls
                   class="sound-preview"
                   hidden></audio>

            <label class="tools-label">
                Volume
                <input id="soundVolume"
                       type="range"
                       min="0"
                       max="1"
                       step="0.05"
                       value="1">
            </label>

            <button class="tools-action secondary" id="removeSoundBtn">
                ✕ Remove sound
            </button>

            <p class="tools-note">
                The selected sound can be previewed while creating your video.
            </p>
        `;
    }

    if (type === "effects") {
        title = "✨ Effects";

        content = `
            <div class="effect-grid">
                <button class="effect-item active" data-effect="none">
                    <span>○</span>
                    <small>Normal</small>
                </button>

                <button class="effect-item" data-effect="warm">
                    <span>☀️</span>
                    <small>Warm</small>
                </button>

                <button class="effect-item" data-effect="cool">
                    <span>❄️</span>
                    <small>Cool</small>
                </button>

                <button class="effect-item" data-effect="vivid">
                    <span>🌈</span>
                    <small>Vivid</small>
                </button>

                <button class="effect-item" data-effect="mono">
                    <span>◐</span>
                    <small>B&W</small>
                </button>

                <button class="effect-item" data-effect="cinema">
                    <span>🎬</span>
                    <small>Cinema</small>
                </button>

                <button class="effect-item" data-effect="soft">
                    <span>✨</span>
                    <small>Soft</small>
                </button>

                <button class="effect-item" data-effect="dramatic">
                    <span>🔥</span>
                    <small>Dramatic</small>
                </button>
            </div>

            <p class="tools-note">
                Effects are applied live to the camera preview.
            </p>
        `;
    }

    if (type === "ai") {
        title = "🤖 UDAAN AI";

        content = `
            <div class="tools-card ai-card">
                <div class="tools-icon">🤖</div>
                <div>
                    <strong>Smart Creator Tools</strong>
                    <small>Quick enhancements for your camera.</small>
                </div>
            </div>

            <button class="tools-action" id="aiEnhanceBtn">
                ✨ Auto Enhance
            </button>

            <button class="tools-action" id="aiCaptionBtn">
                💬 Auto Captions
            </button>

            <button class="tools-action" id="aiPortraitBtn">
                👤 Portrait Focus
            </button>

            <div id="aiStatus" class="tools-info">
                AI tools ready
            </div>

            <p class="tools-note">
                These creator tools work directly in your browser; advanced AI processing can be connected later.
            </p>
        `;
    }

    panel.innerHTML = `
        <div class="tools-backdrop"></div>
        <div class="tools-sheet">
            <div class="tools-header">
                <strong>${title}</strong>
                <button id="closeToolsBtn" type="button">✕</button>
            </div>
            <div class="tools-body">
                ${content}
            </div>
        </div>
    `;

    document.body.appendChild(panel);
    creatorToolsPanel = panel;

    panel.querySelector("#closeToolsBtn")?.addEventListener(
        "click",
        closeCreatorTools
    );

    panel.querySelector(".tools-backdrop")?.addEventListener(
        "click",
        closeCreatorTools
    );

    // SOUND
    if (type === "sound") {
        const fileInput = panel.querySelector("#creatorSoundFile");
        const chooseBtn = panel.querySelector("#chooseSoundBtn");
        const preview = panel.querySelector("#creatorSoundPreview");
        const info = panel.querySelector("#soundInfo");
        const volume = panel.querySelector("#soundVolume");
        const remove = panel.querySelector("#removeSoundBtn");

        chooseBtn?.addEventListener("click", () => {
            fileInput?.click();
        });

        fileInput?.addEventListener("change", () => {
            const file = fileInput.files?.[0];
            if (!file) return;

            selectedSound = file;

            if (preview) {
                preview.src = URL.createObjectURL(file);
                preview.hidden = false;
                preview.volume = Number(volume?.value || 1);
            }

            if (info) {
                info.textContent = `Selected: ${file.name}`;
            }
        });

        volume?.addEventListener("input", () => {
            if (preview) {
                preview.volume = Number(volume.value);
            }
        });

        remove?.addEventListener("click", () => {
            selectedSound = null;

            if (preview) {
                preview.pause();
                preview.removeAttribute("src");
                preview.hidden = true;
            }

            if (info) {
                info.textContent = "No sound selected";
            }

            if (fileInput) {
                fileInput.value = "";
            }
        });
    }

    // EFFECTS
    if (type === "effects") {
        panel.querySelectorAll("[data-effect]").forEach(button => {
            button.addEventListener("click", () => {
                panel.querySelectorAll("[data-effect]").forEach(
                    item => item.classList.remove("active")
                );

                button.classList.add("active");

                selectedEffect = button.dataset.effect || "none";

                const filters = {
                    none: "",
                    warm: "sepia(.25) saturate(1.25)",
                    cool: "saturate(1.1) hue-rotate(12deg)",
                    vivid: "saturate(1.7) contrast(1.08)",
                    mono: "grayscale(1)",
                    cinema: "contrast(1.2) saturate(1.2)",
                    soft: "brightness(1.08) saturate(.9)",
                    dramatic: "contrast(1.35) saturate(1.35)"
                };

                if (cameraPreview) {
                    cameraPreview.style.filter =
                        filters[selectedEffect] || "";
                }
            });
        });
    }

    // AI
    if (type === "ai") {
        const status = panel.querySelector("#aiStatus");

        panel.querySelector("#aiEnhanceBtn")?.addEventListener(
            "click",
            () => {
                aiEnhanced = !aiEnhanced;

                if (cameraPreview) {
                    cameraPreview.style.filter = aiEnhanced
                        ? "brightness(1.08) contrast(1.12) saturate(1.18)"
                        : "";
                }

                if (status) {
                    status.textContent = aiEnhanced
                        ? "✨ Auto Enhance enabled"
                        : "Auto Enhance disabled";
                }
            }
        );

        panel.querySelector("#aiPortraitBtn")?.addEventListener(
            "click",
            () => {
                if (cameraPreview) {
                    cameraPreview.style.filter =
                        "contrast(1.08) saturate(1.12) blur(.15px)";
                }

                if (status) {
                    status.textContent =
                        "👤 Portrait Focus applied";
                }
            }
        );

        panel.querySelector("#aiCaptionBtn")?.addEventListener(
            "click",
            () => {
                if (!("SpeechRecognition" in window) &&
                    !("webkitSpeechRecognition" in window)) {
                    if (status) {
                        status.textContent =
                            "Auto Captions are not supported by this browser.";
                    }
                    return;
                }

                const Recognition =
                    window.SpeechRecognition ||
                    window.webkitSpeechRecognition;

                const recognition = new Recognition();

                recognition.lang = "hi-IN";
                recognition.continuous = true;
                recognition.interimResults = true;

                recognition.onstart = () => {
                    if (status) {
                        status.textContent =
                            "🎙️ Listening for captions...";
                    }
                };

                recognition.onerror = () => {
                    if (status) {
                        status.textContent =
                            "Caption microphone permission is required.";
                    }
                };

                recognition.onend = () => {
                    if (status &&
                        status.textContent ===
                        "🎙️ Listening for captions...") {
                        status.textContent =
                            "Auto Caption session ended.";
                    }
                };

                try {
                    recognition.start();
                } catch (error) {
                    console.warn("Caption start:", error);
                }
            }
        );
    }
}
