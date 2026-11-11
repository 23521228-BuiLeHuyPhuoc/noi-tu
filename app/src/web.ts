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
export function vibrate(ms: number | number[] = 120): void {
  if (isWeb && 'vibrate' in navigator) {
    try {
      navigator.vibrate(ms);
    } catch {
      // bỏ qua
    }
  }
}

type VirtualKeyboardLike = EventTarget & { overlaysContent: boolean; boundingRect: { height: number } };

/**
 * Theo dõi chiều cao bàn phím ảo (px, 0 khi đóng) mà KHÔNG làm đổi bố cục của app:
 * Android Chrome dùng VirtualKeyboard API (cùng meta `interactive-widget=overlays-content`),
 * iOS Safari dùng VisualViewport. Chỉ những thành phần cần thấy ô nhập mới tự nâng mình lên.
 */
export function subscribeKeyboard(cb: (inset: number) => void): () => void {
  if (!isWeb) return () => {};
  const vk = (navigator as unknown as { virtualKeyboard?: VirtualKeyboardLike }).virtualKeyboard;
  const vv = window.visualViewport;
  if (vk) vk.overlaysContent = true;
  const read = () => {
    let inset = vk?.boundingRect ? vk.boundingRect.height : 0;
    if (vv && vv.scale <= 1.01) inset = Math.max(inset, window.innerHeight - vv.height - vv.offsetTop);
    cb(inset > 80 ? Math.round(inset) : 0);
  };
  const raf = requestAnimationFrame(read);
  vk?.addEventListener('geometrychange', read);
  vv?.addEventListener('resize', read);
  vv?.addEventListener('scroll', read);
  return () => {
    cancelAnimationFrame(raf);
    vk?.removeEventListener('geometrychange', read);
    vv?.removeEventListener('resize', read);
    vv?.removeEventListener('scroll', read);
  };
}

/**
 * Thu nhỏ ảnh về khung vuông `size` px (cắt giữa) rồi trả về JPEG base64 (data URL) — chỉ trên web.
 * Ảnh nhỏ (~20 KB) nên gửi thẳng qua kết nối game, đổi ảnh được cả giữa ván.
 */
export async function squareJpeg(src: Blob | string, size = 256, quality = 0.85): Promise<string | null> {
  if (!isWeb || typeof document === 'undefined') return null;
  const url = typeof src === 'string' ? src : URL.createObjectURL(src);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('load'));
      el.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    if (!side) return null;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return null;
  } finally {
    if (typeof src !== 'string') URL.revokeObjectURL(url);
  }
}
