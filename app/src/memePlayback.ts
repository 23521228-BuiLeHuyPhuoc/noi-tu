import type { PublicPlayer, RoomState, VoicePersonaId } from '../../shared/src/types';
import { ALL_MEME_IDS, MEME_BY_ID, MEME_POOLS, VOICE_PERSONA_META, type MemeId, type MemePersona, type MemePoolKey } from './audioAssets';
import { POOL_TONE, autoMemeIds, memeTones } from './memeMoods';

import type { PortraitSource } from './avatars';

export interface MemeOptions {
  force?: boolean;
  cooldownMs?: number;
  speakerId?: string | null;
  persona?: MemePersona;
}
export interface ActiveMemePlayback {
  id: MemeId;
  persona: MemePersona;
  speakerId: string | null;
  speakerName: string | null;
  speakerPortrait: PortraitSource | null;
  quote: string;
  label: string;
  startedAt: number;
  seq: number;
}

let roomCode: string | null = null;
let players: readonly PublicPlayer[] = [];
let me: string | null = null;
let fallback: string | null = null;
let active: ActiveMemePlayback | null = null;
let generation = 0;
let tail: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const bags = new Map<string, MemeId[]>();
const lastPick = new Map<string, MemeId>();
const playedAt = new Map<MemeId, number>();
let playCount = 0;

