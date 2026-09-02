const videosContainer = document.querySelector('.videos');

/* UDAAN VIDEO LAZY LOADING */
window.udaanVideoObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        const video = entry.target;

        if (video.dataset.loaded === "true") {
            observer.unobserve(video);
            return;
        }

        const source = video.dataset.src;

        if (source && !video.src) {
            video.src = source;
            video.preload = "metadata";
            video.load();
        }

        video.dataset.loaded = "true";
        observer.unobserve(video);
    });
}, {
    rootMargin: "100px 0px",
    threshold: 0.01
});

async function loadVideos() {
    try {
        const response = await fetch('/api/videos');
        let videos = await response.json();

        // Shorts ko Home feed se hide rakho
        videos = videos.filter(video => video.isShort !== true);

        if (!videosContainer) return;

        videosContainer.innerHTML = '';

        if (!videos.length) {
            videosContainer.innerHTML = `
                <div class="empty-feed">
                    <h3>🎬 No videos yet</h3>
                    <p>Be the first creator to upload a video!</p>
                </div>
            `;
            return;
        }

        videos.slice().reverse().forEach(video => {
            const article = document.createElement('article');
            article.className = 'video dynamic-video';
              article.dataset.videoId = String(video.id);

            article.innerHTML = `
                <div class="video-player-wrap">
                    <video
                        class="video-player"
                        controls
                        preload="none"
                        data-src="${video.qualities?.original || `/uploads/${encodeURIComponent(video.filename)}`}">
                    </video>
                </div>

                <div class="video-info">
                    <div
                        class="avatar creator-avatar"
                        data-username="${escapeHtml(video.username || '')}"
                        title="Open Creator Profile"
                    >
                        ${(video.username || video.title || 'U').charAt(0).toUpperCase()}
                    </div>

                    <div>
                        <div
                            class="creator-name"
                            data-username="${escapeHtml(video.username || '')}"
                        >
                            @${escapeHtml(video.username || 'creator')}
                        </div>

                        <h3>${escapeHtml(video.title || 'Untitled Video')}</h3>
                        <p>${escapeHtml(video.category || 'Creator')}</p>
                        <small>
                            ${video.views || 0} views
                        </small>

                        <div class="video-actions">

                            <button class="like-btn" data-id="${video.id}" title="Like">
                                ♡ <span>${video.likes || 0}</span>
                            </button>

                            <button class="home-comment-btn" data-id="${video.id}" title="Comments">
                                💬 <span>${(video.comments || []).length}</span>
                            </button>

                            <button class="home-share-btn" data-id="${video.id}" title="Share">
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M4 12h13"/>
                                    <path d="m13 6 6 6-6 6"/>
                                </svg>
                                <span>Share</span>
                            </button>

                        </div>

                        <div class="comments-box">
                            <div class="comments-list">
                                ${(video.comments || []).map(comment => `
                                    <div class="comment">
                                        <strong>👤 Creator</strong>
                                        <span>${escapeHtml(comment.text)}</span>
                                    </div>
                                `).join('')}
                            </div>

                            <div class="comment-form">
                                <input
                                    class="comment-input"
                                    type="text"
                                    placeholder="Write a comment..."
                                    maxlength="500"
                                >
                                <button class="comment-btn">Post</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            videosContainer.appendChild(article);


            const player = article.querySelector('.video-player');

            /* =========================================
               UDAAN CUSTOM HOME VIDEO CONTROLS
               Volume button intentionally omitted.
            ========================================= */
            const playerWrap = article.querySelector('.video-player-wrap');

            if (playerWrap && player) {
                player.controls = false;

                /* UDAAN STABLE VIDEO GATE */
                playerWrap.classList.remove('player-ready');

                const markPlayerReady = () => {
                    if (player.readyState >= 3) {
                        playerWrap.classList.add('player-ready');
                    }
                };

                player.addEventListener('canplay', markPlayerReady);
                player.addEventListener('playing', markPlayerReady);

                player.addEventListener('error', () => {
                    playerWrap.classList.remove('player-ready');
                });


                const controls = document.createElement('div');
                controls.className = 'udaan-player-controls';

                controls.innerHTML = `
                    <button class="udaan-play" title="Play/Pause">▶</button>
                    <button class="udaan-back" title="10 seconds back">↶10</button>
                    <button class="udaan-forward" title="10 seconds forward">10↷</button>
                    <span class="udaan-player-time">0:00 / 0:00</span>
                    <input class="udaan-progress" type="range" min="0" max="100" value="0">
                    <button class="udaan-speed" title="Playback speed">1x</button>
                    <button class="udaan-quality" title="Quality">⚙</button>
                    <button class="udaan-zoom" title="Zoom">🔍</button>
                    <button class="udaan-fullscreen" title="Fullscreen">⛶</button>
                `;

                playerWrap.appendChild(controls);

                const playBtn = controls.querySelector('.udaan-play');
                const backBtn = controls.querySelector('.udaan-back');
                const forwardBtn = controls.querySelector('.udaan-forward');
                const progressBar = controls.querySelector('.udaan-progress');
                const timeLabel = controls.querySelector('.udaan-player-time');
                const speedBtn = controls.querySelector('.udaan-speed');
                const qualityBtn = controls.querySelector('.udaan-quality');
                const zoomBtn = controls.querySelector('.udaan-zoom');
                const fullscreenBtn = controls.querySelector('.udaan-fullscreen');

                const formatPlayerTime = seconds => {
                    if (!Number.isFinite(seconds)) return '0:00';
                    const minutes = Math.floor(seconds / 60);
                    const secs = Math.floor(seconds % 60);
                    return `${minutes}:${String(secs).padStart(2, '0')}`;
                };

                playBtn.addEventListener('click', e => {
                    e.stopPropagation();
                    if (player.paused) {
                        player.play().catch(() => {});
                    } else {
                        player.pause();
                    }
                });

                player.addEventListener('play', () => {
                    playBtn.textContent = '❚❚';
                });

                player.addEventListener('pause', () => {
                    playBtn.textContent = '▶';
                });

                backBtn.addEventListener('click', e => {
                    e.stopPropagation();
                    player.currentTime = Math.max(0, player.currentTime - 10);
                });

                forwardBtn.addEventListener('click', e => {
                    e.stopPropagation();
                    if (Number.isFinite(player.duration)) {
                        player.currentTime =
                            Math.min(player.duration, player.currentTime + 10);
                    }
                });

                player.addEventListener('loadedmetadata', () => {
                    timeLabel.textContent =
                        `${formatPlayerTime(player.currentTime)} / ${formatPlayerTime(player.duration)}`;
                });

                player.addEventListener('timeupdate', () => {
                    if (Number.isFinite(player.duration) && player.duration > 0) {
                        progressBar.value =
                            (player.currentTime / player.duration) * 100;
                    }

                    timeLabel.textContent =
                        `${formatPlayerTime(player.currentTime)} / ${formatPlayerTime(player.duration)}`;
                });

                progressBar.addEventListener('input', e => {
                    e.stopPropagation();

                    if (Number.isFinite(player.duration)) {
                        player.currentTime =
                            (Number(progressBar.value) / 100) * player.duration;
                    }
                });

                speedBtn.addEventListener('click', e => {
                    e.stopPropagation();

                    const speeds = [1, 1.25, 1.5, 1.75, 2, 0.75, 0.5];
                    const currentIndex = speeds.indexOf(player.playbackRate);
                    const nextSpeed =
                        speeds[(currentIndex + 1) % speeds.length];

                    player.playbackRate = nextSpeed;
                    speedBtn.textContent = `${nextSpeed}x`;
                });

                qualityBtn.addEventListener('click', e => {
                    e.stopPropagation();

                    const qualities = video.qualities || {};
                    const available = Object.keys(qualities)
                        .filter(q => qualities[q]);

                    if (available.length <= 1) {
                        alert('Quality options will be available after video processing.');
                        return;
                    }

                    const choice = prompt(
                        'Select quality:\\n\\n' +
                        available.join('\\n')
                    );

                    if (!choice || !qualities[choice]) return;

                    const currentTime = player.currentTime;
                    const wasPlaying = !player.paused;

                    player.src = qualities[choice];
                    player.load();

                    player.addEventListener('loadedmetadata', () => {
                        player.currentTime =
                            Math.min(currentTime, player.duration || currentTime);

                        if (wasPlaying) {
                            player.play().catch(() => {});
                        }
                    }, { once: true });
                });

                zoomBtn.addEventListener('click', e => {
                    e.stopPropagation();

                    player.classList.toggle('udaan-zoomed');

                    zoomBtn.textContent =
                        player.classList.contains('udaan-zoomed')
                            ? '🔎'
                            : '🔍';
                });

                fullscreenBtn.addEventListener('click', async e => {
                    e.stopPropagation();

                    try {
                        if (!document.fullscreenElement) {
                            if (playerWrap.requestFullscreen) {
                                await playerWrap.requestFullscreen();
                            } else if (player.webkitEnterFullscreen) {
                                player.webkitEnterFullscreen();
                            }
                        } else {
                            await document.exitFullscreen();
                        }
                    } catch (error) {
                        console.error('Fullscreen error:', error);
                    }
                });
            }

            if (window.udaanVideoObserver) {
                const lazyVideo = article.querySelector(".video-player");
                if (lazyVideo) {
                    window.udaanVideoObserver.observe(lazyVideo);
                }
            }

            article.querySelectorAll('[data-username]').forEach(element => {
                element.addEventListener('click', () => {
                    const username = element.dataset.username;

                    if (username) {
                        window.location.href =
                            `/profile.html?username=${encodeURIComponent(username)}`;
                    }
                });
            });

            const likeBtn = article.querySelector('.like-btn');

            const commentInput = article.querySelector('.comment-input');
            const commentBtn = article.querySelector('.comment-btn');
            const commentsList = article.querySelector('.comments-list');
            const commentCount = article.querySelector('.comment-count');

            commentBtn.addEventListener('click', async () => {
                const comment = commentInput.value.trim();

                if (!comment) return;

                try {
                    const response = await fetch(
                        `/api/videos/${encodeURIComponent(video.id)}/comment`,
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                                  'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                            },
                            body: JSON.stringify({
                                comment: comment,
                                username: (() => {
                                    try {
                                        return JSON.parse(
                                            localStorage.getItem('udaan_user') || '{}'
                                        ).username || '';
                                    } catch {
                                        return '';
                                    }
                                })()
                            })
                        }
                    );

                    const result = await response.json();

                    if (!response.ok) {
                        throw new Error(result.message || 'Comment failed');
                    }

                    const item = document.createElement('div');
                    item.className = 'comment';

                    const strong = document.createElement('strong');
                    strong.textContent = '👤 Creator';

                    const span = document.createElement('span');
                    span.textContent = result.comment.text;

                    item.appendChild(strong);
                    item.appendChild(span);

                    commentsList.appendChild(item);

                    commentInput.value = '';
        commentCount.textContent = 'Comments: ' + result.totalComments;

                } catch (error) {
                    console.error('Comment error:', error);
                    alert(error.message);
                }
            });

            likeBtn.addEventListener('click', async () => {
                try {
                    const response = await fetch(
                        `/api/videos/${encodeURIComponent(video.id)}/like`,
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                username: (() => {
                                    try {
                                        return JSON.parse(
                                            localStorage.getItem('udaan_user') || '{}'
                                        ).username || '';
                                    } catch {
                                        return '';
                                    }
                                })()
                            })
                        }
                    );

                    const result = await response.json();

                    if (response.ok) {
                        likeBtn.querySelector('span').textContent = result.likes;
                        likeBtn.disabled = true;
                        likeBtn.style.opacity = '0.6';
                    }
                } catch (error) {
                    console.error('Like error:', error);
                }
            });

            const qualitySelect = article.querySelector('.quality-select');

            if (qualitySelect && video.qualities) {
                qualitySelect.addEventListener('change', () => {
                    const selectedQuality = qualitySelect.value;

                    let newSource = video.qualities.original;

                    if (selectedQuality === 'auto') {
                        const connection =
                            navigator.connection ||
                            navigator.mozConnection ||
                            navigator.webkitConnection;

                        const effectiveType =
                            connection?.effectiveType || '4g';

                        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
                            newSource =
                                video.qualities['360p'] ||
                                video.qualities['480p'] ||
                                video.qualities.original;
                        } else if (effectiveType === '3g') {
                            newSource =
                                video.qualities['480p'] ||
                                video.qualities['360p'] ||
                                video.qualities.original;
                        } else {
                            newSource =
                                video.qualities['720p'] ||
                                video.qualities['480p'] ||
                                video.qualities.original;
                        }
                    } else if (video.qualities[selectedQuality]) {
                        newSource = video.qualities[selectedQuality];
                    }

                    const currentTime = player.currentTime;
                    const wasPlaying = !player.paused;

                    player.src = newSource;
                    player.load();

                    player.addEventListener('loadedmetadata', () => {
                        if (currentTime < player.duration) {
                            player.currentTime = currentTime;
                        }

                        if (wasPlaying) {
                            player.play().catch(() => {});
                        }
                    }, { once: true });
                });
            }

            let counted = false;
            let lastWatchSent = 0;

            player.addEventListener('timeupdate', async () => {

                /*
                 * Count one view after 2 seconds.
                 */
                if (!counted && player.currentTime >= 2) {
                    try {
                        const response = await fetch(
                            `/api/videos/${encodeURIComponent(video.id)}/view`,
                            { method: 'POST' }
                        );

                        if (response.ok) {
                            counted = true;
                            console.log('View counted:', video.id);
                        }
                    } catch (error) {
                        console.error('View count error:', error);
                    }
                }

                /*
                 * Watch-time tracking.
                 * Send at most once every 10 seconds.
                 */
                const savedUser =
                    localStorage.getItem('udaan_user');

                if (!savedUser) return;

                let currentUser;

                try {
                    currentUser = JSON.parse(savedUser);
                } catch (error) {
                    return;
                }

                if (!currentUser?.username) return;

                const currentSecond =
                    Math.floor(player.currentTime);

                if (
                    currentSecond >= 10 &&
                    currentSecond - lastWatchSent >= 10
                ) {
                    const watchedSeconds =
                        currentSecond - lastWatchSent;

                    lastWatchSent = currentSecond;

                    try {
                        const response = await fetch(
                            `/api/videos/${encodeURIComponent(video.id)}/watch`,
                            {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                                },
                                body: JSON.stringify({

                                    seconds: Math.min(watchedSeconds, 30)
                                })
                            }
                        );

                        if (response.ok) {
                            const result =
                                await response.json();

                            console.log(
                                'Watch time updated:',
                                result
                            );
                        }
                    } catch (error) {
                        console.error(
                            'Watch tracking error:',
                            error
                        );
                    }
                }
            });
        });

    } catch (error) {
        console.error('Video feed error:', error);

        if (videosContainer) {
            videosContainer.innerHTML = `
                <div class="empty-feed">
                    <h3>⚠️ Unable to load videos</h3>
                    <p>Please try again.</p>
                </div>
            `;
        }
    }
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

document.getElementById('profileBtn')?.addEventListener('click', () => {
    window.location.href = '/profile.html';
});

document.getElementById('bottomProfile')?.addEventListener('click', () => {
    window.location.href = '/profile.html';
});

document.getElementById('createBtn')?.addEventListener('click', () => {
    window.location.href = '/create.html';
});

document.getElementById('shortsBtn')?.addEventListener('click', () => {
    window.location.href = '/shorts.html';
});


// CREATOR PROFILE NAVIGATION
document.addEventListener('click', (event) => {
    const creator = event.target.closest('.creator-name, .creator-avatar');

    if (!creator) return;

    const username =
        creator.dataset.username ||
        creator.closest('.video-info')?.querySelector('.creator-name')?.dataset.username;

    if (!username) return;

    window.location.href =
        '/profile.html?username=' + encodeURIComponent(username);
});


// HOME VIDEO SHARE
document.addEventListener('click', async (event) => {
    const button = event.target.closest('.home-share-btn');

    if (!button) return;

    event.stopPropagation();

    const id = button.dataset.id;

    if (!id) return;

    const shareUrl =
        `${window.location.origin}/home.html?video=${encodeURIComponent(id)}`;

    try {
        if (navigator.share) {
            await navigator.share({
                title: 'Watch this video on UdaanTV',
                text: 'Watch this video on UdaanTV 🚀',
                url: shareUrl
            });
        } else if (navigator.clipboard) {
            await navigator.clipboard.writeText(shareUrl);
            alert('Video link copied!');
        } else {
            window.prompt('Copy this video link:', shareUrl);
        }
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Home share error:', error);
        }
    }
});


document.getElementById('followingBtn')?.addEventListener('click', () => {
    window.location.href = '/following.html';
});


/* WATCH PAGE NAVIGATION */
document.addEventListener('click', event => {
    const videoElement = event.target.closest('.video-player');

    if (!videoElement) return;

    const article = videoElement.closest('.video');

    if (!article) return;

    const videoId =
        article.dataset.videoId ||
        article.querySelector('[data-id]')?.dataset.id;

    if (!videoId) return;

    window.location.href =
        `/watch.html?video=${encodeURIComponent(videoId)}`;
});

loadVideos();


/* CREATOR SEARCH */

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');

async function searchCreators() {
    const query = searchInput?.value.trim().toLowerCase();

    if (!query) {
        loadVideos();
        return;
    }

    try {
        const response = await fetch('/api/users');
        const users = await response.json();

        const results = users.filter(user =>
            String(user.username || '').toLowerCase().includes(query) ||
            String(user.name || '').toLowerCase().includes(query)
        );

        if (!videosContainer) return;

        videosContainer.innerHTML = '';

        if (!results.length) {
            videosContainer.innerHTML = `
                <div class="empty-feed">
                    <h3>🔎 Creator not found</h3>
                    <p>Try another name or username.</p>
                </div>
            `;
            return;
        }

        results.forEach(user => {
            const card = document.createElement('div');
            card.className = 'creator search-result';

            const initial =
                (user.name || user.username || 'U')
                .charAt(0)
                .toUpperCase();

            card.innerHTML = `
                <div class="creator-avatar">${initial}</div>
                <h3>${escapeHtml(user.name || user.username)}</h3>
                <p>@${escapeHtml(user.username)}</p>
                <button>View Profile</button>
            `;

            card.querySelector('button').addEventListener('click', () => {
                window.location.href =
                    `/profile.html?username=${encodeURIComponent(user.username)}`;
            });

            videosContainer.appendChild(card);
        });

    } catch (error) {
        console.error('Creator search error:', error);

        if (videosContainer) {
            videosContainer.innerHTML = `
                <div class="empty-feed">
                    <h3>⚠️ Search failed</h3>
                    <p>Please try again.</p>
                </div>
            `;
        }
    }
}

searchBtn?.addEventListener('click', searchCreators);

searchInput?.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
        searchCreators();
    }
});


/* LIVE CREATOR SUGGESTIONS */

let creatorCache = [];

async function loadCreatorSuggestions() {
    try {
        const response = await fetch('/api/users');
        if (response.ok) creatorCache = await response.json();
    } catch (error) {
        console.error('Suggestions error:', error);
    }
}

searchInput?.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();

    if (!query) {
        loadVideos();
        return;
    }

    const results = creatorCache.filter(user =>
        String(user.username || '').toLowerCase().includes(query) ||
        String(user.name || '').toLowerCase().includes(query)
    );

    let box = document.getElementById('creatorSuggestions');

    if (!box) {
        box = document.createElement('div');
        box.id = 'creatorSuggestions';
        box.className = 'creator-suggestions';
        searchInput.parentElement.appendChild(box);
    }

    box.innerHTML = '';

    results.slice(0, 5).forEach(user => {
        const item = document.createElement('div');

        item.className = 'creator-suggestion';

        item.innerHTML = `
            <strong>${escapeHtml(user.name || user.username)}</strong>
            <span>@${escapeHtml(user.username)}</span>
        `;

        item.addEventListener('click', () => {
            window.location.href =
                `/profile.html?username=${encodeURIComponent(user.username)}`;
        });

        box.appendChild(item);
    });
});



/* NOTIFICATION PANEL */

const notificationBtn =
    document.getElementById('notificationBtn');

const notificationPanel =
    document.getElementById('notificationPanel');

const notificationList =
    document.getElementById('notificationList');

const closeNotifications =
    document.getElementById('closeNotifications');

const markAllNotificationsRead =
    document.getElementById('markAllNotificationsRead');

const notificationUnreadText =
    document.getElementById('notificationUnreadText');

let notificationData = [];


function updateNotificationBadge(notifications) {

    const unreadCount =
        notifications.filter(n => !n.read).length;

    let badge =
        document.getElementById('notificationBadge');

    if (!badge) {

        badge = document.createElement('span');

        badge.id = 'notificationBadge';

        Object.assign(badge.style, {
            position: 'absolute',
            top: '-5px',
            right: '-5px',
            minWidth: '18px',
            height: '18px',
            padding: '0 4px',
            borderRadius: '10px',
            background: '#ff3040',
            color: '#fff',
            fontSize: '10px',
            fontWeight: '700',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #fff',
            zIndex: '20'
        });

        notificationBtn.style.position = 'relative';
        notificationBtn.appendChild(badge);
    }

    if (unreadCount > 0) {

        badge.textContent =
            unreadCount > 99 ? '99+' : unreadCount;

        badge.style.display = 'flex';

        if (notificationUnreadText) {
            notificationUnreadText.textContent =
                `${unreadCount} unread`;
        }

    } else {

        badge.style.display = 'none';

        if (notificationUnreadText) {
            notificationUnreadText.textContent =
                'No new notifications';
        }
    }
}


function notificationIcon(notification) {

    if (notification.type === 'subscribe') {
        return '👤';
    }

    if (notification.type === 'like') {
        return '❤️';
    }

    if (notification.type === 'comment') {
        return '💬';
    }

    return '🔔';
}


function renderNotifications() {

    updateNotificationBadge(notificationData);

    if (!notificationData.length) {

        notificationList.innerHTML = `
            <div class="notification-empty">
                <div>🔔</div>
                <strong>No notifications yet</strong>
                <span>Your creator activity will appear here.</span>
            </div>
        `;

        return;
    }

    notificationList.innerHTML =
        notificationData.map(notification => {

            const unread =
                !notification.read;

            const unreadClass =
                unread ? ' unread' : '';

            const icon =
                notificationIcon(notification);

            let time = '';

            try {
                time = new Date(
                    notification.created_at
                ).toLocaleString();
            } catch (_) {
                time = '';
            }

            return `
                <div
                    class="notification-item${unreadClass}"
                    data-notification-id="${escapeHtml(notification.id)}"
                >

                    <div class="notification-icon">
                        ${icon}
                    </div>

                    <div class="notification-content">

                        <strong>
                            ${escapeHtml(notification.message)}
                        </strong>

                        <small>
                            ${escapeHtml(time)}
                        </small>

                    </div>

                    ${unread
                        ? '<span class="notification-dot"></span>'
                        : ''
                    }

                </div>
            `;

        }).join('');


    notificationList
        .querySelectorAll('.notification-item')
        .forEach(item => {

            item.addEventListener('click', async () => {

                const notificationId =
                    item.dataset.notificationId;

                const savedUser =
                    localStorage.getItem('udaan_user');

                if (!savedUser) return;

                let user;

                try {
                    user = JSON.parse(savedUser);
                } catch {
                    return;
                }

                try {

                    await fetch(
                        `/api/notifications/${encodeURIComponent(user.username)}/${encodeURIComponent(notificationId)}/read`,
                        {
                            method: 'POST'
                        }
                    );

                    const notification =
                        notificationData.find(
                            n =>
                                String(n.id) ===
                                String(notificationId)
                        );

                    if (notification) {
                        notification.read = true;
                    }

                    renderNotifications();

                } catch (error) {

                    console.error(
                        'Notification read error:',
                        error
                    );
                }
            });
        });
}


async function loadNotifications() {

    const savedUser =
        localStorage.getItem('udaan_user');

    if (!savedUser) {

        notificationData = [];

        notificationList.innerHTML = `
            <div class="notification-empty">
                <div>🔐</div>
                <strong>Please login first</strong>
            </div>
        `;

        updateNotificationBadge([]);

        return;
    }

    try {

        const user =
            JSON.parse(savedUser);

        const response = await fetch(
            `/api/notifications/${encodeURIComponent(user.username)}`
        );

        if (!response.ok) {
            throw new Error(
                'Unable to load notifications'
            );
        }

        notificationData =
            await response.json();

        renderNotifications();

    } catch (error) {

        console.error(
            'Notification loading error:',
            error
        );

        notificationList.innerHTML = `
            <div class="notification-empty">
                <div>⚠️</div>
                <strong>Unable to load notifications</strong>
            </div>
        `;
    }
}


async function markAllNotificationsAsRead() {

    const savedUser =
        localStorage.getItem('udaan_user');

    if (!savedUser) return;

    let user;

    try {
        user = JSON.parse(savedUser);
    } catch {
        return;
    }

    const unread =
        notificationData.filter(
            notification => !notification.read
        );

    if (!unread.length) return;

    markAllNotificationsRead.disabled = true;
    markAllNotificationsRead.textContent = 'Please wait...';

    try {

        await Promise.all(
            unread.map(notification =>
                fetch(
                    `/api/notifications/${encodeURIComponent(user.username)}/${encodeURIComponent(notification.id)}/read`,
                    {
                        method: 'POST'
                    }
                )
            )
        );

        notificationData =
            notificationData.map(notification => ({
                ...notification,
                read: true
            }));

        renderNotifications();

    } catch (error) {

        console.error(
            'Mark all notifications error:',
            error
        );

    } finally {

        markAllNotificationsRead.disabled = false;
        markAllNotificationsRead.textContent =
            'Mark all read';
    }
}


notificationBtn?.addEventListener(
    'click',
    async event => {

        event.stopPropagation();

        notificationPanel.classList.toggle('show');

        if (
            notificationPanel.classList.contains('show')
        ) {
            await loadNotifications();
        }
    }
);


closeNotifications?.addEventListener(
    'click',
    event => {

        event.stopPropagation();

        notificationPanel.classList.remove('show');
    }
);


markAllNotificationsRead?.addEventListener(
    'click',
    event => {

        event.stopPropagation();

        markAllNotificationsAsRead();
    }
);


notificationPanel?.addEventListener(
    'click',
    event => {
        event.stopPropagation();
    }
);


document.addEventListener(
    'click',
    () => {

        notificationPanel?.classList.remove('show');
    }
);

/* UDAAN WATCH PAGE NAVIGATION - FINAL */

document.addEventListener("click", (event) => {

    const article = event.target.closest(".dynamic-video");

    if (!article) return;

    /* Controls par click hone par Watch Page mat kholo */
    if (
        event.target.closest(
            "button, input, select, textarea, a, .quality-control, .comments-box"
        )
    ) {
        return;
    }

    /* Video player ke controls ko disturb mat karo */
    if (event.target.closest("video")) {
        return;
    }

    /* Video ID kisi bhi existing data-id button se nikalo */
    const idElement = article.querySelector("[data-id]");

    const videoId = idElement?.dataset?.id;

    if (!videoId) {
        console.error("Watch navigation: video ID missing");
        return;
    }

    window.location.href =
        "/watch.html?video=" +
        encodeURIComponent(videoId);
});


/* Har dynamic video card mein clear WATCH button */
function addWatchButtons() {

    document.querySelectorAll(".dynamic-video").forEach(article => {

        if (article.querySelector(".watch-now-btn")) {
            return;
        }

        const idElement = article.querySelector("[data-id]");

        if (!idElement?.dataset?.id) {
            return;
        }

        const videoId = idElement.dataset.id;

        const button = document.createElement("button");

        button.type = "button";
        button.className = "watch-now-btn";
        button.textContent = "▶ Watch";

        button.addEventListener("click", (event) => {

            event.stopPropagation();

            window.location.href =
                "/watch.html?video=" +
                encodeURIComponent(videoId);
        });

        const info = article.querySelector(".video-info");

        if (info) {
            info.appendChild(button);
        }
    });
}


/* Dynamic videos load hone ke baad button add karo */
const watchButtonObserver = new MutationObserver(() => {
    addWatchButtons();
});

if (videosContainer) {

    watchButtonObserver.observe(videosContainer, {
        childList: true,
        subtree: true
    });

    addWatchButtons();
}


/* =========================================
   UDAAN STICKY PLAYING VIDEO
   Currently playing video stays stable
   while feed scrolls.
========================================= */

document.addEventListener("play", (event) => {

    const video = event.target;

    if (!video.matches(".video-player")) {
        return;
    }

    /* Pehle sab playing video ko normal karo */
    document
        .querySelectorAll(".video-player-wrap.is-playing")
        .forEach(wrap => {
            wrap.classList.remove("is-playing");
        });

    /* Sirf current video sticky rahe */
    const wrap = video.closest(".video-player-wrap");

    if (wrap) {
        wrap.classList.add("is-playing");
    }

}, true);


document.addEventListener("pause", (event) => {

    const video = event.target;

    if (!video.matches(".video-player")) {
        return;
    }

    const wrap = video.closest(".video-player-wrap");

    if (wrap) {
        wrap.classList.remove("is-playing");
    }

}, true);


/* Video end hone par normal position */
document.addEventListener("ended", (event) => {

    const video = event.target;

    if (!video.matches(".video-player")) {
        return;
    }

    const wrap = video.closest(".video-player-wrap");

    if (wrap) {
        wrap.classList.remove("is-playing");
    }

}, true);

