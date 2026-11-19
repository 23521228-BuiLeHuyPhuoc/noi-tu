/**
 * 💣 Đặt Bom Tử Chiến — Bản Vòng Bo (`boom_online`, 2–12 người chơi + Bot thông minh)
 *
 * Huyền thoại Boom Online / Crazy Arcade phiên bản Sinh Tồn Vòng Bo tốc độ cao (75s/hiệp):
 * - Chạy trong mê cung phá thùng gỗ nhặt 5 vật phẩm kinh điển (+ Kim Tự Cứu hiếm):
 *   👟 Giày Tăng Tốc (`speed`), 💧 Bình Nước Tăng Tầm (`range`), 💣 Thêm Bóng Nước (`bomb`),
 *   🥊 Găng Tay Ném Bom Qua Tường (`glove`), 🥾 Giày Đá Bom Lăn Thẳng Vào Góc (`kick`), 📌 Kim Tự Cứu (`needle`).
 * - Trúng tia nước KHÔNG chết ngay mà bị nhốt trong Bóng Nước (`trapped`, 4.5s):
 *   + Đồng đội (chế độ Đấu Đội) chạm vào -> CỨU SỐNG ngay lập tức!
 *   + Đối thủ chạy tới tông trúng -> "BỤP!" kết liễu ngay lập tức!
 * - Sau 45 giây, Vòng Bo Gạch Tử Thần (`death_wall`) sập dần theo hình xoắn ốc từ ngoài vào trong,
 *   ép toàn bộ người sống sót vào khu đất hẹp ở giữa đấu bom dây chuyền.
 * - Người bị loại sớm hóa thành 🛸 Đĩa Bay Phục Thù (`ufo`) bay dọc biên sân, mỗi 6 giây ném được 1 quả bom vào sân trả thù!
 */

export const BOOM_FPS = 20;
export const BOOM_DT = 1 / BOOM_FPS;
export const BOOM_ROUND_SEC = 75;
export const BOOM_SHRINK_START_SEC = 45;
export const BOOM_BOMB_FUSE_TICKS = 52; // 2.6s
export const BOOM_BLAST_TICKS = 10; // 0.5s
export const BOOM_TRAPPED_TICKS = 90; // 4.5s trong bóng nước
export const BOOM_UFO_COOLDOWN_TICKS = 120; // 6.0s hồi bom đĩa bay
export const BOOM_SHIELD_TICKS = 28; // 1.4s bất tử ngắn sau khi được cứu / tự chích kim

export const BOOM_BASE_SPEED = 3.5; // ô / giây
export const BOOM_SPEED_STEP = 0.48;
export const BOOM_MAX_SPEED_LVL = 5;
export const BOOM_MAX_BOMB_LVL = 6;
export const BOOM_MAX_RANGE_LVL = 7;

export const BOOM_PLAYER_RADIUS = 0.34;
export const BOOM_KICK_SPEED = 8.5; // ô / giây khi sút bom trượt dọc hành lang
export const BOOM_LOB_TICKS = 10; // 0.5s thời gian bóng nước bay vọt qua tường
export const BOOM_COUNTDOWN_TICKS = 44; // 2.2s đếm ngược đầu hiệp
export const BOOM_ROUND_END_TICKS = 64; // 3.2s bảng kết quả giữa hiệp
export const BOOM_UFO_SPEED = 4.8; // ô / giây bay dọc viền sân

/** Ô bản đồ: 0 = cỏ trống, 1 = trụ đá bất hoại, 2 = thùng gỗ phá được, 3 = gạch tử thần vòng bo */
export type BoomTile = 0 | 1 | 2 | 3;

export type BoomMode = 'ffa' | 'teams';
export type BoomPhase = 'countdown' | 'playing' | 'round_end';
export type BoomPlayerState = 'alive' | 'trapped' | 'ufo';
export type BoomDir = 0 | 1 | 2 | 3; // 0: xuống, 1: trái, 2: phải, 3: lên

