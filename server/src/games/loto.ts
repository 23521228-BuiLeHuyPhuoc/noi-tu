/**
 * Server Engine: Lô Tô Hội Chợ Xóm Lầy (`loto`, 2–12 người).
 */
import {
  LOTO_MAX,
  LOTO_MIN,
  LOTO_RHYMES,
  LOTO_TICKET_COLORS,
  checkLotoRow,
  generateLotoTicket,
  type LotoGrid,
  type LotoTicketColor,
  type LotoView,
} from '../../../shared/src/loto';
import type { ActionResult, GameAction } from '../../../shared/src/types';
import { Timer, type EngineContext, type EnginePlayer, type GameEngine } from './engine';

const DEFAULT_CALL_INTERVAL_MS = 3200;

export class LotoGame implements GameEngine {
  private order: string[] = [];
  private names = new Map<string, string>();
  private ticketColors = new Map<string, LotoTicketColor>();
  private tickets = new Map<string, LotoGrid>();
  private ticketNumSets = new Map<string, Set<number>>();
  private marked = new Map<string, Set<number>>();
  private penaltyUntilCount = new Map<string, number>();

  private deck: number[] = [];
  private called: number[] = [];
  private calledSet = new Set<number>();
  private waitingIds: string[] = [];

  private status: 'calling' | 'ended' = 'calling';
  private readonly callIntervalMs: number;
  private readonly autoMark: boolean;
  private nextCallAt: number | null = null;
  private currentNum: number | null = null;
  private currentChant: string | null = null;
  private winnerId: string | null = null;
  private winningRow: number | null = null;
  private lastEvent: string | null = '🎪 Đoàn Lô Tô Hội Chợ lên đèn — Chuẩn bị lắc lồng cầu!';

  private finished = false;
  private readonly timer = new Timer();

  constructor(private readonly ctx: EngineContext) {
    this.callIntervalMs = ctx.turnMs
      ? Math.max(120, Math.floor(ctx.turnMs / 4))
      : DEFAULT_CALL_INTERVAL_MS;
    this.autoMark = Boolean(ctx.settings.lotoAutoMark ?? false);
  }

  private extractTicketNumbers(grid: LotoGrid): Set<number> {
    const nums = new Set<number>();
    for (const row of grid) {
      for (const cell of row) {
        if (typeof cell === 'number') nums.add(cell);
      }
    }
    return nums;
  }

  start(players: EnginePlayer[]): void {
    this.order = players.map((p) => p.id);
    players.forEach((p, i) => {
      this.names.set(p.id, p.name);
      this.ticketColors.set(p.id, LOTO_TICKET_COLORS[i % LOTO_TICKET_COLORS.length]);
      const grid = generateLotoTicket(this.ctx.rng);
      this.tickets.set(p.id, grid);
      this.ticketNumSets.set(p.id, this.extractTicketNumbers(grid));
      this.marked.set(p.id, new Set<number>());
    });

    const balls: number[] = [];
    for (let n = LOTO_MIN; n <= LOTO_MAX; n++) balls.push(n);
    for (let i = balls.length - 1; i > 0; i--) {
      const j = Math.floor(this.ctx.rng() * (i + 1)) % (i + 1);
      [balls[i], balls[j]] = [balls[j], balls[i]];
    }
    this.deck = balls;

    const firstDelay = Math.min(1000, this.callIntervalMs);
    this.nextCallAt = Date.now() + firstDelay;
    this.timer.set(firstDelay, () => this.callNextNumber());
    this.ctx.changed();
  }

  private recomputeWaiting(): string[] {
    const nextWaiting: string[] = [];
    for (const id of this.order) {
      const grid = this.tickets.get(id);
      if (!grid) continue;
      for (let r = 0; r < 3; r++) {
        const { hits } = checkLotoRow(grid, r, this.calledSet);
        if (hits >= 4) {
          nextWaiting.push(id);
          break;
        }
      }
    }
    return nextWaiting;
  }

  private callNextNumber(): void {
    if (this.finished || this.status !== 'calling') return;

    const num = this.deck.pop();
    if (num === undefined) {
      this.autoFinishExhausted();
      return;
    }

    this.called.push(num);
    this.calledSet.add(num);

    const rhyme = LOTO_RHYMES[num];
    this.currentNum = num;
    this.currentChant = rhyme ? rhyme.chant : `Cờ ra con số ${num}!`;

    if (this.autoMark) {
      for (const id of this.order) {
        if (this.ticketNumSets.get(id)?.has(num)) {
          this.marked.get(id)?.add(num);
        }
      }
    }

    const prevWaiting = new Set(this.waitingIds);
    this.waitingIds = this.recomputeWaiting();
    const newlyWaiting = this.waitingIds.filter((id) => !prevWaiting.has(id));
    if (newlyWaiting.length > 0) {
      const namesStr = newlyWaiting.map((id) => this.names.get(id) ?? id).join(', ');
      this.lastEvent = `🔥 ${namesStr} đang ĐỢI (4/5 số)! Cả phòng nín thở!`;
    }

    if (this.deck.length === 0) {
      // Đã gọi hết con số thứ 90: cho thêm 1 nhịp để bấm Kinh trước khi tự tổng kết
      this.nextCallAt = Date.now() + this.callIntervalMs;
      this.timer.set(this.callIntervalMs, () => this.autoFinishExhausted());
    } else {
      this.nextCallAt = Date.now() + this.callIntervalMs;
      this.timer.set(this.callIntervalMs, () => this.callNextNumber());
    }

    this.ctx.changed();
  }

