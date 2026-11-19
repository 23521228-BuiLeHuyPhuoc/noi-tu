import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import {
  CROAK_CARRY_MULT,
  CROAK_DT,
  CROAK_FROG_H,
  CROAK_FROG_W,
  CROAK_GRAVITY,
  CROAK_JUMP_VY,
  CROAK_MAX_FALL,
  CROAK_MOVE_SPEED,
  CROAK_STAGES,
  CROAK_TONGUE_RANGE,
  computeSpitArc,
  getSolidRects,
  moveAndCollideFrog,
  platformRectAt,
  type CroakInput,
  type CroakRect,
  type CroakSoundFx,
  type CroakSquadView,
  type CroakStageDef,
  type CroakTickPayload,
  type FrogState,
} from '../../../shared/src/croaksquad';
import { PLAYER_COLORS, type RoomState } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { isMuted, playMemePool } from '../sound';
import { ViewportContext, useStableWindow } from '../hooks';
import { C, FONT } from '../theme';
import { T } from '../ui';
import { Shell } from '../components/Shell';
import { Rotator } from '../components/Rotator';
import { UiIcon, emojiSvgUri } from '../components/Icons';
import { Confetti } from '../components/Fun';

// ============================================================================
// SINGLETON WEBAUDIO SYNTH (KHÔNG TẠO MỚI AudioContext MỖI NHỊP -> 0 GC LAG)
// ============================================================================

let sharedAudioCtx: AudioContext | null = null;

function getCroakAudioCtx(): AudioContext | null {
  if (Platform.OS !== 'web') return null;
  if (!sharedAudioCtx) {
    const AudioCtor =
      (globalThis as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
      (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return null;
    sharedAudioCtx = new AudioCtor();
  }
  if (sharedAudioCtx.state === 'suspended') {
    void sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

function playCroakSfx(sfx: CroakSoundFx): void {
  if (isMuted()) return;
  if (sfx === 'swallow' || sfx === 'spit') playMemePool('troll', { cooldownMs: 1800 });
  else if (sfx === 'bounce') playMemePool('turn_move', { cooldownMs: 3000 });
  else if (sfx === 'switch') playMemePool('twist', { cooldownMs: 2200 });
  else if (sfx === 'key') playMemePool('money', { cooldownMs: 1800 });
  else if (sfx === 'checkpoint') playMemePool('correct', { cooldownMs: 2200 });
  else if (sfx === 'stage_clear') playMemePool('win', { cooldownMs: 1800 });
  else if (sfx === 'die') playMemePool('bite', { cooldownMs: 2200 });

  if (Platform.OS !== 'web') return;
  try {
    const ctx = getCroakAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    if (sfx === 'jump') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(250, now);
      osc.frequency.exponentialRampToValueAtTime(540, now + 0.1);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      osc.start(now);
      osc.stop(now + 0.11);
    } else if (sfx === 'tongue' || sfx === 'swallow') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(sfx === 'swallow' ? 190 : 390, now);
      osc.frequency.exponentialRampToValueAtTime(sfx === 'swallow' ? 460 : 210, now + 0.12);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      osc.start(now);
      osc.stop(now + 0.13);
    } else if (sfx === 'spit' || sfx === 'bounce') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(760, now + 0.15);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.start(now);
      osc.stop(now + 0.16);
    } else if (sfx === 'switch' || sfx === 'key' || sfx === 'checkpoint' || sfx === 'stage_clear') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(660, now + 0.06);
      osc.frequency.setValueAtTime(sfx === 'stage_clear' ? 880 : 784, now + 0.13);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
      osc.start(now);
      osc.stop(now + 0.26);
    } else if (sfx === 'die') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(95, now + 0.19);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.09);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    }
  } catch {
    // Trình duyệt chặn tự phát trước tương tác đầu tiên: bỏ qua an toàn
  }
}

// ============================================================================
// BỘ NẠP SPRITE VECTOR MICROSOFT FLUENT EMOJI 3D CHO CANVAS 60FPS
// ============================================================================

interface CroakSprites {
  frog: HTMLImageElement | null;
  crown: HTMLImageElement | null;
  key: HTMLImageElement | null;
  lotus: HTMLImageElement | null;
  mushroom: HTMLImageElement | null;
  bubble: HTMLImageElement | null;
  rocket: HTMLImageElement | null;
}

let cachedSprites: CroakSprites | null = null;

function loadFluentImage(emoji: string): HTMLImageElement | null {
  if (Platform.OS !== 'web' || typeof Image === 'undefined') return null;
  const img = new Image();
  img.decoding = 'async';
  img.src = emojiSvgUri(emoji);
  return img;
}

function getCroakSprites(): CroakSprites {
  if (!cachedSprites) {
    cachedSprites = {
      frog: loadFluentImage('🐸'),
      crown: loadFluentImage('👑'),
      key: loadFluentImage('🔑'),
      lotus: loadFluentImage('🪷'),
      mushroom: loadFluentImage('🍄'),
      bubble: loadFluentImage('🫧'),
      rocket: loadFluentImage('🚀'),
    };
  }
  return cachedSprites;
}

// ============================================================================
// HÀM VẼ ĐỊA HÌNH PHONG CÁCH KENNEY PLATFORMER DELUXE (OFFSCREEN CACHE)
// ============================================================================

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rad = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function bakeStageStaticCanvas(
  stage: CroakStageDef,
  switchesOn: Record<string, boolean>,
): HTMLCanvasElement | null {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return null;
  const off = document.createElement('canvas');
  off.width = stage.width;
  off.height = stage.height;
  const ctx = off.getContext('2d');
  if (!ctx) return null;

  // 1. Bầu trời rừng đầm lầy chạng vạng đa tầng chiều sâu
  const skyGrad = ctx.createLinearGradient(0, 0, 0, stage.height);
  skyGrad.addColorStop(0, '#051523');
  skyGrad.addColorStop(0.46, '#0B2D3D');
  skyGrad.addColorStop(0.82, '#114B48');
  skyGrad.addColorStop(1, '#092B29');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, stage.width, stage.height);

  // Mặt trăng sương mù dịu nhẹ phía xa
  const moonX = stage.width * 0.72;
  const moonY = 108;
  const moonGlow = ctx.createRadialGradient(moonX, moonY, 14, moonX, moonY, 130);
  moonGlow.addColorStop(0, 'rgba(254, 249, 195, 0.42)');
  moonGlow.addColorStop(0.45, 'rgba(153, 246, 228, 0.14)');
  moonGlow.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = moonGlow;
  ctx.beginPath();
  ctx.arc(moonX, moonY, 130, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(254, 249, 195, 0.85)';
  ctx.beginPath();
  ctx.arc(moonX, moonY, 30, 0, Math.PI * 2);
  ctx.fill();

  // Dãy đồi & tán cây đầm lầy xa mờ (Kenney Parallax Silhouette)
  ctx.fillStyle = 'rgba(6, 38, 45, 0.68)';
  ctx.beginPath();
  ctx.moveTo(0, stage.height);
  for (let x = 0; x <= stage.width; x += 90) {
    const hillY = stage.height - 220 - Math.sin(x * 0.0065 + stage.index) * 58 - Math.cos(x * 0.014) * 26;
    ctx.lineTo(x, hillY);
  }
  ctx.lineTo(stage.width, stage.height);
  ctx.closePath();
  ctx.fill();

  // Trụ đá cổ & dây leo mờ ở hậu cảnh
  ctx.fillStyle = 'rgba(13, 62, 62, 0.48)';
  for (let px = 150; px < stage.width; px += 340) {
    const ph = 180 + ((px * 17) % 110);
    roundRectPath(ctx, px, stage.height - ph - 80, 34, ph, 8);
    ctx.fill();
    roundRectPath(ctx, px - 8, stage.height - ph - 90, 50, 14, 5);
    ctx.fill();
  }

  // 2. Vẽ các địa hình tĩnh (moss, stone, và khung cầu ẩn chưa bật)
  for (const plat of stage.platforms) {
    if (plat.move) continue; // Bệ di động vẽ động ở 60fps
    if (plat.kind === 'bounce') continue; // Nấm nhún vẽ động ở 60fps
    if (plat.x + plat.w <= 0 || plat.x >= stage.width) continue;

    const active = !plat.activeWhenSwitch || !!switchesOn[plat.activeWhenSwitch];
    if (!active) {
      ctx.save();
      ctx.setLineDash([9, 7]);
      roundRectPath(ctx, plat.x, plat.y, plat.w, plat.h, 8);
      ctx.fillStyle = 'rgba(251, 191, 36, 0.09)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.72)';
      ctx.stroke();
      ctx.restore();
      continue;
    }

    if (plat.kind === 'wood') {
      drawKenneyWoodPlank(ctx, plat.x, plat.y, plat.w, plat.h);
      continue;
    }

    if (plat.kind === 'stone') {
      // Khối gạch đá Đền Cổ (Kenney Stone Block Tile)
      const stoneGrad = ctx.createLinearGradient(plat.x, plat.y, plat.x, plat.y + plat.h);
      stoneGrad.addColorStop(0, '#64748B');
      stoneGrad.addColorStop(1, '#334155');
      roundRectPath(ctx, plat.x, plat.y, plat.w, plat.h, 8);
      ctx.fillStyle = stoneGrad;
      ctx.fill();
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = '#1E293B';
      ctx.stroke();

      // Viền sáng bevel đỉnh khối đá
      roundRectPath(ctx, plat.x + 3, plat.y + 3, Math.max(6, plat.w - 6), 6, 3);
      ctx.fillStyle = 'rgba(226, 232, 240, 0.42)';
      ctx.fill();

      // Đường mạch gạch đá so le
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
      ctx.lineWidth = 1.4;
      for (let by = plat.y + 24; by < plat.y + plat.h - 6; by += 24) {
        ctx.beginPath();
        ctx.moveTo(plat.x + 4, by);
        ctx.lineTo(plat.x + plat.w - 4, by);
        ctx.stroke();
        const rowShift = ((Math.floor((by - plat.y) / 24) % 2) * 18);
        for (let bx = plat.x + 28 + rowShift; bx < plat.x + plat.w - 10; bx += 38) {
          ctx.beginPath();
          ctx.moveTo(bx, by - 22);
          ctx.lineTo(bx, by);
          ctx.stroke();
        }
      }
      continue;
    }

    // Địa hình đất & thảm cỏ xanh mướt chuẩn Kenney Grass Platformer
    const soilGrad = ctx.createLinearGradient(plat.x, plat.y, plat.x, plat.y + plat.h);
    soilGrad.addColorStop(0, '#5C3A21');
    soilGrad.addColorStop(0.45, '#3E2514');
    soilGrad.addColorStop(1, '#23140B');
    roundRectPath(ctx, plat.x, plat.y, plat.w, plat.h, 10);
    ctx.fillStyle = soilGrad;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#1A0F08';
    ctx.stroke();

    // Hạt sỏi trang trí trong lòng đất
    ctx.fillStyle = 'rgba(120, 78, 46, 0.42)';
    for (let sx = plat.x + 22; sx < plat.x + plat.w - 22; sx += 46) {
      const sy = plat.y + 34 + ((sx * 13) % Math.max(12, Math.min(60, plat.h - 40)));
      if (sy + 8 < plat.y + plat.h) {
        roundRectPath(ctx, sx, sy, 14, 8, 4);
        ctx.fill();
      }
    }

    // Mũ cỏ xanh non phủ rủ mép (scalloped grass overhang)
    const capH = Math.min(18, plat.h);
    const grassGrad = ctx.createLinearGradient(plat.x, plat.y, plat.x, plat.y + capH);
    grassGrad.addColorStop(0, '#86EFAC');
    grassGrad.addColorStop(0.35, '#22C55E');
    grassGrad.addColorStop(1, '#15803D');
    roundRectPath(ctx, plat.x - 1, plat.y - 1, plat.w + 2, capH, 9);
    ctx.fillStyle = grassGrad;
    ctx.fill();

    // Viền cỏ rủ tròn mềm mại dọc mép dưới thảm cỏ
    ctx.fillStyle = '#16A34A';
    for (let gx = plat.x + 10; gx < plat.x + plat.w - 14; gx += 22) {
      ctx.beginPath();
      ctx.arc(gx + 6, plat.y + capH - 1, 7, 0, Math.PI);
      ctx.fill();
    }

    // Highlight nắng trên đỉnh cỏ
    roundRectPath(ctx, plat.x + 6, plat.y + 2, Math.max(8, plat.w - 12), 4, 2);
    ctx.fillStyle = 'rgba(220, 252, 231, 0.58)';
    ctx.fill();
  }

  return off;
}

