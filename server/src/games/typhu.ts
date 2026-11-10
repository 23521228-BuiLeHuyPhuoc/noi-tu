/**
 * Cờ tỷ phú (bản gọn cho điện thoại):
 * - Đổ 2 xúc xắc. Đổ đôi được đổ tiếp; 3 lần đôi liên tiếp thì vào tù.
 * - Dừng ở đất trống: mua hoặc bỏ qua. Dừng ở đất người khác: trả tiền thuê
 *   (gấp đôi nếu họ có đủ bộ màu; có nhà thì nhân theo số nhà).
 * - Có đủ bộ màu thì xây nhà (tối đa 3 nhà + 1 khách sạn).
 * - Đi qua Xuất phát nhận 200 xu. Cơ hội: rút thẻ. Thuế: nộp tiền.
 * - Ở tù: đổ đôi để ra, hoặc nộp 50 xu; ngồi 3 lượt thì nộp phạt rồi đi.
 * - Hết tiền: tự bán nhà rồi bán đất cho ngân hàng (nửa giá); vẫn không đủ thì phá sản.
 * - Người cuối cùng còn trụ lại thắng; chủ phòng có thể tổng kết sớm (xếp theo tổng tài sản).
 */
import {
  TYPHU_BOARD, TYPHU_GROUPS, TYPHU_JAIL, TYPHU_JAIL_FINE, TYPHU_MAX_HOUSES, TYPHU_PASS_START, TYPHU_SIZE,
  TYPHU_START_CASH, TYPHU_TURN_SECONDS, groupCells, rentOf,
} from '../../../shared/src/typhu';
import type { ActionResult, GameAction, TyPhuLogKind, TyPhuView } from '../../../shared/src/types';
import { Timer, type EngineContext, type EnginePlayer, type GameEngine } from './engine';

const WAIT_MS = 1600;
const AWAY_MS = 2500;
const MAX_LOG = 30;

interface Card {
  text: string;
  money?: number;
  /** mỗi người khác trả cho mình (dương) hoặc mình trả mỗi người (âm) */
  each?: number;
  goto?: number;
  move?: number;
  jail?: boolean;
  perHouse?: number;
}

export const TYPHU_CARDS: Card[] = [
  { text: 'Trúng vé số! Nhận 150 xu', money: 150 },
  { text: 'Quên đội mũ bảo hiểm, nộp phạt 50 xu', money: -50 },
  { text: 'Sinh nhật bạn! Mỗi người mừng bạn 30 xu', each: 30 },
  { text: 'Đi đám cưới, mừng mỗi người 20 xu', each: -20 },
  { text: 'Được thưởng Tết 100 xu', money: 100 },
  { text: 'Bị bồ đá, tiêu 80 xu đi spa chữa lành', money: -80 },
  { text: 'Về thẳng Xuất phát', goto: 0 },
  { text: 'Đua xe bị tóm! Vào tù', jail: true },
  { text: 'Quên ví, lùi lại 3 ô', move: -3 },
  { text: 'Bay ra Hà Nội ăn phở', goto: 26 },
  { text: 'Sửa nhà mùa mưa: mỗi căn nhà 25 xu', perHouse: 25 },
  { text: 'Nhặt được ví, trả lại được thưởng 50 xu', money: 50 },
];

interface TPlayer extends EnginePlayer {
  cash: number;
  pos: number;
  /** null = không ở tù; số = số lượt đã ngồi */
  jail: number | null;
  bankrupt: boolean;
  doubles: number;
}

export class TyPhuGame implements GameEngine {
  private players: TPlayer[] = [];
  private names: Record<string, string> = {};
  private owners: Record<number, string> = {};
  private houses: Record<number, number> = {};
  private current = 0;
  private step: TyPhuView['step'] = 'roll';
  private dice: [number, number] | null = null;
  private rolledDouble = false;
  private rollId = 0;
  private pendingBuy: number | null = null;
  private turnEndsAt: number | null = null;
  private log: TyPhuView['log'] = [];
  private logSeq = 0;
  private card: TyPhuView['card'] = null;
  private over = false;
  private readonly timer = new Timer();
  private readonly turnMs: number;

  constructor(private readonly ctx: EngineContext) {
    this.turnMs = ctx.turnMs ?? TYPHU_TURN_SECONDS * 1000;
  }

