/**
 * Bầu cua tôm cá (xu ảo, nhà cái là máy):
 * - Đặt cược trong thời gian cho phép; hết giờ máy tự lắc (không ai lắc tay).
 * - Mở bát 3 viên: mỗi con trúng k lần thì ăn tiền cược × k, không trúng thì mất tiền cược.
 * - Hết xu thì được "vay nóng" 500 xu (bị ghi nợ). Chủ phòng bấm "Tổng kết" để kết thúc.
 */
import {
  BAUCUA_BET_SECONDS, BAUCUA_LOAN, BAUCUA_RESULT_SECONDS, BAUCUA_START, BAUCUA_SYMBOLS,
  type ActionResult, type BauCuaSymbol, type BauCuaView, type GameAction,
} from '../../../shared/src/types';
import { Timer, type EngineContext, type EnginePlayer, type GameEngine } from './engine';

const ROLL_MS = 2600;
const RESULT_MS = BAUCUA_RESULT_SECONDS * 1000;
const MAX_RECENT = 12;
const MAX_BET_PER_SYMBOL = 1_000_000;

type Bets = Partial<Record<BauCuaSymbol, number>>;

export class BauCuaGame implements GameEngine {
  private ids: string[] = [];
  private names: Record<string, string> = {};
  private balances: Record<string, number> = {};
  private debts: Record<string, number> = {};
  private bets: Record<string, Bets> = {};
  private round = 1;
  private step: BauCuaView['step'] = 'betting';
  private stepEndsAt = 0;
  private dice: BauCuaSymbol[] = [];
  private lastDeltas: Record<string, number> | null = null;
  private recent: BauCuaSymbol[][] = [];
  private over = false;
  private readonly timer = new Timer();
  private readonly betMs: number;

  constructor(private readonly ctx: EngineContext) {
    this.betMs = ctx.turnMs ?? BAUCUA_BET_SECONDS * 1000;
  }

  start(players: EnginePlayer[]): void {
    for (const p of players) {
      this.ids.push(p.id);
      this.names[p.id] = p.name;
      this.balances[p.id] = BAUCUA_START;
      this.debts[p.id] = 0;
      this.bets[p.id] = {};
    }
    this.beginBetting();
  }

  action(playerId: string, a: GameAction): ActionResult {
    if (this.over) return { ok: false, reason: 'not_playing' };
    if (!this.ids.includes(playerId)) return { ok: false, reason: 'not_playing' };
    switch (a.type) {
      case 'bet': {
        if (this.step !== 'betting') return { ok: false, reason: 'not_betting' };
        if (!BAUCUA_SYMBOLS.includes(a.symbol) || !Number.isInteger(a.amount) || a.amount <= 0) {
          return { ok: false, reason: 'bad_action' };
        }
        if (a.amount > this.available(playerId)) return { ok: false, reason: 'insufficient' };
        const mine = this.bets[playerId];
        mine[a.symbol] = Math.min(MAX_BET_PER_SYMBOL, (mine[a.symbol] ?? 0) + a.amount);
        this.ctx.changed();
        return { ok: true };
      }
      case 'clearBets':
        if (this.step !== 'betting') return { ok: false, reason: 'not_betting' };
        this.bets[playerId] = {};
        this.ctx.changed();
        return { ok: true };
      case 'loan':
        if (this.available(playerId) >= 10) return { ok: false, reason: 'loan_denied' };
        this.balances[playerId] += BAUCUA_LOAN;
        this.debts[playerId]++;
        this.ctx.changed();
        return { ok: true };
      case 'end':
        if (playerId !== this.ctx.hostId()) return { ok: false, reason: 'not_host' };
        this.end();
        return { ok: true };
      default:
        return { ok: false, reason: 'bad_action' };
    }
  }

  removePlayer(playerId: string): void {
    if (!this.ids.includes(playerId) || this.over) return;
    this.ids = this.ids.filter((id) => id !== playerId);
    delete this.bets[playerId];
    if (this.ids.length === 0) return this.end();
    this.ctx.changed();
  }

  view(): BauCuaView {
    const pick = <T,>(o: Record<string, T>) => Object.fromEntries(this.ids.map((id) => [id, o[id]]));
    return {
      type: 'baucua',
      round: this.round,
      step: this.step,
      stepEndsAt: this.stepEndsAt,
      dice: this.step === 'result' ? this.dice : null,
      balances: pick(this.balances),
      bets: pick(this.bets),
      lastDeltas: this.step === 'result' ? this.lastDeltas : null,
      debts: pick(this.debts),
      recent: this.recent,
      names: this.names,
    };
  }

  dispose(): void {
    this.timer.clear();
  }

  // ---------- nội bộ ----------

  /** Số xu còn đặt thêm được (xu hiện có trừ tiền đang cược) */
  private available(id: string): number {
    const staked = Object.values(this.bets[id] ?? {}).reduce((s, v) => s + (v ?? 0), 0);
    return this.balances[id] - staked;
  }

  private beginBetting(): void {
    this.step = 'betting';
    this.stepEndsAt = Date.now() + this.betMs;
    this.timer.set(this.betMs, () => this.beginRolling());
    this.ctx.changed();
  }

  private beginRolling(): void {
    this.step = 'rolling';
    // kết quả chốt ngay lúc lắc nhưng chỉ lộ ra khi mở bát
    this.dice = [0, 1, 2].map(() => BAUCUA_SYMBOLS[Math.floor(this.ctx.rng() * 6)]);
    this.stepEndsAt = Date.now() + ROLL_MS;
    this.timer.set(ROLL_MS, () => this.reveal());
    this.ctx.changed();
  }

  private reveal(): void {
    const deltas: Record<string, number> = {};
    for (const id of this.ids) {
      let d = 0;
      for (const [sym, amount] of Object.entries(this.bets[id] ?? {}) as [BauCuaSymbol, number][]) {
        const hits = this.dice.filter((x) => x === sym).length;
        d += hits > 0 ? amount * hits : -amount;
      }
      this.balances[id] += d;
      deltas[id] = d;
      this.bets[id] = {};
    }
    this.lastDeltas = deltas;
    this.recent.push([...this.dice]);
    if (this.recent.length > MAX_RECENT) this.recent.shift();
    this.step = 'result';
    this.stepEndsAt = Date.now() + RESULT_MS;
    this.timer.set(RESULT_MS, () => {
      this.round++;
      this.beginBetting();
    });
    this.ctx.changed();
  }

  private end(): void {
    if (this.over) return;
    this.over = true;
    this.timer.clear();
    const net = (id: string) => this.balances[id] - this.debts[id] * BAUCUA_LOAN;
    const ranked = Object.keys(this.names)
      .filter((id) => id in this.balances)
      .sort((a, b) => net(b) - net(a));
    const top = ranked.find((id) => this.ids.includes(id)) ?? null;
    const fmt = (n: number) => n.toLocaleString('vi-VN');
    this.ctx.finish({
      winnerId: top,
      headline: top ? `${this.names[top]} ôm trọn ${fmt(net(top))} xu!` : 'Sòng đã giải tán',
      ranking: ranked.map((id) => ({
        playerId: id,
        name: this.names[id],
        detail: `${fmt(net(id))} xu${this.debts[id] ? `, nợ ${this.debts[id]} lần` : ''}${this.ids.includes(id) ? '' : ', đã thoát'}`,
      })),
    });
  }
}
