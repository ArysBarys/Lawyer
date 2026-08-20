const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DB_DIR = process.env.DB_DIR || path.join(__dirname, '..', 'adaltirek-data');
fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(path.join(DB_DIR, 'data.db'));
db.pragma('journal_mode = WAL');

function ensureColumn(tableName, columnName, definition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const exists = columns.some((column) => column.name === columnName);
  if (!exists) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL CHECK(role IN ('admin','lawyer')),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    specialty TEXT,
    phone TEXT,
    email TEXT,
    must_change_password INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    topic TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('new','in_progress','closed')) DEFAULT 'new',
    lawyer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    message TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

ensureColumn('users', 'must_change_password', 'INTEGER NOT NULL DEFAULT 0');
ensureColumn('users', 'email', 'TEXT');
ensureColumn('users', 'phone', 'TEXT');
ensureColumn('users', 'specialty', 'TEXT');
ensureColumn('users', 'name', 'TEXT');
ensureColumn('orders', 'lawyer_id', 'INTEGER REFERENCES users(id) ON DELETE SET NULL');

// Сид админа при первом запуске на пустой базе.
// Пароль всегда генерируется случайно и печатается один раз в консоль —
// в коде и в git-истории он не остаётся.
const adminExists = db.prepare(`SELECT 1 FROM users WHERE role = 'admin'`).get();
if (!adminExists) {
  const username = process.env.SEED_ADMIN_USER || 'admin';
  const password = process.env.SEED_ADMIN_PASSWORD || crypto.randomBytes(6).toString('hex');
  const hash = bcrypt.hashSync(password, 12);
  db.prepare(`INSERT INTO users (role, username, password_hash) VALUES ('admin', ?, ?)`)
    .run(username, hash);

  console.log('\n=== Создан первый админ-аккаунт ===');
  console.log(`Логин: ${username}`);
  console.log(`Пароль: ${password}`);
  console.log('Сохрани пароль сейчас — он больше нигде не выводится.\n');
}

module.exports = db;