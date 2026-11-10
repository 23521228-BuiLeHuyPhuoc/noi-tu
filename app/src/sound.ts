/** Âm thanh tổng hợp bằng Web Audio (không cần file). Tắt/bật được, nhớ trong máy. */
type Sfx = 'tick' | 'pop' | 'whoosh' | 'splat' | 'win' | 'dice' | 'coin' | 'error' | 'turn' | 'lose' | 'reveal' | 'sad' | 'punch' | 'chat' | 'ko' | 'honk' | 'fart' | 'boing' | 'squash' | 'inksplash' | 'sparkle' | 'clink';

const KEY = 'xomlay.muted';
let ctx: AudioContext | null = null;
let muted = (() => {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
})();

export function isMuted(): boolean {
  return muted;
}

export function setMuted(v: boolean): void {
  muted = v;
  try {
    localStorage.setItem(KEY, v ? '1' : '0');
  } catch {
    // bỏ qua
  }
}

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

export function play(sfx: Sfx): void {
  if (muted) return;
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
        // tiếng chiêng mở bát
        tone(196, 1.2, 'sine', 0.18, 0, 180);
        tone(392, 0.9, 'triangle', 0.06);
        return noise(0.12, 0.1);
      case 'sad':
        // "oát oát oát oaaa"
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
      case 'honk':
        // còi xe hề: "pe-pe"
        tone(420, 0.14, 'sawtooth', 0.1, 0, 380);
        return tone(330, 0.26, 'sawtooth', 0.1, 0.16, 300);
      case 'fart':
        // tiếng "bruuut" tổng hợp, chỉ là âm thanh vui
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
        // xu kim loại chạm nhau: "keng"
        tone(2637, 0.08, 'sine', 0.07);
        tone(3520, 0.16, 'sine', 0.045, 0.02);
        return tone(1760, 0.12, 'triangle', 0.035, 0.05);
    }
  } catch {
    // trình duyệt chặn âm thanh: bỏ qua
  }
}
