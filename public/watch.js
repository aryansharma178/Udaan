const video = document.getElementById('video');
const player = document.getElementById('player');

const centerPlay = document.getElementById('centerPlay');
const centerBack10 = document.getElementById('centerBack10');
const centerForward10 = document.getElementById('centerForward10');

const progress = document.getElementById('progress');

const currentTimeEl =
    document.getElementById('currentTime');

const durationEl =
    document.getElementById('duration');

const fullscreenBtn =
    document.getElementById('fullscreenBtn');

const settingsBtn =
    document.getElementById('settingsBtn');

const settingsMenu =
    document.getElementById('settingsMenu');

const closeSettings =
    document.getElementById('closeSettings');

const qualityMenu =
    document.getElementById('qualityMenu');

const speedMenu =
    document.getElementById('speedMenu');

const captionMenu =
    document.getElementById('captionMenu');

const qualitySetting =
    document.getElementById('qualitySetting');

const speedSetting =
    document.getElementById('speedSetting');

const captionSetting =
    document.getElementById('captionSetting');

const qualityValue =
    document.getElementById('qualityValue');

const speedValue =
    document.getElementById('speedValue');

const captionValue =
    document.getElementById('captionValue');

const loading =
    document.getElementById('loading');

let currentVideo = null;
let currentQuality = 'auto';
let currentCaption = false;


/* =====================================================
   TIME
   ===================================================== */

function formatTime(seconds) {

    if (!Number.isFinite(seconds)) {
        return '0:00';
    }

    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);

    return `${m}:${String(s).padStart(2, '0')}`;
}


/* =====================================================
   VIDEO ID
   ===================================================== */

function getVideoId() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    return (
        params.get('video') ||
        params.get('vid') ||
        params.get('id') ||
        params.get('videoId') ||
        params.get('filename') ||
        ''
    ).trim();
}


/* =====================================================
   VIDEO SOURCE
   ===================================================== */

function getSource(
    videoData,
    quality = 'auto'
) {

    if (!videoData) {
        return '';
    }

    const qualities =
        videoData.qualities || {};

    if (
        quality !== 'auto' &&
        qualities[quality]
    ) {

        return String(
            qualities[quality]
        );

    }

    if (qualities.original) {

        return String(
            qualities.original
        );

    }

    if (videoData.filename) {

        return `/uploads/${encodeURIComponent(
            String(videoData.filename)
        )}`;

    }

    return String(
        videoData.url ||
        videoData.videoUrl ||
        videoData.src ||
        videoData.path ||
        ''
    );
}


/* =====================================================
   MATCH VIDEO
   ===================================================== */

function videoMatches(
    item,
    requestedId
) {

    const wanted =
        String(
            requestedId || ''
        ).trim();

    if (!wanted) {
        return false;
    }

    const values = [
        item.id,
        item.videoId,
        item.video_id,
        item.filename,
        item.file,
        item.url
    ];

    return values.some(
        value =>
            value !== undefined &&
            value !== null &&
            String(value).trim() === wanted
    );
}


/* =====================================================
   LOAD VIDEO
   ===================================================== */


/* =====================================================
   VIEW / WATCH-TIME TRACKING
===================================================== */

let viewTracked = false;
let lastTrackedTime = 0;
let watchSecondsPending = 0;
let watchSendInProgress = false;

function getWatchToken() {
    return localStorage.getItem('udaan_token') || '';
}

async function trackVideoView() {
    if (!currentVideo?.id || viewTracked) return;

    viewTracked = true;

    try {
        const response = await fetch(
            `/api/videos/${encodeURIComponent(currentVideo.id)}/view`,
            { method: 'POST' }
        );

        if (!response.ok) {
            throw new Error('View tracking failed: ' + response.status);
        }

        const result = await response.json();

        if (result.success) {
            currentVideo.views = result.views ?? currentVideo.views ?? 0;

            const stats = document.getElementById('videoStats');

            if (stats) {
                stats.textContent =
                    `${currentVideo.views || 0} views • ${currentVideo.likes || 0} likes`;
            }
        }
    } catch (error) {
        console.error('View tracking error:', error);
        viewTracked = false;
    }
}

