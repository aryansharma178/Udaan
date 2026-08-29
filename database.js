const Database = require('better-sqlite3');

const db = new Database('udaan.db');

db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        subscribers INTEGER DEFAULT 0,
        watch_minutes INTEGER DEFAULT 0,
        tokens INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`).run();

console.log('UDAAN database ready 🚀');

module.exports = db;
