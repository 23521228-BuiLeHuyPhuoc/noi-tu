/**
 * Trạng thái "lầy" tạm thời gắn với từng người chơi: tâm trạng khuôn mặt, hình vẽ bậy, biệt danh, bùa may mắn.
 * Chỉ để vui (không bao giờ ảnh hưởng ván chơi). Mỗi mục tự hết hạn.
 */
import { useSyncExternalStore } from 'react';
import type { DoodleKind, Mood, NicknameId } from '../../shared/src/types';

type Entry<T> = { value: T; until: number };

export type WobbleKind = 'spin' | 'shake' | 'blackout';
/** màu phủ lên avatar: cháy đen (sét), băng, đỏ mặt (hôn gió) */
export type TintKind = 'burnt' | 'ice' | 'blush';

const mood = new Map<string, Entry<Mood>>();
const doodle = new Map<string, Entry<DoodleKind>>();
const nick = new Map<string, Entry<NicknameId>>();
const charm = new Map<string, Entry<true>>();
const wobble = new Map<string, Entry<WobbleKind>>();
const tint = new Map<string, Entry<TintKind>>();

let version = 0;
const listeners = new Set<() => void>();
const emit = () => {
  version++;
  for (const l of listeners) l();
};

function put<T>(map: Map<string, Entry<T>>, id: string, value: T, ms: number) {
  const until = Date.now() + ms;
  map.set(id, { value, until });
  setTimeout(() => {
    const e = map.get(id);
    if (e && e.until <= Date.now() + 30) {
      map.delete(id);
      emit();
    }
  }, ms + 40);
  emit();
}

export const setMood = (id: string, m: Mood, ms = 3000) => put(mood, id, m, ms);
export const setDoodle = (id: string, d: DoodleKind, ms: number) => put(doodle, id, d, ms);
export const setNick = (id: string, n: NicknameId, ms: number) => put(nick, id, n, ms);
export const setCharm = (id: string, ms: number) => put(charm, id, true, ms);
export const setWobble = (id: string, w: WobbleKind, ms = 3000) => put(wobble, id, w, ms);
export const setTint = (id: string, t: TintKind, ms: number) => put(tint, id, t, ms);

const live = <T,>(map: Map<string, Entry<T>>, id: string): T | undefined => {
  const e = map.get(id);
  return e && e.until > Date.now() ? e.value : undefined;
};

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
const snapshot = () => version;

export type Face = { mood: Mood; doodle?: DoodleKind; nick?: NicknameId; charm: boolean; wobble?: WobbleKind; tint?: TintKind };

/** Tâm trạng/hình vẽ/biệt danh/bùa/rung xoay còn hiệu lực của một người; component tự vẽ lại khi có đổi hoặc hết hạn */
export function useFace(id: string): Face {
  useSyncExternalStore(subscribe, snapshot, snapshot);
  return {
    mood: live(mood, id) ?? 'normal',
    doodle: live(doodle, id),
    nick: live(nick, id),
    charm: !!live(charm, id),
    wobble: live(wobble, id),
    tint: live(tint, id),
  };
}
