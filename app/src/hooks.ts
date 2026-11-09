import { useEffect, useRef, useState } from 'react';

/** Số giây còn lại tới mốc `endsAt` (ms, đồng hồ server) */
export function useSecondsLeft(endsAt: number | null, offset: number, max = 999): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!endsAt) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [endsAt]);
  if (!endsAt) return 0;
  return Math.min(max, Math.max(0, Math.ceil((endsAt - (now + offset)) / 1000)));
}

/**
 * Gọi `fn(item)` cho mỗi phần tử mới xuất hiện ở cuối danh sách (không phát lại các phần tử đã có
 * lúc màn hình vừa mở). Dùng để phát âm thanh/câu bình luận khi có sự kiện mới.
 */
export function useOnNew<T>(list: T[], fn: (item: T) => void): void {
  const seen = useRef(list.length);
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });
  useEffect(() => {
    if (list.length < seen.current) seen.current = 0;
    for (let i = seen.current; i < list.length; i++) fnRef.current(list[i]);
    seen.current = list.length;
  }, [list]);
}

/** Gọi `fn` mỗi khi `key` đổi (bỏ qua lần đầu) */
export function useOnChange<K>(key: K, fn: (key: K) => void): void {
  const prev = useRef(key);
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });
  useEffect(() => {
    if (prev.current !== key) {
      prev.current = key;
      fnRef.current(key);
    }
  }, [key]);
}
