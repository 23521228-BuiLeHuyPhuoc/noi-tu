/**
 * Server Engine: Đèn Đỏ Đèn Xanh (`den_do`, 2–12 người).
 * Đua nước rút 0 -> 100m qua chu kỳ Đèn Xanh / Vàng / Đỏ biến thiên khó đoán,
 * kèm Hộp Quà mốc 25m/55m/80m và Đạo Cụ Bóp Đồng Đội (`fake_green`, `banana`, `shield`).
 */
import {
  DEN_DO_BANANA_PENALTY,
  DEN_DO_DEFAULT_ROUNDS,
  DEN_DO_GIFT_CHECKPOINTS,
  DEN_DO_GOAL_METERS,
  DEN_DO_GREEN_MAX_MS,
  DEN_DO_GREEN_MIN_MS,
  DEN_DO_GREEN_STEP,
  DEN_DO_ITEMS,
  DEN_DO_MATCH_MAX_MS,
  DEN_DO_MIN_STEP_MS,
  DEN_DO_RED_GRACE_MS,
  DEN_DO_RED_MAX_MS,
  DEN_DO_RED_MIN_MS,
  DEN_DO_RED_PENALTY,
  DEN_DO_SIREN_MS,
  DEN_DO_YELLOW_MS,
  DEN_DO_YELLOW_STEP,
  type DenDoAction,
  type DenDoItem,
  type DenDoLight,
  type DenDoView,
} from '../../../shared/src/dendo';
import type { ActionResult, GameAction } from '../../../shared/src/types';
import { Timer, type EngineContext, type EnginePlayer, type GameEngine } from './engine';

type DenDoSettingsCompat = { denDoRounds?: number };

function round1(val: number): number {
  return Math.round(val * 10) / 10;
}

export class DenDoGame implements Omit<GameEngine, 'view' | 'botAction'> {
  readonly perPlayerView = false;

  private readonly maxRounds: number;
  private readonly scale: number;
  private readonly minStepMs: number;
  private readonly redGraceMs: number;
  private readonly matchMaxMs: number;

  private order: string[] = [];
  private activeOrder: string[] = [];
  private names = new Map<string, string>();
  private progress = new Map<string, number>();
  private items = new Map<string, DenDoItem | null>();
  private claimedMilestones = new Map<string, Set<number>>();
  private lastStepAt = new Map<string, number>();
  private shieldGraceUntil = new Map<string, number>();

  private caughtIds = new Set<string>();
  private shieldedIds = new Set<string>();
  private finishedOrder: string[] = [];
  private lastEvents: string[] = [];

  private round = 1;
  private light: DenDoLight = 'green';
  private lightStartedAt = 0;
  private lightEndsAt: number | null = null;
  private lightSeconds = 4;

  private fakeSirenBy: string | null = null;
  private fakeSirenUntil: number | null = null;
  private fakeSirenSeq = 0;
  private botCheckedSirenSeq = new Map<string, number>();

  private finished = false;
  private suppressBroadcast = false;
  private dirtyDuringBatch = false;

  private notifyChanged(): void {
    if (this.suppressBroadcast) {
      this.dirtyDuringBatch = true;
      return;
    }
    this.ctx.changed();
  }

  private readonly phaseTimer = new Timer();
  private readonly matchTimer = new Timer();
  private readonly botPaceTimer = new Timer();

  constructor(private readonly ctx: EngineContext) {
    const rawRounds = (ctx.settings as DenDoSettingsCompat).denDoRounds ?? DEN_DO_DEFAULT_ROUNDS;
    this.maxRounds = Math.max(1, Math.min(25, Math.floor(rawRounds) || DEN_DO_DEFAULT_ROUNDS));

    this.scale = ctx.turnMs ? Math.min(1, Math.max(0.05, ctx.turnMs / 4000)) : 1;
    this.minStepMs =
      this.scale < 1 ? Math.min(DEN_DO_MIN_STEP_MS, Math.max(10, Math.round(DEN_DO_MIN_STEP_MS * this.scale))) : DEN_DO_MIN_STEP_MS;
    this.redGraceMs =
      this.scale < 1 ? Math.min(DEN_DO_RED_GRACE_MS, Math.max(20, Math.round(DEN_DO_RED_GRACE_MS * this.scale))) : DEN_DO_RED_GRACE_MS;
    this.matchMaxMs =
      this.scale < 1 ? Math.max(1500, Math.round(DEN_DO_MATCH_MAX_MS * this.scale)) : DEN_DO_MATCH_MAX_MS;
  }

