import nodemailer from 'nodemailer';

export interface Mailer {
  send(to: string, subject: string, text: string, html: string): Promise<void>;
}

export function gmailMailer(env = process.env): Mailer | undefined {
  const { SMTP_USER: user, SMTP_PASS: pass } = env;
  if (!user || !pass) return undefined;
  const transport = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
  const name = (env.SMTP_FROM_NAME || 'Xóm Lầy').replace(/[\r\n]/g, '').replace(/["\\]/g, '\\$&');
  return {
    async send(to, subject, text, html) {
      await transport.sendMail({ from: `"${name}" <${user}>`, to, subject, text, html });
    },
  };
}

export function debugMailer(env = process.env): Mailer | undefined {
  if (env.MAIL_DEBUG !== '1') return undefined;
  return { async send(to, subject) { console.log(`[mail debug] ${to}`, subject); } };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function resetMail(displayName: string, code: string): { subject: string; text: string; html: string } {
  const expiry = 'Mã hết hạn sau 10 phút.';
  const ignore = 'Nếu không phải bạn yêu cầu, hãy bỏ qua thư này.';
  return {
    subject: `Mã đặt lại mật khẩu Xóm Lầy: ${code}`,
    text: `Chào ${displayName},\n\nMã đặt lại mật khẩu của bạn là: ${code}\n${expiry}\n\n${ignore}`,
    html: `<p>Chào ${escapeHtml(displayName)},</p><p>Mã đặt lại mật khẩu của bạn là: <strong>${escapeHtml(code)}</strong></p><p>${expiry}</p><p>${ignore}</p>`,
  };
}
