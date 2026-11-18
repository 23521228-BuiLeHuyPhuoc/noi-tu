/**
 * Server Engine: Tinh Mắt Đập Nhanh (`tinh_mat`, 2–12 người).
 * Tất cả người chơi đua tay-mắt thời gian thực qua 3 chế độ luân phiên:
 * - Tìm Hình Trùng Khớp (`match_target`)
 * - Tìm Kẻ Khác Biệt Duy Nhất (`odd_one_out`)
 * - Săn Kho Báu — Cấm Chạm Bom 💣 (`avoid_bomb`)
 */
import {
  TINH_MAT_BOMB_EMOJI,
  TINH_MAT_BOMB_PENALTY,
  TINH_MAT_DEFAULT_ROUNDS,
  TINH_MAT_PLAY_MS,
  TINH_MAT_REVEAL_MS,
  TINH_MAT_SPEED_POINTS,
  TINH_MAT_STREAK_BONUS,
  TINH_MAT_STUN_MS,
  TINH_MAT_TREASURE_PTS,
  generateTinhMatPuzzle,
  type TinhMatAction,
  type TinhMatChallengeKind,
  type TinhMatGridCell,
  type TinhMatPhase,
  type TinhMatRoundHit,
  type TinhMatView,
} from '../../../shared/src/tinhmat';
import type { ActionResult, GameAction } from '../../../shared/src/types';
import { Timer, type EngineContext, type EnginePlayer, type GameEngine } from './engine';

type TinhMatSettingsCompat = { tinhMatRounds?: number };

export class TinhMatGame implements Omit<GameEngine, 'view' | 'botAction'> {
  readonly perPlayerView = false;

  private readonly maxRounds: number;
  private readonly playMs: number;
  private readonly revealMs: number;
  private readonly stunMs: number;
  private readonly botCooldownMs: number;

  private order: string[] = [];
  private activeOrder: string[] = [];
  private names = new Map<string, string>();
  private scores = new Map<string, number>();
  private streaks = new Map<string, number>();
  private stunnedUntil = new Map<string, number>();

  private round = 1;
  private phase: TinhMatPhase = 'playing';
  private phaseEndsAt: number | null = null;
  private phaseSeconds = 7;

  private challengeKind: TinhMatChallengeKind = 'match_target';
  private promptText = '';
  private targetEmoji: string | null = null;
  private bonusEmojis: string[] = [];
  private grid: TinhMatGridCell[] = [];
  private validCellIds = new Set<number>();
  private validHitCount = 0;
  private roundHits: TinhMatRoundHit[] = [];

  /** Điều tiết nhịp ra tay của Bot để nhường nhịp tự nhiên cho người chơi thật */
  private botNextReadyAt = new Map<string, number>();
  private botApprovedStep = new Map<string, string>();

  private finished = false;
  private readonly timer = new Timer();

  constructor(private readonly ctx: EngineContext) {
    const rawRounds = (ctx.settings as TinhMatSettingsCompat).tinhMatRounds ?? TINH_MAT_DEFAULT_ROUNDS;
    this.maxRounds = Math.max(1, Math.min(24, Math.floor(rawRounds) || TINH_MAT_DEFAULT_ROUNDS));

    this.playMs = ctx.turnMs ? Math.min(TINH_MAT_PLAY_MS, Math.max(250, ctx.turnMs)) : TINH_MAT_PLAY_MS;
    this.revealMs = ctx.turnMs
      ? Math.min(TINH_MAT_REVEAL_MS, Math.max(150, Math.floor(ctx.turnMs * 0.45)))
      : TINH_MAT_REVEAL_MS;
    this.stunMs = ctx.turnMs
      ? Math.min(TINH_MAT_STUN_MS, Math.max(120, Math.floor(ctx.turnMs * 0.35)))
      : TINH_MAT_STUN_MS;
    this.botCooldownMs = ctx.turnMs
      ? Math.min(950, Math.max(80, Math.floor(ctx.turnMs * 0.3)))
      : 950;
  }

  start(players: EnginePlayer[]): void {
    this.order = players.map((p) => p.id);
    this.activeOrder = [...this.order];
    for (const p of players) {
      this.names.set(p.id, p.name);
      this.scores.set(p.id, 0);
      this.streaks.set(p.id, 0);
      this.stunnedUntil.set(p.id, 0);
    }

    this.round = 1;
    this.startRound();
  }

  private getUnhitValidCells(): number[] {
    const out: number[] = [];
    for (const cellId of this.validCellIds) {
      const cell = this.grid[cellId];
      if (cell && cell.hitBy === null) out.push(cellId);
    }
    return out;
  }

