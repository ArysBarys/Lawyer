const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');

const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
  console.error('SESSION_SECRET не задан в переменных окружения. Остановка.');
  process.exit(1);
}

app.set('trust proxy', 1);
app.use(bodyParser.json({ limit: '50kb' }));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use(express.static(path.join(__dirname, 'dist')));
app.get(['/styles.css', '/script.js', '/lawyer.css', '/lawyer.js'], (req, res) => {
  res.sendFile(path.join(__dirname, path.basename(req.path)));
});

app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: __dirname }),
  secret: process.env.SESSION_SECRET || 'dev_only_secret_do_not_use_in_prod',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

function text(value, maxLength = 500) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

const loginAttempts = new Map();
function loginRateLimited(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count += 1;
  return entry.count > 5;
}

function lawyerPayload(body) {
  const payload = {
    name: text(body.name, 100),
    specialty: text(body.specialty, 150),
    phone: text(body.phone, 40),
    email: text(body.email, 254).toLowerCase(),
  };
  if (!payload.name || !payload.specialty || !payload.phone || !validEmail(payload.email)) return null;
  return payload;
}

function auth(role) {
  return (req, res, next) => {
    if (!req.session.role) return res.status(401).json({ error: 'Неавторизовано' });
    if (role && req.session.role !== role) return res.status(403).json({ error: 'Нет доступа' });
    next();
  };
}

function publicUser(row) {
  if (!row) return null;
  const { password_hash, ...rest } = row;
  return rest;
}

function toClientOrder(row) {
  if (!row) return row;
  return {
    id: row.id,
    clientName: row.client_name,
    phone: row.phone,
    topic: row.topic,
    status: row.status,
    lawyerId: row.lawyer_id,
    createdAt: row.created_at,
  };
}

app.post('/api/login', (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  if (loginRateLimited(ip)) {
    return res.status(429).json({ success: false, message: 'Слишком много попыток. Попробуйте через минуту.' });
  }

  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ success: false, message: 'Неверный логин или пароль' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
  }

  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ success: false, message: 'Ошибка сервера' });
    req.session.role = user.role;
    req.session.userId = user.id;
    res.json({ success: true, role: user.role, lawyerId: user.role === 'lawyer' ? user.id : undefined });
  });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.get('/api/check', (req, res) => {
  res.json({ authenticated: !!req.session.role, role: req.session.role || null, userId: req.session.userId || null });
});

app.get('/api/lawyers', auth('admin'), (req, res) => {
  const rows = db.prepare(`SELECT * FROM users WHERE role = 'lawyer' ORDER BY id`).all();
  res.json(rows.map(publicUser));
});

app.post('/api/lawyers', auth('admin'), (req, res) => {
  const payload = lawyerPayload(req.body || {});
  const username = text(req.body?.username, 50);
  if (!payload || !username) return res.status(400).json({ error: 'Заполните корректно все поля юриста' });

  const exists = db.prepare('SELECT 1 FROM users WHERE username = ?').get(username);
  if (exists) return res.status(400).json({ error: 'Такой логин уже занят' });

  const tempPassword = crypto.randomBytes(6).toString('hex');
  const hash = bcrypt.hashSync(tempPassword, 12);

  const info = db.prepare(`
    INSERT INTO users (role, username, password_hash, name, specialty, phone, email, must_change_password)
    VALUES ('lawyer', ?, ?, ?, ?, ?, ?, 1)
  `).run(username, hash, payload.name, payload.specialty, payload.phone, payload.email);

  const newLawyer = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  res.json({ ...publicUser(newLawyer), tempPassword });
});

app.put('/api/lawyers/:id', auth('admin'), (req, res) => {
  const existing = db.prepare(`SELECT * FROM users WHERE id = ? AND role = 'lawyer'`).get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Юрист не найден' });

  const payload = lawyerPayload(req.body || {});
  if (!payload) return res.status(400).json({ error: 'Заполните корректно все поля юриста' });

  db.prepare(`UPDATE users SET name = ?, specialty = ?, phone = ?, email = ? WHERE id = ?`)
    .run(payload.name, payload.specialty, payload.phone, payload.email, req.params.id);

  res.json(publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)));
});

