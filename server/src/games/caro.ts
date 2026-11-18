/**
 * Server Engine: Cờ Caro Đại Chiến (`caro` — tự động mở rộng bàn cờ 15×15 / 22×22 / 28×28 / 32×32 theo số phe 2–4 người).
 */
import {
  CARO_SIZE,
  CARO_SYMBOLS,
  caroSizeForPlayers,
  checkCaroWin,
  pickCaroBotMove,
  type CaroMove,
  type CaroSizeMode,
  type CaroSymbol,
  type CaroView,
} from '../../../shared/src/caro';
import { DISRUPT_MAX_BONUS_MS, type ActionResult, type GameAction } from '../../../shared/src/types';
import { Timer, type EngineContext, type EnginePlayer, type GameEngine } from './engine';

const DEFAULT_TURN_SECONDS = 25;
const DEFAULT_WIN_REVEAL_MS = 4500;

export class CaroGame implements GameEngine {
  private size = CARO_SIZE;
  private readonly sizeMode: CaroSizeMode;
  private readonly blockTwoEnds: boolean;
  private readonly turnMs: number;
  private readonly revealMs: number;

  private order: string[] = [];
  private activeOrder: string[] = [];
  private names = new Map<string, string>();
  private symbols = new Map<string, CaroSymbol>();
  private stoneCounts = new Map<string, number>();

  private board: (CaroSymbol | null)[] = Array<CaroSymbol | null>(CARO_SIZE * CARO_SIZE).fill(null);
  private turnIdx = 0;
  private turnEndsAt: number | null = null;
  private turnSeconds = DEFAULT_TURN_SECONDS;
  private turnBonusMs = 0;

  private lastMove: CaroMove | null = null;
  private moveCount = 0;
  private winLine: [number, number][] | null = null;
  private winnerId: string | null = null;
  private isDraw = false;
  private revealEndsAt: number | null = null;
  private pendingFinish: { winnerId: string | null; isDraw: boolean; headline: string } | null = null;

  private finished = false;
  private readonly timer = new Timer();

  constructor(private readonly ctx: EngineContext) {
    this.blockTwoEnds = ctx.settings.caroBlockTwoEnds ?? true;
    const rawMode = (ctx.settings as { caroSizeMode?: CaroSizeMode }).caroSizeMode;
    this.sizeMode = rawMode === 'mega' ? 'mega' : 'auto';
    const defMs = DEFAULT_TURN_SECONDS * 1000;
    this.turnMs = ctx.turnMs ? Math.min(defMs, Math.max(250, ctx.turnMs)) : defMs;
    const explicitReveal = ctx.settings.caroRevealMs;
    if (typeof explicitReveal === 'number' && Number.isFinite(explicitReveal)) {
      this.revealMs = Math.max(0, explicitReveal);
    } else {
      // Trong các test nhanh (`turnMs < 1500`) vẫn giữ kết thúc tức thì; phòng chơi thực tế dừng 4.5s khoe đường 5 quân thắng
      this.revealMs = !ctx.turnMs || ctx.turnMs >= 1500 ? DEFAULT_WIN_REVEAL_MS : 0;
    }
  }

  private get currentPlayerId(): string | null {
    if (this.finished || this.pendingFinish || this.activeOrder.length === 0) return null;
    return this.activeOrder[this.turnIdx] ?? null;
  }

  start(players: EnginePlayer[]): void {
    const capped = players.slice(0, CARO_SYMBOLS.length);
    this.size = caroSizeForPlayers(capped.length, this.sizeMode);
    this.order = capped.map((p) => p.id);
    this.activeOrder = [...this.order];

    capped.forEach((p, i) => {
      this.names.set(p.id, p.name);
      this.symbols.set(p.id, CARO_SYMBOLS[i]);
      this.stoneCounts.set(p.id, 0);
    });

    this.board = Array<CaroSymbol | null>(this.size * this.size).fill(null);
    this.turnIdx = 0;
    this.moveCount = 0;
    this.lastMove = null;
    this.winLine = null;
    this.winnerId = null;
    this.isDraw = false;

    this.beginTurn();
  }

