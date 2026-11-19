/**
 * Server Engine cho Đầm Lầy Quái Chiêu (`croaksquad`, 2–6 người chơi — hỗ trợ cả Co-op người thật lẫn AI Đồng Đội Máy thông minh!):
 * Chạy vòng lặp vật lý tất định 30Hz (`CROAK_DT = 1/30s`) từ `shared/src/croaksquad.ts`,
 * phát gói nhẹ `'croak:tick'` tới cả phòng để mọi máy thấy cùng một kết quả va chạm / công tắc / nuốt nhả.
 */
import {
  CROAK_DT,
  CROAK_FPS,
  CROAK_FROG_H,
  CROAK_FROG_W,
  CROAK_STAGES,
  createCroakWorld,
  loadCroakStage,
  platformRectAt,
  removeCroakPlayer,
  setCroakConnection,
  stepCroakWorld,
  toCroakTickPayload,
  type CroakInput,
  type CroakSquadView,
  type CroakStageDef,
  type CroakWorld,
  type FrogEntity,
} from '../../../shared/src/croaksquad';
import type { ActionResult, GameAction } from '../../../shared/src/types';
import type { EngineContext, EnginePlayer, GameEngine } from './engine';

export class CroakSquadGame implements GameEngine {
  private order: string[] = [];
  private names: Record<string, string> = {};
  private world!: CroakWorld;
  private latestInputs: Record<string, CroakInput> = {};
  /** Các phím nhấp 1 lần (nhảy, phóng lưỡi, nhả) được giữ tới tick vật lý kế tiếp rồi xóa */
  private pendingEdges: Record<string, { jump?: boolean; tongue?: boolean; spit?: boolean }> = {};
  private pendingMoveTaps: Record<string, number | undefined> = {};
  private pendingSpitAim: Record<string, { aimAngle?: number; aimPower?: number } | undefined> = {};
  private lastReceivedSeq: Record<string, number> = {};
  private lastProcessedSeq: Record<string, number> = {};
  /** Bộ nhớ trạng thái AI cho từng chú ếch máy (đếm nhịp ngắm bắn, chống kẹt địa hình) */
  private botMem: Record<string, { holdAimTicks: number; lastX: number; stuckTicks: number; tongueCd: number }> = {};
  private loop?: ReturnType<typeof setInterval>;
  private finished = false;

  constructor(private readonly ctx: EngineContext) {}

  start(players: EnginePlayer[]): void {
    this.order = players.map((p) => p.id);
    this.names = Object.fromEntries(players.map((p) => [p.id, p.name]));
    const startStage = this.ctx.settings.croakStage ?? 0;
    this.world = createCroakWorld(
      players.map((p, idx) => ({
        id: p.id,
        name: p.name,
        colorIndex: this.ctx.playerColor ? this.ctx.playerColor(p.id) : idx,
      })),
      startStage,
    );
    for (const p of players) {
      const isBot = !!this.ctx.isBot?.(p.id);
      setCroakConnection(this.world, p.id, isBot || this.ctx.isConnected(p.id));
    }
    const intervalMs = Math.round(1000 / CROAK_FPS);
    this.loop = setInterval(() => this.tickOnce(), intervalMs);
  }

  /** Cho phép cả vòng lặp thực 30Hz lẫn bộ test tự động bước nhiều tick tức thì */
  stepManual(ticks = 1): void {
    for (let i = 0; i < ticks && !this.finished; i++) {
      this.tickOnce();
    }
  }

