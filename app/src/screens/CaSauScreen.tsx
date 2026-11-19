import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient as SvgLinearGradient,
  Path,
  Polygon,
  RadialGradient as SvgRadialGradient,
  Stop,
} from 'react-native-svg';
import type { CaSauToothState, CaSauView } from '../../../shared/src/casau';
import type { ActionError, RoomState } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { C, FONT, backdropPalette, sticker } from '../theme';
import { actionText } from '../messages';
import { isMuted, play, playMemePool } from '../sound';
import { useOnChange } from '../hooks';
import { T } from '../ui';
import { Shell } from '../components/Shell';
import { CountdownBar } from '../components/TimerBar';
import { Portrait } from '../components/Avatar';
import { Confetti } from '../components/Fun';
import { UiIcon } from '../components/Icons';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';
const STAGE_VW = 440;
const STAGE_VH = 408;

let crocAudioCtx: AudioContext | null = null;
function playCrocJumpscareSfx(): void {
  if (Platform.OS !== 'web' || isMuted()) return;
  try {
    if (!crocAudioCtx) {
      const AudioCtor =
        (globalThis as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
        (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return;
      crocAudioCtx = new AudioCtor();
    }
    const ctx = crocAudioCtx;
    if (ctx.state === 'suspended') void ctx.resume();
    const now = ctx.currentTime;

    // 1. Tiếng gầm trầm rợn người + hàm đóng rầm
    const roarOsc = ctx.createOscillator();
    const roarGain = ctx.createGain();
    roarOsc.type = 'sawtooth';
    roarOsc.frequency.setValueAtTime(160, now);
    roarOsc.frequency.exponentialRampToValueAtTime(42, now + 0.55);
    roarGain.gain.setValueAtTime(0.32, now);
    roarGain.gain.exponentialRampToValueAtTime(0.001, now + 0.62);
    roarOsc.connect(roarGain).connect(ctx.destination);
    roarOsc.start(now);
    roarOsc.stop(now + 0.64);

    // 2. Tiếng rít hù dọa chói tai bất ngờ
    const shriek = ctx.createOscillator();
    const shriekGain = ctx.createGain();
    shriek.type = 'square';
    shriek.frequency.setValueAtTime(740, now);
    shriek.frequency.exponentialRampToValueAtTime(190, now + 0.32);
    shriekGain.gain.setValueAtTime(0.22, now);
    shriekGain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
    shriek.connect(shriekGain).connect(ctx.destination);
    shriek.start(now);
    shriek.stop(now + 0.36);

    // 3. Tiếng nghiến răng rắc rắc
    const crunchLen = Math.floor(ctx.sampleRate * 0.24);
    const buf = ctx.createBuffer(1, crunchLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < crunchLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (crunchLen * 0.3));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.35, now);
    noise.connect(ng).connect(ctx.destination);
    noise.start(now);
  } catch {
    // bỏ qua lỗi WebAudio
  }
}

const EXTRA_ERRORS: Partial<Record<ActionError, string>> = {
  not_your_turn: 'Chưa tới lượt khám răng của bạn',
  cell_occupied: 'Chiếc răng này đã nhấn rồi — chọn răng trắng nhé',
  bad_action: 'Hãy chọn 1 chiếc răng trắng nguyên vẹn',
};

function errOf(reason: ActionError): string {
  return EXTRA_ERRORS[reason] ?? actionText[reason] ?? 'Thao tác chưa hợp lệ';
}

interface ToothGeom {
  idx: number;
  isUpper: boolean;
  x: number;
  gumY: number;
  tipY: number;
  w: number;
  len: number;
  angleDeg: number;
  isFang: boolean;
}

function buildToothGeometry(total: number): { upper: ToothGeom[]; lower: ToothGeom[]; half: number } {
  const safeTotal = Math.max(2, total % 2 === 0 ? total : total + 1);
  const half = safeTotal / 2;
  const upper: ToothGeom[] = [];
  const lower: ToothGeom[] = [];
  const baseW = Math.min(26, Math.max(16.5, (268 / Math.max(6, half)) * 0.8));

  for (let i = 0; i < half; i++) {
    const t = half > 1 ? (i / (half - 1)) * 2 - 1 : 0;
    const absT = Math.abs(t);
    const x = 220 + t * 138;
    const isCorner = i === 0 || i === half - 1;
    const isCanine = i === 1 || i === half - 2;
    const isFang = isCorner || isCanine;

    const uGumY = 148 + t * t * 34;
    const uLen = isCanine ? 40 : isCorner ? 31 : 33 - absT * 2;
    const uW = isCanine ? baseW * 0.96 : isCorner ? baseW * 0.86 : baseW * 1.05;
    upper.push({
      idx: i,
      isUpper: true,
      x,
      gumY: uGumY,
      tipY: uGumY + uLen,
      w: uW,
      len: uLen,
      angleDeg: -t * 8,
      isFang,
    });

    const lIdx = half + i;
    const lGumY = 312 - t * t * 32;
    const lLen = isCanine ? 38 : isCorner ? 29 : 31 - absT * 2;
    const lW = isCanine ? baseW * 0.94 : isCorner ? baseW * 0.85 : baseW * 1.03;
    lower.push({
      idx: lIdx,
      isUpper: false,
      x,
      gumY: lGumY,
      tipY: lGumY - lLen,
      w: lW,
      len: lLen,
      angleDeg: t * 8,
      isFang,
    });
  }

  return { upper, lower, half };
}

function toothBodyPath(g: ToothGeom, depressed: boolean): string {
  const hw = g.w / 2;
  // Depressed safe teeth sink deep into their pink gum socket (+8/-8 visual stub)
  const effLen = depressed ? g.len * 0.36 : g.len;
  const rootOffset = depressed ? (g.isUpper ? 3 : -3) : 0;

  if (g.isUpper) {
    const y0 = g.gumY - 5 + rootOffset;
    const yTip = g.gumY + effLen;
    if (g.isFang && !depressed) {
      return `M ${g.x - hw} ${y0} Q ${g.x - hw * 0.95} ${y0 + effLen * 0.62} ${g.x} ${yTip} Q ${g.x + hw * 0.95} ${y0 + effLen * 0.62} ${g.x + hw} ${y0} Z`;
    }
    const r = Math.min(hw * 0.68, 7);
    return `M ${g.x - hw} ${y0} L ${g.x - hw * 0.88} ${yTip - r} Q ${g.x} ${yTip + 3} ${g.x + hw * 0.88} ${yTip - r} L ${g.x + hw} ${y0} Z`;
  }

  const y0 = g.gumY + 5 + rootOffset;
  const yTip = g.gumY - effLen;
  if (g.isFang && !depressed) {
    return `M ${g.x - hw} ${y0} Q ${g.x - hw * 0.95} ${y0 - effLen * 0.62} ${g.x} ${yTip} Q ${g.x + hw * 0.95} ${y0 - effLen * 0.62} ${g.x + hw} ${y0} Z`;
  }
  const r = Math.min(hw * 0.68, 7);
  return `M ${g.x - hw} ${y0} L ${g.x - hw * 0.88} ${yTip + r} Q ${g.x} ${yTip - 3} ${g.x + hw * 0.88} ${yTip + r} L ${g.x + hw} ${y0} Z`;
}

function toothShinePath(g: ToothGeom): string {
  const hw = g.w * 0.24;
  const sx = g.x - g.w * 0.2;
  if (g.isUpper) {
    const y1 = g.gumY + 2;
    const y2 = g.gumY + g.len * 0.68;
    return `M ${sx - hw * 0.4} ${y1} Q ${sx - hw * 0.5} ${(y1 + y2) / 2} ${sx} ${y2} Q ${sx + hw * 0.45} ${(y1 + y2) / 2} ${sx + hw * 0.35} ${y1} Z`;
  }
  const y1 = g.gumY - 2;
  const y2 = g.gumY - g.len * 0.68;
  return `M ${sx - hw * 0.4} ${y1} Q ${sx - hw * 0.5} ${(y1 + y2) / 2} ${sx} ${y2} Q ${sx + hw * 0.45} ${(y1 + y2) / 2} ${sx + hw * 0.35} ${y1} Z`;
}

function starburstPoints(cx: number, cy: number, outerR: number, innerR: number, spikes = 14): string {
  const pts: string[] = [];
  const total = spikes * 2;
  for (let i = 0; i < total; i++) {
    const angle = (i * Math.PI) / spikes - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const rx = cx + Math.cos(angle) * r * 1.38;
    const ry = cy + Math.sin(angle) * r * 0.78;
    pts.push(`${rx.toFixed(1)},${ry.toFixed(1)}`);
  }
  return pts.join(' ');
}

export function CaSauScreen({ game, room }: { game: Game; room: RoomState }) {
  const view = room.game as CaSauView;
  const me = game.me ?? '';
  const isHost = room.hostId === me;
  const activeThemeId = room.settings.roomTheme ?? game.user?.equipped?.roomTheme ?? 'son_mac_dinh';
  const pal = backdropPalette(activeThemeId);
  const { width, height } = useWindowDimensions();
  const wide = width >= 760;
  const compactMobile = height < 700;

  const [busyTooth, setBusyTooth] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [stageBox, setStageBox] = useState<{ w: number; h: number }>({
    w: Math.min(width - 20, 520),
    h: Math.max(220, height - 210),
  });
  const [pupilShift, setPupilShift] = useState(0);

  // Animations for Hinged Upper Jaw, Victim Jumpscare Lunge + Violent 2D Shake, Tooth Pulse, and Comic Starburst
  const [jawAnim] = useState(() => new Animated.Value(0)); // 0 = open, 1 = slammed shut
  const [breatheAnim] = useState(() => new Animated.Value(0));
  const [shakeAnim] = useState(() => new Animated.Value(0));
  const [shakeYAnim] = useState(() => new Animated.Value(0));
  const [lungeScale] = useState(() => new Animated.Value(1));
  const [strobeOpacity] = useState(() => new Animated.Value(0));
  const [burstScale] = useState(() => new Animated.Value(0));

  const isBite = view.phase === 'bite_reveal';
  const isMeBitten = isBite && view.bittenPlayerId === me;
  const isOtherBitten = isBite && view.bittenPlayerId !== me;
  const effectivePupilShift = isBite ? 0 : pupilShift;
  const isMyTurn = view.phase === 'pressing' && view.currentPlayerId === me;

  const intactCount = useMemo(
    () => view.teeth.filter((t) => t === 'intact').length,
    [view.teeth],
  );
  const pressedCount = view.teeth.length - intactCount;
  const tension = view.teeth.length > 1 ? pressedCount / (view.teeth.length - 1) : 0;

  // Breathing idle motion while jaw is open
  useEffect(() => {
    if (isBite) {
      breatheAnim.stopAnimation();
      breatheAnim.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: Math.max(550, 1250 - Math.round(tension * 550)),
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(breatheAnim, {
          toValue: 0,
          duration: Math.max(550, 1250 - Math.round(tension * 550)),
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isBite, tension, breatheAnim]);

  // Nervous darting reptile pupils as more teeth get pressed
  useEffect(() => {
    if (isBite) return;
    const intervalMs = Math.max(420, 1400 - Math.round(tension * 900));
    const offsets = [-4.5, 4.5, -2.5, 5, 0, -5, 3];
    let step = 0;
    const timer = setInterval(() => {
      step = (step + 1) % offsets.length;
      setPupilShift(offsets[step] * (0.55 + tension * 0.55));
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isBite, tension]);

  // Jaw Slam + Victim-Only Jumpscare Lunge + Violent 2D Screen Shake when sore tooth is pressed
  useEffect(() => {
    if (isBite) {
      burstScale.setValue(0.15);
      const commonAnims: Animated.CompositeAnimation[] = [
        Animated.sequence([
          Animated.timing(jawAnim, {
            toValue: -0.14,
            duration: 50,
            easing: Easing.out(Easing.quad),
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.spring(jawAnim, {
            toValue: 1,
            stiffness: 460,
            damping: 16,
            mass: 0.85,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]),
        Animated.sequence([
          Animated.delay(85),
          Animated.spring(burstScale, {
            toValue: 1,
            friction: 5,
            tension: 180,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]),
      ];

      if (isMeBitten) {
        commonAnims.push(
          // Màn hình người thua rung lắc dữ dội 2 chiều liên hồi
          Animated.sequence([
            Animated.timing(shakeAnim, { toValue: -26, duration: 36, useNativeDriver: USE_NATIVE_DRIVER }),
            Animated.timing(shakeAnim, { toValue: 26, duration: 40, useNativeDriver: USE_NATIVE_DRIVER }),
            Animated.timing(shakeAnim, { toValue: -22, duration: 40, useNativeDriver: USE_NATIVE_DRIVER }),
            Animated.timing(shakeAnim, { toValue: 20, duration: 42, useNativeDriver: USE_NATIVE_DRIVER }),
            Animated.timing(shakeAnim, { toValue: -16, duration: 44, useNativeDriver: USE_NATIVE_DRIVER }),
            Animated.timing(shakeAnim, { toValue: 14, duration: 45, useNativeDriver: USE_NATIVE_DRIVER }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 45, useNativeDriver: USE_NATIVE_DRIVER }),
            Animated.timing(shakeAnim, { toValue: 8, duration: 48, useNativeDriver: USE_NATIVE_DRIVER }),
            Animated.timing(shakeAnim, { toValue: -4, duration: 48, useNativeDriver: USE_NATIVE_DRIVER }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: USE_NATIVE_DRIVER }),
          ]),
          Animated.sequence([
            Animated.timing(shakeYAnim, { toValue: 18, duration: 38, useNativeDriver: USE_NATIVE_DRIVER }),
            Animated.timing(shakeYAnim, { toValue: -18, duration: 42, useNativeDriver: USE_NATIVE_DRIVER }),
            Animated.timing(shakeYAnim, { toValue: 14, duration: 42, useNativeDriver: USE_NATIVE_DRIVER }),
            Animated.timing(shakeYAnim, { toValue: -12, duration: 45, useNativeDriver: USE_NATIVE_DRIVER }),
            Animated.timing(shakeYAnim, { toValue: 8, duration: 45, useNativeDriver: USE_NATIVE_DRIVER }),
            Animated.timing(shakeYAnim, { toValue: -6, duration: 48, useNativeDriver: USE_NATIVE_DRIVER }),
            Animated.timing(shakeYAnim, { toValue: 0, duration: 50, useNativeDriver: USE_NATIVE_DRIVER }),
          ]),
          // Đầu cá sấu nhào vọt tới sát camera!
          Animated.sequence([
            Animated.timing(lungeScale, {
              toValue: 1.36,
              duration: 110,
              easing: Easing.out(Easing.back(1.8)),
              useNativeDriver: USE_NATIVE_DRIVER,
            }),
            Animated.spring(lungeScale, {
              toValue: 1.08,
              friction: 5,
              tension: 110,
              useNativeDriver: USE_NATIVE_DRIVER,
            }),
          ]),
          // Chớp đỏ kinh dị nhiều nhịp trên máy người bị cạp
          Animated.sequence([
            Animated.timing(strobeOpacity, { toValue: 0.92, duration: 60, useNativeDriver: USE_NATIVE_DRIVER }),
            Animated.timing(strobeOpacity, { toValue: 0.28, duration: 90, useNativeDriver: USE_NATIVE_DRIVER }),
            Animated.timing(strobeOpacity, { toValue: 0.85, duration: 70, useNativeDriver: USE_NATIVE_DRIVER }),
            Animated.timing(strobeOpacity, { toValue: 0.42, duration: 280, useNativeDriver: USE_NATIVE_DRIVER }),
          ]),
        );
      } else {
        shakeAnim.setValue(0);
        shakeYAnim.setValue(0);
        lungeScale.setValue(1);
        strobeOpacity.setValue(0);
      }
      Animated.parallel(commonAnims).start();
    } else {
      burstScale.setValue(0);
      shakeAnim.setValue(0);
      shakeYAnim.setValue(0);
      lungeScale.setValue(1);
      strobeOpacity.setValue(0);
      Animated.spring(jawAnim, {
        toValue: 0,
        friction: 7,
        tension: 90,
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start();
    }
  }, [isBite, isMeBitten, jawAnim, shakeAnim, shakeYAnim, lungeScale, strobeOpacity, burstScale]);

  // Twitch jaw slightly when any safe tooth is pressed
  const prevPressedRef = useRef(pressedCount);
  useEffect(() => {
    const prev = prevPressedRef.current;
    prevPressedRef.current = pressedCount;
    if (!isBite && pressedCount > prev) {
      play('pop');
      Animated.sequence([
        Animated.timing(jawAnim, { toValue: 0.14, duration: 65, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.spring(jawAnim, { toValue: 0, friction: 6, tension: 140, useNativeDriver: USE_NATIVE_DRIVER }),
      ]).start();
    }
  }, [pressedCount, isBite, jawAnim]);

  useOnChange(view.phase, (ph) => {
    setErr(null);
    if (ph === 'bite_reveal') {
      playMemePool('bite', { cooldownMs: 800 });
      if (view.bittenPlayerId === me) {
        playCrocJumpscareSfx();
      } else {
        play('error');
      }
    } else {
      play('pop');
    }
  });

  useOnChange(view.currentPlayerId, (cur) => {
    if (cur === me && view.phase === 'pressing') {
      play('turn');
    }
  });

  const playerMap = useMemo(() => new Map(room.players.map((p) => [p.id, p])), [room.players]);

  const pressTooth = async (idx: number) => {
    if (!isMyTurn || busyTooth !== null || view.teeth[idx] !== 'intact') return;
    setBusyTooth(idx);
    setErr(null);
    play('stamp');
    const res = await game.act({ type: 'cs_press', tooth: idx });
    setBusyTooth(null);
    if (!res.ok) {
      play('error');
      setErr(errOf(res.reason));
    }
  };

  const handleEarlyEnd = async () => {
    if (!isHost) return;
    if (!confirmEnd) {
      setConfirmEnd(true);
      return;
    }
    setConfirmEnd(false);
    await game.act({ type: 'end' });
  };

  const { upper: upperGeom, lower: lowerGeom } = useMemo(
    () => buildToothGeometry(view.teeth.length || 16),
    [view.teeth.length],
  );

  // Compute responsive 1:1 stage dimensions so it NEVER scrolls on 360x640..1280x800
  const { renderW, renderH, scale } = useMemo(() => {
    const maxW = Math.max(250, Math.min(stageBox.w, wide ? 560 : 460));
    const maxH = Math.max(190, stageBox.h - 4);
    const aspect = STAGE_VW / STAGE_VH;
    let w = maxW;
    let h = w / aspect;
    if (h > maxH) {
      h = maxH;
      w = h * aspect;
    }
    return { renderW: w, renderH: h, scale: w / STAGE_VW };
  }, [stageBox.w, stageBox.h, wide]);

  const slamPx = 76 * scale;
  const breathePx = -4.5 * scale;
  const upperTranslateY = Animated.add(
    jawAnim.interpolate({
      inputRange: [-0.2, 0, 1],
      outputRange: [-0.2 * slamPx, 0, slamPx],
    }),
    breatheAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, breathePx],
    }),
  );

  const statusLine = err
    ? err
    : isBite
      ? `Cá sấu đớp tay ${view.names[view.bittenPlayerId ?? ''] ?? 'ai đó'} (răng #${(view.trapTooth ?? 0) + 1})`
      : isMyTurn
        ? 'Đến lượt bạn — chọn 1 chiếc răng trắng để nhấn'
        : view.lastActionText
          ? `${view.lastActionText.replace(/!+$/g, '')} · Tới lượt ${view.names[view.currentPlayerId ?? ''] ?? '---'}`
          : `Đang chờ ${view.names[view.currentPlayerId ?? ''] ?? 'người chơi'} nhấn răng…`;

  const renderSvgTooth = (g: ToothGeom) => {
    const st: CaSauToothState = view.teeth[g.idx] ?? 'intact';
    const isSore = st === 'trap' || (isBite && view.trapTooth === g.idx);
    const depressed = st !== 'intact' && !isSore;
    const fillUrl = isSore
      ? 'url(#toothSoreGrad)'
      : st === 'gold'
        ? 'url(#toothGoldGrad)'
        : st === 'reverse'
          ? 'url(#toothRevGrad)'
          : depressed
            ? 'url(#toothPressedGrad)'
            : 'url(#toothIvoryGrad)';
    const strokeCol = isSore
      ? '#FEF08A'
      : st === 'gold'
        ? '#FACC15'
        : st === 'reverse'
          ? '#38BDF8'
          : depressed
            ? '#475569'
            : isMyTurn
              ? '#FDE047'
              : '#DFD6C7';
    const strokeW = isSore ? 2.6 : isMyTurn && st === 'intact' ? 2 : 1.3;

    return (
      <G
        key={`svg-tooth-${g.idx}`}
        origin={`${g.x}, ${g.gumY}`}
        rotation={g.angleDeg}
      >
        {/* Pink gum root socket shadow */}
        <Ellipse
          cx={g.x}
          cy={g.gumY + (g.isUpper ? -1 : 1)}
          rx={g.w * 0.56}
          ry={5.5}
          fill={isSore ? '#7F1D1D' : '#58081C'}
        />

        {/* Fiery aura behind sore tooth */}
        {isSore && (
          <Ellipse
            cx={g.x}
            cy={g.isUpper ? g.gumY + g.len * 0.52 : g.gumY - g.len * 0.52}
            rx={g.w * 0.85}
            ry={g.len * 0.68}
            fill="rgba(239, 68, 68, 0.45)"
          />
        )}

        {/* 3D Sculpted Tooth Body */}
        <Path
          d={toothBodyPath(g, depressed)}
          fill={fillUrl}
          stroke={strokeCol}
          strokeWidth={strokeW}
        />

        {/* Specular Enamel Highlight on intact teeth */}
        {st === 'intact' && !isSore && (
          <Path d={toothShinePath(g)} fill="rgba(255, 255, 255, 0.78)" />
        )}

        {/* Cracked Lightning Bolt on Sore Tooth */}
        {isSore && (
          <Path
            d={
              g.isUpper
                ? `M ${g.x - 2} ${g.gumY + 3} L ${g.x + 4} ${g.gumY + 14} L ${g.x - 3} ${g.gumY + 18} L ${g.x + 3} ${g.gumY + 30}`
                : `M ${g.x - 2} ${g.gumY - 3} L ${g.x + 4} ${g.gumY - 14} L ${g.x - 3} ${g.gumY - 18} L ${g.x + 3} ${g.gumY - 28}`
            }
            stroke="#FEF08A"
            strokeWidth={2.2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </G>
    );
  };

  const renderToothHitbox = (g: ToothGeom) => {
    const st: CaSauToothState = view.teeth[g.idx] ?? 'intact';
    const isSore = st === 'trap' || (isBite && view.trapTooth === g.idx);
    const intact = st === 'intact' && !isSore;
    const canTap = isMyTurn && intact && busyTooth === null;

    const hitW = Math.max(30, (g.w + 11) * scale);
    const hitH = Math.max(40, (g.len + 18) * scale);
    const centerY = g.isUpper ? g.gumY + g.len * 0.46 : g.gumY - g.len * 0.46;
    const left = g.x * scale - hitW / 2;
    const top = centerY * scale - hitH / 2;

    return (
      <Pressable
        key={`hit-tooth-${g.idx}`}
        testID={`cs-tooth-${g.idx}`}
        accessibilityRole="button"
        accessibilityLabel={`Răng cá sấu số ${g.idx + 1}`}
        disabled={!canTap}
        hitSlop={3}
        onPress={() => void pressTooth(g.idx)}
        style={({ pressed }) => [
          styles.toothHitbox,
          {
            left,
            top,
            width: hitW,
            height: hitH,
          },
          canTap && styles.toothHitboxInteractive,
          pressed && canTap && {
            transform: [{ translateY: g.isUpper ? -3 : 3 }, { scale: 0.93 }],
          },
        ]}
      >
        {isSore ? (
          <View style={styles.toothBadgeSore}>
            <UiIcon name="Zap" size={10} color="#FEF08A" strokeWidth={2} />
          </View>
        ) : st === 'gold' ? (
          <View style={styles.toothBadgeGold}>
            <UiIcon name="Diamond" size={10} color="#FDE047" strokeWidth={2} />
          </View>
        ) : st === 'reverse' ? (
          <View style={styles.toothBadgeRev}>
            <UiIcon name="RefreshCw" size={10} color="#7DD3FC" strokeWidth={2} />
          </View>
        ) : st === 'safe' ? (
          <View style={styles.toothBadgeSafe}>
            <UiIcon name="Check" size={10} color="#A7F3D0" strokeWidth={2.2} />
          </View>
        ) : (
          <T
            selectable={false}
            style={[
              styles.toothIndexLbl,
              isMyTurn && styles.toothIndexLblActive,
              { marginTop: g.isUpper ? -4 * scale : 4 * scale },
            ]}
          >
            {g.idx + 1}
          </T>
        )}
      </Pressable>
    );
  };

  return (
    <Shell game={game} room={room} scroll={false} hideStrip wide={wide}>
      {view.round >= view.maxRounds && isBite && view.bittenPlayerId !== me && <Confetti />}

      <Animated.View
        style={[
          styles.rootFill,
          isMeBitten && {
            transform: [{ translateX: shakeAnim }, { translateY: shakeYAnim }],
          },
        ]}
      >
        {/* 1. COMPACT TOP TURN & SCORE STRIP */}
        <View
          style={[
            styles.topStripCard,
            sticker(2),
            { backgroundColor: pal.card, borderColor: pal.hairline },
            compactMobile && styles.topStripCardTight,
          ]}
          testID="casau-header"
        >
          {/* Row 1: Round + Direction + Remaining Teeth + Timer + Optional Host End */}
          <View style={styles.topRowMain}>
            <View style={[styles.roundPill, { backgroundColor: pal.subtle, borderColor: pal.hairline }]}>
              <UiIcon name={view.direction === 1 ? 'RefreshCw' : 'RotateCcw'} size={12} color={pal.muted} strokeWidth={1.65} />
              <T style={[styles.roundPillTxt, { color: pal.text }]}>
                Hiệp {view.round}/{view.maxRounds}
              </T>
            </View>

            <View style={[styles.teethPill, { backgroundColor: pal.subtle, borderColor: pal.hairline }]}>
              <UiIcon name="Triangle" size={11} color={C.jade} strokeWidth={1.75} />
              <T style={[styles.teethPillTxt, { color: pal.text }]}>
                {intactCount}/{view.totalTeeth}
              </T>
            </View>

            <View style={styles.timerInlineWrap}>
              <CountdownBar
                endsAt={view.phaseEndsAt}
                total={view.phaseSeconds}
                clockOffset={game.clockOffset}
                lightText={pal.dark}
                testID="casau-timer"
              />
            </View>

            {isHost && (
              <Pressable
                testID="casau-end-early"
                onPress={() => void handleEarlyEnd()}
                onLongPress={() => setConfirmEnd(false)}
                style={[
                  styles.hostEndChip,
                  { backgroundColor: pal.dark ? 'rgba(185, 28, 28, 0.22)' : C.dangerSoft, borderColor: 'rgba(185, 28, 28, 0.30)' },
                  confirmEnd && styles.hostEndChipConfirm,
                ]}
              >
                <UiIcon name="XCircle" size={12} color={confirmEnd ? '#FFFFFF' : C.danger} strokeWidth={1.65} />
                <T style={[styles.hostEndChipTxt, { color: confirmEnd ? '#FFFFFF' : C.danger }]}>
                  {confirmEnd ? 'Xác nhận dừng' : 'Kết thúc'}
                </T>
              </Pressable>
            )}
          </View>

          {/* Row 2: Horizontal Compact Player Avatar Chips (Score & Bite Counter) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.playerStripScroll}
            testID="casau-scoreboard"
          >
            {view.order.map((pid) => {
              const p = playerMap.get(pid);
              const sc = view.scores[pid] ?? 0;
              const bt = view.bites[pid] ?? 0;
              const isTurn = view.phase === 'pressing' && view.currentPlayerId === pid;
              const isVictim = isBite && view.bittenPlayerId === pid;
              const isMeChip = pid === me;
              return (
                <View
                  key={pid}
                  style={[
                    styles.playerChip,
                    { backgroundColor: pal.subtle, borderColor: pal.hairline },
                    isMeChip && { borderColor: pal.dark ? 'rgba(251, 249, 245, 0.26)' : C.borderStrong },
                    isTurn && (pal.dark ? styles.playerChipTurnDark : styles.playerChipTurn),
                    isVictim && (pal.dark ? styles.playerChipBittenDark : styles.playerChipBitten),
                  ]}
                >
                  {p ? (
                    <Portrait p={p} size={20} border={1.25} active={isTurn} />
                  ) : (
                    <UiIcon name="User" size={13} color={pal.muted} strokeWidth={1.65} />
                  )}
                  <T numberOfLines={1} style={[styles.playerChipName, { color: isTurn && !pal.dark ? C.ink : pal.text }]}>
                    {view.names[pid] ?? pid}
                  </T>
                  <T style={[styles.playerChipScore, { color: isTurn && !pal.dark ? C.jade : pal.muted }]}>{sc}đ</T>
                  {bt > 0 && (
                    <View style={styles.playerBiteRow}>
                      <UiIcon name="AlertTriangle" size={10} color={C.danger} strokeWidth={1.75} />
                      <T style={styles.playerChipBites}>{bt}</T>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>

          {/* Row 3: Clear 1-line Status Banner */}
          <View
            style={[
              styles.statusBanner,
              { backgroundColor: pal.subtle },
              err
                ? (pal.dark ? styles.statusBannerErrDark : styles.statusBannerErr)
                : isBite
                  ? (pal.dark ? styles.statusBannerBiteDark : styles.statusBannerBite)
                  : isMyTurn
                    ? (pal.dark ? styles.statusBannerTurnDark : styles.statusBannerTurn)
                    : null,
            ]}
          >
            <T
              numberOfLines={1}
              style={[
                styles.statusBannerTxt,
                { color: pal.text },
                err && { color: pal.dark ? '#FECACA' : C.danger },
                !err && isBite && { color: pal.dark ? '#FECACA' : C.danger },
                !err && !isBite && isMyTurn && { color: pal.dark ? '#86EFAC' : C.jade },
              ]}
            >
              {statusLine}
            </T>
          </View>
        </View>

        {/* 2. GIANT SCULPTED 3D CROCODILE HEAD & HINGED OPEN JAWS */}
        <View
          style={styles.stageContainer}
          onLayout={(e) => {
            const { width: lw, height: lh } = e.nativeEvent.layout;
            if (lw > 60 && lh > 60) {
              setStageBox((prev) =>
                Math.abs(prev.w - lw) > 2 || Math.abs(prev.h - lh) > 2 ? { w: lw, h: lh } : prev,
              );
            }
          }}
        >
          <Animated.View
            testID="casau-jaws"
            style={[
              styles.crocStageBox,
              {
                width: renderW,
                height: renderH,
                transform: isMeBitten
                  ? [{ translateX: shakeAnim }, { translateY: shakeYAnim }, { scale: lungeScale }]
                  : [],
              },
            ]}
          >
            {/* LAYER A: Deep Throat Cavern, Fleshy Ridged Tongue, Lower Scaly Jaw & Lower 8 Teeth */}
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Svg
              width={renderW}
              height={renderH}
              viewBox={`0 0 ${STAGE_VW} ${STAGE_VH}`}
              style={StyleSheet.absoluteFill}
            >
              <Defs>
                <SvgRadialGradient id="throatGrad" cx="50%" cy="48%" rx="52%" ry="52%">
                  <Stop offset="0%" stopColor="#5C0F1D" />
                  <Stop offset="62%" stopColor="#2F060D" />
                  <Stop offset="100%" stopColor="#160206" />
                </SvgRadialGradient>
                <SvgLinearGradient id="tongueGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#FDA4AF" />
                  <Stop offset="48%" stopColor="#F43F5E" />
                  <Stop offset="100%" stopColor="#9F1239" />
                </SvgLinearGradient>
                <SvgLinearGradient id="lowerJawGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#2F9E44" />
                  <Stop offset="55%" stopColor="#196127" />
                  <Stop offset="100%" stopColor="#092E14" />
                </SvgLinearGradient>
                <SvgLinearGradient id="bellyScaleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#A3E635" stopOpacity="0.45" />
                  <Stop offset="100%" stopColor="#15803D" stopOpacity="0.2" />
                </SvgLinearGradient>
                <SvgLinearGradient id="lowerGumGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#FDA4AF" />
                  <Stop offset="52%" stopColor="#E11D48" />
                  <Stop offset="100%" stopColor="#881337" />
                </SvgLinearGradient>
                <SvgLinearGradient id="toothIvoryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#FFFDF7" />
                  <Stop offset="62%" stopColor="#F3ECE0" />
                  <Stop offset="100%" stopColor="#D6CEBF" />
                </SvgLinearGradient>
                <SvgLinearGradient id="toothPressedGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#94A3B8" />
                  <Stop offset="100%" stopColor="#475569" />
                </SvgLinearGradient>
                <SvgLinearGradient id="toothGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#FEF9C3" />
                  <Stop offset="45%" stopColor="#FACC15" />
                  <Stop offset="100%" stopColor="#B45309" />
                </SvgLinearGradient>
                <SvgLinearGradient id="toothRevGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#E0F2FE" />
                  <Stop offset="50%" stopColor="#38BDF8" />
                  <Stop offset="100%" stopColor="#0369A1" />
                </SvgLinearGradient>
                <SvgLinearGradient id="toothSoreGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#FEF08A" />
                  <Stop offset="42%" stopColor="#EF4444" />
                  <Stop offset="100%" stopColor="#7F1D1D" />
                </SvgLinearGradient>
              </Defs>

              {/* Drop shadow beneath crocodile head */}
              <Ellipse cx="220" cy="390" rx="176" ry="14" fill="rgba(0, 0, 0, 0.42)" />

              {/* Outer jaw cheek hinges connecting upper & lower jaws */}
              <Path
                d="M 48 188 Q 34 236 52 288 L 88 296 Q 76 238 88 186 Z"
                fill="#14532D"
                stroke="#0A2E16"
                strokeWidth="2"
              />
              <Path
                d="M 392 188 Q 406 236 388 288 L 352 296 Q 364 238 352 186 Z"
                fill="#14532D"
                stroke="#0A2E16"
                strokeWidth="2"
              />

              {/* Deep Cavernous Throat Center */}
              <Path
                d="M 66 176 Q 220 124 374 176 Q 388 236 372 292 Q 220 344 68 292 Q 52 236 66 176 Z"
                fill="url(#throatGrad)"
                stroke="#3B0712"
                strokeWidth="3"
              />

              {/* Inner cheek muscular tendons */}
              <Path
                d="M 74 182 Q 92 234 76 286"
                stroke="#9F1239"
                strokeWidth="9"
                strokeLinecap="round"
                fill="none"
                opacity="0.72"
              />
              <Path
                d="M 366 182 Q 348 234 364 286"
                stroke="#9F1239"
                strokeWidth="9"
                strokeLinecap="round"
                fill="none"
                opacity="0.72"
              />

              {/* Deep throat palate arch */}
              <Ellipse cx="220" cy="216" rx="92" ry="34" fill="#1A0206" />

              {/* Ridged, Fleshy Pink Crocodile Tongue */}
              <Path
                d="M 118 272 Q 134 222 220 220 Q 306 222 322 272 Q 308 318 220 322 Q 132 318 118 272 Z"
                fill="url(#tongueGrad)"
                stroke="#881337"
                strokeWidth="2.2"
              />
              {/* Tongue central crease & fleshy ridges */}
              <Path
                d="M 220 226 Q 220 268 220 310"
                stroke="#881337"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
                opacity="0.65"
              />
              <Path d="M 156 246 Q 220 258 284 246" stroke="#FFE4E6" strokeWidth="2" fill="none" opacity="0.35" />
              <Path d="M 144 266 Q 220 280 296 266" stroke="#FFE4E6" strokeWidth="2" fill="none" opacity="0.35" />
              <Path d="M 152 288 Q 220 302 288 288" stroke="#FFE4E6" strokeWidth="2" fill="none" opacity="0.3" />

              {/* Heavy Scaly Green Lower Jaw & Chin */}
              <Path
                d="M 50 254 Q 60 368 220 390 Q 380 368 390 254 L 368 274 Q 220 344 72 274 Z"
                fill="url(#lowerJawGrad)"
                stroke="#072510"
                strokeWidth="2.8"
              />
              {/* Lower chin lighter dermal belly plate */}
              <Path
                d="M 104 334 Q 220 378 336 334 Q 296 382 220 385 Q 144 382 104 334 Z"
                fill="url(#bellyScaleGrad)"
              />
              {/* Chin dermal scale bumps */}
              <Ellipse cx="96" cy="320" rx="13" ry="7" fill="#14532D" opacity="0.8" />
              <Ellipse cx="132" cy="342" rx="15" ry="7.5" fill="#14532D" opacity="0.75" />
              <Ellipse cx="344" cy="320" rx="13" ry="7" fill="#14532D" opacity="0.8" />
              <Ellipse cx="308" cy="342" rx="15" ry="7.5" fill="#14532D" opacity="0.75" />

              {/* Curved Lower Pink Gum Arch (back rim) */}
              <Path
                d="M 66 274 Q 220 338 374 274 L 366 296 Q 220 358 74 296 Z"
                fill="url(#lowerGumGrad)"
                stroke="#881337"
                strokeWidth="2"
              />

              {/* Lower Sculpted 3D Ivory Teeth (pointing UPWARD along U-curve) */}
              {lowerGeom.map((g) => renderSvgTooth(g))}

              {/* Lower Gum Front Lip overlapping tooth roots for authentic 3D socket depth */}
              <Path
                d="M 68 282 Q 220 346 372 282 Q 366 300 356 304 Q 220 360 84 304 Q 74 300 68 282 Z"
                fill="url(#lowerGumGrad)"
              />
              <Path
                d="M 86 292 Q 220 348 354 292"
                stroke="rgba(255, 228, 230, 0.48)"
                strokeWidth="2"
                fill="none"
              />
            </Svg>
            </View>

            {/* LAYER B: Lower Teeth Touch Hitboxes */}
            <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
              {lowerGeom.map((g) => renderToothHitbox(g))}
            </View>

            {/* LAYER C: HINGED ANIMATED UPPER HEAD, SNOUT, BULGING EYES, NOSTRILS & UPPER 8 TEETH */}
            <Animated.View
              pointerEvents="box-none"
              style={[
                StyleSheet.absoluteFill,
                {
                  transform: [{ translateY: upperTranslateY }],
                },
              ]}
            >
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <Svg
                width={renderW}
                height={renderH}
                viewBox={`0 0 ${STAGE_VW} ${STAGE_VH}`}
                style={StyleSheet.absoluteFill}
              >
                <Defs>
                  <SvgLinearGradient id="upperSnoutGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor="#37B24D" />
                    <Stop offset="48%" stopColor="#1B5E20" />
                    <Stop offset="100%" stopColor="#0B3B17" />
                  </SvgLinearGradient>
                  <SvgLinearGradient id="snoutBridgeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor="#51CF66" stopOpacity="0.65" />
                    <Stop offset="100%" stopColor="#1B5E20" stopOpacity="0.1" />
                  </SvgLinearGradient>
                  <SvgLinearGradient id="upperGumGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor="#9F1239" />
                    <Stop offset="55%" stopColor="#E11D48" />
                    <Stop offset="100%" stopColor="#FDA4AF" />
                  </SvgLinearGradient>
                  <SvgRadialGradient id="eyeWaitGrad" cx="42%" cy="38%" rx="58%" ry="58%">
                    <Stop offset="0%" stopColor="#FEF9C3" />
                    <Stop offset="55%" stopColor="#FACC15" />
                    <Stop offset="100%" stopColor="#B45309" />
                  </SvgRadialGradient>
                  <SvgRadialGradient id="eyeBiteGrad" cx="45%" cy="42%" rx="58%" ry="58%">
                    <Stop offset="0%" stopColor="#FEE2E2" />
                    <Stop offset="42%" stopColor="#EF4444" />
                    <Stop offset="100%" stopColor="#7F1D1D" />
                  </SvgRadialGradient>
                </Defs>

                {/* Curved Upper Pink Gum Arch (underside of snout) */}
                <Path
                  d="M 66 186 Q 220 120 374 186 L 368 164 Q 220 100 72 164 Z"
                  fill="url(#upperGumGrad)"
                  stroke="#881337"
                  strokeWidth="2"
                />

                {/* Upper Sculpted 3D Ivory Teeth (pointing DOWNWARD along U-curve) */}
                {upperGeom.map((g) => renderSvgTooth(g))}

                {/* Upper Gum Lip overlapping upper tooth roots */}
                <Path
                  d="M 64 182 Q 220 116 376 182 Q 372 164 362 158 Q 220 98 78 158 Q 68 164 64 182 Z"
                  fill="url(#upperGumGrad)"
                />
                <Path
                  d="M 82 172 Q 220 112 358 172"
                  stroke="rgba(255, 228, 230, 0.55)"
                  strokeWidth="2"
                  fill="none"
                />

                {/* Broad Emerald-Green 3D Upper Snout Dome */}
                <Path
                  d="M 46 194 Q 44 108 104 72 Q 220 42 336 72 Q 396 108 394 194 Q 372 176 356 168 Q 220 108 84 168 Q 68 176 46 194 Z"
                  fill="url(#upperSnoutGrad)"
                  stroke="#072510"
                  strokeWidth="3"
                />

                {/* Sculpted Central Snout Bridge & Specular Sheen */}
                <Path
                  d="M 142 74 Q 220 56 298 74 Q 318 122 292 138 Q 220 116 148 138 Q 122 122 142 74 Z"
                  fill="url(#snoutBridgeGrad)"
                />

                {/* Textured Dermal Scale Bumps on Snout & Cheeks */}
                <Ellipse cx="220" cy="78" rx="18" ry="7.5" fill="#14532D" stroke="#40C057" strokeWidth="1" />
                <Ellipse cx="220" cy="97" rx="22" ry="8" fill="#14532D" stroke="#40C057" strokeWidth="1" />
                <Ellipse cx="184" cy="90" rx="11" ry="5.5" fill="#0F3F1C" />
                <Ellipse cx="256" cy="90" rx="11" ry="5.5" fill="#0F3F1C" />
                <Ellipse cx="92" cy="134" rx="16" ry="8" fill="#14532D" opacity="0.85" />
                <Ellipse cx="74" cy="158" rx="13" ry="6.5" fill="#0F3F1C" opacity="0.85" />
                <Ellipse cx="348" cy="134" rx="16" ry="8" fill="#14532D" opacity="0.85" />
                <Ellipse cx="366" cy="158" rx="13" ry="6.5" fill="#0F3F1C" opacity="0.85" />

                {/* Two Raised Nostril Bumps at Front Snout Tip */}
                <G>
                  <Ellipse cx="174" cy="122" rx="19" ry="12" fill="#2F9E44" stroke="#0B3B17" strokeWidth="2" />
                  <Ellipse cx="174" cy="123" rx="9.5" ry="6" fill={isBite ? '#7F1D1D' : '#071F0E'} />
                  {isBite && <Circle cx="174" cy="123" r="4" fill="#EF4444" />}

                  <Ellipse cx="266" cy="122" rx="19" ry="12" fill="#2F9E44" stroke="#0B3B17" strokeWidth="2" />
                  <Ellipse cx="266" cy="123" rx="9.5" ry="6" fill={isBite ? '#7F1D1D' : '#071F0E'} />
                  {isBite && <Circle cx="266" cy="123" r="4" fill="#EF4444" />}
                </G>

                {/* Puffing Angry Steam Clouds from Nostrils on Snap! */}
                {isBite && (
                  <G opacity="0.92">
                    <Circle cx="142" cy="112" r="9" fill="#F8FAFC" />
                    <Circle cx="126" cy="103" r="12" fill="#E2E8F0" />
                    <Circle cx="112" cy="94" r="8" fill="#CBD5E1" />
                    <Circle cx="298" cy="112" r="9" fill="#F8FAFC" />
                    <Circle cx="314" cy="103" r="12" fill="#E2E8F0" />
                    <Circle cx="328" cy="94" r="8" fill="#CBD5E1" />
                  </G>
                )}

                {/* Two Large Bulging 3D Reptile Eye Turrets Perched on Top */}
                {[
                  { cx: 130, cy: 56, side: -1 },
                  { cx: 310, cy: 56, side: 1 },
                ].map((eye, idx) => {
                  const px = eye.cx + effectivePupilShift;
                  const slitW = isBite ? 5.5 : Math.max(3.2, 6.2 - tension * 2.6);
                  return (
                    <G key={`eye-${idx}`}>
                      {/* Scaly green eye socket turret */}
                      <Circle
                        cx={eye.cx}
                        cy={eye.cy}
                        r="35"
                        fill="#2B8A3E"
                        stroke="#072510"
                        strokeWidth="2.8"
                      />
                      <Path
                        d={`M ${eye.cx - 30} ${eye.cy - 12} Q ${eye.cx} ${eye.cy - 38} ${eye.cx + 30} ${eye.cy - 12}`}
                        stroke="#51CF66"
                        strokeWidth="3"
                        fill="none"
                        opacity="0.65"
                      />

                      {/* Bulging 3D Reptile Eyeball */}
                      <Ellipse
                        cx={eye.cx}
                        cy={eye.cy + 2}
                        rx="25"
                        ry="26"
                        fill={isBite ? 'url(#eyeBiteGrad)' : 'url(#eyeWaitGrad)'}
                        stroke={isBite ? '#991B1B' : '#14532D'}
                        strokeWidth="2.5"
                      />

                      {/* Cat-Slit Reptile Pupil */}
                      <Path
                        d={`M ${px} ${eye.cy - 17} Q ${px + slitW} ${eye.cy + 2} ${px} ${eye.cy + 21} Q ${px - slitW} ${eye.cy + 2} ${px} ${eye.cy - 17} Z`}
                        fill={isBite ? '#2A0404' : '#090D16'}
                      />
                      {isBite && (
                        <Ellipse cx={px} cy={eye.cy + 2} rx="2" ry="11" fill="#FEF08A" />
                      )}

                      {/* Glossy Eye Specular Catchlights */}
                      <Circle cx={eye.cx - 8} cy={eye.cy - 8} r="5.2" fill="#FFFFFF" opacity="0.92" />
                      <Circle cx={eye.cx + 7} cy={eye.cy + 9} r="2.4" fill="#FFFFFF" opacity="0.7" />

                      {/* Calm Eyelid vs Fierce Angry V-Brows on Snap */}
                      {isBite ? (
                        <Path
                          d={
                            eye.side === -1
                              ? `M ${eye.cx - 28} ${eye.cy - 22} L ${eye.cx + 27} ${eye.cy - 3} L ${eye.cx + 24} ${eye.cy - 22} Q ${eye.cx} ${eye.cy - 36} ${eye.cx - 28} ${eye.cy - 22} Z`
                              : `M ${eye.cx + 28} ${eye.cy - 22} L ${eye.cx - 27} ${eye.cy - 3} L ${eye.cx - 24} ${eye.cy - 22} Q ${eye.cx} ${eye.cy - 36} ${eye.cx + 28} ${eye.cy - 22} Z`
                          }
                          fill="#0B3B17"
                          stroke="#EF4444"
                          strokeWidth="1.8"
                        />
                      ) : tension >= 0.45 ? (
                        <Path
                          d={`M ${eye.cx - 26} ${eye.cy - 14} Q ${eye.cx} ${eye.cy - 24} ${eye.cx + 26} ${eye.cy - 14} Q ${eye.cx} ${eye.cy - 34} ${eye.cx - 26} ${eye.cy - 14} Z`}
                          fill="#14532D"
                        />
                      ) : null}
                    </G>
                  );
                })}
              </Svg>
              </View>

              {/* Upper Teeth Touch Hitboxes (moves 1:1 with Hinged Upper Jaw!) */}
              <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                {upperGeom.map((g) => renderToothHitbox(g))}
              </View>
            </Animated.View>

            {/* LAYER D: Suspense Counter Inside/Below Jaw OR Comic-Book "PHẬP!!" Starburst */}
            {!isBite ? (
              <View pointerEvents="none" style={styles.jawSuspensePillWrap}>
                <View style={[styles.jawSuspensePill, tension >= 0.6 && styles.jawSuspensePillHot]}>
                  <T selectable={false} style={styles.jawSuspenseTxt}>
                    {intactCount <= 4
                      ? `Còn ${intactCount} răng lành · Răng vàng +40đ`
                      : `Còn ${intactCount} răng lành · Vàng +40đ · Đảo chiều`}
                  </T>
                </View>
              </View>
            ) : (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.starburstOverlay,
                  {
                    transform: [{ scale: burstScale }],
                  },
                ]}
              >
                <Svg width={210} height={110} viewBox="0 0 210 110">
                  <Polygon
                    points={starburstPoints(105, 55, 52, 34, 14)}
                    fill="#EF4444"
                    stroke="#FEF08A"
                    strokeWidth="3.5"
                  />
                  <Polygon
                    points={starburstPoints(105, 55, 41, 26, 14)}
                    fill="#FACC15"
                  />
                </Svg>
                <View style={styles.starburstTextWrap}>
                  <T selectable={false} style={styles.starburstTitle}>
                    PHẬP!!
                  </T>
                  <T selectable={false} numberOfLines={1} style={styles.starburstSub}>
                    {view.names[view.bittenPlayerId ?? ''] ?? 'Trúng bẫy'} (-25đ)
                  </T>
                </View>
              </Animated.View>
            )}
          </Animated.View>
        </View>

        {/* Subtle theme-aware micro caption OR Victim-Free Tease Banner */}
        {isOtherBitten ? (
          <View testID="casau-safe-tease-banner" style={styles.safeTeaseBanner}>
            <T numberOfLines={1} style={styles.safeTeaseTxt}>
              {view.names[view.bittenPlayerId ?? ''] ?? 'Đối thủ'} vừa trúng răng sâu #{(view.trapTooth ?? 0) + 1} (-25đ)
            </T>
          </View>
        ) : (
          <T numberOfLines={1} style={[styles.microFooter, { color: pal.muted }]}>
            {isMyTurn
              ? 'Chạm trực tiếp vào chiếc răng trắng trên hàm cá sấu để khám'
              : 'Răng nhấn an toàn cộng điểm tăng dần · Đụng trúng răng sâu cá sấu sập hàm'}
          </T>
        )}
      </Animated.View>

      {/* LỚP PHỦ JUMPSCARE HÙ DỌA — CHỈ HIỆN TRÊN MÁY NGƯỜI BỊ CÁ SẤU ĐỚP */}
      {isMeBitten && (
        <View pointerEvents="none" testID="casau-jumpscare-overlay" style={styles.jumpscareWrap}>
          <Animated.View style={[styles.jumpscareRedVeil, { opacity: strobeOpacity }]} />
          <Svg width="100%" height="100%" viewBox="0 0 400 700" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
            {/* Hàm răng nanh khổng lồ lao từ viền trên xuống */}
            <Path
              d="M0 0 L400 0 L400 120 L355 215 L312 105 L268 245 L220 92 L172 252 L126 108 L78 228 L34 112 L0 185 Z"
              fill="#090D16"
            />
            <Path
              d="M0 0 L400 0 L400 95 L355 205 L312 85 L268 235 L220 75 L172 242 L126 88 L78 218 L34 92 L0 170 Z"
              fill="#DC2626"
              fillOpacity={0.35}
            />
            <Polygon points="28,72 58,218 88,72" fill="#FFFDF7" stroke="#7F1D1D" strokeWidth="3" />
            <Polygon points="118,68 152,248 186,68" fill="#FFFDF7" stroke="#7F1D1D" strokeWidth="3" />
            <Polygon points="214,68 248,248 282,68" fill="#FFFDF7" stroke="#7F1D1D" strokeWidth="3" />
            <Polygon points="312,72 344,218 374,72" fill="#FFFDF7" stroke="#7F1D1D" strokeWidth="3" />

            {/* Hàm răng nanh khổng lồ vồ từ đáy màn hình lên */}
            <Path
              d="M0 700 L400 700 L400 580 L355 485 L312 595 L268 455 L220 608 L172 448 L126 592 L78 472 L34 588 L0 515 Z"
              fill="#090D16"
            />
            <Polygon points="28,628 58,482 88,628" fill="#FFFDF7" stroke="#7F1D1D" strokeWidth="3" />
            <Polygon points="118,632 152,452 186,632" fill="#FFFDF7" stroke="#7F1D1D" strokeWidth="3" />
            <Polygon points="214,632 248,452 282,632" fill="#FFFDF7" stroke="#7F1D1D" strokeWidth="3" />
            <Polygon points="312,628 344,482 374,628" fill="#FFFDF7" stroke="#7F1D1D" strokeWidth="3" />
          </Svg>

          <View style={styles.jumpscareCard}>
            <T style={styles.jumpscareBoom}>Cá sấu đã đớp trúng tay</T>
            <T style={styles.jumpscareSub}>
              Bấm trúng răng sâu #{(view.trapTooth ?? 0) + 1} (-25đ)
            </T>
          </View>
        </View>
      )}
    </Shell>
  );
}

const styles = StyleSheet.create({
  rootFill: {
    flex: 1,
    minHeight: 0,
    gap: 8,
    marginHorizontal: -4,
  },

  topStripCard: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  topStripCardTight: {
    paddingVertical: 6,
    gap: 4,
  },
  topRowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roundPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  roundPillTxt: {
    fontSize: 11.5,
    fontWeight: '600',
    fontFamily: FONT,
    fontVariant: ['tabular-nums'],
  },
  teethPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  teethPillTxt: {
    fontSize: 11.5,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  timerInlineWrap: {
    flex: 1,
    minWidth: 70,
  },
  hostEndChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  hostEndChipConfirm: {
    backgroundColor: C.danger,
    borderColor: '#991B1B',
  },
  hostEndChipTxt: {
    fontSize: 11,
    fontWeight: '600',
  },

  playerStripScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 1,
  },
  playerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  playerChipTurn: {
    backgroundColor: C.jadeSoft,
    borderColor: 'rgba(21, 128, 61, 0.35)',
  },
  playerChipTurnDark: {
    backgroundColor: 'rgba(21, 128, 61, 0.28)',
    borderColor: '#4ADE80',
  },
  playerChipBitten: {
    backgroundColor: C.dangerSoft,
    borderColor: 'rgba(185, 28, 28, 0.35)',
  },
  playerChipBittenDark: {
    backgroundColor: 'rgba(185, 28, 28, 0.28)',
    borderColor: '#FCA5A5',
  },
  playerChipName: {
    maxWidth: 68,
    fontSize: 11.5,
    fontWeight: '500',
  },
  playerChipScore: {
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  playerBiteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  playerChipBites: {
    fontSize: 10.5,
    fontWeight: '600',
    color: C.danger,
    fontVariant: ['tabular-nums'],
  },

  statusBanner: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusBannerTurn: {
    backgroundColor: C.jadeSoft,
    borderWidth: 1,
    borderColor: 'rgba(21, 128, 61, 0.25)',
  },
  statusBannerTurnDark: {
    backgroundColor: 'rgba(21, 128, 61, 0.24)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.4)',
  },
  statusBannerBite: {
    backgroundColor: C.dangerSoft,
    borderWidth: 1,
    borderColor: 'rgba(185, 28, 28, 0.28)',
  },
  statusBannerBiteDark: {
    backgroundColor: 'rgba(185, 28, 28, 0.28)',
    borderWidth: 1,
    borderColor: 'rgba(252, 165, 165, 0.4)',
  },
  statusBannerErr: {
    backgroundColor: C.dangerSoft,
    borderWidth: 1,
    borderColor: 'rgba(185, 28, 28, 0.35)',
  },
  statusBannerErrDark: {
    backgroundColor: 'rgba(185, 28, 28, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(252, 165, 165, 0.5)',
  },
  statusBannerTxt: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },

  stageContainer: {
    flex: 1,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crocStageBox: {
    position: 'relative',
    ...(Platform.OS === 'web'
      ? ({
          userSelect: 'none',
          WebkitUserSelect: 'none',
        } as object)
      : null),
  },

  toothHitbox: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  toothHitboxInteractive: {
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null),
  },
  toothIndexLbl: {
    fontSize: 9.5,
    fontWeight: '600',
    color: 'rgba(71, 85, 105, 0.78)',
    fontVariant: ['tabular-nums'],
  },
  toothIndexLblActive: {
    color: '#854D0E',
  },
  toothBadgeSafe: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(6, 78, 59, 0.92)',
    borderWidth: 1,
    borderColor: '#34D399',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toothBadgeGold: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(120, 53, 15, 0.92)',
    borderWidth: 1,
    borderColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toothBadgeRev: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(12, 74, 110, 0.92)',
    borderWidth: 1,
    borderColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toothBadgeSore: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#7F1D1D',
    borderWidth: 1,
    borderColor: '#FEF08A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  jawSuspensePillWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '4%',
    alignItems: 'center',
  },
  jawSuspensePill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(17, 20, 28, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(251, 249, 245, 0.16)',
  },
  jawSuspensePillHot: {
    backgroundColor: 'rgba(159, 43, 54, 0.92)',
    borderColor: 'rgba(254, 243, 199, 0.45)',
  },
  jawSuspenseTxt: {
    fontSize: 11,
    fontWeight: '600',
    color: C.darkText,
    fontVariant: ['tabular-nums'],
  },

  starburstOverlay: {
    position: 'absolute',
    top: '34%',
    alignSelf: 'center',
    width: 210,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starburstTextWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  starburstTitle: {
    fontSize: 19,
    fontWeight: '600',
    color: '#7F1D1D',
    fontFamily: FONT,
  },
  starburstSub: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#450A0A',
    maxWidth: 145,
    fontVariant: ['tabular-nums'],
  },

  microFooter: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    paddingBottom: 2,
  },
  safeTeaseBanner: {
    alignSelf: 'center',
    backgroundColor: C.jadeSoft,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(21, 128, 61, 0.30)',
  },
  safeTeaseTxt: {
    fontSize: 11.5,
    fontWeight: '600',
    color: C.jadeDeep,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  jumpscareWrap: {
    ...StyleSheet.absoluteFill,
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jumpscareRedVeil: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(185, 28, 28, 0.52)',
    borderWidth: 6,
    borderColor: C.danger,
  },
  jumpscareCard: {
    backgroundColor: C.darkBg,
    borderWidth: 1.5,
    borderColor: C.gold,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 16,
  },
  jumpscareBoom: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FCA5A5',
    textAlign: 'center',
    fontFamily: FONT,
  },
  jumpscareSub: {
    fontSize: 13.5,
    fontWeight: '500',
    color: C.goldSoft,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});
