const statusLabels = { new: 'Новая', in_progress: 'В работе', closed: 'Закрыта' };
let toastTimer = null;
let deletingLawyerId = null;

function getEl(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  const element = document.createElement('div');
  element.textContent = value ?? '';
  return element.innerHTML;
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
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

async function initAdmin() {
  const loginScreen = getEl('loginScreen');
  const adminApp = getEl('adminApp');
  const loginForm = getEl('loginForm');
  const logoutBtn = getEl('logoutBtn');
  const addLawyerBtn = getEl('addLawyerBtn');
  const lawyerModal = getEl('lawyerModal');
  const confirmModal = getEl('confirmModal');
  const lawyerForm = getEl('lawyerForm');
  const loginError = getEl('loginError');

  document.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => switchView(button.dataset.view));
  });

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    loginError.hidden = true;

    try {
      const username = getEl('loginUser').value.trim();
      const password = getEl('loginPass').value;
      const response = await login(username, password);
      if (response.role !== 'admin') throw new Error('Только администратор может войти.');
      loginForm.reset();
      await switchView('overview');
    } catch (error) {
      loginError.textContent = error.message || 'Не удалось войти.';
      loginError.hidden = false;
    }
  });

  logoutBtn.addEventListener('click', async () => {
    await logout();
    loginScreen.hidden = false;
    adminApp.hidden = true;
  });

  addLawyerBtn.addEventListener('click', () => openLawyerModal());

  document.querySelectorAll('[data-close-modal]').forEach((button) => {
    button.addEventListener('click', closeModals);
  });

  [lawyerModal, confirmModal].forEach((modal) => {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModals();
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModals();
  });

  lawyerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = getEl('lawyerId').value;
    const payload = {
      name: getEl('lawyerName').value.trim(),
      specialty: getEl('lawyerSpecialty').value.trim(),
      phone: getEl('lawyerPhone').value.trim(),
      email: getEl('lawyerEmail').value.trim(),
    };

    if (!payload.name || !payload.specialty || !payload.phone || !payload.email) {
      showToast('Заполните все поля.');
      return;
    }

    try {
      if (id) {
        await updateLawyer(id, payload);
        showToast('Юрист обновлён.');
      } else {
        await createLawyer(payload);
        showToast('Юрист добавлен.');
      }
      closeModals();
      await switchView('lawyers');
    } catch (error) {
      showToast(error.message || 'Ошибка сохранения.');
    }
  });

  getEl('confirmYesBtn').addEventListener('click', async () => {
    if (!deletingLawyerId) return;
    try {
      await deleteLawyer(deletingLawyerId);
      showToast('Юрист удалён.');
      deletingLawyerId = null;
      closeModals();
      await switchView('lawyers');
    } catch (error) {
      showToast(error.message || 'Ошибка удаления.');
    }
  });

  async function switchView(viewId) {
    loginScreen.hidden = true;
    adminApp.hidden = false;
    document.querySelectorAll('.view').forEach((section) => {
      section.hidden = section.id !== `view-${viewId}`;
    });
    document.querySelectorAll('.nav-item').forEach((button) => {
      button.classList.toggle('active', button.dataset.view === viewId);
    });
    localStorage.setItem('adaltirekAdminView', viewId);

    if (viewId === 'overview') return renderOverview();
    if (viewId === 'orders') return renderOrders();
    if (viewId === 'lawyers') return renderLawyers();
    if (viewId === 'contacts') return renderContacts();
  }

  async function renderOverview() {
    const [orders, lawyers] = await Promise.all([fetchOrders(), fetchLawyers()]);
    getEl('statNew').textContent = orders.filter((order) => order.status === 'new').length;
    getEl('statInProgress').textContent = orders.filter((order) => order.status === 'in_progress').length;
    getEl('statClosed').textContent = orders.filter((order) => order.status === 'closed').length;
    getEl('statLawyers').textContent = lawyers.length;

    const latestOrders = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
    getEl('recentOrdersTable').innerHTML = renderOrdersTable(latestOrders, lawyers, { compact: true });

    const badge = getEl('ordersBadge');
    const newCount = orders.filter((order) => order.status === 'new').length;
    badge.textContent = newCount;
    badge.hidden = newCount === 0;
    attachOrderActions(getEl('recentOrdersTable'));
  }

  async function renderOrders() {
    const [orders, lawyers] = await Promise.all([fetchOrders(), fetchLawyers()]);
    const filterLawyer = getEl('ordersFilterLawyer');
    const currentLawyer = filterLawyer.value;
    filterLawyer.innerHTML = `<option value="all">Все юристы</option>` + lawyers.map((lawyer) => `<option value="${lawyer.id}">${escapeHtml(lawyer.name)}</option>`).join('');
    filterLawyer.value = lawyers.some((lawyer) => lawyer.id === currentLawyer) ? currentLawyer : 'all';

    // The Orders view can be opened more than once. Assigning handlers keeps
    // us from adding a new listener each time and issuing duplicate requests.
    getEl('ordersSearch').oninput = debounce(applyOrderFilters, 220);
    getEl('ordersFilterStatus').onchange = applyOrderFilters;
    filterLawyer.onchange = applyOrderFilters;

    await applyOrderFilters();
  }

  async function applyOrderFilters() {
    const [orders, lawyers] = await Promise.all([fetchOrders(), fetchLawyers()]);
    const search = getEl('ordersSearch').value.trim().toLowerCase();
    const status = getEl('ordersFilterStatus').value;
    const lawyer = getEl('ordersFilterLawyer').value;

    let filtered = orders;
    if (search) {
      filtered = filtered.filter((order) => order.clientName.toLowerCase().includes(search) || order.phone.toLowerCase().includes(search));
    }
    if (status !== 'all') {
      filtered = filtered.filter((order) => order.status === status);
    }
    if (lawyer !== 'all') {
      filtered = filtered.filter((order) => order.lawyerId === lawyer);
    }

    getEl('ordersTable').innerHTML = renderOrdersTable(filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), lawyers, { compact: false });
    attachOrderActions(getEl('ordersTable'));
  }

  async function renderLawyers() {
    const [lawyers, orders] = await Promise.all([fetchLawyers(), fetchOrders()]);
    const table = getEl('lawyersTable');
    if (!lawyers.length) {
      table.innerHTML = `<table><tbody><tr class="empty-row"><td>Юристов еще нет. Добавьте первого участника.</td></tr></tbody></table>`;
      return;
    }

    table.innerHTML = `
      <table>
        <thead>
          <tr><th>Имя</th><th>Специализация</th><th>Телефон</th><th>Email</th><th>Активных</th><th></th></tr>
        </thead>
        <tbody>
          ${lawyers.map((lawyer) => {
            const activeCount = orders.filter((order) => order.lawyerId === lawyer.id && order.status !== 'closed').length;
            return `
              <tr>
                <td>${escapeHtml(lawyer.name)}</td>
                <td>${escapeHtml(lawyer.specialty)}</td>
                <td>${escapeHtml(lawyer.phone)}</td>
                <td>${escapeHtml(lawyer.email)}</td>
                <td>${activeCount}</td>
                <td class="row-actions">
                  <button class="icon-btn" data-edit-lawyer="${lawyer.id}">Изменить</button>
                  <button class="icon-btn danger" data-delete-lawyer="${lawyer.id}">Удалить</button>
                </td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>`;

    table.querySelectorAll('[data-edit-lawyer]').forEach((button) => {
      button.addEventListener('click', () => openLawyerModal(button.dataset.editLawyer));
    });
    table.querySelectorAll('[data-delete-lawyer]').forEach((button) => {
      button.addEventListener('click', () => confirmDeleteLawyer(button.dataset.deleteLawyer));
    });
  }

  async function renderContacts() {
    const contacts = await fetchContacts();
    const table = getEl('contactsTable');
    if (!contacts.length) {
      table.innerHTML = `<table><tbody><tr class="empty-row"><td>Нет входящих сообщений.</td></tr></tbody></table>`;
      return;
    }

    table.innerHTML = `
      <table>
        <thead>
          <tr><th>Клиент</th><th>Сообщение</th><th>Дата</th></tr>
        </thead>
        <tbody>
          ${contacts.map((item) => `
            <tr>
              <td><strong>${escapeHtml(item.name)}</strong><div class="small-text">${escapeHtml(item.phone || 'Телефон не указан')}</div>${item.email ? `<div class="small-text">${escapeHtml(item.email)}</div>` : ''}</td>
              <td>${escapeHtml(item.message || '—')}</td>
              <td>${formatDate(item.createdAt)}</td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  }

  function renderOrdersTable(orders, lawyers, options) {
    if (!orders.length) {
      return `<table><tbody><tr class="empty-row"><td>Заявок пока нет.</td></tr></tbody></table>`;
    }

    const buildLawyerOptions = (selectedId) => `
      <option value="">Не назначен</option>
      ${lawyers.map((lawyer) => `<option value="${lawyer.id}" ${lawyer.id === selectedId ? 'selected' : ''}>${escapeHtml(lawyer.name)}</option>`).join('')}`;

    return `
      <table>
        <thead>
          <tr><th>Клиент</th><th>Тема</th><th>Статус</th><th>Юрист</th><th>Дата</th></tr>
        </thead>
        <tbody>
          ${orders.map((order) => `
            <tr>
              <td><strong>${escapeHtml(order.clientName)}</strong><div class="small-text">${escapeHtml(order.phone)}</div></td>
              <td>${escapeHtml(order.topic)}</td>
              <td>${options.compact ? `<span class="pill pill-${order.status}">${statusLabels[order.status] || order.status}</span>` : `<select class="status-select" data-order-status="${order.id}">${Object.entries(statusLabels).map(([value, label]) => `<option value="${value}" ${order.status === value ? 'selected' : ''}>${label}</option>`).join('')}</select>`}</td>
              <td>${options.compact ? escapeHtml(lawyers.find((lawyer) => lawyer.id === order.lawyerId)?.name || '—') : `<select class="status-select" data-order-lawyer="${order.id}">${buildLawyerOptions(order.lawyerId)}</select>`}</td>
              <td>${formatDate(order.createdAt)}</td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  }

  function attachOrderActions(container) {
    if (!container) return;
    container.querySelectorAll('[data-order-status]').forEach((select) => {
      select.addEventListener('change', async () => {
        try {
          await updateOrder(select.dataset.orderStatus, { status: select.value });
          showToast('Статус заявки обновлён.');
          await switchView('orders');
        } catch (error) {
          showToast(error.message || 'Ошибка обновления статуса.');
        }
      });
    });

    container.querySelectorAll('[data-order-lawyer]').forEach((select) => {
      select.addEventListener('change', async () => {
        try {
          await updateOrder(select.dataset.orderLawyer, { lawyerId: select.value || null });
          showToast('Назначение юриста обновлено.');
          await switchView('orders');
        } catch (error) {
          showToast(error.message || 'Ошибка назначения юриста.');
        }
      });
    });
  }

  function openLawyerModal(id = '') {
    confirmModal.hidden = true;
    getEl('lawyerForm').reset();
    getEl('lawyerModalTitle').textContent = id ? 'Редактировать юриста' : 'Добавить юриста';
    getEl('lawyerId').value = '';

    if (!id) {
      getEl('lawyerModal').hidden = false;
      return;
    }

    fetchLawyers().then((lawyers) => {
      const lawyer = lawyers.find((item) => item.id === id);
      if (!lawyer) return;
      getEl('lawyerId').value = lawyer.id;
      getEl('lawyerName').value = lawyer.name;
      getEl('lawyerSpecialty').value = lawyer.specialty;
      getEl('lawyerPhone').value = lawyer.phone;
      getEl('lawyerEmail').value = lawyer.email;
      getEl('lawyerModal').hidden = false;
    }).catch(() => showToast('Ошибка загрузки юриста.'));
  }

  function confirmDeleteLawyer(id) {
    lawyerModal.hidden = true;
    deletingLawyerId = id;
    getEl('confirmTitle').textContent = 'Удалить юриста?';
    getEl('confirmText').textContent = 'Это действие нельзя отменить. Назначенные заявки останутся без ответственного.';
    getEl('confirmModal').hidden = false;
  }

  function closeModals() {
    getEl('lawyerModal').hidden = true;
    getEl('confirmModal').hidden = true;
    deletingLawyerId = null;
  }

  function debounce(fn, wait) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), wait);
    };
  }

  async function restoreSession() {
    try {
      const session = await checkSession();
      if (session.authenticated && session.role === 'admin') {
        await switchView(localStorage.getItem('adaltirekAdminView') || 'overview');
      } else {
        loginScreen.hidden = false;
        adminApp.hidden = true;
      }
    } catch {
      loginScreen.hidden = false;
      adminApp.hidden = true;
    }
  }

  await restoreSession();
}

document.addEventListener('DOMContentLoaded', initAdmin);