async function sendWatchTime(seconds) {
    if (!currentVideo?.id || seconds <= 0 || watchSendInProgress) {
        return;
    }

    const token = getWatchToken();

    if (!token) return;

    watchSendInProgress = true;

    try {
        const response = await fetch(
            `/api/videos/${encodeURIComponent(currentVideo.id)}/watch`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    seconds: Math.min(Math.max(Number(seconds) || 0, 0), 30)
                })
            }
        );

        if (!response.ok) {
            throw new Error('Watch tracking failed: ' + response.status);
        }

        const result = await response.json();

        if (result.success) {
            currentVideo.watchSeconds =
                result.watchSeconds ?? currentVideo.watchSeconds ?? 0;

            currentVideo.watchMinutes =
                result.watchMinutes ?? currentVideo.watchMinutes ?? 0;

            currentVideo.earnings =
                result.earnings ?? currentVideo.earnings ?? 0;
        }
    } catch (error) {
        console.error('Watch-time tracking error:', error);
    } finally {
        watchSendInProgress = false;
    }
}

async function flushWatchTime() {
    if (watchSecondsPending <= 0 || watchSendInProgress) {
        return;
    }

    const seconds = Math.min(watchSecondsPending, 30);
    watchSecondsPending -= seconds;

    await sendWatchTime(seconds);
}

video.addEventListener('play', () => {
    lastTrackedTime = Number(video.currentTime) || 0;
});

video.addEventListener('timeupdate', () => {
    if (video.paused || video.ended) return;

    const now = Number(video.currentTime);

    if (!Number.isFinite(now)) return;

    const delta = now - lastTrackedTime;

    if (delta > 0 && delta <= 5) {
        watchSecondsPending += delta;
    }

    lastTrackedTime = now;

    if (watchSecondsPending >= 30) {
        flushWatchTime();
    }
});

video.addEventListener('pause', () => {
    const now = Number(video.currentTime);

    if (Number.isFinite(now)) {
        const delta = now - lastTrackedTime;

        if (delta > 0 && delta <= 5) {
            watchSecondsPending += delta;
        }

        lastTrackedTime = now;
    }

    flushWatchTime();
});

video.addEventListener('ended', () => {
    const now = Number(video.currentTime);

    if (Number.isFinite(now)) {
        const delta = now - lastTrackedTime;

        if (delta > 0 && delta <= 5) {
            watchSecondsPending += delta;
        }

        lastTrackedTime = now;
    }

    flushWatchTime();
});

window.addEventListener('beforeunload', () => {
    if (watchSecondsPending <= 0) return;

    const token = getWatchToken();

    if (!token || !currentVideo?.id) return;

    const payload = JSON.stringify({
        seconds: Math.min(watchSecondsPending, 30)
    });

    navigator.sendBeacon(
        `/api/videos/${encodeURIComponent(currentVideo.id)}/watch`,
        new Blob([payload], {
            type: 'application/json'
        })
    );

    watchSecondsPending = 0;
});