  private startRound(): void {
    if (this.finished) return;
    if (this.activeOrder.length === 0) {
      this.finishAll('👀 Kết thúc ván Tinh Mắt Đập Nhanh!');
      return;
    }

    const puzzle = generateTinhMatPuzzle(this.round, this.activeOrder.length, this.ctx.rng);
    this.challengeKind = puzzle.challengeKind;
    this.promptText = puzzle.promptText;
    this.targetEmoji = puzzle.targetEmoji;
    this.bonusEmojis = puzzle.bonusEmojis;
    this.grid = puzzle.emojis.map((emoji, id) => ({
      id,
      emoji,
      hitBy: null,
    }));
    this.validCellIds = puzzle.validCellIds;
    this.validHitCount = 0;
    this.roundHits = [];
    this.botApprovedStep.clear();

    // Xóa trạng thái choáng cũ khi bước sang vòng mới để mọi người xuất phát công bằng
    for (const id of this.order) {
      this.stunnedUntil.set(id, 0);
      this.botNextReadyAt.set(id, 0);
    }

    this.phase = 'playing';
    this.phaseSeconds = Math.max(1, Math.round(this.playMs / 1000));
    this.phaseEndsAt = Date.now() + this.playMs;
    this.timer.set(this.playMs, () => this.enterReveal());
    this.ctx.changed();
  }

  private enterReveal(): void {
    if (this.finished || this.phase === 'reveal') return;
    this.phase = 'reveal';
    this.phaseSeconds = Math.max(1, Math.round(this.revealMs / 1000));
    this.phaseEndsAt = Date.now() + this.revealMs;

    this.timer.set(this.revealMs, () => {
      if (this.finished) return;
      if (this.round >= this.maxRounds) {
        this.finishAll();
      } else {
        this.round++;
        this.startRound();
      }
    });

    this.ctx.changed();
  }

  private finishAll(customHeadline?: string): void {
    if (this.finished) return;
    this.finished = true;
    this.phaseEndsAt = null;
    this.timer.clear();

    const sorted = [...this.order].sort((a, b) => {
      const diff = (this.scores.get(b) ?? 0) - (this.scores.get(a) ?? 0);
      if (diff !== 0) return diff;
      return (this.streaks.get(b) ?? 0) - (this.streaks.get(a) ?? 0);
    });

    const topScore = sorted.length > 0 ? (this.scores.get(sorted[0]) ?? 0) : 0;
    const winnerIds = sorted.filter((id) => (this.scores.get(id) ?? 0) === topScore);

    const ranking = sorted.map((id) => {
      const sc = this.scores.get(id) ?? 0;
      const st = this.streaks.get(id) ?? 0;
      const streakNote = st >= 2 ? ` · 🔥 Chuỗi ${st}` : '';
      return {
        playerId: id,
        name: this.names.get(id) ?? id,
        detail: `${sc.toLocaleString('vi-VN')} điểm${streakNote}`,
      };
    });

    const winnerNames = winnerIds.map((id) => this.names.get(id) ?? id).join(' & ');
    const headline =
      customHeadline ??
      (winnerIds.length > 0
        ? `👀 ${winnerNames} mắt đại bàng tay sấm sét vô địch Tinh Mắt (${topScore.toLocaleString('vi-VN')}đ)!`
        : '👀 Kết thúc ván Tinh Mắt Đập Nhanh!');

    this.ctx.finish({
      winnerId: winnerIds[0] ?? null,
      winnerIds,
      ranking,
      headline,
    });
  }

