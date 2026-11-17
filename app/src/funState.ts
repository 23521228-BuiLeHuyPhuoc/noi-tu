/**
 * Trạng thái "lầy" tạm thời gắn với từng người chơi: tâm trạng khuôn mặt, hình vẽ bậy, biệt danh, bùa may mắn.
 * Chỉ để vui (không bao giờ ảnh hưởng ván chơi). Mỗi mục tự hết hạn.
 * Tối ưu chống lag: đăng ký & cache snapshot theo từng `playerId`, bị chọc ai thì chỉ avatar người đó vẽ lại.
 */
import { useCallback, useSyncExternalStore } from 'react';
import type { DoodleKind, Mood, NicknameId } from '../../shared/src/types';
import type { AvatarSide } from '../../shared/src/pokes';

type Entry<T> = { value: T; until: number };

export type WobbleKind = 'spin' | 'shake' | 'blackout' | 'big' | 'slip';
/** màu phủ lên avatar: cháy đen (sét), băng, đỏ mặt (hôn gió) */
export type TintKind = 'burnt' | 'ice' | 'blush';

const mood = new Map<string, Entry<Mood>>();
const doodle = new Map<string, Entry<DoodleKind>>();
const nick = new Map<string, Entry<NicknameId>>();
const charm = new Map<string, Entry<true>>();
const wobble = new Map<string, Entry<WobbleKind>>();
const tint = new Map<string, Entry<TintKind>>();
/** biến hình avatar do hiệu ứng phụ của món chọc (hóa heo, hóa đá, em bé, nhốt lồng, bom, tên ngược) */
const morph = new Map<string, Entry<AvatarSide>>();

export type Face = { mood: Mood; doodle?: DoodleKind; nick?: NicknameId; charm: boolean; wobble?: WobbleKind; tint?: TintKind; morph?: AvatarSide };

const DEFAULT_FACE: Face = Object.freeze({ mood: 'normal', charm: false });
const snapshots = new Map<string, Face>();
const idListeners = new Map<string, Set<() => void>>();

const live = <T,>(map: Map<string, Entry<T>>, id: string): T | undefined => {
  const e = map.get(id);
  return e && e.until > Date.now() ? e.value : undefined;
};

function rebuildFace(id: string): Face {
  const m = live(mood, id) ?? 'normal';
  const d = live(doodle, id);
  const n = live(nick, id);
  const c = !!live(charm, id);
  const w = live(wobble, id);
  const t = live(tint, id);
  const mo = live(morph, id);
  if (m === 'normal' && !d && !n && !c && !w && !t && !mo) {
    snapshots.delete(id);
    return DEFAULT_FACE;
  }
  const next: Face = Object.freeze({
    mood: m,
    ...(d ? { doodle: d } : {}),
    ...(n ? { nick: n } : {}),
    charm: c,
    ...(w ? { wobble: w } : {}),
    ...(t ? { tint: t } : {}),
    ...(mo ? { morph: mo } : {}),
  });
  snapshots.set(id, next);
  return next;
}

function emitId(id: string) {
  rebuildFace(id);
  const subs = idListeners.get(id);
  if (!subs) return;
  for (const cb of subs) cb();
}

function put<T>(map: Map<string, Entry<T>>, id: string, value: T, ms: number) {
  const until = Date.now() + ms;
  map.set(id, { value, until });
  setTimeout(() => {
    const e = map.get(id);
    if (e && e.until <= Date.now() + 30) {
      map.delete(id);
      emitId(id);
    }
  }, ms + 40);
  emitId(id);
}

export const setMood = (id: string, m: Mood, ms = 3000) => put(mood, id, m, ms);
export const setDoodle = (id: string, d: DoodleKind, ms: number) => put(doodle, id, d, ms);
export const setNick = (id: string, n: NicknameId, ms: number) => put(nick, id, n, ms);
export const setCharm = (id: string, ms: number) => put(charm, id, true, ms);
export const setWobble = (id: string, w: WobbleKind, ms = 3000) => put(wobble, id, w, ms);
export const setTint = (id: string, t: TintKind, ms: number) => put(tint, id, t, ms);
export const setMorph = (id: string, m: AvatarSide, ms: number) => put(morph, id, m, ms);

function subscribeId(id: string, cb: () => void) {
  let set = idListeners.get(id);
  if (!set) {
    set = new Set();
    idListeners.set(id, set);
  }
  set.add(cb);
  return () => {
    const cur = idListeners.get(id);
    if (!cur) return;
    cur.delete(cb);
    if (cur.size === 0) idListeners.delete(id);
  };
}

function getFace(id: string): Face {
  return snapshots.get(id) ?? DEFAULT_FACE;
}

/** Tâm trạng/hình vẽ/biệt danh/bùa/rung xoay còn hiệu lực của một người; chỉ component của người này vẽ lại khi có đổi */
export function useFace(id: string): Face {
  const sub = useCallback((cb: () => void) => subscribeId(id, cb), [id]);
  const snap = useCallback(() => getFace(id), [id]);
  return useSyncExternalStore(sub, snap, snap);
}
