import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { AppState } from 'react-native';
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
import { nativeSounds } from './nativeSounds';
export { getActiveMeme, setActiveSpeakerFallback, setRoomVoiceContext, subscribeActiveMeme, type ActiveMemePlayback } from './memePlayback';

export type Sfx = keyof typeof nativeSounds;

const KEY = 'xomlay.muted';
const KEY_BGM = 'xomlay.bgm';
const KEY_MEME = 'xomlay.meme';
const KEY_BGM_VOL = 'xomlay.bgmVol.v2';

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

let muted = false;
let bgmEnabled = true;
let memeEnabled = true;
let bgmVolume = 0.8;
let changedMuted = false;
let changedBgm = false;
let changedMeme = false;
let changedVol = false;

let manualBgmOverride: BgmId | null = null;
let bgmActive = false;
let currentPlaylistBgmId: BgmId | null = null;
let bgmQueue: BgmId[] = [];
let loadedBgmId: BgmId | null = null;
let bgmDuckCount = 0;

const players = new Map<Sfx, AudioPlayer>();
let bgmPlayer: AudioPlayer | null = null;
let bgmSub: { remove(): void } | null = null;
let memePlayer: AudioPlayer | null = null;
let memeDuckTimer: ReturnType<typeof setTimeout> | null = null;
let playingAutomaticMeme = false;
let lastMemePlayedAt = 0;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((fn) => fn());
}

function drawNextPlaylistBgm(): BgmId {
  if (bgmQueue.length === 0) {
    bgmQueue = shuffleCopy(BGM_PLAYLIST, currentPlaylistBgmId);
  }
  const next = bgmQueue.shift() ?? BGM_PLAYLIST[0];
  currentPlaylistBgmId = next;
  return next;
}

void AsyncStorage.multiGet([KEY, KEY_BGM, KEY_MEME, KEY_BGM_VOL])
  .then((pairs) => {
    for (const [k, val] of pairs) {
      if (k === KEY && !changedMuted && val !== null) muted = val === '1';
      if (k === KEY_BGM && !changedBgm && val !== null) bgmEnabled = val === '1';
      if (k === KEY_MEME && !changedMeme && val !== null) memeEnabled = val === '1';
      if (k === KEY_BGM_VOL && !changedVol && val !== null) {
        const n = Number(val);
        if (Number.isFinite(n)) bgmVolume = Math.max(0.05, Math.min(1, n));
      }
    }
    syncBgmPlayback();
    notify();
  })
  .catch(() => {});

const ready = setAudioModeAsync({
  playsInSilentMode: false,
  shouldPlayInBackground: false,
  interruptionMode: 'mixWithOthers',
}).catch(() => {});

export function subscribeAudioSettings(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  changedMuted = true;
  if (value) {
    players.forEach((player) => player.pause());
    stopMeme();
  }
  syncBgmPlayback();
  void AsyncStorage.setItem(KEY, value ? '1' : '0').catch(() => {});
  notify();
}

export function isBgmEnabled(): boolean {
  return bgmEnabled;
}

export function setBgmEnabled(value: boolean): void {
  bgmEnabled = value;
  changedBgm = true;
  syncBgmPlayback();
  void AsyncStorage.setItem(KEY_BGM, value ? '1' : '0').catch(() => {});
  notify();
}

export function isMemeEnabled(): boolean {
  return memeEnabled;
}

export function setMemeEnabled(value: boolean): void {
  memeEnabled = value;
  changedMeme = true;
  if (!value && playingAutomaticMeme) stopMeme();
  void AsyncStorage.setItem(KEY_MEME, value ? '1' : '0').catch(() => {});
  notify();
}

export function getBgmVolume(): number {
  return bgmVolume;
}

