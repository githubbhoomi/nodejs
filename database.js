const sqlite3 = require("sqlite3").verbose();

// Create database file (auto created if not exists)
const db = new sqlite3.Database("./eventdb.db", (err) => {
    if (err) return console.error(err.message);
    console.log("✅ Connected to SQLite database");
});

// Create table if not exists
db.run(`
CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phoneno TEXT NOT NULL,
    email TEXT NOT NULL,
    event TEXT NOT NULL,
    reg_by TEXT NOT NULL,
    reg_date TEXT  DEFAULT (datetime('now','localtime')),
    upd_by TEXT NOT NULL,
    upd_dt TEXT DEFAULT (datetime('now','localtime'))
)
`);

db.run(`
CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,     
    price REAL NOT NULL,
    photo TEXT,               
    description TEXT,
    crt_by  Text NOT NULL,
    crt_dt  Text  DEFAULT (datetime('now','localtime')),
    upd_by Text NOT NULL,
    upd_dt TEXT DEFAULT (datetime('now','localtime'))
);
`)

// db.run(`
// CREATE TABLE IF NOT EXISTS users (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     username TEXT NOT NULL UNIQUE,
//     password TEXT NOT NULL,
//     role TEXT DEFAULT 'admin', -- admin or user
//     created_by Text,
//     created_at TEXT DEFAULT (datetime('now','localtime'))
// )
// `);


// db.run(`
// CREATE TABLE IF NOT EXISTS users_new (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     username TEXT NOT NULL UNIQUE,
//     password TEXT NOT NULL,
//     role TEXT DEFAULT 'admin',
//     created_by TEXT,                -- removed NOT NULL
//     created_at TEXT DEFAULT (datetime('now','localtime'))
// )
// `, (err) => {
//     if (err) return console.error(err.message);
//     console.log("✅ users_new table created");
// });

// // // 2️⃣ Copy data from old table
// db.run(`
// INSERT INTO users_new (id, username, password, role, created_by, created_at)
// SELECT id, username, password, role, created_by, created_at FROM users
// `, (err) => {
//     if (err) return console.error(err.message);
//     console.log("✅ Data copied to users_new");
// });

// // 3️⃣ Drop old table
// db.run(`DROP TABLE users`, (err) => {
//     if (err) return console.error(err.message);
//     console.log("✅ Old users table dropped");
// });

// 4️⃣ Rename new table
// db.run(`ALTER TABLE users_new RENAME TO users`, (err) => {
//     if (err) return console.error(err.message);
//     console.log("✅ users_new renamed to users");
// });

module.exports = db;