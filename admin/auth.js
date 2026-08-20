async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Server error');
  }
  return res.json();
}

async function checkSession() {
  return apiFetch('/api/check');
}

async function login(username, password) {
  return apiFetch('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

async function logout() {
  return apiFetch('/api/logout', { method: 'POST' });
}

async function fetchLawyers() {
  return apiFetch('/api/lawyers');
}

async function createLawyer(payload) {
  return apiFetch('/api/lawyers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

async function updateLawyer(id, payload) {
  return apiFetch(`/api/lawyers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

async function deleteLawyer(id) {
  return apiFetch(`/api/lawyers/${id}`, {
    method: 'DELETE',
  });
}

async function fetchOrders() {
  return apiFetch('/api/orders');
}

async function updateOrder(id, payload) {
  return apiFetch(`/api/orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

async function fetchContacts() {
  return apiFetch('/api/contacts');
}

async function fetchLawyerAccount() {
  return apiFetch('/api/lawyer-account');
}