export const BOOM_DIR_DELTA: Readonly<Record<BoomDir, { dx: number; dy: number }>> = {
  0: { dx: 0, dy: 1 },
  1: { dx: -1, dy: 0 },
  2: { dx: 1, dy: 0 },
  3: { dx: 0, dy: -1 },
};

export type BoomItemKind =
  | 'bomb'
  | 'range'
  | 'max_range'
  | 'speed'
  | 'kick'
  | 'glove'
  | 'needle'
  | 'shield'
  | 'treasure';

export interface BoomItemMeta {
  kind: BoomItemKind;
  name: string;
  short: string;
  color: string;
  desc: string;
}

export const BOOM_ITEM_META: Record<BoomItemKind, BoomItemMeta> = {
  bomb: {
    kind: 'bomb',
    name: 'Thêm Bóng Nước',
    short: '+Bom',
    color: '#3B82F6',
    desc: 'Tăng số bóng nước đặt cùng lúc (+1)',
  },
  range: {
    kind: 'range',
    name: 'Thuốc Tăng Tầm',
    short: '+Tầm',
    color: '#06B6D4',
    desc: 'Tăng độ dài tia nước nổ (+1 ô)',
  },
  max_range: {
    kind: 'max_range',
    name: 'Siêu Thuốc Nước MAX',
    short: 'MAX Tầm',
    color: '#FACC15',
    desc: 'Nâng cấp tức thì tầm tia nước lên tối đa 7 ô cực đại!',
  },
  speed: {
    kind: 'speed',
    name: 'Giày Thần Tốc',
    short: '+Tốc',
    color: '#F59E0B',
    desc: 'Chạy nhanh như gió lạng lách né tia nước',
  },
  kick: {
    kind: 'kick',
    name: 'Giày Đá Bom',
    short: 'Đá bom',
    color: '#10B981',
    desc: 'Chạm vào bóng nước để sút lăn thẳng vào góc đối thủ đang nấp!',
  },
  glove: {
    kind: 'glove',
    name: 'Găng Tay Ném Bom',
    short: 'Ném bom',
    color: '#EF4444',
    desc: 'Đứng lên bóng nước bấm Đặt Bom lần nữa để quăng vọt qua tường!',
  },
  needle: {
    kind: 'needle',
    name: 'Kim Tự Cứu',
    short: 'Kim chích',
    color: '#EC4899',
    desc: 'Khi bị nhốt trong bóng nước, bấm Kỹ Năng để tự chích nổ bóng thoát chết!',
  },
  shield: {
    kind: 'shield',
    name: 'Khiên Hộ Mệnh',
    short: 'Khiên 7s',
    color: '#8B5CF6',
    desc: 'Bật giáp năng lượng bảo vệ miễn nhiễm tia nước nổ trong 7 giây!',
  },
  treasure: {
    kind: 'treasure',
    name: 'Kim Cương Kho Báu',
    short: '+25đ',
    color: '#14B8A6',
    desc: 'Cộng ngay +25 điểm thưởng chiến công trong trận!',
  },
};

export interface BoomItemEntity {
  id: number;
  tx: number;
  ty: number;
  kind: BoomItemKind;
}

export interface BoomBombEntity {
  id: number;
  ownerId: string;
  /** tọa độ tâm theo đơn vị ô (vd 3.5, 4.5; khi bị đá hoặc ném sẽ di chuyển mượt) */
  x: number;
  y: number;
  range: number;
  ticksLeft: number;
  /** vận tốc trượt khi bị Giày Đá Bom sút (ô/giây) */
  vx: number;
  vy: number;
  /** trạng thái bay vọt qua tường khi dùng Găng Tay hoặc Đĩa Bay ném */
  lob?: {
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    ticksDone: number;
    totalTicks: number;
  };
  fromUfo?: boolean;
}

