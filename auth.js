const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const USERS_FILE = './users.json';
const JWT_SECRET = process.env.JWT_SECRET || 'UDAAN_SECRET_CHANGE_THIS_LATER';

let usersCache = null;

function getUsers() {
    if (usersCache !== null) {
        return usersCache;
    }

    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, '[]');
    }

    usersCache = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    return usersCache;
}

function saveUsers(users) {
    usersCache = users;
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

async function signup(name, username, password, email = '', country = '') {
    const users = getUsers();

    if (users.some(u => u.username === username)) {
        throw new Error('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = {
        id: Date.now(),
        name,
        username,
        password: hashedPassword,
        email: String(email || '').trim().toLowerCase(),
        emailVerified: false,
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null,
        emailVerifiedAt: null,
        country: String(country || '').trim().toUpperCase(),
        dataRegion: String(country || '').trim().toUpperCase() === 'IN' ? 'IN' : 'GLOBAL',
        subscribers: 0,
        watch_minutes: 0,
        tokens: 0,
        created_at: new Date().toISOString()
    };

    users.push(user);
    saveUsers(users);

    return {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        emailVerified: user.emailVerified,
        country: user.country,
        dataRegion: user.dataRegion
    };
}

async function login(username, password) {
    const users = getUsers();
    const user = users.find(u => u.username === username);

    const adminUsername = process.env.UDAAN_ADMIN_USERNAME || '';
    const adminPassword = process.env.UDAAN_ADMIN_PASSWORD || '';

    const isConfiguredAdmin =
        adminUsername &&
        adminPassword &&
        username === adminUsername &&
        password === adminPassword;

    if (!user && !isConfiguredAdmin) {
        throw new Error('Invalid username or password');
    }

    const valid = isConfiguredAdmin ||
        await bcrypt.compare(password, user.password);

    if (!valid) {
        throw new Error('Invalid username or password');
    }

    const loginUser = user || {
        id: 'admin',
        name: 'UDAAN Admin',
        username,
        role: 'admin'
    };

    const role = isConfiguredAdmin
        ? 'admin'
        : (loginUser.role || 'user');

    const token = jwt.sign(
        {
            id: loginUser.id,
            username: loginUser.username,
            role
        },
        JWT_SECRET,
        { expiresIn: '7d' }
    );

    return {
        token,
        user: {
            id: loginUser.id,
            name: loginUser.name,
            username: loginUser.username,
            role
        }
    };
}

module.exports = {
    signup,
    login
};
