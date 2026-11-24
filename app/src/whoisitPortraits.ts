/**
 * Bộ render chân dung SVG đa nguồn cho game Đoán Ai Đây? (`who_is_it`).
 * Hỗ trợ 7 gói nét vẽ trong `app/src/whoisitArt/` và cache theo `${pack}:${c.id}:${c.seed}`.
 */
import type { WhoIsItArtPackId, WhoIsItCharacter } from '../../shared/src/whoisit';
import { whoIsItPortraitSvg } from './whoisitArt';

const portraitCache = new Map<string, string>();

export function whoIsItPortraitUri(c: WhoIsItCharacter, pack: WhoIsItArtPackId = 'avataaars'): string {
  const key = `${pack}:${c.id}:${c.seed}`;
  const hit = portraitCache.get(key);
  if (hit) return hit;

  const svg = whoIsItPortraitSvg(c, pack);
  const uri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  // Giới hạn kích thước cache để tránh phình RAM khi chơi nhiều ván liên tiếp
  if (portraitCache.size > 400) {
    portraitCache.clear();
  }
  portraitCache.set(key, uri);
  return uri;
}
