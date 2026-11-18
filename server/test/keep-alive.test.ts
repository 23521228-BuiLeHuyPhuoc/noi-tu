import { afterEach, describe, expect, it, vi } from 'vitest';
import { keepAliveUrl, startKeepAlive } from '../src/keepAlive';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('keepAliveUrl', () => {
  it('chỉ bật khi chạy trên Render (có RENDER_EXTERNAL_URL)', () => {
    expect(keepAliveUrl({})).toBeUndefined();
    expect(keepAliveUrl({ RENDER_EXTERNAL_URL: 'https://noi-tu-server-sg.onrender.com' }))
      .toBe('https://noi-tu-server-sg.onrender.com/health');
    expect(keepAliveUrl({ RENDER_EXTERNAL_URL: 'https://x.onrender.com/' })).toBe('https://x.onrender.com/health');
  });

  it('tắt được bằng KEEP_ALIVE=0', () => {
    expect(keepAliveUrl({ RENDER_EXTERNAL_URL: 'https://x.onrender.com', KEEP_ALIVE: '0' })).toBeUndefined();
  });
});

describe('startKeepAlive', () => {
  it('gọi /health mỗi chu kỳ và dừng khi được yêu cầu', async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    const stop = startKeepAlive('https://x.onrender.com/health', 600_000, fetchFn);

    await vi.advanceTimersByTimeAsync(599_999);
    expect(fetchFn).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls[0][0]).toBe('https://x.onrender.com/health');
    await vi.advanceTimersByTimeAsync(600_000);
    expect(fetchFn).toHaveBeenCalledTimes(2);

    stop();
    await vi.advanceTimersByTimeAsync(3_600_000);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('lỗi mạng hoặc mã lỗi HTTP chỉ ghi cảnh báo, không làm sập server', async () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchFn = vi.fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce(new Response('', { status: 503 }));
    const stop = startKeepAlive('https://x.onrender.com/health', 1_000, fetchFn);

    await vi.advanceTimersByTimeAsync(2_000);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledTimes(2);
    stop();
  });
});
