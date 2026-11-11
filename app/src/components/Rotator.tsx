import { useEffect, useState, type ReactNode } from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';
import { ViewportContext } from '../hooks';
import { C } from '../theme';

/**
 * Cờ tỷ phú chỉ có giao diện ngang. Điện thoại đang dọc thì xoay cả màn hình 90° (CSS) cho vừa khung ngang;
 * con bên trong đọc kích thước qua ViewportContext (đã hoán đổi). Cảm ứng do trình duyệt tự ánh xạ theo transform.
 * Thử khoá hướng ngang bằng screen.orientation sau lần chạm đầu tiên (thất bại thì bỏ qua).
 */
export function Rotator({ children }: { children: ReactNode }) {
  const dims = useWindowDimensions();
  const [stable, setStable] = useState({ width: dims.width, height: dims.height });
  const keyboardDrop = dims.width === stable.width && stable.height - dims.height > 150;
  if (!keyboardDrop && (stable.width !== dims.width || stable.height !== dims.height)) {
    setStable({ width: dims.width, height: dims.height });
  }
  const { width: W, height: H } = stable;
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const lock = () => {
      try {
        const o = (screen as unknown as { orientation?: { lock?: (m: string) => Promise<void> } }).orientation;
        void o?.lock?.('landscape')?.catch(() => {});
      } catch { /* bỏ qua */ }
    };
    document.addEventListener('pointerdown', lock, { once: true });
    return () => document.removeEventListener('pointerdown', lock);
  }, []);
  if (Platform.OS !== 'web' || H <= W) {
    return <ViewportContext.Provider value={null}>{children}</ViewportContext.Provider>;
  }
  const style = {
    position: 'fixed', left: 0, top: 0, width: H, height: W, transformOrigin: '0 0', transform: `translateX(${W}px) rotate(90deg)`,
    backgroundColor: C.son, zIndex: 20, overflow: 'hidden',
  } as object;
  return (
    <ViewportContext.Provider value={{ width: H, height: W, rotated: true }}>
      <View style={style}>{children}</View>
    </ViewportContext.Provider>
  );
}