  private isBotPlayer(playerId: string): boolean {
    return Boolean(this.ctx.isBot?.(playerId)) || playerId.startsWith('bot-');
  }

  private pushEvent(text: string): void {
    this.lastEvents.push(text);
    if (this.lastEvents.length > 8) {
      this.lastEvents.shift();
    }
  }

  start(players: EnginePlayer[]): void {
    this.order = players.map((p) => p.id);
    this.activeOrder = [...this.order];

    for (const p of players) {
      this.names.set(p.id, p.name);
      this.progress.set(p.id, 0);
      this.items.set(p.id, null);
      this.claimedMilestones.set(p.id, new Set<number>());
      this.lastStepAt.set(p.id, 0);
      this.shieldGraceUntil.set(p.id, 0);
    }

    this.round = 1;
    this.caughtIds.clear();
    this.shieldedIds.clear();
    this.finishedOrder = [];
    this.lastEvents = ['🚦 Xuất phát! Đèn Xanh bấm chạy thật lẹ — Đèn Đỏ đứng im kẻo ăn tia Laser!'];

    // Hẹn giờ tổng toàn ván (95 giây mặc định)
    this.matchTimer.set(this.matchMaxMs, () => {
      if (!this.finished) {
        this.pushEvent('⏰ Hết giờ toàn chặng — Tổng kết vị trí trên đường đua!');
        this.finishGame(null, undefined);
      }
    });

    this.enterGreen();
    this.scheduleBotPace();
  }

  private pickGreenMs(): number {
    const raw = DEN_DO_GREEN_MIN_MS + Math.floor(this.ctx.rng() * (DEN_DO_GREEN_MAX_MS - DEN_DO_GREEN_MIN_MS + 1));
    return this.scale < 1 ? Math.max(120, Math.round(raw * this.scale)) : raw;
  }

  private pickYellowMs(): number {
    return this.scale < 1 ? Math.max(50, Math.round(DEN_DO_YELLOW_MS * this.scale)) : DEN_DO_YELLOW_MS;
  }

  private pickRedMs(): number {
    const raw = DEN_DO_RED_MIN_MS + Math.floor(this.ctx.rng() * (DEN_DO_RED_MAX_MS - DEN_DO_RED_MIN_MS + 1));
    return this.scale < 1 ? Math.max(120, Math.round(raw * this.scale)) : raw;
  }

  private enterGreen(): void {
    if (this.finished) return;
    this.light = 'green';
    this.caughtIds.clear();
    this.fakeSirenBy = null;
    this.fakeSirenUntil = null;

    const ms = this.pickGreenMs();
    this.lightStartedAt = Date.now();
    this.lightEndsAt = this.lightStartedAt + ms;
    this.lightSeconds = Math.max(1, Math.round(ms / 1000));

    this.phaseTimer.set(ms, () => this.enterYellow());
    this.ctx.changed();
  }

  private enterYellow(): void {
    if (this.finished) return;
    this.light = 'yellow';

    const ms = this.pickYellowMs();
    this.lightStartedAt = Date.now();
    this.lightEndsAt = this.lightStartedAt + ms;
    this.lightSeconds = 1;

    this.phaseTimer.set(ms, () => this.enterRed());
    this.ctx.changed();
  }