  private bestRowProgress(playerId: string): { bestHits: number; bestRow: number; totalHits: number } {
    const grid = this.tickets.get(playerId);
    if (!grid) return { bestHits: 0, bestRow: 0, totalHits: 0 };
    let bestHits = 0;
    let bestRow = 0;
    let totalHits = 0;
    for (let r = 0; r < 3; r++) {
      const { hits } = checkLotoRow(grid, r, this.calledSet);
      totalHits += hits;
      if (hits > bestHits) {
        bestHits = hits;
        bestRow = r;
      }
    }
    return { bestHits, bestRow, totalHits };
  }

  private finishGame(winnerId: string | null, winningRow: number | null, headline: string): void {
    if (this.finished) return;
    this.finished = true;
    this.status = 'ended';
    this.winnerId = winnerId;
    this.winningRow = winningRow;
    this.nextCallAt = null;
    this.timer.clear();

    const sorted = [...this.order].sort((a, b) => {
      if (a === winnerId) return -1;
      if (b === winnerId) return 1;
      const pa = this.bestRowProgress(a);
      const pb = this.bestRowProgress(b);
      if (pb.bestHits !== pa.bestHits) return pb.bestHits - pa.bestHits;
      return pb.totalHits - pa.totalHits;
    });

    const ranking = sorted.map((id) => {
      const prog = this.bestRowProgress(id);
      if (id === winnerId && winningRow !== null) {
        const rowNums = checkLotoRow(this.tickets.get(id)!, winningRow, this.calledSet).nums;
        return {
          playerId: id,
          name: this.names.get(id) ?? id,
          detail: `🏆 KINH hàng ${winningRow + 1} (${rowNums.join(' · ')})`,
        };
      }
      return {
        playerId: id,
        name: this.names.get(id) ?? id,
        detail: `Hàng cao nhất ${prog.bestHits}/5 · Tổng trúng ${prog.totalHits}/15 số`,
      };
    });

    const winnerIds = winnerId ? [winnerId] : [];
    this.ctx.finish({
      winnerId,
      winnerIds,
      ranking,
      headline,
    });
  }

  private autoFinishExhausted(): void {
    if (this.finished) return;
    if (this.order.length === 0) {
      this.finishGame(null, null, '🎪 Kết thúc ván Lô Tô Hội Chợ!');
      return;
    }

    // Ưu tiên người đã chấm đủ nhiều số nhất trên hàng hoàn chỉnh, hoặc người đầu tiên có hàng 5/5
    let bestId = this.order[0];
    let bestRow = 0;
    let bestMarkedOnRow = -1;

    for (const id of this.order) {
      const grid = this.tickets.get(id);
      const mk = this.marked.get(id);
      if (!grid) continue;
      for (let r = 0; r < 3; r++) {
        const full = checkLotoRow(grid, r, this.calledSet);
        if (!full.validKinh) continue;
        const markedHits = mk ? checkLotoRow(grid, r, this.calledSet, mk).hits : full.hits;
        if (markedHits > bestMarkedOnRow) {
          bestMarkedOnRow = markedHits;
          bestId = id;
          bestRow = r;
        }
      }
    }

    const mk = this.marked.get(bestId);
    const grid = this.tickets.get(bestId);
    if (mk && grid) {
      for (const n of checkLotoRow(grid, bestRow, this.calledSet).nums) mk.add(n);
    }
    const wName = this.names.get(bestId) ?? bestId;
    this.lastEvent = `🎊 Đã gọi trọn 90 con số! ${wName} thắng giải đặc biệt Lô Tô!`;
    this.finishGame(bestId, bestRow, `🎪 ${wName} thắng Lô Tô Hội Chợ sau 90 lượt quay lồng cầu!`);
  }