app.delete('/api/lawyers/:id', auth('admin'), (req, res) => {
  const existing = db.prepare(`SELECT * FROM users WHERE id = ? AND role = 'lawyer'`).get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Юрист не найден' });

  const tx = db.transaction(() => {
    db.prepare('UPDATE orders SET lawyer_id = NULL WHERE lawyer_id = ?').run(req.params.id);
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  });
  tx();

  res.json({ success: true });
});

app.get('/api/orders', auth(), (req, res) => {
  const rows = req.session.role === 'admin'
    ? db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all()
    : db.prepare('SELECT * FROM orders WHERE lawyer_id = ? ORDER BY created_at DESC').all(req.session.userId);
  res.json(rows.map(toClientOrder));
});

app.post('/api/orders', auth('admin'), (req, res) => {
  const clientName = text(req.body?.clientName, 100);
  const phone = text(req.body?.phone, 40);
  const topic = text(req.body?.topic, 500);
  const status = req.body?.status || 'new';
  const lawyerId = req.body?.lawyerId || null;

  if (!clientName || !phone || !topic || !['new', 'in_progress', 'closed'].includes(status)) {
    return res.status(400).json({ error: 'Некорректные данные заявки' });
  }
  if (lawyerId && !db.prepare(`SELECT 1 FROM users WHERE id = ? AND role = 'lawyer'`).get(lawyerId)) {
    return res.status(400).json({ error: 'Выбранный юрист не найден' });
  }

  const info = db.prepare(`
    INSERT INTO orders (client_name, phone, topic, status, lawyer_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(clientName, phone, topic, status, lawyerId);

  res.json(toClientOrder(db.prepare('SELECT * FROM orders WHERE id = ?').get(info.lastInsertRowid)));
});

app.put('/api/orders/:id', auth(), (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Заявка не найдена' });
  if (req.session.role === 'lawyer' && order.lawyer_id !== req.session.userId) {
    return res.status(403).json({ error: 'Нет доступа к этой заявке' });
  }

  const sets = [];
  const values = [];

  if (Object.hasOwn(req.body || {}, 'status')) {
    if (!['new', 'in_progress', 'closed'].includes(req.body.status)) {
      return res.status(400).json({ error: 'Некорректный статус заявки' });
    }
    sets.push('status = ?');
    values.push(req.body.status);
  }

  if (req.session.role === 'admin' && Object.hasOwn(req.body || {}, 'lawyerId')) {
    const lawyerId = req.body.lawyerId || null;
    if (lawyerId && !db.prepare(`SELECT 1 FROM users WHERE id = ? AND role = 'lawyer'`).get(lawyerId)) {
      return res.status(400).json({ error: 'Выбранный юрист не найден' });
    }
    sets.push('lawyer_id = ?');
    values.push(lawyerId);
  }

  if (!sets.length) return res.status(400).json({ error: 'Нет данных для обновления' });

  values.push(req.params.id);
  db.prepare(`UPDATE orders SET ${sets.join(', ')} WHERE id = ?`).run(...values);

  res.json(toClientOrder(db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)));
});

app.post('/api/contacts', (req, res) => {
  const name = text(req.body?.name, 100);
  const phone = text(req.body?.phone, 40);
  const email = text(req.body?.email, 254).toLowerCase();
  const message = text(req.body?.message, 2000);

  if (!name || !phone || (email && !validEmail(email))) {
    return res.status(400).json({ success: false, message: 'Заполните корректно все поля формы' });
  }

  db.prepare(`INSERT INTO contacts (name, phone, email, message) VALUES (?, ?, ?, ?)`)
    .run(name, phone, email, message);

  res.json({ success: true });
});

app.get('/api/contacts', auth('admin'), (req, res) => {
  res.json(db.prepare('SELECT * FROM contacts ORDER BY created_at DESC').all());
});

app.get('/api/lawyer-account', auth('lawyer'), (req, res) => {
  const profile = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.session.userId);
  if (!profile) return res.status(404).json({ error: 'Пользователь не найден' });
  const orders = db.prepare('SELECT * FROM orders WHERE lawyer_id = ? ORDER BY created_at DESC').all(req.session.userId);
  res.json({ profile: publicUser(profile), orders: orders.map(toClientOrder) });
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

app.get('/lawyer', (req, res) => {
  res.sendFile(path.join(__dirname, 'lawyer.html'));
});

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  const distIndex = path.join(__dirname, 'dist', 'index.html');
  const fs = require('fs');
  if (fs.existsSync(distIndex)) return res.sendFile(distIndex);
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