  private enterRed(): void {
    if (this.finished) return;
    this.light = 'red';
    this.caughtIds.clear();

    const ms = this.pickRedMs();
    this.lightStartedAt = Date.now();
    this.lightEndsAt = this.lightStartedAt + ms;
    this.lightSeconds = Math.max(1, Math.round(ms / 1000));

    this.phaseTimer.set(ms, () => {
      if (this.finished) return;
      if (this.round >= this.maxRounds) {
        this.pushEvent(`🏁 Đã khép lại trọn ${this.maxRounds} chu kỳ đèn giao thông!`);
        this.finishGame(null, undefined);
      } else {
        this.round++;
        this.enterGreen();
      }
    });

    this.ctx.changed();
  }

  private scheduleBotPace(): void {
    if (this.finished) return;
    if (!this.activeOrder.some((id) => this.isBotPlayer(id))) return;

    const paceMs = Math.max(25, Math.round(300 * this.scale));
    this.botPaceTimer.set(paceMs, () => {
      if (this.finished) return;
      this.tickBots();
      this.scheduleBotPace();
    });
  }

  private tickBots(): void {
    if (this.finished) return;
    const now = Date.now();
    const bots = this.activeOrder.filter((id) => this.isBotPlayer(id));

    this.suppressBroadcast = true;
    this.dirtyDuringBatch = false;
    try {
      for (const botId of bots) {
        if (this.finished) return;

        const held = this.items.get(botId) ?? null;

        if (this.light === 'green') {
          if (held === 'shield' && !this.shieldedIds.has(botId) && this.ctx.rng() < 0.35) {
            this.action(botId, { type: 'dd_trick' });
            continue;
          }
          if (held === 'banana' && this.hasOpponentAhead(botId) && this.ctx.rng() < 0.3) {
            this.action(botId, { type: 'dd_trick' });
            continue;
          }
          if (this.ctx.rng() < 0.68) {
            this.action(botId, { type: 'dd_step' });
          }
        } else if (this.light === 'yellow') {
          if (this.ctx.rng() < 0.14) {
            this.action(botId, { type: 'dd_step' });
          }
        } else if (this.light === 'red') {
          if (this.caughtIds.has(botId)) continue;
          if (now - this.lightStartedAt < this.redGraceMs + 30) continue;

          // Bot chủ động bóp Còi Giả Đèn Xanh giữa lúc Đèn Đỏ để bẫy cả phòng!
          if (held === 'fake_green' && (!this.fakeSirenUntil || now >= this.fakeSirenUntil) && this.ctx.rng() < 0.25) {
            this.action(botId, { type: 'dd_trick' });
            continue;
          }

          // Nếu có người khác vừa bóp Còi Giả Đèn Xanh: 12% xác suất bot bị giật mình phạm quy!
          if (this.fakeSirenUntil && now < this.fakeSirenUntil && this.fakeSirenBy !== botId) {
            if (this.botCheckedSirenSeq.get(botId) !== this.fakeSirenSeq) {
              this.botCheckedSirenSeq.set(botId, this.fakeSirenSeq);
              if (this.ctx.rng() < 0.12) {
                this.action(botId, { type: 'dd_step' });
              }
            }
          }
        }
      }
    } finally {
      this.suppressBroadcast = false;
      if (this.dirtyDuringBatch && !this.finished) {
        this.dirtyDuringBatch = false;
        this.ctx.changed();
      }
    }
  }

  private hasOpponentAhead(playerId: string): boolean {
    const myProg = this.progress.get(playerId) ?? 0;
    for (const id of this.activeOrder) {
      if (id !== playerId && (this.progress.get(id) ?? 0) > Math.max(12, myProg)) {
        return true;
      }
    }
    return false;
  }

  private pickGiftItem(playerId: string): DenDoItem {
    const pool = this.shieldedIds.has(playerId)
      ? (['fake_green', 'banana'] as const)
      : DEN_DO_ITEMS;
    return pool[Math.floor(this.ctx.rng() * pool.length) % pool.length];
  }