async function loadVideo() {

    const id = getVideoId();

    try {

        loading?.classList.add('show');

        const response =
            await fetch(
                '/api/videos',
                {
                    cache: 'no-store'
                }
            );

        if (!response.ok) {

            throw new Error(
                'Videos API failed: ' +
                response.status
            );

        }

        const apiData =
            await response.json();

        const videos =
            Array.isArray(apiData)
                ? apiData
                : Array.isArray(apiData.videos)
                    ? apiData.videos
                    : Array.isArray(apiData.data)
                        ? apiData.data
                        : [];

        const targetId =
            id ||
            (
                videos.length
                    ? String(
                        videos[
                            videos.length - 1
                        ].id || ''
                    )
                    : ''
            );

        currentVideo =
            videos.find(
                item =>
                    videoMatches(
                        item,
                        targetId
                    )
            );

        if (!currentVideo) {

            throw new Error(
                'Video not found: ' +
                targetId
            );

        }

        const source =
            getSource(
                currentVideo,
                'auto'
            );

        if (!source) {

            throw new Error(
                'Video source not found'
            );

        }

        console.log(
            'UDAAN WATCH VIDEO'
        );

        console.log(
            'ID:',
            currentVideo.id
        );

        console.log(
            'FILENAME:',
            currentVideo.filename
        );

        console.log(
            'SOURCE:',
            source
        );


        document.getElementById(
            'videoTitle'
        ).textContent =
            currentVideo.title ||
            'Untitled Video';


        document.getElementById(
            'creatorName'
        ).textContent =
            '@' +
            (
                currentVideo.username ||
                'creator'
            );


        document.getElementById(
            'videoStats'
        ).textContent =
            `${currentVideo.views || 0} views • ${
                currentVideo.likes || 0
            } likes`;


        document.getElementById(
            'likeCount'
        ).textContent =
            currentVideo.likes || 0;


        document.getElementById(
            'description'
        ).textContent =
            currentVideo.description || '';


        const initial =
            (
                currentVideo.username ||
                currentVideo.title ||
                'U'
            )
            .charAt(0)
            .toUpperCase();


        document.getElementById(
            'creatorAvatar'
        ).textContent =
            initial;


        video.setAttribute(
            'playsinline',
            ''
        );

        video.setAttribute(
            'webkit-playsinline',
            ''
        );

        video.preload =
            'metadata';

        video.controls =
            false;


        video.onerror =
            () => {

                console.error(
                    'UDAAN VIDEO ERROR:',
                    video.error,
                    video.currentSrc ||
                    video.src
                );

                document.getElementById(
                    'videoTitle'
                ).textContent =
                    'Video source could not be played';

            };


        video.pause();

        video.removeAttribute(
            'src'
        );

        video.load();

        video.src =
            source;

        video.load();


        loadComments();

        loadRelated(
            videos,
            currentVideo.id
        );

        viewTracked = false;
        lastTrackedTime = Number(video.currentTime) || 0;
        watchSecondsPending = 0;
        watchSendInProgress = false;

        trackVideoView();

    } catch (error) {

        console.error(
            'UDAAN WATCH LOAD ERROR:',
            error
        );

        document.getElementById(
            'videoTitle'
        ).textContent =
            'Unable to load video';

    } finally {

        loading?.classList.remove(
            'show'
        );

    }
}


/* =====================================================
   PLAY / PAUSE
   ===================================================== */

function togglePlay(
    event
) {

    if (event) {
        event.stopPropagation();
    }

    if (video.paused) {

        video.play()
            .catch(
                error =>
                    console.error(
                        'Play error:',
                        error
                    )
            );

    } else {

        video.pause();

    }
}


centerPlay.addEventListener(
    'click',
    togglePlay
);


video.addEventListener(
    'click',
    togglePlay
);


video.addEventListener(
    'play',
    () => {

        centerPlay.textContent =
            '❚❚';

    }
);


video.addEventListener(
    'pause',
    () => {

        centerPlay.textContent =
            '▶';

    }
);


/* =====================================================
   CENTER BACK 10
   ===================================================== */

centerBack10.addEventListener(
    'click',
    event => {

        event.stopPropagation();

        if (
            !Number.isFinite(
                video.duration
            )
        ) {
            return;
        }

        video.currentTime =
            Math.max(
                0,
                video.currentTime - 10
            );

    }
);


/* =====================================================
   CENTER FORWARD 10
   ===================================================== */

centerForward10.addEventListener(
    'click',
    event => {

        event.stopPropagation();

        if (
            !Number.isFinite(
                video.duration
            )
        ) {
            return;
        }

        video.currentTime =
            Math.min(
                video.duration,
                video.currentTime + 10
            );

    }
);


/* =====================================================
   METADATA
   ===================================================== */

video.addEventListener(
    'loadedmetadata',
    () => {

        durationEl.textContent =
            formatTime(
                video.duration
            );

    }
);


/* =====================================================
   TIME UPDATE
   ===================================================== */

video.addEventListener(
    'timeupdate',
    () => {

        if (!video.duration) {
            return;
        }

        progress.value =
            (
                video.currentTime /
                video.duration
            ) * 100;

        currentTimeEl.textContent =
            formatTime(
                video.currentTime
            );

    }
);


/* =====================================================
   SEEK BAR
   ===================================================== */