  /**
   * AI Đồng Đội Co-op Thông Minh cho ếch máy (`isBot`):
   * Biết phối hợp nuốt-bắn lấy công tắc/chìa khóa trên cao, nhảy qua gai/vực, đạp nấm lò xo,
   * đợi bệ gỗ di động và tiến vào Đài Sen Vàng cùng người chơi!
   */
  private computeBotInput(bot: FrogEntity, stage: CroakStageDef): CroakInput {
    const mem = (this.botMem[bot.id] ??= { holdAimTicks: 0, lastX: bot.x, stuckTicks: 0, tongueCd: 0 });
    if (mem.tongueCd > 0) mem.tongueCd--;

    // Đang ở trong bụng người chơi thật -> nằm ngoan để đồng đội căn góc bắn mình lên bệ cao!
    if (bot.state === 'swallowed') {
      const carrier = this.world.frogs.find((f) => f.id === bot.carrierId);
      const heldTooLong = carrier && !this.ctx.isBot?.(carrier.id) ? bot.carryTicks > 240 : bot.carryTicks > 90;
      return { moveX: 0, jump: heldTooLong && this.world.tick % 6 === 0 };
    }
    if (bot.state === 'dead' || bot.state === 'finished') {
      return { moveX: 0 };
    }

    const cx = bot.x + CROAK_FROG_W * 0.5;
    const cy = bot.y + CROAK_FROG_H * 0.5;

    // Nếu đang ngậm đồng đội trong bụng -> căn góc chuẩn xác tới mục tiêu trên cao rồi BẮN!
    if (bot.state === 'carrying' && bot.bellyId) {
      let aimAngle = -0.95;
      let aimPower = 0.88;
      if (stage.index === 0 && !this.world.switchesOn['sw_bridge']) {
        // Bắn lên vách đá p_high_sw (x ~ 600, y ~ 295)
        aimAngle = cx < 300 ? -0.92 : -1.08;
        aimPower = 0.9;
      } else if (stage.index === 0 && !this.world.switchesOn['sw_final'] && cx > 900) {
        aimAngle = -1.12;
        aimPower = 0.92;
      } else if (stage.index === 1 && !this.world.keysCollected['key_tower'] && cx < 420) {
        // Bắn lên tháp chìa khóa (x ~ 235, y ~ 300)
        aimAngle = cx <= 210 ? -1.16 : -(Math.PI - 1.16);
        aimPower = 0.86;
      } else if (stage.index === 1 && !this.world.switchesOn['sw2_bridge'] && cx > 1220) {
        aimAngle = -1.24;
        aimPower = 0.9;
      } else if (stage.index === 2 && !this.world.switchesOn['sw3_wall_gate'] && cx < 560) {
        // Bắn vượt đỉnh tường thành Đền Cổ (x: 560, y: 300)
        aimAngle = -1.12;
        aimPower = 0.98;
      }
      mem.holdAimTicks++;
      if (mem.holdAimTicks >= 12) {
        mem.holdAimTicks = 0;
        mem.tongueCd = 75;
        return { moveX: 0, aimAngle, aimPower, spit: true };
      }
      return { moveX: 0, aimAngle, aimPower };
    }
    mem.holdAimTicks = 0;

    // Xác định mục tiêu tọa độ X kế tiếp tùy theo tiến độ giải đố của màn hiện tại
    let targetX = stage.goal.x + stage.goal.w * 0.5;
    let wantCoopLaunch = false;
    let launchStandX = cx;

    if (stage.index === 0) {
      if (!this.world.switchesOn['sw_bridge']) {
        // Nếu mình đã được bắn lên vách cao p_high_sw -> chạy thẳng vào công tắc sw_bridge!
        if (cy < 380 && cx > 480 && cx < 760) {
          targetX = 617;
        } else {
          // Đứng ở bậc đá p_step1 phối hợp phóng đồng đội lên mở cầu
          launchStandX = 325;
          targetX = launchStandX;
          wantCoopLaunch = this.world.elapsedSec > 2.8;
        }
      } else if (!this.world.switchesOn['sw_final']) {
        if (cy < 300 && cx > 1110) {
          // Đang ở trên mỏm p_upper_gate -> giẫm công tắc Cổng Sen!
          targetX = 1224;
        } else if (bot.vy < -360 && cx > 980 && cx < 1160) {
          // Vừa bật nấm lò xo -> nghiêng phải để đáp lên mỏm đá cao p_upper_gate
          targetX = 1210;
        } else {
          // Nhảy vào nấm nhún p_shroom1 (x: 1044)
          targetX = 1044;
        }
      }
    } else if (stage.index === 1) {
      if (!this.world.keysCollected['key_tower']) {
        if (cy < 400 && cx > 120 && cx < 360) {
          targetX = 235;
        } else {
          launchStandX = 135;
          targetX = launchStandX;
          wantCoopLaunch = this.world.elapsedSec > 2.5;
        }
      } else if (!this.world.switchesOn['sw2_bridge']) {
        const moverPlat = stage.platforms.find((p) => p.id === 'p2_mover1') ?? stage.platforms[3];
        if (cy < 320 && cx > 1230) {
          targetX = 1340;
        } else if (cx < 905) {
          // Đợi bệ gỗ di động p2_mover1 áp sát bờ trái trước khi nhảy sang
          const mover = platformRectAt(moverPlat, this.world.elapsedSec);
          targetX = mover.x < 1015 ? mover.x + mover.w * 0.5 : 885;
        } else if (cx >= 905 && cx < 1290) {
          const mover = platformRectAt(moverPlat, this.world.elapsedSec);
          targetX = mover.x + mover.w > 1215 ? 1345 : mover.x + mover.w * 0.5;
        } else {
          launchStandX = 1335;
          targetX = launchStandX;
          wantCoopLaunch = true;
        }
      }
    } else if (stage.index === 2) {
      if (!this.world.switchesOn['sw3_wall_gate']) {
        if (cx > 605) {
          targetX = 708;
        } else {
          launchStandX = 395;
          targetX = launchStandX;
          wantCoopLaunch = this.world.elapsedSec > 2.5;
        }
      } else if (!this.world.keysCollected['key_sanctum']) {
        const elevPlat = stage.platforms.find((p) => p.id === 'p3_elevator') ?? stage.platforms[4];
        if (cy < 420 && cx > 1350) {
          targetX = 1475;
        } else if (cx < 1145) {
          const elev = platformRectAt(elevPlat, this.world.elapsedSec);
          targetX = elev.y > 560 ? elev.x + elev.w * 0.5 : 1120;
        } else if (cx >= 1145 && cx < 1375) {
          const elev = platformRectAt(elevPlat, this.world.elapsedSec);
          targetX = elev.y < 435 ? 1450 : elev.x + elev.w * 0.5;
        }
      } else if (cx > 1370 && cx < 1755) {
        const endPlat = stage.platforms.find((p) => p.id === 'p3_mover_end') ?? stage.platforms[6];
        const moverEnd = platformRectAt(endPlat, this.world.elapsedSec);
        if (cx < 1410 && moverEnd.x > 1470) {
          targetX = 1395;
        } else if (moverEnd.x + moverEnd.w < 1690 && cx < 1740) {
          targetX = moverEnd.x + moverEnd.w * 0.5;
        }
      }
    }

    const dx = targetX - cx;
    let moveX: -1 | 0 | 1 = Math.abs(dx) > 12 ? (dx > 0 ? 1 : -1) : 0;

    // Phối hợp nuốt-bắn đồng đội khi đứng tại điểm bệ phóng và có bạn ở ngay cạnh
    if (wantCoopLaunch && mem.tongueCd === 0 && Math.abs(cx - launchStandX) < 55 && bot.onGround) {
      const partner = this.world.frogs.find(
        (o) =>
          o.id !== bot.id &&
          o.connected &&
          o.state === 'normal' &&
          Math.abs(o.x - bot.x) < 92 &&
          Math.abs(o.y - bot.y) < 48,
      );
      if (partner) {
        const faceDir: -1 | 1 = partner.x >= bot.x ? 1 : -1;
        if (bot.facing !== faceDir) {
          return { moveX: faceDir };
        }
        mem.tongueCd = 45;
        return { moveX: 0, tongue: true };
      }
    }

    // Tự động nhảy qua chông gai, mép vực sâu, bậc đá hoặc khi bị kẹt tường
    let jump = false;
    if (bot.onGround && moveX !== 0) {
      const lookAheadX = cx + moveX * 36;
      const hazardAhead = stage.hazards.some(
        (hz) => lookAheadX >= hz.x - 18 && lookAheadX <= hz.x + hz.w + 18 && Math.abs(hz.y - (bot.y + CROAK_FROG_H)) < 170,
      );
      const stepAhead = stage.platforms.some(
        (pl) =>
          (!pl.activeWhenSwitch || this.world.switchesOn[pl.activeWhenSwitch]) &&
          lookAheadX >= pl.x - 8 &&
          lookAheadX <= pl.x + pl.w + 8 &&
          pl.y < bot.y + CROAK_FROG_H - 6 &&
          pl.y > bot.y - 115,
      );
      if (hazardAhead || stepAhead) jump = true;
    }

    if (Math.abs(bot.x - mem.lastX) < 1.5 && moveX !== 0) {
      mem.stuckTicks++;
      if (mem.stuckTicks >= 16 && bot.onGround) {
        jump = true;
        mem.stuckTicks = 0;
      }
    } else {
      mem.stuckTicks = 0;
    }
    mem.lastX = bot.x;

    return { moveX, ...(jump ? { jump: true } : {}) };
  }

