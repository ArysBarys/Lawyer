const statusLabels = {
  new: 'Новая',
  in_progress: 'В работе',
  closed: 'Закрыта'
};

let toastTimer = null;

function getEl(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  const el = document.createElement('div');
  el.textContent = value ?? '';
  return el.innerHTML;
}

function showToast(message) {
  const toast = getEl('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.hidden = false;

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 2500);
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function statusBadge(status) {
  const label = statusLabels[status] || status;
  return `<span class="status-badge status-${status}">${label}</span>`;
}

function renderOrderTable(orders, lawyers = []) {
  if (!orders.length) {
    return `
      <table>
        <tbody>
          <tr class="empty-row"><td>Нет заявок.</td></tr>
        </tbody>
      </table>
    `;
  }

  const lawyerMap = new Map(lawyers.map((lawyer) => [String(lawyer.id), lawyer]));

  return `
    <table>
      <thead>
        <tr>
          <th>Клиент</th>
          <th>Тема</th>
          <th>Юрист</th>
          <th>Статус</th>
          <th>Дата</th>
        </tr>
      </thead>
      <tbody>
        ${orders.map((order) => {
          const lawyer = lawyerMap.get(String(order.lawyerId));
          return `
            <tr>
              <td>
                <strong>${escapeHtml(order.clientName)}</strong>
                <div class="small-text">${escapeHtml(order.phone)}</div>
              </td>
              <td>${escapeHtml(order.topic)}</td>
              <td>${lawyer ? escapeHtml(lawyer.name) : '—'}</td>
              <td>${statusBadge(order.status)}</td>
              <td>${formatDate(order.createdAt)}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function renderLawyersTable(lawyers) {
  if (!lawyers.length) {
    return `
      <table>
        <tbody>
          <tr class="empty-row"><td>Юристов пока нет.</td></tr>
        </tbody>
      </table>
    `;
  }

  return `
    <table>
      <thead>
        <tr>
          <th>Имя</th>
          <th>Специализация</th>
          <th>Телефон</th>
          <th>Email</th>
          <th>Логин</th>
        </tr>
      </thead>
      <tbody>
        ${lawyers.map((lawyer) => `
          <tr>
            <td>${escapeHtml(lawyer.name)}</td>
            <td>${escapeHtml(lawyer.specialty)}</td>
            <td>${escapeHtml(lawyer.phone)}</td>
            <td>${escapeHtml(lawyer.email)}</td>
            <td>${escapeHtml(lawyer.username)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderContactsTable(contacts) {
  if (!contacts.length) {
    return `
      <table>
        <tbody>
          <tr class="empty-row"><td>Нет входящих сообщений.</td></tr>
        </tbody>
      </table>
    `;
  }

  return `
    <table>
      <thead>
        <tr>
          <th>Клиент</th>
          <th>Сообщение</th>
          <th>Дата</th>
        </tr>
      </thead>
      <tbody>
        ${contacts.map((item) => `
          <tr>
            <td>
              <strong>${escapeHtml(item.name)}</strong>
              <div class="small-text">${escapeHtml(item.phone || 'Телефон не указан')}</div>
              ${item.email ? `<div class="small-text">${escapeHtml(item.email)}</div>` : ''}
            </td>
            <td>${escapeHtml(item.message || '—')}</td>
            <td>${formatDate(item.createdAt)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function renderOverview() {
  const [orders, lawyers] = await Promise.all([fetchOrders(), fetchLawyers()]);

  getEl('statNew').textContent = orders.filter((item) => item.status === 'new').length;
  getEl('statInProgress').textContent = orders.filter((item) => item.status === 'in_progress').length;
  getEl('statClosed').textContent = orders.filter((item) => item.status === 'closed').length;
  getEl('statLawyers').textContent = lawyers.length;

  const recent = [...orders]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  getEl('recentOrdersTable').innerHTML = renderOrderTable(recent, lawyers);
}

async function renderOrders() {
  const [orders, lawyers] = await Promise.all([fetchOrders(), fetchLawyers()]);
  getEl('ordersTable').innerHTML = renderOrderTable(
    [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    lawyers
  );
}

async function renderLawyers() {
  const lawyers = await fetchLawyers();
  getEl('lawyersTable').innerHTML = renderLawyersTable(lawyers);
}

async function renderContacts() {
  const contacts = await fetchContacts();
  getEl('contactsTable').innerHTML = renderContactsTable(
    [...contacts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  );
}

async function switchView(view) {
  document.querySelectorAll('.view').forEach((section) => {
    section.hidden = section.id !== `view-${view}`;
  });

  document.querySelectorAll('.nav-item').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === view);
  });

  if (view === 'overview') await renderOverview();
  if (view === 'orders') await renderOrders();
  if (view === 'lawyers') await renderLawyers();
  if (view === 'contacts') await renderContacts();
}

async function initAdmin() {
  const adminApp = getEl('adminApp');
  const logoutBtn = getEl('logoutBtn');

  document.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', async () => {
      await switchView(button.dataset.view);
    });
  });

  // No login form: show admin panel directly
  if (adminApp) adminApp.hidden = false;
  await switchView('overview');

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try { await logout(); } catch (e) { /* ignore */ }
      // redirect to standalone login page after logout
      location.href = '/admin/login';
    });
  }
}

initAdmin();