progress.addEventListener(
    'input',
    () => {

        if (!video.duration) {
            return;
        }

        video.currentTime =
            (
                Number(
                    progress.value
                ) / 100
            ) *
            video.duration;

    }
);


/* =====================================================
   FULLSCREEN / ZOOM
   ===================================================== */

fullscreenBtn.addEventListener(
    'click',
    async event => {

        event.stopPropagation();

        try {

            if (
                !document.fullscreenElement
            ) {

                if (
                    player.requestFullscreen
                ) {

                    await player.requestFullscreen();

                } else if (
                    video.webkitEnterFullscreen
                ) {

                    video.webkitEnterFullscreen();

                }

            } else {

                await document.exitFullscreen();

            }

        } catch (error) {

            console.error(
                'Fullscreen error:',
                error
            );

        }

    }
);


/* =====================================================
   SETTINGS
   ===================================================== */

function closeAllMenus() {

    settingsMenu.classList.remove(
        'show'
    );

    qualityMenu.classList.remove(
        'show'
    );

    speedMenu.classList.remove(
        'show'
    );

    captionMenu.classList.remove(
        'show'
    );

}


settingsBtn.addEventListener(
    'click',
    event => {

        event.stopPropagation();

        qualityMenu.classList.remove(
            'show'
        );

        speedMenu.classList.remove(
            'show'
        );

        captionMenu.classList.remove(
            'show'
        );

        settingsMenu.classList.toggle(
            'show'
        );

    }
);


closeSettings.addEventListener(
    'click',
    closeAllMenus
);


/* =====================================================
   QUALITY
   ===================================================== */

qualitySetting.addEventListener(
    'click',
    () => {

        settingsMenu.classList.remove(
            'show'
        );

        qualityMenu.classList.add(
            'show'
        );

    }
);


document.querySelectorAll(
    '[data-quality]'
).forEach(
    button => {

        button.addEventListener(
            'click',
            () => {

                const quality =
                    button.dataset.quality;

                currentQuality =
                    quality;

                qualityValue.textContent =
                    `${
                        quality === 'auto'
                            ? 'Auto'
                            : quality
                    } ›`;

                const wasPlaying =
                    !video.paused;

                const savedTime =
                    video.currentTime;

                const source =
                    getSource(
                        currentVideo,
                        quality
                    );

                if (!source) {
                    return;
                }

                const restore =
                    () => {

                        video.currentTime =
                            Math.min(
                                savedTime,
                                video.duration ||
                                savedTime
                            );

                        if (wasPlaying) {

                            video.play()
                                .catch(
                                    () => {}
                                );

                        }

                    };

                video.addEventListener(
                    'loadedmetadata',
                    restore,
                    {
                        once: true
                    }
                );

                video.src =
                    source;

                video.load();

                qualityMenu.classList.remove(
                    'show'
                );

            }
        );

    }
);


document.getElementById(
    'qualityBack'
).addEventListener(
    'click',
    () => {

        qualityMenu.classList.remove(
            'show'
        );

        settingsMenu.classList.add(
            'show'
        );

    }
);


/* =====================================================
   SPEED
   ===================================================== */

speedSetting.addEventListener(
    'click',
    () => {

        settingsMenu.classList.remove(
            'show'
        );

        speedMenu.classList.add(
            'show'
        );

    }
);


document.querySelectorAll(
    '[data-speed]'
).forEach(
    button => {

        button.addEventListener(
            'click',
            () => {

                const speed =
                    Number(
                        button.dataset.speed
                    );

                video.playbackRate =
                    speed;

                speedValue.textContent =
                    `${
                        speed === 1
                            ? '1x'
                            : speed + 'x'
                    } ›`;

                speedMenu.classList.remove(
                    'show'
                );

            }
        );

    }
);


document.getElementById(
    'speedBack'
).addEventListener(
    'click',
    () => {

        speedMenu.classList.remove(
            'show'
        );

        settingsMenu.classList.add(
            'show'
        );

    }
);


/* =====================================================
   CAPTIONS
   ===================================================== */

captionSetting.addEventListener(
    'click',
    () => {

        settingsMenu.classList.remove(
            'show'
        );

        captionMenu.classList.add(
            'show'
        );

    }
);


