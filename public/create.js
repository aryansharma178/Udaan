const cameraSection = document.getElementById("cameraSection");
const cameraPreview = document.getElementById("cameraPreview");
const cameraTitle = document.getElementById("cameraTitle");
const cameraMessage = document.getElementById("cameraMessage");
const recordBtn = document.getElementById("recordBtn");
const switchCameraBtn = document.getElementById("switchCameraBtn");
const recordingBadge = document.getElementById("recordingBadge");
const timerEl = document.getElementById("timer");
const recordedPreview = document.getElementById("recordedPreview");
const recordedVideo = document.getElementById("recordedVideo");

let cameraStream = null;
let mediaRecorder = null;
let recordedChunks = [];
let facingMode = "user";
let recordTimer = null;
let recordSeconds = 0;
let currentMode = "video";
let recordedBlob = null;

async function openCamera(mode) {
    currentMode = mode;

    cameraSection.classList.remove("hidden");
    recordedPreview.classList.add("hidden");

    cameraTitle.textContent =
        mode === "short" ? "Create Short" : "Record Video";

    cameraMessage.textContent = "Camera starting...";

    try {
        await startCamera();
        cameraMessage.textContent = "";
    } catch (error) {
        console.error("Camera error:", error);
        cameraMessage.textContent =
            "❌ Camera permission denied or camera unavailable.";
    }
}

async function startCamera() {
    stopCamera();

    const constraints = {
        video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: currentMode === "short" ? 1920 : 1080 }
        },
        audio: true
    };

    cameraStream = await navigator.mediaDevices.getUserMedia(constraints);

    cameraPreview.srcObject = cameraStream;
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
}

async function switchCamera() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        cameraMessage.textContent = "Recording ke dauran camera switch nahi kar sakte.";
        return;
    }

    facingMode = facingMode === "user" ? "environment" : "user";

    try {
        await startCamera();
    } catch (error) {
        console.error("Camera switch failed:", error);
        cameraMessage.textContent = "❌ Camera switch failed.";
    }
}

function getSupportedMimeType() {
    const types = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "video/mp4"
    ];

    for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) {
            return type;
        }
    }

    return "";
}

function toggleRecording() {
    if (!cameraStream) {
        cameraMessage.textContent = "Camera available nahi hai.";
        return;
    }

    if (mediaRecorder && mediaRecorder.state === "recording") {
        stopRecording();
    } else {
        startRecording();
    }
}

function startRecording() {
    recordedChunks = [];
    recordedBlob = null;

    const mimeType = getSupportedMimeType();

    try {
        mediaRecorder = mimeType
            ? new MediaRecorder(cameraStream, { mimeType })
            : new MediaRecorder(cameraStream);
    } catch (error) {
        console.error("MediaRecorder error:", error);
        cameraMessage.textContent = "❌ Recording supported nahi hai.";
        return;
    }

    mediaRecorder.ondataavailable = event => {
        if (event.data && event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };

    mediaRecorder.onstop = finishRecording;

    mediaRecorder.start(1000);

    recordSeconds = 0;
    updateTimer();

    recordTimer = setInterval(() => {
        recordSeconds++;
        updateTimer();
    }, 1000);

    recordingBadge.classList.remove("hidden");
    recordBtn.textContent = "⏹";
    cameraMessage.textContent = "Recording...";
}

function stopRecording() {
    if (!mediaRecorder) return;

    if (mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
    }

    clearInterval(recordTimer);
    recordTimer = null;

    recordingBadge.classList.add("hidden");
    recordBtn.textContent = "⏺";
    cameraMessage.textContent = "Recording complete.";
}

function finishRecording() {
    const mimeType =
        mediaRecorder && mediaRecorder.mimeType
            ? mediaRecorder.mimeType
            : "video/webm";

    recordedBlob = new Blob(recordedChunks, {
        type: mimeType
    });

    const videoUrl = URL.createObjectURL(recordedBlob);

    recordedVideo.src = videoUrl;
    recordedPreview.classList.remove("hidden");

    cameraMessage.textContent =
        "✅ Video ready. Preview karke publish karein.";

    recordedVideo.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}

function updateTimer() {
    const minutes = Math.floor(recordSeconds / 60);
    const seconds = recordSeconds % 60;

    timerEl.textContent =
        String(minutes).padStart(2, "0") +
        ":" +
        String(seconds).padStart(2, "0");
}

function closeCamera() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
    }

    clearInterval(recordTimer);
    recordTimer = null;

    stopCamera();

    cameraPreview.srcObject = null;
    cameraSection.classList.add("hidden");
    recordedPreview.classList.add("hidden");
    cameraMessage.textContent = "";
}

async function publishRecordedVideo() {
    if (!recordedBlob) {
        cameraMessage.textContent = "Pehle video record karein.";
        return;
    }

    const token = localStorage.getItem("udaan_token");

    if (!token) {
        cameraMessage.textContent =
            "❌ Please login again before publishing.";
        return;
    }

    const extension =
        recordedBlob.type.includes("mp4") ? "mp4" : "webm";

    const file = new File(
        [recordedBlob],
        `udaan-${Date.now()}.${extension}`,
        {
            type: recordedBlob.type
        }
    );

    const formData = new FormData();

    formData.append("video", file);
    formData.append(
        "title",
        currentMode === "short"
            ? "My UDAAN Short"
            : "My UDAAN Video"
    );
    formData.append(
        "description",
        "Created with UDAAN Camera"
    );
    formData.append("category", "Other");
    formData.append(
        "isShort",
        currentMode === "short" ? "true" : "false"
    );

    const publishBtn = document.getElementById("publishBtn");

    publishBtn.disabled = true;
    publishBtn.textContent = "Uploading... ⏳";
    cameraMessage.textContent =
        "Video UDAAN par upload ho raha hai...";

    try {
        const response = await fetch("/api/videos/upload", {
            method: "POST",
            headers: {
                Authorization: "Bearer " + token
            },
            body: formData
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message || "Upload failed"
            );
        }

        cameraMessage.textContent =
            "✅ Video successfully published! 🚀";

        publishBtn.textContent = "✅ Published";

        setTimeout(() => {
            window.location.href = "/home.html";
        }, 1200);

    } catch (error) {
        console.error("Publish error:", error);

        cameraMessage.textContent =
            "❌ " + error.message;

        publishBtn.disabled = false;
        publishBtn.textContent =
            "🚀 Continue to Publish";
    }
}

window.openCamera = openCamera;
window.closeCamera = closeCamera;
window.switchCamera = switchCamera;
window.toggleRecording = toggleRecording;
window.publishRecordedVideo = publishRecordedVideo;

window.addEventListener("beforeunload", () => {
    stopCamera();
});
