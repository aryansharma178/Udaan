const crypto = require('crypto');
const nodemailer = require('nodemailer');
const fs = require('fs');

const USERS_FILE = './users.json';
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function loadUsers() {
    if (!fs.existsSync(USERS_FILE)) return [];
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}

function saveUsers(users) {
    fs.writeFileSync(
        USERS_FILE,
        JSON.stringify(users, null, 2)
    );
}

function createTransporter() {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT || 465);
    const secure =
        String(process.env.SMTP_SECURE || 'true') === 'true';

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        throw new Error('Email service is not configured');
    }

    return nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
}

function hashToken(token) {
    return crypto
        .createHash('sha256')
        .update(String(token || ''))
        .digest('hex');
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

    const baseUrl =
        process.env.PUBLIC_BASE_URL ||
        'https://udaan-ss5a.onrender.com';

    /*
     * Username is NOT exposed in the URL.
     * Only the random one-time token is sent.
     */
    const verifyUrl =
        `${baseUrl}/api/email/verify?token=${rawToken}`;

    const transporter = createTransporter();

    await transporter.sendMail({
        from: `"UDAAN" <${process.env.SMTP_USER}>`,
        to: current.email,
        subject: 'Verify your UDAAN email 🚀',

        text: `Hello ${current.name},

Verify your UDAAN email using this link:

${verifyUrl}

This link expires in 24 hours and can only be used once.

If you did not request this, ignore this email.`,

        html: `
<!doctype html>
<html>
<head>
<meta name="viewport"
content="width=device-width,initial-scale=1">
<title>Verify UDAAN Email</title>
</head>

<body style="
font-family:Arial,sans-serif;
background:#f5f5f5;
padding:30px;
">

<div style="
max-width:520px;
margin:auto;
background:#ffffff;
padding:30px;
border-radius:16px;
">

<h2>🚀 Verify your UDAAN email</h2>

<p>
Hello ${escapeHtml(current.name)},
</p>

<p>
Click the button below to verify your email address.
</p>

<p>
<a href="${verifyUrl}"
style="
display:inline-block;
padding:14px 24px;
background:#ff7a00;
color:#ffffff;
text-decoration:none;
border-radius:10px;
font-weight:bold;
">
Verify Email
</a>
</p>

<p style="color:#777;">
This verification link expires in 24 hours
and can only be used once.
</p>

<p style="color:#777;">
If you did not request this email,
you can safely ignore it.
</p>

</div>
</body>
</html>
`
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

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

module.exports = {
    sendVerificationEmail,
    verifyEmail
};
