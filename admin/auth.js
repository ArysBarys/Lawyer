async function login(username, password) {
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Ошибка входа. Проверьте логин и пароль.');
  }

  return data;
}

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
}

async function fetchJson(url) {
  const response = await fetch(url, { credentials: 'same-origin' });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Ошибка запроса');
  }
  return response.json();
}

async function fetchOrders() {
  return fetchJson('/api/orders');
}

async function fetchLawyers() {
  return fetchJson('/api/lawyers');
}

async function fetchContacts() {
  return fetchJson('/api/contacts');
}
