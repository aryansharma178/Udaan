const socket = io();

let stream = null;
let roomId = null;
let username = 'Creator';
let facingMode = 'user';
let isMuted = false;
let isHost = false;

const hostPeers = new Map();
let viewerPeer = null;
let hostSocketId = null;

const $ = (id) => document.getElementById(id);

const setupPanel = $('setupPanel');
const livePanel = $('livePanel');
const titleInput = $('liveTitle');
const cameraSelect = $('cameraSelect');
const startLiveBtn = $('startLiveBtn');
const livePreview = $('livePreview');
const setupCameraPreview = $('setupCameraPreview');
const liveTitle = $('liveTitleDisplay');
const viewerCount = $('viewerCount');
const setupMessage = $('setupMessage');
const liveRoomInfo = $('liveRoomInfo');
const roomIdText = $('roomIdText');
const shareLiveBtn = $('shareLiveBtn');
const switchCameraBtn = $('switchCameraBtn');
const muteBtn = $('muteBtn');
const endLiveBtn = $('endLiveBtn');
const fullscreenBtn = $('fullscreenBtn');
const chatList = $('chatList');
const chatInput = $('chatInput');
const sendChatBtn = $('sendChatBtn');

const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

function getToken() {
    return localStorage.getItem('udaan_token') || '';
}

async function loadUser() {
    try {
        const token = getToken();

        if (!token) return;

        const response = await fetch('/api/me', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.success) return;

        const data = await response.json();

        username =
            data.username ||
            data.user?.username ||
            data.name ||
            'Creator';

    } catch (error) {
        console.warn('User load failed:', error);
    }
}

function showMessage(message, type = '') {
    if (!setupMessage) return;

    setupMessage.textContent = message;
    setupMessage.className = `setup-message ${type}`;
}

function getRoomFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('room');
}

function createRemoteVideo() {
    let video = document.getElementById('remoteLiveVideo');

    if (video) return video;

    video = document.createElement('video');
    video.id = 'remoteLiveVideo';
    video.autoplay = true;
    video.playsInline = true;
    video.controls = false;

    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    video.style.background = '#000';

    const wrapper = livePreview?.parentElement;

    if (wrapper) {
        wrapper.appendChild(video);
    } else {
        document.body.appendChild(video);
    }

    return video;
}

function removeRemoteVideo() {
    const video = document.getElementById('remoteLiveVideo');

    if (video) {
        video.srcObject = null;
        video.remove();
    }
}

function createPeerConnection(targetSocketId, mode) {
    const pc = new RTCPeerConnection(rtcConfig);

    pc.onicecandidate = (event) => {
        if (!event.candidate || !roomId) return;

        socket.emit('live:ice', {
            roomId,
            targetSocketId,
            candidate: event.candidate
        });
    };

    pc.onconnectionstatechange = () => {
        console.log(
            'WebRTC connection:',
            mode,
            pc.connectionState
        );

        if (
            pc.connectionState === 'failed' ||
            pc.connectionState === 'closed'
        ) {
            pc.close();
        }
    };

    return pc;
}

async function startCamera() {
    try {
        stopCamera();

        facingMode = cameraSelect?.value || facingMode;

        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode,
                width: {
                    ideal: 1280
                },
                height: {
                    ideal: 720
                }
            },
            audio: true
        });

        if (livePreview) {
            livePreview.srcObject = stream;

        if (setupCameraPreview) {
            setupCameraPreview.srcObject = stream;
        }
        }

        if (startLiveBtn) {
            startLiveBtn.disabled = false;
        }

        showMessage(
            'Camera ready. You can start your live stream.',
            'success'
        );

    } catch (error) {
        console.error(error);

        if (error.name === 'NotAllowedError') {
            showMessage(
                'Camera/Microphone permission denied.',
                'error'
            );
        } else if (error.name === 'NotFoundError') {
            showMessage(
                'Camera or microphone was not found.',
                'error'
            );
        } else {
            showMessage(
                'Unable to start camera: ' + error.message,
                'error'
            );
        }
    }
}

function stopCamera() {
    if (!stream) return;

    stream.getTracks().forEach(track => {
        track.stop();
    });

    stream = null;

    if (livePreview) {
        livePreview.srcObject = null;
    }

    if (setupCameraPreview) {
        setupCameraPreview.srcObject = null;
    }
}

