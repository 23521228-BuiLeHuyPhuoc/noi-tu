/**
 * Cờ cá ngựa (luật Việt Nam, giản lược):
 * - Đổ 1 hoặc 6 mới được xuất quân ra ô xuất phát.
 * - Không được đi qua đầu ngựa khác (kể cả ngựa mình) trên đường chạy.
 * - Dừng đúng ô có ngựa đối thủ thì "đá" ngựa đó về chuồng; không được dừng lên ngựa mình.
 * - Đổ 6 được đổ thêm lượt; đổ 6 ba lần liên tiếp thì mất lượt.
 * - Về đích phải đổ vừa đủ. Ai đưa hết ngựa về đích trước thì thắng.
 */
import {
  LUDO_COLORS, LUDO_FINISH, LUDO_HOME_START, LUDO_START, LUDO_TRACK, LUDO_TURN_SECONDS,
  type ActionResult, type GameAction, type LudoColor, type LudoEvent, type LudoView,
} from '../../../shared/src/types';
import { Timer, type EngineContext, type EnginePlayer, type GameEngine } from './engine';

const EXIT_ROLLS = [1, 6];
/** chờ một chút khi không có nước đi để mọi người kịp thấy xúc xắc */
const WAIT_MS = 1400;
/** người mất kết nối: tự đi thay sau khoảng này */
const AWAY_MS = 2500;

interface LPlayer extends EnginePlayer {
  color: LudoColor;
  pieces: number[];
  left: boolean;
}

/** Màu theo số người: 2 người ngồi đối diện cho công bằng */
function colorsFor(n: number): LudoColor[] {
  if (n === 2) return ['red', 'yellow'];
  return LUDO_COLORS.slice(0, n);
}

export function trackCell(color: LudoColor, progress: number): number {
  return (LUDO_START[color] + progress) % LUDO_TRACK;
}

export class LudoGame implements GameEngine {
  private players: LPlayer[] = [];
  private names: Record<string, string> = {};
  private current = 0;
  private step: LudoView['step'] = 'roll';
  private dice: number | null = null;
  private legal: number[] = [];
  private sixes = 0;
  private rollId = 0;
  private turnEndsAt: number | null = null;
  private lastEvent: LudoEvent | null = null;
  private over = false;
  private readonly timer = new Timer();
  private readonly turnMs: number;

  constructor(private readonly ctx: EngineContext) {
    this.turnMs = ctx.turnMs ?? LUDO_TURN_SECONDS * 1000;
  }

  start(players: EnginePlayer[]): void {
    const colors = colorsFor(players.length);
    const n = this.ctx.settings.ludoPieces;
    this.players = players.map((p, i) => ({ ...p, color: colors[i], pieces: Array(n).fill(-1), left: false }));
    this.names = Object.fromEntries(players.map((p) => [p.id, p.name]));
    this.current = 0;
    this.beginRoll();
  }

  action(playerId: string, a: GameAction): ActionResult {
    if (this.over) return { ok: false, reason: 'not_playing' };
    const me = this.players[this.current];
    if (a.type !== 'roll' && a.type !== 'move') return { ok: false, reason: 'bad_action' };
    if (!me || me.id !== playerId) return { ok: false, reason: 'not_your_turn' };
    if (a.type === 'roll') {
      if (this.step !== 'roll') return { ok: false, reason: 'bad_action' };
      this.roll();
      return { ok: true };
    }
    if (this.step !== 'move' || !Number.isInteger(a.piece) || !this.legal.includes(a.piece)) {
      return { ok: false, reason: 'illegal_move' };
    }
    this.move(a.piece);
    return { ok: true };
  }

  removePlayer(playerId: string): void {
    const idx = this.players.findIndex((p) => p.id === playerId);
    const p = this.players[idx];
    if (!p || p.left || this.over) return;
    p.left = true;
    p.pieces = p.pieces.map(() => -1);
    this.lastEvent = { kind: 'left', playerId };
    const active = this.players.filter((x) => !x.left);
    if (active.length < 2) return this.end(active[0] ?? null);
    if (idx === this.current) this.nextPlayer();
    this.ctx.changed();
  }

