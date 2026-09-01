const fs = require('fs');
const path = require('path');
const express = require('express');
const { requireAuth } = require('./middleware/auth');
const multer = require('multer');
const { signup, login } = require('./auth');
const {
    getNotifications,
    saveNotifications
} = require('./notificationsStore');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use('/api/videos', require('./routes/videos'));
app.use('/uploads', express.static('uploads'));
app.use('/profile-uploads', express.static('profile-uploads'));
app.use(express.static('public'));

const profileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'profile-uploads');
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    }
});

const profileUpload = multer({
    storage: profileStorage,
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPG, PNG and WEBP images are allowed'));
        }
    }
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/home.html');
});

app.post('/api/signup', async (req, res) => {
    try {
        const { name, username, password } = req.body;

        if (!name || !username || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, username aur password required hai"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password kam se kam 6 characters ka hona chahiye"
            });
        }

        const user = await signup(name, username, password);

        res.status(201).json({
            success: true,
            message: "UDAAN account successfully created 🚀",
            user
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Username aur password required hai"
            });
        }

        const result = await login(username, password);

        res.json({
            success: true,
            message: "Login successful 🚀",
            ...result
        });

    } catch (error) {
        res.status(401).json({
            success: false,
            message: error.message
        });
    }
});


app.get('/api/me', requireAuth, (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});

app.get('/api/users', (req, res) => {
    try {
        if (!fs.existsSync('./users.json')) {
            return res.json([]);
        }

        const users = JSON.parse(fs.readFileSync('./users.json', 'utf8'));

        const safeUsers = users.map(user => ({
            id: user.id,
            name: user.name,
            username: user.username,
            subscribers: user.subscribers || 0
        }));

        res.json(safeUsers);

    } catch (error) {
        console.error('Users API error:', error);
        res.status(500).json({
            success: false,
            message: 'Unable to load creators'
        });
    }
});



// Mark one notification as read
app.post('/api/notifications/:username/:id/read', (req, res) => {
    try {
        const username = String(req.params.username || '').trim();
        const id = String(req.params.id || '').trim();
        const file = './notifications.json';

        if (!username || !id) {
            return res.status(400).json({
                success: false,
                message: 'Username and notification id required'
            });
        }

        const notifications = getNotifications();

        const notification = notifications.find(
            n =>
                String(n.id) === id &&
                n.recipient === username
        );

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        notification.read = true;

        saveNotifications(notifications);

        res.json({
            success: true,
            notification
        });

    } catch (error) {
        console.error('Notification read error:', error);

        res.status(500).json({
            success: false,
            message: 'Unable to mark notification as read'
        });
    }
});

app.get('/api/notifications/:username', (req, res) => {
    try {
        const username = String(req.params.username || '').trim();
        const file = './notifications.json';

        const notifications = getNotifications();

        const result = notifications
            .filter(n => n.recipient === username)
            .reverse();

        res.json(result);

    } catch (error) {
        console.error('Notifications API error:', error);
        res.status(500).json({
            success: false,
            message: 'Unable to load notifications'
        });
    }
});

