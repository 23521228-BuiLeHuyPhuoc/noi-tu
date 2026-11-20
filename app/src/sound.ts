import { Asset } from 'expo-asset';
import {
  MEME_BY_ID,
  BGM_ASSETS,
  BGM_PLAYLIST,
  MEME_ASSETS,
  type BgmId,
  type MemeId,
  type MemePoolKey,
} from './audioAssets';
import type { VoicePersonaId } from '../../shared/src/types';
import { drawForSpeaker, getActiveMeme, isCurrentPlayback, markEnded, markPlaying, resetPlayback, resolveSpeaker, type MemeOptions } from './memePlayback';
export { getActiveMeme, setActiveSpeakerFallback, setRoomVoiceContext, subscribeActiveMeme, type ActiveMemePlayback } from './memePlayback';

/** Âm thanh tổng hợp bằng Web Audio + Playlist 6 Nhạc Hát & các giọng meme lầy lội MP3. Tắt/bật được, nhớ trong máy. */
export type Sfx =
  | 'tick' | 'pop' | 'whoosh' | 'splat' | 'win' | 'dice' | 'coin' | 'error' | 'turn' | 'lose'
  | 'reveal' | 'sad' | 'punch' | 'chat' | 'ko' | 'stamp' | 'siren' | 'cash' | 'flip' | 'boom'
  | 'honk' | 'fart' | 'boing' | 'squash' | 'inksplash' | 'sparkle' | 'clink' | 'blackout'
  | 'spin' | 'quake' | 'bark' | 'zap' | 'rocket';

const KEY = 'xomlay.muted';
const KEY_BGM = 'xomlay.bgm';
const KEY_MEME = 'xomlay.meme';
const KEY_BGM_VOL = 'xomlay.bgmVol.v2';

function readBool(k: string, fallback: boolean): boolean {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const raw = localStorage.getItem(k);
    if (raw === null) return fallback;
    return raw === '1';
  } catch {
    return fallback;
  }
}

function readNum(k: string, fallback: number): number {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const raw = localStorage.getItem(k);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? Math.max(0.05, Math.min(1, n)) : fallback;
  } catch {
    return fallback;
  }
}

function writeStore(k: string, v: string): void {
  try {
    localStorage.setItem(k, v);
  } catch {
    // bỏ qua
  }
}

function shuffleCopy<T>(arr: readonly T[], avoidFirst?: T | null): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  if (copy.length > 1 && avoidFirst != null && copy[0] === avoidFirst) {
    const tmp = copy[0];
    copy[0] = copy[1];
    copy[1] = tmp;
  }
  return copy;
}

let ctx: AudioContext | null = null;
let muted = readBool(KEY, false);
let bgmEnabled = readBool(KEY_BGM, true);
let memeEnabled = readBool(KEY_MEME, true);
let bgmVolume = readNum(KEY_BGM_VOL, 0.8);
let manualBgmOverride: BgmId | null = null;
let bgmActive = false;
let currentPlaylistBgmId: BgmId | null = null;
let bgmQueue: BgmId[] = [];
let activeBgmId: BgmId | null = null;
let bgmDuckCount = 0;

let bgmEl: HTMLAudioElement | null = null;
let memeEl: HTMLAudioElement | null = null;
let memeDuckTimer: ReturnType<typeof setTimeout> | null = null;
let lastMemePlayedAt = 0;
const listeners = new Set<() => void>();
let gestureRetryInstalled = false;

function drawNextPlaylistBgm(): BgmId {
  if (bgmQueue.length === 0) {
    bgmQueue = shuffleCopy(BGM_PLAYLIST, currentPlaylistBgmId);
  }
  const next = bgmQueue.shift() ?? BGM_PLAYLIST[0];
  currentPlaylistBgmId = next;
  return next;
}

function notify(): void {
  listeners.forEach((fn) => fn());
}

