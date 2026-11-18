/**
 * Server Engine cho 💣 Đặt Bom Tử Chiến — Bản Vòng Bo (`boom_online`, 2–12 người chơi + Bot thông minh):
 * - Vòng lặp vật lý tất định 20Hz (`50ms`/tick), phát gói nhẹ `'boom:tick'` tới cả phòng.
 * - Mê cung đối xứng chuẩn Boom Online / Crazy Arcade, đảm bảo vùng xuất phát chữ L an toàn tuyệt đối.
 * - Đủ bộ cơ chế huyền thoại: Trượt góc trụ đá, Bóng Nước giam 4.5s (Đồng đội chạm CỨU / Kẻ địch chạm "BỤP!"),
 *   Giày Đá Bom trượt thẳng, Găng Tay ném bom vọt qua tường (nảy tiếp nếu vướng), Kim Tự Cứu,
 *   Vòng Bo Gạch Tử Thần xoắn ốc sau 45s và Đĩa Bay Phục Thù (`ufo`) dọc viền sân!
 */
import {
  BOOM_BLAST_TICKS,
  BOOM_BOMB_FUSE_TICKS,
  BOOM_COUNTDOWN_TICKS,
  BOOM_DIR_DELTA,
  BOOM_DT,
  BOOM_FPS,
  BOOM_ITEM_META,
  BOOM_KICK_SPEED,
  BOOM_LOB_TICKS,
  BOOM_MAX_BOMB_LVL,
  BOOM_MAX_RANGE_LVL,
  BOOM_MAX_SPEED_LVL,
  BOOM_PLAYER_RADIUS,
  BOOM_ROUND_END_TICKS,
  BOOM_ROUND_SEC,
  BOOM_SHIELD_TICKS,
  BOOM_SHRINK_START_SEC,
  BOOM_TRAPPED_TICKS,
  BOOM_UFO_COOLDOWN_TICKS,
  BOOM_UFO_SPEED,
  buildSpiralRingOrder,
  dirFromDelta,
  getBoomArenaSize,
  getBoomPlayerSpeed,
  getUfoWorldPos,
  moveBoomPlayerWithSlide,
  type BoomBlastCell,
  type BoomBombEntity,
  type BoomDir,
  type BoomEvent,
  type BoomInput,
  type BoomItemEntity,
  type BoomItemKind,
  type BoomKillFeedItem,
  type BoomMode,
  type BoomPhase,
  type BoomPlayerEntity,
  type BoomSfxKind,
  type BoomTickPayload,
  type BoomTile,
  type BoomView,
} from '../../../shared/src/boom';
import type { ActionResult, GameAction, RankEntry } from '../../../shared/src/types';
import type { EngineContext, EnginePlayer, GameEngine } from './engine';

interface InternalBomb extends BoomBombEntity {
  lobDirX?: number;
  lobDirY?: number;
  bounces?: number;
}

function wrapInterior(coord: number, size: number): number {
  const span = Math.max(1, size - 2);
  return 1 + ((((coord - 1) % span) + span) % span);
}

export class BoomOnlineGame implements GameEngine {
  private order: string[] = [];
  private names: Record<string, string> = {};
  private colors: Record<string, number> = {};
  private teams: Record<string, 0 | 1> = {};
  private scores: Record<string, number> = {};
  private totalKills: Record<string, number> = {};
  private totalSaves: Record<string, number> = {};

  private mode: BoomMode = 'ffa';
  private round = 1;
  private totalRounds = 3;
  private phase: BoomPhase = 'countdown';
  private phaseTicksLeft = BOOM_COUNTDOWN_TICKS;
  private phaseEndsAt: number | null = null;
  private roundWinnerText: string | null = null;

  private tick = 0;
  private timeLeftMs = BOOM_ROUND_SEC * 1000;
  private ringActive = false;
  private ringTickCounter = 0;
  private width = 13;
  private height = 11;
  private grid: BoomTile[] = [];
  private spiralOrder: number[] = [];
  private spiralCursor = 0;
  private warningCells: number[] = [];

  private items: BoomItemEntity[] = [];
  private bombs: InternalBomb[] = [];
  private blasts: BoomBlastCell[] = [];
  private players: BoomPlayerEntity[] = [];
  private passThroughBombs: Record<string, Set<number>> = {};
  private botBombCooldown: Record<string, number> = {};

  private latestInputs: Record<string, BoomInput> = {};
  private pendingEdges: Record<string, { placeBomb?: boolean; special?: boolean }> = {};

  private tickEvents: BoomEvent[] = [];
  private recentEvents: BoomEvent[] = [];
  private killFeed: BoomKillFeedItem[] = [];
  private nextEntityId = 1;
  private nextEventId = 1;
  private nextFeedId = 1;

  private countdownTicksCfg = BOOM_COUNTDOWN_TICKS;
  private roundEndTicksCfg = BOOM_ROUND_END_TICKS;
  private tickIntervalMs = Math.round(1000 / BOOM_FPS);
  private loop?: ReturnType<typeof setInterval>;
  private finished = false;

  constructor(private readonly ctx: EngineContext) {}

  start(players: EnginePlayer[]): void {
    this.order = players.map((p) => p.id);
    this.mode = this.ctx.settings.boomMode === 'teams' ? 'teams' : 'ffa';
    const rCfg = this.ctx.settings.boomRounds;
    this.totalRounds = rCfg === 1 || rCfg === 3 || rCfg === 5 ? rCfg : 3;

    // Hỗ trợ rút ngắn đếm ngược / chuyển hiệp mượt mà khi chạy unit test có turnMs nhỏ (< 2000ms)
    if (this.ctx.turnMs !== undefined && this.ctx.turnMs < 2000) {
      const scaled = Math.max(2, Math.round(this.ctx.turnMs / 50));
      this.countdownTicksCfg = Math.min(BOOM_COUNTDOWN_TICKS, scaled);
      this.roundEndTicksCfg = Math.min(BOOM_ROUND_END_TICKS, scaled);
      this.tickIntervalMs = Math.max(10, Math.min(50, Math.floor(this.ctx.turnMs / 5) || 10));
    }

    players.forEach((p, idx) => {
      this.names[p.id] = p.name;
      this.colors[p.id] = this.ctx.playerColor?.(p.id) ?? (idx % 12);
      this.teams[p.id] = (idx % 2) as 0 | 1;
      this.scores[p.id] = 0;
      this.totalKills[p.id] = 0;
      this.totalSaves[p.id] = 0;
    });

    const size = getBoomArenaSize(players.length);
    this.width = size.width;
    this.height = size.height;

    this.startRound(1);
    this.loop = setInterval(() => this.tickOnce(), this.tickIntervalMs);
  }

  /** Cho phép unit test tua nhanh chính xác N tick vật lý tất định mà không cần chờ đồng hồ thực. */
  stepManual(ticks = 1): void {
    for (let i = 0; i < ticks && !this.finished; i++) {
      this.tickOnce();
    }
  }

  private computeSpawnSlots(count: number): { sx: number; sy: number; dir: BoomDir }[] {
    const W = this.width;
    const H = this.height;
    const R = W - 2; // luôn lẻ
    const B = H - 2; // luôn lẻ
    const midX1 = Math.floor(W / 2) % 2 === 1 ? Math.floor(W / 2) : Math.floor(W / 2) - 1;
    const midX2 = W - 1 - midX1;
    const midY1 = Math.floor(H / 2) % 2 === 1 ? Math.floor(H / 2) : Math.floor(H / 2) - 1;
    const midY2 = H - 1 - midY1;

    const candidates: { sx: number; sy: number; dir: BoomDir }[] = [
      { sx: 1, sy: 1, dir: 0 },
      { sx: R, sy: B, dir: 3 },
      { sx: R, sy: 1, dir: 0 },
      { sx: 1, sy: B, dir: 3 },
      { sx: midX1, sy: 1, dir: 0 },
      { sx: midX2, sy: B, dir: 3 },
      { sx: 1, sy: midY1, dir: 2 },
      { sx: R, sy: midY2, dir: 1 },
      { sx: Math.min(R - 2, 5), sy: 3, dir: 0 },
      { sx: Math.max(3, R - 4), sy: B - 2, dir: 3 },
      { sx: Math.max(3, R - 4), sy: 3, dir: 0 },
      { sx: Math.min(R - 2, 5), sy: B - 2, dir: 3 },
    ];

    const out: { sx: number; sy: number; dir: BoomDir }[] = [];
    const used = new Set<string>();
    for (const c of candidates) {
      const k = `${c.sx},${c.sy}`;
      if (!used.has(k)) {
        used.add(k);
        out.push(c);
      }
      if (out.length >= count) break;
    }
    return out;
  }