  private beginTurn(): void {
    if (this.finished) return;
    if (this.activeOrder.length === 0) {
      this.finishGame(null, false, '🏁 Kết thúc ván Cờ Caro!');
      return;
    }
    if (this.activeOrder.length === 1 && this.order.length > 1) {
      const survivor = this.activeOrder[0];
      this.winnerId = survivor;
      this.finishGame(survivor, false, `🏆 Đối thủ rời bàn — ${this.names.get(survivor) ?? survivor} thắng Cờ Caro!`);
      return;
    }

    const curId = this.activeOrder[this.turnIdx];
    this.turnBonusMs = 0;
    this.turnSeconds = Math.max(1, Math.round(this.turnMs / 1000));
    this.turnEndsAt = Date.now() + this.turnMs;
    this.timer.set(this.turnMs, () => this.onTurnTimeout(curId));
    this.ctx.changed();
  }

  private onTurnTimeout(expectedPlayerId: string): void {
    if (this.finished || this.currentPlayerId !== expectedPlayerId) return;
    const sym = this.symbols.get(expectedPlayerId);
    if (!sym) return;
    const mv = pickCaroBotMove(this.board, this.size, sym, this.blockTwoEnds, this.ctx.rng);
    this.applyMove(expectedPlayerId, mv.row, mv.col);
  }

  private applyMove(playerId: string, row: number, col: number): void {
    if (this.finished) return;
    const idx = row * this.size + col;
    if (row < 0 || row >= this.size || col < 0 || col >= this.size || this.board[idx] !== null) {
      return;
    }

    this.timer.clear();
    const sym = this.symbols.get(playerId)!;
    this.board[idx] = sym;
    this.moveCount++;
    this.stoneCounts.set(playerId, (this.stoneCounts.get(playerId) ?? 0) + 1);
    this.lastMove = {
      row,
      col,
      playerId,
      symbol: sym,
      moveNum: this.moveCount,
    };

    const won = checkCaroWin(this.board, this.size, row, col, this.blockTwoEnds);
    if (won) {
      this.winLine = won;
      this.winnerId = playerId;
      this.turnEndsAt = null;
      const wName = this.names.get(playerId) ?? playerId;
      const headline = `❌⭕ ${wName} (${sym}) nối ${won.length} tuyệt đẹp hạ gục bàn cờ sau ${this.moveCount} nước!`;
      if (this.revealMs > 0) {
        this.pendingFinish = { winnerId: playerId, isDraw: false, headline };
        this.revealEndsAt = Date.now() + this.revealMs;
        this.timer.set(this.revealMs, () => this.commitPendingFinish());
        this.ctx.changed();
        return;
      }
      this.finishGame(playerId, false, headline);
      return;
    }

    if (this.moveCount >= this.size * this.size) {
      this.isDraw = true;
      this.turnEndsAt = null;
      this.finishGame(
        null,
        true,
        `🤝 Kín sạch ${this.size * this.size} ô bàn cờ (${this.size}×${this.size}) — Ván Cờ Caro bất phân thắng bại!`,
      );
      return;
    }

    this.turnIdx = (this.turnIdx + 1) % this.activeOrder.length;
    this.beginTurn();
  }

  private commitPendingFinish(): void {
    const pf = this.pendingFinish;
    if (!pf || this.finished) return;
    this.pendingFinish = null;
    this.revealEndsAt = null;
    this.finishGame(pf.winnerId, pf.isDraw, pf.headline);
  }

  private finishGame(winnerId: string | null, isDraw: boolean, headline: string): void {
    if (this.finished) return;
    this.finished = true;
    this.pendingFinish = null;
    this.revealEndsAt = null;
    this.winnerId = winnerId;
    this.isDraw = isDraw;
    this.turnEndsAt = null;
    this.timer.clear();

    const activeSet = new Set(this.activeOrder);
    const sorted = [...this.order].sort((a, b) => {
      if (a === winnerId) return -1;
      if (b === winnerId) return 1;
      const actDiff = (activeSet.has(b) ? 1 : 0) - (activeSet.has(a) ? 1 : 0);
      if (actDiff !== 0) return actDiff;
      return (this.stoneCounts.get(b) ?? 0) - (this.stoneCounts.get(a) ?? 0);
    });

    const ranking = sorted.map((id) => {
      const sym = this.symbols.get(id) ?? 'X';
      const stones = this.stoneCounts.get(id) ?? 0;
      const statusLabel =
        id === winnerId
          ? '🏆 Chiến thắng'
          : isDraw
            ? '🤝 Hòa'
            : !activeSet.has(id)
              ? '🏳️ Rời bàn'
              : `${stones} quân`;
      return {
        playerId: id,
        name: this.names.get(id) ?? id,
        detail: `Quân ${sym} · ${statusLabel} (${stones} nước)`,
      };
    });

    this.ctx.finish({
      winnerId,
      winnerIds: winnerId ? [winnerId] : [],
      ranking,
      headline,
    });
  }