  private advancePlayerProgress(playerId: string, delta: number): void {
    const pName = this.names.get(playerId) ?? playerId;
    const prev = this.progress.get(playerId) ?? 0;
    const next = Math.min(DEN_DO_GOAL_METERS, round1(prev + delta));
    this.progress.set(playerId, next);

    // Kiểm tra các mốc hộp quà 25m / 55m / 80m (mỗi mốc nhận lần đầu tiên vượt qua)
    const claimed = this.claimedMilestones.get(playerId);
    if (claimed) {
      for (const milestone of DEN_DO_GIFT_CHECKPOINTS) {
        if (next >= milestone && !claimed.has(milestone)) {
          claimed.add(milestone);
          if ((this.items.get(playerId) ?? null) === null) {
            const gift = this.pickGiftItem(playerId);
            this.items.set(playerId, gift);
            this.pushEvent(`🎁 ${pName} cán mốc ${milestone}m, lượm được đạo cụ bí mật!`);
          }
        }
      }
    }

    // Kiểm tra chạm vạch đích 100m
    if (next >= DEN_DO_GOAL_METERS) {
      if (!this.finishedOrder.includes(playerId)) {
        this.finishedOrder.push(playerId);
      }
      this.pushEvent(`🏁 VỀ ĐÍCH! ${pName} bứt tốc chạm vạch 100m đầu tiên!`);
      this.finishGame(
        playerId,
        `🚦 ${pName} bứt tốc thần sầu cán đích 100m vô địch Đèn Đỏ Đèn Xanh!`,
      );
      return;
    }

    this.notifyChanged();
  }

  private finishGame(championId: string | null, customHeadline: string | undefined): void {
    if (this.finished) return;
    this.finished = true;
    this.lightEndsAt = null;
    this.phaseTimer.clear();
    this.matchTimer.clear();
    this.botPaceTimer.clear();

    const sorted = [...this.order].sort((a, b) => {
      if (a === championId) return -1;
      if (b === championId) return 1;
      const fa = this.finishedOrder.indexOf(a);
      const fb = this.finishedOrder.indexOf(b);
      if (fa !== -1 && fb !== -1) return fa - fb;
      if (fa !== -1) return -1;
      if (fb !== -1) return 1;
      return (this.progress.get(b) ?? 0) - (this.progress.get(a) ?? 0);
    });

    let winnerIds: string[];
    if (championId) {
      winnerIds = [championId];
    } else if (sorted.length > 0) {
      const bestDist = this.progress.get(sorted[0]) ?? 0;
      winnerIds = bestDist > 0 ? sorted.filter((id) => (this.progress.get(id) ?? 0) === bestDist) : [sorted[0]];
    } else {
      winnerIds = [];
    }

    const winnerId = winnerIds[0] ?? null;
    const ranking = sorted.map((id) => {
      const dist = this.progress.get(id) ?? 0;
      const statusText =
        dist >= DEN_DO_GOAL_METERS
          ? '🏁 Cán đích 100m!'
          : id === winnerId
            ? `🏆 Dẫn đầu (${dist.toFixed(1)}m)`
            : `🏃 Đạt ${dist.toFixed(1)}m / 100m`;
      return {
        playerId: id,
        name: this.names.get(id) ?? id,
        detail: statusText,
      };
    });

    const winnerNames = winnerIds.map((id) => this.names.get(id) ?? id).join(' & ');
    const headline =
      customHeadline ??
      (winnerIds.length > 0
        ? `🚦 ${winnerNames} dẫn đầu đường đua Đèn Đỏ Đèn Xanh (${(this.progress.get(winnerIds[0]) ?? 0).toFixed(1)}m)!`
        : '🚦 Kết thúc ván Đèn Đỏ Đèn Xanh!');

    this.ctx.finish({
      winnerId,
      winnerIds,
      ranking,
      headline,
    });
  }

