const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_PATH = path.join(__dirname, 'server-data.json');

app.use(bodyParser.json({ limit: '50kb' }));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use(express.static(path.join(__dirname, 'dist')));
app.get(['/styles.css', '/script.js', '/lawyer.css', '/lawyer.js'], (req, res) => {
  res.sendFile(path.join(__dirname, path.basename(req.path)));
});
app.use(session({
  secret: process.env.SESSION_SECRET || 'adaltirek_secret_key_2026',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

function loadData() {
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
}

function saveData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

let data = loadData();

function ensureData() {
  if (!data.admin) data.admin = { username: 'admin', password: 'adaltirek2026' };
  if (!data.adminAccounts) {
    data.adminAccounts = [{ id: 'admin', username: data.admin.username, password: data.admin.password }];
  }
  if (!data.lawyerAccounts) data.lawyerAccounts = [];
  if (!data.lawyers) data.lawyers = [];
  if (!data.orders) data.orders = [];
  if (!data.contacts) data.contacts = [];
}

function text(value, maxLength = 500) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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

ensureData();
saveData(data);

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const admin = data.adminAccounts.find((item) => item.username === username && item.password === password);
  if (admin) {
    req.session.role = 'admin';
    req.session.userId = admin.id;
    return res.json({ success: true, role: 'admin' });
  }

  const lawyer = data.lawyerAccounts.find((item) => item.username === username && item.password === password);
  if (lawyer) {
    req.session.role = 'lawyer';
    req.session.userId = lawyer.id;
    return res.json({ success: true, role: 'lawyer', lawyerId: lawyer.id });
  }

  return res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.get('/api/check', (req, res) => {
  res.json({ authenticated: !!req.session.role, role: req.session.role || null, userId: req.session.userId || null });
});

function auth(role) {
  return (req, res, next) => {
    if (!req.session.role) return res.status(401).json({ error: 'Неавторизовано' });
    if (role && req.session.role !== role) return res.status(403).json({ error: 'Нет доступа' });
    next();
  };
}

app.get('/api/lawyers', auth('admin'), (req, res) => {
  res.json(data.lawyers);
});

app.post('/api/lawyers', auth('admin'), (req, res) => {
  const payload = lawyerPayload(req.body || {});
  if (!payload) return res.status(400).json({ error: 'Заполните корректно все поля юриста' });
  const newLawyer = { id: 'l' + Date.now(), ...payload };
  data.lawyers.push(newLawyer);
  saveData(data);
  res.json(newLawyer);
});

app.put('/api/lawyers/:id', auth('admin'), (req, res) => {
  const idx = data.lawyers.findIndex((l) => l.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Юрист не найден' });
  const payload = lawyerPayload(req.body || {});
  if (!payload) return res.status(400).json({ error: 'Заполните корректно все поля юриста' });
  data.lawyers[idx] = { ...data.lawyers[idx], ...payload };
  saveData(data);
  res.json(data.lawyers[idx]);
});

app.delete('/api/lawyers/:id', auth('admin'), (req, res) => {
  const idx = data.lawyers.findIndex((l) => l.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Юрист не найден' });
  data.lawyers.splice(idx, 1);
  data.lawyerAccounts = data.lawyerAccounts.filter((account) => account.id !== req.params.id);
  data.orders.forEach((order) => {
    if (order.lawyerId === req.params.id) order.lawyerId = null;
  });
  saveData(data);
  res.json({ success: true });
});

app.get('/api/orders', auth(), (req, res) => {
  if (req.session.role === 'admin') return res.json(data.orders);
  const orders = data.orders.filter((o) => o.lawyerId === req.session.userId);
  res.json(orders);
});

app.put('/api/orders/:id', auth(), (req, res) => {
  const idx = data.orders.findIndex((o) => o.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Заявка не найдена' });
  const order = data.orders[idx];
  if (req.session.role === 'lawyer' && order.lawyerId !== req.session.userId) {
    return res.status(403).json({ error: 'Нет доступа к этой заявке' });
  }
  const updates = {};
  if (Object.hasOwn(req.body || {}, 'status')) {
    if (!['new', 'in_progress', 'closed'].includes(req.body.status)) {
      return res.status(400).json({ error: 'Некорректный статус заявки' });
    }
    updates.status = req.body.status;
  }
  if (req.session.role === 'admin' && Object.hasOwn(req.body || {}, 'lawyerId')) {
    const lawyerId = req.body.lawyerId || null;
    if (lawyerId && !data.lawyers.some((lawyer) => lawyer.id === lawyerId)) {
      return res.status(400).json({ error: 'Выбранный юрист не найден' });
    }
    updates.lawyerId = lawyerId;
  }
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'Нет данных для обновления' });
  data.orders[idx] = { ...order, ...updates };
  saveData(data);
  res.json(data.orders[idx]);
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
  if (lawyerId && !data.lawyers.some((lawyer) => lawyer.id === lawyerId)) {
    return res.status(400).json({ error: 'Выбранный юрист не найден' });
  }
  const newOrder = { id: 'o' + Date.now(), clientName, phone, topic, status, lawyerId, createdAt: new Date().toISOString().split('T')[0] };
  data.orders.push(newOrder);
  saveData(data);
  res.json(newOrder);
});

app.post('/api/contacts', (req, res) => {
  const name = text(req.body?.name, 100);
  const phone = text(req.body?.phone, 40);
  const email = text(req.body?.email, 254).toLowerCase();
  const message = text(req.body?.message, 2000);
  if (!name || !phone || (email && !validEmail(email))) {
    return res.status(400).json({ success: false, message: 'Заполните корректно все поля формы' });
  }
  data.contacts.push({ id: 'c' + Date.now(), name, phone, email, message, createdAt: new Date().toISOString() });
  saveData(data);
  res.json({ success: true });
});

app.get('/api/contacts', auth('admin'), (req, res) => {
  res.json(data.contacts || []);
});

app.get('/api/lawyer-account', auth('lawyer'), (req, res) => {
  const lawyerAccount = data.lawyerAccounts.find((item) => item.id === req.session.userId);
  if (!lawyerAccount) return res.status(404).json({ error: 'Пользователь не найден' });
  const orders = data.orders.filter((o) => o.lawyerId === req.session.userId);
  res.json({ profile: lawyerAccount, orders });
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
  if (fs.existsSync(distIndex)) {
    return res.sendFile(distIndex);
  }

  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