  private startRound(roundNum: number): void {
    this.round = roundNum;
    const size = getBoomArenaSize(this.order.length);
    this.width = size.width;
    this.height = size.height;

    const W = this.width;
    const H = this.height;
    this.grid = new Array<BoomTile>(W * H).fill(0);
    this.spiralOrder = buildSpiralRingOrder(W, H);
    this.spiralCursor = 0;
    this.warningCells = [];
    this.ringActive = false;
    this.ringTickCounter = 0;
    this.timeLeftMs = BOOM_ROUND_SEC * 1000;
    this.roundWinnerText = null;

    this.items = [];
    this.bombs = [];
    this.blasts = [];
    this.tickEvents = [];
    this.recentEvents = [];
    this.killFeed = [];
    this.latestInputs = {};
    this.pendingEdges = {};
    this.passThroughBombs = {};
    this.botBombCooldown = {};

    // 1. Tường đá viền ngoài + Trụ đá bàn cờ cố định bên trong (tx % 2 === 0 && ty % 2 === 0)
    for (let ty = 0; ty < H; ty++) {
      for (let tx = 0; tx < W; tx++) {
        if (tx === 0 || tx === W - 1 || ty === 0 || ty === H - 1 || (tx % 2 === 0 && ty % 2 === 0)) {
          this.grid[ty * W + tx] = 1;
        }
      }
    }

    // 2. Xác định vị trí xuất phát & khóa vùng chữ L an toàn tuyệt đối (không bao giờ tự kẹt bom đầu hiệp!)
    const spawns = this.computeSpawnSlots(this.order.length);
    const safeSet = new Set<number>();
    const markSafe = (tx: number, ty: number) => {
      if (tx >= 1 && tx <= W - 2 && ty >= 1 && ty <= H - 2 && this.grid[ty * W + tx] === 0) {
        safeSet.add(ty * W + tx);
      }
    };

    for (const sp of spawns) {
      const dx = sp.sx <= W / 2 ? 1 : -1;
      const dy = sp.sy <= H / 2 ? 1 : -1;
      markSafe(sp.sx, sp.sy);
      markSafe(sp.sx + dx, sp.sy);
      markSafe(sp.sx, sp.sy + dy);
      markSafe(sp.sx + 2 * dx, sp.sy);
      // Cũng giữ đối xứng gương để mê cung công bằng 100%
      const mx = W - 1 - sp.sx;
      const my = H - 1 - sp.sy;
      markSafe(mx, my);
      markSafe(mx - dx, my);
      markSafe(mx, my - dy);
      markSafe(mx - 2 * dx, my);
    }

    // 3. Rải ~68% thùng gỗ (2) đối xứng tâm trên các ô cỏ còn lại
    for (let ty = 1; ty <= H - 2; ty++) {
      for (let tx = 1; tx <= W - 2; tx++) {
        const idx = ty * W + tx;
        const mirrorIdx = (H - 1 - ty) * W + (W - 1 - tx);
        if (idx > mirrorIdx) continue;
        if (this.grid[idx] !== 0 || safeSet.has(idx)) continue;
        if (this.ctx.rng() < 0.68) {
          this.grid[idx] = 2;
          if (this.grid[mirrorIdx] === 0 && !safeSet.has(mirrorIdx)) {
            this.grid[mirrorIdx] = 2;
          }
        }
      }
    }

    // 4. Khởi tạo thực thể người chơi cho hiệp mới
    this.players = this.order.map((id, idx) => {
      const sp = spawns[idx % spawns.length] ?? { sx: 1, sy: 1, dir: 0 as BoomDir };
      this.passThroughBombs[id] = new Set<number>();
      this.botBombCooldown[id] = 0;
      return {
        id,
        name: this.names[id] ?? 'Bomber',
        colorIndex: this.colors[id] ?? (idx % 12),
        team: this.teams[id] ?? ((idx % 2) as 0 | 1),
        bot: !!this.ctx.isBot?.(id),
        connected: this.ctx.isConnected(id),
        x: sp.sx + 0.5,
        y: sp.sy + 0.5,
        vx: 0,
        vy: 0,
        dir: sp.dir,
        state: 'alive',
        trappedTicks: 0,
        trappedBy: null,
        shieldTicks: 16,
        maxBombs: 1,
        activeBombs: 0,
        range: 1,
        speedLvl: 1,
        canKick: false,
        canGlove: false,
        needles: 0,
        ufoSide: 0,
        ufoCoord: Math.floor(W / 2) + 0.5,
        ufoCooldownTicks: 0,
        kills: this.totalKills[id] ?? 0,
        saves: this.totalSaves[id] ?? 0,
      };
    });

    this.phase = 'countdown';
    this.phaseTicksLeft = this.countdownTicksCfg;
    this.phaseEndsAt = Date.now() + this.phaseTicksLeft * this.tickIntervalMs;
  }

  private emitEvent(kind: BoomSfxKind, extra?: Omit<BoomEvent, 'id' | 'kind'>): void {
    const ev: BoomEvent = {
      id: this.nextEventId++,
      kind,
      ...extra,
    };
    this.tickEvents.push(ev);
    this.recentEvents.push(ev);
    if (this.recentEvents.length > 14) {
      this.recentEvents.splice(0, this.recentEvents.length - 14);
    }
  }

  private pushKillFeed(kind: BoomKillFeedItem['kind'], text: string): void {
    this.killFeed.push({
      id: this.nextFeedId++,
      kind,
      text,
      atTick: this.tick,
    });
    if (this.killFeed.length > 6) {
      this.killFeed.splice(0, this.killFeed.length - 6);
    }
  }

  private turnIntoUfo(p: BoomPlayerEntity): void {
    const W = this.width;
    const H = this.height;
    p.state = 'ufo';
    p.trappedTicks = 0;
    p.trappedBy = null;
    p.shieldTicks = 0;
    p.vx = 0;
    p.vy = 0;

    // Chọn cạnh viền gần vị trí bị loại nhất để bay lên Đĩa Bay Phục Thù
    const distTop = p.y;
    const distBottom = H - p.y;
    const distLeft = p.x;
    const distRight = W - p.x;
    const minD = Math.min(distTop, distBottom, distLeft, distRight);
    if (minD === distTop) {
      p.ufoSide = 0;
      p.ufoCoord = Math.max(1.5, Math.min(W - 1.5, p.x));
    } else if (minD === distRight) {
      p.ufoSide = 1;
      p.ufoCoord = Math.max(1.5, Math.min(H - 1.5, p.y));
    } else if (minD === distBottom) {
      p.ufoSide = 2;
      p.ufoCoord = Math.max(1.5, Math.min(W - 1.5, p.x));
    } else {
      p.ufoSide = 3;
      p.ufoCoord = Math.max(1.5, Math.min(H - 1.5, p.y));
    }
    p.ufoCooldownTicks = Math.min(50, BOOM_UFO_COOLDOWN_TICKS);
    const pos = getUfoWorldPos(p.ufoSide, p.ufoCoord, W, H);
    p.x = pos.x;
    p.y = pos.y;
    p.dir = pos.dir;
  }