  view(): LudoView {
    return {
      type: 'ludo',
      order: this.players.map((p) => p.id),
      colors: this.players.map((p) => p.color),
      pieces: this.players.map((p) => [...p.pieces]),
      left: this.players.filter((p) => p.left).map((p) => p.id),
      currentPlayerId: this.over ? null : this.players[this.current]?.id ?? null,
      step: this.step,
      dice: this.dice,
      legal: this.step === 'move' ? this.legal : [],
      turnEndsAt: this.over ? null : this.turnEndsAt,
      turnSeconds: this.turnMs / 1000,
      rollId: this.rollId,
      lastEvent: this.lastEvent,
      names: this.names,
    };
  }

  dispose(): void {
    this.timer.clear();
  }

  // ---------- luật đi ----------

  /** Các con ngựa của người `pi` đi được với số `dice` */
  legalMoves(pi: number, dice: number): number[] {
    const out: number[] = [];
    this.players[pi].pieces.forEach((_, k) => {
      if (this.target(pi, k, dice) !== null) out.push(k);
    });
    return out;
  }

  /** Tiến độ mới nếu con ngựa đi được, ngược lại null */
  private target(pi: number, k: number, dice: number): number | null {
    const me = this.players[pi];
    const p = me.pieces[k];
    if (p === LUDO_FINISH) return null;
    if (p === -1) {
      if (!EXIT_ROLLS.includes(dice)) return null;
      const occ = this.occupant(trackCell(me.color, 0));
      if (occ && occ.pi === pi) return null; // ô xuất phát đang có ngựa mình
      return 0;
    }
    const t = p + dice;
    if (t > LUDO_FINISH) return null;
    // không được đi qua đầu ngựa khác
    for (let q = p + 1; q < t; q++) {
      if (q < LUDO_HOME_START) {
        if (this.occupant(trackCell(me.color, q))) return null;
      } else if (me.pieces.includes(q)) return null;
    }
    if (t < LUDO_HOME_START) {
      const occ = this.occupant(trackCell(me.color, t));
      if (occ && occ.pi === pi) return null;
    } else if (t < LUDO_FINISH && me.pieces.includes(t)) return null;
    return t;
  }

  /** Ngựa đang đứng ở ô `cell` trên đường chạy chung */
  private occupant(cell: number): { pi: number; k: number } | null {
    for (let pi = 0; pi < this.players.length; pi++) {
      const pl = this.players[pi];
      if (pl.left) continue;
      for (let k = 0; k < pl.pieces.length; k++) {
        const pr = pl.pieces[k];
        if (pr >= 0 && pr < LUDO_HOME_START && trackCell(pl.color, pr) === cell) return { pi, k };
      }
    }
    return null;
  }

  // ---------- diễn biến lượt ----------

  private roll(): void {
    const me = this.players[this.current];
    this.dice = 1 + Math.floor(this.ctx.rng() * 6);
    this.rollId++;
    this.sixes = this.dice === 6 ? this.sixes + 1 : 0;
    if (this.sixes === 3) {
      this.lastEvent = { kind: 'threeSixes', playerId: me.id };
      this.sixes = 0;
      return this.wait(() => this.nextPlayer());
    }
    this.legal = this.legalMoves(this.current, this.dice);
    if (this.legal.length === 0) {
      this.lastEvent = { kind: 'noMove', playerId: me.id };
      return this.wait(() => (this.dice === 6 ? this.beginRoll() : this.nextPlayer()));
    }
    this.step = 'move';
    // chỉ có một nước đi: tự đi cho nhanh
    if (this.legal.length === 1) {
      const only = this.legal[0];
      this.turnEndsAt = Date.now() + 800;
      this.timer.set(800, () => this.move(only));
    } else this.armTimer(() => this.move(this.autoChoice()));
    this.ctx.changed();
  }