document.querySelectorAll(
    '[data-caption]'
).forEach(
    button => {

        button.addEventListener(
            'click',
            () => {

                currentCaption =
                    button.dataset.caption ===
                    'on';

                captionValue.textContent =
                    currentCaption
                        ? 'Hindi ›'
                        : 'Off ›';

                [
                    ...video.textTracks
                ].forEach(
                    track => {

                        track.mode =
                            currentCaption
                                ? 'showing'
                                : 'hidden';

                    }
                );

                captionMenu.classList.remove(
                    'show'
                );

            }
        );

    }
);


document.getElementById(
    'captionBack'
).addEventListener(
    'click',
    () => {

        captionMenu.classList.remove(
            'show'
        );

        settingsMenu.classList.add(
            'show'
        );

    }
);


/* =====================================================
   CC BUTTON
   ===================================================== */

document.getElementById(
    'ccBtn'
).addEventListener(
    'click',
    event => {

        event.stopPropagation();

        currentCaption =
            !currentCaption;

        captionValue.textContent =
            currentCaption
                ? 'Hindi ›'
                : 'Off ›';

        [
            ...video.textTracks
        ].forEach(
            track => {

                track.mode =
                    currentCaption
                        ? 'showing'
                        : 'hidden';

            }
        );

        document.getElementById(
            'ccBtn'
        ).style.opacity =
            currentCaption
                ? '1'
                : '.7';

    }
);


/* =====================================================
   SHARE
   ===================================================== */

document.getElementById(
    'shareBtn'
).addEventListener(
    'click',
    async () => {

        const url =
            location.href;

        try {

            if (
                navigator.share
            ) {

                await navigator.share({

                    title:
                        currentVideo?.title ||
                        'UDAAN',

                    text:
                        'Watch this video on UDAAN 🚀',

                    url

                });

            } else {

                await navigator.clipboard
                    .writeText(url);

                alert(
                    'Video link copied!'
                );

            }

        } catch (error) {

            if (
                error.name !==
                'AbortError'
            ) {

                console.error(
                    error
                );

            }

        }

    }
);


/* =====================================================
   LIKE
   ===================================================== */

document.getElementById(
    'likeBtn'
).addEventListener(
    'click',
    async () => {

        if (!currentVideo) {
            return;
        }

        try {

            const response =
                await fetch(
                    `/api/videos/${
                        encodeURIComponent(
                            currentVideo.id
                        )
                    }/like`,
                    {
                        method: 'POST',

                        headers: {
                            'Content-Type':
                                'application/json'
                        },
                        body: JSON.stringify({
                            username:
                                JSON.parse(
                                    localStorage.getItem('udaan_user') || '{}'
                                ).username || ''
                        })
                    }
                );

            if (!response.ok) {
                return;
            }

            const result =
                await response.json();

            document.getElementById(
                'likeCount'
            ).textContent =
                result.likes ??
                currentVideo.likes ??
                0;

        } catch (error) {

            console.error(
                'Like error:',
                error
            );

        }

    }
);


/* =====================================================
   COMMENTS
   ===================================================== */

async function loadComments() {

    if (!currentVideo) {
        return;
    }

    const box =
        document.getElementById(
            'comments'
        );

    const comments =
        currentVideo.comments || [];

    if (!comments.length) {

        box.innerHTML =
            '<p>No comments yet.</p>';

        return;

    }

    box.innerHTML =
        comments.map(
            comment => `

            <div class="comment">

                <strong>👤 Creator</strong>

                <div>
                    ${escapeHtml(
                        comment.text || ''
                    )}
                </div>

            </div>

        `
        ).join('');

}


function escapeHtml(value) {

    return String(value)
        .replaceAll(
            '&',
            '&amp;'
        )
        .replaceAll(
            '<',
            '&lt;'
        )
        .replaceAll(
            '>',
            '&gt;'
        )
        .replaceAll(
            '"',
            '&quot;'
        )
        .replaceAll(
            "'",
            '&#039;'
        );

}


/* =====================================================
   RELATED VIDEOS
   ===================================================== */