  action(playerId: string, action: GameAction): ActionResult {
    if (this.finished || this.status !== 'calling') return { ok: false, reason: 'not_playing' };
    if (!this.order.includes(playerId)) return { ok: false, reason: 'not_playing' };

    if (action.type === 'end') {
      if (playerId !== this.ctx.hostId()) return { ok: false, reason: 'not_host' };
      const sorted = [...this.order].sort((a, b) => this.bestRowProgress(b).bestHits - this.bestRowProgress(a).bestHits);
      const topId = sorted[0] ?? null;
      const topProg = topId ? this.bestRowProgress(topId) : null;
      const topWin = topId && topProg && topProg.bestHits === 5 ? topId : null;
      this.finishGame(
        topWin,
        topWin && topProg ? topProg.bestRow : null,
        topWin
          ? `🎪 Chủ phòng tổng kết — ${this.names.get(topWin)} dẫn đầu Lô Tô!`
          : '🎪 Chủ phòng đã khép màn đêm hội Lô Tô!',
      );
      return { ok: true };
    }

    if (action.type === 'loto_mark') {
      if (!Number.isInteger(action.num) || action.num < LOTO_MIN || action.num > LOTO_MAX) {
        return { ok: false, reason: 'bad_action' };
      }
      const myNums = this.ticketNumSets.get(playerId);
      if (!myNums || !myNums.has(action.num) || !this.calledSet.has(action.num)) {
        return { ok: false, reason: 'bad_action' };
      }
      const mk = this.marked.get(playerId)!;
      if (!mk.has(action.num)) {
        mk.add(action.num);
        this.ctx.changed();
      }
      return { ok: true };
    }

    if (action.type === 'loto_kinh') {
      if (action.row !== 0 && action.row !== 1 && action.row !== 2) {
        return { ok: false, reason: 'bad_action' };
      }

      const lockUntil = this.penaltyUntilCount.get(playerId) ?? 0;
      if (this.called.length < lockUntil) {
        return { ok: false, reason: 'kinh_locked' };
      }

      const grid = this.tickets.get(playerId);
      if (!grid) return { ok: false, reason: 'bad_action' };

      const check = checkLotoRow(grid, action.row, this.calledSet);
      if (!check.validKinh) {
        this.penaltyUntilCount.set(playerId, this.called.length + 2);
        this.lastEvent = `🤡 ${this.names.get(playerId) ?? playerId} HÔ KINH HỤT QUÊ ĐỘ! Bị khóa còi Kinh 2 lượt gọi!`;
        this.ctx.changed();
        return { ok: false, reason: 'kinh_false' };
      }

      // Đảm bảo tô sáng trọn bộ 5 con số chiến thắng trên tờ vé
      const mk = this.marked.get(playerId);
      if (mk) {
        for (const n of check.nums) mk.add(n);
      }

      const wName = this.names.get(playerId) ?? playerId;
      this.lastEvent = `🎉 ${wName} HÔ KINH RỰC RỠ ở hàng ${action.row + 1} (${check.nums.join(' - ')})!`;
      this.finishGame(
        playerId,
        action.row,
        `🎪 KINH RỒI BÀ CON ƠI! ${wName} ẵm trọn giải độc đắc Lô Tô (${check.nums.join(' · ')})!`,
      );
      return { ok: true };
    }

    return { ok: false, reason: 'bad_action' };
  }

  removePlayer(playerId: string): void {
    if (this.finished || !this.order.includes(playerId)) return;
    this.order = this.order.filter((id) => id !== playerId);
    this.waitingIds = this.waitingIds.filter((id) => id !== playerId);
    if (this.order.length === 0) {
      this.finishGame(null, null, '🎪 Đêm hội Lô Tô kết thúc!');
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

  botAction(playerId: string): GameAction | null {
    if (this.finished || this.status !== 'calling' || !this.order.includes(playerId)) return null;
    const grid = this.tickets.get(playerId);
    if (!grid) return null;

    // 1. Hô Kinh ngay lập tức khi có hàng đủ 5/5 số đã gọi (và không bị phạt khóa)
    const lockUntil = this.penaltyUntilCount.get(playerId) ?? 0;
    if (this.called.length >= lockUntil) {
      for (const r of [0, 1, 2] as const) {
        if (checkLotoRow(grid, r, this.calledSet).validKinh) {
          return { type: 'loto_kinh', row: r };
        }
      }
    }

    // 2. Nếu phòng tắt tự chấm, máy tự chấm các số đã gọi trên tờ vé của mình
    if (!this.autoMark) {
      const mk = this.marked.get(playerId);
      const myNums = this.ticketNumSets.get(playerId);
      if (mk && myNums) {
        for (const n of myNums) {
          if (this.calledSet.has(n) && !mk.has(n)) {
            return { type: 'loto_mark', num: n };
          }
        }
      }
    }

    return null;
  }

  view(): LotoView {
    return {
      type: 'loto',
      status: this.status,
      callIntervalMs: this.callIntervalMs,
      nextCallAt: this.nextCallAt,
      order: [...this.order],
      names: Object.fromEntries(this.names),
      ticketColors: Object.fromEntries(this.order.map((id) => [id, this.ticketColors.get(id) ?? 'rose'])),
      tickets: Object.fromEntries(this.order.map((id) => [id, this.tickets.get(id) ?? []])),
      marked: Object.fromEntries(this.order.map((id) => [id, [...(this.marked.get(id) ?? [])]])),
      waitingIds: [...this.waitingIds],
      penaltyUntilCount: Object.fromEntries(this.penaltyUntilCount),
      called: [...this.called],
      currentNum: this.currentNum,
      currentChant: this.currentChant,
      remainingCount: this.deck.length,
      autoMark: this.autoMark,
      winnerId: this.winnerId,
      winningRow: this.winningRow,
      lastEvent: this.lastEvent,
    };
  }

  dispose(): void {
    this.timer.clear();
  }
}