app.get('/api/profile/:username', (req, res) => {
    try {
        const fs = require('fs');

        if (!fs.existsSync('./users.json')) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const users = JSON.parse(fs.readFileSync('./users.json', 'utf8'));

        const user = users.find(
            u => u.username === req.params.username
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const videosFile = './videos.json';
        let videos = [];

        if (fs.existsSync(videosFile)) {
            videos = JSON.parse(
                fs.readFileSync(videosFile, 'utf8')
            );
        }

        const userVideos = videos.filter(
            video => video.username === user.username
        );

        const totalViews = userVideos.reduce(
            (sum, video) => sum + (video.views || 0),
            0
        );

        const totalLikes = userVideos.reduce(
            (sum, video) => sum + (video.likes || 0),
            0
        );

        res.json({
            success: true,
            profile: {
                id: user.id,
                name: user.name,
                username: user.username,
                profile_photo: user.profile_photo || null,
                avatar: user.avatar || null,
                subscribers: user.subscribers || 0,
                watch_minutes: user.watch_minutes || 0,
                tokens: user.tokens || 0,
                videos: userVideos.length,
                totalViews,
                totalLikes,
                created_at: user.created_at
            }
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Profile loading failed'
        });
    }
});


// GET FOLLOWING LIST
app.get('/api/following/:username', (req, res) => {
    try {
        const fs = require('fs');

        const username = String(req.params.username || '').trim();
        const subscriptionsFile = './subscriptions.json';
        const usersFile = './users.json';

        if (!username) {
            return res.status(400).json({
                success: false,
                message: 'Username required'
            });
        }

        const subscriptions = fs.existsSync(subscriptionsFile)
            ? JSON.parse(fs.readFileSync(subscriptionsFile, 'utf8'))
            : [];

        const users = fs.existsSync(usersFile)
            ? JSON.parse(fs.readFileSync(usersFile, 'utf8'))
            : [];

        const following = subscriptions
            .filter(s => s.subscriber === username)
            .map(s => {
                const creator = users.find(
                    u => u.username === s.creator
                );

                return {
                    username: s.creator,
                    name: creator?.name || s.creator,
                    avatar: creator?.avatar || null,
                    profile_photo: creator?.profile_photo || null,
                    subscribers: creator?.subscribers || 0
                };
            });

        res.json({
            success: true,
            following
        });

    } catch (error) {
        console.error('Following list error:', error);

        res.status(500).json({
            success: false,
            message: 'Following list failed'
        });
    }
});

// GET FOLLOWING COUNT
app.get('/api/following/:username/count', (req, res) => {
    try {
        const fs = require('fs');

        const username = String(req.params.username || '').trim();
        const subscriptionsFile = './subscriptions.json';

        const subscriptions = fs.existsSync(subscriptionsFile)
            ? JSON.parse(fs.readFileSync(subscriptionsFile, 'utf8'))
            : [];

        const count = subscriptions.filter(
            s => s.subscriber === username
        ).length;

        res.json({
            success: true,
            count
        });

    } catch (error) {
        console.error('Following count error:', error);

        res.status(500).json({
            success: false,
            message: 'Following count failed'
        });
    }
});

app.post('/api/profile/:username/subscribe', (req, res) => {
    try {
        const fs = require('fs');

        const usersFile = './users.json';
        const subscriptionsFile = './subscriptions.json';

        const subscriber = String(req.body.subscriber || '').trim();
        const creator = String(req.params.username || '').trim();

        if (!subscriber) {
            return res.status(400).json({
                success: false,
                message: 'Subscriber username required'
            });
        }

        if (!fs.existsSync(usersFile)) {
            return res.status(404).json({
                success: false,
                message: 'Users not found'
            });
        }

        const users = JSON.parse(
            fs.readFileSync(usersFile, 'utf8')
        );

        const creatorUser = users.find(
            u => u.username === creator
        );

        const subscriberUser = users.find(
            u => u.username === subscriber
        );

        if (!creatorUser) {
            return res.status(404).json({
                success: false,
                message: 'Creator not found'
            });
        }

        if (!subscriberUser) {
            return res.status(404).json({
                success: false,
                message: 'Subscriber not found'
            });
        }

        if (subscriber === creator) {
            return res.status(400).json({
                success: false,
                message: 'You cannot subscribe to yourself'
            });
        }

        let subscriptions = [];

        if (fs.existsSync(subscriptionsFile)) {
            subscriptions = JSON.parse(
                fs.readFileSync(subscriptionsFile, 'utf8')
            );
        }

        const exists = subscriptions.some(
            s =>
                s.subscriber === subscriber &&
                s.creator === creator
        );

        if (exists) {
            return res.json({
                success: true,
                subscribed: true,
                subscribers: creatorUser.subscribers || 0,
                message: 'Already subscribed'
            });
        }

        subscriptions.push({
            subscriber,
            creator,
            created_at: new Date().toISOString()
        });

        creatorUser.subscribers =
            (creatorUser.subscribers || 0) + 1;

        fs.writeFileSync(
            subscriptionsFile,
            JSON.stringify(subscriptions, null, 2)
        );

        fs.writeFileSync(
            usersFile,
            JSON.stringify(users, null, 2)
        );

        const notificationsFile = './notifications.json';
        let notifications = [];

        if (fs.existsSync(notificationsFile)) {
            notifications = JSON.parse(
                fs.readFileSync(notificationsFile, 'utf8')
            );
        }

        notifications.push({
            id: Date.now(),
            recipient: creator,
            type: 'subscribe',
            from: subscriber,
            message: `${subscriber} subscribed to your profile`,
            read: false,
            created_at: new Date().toISOString()
        });

        fs.writeFileSync(
            notificationsFile,
            JSON.stringify(notifications, null, 2)
        );

        res.json({
            success: true,
            subscribed: true,
            subscribers: creatorUser.subscribers
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Subscribe failed'
        });
    }
});


app.post('/api/profile/:username/unsubscribe', (req, res) => {
    try {
        const fs = require('fs');

        const usersFile = './users.json';
        const subscriptionsFile = './subscriptions.json';

        const subscriber = String(req.body.subscriber || '').trim();
        const creator = String(req.params.username || '').trim();

        let users = JSON.parse(
            fs.readFileSync(usersFile, 'utf8')
        );

        let subscriptions = fs.existsSync(subscriptionsFile)
            ? JSON.parse(fs.readFileSync(subscriptionsFile, 'utf8'))
            : [];

        const creatorUser = users.find(
            u => u.username === creator
        );

        if (!creatorUser) {
            return res.status(404).json({
                success: false,
                message: 'Creator not found'
            });
        }

        const before = subscriptions.length;

        subscriptions = subscriptions.filter(
            s =>
                !(
                    s.subscriber === subscriber &&
                    s.creator === creator
                )
        );

        if (subscriptions.length === before) {
            return res.json({
                success: true,
                subscribed: false,
                subscribers: creatorUser.subscribers || 0,
                message: 'Not subscribed'
            });
        }

        creatorUser.subscribers = Math.max(
            0,
            (creatorUser.subscribers || 0) - 1
        );

        fs.writeFileSync(
            subscriptionsFile,
            JSON.stringify(subscriptions, null, 2)
        );

        fs.writeFileSync(
            usersFile,
            JSON.stringify(users, null, 2)
        );

        res.json({
            success: true,
            subscribed: false,
            subscribers: creatorUser.subscribers
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Unsubscribe failed'
        });
    }
});






app.put('/api/profile/:username/avatar', (req, res) => {
    try {
        const fs = require('fs');

        const username = String(req.params.username || '').trim();
        const avatar = String(req.body.avatar || '').trim();

        const allowedAvatars = [
            '😀', '😎', '🤩', '😇',
            '🥳', '😄', '🦁', '🐯',
            '🐼', '🐨', '🚀', '⭐'
        ];

        if (!allowedAvatars.includes(avatar)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid avatar'
            });
        }

        const usersFile = './users.json';

        if (!fs.existsSync(usersFile)) {
            return res.status(404).json({
                success: false,
                message: 'Users not found'
            });
        }

        const users = JSON.parse(
            fs.readFileSync(usersFile, 'utf8')
        );

        const user = users.find(
            u => u.username === username
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.avatar = avatar;

        fs.writeFileSync(
            usersFile,
            JSON.stringify(users, null, 2)
        );

        res.json({
            success: true,
            avatar: user.avatar
        });

    } catch (error) {
        console.error('Avatar update error:', error);

        res.status(500).json({
            success: false,
            message: 'Avatar update failed'
        });
    }
});