async function createLive() {
    if (!stream) {
        showMessage(
            'Please start the camera first.',
            'error'
        );
        return;
    }

    if (!getToken()) {
        showMessage(
            'Please login to start a live stream.',
            'error'
        );
        return;
    }

    const title =
        titleInput?.value.trim() ||
        `${username}'s Live`;

    socket.emit(
        'live:create',
        {
            username,
            title
        },
        async (response) => {

            if (!response || !response.success) {
                showMessage(
                    response?.message ||
                    'Unable to create live room.',
                    'error'
                );
                return;
            }

            isHost = true;
            roomId = response.roomId;

            setupPanel?.classList.add('hidden');
            livePanel?.classList.remove('hidden');

            if (liveTitle) {
                liveTitle.textContent =
                    response.room?.title || title;
            }

            if (roomIdText) {
                roomIdText.textContent = roomId;
            }

            liveRoomInfo?.classList.remove('hidden');

            if (viewerCount) {
                viewerCount.textContent = '0';
            }

            addSystemMessage(
                '🔴 You are now live on UDAAN!'
            );

            addSystemMessage(
                'Share the live link with your viewers.'
            );
        }
    );
}

async function joinLive(room) {
    roomId = room;
    isHost = false;

    setupPanel?.classList.add('hidden');
    livePanel?.classList.remove('hidden');

    if (liveRoomInfo) {
        liveRoomInfo.classList.add('hidden');
    }

    if (liveTitle) {
        liveTitle.textContent = 'UDAAN Live';
    }

    createRemoteVideo();

    addSystemMessage(
        'Connecting to live stream...'
    );

    socket.emit(
        'live:join',
        {
            roomId,
            username
        },
        (response) => {

            if (!response || !response.success) {
                addSystemMessage(
                    response?.message ||
                    'Live stream not found.'
                );

                return;
            }

            if (liveTitle) {
                liveTitle.textContent =
                    response.room?.title ||
                    'UDAAN Live';
            }

            if (viewerCount) {
                viewerCount.textContent =
                    String(response.room?.viewers ?? 0);
            }

            addSystemMessage(
                'Connected. Waiting for creator video...'
            );

            socket.emit('live:viewer-ready', {
                roomId
            });
        }
    );
}

async function createHostPeer(viewerSocketId) {
    if (!stream || !roomId) return;

    const oldPeer = hostPeers.get(viewerSocketId);

    if (oldPeer) {
        oldPeer.close();
        hostPeers.delete(viewerSocketId);
    }

    const pc = createPeerConnection(
        viewerSocketId,
        'host'
    );

    hostPeers.set(viewerSocketId, pc);

    stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
    });

    try {
        const offer = await pc.createOffer();

        await pc.setLocalDescription(offer);

        socket.emit('live:offer', {
            roomId,
            viewerSocketId,
            offer: pc.localDescription
        });

    } catch (error) {
        console.error(
            'Host offer error:',
            error
        );
    }
}

async function handleViewerOffer(data) {
    if (isHost) return;

    if (!data?.offer || !data?.hostSocketId) {
        return;
    }

    hostSocketId = data.hostSocketId;

    if (viewerPeer) {
        viewerPeer.close();
    }

    viewerPeer = createPeerConnection(
        hostSocketId,
        'viewer'
    );

    viewerPeer.ontrack = (event) => {
        const video = createRemoteVideo();

        if (event.streams && event.streams[0]) {
            video.srcObject = event.streams[0];
        }
    };

    try {
        await viewerPeer.setRemoteDescription(
            new RTCSessionDescription(data.offer)
        );

        const answer =
            await viewerPeer.createAnswer();

        await viewerPeer.setLocalDescription(
            answer
        );

        socket.emit('live:answer', {
            roomId,
            hostSocketId,
            answer: viewerPeer.localDescription
        });

        addSystemMessage(
            '🎥 Live video connected!'
        );

    } catch (error) {
        console.error(
            'Viewer answer error:',
            error
        );
    }
}

async function handleHostAnswer(data) {
    if (!isHost) return;

    const pc = hostPeers.get(
        data.viewerSocketId
    );

    if (!pc || !data.answer) return;

    try {
        await pc.setRemoteDescription(
            new RTCSessionDescription(data.answer)
        );
    } catch (error) {
        console.error(
            'Host answer error:',
            error
        );
    }
}

