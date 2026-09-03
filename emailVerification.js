const crypto = require('crypto');
const fs = require('fs');

const USERS_FILE = './users.json';
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function loadUsers() {
    if (!fs.existsSync(USERS_FILE)) return [];

    try {
        return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
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

async function sendVerificationEmail(user) {
    if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY is not configured');
    }

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

    const verifyUrl =
        `${baseUrl}/api/email/verify?token=${encodeURIComponent(rawToken)}`;

    const from =
        process.env.RESEND_FROM ||
        'UDAAN <onboarding@resend.dev>';

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Verify your UDAAN email</title>
</head>

<body style="
    margin:0;
    padding:0;
    background:#111;
    font-family:Arial,sans-serif;
">

<div style="
    max-width:600px;
    margin:40px auto;
    background:#1b1425;
    border-radius:20px;
    padding:35px;
    color:#fff;
">

<h1 style="color:#ff8a00;margin-top:0;">
UDAAN 🚀
</h1>

<h2>Verify your email address</h2>

<p style="color:#ccc;font-size:16px;line-height:1.6;">
Welcome to UDAAN! Please verify your email address
to secure your account.
</p>

<a href="${verifyUrl}"
style="
    display:inline-block;
    padding:15px 28px;
    background:#ff7a00;
    color:#fff;
    text-decoration:none;
    border-radius:10px;
    font-weight:bold;
    margin:20px 0;
">
Verify Email
</a>

<p style="color:#999;font-size:13px;">
This verification link expires in 24 hours.
</p>

<p style="color:#777;font-size:12px;">
If you did not create this UDAAN account, you can ignore this email.
</p>

</div>

</body>
</html>
`;

    const response = await fetch(
        'https://api.resend.com/emails',
        {
            method: 'POST',
            headers: {
                'Authorization':
                    `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type':
                    'application/json'
            },
            body: JSON.stringify({
                from,
                to: [current.email],
                subject: 'Verify your UDAAN email 🚀',
                html
            })
        }
    );

    const result = await response.json();

    if (!response.ok) {
        console.error(
        'RESEND API ERROR:',
        JSON.stringify(result, null, 2)
    );

        throw new Error(
            result?.message ||
            result?.name ||
            'Resend failed to send email'
        );
    }

    console.log(
        `UDAAN verification email sent to ${current.email}. Resend ID: ${result.id || 'unknown'}`
    );

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
