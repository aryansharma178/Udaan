const RESEND_API_URL = 'https://api.resend.com/emails';

async function sendViaResend({ from, to, subject, html }) {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
        throw new Error('RESEND_API_KEY is not configured');
    }

    const response = await fetch(RESEND_API_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from,
            to: [to],
            subject,
            html
        })
    });

    const text = await response.text();

    let result = {};
    try {
        result = text ? JSON.parse(text) : {};
    } catch {
        result = { raw: text };
    }

    if (!response.ok) {
        throw new Error(
            result?.message ||
            result?.name ||
            result?.raw ||
            `Resend HTTP ${response.status}`
        );
    }

    console.log(
        `UDAAN: Resend email sent to ${to}. ID: ${result.id || 'unknown'}`
    );

    return result;
}

module.exports = { sendViaResend };
