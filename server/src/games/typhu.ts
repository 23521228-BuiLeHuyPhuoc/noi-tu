/**
 * Cờ tỷ phú (bản gọn cho điện thoại):
 * - Đổ 2 xúc xắc. Đổ đôi được đổ tiếp; 3 lần đôi liên tiếp thì vào tù.
 * - Dừng ở đất trống: mua hoặc bỏ qua. Dừng ở đất người khác: trả tiền thuê theo số nhà,
 *   luôn x2 nếu chủ có đủ bộ cùng màu. Chủ đang ngồi tù thì không thu được tiền thuê.
 * - Dừng ở đất của mình: nâng 1 cấp nhà (tối đa 3 nhà + 1 khách sạn). Dừng ở ga của mình: nâng 1 sao (tối đa 3 sao).
 * - Ga: thuê 50$ × số ga cùng chủ (đủ 4 ga = gấp 4), mỗi sao x2.
 * - Chỉ đi VƯỢT QUA Xuất phát mới nhận 500$; dừng đúng ô Xuất phát không được gì. Thuế, phạt nộp ngân hàng.
 * - Cơ hội: thẻ luôn tốt (có vé ra tù mua nửa giá). Rủi ro: thẻ luôn xấu. Sân bay: máy bay đưa tới một ô ngẫu nhiên.
 * - Ở tù: phải trả 200$ (hoặc dùng vé) mới được đổ; được ở lại tối đa 3 lượt, tới lượt thứ 4 bắt buộc trả.
 * - Thiếu tiền trả: người chơi tự chọn bán từng cấp nhà / cả lô đất (nửa giá) tới khi đủ;
 *   chỉ phá sản khi đã bán hết mà vẫn thiếu. Treo máy quá lâu thì hệ thống bán giúp.
 * - Chỉ người cuối cùng còn trụ lại mới thắng; chủ phòng có thể tổng kết sớm (xếp theo tổng tài sản).
 */