  private tickOnce(): void {
    if (this.finished || !this.world) return;
    const prevStage = this.world.stageIndex;
    const prevCleared = this.world.stageClearedTicks > 0;
    const stg = CROAK_STAGES[this.world.stageIndex] ?? CROAK_STAGES[0];

    const merged: Record<string, CroakInput | undefined> = {};
    for (const id of this.order) {
      if (this.ctx.isBot?.(id)) {
        const botFrog = this.world.frogs.find((f) => f.id === id);
        if (botFrog) merged[id] = this.computeBotInput(botFrog, stg);
        continue;
      }
      const base = this.latestInputs[id];
      const edges = this.pendingEdges[id];
      const tapMoveX = this.pendingMoveTaps[id];
      const spitAim = edges?.spit ? this.pendingSpitAim[id] : undefined;
      if (base || edges || tapMoveX !== undefined) {
        const moveX = base && base.moveX !== 0 ? base.moveX : (tapMoveX ?? base?.moveX ?? 0);
        merged[id] = {
          moveX,
          aimAngle: spitAim?.aimAngle ?? base?.aimAngle,
          aimPower: spitAim?.aimPower ?? base?.aimPower,
          jump: edges?.jump || base?.jump,
          tongue: edges?.tongue || base?.tongue,
          spit: edges?.spit || base?.spit,
        };
      }
      if (base) {
        base.jump = false;
        base.tongue = false;
        base.spit = false;
      }
      if (this.lastReceivedSeq[id] !== undefined) {
        this.lastProcessedSeq[id] = this.lastReceivedSeq[id];
      }
    }
    this.pendingEdges = {};
    this.pendingMoveTaps = {};
    this.pendingSpitAim = {};

    const evs = stepCroakWorld(this.world, merged, CROAK_DT);

    if (this.world.allCompleted) {
      this.finishAll(true);
      return;
    }

    this.ctx.emitCroakTick?.(toCroakTickPayload(this.world, evs, { ...this.lastProcessedSeq }));

    // Khi qua màn mới hoặc có sự kiện quan trọng (chìa khóa, công tắc, checkpoint, hoàn thành màn), đồng bộ cả RoomState
    const stageChanged = this.world.stageIndex !== prevStage;
    const justCleared = !prevCleared && this.world.stageClearedTicks > 0;
    const majorEvent = evs.some((e) => e.sfx === 'key' || e.sfx === 'switch' || e.sfx === 'checkpoint' || e.sfx === 'stage_clear');
    if (stageChanged || justCleared || majorEvent) {
      this.ctx.changed();
    }
  }

