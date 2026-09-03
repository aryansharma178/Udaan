const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');

const router = express.Router();

const {
    addNotification
} = require('../notificationsStore');
const { requireAuth } = require('../middleware/auth');

const uploadDir = path.join(__dirname, '../uploads');

// FAST VIDEO DATA CACHE
let videosCache = null;

function getVideos() {
    if (videosCache !== null) {
        return videosCache;
    }

    const dataFile = path.join(__dirname, '../videos.json');

    if (!fs.existsSync(dataFile)) {
        videosCache = [];
        return videosCache;
    }

    try {
        videosCache = JSON.parse(
            fs.readFileSync(dataFile, 'utf8')
        );
    } catch (error) {
        console.error('videos.json cache read error:', error);
        videosCache = [];
    }

    return videosCache;
}

function saveVideos(videos) {
    videosCache = videos;
    const dataFile = path.join(__dirname, '../videos.json');

    fs.writeFileSync(
        dataFile,
        JSON.stringify(videos, null, 2)
    );
}


if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },

    filename: (req, file, cb) => {
        const uniqueName =
            Date.now() + '-' +
            Math.round(Math.random() * 1E9) +
            path.extname(file.originalname);

        cb(null, uniqueName);
    }
});


const QUALITY_SETTINGS = {
    "360p": 360,
    "480p": 480,
    "720p": 720,
    "1080p": 1080
};

function convertVideo(inputPath, outputPath, height) {
    return new Promise((resolve, reject) => {

        execFile("ffmpeg", [
            "-y",
            "-i", inputPath,
            "-vf", `scale=-2:${height}`,
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "23",
            "-c:a", "aac",
            "-b:a", "128k",
            "-movflags", "+faststart",
            outputPath
        ], (error, stdout, stderr) => {

            if (error) {
                console.error(
                    `FFmpeg ${height}p error:`,
                    stderr
                );
                reject(error);
                return;
            }

            resolve();
        });
    });
}

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 500 * 1024 * 1024
    }
});

router.post('/upload', requireAuth, upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Video file is required'
            });
        }

        const videoId = Date.now().toString();
        const baseName = path.parse(req.file.filename).name;

        const video = {
            id: videoId,
            username: req.user.username,
            title: req.body.title || '',
            description: req.body.description || '',
            category: req.body.category || '',
            isShort: String(req.body.isShort || 'false') === 'true',
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            uploadedAt: new Date().toISOString(),
            views: 0,
            watchMinutes: 0,
            tokens: 0,

            // Content moderation pipeline
            moderationStatus: 'pending_moderation',
            moderationResult: null,
            moderationReason: null,
            moderatedAt: null,

            // Country/data residency metadata
            uploaderCountry: req.user.country || '',
            dataRegion: req.user.dataRegion || 'GLOBAL',

            qualities: {
                original: `/uploads/${req.file.filename}`
            }
        };

        // Fast upload mode:
        // Save original video immediately.
        // Quality conversion is temporarily disabled for reliable
        // uploads on the Render Free instance.

        console.log(
            'Video uploaded successfully:',
            req.file.filename
        );

        const dataFile = path.join(__dirname, '../videos.json');

        let videos = [];

        if (fs.existsSync(dataFile)) {
            try {
                videos = JSON.parse(
                    fs.readFileSync(dataFile, 'utf8')
                );
            } catch (jsonError) {
                console.error('videos.json read error:', jsonError);
                videos = [];
            }
        }

        videos.push(video);

        saveVideos(videos);

        console.log(
            'Video saved with qualities:',
            video.qualities
        );

        res.json({
            success: true,
            message: 'Video uploaded and sent for moderation 🚀',
            video: video
        });

    } catch (error) {
        console.error('Video upload failed:', error);

        if (req.file && fs.existsSync(req.file.path)) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (cleanupError) {
                console.error(
                    'Original file cleanup failed:',
                    cleanupError.message
                );
            }
        }

        res.status(500).json({
            success: false,
            message: 'Video upload failed'
        });
    }
});

router.post('/:id/view', (req, res) => {
    try {
        const dataFile = path.join(__dirname, '../videos.json');

        if (!fs.existsSync(dataFile)) {
            return res.status(404).json({
                success: false,
                message: 'Video not found'
            });
        }

        const videos = getVideos();

        const video = videos.find(v => v.id === req.params.id);

        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'Video not found'
            });
        }

        video.views = (video.views || 0) + 1;

        saveVideos(videos);

        res.json({
            success: true,
            views: video.views
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: 'View update failed'
        });
    }
});