  action(playerId: string, action: GameAction | DenDoAction): ActionResult {
    if (this.finished) return { ok: false, reason: 'not_playing' };
    if (!this.order.includes(playerId)) return { ok: false, reason: 'not_playing' };

    const act = action as DenDoAction | GameAction;

    if (act.type === 'end') {
      if (playerId !== this.ctx.hostId()) return { ok: false, reason: 'not_host' };
      this.finishGame(null, '🏁 Chủ phòng đã kết thúc đường đua Đèn Đỏ Đèn Xanh!');
      return { ok: true };
    }

    if (act.type === 'dd_step') {
      const now = Date.now();
      const pName = this.names.get(playerId) ?? playerId;

      if (this.light === 'green' || this.light === 'yellow') {
        const last = this.lastStepAt.get(playerId) ?? 0;
        if (now - last < this.minStepMs) {
          return { ok: true };
        }
        this.lastStepAt.set(playerId, now);
        const stepMeters = this.light === 'green' ? DEN_DO_GREEN_STEP : DEN_DO_YELLOW_STEP;
        this.advancePlayerProgress(playerId, stepMeters);
        return { ok: true };
      }

      // Pha Đèn Đỏ ('red')
      if (this.caughtIds.has(playerId)) {
        return { ok: false, reason: 'not_your_turn' };
      }

      // Ân huệ 180ms đầu pha Đỏ bù độ trễ mạng 3G/4G
      if (now - this.lightStartedAt < this.redGraceMs) {
        return { ok: true };
      }

      if (now < (this.shieldGraceUntil.get(playerId) ?? 0)) {
        return { ok: true };
      }

      if (this.shieldedIds.has(playerId)) {
        this.shieldedIds.delete(playerId);
        this.shieldGraceUntil.set(playerId, now + 400);
        this.pushEvent(`🛡️ ${pName} lỡ chân lúc Đèn Đỏ nhưng Áo Tàng Hình đã chặn đứng tia Laser!`);
        this.notifyChanged();
        return { ok: true };
      }

      // Bị tia Laser bắt quả tang -> giật lùi -28m & khóa choáng hết pha Đỏ!
      this.caughtIds.add(playerId);
      const cur = this.progress.get(playerId) ?? 0;
      const penalized = Math.max(0, round1(cur - DEN_DO_RED_PENALTY));
      this.progress.set(playerId, penalized);
      this.pushEvent(
        `🚨 PHẠM QUY! Radar quét trúng ${pName} nhúc nhích lúc Đèn Đỏ — giật lùi -${DEN_DO_RED_PENALTY}m!`,
      );
      this.notifyChanged();
      return { ok: true };
    }

    if (act.type === 'dd_trick') {
      const item = this.items.get(playerId) ?? null;
      if (!item) {
        return { ok: false, reason: 'bad_action' };
      }

      this.items.set(playerId, null);
      const pName = this.names.get(playerId) ?? playerId;
      const now = Date.now();

      if (item === 'shield') {
        this.shieldedIds.add(playerId);
        this.pushEvent(`🛡️ ${pName} bật Áo Tàng Hình bảo hộ!`);
        this.notifyChanged();
        return { ok: true };
      }

      if (item === 'fake_green') {
        this.fakeSirenSeq++;
        this.fakeSirenBy = playerId;
        this.fakeSirenUntil = now + (this.scale < 1 ? Math.max(250, Math.round(DEN_DO_SIREN_MS * this.scale)) : DEN_DO_SIREN_MS);
        this.botCheckedSirenSeq.clear();
        this.pushEvent(`📣 AI ĐÓ HÔ GIẢ: «CHẠY ĐI KÌA BÀ CON ƠI!!» (${pName} bóp còi lừa tình!)`);
        this.notifyChanged();
        return { ok: true };
      }

      if (item === 'banana') {
        const candidates = this.activeOrder
          .filter((id) => id !== playerId)
          .sort((a, b) => (this.progress.get(b) ?? 0) - (this.progress.get(a) ?? 0));
        const targetId = candidates[0] ?? null;

        if (targetId) {
          const tName = this.names.get(targetId) ?? targetId;
          if (this.shieldedIds.has(targetId)) {
            this.shieldedIds.delete(targetId);
            this.pushEvent(`🍌 ${pName} quăng vỏ chuối vào ${tName}, nhưng Áo Tàng Hình 🛡️ đã đỡ đòn!`);
          } else {
            const cur = this.progress.get(targetId) ?? 0;
            this.progress.set(targetId, Math.max(0, round1(cur - DEN_DO_BANANA_PENALTY)));
            this.pushEvent(`🍌 TRƯỢT VỎ CHUỐI! ${pName} hại ${tName} té chổng vó (-${DEN_DO_BANANA_PENALTY}m)!`);
          }
        } else {
          this.pushEvent(`🍌 ${pName} quăng vỏ chuối ra đường đua!`);
        }

        this.notifyChanged();
        return { ok: true };
      }
    }

    return { ok: false, reason: 'bad_action' };
  }

