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
  TYPHU_START_CASH, TYPHU_TURN_SECONDS, groupCells, rentOf, isTyPhuProperty, stationRent, utilityRent, TYPHU_MOVE_STEP_MS, TYPHU_ROLL_MIN_MS, type TyPhuMovement,
} from '../../../shared/src/typhu';
import type { ActionResult, GameAction, TyPhuLogKind, TyPhuView } from '../../../shared/src/types';
import { DICE_DEFAULT_IMPULSE, sanitizeImpulse, type DiceRollView, type ThrowImpulse } from '../../../shared/src/dice';
import { simulateThrow } from './dice3d';
import { Timer, type EngineContext, type EnginePlayer, type GameEngine } from './engine';

const WAIT_MS = 1100;
/** người chơi còn kết nối mà không tung / không chọn sau chừng này thì hệ thống làm giúp */
const ROLL_IDLE_MS = 60_000;
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
  { text: 'Về thẳng Xuất phát, nhận thưởng 200 xu', goto: 0, money: 200 },
  { text: 'Đua xe bị tóm! Vào tù', jail: true },
  { text: 'Quên ví, lùi lại 3 ô', move: -3 },
  { text: 'Bay ra Hà Nội ăn phở', goto: TYPHU_BOARD.findIndex((c) => c.name === 'Hà Nội') },
  { text: 'Sửa nhà mùa mưa: mỗi căn nhà 25 xu', perHouse: 25 },
  { text: 'Nhặt được ví, trả lại được thưởng 50 xu', money: 50 },
];