  action(playerId: string, a: GameAction): ActionResult {
    if (this.finished) return { ok: false, reason: 'not_playing' };
    if (!this.order.includes(playerId)) return { ok: false, reason: 'not_playing' };

    if (a.type === 'end') {
      if (playerId !== this.ctx.hostId()) return { ok: false, reason: 'not_host' };
      this.finishAll(false);
      return { ok: true };
    }

    if (a.type === 'cs_reset_stage') {
      if (playerId !== this.ctx.hostId()) return { ok: false, reason: 'not_host' };
      loadCroakStage(this.world, this.world.stageIndex);
      this.ctx.changed();
      this.ctx.emitCroakTick?.(toCroakTickPayload(this.world, []));
      return { ok: true };
    }

    if (a.type !== 'cs_input' || !a.input || typeof a.input !== 'object') {
      return { ok: false, reason: 'bad_action' };
    }

    const raw = a.input;
    if (typeof raw.seq === 'number' && Number.isFinite(raw.seq)) {
      const prevSeq = this.lastReceivedSeq[playerId];
      if (prevSeq !== undefined && raw.seq < prevSeq) {
        return { ok: true };
      }
      this.lastReceivedSeq[playerId] = raw.seq;
    }
    const moveX = typeof raw.moveX === 'number' && Number.isFinite(raw.moveX)
      ? Math.max(-1, Math.min(1, Math.round(raw.moveX)))
      : 0;
    const aimAngle = typeof raw.aimAngle === 'number' && Number.isFinite(raw.aimAngle) ? raw.aimAngle : undefined;
    const aimPower = typeof raw.aimPower === 'number' && Number.isFinite(raw.aimPower) ? raw.aimPower : undefined;

    this.latestInputs[playerId] = {
      moveX,
      ...(aimAngle !== undefined ? { aimAngle } : {}),
      ...(aimPower !== undefined ? { aimPower } : {}),
    };
    if (moveX !== 0) {
      this.pendingMoveTaps[playerId] = moveX;
    }
    if (raw.jump || raw.tongue || raw.spit) {
      const cur = this.pendingEdges[playerId] ?? {};
      if (raw.jump) cur.jump = true;
      if (raw.tongue) cur.tongue = true;
      if (raw.spit) {
        cur.spit = true;
        if (aimAngle !== undefined || aimPower !== undefined) {
          this.pendingSpitAim[playerId] = { aimAngle, aimPower };
        }
      }
      this.pendingEdges[playerId] = cur;
    }
    return { ok: true };
  }

