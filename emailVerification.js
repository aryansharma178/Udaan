const crypto = require('crypto');
const fs = require('fs');

const { sendEmail } = require('./email/mailer');

const USERS_FILE = './users.json';
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function loadUsers() {
    if (!fs.existsSync(USERS_FILE)) {
        return [];
    }

    try {
        return JSON.parse(
            fs.readFileSync(USERS_FILE, 'utf8')
        );
    } catch {
        return [];
    }
}

function saveUsers(users) {
    fs.writeFileSync(
        USERS_FILE,
        JSON.stringify(users, null, 2)
    );
}

function hashToken(token) {
    return crypto
        .createHash('sha256')
        .update(String(token || ''))
        .digest('hex');
}

function getBaseUrl() {
    return (
        process.env.PUBLIC_BASE_URL ||
        'https://udaan-ss5a.onrender.com'
    ).replace(/\/+$/, '');
}

function getFromAddress() {
    return (
        process.env.EMAIL_FROM ||
        process.env.RESEND_FROM ||
        'UDAAN <onboarding@resend.dev>'
    );
}

function createVerificationHtml({
    username,
    verifyUrl
}) {
    return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Verify your UDAAN email</title>
</head>

<body style="
    margin:0;
    padding:0;
    background:#111111;
    font-family:Arial,sans-serif;
">

<div style="
    max-width:600px;
    margin:40px auto;
    background:#1b1425;
    border-radius:20px;
    padding:35px;
    color:#ffffff;
">

<h1 style="
    color:#ff8a00;
    margin-top:0;
">
UDAAN 🚀
</h1>

<h2>
Verify your email address
</h2>

<p style="
    color:#cccccc;
    font-size:16px;
    line-height:1.6;
">
Hello ${username || 'Creator'}, welcome to UDAAN!
Please verify your email address to secure your account.
</p>

<a href="${verifyUrl}" style="
    display:inline-block;
    padding:15px 28px;
    background:#ff7a00;
    color:#ffffff;
    text-decoration:none;
    border-radius:10px;
    font-weight:bold;
    margin:20px 0;
">
Verify Email
</a>

<p style="
    color:#999999;
    font-size:13px;
">
This verification link expires in 24 hours.
</p>

<p style="
    color:#777777;
    font-size:12px;
">
If you did not create this UDAAN account,
you can safely ignore this email.
</p>

</div>

</body>
</html>
`;
}

async function sendVerificationEmail(user) {
    const users = loadUsers();

    const current = users.find(
        u => u.username === user.username
    );

    if (!current) {
        throw new Error('User not found');
    }

    if (!current.email) {
        throw new Error('Email address is required');
    }

    const rawToken = crypto
        .randomBytes(32)
        .toString('hex');

    current.emailVerificationTokenHash =
        hashToken(rawToken);

    current.emailVerificationExpiresAt =
        Date.now() + TOKEN_TTL_MS;

    current.emailVerified = false;

    saveUsers(users);

    const verifyUrl =
        `${getBaseUrl()}/api/email/verify?token=${encodeURIComponent(rawToken)}`;

    const from = getFromAddress();

    const html = createVerificationHtml({
        username: current.username,
        verifyUrl
    });

    await sendEmail({
        from,
        to: current.email,
        subject: 'Verify your UDAAN email 🚀',
        html
    });

    return true;
}

function verifyEmail(token) {
    const users = loadUsers();

    const tokenHash = hashToken(token);

    const user = users.find(
        u =>
            u.emailVerificationTokenHash &&
            u.emailVerificationTokenHash === tokenHash
    );

    if (!user) {
        return {
            success: false,
            message: 'Invalid or already-used verification link'
        };
    }

    if (
        !user.emailVerificationExpiresAt ||
        Date.now() > user.emailVerificationExpiresAt
    ) {
        return {
            success: false,
            message: 'Verification link has expired'
        };
    }

    user.emailVerified = true;
    user.emailVerificationTokenHash = null;
    user.emailVerificationExpiresAt = null;
    user.emailVerifiedAt = new Date().toISOString();

    saveUsers(users);

    return {
        success: true,
        user
    };
}

module.exports = {
    sendVerificationEmail,
    verifyEmail
};