export interface BoomBlastCell {
  tx: number;
  ty: number;
  ticksLeft: number;
  ownerId: string;
  dir: 'center' | 'h' | 'v';
}

export interface BoomPlayerEntity {
  id: string;
  name: string;
  colorIndex: number;
  team: 0 | 1;
  bot: boolean;
  connected: boolean;
  /** tọa độ thực theo ô (tâm nhân vật nằm ở tx + 0.5, ty + 0.5) */
  x: number;
  y: number;
  vx: number;
  vy: number;
  dir: BoomDir;
  state: BoomPlayerState;
  trappedTicks: number;
  trappedBy: string | null;
  shieldTicks: number;
  maxBombs: number;
  activeBombs: number;
  range: number;
  speedLvl: number;
  canKick: boolean;
  canGlove: boolean;
  needles: number;
  /** Đĩa bay phục thù sau khi bị loại: cạnh sân 0=trên, 1=phải, 2=dưới, 3=trái và vị trí dọc cạnh */
  ufoSide: 0 | 1 | 2 | 3;
  ufoCoord: number;
  ufoCooldownTicks: number;
  kills: number;
  saves: number;
}

export type BoomSfxKind =
  | 'place'
  | 'explode'
  | 'pickup'
  | 'trap'
  | 'pop_kill'
  | 'rescue'
  | 'needle'
  | 'kick'
  | 'throw'
  | 'ufo_throw'
  | 'ring_warn'
  | 'ring_drop'
  | 'round_win';

export interface BoomEvent {
  id: number;
  kind: BoomSfxKind;
  x?: number;
  y?: number;
  actorId?: string;
  targetId?: string;
  text?: string;
}

export interface BoomKillFeedItem {
  id: number;
  text: string;
  kind: 'pop' | 'drown' | 'crush' | 'rescue' | 'ufo';
  atTick: number;
}

export interface BoomTickPayload {
  tick: number;
  round: number;
  phase: BoomPhase;
  timeLeftMs: number;
  ringActive: boolean;
  width: number;
  height: number;
  /** Số thứ tự input cuối đã xử lý cho từng người chơi (dùng cho Server Reconciliation) */
  acks?: Record<string, number>;
  /** Phiên bản lưới hiện tại tăng mỗi khi có ô thay đổi (vỡ thùng / gạch vòng bo) */
  gridVersion?: number;
  /** Bản đồ đầy đủ (gửi ở view() / đầu hiệp / keyframe định kỳ); tick thường dùng gridDiff */
  grid?: BoomTile[];
  /** Chỉ gửi các ô [idx, tile] vừa thay đổi so với tick trước để giảm băng thông tick */
  gridDiff?: [number, BoomTile][];
  /** danh sách chỉ số ô (ty * width + tx) sắp bị gạch tử thần sập xuống trong ~1.5s tới */
  warningCells: number[];
  items: BoomItemEntity[];
  bombs: BoomBombEntity[];
  blasts: BoomBlastCell[];
  players: BoomPlayerEntity[];
  events: BoomEvent[];
  killFeed: BoomKillFeedItem[];
}

export interface BoomView {
  type: 'boom_online';
  mode: BoomMode;
  round: number;
  totalRounds: number;
  phase: BoomPhase;
  phaseEndsAt: number | null;
  width: number;
  height: number;
  scores: Record<string, number>;
  kills: Record<string, number>;
  saves: Record<string, number>;
  names: Record<string, string>;
  colors: Record<string, number>;
  teams: Record<string, 0 | 1>;
  roundWinnerText: string | null;
  snapshot: BoomTickPayload & { grid: BoomTile[] };
}

export interface BoomInput {
  seq?: number;
  /** hướng di chuyển -1..1 (hỗ trợ cả phím WASD/Mũi tên lẫn D-Pad cảm ứng) */
  dx: number;
  dy: number;
  /** nhấn Đặt Bom (hoặc Ném Bom qua tường nếu đang đứng trên quả bom và có Găng Tay; hoặc Đĩa Bay ném bom) */
  placeBomb?: boolean;
  /** nhấn Kỹ Năng phụ (dùng Kim Tự Cứu khi đang trong bóng nước, hoặc chủ động quăng bom) */
  special?: boolean;
}