function drawKenneyWoodPlank(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const woodGrad = ctx.createLinearGradient(x, y, x, y + h);
  woodGrad.addColorStop(0, '#D97706');
  woodGrad.addColorStop(0.55, '#B45309');
  woodGrad.addColorStop(1, '#78350F');
  roundRectPath(ctx, x, y, w, h, 7);
  ctx.fillStyle = woodGrad;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#451A03';
  ctx.stroke();

  roundRectPath(ctx, x + 4, y + 3, Math.max(6, w - 8), 4, 2);
  ctx.fillStyle = 'rgba(253, 230, 138, 0.5)';
  ctx.fill();

  // Khe ván gỗ & đinh tán đồng
  ctx.strokeStyle = 'rgba(69, 26, 3, 0.48)';
  ctx.lineWidth = 1.5;
  for (let px = x + 32; px < x + w - 12; px += 32) {
    ctx.beginPath();
    ctx.moveTo(px, y + 2);
    ctx.lineTo(px, y + h - 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#FDE68A';
  ctx.beginPath();
  ctx.arc(x + 10, y + h * 0.5, 2.6, 0, Math.PI * 2);
  ctx.arc(x + w - 10, y + h * 0.5, 2.6, 0, Math.PI * 2);
  ctx.fill();
}

// ============================================================================
// CẤU HÌNH PRESET GÓC BẮN & TRẠNG THÁI GIAO DIỆN TỐI GIẢN (0 RE-RENDER/TICK)
// ============================================================================

const AIM_PRESETS: { id: string; label: string; angleRight: number; angleLeft: number; power: number }[] = [
  { id: 'high_left', label: '↖ Cao trái', angleRight: -Math.PI * 0.68, angleLeft: -Math.PI * 0.68, power: 0.88 },
  { id: 'up', label: '↑ Thẳng lên', angleRight: -Math.PI * 0.5, angleLeft: -Math.PI * 0.5, power: 0.92 },
  { id: 'high_right', label: '↗ Cao phải', angleRight: -Math.PI * 0.32, angleLeft: -Math.PI * 0.32, power: 0.88 },
  { id: 'far_fwd', label: '→ Bắn xa', angleRight: -Math.PI * 0.2, angleLeft: -Math.PI * 0.8, power: 0.96 },
];

interface UiHudMeta {
  stageIndex: number;
  myState: FrogState | null;
  myBellyId: string | null;
  myFacing: 1 | -1;
  finishedCount: number;
  connectedCount: number;
}

interface PredictedMe {
  stageIndex: number;
  initialized: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  onGround: boolean;
}

function stepPredictedFrog(
  pred: PredictedMe,
  moveDir: -1 | 0 | 1,
  carrying: boolean,
  solids: (CroakRect & { bounceVy?: number; vxPlatform?: number; vyPlatform?: number })[],
  dt: number,
): void {
  const speed = CROAK_MOVE_SPEED * (carrying ? CROAK_CARRY_MULT : 1);
  pred.vx = moveDir * speed;
  if (moveDir !== 0) pred.facing = moveDir;
  pred.vy = Math.min(CROAK_MAX_FALL, pred.vy + CROAK_GRAVITY * dt);
  moveAndCollideFrog(pred, solids, dt);
}

function CroakSquadLandscape({ game, room }: { game: Game; room: RoomState }) {
  const baseView = room.game as CroakSquadView;
  const vp = useContext(ViewportContext);
  const rotated = !!vp?.rotated;
  const { width } = useStableWindow();
  const wide = width >= 720;
  const me = game.me ?? '';
  const isHost = room.hostId === me;

  const [fullMap, setFullMap] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [aimAngle, setAimAngle] = useState<number>(-Math.PI * 0.32);
  const [aimPower, setAimPower] = useState<number>(0.86);
  const [toastText, setToastText] = useState<string | null>(null);
  const [thumbDir, setThumbDir] = useState<-1 | 0 | 1>(0);

  const initMyFrog = baseView.frogs.find((f) => f.id === me) ?? null;
  const initConnected = baseView.frogs.filter((f) => f.connected);
  const [hud, setHud] = useState<UiHudMeta>(() => ({
    stageIndex: baseView.stageIndex,
    myState: initMyFrog?.state ?? null,
    myBellyId: initMyFrog?.bellyId ?? null,
    myFacing: initMyFrog?.facing ?? 1,
    finishedCount: initConnected.filter((f) => f.state === 'finished').length,
    connectedCount: Math.max(1, initConnected.length),
  }));

  // Snapshot buffer cho nội suy 60fps mượt mà mà KHÔNG gọi setState mỗi tick!
  const snapRef = useRef<{
    prev: CroakTickPayload | null;
    curr: CroakTickPayload;
    prevAt: number;
    currAt: number;
  }>({
    prev: null,
    curr: {
      stageIndex: baseView.stageIndex,
      tick: baseView.tick,
      switchesOn: baseView.switchesOn,
      keysCollected: baseView.keysCollected,
      activeCheckpointId: baseView.activeCheckpointId,
      frogs: baseView.frogs,
      events: baseView.events,
    },
    prevAt: 0,
    currAt: 0,
  });

  const predRef = useRef<PredictedMe>({
    stageIndex: baseView.stageIndex,
    initialized: !!initMyFrog,
    x: initMyFrog?.x ?? 90,
    y: initMyFrog?.y ?? 520,
    vx: 0,
    vy: 0,
    facing: initMyFrog?.facing ?? 1,
    onGround: initMyFrog?.onGround ?? false,
  });

  const camSmoothRef = useRef<{ x: number; y: number; stageIndex: number }>({
    x: 0,
    y: 0,
    stageIndex: -1,
  });

  const lastEventIdRef = useRef<number>(0);
  const moveDirRef = useRef<-1 | 0 | 1>(0);
  const lastJumpAtRef = useRef<number>(0);
  const jumpBufferUntilRef = useRef<number>(0);
  const keysDownRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
  const seqRef = useRef<number>(1);
  const pendingInputsRef = useRef<{ seq: number; moveX: -1 | 0 | 1; jump?: boolean; dtAccum: number }[]>([]);
  const visualOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastMoveEmitAtRef = useRef<number>(0);
  const localTongueRef = useRef<{ activeUntil: number; endX: number; endY: number } | null>(null);
  const localSpitFxRef = useRef<{ bornAt: number; x: number; y: number; angle: number } | null>(null);
  const lastLocalSfxRef = useRef<{ tongue: number; spit: number }>({ tongue: 0, spit: 0 });
  const aimRef = useRef<{ angle: number; power: number }>({ angle: aimAngle, power: aimPower });
  useEffect(() => {
    aimRef.current = { angle: aimAngle, power: aimPower };
  }, [aimAngle, aimPower]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bakedLayerRef = useRef<{ key: string; canvas: HTMLCanvasElement | null }>({
    key: '',
    canvas: null,
  });
  const lastPointerActionAtRef = useRef<{ jump: number; tongue: number; spit: number }>({
    jump: 0,
    tongue: 0,
    spit: 0,
  });
  const lastThumbPointerAtRef = useRef<number>(0);
  const thumbLayoutRef = useRef<{ w: number; h: number }>({ w: 184, h: 68 });

  // Đồng bộ khi `room.game` thay đổi lớn (vd reset màn, đổi màn, người ra vào)
  useEffect(() => {
    const now = performance.now();
    if (
      baseView.stageIndex !== snapRef.current.curr.stageIndex ||
      baseView.tick > snapRef.current.curr.tick
    ) {
      snapRef.current = {
        prev: snapRef.current.curr,
        curr: {
          stageIndex: baseView.stageIndex,
          tick: baseView.tick,
          switchesOn: baseView.switchesOn,
          keysCollected: baseView.keysCollected,
          activeCheckpointId: baseView.activeCheckpointId,
          frogs: baseView.frogs,
          events: baseView.events,
        },
        prevAt: snapRef.current.currAt,
        currAt: now,
      };
      const mine = baseView.frogs.find((f) => f.id === me) ?? null;
      const conn = baseView.frogs.filter((f) => f.connected);
      setHud((prev) => {
        const next: UiHudMeta = {
          stageIndex: baseView.stageIndex,
          myState: mine?.state ?? null,
          myBellyId: mine?.bellyId ?? null,
          myFacing: mine?.facing ?? 1,
          finishedCount: conn.filter((f) => f.state === 'finished').length,
          connectedCount: Math.max(1, conn.length),
        };
        if (
          prev.stageIndex === next.stageIndex &&
          prev.myState === next.myState &&
          prev.myBellyId === next.myBellyId &&
          prev.myFacing === next.myFacing &&
          prev.finishedCount === next.finishedCount &&
          prev.connectedCount === next.connectedCount
        ) {
          return prev;
        }
        return next;
      });
    }
  }, [baseView, me]);

  // Lắng nghe luồng vật lý 30Hz từ Server vào thẳng Ref (0 React re-render cho chuyển động!)
  useEffect(() => {
    return game.onCroakTick((payload) => {
      const now = performance.now();
      snapRef.current = {
        prev: snapRef.current.curr.stageIndex === payload.stageIndex ? snapRef.current.curr : null,
        curr: payload,
        prevAt: snapRef.current.currAt,
        currAt: now,
      };

      // Server Reconciliation theo ackSeq: replay các input chưa được ack từ vị trí trọng tài server
      const srvMe = payload.frogs.find((f) => f.id === me);
      if (srvMe) {
        const pr = predRef.current;
        const ackSeq = payload.acks?.[me];
        if (typeof ackSeq === 'number') {
          pendingInputsRef.current = pendingInputsRef.current.filter((inp) => inp.seq > ackSeq);
        }

        const hardSync =
          !pr.initialized ||
          pr.stageIndex !== payload.stageIndex ||
          srvMe.state === 'swallowed' ||
          srvMe.state === 'launched' ||
          srvMe.state === 'dead' ||
          srvMe.state === 'finished';

        if (hardSync) {
          pr.stageIndex = payload.stageIndex;
          pr.initialized = true;
          pr.x = srvMe.x;
          pr.y = srvMe.y;
          pr.vx = srvMe.vx;
          pr.vy = srvMe.vy;
          pr.facing = srvMe.facing;
          pr.onGround = srvMe.onGround;
          pendingInputsRef.current = [];
          visualOffsetRef.current = { x: 0, y: 0 };
        } else {
          const stgReplay = CROAK_STAGES[Math.max(0, Math.min(CROAK_STAGES.length - 1, payload.stageIndex))];
          const elapsedSecReplay = payload.tick * CROAK_DT;
          const solids = getSolidRects(stgReplay, payload.switchesOn, payload.keysCollected, elapsedSecReplay);
          const replayPred: PredictedMe = {
            stageIndex: payload.stageIndex,
            initialized: true,
            x: srvMe.x,
            y: srvMe.y,
            vx: srvMe.vx,
            vy: srvMe.vy,
            facing: srvMe.facing,
            onGround: srvMe.onGround,
          };
          const carrying = srvMe.state === 'carrying';
          for (const inp of pendingInputsRef.current) {
            if (inp.jump && replayPred.onGround) {
              replayPred.vy = CROAK_JUMP_VY;
              replayPred.onGround = false;
            }
            let rem = Math.min(0.18, inp.dtAccum);
            while (rem > 1e-4) {
              const chunk = Math.min(CROAK_DT, rem);
              rem -= chunk;
              stepPredictedFrog(replayPred, inp.moveX, carrying, solids, chunk);
            }
          }

          const diffX = pr.x - replayPred.x;
          const diffY = pr.y - replayPred.y;
          const errDist = Math.hypot(diffX, diffY);
          pr.x = replayPred.x;
          pr.y = replayPred.y;
          pr.vx = replayPred.vx;
          pr.vy = replayPred.vy;
          pr.onGround = replayPred.onGround;
          if (errDist > 125) {
            visualOffsetRef.current = { x: 0, y: 0 };
          } else if (errDist > 0.5) {
            const nextOx = visualOffsetRef.current.x + diffX;
            const nextOy = visualOffsetRef.current.y + diffY;
            const mag = Math.hypot(nextOx, nextOy);
            const scale = mag > 48 ? 48 / mag : 1;
            visualOffsetRef.current = { x: nextOx * scale, y: nextOy * scale };
          }
          if (srvMe.vy < -600 && pr.vy > -450) {
            // Bật trúng nấm lò xo trên server -> đồng bộ lực nảy tức thì
            pr.vy = srvMe.vy;
            pr.onGround = false;
          }
        }
      }

      if (payload.events.length > 0) {
        for (const ev of payload.events) {
          if (ev.id > lastEventIdRef.current) {
            lastEventIdRef.current = ev.id;
            const suppressDupLocal =
              ev.actorId === me &&
              ((ev.sfx === 'tongue' && now - lastLocalSfxRef.current.tongue < 250) ||
                (ev.sfx === 'spit' && now - lastLocalSfxRef.current.spit < 250));
            if (!suppressDupLocal) {
              playCroakSfx(ev.sfx);
            }
            if (ev.text) setToastText(ev.text);
          }
        }
      }

      // Chỉ cập nhật HUD React khi có thay đổi trạng thái thực sự (ngậm/nhả/qua màn/về đích)
      const conn = payload.frogs.filter((f) => f.connected);
      const fin = conn.filter((f) => f.state === 'finished').length;
      const mySt = srvMe?.state ?? null;
      const myBelly = srvMe?.bellyId ?? null;
      const myFac = srvMe?.facing ?? 1;
      setHud((prev) => {
        if (
          prev.stageIndex === payload.stageIndex &&
          prev.myState === mySt &&
          prev.myBellyId === myBelly &&
          (mySt !== 'carrying' || prev.myFacing === myFac) &&
          prev.finishedCount === fin &&
          prev.connectedCount === Math.max(1, conn.length)
        ) {
          return prev;
        }
        return {
          stageIndex: payload.stageIndex,
          myState: mySt,
          myBellyId: myBelly,
          myFacing: myFac,
          finishedCount: fin,
          connectedCount: Math.max(1, conn.length),
        };
      });
    });
  }, [game, me]);

  useEffect(() => {
    if (!toastText) return;
    const t = setTimeout(() => setToastText(null), 2600);
    return () => clearTimeout(t);
  }, [toastText]);

  const stage = CROAK_STAGES[Math.max(0, Math.min(CROAK_STAGES.length - 1, hud.stageIndex))];
  const isSpectator = hud.myState === null;

  const colorMap = useMemo(() => {
    const m = new Map<string, string>();
    room.players.forEach((p, idx) => {
      const cIdx = p.character?.color ?? idx;
      m.set(p.id, PLAYER_COLORS[cIdx % PLAYER_COLORS.length].hex);
    });
    return m;
  }, [room.players]);

  const liveRenderCtxRef = useRef({
    me,
    wide,
    fullMap,
    aimAngle,
    aimPower,
    colorMap,
    names: baseView.names,
  });
  useEffect(() => {
    liveRenderCtxRef.current = {
      me,
      wide,
      fullMap,
      aimAngle,
      aimPower,
      colorMap,
      names: baseView.names,
    };
  }, [me, wide, fullMap, aimAngle, aimPower, colorMap, baseView.names]);

  const sendInput = useCallback(
    (patch: Partial<CroakInput>) => {
      const now = performance.now();
      if (patch.jump && hud.myState !== 'swallowed') {
        if (predRef.current.onGround) {
          predRef.current.vy = CROAK_JUMP_VY;
          predRef.current.onGround = false;
          lastJumpAtRef.current = now;
          jumpBufferUntilRef.current = 0;
          playCroakSfx('jump');
        } else {
          // Đệm nhảy (Jump Buffer 130ms): bấm nhảy sát mặt đất sẽ tự bật ngay khi chân vừa chạm đất!
          jumpBufferUntilRef.current = now + 130;
        }
      }
      if (patch.tongue && hud.myState === 'normal') {
        const pr = predRef.current;
        const startX = pr.x + CROAK_FROG_W * 0.5 + pr.facing * 8;
        const startY = pr.y + CROAK_FROG_H * 0.5 + 2;
        localTongueRef.current = {
          activeUntil: now + 180,
          endX: startX + pr.facing * CROAK_TONGUE_RANGE,
          endY: startY - 4,
        };
        lastLocalSfxRef.current.tongue = now;
        playCroakSfx('tongue');
      }
      if (patch.spit && hud.myState === 'carrying') {
        const pr = predRef.current;
        const curAim = aimRef.current;
        localSpitFxRef.current = {
          bornAt: now,
          x: pr.x + CROAK_FROG_W * 0.5,
          y: pr.y + CROAK_FROG_H * 0.5,
          angle: patch.aimAngle ?? curAim.angle,
        };
        lastLocalSfxRef.current.spit = now;
        playCroakSfx('spit');
      }
      const curAim = aimRef.current;
      const includeAim = patch.spit || patch.aimAngle !== undefined;
      const mv = (patch.moveX ?? moveDirRef.current) as -1 | 0 | 1;
      const seq = seqRef.current++;
      lastMoveEmitAtRef.current = now;
      const q = pendingInputsRef.current;
      q.push({ seq, moveX: mv, ...(patch.jump ? { jump: true } : {}), dtAccum: 0 });
      if (q.length > 60) q.splice(0, q.length - 60);
      const payload: CroakInput = {
        seq,
        moveX: mv,
        ...(includeAim ? { aimAngle: patch.aimAngle ?? curAim.angle, aimPower: patch.aimPower ?? curAim.power } : {}),
        ...(patch.jump ? { jump: true } : {}),
        ...(patch.tongue ? { tongue: true } : {}),
        ...(patch.spit ? { spit: true } : {}),
      };
      void game.act({ type: 'cs_input', input: payload });
    },
    [game, hud.myState],
  );

  const setMoveDir = useCallback(
    (dir: -1 | 0 | 1) => {
      if (moveDirRef.current === dir) return;
      moveDirRef.current = dir;
      setThumbDir(dir);
      const curAim = aimRef.current;
      let nextAngle = curAim.angle;
      if (dir === 1 && Math.cos(curAim.angle) < -0.25) {
        nextAngle = -Math.PI - curAim.angle;
        setAimAngle(nextAngle);
      } else if (dir === -1 && Math.cos(curAim.angle) > 0.25) {
        nextAngle = -Math.PI - curAim.angle;
        setAimAngle(nextAngle);
      }
      const seq = seqRef.current++;
      lastMoveEmitAtRef.current = performance.now();
      const q = pendingInputsRef.current;
      q.push({ seq, moveX: dir, dtAccum: 0 });
      if (q.length > 60) q.splice(0, q.length - 60);
      void game.act({
        type: 'cs_input',
        input: {
          seq,
          moveX: dir,
          ...(hud.myState === 'carrying' ? { aimAngle: nextAngle, aimPower: curAim.power } : {}),
        },
      });
    },
    [game, hud.myState],
  );

  // Điều khiển bàn phím trên Web (WASD / Mũi tên / Space / J / Q / E)
  useEffect(() => {
    if (Platform.OS !== 'web' || isSpectator) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        if (!keysDownRef.current.left) {
          keysDownRef.current.left = true;
          setMoveDir(-1);
        }
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        if (!keysDownRef.current.right) {
          keysDownRef.current.right = true;
          setMoveDir(1);
        }
      } else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        if (!e.repeat) sendInput({ jump: true });
      } else if (e.key === 'j' || e.key === 'J' || e.key === 'Enter') {
        e.preventDefault();
        if (e.repeat) return;
        if (hud.myState === 'carrying') sendInput({ spit: true });
        else sendInput({ tongue: true });
      } else if (e.key === 'q' || e.key === 'Q') {
        setAimAngle((prev) => {
          const next = Math.max(-Math.PI * 0.92, prev - 0.14);
          void game.act({
            type: 'cs_input',
            input: { seq: seqRef.current++, moveX: moveDirRef.current, aimAngle: next, aimPower: aimRef.current.power },
          });
          return next;
        });
      } else if (e.key === 'e' || e.key === 'E') {
        setAimAngle((prev) => {
          const next = Math.min(-Math.PI * 0.08, prev + 0.14);
          void game.act({
            type: 'cs_input',
            input: { seq: seqRef.current++, moveX: moveDirRef.current, aimAngle: next, aimPower: aimRef.current.power },
          });
          return next;
        });
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keysDownRef.current.left = false;
        setMoveDir(keysDownRef.current.right ? 1 : 0);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keysDownRef.current.right = false;
        setMoveDir(keysDownRef.current.left ? -1 : 0);
      }
    };
    const clearKeysAndMove = () => {
      keysDownRef.current.left = false;
      keysDownRef.current.right = false;
      setMoveDir(0);
    };
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') clearKeysAndMove();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearKeysAndMove);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearKeysAndMove);
      document.removeEventListener('visibilitychange', onVisibility);
      clearKeysAndMove();
    };
  }, [game, hud.myState, isSpectator, sendInput, setMoveDir]);

  // ============================================================================
  // VÒNG LẶP DỰNG HÌNH 60FPS HTML5 CANVAS HIDPI (0 REACT RE-RENDER!)
  // ============================================================================
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const sprites = getCroakSprites();
    let rafId = 0;
    let lastFrameAt = performance.now();

    const renderFrame = (now: number) => {
      rafId = requestAnimationFrame(renderFrame);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rawDt = Math.min(0.035, Math.max(0.001, (now - lastFrameAt) / 1000));
      lastFrameAt = now;

      const { curr, prev, currAt, prevAt } = snapRef.current;
      const stg = CROAK_STAGES[Math.max(0, Math.min(CROAK_STAGES.length - 1, curr.stageIndex))];
      const env = liveRenderCtxRef.current;

      const spanMs = Math.max(18, currAt - prevAt);
      const alpha = prev ? Math.max(0, Math.min(1.12, (now - currAt) / spanMs + 1)) : 1;
      const interpTick = prev ? prev.tick + (curr.tick - prev.tick) * Math.min(1, alpha) : curr.tick;
      const elapsedSec = interpTick * CROAK_DT;

      // Bước dự đoán Client-Side Prediction mượt 60fps + server ack reconciliation không giật ngược!
      const srvMe = curr.frogs.find((f) => f.id === env.me);
      if (
        srvMe &&
        predRef.current.initialized &&
        (srvMe.state === 'normal' || srvMe.state === 'carrying' || srvMe.state === 'tongue')
      ) {
        const mv = moveDirRef.current;
        if (mv !== 0 && now - lastMoveEmitAtRef.current >= 32) {
          const seq = seqRef.current++;
          lastMoveEmitAtRef.current = now;
          const q = pendingInputsRef.current;
          q.push({ seq, moveX: mv, dtAccum: 0 });
          if (q.length > 60) q.splice(0, q.length - 60);
          void game.act({ type: 'cs_input', input: { seq, moveX: mv } });
        }
        const tailInp = pendingInputsRef.current.at(-1);
        if (tailInp) {
          tailInp.dtAccum = Math.min(0.18, tailInp.dtAccum + rawDt);
        }

        const pr = predRef.current;
        const solids = getSolidRects(stg, curr.switchesOn, curr.keysCollected, elapsedSec);
        stepPredictedFrog(
          pr,
          mv,
          srvMe.state === 'carrying',
          solids,
          rawDt,
        );

        // Kích hoạt đệm nhảy ngay khi chân chạm đất
        if (pr.onGround && jumpBufferUntilRef.current > now) {
          pr.vy = CROAK_JUMP_VY;
          pr.onGround = false;
          lastJumpAtRef.current = now;
          jumpBufferUntilRef.current = 0;
          playCroakSfx('jump');
        }
      }

      // Làm tắt dần offset hình ảnh (visual smoothing) không kéo giật vị trí vật lý
      const vo = visualOffsetRef.current;
      if (vo.x !== 0 || vo.y !== 0) {
        const decay = Math.exp(-rawDt * 18);
        vo.x *= decay;
        vo.y *= decay;
        if (Math.hypot(vo.x, vo.y) < 0.25) {
          vo.x = 0;
          vo.y = 0;
        }
      }

      // Chuẩn hóa kích thước Canvas theo layout thực (`clientWidth`/`clientHeight` chuẩn 100% cả khi xoay 90° bằng Rotator!)
      const cssW = Math.max(320, Math.round(canvas.clientWidth || 640));
      const cssH = Math.max(200, Math.round(canvas.clientHeight || 340));
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const targetW = Math.round(cssW * dpr);
      const targetH = Math.round(cssH * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      // Danh sách vị trí hiển thị đã nội suy / dự đoán cho tất cả các ếch
      const prevMap = new Map(prev?.frogs.map((f) => [f.id, f]) ?? []);
      const drawFrogs = curr.frogs.map((cf) => {
        if (
          cf.id === env.me &&
          predRef.current.initialized &&
          (cf.state === 'normal' || cf.state === 'carrying' || cf.state === 'tongue')
        ) {
          return {
            ...cf,
            x: predRef.current.x + visualOffsetRef.current.x,
            y: predRef.current.y + visualOffsetRef.current.y,
            vx: predRef.current.vx,
            vy: predRef.current.vy,
            facing: predRef.current.facing,
          };
        }
        const pf = prevMap.get(cf.id);
        if (!pf || Math.hypot(cf.x - pf.x, cf.y - pf.y) > 180) return cf;
        const t = Math.max(0, Math.min(1, (now - currAt + spanMs) / spanMs));
        return {
          ...cf,
          x: pf.x + (cf.x - pf.x) * t,
          y: pf.y + (cf.y - pf.y) * t,
        };
      });

      // Tính camera mượt mà bám theo nhân vật của tôi
      const myDraw = drawFrogs.find((f) => f.id === env.me) ?? drawFrogs[0] ?? null;
      const focusDraw =
        myDraw && myDraw.state === 'swallowed' && myDraw.carrierId
          ? drawFrogs.find((f) => f.id === myDraw.carrierId) ?? myDraw
          : myDraw;

      let camW = stg.width;
      let camH = stg.height;
      let camX = 0;
      let camY = 0;

      if (!env.fullMap) {
        const aspect = cssW / Math.max(1, cssH);
        camH = env.wide ? Math.min(stg.height, 560) : Math.min(stg.height, 470);
        camW = Math.min(stg.width, Math.round(camH * aspect));
        const fx = focusDraw ? focusDraw.x + CROAK_FROG_W * 0.5 : stg.spawn.x;
        const fy = focusDraw ? focusDraw.y + CROAK_FROG_H * 0.5 : stg.spawn.y;
        const goalX = Math.max(0, Math.min(stg.width - camW, fx - camW * 0.44));
        const goalY = Math.max(0, Math.min(stg.height - camH, fy - camH * 0.56));
        if (camSmoothRef.current.stageIndex !== curr.stageIndex) {
          camSmoothRef.current = { x: goalX, y: goalY, stageIndex: curr.stageIndex };
        } else {
          camSmoothRef.current.x += (goalX - camSmoothRef.current.x) * 0.18;
          camSmoothRef.current.y += (goalY - camSmoothRef.current.y) * 0.18;
        }
        camX = camSmoothRef.current.x;
        camY = camSmoothRef.current.y;
      }

      // Kiểm tra và lấy bản đồ tĩnh đã bake sẵn trên offscreen canvas
      const bakeKey = `${stg.id}|${ Object.keys(curr.switchesOn).filter((k) => curr.switchesOn[k]).sort().join(',') }`;
      if (bakedLayerRef.current.key !== bakeKey) {
        bakedLayerRef.current = {
          key: bakeKey,
          canvas: bakeStageStaticCanvas(stg, curr.switchesOn),
        };
      }

      ctx.save();
      ctx.scale(targetW / camW, targetH / camH);
      ctx.translate(-camX, -camY);

      // 1. Blit nền rừng đầm lầy + địa hình tĩnh chỉ bằng 1 lệnh GPU drawImage!
      if (bakedLayerRef.current.canvas) {
        ctx.drawImage(bakedLayerRef.current.canvas, 0, 0);
      } else {
        ctx.fillStyle = '#071925';
        ctx.fillRect(camX, camY, camW, camH);
      }

      // 2. Đom đóm rừng đêm lung linh
      for (let i = 0; i < 10; i++) {
        const fx = ((i * 223 + 110 + Math.sin(elapsedSec * 0.7 + i) * 28) % stg.width + stg.width) % stg.width;
        const fy = 85 + ((i * 97) % 320) + Math.sin(elapsedSec * 2.2 + i * 1.4) * 14;
        const pulse = 0.45 + 0.45 * Math.sin(elapsedSec * 3.5 + i);
        ctx.fillStyle = `rgba(190, 242, 100, ${pulse.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(fx, fy, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Bẫy bùn độc sủi tăm & chông gai thép
      for (const hz of stg.hazards) {
        if (hz.kind === 'swamp') {
          const swampGrad = ctx.createLinearGradient(hz.x, hz.y, hz.x, hz.y + hz.h);
          swampGrad.addColorStop(0, '#A855F7');
          swampGrad.addColorStop(0.35, '#7E22CE');
          swampGrad.addColorStop(1, '#3B0764');
          roundRectPath(ctx, hz.x, hz.y + 4, hz.w, hz.h - 4, 8);
          ctx.fillStyle = swampGrad;
          ctx.fill();

          // Sóng bùn phát quang
          ctx.fillStyle = '#D8B4FE';
          ctx.beginPath();
          ctx.moveTo(hz.x, hz.y + 10);
          for (let wx = hz.x; wx <= hz.x + hz.w; wx += 16) {
            const wy = hz.y + 5 + Math.sin(elapsedSec * 5 + wx * 0.08) * 3;
            ctx.lineTo(wx, wy);
          }
          ctx.lineTo(hz.x + hz.w, hz.y + 12);
          ctx.closePath();
          ctx.fill();

          // Bong bóng khí độc nổi lên
          for (let bi = 0; bi < 3; bi++) {
            const bx = hz.x + hz.w * (0.2 + bi * 0.3);
            const lift = ((elapsedSec * 28 + bi * 11) % 18);
            ctx.fillStyle = 'rgba(233, 213, 255, 0.85)';
            ctx.beginPath();
            ctx.arc(bx, hz.y + 8 - lift, 3.8 - bi * 0.5, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          roundRectPath(ctx, hz.x, hz.y + hz.h - 6, hz.w, 6, 3);
          ctx.fillStyle = '#334155';
          ctx.fill();
          const count = Math.max(2, Math.floor(hz.w / 16));
          const stepW = hz.w / count;
          for (let si = 0; si < count; si++) {
            const sx = hz.x + si * stepW;
            ctx.beginPath();
            ctx.moveTo(sx + 1, hz.y + hz.h - 4);
            ctx.lineTo(sx + stepW * 0.5, hz.y);
            ctx.lineTo(sx + stepW - 1, hz.y + hz.h - 4);
            ctx.closePath();
            ctx.fillStyle = '#F43F5E';
            ctx.fill();
            ctx.lineWidth = 1.2;
            ctx.strokeStyle = '#FFE4E6';
            ctx.stroke();
          }
        }
      }

      // 4. Bệ gỗ di động & Nấm nhún lò xo Fluent 3D
      for (const plat of stg.platforms) {
        const active = !plat.activeWhenSwitch || !!curr.switchesOn[plat.activeWhenSwitch];
        if (!active) continue;
        if (plat.move) {
          const r = platformRectAt(plat, elapsedSec);
          drawKenneyWoodPlank(ctx, r.x, r.y, r.w, r.h);
        } else if (plat.kind === 'bounce') {
          if (sprites.mushroom && sprites.mushroom.complete && sprites.mushroom.naturalWidth > 0) {
            ctx.drawImage(sprites.mushroom, plat.x + 2, plat.y - 22, plat.w - 4, plat.h + 24);
          } else {
            roundRectPath(ctx, plat.x + plat.w * 0.34, plat.y + 8, plat.w * 0.32, plat.h - 4, 4);
            ctx.fillStyle = '#FEF3C7';
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(plat.x + plat.w * 0.5, plat.y + 8, plat.w * 0.5, 12, 0, Math.PI, 0);
            ctx.fillStyle = '#EC4899';
            ctx.fill();
          }
        }
      }

      // 5. Công tắc cơ học & Cổng Đền Cổ
      ctx.font = '900 12px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      for (const sw of stg.switches) {
        const on = !!curr.switchesOn[sw.id];
        roundRectPath(ctx, sw.x - 4, sw.y + sw.h - 5, sw.w + 8, 6, 3);
        ctx.fillStyle = '#475569';
        ctx.fill();
        roundRectPath(ctx, sw.x, on ? sw.y + 6 : sw.y, sw.w, on ? sw.h - 6 : sw.h, 5);
        ctx.fillStyle = on ? '#22C55E' : '#EF4444';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#FFFFFF';
        ctx.stroke();
        if (sw.label) {
          ctx.fillStyle = on ? '#86EFAC' : '#FECACA';
          ctx.fillText(`${sw.label}${on ? ' ✓' : ''}`, sw.x + sw.w * 0.5, sw.y - 8);
        }
      }

      for (const gt of stg.gates) {
        const opened =
          (gt.openBySwitch && curr.switchesOn[gt.openBySwitch]) ||
          (gt.openByKey && curr.keysCollected[gt.openByKey]);
        if (opened) {
          roundRectPath(ctx, gt.x, gt.y, gt.w, 16, 4);
          ctx.fillStyle = 'rgba(34, 197, 94, 0.55)';
          ctx.fill();
        } else {
          const gateGrad = ctx.createLinearGradient(gt.x, gt.y, gt.x + gt.w, gt.y);
          gateGrad.addColorStop(0, '#78350F');
          gateGrad.addColorStop(0.5, '#B45309');
          gateGrad.addColorStop(1, '#451A03');
          roundRectPath(ctx, gt.x, gt.y, gt.w, gt.h, 6);
          ctx.fillStyle = gateGrad;
          ctx.fill();
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = '#FBBF24';
          ctx.stroke();
          if (sprites.key && sprites.key.complete && sprites.key.naturalWidth > 0) {
            ctx.drawImage(sprites.key, gt.x + gt.w * 0.5 - 11, gt.y + gt.h * 0.5 - 11, 22, 22);
          }
        }
      }

      // 6. Chìa khóa vàng 3D Fluent & Cột đèn Checkpoint
      for (const k of stg.keys) {
        if (curr.keysCollected[k.id]) continue;
        const bobY = k.y + Math.sin(elapsedSec * 4.2) * 6;
        ctx.fillStyle = 'rgba(250, 204, 21, 0.25)';
        ctx.beginPath();
        ctx.arc(k.x, bobY, k.r + 8, 0, Math.PI * 2);
        ctx.fill();
        if (sprites.key && sprites.key.complete && sprites.key.naturalWidth > 0) {
          ctx.drawImage(sprites.key, k.x - 18, bobY - 18, 36, 36);
        } else {
          ctx.fillStyle = '#FACC15';
          ctx.beginPath();
          ctx.arc(k.x, bobY, 10, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      for (const cp of stg.checkpoints) {
        const active = curr.activeCheckpointId === cp.id;
        roundRectPath(ctx, cp.x + 10, cp.y + 8, 5, cp.h - 8, 2);
        ctx.fillStyle = '#E2E8F0';
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(cp.x + 15, cp.y + 10);
        ctx.lineTo(cp.x + 48, cp.y + 21);
        ctx.lineTo(cp.x + 15, cp.y + 32);
        ctx.closePath();
        ctx.fillStyle = active ? '#22C55E' : '#F59E0B';
        ctx.fill();
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = '#FFFFFF';
        ctx.stroke();

        if (active) {
          ctx.fillStyle = 'rgba(134, 239, 172, 0.35)';
          ctx.beginPath();
          ctx.arc(cp.x + 12.5, cp.y + 10, 14, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 7. Đài Sen Vàng Đích Đến (Fluent 3D Lotus Sanctuary)
      const gx = stg.goal.x + stg.goal.w * 0.5;
      const gy = stg.goal.y + stg.goal.h * 0.55;
      const sanctuaryGlow = ctx.createRadialGradient(gx, gy, 8, gx, gy, 62);
      sanctuaryGlow.addColorStop(0, 'rgba(254, 240, 138, 0.78)');
      sanctuaryGlow.addColorStop(0.55, 'rgba(245, 158, 11, 0.28)');
      sanctuaryGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = sanctuaryGlow;
      ctx.beginPath();
      ctx.arc(gx, gy, 62, 0, Math.PI * 2);
      ctx.fill();

      // Cổng vòm vàng tôn nghiêm
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 4;
      roundRectPath(ctx, stg.goal.x + 4, stg.goal.y + 4, stg.goal.w - 8, stg.goal.h - 4, 38);
      ctx.stroke();

      if (sprites.lotus && sprites.lotus.complete && sprites.lotus.naturalWidth > 0) {
        const bobLotus = Math.sin(elapsedSec * 3) * 3;
        ctx.drawImage(sprites.lotus, gx - 32, stg.goal.y + stg.goal.h - 62 + bobLotus, 64, 64);
      }

      const connCount = Math.max(1, drawFrogs.filter((f) => f.connected).length);
      const finCount = drawFrogs.filter((f) => f.connected && f.state === 'finished').length;
      ctx.fillStyle = '#FEF08A';
      ctx.font = '900 13px system-ui, -apple-system, sans-serif';
      ctx.fillText(`ĐÀI SEN (${finCount}/${connCount})`, gx, stg.goal.y - 8);

      // 8. Đường ngắm đạn đạo vòng cung khi đang ngậm đồng đội
      for (const f of drawFrogs) {
        if (f.state !== 'carrying' || !f.bellyId) continue;
        const arcColor = env.colorMap.get(f.bellyId) ?? '#FDE047';
        const pts = computeSpitArc(
          f.x,
          f.y,
          f.id === env.me ? env.aimAngle : f.aimAngle,
          f.id === env.me ? env.aimPower : f.aimPower,
          stg,
          curr.switchesOn,
          curr.keysCollected,
          elapsedSec,
          22,
        );
        pts.forEach((pt, idx) => {
          const r = pt.hitWall ? 7 : Math.max(2.6, 5.4 - idx * 0.11);
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
          ctx.fillStyle = pt.hitWall ? '#F43F5E' : arcColor;
          ctx.fill();
          ctx.lineWidth = pt.hitWall ? 2.2 : 1.2;
          ctx.strokeStyle = '#FFFFFF';
          ctx.stroke();
        });
      }

      // 9. Vẽ Biệt Đội Ếch Fluent 3D (Squash & Stretch + Bong bóng hồi sinh + Vương miện)
      drawFrogs.forEach((f, idx) => {
        if (!f.connected || f.state === 'swallowed') return;
        const hex = env.colorMap.get(f.id) ?? '#22C55E';
        const name = env.names[f.id] ?? f.id;
        const cx = f.x + CROAK_FROG_W * 0.5;
        const cy = f.y + CROAK_FROG_H * 0.5;
        const isMe = f.id === env.me;

        if (f.state === 'dead') {
          if (sprites.bubble && sprites.bubble.complete && sprites.bubble.naturalWidth > 0) {
            ctx.drawImage(sprites.bubble, cx - 22, cy - 22, 44, 44);
          } else {
            ctx.beginPath();
            ctx.arc(cx, cy, 20, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(125, 211, 252, 0.32)';
            ctx.fill();
            ctx.strokeStyle = '#BAE6FD';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
          ctx.fillStyle = '#BAE6FD';
          ctx.font = '800 11px system-ui, -apple-system, sans-serif';
          ctx.fillText(name, cx, cy - 26);
          return;
        }

        // Lưỡi hồng co giãn đàn hồi (+ phản hồi 0ms cục bộ khi vừa bấm phóng lưỡi)
        const optTongue =
          isMe &&
          f.tongueTicks === 0 &&
          localTongueRef.current &&
          localTongueRef.current.activeUntil > now
            ? localTongueRef.current
            : null;
        if (f.tongueTicks > 0 || optTongue) {
          const txEnd = f.tongueTicks > 0 ? f.tongueEndX : optTongue!.endX;
          const tyEnd = f.tongueTicks > 0 ? f.tongueEndY : optTongue!.endY;
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(cx + f.facing * 8, cy + 2);
          ctx.lineTo(txEnd, tyEnd);
          ctx.strokeStyle = '#FB7185';
          ctx.lineWidth = 6.5;
          ctx.lineCap = 'round';
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(txEnd, tyEnd, 6.5, 0, Math.PI * 2);
          ctx.fillStyle = '#F43F5E';
          ctx.fill();
          ctx.strokeStyle = '#FFE4E6';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
        }

        // Hiệu ứng luồng gió bắn đồng đội 0ms cục bộ ngay khi bấm Nhả
        if (isMe && localSpitFxRef.current) {
          const age = now - localSpitFxRef.current.bornAt;
          if (age > 220) {
            localSpitFxRef.current = null;
          } else {
            const sfx = localSpitFxRef.current;
            const prog = age / 220;
            const px = sfx.x + Math.cos(sfx.angle) * (20 + prog * 42);
            const py = sfx.y + Math.sin(sfx.angle) * (20 + prog * 42);
            ctx.save();
            ctx.globalAlpha = (1 - prog) * 0.85;
            ctx.strokeStyle = '#FEF08A';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(sfx.x, sfx.y);
            ctx.lineTo(px, py);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(px, py, 8 * (1 - prog * 0.4), 0, Math.PI * 2);
            ctx.fillStyle = '#FDE047';
            ctx.fill();
            ctx.restore();
          }
        }

        // Vòng hào quang nhận diện màu đội & bản thân dưới chân ếch
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cx, f.y + CROAK_FROG_H + 1, 16, 5.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = hex;
        ctx.globalAlpha = 0.52;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.lineWidth = isMe ? 2.4 : 1.5;
        ctx.strokeStyle = isMe ? '#FEF08A' : '#FFFFFF';
        ctx.stroke();
        ctx.restore();

        // Co giãn đàn hồi Squash & Stretch theo vận tốc dọc & trạng thái ngậm bạn
        const isCarrying = f.state === 'carrying';
        const isLaunched = f.state === 'launched';
        const stretch = Math.max(-0.18, Math.min(0.24, -f.vy / 1600));
        const scaleX = (isCarrying ? 1.28 : 1) * (1 - stretch * 0.55);
        const scaleY = (isCarrying ? 1.22 : 1) * (1 + stretch);

        if (isLaunched) {
          ctx.fillStyle = 'rgba(250, 204, 21, 0.34)';
          ctx.beginPath();
          ctx.ellipse(cx - Math.sign(f.vx || 1) * 15, cy, 13, 7, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.save();
        ctx.translate(cx, cy + CROAK_FROG_H * 0.5);
        ctx.scale(f.facing * scaleX, scaleY);
        if (sprites.frog && sprites.frog.complete && sprites.frog.naturalWidth > 0) {
          ctx.drawImage(sprites.frog, -19, -36, 38, 38);
        } else {
          ctx.beginPath();
          ctx.arc(0, -16, 15, 0, Math.PI * 2);
          ctx.fillStyle = hex;
          ctx.fill();
        }
        ctx.restore();

        // Vương miện vàng khi đã chạm Đài Sen
        if (f.state === 'finished' && sprites.crown && sprites.crown.complete && sprites.crown.naturalWidth > 0) {
          ctx.drawImage(sprites.crown, cx - 11, f.y - 24, 22, 22);
        }

        // Nhãn tên sắc nét có nền pill tối chống chồng chéo
        const crowdLift = drawFrogs.some(
          (o, oIdx) =>
            oIdx < idx &&
            o.connected &&
            o.state !== 'swallowed' &&
            Math.abs(o.x - f.x) < 74 &&
            Math.abs(o.y - f.y) < 42,
        )
          ? 16
          : 0;

        const passengerName = isCarrying && f.bellyId ? (env.names[f.bellyId] ?? '') : '';
        const label = passengerName ? `${name} (ngậm ${passengerName})` : name;
        ctx.font = '800 11.5px system-ui, -apple-system, sans-serif';
        const tw = ctx.measureText(label).width;
        const pillW = tw + 12;
        const pillY = f.y - (f.state === 'finished' ? 38 : 22) - crowdLift;

        roundRectPath(ctx, cx - pillW * 0.5, pillY - 11, pillW, 16, 8);
        ctx.fillStyle = isMe ? 'rgba(15, 23, 42, 0.86)' : 'rgba(15, 23, 42, 0.72)';
        ctx.fill();
        ctx.lineWidth = 1.3;
        ctx.strokeStyle = hex;
        ctx.stroke();

        ctx.fillStyle = isMe ? '#FEF08A' : '#F8FAFC';
        ctx.fillText(label, cx, pillY + 1);
      });

      ctx.restore();
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, [game]);

  // ============================================================================
  // TAY CẦM CẢM ỨNG TRƯỢT MƯỢT CHUẨN CẢ KHI AUTO-LANDSCAPE ROTATOR XOAY 90°!
  // ============================================================================
  const updateThumbpadFromPoint = useCallback(
    (clientX: number, clientY: number, rect: DOMRect) => {
      // Khi Rotator xoay 90deg trên điện thoại dọc: trục ngang của nút nằm dọc theo màn hình vật lý (clientY)!
      const rel = rotated
        ? (clientY - rect.top) / Math.max(1, rect.height)
        : (clientX - rect.left) / Math.max(1, rect.width);
      if (rel < 0.45) setMoveDir(-1);
      else if (rel > 0.55) setMoveDir(1);
      else setMoveDir(0);
    },
    [rotated, setMoveDir],
  );

  // Kéo trực tiếp trên màn hình Canvas để căn góc bắn 360 độ khi đang ngậm bạn!
  const aimFromCanvasClientPoint = useCallback(
    (clientX: number, clientY: number) => {
      if (hud.myState !== 'carrying' || !canvasRef.current) return;
      const el = canvasRef.current;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const cssW = Math.max(1, el.clientWidth || rect.width);
      const cssH = Math.max(1, el.clientHeight || rect.height);
      const normX = rotated ? (clientY - rect.top) / rect.height : (clientX - rect.left) / rect.width;
      const normY = rotated ? (rect.right - clientX) / rect.width : (clientY - rect.top) / rect.height;

      const stg = CROAK_STAGES[Math.max(0, Math.min(CROAK_STAGES.length - 1, hud.stageIndex))];
      const aspect = cssW / cssH;
      const camH = fullMap ? stg.height : wide ? Math.min(stg.height, 560) : Math.min(stg.height, 470);
      const camW = fullMap ? stg.width : Math.min(stg.width, Math.round(camH * aspect));
      const camX = fullMap ? 0 : camSmoothRef.current.x;
      const camY = fullMap ? 0 : camSmoothRef.current.y;

      const worldX = camX + normX * camW;
      const worldY = camY + normY * camH;
      const mx = predRef.current.x + CROAK_FROG_W * 0.5;
      const my = predRef.current.y + CROAK_FROG_H * 0.5;
      const dx = worldX - mx;
      const dy = worldY - my;
      const dist = Math.hypot(dx, dy);
      if (dist < 10) return;

      const ang = Math.max(-Math.PI * 0.94, Math.min(-Math.PI * 0.06, Math.atan2(Math.min(-18, dy), dx)));
      const pwr = Math.max(0.45, Math.min(1, dist / 260));
      setAimAngle(ang);
      setAimPower(pwr);
      void game.act({
        type: 'cs_input',
        input: { seq: seqRef.current++, moveX: moveDirRef.current, aimAngle: ang, aimPower: pwr },
      });
    },
    [fullMap, game, hud.myState, hud.stageIndex, rotated, wide],
  );

  const applyAimPreset = (p: (typeof AIM_PRESETS)[number]) => {
    const facing = hud.myFacing ?? 1;
    const ang = facing >= 0 ? p.angleRight : p.angleLeft;
    setAimAngle(ang);
    setAimPower(p.power);
    void game.act({
      type: 'cs_input',
      input: { seq: seqRef.current++, moveX: moveDirRef.current, aimAngle: ang, aimPower: p.power },
    });
  };

  const triggerActionImmediate = (kind: 'jump' | 'tongue' | 'spit', fn: () => void) => {
    lastPointerActionAtRef.current[kind] = performance.now();
    fn();
  };

  const triggerActionFallbackPress = (kind: 'jump' | 'tongue' | 'spit', fn: () => void) => {
    if (performance.now() - lastPointerActionAtRef.current[kind] < 340) return;
    fn();
  };

  return (
    <Shell game={game} room={room} scroll={false} hideStrip fullscreen>
      {hud.finishedCount > 0 && hud.finishedCount >= hud.connectedCount && <Confetti />}

      <View style={styles.landscapeStage} testID="croak-viewport">
        {/* Toàn màn hình Ngang 60FPS HiDPI Canvas */}
        {Platform.OS === 'web' ? (
          <canvas
            ref={canvasRef}
            onContextMenu={(e) => e.preventDefault()}
            onPointerDown={(e) => {
              if (hud.myState === 'carrying') {
                e.currentTarget.setPointerCapture?.(e.pointerId);
                aimFromCanvasClientPoint(e.clientX, e.clientY);
              }
            }}
            onPointerMove={(e) => {
              if (hud.myState === 'carrying' && e.buttons > 0) {
                aimFromCanvasClientPoint(e.clientX, e.clientY);
              }
            }}
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              touchAction: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              cursor: hud.myState === 'carrying' ? 'crosshair' : 'default',
            }}
          />
        ) : (
          <View style={{ flex: 1 }} />
        )}

        {/* Thanh HUD siêu gọn 1 dòng nổi phía trên */}
        <View pointerEvents="box-none" style={styles.hudTopOverlay} testID="croak-stage-bar">
          <View style={styles.hudPill}>
            <View style={styles.stageBadge}>
              <UiIcon name="Map" size={12} color={C.ink} strokeWidth={1.65} />
              <T style={styles.stageBadgeTxt}>
                Màn {hud.stageIndex + 1}/{CROAK_STAGES.length}
              </T>
            </View>
            <T style={styles.stageTitle} numberOfLines={1}>
              {stage.name.replace(/^Màn \d+:\s*/, '')}
            </T>
            <View style={styles.goalCounter}>
              <UiIcon name="Trophy" size={12} color={C.gold} strokeWidth={1.65} />
              <T style={styles.goalCounterTxt}>
                {hud.finishedCount}/{hud.connectedCount}
              </T>
            </View>
            <Pressable
              testID="croak-fullmap-toggle"
              onPress={() => setFullMap((v) => !v)}
              style={[styles.mapToggle, fullMap && styles.mapToggleActive]}
            >
              <UiIcon name={fullMap ? 'Minimize2' : 'Maximize2'} size={12} color={fullMap ? C.ink : C.darkText} strokeWidth={1.65} />
              <T style={[styles.mapToggleTxt, fullMap && { color: C.ink }]}>
                {fullMap ? 'Gần' : 'Bản đồ'}
              </T>
            </Pressable>
            <Pressable
              testID="croak-hint-toggle"
              onPress={() => setShowHint((v) => !v)}
              style={[styles.mapToggle, showHint && styles.mapToggleActive]}
            >
              <UiIcon name="HelpCircle" size={13} color={showHint ? C.ink : C.darkText} strokeWidth={1.65} />
            </Pressable>
            {isHost && (
              <>
                <Pressable
                  testID="croak-reset-stage"
                  onPress={() => void game.act({ type: 'cs_reset_stage' })}
                  style={styles.mapToggle}
                >
                  <UiIcon name="RotateCcw" size={13} color={C.darkText} strokeWidth={1.65} />
                </Pressable>
                <Pressable
                  testID="croak-end"
                  onPress={() => void game.act({ type: 'end' })}
                  style={styles.mapToggle}
                >
                  <T style={styles.mapToggleTxt}>Kết thúc</T>
                </Pressable>
              </>
            )}
          </View>

          {(toastText || showHint) && (
            <View style={styles.toastPill}>
              <T numberOfLines={2} style={styles.stageHint}>
                {(toastText ?? stage.subtitle).replace(/!+$/g, '')}
              </T>
            </View>
          )}

          {hud.myState === 'carrying' && (
            <View style={styles.aimBar} testID="croak-aim-bar">
              <View style={styles.aimTitleRow}>
                <UiIcon name="Crosshair" size={13} color={C.gold} strokeWidth={1.65} />
                <T style={styles.aimTitle}>Ngắm bắn</T>
              </View>
              {AIM_PRESETS.map((p) => (
                <Pressable
                  key={p.id}
                  testID={`croak-aim-${p.id}`}
                  onPress={() => applyAimPreset(p)}
                  style={styles.aimChip}
                >
                  <T selectable={false} style={styles.aimChipTxt}>
                    {p.label}
                  </T>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Bộ Tay Cầm Cảm Ứng Ngang Gọn Hai Góc Màn Hình (Không Xung Đột Sự Kiện Trượt Ngón Tay!) */}
        {!isSpectator ? (
          <View
            pointerEvents="box-none"
            style={[
              styles.arcadeOverlay,
              Platform.OS === 'web'
                ? ({
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    WebkitTouchCallout: 'none',
                  } as object)
                : null,
            ]}
            testID="croak-controls"
          >
            {/* Bàn trượt Thumbpad liên hoàn Trái <-> Phải siêu mượt (chặn synthetic onPress overshoot) */}
            <View
              style={styles.thumbTrack}
              onLayout={({ nativeEvent: { layout } }) => {
                thumbLayoutRef.current = { w: layout.width, h: layout.height };
              }}
              onStartShouldSetResponder={() => Platform.OS !== 'web'}
              onMoveShouldSetResponder={() => Platform.OS !== 'web'}
              onResponderGrant={(e) => {
                lastThumbPointerAtRef.current = Date.now();
                const rel = e.nativeEvent.locationX / Math.max(1, thumbLayoutRef.current.w);
                setMoveDir(rel < 0.45 ? -1 : rel > 0.55 ? 1 : 0);
              }}
              onResponderMove={(e) => {
                lastThumbPointerAtRef.current = Date.now();
                const rel = e.nativeEvent.locationX / Math.max(1, thumbLayoutRef.current.w);
                setMoveDir(rel < 0.45 ? -1 : rel > 0.55 ? 1 : 0);
              }}
              onResponderRelease={() => {
                lastThumbPointerAtRef.current = Date.now();
                setMoveDir(0);
              }}
              onResponderTerminate={() => {
                lastThumbPointerAtRef.current = Date.now();
                setMoveDir(0);
              }}
              // @ts-expect-error chặn menu chuột phải trên mobile web
              onContextMenu={(e: Event) => e.preventDefault()}
              onPointerDown={(e: unknown) => {
                lastThumbPointerAtRef.current = Date.now();
                const pe = e as PointerEvent;
                pe.preventDefault?.();
                const el = pe.currentTarget as HTMLElement;
                el.setPointerCapture?.(pe.pointerId);
                updateThumbpadFromPoint(pe.clientX, pe.clientY, el.getBoundingClientRect());
              }}
              onPointerMove={(e: unknown) => {
                lastThumbPointerAtRef.current = Date.now();
                const pe = e as PointerEvent;
                if (pe.buttons === 0 && pe.pressure === 0) return;
                const el = pe.currentTarget as HTMLElement;
                updateThumbpadFromPoint(pe.clientX, pe.clientY, el.getBoundingClientRect());
              }}
              onPointerUp={() => {
                lastThumbPointerAtRef.current = Date.now();
                setMoveDir(0);
              }}
              onPointerCancel={() => {
                lastThumbPointerAtRef.current = Date.now();
                setMoveDir(0);
              }}
              onLostPointerCapture={() => {
                lastThumbPointerAtRef.current = Date.now();
                setMoveDir(0);
              }}
            >
              <Pressable
                testID="croak-left"
                onPress={() => {
                  // Fallback chỉ kích hoạt khi KHÔNG phải nhả ngón từ onPointerUp thật (tránh dư trớn +160ms!)
                  if (Date.now() - lastThumbPointerAtRef.current < 450) return;
                  if (moveDirRef.current === 0) {
                    setMoveDir(-1);
                    setTimeout(() => setMoveDir(0), 160);
                  }
                }}
                style={[styles.thumbHalf, thumbDir === -1 && styles.thumbHalfActive]}
              >
                <UiIcon
                  name="ChevronLeft"
                  size={26}
                  color="#FFFFFF"
                  strokeWidth={2.5}
                />
              </Pressable>

              <View pointerEvents="none" style={styles.thumbDivider}>
                <View
                  style={[
                    styles.thumbPuck,
                    thumbDir === -1 && { transform: [{ translateX: -28 }] },
                    thumbDir === 1 && { transform: [{ translateX: 28 }] },
                  ]}
                />
              </View>

              <Pressable
                testID="croak-right"
                onPress={() => {
                  if (Date.now() - lastThumbPointerAtRef.current < 450) return;
                  if (moveDirRef.current === 0) {
                    setMoveDir(1);
                    setTimeout(() => setMoveDir(0), 160);
                  }
                }}
                style={[styles.thumbHalf, thumbDir === 1 && styles.thumbHalfActive]}
              >
                <UiIcon
                  name="ChevronRight"
                  size={26}
                  color="#FFFFFF"
                  strokeWidth={2.5}
                />
              </Pressable>
            </View>

            {/* Cụm nút Hành Động Nhảy + Nuốt / Bắn ở góc phải dưới */}
            <View style={styles.actionCluster}>
              {hud.myState === 'carrying' ? (
                <Pressable
                  testID="croak-spit"
                  // @ts-expect-error phản hồi 0ms ngay khi chạm
                  onPointerDown={(e: PointerEvent) => {
                    e.preventDefault();
                    triggerActionImmediate('spit', () => sendInput({ spit: true }));
                  }}
                  onPress={() => triggerActionFallbackPress('spit', () => sendInput({ spit: true }))}
                  style={({ pressed }) => [styles.spitBtn, pressed && styles.btnPressed]}
                >
                  <UiIcon name="Send" size={18} color={C.ink} strokeWidth={1.75} />
                  <T selectable={false} style={[styles.actionBtnTxt, { color: C.ink }]}>
                    Bắn
                  </T>
                </Pressable>
              ) : (
                <Pressable
                  testID="croak-tongue"
                  // @ts-expect-error phản hồi 0ms ngay khi chạm
                  onPointerDown={(e: PointerEvent) => {
                    e.preventDefault();
                    triggerActionImmediate('tongue', () => sendInput({ tongue: true }));
                  }}
                  onPress={() => triggerActionFallbackPress('tongue', () => sendInput({ tongue: true }))}
                  style={({ pressed }) => [styles.tongueBtn, pressed && styles.btnPressed]}
                >
                  <UiIcon name="Zap" size={18} color="#FFFFFF" strokeWidth={1.75} />
                  <T selectable={false} style={styles.actionBtnTxt}>
                    Nuốt
                  </T>
                </Pressable>
              )}

              <Pressable
                testID="croak-jump"
                // @ts-expect-error phản hồi 0ms ngay khi ngón tay chạm xuống màn hình
                onPointerDown={(e: PointerEvent) => {
                  e.preventDefault();
                  triggerActionImmediate('jump', () => sendInput({ jump: true }));
                }}
                onPress={() => triggerActionFallbackPress('jump', () => sendInput({ jump: true }))}
                style={({ pressed }) => [styles.jumpBtn, pressed && styles.btnPressed]}
              >
                <UiIcon name="ChevronUp" size={20} color="#FFFFFF" strokeWidth={2.2} />
                <T selectable={false} style={styles.actionBtnTxt}>
                  {hud.myState === 'swallowed' ? 'Giãy' : 'Nhảy'}
                </T>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.spectatorBanner}>
            <UiIcon name="Eye" size={14} color={C.gold} strokeWidth={1.65} />
            <T style={styles.spectatorTxt}>
              Đang xem đội Ếch vượt đầm lầy
            </T>
          </View>
        )}
      </View>
    </Shell>
  );
}

export function CroakSquadScreen({ game, room }: { game: Game; room: RoomState }) {
  return (
    <Rotator>
      <CroakSquadLandscape game={game} room={room} />
    </Rotator>
  );
}

const styles = StyleSheet.create({
  landscapeStage: {
    flex: 1,
    minHeight: 0,
    backgroundColor: C.darkBg,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: C.darkBorder,
  },
  hudTopOverlay: {
    position: 'absolute',
    top: 6,
    left: 8,
    right: 8,
    alignItems: 'center',
    gap: 5,
    zIndex: 10,
  },
  hudPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(26, 30, 40, 0.90)',
    borderWidth: 1,
    borderColor: C.darkBorder,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: '100%',
  },
  stageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.goldSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  stageBadgeTxt: {
    fontSize: 11,
    fontWeight: '600',
    color: C.ink,
    fontFamily: FONT,
    fontVariant: ['tabular-nums'],
  },
  stageTitle: {
    fontSize: 12.5,
    fontWeight: '600',
    color: C.darkText,
    maxWidth: 180,
    fontFamily: FONT,
  },
  goalCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.darkSubtle,
    borderWidth: 1,
    borderColor: C.darkBorder,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  goalCounterTxt: {
    fontSize: 11,
    fontWeight: '600',
    color: C.darkText,
    fontVariant: ['tabular-nums'],
  },
  mapToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.darkSubtle,
    borderWidth: 1,
    borderColor: C.darkBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  mapToggleActive: { backgroundColor: C.paper, borderColor: C.paper },
  mapToggleTxt: { fontSize: 11, fontWeight: '500', color: C.darkText },
  toastPill: {
    backgroundColor: 'rgba(26, 30, 40, 0.92)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: C.darkBorder,
    maxWidth: '92%',
  },
  stageHint: { fontSize: 11.5, fontWeight: '500', color: C.darkText, textAlign: 'center' },

  aimBar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(26, 30, 40, 0.92)',
    borderWidth: 1,
    borderColor: C.darkBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  aimTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  aimTitle: { fontSize: 11, fontWeight: '600', color: C.goldSoft },
  aimChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: C.darkSubtle,
    borderWidth: 1,
    borderColor: C.darkBorder,
  },
  aimChipTxt: { fontSize: 11, fontWeight: '600', color: C.darkText },

  arcadeOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    zIndex: 12,
  },
  thumbTrack: {
    width: 158,
    height: 62,
    borderRadius: 16,
    backgroundColor: 'rgba(17, 20, 28, 0.84)',
    borderWidth: 1,
    borderColor: C.darkBorder,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  thumbHalf: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  thumbHalfActive: {
    backgroundColor: C.jade,
  },
  thumbDivider: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  thumbPuck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(251, 249, 245, 0.24)',
    borderWidth: 1,
    borderColor: 'rgba(251, 249, 245, 0.45)',
  },

  actionCluster: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  jumpBtn: {
    width: 78,
    height: 66,
    borderRadius: 16,
    backgroundColor: C.jade,
    borderWidth: 1.5,
    borderColor: 'rgba(134, 239, 172, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tongueBtn: {
    width: 74,
    height: 60,
    borderRadius: 14,
    backgroundColor: C.son,
    borderWidth: 1.5,
    borderColor: 'rgba(254, 202, 202, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  spitBtn: {
    width: 82,
    height: 64,
    borderRadius: 16,
    backgroundColor: C.gold,
    borderWidth: 1.5,
    borderColor: 'rgba(254, 243, 199, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  btnPressed: { transform: [{ scale: 0.96 }], opacity: 0.9 },
  actionBtnTxt: { fontSize: 11.5, fontWeight: '600', color: '#FFFFFF', fontFamily: FONT },

  spectatorBanner: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.darkSurface,
    borderWidth: 1,
    borderColor: C.darkBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  spectatorTxt: { fontSize: 12, fontWeight: '500', color: C.darkText, textAlign: 'center' },
});