function loadRelated(
    videos,
    currentId
) {

    const box =
        document.getElementById(
            'relatedVideos'
        );

    const related =
        videos
            .filter(
                item =>
                    String(item.id) !==
                    String(currentId) &&
                    item.isShort !== true
            )
            .slice()
            .reverse()
            .slice(0, 10);

    box.innerHTML =
        related.map(
            item => {

                const source =
                    getSource(item);

                return `

                <div
                    class="related-card"
                    data-id="${escapeHtml(
                        item.id
                    )}">

                    <video
                        src="${escapeHtml(
                            source
                        )}"
                        muted
                        preload="metadata">
                    </video>

                    <div>
                        ${escapeHtml(
                            item.title ||
                            'Untitled Video'
                        )}
                    </div>

                </div>

                `;

            }
        ).join('');


    box.querySelectorAll(
        '.related-card'
    ).forEach(
        card => {

            card.addEventListener(
                'click',
                () => {

                    location.href =
                        `/watch.html?video=${
                            encodeURIComponent(
                                card.dataset.id
                            )
                        }`;

                }
            );

        }
    );

}


/* =====================================================
   BACK
   ===================================================== */

document.getElementById(
    'backBtn'
).addEventListener(
    'click',
    () => {

        if (history.length > 1) {

            history.back();

        } else {

            location.href =
                '/home.html';

        }

    }
);


/* =====================================================
   OUTSIDE CLICK
   ===================================================== */

document.addEventListener(
    'click',
    event => {

        if (
            !event.target.closest(
                '.settings-menu'
            ) &&
            !event.target.closest(
                '.sub-menu'
            ) &&
            !event.target.closest(
                '#settingsBtn'
            )
        ) {

            closeAllMenus();

        }

    }
);


/* =====================================================
   START
   ===================================================== */

/* =====================================================
   WATCH PAGE SUBSCRIBE
===================================================== */

async function setupWatchSubscribe() {
    const button = document.getElementById('subscribeBtn');

    if (!button || !currentVideo?.username) return;

    let user = null;

    try {
        const savedUser = localStorage.getItem('udaan_user');
        user = savedUser ? JSON.parse(savedUser) : null;
    } catch (error) {
        console.error('Watch user parse error:', error);
    }

    const creator = String(currentVideo.username || '').trim();
    const subscriber = String(user?.username || '').trim();

    if (!subscriber) {
        button.textContent = 'Subscribe';
        button.dataset.subscribed = 'false';
        button.onclick = () => {
            alert('Please login to subscribe.');
            location.href = '/index.html';
        };
        return;
    }

    if (subscriber === creator) {
        button.textContent = 'Your Profile';
        button.disabled = true;
        return;
    }

    try {
        const response = await fetch(
            `/api/profile/${encodeURIComponent(creator)}/subscription-status?subscriber=${encodeURIComponent(subscriber)}`
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Subscription status failed');
        }

        const subscribed = result.subscribed === true;

        button.dataset.subscribed = subscribed ? 'true' : 'false';
        button.textContent = subscribed ? 'Subscribed ✓' : 'Subscribe';
    } catch (error) {
        console.error('Watch subscription status error:', error);
        button.dataset.subscribed = 'false';
        button.textContent = 'Subscribe';
    }

    button.onclick = async () => {
        const isSubscribed = button.dataset.subscribed === 'true';

        button.disabled = true;

        try {
            const endpoint = isSubscribed
                ? `/api/profile/${encodeURIComponent(creator)}/unsubscribe`
                : `/api/profile/${encodeURIComponent(creator)}/subscribe`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    subscriber
                })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Subscription failed');
            }

            const subscribed = result.subscribed === true;

            button.dataset.subscribed = subscribed ? 'true' : 'false';
            button.textContent = subscribed ? 'Subscribed ✓' : 'Subscribe';
        } catch (error) {
            console.error('Watch subscribe error:', error);
            alert(error.message || 'Unable to update subscription.');
        } finally {
            button.disabled = false;
        }
    };
}


loadVideo()
    .then(() => setupWatchSubscribe())
    .catch(error => {
        console.error('UDAAN watch startup error:', error);
    });