  removePlayer(playerId: string): void {
    if (this.finished) return;
    this.order = this.order.filter((id) => id !== playerId);
    delete this.latestInputs[playerId];
    delete this.pendingEdges[playerId];
    delete this.pendingMoveTaps[playerId];
    delete this.pendingSpitAim[playerId];
    delete this.lastReceivedSeq[playerId];
    delete this.lastProcessedSeq[playerId];
    delete this.botMem[playerId];
    removeCroakPlayer(this.world, playerId);
    const anyHumanLeft = this.order.some((id) => !this.ctx.isBot?.(id));
    if (this.order.length === 0 || !anyHumanLeft) {
      this.finishAll(false);
      return;
    }
    this.ctx.changed();
  }

  onPlayerConnection(playerId: string, connected: boolean): void {
    if (this.finished || !this.world) return;
    if (this.ctx.isBot?.(playerId)) return;
    setCroakConnection(this.world, playerId, connected);
    if (!connected) {
      delete this.latestInputs[playerId];
      delete this.pendingEdges[playerId];
      delete this.pendingMoveTaps[playerId];
      delete this.pendingSpitAim[playerId];
    }
    this.ctx.changed();
  }

  renamePlayer(playerId: string, name: string): void {
    if (playerId in this.names) {
      this.names[playerId] = name;
      const f = this.world?.frogs.find((x) => x.id === playerId);
      if (f) f.name = name;
    }
  }

  private finishAll(victory: boolean): void {
    if (this.finished) return;
    this.finished = true;
    this.dispose();

    const frogs = [...(this.world?.frogs ?? [])];
    frogs.sort((a, b) => (b.spits * 2 + b.saves - b.deaths) - (a.spits * 2 + a.saves - a.deaths));
    const ranking = frogs.map((f) => ({
      playerId: f.id,
      name: this.names[f.id] ?? f.name,
      detail: `${f.spits} pha bắn bạn · ${f.deaths} lần ngã đầm`,
    }));
    const winnerIds = victory ? frogs.filter((f) => f.connected).map((f) => f.id) : [];
    const totalSec = Math.max(1, Math.round(this.world?.elapsedSec ?? 1));

    this.ctx.finish({
      winnerId: winnerIds[0] ?? null,
      winnerIds,
      ranking,
      headline: victory
        ? `🐸 Cả đội phá đảo đủ ${CROAK_STAGES.length} màn Đầm Lầy Quái Chiêu! (Màn cuối: ${totalSec}s)`
        : `🐸 Tạm dừng ở Màn ${(this.world?.stageIndex ?? 0) + 1}/${CROAK_STAGES.length} Đầm Lầy Quái Chiêu`,
    });
  }

  view(): CroakSquadView {
    const st = CROAK_STAGES[this.world.stageIndex] ?? CROAK_STAGES[0];
    const snap = toCroakTickPayload(this.world, this.world.recentEvents);
    return {
      type: 'croaksquad',
      stageIndex: st.index,
      totalStages: CROAK_STAGES.length,
      stageId: st.id,
      stageName: st.name,
      stageSubtitle: st.subtitle,
      stageHint: st.hint,
      tick: snap.tick,
      elapsedSec: Math.round(this.world.elapsedSec * 10) / 10,
      order: [...this.order],
      names: { ...this.names },
      switchesOn: snap.switchesOn,
      keysCollected: snap.keysCollected,
      activeCheckpointId: snap.activeCheckpointId,
      frogs: snap.frogs,
      events: snap.events,
    };
  }

  dispose(): void {
    if (this.loop) {
      clearInterval(this.loop);
      this.loop = undefined;
    }
  }
}