async function handleIceCandidate(data) {
    if (!data?.candidate) return;

    try {

        if (isHost) {
            const pc = hostPeers.get(
                data.fromSocketId
            );

            if (pc) {
                await pc.addIceCandidate(
                    new RTCIceCandidate(
                        data.candidate
                    )
                );
            }

        } else if (viewerPeer) {

            await viewerPeer.addIceCandidate(
                new RTCIceCandidate(
                    data.candidate
                )
            );
        }

    } catch (error) {
        console.warn(
            'ICE candidate error:',
            error
        );
    }
}

function addChatMessage(user, message) {
    if (!chatList) return;

    const item =
        document.createElement('div');

    item.className = 'chat-message';

    const name =
        document.createElement('strong');

    name.textContent = user;

    const text =
        document.createElement('span');

    text.textContent = message;

    item.appendChild(name);
    item.appendChild(text);

    chatList.appendChild(item);

    chatList.scrollTop =
        chatList.scrollHeight;
}

function addSystemMessage(message) {
    if (!chatList) return;

    const item =
        document.createElement('div');

    item.className = 'chat-system';

    item.textContent = message;

    chatList.appendChild(item);

    chatList.scrollTop =
        chatList.scrollHeight;
}

function sendChat() {
  const message = chatInput?.value.trim();

  if (!message) {
    return;
  }

  if (!roomId) {
    addSystemMessage('Live room is not ready. Please wait a moment.');
    return;
  }

  if (!socket.connected) {
    addSystemMessage('Connection lost. Reconnecting...');
    socket.connect();
    return;
  }

  sendChatBtn.disabled = true;

  socket.timeout(5000).emit(
    'live:chat',
    {
      roomId: roomId,
      username: username || 'Creator',
      message: message.slice(0, 500)
    },
    (err, response) => {
      sendChatBtn.disabled = false;

      if (err) {
        addSystemMessage('Message could not be sent. Please try again.');
        return;
      }

      if (!response || response.success !== true) {
        addSystemMessage(
          response?.message || 'Message could not be sent.'
        );
        return;
      }

      chatInput.value = '';
      chatInput.focus();
    }
  );
}

async function switchCamera() {
    if (!stream) return;

    facingMode =
        facingMode === 'user'
            ? 'environment'
            : 'user';

    if (cameraSelect) {
        cameraSelect.value = facingMode;
    }

    const oldStream = stream;

    const newStream =
        await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode,
                width: {
                    ideal: 1280
                },
                height: {
                    ideal: 720
                }
            },
            audio: true
        });

    const newVideoTrack =
        newStream.getVideoTracks()[0];

    const oldVideoTrack =
        oldStream.getVideoTracks()[0];

    if (oldVideoTrack) {
        oldVideoTrack.stop();
    }

    stream = newStream;

    if (isMuted) {
        const audio =
            stream.getAudioTracks();

        audio.forEach(track => {
            track.enabled = false;
        });
    }

    if (livePreview) {
        livePreview.srcObject = stream;
    }

    if (setupCameraPreview) {
        setupCameraPreview.srcObject = stream;
    }

    if (isHost) {

        for (const [viewerId, pc] of hostPeers) {

            const sender =
                pc.getSenders().find(
                    s =>
                        s.track &&
                        s.track.kind === 'video'
                );

            if (sender) {
                await sender.replaceTrack(
                    newVideoTrack
                );
            }
        }
    }
}

function toggleMute() {
    if (!stream) return;

    const audioTracks =
        stream.getAudioTracks();

    if (!audioTracks.length) return;

    isMuted = !isMuted;

    audioTracks.forEach(track => {
        track.enabled = !isMuted;
    });

    if (muteBtn) {
        muteBtn.textContent =
            isMuted
                ? '🔇 Unmute'
                : '🎙️ Mute';
    }
}

function closePeerConnections() {

    for (const pc of hostPeers.values()) {
        pc.close();
    }

    hostPeers.clear();

    if (viewerPeer) {
        viewerPeer.close();
        viewerPeer = null;
    }
}

function endLive() {

    if (isHost && roomId) {
        socket.emit('live:end');
    }

    closePeerConnections();

    stopCamera();

    roomId = null;
    isHost = false;

    livePanel?.classList.add('hidden');
    setupPanel?.classList.remove('hidden');

    liveRoomInfo?.classList.add('hidden');

    removeRemoteVideo();

    addSystemMessage(
        'Live stream ended.'
    );
}


