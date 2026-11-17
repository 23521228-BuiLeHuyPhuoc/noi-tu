/**
 * Server Engine cho Đầm Lầy Quái Chiêu (`croaksquad`, 2–6 người chơi thật, KHÔNG dùng Bot giả):
 * Chạy vòng lặp vật lý tất định 30Hz (`CROAK_DT = 1/30s`) từ `shared/src/croaksquad.ts`,
 * phát gói nhẹ `'croak:tick'` tới cả phòng để mọi máy thấy cùng một kết quả va chạm / công tắc / nuốt nhả.
 */
import {
  CROAK_DT,
  CROAK_FPS,
  CROAK_STAGES,
  createCroakWorld,
  loadCroakStage,
  removeCroakPlayer,
  setCroakConnection,
  stepCroakWorld,
  toCroakTickPayload,
  type CroakInput,
  type CroakSquadView,
  type CroakWorld,
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
  private loop?: ReturnType<typeof setInterval>;
  private finished = false;

  constructor(private readonly ctx: EngineContext) {}

  start(players: EnginePlayer[]): void {
    this.order = players.map((p) => p.id);
    this.names = Object.fromEntries(players.map((p) => [p.id, p.name]));
    const startStage = this.ctx.settings.croakStage ?? 0;
    this.world = createCroakWorld(
      players.map((p, idx) => ({ id: p.id, name: p.name, colorIndex: idx })),
      startStage,
    );
    for (const p of players) {
      setCroakConnection(this.world, p.id, this.ctx.isConnected(p.id));
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

  private tickOnce(): void {
    if (this.finished || !this.world) return;
    const prevStage = this.world.stageIndex;
    const prevCleared = this.world.stageClearedTicks > 0;

    const merged: Record<string, CroakInput | undefined> = {};
    for (const id of this.order) {
      const base = this.latestInputs[id];
      const edges = this.pendingEdges[id];
      if (base || edges) {
        merged[id] = {
          moveX: base?.moveX ?? 0,
          aimAngle: base?.aimAngle,
          aimPower: base?.aimPower,
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
    }
    this.pendingEdges = {};

    const evs = stepCroakWorld(this.world, merged, CROAK_DT);

    if (this.world.allCompleted) {
      this.finishAll(true);
      return;
    }

    this.ctx.emitCroakTick?.(toCroakTickPayload(this.world, evs));

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
    if (raw.jump || raw.tongue || raw.spit) {
      const cur = this.pendingEdges[playerId] ?? {};
      if (raw.jump) cur.jump = true;
      if (raw.tongue) cur.tongue = true;
      if (raw.spit) cur.spit = true;
      this.pendingEdges[playerId] = cur;
    }
    return { ok: true };
  }

  removePlayer(playerId: string): void {
    if (this.finished) return;
    this.order = this.order.filter((id) => id !== playerId);
    delete this.latestInputs[playerId];
    delete this.pendingEdges[playerId];
    removeCroakPlayer(this.world, playerId);
    if (this.order.length === 0) {
      this.finishAll(false);
      return;
    }
    this.ctx.changed();
  }

  onPlayerConnection(playerId: string, connected: boolean): void {
    if (this.finished || !this.world) return;
    setCroakConnection(this.world, playerId, connected);
    if (!connected) {
      delete this.latestInputs[playerId];
      delete this.pendingEdges[playerId];
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