export type BoomAction = { type: 'bm_input'; input: BoomInput };

/** Kích thước đấu trường tự động co giãn theo số lượng người tham chiến (luôn lẻ để hàng trụ đá đối xứng chuẩn Boom Online). */
export function getBoomArenaSize(playerCount: number): { width: number; height: number } {
  if (playerCount <= 4) return { width: 13, height: 11 };
  if (playerCount <= 8) return { width: 15, height: 11 };
  return { width: 17, height: 13 };
}

/** Tạo thứ tự xoắn ốc từ vòng ngoài vào tâm để Vòng Bo Gạch Tử Thần sập dần cực kỳ kịch tính (chừa khu 5x5 ở tâm). */
export function buildSpiralRingOrder(width: number, height: number): number[] {
  const order: number[] = [];
  const seen = new Set<number>();
  const push = (tx: number, ty: number) => {
    if (tx < 1 || tx >= width - 1 || ty < 1 || ty >= height - 1) return;
    // Giữ lại vùng quyết tử 5x5 ở chính giữa cho pha đấu bom cuối hiệp
    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);
    if (Math.abs(tx - cx) <= 2 && Math.abs(ty - cy) <= 2) return;
    const idx = ty * width + tx;
    if (!seen.has(idx)) {
      seen.add(idx);
      order.push(idx);
    }
  };

  let left = 1;
  let right = width - 2;
  let top = 1;
  let bottom = height - 2;
  while (left <= right && top <= bottom) {
    for (let x = left; x <= right; x++) push(x, top);
    for (let y = top + 1; y <= bottom; y++) push(right, y);
    if (bottom > top) {
      for (let x = right - 1; x >= left; x--) push(x, bottom);
    }
    if (right > left) {
      for (let y = bottom - 1; y > top; y--) push(left, y);
    }
    left++;
    right--;
    top++;
    bottom--;
  }
  return order;
}

/** Vận tốc di chuyển thực tế (ô/giây) theo trạng thái và cấp giày. */
export function getBoomPlayerSpeed(speedLvl: number, state: BoomPlayerState): number {
  if (state === 'ufo') return BOOM_UFO_SPEED;
  if (state === 'trapped') return BOOM_BASE_SPEED * 0.28;
  const lvl = Math.max(1, Math.min(BOOM_MAX_SPEED_LVL, speedLvl));
  return BOOM_BASE_SPEED + (lvl - 1) * BOOM_SPEED_STEP;
}

/** Hướng mặt nhân vật từ vector di chuyển `(dx, dy)`. */
export function dirFromDelta(dx: number, dy: number, fallback: BoomDir): BoomDir {
  if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) return fallback;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx < 0 ? 1 : 2;
  }
  return dy < 0 ? 3 : 0;
}

/** Tính vị trí thế giới & hướng ném vào trong sân của Đĩa Bay Phục Thù (`ufo`). */
export function getUfoWorldPos(
  ufoSide: 0 | 1 | 2 | 3,
  ufoCoord: number,
  width: number,
  height: number,
): { x: number; y: number; inDx: number; inDy: number; dir: BoomDir; targetTx: number; targetTy: number } {
  const clampX = Math.max(1.5, Math.min(width - 1.5, ufoCoord));
  const clampY = Math.max(1.5, Math.min(height - 1.5, ufoCoord));
  if (ufoSide === 0) {
    return {
      x: clampX,
      y: 0.44,
      inDx: 0,
      inDy: 1,
      dir: 0,
      targetTx: Math.max(1, Math.min(width - 2, Math.floor(clampX))),
      targetTy: Math.min(height - 2, 3),
    };
  }
  if (ufoSide === 1) {
    return {
      x: width - 0.44,
      y: clampY,
      inDx: -1,
      inDy: 0,
      dir: 1,
      targetTx: Math.max(1, width - 4),
      targetTy: Math.max(1, Math.min(height - 2, Math.floor(clampY))),
    };
  }
  if (ufoSide === 2) {
    return {
      x: clampX,
      y: height - 0.44,
      inDx: 0,
      inDy: -1,
      dir: 3,
      targetTx: Math.max(1, Math.min(width - 2, Math.floor(clampX))),
      targetTy: Math.max(1, height - 4),
    };
  }
  return {
    x: 0.44,
    y: clampY,
    inDx: 1,
    inDy: 0,
    dir: 2,
    targetTx: Math.min(width - 2, 3),
    targetTy: Math.max(1, Math.min(height - 2, Math.floor(clampY))),
  };
}

