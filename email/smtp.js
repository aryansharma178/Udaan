const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
    if (transporter) return transporter;

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
        throw new Error('SMTP configuration is incomplete');
    }

    transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
            user,
            pass
        }
    });

    return transporter;
}

async function sendViaSMTP({ from, to, subject, html }) {
    const mailer = getTransporter();

    const info = await mailer.sendMail({
        from,
        to,
        subject,
        html
    });

    console.log(
        `UDAAN: SMTP email sent to ${to}. Message ID: ${info.messageId}`
    );

    return info;
}

module.exports = {
    sendViaSMTP
};