  start(players: EnginePlayer[]): void {
    this.players = players.map((p) => ({ ...p, cash: TYPHU_START_CASH, pos: 0, jail: null, bankrupt: false, doubles: 0 }));
    this.names = Object.fromEntries(players.map((p) => [p.id, p.name]));
    this.current = 0;
    this.beginRoll();
  }

  action(playerId: string, a: GameAction): ActionResult {
    if (this.over) return { ok: false, reason: 'not_playing' };
    if (a.type === 'end') {
      if (playerId !== this.ctx.hostId()) return { ok: false, reason: 'not_host' };
      this.end(null);
      return { ok: true };
    }
    const me = this.players[this.current];
    if (!me || me.id !== playerId) return { ok: false, reason: 'not_your_turn' };
    switch (a.type) {
      case 'roll':
        if (this.step !== 'roll') return { ok: false, reason: 'bad_action' };
        this.roll();
        return { ok: true };
      case 'payJail':
        if (this.step !== 'roll' || me.jail === null) return { ok: false, reason: 'bad_action' };
        if (me.cash < TYPHU_JAIL_FINE) return { ok: false, reason: 'no_money' };
        me.cash -= TYPHU_JAIL_FINE;
        me.jail = null;
        this.addLog('jail', `${me.name} nộp ${TYPHU_JAIL_FINE} xu để ra tù`);
        this.ctx.changed();
        return { ok: true };
      case 'buy': {
        if (this.step !== 'buy' || this.pendingBuy === null) return { ok: false, reason: 'bad_action' };
        const c = TYPHU_BOARD[this.pendingBuy];
        if (c.kind !== 'land' || me.cash < c.price) return { ok: false, reason: 'no_money' };
        me.cash -= c.price;
        this.owners[this.pendingBuy] = me.id;
        this.addLog('buy', `${me.name} mua ${c.name} giá ${fmt(c.price)} xu`);
        this.pendingBuy = null;
        this.afterLanding();
        return { ok: true };
      }
      case 'skip':
        if (this.step !== 'buy') return { ok: false, reason: 'bad_action' };
        this.skipBuy();
        return { ok: true };
      case 'build':
        return this.build(me, a.cell);
      case 'endTurn':
        if (this.step !== 'manage') return { ok: false, reason: 'bad_action' };
        this.nextPlayer();
        return { ok: true };
      default:
        return { ok: false, reason: 'bad_action' };
    }
  }

  removePlayer(playerId: string): void {
    const idx = this.players.findIndex((p) => p.id === playerId);
    const p = this.players[idx];
    if (!p || p.bankrupt || this.over) return;
    this.bankrupt(p, null, 'đã rời bàn');
    if (this.checkEnd()) return;
    if (idx === this.current) this.nextPlayer();
    else this.ctx.changed();
  }

  view(): TyPhuView {
    const by = <T,>(f: (p: TPlayer) => T) => Object.fromEntries(this.players.map((p) => [p.id, f(p)]));
    return {
      type: 'typhu',
      order: this.players.map((p) => p.id),
      names: this.names,
      cash: by((p) => p.cash),
      pos: by((p) => p.pos),
      jail: Object.fromEntries(this.players.filter((p) => p.jail !== null).map((p) => [p.id, p.jail!])),
      bankrupt: this.players.filter((p) => p.bankrupt).map((p) => p.id),
      owners: { ...this.owners },
      houses: { ...this.houses },
      currentPlayerId: this.over ? null : this.players[this.current]?.id ?? null,
      step: this.step,
      dice: this.dice,
      rollId: this.rollId,
      pendingBuy: this.step === 'buy' ? this.pendingBuy : null,
      turnEndsAt: this.over ? null : this.turnEndsAt,
      turnSeconds: this.turnMs / 1000,
      log: this.log,
      card: this.card,
    };
  }

  dispose(): void {
    this.timer.clear();
  }

  // ---------- luật ----------

  /** Người chơi có đủ bộ màu của ô `cell` không */
  ownsGroup(playerId: string, cell: number): boolean {
    const c = TYPHU_BOARD[cell];
    return c.kind === 'land' && groupCells(c.group).every((i) => this.owners[i] === playerId);
  }