export function subscribeAudioSettings(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(v: boolean): void {
  muted = v;
  writeStore(KEY, v ? '1' : '0');
  if (v) stopMeme();
  syncBgmPlayback();
  notify();
}

export function isBgmEnabled(): boolean {
  return bgmEnabled;
}

export function setBgmEnabled(v: boolean): void {
  bgmEnabled = v;
  writeStore(KEY_BGM, v ? '1' : '0');
  syncBgmPlayback();
  notify();
}

export function isMemeEnabled(): boolean {
  return memeEnabled;
}

export function setMemeEnabled(v: boolean): void {
  memeEnabled = v;
  writeStore(KEY_MEME, v ? '1' : '0');
  if (!v) stopMeme();
  notify();
}

export function getBgmVolume(): number {
  return bgmVolume;
}

export function setBgmVolume(v: number): void {
  bgmVolume = Math.max(0.05, Math.min(1, v));
  writeStore(KEY_BGM_VOL, String(bgmVolume));
  applyBgmVolume();
  notify();
}

export function getManualBgmOverride(): BgmId | null {
  return manualBgmOverride;
}

export function setManualBgmOverride(id: BgmId | null): void {
  manualBgmOverride = id;
  syncBgmPlayback();
  notify();
}

export function isBgmActive(): boolean {
  return bgmActive;
}

export function getCurrentBgmId(): BgmId | null {
  if (!bgmActive) return null;
  return manualBgmOverride ?? currentPlaylistBgmId;
}

function resolveAssetUri(mod: unknown): string | null {
  if (typeof mod === 'string') return mod;
  if (mod && typeof mod === 'object') {
    const rec = mod as { uri?: unknown; default?: unknown };
    if (typeof rec.uri === 'string') return rec.uri;
    if (typeof rec.default === 'string') return rec.default;
  }
  try {
    const uri = Asset.fromModule(mod as number).uri;
    return uri || null;
  } catch {
    return null;
  }
}

function effectiveBgmVolume(): number {
  return bgmDuckCount > 0 ? Math.max(0.03, bgmVolume * 0.32) : bgmVolume;
}

function applyBgmVolume(): void {
  if (bgmEl) {
    bgmEl.volume = effectiveBgmVolume();
  }
}

function installGestureUnlock(): void {
  if (gestureRetryInstalled || typeof window === 'undefined') return;
  gestureRetryInstalled = true;
  const retry = () => {
    gestureRetryInstalled = false;
    window.removeEventListener('pointerdown', retry, true);
    window.removeEventListener('keydown', retry, true);
    if (bgmEl && !muted && bgmEnabled && getCurrentBgmId()) {
      void bgmEl.play().catch(() => {});
    }
  };
  window.addEventListener('pointerdown', retry, true);
  window.addEventListener('keydown', retry, true);
}

function syncBgmPlayback(): void {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') return;
  const targetId = getCurrentBgmId();
  if (muted || !bgmEnabled || !targetId) {
    if (bgmEl) {
      bgmEl.pause();
    }
    return;
  }

  const uri = resolveAssetUri(BGM_ASSETS[targetId]);
  if (!uri) return;

  if (!bgmEl) {
    bgmEl = new Audio();
    bgmEl.preload = 'auto';
    bgmEl.onended = () => {
      if (!manualBgmOverride && bgmActive) {
        drawNextPlaylistBgm();
        syncBgmPlayback();
        notify();
      }
    };
  }
  bgmEl.loop = manualBgmOverride !== null;
  if (activeBgmId !== targetId || bgmEl.src !== new URL(uri, window.location.href).href) {
    activeBgmId = targetId;
    bgmEl.src = uri;
    bgmEl.currentTime = 0;
  }
  applyBgmVolume();
  void bgmEl.play().catch(() => {
    installGestureUnlock();
  });
}

export function setBgmActive(active: boolean): void {
  if (bgmActive === active) {
    if (active) syncBgmPlayback();
    return;
  }
  bgmActive = active;
  if (active && !currentPlaylistBgmId && !manualBgmOverride) {
    drawNextPlaylistBgm();
  }
  syncBgmPlayback();
  notify();
}

export function nextBgmTrack(): void {
  manualBgmOverride = null;
  drawNextPlaylistBgm();
  syncBgmPlayback();
  notify();
}

function clearMemeDuck(): void {
  if (memeDuckTimer) {
    clearTimeout(memeDuckTimer);
    memeDuckTimer = null;
  }
  bgmDuckCount = 0;
  applyBgmVolume();
}

function releaseMeme(): void {
  if (memeEl) {
    memeEl.pause();
    memeEl = null;
  }
  clearMemeDuck();
}

export function stopMeme(): void {
  resetPlayback();
  releaseMeme();
}

export function playMeme(id: MemeId, opts?: MemeOptions): void {
  if (muted || !memeEnabled || typeof Audio === 'undefined') return;
  if (!opts?.force && Date.now() - lastMemePlayedAt < (opts?.cooldownMs ?? 1350)) return;
  const speaker = resolveSpeaker(opts);
  if (speaker.persona && MEME_BY_ID[id].persona !== speaker.persona) return;
  const seq = resetPlayback();
  releaseMeme();
  lastMemePlayedAt = Date.now();
  const uri = resolveAssetUri(MEME_ASSETS[id]);
  if (!uri) return;
  try {
    const el = new Audio(uri);
    memeEl = el;
    bgmDuckCount = 1;
    applyBgmVolume();
    el.onended = () => {
      if (memeEl !== el) return;
      memeEl = null;
      clearMemeDuck();
      markEnded(seq);
    };
    const fail = () => { if (memeEl === el) stopMeme(); };
    el.onerror = fail;
    memeDuckTimer = setTimeout(stopMeme, 7500);
    void el.play().then(() => { if (memeEl === el) markPlaying(seq, id, speaker); }).catch(fail);
  } catch { if (isCurrentPlayback(seq)) stopMeme(); }
}

function playFromBag(pool: MemePoolKey | 'all' | 'preview', opts?: MemeOptions): void {
  if (muted || !memeEnabled || typeof Audio === 'undefined') return;
  if (!opts?.force && Date.now() - lastMemePlayedAt < (opts?.cooldownMs ?? 1350)) return;
  if (!opts?.force && getActiveMeme()) return;
  const id = drawForSpeaker(pool, resolveSpeaker(opts));
  if (id) playMeme(id, { ...opts, force: true });
}
export function playRandomMeme(opts?: MemeOptions): void { playFromBag('all', opts); }
export function playMemePool(pool: MemePoolKey, opts?: MemeOptions): void { playFromBag(pool, opts); }
export function playPersonaPreview(persona: VoicePersonaId, speakerId: string | null): void { playFromBag('preview', { persona, speakerId, force: true }); }


// ---------- Web Audio SFX tổng hợp ----------

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.08, at = 0, slideTo?: number) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + at;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, vol = 0.12, at = 0) {
  const a = audio();
  if (!a) return;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = a.createBufferSource();
  const g = a.createGain();
  g.gain.value = vol;
  s.buffer = buf;
  s.connect(g).connect(a.destination);
  s.start(a.currentTime + at);
}

