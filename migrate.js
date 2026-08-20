// Одноразовый перенос данных из старого server-data.json в data.db.
// Запуск: node migrate.js
// После успешного переноса и проверки — server-data.json можно удалить
// (и почистить его из git-истории отдельно, см. раздел "Очистка истории git").

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./db');

const JSON_PATH = path.join(__dirname, 'server-data.json');

if (!fs.existsSync(JSON_PATH)) {
  console.log('server-data.json не найден — переносить нечего.');
  process.exit(0);
}

const old = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));

const insertUser = db.prepare(`
  INSERT INTO users (role, username, password_hash, name, specialty, phone, email, must_change_password)
  VALUES (@role, @username, @password_hash, @name, @specialty, @phone, @email, 1)
  ON CONFLICT(username) DO NOTHING
`);

const insertOrder = db.prepare(`
  INSERT INTO orders (client_name, phone, topic, status, lawyer_id, created_at)
  VALUES (@client_name, @phone, @topic, @status, @lawyer_id, @created_at)
`);

const insertContact = db.prepare(`
  INSERT INTO contacts (name, phone, email, message, created_at)
  VALUES (@name, @phone, @email, @message, @created_at)
`);

const idMap = {}; // старый id ('admin', 'l1', 'l2') -> новый числовой id в users

const run = db.transaction(() => {
  // Админ(ы) — ВАЖНО: если db.js уже создал сид-админа при подключении
  // (см. лог при запуске), а в json тоже есть аккаунт с тем же username
  // 'admin', ON CONFLICT DO NOTHING просто пропустит вставку из json.
  // Это осознанное решение: не переносим потенциально скомпрометированный
  // пароль 'adaltirek2026' в новую базу. Пользуйся паролем, который
  // выводится при первом запуске db.js.
  for (const acc of old.adminAccounts || []) {
    const hash = bcrypt.hashSync(acc.password, 12);
    insertUser.run({
      role: 'admin',
      username: acc.username,
      password_hash: hash,
      name: null, specialty: null, phone: null, email: null,
    });
    const row = db.prepare('SELECT id FROM users WHERE username = ?').get(acc.username);
    if (row) idMap[acc.id] = row.id;
  }

  // Юристы: собираем профиль из lawyers[] + логин/пароль из lawyerAccounts[] по id
  const profiles = Object.fromEntries((old.lawyers || []).map((l) => [l.id, l]));
  for (const acc of old.lawyerAccounts || []) {
    const profile = profiles[acc.id] || {};
    const hash = bcrypt.hashSync(acc.password, 12);
    insertUser.run({
      role: 'lawyer',
      username: acc.username,
      password_hash: hash,
      name: profile.name || acc.name || null,
      specialty: profile.specialty || null,
      phone: profile.phone || null,
      email: profile.email || null,
    });
    const row = db.prepare('SELECT id FROM users WHERE username = ?').get(acc.username);
    if (row) idMap[acc.id] = row.id;
  }

  // Заявки
  for (const o of old.orders || []) {
    insertOrder.run({
      client_name: o.clientName,
      phone: o.phone,
      topic: o.topic,
      status: o.status,
      lawyer_id: o.lawyerId ? (idMap[o.lawyerId] || null) : null,
      created_at: o.createdAt,
    });
  }

  // Обращения с формы контактов
  for (const c of old.contacts || []) {
    insertContact.run({
      name: c.name,
      phone: c.phone,
      email: c.email || null,
      message: c.message || null,
      created_at: c.createdAt,
    });
  }
});

run();

console.log('Перенос завершён.');
console.log(`Пользователей: ${db.prepare('SELECT COUNT(*) c FROM users').get().c}`);
console.log(`Заявок: ${db.prepare('SELECT COUNT(*) c FROM orders').get().c}`);
console.log(`Обращений: ${db.prepare('SELECT COUNT(*) c FROM contacts').get().c}`);
console.log('\nПароли перенесены как есть из json (захешированы), но проставлен флаг must_change_password.');
console.log('Проверь работу логина, затем удали server-data.json и почисти его из git-истории.');
