const nodemailer = require('nodemailer');

const NOTIFY_TO = process.env.CONTACT_NOTIFY_EMAIL || 'adaltirek@gmail.com';

let transporter = null;
if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
} else {
  console.warn('GMAIL_USER / GMAIL_APP_PASSWORD не заданы — уведомления по почте о новых заявках отключены.');
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sendContactNotification(contact) {
  if (!transporter) return;

  const receivedAt = new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; border: 1px solid #e2d6c3; border-radius: 8px; overflow: hidden;">
      <div style="background: #241611; color: #d4a16d; padding: 16px 20px; font-size: 16px; font-weight: bold;">
        Новая заявка с сайта ADALTIREK
      </div>
      <div style="padding: 20px; color: #241611;">
        <p style="margin: 0 0 12px;"><strong>Имя:</strong> ${escapeHtml(contact.name)}</p>
        <p style="margin: 0 0 12px;"><strong>Телефон:</strong> ${escapeHtml(contact.phone)}</p>
        <p style="margin: 0 0 12px;"><strong>E-mail:</strong> ${contact.email ? escapeHtml(contact.email) : '—'}</p>
        <p style="margin: 0 0 12px;"><strong>Вопрос:</strong><br>${contact.message ? escapeHtml(contact.message) : '—'}</p>
        <p style="margin: 16px 0 0; color: #8a7a68; font-size: 12px;">Получено: ${receivedAt}</p>
      </div>
    </div>
  `.trim();

  const text = [
    'Новая заявка с сайта ADALTIREK',
    '',
    `Имя: ${contact.name}`,
    `Телефон: ${contact.phone}`,
    `E-mail: ${contact.email || '—'}`,
    `Вопрос: ${contact.message || '—'}`,
    '',
    `Получено: ${receivedAt}`,
  ].join('\n');

  await transporter.sendMail({
    from: `"Заявки ADALTIREK" <${process.env.GMAIL_USER}>`,
    to: NOTIFY_TO,
    replyTo: contact.email || undefined,
    subject: `Новая заявка от ${contact.name}`,
    text,
    html,
  });
}

module.exports = { sendContactNotification };