export function play(sfx: Sfx, opts?: MemeOptions & { memePool?: MemePoolKey }): void {
  if (muted) return;
  if (opts?.memePool) playMemePool(opts.memePool, opts);
  try {
    switch (sfx) {
      case 'tick':
        return tone(880, 0.05, 'square', 0.04);
      case 'pop':
        return tone(520, 0.08, 'triangle', 0.1, 0, 900);
      case 'turn':
        tone(660, 0.09, 'triangle', 0.1);
        return tone(990, 0.12, 'triangle', 0.1, 0.09);
      case 'whoosh':
        return tone(300, 0.25, 'sawtooth', 0.04, 0, 1200);
      case 'splat':
        noise(0.18, 0.2);
        return tone(140, 0.15, 'sine', 0.15, 0, 60);
      case 'dice':
        for (let i = 0; i < 6; i++) noise(0.03, 0.12, i * 0.06);
        return;
      case 'coin':
        tone(988, 0.07, 'square', 0.06);
        return tone(1319, 0.18, 'square', 0.06, 0.07);
      case 'error':
        return tone(180, 0.18, 'square', 0.07, 0, 120);
      case 'lose':
        tone(392, 0.15, 'triangle', 0.1);
        tone(330, 0.15, 'triangle', 0.1, 0.15);
        return tone(262, 0.3, 'triangle', 0.1, 0.3);
      case 'win':
        [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'square', 0.07, i * 0.12));
        return tone(1047, 0.4, 'triangle', 0.08, 0.5);
      case 'reveal':
        tone(196, 1.2, 'sine', 0.18, 0, 180);
        tone(392, 0.9, 'triangle', 0.06);
        return noise(0.12, 0.1);
      case 'sad':
        [392, 370, 349].forEach((f, i) => tone(f, 0.32, 'sawtooth', 0.05, i * 0.36, f * 0.96));
        return tone(330, 0.9, 'sawtooth', 0.05, 1.08, 250);
      case 'punch':
        noise(0.08, 0.25);
        return tone(110, 0.12, 'sine', 0.2, 0, 50);
      case 'ko':
        noise(0.2, 0.25);
        tone(90, 0.5, 'sine', 0.22, 0, 40);
        return [880, 660, 440].forEach((f, i) => tone(f, 0.12, 'square', 0.05, 0.25 + i * 0.1));
      case 'chat':
        return tone(1200, 0.05, 'sine', 0.06, 0, 1500);
      case 'stamp':
        noise(0.07, 0.22);
        tone(120, 0.12, 'sine', 0.22, 0, 55);
        return tone(1319, 0.14, 'square', 0.05, 0.12);
      case 'siren':
        [0, 0.28, 0.56].forEach((t, i) => tone(i % 2 ? 640 : 880, 0.26, 'sawtooth', 0.05, t, i % 2 ? 880 : 640));
        return;
      case 'cash':
        [0, 0.07, 0.14, 0.22, 0.3].forEach((t, i) => tone(1100 + i * 140, 0.09, 'square', 0.045, t));
        return;
      case 'flip':
        noise(0.05, 0.1);
        return tone(420, 0.14, 'triangle', 0.08, 0, 760);
      case 'boom':
        noise(0.25, 0.22);
        return tone(80, 0.4, 'sine', 0.2, 0, 35);
      case 'honk':
        tone(420, 0.14, 'sawtooth', 0.1, 0, 380);
        return tone(330, 0.26, 'sawtooth', 0.1, 0.16, 300);
      case 'fart':
        tone(95, 0.55, 'sawtooth', 0.14, 0, 45);
        tone(70, 0.5, 'square', 0.06, 0.02, 38);
        return noise(0.45, 0.07);
      case 'boing':
        return tone(180, 0.45, 'sine', 0.2, 0, 700);
      case 'squash':
        noise(0.1, 0.22);
        return tone(220, 0.1, 'square', 0.1, 0, 60);
      case 'inksplash':
        noise(0.25, 0.18);
        return tone(300, 0.2, 'sine', 0.12, 0, 80);
      case 'sparkle':
        return [1319, 1568, 2093].forEach((f, i) => tone(f, 0.12, 'triangle', 0.06, i * 0.07));
      case 'clink':
        tone(2637, 0.08, 'sine', 0.07);
        tone(3520, 0.16, 'sine', 0.045, 0.02);
        return tone(1760, 0.12, 'triangle', 0.035, 0.05);
      case 'blackout':
        noise(0.14, 0.25);
        tone(680, 0.08, 'sawtooth', 0.12, 0, 120);
        return tone(240, 0.55, 'sine', 0.18, 0.06, 38);
      case 'spin':
        [0, 0.14, 0.28, 0.42, 0.56].forEach((t, i) => tone(i % 2 ? 320 : 620, 0.14, 'triangle', 0.09, t, i % 2 ? 620 : 320));
        return;
      case 'bark':
        [0, 0.22].forEach((t) => {
          tone(520, 0.1, 'sawtooth', 0.12, t, 300);
          tone(260, 0.12, 'square', 0.06, t + 0.02, 180);
        });
        return;
      case 'zap':
        noise(0.12, 0.3);
        tone(1800, 0.1, 'sawtooth', 0.12, 0, 120);
        return tone(70, 0.6, 'sine', 0.2, 0.08, 35);
      case 'rocket':
        noise(0.5, 0.1);
        return tone(180, 0.55, 'sawtooth', 0.07, 0, 1400);
      case 'quake':
        noise(0.55, 0.24);
        tone(68, 0.65, 'sawtooth', 0.2, 0, 32);
        return tone(95, 0.5, 'square', 0.1, 0.08, 42);
    }
  } catch {
    // trình duyệt chặn âm thanh: bỏ qua
  }
}