  action(playerId: string, action: GameAction): ActionResult {
    if (this.finished) return { ok: false, reason: 'not_playing' };
    if (!this.order.includes(playerId)) return { ok: false, reason: 'not_playing' };

    if (action.type === 'caro_finish_reveal') {
      if (!this.pendingFinish) return { ok: false, reason: 'bad_action' };
      this.commitPendingFinish();
      return { ok: true };
    }

    if (this.pendingFinish) {
      if (action.type === 'end' && playerId === this.ctx.hostId()) {
        this.commitPendingFinish();
        return { ok: true };
      }
      return { ok: false, reason: 'not_playing' };
    }

    if (action.type === 'end') {
      if (playerId !== this.ctx.hostId()) return { ok: false, reason: 'not_host' };
      this.finishGame(null, true, '🏁 Chủ phòng đã kết thúc ván Cờ Caro!');
      return { ok: true };
    }

    if (action.type === 'caro_move') {
      if (this.currentPlayerId !== playerId) {
        return { ok: false, reason: 'not_your_turn' };
      }
      if (
        !Number.isInteger(action.row) ||
        !Number.isInteger(action.col) ||
        action.row < 0 ||
        action.row >= this.size ||
        action.col < 0 ||
        action.col >= this.size
      ) {
        return { ok: false, reason: 'bad_action' };
      }
      if (this.board[action.row * this.size + action.col] !== null) {
        return { ok: false, reason: 'cell_occupied' };
      }

      this.applyMove(playerId, action.row, action.col);
      return { ok: true };
    }

    return { ok: false, reason: 'bad_action' };
  }

  disrupt(playerId: string, ms: number): number {
    if (this.finished || this.currentPlayerId !== playerId || !this.turnEndsAt) return 0;
    const room = Math.max(0, DISRUPT_MAX_BONUS_MS - this.turnBonusMs);
    const add = Math.min(room, Math.max(0, ms));
    if (add <= 0) return 0;

    this.turnBonusMs += add;
    this.turnEndsAt += add;
    const remaining = Math.max(50, this.turnEndsAt - Date.now());
    this.timer.set(remaining, () => this.onTurnTimeout(playerId));
    this.ctx.changed();
    return add;
  }

  removePlayer(playerId: string): void {
    if (this.finished || this.pendingFinish) return;
    const idx = this.activeOrder.indexOf(playerId);
    if (idx === -1) return;

    const wasCurrent = idx === this.turnIdx;
    this.activeOrder.splice(idx, 1);

    if (this.activeOrder.length === 0) {
      this.finishGame(null, false, '🏁 Kết thúc ván Cờ Caro!');
      return;
    }
    if (this.activeOrder.length === 1 && this.order.length > 1) {
      const survivor = this.activeOrder[0];
      this.finishGame(survivor, false, `🏆 Đối thủ rời bàn — ${this.names.get(survivor) ?? survivor} thắng Cờ Caro!`);
      return;
    }

    if (idx < this.turnIdx) {
      this.turnIdx--;
    } else if (wasCurrent) {
      this.timer.clear();
      this.turnIdx = this.turnIdx % this.activeOrder.length;
      this.beginTurn();
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
    if (this.finished || this.currentPlayerId !== playerId) return null;
    const sym = this.symbols.get(playerId);
    if (!sym) return null;
    const mv = pickCaroBotMove(this.board, this.size, sym, this.blockTwoEnds, this.ctx.rng);
    return { type: 'caro_move', row: mv.row, col: mv.col };
  }

  view(): CaroView {
    return {
      type: 'caro',
      size: this.size,
      sizeMode: this.sizeMode,
      blockTwoEnds: this.blockTwoEnds,
      order: [...this.order],
      names: Object.fromEntries(this.names),
      symbols: Object.fromEntries(this.order.map((id) => [id, this.symbols.get(id) ?? 'X'])),
      board: [...this.board],
      currentPlayerId: this.currentPlayerId,
      turnEndsAt: this.turnEndsAt,
      turnSeconds: this.turnSeconds,
      lastMove: this.lastMove ? { ...this.lastMove } : null,
      moveCount: this.moveCount,
      winLine: this.winLine ? this.winLine.map(([r, c]) => [r, c]) : null,
      winnerId: this.winnerId,
      isDraw: this.isDraw,
      revealEndsAt: this.revealEndsAt,
    };
  }

  dispose(): void {
    this.timer.clear();
  }
}