/**
 * Di chuyển mượt liên tục có hỗ trợ Trượt Góc Trụ Đá chuẩn Bomberman (Corner-Sliding Assist):
 * khi nhân vật đi hơi lệch tâm hành lang và chạm mép trụ đá, tự động nắn nhẹ về tâm ô mở (`+0.5`)
 * giúp điều khiển D-Pad cảm ứng mượt như bơ, không bao giờ kẹt rìa tường!
 */
export function moveBoomPlayerWithSlide(
  x: number,
  y: number,
  rawDx: number,
  rawDy: number,
  speed: number,
  dt: number,
  width: number,
  height: number,
  isSolidTile: (tx: number, ty: number) => boolean,
  onBlockedBombTouch?: (tx: number, ty: number, pushDx: number, pushDy: number) => void,
): { x: number; y: number; vx: number; vy: number } {
  let dx = Number.isFinite(rawDx) ? rawDx : 0;
  let dy = Number.isFinite(rawDy) ? rawDy : 0;
  const mag = Math.hypot(dx, dy);
  if (mag < 0.04) {
    return { x, y, vx: 0, vy: 0 };
  }
  if (mag > 1) {
    dx /= mag;
    dy /= mag;
  }

  const R = BOOM_PLAYER_RADIUS;
  const stepDist = speed * dt;
  let nx = x;
  let ny = y;

  const overlapsSolid = (cx: number, cy: number, pushDx: number, pushDy: number): boolean => {
    const minTx = Math.floor(cx - R);
    const maxTx = Math.floor(cx + R - 1e-6);
    const minTy = Math.floor(cy - R);
    const maxTy = Math.floor(cy + R - 1e-6);
    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        if (tx < 0 || tx >= width || ty < 0 || ty >= height) return true;
        if (isSolidTile(tx, ty)) {
          onBlockedBombTouch?.(tx, ty, pushDx, pushDy);
          return true;
        }
      }
    }
    return false;
  };

  // Bước X + trượt góc dọc nếu đang đi ngang chạm mép trụ
  if (Math.abs(dx) > 1e-4) {
    const candX = nx + dx * stepDist;
    if (!overlapsSolid(candX, ny, Math.sign(dx), 0)) {
      nx = candX;
    } else {
      const signX = Math.sign(dx);
      const aheadTx = Math.floor(nx + signX * (R + 0.18));
      // Kẹp sát mép ô cản
      let snappedX = nx;
      if (signX > 0) {
        const wallLeft = Math.floor(candX + R - 1e-6);
        snappedX = Math.max(nx, Math.min(candX, wallLeft - R - 1e-4));
      } else {
        const wallRight = Math.floor(candX - R) + 1;
        snappedX = Math.min(nx, Math.max(candX, wallRight + R + 1e-4));
      }
      if (!overlapsSolid(snappedX, ny, 0, 0)) nx = snappedX;
      // Trượt góc (Corner-Slide): hỗ trợ cả đi thẳng lẫn nhấn chéo trên D-Pad/bàn phím
      if (aheadTx >= 1 && aheadTx < width - 1) {
        const curTx = Math.floor(nx);
        const baseTy = Math.floor(ny);
        const candidates = [baseTy, baseTy - 1, baseTy + 1].sort(
          (a, b) => Math.abs(a + 0.5 - ny) - Math.abs(b + 0.5 - ny),
        );
        for (const candTy of candidates) {
          if (candTy < 1 || candTy >= height - 1) continue;
          const laneCenterY = candTy + 0.5;
          const diffY = laneCenterY - ny;
          const allowSlideY = Math.abs(dy) < 0.35 || Math.sign(diffY) === Math.sign(dy);
          if (allowSlideY && Math.abs(diffY) > 0.01 && Math.abs(diffY) <= 0.5) {
            if (!isSolidTile(aheadTx, candTy) && !isSolidTile(curTx, candTy)) {
              const nudge = Math.sign(diffY) * Math.min(Math.abs(diffY), stepDist * 0.95);
              if (!overlapsSolid(nx, ny + nudge, 0, Math.sign(diffY))) {
                ny += nudge;
                const retryX = nx + signX * Math.min(stepDist * 0.45, Math.max(0, stepDist - Math.abs(nudge)));
                if (!overlapsSolid(retryX, ny, signX, 0)) nx = retryX;
              }
              break;
            }
          }
        }
      }
    }
  }

  // Bước Y + trượt góc ngang nếu đang đi dọc chạm mép trụ
  if (Math.abs(dy) > 1e-4) {
    const candY = ny + dy * stepDist;
    if (!overlapsSolid(nx, candY, 0, Math.sign(dy))) {
      ny = candY;
    } else {
      const signY = Math.sign(dy);
      const aheadTy = Math.floor(ny + signY * (R + 0.18));
      let snappedY = ny;
      if (signY > 0) {
        const wallTop = Math.floor(candY + R - 1e-6);
        snappedY = Math.max(ny, Math.min(candY, wallTop - R - 1e-4));
      } else {
        const wallBottom = Math.floor(candY - R) + 1;
        snappedY = Math.min(ny, Math.max(candY, wallBottom + R + 1e-4));
      }
      if (!overlapsSolid(nx, snappedY, 0, 0)) ny = snappedY;
      if (aheadTy >= 1 && aheadTy < height - 1) {
        const curTy = Math.floor(ny);
        const baseTx = Math.floor(nx);
        const candidates = [baseTx, baseTx - 1, baseTx + 1].sort(
          (a, b) => Math.abs(a + 0.5 - nx) - Math.abs(b + 0.5 - nx),
        );
        for (const candTx of candidates) {
          if (candTx < 1 || candTx >= width - 1) continue;
          const laneCenterX = candTx + 0.5;
          const diffX = laneCenterX - nx;
          const allowSlideX = Math.abs(dx) < 0.35 || Math.sign(diffX) === Math.sign(dx);
          if (allowSlideX && Math.abs(diffX) > 0.01 && Math.abs(diffX) <= 0.5) {
            if (!isSolidTile(candTx, aheadTy) && !isSolidTile(candTx, curTy)) {
              const nudge = Math.sign(diffX) * Math.min(Math.abs(diffX), stepDist * 0.95);
              if (!overlapsSolid(nx + nudge, ny, Math.sign(diffX), 0)) {
                nx += nudge;
                const retryY = ny + signY * Math.min(stepDist * 0.45, Math.max(0, stepDist - Math.abs(nudge)));
                if (!overlapsSolid(nx, retryY, 0, signY)) ny = retryY;
              }
              break;
            }
          }
        }
      }
    }
  }

  nx = Math.max(1 + R, Math.min(width - 1 - R, nx));
  ny = Math.max(1 + R, Math.min(height - 1 - R, ny));
  return {
    x: nx,
    y: ny,
    vx: (nx - x) / dt,
    vy: (ny - y) / dt,
  };
}