  private tickOnce(): void {
    if (this.finished) return;
    this.tick++;
    this.tickEvents = [];

    if (this.phase === 'countdown') {
      this.phaseTicksLeft--;
      if (this.phaseTicksLeft <= 0) {
        this.phase = 'playing';
        this.timeLeftMs = BOOM_ROUND_SEC * 1000;
        this.phaseEndsAt = Date.now() + Math.round((this.timeLeftMs / 1000) * BOOM_FPS * this.tickIntervalMs);
        this.ctx.emitBoomTick?.(this.buildSnapshot());
        this.ctx.changed();
        return;
      }
      this.ctx.emitBoomTick?.(this.buildSnapshot());
      return;
    }

    if (this.phase === 'round_end') {
      this.phaseTicksLeft--;
      if (this.phaseTicksLeft <= 0) {
        if (this.round >= this.totalRounds || this.isMatchClinched()) {
          this.finishMatch(true);
          return;
        }
        this.startRound(this.round + 1);
        this.ctx.emitBoomTick?.(this.buildSnapshot());
        this.ctx.changed();
        return;
      }
      this.ctx.emitBoomTick?.(this.buildSnapshot());
      return;
    }

    // ================= PHASE: PLAYING =================
    this.timeLeftMs = Math.max(0, this.timeLeftMs - Math.round(1000 / BOOM_FPS));

    // 1. Thu thập Input từ người chơi thật & AI cho Bot / người mất kết nối
    const stepInputs: Record<string, BoomInput> = {};
    for (const p of this.players) {
      if (this.botBombCooldown[p.id] > 0) this.botBombCooldown[p.id]--;
      if (p.shieldTicks > 0) p.shieldTicks--;
      if (p.ufoCooldownTicks > 0) p.ufoCooldownTicks--;

      if (p.bot || !p.connected) {
        stepInputs[p.id] = this.computeBotInput(p);
      } else {
        const base = this.latestInputs[p.id];
        const edges = this.pendingEdges[p.id];
        stepInputs[p.id] = {
          dx: base?.dx ?? 0,
          dy: base?.dy ?? 0,
          placeBomb: !!(edges?.placeBomb || base?.placeBomb),
          special: !!(edges?.special || base?.special),
        };
        if (base) {
          base.placeBomb = false;
          base.special = false;
        }
      }
    }
    this.pendingEdges = {};

    // 2. Xử lý Kim Tự Cứu (`needle`) ngay đầu nhịp cho người đang bị nhốt trong bóng nước
    for (const p of this.players) {
      if (p.state !== 'trapped') continue;
      const inp = stepInputs[p.id];
      if ((inp?.special || inp?.placeBomb) && p.needles > 0) {
        p.needles--;
        p.state = 'alive';
        p.trappedTicks = 0;
        p.trappedBy = null;
        p.shieldTicks = BOOM_SHIELD_TICKS;
        inp.placeBomb = false;
        inp.special = false;
        this.emitEvent('needle', { x: p.x, y: p.y, actorId: p.id });
      }
    }

    // 3. Di chuyển người chơi (alive / trapped / ufo) + kích hoạt Giày Đá Bom khi chạm bom đặc
    for (const p of this.players) {
      const inp = stepInputs[p.id] ?? { dx: 0, dy: 0 };
      if (p.state === 'ufo') {
        this.stepUfoPlayer(p, inp);
        continue;
      }

      p.dir = dirFromDelta(inp.dx, inp.dy, p.dir);
      const speed = getBoomPlayerSpeed(p.speedLvl, p.state);
      const passSet = this.passThroughBombs[p.id] ?? (this.passThroughBombs[p.id] = new Set());

      const isSolidForPlayer = (tx: number, ty: number): boolean => {
        if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) return true;
        if (this.grid[ty * this.width + tx] !== 0) return true;
        for (const b of this.bombs) {
          if (b.lob) continue;
          if (passSet.has(b.id)) continue;
          if (Math.floor(b.x) === tx && Math.floor(b.y) === ty) return true;
        }
        return false;
      };

      const onTouchBlockedBomb = (tx: number, ty: number, pushDx: number, pushDy: number): void => {
        if (p.state !== 'alive' || !p.canKick) return;
        if (pushDx === 0 && pushDy === 0) return;
        const b = this.bombs.find(
          (cand) =>
            !cand.lob &&
            cand.vx === 0 &&
            cand.vy === 0 &&
            !passSet.has(cand.id) &&
            Math.floor(cand.x) === tx &&
            Math.floor(cand.y) === ty,
        );
        if (!b) return;
        const nextTx = tx + pushDx;
        const nextTy = ty + pushDy;
        if (!this.canBombSlideInto(b.id, nextTx, nextTy)) return;
        b.x = tx + 0.5;
        b.y = ty + 0.5;
        b.vx = pushDx * BOOM_KICK_SPEED;
        b.vy = pushDy * BOOM_KICK_SPEED;
        this.emitEvent('kick', { x: b.x, y: b.y, actorId: p.id });
      };

      const moved = moveBoomPlayerWithSlide(
        p.x,
        p.y,
        inp.dx,
        inp.dy,
        speed,
        BOOM_DT,
        this.width,
        this.height,
        isSolidForPlayer,
        onTouchBlockedBomb,
      );
      p.x = moved.x;
      p.y = moved.y;
      p.vx = moved.vx;
      p.vy = moved.vy;

      // Khi hitbox người chơi đã bước hẳn ra khỏi ô quả bom vừa đặt -> quả bom đó trở thành vật cản cứng
      for (const bid of [...passSet]) {
        const b = this.bombs.find((cand) => cand.id === bid && !cand.lob);
        if (!b) {
          passSet.delete(bid);
          continue;
        }
        const btx = Math.floor(b.x);
        const bty = Math.floor(b.y);
        const overlapsTile =
          p.x + BOOM_PLAYER_RADIUS > btx &&
          p.x - BOOM_PLAYER_RADIUS < btx + 1 &&
          p.y + BOOM_PLAYER_RADIUS > bty &&
          p.y - BOOM_PLAYER_RADIUS < bty + 1;
        if (!overlapsTile) {
          passSet.delete(bid);
        }
      }
    }

    // 4. Đặt Bom & Găng Tay Ném Bom Qua Tường (`glove`) cho người chơi `alive`
    for (const p of this.players) {
      if (p.state !== 'alive') continue;
      const inp = stepInputs[p.id];
      if (!inp?.placeBomb && !inp?.special) continue;

      const ptx = Math.floor(p.x);
      const pty = Math.floor(p.y);
      const d = BOOM_DIR_DELTA[p.dir];
      const bombOnTile = this.bombs.find(
        (b) => !b.lob && Math.floor(b.x) === ptx && Math.floor(b.y) === pty,
      );
      const bombAhead = this.bombs.find(
        (b) => !b.lob && Math.floor(b.x) === ptx + d.dx && Math.floor(b.y) === pty + d.dy,
      );

      // Găng Tay Ném Bom: bấm Đặt Bom khi đang đứng trên bom (hoặc khi đã đặt tối đa bom và mặt hướng vào bom kế bên), hoặc bấm Kỹ Năng
      if (p.canGlove) {
        const targetBomb =
          inp.special
            ? (bombOnTile ?? bombAhead)
            : inp.placeBomb
              ? (bombOnTile ?? (p.activeBombs >= p.maxBombs ? bombAhead : undefined))
              : null;
        if (targetBomb) {
          this.launchLobBomb(targetBomb, d.dx, d.dy, 3);
          this.emitEvent('throw', { x: p.x, y: p.y, actorId: p.id });
          continue;
        }
      }

      if (inp.placeBomb && !bombOnTile && p.activeBombs < p.maxBombs) {
        if (ptx >= 1 && ptx <= this.width - 2 && pty >= 1 && pty <= this.height - 2 && this.grid[pty * this.width + ptx] === 0) {
          const bomb: InternalBomb = {
            id: this.nextEntityId++,
            ownerId: p.id,
            x: ptx + 0.5,
            y: pty + 0.5,
            range: p.range,
            ticksLeft: BOOM_BOMB_FUSE_TICKS,
            vx: 0,
            vy: 0,
          };
          this.bombs.push(bomb);
          p.activeBombs++;
          this.grantBombPassThroughOnTile(bomb.id, ptx, pty);
          this.emitEvent('place', { x: bomb.x, y: bomb.y, actorId: p.id });
        }
      }
    }

    // 5. Cập nhật bom đang bay trên không (`lob`) & bom đang trượt (`kick`)
    this.stepBombsMotion();

    // 6. Cập nhật thời gian tia nước cũ, đếm ngược ngòi nổ bom & kích nổ dây chuyền (Chain-Reaction)
    this.stepBlastsAndDetonations();

    // 7. Tia nước chạm người sống (không có khiên) -> Nhốt vào Bóng Nước (`trapped`)
    for (const p of this.players) {
      if (p.state !== 'alive' || p.shieldTicks > 0) continue;
      const ptx = Math.floor(p.x);
      const pty = Math.floor(p.y);
      const hitBlast = this.blasts.find((bl) => bl.tx === ptx && bl.ty === pty);
      if (hitBlast) {
        p.state = 'trapped';
        p.trappedTicks = BOOM_TRAPPED_TICKS;
        p.trappedBy = hitBlast.ownerId;
        this.emitEvent('trap', { x: p.x, y: p.y, actorId: hitBlast.ownerId, targetId: p.id });
      }
    }