  /** Các ô người chơi có thể xây thêm nhà ngay bây giờ */
  buildable(p: TPlayer): number[] {
    return TYPHU_BOARD.flatMap((c, i) => {
      if (c.kind !== 'land' || this.owners[i] !== p.id) return [];
      if (!this.ownsGroup(p.id, i) || (this.houses[i] ?? 0) >= TYPHU_MAX_HOUSES) return [];
      return p.cash >= TYPHU_GROUPS[c.group].house ? [i] : [];
    });
  }

  private build(me: TPlayer, cell: unknown): ActionResult {
    if (this.step !== 'roll' && this.step !== 'manage') return { ok: false, reason: 'bad_action' };
    if (typeof cell !== 'number' || !this.buildable(me).includes(cell)) return { ok: false, reason: 'cannot_build' };
    const c = TYPHU_BOARD[cell];
    if (c.kind !== 'land') return { ok: false, reason: 'cannot_build' };
    me.cash -= TYPHU_GROUPS[c.group].house;
    this.houses[cell] = (this.houses[cell] ?? 0) + 1;
    const h = this.houses[cell];
    this.addLog('build', h === TYPHU_MAX_HOUSES ? `${me.name} xây khách sạn ở ${c.name} 🏨` : `${me.name} xây nhà thứ ${h} ở ${c.name}`);
    this.ctx.changed();
    return { ok: true };
  }

  private roll(): void {
    const me = this.players[this.current];
    const d1 = 1 + Math.floor(this.ctx.rng() * 6);
    const d2 = 1 + Math.floor(this.ctx.rng() * 6);
    this.dice = [d1, d2];
    this.rollId++;
    this.card = null;
    const isDouble = d1 === d2;
    this.rolledDouble = false;

    if (me.jail !== null) {
      if (isDouble) {
        me.jail = null;
        this.addLog('jail', `${me.name} đổ đôi, vượt ngục thành công!`);
      } else {
        me.jail++;
        if (me.jail < 3) {
          this.addLog('jail', `${me.name} vẫn bóc lịch (${me.jail}/3)`);
          return this.wait(() => this.nextPlayer());
        }
        me.jail = null;
        this.charge(me, TYPHU_JAIL_FINE, null, 'nộp phạt ra tù');
        if (me.bankrupt) return this.afterBankrupt();
        this.addLog('jail', `${me.name} ngồi đủ 3 lượt, nộp phạt rồi đi tiếp`);
      }
      return this.moveBy(d1 + d2);
    }

    if (isDouble) {
      me.doubles++;
      if (me.doubles >= 3) {
        this.sendToJail(me, 'đổ đôi 3 lần liên tiếp, bị nghi gian lận');
        return this.wait(() => this.nextPlayer());
      }
      this.rolledDouble = true;
    }
    this.moveBy(d1 + d2);
  }

  private moveBy(steps: number): void {
    const me = this.players[this.current];
    const to = (((me.pos + steps) % TYPHU_SIZE) + TYPHU_SIZE) % TYPHU_SIZE;
    if (steps > 0 && to < me.pos) this.passStart(me);
    me.pos = to;
    this.land(true);
  }

  private moveTo(cell: number): void {
    const me = this.players[this.current];
    if (cell <= me.pos) this.passStart(me);
    me.pos = cell;
    this.land(false);
  }

  private passStart(me: TPlayer): void {
    me.cash += TYPHU_PASS_START;
    this.addLog('start', `${me.name} qua Xuất phát, nhận ${TYPHU_PASS_START} xu`);
  }

  /** Xử lý ô vừa dừng. `allowCard`: có được rút thẻ không (tránh rút liên tiếp) */
  private land(allowCard: boolean): void {
    const me = this.players[this.current];
    const c = TYPHU_BOARD[me.pos];
    switch (c.kind) {
      case 'land': {
        const owner = this.owners[me.pos];
        if (!owner) {
          if (me.cash >= c.price) {
            this.pendingBuy = me.pos;
            this.step = 'buy';
            this.armTimer(() => this.skipBuy());
            this.ctx.changed();
            return;
          }
          this.addLog('info', `${me.name} không đủ tiền mua ${c.name}`);
        } else if (owner !== me.id) {
          const o = this.players.find((p) => p.id === owner)!;
          const rent = rentOf(me.pos, this.houses[me.pos] ?? 0, this.ownsGroup(owner, me.pos));
          const paid = this.charge(me, rent, o, `tiền thuê ${c.name}`);
          this.addLog('rent', `${me.name} trả ${fmt(paid)} xu tiền thuê ${c.name} cho ${o.name}`);
        }
        break;
      }
      case 'tax':
        this.charge(me, c.amount, null, c.name);
        this.addLog('tax', `${me.name} nộp ${c.name} ${fmt(c.amount)} xu`);
        break;
      case 'gotojail':
        this.sendToJail(me, 'bị tóm');
        return this.wait(() => this.nextPlayer());
      case 'chance':
        if (allowCard) return this.drawCard();
        break;
      default:
        break;
    }
    this.afterLanding();
  }

