/**
 * Chế độ "⚡ Siêu mượt" & Map cá nhân cục bộ (lưu máy người dùng).
 * Giúp máy yếu hoặc phòng 12 người luôn chạy mượt bằng cách giảm số hạt trang trí & hiệu ứng đồng thời.
 */
import { useSyncExternalStore } from 'react';
import { storage } from './storage';

function detectLowSpecDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return true;
    const cores = navigator.hardwareConcurrency;
    const mem = (navigator as { deviceMemory?: number }).deviceMemory;
    if ((typeof cores === 'number' && cores > 0 && cores <= 4) || (typeof mem === 'number' && mem > 0 && mem <= 4)) {
      return true;
    }
  } catch {
    // bỏ qua nếu trình duyệt chặn thông tin phần cứng
  }
  return false;
}

let smooth = detectLowSpecDevice();
let userOverrodeSmooth = false;
let autoMonitorStarted = false;
let localTheme: string | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function notify() {
  for (const cb of listeners) cb();
}

/**
 * Tự động đo tốc độ khung hình thực tế trong lúc chơi:
 * nhiều điện thoại / laptop card tích hợp có 8 nhân tiết kiệm điện (hardwareConcurrency = 8) nhưng GPU yếu,
 * nếu phát hiện sụt khung hình kéo dài (< 36fps trong cửa sổ 60 frame khi tab đang hiển thị) thì tự bật Siêu Mượt!
 */
function startAutoFpsGuard() {
  if (
    autoMonitorStarted ||
    typeof window === 'undefined' ||
    typeof requestAnimationFrame === 'undefined' ||
    typeof document === 'undefined'
  ) {
    return;
  }
  if (navigator.webdriver) return;
  autoMonitorStarted = true;

  let lastTs = 0;
  let totalFrames = 0;
  let slowFrames = 0;
  let checksLeft = 240; // theo dõi ~4 giây đầu khi tương tác thực tế

  const step = (ts: number) => {
    if (smooth || userOverrodeSmooth || checksLeft <= 0) return;
    if (document.visibilityState === 'visible') {
      if (lastTs > 0) {
        const dt = ts - lastTs;
        // Bỏ qua bước nhảy lớn > 220ms do chuyển tab hoặc nạp chunk lần đầu
        if (dt > 0 && dt < 220) {
          totalFrames++;
          if (dt > 29) slowFrames++;
          if (totalFrames >= 48) {
            if (slowFrames >= 18) {
              smooth = true;
              notify();
              return;
            }
            totalFrames = 0;
            slowFrames = 0;
          }
          checksLeft--;
        }
      }
      lastTs = ts;
    } else {
      lastTs = 0;
    }
    requestAnimationFrame(step);
  };

  setTimeout(() => {
    if (!smooth && !userOverrodeSmooth) requestAnimationFrame(step);
  }, 1200);
}

export function initPrefs() {
  if (loaded) return;
  loaded = true;
  startAutoFpsGuard();
  void storage.getSmoothModePref().then((v) => {
    if (v !== null) {
      userOverrodeSmooth = true;
      if (v !== smooth) {
        smooth = v;
        notify();
      }
    }
  });
  void storage.getTheme().then((t) => {
    if (t !== localTheme) {
      localTheme = t;
      notify();
    }
  });
}

export function getSmoothModeSync(): boolean {
  return smooth;
}

export function setSmoothModeSync(next: boolean): void {
  userOverrodeSmooth = true;
  if (smooth === next) return;
  smooth = next;
  void storage.setSmoothMode(next);
  notify();
}

export function getLocalThemeSync(): string | null {
  return localTheme;
}

export function setLocalThemeSync(themeId: string | null): void {
  if (localTheme === themeId) return;
  localTheme = themeId;
  void storage.setTheme(themeId);
  notify();
}

function subscribe(cb: () => void) {
  initPrefs();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useSmoothMode(): [boolean, (v: boolean) => void] {
  const val = useSyncExternalStore(subscribe, () => smooth, () => smooth);
  return [val, setSmoothModeSync];
}

export function useLocalTheme(): [string | null, (t: string | null) => void] {
  const val = useSyncExternalStore(subscribe, () => localTheme, () => localTheme);
  return [val, setLocalThemeSync];
}
