import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { AppState } from 'react-native';
import { nativeSounds } from './nativeSounds';

const KEY = 'xomlay.muted';
let muted = false;
let changed = false;
const players = new Map<keyof typeof nativeSounds, AudioPlayer>();
void AsyncStorage.getItem(KEY).then((value) => {
  if (!changed) muted = value === '1';
}).catch(() => {});
const ready = setAudioModeAsync({ playsInSilentMode: false, shouldPlayInBackground: false, interruptionMode: 'mixWithOthers' }).catch(() => {});

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  changed = true;
  if (value) players.forEach((player) => player.pause());
  void AsyncStorage.setItem(KEY, value ? '1' : '0').catch(() => {});
}

AppState.addEventListener('change', (state) => {
  if (state === 'active') return;
  players.forEach((player) => player.remove());
  players.clear();
});

export function play(sfx: keyof typeof nativeSounds): void {
  if (muted || AppState.currentState !== 'active') return;
  void ready.then(async () => {
    if (muted || AppState.currentState !== 'active') return;
    let player = players.get(sfx);
    if (!player) {
      player = createAudioPlayer(nativeSounds[sfx]);
      players.set(sfx, player);
    } else {
      await player.seekTo(0);
    }
    if (!muted && AppState.currentState === 'active') player.play();
  }).catch(() => {});
}