router.post('/:id/watch', requireAuth, (req, res) => {
    try {
        const dataFile = path.join(__dirname, '../videos.json');

        if (!fs.existsSync(dataFile)) {
            return res.status(404).json({
                success: false,
                message: 'Video not found'
            });
        }

        const videos = getVideos();
        const video = videos.find(v => v.id === req.params.id);

        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'Video not found'
            });
        }

        const username = String(req.user.username || '').trim();

        const seconds = Math.min(
            Math.max(Number(req.body.seconds) || 0, 0),
            30
        );

        if (!username || seconds <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Watch time required'
            });
        }

        // Creator cannot generate monetized watch time on own video.
        if (String(video.username || '').trim() === username) {
            return res.json({
                success: true,
                watchSeconds: video.watchSeconds || 0,
                watchMinutes: video.watchMinutes || 0,
                earnings: Number(video.earnings || 0)
            });
        }

        video.watchSeconds = (video.watchSeconds || 0) + seconds;
        video.watchMinutes = Math.floor(video.watchSeconds / 60);

        const viewRate = Number(
            process.env.UDAAN_EARNING_PER_1000_VIEWS || 1
        );

        const minuteRate = Number(
            process.env.UDAAN_EARNING_PER_1000_WATCH_MINUTES || 2
        );

        const viewEarning =
            ((video.views || 0) / 1000) * viewRate;

        const watchEarning =
            ((video.watchMinutes || 0) / 1000) * minuteRate;

        video.earnings = Number(
            (viewEarning + watchEarning).toFixed(4)
        );

        saveVideos(videos);

        res.json({
            success: true,
            watchSeconds: video.watchSeconds,
            watchMinutes: video.watchMinutes,
            earnings: video.earnings
        });

    } catch (error) {
        console.error('Watch tracking error:', error);

        res.status(500).json({
            success: false,
            message: 'Watch tracking failed'
        });
    }
});

router.post('/:id/like', (req, res) => {
    try {
        const videos = getVideos();

        const video = videos.find(v => v.id === req.params.id);

        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'Video not found'
            });
        }

        const username = String(req.body.username || '').trim();

        if (!username) {
            return res.status(400).json({
                success: false,
                message: 'Username is required'
            });
        }

        if (!Array.isArray(video.likedBy)) {
            video.likedBy = [];
        }

        const existingIndex = video.likedBy.findIndex(
            user => String(user) === username
        );

        let liked;

        if (existingIndex === -1) {
            video.likedBy.push(username);
            liked = true;

            const creator = String(video.username || '').trim();

            if (creator && creator !== username) {
                addNotification({
                    id: Date.now(),
                    recipient: creator,
                    type: 'like',
                    from: username,
                    videoId: video.id,
                    message: `${username} liked your video`,
                    read: false,
                    created_at: new Date().toISOString()
                });
            }

        } else {
            video.likedBy.splice(existingIndex, 1);
            liked = false;
        }

        video.likes = video.likedBy.length;

        saveVideos(videos);

        res.json({
            success: true,
            liked,
            likes: video.likes
        });

    } catch (error) {
        console.error('Like toggle error:', error);

        res.status(500).json({
            success: false,
            message: 'Like update failed'
        });
    }
});

router.post('/:id/comment', (req, res) => {
    try {
        const dataFile = path.join(__dirname, '../videos.json');

        if (!fs.existsSync(dataFile)) {
            return res.status(404).json({
                success: false,
                message: 'Video not found'
            });
        }

        const videos = getVideos();

        const video = videos.find(v => v.id === req.params.id);

        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'Video not found'
            });
        }

        const comment = String(req.body.comment || '').trim();
        const commenter = String(req.body.username || '').trim();

        if (!comment) {
            return res.status(400).json({
                success: false,
                message: 'Comment is required'
            });
        }

        if (!video.comments) {
            video.comments = [];
        }

        const newComment = {
            id: Date.now().toString(),
            text: comment,
            createdAt: new Date().toISOString()
        };

        video.comments.push(newComment);

        saveVideos(videos);

        // COMMENT NOTIFICATION
        const creator = String(video.username || '').trim();

        if (commenter && creator && commenter !== creator) {
            addNotification({
                id: Date.now(),
                recipient: creator,
                type: 'comment',
                from: commenter,
                videoId: video.id,
                message: `${commenter} commented on your video`,
                read: false,
                created_at: new Date().toISOString()
            });
        }

        res.json({
            success: true,
            comment: newComment,
            totalComments: video.comments.length
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Comment failed'
        });
    }
});

router.get('/', (req, res) => {
    try {
        const videos = getVideos();
        res.json(videos);
    } catch (error) {
        console.error('Videos API error:', error);
        res.status(500).json({
            success: false,
            message: 'Unable to load videos'
        });
    }
});

module.exports = router;
