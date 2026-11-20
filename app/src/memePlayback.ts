import type { PublicPlayer, RoomState, VoicePersonaId } from '../../shared/src/types';
import { ALL_MEME_IDS, MEME_BY_ID, MEME_POOLS, VOICE_PERSONA_META, type MemeId, type MemePersona, type MemePoolKey } from './audioAssets';

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
const recent: MemeId[] = [];
const RECENT_LIMIT = 12;

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
/** Rút hết túi mới xáo lại; trong túi ưu tiên câu chưa phát gần đây, nếu đều mới phát thì lấy câu phát lâu nhất. */
function drawFrom(key: string, source: readonly MemeId[]): MemeId | null {
  if (!source.length) return null;
  let bag = bags.get(key);
  if (!bag?.length) {
    bag = shuffled(source);
    bags.set(key, bag);
  }
  let pickAt = 0;
  let lastHeard = Infinity;
  bag.forEach((id, index) => {
    const heard = recent.lastIndexOf(id);
    if (heard < lastHeard) {
      lastHeard = heard;
      pickAt = index;
    }
  });
  const [pick] = bag.splice(pickAt, 1);
  recent.push(pick);
  if (recent.length > RECENT_LIMIT) recent.shift();
  return pick;
}
export function drawMeme(pool: MemePoolKey | 'all' | 'preview', persona?: MemePersona): MemeId | null {
  const source = pool === 'preview' && persona && persona !== 'game_fx' ? VOICE_PERSONA_META[persona].previewIds
    : pool === 'all' || pool === 'preview' ? ALL_MEME_IDS : MEME_POOLS[pool];
  return drawFrom(`${persona ?? '*'}:${pool}`, persona ? source.filter((id) => MEME_BY_ID[id].persona === persona) : source);
}
/** Giọng dẫn chuyện cho sự kiện không gắn với ai: hiệu ứng + các giọng chưa người chơi nào giữ. */
function narratorVoices(): MemePersona[] {
  const taken = new Set(players.map((player) => player.voice));
  return ['game_fx', ...(Object.keys(VOICE_PERSONA_META) as VoicePersonaId[]).filter((voice) => !taken.has(voice))];
}
function drawNarrator(pool: MemePoolKey): MemeId | null {
  const voices = narratorVoices();
  return drawFrom(`narrator[${voices.join(',')}]:${pool}`, MEME_POOLS[pool].filter((id) => voices.includes(MEME_BY_ID[id].persona)));
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
