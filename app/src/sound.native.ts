import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { AppState } from 'react-native';
import {
  ALL_MEME_IDS,
  BGM_ASSETS,
  BGM_PLAYLIST,
  MEME_ASSETS,
  MEME_POOLS,
  type BgmId,
  type MemeId,
  type MemePoolKey,
} from './audioAssets';
import { nativeSounds } from './nativeSounds';

export type Sfx = keyof typeof nativeSounds;

const SFX_MEME_MAP: Partial<Record<Sfx, { pool: MemePoolKey; cooldownMs: number }>> = {
  win: { pool: 'win', cooldownMs: 1200 },
  lose: { pool: 'lose', cooldownMs: 1200 },
  sad: { pool: 'lose', cooldownMs: 1200 },
  ko: { pool: 'eliminated', cooldownMs: 1200 },
  boom: { pool: 'bomb', cooldownMs: 1400 },
  quake: { pool: 'bomb', cooldownMs: 1400 },
  error: { pool: 'wrong', cooldownMs: 2200 },
  coin: { pool: 'money', cooldownMs: 3200 },
  cash: { pool: 'money', cooldownMs: 3200 },
  clink: { pool: 'money', cooldownMs: 3200 },
  dice: { pool: 'turn_move', cooldownMs: 3400 },
  flip: { pool: 'turn_move', cooldownMs: 3400 },
  spin: { pool: 'turn_move', cooldownMs: 3400 },
  punch: { pool: 'troll', cooldownMs: 1800 },
  zap: { pool: 'troll', cooldownMs: 1800 },
  rocket: { pool: 'troll', cooldownMs: 1800 },
  splat: { pool: 'troll', cooldownMs: 1800 },
  inksplash: { pool: 'troll', cooldownMs: 1800 },
  squash: { pool: 'troll', cooldownMs: 1800 },
  boing: { pool: 'troll', cooldownMs: 1800 },
  honk: { pool: 'troll', cooldownMs: 1800 },
  bark: { pool: 'troll', cooldownMs: 1800 },
  siren: { pool: 'shock', cooldownMs: 1800 },
  blackout: { pool: 'shock', cooldownMs: 1800 },
  reveal: { pool: 'twist', cooldownMs: 2200 },
  sparkle: { pool: 'twist', cooldownMs: 2200 },
  stamp: { pool: 'correct', cooldownMs: 2400 },
  chat: { pool: 'chat_hype', cooldownMs: 4200 },
  turn: { pool: 'turn_move', cooldownMs: 4500 },
  whoosh: { pool: 'turn_move', cooldownMs: 4000 },
  pop: { pool: 'chat_hype', cooldownMs: 5500 },
};

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
let lastMemePlayedAt = 0;
let globalMemeBag: MemeId[] = [];
let lastGlobalMeme: MemeId | null = null;
const poolBags: Partial<Record<MemePoolKey, MemeId[]>> = {};
const playedThisSession = new Set<MemeId>();
const recentMemes: MemeId[] = [];
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
  if (!value) stopMeme();
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

export function stopMeme(): void {
  if (memePlayer) {
    try {
      memePlayer.pause();
    } catch {
      // bỏ qua
    }
  }
  clearMemeDuck();
}

export function playMeme(id: MemeId, opts?: { force?: boolean; cooldownMs?: number }): void {
  if (muted || !memeEnabled || AppState.currentState !== 'active') return;
  const now = Date.now();
  const cooldown = opts?.cooldownMs ?? 1350;
  if (!opts?.force && now - lastMemePlayedAt < cooldown) return;
  lastMemePlayedAt = now;

  void ready
    .then(() => {
      if (muted || !memeEnabled || AppState.currentState !== 'active') return;
      if (memePlayer) {
        try {
          memePlayer.remove();
        } catch {
          // bỏ qua
        }
        memePlayer = null;
      }
      clearMemeDuck();

      const p = createAudioPlayer(MEME_ASSETS[id]);
      p.volume = 1.0;
      memePlayer = p;
      bgmDuckCount = 1;
      applyBgmVolume();

      const finish = () => {
        if (memePlayer === p) {
          clearMemeDuck();
          try {
            p.remove();
          } catch {
            // bỏ qua
          }
          memePlayer = null;
        }
      };

      const sub = p.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) {
          sub.remove();
          finish();
        }
      });
      memeDuckTimer = setTimeout(() => {
        sub.remove();
        finish();
      }, 6000);
      p.play();
    })
    .catch(() => {
      clearMemeDuck();
    });
}

function recordMemeHistory(id: MemeId): void {
  if (playedThisSession.size >= ALL_MEME_IDS.length) {
    playedThisSession.clear();
  }
  playedThisSession.add(id);
  recentMemes.push(id);
  if (recentMemes.length > 8) recentMemes.shift();
}

export function playRandomMeme(opts?: { force?: boolean; cooldownMs?: number }): void {
  if (muted || !memeEnabled || AppState.currentState !== 'active') return;
  const cooldown = opts?.cooldownMs ?? 1350;
  if (!opts?.force && Date.now() - lastMemePlayedAt < cooldown) return;

  if (globalMemeBag.length === 0) {
    globalMemeBag = shuffleCopy(ALL_MEME_IDS, lastGlobalMeme);
  }
  const pick = globalMemeBag.shift() ?? ALL_MEME_IDS[0];
  if (!pick) return;
  lastGlobalMeme = pick;
  recordMemeHistory(pick);
  playMeme(pick, { ...opts, force: true });
}

export function playMemePool(pool: MemePoolKey, opts?: { cooldownMs?: number }): void {
  if (muted || !memeEnabled || AppState.currentState !== 'active') return;
  const cooldown = opts?.cooldownMs ?? 1350;
  if (Date.now() - lastMemePlayedAt < cooldown) return;

  const list = MEME_POOLS[pool];
  if (!list || list.length === 0) return;

  if (playedThisSession.size >= ALL_MEME_IDS.length) {
    playedThisSession.clear();
  }

  let bag = poolBags[pool];
  if (!bag || bag.length === 0) {
    bag = shuffleCopy(list, recentMemes[recentMemes.length - 1]);
    poolBags[pool] = bag;
  }

  let idx = bag.findIndex((id) => !playedThisSession.has(id) && !recentMemes.includes(id));
  if (idx < 0) idx = bag.findIndex((id) => !recentMemes.includes(id));
  if (idx < 0) idx = 0;

  const pick = bag.splice(idx, 1)[0] ?? list[0];
  if (!pick) return;
  recordMemeHistory(pick);
  playMeme(pick, { ...opts, force: true });
}

function triggerSfxMeme(sfx: Sfx): void {
  if (muted || !memeEnabled || AppState.currentState !== 'active') return;
  if (sfx === 'fart') {
    playMemePool('troll', { cooldownMs: 1400 });
    return;
  }
  const mapped = SFX_MEME_MAP[sfx];
  if (mapped) {
    playMemePool(mapped.pool, { cooldownMs: mapped.cooldownMs });
  }
}

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
    if (memePlayer) {
      try {
        memePlayer.remove();
      } catch {
        // bỏ qua
      }
      memePlayer = null;
    }
    clearMemeDuck();
    return;
  }
  syncBgmPlayback();
});

export function play(sfx: Sfx): void {
  if (muted || AppState.currentState !== 'active') return;
  triggerSfxMeme(sfx);
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
