/**
 * Đầm Lầy Quái Chiêu (`croaksquad`, 2–6 người chơi thật):
 * Engine vật lý 2D tất định (deterministic fixed-timestep) dùng chung cho Server (trọng tài 30Hz)
 * và Client (vẽ đường ngắm quỹ đạo tức thì + nội suy 60fps).
 *
 * Cơ chế cốt lõi: Phóng lưỡi nuốt đồng đội vào bụng -> căn góc & lực -> nhổ/bắn đồng đội bay theo
 * đường vòng cung vượt vực sâu, lấy chìa khóa trên cao, đạp công tắc mở cầu hoặc chuyền nhau trên không.
 */

export const CROAK_FPS = 30;
export const CROAK_DT = 1 / CROAK_FPS;
export const CROAK_GRAVITY = 1320;
export const CROAK_MOVE_SPEED = 245;
export const CROAK_CARRY_MULT = 0.85;
export const CROAK_JUMP_VY = -525;
export const CROAK_MAX_FALL = 780;
export const CROAK_FROG_W = 30;
export const CROAK_FROG_H = 26;
export const CROAK_TONGUE_RANGE = 116;
export const CROAK_TONGUE_RADIUS = 36;
export const CROAK_TONGUE_TICKS = 6;
export const CROAK_MAX_CARRY_TICKS = 300; // tự nhả sau 10s để tránh giam bạn vô thời hạn
export const CROAK_RESPAWN_TICKS = 42; // ~1.4s hồi sinh bong bóng tại checkpoint
export const CROAK_SPIT_MIN_SPEED = 520;
export const CROAK_SPIT_MAX_SPEED = 940;

export type FrogState =
  | 'normal'
  | 'tongue'
  | 'carrying'
  | 'swallowed'
  | 'launched'
  | 'dead'
  | 'finished';

export interface CroakRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CroakPlatform extends CroakRect {
  id: string;
  kind: 'moss' | 'stone' | 'wood' | 'bounce';
  /** độ bật nảy nếu kind === 'bounce' (vd -760) */
  bounceVy?: number;
  /** bệ di động qua lại giữa (x,y) và (x+dx, y+dy) theo chu kỳ periodSec */
  move?: { dx: number; dy: number; periodSec: number };
  /** chỉ xuất hiện (rắn chắc) khi công tắc `switchId` đang bật */
  activeWhenSwitch?: string;
}

export interface CroakHazard extends CroakRect {
  id: string;
  kind: 'swamp' | 'spikes';
}

export interface CroakSwitch extends CroakRect {
  id: string;
  /** latch = giẫm 1 lần giữ mở luôn; hold = phải có người đứng đè mới mở */
  latch: boolean;
  /** yêu cầu tối thiểu bao nhiêu ếch cùng đè (tự giảm xuống 1 nếu phòng chỉ có 2 người online) */
  minFrogs?: number;
  label?: string;
}

export interface CroakGate extends CroakRect {
  id: string;
  /** mở khi công tắc này bật */
  openBySwitch?: string;
  /** hoặc mở vĩnh viễn khi nhặt chìa khóa này */
  openByKey?: string;
}

export interface CroakKeyItem {
  id: string;
  x: number;
  y: number;
  r: number;
}

export interface CroakCheckpoint {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  spawnX: number;
  spawnY: number;
}

export interface CroakStageDef {
  index: number;
  id: string;
  name: string;
  subtitle: string;
  hint: string;
  width: number;
  height: number;
  spawn: { x: number; y: number };
  goal: CroakRect;
  platforms: CroakPlatform[];
  hazards: CroakHazard[];
  switches: CroakSwitch[];
  gates: CroakGate[];
  keys: CroakKeyItem[];
  checkpoints: CroakCheckpoint[];
}

export interface CroakInput {
  seq?: number;
  /** -1 (trái), 0, 1 (phải) */
  moveX: number;
  /** nhấn nhảy */
  jump?: boolean;
  /** nhấn phóng lưỡi bắt đồng đội */
  tongue?: boolean;
  /** nhấn nhả/bắn đồng đội đang ở trong bụng */
  spit?: boolean;
  /** góc ngắm bắn (radian, -PI..PI; mặc định hướng chéo lên theo mặt đang quay) */
  aimAngle?: number;
  /** lực bắn 0..1 */
  aimPower?: number;
}

export interface FrogEntity {
  id: string;
  name: string;
  colorIndex: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  onGround: boolean;
  coyoteTicks: number;
  jumpBufferTicks: number;
  state: FrogState;
  /** id đồng đội đang nằm trong bụng mình */
  bellyId: string | null;
  /** id đồng đội đang ngậm mình */
  carrierId: string | null;
  carryTicks: number;
  struggleCount: number;
  tongueTicks: number;
  tongueEndX: number;
  tongueEndY: number;
  respawnTicks: number;
  aimAngle: number;
  aimPower: number;
  deaths: number;
  spits: number;
  saves: number;
  connected: boolean;
}

export type CroakSoundFx = 'jump' | 'tongue' | 'swallow' | 'spit' | 'bounce' | 'switch' | 'key' | 'checkpoint' | 'die' | 'respawn' | 'stage_clear';

export interface CroakEvent {
  id: number;
  tick: number;
  sfx: CroakSoundFx;
  x: number;
  y: number;
  actorId?: string;
  targetId?: string;
  text?: string;
}

export interface CroakWorld {
  stageIndex: number;
  tick: number;
  elapsedSec: number;
  frogs: FrogEntity[];
  switchesOn: Record<string, boolean>;
  keysCollected: Record<string, boolean>;
  activeCheckpointId: string | null;
  spawnX: number;
  spawnY: number;
  stageClearedTicks: number;
  allCompleted: boolean;
  eventSeq: number;
  recentEvents: CroakEvent[];
}

/** Gói nhẹ gửi 30Hz qua Socket `'croak:tick'` để tránh serialize cả RoomState */
export interface CroakTickPayload {
  stageIndex: number;
  tick: number;
  switchesOn: Record<string, boolean>;
  keysCollected: Record<string, boolean>;
  activeCheckpointId: string | null;
  frogs: {
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    facing: 1 | -1;
    onGround: boolean;
    state: FrogState;
    bellyId: string | null;
    carrierId: string | null;
    tongueTicks: number;
    tongueEndX: number;
    tongueEndY: number;
    aimAngle: number;
    aimPower: number;
    deaths: number;
    spits: number;
    connected: boolean;
  }[];
  events: CroakEvent[];
}

