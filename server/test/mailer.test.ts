import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGameServer } from '../src/app';
import { debugMailer, gmailMailer, resetMail } from '../src/mailer';
import { smallDict } from './helpers';

const { sendMail, createTransport } = vi.hoisted(() => {
  const sendMail = vi.fn().mockResolvedValue({});
  return { sendMail, createTransport: vi.fn(() => ({ sendMail })) };
});
vi.mock('nodemailer', () => ({ default: { createTransport } }));

afterEach(() => vi.restoreAllMocks());

describe('mailer', () => {
  it('requires both Gmail credentials', () => {
    expect(gmailMailer({})).toBeUndefined();
    expect(gmailMailer({ SMTP_USER: 'a@b.co' })).toBeUndefined();
    expect(gmailMailer({ SMTP_PASS: 'x' })).toBeUndefined();
  });

  it('uses Gmail transport and awaits sending all message fields', async () => {
    const mailer = gmailMailer({ SMTP_USER: 'a@b.co', SMTP_PASS: 'x' });
    expect(mailer?.send).toBeTypeOf('function');
    expect(createTransport).toHaveBeenLastCalledWith({ service: 'gmail', auth: { user: 'a@b.co', pass: 'x' } });
    await mailer!.send('recipient@example.com', 'subject', 'text', '<p>html</p>');
    expect(sendMail).toHaveBeenLastCalledWith({
      from: '"Xóm Lầy" <a@b.co>', to: 'recipient@example.com', subject: 'subject', text: 'text', html: '<p>html</p>',
    });
    sendMail.mockRejectedValueOnce(new Error('delivery failed'));
    await expect(mailer!.send('recipient@example.com', 'subject', 'text', 'html')).rejects.toThrow('delivery failed');
  });

  it('accepts a custom sender name', async () => {
    await gmailMailer({ SMTP_USER: 'a@b.co', SMTP_PASS: 'x', SMTP_FROM_NAME: 'Test' })!.send('to', 'subject', 'text', 'html');
    expect(sendMail).toHaveBeenLastCalledWith(expect.objectContaining({ from: '"Test" <a@b.co>' }));
  });

  it('only enables debug logging explicitly', async () => {
    expect(debugMailer({})).toBeUndefined();
    expect(debugMailer({ MAIL_DEBUG: 'true' })).toBeUndefined();
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await debugMailer({ MAIL_DEBUG: '1' })!.send('recipient@example.com', 'code 012345', 'text', 'html');
    expect(log).toHaveBeenCalledWith(expect.stringContaining('recipient@example.com'), 'code 012345');
  });

  it('includes reset instructions and escapes the display name in HTML', () => {
    const mail = resetMail('<An> & "you"', '012345');
    expect(mail.subject).toBe('Mã đặt lại mật khẩu Xóm Lầy: 012345');
    for (const body of [mail.text, mail.html]) {
      expect(body).toContain('012345');
      expect(body).toContain('hết hạn sau 10 phút');
      expect(body).toContain('Nếu không phải bạn yêu cầu, hãy bỏ qua thư này.');
    }
    expect(mail.text).toContain('<An>');
    expect(mail.html).toContain('&lt;An&gt; &amp; &quot;you&quot;');
  });

  it.each([null, { send: vi.fn() }])('reports whether mail is configured: %s', async (mailer) => {
    const server = createGameServer(smallDict(), { mailer });
    try {
      await new Promise<void>((resolve) => server.http.listen(0, '127.0.0.1', resolve));
      const address = server.http.address();
      if (!address || typeof address === 'string') throw new Error('missing server address');
      const response = await fetch(`http://127.0.0.1:${address.port}/health`);
      expect(await response.json()).toMatchObject({ ok: true, mail: !!mailer });
    } finally {
      await server.close();
    }
  });
});
