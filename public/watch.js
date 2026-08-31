const video = document.getElementById('video');
const player = document.getElementById('player');

const playBtn = document.getElementById('playBtn');
const centerPlay = document.getElementById('centerPlay');
const muteBtn = document.getElementById('muteBtn');
const volume = document.getElementById('volume');
const progress = document.getElementById('progress');

const currentTimeEl = document.getElementById('currentTime');
const durationEl = document.getElementById('duration');

const settingsBtn = document.getElementById('settingsBtn');
const settingsMenu = document.getElementById('settingsMenu');
const closeSettings = document.getElementById('closeSettings');

const qualityMenu = document.getElementById('qualityMenu');
const speedMenu = document.getElementById('speedMenu');
const captionMenu = document.getElementById('captionMenu');

const qualitySetting = document.getElementById('qualitySetting');
const speedSetting = document.getElementById('speedSetting');
const captionSetting = document.getElementById('captionSetting');

const qualityValue = document.getElementById('qualityValue');
const speedValue = document.getElementById('speedValue');
const captionValue = document.getElementById('captionValue');

const loading = document.getElementById('loading');

let currentVideo = null;
let currentQuality = 'auto';
let currentCaption = false;

function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return '0:00';

    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);

    return `${m}:${String(s).padStart(2, '0')}`;
}

function getVideoId() {
    const params = new URLSearchParams(window.location.search);

    return (
        params.get('video') ||
        params.get('vid') ||
        params.get('id') ||
        params.get('videoId') ||
        params.get('filename') ||
        ''
    ).trim();
}

function getSource(videoData, quality = 'auto') {
    if (!videoData) return '';

    const qualities = videoData.qualities || {};

    // Selected quality available ho to wahi use karo
    if (quality !== 'auto' && qualities[quality]) {
        return String(qualities[quality]);
    }

    // Original quality
    if (qualities.original) {
        return String(qualities.original);
    }

    // Purane videos ke liye filename se direct source
    if (videoData.filename) {
        return `/uploads/${encodeURIComponent(String(videoData.filename))}`;
    }

    // Extra compatibility
    return String(
        videoData.url ||
        videoData.videoUrl ||
        videoData.src ||
        videoData.path ||
        ''
    );
}

function videoMatches(item, requestedId) {

    const wanted = String(requestedId || '').trim();

    if (!wanted) return false;

    const values = [
        item.id,
        item.videoId,
        item.video_id,
        item.filename,
        item.file,
        item.url
    ];

    return values.some(value =>
        value !== undefined &&
        value !== null &&
        String(value).trim() === wanted
    );
}

