/** Các tiện ích riêng cho bản web chạy trên trình duyệt điện thoại. */
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';

/** Mã phòng trong link mời: https://.../?room=ABC123 */
export function getInviteCode(): string | null {
  if (!isWeb) return null;
  const code = new URLSearchParams(window.location.search).get('room');
  return code && /^[A-Za-z0-9]{6}$/.test(code) ? code.toUpperCase() : null;
}

/** Xóa ?room= khỏi thanh địa chỉ (sau khi đã vào phòng hoặc thoát phòng) */
export function clearInviteParam(): void {
  if (isWeb && window.location.search) window.history.replaceState(null, '', window.location.pathname);
}

export function inviteLink(code: string): string | null {
  return isWeb ? `${window.location.origin}/?room=${code}` : null;
}

/**
 * Chia sẻ link mời: dùng bảng chia sẻ của điện thoại (Zalo, Messenger...) nếu có,
 * không thì sao chép link vào bộ nhớ tạm.
 */
export async function shareInvite(code: string): Promise<'shared' | 'copied' | 'failed'> {
  const link = inviteLink(code);
  const text = `Vào chơi Nối Từ với mình nhé! Mã phòng: ${code}`;
  if (!isWeb || !link) return 'failed';
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Nối Từ', text, url: link });
      return 'shared';
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return 'failed'; // người dùng đóng bảng chia sẻ
    }
  }
  return (await copyText(`${text}\n${link}`)) ? 'copied' : 'failed';
}

export async function copyText(text: string): Promise<boolean> {
  if (!isWeb) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Rung nhẹ (Android). iPhone không hỗ trợ thì bỏ qua. */
export function vibrate(ms = 120): void {
  if (isWeb && 'vibrate' in navigator) {
    try {
      navigator.vibrate(ms);
    } catch {
      // bỏ qua
    }
  }
}