export function setRoomVoiceContext(room: RoomState | null, meId: string | null) {
  if (roomCode !== (room?.code ?? null)) {
    resetPlayback();
    fallback = null;
  }
  roomCode = room?.code ?? null;
  players = room?.players ?? [];
  me = meId;
}
export function setActiveSpeakerFallback(playerId: string | null) { fallback = playerId; }
export function getActiveMeme() { return active; }
export function subscribeActiveMeme(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
function publish(value: ActiveMemePlayback | null) {
  if (active === value) return;
  active = value;
  listeners.forEach((listener) => listener());
}
export function resolveSpeaker(opts?: MemeOptions) {
  const id = opts?.speakerId === undefined ? fallback ?? me : opts.speakerId;
  const player = players.find((candidate) => candidate.id === id);
  return { persona: opts?.persona ?? player?.voice, speakerId: player?.id ?? null, speakerName: player?.name ?? null, speakerPortrait: player ?? null, narrator: id == null };
}
function shuffled(ids: readonly MemeId[]): MemeId[] {
  const bag = [...ids];
  for (let index = bag.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [bag[index], bag[other]] = [bag[other], bag[index]];
  }
  return bag;
}
/**
 * Túi xáo: mỗi lần phát rút một câu ra khỏi túi; phải phát hết cả túi mới xáo lại túi mới,
 * nên trong một vòng không câu nào lặp lại. Trả null nếu túi không còn câu nào hợp hành động.
 */
function takeFromBag(key: string, all: readonly MemeId[], allowed: ReadonlySet<MemeId> | null): MemeId | null {
  if (!all.length) return null;
  let bag = bags.get(key);
  if (!bag?.length) {
    bag = shuffled(all);
    const last = lastPick.get(key);
    if (bag.length > 1 && bag[0] === last) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
    bags.set(key, bag);
  }
  const at = allowed ? bag.findIndex((id) => allowed.has(id)) : 0;
  if (at < 0) return null;
  const [pick] = bag.splice(at, 1);
  playedAt.set(pick, ++playCount);
  lastPick.set(key, pick);
  return pick;
}
function leastRecent(all: readonly MemeId[], allowed: ReadonlySet<MemeId> | null): MemeId | null {
  const fits = allowed ? all.filter((id) => allowed.has(id)) : all;
  if (!fits.length) return null;
  const pick = fits.reduce((a, b) => ((playedAt.get(a) ?? -1) <= (playedAt.get(b) ?? -1) ? a : b));
  playedAt.set(pick, ++playCount);
  return pick;
}
const TONES = memeTones();
const AUTO_BY_PERSONA = new Map<MemePersona, MemeId[]>();
for (const id of autoMemeIds()) {
  const persona = MEME_BY_ID[id].persona;
  AUTO_BY_PERSONA.set(persona, [...(AUTO_BY_PERSONA.get(persona) ?? []), id]);
}
const POOL_SETS = new Map<MemePoolKey, ReadonlySet<MemeId>>(
  (Object.keys(MEME_POOLS) as MemePoolKey[]).map((pool) => [pool, new Set(MEME_POOLS[pool])]),
);
/**
 * Mỗi giọng có 2 túi: câu VUI và câu BUỒN/TỨC. Hành động rút từ túi cùng sắc thái
 * (vd mua nhà rút túi vui, mất tiền rút túi buồn/tức); túi đó hết câu hợp mới thử túi kia,
 * rồi mới lấy câu hợp đã phát lâu nhất.
 */
function drawToned(base: string, all: readonly MemeId[], pool: MemePoolKey): MemeId | null {
  const allowed = POOL_SETS.get(pool) ?? null;
  const tone = POOL_TONE[pool];
  for (const t of [tone, tone === 'vui' ? 'buon' : 'vui'] as const) {
    const pick = takeFromBag(`${base}:${t}`, all.filter((id) => TONES.get(id) === t), allowed);
    if (pick) return pick;
  }
  return leastRecent(all, allowed);
}
export function drawMeme(pool: MemePoolKey | 'all' | 'preview', persona?: MemePersona): MemeId | null {
  if (pool === 'preview' && persona && persona !== 'game_fx') return takeFromBag(`preview:${persona}`, VOICE_PERSONA_META[persona].previewIds, null);
  if (pool === 'all' || pool === 'preview') {
    return takeFromBag(`all:${persona ?? '*'}`, persona ? ALL_MEME_IDS.filter((id) => MEME_BY_ID[id].persona === persona) : ALL_MEME_IDS, null);
  }
  if (!persona) return null;
  return drawToned(`voice:${persona}`, AUTO_BY_PERSONA.get(persona) ?? [], pool);
}
/** Giọng dẫn chuyện cho sự kiện không gắn với ai: hiệu ứng + các giọng chưa người chơi nào giữ. */
function narratorVoices(): MemePersona[] {
  const taken = new Set(players.map((player) => player.voice));
  return ['game_fx', ...(Object.keys(VOICE_PERSONA_META) as VoicePersonaId[]).filter((voice) => !taken.has(voice))];
}
function drawNarrator(pool: MemePoolKey): MemeId | null {
  const voices = narratorVoices();
  return drawToned(`narrator[${voices.join(',')}]`, voices.flatMap((voice) => AUTO_BY_PERSONA.get(voice) ?? []), pool);
}
export function drawForSpeaker(pool: MemePoolKey | 'all' | 'preview', speaker: ReturnType<typeof resolveSpeaker>) {
  if (pool === 'all' || pool === 'preview') return drawMeme(pool, speaker.persona);
  if (speaker.persona) return drawMeme(pool, speaker.persona);
  if (speaker.speakerId) return null;
  // Sự kiện không gắn với ai thì dẫn chuyện; người nói chưa có trong phòng (đang tải) thì chỉ hiệu ứng.
  return speaker.narrator ? drawNarrator(pool) : drawMeme(pool, 'game_fx');
}
export function resetPlayback() {
  generation++;
  clearTimeout(tail);
  publish(null);
  return generation;
}
export function isCurrentPlayback(seq: number) { return seq === generation; }
export function markPlaying(seq: number, id: MemeId, speaker: ReturnType<typeof resolveSpeaker>) {
  if (!isCurrentPlayback(seq)) return;
  const { quote, label, persona } = MEME_BY_ID[id];
  publish({ id, persona, quote, label, speakerId: speaker.speakerId, speakerName: speaker.speakerName, speakerPortrait: speaker.speakerPortrait, seq, startedAt: Date.now() });
}
export function markEnded(seq: number) {
  if (!isCurrentPlayback(seq)) return;
  clearTimeout(tail);
  tail = setTimeout(() => { if (isCurrentPlayback(seq)) resetPlayback(); }, 400);
}