export const TYPHU_COMMUNITY_CARDS: Card[] = [
 { text: 'Được hoàn thuế 100 xu', money: 100 }, { text: 'Viện phí 50 xu', money: -50 },
 { text: 'Sinh nhật bạn! Mỗi người mừng bạn 30 xu', each: 30 }, { text: 'Nhận học bổng 150 xu', money: 150 },
 { text: 'Về thẳng Xuất phát, nhận thưởng 200 xu', goto: 0, money: 200 }, { text: 'Vào tù theo lệnh tòa', jail: true },
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
  /** tốc độ chơi 1..3 */
  private speed = 1;
  private rollId = 0;
  private rollMs = 0;
  private throwView: DiceRollView | null = null;
  private movement: TyPhuMovement | null = null;
  private movementSeq = 0;
  private pendingBuy: number | null = null;
  /** hũ tiền ở ô Nghỉ chân */
  private pot = 0;
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
    if (a.type === 'speed') {
      // ai trong bàn cũng chỉnh được tốc độ, kể cả lúc quân đang đi (áp dụng từ bước sau)
      if (!this.players.some((p) => p.id === playerId && !p.bankrupt)) return { ok: false, reason: 'bad_action' };
      const v = Number(a.value);
      if (!(v === 1 || v === 2 || v === 3)) return { ok: false, reason: 'bad_action' };
      this.speed = v;
      this.ctx.changed();
      return { ok: true };
    }
    if (this.movement) return { ok: false, reason: 'bad_action' };
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
        this.roll(sanitizeImpulse(a.impulse));
        return { ok: true };
      case 'payJail':
        if (this.step !== 'roll' || me.jail === null) return { ok: false, reason: 'bad_action' };
        if (me.cash < TYPHU_JAIL_FINE) return { ok: false, reason: 'no_money' };
        me.cash -= TYPHU_JAIL_FINE;
        this.pot += TYPHU_JAIL_FINE;
        me.jail = null;
        this.addLog('jail', `${me.name} nộp ${TYPHU_JAIL_FINE} xu để ra tù`);
        this.ctx.changed();
        return { ok: true };
      case 'buy': {
        if (this.step !== 'buy' || this.pendingBuy === null) return { ok: false, reason: 'bad_action' };
        const c = TYPHU_BOARD[this.pendingBuy];
        if (!isTyPhuProperty(c) || me.cash < c.price) return { ok: false, reason: 'no_money' };
        me.cash -= c.price;
        this.owners[this.pendingBuy] = me.id;
        this.addLog('buy', `${me.name} mua ${c.name} giá ${fmt(c.price)} xu`);
        this.pendingBuy = null;
        if (this.checkMonopoly(me)) return { ok: true };
        this.afterLanding();
        return { ok: true };
      }
      case 'skip':
        if (this.step === 'upgrade') {
          this.pendingBuy = null;
          this.afterLanding();
          return { ok: true };
        }
        if (this.step !== 'buy') return { ok: false, reason: 'bad_action' };
        this.skipBuy();
        return { ok: true };
      case 'build':
        return this.build(me, a.cell, a.levels);
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

  view(): TyPhuView & { movement: TyPhuMovement | null } {
    const by = <T,>(f: (p: TPlayer) => T) => Object.fromEntries(this.players.map((p) => [p.id, f(p)]));
    return {
      type: 'typhu',
      movement: this.movement ? { ...this.movement, path: [...this.movement.path] } : null,
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
      dice: this.dice ? [...this.dice] : null,
      rollId: this.rollId,
      pendingBuy: this.step === 'buy' || this.step === 'upgrade' ? this.pendingBuy : null,
      pot: this.pot,
      turnEndsAt: this.over ? null : this.turnEndsAt,
      turnSeconds: this.turnMs / 1000,
      log: this.log.map((entry) => ({ ...entry })),
      card: this.card ? { ...this.card } : null,
      roll: this.throwView,
      speed: this.speed,
      extraRoll: this.step === 'roll' && this.rolledDouble,
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

  /**
   * Nâng cấp nhà kiểu Cờ tỷ phú Việt: dừng ở đất của mình thì được nâng thêm đúng 1 cấp ngay tại ô đó,
   * không cần đủ bộ màu. Cấp 4 = khách sạn.
   */
  private build(me: TPlayer, cell: unknown, levels?: unknown): ActionResult {
    if (this.step !== 'upgrade' || this.pendingBuy === null || cell !== this.pendingBuy) return { ok: false, reason: 'cannot_build' };
    const c = TYPHU_BOARD[cell];
    if (c.kind !== 'land' || this.owners[cell] !== me.id) return { ok: false, reason: 'cannot_build' };
    const cur = this.houses[cell] ?? 0;
    // nâng lần lượt từng cấp: đất trống -> nhà cấp 1 -> cấp 2 -> cấp 3 -> khách sạn, mỗi lần dừng chỉ lên 1 cấp
    const n = levels === undefined ? 1 : levels;
    if (n !== 1 || cur + 1 > TYPHU_MAX_HOUSES) return { ok: false, reason: 'cannot_build' };
    const cost = TYPHU_GROUPS[c.group].house;
    if (me.cash < cost) return { ok: false, reason: 'no_money' };
    me.cash -= cost;
    this.houses[cell] = cur + 1;
    const h = this.houses[cell];
    this.addLog('build', h === TYPHU_MAX_HOUSES ? `${me.name} xây khách sạn ở ${c.name} 🏨` : `${me.name} nâng ${c.name} lên nhà cấp ${h}`);
    this.pendingBuy = null;
    this.afterLanding();
    return { ok: true };
  }

  /** Tung xúc xắc: server mô phỏng vật lý rồi đọc mặt ngửa; client chỉ phát lại các khung hình. */
  private roll(impulse: ThrowImpulse = DICE_DEFAULT_IMPULSE): void {
    const me = this.players[this.current];
    let res: ReturnType<typeof simulateThrow>;
    try {
      res = (this.ctx.rollDice ?? simulateThrow)(impulse, this.ctx.rng);
    } catch (err) {
      // phòng hờ: mô phỏng lỗi thì không để sập server, rơi về đổ ngẫu nhiên (client tự hiện hoạt hình)
      console.error('[typhu] mô phỏng xúc xắc lỗi, dùng kết quả ngẫu nhiên', err);
      res = { dice: [1 + Math.floor(this.ctx.rng() * 6), 1 + Math.floor(this.ctx.rng() * 6)], frames: [], ms: TYPHU_ROLL_MIN_MS, fps: 30 };
    }
    const [d1, d2] = res.dice;
    this.dice = [d1, d2];
    this.rollId++;
    this.rollMs = Math.round(res.ms / this.speed);
    this.throwView = { id: this.rollId, startedAt: Date.now(), ms: this.rollMs, fps: res.fps * this.speed, frames: res.frames };
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
          return this.wait(() => this.nextPlayer(), this.rollMs);
        }
        me.jail = null;
        this.pot += this.charge(me, TYPHU_JAIL_FINE, null, 'nộp phạt ra tù');
        if (me.bankrupt) return this.afterBankrupt();
        this.addLog('jail', `${me.name} ngồi đủ 3 lượt, nộp phạt rồi đi tiếp`);
      }
      return this.moveBy(d1 + d2);
    }

    if (isDouble) {
      me.doubles++;
      if (me.doubles >= 3) {
        this.sendToJail(me, 'đổ đôi 3 lần liên tiếp, bị nghi gian lận');
        return this.wait(() => this.nextPlayer(), this.rollMs);
      }
      this.rolledDouble = true;
    }
    this.moveBy(d1 + d2);
  }

  private moveBy(steps: number, allowCard = true, kind: TyPhuMovement['kind'] = 'roll'): void {
    const me = this.players[this.current], from = me.pos;
    const path = Array.from({ length: Math.abs(steps) }, (_, i) => ((from + Math.sign(steps) * (i + 1)) % TYPHU_SIZE + TYPHU_SIZE) % TYPHU_SIZE);
    const startedAt = Date.now();
    const delay = kind === 'roll' ? this.rollMs : 0;
    const duration = delay + Math.max(1, path.length) * Math.round(TYPHU_MOVE_STEP_MS / this.speed);
    this.movement = { id: ++this.movementSeq, playerId: me.id, from, to: path.at(-1) ?? from, path, startedAt, endsAt: startedAt + duration, delay, kind };
    me.pos = this.movement.to;
    this.step = 'wait'; this.pendingBuy = null; this.turnEndsAt = this.movement.endsAt;
    this.timer.set(duration, () => {
      this.movement = null;
      this.throwView = null;
      // chỉ thưởng khi đi VƯỢT QUA Xuất phát; dừng đúng ô Xuất phát thì không được thưởng
      if (steps > 0 && from + steps > TYPHU_SIZE) this.passStart(me);
      this.land(allowCard);
    });
    this.ctx.changed();
  }
  private moveTo(cell: number): void {
    const me = this.players[this.current];
    this.moveBy((cell - me.pos + TYPHU_SIZE) % TYPHU_SIZE || TYPHU_SIZE, false, 'card');
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
      case 'land':
      case 'station':
      case 'utility': {
        const owner = this.owners[me.pos];
        if (!owner) {
          if (me.cash >= c.price) {
            this.pendingBuy = me.pos;
            this.step = 'buy';
            // không đếm ngược khi chọn mua: chỉ tự bỏ qua nếu treo máy quá lâu
            this.armTimer(() => this.skipBuy(), ROLL_IDLE_MS);
            this.ctx.changed();
            return;
          }
          this.addLog('info', `${me.name} không đủ tiền mua ${c.name}`);
        } else if (owner === me.id) {
          if (c.kind === 'land' && (this.houses[me.pos] ?? 0) < TYPHU_MAX_HOUSES && me.cash >= TYPHU_GROUPS[c.group].house) {
            this.pendingBuy = me.pos;
            this.step = 'upgrade';
            this.armTimer(() => { this.pendingBuy = null; this.afterLanding(); }, ROLL_IDLE_MS);
            this.ctx.changed();
            return;
          }
        } else {
          const o = this.players.find((p) => p.id === owner)!;
          const count = Object.entries(this.owners).filter(([i, id]) => id === owner && TYPHU_BOARD[Number(i)].kind === c.kind).length;
          const rent = c.kind === 'station' ? stationRent(count) : c.kind === 'utility' ? utilityRent(count, (this.dice?.[0] ?? 0) + (this.dice?.[1] ?? 0)) : rentOf(me.pos, this.houses[me.pos] ?? 0, this.ownsGroup(owner, me.pos));
          const paid = this.charge(me, rent, o, `tiền thuê ${c.name}`);
          this.addLog('rent', `${me.name} trả ${fmt(paid)} xu tiền thuê ${c.name} cho ${o.name}`);
        }
        break;
      }
      case 'tax': {
        const paid = this.charge(me, c.amount, null, c.name);
        this.pot += paid;
        this.addLog('tax', `${me.name} nộp ${c.name} ${fmt(c.amount)} xu (vào hũ Nghỉ chân)`);
        break;
      }
      case 'rest':
        if (this.pot > 0) {
          me.cash += this.pot;
          this.addLog('pot', `${me.name} dừng Nghỉ chân, ăn trọn hũ ${fmt(this.pot)} xu 🍯`);
          this.pot = 0;
        }
        break;
      case 'gotojail':
        this.sendToJail(me, 'bị tóm');
        return this.wait(() => this.nextPlayer());
      case 'chance':
      case 'community':
        if (allowCard) return this.drawCard(c.kind === 'community');
        break;
      default:
        break;
    }
    this.afterLanding();
  }

  private drawCard(community = false): void {
    const me = this.players[this.current];
    const deck = community ? TYPHU_COMMUNITY_CARDS : TYPHU_CARDS;
    const card = deck[Math.floor(this.ctx.rng() * deck.length)];
    this.card = { id: ++this.logSeq, text: card.text };
    this.addLog('card', `${me.name} rút thẻ: ${card.text}`);
    if (card.money) {
      if (card.money > 0) me.cash += card.money;
      else this.pot += this.charge(me, -card.money, null, 'thẻ cơ hội');
    }
    if (card.each) {
      for (const o of this.players) {
        if (o === me || o.bankrupt) continue;
        if (card.each > 0) this.charge(o, card.each, me, 'mừng sinh nhật');
        else this.charge(me, -card.each, o, 'mừng cưới');
        if (me.bankrupt) break;
      }
    }
    if (card.perHouse) {
      const n = Object.entries(this.houses).filter(([i]) => this.owners[Number(i)] === me.id).reduce((s, [, h]) => s + h, 0);
      if (n > 0) this.pot += this.charge(me, n * card.perHouse, null, 'sửa nhà');
    }
    if (me.bankrupt) return this.afterBankrupt();
    if (card.jail) {
      this.sendToJail(me, 'theo thẻ cơ hội');
      return this.wait(() => this.nextPlayer());
    }
    if (card.goto !== undefined) return this.moveTo(card.goto);
    // lùi 3 ô mà rơi vào Khí vận thì vẫn rút thẻ như luật gốc (thẻ Khí vận không có lệnh di chuyển nên không lặp)
    if (card.move) return this.moveBy(card.move, !community, 'card');
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
    // người khác có thể vừa phá sản (vd. thẻ mừng sinh nhật) → kiểm tra kết thúc ván
    if (this.checkEnd()) return;
    if (this.rolledDouble && me.jail === null) return this.beginRoll();
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
    // nợ người chơi khác mà bán hết cũng không đủ: phá sản, toàn bộ tài sản về tay chủ nợ (luật chuẩn)
    if (to && payer.cash < amount && payer.cash + this.liquidValue(payer) < amount) {
      const houseCash = this.sellAllHouses(payer);
      const paid = payer.cash + houseCash;
      to.cash += paid;
      payer.cash = 0;
      for (const [i, owner] of Object.entries(this.owners)) if (owner === payer.id) this.owners[Number(i)] = to.id;
      this.bankrupt(payer, to, `không đủ tiền ${why}`);
      return paid;
    }
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

  /** Số tiền thu được nếu bán hết nhà và đất cho ngân hàng (nửa giá) */
  private liquidValue(p: TPlayer): number {
    let v = 0;
    for (const [k, owner] of Object.entries(this.owners)) {
      if (owner !== p.id) continue;
      const c = TYPHU_BOARD[Number(k)];
      if (!isTyPhuProperty(c)) continue;
      v += c.price / 2;
      if (c.kind === 'land') v += ((this.houses[Number(k)] ?? 0) * TYPHU_GROUPS[c.group].house) / 2;
    }
    return v;
  }

  /** Bán hết nhà của người chơi cho ngân hàng (nửa giá), trả về số tiền thu được (chưa cộng vào ví) */
  private sellAllHouses(p: TPlayer): number {
    let v = 0;
    for (const [k, owner] of Object.entries(this.owners)) {
      const c = TYPHU_BOARD[Number(k)];
      if (owner !== p.id || c.kind !== 'land') continue;
      v += ((this.houses[Number(k)] ?? 0) * TYPHU_GROUPS[c.group].house) / 2;
      delete this.houses[Number(k)];
    }
    return v;
  }

  /** Bán dần nhà rồi đất (rẻ trước) cho ngân hàng với nửa giá tới khi đủ `need` */
  private liquidate(p: TPlayer, need: number): void {
    const mine = TYPHU_BOARD.flatMap((c, i) => (isTyPhuProperty(c) && this.owners[i] === p.id ? [i] : []));
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

  /**
   * Thắng nhanh kiểu Cờ tỷ phú Việt: độc quyền cả 4 nhà ga, hoặc mọi ô đất trên một cạnh bàn cờ,
   * hoặc 3 bộ màu trọn vẹn. Trả về true nếu ván vừa kết thúc.
   */
  private checkMonopoly(p: TPlayer): boolean {
    const mine = (i: number) => this.owners[i] === p.id;
    let why = '';
    const stations = TYPHU_BOARD.flatMap((c, i) => (c.kind === 'station' ? [i] : []));
    if (stations.every(mine)) why = 'độc quyền cả 4 nhà ga';
    for (const [a, b] of [[1, 9], [11, 19], [21, 29], [31, 39]]) {
      if (why) break;
      const lands = TYPHU_BOARD.flatMap((c, i) => (c.kind === 'land' && i >= a && i <= b ? [i] : []));
      if (lands.every(mine)) why = 'độc quyền trọn một cạnh bàn cờ';
    }
    if (!why) {
      const sets = (Object.keys(TYPHU_GROUPS) as (keyof typeof TYPHU_GROUPS)[]).filter((gr) => groupCells(gr).every(mine));
      if (sets.length >= 3) why = 'gom đủ 3 bộ màu';
    }
    if (!why) return false;
    this.addLog('info', `${p.name} ${why}, thắng luôn! 🏆`);
    this.end(p, why);
    return true;
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
    this.movement = null;
    this.throwView = null;
    this.step = 'roll';
    this.pendingBuy = null;
    // không đếm ngược lúc tung: chỉ tự tung khi người chơi treo máy quá lâu
    this.armTimer(() => this.roll(), ROLL_IDLE_MS);
    this.ctx.changed();
  }

  private wait(then: () => void, extraMs = 0): void {
    this.step = 'wait';
    this.pendingBuy = null;
    const ms = Math.round(WAIT_MS / this.speed) + extraMs;
    this.turnEndsAt = Date.now() + ms;
    this.timer.set(ms, () => { this.throwView = null; then(); });
    this.ctx.changed();
  }

  private armTimer(fn: () => void, onlineMs = this.turnMs): void {
    const me = this.players[this.current];
    const ms = me && !this.ctx.isConnected(me.id) ? AWAY_MS : onlineMs;
    this.turnEndsAt = Date.now() + ms;
    this.timer.set(ms, fn);
  }

  private worth(p: TPlayer): number {
    let w = p.cash;
    for (const [i, owner] of Object.entries(this.owners)) {
      if (owner !== p.id) continue;
      const c = TYPHU_BOARD[Number(i)];
      if (isTyPhuProperty(c)) w += c.price + (c.kind === 'land' ? (this.houses[Number(i)] ?? 0) * TYPHU_GROUPS[c.group].house : 0);
    }
    return w;
  }

  private end(winner: TPlayer | null, why?: string): void {
    if (this.over) return;
    this.over = true;
    this.movement = null;
    this.timer.clear();
    const ranked = [...this.players].sort((a, b) => {
      if (a.bankrupt !== b.bankrupt) return a.bankrupt ? 1 : -1;
      return this.worth(b) - this.worth(a);
    });
    const top = winner ?? ranked.find((p) => !p.bankrupt) ?? null;
    this.ctx.finish({
      winnerId: top?.id ?? null,
      headline: top ? (why ? `${top.name} ${why}, thắng ván!` : `${top.name} trở thành tỷ phú với ${fmt(this.worth(top))} xu!`) : 'Cả bàn phá sản',
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
