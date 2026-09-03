const { sendViaResend } = require('./resend');
const { sendViaSMTP } = require('./smtp');

function getProvider() {
    return String(process.env.EMAIL_PROVIDER || 'resend')
        .trim()
        .toLowerCase();
}

async function sendEmail(options) {
    const provider = getProvider();

    if (provider === 'smtp') {
        return sendViaSMTP(options);
    }

    if (provider === 'resend') {
        return sendViaResend(options);
    }

    throw new Error(
        `Unsupported EMAIL_PROVIDER: ${provider}. Use resend or smtp.`
    );
}

module.exports = {
    sendEmail
};