    // 8. Nhặt vật phẩm trên mặt đất (chỉ người `alive`)
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      const picker = this.players.find(
        (p) => p.state === 'alive' && Math.hypot(p.x - (it.tx + 0.5), p.y - (it.ty + 0.5)) < 0.56,
      );
      if (!picker) continue;
      this.applyItemPickup(picker, it.kind);
      this.items.splice(i, 1);
      this.emitEvent('pickup', {
        x: it.tx + 0.5,
        y: it.ty + 0.5,
        actorId: picker.id,
        text: BOOM_ITEM_META[it.kind].short,
      });
    }

    // 9. Tương tác chạm Bóng Nước: Đồng đội chạm -> CỨU SỐNG (`rescue`) | Kẻ địch chạm -> "BỤP!" (`pop_kill`) | Hết 4.5s -> Tự nổ
    for (const p of this.players) {
      if (p.state !== 'trapped') continue;

      let resolved = false;
      for (const other of this.players) {
        if (other.id === p.id || other.state !== 'alive') continue;
        if (Math.hypot(other.x - p.x, other.y - p.y) >= 0.68) continue;

        if (this.mode === 'teams' && other.team === p.team) {
          // Đồng đội giải cứu!
          p.state = 'alive';
          p.trappedTicks = 0;
          p.trappedBy = null;
          p.shieldTicks = BOOM_SHIELD_TICKS;
          other.saves++;
          this.totalSaves[other.id] = (this.totalSaves[other.id] ?? 0) + 1;
          this.emitEvent('rescue', { x: p.x, y: p.y, actorId: other.id, targetId: p.id });
          this.pushKillFeed('rescue', `💙 ${other.name} cứu sống ${p.name} khỏi bóng nước!`);
          resolved = true;
          break;
        } else {
          // Đối thủ tông vỡ bóng nước "BỤP!!"
          other.kills++;
          this.totalKills[other.id] = (this.totalKills[other.id] ?? 0) + 1;
          const bx = p.x;
          const by = p.y;
          this.turnIntoUfo(p);
          this.emitEvent('pop_kill', { x: bx, y: by, actorId: other.id, targetId: p.id });
          this.pushKillFeed('pop', `💥 BỤP! ${other.name} chích nổ bóng nước của ${p.name}!`);
          resolved = true;
          break;
        }
      }

      if (resolved) continue;

      p.trappedTicks--;
      if (p.trappedTicks <= 0) {
        const killer =
          p.trappedBy && p.trappedBy !== p.id
            ? this.players.find(
                (cand) =>
                  cand.id === p.trappedBy &&
                  (this.mode === 'ffa' || cand.team !== p.team),
              )
            : undefined;
        if (killer) {
          killer.kills++;
          this.totalKills[killer.id] = (this.totalKills[killer.id] ?? 0) + 1;
        }
        const bx = p.x;
        const by = p.y;
        this.turnIntoUfo(p);
        this.emitEvent('pop_kill', { x: bx, y: by, actorId: killer?.id, targetId: p.id });
        this.pushKillFeed(
          'drown',
          killer
            ? `🫧 Bóng nước vỡ! ${killer.name} hạ gục ${p.name}!`
            : `🫧 ${p.name} ngộp thở trong bóng nước!`,
        );
      }
    }

    // 10. Vòng Bo Gạch Tử Thần sau 45s (`timeLeftMs <= 30_000`)
    this.stepShrinkingRing();

    // 11. Kiểm tra kết thúc Hiệp
    if (this.shouldEndRound()) {
      this.endRound();
      return;
    }

    this.ctx.emitBoomTick?.(this.buildSnapshot());
  }

  private grantBombPassThroughOnTile(bombId: number, btx: number, bty: number): void {
    for (const pl of this.players) {
      if (pl.state === 'ufo') continue;
      const overlaps =
        pl.x + BOOM_PLAYER_RADIUS > btx &&
        pl.x - BOOM_PLAYER_RADIUS < btx + 1 &&
        pl.y + BOOM_PLAYER_RADIUS > bty &&
        pl.y - BOOM_PLAYER_RADIUS < bty + 1;
      if (overlaps) {
        let set = this.passThroughBombs[pl.id];
        if (!set) {
          set = new Set<number>();
          this.passThroughBombs[pl.id] = set;
        }
        set.add(bombId);
      }
    }
  }

  private canBombSlideInto(bombId: number, tx: number, ty: number): boolean {
    if (tx < 1 || tx >= this.width - 1 || ty < 1 || ty >= this.height - 1) return false;
    if (this.grid[ty * this.width + tx] !== 0) return false;
    for (const other of this.bombs) {
      if (other.id === bombId || other.lob) continue;
      if (Math.floor(other.x) === tx && Math.floor(other.y) === ty) return false;
    }
    for (const pl of this.players) {
      if (pl.state === 'trapped' && Math.floor(pl.x) === tx && Math.floor(pl.y) === ty) {
        return false;
      }
    }
    return true;
  }

  private launchLobBomb(b: InternalBomb, dirX: number, dirY: number, distTiles: number): void {
    b.vx = 0;
    b.vy = 0;
    b.lobDirX = dirX;
    b.lobDirY = dirY;
    b.bounces = 0;
    b.ticksLeft = Math.max(b.ticksLeft, BOOM_LOB_TICKS + 4);
    const startTx = Math.floor(b.x);
    const startTy = Math.floor(b.y);
    const destTx = wrapInterior(startTx + dirX * distTiles, this.width);
    const destTy = wrapInterior(startTy + dirY * distTiles, this.height);
    b.lob = {
      fromX: b.x,
      fromY: b.y,
      toX: destTx + 0.5,
      toY: destTy + 0.5,
      ticksDone: 0,
      totalTicks: BOOM_LOB_TICKS,
    };
  }

  private stepUfoPlayer(p: BoomPlayerEntity, inp: BoomInput): void {
    const W = this.width;
    const H = this.height;
    const step = BOOM_UFO_SPEED * BOOM_DT;

    if (p.ufoSide === 0 || p.ufoSide === 2) {
      let delta = inp.dx;
      if (Math.abs(delta) < 0.1 && Math.abs(inp.dy) > 0.25) {
        // Nhấn lên/xuống ở cạnh ngang -> lượn mượt về phía góc gần nhất để sang cạnh dọc
        delta = p.ufoCoord < W / 2 ? -1 : 1;
      }
      p.ufoCoord += delta * step;
      const wasBottom = p.ufoSide === 2;
      if (p.ufoCoord > W - 1.45) {
        p.ufoSide = 1;
        p.ufoCoord = wasBottom ? H - 1.55 : 1.55;
      } else if (p.ufoCoord < 1.45) {
        p.ufoSide = 3;
        p.ufoCoord = wasBottom ? H - 1.55 : 1.55;
      }
    } else {
      let delta = inp.dy;
      if (Math.abs(delta) < 0.1 && Math.abs(inp.dx) > 0.25) {
        delta = p.ufoCoord < H / 2 ? -1 : 1;
      }
      p.ufoCoord += delta * step;
      const wasRight = p.ufoSide === 1;
      if (p.ufoCoord > H - 1.45) {
        p.ufoSide = 2;
        p.ufoCoord = wasRight ? W - 1.55 : 1.55;
      } else if (p.ufoCoord < 1.45) {
        p.ufoSide = 0;
        p.ufoCoord = wasRight ? W - 1.55 : 1.55;
      }
    }

    const pos = getUfoWorldPos(p.ufoSide, p.ufoCoord, W, H);
    p.x = pos.x;
    p.y = pos.y;
    p.dir = pos.dir;

    if ((inp.placeBomb || inp.special) && p.ufoCooldownTicks === 0) {
      const bomb: InternalBomb = {
        id: this.nextEntityId++,
        ownerId: p.id,
        x: pos.x,
        y: pos.y,
        range: 2,
        ticksLeft: BOOM_BOMB_FUSE_TICKS + BOOM_LOB_TICKS,
        vx: 0,
        vy: 0,
        fromUfo: true,
        lobDirX: pos.inDx,
        lobDirY: pos.inDy,
        bounces: 0,
        lob: {
          fromX: pos.x,
          fromY: pos.y,
          toX: pos.targetTx + 0.5,
          toY: pos.targetTy + 0.5,
          ticksDone: 0,
          totalTicks: BOOM_LOB_TICKS,
        },
      };
      this.bombs.push(bomb);
      p.ufoCooldownTicks = BOOM_UFO_COOLDOWN_TICKS;
      this.emitEvent('ufo_throw', { x: pos.x, y: pos.y, actorId: p.id });
    }
  }

  private stepBombsMotion(): void {
    const maxBounces = this.width + this.height;
    for (const b of this.bombs) {
      if (b.lob) {
        b.lob.ticksDone++;
        const t = Math.min(1, b.lob.ticksDone / Math.max(1, b.lob.totalTicks));
        b.x = b.lob.fromX + (b.lob.toX - b.lob.fromX) * t;
        b.y = b.lob.fromY + (b.lob.toY - b.lob.fromY) * t;

        if (b.lob.ticksDone >= b.lob.totalTicks) {
          const ltx = Math.max(1, Math.min(this.width - 2, Math.floor(b.lob.toX)));
          const lty = Math.max(1, Math.min(this.height - 2, Math.floor(b.lob.toY)));
          const tileBlocked =
            this.grid[lty * this.width + ltx] !== 0 ||
            this.bombs.some(
              (other) => other.id !== b.id && !other.lob && Math.floor(other.x) === ltx && Math.floor(other.y) === lty,
            );

          if (tileBlocked && (b.bounces ?? 0) < maxBounces && (b.lobDirX || b.lobDirY)) {
            b.bounces = (b.bounces ?? 0) + 1;
            const nextTx = wrapInterior(ltx + (b.lobDirX ?? 0), this.width);
            const nextTy = wrapInterior(lty + (b.lobDirY ?? 0), this.height);
            b.ticksLeft = Math.max(b.ticksLeft, 5);
            b.lob = {
              fromX: ltx + 0.5,
              fromY: lty + 0.5,
              toX: nextTx + 0.5,
              toY: nextTy + 0.5,
              ticksDone: 0,
              totalTicks: 3,
            };
          } else {
            b.x = ltx + 0.5;
            b.y = lty + 0.5;
            b.lob = undefined;
            this.grantBombPassThroughOnTile(b.id, ltx, lty);
          }
        }
        continue;
      }

      if (b.vx !== 0 || b.vy !== 0) {
        const sdx = Math.sign(b.vx);
        const sdy = Math.sign(b.vy);
        const candX = b.x + b.vx * BOOM_DT;
        const candY = b.y + b.vy * BOOM_DT;
        const leadTx = Math.floor(candX + sdx * 0.49);
        const leadTy = Math.floor(candY + sdy * 0.49);

        if (!this.canBombSlideInto(b.id, leadTx, leadTy)) {
          b.x = Math.floor(b.x) + 0.5;
          b.y = Math.floor(b.y) + 0.5;
          b.vx = 0;
          b.vy = 0;
        } else {
          b.x = candX;
          b.y = candY;
        }
      }
    }
  }

  private stepBlastsAndDetonations(): void {
    // Giảm thời gian tồn tại của tia nước đang cháy trên sân
    for (let i = this.blasts.length - 1; i >= 0; i--) {
      this.blasts[i].ticksLeft--;
      if (this.blasts[i].ticksLeft <= 0) {
        this.blasts.splice(i, 1);
      }
    }

    // Hàng đợi nổ dây chuyền trong cùng 1 tick
    const queue: InternalBomb[] = [];
    const queuedIds = new Set<number>();

    for (const b of this.bombs) {
      if (b.lob) continue;
      b.ticksLeft--;
      const btx = Math.floor(b.x);
      const bty = Math.floor(b.y);
      const hitByExistingBlast = this.blasts.some((bl) => bl.tx === btx && bl.ty === bty);
      if (b.ticksLeft <= 0 || hitByExistingBlast) {
        queue.push(b);
        queuedIds.add(b.id);
      }
    }

    if (queue.length === 0) return;

    const cratesHit = new Set<number>();
    const freshBlastTiles = new Set<number>();

    while (queue.length > 0) {
      const b = queue.shift()!;
      if (!b.fromUfo) {
        const owner = this.players.find((p) => p.id === b.ownerId);
        if (owner) owner.activeBombs = Math.max(0, owner.activeBombs - 1);
      }

      const ox = Math.max(1, Math.min(this.width - 2, Math.floor(b.x)));
      const oy = Math.max(1, Math.min(this.height - 2, Math.floor(b.y)));
      this.emitEvent('explode', { x: ox + 0.5, y: oy + 0.5, actorId: b.ownerId });

      const addBlastCell = (tx: number, ty: number, dir: 'center' | 'h' | 'v') => {
        freshBlastTiles.add(ty * this.width + tx);
        const existing = this.blasts.find((bl) => bl.tx === tx && bl.ty === ty);
        if (existing) {
          existing.ticksLeft = BOOM_BLAST_TICKS;
          existing.ownerId = b.ownerId;
          if (dir === 'center') existing.dir = 'center';
        } else {
          this.blasts.push({
            tx,
            ty,
            ticksLeft: BOOM_BLAST_TICKS,
            ownerId: b.ownerId,
            dir,
          });
        }

        // Kích nổ tức thì bất kỳ quả bom nào khác nằm trên đường tia nước!
        for (const other of this.bombs) {
          if (other.lob || queuedIds.has(other.id)) continue;
          if (Math.floor(other.x) === tx && Math.floor(other.y) === ty) {
            queuedIds.add(other.id);
            queue.push(other);
          }
        }
      };

      if (this.grid[oy * this.width + ox] === 0) {
        addBlastCell(ox, oy, 'center');
      }

      const dirs: { dx: number; dy: number; kind: 'h' | 'v' }[] = [
        { dx: 1, dy: 0, kind: 'h' },
        { dx: -1, dy: 0, kind: 'h' },
        { dx: 0, dy: 1, kind: 'v' },
        { dx: 0, dy: -1, kind: 'v' },
      ];

      for (const d of dirs) {
        for (let step = 1; step <= b.range; step++) {
          const tx = ox + d.dx * step;
          const ty = oy + d.dy * step;
          if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) break;
          const idx = ty * this.width + tx;
          const tile = this.grid[idx];
          if (tile === 1 || tile === 3) break;
          if (tile === 2) {
            cratesHit.add(idx);
            break;
          }
          addBlastCell(tx, ty, d.kind);
        }
      }
    }

    // Xóa các quả bom vừa nổ khỏi sân
    this.bombs = this.bombs.filter((b) => !queuedIds.has(b.id));

    // Tia nước mới quét trúng vật phẩm cũ đang nằm hớ hênh trên mặt đất -> cuốn trôi vật phẩm đó
    if (freshBlastTiles.size > 0) {
      this.items = this.items.filter((it) => !freshBlastTiles.has(it.ty * this.width + it.tx));
    }

    // Phá thùng gỗ & quay thưởng rớt vật phẩm (~42% tỉ lệ rơi, mỗi thùng chỉ tính 1 lần dù trúng nhiều tia)
    for (const idx of cratesHit) {
      this.grid[idx] = 0;
      if (this.ctx.rng() < 0.42) {
        const tx = idx % this.width;
        const ty = Math.floor(idx / this.width);
        this.items.push({
          id: this.nextEntityId++,
          tx,
          ty,
          kind: this.rollPowerUpKind(),
        });
      }
    }
  }

  private rollPowerUpKind(): BoomItemKind {
    const r = this.ctx.rng() * 100;
    if (r < 24) return 'bomb';
    if (r < 48) return 'range';
    if (r < 70) return 'speed';
    if (r < 83) return 'kick';
    if (r < 95) return 'glove';
    return 'needle';
  }

  private applyItemPickup(p: BoomPlayerEntity, kind: BoomItemKind): void {
    switch (kind) {
      case 'bomb':
        p.maxBombs = Math.min(BOOM_MAX_BOMB_LVL, p.maxBombs + 1);
        break;
      case 'range':
        p.range = Math.min(BOOM_MAX_RANGE_LVL, p.range + 1);
        break;
      case 'speed':
        p.speedLvl = Math.min(BOOM_MAX_SPEED_LVL, p.speedLvl + 1);
        break;
      case 'kick':
        p.canKick = true;
        break;
      case 'glove':
        p.canGlove = true;
        break;
      case 'needle':
        p.needles = Math.min(3, p.needles + 1);
        break;
    }
  }

  private stepShrinkingRing(): void {
    const shrinkTriggerMs = (BOOM_ROUND_SEC - BOOM_SHRINK_START_SEC) * 1000; // 30_000ms còn lại (sau 45s)
    if (this.timeLeftMs > shrinkTriggerMs) return;

    if (!this.ringActive) {
      this.ringActive = true;
      this.ringTickCounter = 0;
      this.emitEvent('ring_warn', { text: '🔥 VÒNG BO GẠCH TỬ THẦN BẮT ĐẦU SẬP!' });
    }

    this.ringTickCounter++;
    if (this.ringTickCounter % 6 === 0 && this.spiralCursor < this.spiralOrder.length) {
      const blocksPerDrop = this.width >= 17 ? 2 : 1;
      let lastTx = 0;
      let lastTy = 0;
      for (let k = 0; k < blocksPerDrop && this.spiralCursor < this.spiralOrder.length; k++) {
        const cellIdx = this.spiralOrder[this.spiralCursor++];
        const tx = cellIdx % this.width;
        const ty = Math.floor(cellIdx / this.width);
        lastTx = tx;
        lastTy = ty;
        this.slamDeathWallAt(tx, ty);
      }
      this.emitEvent('ring_drop', { x: lastTx + 0.5, y: lastTy + 0.5 });
    }

    this.warningCells = this.spiralOrder.slice(this.spiralCursor, this.spiralCursor + 6);
  }

  private slamDeathWallAt(tx: number, ty: number): void {
    const idx = ty * this.width + tx;
    this.grid[idx] = 3;

    // Xóa vật phẩm, tia nước và bom bị đè dưới gạch tử thần
    this.items = this.items.filter((it) => !(it.tx === tx && it.ty === ty));
    this.blasts = this.blasts.filter((bl) => !(bl.tx === tx && bl.ty === ty));
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const b = this.bombs[i];
      if (!b.lob && Math.floor(b.x) === tx && Math.floor(b.y) === ty) {
        if (!b.fromUfo) {
          const owner = this.players.find((p) => p.id === b.ownerId);
          if (owner) owner.activeBombs = Math.max(0, owner.activeBombs - 1);
        }
        this.bombs.splice(i, 1);
      }
    }

    // Nghiền nát bất kỳ người chơi alive / trapped nào đang đứng trên ô gạch sập
    for (const p of this.players) {
      if (p.state === 'ufo') continue;
      if (Math.floor(p.x) === tx && Math.floor(p.y) === ty) {
        this.turnIntoUfo(p);
        this.pushKillFeed('crush', `🧱 Vòng Bo Gạch Tử Thần nghiền nát ${p.name}!`);
      }
    }
  }

  // ================= SMART BOOM AI BOTS =================

  private buildDangerMap(extraBomb?: { tx: number; ty: number; range: number }): Uint8Array {
    const W = this.width;
    const H = this.height;
    const danger = new Uint8Array(W * H);

    for (const bl of this.blasts) {
      if (bl.tx >= 0 && bl.tx < W && bl.ty >= 0 && bl.ty < H) {
        danger[bl.ty * W + bl.tx] = 2;
      }
    }
    for (const wIdx of this.warningCells) {
      if (wIdx >= 0 && wIdx < W * H) danger[wIdx] = 2;
    }

    const markBombCross = (ox: number, oy: number, range: number) => {
      if (ox < 0 || ox >= W || oy < 0 || oy >= H) return;
      danger[oy * W + ox] = Math.max(danger[oy * W + ox], 1);
      const dirs = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ];
      for (const [dx, dy] of dirs) {
        for (let s = 1; s <= range; s++) {
          const tx = ox + dx * s;
          const ty = oy + dy * s;
          if (tx < 0 || tx >= W || ty < 0 || ty >= H) break;
          const tile = this.grid[ty * W + tx];
          if (tile === 1 || tile === 2 || tile === 3) break;
          danger[ty * W + tx] = Math.max(danger[ty * W + tx], 1);
        }
      }
    };

    for (const b of this.bombs) {
      if (b.lob) {
        markBombCross(Math.floor(b.lob.toX), Math.floor(b.lob.toY), b.range);
      } else {
        markBombCross(Math.floor(b.x), Math.floor(b.y), b.range);
      }
    }
    if (extraBomb) {
      markBombCross(extraBomb.tx, extraBomb.ty, extraBomb.range);
    }
    return danger;
  }

  private computeBotInput(bot: BoomPlayerEntity): BoomInput {
    const W = this.width;
    const H = this.height;

    // 1. Bot ở chế độ Đĩa Bay Phục Thù (`ufo`): tuần tra biên sân & ném bom vào chỗ đông người sống
    if (bot.state === 'ufo') {
      const enemies = this.players.filter(
        (p) => p.state !== 'ufo' && (this.mode === 'ffa' || p.team !== bot.team),
      );
      const target = enemies[0] ?? this.players.find((p) => p.state !== 'ufo');
      if (!target) return { dx: 0, dy: 0 };

      const pos = getUfoWorldPos(bot.ufoSide, bot.ufoCoord, W, H);
      const alignedDist =
        bot.ufoSide === 0 || bot.ufoSide === 2
          ? Math.abs(target.x - pos.x)
          : Math.abs(target.y - pos.y);
      const shouldThrow = bot.ufoCooldownTicks === 0 && alignedDist <= 1.65;

      if (bot.ufoSide === 0 || bot.ufoSide === 2) {
        const diff = target.x - pos.x;
        return {
          dx: Math.abs(diff) > 0.35 ? Math.sign(diff) : 0,
          dy: 0,
          placeBomb: shouldThrow,
        };
      }
      const diff = target.y - pos.y;
      return {
        dx: 0,
        dy: Math.abs(diff) > 0.35 ? Math.sign(diff) : 0,
        placeBomb: shouldThrow,
      };
    }

    // 2. Bot đang bị nhốt trong Bóng Nước (`trapped`)
    if (bot.state === 'trapped') {
      const enemyNear = this.players.some(
        (o) =>
          o.id !== bot.id &&
          o.state === 'alive' &&
          (this.mode === 'ffa' || o.team !== bot.team) &&
          Math.hypot(o.x - bot.x, o.y - bot.y) < 2.6,
      );
      if (bot.needles > 0 && (bot.trappedTicks < 75 || enemyNear)) {
        return { dx: 0, dy: 0, special: true };
      }
      if (this.mode === 'teams') {
        const ally = this.players.find(
          (o) => o.id !== bot.id && o.state === 'alive' && o.team === bot.team,
        );
        if (ally) {
          return {
            dx: Math.sign(ally.x - bot.x),
            dy: Math.sign(ally.y - bot.y),
          };
        }
      }
      const nearestEnemy = this.players.find(
        (o) => o.id !== bot.id && o.state === 'alive' && (this.mode === 'ffa' || o.team !== bot.team),
      );
      if (nearestEnemy) {
        return {
          dx: -Math.sign(nearestEnemy.x - bot.x),
          dy: -Math.sign(nearestEnemy.y - bot.y),
        };
      }
      return { dx: 0, dy: 0 };
    }

    // 3. Bot đang chiến đấu (`alive`)
    const sx = Math.max(1, Math.min(W - 2, Math.floor(bot.x)));
    const sy = Math.max(1, Math.min(H - 2, Math.floor(bot.y)));
    const startIdx = sy * W + sx;
    const danger = this.buildDangerMap();
    const passSet = this.passThroughBombs[bot.id];

    const isWalkable = (tx: number, ty: number): boolean => {
      if (tx < 1 || tx >= W - 1 || ty < 1 || ty >= H - 1) return false;
      if (this.grid[ty * W + tx] !== 0) return false;
      for (const b of this.bombs) {
        if (b.lob) continue;
        if (Math.floor(b.x) === tx && Math.floor(b.y) === ty) {
          if (tx === sx && ty === sy) return true;
          if (passSet?.has(b.id)) return true;
          return false;
        }
      }
      return true;
    };

    const steerToTile = (tx: number, ty: number, extra?: Partial<BoomInput>): BoomInput => {
      const targetX = tx + 0.5;
      const targetY = ty + 0.5;
      const dx = Math.abs(targetX - bot.x) > 0.06 ? Math.max(-1, Math.min(1, (targetX - bot.x) * 4)) : 0;
      const dy = Math.abs(targetY - bot.y) > 0.06 ? Math.max(-1, Math.min(1, (targetY - bot.y) * 4)) : 0;
      return { dx, dy, ...extra };
    };

    // ƯU TIÊN 1: Đang đứng trên ô nguy hiểm -> BFS tìm ô an toàn gần nhất để chạy thoát ngay!
    if (danger[startIdx] > 0) {
      const escapeStep = this.bfsFirstStep(
        sx,
        sy,
        (tx, ty) => isWalkable(tx, ty) && danger[ty * W + tx] < 2,
        (tx, ty) => danger[ty * W + tx] === 0,
        14,
      );
      if (escapeStep) {
        return steerToTile(escapeStep.tx, escapeStep.ty);
      }
      // Nếu xung quanh đều có bom, ít nhất né tia nước đang nổ tức thì (`danger === 2`)
      const fallbackStep = this.bfsFirstStep(
        sx,
        sy,
        (tx, ty) => isWalkable(tx, ty),
        (tx, ty) => danger[ty * W + tx] < 2 && (tx !== sx || ty !== sy),
        6,
      );
      if (fallbackStep) return steerToTile(fallbackStep.tx, fallbackStep.ty);
    }

    // ƯU TIÊN 2: Giải cứu đồng đội đang hấp hối trong Bóng Nước (chế độ Đấu Đội)
    if (this.mode === 'teams') {
      const trappedAllies = this.players.filter(
        (o) => o.id !== bot.id && o.team === bot.team && o.state === 'trapped',
      );
      for (const ally of trappedAllies) {
        const atx = Math.floor(ally.x);
        const aty = Math.floor(ally.y);
        if (atx === sx && aty === sy) {
          return { dx: Math.sign(ally.x - bot.x), dy: Math.sign(ally.y - bot.y) };
        }
        const rescueStep = this.bfsFirstStep(
          sx,
          sy,
          (tx, ty) => isWalkable(tx, ty) && danger[ty * W + tx] === 0,
          (tx, ty) => tx === atx && ty === aty,
          8,
        );
        if (rescueStep) return steerToTile(rescueStep.tx, rescueStep.ty);
      }
    }

    // ƯU TIÊN 3: Săn kẻ địch đang bị nhốt trong Bóng Nước cách <= 6 bước an toàn -> lao tới "BỤP!"
    const trappedEnemies = this.players.filter(
      (o) =>
        o.id !== bot.id &&
        o.state === 'trapped' &&
        (this.mode === 'ffa' || o.team !== bot.team),
    );
    for (const victim of trappedEnemies) {
      const vtx = Math.floor(victim.x);
      const vty = Math.floor(victim.y);
      if (vtx === sx && vty === sy) {
        return { dx: Math.sign(victim.x - bot.x), dy: Math.sign(victim.y - bot.y) };
      }
      const popStep = this.bfsFirstStep(
        sx,
        sy,
        (tx, ty) => isWalkable(tx, ty) && danger[ty * W + tx] === 0,
        (tx, ty) => tx === vtx && ty === vty,
        6,
      );
      if (popStep) return steerToTile(popStep.tx, popStep.ty);
    }

    // ƯU TIÊN 4: Nhặt vật phẩm an toàn gần đó (<= 5 ô)
    if (this.items.length > 0) {
      const itemSet = new Set(this.items.map((it) => it.ty * W + it.tx));
      const itemStep = this.bfsFirstStep(
        sx,
        sy,
        (tx, ty) => isWalkable(tx, ty) && danger[ty * W + tx] === 0,
        (tx, ty) => itemSet.has(ty * W + tx),
        5,
      );
      if (itemStep) return steerToTile(itemStep.tx, itemStep.ty);
    }

    // Kiểm tra có nên đặt bom tại ô hiện tại `(sx, sy)` hay không (chỉ đặt khi CHẮC CHẮN có đường rút an toàn!)
    const hasBombHere = this.bombs.some((b) => !b.lob && Math.floor(b.x) === sx && Math.floor(b.y) === sy);
    if (bot.canGlove && hasBombHere) {
      const d = BOOM_DIR_DELTA[bot.dir];
      const enemyInLine = this.players.some(
        (o) =>
          o.id !== bot.id &&
          o.state === 'alive' &&
          (this.mode === 'ffa' || o.team !== bot.team) &&
          Math.hypot(o.x - (sx + d.dx * 3 + 0.5), o.y - (sy + d.dy * 3 + 0.5)) < 2.2,
      );
      if (enemyInLine) {
        return { dx: 0, dy: 0, special: true };
      }
    }

    if (!hasBombHere && bot.activeBombs < bot.maxBombs && (this.botBombCooldown[bot.id] ?? 0) === 0) {
      const hitsTarget = this.wouldBombHitCrateOrEnemy(bot, sx, sy);
      if (hitsTarget) {
        const simDanger = this.buildDangerMap({ tx: sx, ty: sy, range: bot.range });
        const safeAfterPlant = this.bfsFirstStep(
          sx,
          sy,
          (tx, ty) => isWalkable(tx, ty) && danger[ty * W + tx] === 0,
          (tx, ty) => simDanger[ty * W + tx] === 0,
          6,
        );
        if (safeAfterPlant) {
          this.botBombCooldown[bot.id] = 10;
          return steerToTile(safeAfterPlant.tx, safeAfterPlant.ty, { placeBomb: true });
        }
      }
    }

    // Tiến về phía ô đặt bom tốt gần nhất (cạnh thùng gỗ hoặc cạnh kẻ địch đang sống)
    const huntStep = this.bfsFirstStep(
      sx,
      sy,
      (tx, ty) => isWalkable(tx, ty) && danger[ty * W + tx] === 0,
      (tx, ty) => (tx !== sx || ty !== sy) && this.wouldBombHitCrateOrEnemy(bot, tx, ty),
      16,
    );
    if (huntStep) {
      return steerToTile(huntStep.tx, huntStep.ty);
    }

    // Giữ vị trí ở tâm ô an toàn nếu không còn mục tiêu nào
    return steerToTile(sx, sy);
  }

  private wouldBombHitCrateOrEnemy(bot: BoomPlayerEntity, ox: number, oy: number): boolean {
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (const [dx, dy] of dirs) {
      for (let s = 1; s <= bot.range; s++) {
        const tx = ox + dx * s;
        const ty = oy + dy * s;
        if (tx < 1 || tx >= this.width - 1 || ty < 1 || ty >= this.height - 1) break;
        const tile = this.grid[ty * this.width + tx];
        if (tile === 1 || tile === 3) break;
        if (tile === 2) return true;
        const hasEnemy = this.players.some(
          (o) =>
            o.id !== bot.id &&
            o.state === 'alive' &&
            (this.mode === 'ffa' || o.team !== bot.team) &&
            Math.floor(o.x) === tx &&
            Math.floor(o.y) === ty,
        );
        if (hasEnemy) return true;
      }
    }
    return false;
  }

  private bfsFirstStep(
    sx: number,
    sy: number,
    canEnter: (tx: number, ty: number) => boolean,
    isGoal: (tx: number, ty: number) => boolean,
    maxDepth: number,
  ): { tx: number; ty: number } | null {
    const W = this.width;
    const H = this.height;
    const visited = new Uint8Array(W * H);
    const queue: { tx: number; ty: number; firstTx: number; firstTy: number; depth: number }[] = [];
    visited[sy * W + sx] = 1;

    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    // Xáo nhẹ thứ tự ưu tiên theo id/tick để các bot không đi trùng một đường thẳng cứng nhắc
    const shift = (this.tick + sx + sy) & 3;
    for (let i = 0; i < 4; i++) {
      const [dx, dy] = dirs[(i + shift) & 3];
      const ntx = sx + dx;
      const nty = sy + dy;
      if (ntx < 1 || ntx >= W - 1 || nty < 1 || nty >= H - 1) continue;
      const idx = nty * W + ntx;
      if (visited[idx] || !canEnter(ntx, nty)) continue;
      if (isGoal(ntx, nty)) return { tx: ntx, ty: nty };
      visited[idx] = 1;
      queue.push({ tx: ntx, ty: nty, firstTx: ntx, firstTy: nty, depth: 1 });
    }

    let head = 0;
    while (head < queue.length) {
      const cur = queue[head++];
      if (cur.depth >= maxDepth) continue;
      for (let i = 0; i < 4; i++) {
        const [dx, dy] = dirs[(i + shift) & 3];
        const ntx = cur.tx + dx;
        const nty = cur.ty + dy;
        if (ntx < 1 || ntx >= W - 1 || nty < 1 || nty >= H - 1) continue;
        const idx = nty * W + ntx;
        if (visited[idx] || !canEnter(ntx, nty)) continue;
        if (isGoal(ntx, nty)) return { tx: cur.firstTx, ty: cur.firstTy };
        visited[idx] = 1;
        queue.push({
          tx: ntx,
          ty: nty,
          firstTx: cur.firstTx,
          firstTy: cur.firstTy,
          depth: cur.depth + 1,
        });
      }
    }
    return null;
  }

  // ================= ROUND END & MATCH FINISH =================

  private shouldEndRound(): boolean {
    if (this.timeLeftMs <= 0) return true;
    const nonUfo = this.players.filter((p) => p.state !== 'ufo');
    if (this.players.length <= 1) {
      return nonUfo.length === 0;
    }
    if (this.mode === 'teams') {
      const initialTeams = new Set(this.players.map((p) => p.team));
      if (initialTeams.size >= 2) {
        const aliveTeams = new Set(nonUfo.map((p) => p.team));
        return aliveTeams.size <= 1;
      }
    }
    return nonUfo.length <= 1;
  }

  private endRound(): void {
    const nonUfo = this.players.filter((p) => p.state !== 'ufo');

    if (this.mode === 'teams' && new Set(this.players.map((p) => p.team)).size >= 2) {
      const redSurvivors = nonUfo.filter((p) => p.team === 0);
      const blueSurvivors = nonUfo.filter((p) => p.team === 1);

      if (redSurvivors.length > blueSurvivors.length) {
        for (const p of this.players) {
          if (p.team === 0) this.scores[p.id] = (this.scores[p.id] ?? 0) + 2;
        }
        this.roundWinnerText = `🔴 Đội Đỏ áp đảo Hiệp ${this.round}! (+2 điểm)`;
      } else if (blueSurvivors.length > redSurvivors.length) {
        for (const p of this.players) {
          if (p.team === 1) this.scores[p.id] = (this.scores[p.id] ?? 0) + 2;
        }
        this.roundWinnerText = `🔵 Đội Xanh áp đảo Hiệp ${this.round}! (+2 điểm)`;
      } else if (nonUfo.length > 0) {
        for (const p of nonUfo) {
          this.scores[p.id] = (this.scores[p.id] ?? 0) + 1;
        }
        this.roundWinnerText = `⏱️ Hòa nghẹt thở Hiệp ${this.round}! Người sống sót +1 điểm`;
      } else {
        this.roundWinnerText = `💥 Đồng quy vu tận! Không đội nào trụ lại Hiệp ${this.round}!`;
      }
    } else {
      if (nonUfo.length === 1) {
        const w = nonUfo[0];
        this.scores[w.id] = (this.scores[w.id] ?? 0) + 2;
        this.roundWinnerText = `🏆 ${w.name} sống sót cuối cùng Hiệp ${this.round}! (+2 điểm)`;
      } else if (nonUfo.length > 1) {
        for (const p of nonUfo) {
          this.scores[p.id] = (this.scores[p.id] ?? 0) + 1;
        }
        const survivorNames = nonUfo.slice(0, 3).map((p) => p.name).join(', ');
        this.roundWinnerText = `⏱️ Hết giờ! ${survivorNames}${nonUfo.length > 3 ? '…' : ''} sống sót (+1 điểm)!`;
      } else {
        this.roundWinnerText = `💥 Nổ banh sàn! Không ai sống sót Hiệp ${this.round}!`;
      }
    }

    this.emitEvent('round_win', { text: this.roundWinnerText });
    this.phase = 'round_end';
    this.phaseTicksLeft = this.roundEndTicksCfg;
    this.phaseEndsAt = Date.now() + this.phaseTicksLeft * this.tickIntervalMs;

    this.ctx.emitBoomTick?.(this.buildSnapshot());
    this.ctx.changed();
  }

  private isMatchClinched(): boolean {
    if (this.totalRounds <= 1) return true;
    const roundsLeft = this.totalRounds - this.round;
    if (roundsLeft <= 0) return true;
    // Trong chế độ Đấu Đội (ví dụ Bo3 / Bo5), nếu 1 đội đã hơn quá số điểm tối đa còn lại thì thắng sớm gọn gàng
    if (this.mode === 'teams') {
      const redIds = this.order.filter((id) => this.teams[id] === 0);
      const blueIds = this.order.filter((id) => this.teams[id] === 1);
      if (redIds.length > 0 && blueIds.length > 0) {
        const redPts = Math.max(...redIds.map((id) => this.scores[id] ?? 0));
        const bluePts = Math.max(...blueIds.map((id) => this.scores[id] ?? 0));
        if (Math.abs(redPts - bluePts) > roundsLeft * 2) return true;
      }
    }
    return false;
  }

  // ================= ENGINE INTERFACE =================

  action(playerId: string, a: GameAction): ActionResult {
    if (this.finished) return { ok: false, reason: 'not_playing' };
    if (!this.order.includes(playerId)) return { ok: false, reason: 'not_playing' };

    if (a.type === 'end') {
      if (playerId !== this.ctx.hostId()) return { ok: false, reason: 'not_host' };
      this.finishMatch(false);
      return { ok: true };
    }

    if (a.type !== 'bm_input' || !a.input || typeof a.input !== 'object') {
      return { ok: false, reason: 'bad_action' };
    }

    const raw = a.input;
    const dx =
      typeof raw.dx === 'number' && Number.isFinite(raw.dx)
        ? Math.max(-1, Math.min(1, raw.dx))
        : 0;
    const dy =
      typeof raw.dy === 'number' && Number.isFinite(raw.dy)
        ? Math.max(-1, Math.min(1, raw.dy))
        : 0;

    this.latestInputs[playerId] = { dx, dy };
    if (raw.placeBomb || raw.special) {
      const cur = this.pendingEdges[playerId] ?? {};
      if (raw.placeBomb) cur.placeBomb = true;
      if (raw.special) cur.special = true;
      this.pendingEdges[playerId] = cur;
    }
    return { ok: true };
  }

  removePlayer(playerId: string): void {
    if (this.finished) return;
    this.order = this.order.filter((id) => id !== playerId);
    delete this.latestInputs[playerId];
    delete this.pendingEdges[playerId];
    delete this.passThroughBombs[playerId];
    this.players = this.players.filter((p) => p.id !== playerId);

    if (this.order.length === 0) {
      this.finishMatch(false);
      return;
    }
    const humanOrActive = this.players.filter((p) => !p.bot);
    if (humanOrActive.length === 0) {
      this.finishMatch(false);
      return;
    }
    if (this.phase === 'playing' && this.shouldEndRound()) {
      this.endRound();
      return;
    }
    this.ctx.changed();
  }

  onPlayerConnection(playerId: string, connected: boolean): void {
    if (this.finished) return;
    const p = this.players.find((x) => x.id === playerId);
    if (p) p.connected = connected;
    if (!connected) {
      delete this.latestInputs[playerId];
      delete this.pendingEdges[playerId];
    }
    this.ctx.changed();
  }

  renamePlayer(playerId: string, name: string): void {
    if (playerId in this.names) {
      this.names[playerId] = name;
      const p = this.players.find((x) => x.id === playerId);
      if (p) p.name = name;
    }
  }

  private finishMatch(completedAll: boolean): void {
    if (this.finished) return;
    this.finished = true;
    this.dispose();

    const compositeScore = (id: string) =>
      (this.scores[id] ?? 0) * 1000 +
      (this.totalKills[id] ?? 0) * 20 +
      (this.totalSaves[id] ?? 0) * 5;

    const sortedIds = [...this.order].sort((a, b) => compositeScore(b) - compositeScore(a));
    const ranking: RankEntry[] = sortedIds.map((id) => {
      const pts = this.scores[id] ?? 0;
      const k = this.totalKills[id] ?? 0;
      const sv = this.totalSaves[id] ?? 0;
      const teamPrefix = this.mode === 'teams' ? `${this.teams[id] === 0 ? 'Đội Đỏ' : 'Đội Xanh'} · ` : '';
      return {
        playerId: id,
        name: this.names[id] ?? 'Bomber',
        detail: `${teamPrefix}${pts} điểm · ${k} BỤP${sv > 0 ? ` · ${sv} cứu` : ''}`,
      };
    });

    let winnerIds: string[] = [];
    let headline = '💣 Đặt Bom Tử Chiến kết thúc!';

    if (sortedIds.length > 0) {
      if (this.mode === 'teams' && new Set(sortedIds.map((id) => this.teams[id])).size >= 2) {
        const redIds = sortedIds.filter((id) => this.teams[id] === 0);
        const blueIds = sortedIds.filter((id) => this.teams[id] === 1);
        const redBest = Math.max(0, ...redIds.map((id) => this.scores[id] ?? 0));
        const blueBest = Math.max(0, ...blueIds.map((id) => this.scores[id] ?? 0));
        const redKills = redIds.reduce((s, id) => s + (this.totalKills[id] ?? 0), 0);
        const blueKills = blueIds.reduce((s, id) => s + (this.totalKills[id] ?? 0), 0);

        if (redBest > blueBest || (redBest === blueBest && redKills > blueKills)) {
          winnerIds = redIds;
          headline = `💣 🔴 Đội Đỏ đại thắng Đặt Bom Tử Chiến (${redBest} điểm · ${redKills} BỤP)!`;
        } else if (blueBest > redBest || (blueBest === redBest && blueKills > redKills)) {
          winnerIds = blueIds;
          headline = `💣 🔵 Đội Xanh đại thắng Đặt Bom Tử Chiến (${blueBest} điểm · ${blueKills} BỤP)!`;
        } else {
          winnerIds = sortedIds;
          headline = `💣 Hai đội Đỏ & Xanh bất phân thắng bại sau ${this.round} hiệp!`;
        }
      } else {
        const topVal = compositeScore(sortedIds[0]);
        winnerIds = topVal > 0 || completedAll ? sortedIds.filter((id) => compositeScore(id) === topVal) : [sortedIds[0]];
        const topId = winnerIds[0];
        headline =
          winnerIds.length > 1
            ? `💣 Đồng quán quân Đặt Bom Tử Chiến: ${winnerIds.map((id) => this.names[id]).join(' & ')}!`
            : `💣 ${this.names[topId]} bá chủ Đặt Bom Tử Chiến (${this.scores[topId] ?? 0} điểm · ${this.totalKills[topId] ?? 0} BỤP)!`;
      }
    }

    this.ctx.finish({
      winnerId: winnerIds[0] ?? null,
      winnerIds,
      ranking,
      headline,
    });
  }

  private buildSnapshot(): BoomTickPayload {
    return {
      tick: this.tick,
      round: this.round,
      phase: this.phase,
      timeLeftMs: this.timeLeftMs,
      ringActive: this.ringActive,
      width: this.width,
      height: this.height,
      grid: [...this.grid],
      warningCells: [...this.warningCells],
      items: this.items.map((it) => ({ ...it })),
      bombs: this.bombs.map((b) => ({
        id: b.id,
        ownerId: b.ownerId,
        x: Math.round(b.x * 1000) / 1000,
        y: Math.round(b.y * 1000) / 1000,
        range: b.range,
        ticksLeft: b.ticksLeft,
        vx: Math.round(b.vx * 100) / 100,
        vy: Math.round(b.vy * 100) / 100,
        ...(b.lob ? { lob: { ...b.lob } } : {}),
        ...(b.fromUfo ? { fromUfo: true } : {}),
      })),
      blasts: this.blasts.map((bl) => ({ ...bl })),
      players: this.players.map((p) => ({
        ...p,
        x: Math.round(p.x * 1000) / 1000,
        y: Math.round(p.y * 1000) / 1000,
        vx: Math.round(p.vx * 100) / 100,
        vy: Math.round(p.vy * 100) / 100,
        ufoCoord: Math.round(p.ufoCoord * 1000) / 1000,
      })),
      events: [...this.tickEvents],
      killFeed: [...this.killFeed],
    };
  }

  view(): BoomView {
    return {
      type: 'boom_online',
      mode: this.mode,
      round: this.round,
      totalRounds: this.totalRounds,
      phase: this.phase,
      phaseEndsAt: this.phaseEndsAt,
      width: this.width,
      height: this.height,
      scores: { ...this.scores },
      kills: { ...this.totalKills },
      saves: { ...this.totalSaves },
      names: { ...this.names },
      colors: { ...this.colors },
      teams: { ...this.teams },
      roundWinnerText: this.roundWinnerText,
      snapshot: {
        ...this.buildSnapshot(),
        events: [...this.recentEvents],
      },
    };
  }

  dispose(): void {
    if (this.loop) {
      clearInterval(this.loop);
      this.loop = undefined;
    }
  }
}