  private move(k: number): void {
    if (this.over || this.step !== 'move' || this.dice === null) return;
    const pi = this.current;
    const me = this.players[pi];
    const t = this.target(pi, k, this.dice);
    if (t === null) return;
    const from = me.pieces[k];
    this.lastEvent = from === -1 ? { kind: 'exit', playerId: me.id } : null;
    if (t < LUDO_HOME_START) {
      const occ = this.occupant(trackCell(me.color, t));
      if (occ && occ.pi !== pi) {
        this.players[occ.pi].pieces[occ.k] = -1;
        this.lastEvent = { kind: 'capture', playerId: me.id, victimId: this.players[occ.pi].id };
      }
    }
    me.pieces[k] = t;
    if (t === LUDO_FINISH) {
      this.lastEvent = { kind: 'finish', playerId: me.id };
      if (me.pieces.every((x) => x === LUDO_FINISH)) return this.end(me);
    }
    if (this.dice === 6) this.beginRoll();
    else this.nextPlayer();
  }

  /** Tự chọn nước đi khi hết giờ: ưu tiên đá ngựa > về đích > ra quân > con đi xa nhất */
  private autoChoice(): number {
    const pi = this.current;
    const me = this.players[pi];
    const score = (k: number) => {
      const t = this.target(pi, k, this.dice!)!;
      const from = me.pieces[k];
      let s = from;
      if (t < LUDO_HOME_START) {
        const occ = this.occupant(trackCell(me.color, t));
        if (occ && occ.pi !== pi) s += 1000;
      }
      if (t === LUDO_FINISH) s += 500;
      if (from === -1) s += 200;
      return s;
    };
    return [...this.legal].sort((a, b) => score(b) - score(a))[0];
  }

  private nextPlayer(): void {
    const n = this.players.length;
    for (let i = 1; i <= n; i++) {
      const idx = (this.current + i) % n;
      if (!this.players[idx].left) {
        this.current = idx;
        break;
      }
    }
    this.sixes = 0;
    this.beginRoll();
  }

  private beginRoll(): void {
    this.step = 'roll';
    this.legal = [];
    this.armTimer(() => this.roll());
    this.ctx.changed();
  }

  private wait(then: () => void): void {
    this.step = 'wait';
    this.legal = [];
    this.turnEndsAt = Date.now() + WAIT_MS;
    this.timer.set(WAIT_MS, then);
    this.ctx.changed();
  }

  /** Đặt đồng hồ lượt; người mất kết nối thì tự đi sớm */
  private armTimer(fn: () => void): void {
    const me = this.players[this.current];
    const ms = me && !this.ctx.isConnected(me.id) ? AWAY_MS : this.turnMs;
    this.turnEndsAt = Date.now() + ms;
    this.timer.set(ms, fn);
  }

  private end(winner: LPlayer | null): void {
    this.over = true;
    this.timer.clear();
    const done = (p: LPlayer) => p.pieces.filter((x) => x === LUDO_FINISH).length;
    const progress = (p: LPlayer) => p.pieces.reduce((s, x) => s + Math.max(0, x + 1), 0);
    const ranked = [...this.players].sort((a, b) => {
      if (winner && a.id === winner.id) return -1;
      if (winner && b.id === winner.id) return 1;
      if (a.left !== b.left) return a.left ? 1 : -1;
      return done(b) - done(a) || progress(b) - progress(a);
    });
    const total = this.players[0]?.pieces.length ?? 0;
    this.ctx.finish({
      winnerId: winner?.id ?? null,
      headline: winner ? `${winner.name} đưa cả đàn ngựa về chuồng!` : 'Ván cờ kết thúc',
      ranking: ranked.map((p) => ({
        playerId: p.id,
        name: p.name,
        detail: p.left ? 'đã thoát' : `${done(p)}/${total} ngựa về đích`,
      })),
    });
  }
}
