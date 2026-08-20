const statusLabels = { new: 'Новая', in_progress: 'В работе', closed: 'Закрыта' };
let toastTimer = null;

function getEl(id) {
  return document.getElementById(id);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

async function showToast(message) {
  const toast = getEl('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 2800);
}

async function initLawyer() {
  const loginSection = getEl('loginSection');
  const dashboardSection = getEl('dashboardSection');
  const loginForm = getEl('loginForm');
  const logoutBtn = getEl('logoutBtn');
  const loginError = getEl('loginError');

  function showLogin() {
    loginSection.hidden = false;
    dashboardSection.hidden = true;
  }

  function showDashboard() {
    loginSection.hidden = true;
    dashboardSection.hidden = false;
  }

  async function loadAccount() {
    try {
      const data = await fetchLawyerAccount();
      getEl('lawyerNameDisplay').textContent = data.profile.name || 'Юрист';
      getEl('lawyerName').textContent = data.profile.name || '—';
      getEl('lawyerLogin').textContent = data.profile.username || '—';
      getEl('lawyerNewCount').textContent = data.orders.filter((o) => o.status !== 'closed').length;
      renderOrders(data.orders);
      showDashboard();
    } catch (err) {
      showLogin();
    }
  }

  function renderOrders(orders) {
    const container = getEl('lawyerOrders');
    if (!orders || orders.length === 0) {
      container.innerHTML = '<div class="empty-state">Пока нет назначенных заявок.</div>';
      return;
    }

    const rows = orders.map((order) => {
      return `
        <tr>
          <td><strong>${escapeHtml(order.clientName)}</strong><div class="small-text">${escapeHtml(order.phone)}</div></td>
          <td>${escapeHtml(order.topic)}</td>
          <td>${escapeHtml(order.createdAt)}</td>
          <td>
            <select class="status-select" data-order-id="${order.id}">
              ${Object.entries(statusLabels)
                .map(([value, label]) => `<option value="${value}" ${order.status === value ? 'selected' : ''}>${label}</option>`)
                .join('')}
            </select>
          </td>
        </tr>`;
    }).join('');

    container.innerHTML = `
      <table>
        <thead><tr><th>Клиент</th><th>Тема</th><th>Дата</th><th>Статус</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;

    container.querySelectorAll('[data-order-id]').forEach((select) => {
      select.addEventListener('change', async () => {
        const orderId = select.dataset.orderId;
        try {
          await updateOrder(orderId, { status: select.value });
          await loadAccount();
          showToast('Статус заявки сохранен');
        } catch (err) {
          showToast(err.message || 'Не удалось обновить статус');
        }
      });
    });
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = getEl('loginUser').value.trim();
    const password = getEl('loginPass').value;
    try {
      const result = await login(username, password);
      if (result.role === 'lawyer') {
        loginError.hidden = true;
        loginForm.reset();
        await loadAccount();
        return;
      }
      loginError.textContent = 'Только юрист может войти сюда.';
      loginError.hidden = false;
    } catch (err) {
      loginError.textContent = err.message || 'Ошибка входа';
      loginError.hidden = false;
    }
  });

  logoutBtn.addEventListener('click', async () => {
    await logout();
    showLogin();
  });

  await loadAccount();
}

document.addEventListener('DOMContentLoaded', initLawyer);