app.delete('/api/profile/:username/photo', (req, res) => {
    try {
        const fs = require('fs');

        const username = String(req.params.username || '').trim();
        const usersFile = './users.json';

        if (!fs.existsSync(usersFile)) {
            return res.status(404).json({
                success: false,
                message: 'Users not found'
            });
        }

        const users = JSON.parse(
            fs.readFileSync(usersFile, 'utf8')
        );

        const user = users.find(
            u => u.username === username
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.profile_photo) {
            const oldPath = path.join(
                'profile-uploads',
                path.basename(user.profile_photo)
            );

            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }

        user.profile_photo = null;

        fs.writeFileSync(
            usersFile,
            JSON.stringify(users, null, 2)
        );

        res.json({
            success: true,
            profile_photo: null
        });

    } catch (error) {
        console.error('Remove profile photo error:', error);

        res.status(500).json({
            success: false,
            message: 'Profile photo remove failed'
        });
    }
});

app.post('/api/profile/:username/photo', (req, res) => {
    profileUpload.single('photo')(req, res, (uploadError) => {
        try {
            const fs = require('fs');

            if (uploadError) {
                return res.status(400).json({
                    success: false,
                    message: uploadError.message || 'Photo upload failed'
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Please select a photo'
                });
            }

            const username = String(req.params.username || '').trim();
            const usersFile = './users.json';

            if (!fs.existsSync(usersFile)) {
                return res.status(404).json({
                    success: false,
                    message: 'Users not found'
                });
            }

            const users = JSON.parse(
                fs.readFileSync(usersFile, 'utf8')
            );

            const user = users.find(
                u => u.username === username
            );

            if (!user) {
                fs.unlinkSync(req.file.path);

                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            if (user.profile_photo) {
                const oldPath = path.join(
                    'profile-uploads',
                    path.basename(user.profile_photo)
                );

                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }

            user.profile_photo =
                '/profile-uploads/' + req.file.filename;

            fs.writeFileSync(
                usersFile,
                JSON.stringify(users, null, 2)
            );

            res.json({
                success: true,
                profile_photo: user.profile_photo
            });

        } catch (error) {
            console.error('Profile photo error:', error);

            if (req.file && fs.existsSync(req.file.path)) {
                try {
                    fs.unlinkSync(req.file.path);
                } catch (_) {}
            }

            res.status(500).json({
                success: false,
                message: 'Profile photo update failed'
            });
        }
    });
});

app.put('/api/profile/:username/edit', (req, res) => {
    try {
        const fs = require('fs');

        const usersFile = './users.json';
        const currentUsername = String(req.params.username || '').trim();
        const newName = String(req.body.name || '').trim();
        const newUsername = String(req.body.username || '').trim();

        if (!newName || !newUsername) {
            return res.status(400).json({
                success: false,
                message: 'Name and username are required'
            });
        }

        if (!fs.existsSync(usersFile)) {
            return res.status(404).json({
                success: false,
                message: 'Users not found'
            });
        }

        const users = JSON.parse(
            fs.readFileSync(usersFile, 'utf8')
        );

        const user = users.find(
            u => u.username === currentUsername
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const duplicate = users.some(
            u => u.username === newUsername &&
                 u.username !== currentUsername
        );

        if (duplicate) {
            return res.status(409).json({
                success: false,
                message: 'Username already taken'
            });
        }

        user.name = newName;
        user.username = newUsername;

        fs.writeFileSync(
            usersFile,
            JSON.stringify(users, null, 2)
        );

        res.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                username: user.username,
                subscribers: user.subscribers || 0
            }
        });

    } catch (error) {
        console.error('Edit profile error:', error);

        res.status(500).json({
            success: false,
            message: 'Profile update failed'
        });
    }
});

app.get('/api/profile/:username/subscription-status', (req, res) => {
    try {
        const fs = require('fs');

        const subscriber = String(req.query.subscriber || '').trim();
        const creator = String(req.params.username || '').trim();

        if (!subscriber) {
            return res.status(400).json({
                success: false,
                message: 'Subscriber username required'
            });
        }

        const subscriptionsFile = './subscriptions.json';

        const subscriptions = fs.existsSync(subscriptionsFile)
            ? JSON.parse(fs.readFileSync(subscriptionsFile, 'utf8'))
            : [];

        const subscribed = subscriptions.some(
            s =>
                s.subscriber === subscriber &&
                s.creator === creator
        );

        res.json({
            success: true,
            subscribed
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Subscription status failed'
        });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`UDAAN server running on port ${PORT}`);
});
