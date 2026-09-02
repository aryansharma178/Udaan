const fs = require('fs');
const path = require('path');

const ERROR_FILE = path.join(__dirname, 'errors.json');
const MAX_ERRORS = 500;

function readErrors() {
    try {
        if (!fs.existsSync(ERROR_FILE)) return [];
        const data = fs.readFileSync(ERROR_FILE, 'utf8');
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error monitor read failed:', error.message);
        return [];
    }
}

function saveErrors(errors) {
    try {
        fs.writeFileSync(
            ERROR_FILE,
            JSON.stringify(errors.slice(-MAX_ERRORS), null, 2)
        );
    } catch (error) {
        console.error('Error monitor save failed:', error.message);
    }
}

function sanitize(value) {
    if (value === undefined || value === null) return value;

    if (typeof value === 'object') {
        const output = {};

        for (const [key, val] of Object.entries(value)) {
            const lowerKey = key.toLowerCase();

            if (
                lowerKey.includes('password') ||
                lowerKey.includes('token') ||
                lowerKey.includes('authorization') ||
                lowerKey.includes('secret') ||
                lowerKey.includes('cookie')
            ) {
                output[key] = '[REDACTED]';
            } else {
                output[key] = sanitize(val);
            }
        }

        return output;
    }

    if (typeof value === 'string' && value.length > 2000) {
        return value.slice(0, 2000) + '...';
    }

    return value;
}

function logError({
    type = 'server',
    error,
    req = null,
    extra = {}
}) {
    const errors = readErrors();

    const entry = {
        id: Date.now().toString(),
        type,
        message: error?.message || String(error || 'Unknown error'),
        stack: error?.stack || null,
        method: req?.method || null,
        path: req?.originalUrl || req?.url || null,
        username: req?.user?.username || null,
        ip: req?.ip || null,
        userAgent: req?.headers?.['user-agent'] || null,
        extra: sanitize(extra),
        created_at: new Date().toISOString()
    };

    errors.push(entry);
    saveErrors(errors);

    console.error('🚨 UDAAN ERROR:', entry);
    return entry;
}

module.exports = {
    logError,
    readErrors
};