  private drawCard(): void {
    const me = this.players[this.current];
    const card = TYPHU_CARDS[Math.floor(this.ctx.rng() * TYPHU_CARDS.length)];
    this.card = { id: ++this.logSeq, text: card.text };
    this.addLog('card', `${me.name} rút thẻ: ${card.text}`);
    if (card.money) {
      if (card.money > 0) me.cash += card.money;
      else this.charge(me, -card.money, null, 'thẻ cơ hội');
    }
    if (card.each) {
      for (const o of this.players) {
        if (o === me || o.bankrupt) continue;
        if (card.each > 0) this.charge(o, card.each, me, 'mừng sinh nhật');
        else this.charge(me, -card.each, o, 'mừng cưới');
      }
    }
    if (card.perHouse) {
      const n = Object.entries(this.houses).filter(([i]) => this.owners[Number(i)] === me.id).reduce((s, [, h]) => s + h, 0);
      if (n > 0) this.charge(me, n * card.perHouse, null, 'sửa nhà');
    }
    if (me.bankrupt) return this.afterBankrupt();
    if (card.jail) {
      this.sendToJail(me, 'theo thẻ cơ hội');
      return this.wait(() => this.nextPlayer());
    }
    if (card.goto !== undefined) return this.moveTo(card.goto);
    if (card.move) {
      const me2 = this.players[this.current];
      me2.pos = (((me2.pos + card.move) % TYPHU_SIZE) + TYPHU_SIZE) % TYPHU_SIZE;
      return this.land(false);
    }
    this.afterLanding();
  }

  private skipBuy(): void {
    if (this.step !== 'buy' || this.pendingBuy === null) return;
    const me = this.players[this.current];
    this.addLog('info', `${me.name} bỏ qua ${TYPHU_BOARD[this.pendingBuy].name}`);
    this.pendingBuy = null;
    this.afterLanding();
  }

  /** Sau khi xử lý xong ô đứng: đổ tiếp (nếu đổ đôi), hoặc cho xây nhà, hoặc sang lượt sau */
  private afterLanding(): void {
    const me = this.players[this.current];
    if (me.bankrupt) return this.afterBankrupt();
    if (this.rolledDouble && me.jail === null) return this.beginRoll();
    if (this.buildable(me).length > 0) {
      this.step = 'manage';
      this.armTimer(() => this.nextPlayer());
      this.ctx.changed();
      return;
    }
    this.wait(() => this.nextPlayer());
  }

  private afterBankrupt(): void {
    if (this.checkEnd()) return;
    this.wait(() => this.nextPlayer());
  }

  private sendToJail(me: TPlayer, why: string): void {
    me.pos = TYPHU_JAIL;
    me.jail = 0;
    me.doubles = 0;
    this.rolledDouble = false;
    this.addLog('jail', `${me.name} ${why}, vào tù 🚔`);
  }

  /**
   * Trừ tiền `payer` (trả cho `to`, hoặc ngân hàng nếu null). Thiếu thì tự bán nhà rồi bán đất
   * (nửa giá). Vẫn thiếu thì phá sản. Trả về số tiền thực trả.
   */
  private charge(payer: TPlayer, amount: number, to: TPlayer | null, why: string): number {
    if (payer.cash < amount) this.liquidate(payer, amount);
    if (payer.cash >= amount) {
      payer.cash -= amount;
      if (to) to.cash += amount;
      return amount;
    }
    const paid = Math.max(0, payer.cash);
    if (to) to.cash += paid;
    payer.cash = 0;
    this.bankrupt(payer, to, `không đủ tiền ${why}`);
    return paid;
  }