export function setBgmVolume(value: number): void {
  bgmVolume = Math.max(0.05, Math.min(1, value));
  changedVol = true;
  applyBgmVolume();
  void AsyncStorage.setItem(KEY_BGM_VOL, String(bgmVolume)).catch(() => {});
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

function effectiveBgmVolume(): number {
  return bgmDuckCount > 0 ? Math.max(0.03, bgmVolume * 0.32) : bgmVolume;
}

function applyBgmVolume(): void {
  if (bgmPlayer) {
    bgmPlayer.volume = effectiveBgmVolume();
  }
}

function syncBgmPlayback(): void {
  const targetId = getCurrentBgmId();
  if (muted || !bgmEnabled || !targetId || AppState.currentState !== 'active') {
    if (bgmPlayer) bgmPlayer.pause();
    return;
  }

  void ready
    .then(() => {
      if (muted || !bgmEnabled || AppState.currentState !== 'active') return;
      const desired = getCurrentBgmId();
      if (!desired) return;
      const shouldLoop = manualBgmOverride !== null;
      if (!bgmPlayer) {
        const player = createAudioPlayer(BGM_ASSETS[desired]);
        player.loop = shouldLoop;
        bgmSub = player.addListener('playbackStatusUpdate', (status) => {
          if (
            status.didJustFinish &&
            !manualBgmOverride &&
            bgmActive &&
            !muted &&
            bgmEnabled &&
            AppState.currentState === 'active'
          ) {
            drawNextPlaylistBgm();
            syncBgmPlayback();
            notify();
          }
        });
        bgmPlayer = player;
        loadedBgmId = desired;
      } else if (loadedBgmId !== desired) {
        bgmPlayer.replace(BGM_ASSETS[desired]);
        bgmPlayer.loop = shouldLoop;
        loadedBgmId = desired;
      } else {
        bgmPlayer.loop = shouldLoop;
      }
      applyBgmVolume();
      bgmPlayer.play();
    })
    .catch(() => {});
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
  playingAutomaticMeme = false;
  if (memePlayer) {
    memePlayer.remove();
    memePlayer = null;
  }
  clearMemeDuck();
}

export function stopMeme(): void {
  resetPlayback();
  releaseMeme();
}

export function playMeme(id: MemeId, opts?: MemeOptions): void {
  playClip(id, opts, false);
}

function playClip(id: MemeId, opts: MemeOptions | undefined, automatic: boolean): void {
  if (muted || AppState.currentState !== 'active') return;
  if (!opts?.force && Date.now() - lastMemePlayedAt < (opts?.cooldownMs ?? 1350)) return;
  const speaker = resolveSpeaker(opts);
  if (speaker.persona && MEME_BY_ID[id].persona !== speaker.persona) return;
  const seq = resetPlayback();
  releaseMeme();
  playingAutomaticMeme = automatic;
  lastMemePlayedAt = Date.now();
  void ready.then(() => {
    if (!isCurrentPlayback(seq) || muted || (automatic && !memeEnabled) || AppState.currentState !== 'active') return;
    const player = createAudioPlayer(MEME_ASSETS[id]);
    memePlayer = player;
    player.volume = 1;
    bgmDuckCount = 1;
    applyBgmVolume();
    let announced = false;
    player.addListener('playbackStatusUpdate', (status) => {
      if (memePlayer !== player) return;
      if (status.didJustFinish) {
        memePlayer = null;
        clearMemeDuck();
        player.remove();
        markEnded(seq);
      } else if (status.playing && isCurrentPlayback(seq) && !announced) {
        announced = true;
        markPlaying(seq, id, speaker);
      }
    });
    memeDuckTimer = setTimeout(stopMeme, 7500);
    player.play();
  }).catch(() => { if (isCurrentPlayback(seq)) stopMeme(); });
}

function playFromBag(pool: MemePoolKey | 'all' | 'preview', opts?: MemeOptions): void {
  if (muted || AppState.currentState !== 'active') return;
  if (!opts?.force && Date.now() - lastMemePlayedAt < (opts?.cooldownMs ?? 1350)) return;
  if (!opts?.force && getActiveMeme()) return;
  const id = drawForSpeaker(pool, resolveSpeaker(opts));
  if (id) playClip(id, { ...opts, force: true }, pool !== 'preview' && pool !== 'all');
}
export function playRandomMeme(opts?: MemeOptions): void { playFromBag('all', opts); }
export function playMemePool(pool: MemePoolKey, opts?: MemeOptions): void { if (memeEnabled) playFromBag(pool, opts); }
export function playPersonaPreview(persona: VoicePersonaId, speakerId: string | null): void { playFromBag('preview', { persona, speakerId, force: true }); }


AppState.addEventListener('change', (state) => {
  if (state !== 'active') {
    players.forEach((player) => player.remove());
    players.clear();
    if (bgmSub) {
      bgmSub.remove();
      bgmSub = null;
    }
    if (bgmPlayer) {
      try {
        bgmPlayer.remove();
      } catch {
        // bỏ qua
      }
      bgmPlayer = null;
      loadedBgmId = null;
    }
    stopMeme();
    return;
  }
  syncBgmPlayback();
});

export function play(sfx: Sfx, opts?: MemeOptions & { memePool?: MemePoolKey }): void {
  if (muted || AppState.currentState !== 'active') return;
  if (opts?.memePool) playMemePool(opts.memePool, opts);
  void ready
    .then(async () => {
      if (muted || AppState.currentState !== 'active') return;
      let player = players.get(sfx);
      if (!player) {
        player = createAudioPlayer(nativeSounds[sfx]);
        players.set(sfx, player);
      } else {
        await player.seekTo(0);
      }
      if (!muted && AppState.currentState === 'active') player.play();
    })
    .catch(() => {});
}