export interface CroakSquadView {
  type: 'croaksquad';
  stageIndex: number;
  totalStages: number;
  stageId: string;
  stageName: string;
  stageSubtitle: string;
  stageHint: string;
  tick: number;
  elapsedSec: number;
  order: string[];
  names: Record<string, string>;
  switchesOn: Record<string, boolean>;
  keysCollected: Record<string, boolean>;
  activeCheckpointId: string | null;
  frogs: CroakTickPayload['frogs'];
  events: CroakEvent[];
}

// ============================================================================
// 3 MÀN CHƠI CO-OP ĐƯỢC THIẾT KẾ CÓ CHỦ ĐÍCH (TỪ NHẬP MÔN TỚI ĐỀN CỔ)
// ============================================================================

export const CROAK_STAGES: readonly CroakStageDef[] = [
  {
    index: 0,
    id: 'swamp_intro',
    name: 'Màn 1: Bờ Đầm Nhập Môn',
    subtitle: 'Nuốt bạn -> bắn lên vách cao mở cầu gỗ -> về Cổng Sen Vàng!',
    hint: 'Hố bùn giữa đường quá rộng để tự nhảy! Hãy nuốt đồng đội (Nút Lưỡi / Phím J) rồi ngắm bắn lên bệ đá cao có Công Tắc Đỏ để bắc cầu.',
    width: 1600,
    height: 720,
    spawn: { x: 90, y: 520 },
    goal: { x: 1455, y: 448, w: 86, h: 92 },
    platforms: [
      // Bờ xuất phát & bậc tập nhảy
      { id: 'p_start', x: 0, y: 580, w: 390, h: 140, kind: 'moss' },
      { id: 'p_step1', x: 250, y: 520, w: 130, h: 60, kind: 'stone' },
      // Vách cao bên trên hố bùn chứa công tắc mở cầu (chỉ tới được khi được đồng đội bắn lên!)
      { id: 'p_high_sw', x: 510, y: 315, w: 220, h: 32, kind: 'stone' },
      // Cầu gỗ bắc ngang hố bùn (chỉ hiện khi công tắc sw_bridge bật!)
      { id: 'p_bridge1', x: 380, y: 540, w: 380, h: 26, kind: 'wood', activeWhenSwitch: 'sw_bridge' },
      // Bờ giữa có Checkpoint #1
      { id: 'p_mid', x: 755, y: 540, w: 330, h: 180, kind: 'moss' },
      // Nấm nhún lò xo + tường cao chắn trước đích
      { id: 'p_shroom1', x: 1010, y: 518, w: 68, h: 22, kind: 'bounce', bounceVy: -870 },
      { id: 'p_wall_mid', x: 1150, y: 390, w: 46, h: 330, kind: 'stone' },
      // Mỏm đá mở cổng đích trên đỉnh tường
      { id: 'p_upper_gate', x: 1135, y: 245, w: 175, h: 28, kind: 'stone' },
      // Bờ đích Cổng Lá Sen Vàng
      { id: 'p_goal', x: 1196, y: 540, w: 404, h: 180, kind: 'moss' },
      // Tường bao trái phải
      { id: 'w_left', x: -40, y: 0, w: 40, h: 760, kind: 'stone' },
      { id: 'w_right', x: 1600, y: 0, w: 40, h: 760, kind: 'stone' },
    ],
    hazards: [
      { id: 'hz_mud1', x: 390, y: 668, w: 365, h: 52, kind: 'swamp' },
      { id: 'hz_mud2', x: 1085, y: 668, w: 111, h: 52, kind: 'swamp' },
    ],
    switches: [
      { id: 'sw_bridge', x: 585, y: 299, w: 64, h: 16, latch: true, label: 'Cầu Gỗ' },
      { id: 'sw_final', x: 1192, y: 229, w: 64, h: 16, latch: true, label: 'Cổng Sen' },
    ],
    gates: [
      { id: 'gt_final', x: 1365, y: 380, w: 30, h: 160, openBySwitch: 'sw_final' },
    ],
    keys: [],
    checkpoints: [
      { id: 'cp_1', x: 855, y: 468, w: 54, h: 72, spawnX: 865, spawnY: 495 },
    ],
  },
  {
    index: 1,
    id: 'cliff_relay',
    name: 'Màn 2: Thác Đá Chuyền Cành',
    subtitle: 'Bắn bạn lên tháp lấy Chìa Khóa Vàng & chuyền tiếp sức qua hẻm vực!',
    hint: 'Cổng đá đầu màn cần Chìa Khóa Vàng trên đỉnh tháp! Sau Checkpoint, hãy căn bệ đá di động và chuyền đồng đội qua vực dài.',
    width: 1900,
    height: 780,
    spawn: { x: 85, y: 560 },
    goal: { x: 1755, y: 468, w: 88, h: 92 },
    platforms: [
      { id: 'p2_start', x: 0, y: 620, w: 470, h: 160, kind: 'moss' },
      { id: 'p2_step1', x: 75, y: 555, w: 125, h: 65, kind: 'stone' },
      // Đài cao chứa Chìa Khóa Vàng
      { id: 'p2_key_ledge', x: 140, y: 345, w: 190, h: 30, kind: 'stone' },
      // Bệ sau cổng khóa + Checkpoint
      { id: 'p2_after_gate', x: 590, y: 580, w: 320, h: 200, kind: 'moss' },
      // Bệ đá di động giữa hẻm vực lớn
      { id: 'p2_mover1', x: 965, y: 540, w: 135, h: 26, kind: 'wood', move: { dx: 150, dy: 0, periodSec: 4.2 } },
      // Trụ đá trung chuyển giữa vực + mỏm công tắc cao
      { id: 'p2_relay_pillar', x: 1295, y: 500, w: 125, h: 280, kind: 'stone' },
      { id: 'p2_high_latch', x: 1250, y: 265, w: 180, h: 28, kind: 'stone' },
      // Cầu cuối mở nhờ công tắc trên cao
      { id: 'p2_end_bridge', x: 1420, y: 530, w: 195, h: 26, kind: 'wood', activeWhenSwitch: 'sw2_bridge' },
      { id: 'p2_goal', x: 1610, y: 560, w: 290, h: 220, kind: 'moss' },
      { id: 'w2_left', x: -40, y: 0, w: 40, h: 820, kind: 'stone' },
      { id: 'w2_right', x: 1900, y: 0, w: 40, h: 820, kind: 'stone' },
    ],
    hazards: [
      { id: 'hz2_thorn', x: 350, y: 604, w: 72, h: 16, kind: 'spikes' },
      { id: 'hz2_gap1', x: 470, y: 725, w: 120, h: 55, kind: 'swamp' },
      { id: 'hz2_abyss', x: 910, y: 725, w: 700, h: 55, kind: 'swamp' },
    ],
    switches: [
      { id: 'sw2_bridge', x: 1310, y: 249, w: 62, h: 16, latch: true, label: 'Cầu Đích' },
    ],
    gates: [
      { id: 'gt2_key', x: 590, y: 410, w: 32, h: 170, openByKey: 'key_tower' },
    ],
    keys: [
      { id: 'key_tower', x: 235, y: 300, r: 18 },
    ],
    checkpoints: [
      { id: 'cp2_mid', x: 735, y: 508, w: 54, h: 72, spawnX: 745, spawnY: 535 },
    ],
  },
  {
    index: 2,
    id: 'ancient_temple',
    name: 'Màn 3: Đền Cổ Xóm Lầy',
    subtitle: 'Bắn vượt tường thành cổ, phối hợp bệ thang máy & mở Đài Sen Vàng!',
    hint: 'Tường Đền Cổ rất cao! Hãy bắn 1 người vượt đỉnh tường sang bên kia giẫm công tắc mở cổng thành cho cả đội.',
    width: 2100,
    height: 820,
    spawn: { x: 85, y: 600 },
    goal: { x: 1945, y: 468, w: 92, h: 92 },
    platforms: [
      { id: 'p3_start', x: 0, y: 650, w: 430, h: 170, kind: 'moss' },
      { id: 'p3_shroom_entry', x: 335, y: 628, w: 68, h: 22, kind: 'bounce', bounceVy: -900 },
      // Tường thành Đền Cổ chắn ngang + cổng dưới chân tường
      { id: 'p3_great_wall', x: 560, y: 350, w: 48, h: 160, kind: 'stone' },
      { id: 'p3_courtyard', x: 560, y: 650, w: 590, h: 170, kind: 'stone' },
      // Thang máy dọc đưa lên tầng tháp chìa khóa
      { id: 'p3_elevator', x: 1210, y: 610, w: 120, h: 26, kind: 'wood', move: { dx: 0, dy: -210, periodSec: 4.5 } },
      { id: 'p3_key_balcony', x: 1380, y: 370, w: 190, h: 28, kind: 'stone' },
      // Bệ trượt ngang cuối cùng dẫn tới Đài Sen Vàng
      { id: 'p3_mover_end', x: 1410, y: 610, w: 140, h: 26, kind: 'wood', move: { dx: 185, dy: 0, periodSec: 3.8 } },
      { id: 'p3_sanctum', x: 1760, y: 560, w: 340, h: 260, kind: 'moss' },
      { id: 'w3_left', x: -40, y: 0, w: 40, h: 860, kind: 'stone' },
      { id: 'w3_right', x: 2100, y: 0, w: 40, h: 860, kind: 'stone' },
    ],
    hazards: [
      { id: 'hz3_moat', x: 430, y: 765, w: 130, h: 55, kind: 'swamp' },
      { id: 'hz3_spikes_yard', x: 830, y: 634, w: 85, h: 16, kind: 'spikes' },
      { id: 'hz3_chasm', x: 1150, y: 765, w: 610, h: 55, kind: 'swamp' },
    ],
    switches: [
      { id: 'sw3_wall_gate', x: 675, y: 634, w: 66, h: 16, latch: true, label: 'Cổng Thành' },
    ],
    gates: [
      { id: 'gt3_wall', x: 568, y: 510, w: 32, h: 140, openBySwitch: 'sw3_wall_gate' },
      { id: 'gt3_sanctum', x: 1835, y: 400, w: 32, h: 160, openByKey: 'key_sanctum' },
    ],
    keys: [
      { id: 'key_sanctum', x: 1475, y: 325, r: 18 },
    ],
    checkpoints: [
      { id: 'cp3_yard', x: 1030, y: 578, w: 54, h: 72, spawnX: 1040, spawnY: 605 },
    ],
  },
];