async function enterLiveFullscreen() {
    const target = document.getElementById('livePanel');

    if (!target) return;

    try {
        if (!document.fullscreenElement) {
            if (target.requestFullscreen) {
                await target.requestFullscreen();
            } else if (target.webkitRequestFullscreen) {
                target.webkitRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                await document.exitFullscreen();
            }
        }
    } catch (error) {
        console.warn('Fullscreen unavailable:', error);
    }
}

async function shareLive() {

    if (!roomId) return;

    const url =
        `${window.location.origin}/live.html?room=${encodeURIComponent(roomId)}`;

    try {

        if (navigator.share) {

            await navigator.share({
                title: 'UDAAN Live',
                text: 'Join my live stream on UDAAN 🚀',
                url
            });

        } else if (navigator.clipboard) {

            await navigator.clipboard.writeText(url);

            alert('Live link copied!');

        } else {

            prompt(
                'Copy this live link:',
                url
            );
        }

    } catch (error) {
        console.log(
            'Share cancelled:',
            error
        );
    }
}

socket.on('connect', () => {

    console.log(
        'UDAAN WebRTC Socket connected:',
        socket.id
    );

    const roomFromUrl =
        getRoomFromUrl();

    if (roomFromUrl) {
        joinLive(roomFromUrl);
    }
});

socket.on(
    'live:viewer-joined',
    async (data = {}) => {

        if (!isHost) return;

        if (!data.viewerSocketId) return;

        await createHostPeer(
            data.viewerSocketId
        );
    }
);

socket.on(
    'live:offer',
    handleViewerOffer
);

socket.on(
    'live:answer',
    handleHostAnswer
);

socket.on(
    'live:ice',
    handleIceCandidate
);

socket.on(
    'live:viewers',
    (data = {}) => {

        if (!roomId) return;

        if (data.roomId !== roomId) {
            return;
        }

        if (viewerCount) {
            viewerCount.textContent =
                String(data.viewers ?? 0);
        }
    }
);

socket.on(
    'live:chat',
    (data = {}) => {

        if (!roomId) return;

        if (data.roomId !== roomId) {
            return;
        }

        addChatMessage(
            data.username || 'Viewer',
            data.message || ''
        );
    }
);

socket.on(
    'live:ended',
    (data = {}) => {

        if (!roomId) return;

        if (data.roomId !== roomId) {
            return;
        }

        addSystemMessage(
            '🔴 This live stream has ended.'
        );

        closePeerConnections();
        stopCamera();

        roomId = null;
        isHost = false;

        removeRemoteVideo();

        livePanel?.classList.add('hidden');
        setupPanel?.classList.remove('hidden');

        liveRoomInfo?.classList.add('hidden');
    }
);



startLiveBtn?.addEventListener(
    'click',
    async () => {
        try {
            startLiveBtn.disabled = true;

            await startCamera();

            if (!stream) {
                startLiveBtn.disabled = false;
                return;
            }

            await createLive();

        } catch (error) {
            console.error('Start live error:', error);
            startLiveBtn.disabled = false;
            showMessage(
                'Unable to start live: ' + error.message,
                'error'
            );
        }
    }
);

switchCameraBtn?.addEventListener(
    'click',
    switchCamera
);

muteBtn?.addEventListener(
    'click',
    toggleMute
);

endLiveBtn?.addEventListener(
    'click',
    () => {

        if (
            confirm(
                'End this live stream?'
            )
        ) {
            endLive();
        }
    }
);

shareLiveBtn?.addEventListener(
    'click',
    shareLive
);

fullscreenBtn?.addEventListener(
    'click',
    enterLiveFullscreen
);

sendChatBtn?.addEventListener(
    'click',
    sendChat
);

chatInput?.addEventListener(
    'keydown',
    event => {

        if (event.key === 'Enter') {
            event.preventDefault();
            sendChat();
        }
    }
);

$('backBtn')?.addEventListener(
    'click',
    () => {
        if (roomId) {
            if (confirm('Leave the live stream?')) {
                endLive();
            }
        } else {
            history.back();
        }
    }
);

window.addEventListener(
    'beforeunload',
    () => {

        closePeerConnections();
        stopCamera();
    }
);

loadUser();

socket.on('connect', () => {
  console.log('UDAAN Live Socket connected:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('UDAAN Live Socket disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('UDAAN Live Socket error:', error);
});

