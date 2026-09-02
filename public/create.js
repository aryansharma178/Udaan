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

        alert(
            "Effects panel coming soon."
        );
    }
);


/* =========================
   AI
========================= */

aiBtn?.addEventListener(
    "click",
    () => {

        alert(
            "UDAAN AI tools coming soon."
        );
    }
);


/* =========================
   SOUND
========================= */

soundBtn?.addEventListener(
    "click",
    () => {

        alert(
            "Sound library coming soon."
        );
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

        /*
         * Create screen opens in Live mode
         * according to the requested design.
         */

        currentMode = "live";

        /*
         * We don't start the camera automatically
         * on page load because browsers require
         * user interaction for reliable permission.
         *
         * Camera starts when Video/Short is selected.
         */
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