// ============================================================================
// HÀM TIỆN ÍCH HÌNH HỌC & VẬT LÝ TẤT ĐỊNH
// ============================================================================

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const r1 = (v: number) => Math.round(v * 10) / 10;

export function rectsOverlap(a: CroakRect, b: CroakRect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function platformRectAt(p: CroakPlatform, elapsedSec: number): CroakRect {
  if (!p.move) return { x: p.x, y: p.y, w: p.w, h: p.h };
  const phase = (elapsedSec / Math.max(0.5, p.move.periodSec)) * Math.PI * 2;
  // dao động điều hòa 0 -> 1 -> 0 mượt ở hai đầu
  const t = (1 - Math.cos(phase)) * 0.5;
  return {
    x: p.x + p.move.dx * t,
    y: p.y + p.move.dy * t,
    w: p.w,
    h: p.h,
  };
}

export function getSolidRects(
  stage: CroakStageDef,
  switchesOn: Record<string, boolean>,
  keysCollected: Record<string, boolean>,
  elapsedSec: number,
): (CroakRect & { bounceVy?: number; vxPlatform?: number; vyPlatform?: number })[] {
  const out: (CroakRect & { bounceVy?: number; vxPlatform?: number; vyPlatform?: number })[] = [];
  for (const p of stage.platforms) {
    if (p.activeWhenSwitch && !switchesOn[p.activeWhenSwitch]) continue;
    const nowR = platformRectAt(p, elapsedSec);
    let vxPlatform = 0;
    let vyPlatform = 0;
    if (p.move) {
      const prevR = platformRectAt(p, Math.max(0, elapsedSec - CROAK_DT));
      vxPlatform = (nowR.x - prevR.x) / CROAK_DT;
      vyPlatform = (nowR.y - prevR.y) / CROAK_DT;
    }
    out.push({ ...nowR, bounceVy: p.kind === 'bounce' ? (p.bounceVy ?? -720) : undefined, vxPlatform, vyPlatform });
  }
  for (const g of stage.gates) {
    const opened =
      (g.openBySwitch && switchesOn[g.openBySwitch]) ||
      (g.openByKey && keysCollected[g.openByKey]);
    if (!opened) out.push({ x: g.x, y: g.y, w: g.w, h: g.h });
  }
  return out;
}

export function spitSpeedForPower(power: number): number {
  const p = clamp(Number.isFinite(power) ? power : 0.78, 0.25, 1);
  return CROAK_SPIT_MIN_SPEED + (CROAK_SPIT_MAX_SPEED - CROAK_SPIT_MIN_SPEED) * p;
}

/**
 * Tính trước đường cong quỹ đạo bắn (dùng cùng hằng số trọng lực CROAK_GRAVITY của server)
 * để người đang ngậm bạn thấy chính xác đường bay & điểm chạm tường.
 */
export function computeSpitArc(
  carrierX: number,
  carrierY: number,
  angleRad: number,
  power: number,
  stage: CroakStageDef,
  switchesOn: Record<string, boolean>,
  keysCollected: Record<string, boolean>,
  elapsedSec: number,
  steps = 22,
): { x: number; y: number; hitWall?: boolean }[] {
  const solids = getSolidRects(stage, switchesOn, keysCollected, elapsedSec);
  const speed = spitSpeedForPower(power);
  let vx = Math.cos(angleRad) * speed;
  let vy = Math.sin(angleRad) * speed;
  let x = carrierX + CROAK_FROG_W * 0.5 - CROAK_FROG_W * 0.5 + Math.cos(angleRad) * 18;
  let y = carrierY + CROAK_FROG_H * 0.5 - CROAK_FROG_H * 0.5 + Math.sin(angleRad) * 18;
  if (solids.some((s) => rectsOverlap({ x, y, w: CROAK_FROG_W, h: CROAK_FROG_H }, s))) {
    x = carrierX;
    y = carrierY - 4;
  }
  const pts: { x: number; y: number; hitWall?: boolean }[] = [];
  const dt = CROAK_DT * 1.5;
  for (let i = 0; i < steps; i++) {
    vy = Math.min(CROAK_MAX_FALL, vy + CROAK_GRAVITY * dt);
    x += vx * dt;
    y += vy * dt;
    const box = { x, y, w: CROAK_FROG_W, h: CROAK_FROG_H };
    const hit = solids.some((s) => rectsOverlap(box, s));
    pts.push({ x: Math.round(x + CROAK_FROG_W * 0.5), y: Math.round(y + CROAK_FROG_H * 0.5), ...(hit ? { hitWall: true } : {}) });
    if (hit || y > stage.height + 40) break;
  }
  return pts;
}

// ============================================================================
// KHỞI TẠO & MÔ PHỎNG THẾ GIỚI
// ============================================================================

export function createCroakWorld(
  players: { id: string; name: string; colorIndex?: number }[],
  stageIndex = 0,
): CroakWorld {
  const st = CROAK_STAGES[clamp(stageIndex, 0, CROAK_STAGES.length - 1)];
  const frogs: FrogEntity[] = players.map((p, idx) => ({
    id: p.id,
    name: p.name,
    colorIndex: p.colorIndex ?? idx,
    x: st.spawn.x + (idx % 4) * 34,
    y: st.spawn.y - Math.floor(idx / 4) * 32,
    vx: 0,
    vy: 0,
    facing: 1,
    onGround: false,
    coyoteTicks: 0,
    jumpBufferTicks: 0,
    state: 'normal',
    bellyId: null,
    carrierId: null,
    carryTicks: 0,
    struggleCount: 0,
    tongueTicks: 0,
    tongueEndX: 0,
    tongueEndY: 0,
    respawnTicks: 0,
    aimAngle: -Math.PI * 0.32,
    aimPower: 0.8,
    deaths: 0,
    spits: 0,
    saves: 0,
    connected: true,
  }));
  return {
    stageIndex: st.index,
    tick: 0,
    elapsedSec: 0,
    frogs,
    switchesOn: {},
    keysCollected: {},
    activeCheckpointId: null,
    spawnX: st.spawn.x,
    spawnY: st.spawn.y,
    stageClearedTicks: 0,
    allCompleted: false,
    eventSeq: 0,
    recentEvents: [],
  };
}

export function loadCroakStage(world: CroakWorld, nextStageIndex: number): void {
  const st = CROAK_STAGES[clamp(nextStageIndex, 0, CROAK_STAGES.length - 1)];
  world.stageIndex = st.index;
  world.elapsedSec = 0;
  world.switchesOn = {};
  world.keysCollected = {};
  world.activeCheckpointId = null;
  world.spawnX = st.spawn.x;
  world.spawnY = st.spawn.y;
  world.stageClearedTicks = 0;
  world.frogs.forEach((f, idx) => {
    f.x = st.spawn.x + (idx % 4) * 34;
    f.y = st.spawn.y - Math.floor(idx / 4) * 32;
    f.vx = 0;
    f.vy = 0;
    f.facing = 1;
    f.onGround = false;
    f.coyoteTicks = 0;
    f.jumpBufferTicks = 0;
    f.state = 'normal';
    f.bellyId = null;
    f.carrierId = null;
    f.carryTicks = 0;
    f.struggleCount = 0;
    f.tongueTicks = 0;
    f.respawnTicks = 0;
    f.aimAngle = -Math.PI * 0.32;
    f.aimPower = 0.8;
  });
}

function pushEvent(world: CroakWorld, sfx: CroakSoundFx, x: number, y: number, extra: Partial<CroakEvent> = {}): void {
  const ev: CroakEvent = {
    id: ++world.eventSeq,
    tick: world.tick,
    sfx,
    x: Math.round(x),
    y: Math.round(y),
    ...extra,
  };
  world.recentEvents.push(ev);
  if (world.recentEvents.length > 18) world.recentEvents.shift();
}

/**
 * Giải phóng an toàn đồng đội đang ở trong bụng (dùng khi người ngậm bị chết, rớt mạng, thoát phòng, hoặc giãy thoát).
 */
export function ejectBellySafely(world: CroakWorld, carrier: FrogEntity, popVy = -480): FrogEntity | null {
  if (!carrier.bellyId) return null;
  const passenger = world.frogs.find((x) => x.id === carrier.bellyId);
  carrier.bellyId = null;
  carrier.carryTicks = 0;
  if (carrier.state === 'carrying') carrier.state = 'normal';
  if (!passenger) return null;
  const stage = CROAK_STAGES[world.stageIndex] ?? CROAK_STAGES[0];
  passenger.carrierId = null;
  passenger.struggleCount = 0;
  passenger.state = 'launched';
  if (carrier.y > stage.height) {
    // Nếu người ngậm rơi hẳn khỏi đáy bản đồ, giải cứu đồng đội về Checkpoint an toàn
    passenger.x = world.spawnX;
    passenger.y = world.spawnY - 12;
    passenger.vx = 0;
    passenger.vy = -220;
  } else {
    let py = carrier.y - CROAK_FROG_H - 8;
    for (const hz of stage.hazards) {
      if (rectsOverlap({ x: carrier.x, y: py, w: CROAK_FROG_W, h: CROAK_FROG_H }, hz)) {
        py = Math.min(py, hz.y - CROAK_FROG_H - 8);
      }
    }
    passenger.x = carrier.x;
    passenger.y = py;
    passenger.vx = -carrier.facing * 120;
    passenger.vy = popVy;
  }
  passenger.onGround = false;
  return passenger;
}

export function removeCroakPlayer(world: CroakWorld, playerId: string): void {
  const target = world.frogs.find((f) => f.id === playerId);
  if (!target) return;
  if (target.bellyId) ejectBellySafely(world, target);
  if (target.carrierId) {
    const carrier = world.frogs.find((f) => f.id === target.carrierId);
    if (carrier) {
      carrier.bellyId = null;
      carrier.carryTicks = 0;
      if (carrier.state === 'carrying') carrier.state = 'normal';
    }
  }
  world.frogs = world.frogs.filter((f) => f.id !== playerId);
}

export function setCroakConnection(world: CroakWorld, playerId: string, connected: boolean): void {
  const f = world.frogs.find((x) => x.id === playerId);
  if (!f) return;
  f.connected = connected;
  if (!connected && f.bellyId) {
    ejectBellySafely(world, f);
  }
}

function killFrog(world: CroakWorld, f: FrogEntity): void {
  if (f.state === 'dead') return;
  // Nếu đang ngậm đồng đội thì nhả bạn bật lên cao an toàn trước khi mình chết!
  if (f.bellyId) {
    ejectBellySafely(world, f, -460);
  }
  if (f.carrierId) {
    const c = world.frogs.find((x) => x.id === f.carrierId);
    if (c) {
      c.bellyId = null;
      c.carryTicks = 0;
      if (c.state === 'carrying') c.state = 'normal';
    }
    f.carrierId = null;
  }
  f.state = 'dead';
  f.vx = 0;
  f.vy = 0;
  f.tongueTicks = 0;
  f.respawnTicks = CROAK_RESPAWN_TICKS;
  f.deaths++;
  pushEvent(world, 'die', f.x + CROAK_FROG_W * 0.5, f.y + CROAK_FROG_H * 0.5, { actorId: f.id });
}

function performSpit(
  world: CroakWorld,
  carrier: FrogEntity,
  solids: CroakRect[],
  angleOverride?: number,
  powerOverride?: number,
): void {
  if (!carrier.bellyId) return;
  const passenger = world.frogs.find((x) => x.id === carrier.bellyId);
  carrier.bellyId = null;
  carrier.carryTicks = 0;
  carrier.state = 'normal';
  if (!passenger) return;

  const angle = Number.isFinite(angleOverride)
    ? clamp(angleOverride!, -Math.PI, Math.PI)
    : carrier.aimAngle;
  const power = clamp(powerOverride ?? carrier.aimPower, 0.25, 1);
  const speed = spitSpeedForPower(power);

  let sx = carrier.x + Math.cos(angle) * 20;
  let sy = carrier.y + Math.sin(angle) * 20 - 4;
  // Chống kẹt tường khi nhả sát vách đá: nếu điểm nhả đụng tường thì lùi về tâm người ngậm
  if (solids.some((s) => rectsOverlap({ x: sx, y: sy, w: CROAK_FROG_W, h: CROAK_FROG_H }, s))) {
    sx = carrier.x;
    sy = carrier.y - 2;
  }

  passenger.carrierId = null;
  passenger.struggleCount = 0;
  passenger.state = 'launched';
  passenger.x = sx;
  passenger.y = sy;
  passenger.vx = Math.cos(angle) * speed + carrier.vx * 0.18;
  // Khi người ngậm vừa nhảy vừa ném (carrier.vy < 0), cộng thêm xung lực nhảy để bay cao & mượt
  passenger.vy = Math.sin(angle) * speed + (carrier.vy < 0 ? carrier.vy * 0.25 : 0);
  passenger.facing = Math.cos(angle) >= 0 ? 1 : -1;
  passenger.onGround = false;

  // Phản lực giật lùi hài hước cho người bắn
  carrier.vx -= Math.cos(angle) * 115;
  if (carrier.onGround && Math.sin(angle) > 0.3) carrier.vy = -160;
  carrier.spits++;
  pushEvent(world, 'spit', sx + CROAK_FROG_W * 0.5, sy + CROAK_FROG_H * 0.5, {
    actorId: carrier.id,
    targetId: passenger.id,
  });
}

export function moveAndCollideFrog(
  f: { x: number; y: number; vx: number; vy: number; onGround: boolean; state?: FrogState; id?: string },
  solids: (CroakRect & { bounceVy?: number; vxPlatform?: number; vyPlatform?: number })[],
  dt: number,
  world?: CroakWorld,
): void {
  const speedMag = Math.hypot(f.vx, f.vy);
  const steps = speedMag * dt > 12 ? Math.min(5, Math.ceil((speedMag * dt) / 10)) : 1;
  const sdt = dt / steps;
  f.onGround = false;
  let carriedThisStep = false;

  // 0. Bám dính bệ gỗ lơ lửng / thang máy di động (chỉ khi không đang nhảy bứt lên f.vy >= -40)
  const startBottom = f.y + CROAK_FROG_H;
  if (f.vy >= -40) {
    for (const r of solids) {
      if (!r.vxPlatform && !r.vyPlatform) continue;
      if (r.bounceVy !== undefined) continue;
      const horizOverlap = f.x + CROAK_FROG_W > r.x + 2 && f.x < r.x + r.w - 2;
      const nearTop = startBottom >= r.y - 12 && startBottom <= r.y + 16;
      if (horizOverlap && nearTop) {
        if (r.vxPlatform) f.x += r.vxPlatform * dt;
        f.y = r.y - CROAK_FROG_H;
        f.vy = Math.max(0, r.vyPlatform ?? 0);
        f.onGround = true;
        carriedThisStep = true;
        break;
      }
    }
  }

  for (let s = 0; s < steps; s++) {
    // Trục X: thu gọn 8px đáy chân (Step-Up Margin) để thanh gỗ lơ lửng dưới chân KHÔNG đẩy văng ếch ngang
    const prevX = f.x;
    f.x += f.vx * sdt;
    const boxX: CroakRect = { x: f.x, y: f.y + 2, w: CROAK_FROG_W, h: CROAK_FROG_H - 8 };
    for (const r of solids) {
      if (!rectsOverlap(boxX, r)) continue;
      if (f.vx > 0 && prevX + CROAK_FROG_W <= r.x + 12) {
        f.x = r.x - CROAK_FROG_W;
        f.vx = f.state === 'launched' ? -f.vx * 0.28 : 0;
        boxX.x = f.x;
      } else if (f.vx < 0 && prevX >= r.x + r.w - 12) {
        f.x = r.x + r.w;
        f.vx = f.state === 'launched' ? -f.vx * 0.28 : 0;
        boxX.x = f.x;
      }
    }

    // Trục Y
    const prevBottom = f.y + CROAK_FROG_H;
    const prevTop = f.y;
    f.y += f.vy * sdt;
    const boxY: CroakRect = { x: f.x, y: f.y, w: CROAK_FROG_W, h: CROAK_FROG_H };
    for (const r of solids) {
      if (!rectsOverlap(boxY, r)) continue;
      const platVy = r.vyPlatform ?? 0;
      if (f.vy >= platVy - 25 && prevBottom <= r.y + Math.max(14, r.h * 0.7)) {
        f.y = r.y - CROAK_FROG_H;
        if (r.bounceVy !== undefined) {
          f.vy = r.bounceVy;
          f.onGround = false;
          if (f.state !== undefined) f.state = 'launched';
          if (world && f.id) pushEvent(world, 'bounce', f.x + CROAK_FROG_W * 0.5, r.y, { actorId: f.id });
        } else {
          f.vy = platVy > 0 ? platVy : 0;
          f.onGround = true;
          if (!carriedThisStep && r.vxPlatform) f.x += r.vxPlatform * sdt;
          if (f.state === 'launched') f.state = 'normal';
        }
        boxY.y = f.y;
      } else if (f.vy < 0 && prevTop >= r.y + r.h - 14) {
        f.y = r.y + r.h;
        f.vy = 0;
        boxY.y = f.y;
      }
    }
  }
}

/**
 * Tiến thế giới vật lý thêm 1 bước `dt` (mặc định `CROAK_DT = 1/30s`).
 * Trả về các sự kiện âm thanh/hiệu ứng vừa phát sinh trong tick này.
 */
export function stepCroakWorld(
  world: CroakWorld,
  inputs: Record<string, CroakInput | undefined>,
  dt = CROAK_DT,
): CroakEvent[] {
  if (world.allCompleted) return [];
  const prevEventSeq = world.eventSeq;
  world.tick++;
  world.elapsedSec += dt;
  const stage = CROAK_STAGES[world.stageIndex] ?? CROAK_STAGES[0];

  // Nếu vừa hoàn thành màn hiện tại, chờ 40 tick (~1.3s) ăn mừng rồi sang màn kế tiếp hoặc thắng chung cuộc
  if (world.stageClearedTicks > 0) {
    world.stageClearedTicks++;
    if (world.stageClearedTicks >= 38) {
      if (world.stageIndex + 1 < CROAK_STAGES.length) {
        loadCroakStage(world, world.stageIndex + 1);
      } else {
        world.allCompleted = true;
      }
    }
    return world.recentEvents.filter((e) => e.id > prevEventSeq);
  }

  const solids = getSolidRects(stage, world.switchesOn, world.keysCollected, world.elapsedSec);

  // 1. Xử lý đầu vào, hồi sinh & nuốt/nhả theo thứ tự tất định
  for (const f of world.frogs) {
    const inp = inputs[f.id];

    if (f.state === 'dead') {
      f.respawnTicks--;
      if (f.respawnTicks <= 0) {
        const idx = world.frogs.indexOf(f);
        f.x = world.spawnX + (idx % 3) * 26;
        f.y = world.spawnY - 8;
        f.vx = 0;
        f.vy = -120;
        f.state = 'normal';
        pushEvent(world, 'respawn', f.x + CROAK_FROG_W * 0.5, f.y, { actorId: f.id });
      }
      continue;
    }

    if (f.state === 'swallowed') {
      const carrier = f.carrierId ? world.frogs.find((c) => c.id === f.carrierId) : undefined;
      if (!carrier || carrier.bellyId !== f.id || carrier.state === 'dead') {
        f.carrierId = null;
        f.state = 'normal';
      } else {
        f.x = carrier.x;
        f.y = carrier.y;
        f.vx = carrier.vx;
        f.vy = carrier.vy;
        if (inp?.jump) {
          f.struggleCount++;
          if (f.struggleCount >= 5) {
            ejectBellySafely(world, carrier, -420);
            pushEvent(world, 'spit', carrier.x, carrier.y, { actorId: f.id });
          }
        }
        continue;
      }
    }

    // Cập nhật hướng & góc ngắm
    const moveX = inp ? clamp(Math.round(inp.moveX), -1, 1) : 0;
    if (moveX !== 0) {
      f.facing = moveX > 0 ? 1 : -1;
      // Nếu không truyền aimAngle tường minh thì tự lật đối xứng góc ngắm theo hướng quay mặt
      if (inp?.aimAngle === undefined) {
        if ((f.facing === 1 && Math.cos(f.aimAngle) < 0) || (f.facing === -1 && Math.cos(f.aimAngle) > 0)) {
          f.aimAngle = -Math.PI - f.aimAngle;
        }
      }
    }
    if (inp?.aimAngle !== undefined && Number.isFinite(inp.aimAngle)) {
      f.aimAngle = clamp(inp.aimAngle, -Math.PI, Math.PI);
      if (inp.spit || moveX === 0) {
        f.facing = Math.cos(f.aimAngle) >= 0 ? 1 : -1;
      }
    }
    if (inp?.aimPower !== undefined && Number.isFinite(inp.aimPower)) {
      f.aimPower = clamp(inp.aimPower, 0.25, 1);
    }

    // Coyote time & Jump buffer
    if (f.onGround) f.coyoteTicks = 6;
    else if (f.coyoteTicks > 0) f.coyoteTicks--;

    if (inp?.jump) f.jumpBufferTicks = 4;
    else if (f.jumpBufferTicks > 0) f.jumpBufferTicks--;

    if (f.jumpBufferTicks > 0 && f.coyoteTicks > 0) {
      f.vy = f.bellyId ? CROAK_JUMP_VY * 0.92 : CROAK_JUMP_VY;
      f.onGround = false;
      f.coyoteTicks = 0;
      f.jumpBufferTicks = 0;
      if (f.state === 'finished') f.state = 'normal';
      pushEvent(world, 'jump', f.x + CROAK_FROG_W * 0.5, f.y + CROAK_FROG_H, { actorId: f.id });
    }

    // Tự nhả nếu ngậm quá lâu hoặc bấm Bắn (cho phép cả vừa nhảy vừa ném trên không!)
    if (f.bellyId) {
      f.carryTicks++;
      if (f.carryTicks >= CROAK_MAX_CARRY_TICKS || inp?.spit) {
        performSpit(world, f, solids, inp?.aimAngle, inp?.aimPower);
      }
    } else if (inp?.tongue && f.tongueTicks <= 0) {
      // Phóng lưỡi bắt đồng đội (mặc định bắn ngang theo hướng quay mặt kể cả khi đang nhảy)
      const ang = inp.aimAngle !== undefined ? f.aimAngle : f.facing === 1 ? 0 : Math.PI;
      const cx = f.x + CROAK_FROG_W * 0.5;
      const cy = f.y + CROAK_FROG_H * 0.5;
      f.tongueTicks = CROAK_TONGUE_TICKS;
      f.tongueEndX = cx + Math.cos(ang) * CROAK_TONGUE_RANGE;
      f.tongueEndY = cy + Math.sin(ang) * CROAK_TONGUE_RANGE;
      if (f.state !== 'carrying') f.state = 'tongue';
      pushEvent(world, 'tongue', cx, cy, { actorId: f.id });

      // Tìm đồng đội gần nhất nằm dọc theo đoạn thẳng lưỡi hoặc vùng phía trước mặt (kể cả đang nhảy lệch độ cao)
      let bestTarget: FrogEntity | null = null;
      let bestDist = Infinity;
      for (const other of world.frogs) {
        if (other.id === f.id) continue;
        if (other.state !== 'normal' && other.state !== 'launched' && other.state !== 'finished') continue;
        if (other.bellyId !== null || other.carrierId !== null) continue;
        const ox = other.x + CROAK_FROG_W * 0.5;
        const oy = other.y + CROAK_FROG_H * 0.5;
        const dx = f.tongueEndX - cx;
        const dy = f.tongueEndY - cy;
        const lenSq = dx * dx + dy * dy || 1;
        const proj = clamp(((ox - cx) * dx + (oy - cy) * dy) / lenSq, 0, 1);
        const px = cx + proj * dx;
        const py = cy + proj * dy;
        const dist = Math.hypot(ox - px, oy - py);
        const directDist = Math.hypot(ox - cx, oy - cy);
        const inFrontCone = (ox - cx) * f.facing >= -18 && Math.abs(oy - cy) <= 58 && directDist <= CROAK_TONGUE_RANGE + 18;
        if ((dist <= CROAK_TONGUE_RADIUS + 8 || inFrontCone) && directDist < bestDist) {
          bestDist = directDist;
          bestTarget = other;
        }
      }

      if (bestTarget) {
        f.bellyId = bestTarget.id;
        f.carryTicks = 0;
        f.state = 'carrying';
        f.tongueEndX = bestTarget.x + CROAK_FROG_W * 0.5;
        f.tongueEndY = bestTarget.y + CROAK_FROG_H * 0.5;
        // Mặc định hướng góc bắn lên 55° theo chiều mặt đang nhìn
        f.aimAngle = f.facing === 1 ? -Math.PI * 0.32 : -Math.PI * 0.68;
        bestTarget.carrierId = f.id;
        bestTarget.state = 'swallowed';
        bestTarget.struggleCount = 0;
        bestTarget.vx = 0;
        bestTarget.vy = 0;
        f.saves++;
        pushEvent(world, 'swallow', bestTarget.x, bestTarget.y, { actorId: f.id, targetId: bestTarget.id });
      }
    }

    if (f.tongueTicks > 0) {
      f.tongueTicks--;
      if (f.tongueTicks === 0 && f.state === 'tongue') {
        f.state = f.bellyId ? 'carrying' : 'normal';
      }
    }

    // Vận tốc ngang & trọng lực
    const maxSpd = CROAK_MOVE_SPEED * (f.bellyId ? CROAK_CARRY_MULT : 1);
    if (f.state === 'launched') {
      // Đang bay như viên đạn: vẫn cho lái nhẹ trên không nhưng giữ quán tính bắn
      if (moveX !== 0) f.vx += moveX * 420 * dt;
      f.vx *= 0.992;
    } else {
      const targetVx = moveX * maxSpd;
      const accel = f.onGround ? 1900 : 1150;
      if (f.vx < targetVx) f.vx = Math.min(targetVx, f.vx + accel * dt);
      else if (f.vx > targetVx) f.vx = Math.max(targetVx, f.vx - accel * dt);
    }
    f.vy = Math.min(CROAK_MAX_FALL, f.vy + CROAK_GRAVITY * dt);

    moveAndCollideFrog(f, solids, dt, world);

    // Đồng bộ tọa độ hành khách trong bụng ngay sau khi di chuyển
    if (f.bellyId) {
      const p = world.frogs.find((x) => x.id === f.bellyId);
      if (p) {
        p.x = f.x;
        p.y = f.y;
      }
    }
  }

  // 2. Bẫy nguy hiểm, rơi khỏi map, chìa khóa, công tắc, checkpoint & cổng đích
  const connectedFrogs = world.frogs.filter((f) => f.connected);
  const activeCount = Math.max(1, connectedFrogs.length);

  for (const f of world.frogs) {
    if (f.state === 'dead' || f.state === 'swallowed') continue;
    const box: CroakRect = { x: f.x, y: f.y, w: CROAK_FROG_W, h: CROAK_FROG_H };

    if (f.y > stage.height + 36 || stage.hazards.some((hz) => rectsOverlap(box, hz))) {
      killFrog(world, f);
      continue;
    }

    for (const k of stage.keys) {
      if (world.keysCollected[k.id]) continue;
      const dist = Math.hypot(f.x + CROAK_FROG_W * 0.5 - k.x, f.y + CROAK_FROG_H * 0.5 - k.y);
      if (dist <= k.r + 18) {
        world.keysCollected[k.id] = true;
        pushEvent(world, 'key', k.x, k.y, { actorId: f.id, text: 'Đã lấy Chìa Khóa Vàng!' });
      }
    }

    for (const cp of stage.checkpoints) {
      if (world.activeCheckpointId !== cp.id && rectsOverlap(box, cp)) {
        world.activeCheckpointId = cp.id;
        world.spawnX = cp.spawnX;
        world.spawnY = cp.spawnY;
        pushEvent(world, 'checkpoint', cp.spawnX, cp.spawnY, { actorId: f.id, text: 'Đã mở Checkpoint!' });
      }
    }
  }

  // Công tắc (hỗ trợ cả latch giữ luôn và hold phải đứng đè, tự co theo số người online)
  for (const sw of stage.switches) {
    if (sw.latch && world.switchesOn[sw.id]) continue;
    const req = Math.min(Math.max(1, activeCount - 1), sw.minFrogs ?? 1);
    let pressing = 0;
    for (const f of world.frogs) {
      if (f.state === 'dead') continue;
      // Ếch ngậm đồng đội tính bằng 2 trọng lượng!
      const weight = f.state === 'swallowed' ? 0 : f.bellyId ? 2 : 1;
      if (weight > 0 && rectsOverlap({ x: f.x, y: f.y + 4, w: CROAK_FROG_W, h: CROAK_FROG_H }, sw)) {
        pressing += weight;
      }
    }
    const nextOn = pressing >= req;
    if (nextOn && !world.switchesOn[sw.id]) {
      pushEvent(world, 'switch', sw.x + sw.w * 0.5, sw.y, { text: sw.label ? `Đã mở ${sw.label}!` : 'Công tắc kích hoạt!' });
    }
    world.switchesOn[sw.id] = nextOn;
  }

  // Kiểm tra về đích: mọi ếch đang online chạm Cổng Lá Sen Vàng (kể cả được bạn ngậm cõng thẳng vào đích!)
  for (const f of world.frogs) {
    if (f.state === 'dead') continue;
    const box: CroakRect = { x: f.x, y: f.y, w: CROAK_FROG_W, h: CROAK_FROG_H };
    const inGoal = rectsOverlap(box, stage.goal);
    if (inGoal && f.state === 'normal') {
      f.state = 'finished';
    } else if (!inGoal && f.state === 'finished') {
      f.state = 'normal';
    }
  }

  if (
    connectedFrogs.length > 0 &&
    connectedFrogs.every((f) => {
      if (f.state === 'swallowed' && f.carrierId) {
        const c = world.frogs.find((x) => x.id === f.carrierId);
        return !!c && rectsOverlap({ x: c.x, y: c.y, w: CROAK_FROG_W, h: CROAK_FROG_H }, stage.goal);
      }
      return f.state !== 'dead' && rectsOverlap({ x: f.x, y: f.y, w: CROAK_FROG_W, h: CROAK_FROG_H }, stage.goal);
    })
  ) {
    world.stageClearedTicks = 1;
    pushEvent(world, 'stage_clear', stage.goal.x + stage.goal.w * 0.5, stage.goal.y, {
      text: `Qua ${stage.name}!`,
    });
  }

  return world.recentEvents.filter((e) => e.id > prevEventSeq);
}

export function toCroakTickPayload(world: CroakWorld, newEvents: CroakEvent[] = []): CroakTickPayload {
  return {
    stageIndex: world.stageIndex,
    tick: world.tick,
    switchesOn: { ...world.switchesOn },
    keysCollected: { ...world.keysCollected },
    activeCheckpointId: world.activeCheckpointId,
    frogs: world.frogs.map((f) => ({
      id: f.id,
      x: r1(f.x),
      y: r1(f.y),
      vx: r1(f.vx),
      vy: r1(f.vy),
      facing: f.facing,
      onGround: f.onGround,
      state: f.state,
      bellyId: f.bellyId,
      carrierId: f.carrierId,
      tongueTicks: f.tongueTicks,
      tongueEndX: r1(f.tongueEndX),
      tongueEndY: r1(f.tongueEndY),
      aimAngle: Math.round(f.aimAngle * 100) / 100,
      aimPower: Math.round(f.aimPower * 100) / 100,
      deaths: f.deaths,
      spits: f.spits,
      connected: f.connected,
    })),
    events: newEvents,
  };
}
