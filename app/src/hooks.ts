import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { useWindowDimensions, type View } from 'react-native';
import { subscribeKeyboard } from './web';

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

/** Chiều cao bàn phím ảo hiện tại (px); 0 khi đóng hoặc không phải web */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);
  useEffect(() => subscribeKeyboard(setInset), []);
  return inset;
}

/**
 * Số px cần nâng một khối (vd: hàng ô nhập) lên để không bị bàn phím che; 0 nếu đã nằm trên bàn phím.
 * Chỉ khối đó dịch bằng transform, mọi thứ khác trong màn hình giữ nguyên vị trí.
 */
export function useKeyboardLift(ref: React.RefObject<ComponentRef<typeof View> | null>): number {
  const [lift, setLift] = useState(0);
  const liftRef = useRef(0);
  useEffect(
    () =>
      subscribeKeyboard((inset) => {
        const el = ref.current as unknown as HTMLElement | null;
        let next = 0;
        if (inset > 0 && el?.getBoundingClientRect) {
          const base = el.getBoundingClientRect().bottom + liftRef.current;
          next = Math.max(0, Math.round(base + 10 - (window.innerHeight - inset)));
        }
        liftRef.current = next;
        setLift(next);
      }),
    [ref],
  );
  return lift;
}

/**
 * Kích thước cửa sổ ỔN ĐỊNH khi bàn phím ảo mở. react-native-web lấy chiều cao từ VisualViewport nên trên iOS
 * chiều cao tụt ~300px khi gõ chữ, làm cả màn hình tính lại bố cục (avatar co lại, ô co dãn...).
 * Hook này bỏ qua đợt tụt chiều cao lớn mà chiều rộng không đổi (chỉ có thể là bàn phím).
 */
export function useStableWindow(): { width: number; height: number } {
  const dims = useWindowDimensions();
  const [stable, setStable] = useState({ width: dims.width, height: dims.height });
  const keyboardDrop = dims.width === stable.width && stable.height - dims.height > 150;
  if (!keyboardDrop && (stable.width !== dims.width || stable.height !== dims.height)) {
    setStable({ width: dims.width, height: dims.height });
  }
  return stable;
}
