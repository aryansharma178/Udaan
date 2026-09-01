const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'notifications.json');

let notificationsCache = null;

function getNotifications() {
    if (notificationsCache !== null) {
        return notificationsCache;
    }

    if (!fs.existsSync(FILE)) {
        notificationsCache = [];
        fs.writeFileSync(FILE, '[]');
        return notificationsCache;
    }

    try {
        notificationsCache = JSON.parse(
            fs.readFileSync(FILE, 'utf8')
        );

        if (!Array.isArray(notificationsCache)) {
            notificationsCache = [];
        }
    } catch (error) {
        console.error('Notifications cache load error:', error);
        notificationsCache = [];
    }

    return notificationsCache;
}

function saveNotifications(notifications) {
    notificationsCache = notifications;

    fs.writeFileSync(
        FILE,
        JSON.stringify(notificationsCache, null, 2)
    );
}

function addNotification(notification) {
    const notifications = getNotifications();

    notifications.push(notification);
    saveNotifications(notifications);

    return notification;
}

module.exports = {
    getNotifications,
    saveNotifications,
    addNotification
};