async function loadVideo() {
    const id = getVideoId();

    try {
        loading?.classList.add('show');

        const response = await fetch('/api/videos', {
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error('Videos API failed: ' + response.status);
        }

        const apiData = await response.json();

        const videos = Array.isArray(apiData)
            ? apiData
            : Array.isArray(apiData.videos)
                ? apiData.videos
                : Array.isArray(apiData.data)
                    ? apiData.data
                    : [];

        /*
         * Agar URL mein video ID nahi hai,
         * to latest video automatically open karo.
         */
        const targetId = id || (
            videos.length
                ? String(videos[videos.length - 1].id || '')
                : ''
        );

        currentVideo = videos.find(item =>
            videoMatches(item, targetId)
        );

        if (!currentVideo) {
            throw new Error('Video not found: ' + targetId);
        }

        const source = getSource(currentVideo, 'auto');

        if (!source) {
            throw new Error('Video source not found');
        }

        console.log('UDAAN WATCH VIDEO');
        console.log('ID:', currentVideo.id);
        console.log('FILENAME:', currentVideo.filename);
        console.log('SOURCE:', source);

        document.getElementById('videoTitle').textContent =
            currentVideo.title || 'Untitled Video';

        document.getElementById('creatorName').textContent =
            '@' + (currentVideo.username || 'creator');

        document.getElementById('videoStats').textContent =
            `${currentVideo.views || 0} views • ${currentVideo.likes || 0} likes`;

        document.getElementById('likeCount').textContent =
            currentVideo.likes || 0;

        document.getElementById('description').textContent =
            currentVideo.description || '';

        const initial =
            (currentVideo.username ||
             currentVideo.title ||
             'U').charAt(0).toUpperCase();

        document.getElementById('creatorAvatar').textContent = initial;

        // Important mobile video settings
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.preload = 'metadata';
        video.controls = false;

        video.onerror = () => {
            console.error(
                'UDAAN VIDEO ERROR:',
                video.error,
                video.currentSrc || video.src
            );

            document.getElementById('videoTitle').textContent =
                'Video source could not be played';
        };

        video.onloadedmetadata = () => {
            console.log(
                'UDAAN VIDEO LOADED:',
                video.duration,
                'seconds'
            );

            durationEl.textContent =
                formatTime(video.duration);
        };

        // Purana source completely remove karke naya source load
        video.pause();
        video.removeAttribute('src');
        video.load();

        video.src = source;
        video.load();

        // Related + comments
        loadComments();
        loadRelated(videos, currentVideo.id);

    } catch (error) {
        console.error('UDAAN WATCH LOAD ERROR:', error);

        document.getElementById('videoTitle').textContent =
            'Unable to load video';

    } finally {
        loading?.classList.remove('show');
    }
}
/* PLAY / PAUSE */

function togglePlay() {

    if (video.paused) {
        video.play().catch(() => {});
    } else {
        video.pause();
    }
}

playBtn.addEventListener('click', togglePlay);
centerPlay.addEventListener('click', togglePlay);
video.addEventListener('click', togglePlay);

video.addEventListener('play', () => {

    playBtn.textContent = '❚❚';
    centerPlay.classList.add('hidden');

});

video.addEventListener('pause', () => {

    playBtn.textContent = '▶';
    centerPlay.classList.remove('hidden');

});

/* TIME */

video.addEventListener('loadedmetadata', () => {

    durationEl.textContent =
        formatTime(video.duration);

});

video.addEventListener('timeupdate', () => {

    if (!video.duration) return;

    progress.value =
        (video.currentTime / video.duration) * 100;

    currentTimeEl.textContent =
        formatTime(video.currentTime);

});

progress.addEventListener('input', () => {

    if (!video.duration) return;

    video.currentTime =
        (Number(progress.value) / 100) * video.duration;

});

/* VOLUME */

muteBtn.addEventListener('click', () => {

    video.muted = !video.muted;

    muteBtn.textContent =
        video.muted ? '🔇' : '🔊';

});

volume.addEventListener('input', () => {

    video.volume = Number(volume.value);

    video.muted = video.volume === 0;

    muteBtn.textContent =
        video.muted ? '🔇' : '🔊';

});

/* FULLSCREEN */

document.getElementById('fullscreenBtn')
    .addEventListener('click', async () => {

        try {

            if (!document.fullscreenElement) {

                await player.requestFullscreen();

            } else {

                await document.exitFullscreen();

            }

        } catch (error) {

            console.error('Fullscreen error:', error);

        }

    });

/* SETTINGS */

function closeAllMenus() {

    settingsMenu.classList.remove('show');
    qualityMenu.classList.remove('show');
    speedMenu.classList.remove('show');
    captionMenu.classList.remove('show');

}

settingsBtn.addEventListener('click', event => {

    event.stopPropagation();

    qualityMenu.classList.remove('show');
    speedMenu.classList.remove('show');
    captionMenu.classList.remove('show');

    settingsMenu.classList.toggle('show');

});

closeSettings.addEventListener('click', closeAllMenus);

qualitySetting.addEventListener('click', () => {

    settingsMenu.classList.remove('show');
    qualityMenu.classList.add('show');

});

speedSetting.addEventListener('click', () => {

    settingsMenu.classList.remove('show');
    speedMenu.classList.add('show');

});

captionSetting.addEventListener('click', () => {

    settingsMenu.classList.remove('show');
    captionMenu.classList.add('show');

});

/* QUALITY */

document.querySelectorAll('[data-quality]')
    .forEach(button => {

        button.addEventListener('click', () => {

            const quality = button.dataset.quality;

            currentQuality = quality;

            qualityValue.textContent =
                `${quality === 'auto' ? 'Auto' : quality} ›`;

            const wasPlaying = !video.paused;
            const savedTime = video.currentTime;

            const source = getSource(
                currentVideo,
                quality
            );

            if (source) {

                video.src = source;
                video.load();

                video.addEventListener(
                    'loadedmetadata',
                    function restore() {

                        video.currentTime =
                            Math.min(
                                savedTime,
                                video.duration || savedTime
                            );

                        if (wasPlaying) {
                            video.play().catch(() => {});
                        }

                        video.removeEventListener(
                            'loadedmetadata',
                            restore
                        );

                    }
                );

            }

            qualityMenu.classList.remove('show');

        });

    });

document.getElementById('qualityBack')
    .addEventListener('click', () => {

        qualityMenu.classList.remove('show');
        settingsMenu.classList.add('show');

    });

/* SPEED */

document.querySelectorAll('[data-speed]')
    .forEach(button => {

        button.addEventListener('click', () => {

            const speed =
                Number(button.dataset.speed);

            video.playbackRate = speed;

            speedValue.textContent =
                `${speed === 1 ? '1x' : speed + 'x'} ›`;

            speedMenu.classList.remove('show');

        });

    });

document.getElementById('speedBack')
    .addEventListener('click', () => {

        speedMenu.classList.remove('show');
        settingsMenu.classList.add('show');

    });

/* CAPTIONS */

document.querySelectorAll('[data-caption]')
    .forEach(button => {

        button.addEventListener('click', () => {

            currentCaption =
                button.dataset.caption === 'on';

            captionValue.textContent =
                currentCaption ? 'Hindi ›' : 'Off ›';

            /*
             * Native text tracks will be enabled here
             * automatically if the uploaded video has
             * a caption track.
             */

            [...video.textTracks].forEach(track => {

                track.mode =
                    currentCaption ? 'showing' : 'hidden';

            });

            captionMenu.classList.remove('show');

        });

    });

document.getElementById('captionBack')
    .addEventListener('click', () => {

        captionMenu.classList.remove('show');
        settingsMenu.classList.add('show');

    });

/* CC BUTTON */

document.getElementById('ccBtn')
    .addEventListener('click', () => {

        currentCaption = !currentCaption;

        captionValue.textContent =
            currentCaption ? 'Hindi ›' : 'Off ›';

        [...video.textTracks].forEach(track => {

            track.mode =
                currentCaption ? 'showing' : 'hidden';

        });

        document.getElementById('ccBtn')
            .style.opacity =
            currentCaption ? '1' : '.7';

    });

/* SHARE */

document.getElementById('shareBtn')
    .addEventListener('click', async () => {

        const url = location.href;

        try {

            if (navigator.share) {

                await navigator.share({
                    title: currentVideo?.title || 'UDAAN',
                    text: 'Watch this video on UDAAN 🚀',
                    url
                });

            } else {

                await navigator.clipboard.writeText(url);

                alert('Video link copied!');

            }

        } catch (error) {

            if (error.name !== 'AbortError') {
                console.error(error);
            }

        }

    });

/* LIKE */

document.getElementById('likeBtn')
    .addEventListener('click', async () => {

        if (!currentVideo) return;

        try {

            const response = await fetch(
                `/api/videos/${encodeURIComponent(currentVideo.id)}/like`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) return;

            const result = await response.json();

            document.getElementById('likeCount')
                .textContent =
                result.likes ??
                currentVideo.likes ??
                0;

        } catch (error) {

            console.error('Like error:', error);

        }

    });

/* COMMENTS */

async function loadComments() {

    if (!currentVideo) return;

    const box =
        document.getElementById('comments');

    const comments =
        currentVideo.comments || [];

    if (!comments.length) {

        box.innerHTML =
            '<p>No comments yet.</p>';

        return;
    }

    box.innerHTML = comments.map(comment => `

        <div class="comment">
            <strong>👤 Creator</strong>
            <div>${escapeHtml(comment.text || '')}</div>
        </div>

    `).join('');

}

function escapeHtml(value) {

    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

}

/* RELATED */

function loadRelated(videos, currentId) {

    const box =
        document.getElementById('relatedVideos');

    const related =
        videos
            .filter(item =>
                String(item.id) !== String(currentId) &&
                item.isShort !== true
            )
            .slice()
            .reverse()
            .slice(0, 10);

    box.innerHTML = related.map(item => {

        const source = getSource(item);

        return `

            <div class="related-card"
                 data-id="${escapeHtml(item.id)}">

                <video
                    src="${escapeHtml(source)}"
                    muted
                    preload="metadata">
                </video>

                <div>
                    ${escapeHtml(item.title || 'Untitled Video')}
                </div>

            </div>

        `;

    }).join('');

    box.querySelectorAll('.related-card')
        .forEach(card => {

            card.addEventListener('click', () => {

                location.href =
                    `/watch.html?video=${encodeURIComponent(card.dataset.id)}`;

            });

        });

}

/* BACK */

document.getElementById('backBtn')
    .addEventListener('click', () => {

        if (history.length > 1) {
            history.back();
        } else {
            location.href = '/home.html';
        }

    });

/* OUTSIDE CLICK = CLOSE SETTINGS */

document.addEventListener('click', event => {

    if (!event.target.closest('.settings-menu') &&
        !event.target.closest('.sub-menu') &&
        !event.target.closest('#settingsBtn')) {

        closeAllMenus();

    }

});

/* START */

loadVideo();