  action(playerId: string, action: GameAction | TinhMatAction): ActionResult {
    if (this.finished) return { ok: false, reason: 'not_playing' };
    if (!this.order.includes(playerId)) return { ok: false, reason: 'not_playing' };

    const act = action as TinhMatAction | GameAction;

    if (act.type === 'end') {
      if (playerId !== this.ctx.hostId()) return { ok: false, reason: 'not_host' };
      this.finishAll('🏁 Chủ phòng đã kết thúc ván Tinh Mắt Đập Nhanh!');
      return { ok: true };
    }

    if (act.type === 'tm_tap') {
      if (this.phase !== 'playing') {
        return { ok: false, reason: 'not_your_turn' };
      }
      if (!Number.isInteger(act.cellId) || act.cellId < 0 || act.cellId >= this.grid.length) {
        return { ok: false, reason: 'bad_action' };
      }

      const now = Date.now();
      const stunEnd = this.stunnedUntil.get(playerId) ?? 0;
      if (now < stunEnd) {
        return { ok: false, reason: 'not_your_turn' };
      }

      const cell = this.grid[act.cellId];
      if (!cell || cell.hitBy !== null) {
        return { ok: false, reason: 'cell_occupied' };
      }

      const pName = this.names.get(playerId) ?? playerId;

      // Đập trúng ô mục tiêu hợp lệ!
      if (this.validCellIds.has(act.cellId)) {
        cell.hitBy = playerId;

        const prevStreak = this.streaks.get(playerId) ?? 0;
        const nextStreak = prevStreak + 1;
        this.streaks.set(playerId, nextStreak);

        const basePts =
          this.challengeKind === 'avoid_bomb'
            ? TINH_MAT_TREASURE_PTS
            : (TINH_MAT_SPEED_POINTS[this.validHitCount] ?? TINH_MAT_SPEED_POINTS[3]);
        const streakBonus = prevStreak * TINH_MAT_STREAK_BONUS;
        const delta = basePts + streakBonus;

        this.validHitCount++;
        this.scores.set(playerId, (this.scores.get(playerId) ?? 0) + delta);
        this.roundHits.push({
          playerId,
          name: pName,
          cellId: act.cellId,
          emoji: cell.emoji,
          delta,
          ok: true,
        });

        if (this.ctx.isBot?.(playerId) || playerId.startsWith('bot-')) {
          this.botNextReadyAt.set(playerId, now + this.botCooldownMs);
          this.botApprovedStep.delete(playerId);
        }

        // Nếu toàn bộ mục tiêu đúng đã bị đập sạch -> chuyển thẳng sang reveal!
        if (this.getUnhitValidCells().length === 0) {
          this.timer.clear();
          this.enterReveal();
        } else {
          this.ctx.changed();
        }
        return { ok: true };
      }

      // Đập sai ô (wrong_tile): choáng 1.3s + reset streak (nếu chạm Bom 💣 ở avoid_bomb thì trừ thêm 60đ)
      this.streaks.set(playerId, 0);
      this.stunnedUntil.set(playerId, now + this.stunMs);

      let delta = 0;
      if (this.challengeKind === 'avoid_bomb' && cell.emoji === TINH_MAT_BOMB_EMOJI) {
        cell.hitBy = playerId;
        const curScore = this.scores.get(playerId) ?? 0;
        this.scores.set(playerId, Math.max(0, curScore - TINH_MAT_BOMB_PENALTY));
        delta = -TINH_MAT_BOMB_PENALTY;
      }

      this.roundHits.push({
        playerId,
        name: pName,
        cellId: act.cellId,
        emoji: cell.emoji,
        delta,
        ok: false,
      });

      this.ctx.changed();
      return { ok: true };
    }

    return { ok: false, reason: 'bad_action' };
  }

  removePlayer(playerId: string): void {
    if (this.finished) return;
    const idx = this.activeOrder.indexOf(playerId);
    if (idx === -1) return;

    this.activeOrder.splice(idx, 1);
    if (this.activeOrder.length === 0) {
      this.finishAll('👀 Kết thúc ván Tinh Mắt Đập Nhanh!');
      return;
    }
    if (this.activeOrder.length === 1 && this.order.length > 1) {
      const survivor = this.activeOrder[0];
      const sName = this.names.get(survivor) ?? survivor;
      this.scores.set(survivor, (this.scores.get(survivor) ?? 0) + 100);
      this.finishAll(`🏆 Đối thủ rời bàn — ${sName} thắng Tinh Mắt Đập Nhanh!`);
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

  botAction(playerId: string): TinhMatAction | null {
    if (this.finished || this.phase !== 'playing' || !this.activeOrder.includes(playerId)) {
      return null;
    }

    const now = Date.now();
    if (now < (this.stunnedUntil.get(playerId) ?? 0)) return null;
    if (now < (this.botNextReadyAt.get(playerId) ?? 0)) return null;

    const unhit = this.getUnhitValidCells();
    if (unhit.length === 0) return null;

    const stepKey = `${this.round}:${this.validHitCount}`;
    if (this.botApprovedStep.get(playerId) !== stepKey) {
      // 82% xác suất đập đúng 1 ô hợp lệ, 18% xác suất đợi thêm / nhường nhịp cho người chơi thật!
      if (this.ctx.rng() >= 0.82) {
        this.botNextReadyAt.set(playerId, now + this.botCooldownMs);
        return null;
      }
      this.botApprovedStep.set(playerId, stepKey);
    }

    const cellId = unhit[Math.floor(this.ctx.rng() * unhit.length) % unhit.length];
    return { type: 'tm_tap', cellId };
  }

  view(): TinhMatView {
    const isReveal = this.phase === 'reveal';
    return {
      type: 'tinh_mat',
      round: this.round,
      maxRounds: this.maxRounds,
      phase: this.phase,
      phaseEndsAt: this.phaseEndsAt,
      phaseSeconds: this.phaseSeconds,
      challengeKind: this.challengeKind,
      promptText: this.promptText,
      targetEmoji: this.targetEmoji,
      bonusEmojis: [...this.bonusEmojis],
      grid: this.grid.map((c) => ({
        id: c.id,
        emoji: c.emoji,
        hitBy: c.hitBy,
        ...(isReveal && this.validCellIds.has(c.id) ? { isTarget: true } : {}),
      })),
      scores: Object.fromEntries(this.scores),
      streaks: Object.fromEntries(this.streaks),
      stunnedUntil: Object.fromEntries(this.stunnedUntil),
      roundHits: [...this.roundHits],
      order: [...this.order],
      names: Object.fromEntries(this.names),
    };
  }

  dispose(): void {
    this.timer.clear();
  }
}
