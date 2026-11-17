/**
 * Chế độ "⚡ Siêu mượt" & Map cá nhân cục bộ (lưu máy người dùng).
 * Giúp máy yếu hoặc phòng 12 người luôn chạy mượt bằng cách giảm số hạt trang trí & hiệu ứng đồng thời.
 */
import { useSyncExternalStore } from 'react';
import { storage } from './storage';

let smooth = false;
let localTheme: string | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function notify() {
  for (const cb of listeners) cb();
}

export function initPrefs() {
  if (loaded) return;
  loaded = true;
  void storage.getSmoothMode().then((v) => {
    if (v !== smooth) {
      smooth = v;
      notify();
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
