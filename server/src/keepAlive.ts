/**
 * Gói Free của Render cho server "ngủ" sau 15 phút không có request nào từ ngoài vào.
 * Server tự gọi /health qua địa chỉ công khai: request đi vòng qua proxy của Render nên được tính là
 * request từ ngoài, nhờ vậy server không ngủ.
 * RENDER_EXTERNAL_URL do Render tự đặt; chạy trên máy (không có biến này) thì không ping.
 * Tắt hẳn bằng KEEP_ALIVE=0.
 */
export function keepAliveUrl(env: Record<string, string | undefined>): string | undefined {
  if (env.KEEP_ALIVE === '0') return undefined;
  const base = env.RENDER_EXTERNAL_URL?.trim();
  return base ? `${base.replace(/\/+$/, '')}/health` : undefined;
}

/** Gọi `url` mỗi `intervalMs` (mặc định 10 phút, dưới mốc ngủ 15 phút của Render). Trả về hàm dừng. */
export function startKeepAlive(url: string, intervalMs = 10 * 60_000, fetchFn: typeof fetch = fetch): () => void {
  const timer = setInterval(() => {
    fetchFn(url, { signal: AbortSignal.timeout(30_000) })
      .then((res) => { if (!res.ok) console.warn(`Tự ping ${url}: HTTP ${res.status}`); })
      .catch((e: unknown) => console.warn(`Tự ping ${url} lỗi:`, (e as Error).message));
  }, intervalMs);
  // không giữ tiến trình sống chỉ vì bộ hẹn giờ này
  timer.unref();
  return () => clearInterval(timer);
}