  removePlayer(playerId: string): void {
    if (this.finished) return;
    const idx = this.activeOrder.indexOf(playerId);
    if (idx === -1) return;

    this.activeOrder.splice(idx, 1);
    this.caughtIds.delete(playerId);
    this.shieldedIds.delete(playerId);

    if (this.activeOrder.length === 0) {
      this.finishGame(null, '🚦 Kết thúc ván Đèn Đỏ Đèn Xanh!');
      return;
    }
    if (this.activeOrder.length === 1 && this.order.length > 1) {
      const survivor = this.activeOrder[0];
      const sName = this.names.get(survivor) ?? survivor;
      this.finishGame(survivor, `🏆 Đối thủ rời đường đua — ${sName} thắng Đèn Đỏ Đèn Xanh!`);
      return;
    }

    this.ctx.changed();
  }

  onPlayerConnection(_playerId: string, connected: boolean): void {
    if (!this.finished && connected) this.ctx.changed();
  }

  renamePlayer(playerId: string, name: string): void {
    if (this.names.has(playerId)) this.names.set(playerId, name);
  }

  botAction(playerId: string): DenDoAction | null {
    if (this.finished || !this.activeOrder.includes(playerId)) return null;

    const held = this.items.get(playerId) ?? null;
    const now = Date.now();

    if (this.light === 'green') {
      if (held === 'shield' && !this.shieldedIds.has(playerId)) {
        return { type: 'dd_trick' };
      }
      if (held === 'banana' && this.hasOpponentAhead(playerId)) {
        return { type: 'dd_trick' };
      }
      return { type: 'dd_step' };
    }

    if (this.light === 'red') {
      if (this.caughtIds.has(playerId)) return null;
      if (now - this.lightStartedAt < this.redGraceMs + 30) return null;

      if (held === 'fake_green' && (!this.fakeSirenUntil || now >= this.fakeSirenUntil)) {
        return { type: 'dd_trick' };
      }

      if (this.fakeSirenUntil && now < this.fakeSirenUntil && this.fakeSirenBy !== playerId) {
        if (this.botCheckedSirenSeq.get(playerId) !== this.fakeSirenSeq) {
          this.botCheckedSirenSeq.set(playerId, this.fakeSirenSeq);
          if (this.ctx.rng() < 0.12) {
            return { type: 'dd_step' };
          }
        }
      }
    }

    return null;
  }

  view(): DenDoView {
    const now = Date.now();
    const sirenActive = this.fakeSirenUntil !== null && now < this.fakeSirenUntil;
    return {
      type: 'den_do',
      light: this.light,
      lightEndsAt: this.lightEndsAt,
      lightSeconds: this.lightSeconds,
      round: this.round,
      maxRounds: this.maxRounds,
      progress: Object.fromEntries(this.progress),
      caughtIds: [...this.caughtIds],
      shieldedIds: [...this.shieldedIds],
      items: Object.fromEntries(this.items),
      fakeSirenBy: sirenActive ? this.fakeSirenBy : null,
      fakeSirenUntil: sirenActive ? this.fakeSirenUntil : null,
      finishedOrder: [...this.finishedOrder],
      lastEvents: [...this.lastEvents],
      order: [...this.order],
      names: Object.fromEntries(this.names),
    };
  }

  dispose(): void {
    this.phaseTimer.clear();
    this.matchTimer.clear();
    this.botPaceTimer.clear();
  }
}