  /** Bán dần nhà rồi đất (rẻ trước) cho ngân hàng với nửa giá tới khi đủ `need` */
  private liquidate(p: TPlayer, need: number): void {
    const mine = TYPHU_BOARD.flatMap((c, i) => (c.kind === 'land' && this.owners[i] === p.id ? [i] : []));
    const byValue = (i: number) => (TYPHU_BOARD[i] as { price: number }).price;
    for (const i of [...mine].sort((a, b) => byValue(a) - byValue(b))) {
      while (p.cash < need && (this.houses[i] ?? 0) > 0) {
        const c = TYPHU_BOARD[i] as { group: keyof typeof TYPHU_GROUPS; name: string };
        this.houses[i]--;
        p.cash += TYPHU_GROUPS[c.group].house / 2;
        this.addLog('info', `${p.name} bán bớt nhà ở ${c.name}`);
      }
    }
    for (const i of [...mine].sort((a, b) => byValue(a) - byValue(b))) {
      if (p.cash >= need) break;
      if ((this.houses[i] ?? 0) > 0) continue;
      delete this.owners[i];
      p.cash += byValue(i) / 2;
      this.addLog('info', `${p.name} bán ${TYPHU_BOARD[i].name} cho ngân hàng`);
    }
  }

  private bankrupt(p: TPlayer, to: TPlayer | null, why: string): void {
    p.bankrupt = true;
    p.jail = null;
    for (const [i, owner] of Object.entries(this.owners)) {
      if (owner === p.id) {
        delete this.owners[Number(i)];
        delete this.houses[Number(i)];
      }
    }
    this.addLog('bankrupt', `${p.name} ${why}, phá sản 💸${to ? ` (chủ nợ: ${to.name})` : ''}`);
  }

  private checkEnd(): boolean {
    const alive = this.players.filter((p) => !p.bankrupt);
    if (alive.length > 1) return false;
    this.end(alive[0] ?? null);
    return true;
  }

  private nextPlayer(): void {
    if (this.over) return;
    const me = this.players[this.current];
    if (me) me.doubles = 0;
    const n = this.players.length;
    for (let i = 1; i <= n; i++) {
      const idx = (this.current + i) % n;
      if (!this.players[idx].bankrupt) {
        this.current = idx;
        break;
      }
    }
    this.beginRoll();
  }

  private beginRoll(): void {
    this.step = 'roll';
    this.pendingBuy = null;
    this.armTimer(() => this.roll());
    this.ctx.changed();
  }

  private wait(then: () => void): void {
    this.step = 'wait';
    this.pendingBuy = null;
    this.turnEndsAt = Date.now() + WAIT_MS;
    this.timer.set(WAIT_MS, then);
    this.ctx.changed();
  }

  private armTimer(fn: () => void): void {
    const me = this.players[this.current];
    const ms = me && !this.ctx.isConnected(me.id) ? AWAY_MS : this.turnMs;
    this.turnEndsAt = Date.now() + ms;
    this.timer.set(ms, fn);
  }

  private worth(p: TPlayer): number {
    let w = p.cash;
    for (const [i, owner] of Object.entries(this.owners)) {
      if (owner !== p.id) continue;
      const c = TYPHU_BOARD[Number(i)];
      if (c.kind === 'land') w += c.price + (this.houses[Number(i)] ?? 0) * TYPHU_GROUPS[c.group].house;
    }
    return w;
  }

  private end(winner: TPlayer | null): void {
    if (this.over) return;
    this.over = true;
    this.timer.clear();
    const ranked = [...this.players].sort((a, b) => {
      if (a.bankrupt !== b.bankrupt) return a.bankrupt ? 1 : -1;
      return this.worth(b) - this.worth(a);
    });
    const top = winner ?? ranked.find((p) => !p.bankrupt) ?? null;
    this.ctx.finish({
      winnerId: top?.id ?? null,
      headline: top ? `${top.name} trở thành tỷ phú với ${fmt(this.worth(top))} xu!` : 'Cả bàn phá sản',
      ranking: ranked.map((p) => ({
        playerId: p.id,
        name: p.name,
        detail: p.bankrupt ? 'phá sản' : `tài sản ${fmt(this.worth(p))} xu`,
      })),
    });
  }

  private addLog(kind: TyPhuLogKind, text: string): void {
    this.log.push({ id: ++this.logSeq, kind, text });
    if (this.log.length > MAX_LOG) this.log.splice(0, this.log.length - MAX_LOG);
  }
}

function fmt(n: number): string {
  return n.toLocaleString('vi-VN');
}