import {
  TYPHU_AIRPORT, TYPHU_BOARD, TYPHU_JAIL, TYPHU_JAIL_FINE, TYPHU_JAIL_MAX, TYPHU_JAIL_TICKET, TYPHU_MAX_HOUSES, TYPHU_PASS_START, TYPHU_SIZE,
  TYPHU_START_CASH, TYPHU_TURN_SECONDS, groupCells, rentOf, isTyPhuProperty, stationRent, utilityRent,
  liquidValueOf, maxLevelOf, upgradeCostOf, sellValueOf, TYPHU_MOVE_STEP_MS, TYPHU_ROLL_MIN_MS, type TyPhuMovement,
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
/** máy bay: chờ cất cánh rồi bay (ms, chia theo tốc độ) */
const FLY_DELAY_MS = 650;
const FLY_MS = 1300;

interface Card {
  text: string;
  /** dương: nhận từ ngân hàng; âm: nộp cho ngân hàng */
  money?: number;
  /** mỗi người khác mừng mình chừng này (chỉ trả bằng tiền mặt đang có, không phải bán nhà) */
  each?: number;
  /** bay thẳng tới ô này (không tính qua Xuất phát) */
  goto?: number;
  /** đi bộ tiến (dương) / lùi (âm) */
  move?: number;
  jail?: boolean;
  /** nộp chừng này cho mỗi cấp nhà / sao ga đang có (ít nhất 1 lần) */
  perLevel?: number;
  /** đi bộ tới đất/ga gần nhất phía trước của mình; chưa có đất thì nhận `fallback` $ */
  ownLand?: boolean;
  fallback?: number;
  /** được mua vé ra tù (nửa tiền ra tù), cất trong túi để dùng sau */
  ticket?: boolean;
}

const cellNamed = (name: string) => TYPHU_BOARD.findIndex((c) => c.name === name);

/** Thẻ Cơ hội: luôn có lợi */
export const TYPHU_CARDS: Card[] = [
  { text: 'Trúng vé số! Nhận 150$', money: 150 },
  { text: 'Được thưởng Tết 100$', money: 100 },
  { text: 'Nhặt được ví, trả lại được thưởng 50$', money: 50 },
  { text: 'Được hoàn thuế 100$', money: 100 },
  { text: 'Nhận học bổng 150$', money: 150 },
  { text: 'Sinh nhật bạn! Mỗi người mừng bạn 30$', each: 30 },
  { text: `Vé ra tù nửa giá: mua ${TYPHU_JAIL_TICKET}$ (thay vì ${TYPHU_JAIL_FINE}$), cất trong túi, lúc ở tù dùng để ra ngay`, ticket: true },
  { text: 'Tiến tới đất gần nhất của bạn để nâng cấp (chưa có đất thì nhận 100$)', ownLand: true, fallback: 100 },
];

/** Thẻ Rủi ro: luôn bất lợi */
export const TYPHU_COMMUNITY_CARDS: Card[] = [
  { text: 'Quên đội mũ bảo hiểm, nộp phạt 50$', money: -50 },
  { text: 'Bị bồ đá, tiêu 80$ đi spa chữa lành', money: -80 },
  { text: 'Viện phí 100$', money: -100 },
  { text: 'Dính phạt nguội 120$', money: -120 },
  { text: 'Đua xe bị tóm! Vào tù', jail: true },
  { text: 'Quên ví, lùi lại 3 ô', move: -3 },
  { text: 'Bị gọi lên Cục thuế: bay tới ô Thuế thu nhập', goto: cellNamed('Thuế thu nhập') },
  { text: 'Sửa nhà mùa mưa: 30$ mỗi cấp nhà/sao (ít nhất 30$)', perLevel: 30 },
];

/** khoản người đang tới lượt phải trả mà chưa đủ tiền mặt */
interface Debt {
  amount: number;
  /** chủ nợ (null = ngân hàng) */
  to: TPlayer | null;
  why: string;
  /** trả xong thì chạy tiếp */
  then: () => void;
}

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
  /** cấp nâng của từng ô: số nhà ở ô đất (4 = khách sạn), số sao ở nhà ga */
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
  /** số vé ra tù mỗi người đang cất */
  private tickets: Record<string, number> = {};
  private debt: Debt | null = null;
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
        // đang ở tù: phải trả tiền / dùng vé ra tù trước mới được đổ
        if (this.step !== 'roll' || me.jail !== null) return { ok: false, reason: 'bad_action' };
        this.roll(sanitizeImpulse(a.impulse));
        return { ok: true };
      case 'payJail':
        if (this.step !== 'roll' || me.jail === null) return { ok: false, reason: 'bad_action' };
        // không tự bán nhà đất: thiếu tiền mặt thì người chơi tự bán trước
        if (me.cash < TYPHU_JAIL_FINE) return { ok: false, reason: 'no_money' };
        me.cash -= TYPHU_JAIL_FINE;
        me.jail = null;
        this.addLog('jail', `${me.name} trả ${fmt(TYPHU_JAIL_FINE)}$ để ra tù`);
        this.rollStep();
        return { ok: true };
      case 'useTicket':
        if (this.step !== 'roll' || me.jail === null || !((this.tickets[me.id] ?? 0) > 0)) return { ok: false, reason: 'bad_action' };
        this.useTicket(me);
        this.rollStep();
        return { ok: true };
      case 'stayJail':
        if (this.step !== 'roll' || me.jail === null || me.jail >= TYPHU_JAIL_MAX) return { ok: false, reason: 'bad_action' };
        this.stayJail(me);
        return { ok: true };
      case 'buy': {
        if (this.step === 'ticket') {
          if (me.cash < TYPHU_JAIL_TICKET) return { ok: false, reason: 'no_money' };
          me.cash -= TYPHU_JAIL_TICKET;
          this.tickets[me.id] = (this.tickets[me.id] ?? 0) + 1;
          this.addLog('jail', `${me.name} mua vé ra tù giá ${fmt(TYPHU_JAIL_TICKET)}$ 🎫`);
          this.afterLanding();
          return { ok: true };
        }
        if (this.step !== 'buy' || this.pendingBuy === null) return { ok: false, reason: 'bad_action' };
        const c = TYPHU_BOARD[this.pendingBuy];
        if (!isTyPhuProperty(c) || me.cash < c.price) return { ok: false, reason: 'no_money' };
        me.cash -= c.price;
        this.owners[this.pendingBuy] = me.id;
        this.addLog('buy', `${me.name} mua ${c.name} giá ${fmt(c.price)}$`);
        this.pendingBuy = null;
        this.afterLanding();
        return { ok: true };
      }
      case 'skip':
        if (this.step === 'ticket') {
          this.skipTicket();
          return { ok: true };
        }
        if (this.step === 'upgrade') {
          this.skipUpgrade();
          return { ok: true };
        }
        if (this.step !== 'buy') return { ok: false, reason: 'bad_action' };
        this.skipBuy();
        return { ok: true };
      case 'build':
        return this.build(me, a.cell, a.levels);
      case 'sell':
        return this.sell(me, a.cell, a.levels, a.land);
      case 'endTurn':
        if (this.step !== 'manage') return { ok: false, reason: 'bad_action' };
        this.nextPlayer();
        return { ok: true };
      default:
        return { ok: false, reason: 'bad_action' };
    }
  }

  /**
   * Máy chơi Cờ tỷ phú (mức mạnh nhất, theo luật kinh nghiệm):
   * - luôn giữ một khoản dự phòng để không phá sản vì tiền thuê; mua đất khi còn dư dự phòng,
   *   đất giúp gom đủ bộ màu / ga thì mua kể cả khi dự phòng mỏng;
   * - nâng nhà ở đất của mình khi còn dư dự phòng; ở tù: dùng vé, đủ giàu thì trả tiền ra ngay, không thì ngồi chờ đổ đôi;
   * - nợ: bán nhà trước (ô rẻ trước), hết nhà mới bán đất.
   */
  botAction(playerId: string): GameAction | null {
    if (this.over || this.movement) return null;
    const me = this.players[this.current];
    if (!me || me.id !== playerId || me.bankrupt) return null;
    const reserve = 150 + 40 * this.players.filter((p) => !p.bankrupt && p.id !== me.id).length;
    switch (this.step) {
      case 'roll':
        if (me.jail === null) return { type: 'roll' };
        if ((this.tickets[me.id] ?? 0) > 0) return { type: 'useTicket' };
        if (me.cash >= TYPHU_JAIL_FINE + reserve * 2 || me.jail >= TYPHU_JAIL_MAX) {
          return me.cash >= TYPHU_JAIL_FINE ? { type: 'payJail' } : null;
        }
        return { type: 'stayJail' };
      case 'ticket':
        return me.cash >= TYPHU_JAIL_TICKET + reserve * 3 ? { type: 'buy' } : { type: 'skip' };
      case 'buy': {
        const cell = this.pendingBuy;
        const c = cell === null ? undefined : TYPHU_BOARD[cell];
        if (!c || !isTyPhuProperty(c) || me.cash < c.price) return { type: 'skip' };
        const mates = c.kind === 'land' ? groupCells(c.group) : TYPHU_BOARD.flatMap((x, i) => (x.kind === c.kind ? [i] : []));
        const owned = mates.filter((i) => i !== cell && this.owners[i] === me.id).length;
        const othersOwn = mates.some((i) => i !== cell && this.owners[i] && this.owners[i] !== me.id);
        const completes = c.kind === 'land' && !othersOwn && owned === mates.length - 1;
        const left = me.cash - c.price;
        return left >= reserve || ((completes || owned > 0) && left >= reserve / 3) ? { type: 'buy' } : { type: 'skip' };
      }
      case 'upgrade': {
        const cell = this.pendingBuy;
        if (cell === null) return { type: 'skip' };
        return me.cash - upgradeCostOf(cell) >= reserve ? { type: 'build', cell } : { type: 'skip' };
      }
      case 'manage':
        return { type: 'endTurn' };
      case 'debt': {
        const mine = Object.keys(this.owners).map(Number).filter((i) => this.owners[i] === me.id);
        if (mine.length === 0) return null;
        const price = (i: number) => { const c = TYPHU_BOARD[i]; return isTyPhuProperty(c) ? c.price : 0; };
        const withHouses = mine.filter((i) => (this.houses[i] ?? 0) > 0).sort((a, b) => price(a) - price(b));
        const cell = withHouses[0] ?? [...mine].sort((a, b) => price(a) - price(b))[0];
        return { type: 'sell', cell };
      }
      default:
        return null;
    }
  }

  removePlayer(playerId: string): void {
    const idx = this.players.findIndex((p) => p.id === playerId);
    const p = this.players[idx];
    if (!p || p.bankrupt || this.over) return;
    // chủ nợ bỏ đi: khoản nợ đang chờ thì trả cho ngân hàng
    if (this.debt?.to === p) this.debt.to = null;
    this.bankrupt(p, null, 'đã rời bàn');
    if (this.checkEnd()) return;
    if (idx === this.current) this.nextPlayer();
    else this.ctx.changed();
  }

  onPlayerConnection(playerId: string, _connected: boolean): void {
    if (this.over || this.movement) return;
    const me = this.players[this.current];
    if (!me || me.id !== playerId) return;
    this.armIdle();
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
      tickets: Object.fromEntries(this.players.map((p) => [p.id, this.tickets[p.id] ?? 0])),
      debt: this.step === 'debt' && this.debt ? { amount: this.debt.amount, to: this.debt.to?.id ?? null, why: this.debt.why } : null,
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
   * Nâng cấp kiểu Cờ tỷ phú Việt: dừng ở đất/ga của mình thì được nâng thêm đúng 1 cấp ngay tại ô đó,
   * không cần đủ bộ màu. Đất: nhà cấp 1 → 2 → 3 → khách sạn. Ga: 1 → 2 → 3 sao (ga không xây nhà).
   */
  private build(me: TPlayer, cell: unknown, levels?: unknown): ActionResult {
    if (this.step !== 'upgrade' || this.pendingBuy === null || cell !== this.pendingBuy) return { ok: false, reason: 'cannot_build' };
    const c = TYPHU_BOARD[cell];
    if ((c.kind !== 'land' && c.kind !== 'station') || this.owners[cell] !== me.id) return { ok: false, reason: 'cannot_build' };
    const cur = this.houses[cell] ?? 0;
    const n = levels === undefined ? 1 : levels;
    if (n !== 1 || cur + 1 > maxLevelOf(cell)) return { ok: false, reason: 'cannot_build' };
    const cost = upgradeCostOf(cell);
    // không tự bán nhà đất: thiếu tiền mặt thì người chơi tự chọn bán trước
    if (me.cash < cost) return { ok: false, reason: 'no_money' };
    me.cash -= cost;
    const h = cur + 1;
    this.houses[cell] = h;
    this.addLog('build', c.kind === 'station' ? `${me.name} nâng ${c.name} lên ${h} sao ⭐`
      : h === TYPHU_MAX_HOUSES ? `${me.name} xây khách sạn ở ${c.name} 🏨` : `${me.name} nâng ${c.name} lên nhà cấp ${h}`);
    this.pendingBuy = null;
    this.afterLanding();
    return { ok: true };
  }

  /**
   * Người chơi tự bán (mọi thứ nửa giá mua, đất và nhà tính riêng):
   * `levels` = bán bớt chừng này cấp nhà / sao ga (giữ đất); `land` = bán cả lô (đất + mọi nhà/sao trên đó);
   * không truyền gì = bán 1 lần (1 cấp nếu có, hết nhà thì bán đất).
   */
  private sell(me: TPlayer, cell: unknown, levels?: unknown, land?: unknown): ActionResult {
    if (this.step !== 'roll' && this.step !== 'buy' && this.step !== 'upgrade' && this.step !== 'manage' && this.step !== 'debt') {
      return { ok: false, reason: 'bad_action' };
    }
    if (typeof cell !== 'number' || !Number.isInteger(cell) || cell < 0 || cell >= TYPHU_BOARD.length) {
      return { ok: false, reason: 'bad_action' };
    }
    const c = TYPHU_BOARD[cell];
    if (!isTyPhuProperty(c) || this.owners[cell] !== me.id) {
      return { ok: false, reason: 'bad_action' };
    }
    if (this.step === 'upgrade' && this.pendingBuy === cell) {
      return { ok: false, reason: 'bad_action' };
    }
    const lv = this.houses[cell] ?? 0;
    if (land === true) this.sellLot(me, cell);
    else if (levels !== undefined && levels !== null) {
      if (typeof levels !== 'number' || !Number.isInteger(levels) || levels < 1 || levels > lv) return { ok: false, reason: 'bad_action' };
      this.sellLevels(me, cell, levels);
    } else this.sellOne(me, cell);
    // đang nợ: đủ tiền thì trả luôn rồi chơi tiếp, bán hết vẫn thiếu thì phá sản; còn thiếu thì chờ bán tiếp
    if (this.step === 'debt' && this.settleDebt()) return { ok: true };
    this.armIdle();
    this.ctx.changed();
    return { ok: true };
  }

  /** Bán bớt `n` cấp nhà / sao ở ô `cell` (giữ đất), mỗi cấp nửa giá xây. */
  private sellLevels(p: TPlayer, cell: number, n: number): void {
    const c = TYPHU_BOARD[cell];
    const lv = this.houses[cell] ?? 0;
    const k = Math.min(lv, n);
    if (k <= 0) return;
    p.cash += sellValueOf(cell, lv, { levels: k });
    if (lv - k > 0) this.houses[cell] = lv - k;
    else delete this.houses[cell];
    this.addLog('info', c.kind === 'station' ? `${p.name} bán ${k} sao ở ${c.name}` : `${p.name} bán ${k === lv ? 'hết' : k} nhà ở ${c.name}`);
  }

  /** Bán cả lô: đất + mọi nhà/sao trên đó (từng thứ nửa giá mua). */
  private sellLot(p: TPlayer, cell: number): void {
    const c = TYPHU_BOARD[cell];
    if (!isTyPhuProperty(c)) return;
    const lv = this.houses[cell] ?? 0;
    p.cash += sellValueOf(cell, lv, { land: true });
    delete this.owners[cell];
    delete this.houses[cell];
    this.addLog('info', `${p.name} bán cả lô ${c.name} cho ngân hàng`);
  }

  /** Bán 1 lần ở ô `cell`: còn cấp nhà/sao thì bán bớt 1 cấp, hết thì bán đất. */
  private sellOne(p: TPlayer, cell: number): void {
    const c = TYPHU_BOARD[cell];
    if (!isTyPhuProperty(c)) return;
    const lv = this.houses[cell] ?? 0;
    if (lv > 0) {
      if (lv > 1) this.houses[cell] = lv - 1;
      else delete this.houses[cell];
      p.cash += upgradeCostOf(cell) / 2;
      this.addLog('info', c.kind === 'station' ? `${p.name} bán bớt 1 sao ở ${c.name}` : `${p.name} bán bớt nhà ở ${c.name}`);
    } else {
      delete this.owners[cell];
      delete this.houses[cell];
      p.cash += c.price / 2;
      this.addLog('info', `${p.name} bán ${c.name} cho ngân hàng`);
    }
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
    const delay = kind === 'roll' ? this.rollMs : kind === 'card' ? Math.round(650 / this.speed) : 0;
    const duration = delay + Math.max(1, path.length) * Math.round(TYPHU_MOVE_STEP_MS / this.speed);
    this.movement = { id: ++this.movementSeq, playerId: me.id, from, to: path.at(-1) ?? from, path, startedAt, endsAt: startedAt + duration, delay, kind };
    me.pos = this.movement.to;
    this.step = 'wait'; this.pendingBuy = null; this.turnEndsAt = this.movement.endsAt;
    this.timer.set(duration, () => {
      this.movement = null;
      this.throwView = null;
      // chỉ thưởng khi đi VƯỢT QUA Xuất phát; dừng đúng ô Xuất phát thì không được thưởng (mà được ăn hũ)
      if (steps > 0 && from + steps > TYPHU_SIZE) this.passStart(me);
      this.land(allowCard);
    });
    this.ctx.changed();
  }

  /** Bay thẳng tới ô `cell` (sân bay, thẻ bay): không đi qua từng ô nên không nhận thưởng qua Xuất phát. */
  private flyTo(cell: number, allowCard: boolean): void {
    const me = this.players[this.current], from = me.pos;
    const startedAt = Date.now();
    const delay = Math.round(FLY_DELAY_MS / this.speed);
    const duration = delay + Math.round(FLY_MS / this.speed);
    this.movement = { id: ++this.movementSeq, playerId: me.id, from, to: cell, path: [cell], startedAt, endsAt: startedAt + duration, delay, kind: 'fly' };
    me.pos = cell;
    this.step = 'wait'; this.pendingBuy = null; this.turnEndsAt = this.movement.endsAt;
    this.timer.set(duration, () => {
      this.movement = null;
      this.throwView = null;
      this.land(allowCard);
    });
    this.ctx.changed();
  }

  private passStart(me: TPlayer): void {
    me.cash += TYPHU_PASS_START;
    this.addLog('start', `${me.name} qua Xuất phát, nhận ${fmt(TYPHU_PASS_START)}$`);
  }

  /** Ở tù: chọn ngồi thêm lượt này (tối đa TYPHU_JAIL_MAX lượt) */
  private stayJail(me: TPlayer): void {
    if (me.jail === null) return;
    me.jail++;
    this.addLog('jail', `${me.name} ở lại tù (${me.jail}/${TYPHU_JAIL_MAX} lượt)`);
    this.wait(() => this.nextPlayer());
  }

  private useTicket(me: TPlayer): void {
    this.tickets[me.id] = Math.max(0, (this.tickets[me.id] ?? 0) - 1);
    me.jail = null;
    this.addLog('jail', `${me.name} dùng vé ra tù 🎫`);
  }

  /** Tiền thuê khi dừng ở ô `cell` của `owner` */
  private rentAt(cell: number, owner: string): number {
    const c = TYPHU_BOARD[cell];
    const count = Object.entries(this.owners).filter(([i, id]) => id === owner && TYPHU_BOARD[Number(i)].kind === c.kind).length;
    if (c.kind === 'station') return stationRent(count, this.houses[cell] ?? 0);
    if (c.kind === 'utility') return utilityRent(count, (this.dice?.[0] ?? 0) + (this.dice?.[1] ?? 0));
    return rentOf(cell, this.houses[cell] ?? 0, this.ownsGroup(owner, cell));
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
          // đủ tiền nếu tự bán bớt nhà đất thì vẫn hỏi mua (người chơi tự chọn bán)
          if (me.cash + this.liquidValue(me) >= c.price) {
            this.pendingBuy = me.pos;
            this.step = 'buy';
            // không đếm ngược khi chọn mua: chỉ tự bỏ qua nếu treo máy quá lâu
            this.armIdle();
            this.ctx.changed();
            return;
          }
          this.addLog('info', `${me.name} không đủ tiền mua ${c.name}`);
        } else if (owner === me.id) {
          const lv = this.houses[me.pos] ?? 0;
          if (lv < maxLevelOf(me.pos) && me.cash + this.liquidValue(me, me.pos) >= upgradeCostOf(me.pos)) {
            this.pendingBuy = me.pos;
            this.step = 'upgrade';
            this.armIdle();
            this.ctx.changed();
            return;
          }
        } else {
          const o = this.players.find((p) => p.id === owner)!;
          // chủ đang ngồi tù thì không thu được tiền thuê
          if (o.jail !== null) {
            this.addLog('info', `${o.name} đang ngồi tù, ${me.name} vào ${c.name} không mất tiền thuê`);
            break;
          }
          const rent = this.rentAt(me.pos, owner);
          return this.pay(me, rent, o, `trả tiền thuê ${c.name}`, () => {
            this.addLog('rent', `${me.name} trả ${fmt(rent)}$ tiền thuê ${c.name} cho ${o.name}`);
            this.afterLanding();
          });
        }
        break;
      }
      case 'tax':
        return this.pay(me, c.amount, null, `nộp ${c.name}`, () => {
          this.addLog('tax', `${me.name} nộp ${c.name} ${fmt(c.amount)}$`);
          this.afterLanding();
        });
      case 'start':
        // dừng đúng ô Xuất phát: không được đồng nào (chỉ đi vượt qua mới được thưởng)
        break;
      case 'airport': {
        const dest = this.pickFlight();
        this.addLog('info', `${me.name} lên máy bay ✈️ bay tới ${TYPHU_BOARD[dest].name}`);
        return this.flyTo(dest, true);
      }
      case 'gotojail':
        this.sendToJail(me, 'bị tóm');
        return this.wait(() => this.nextPlayer());
      case 'chance':
      case 'community':
        if (allowCard) return this.drawCard(c.kind === 'chance');
        break;
      default:
        break;
    }
    this.afterLanding();
  }

  /** ô ngẫu nhiên cho chuyến bay ở Sân bay (mọi ô trừ chính Sân bay) */
  private pickFlight(): number {
    const k = Math.min(TYPHU_SIZE - 2, Math.max(0, Math.floor(this.ctx.rng() * (TYPHU_SIZE - 1))));
    return k >= TYPHU_AIRPORT ? k + 1 : k;
  }

  /** Rút thẻ: `good` = ô Cơ hội (thẻ luôn tốt), không thì ô Rủi ro (thẻ luôn xấu). */
  private drawCard(good: boolean): void {
    const me = this.players[this.current];
    const deck = good ? TYPHU_CARDS : TYPHU_COMMUNITY_CARDS;
    const card = deck[Math.min(deck.length - 1, Math.floor(this.ctx.rng() * deck.length))];
    this.card = { id: ++this.logSeq, text: card.text, good };
    this.addLog('card', `${me.name} rút thẻ ${good ? 'Cơ hội' : 'Rủi ro'}: ${card.text}`);
    if (card.money && card.money > 0) me.cash += card.money;
    if (card.each) {
      // người khác mừng bằng tiền mặt đang có, không bắt bán nhà
      for (const o of this.players) {
        if (o === me || o.bankrupt) continue;
        const amt = Math.min(Math.max(0, o.cash), card.each);
        o.cash -= amt;
        me.cash += amt;
      }
    }
    let cost = card.money && card.money < 0 ? -card.money : 0;
    if (card.perLevel) {
      const n = Object.entries(this.houses).filter(([i]) => this.owners[Number(i)] === me.id).reduce((s, [, h]) => s + h, 0);
      cost += Math.max(1, n) * card.perLevel;
    }
    const next = () => this.cardEffect(card);
    if (cost > 0) return this.pay(me, cost, null, 'trả thẻ Rủi ro', next);
    next();
  }

  private cardEffect(card: Card): void {
    const me = this.players[this.current];
    if (card.ticket) {
      // chỉ mua bằng tiền mặt đang có, không bắt bán nhà
      if (me.cash >= TYPHU_JAIL_TICKET) {
        this.step = 'ticket';
        this.pendingBuy = null;
        this.armIdle();
        this.ctx.changed();
        return;
      }
      this.addLog('info', `${me.name} không đủ ${fmt(TYPHU_JAIL_TICKET)}$ tiền mặt để mua vé ra tù`);
      return this.afterLanding();
    }
    if (card.jail) {
      this.sendToJail(me, 'theo thẻ Rủi ro');
      return this.wait(() => this.nextPlayer());
    }
    if (card.goto !== undefined) return this.flyTo(card.goto, false);
    if (card.ownLand) {
      for (let k = 1; k < TYPHU_SIZE; k++) {
        const i = (me.pos + k) % TYPHU_SIZE;
        if (this.owners[i] === me.id && maxLevelOf(i) > 0) return this.moveBy(k, false, 'card');
      }
      if (card.fallback) {
        me.cash += card.fallback;
        this.addLog('info', `${me.name} chưa có đất, nhận ${fmt(card.fallback)}$`);
      }
      return this.afterLanding();
    }
    if (card.move) return this.moveBy(card.move, false, 'card');
    this.afterLanding();
  }

  private skipBuy(): void {
    if (this.step !== 'buy' || this.pendingBuy === null) return;
    const me = this.players[this.current];
    this.addLog('info', `${me.name} bỏ qua ${TYPHU_BOARD[this.pendingBuy].name}`);
    this.pendingBuy = null;
    this.afterLanding();
  }

  private skipTicket(): void {
    if (this.step !== 'ticket') return;
    this.addLog('info', `${this.players[this.current].name} không mua vé ra tù`);
    this.afterLanding();
  }

  private skipUpgrade(): void {
    if (this.step !== 'upgrade') return;
    this.pendingBuy = null;
    this.afterLanding();
  }

  /** Sau khi xử lý xong ô đứng: đổ tiếp (nếu đổ đôi), hoặc sang lượt sau */
  private afterLanding(): void {
    if (this.over) return;
    const me = this.players[this.current];
    if (me.bankrupt) return this.afterBankrupt();
    if (this.checkEnd()) return;
    if (this.rolledDouble && me.jail === null) return this.beginRoll();
    this.wait(() => this.nextPlayer());
  }

  private afterBankrupt(): void {
    if (this.over) return;
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

  // ---------- trả tiền & nợ ----------

  /**
   * `payer` (người đang tới lượt) phải trả `amount` cho `to` (null = ngân hàng).
   * Đủ tiền mặt: trả luôn rồi chạy `then`. Thiếu: chuyển sang bước "debt", người chơi tự chọn bán
   * nhà đất từng ô cho tới khi đủ. Không còn gì để bán mà vẫn thiếu thì phá sản.
   */
  private pay(payer: TPlayer, amount: number, to: TPlayer | null, why: string, then: () => void): void {
    if (amount <= 0) return then();
    if (payer.cash >= amount) {
      this.transfer(payer, amount, to);
      return then();
    }
    if (!this.hasAssets(payer)) {
      this.goBroke(payer, to, why);
      return this.afterBankrupt();
    }
    this.debt = { amount, to, why, then };
    this.step = 'debt';
    this.pendingBuy = null;
    this.addLog('info', `${payer.name} thiếu ${fmt(amount - payer.cash)}$ để ${why}, phải bán nhà đất`);
    this.armIdle();
    this.ctx.changed();
  }

  private transfer(payer: TPlayer, amount: number, to: TPlayer | null): void {
    payer.cash -= amount;
    if (to) to.cash += amount;
  }

  /** Sau mỗi lần bán ở bước "debt": đủ tiền thì trả rồi chơi tiếp; hết nhà đất mà vẫn thiếu thì phá sản. */
  private settleDebt(): boolean {
    const d = this.debt;
    const me = this.players[this.current];
    if (!d || !me) return false;
    if (me.cash >= d.amount) {
      this.debt = null;
      this.transfer(me, d.amount, d.to);
      d.then();
      return true;
    }
    if (!this.hasAssets(me)) {
      this.debt = null;
      this.goBroke(me, d.to, d.why);
      this.afterBankrupt();
      return true;
    }
    return false;
  }

  /** Người chơi treo máy quá lâu ở bước "debt": hệ thống bán giúp (rẻ trước) cho đủ rồi trả. */
  private autoSettle(): void {
    const d = this.debt;
    const me = this.players[this.current];
    if (this.step !== 'debt' || !d || !me) return;
    this.addLog('info', `${me.name} treo máy quá lâu, hệ thống bán giúp nhà đất`);
    this.liquidate(me, d.amount);
    if (!this.settleDebt()) {
      this.armIdle();
      this.ctx.changed();
    }
  }

  /** Trả hết tiền mặt còn lại cho chủ nợ rồi phá sản */
  private goBroke(p: TPlayer, to: TPlayer | null, why: string): void {
    const paid = Math.max(0, p.cash);
    if (to) to.cash += paid;
    p.cash = 0;
    this.bankrupt(p, to, `không đủ tiền ${why}`);
  }

  private hasAssets(p: TPlayer): boolean {
    return Object.values(this.owners).some((o) => o === p.id);
  }

  /** Số tiền thu được nếu bán hết nhà và đất cho ngân hàng (nửa giá) */
  private liquidValue(p: TPlayer, excludeCell?: number): number {
    return liquidValueOf(p.id, this.owners, this.houses, excludeCell);
  }

  /** Chỉ dùng khi người chơi treo máy: bán dần nhà/sao rồi đất (rẻ trước) cho ngân hàng tới khi đủ `need` */
  private liquidate(p: TPlayer, need: number): void {
    const byValue = (i: number) => (TYPHU_BOARD[i] as { price: number }).price;
    const mine = TYPHU_BOARD.flatMap((c, i) => (isTyPhuProperty(c) && this.owners[i] === p.id ? [i] : [])).sort((a, b) => byValue(a) - byValue(b));
    for (const i of mine) while (p.cash < need && (this.houses[i] ?? 0) > 0) this.sellOne(p, i);
    for (const i of mine) {
      if (p.cash >= need) break;
      if ((this.houses[i] ?? 0) === 0 && this.owners[i] === p.id) this.sellOne(p, i);
    }
  }

  private bankrupt(p: TPlayer, to: TPlayer | null, why: string): void {
    p.bankrupt = true;
    p.jail = null;
    delete this.tickets[p.id];
    for (const [i, owner] of Object.entries(this.owners)) {
      if (owner === p.id) {
        delete this.owners[Number(i)];
        delete this.houses[Number(i)];
      }
    }
    this.addLog('bankrupt', `${p.name} ${why}, phá sản 💸${to ? ` (chủ nợ: ${to.name})` : ''}`);
  }

  /** Chỉ còn đúng 1 người trụ lại thì người đó thắng (không có luật thắng nhanh nào khác) */
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
    this.pendingBuy = null;
    this.debt = null;
    const me = this.players[this.current];
    // ngồi tù đủ lượt tối đa: bắt buộc ra (có vé thì dùng vé, không thì trả tiền; thiếu thì tự chọn bán tài sản)
    if (me && me.jail !== null && me.jail >= TYPHU_JAIL_MAX) {
      if ((this.tickets[me.id] ?? 0) > 0) this.useTicket(me);
      else {
        return this.pay(me, TYPHU_JAIL_FINE, null, 'trả tiền ra tù', () => {
          me.jail = null;
          this.addLog('jail', `${me.name} ngồi đủ ${TYPHU_JAIL_MAX} lượt, trả ${fmt(TYPHU_JAIL_FINE)}$ ra tù`);
          this.rollStep();
        });
      }
    }
    this.rollStep();
  }

  /** chờ người đang tới lượt đổ xúc xắc (hoặc, nếu đang ở tù, chọn trả tiền / dùng vé / ở lại) */
  private rollStep(): void {
    this.step = 'roll';
    this.pendingBuy = null;
    // không đếm ngược lúc tung: chỉ làm giúp khi người chơi treo máy quá lâu
    this.armIdle();
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

  /** hẹn giờ làm giúp khi người chơi treo máy (hoặc mất kết nối) ở bước đang chờ họ quyết định */
  private armIdle(): void {
    const me = this.players[this.current];
    if (this.step === 'roll') {
      // treo máy khi đang ở tù: coi như chọn ở lại (đủ lượt tối đa thì beginRoll đã bắt trả tiền)
      if (me && me.jail !== null) this.armTimer(() => this.stayJail(me), ROLL_IDLE_MS);
      else this.armTimer(() => this.roll(), ROLL_IDLE_MS);
    } else if (this.step === 'ticket') this.armTimer(() => this.skipTicket(), ROLL_IDLE_MS);
    else if (this.step === 'buy') this.armTimer(() => this.skipBuy(), ROLL_IDLE_MS);
    else if (this.step === 'upgrade') this.armTimer(() => this.skipUpgrade(), ROLL_IDLE_MS);
    else if (this.step === 'debt') this.armTimer(() => this.autoSettle(), ROLL_IDLE_MS);
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
      if (isTyPhuProperty(c)) w += c.price + (this.houses[Number(i)] ?? 0) * upgradeCostOf(Number(i));
    }
    return w;
  }

  private end(winner: TPlayer | null): void {
    if (this.over) return;
    this.over = true;
    this.movement = null;
    this.debt = null;
    this.step = 'wait';
    this.timer.clear();
    const ranked = [...this.players].sort((a, b) => {
      if (winner && (a === winner || b === winner)) return a === winner ? -1 : 1;
      if (a.bankrupt !== b.bankrupt) return a.bankrupt ? 1 : -1;
      return this.worth(b) - this.worth(a);
    });
    const top = winner ?? ranked.find((p) => !p.bankrupt) ?? null;
    this.ctx.finish({
      winnerId: top?.id ?? null,
      headline: top ? `${top.name} trở thành tỷ phú với ${fmt(this.worth(top))}$!` : 'Cả bàn phá sản',
      ranking: ranked.map((p) => ({
        playerId: p.id,
        name: p.name,
        detail: p.bankrupt ? 'phá sản' : `tài sản ${fmt(this.worth(p))}$`,
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
