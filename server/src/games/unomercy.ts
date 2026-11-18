/**
 * Server Engine: 🃏 UNO Tàn Nhẫn — UNO Show 'Em No Mercy (`uno_mercy`, 2–12 người + Bot tàn nhẫn).
 *
 * Luật chuẩn Show 'Em No Mercy:
 * - Bộ bài 168 lá đặc trưng (+2, +4 màu, Xả Cùng Màu, Bỏ Tất Cả, Số 0 Xoay Bài, Số 7 Tráo Bài,
 *   Vòng Quay Tử Thần, Đảo Chiều +4, Siêu Phạt +6, Hủy Diệt +10).
 * - Cộng dồn không đáy (+2/+4/+6/+10): chồng lá có mức rút >= lá trước đó.
 * - Luật Nổ Bài (Mercy Rule >= 25 lá): bất kỳ ai chạm mốc 25 lá trên tay bị loại ngay lập tức!
 * - Rút bài tới khi có lá đánh được (Draw-Until-Playable) & Hô UNO / Bắt lỗi quên hô (+2 lá).
 */
import {
  UNO_COLORS,
  UNO_COLOR_META,
  UNO_HAND_START,
  UNO_MERCY_LIMIT,
  UNO_SWAP_SECONDS,
  UNO_TURN_SECONDS,
  canPlayUnoCard,
  getUnoCardLabel,
  getUnoDrawValue,
  isUnoWild,
  type UnoCard,
  type UnoCardKind,
  type UnoColor,
  type UnoLogEntry,
  type UnoMercyEffectBanner,
  type UnoMercyPhase,
  type UnoMercyView,
} from '../../../shared/src/unomercy';
import {
  DISRUPT_MAX_BONUS_MS,
  type ActionResult,
  type GameAction,
  type RankEntry,
} from '../../../shared/src/types';
import { Timer, type EngineContext, type EnginePlayer, type GameEngine } from './engine';

const CLEAN_OPENING_KINDS = new Set<UnoCardKind>(['1', '2', '3', '4', '5', '6', '8', '9']);
const LOG_LIMIT = 40;

/** Băm tất định phục vụ Bot AI (tránh gọi rng làm lệch chuỗi ngẫu nhiên khi Room dò botAction 2 lần) */
function hash01(seq: number, salt: string): number {
  let h = (seq * 2654435761) >>> 0;
  for (let i = 0; i < salt.length; i++) {
    h = Math.imul(h ^ salt.charCodeAt(i), 16777619) >>> 0;
  }
  h ^= h >>> 15;
  h = Math.imul(h, 2246822507) >>> 0;
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

export class UnoMercyGame implements GameEngine {
  readonly perPlayerView = true;

  private readonly turnMs: number;
  private readonly swapMs: number;

  private order: string[] = [];
  private alive: string[] = [];
  private eliminated: { id: string; reason: 'mercy_25' | 'left'; peakCards: number }[] = [];
  private names = new Map<string, string>();
  private hands = new Map<string, UnoCard[]>();

  private deck: UnoCard[] = [];
  private discardPile: UnoCard[] = [];
  private topCard!: UnoCard;
  private activeColor: UnoColor = 'red';

  private phase: UnoMercyPhase = 'playing';
  private currentPlayerId: string | null = null;
  private direction: 1 | -1 = 1;
  private turnEndsAt: number | null = null;
  private turnSeconds = UNO_TURN_SECONDS;
  private turnBonusMs = 0;

  private drawStack = 0;
  private drawMinValue: 0 | 2 | 4 | 6 | 10 = 0;
  private roulettePending = false;
  private drewThisTurn = false;

  private unoSafeIds = new Set<string>();
  private unoVulnerableId: string | null = null;
  private unoVulnerableSeq = 0;
  private turnSeq = 0;

  private cardSeq = 0;
  private logSeq = 0;
  private bannerSeq = 0;
  private lastBanner: UnoMercyEffectBanner | null = null;
  private log: UnoLogEntry[] = [];

  private finished = false;
  private readonly timer = new Timer();

  constructor(private readonly ctx: EngineContext) {
    this.turnMs = ctx.turnMs ?? UNO_TURN_SECONDS * 1000;
    this.swapMs = ctx.turnMs ? Math.max(40, Math.round(ctx.turnMs * 0.75)) : UNO_SWAP_SECONDS * 1000;
  }

  // ================= Khởi tạo bộ bài 168 lá chuẩn Show 'Em No Mercy =================

  private mintCard(color: UnoColor | 'wild', kind: UnoCardKind): UnoCard {
    return {
      id: `um_${++this.cardSeq}`,
      color,
      kind,
    };
  }

  /**
   * Tạo 1 hộp bài 168 lá chuẩn UNO Show 'Em No Mercy:
   * - Mỗi màu (4 màu × 36 lá = 144 lá):
   *   + Hai bộ số '0'..'9' (20 lá)
   *   + 3 'skip', 3 'reverse', 2 'skip_all', 3 'discard_all', 3 'draw2', 2 'draw4' (16 lá)
   * - Bài Wild (24 lá):
   *   + 8 'wild_roulette', 8 'wild_reverse_draw4', 4 'wild_draw6', 4 'wild_draw10'
   */
  private buildShoe(): UnoCard[] {
    const cards: UnoCard[] = [];
    const numbers: UnoCardKind[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    for (const color of UNO_COLORS) {
      for (const n of numbers) {
        cards.push(this.mintCard(color, n), this.mintCard(color, n));
      }
      for (let i = 0; i < 3; i++) cards.push(this.mintCard(color, 'skip'));
      for (let i = 0; i < 3; i++) cards.push(this.mintCard(color, 'reverse'));
      for (let i = 0; i < 2; i++) cards.push(this.mintCard(color, 'skip_all'));
      for (let i = 0; i < 3; i++) cards.push(this.mintCard(color, 'discard_all'));
      for (let i = 0; i < 3; i++) cards.push(this.mintCard(color, 'draw2'));
      for (let i = 0; i < 2; i++) cards.push(this.mintCard(color, 'draw4'));
    }
    for (let i = 0; i < 8; i++) cards.push(this.mintCard('wild', 'wild_roulette'));
    for (let i = 0; i < 8; i++) cards.push(this.mintCard('wild', 'wild_reverse_draw4'));
    for (let i = 0; i < 4; i++) cards.push(this.mintCard('wild', 'wild_draw6'));
    for (let i = 0; i < 4; i++) cards.push(this.mintCard('wild', 'wild_draw10'));
    return this.shuffle(cards);
  }

  private shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.ctx.rng() * (i + 1)) % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /** Rút 1 lá từ nọc; tự xào lại chồng bài bỏ hoặc châm thêm hộp bài mới nếu bàn 12 người ôm quá nhiều bài! */
  private drawRawCard(): UnoCard {
    if (this.deck.length === 0 && this.discardPile.length > 0) {
      this.deck = this.shuffle(this.discardPile);
      this.discardPile = [];
    }
    if (this.deck.length === 0) {
      this.deck = this.buildShoe();
    }
    return this.deck.pop()!;
  }

  private nameOf(id: string | null | undefined): string {
    if (!id) return 'Người chơi';
    return this.names.get(id) ?? 'Người chơi';
  }

  private pushLog(text: string, tone: UnoLogEntry['tone'] = 'normal'): void {
    this.log.push({ id: ++this.logSeq, text, tone });
    if (this.log.length > LOG_LIMIT) {
      this.log.splice(0, this.log.length - LOG_LIMIT);
    }
  }

  private emitBanner(
    kind: UnoMercyEffectBanner['kind'],
    headline: string,
    subtext?: string,
    actorId?: string,
    targetId?: string,
  ): void {
    this.lastBanner = {
      id: ++this.bannerSeq,
      kind,
      headline,
      ...(subtext ? { subtext } : {}),
      ...(actorId ? { actorId } : {}),
      ...(targetId ? { targetId } : {}),
    };
  }

  // ================= Vòng đời ván chơi =================

  start(players: EnginePlayer[]): void {
    this.order = players.map((p) => p.id);
    this.alive = [...this.order];
    this.eliminated = [];
    this.hands.clear();
    this.names.clear();
    for (const p of players) {
      this.names.set(p.id, p.name);
      this.hands.set(p.id, []);
    }

    this.deck = this.buildShoe();
    this.discardPile = [];

    for (let r = 0; r < UNO_HAND_START; r++) {
      for (const pid of this.order) {
        this.hands.get(pid)!.push(this.drawRawCard());
      }
    }

    // Chọn lá mở màn sạch (lá số có màu khác 0 và 7)
    let openIdx = -1;
    for (let i = this.deck.length - 1; i >= 0; i--) {
      const c = this.deck[i];
      if (c.color !== 'wild' && CLEAN_OPENING_KINDS.has(c.kind)) {
        openIdx = i;
        break;
      }
    }
    if (openIdx >= 0) {
      this.topCard = this.deck.splice(openIdx, 1)[0];
    } else {
      this.topCard = this.mintCard('red', '1');
    }
    this.activeColor = this.topCard.color === 'wild' ? 'red' : this.topCard.color;

    this.direction = 1;
    this.drawStack = 0;
    this.drawMinValue = 0;
    this.roulettePending = false;
    this.drewThisTurn = false;
    this.unoSafeIds.clear();
    this.unoVulnerableId = null;

    const firstId = this.alive[0] ?? null;
    this.pushLog(
      `🃏 Khai cuộc UNO Tàn Nhẫn! Lá mở màn: ${this.topCard.kind} ${UNO_COLOR_META[this.activeColor].name}. Cầm đủ ${UNO_MERCY_LIMIT} lá sẽ NỔ BÀI!`,
      'normal',
    );
    this.beginTurn(firstId, 'playing');
  }

  private getNextAlive(fromId: string, steps = 1): string | null {
    const n = this.alive.length;
    if (n === 0) return null;
    const idx = this.alive.indexOf(fromId);
    if (idx === -1) return this.alive[0] ?? null;
    const nextIdx = (((idx + this.direction * steps) % n) + n) % n;
    return this.alive[nextIdx] ?? null;
  }

  private beginTurn(playerId: string | null, nextPhase: UnoMercyPhase): void {
    if (this.finished) return;
    if (!playerId || this.alive.length <= 1) {
      this.finishBySoleSurvivor();
      return;
    }

    // Nếu người chơi trước đó bấm Hô UNO sớm khi đang cầm >= 2 lá nhưng kết thúc lượt vẫn không xuống 1 lá -> dọn cờ
    for (const safeId of [...this.unoSafeIds]) {
      const len = this.hands.get(safeId)?.length ?? 0;
      if (len !== 1) this.unoSafeIds.delete(safeId);
    }
    if (this.unoVulnerableId) {
      const vLen = this.hands.get(this.unoVulnerableId)?.length ?? 0;
      if (!this.alive.includes(this.unoVulnerableId) || vLen !== 1) {
        this.unoVulnerableId = null;
      }
    }

    this.currentPlayerId = playerId;
    this.phase = nextPhase;
    if (nextPhase === 'playing') {
      this.drewThisTurn = false;
      this.turnSeq++;
    }
    this.turnBonusMs = 0;

    const baseMs = nextPhase === 'choose_swap' ? this.swapMs : this.turnMs;
    this.turnSeconds = Math.max(1, Math.round(baseMs / 1000));
    this.scheduleTurnTimer(baseMs);
  }

  private scheduleTurnTimer(ms: number): void {
    if (this.finished || !this.currentPlayerId) {
      this.turnEndsAt = null;
      this.timer.clear();
      return;
    }
    const curId = this.currentPlayerId;
    const offlineHuman = !this.ctx.isBot?.(curId) && !this.ctx.isConnected(curId);
    const effectiveMs = offlineHuman ? Math.min(ms, 1500) : ms;
    this.turnEndsAt = Date.now() + effectiveMs;
    this.timer.set(effectiveMs, () => this.onTurnTimeout());
  }

  private onTurnTimeout(): void {
    if (this.finished || !this.currentPlayerId) return;
    const curId = this.currentPlayerId;

    if (this.phase === 'choose_swap') {
      const targetId = this.pickFewestCardsOpponent(curId);
      if (targetId) {
        this.action(curId, { type: 'um_pick_swap', targetId });
      } else {
        const nextId = this.getNextAlive(curId, 1);
        this.beginTurn(nextId, 'playing');
        this.ctx.changed();
      }
      return;
    }

    if (this.drewThisTurn) {
      this.action(curId, { type: 'um_pass' });
      return;
    }

    this.action(curId, { type: 'um_draw' });
    // Nếu vừa rút được bài hợp lệ trên lượt hết giờ, tự động nhường lượt ngay để cả bàn không phải chờ lần 2
    if (!this.finished && this.currentPlayerId === curId && this.drewThisTurn) {
      this.action(curId, { type: 'um_pass' });
    }
  }

  private isCardPlayable(card: UnoCard): boolean {
    return canPlayUnoCard(
      card,
      this.topCard,
      this.activeColor,
      this.drawStack,
      this.drawMinValue,
      this.roulettePending,
    );
  }

  /** Kiểm tra xem người chơi có lá discard_all hợp lệ nào giúp hạ thẳng xuống đúng 1 lá không */
  private canDropToOneThisTurn(playerId: string): boolean {
    const hand = this.hands.get(playerId) ?? [];
    if (hand.length < 2) return false;
    if (hand.length === 2) return true;
    for (const c of hand) {
      if (c.kind === 'discard_all' && this.isCardPlayable(c)) {
        const remaining = hand.filter((x) => x.color !== c.color).length;
        if (remaining === 1) return true;
      }
    }
    return false;
  }

  /** Kiểm tra Luật Nổ Bài (>= 25 lá): trả về `true` nếu người chơi bị loại khỏi ván! */
  private checkMercyElimination(playerId: string): boolean {
    if (this.finished || !this.alive.includes(playerId)) return false;
    const hand = this.hands.get(playerId) ?? [];
    if (hand.length < UNO_MERCY_LIMIT) return false;

    const peakCards = hand.length;
    const returned = this.shuffle([...hand]);
    // Đẩy bài của người bị loại xuống đáy nọc
    this.deck.unshift(...returned);
    this.hands.set(playerId, []);

    this.alive = this.alive.filter((id) => id !== playerId);
    this.eliminated.push({ id: playerId, reason: 'mercy_25', peakCards });
    this.unoSafeIds.delete(playerId);
    if (this.unoVulnerableId === playerId) {
      this.unoVulnerableId = null;
    }

    const name = this.nameOf(playerId);
    this.emitBanner(
      'mercy_ko',
      `💥 NỔ BÀI ${peakCards} LÁ! ${name} BỊ LOẠI!`,
      `Chạm mốc Tử Thần ${UNO_MERCY_LIMIT} lá — Cháy bài rời cuộc chơi!`,
      undefined,
      playerId,
    );
    this.pushLog(`💥 CHÁY BÀI! ${name} ôm ${peakCards} lá (>= ${UNO_MERCY_LIMIT}) và bị loại trực tiếp!`, 'mercy');

    if (this.alive.length <= 1) {
      this.finishBySoleSurvivor();
    }
    return true;
  }

  // ================= Xử lý Action =================

  action(playerId: string, action: GameAction): ActionResult {
    if (this.finished) return { ok: false, reason: 'not_playing' };

    if (action.type === 'end') {
      if (playerId !== this.ctx.hostId()) return { ok: false, reason: 'not_host' };
      this.finishEarlyByHost();
      return { ok: true };
    }

    if (!this.alive.includes(playerId)) {
      return { ok: false, reason: 'bad_action' };
    }

    switch (action.type) {
      case 'um_shout_uno':
        return this.handleShoutUno(playerId);
      case 'um_catch_uno':
        return this.handleCatchUno(playerId, action.targetId);
      case 'um_pick_swap':
        return this.handlePickSwap(playerId, action.targetId);
      case 'um_draw':
        return this.handleDraw(playerId);
      case 'um_pass':
        return this.handlePass(playerId);
      case 'um_play':
        return this.handlePlay(playerId, action.cardId, action.chosenColor, action.swapTargetId);
      default:
        return { ok: false, reason: 'bad_action' };
    }
  }

  private handleShoutUno(playerId: string): ActionResult {
    const hand = this.hands.get(playerId) ?? [];
    if (this.unoSafeIds.has(playerId)) {
      return { ok: false, reason: 'bad_action' };
    }

    const isMyActivePlayTurn =
      this.phase === 'playing' &&
      this.currentPlayerId === playerId &&
      !this.roulettePending;
    const canPreShout = isMyActivePlayTurn && this.canDropToOneThisTurn(playerId);
    const canSelfSave = hand.length === 1;

    if (!canPreShout && !canSelfSave) {
      return { ok: false, reason: 'bad_action' };
    }

    this.unoSafeIds.add(playerId);
    if (this.unoVulnerableId === playerId) {
      this.unoVulnerableId = null;
    }

    const name = this.nameOf(playerId);
    this.pushLog(`🔥 ${name} hô vang: "UNO!!" — An toàn tuyệt đối!`, 'uno');
    this.ctx.changed();
    return { ok: true };
  }

  private handleCatchUno(catcherId: string, targetId: string): ActionResult {
    if (
      typeof targetId !== 'string' ||
      catcherId === targetId ||
      this.unoVulnerableId !== targetId ||
      !this.alive.includes(targetId)
    ) {
      return { ok: false, reason: 'bad_action' };
    }
    const targetHand = this.hands.get(targetId) ?? [];
    if (targetHand.length !== 1) {
      this.unoVulnerableId = null;
      return { ok: false, reason: 'bad_action' };
    }

    this.unoVulnerableId = null;
    this.unoSafeIds.delete(targetId);

    targetHand.push(this.drawRawCard(), this.drawRawCard());

    const catcherName = this.nameOf(catcherId);
    const targetName = this.nameOf(targetId);
    this.emitBanner(
      'uno_catch',
      `🚨 BẮT QUẢ TANG! ${targetName} quên hô UNO — phạt +2 lá!`,
      `${catcherName} nhanh tay bắt lỗi thành công!`,
      catcherId,
      targetId,
    );
    this.pushLog(`🚨 ${catcherName} bắt quả tang ${targetName} quên hô UNO (+2 lá phạt)!`, 'uno');

    this.checkMercyElimination(targetId);
    this.ctx.changed();
    return { ok: true };
  }

  private handlePickSwap(playerId: string, targetId: string): ActionResult {
    if (this.phase !== 'choose_swap' || playerId !== this.currentPlayerId) {
      return { ok: false, reason: 'not_your_turn' };
    }
    if (typeof targetId !== 'string' || targetId === playerId || !this.alive.includes(targetId)) {
      return { ok: false, reason: 'bad_action' };
    }

    const nextId = this.getNextAlive(playerId, 1);
    this.performSwap7(playerId, targetId);
    if (this.finished) return { ok: true };

    const effectiveNext = nextId && this.alive.includes(nextId) ? nextId : this.getNextAlive(playerId, 1);
    this.beginTurn(effectiveNext, 'playing');
    this.ctx.changed();
    return { ok: true };
  }

  private performSwap7(actorId: string, targetId: string): void {
    const actorHand = this.hands.get(actorId) ?? [];
    const targetHand = this.hands.get(targetId) ?? [];
    const myOldCount = actorHand.length;
    const theirOldCount = targetHand.length;

    this.hands.set(actorId, targetHand);
    this.hands.set(targetId, actorHand);

    // Cập nhật trạng thái UNO sau khi tráo bài (nhận 1 lá qua tráo bài được bảo vệ an toàn khỏi bị bắt oan)
    this.unoSafeIds.delete(actorId);
    this.unoSafeIds.delete(targetId);
    if (this.unoVulnerableId === actorId || this.unoVulnerableId === targetId) {
      this.unoVulnerableId = null;
    }
    if ((this.hands.get(actorId)?.length ?? 0) === 1) this.unoSafeIds.add(actorId);
    if ((this.hands.get(targetId)?.length ?? 0) === 1) this.unoSafeIds.add(targetId);

    const actorName = this.nameOf(actorId);
    const targetName = this.nameOf(targetId);
    this.emitBanner(
      'swap_7',
      `🦊 CƯỚP TRẮNG! ${actorName} tráo ${myOldCount} lá lấy ${theirOldCount} lá của ${targetName}!`,
      theirOldCount === 1
        ? `😱 Cướp trắng lá UNO cuối cùng ngay trên tay ${targetName}!`
        : `Đổi trọn bộ bài trên tay trong chớp mắt!`,
      actorId,
      targetId,
    );
    this.pushLog(
      `🦊 Số 7 Cướp Bài! ${actorName} (${myOldCount} lá) tráo toàn bộ bài với ${targetName} (${theirOldCount} lá)!`,
      'swap',
    );

    this.checkMercyElimination(actorId);
    if (!this.finished) this.checkMercyElimination(targetId);
  }

  private performRotate0(actorId: string): void {
    const n = this.alive.length;
    if (n < 2) return;

    const snapshot = this.alive.map((id) => this.hands.get(id) ?? []);
    for (let i = 0; i < n; i++) {
      const receiverIdx = (((i + this.direction) % n) + n) % n;
      const receiverId = this.alive[receiverIdx];
      this.hands.set(receiverId, snapshot[i]);
    }

    this.unoSafeIds.clear();
    this.unoVulnerableId = null;
    for (const id of this.alive) {
      if ((this.hands.get(id)?.length ?? 0) === 1) {
        this.unoSafeIds.add(id);
      }
    }

    const actorName = this.nameOf(actorId);
    this.emitBanner(
      'rotate_0',
      `🌪️ XOAY BÀI CẢ BÀN! Mọi người chuyển bài theo chiều đánh!`,
      `${actorName} tung Số 0 (${this.direction === 1 ? '↻ Chiều thuận' : '↺ Chiều ngược'}) — Thế cờ đảo lộn!`,
      actorId,
    );
    this.pushLog(`🌪️ ${actorName} đánh Số 0 — Toàn bộ bàn xoay vòng bài trên tay!`, 'swap');

    for (const id of [...this.alive]) {
      if (this.finished) break;
      this.checkMercyElimination(id);
    }
  }

  private handleDraw(playerId: string): ActionResult {
    if (this.phase !== 'playing' || playerId !== this.currentPlayerId) {
      return { ok: false, reason: 'not_your_turn' };
    }
    if (this.drewThisTurn) {
      return { ok: false, reason: 'bad_action' };
    }

    const hand = this.hands.get(playerId)!;
    const name = this.nameOf(playerId);
    // Trước khi loại khỏi this.alive (nếu nổ bài), ghi nhớ người kế tiếp theo chiều hiện tại
    const nextAfterMe = this.getNextAlive(playerId, 1);

    // Rút bài sẽ khiến số lá > 1 -> xóa cờ UNO
    this.unoSafeIds.delete(playerId);
    if (this.unoVulnerableId === playerId) {
      this.unoVulnerableId = null;
    }

    // 1. Đang dính Vòng Quay Tử Thần (`wild_roulette`): bốc tới khi trúng `activeColor` (lá Wild không tính!)
    if (this.roulettePending) {
      const targetColor = this.activeColor;
      const colorName = UNO_COLOR_META[targetColor].name;
      let count = 0;
      while (count < UNO_MERCY_LIMIT) {
        const c = this.drawRawCard();
        hand.push(c);
        count++;
        if (hand.length >= UNO_MERCY_LIMIT) break;
        if (c.color === targetColor) break;
      }
      this.roulettePending = false;
      this.drewThisTurn = false;

      if (this.checkMercyElimination(playerId)) {
        if (!this.finished) {
          this.beginTurn(nextAfterMe, 'playing');
          this.ctx.changed();
        }
        return { ok: true };
      }

      this.emitBanner(
        'roulette',
        `🎰 ${name} quay trúng ${count} lá mới ra màu ${colorName}!`,
        count >= 5 ? `Hú hồn! Đang cầm ${hand.length}/${UNO_MERCY_LIMIT} lá trên tay!` : `Thoát kiếp Vòng Quay Tử Thần!`,
        playerId,
      );
      this.pushLog(`🎰 ${name} quay trúng ${count} lá mới ra màu ${colorName}!`, 'wild');
      this.beginTurn(nextAfterMe, 'playing');
      this.ctx.changed();
      return { ok: true };
    }

    // 2. Đang có chồng bài phạt (`drawStack > 0`): nuốt trọn chồng bài phạt và mất lượt!
    if (this.drawStack > 0) {
      const penalty = this.drawStack;
      this.drawStack = 0;
      this.drawMinValue = 0;
      this.drewThisTurn = false;

      for (let i = 0; i < penalty; i++) {
        hand.push(this.drawRawCard());
      }

      this.pushLog(`💀 ${name} phải ôm trọn +${penalty} lá bài phạt (lên ${hand.length} lá)!`, 'stack');

      if (this.checkMercyElimination(playerId)) {
        if (!this.finished) {
          this.beginTurn(nextAfterMe, 'playing');
          this.ctx.changed();
        }
        return { ok: true };
      }

      this.beginTurn(nextAfterMe, 'playing');
      this.ctx.changed();
      return { ok: true };
    }

    // 3. Rút bình thường (`drawStack === 0 && !roulettePending`)
    const hadPlayable = hand.some((c) => this.isCardPlayable(c));
    if (hadPlayable) {
      // Đã có bài đánh được nhưng chủ động bốc thêm 1 lá
      const drawn = this.drawRawCard();
      hand.push(drawn);
      if (this.checkMercyElimination(playerId)) {
        if (!this.finished) {
          this.beginTurn(nextAfterMe, 'playing');
          this.ctx.changed();
        }
        return { ok: true };
      }
      if (this.isCardPlayable(drawn)) {
        this.drewThisTurn = true;
        this.pushLog(`🃏 ${name} bốc 1 lá có thể đánh ngay!`, 'normal');
        this.scheduleTurnTimer(this.turnMs);
      } else {
        this.pushLog(`🃏 ${name} bốc 1 lá rồi qua lượt.`, 'normal');
        this.beginTurn(nextAfterMe, 'playing');
      }
      this.ctx.changed();
      return { ok: true };
    }

    // Chưa có bài hợp lệ -> Luật No Mercy: bốc liên tục cho tới khi tìm được lá đánh được HOẶC chạm 25 lá nổ bài!
    let drawnCount = 0;
    let rescuedCard: UnoCard | null = null;
    while (hand.length < UNO_MERCY_LIMIT) {
      const c = this.drawRawCard();
      hand.push(c);
      drawnCount++;
      if (hand.length >= UNO_MERCY_LIMIT) break;
      if (this.isCardPlayable(c)) {
        rescuedCard = c;
        break;
      }
    }

    if (this.checkMercyElimination(playerId)) {
      if (!this.finished) {
        this.beginTurn(nextAfterMe, 'playing');
        this.ctx.changed();
      }
      return { ok: true };
    }

    if (rescuedCard) {
      this.drewThisTurn = true;
      this.pushLog(
        drawnCount === 1
          ? `🃏 ${name} bốc 1 lá và tìm thấy đường đi!`
          : `😰 ${name} phải bốc liên tiếp ${drawnCount} lá mới ra bài hợp lệ (${hand.length}/${UNO_MERCY_LIMIT} lá)!`,
        drawnCount >= 4 ? 'mercy' : 'normal',
      );
      this.scheduleTurnTimer(this.turnMs);
    } else {
      this.beginTurn(nextAfterMe, 'playing');
    }
    this.ctx.changed();
    return { ok: true };
  }

  private handlePass(playerId: string): ActionResult {
    if (this.phase !== 'playing' || playerId !== this.currentPlayerId) {
      return { ok: false, reason: 'not_your_turn' };
    }
    if (!this.drewThisTurn || this.drawStack > 0 || this.roulettePending) {
      return { ok: false, reason: 'bad_action' };
    }

    this.drewThisTurn = false;
    this.pushLog(`⏭️ ${this.nameOf(playerId)} giữ bài và qua lượt.`, 'normal');
    const nextId = this.getNextAlive(playerId, 1);
    this.beginTurn(nextId, 'playing');
    this.ctx.changed();
    return { ok: true };
  }

  private handlePlay(
    playerId: string,
    cardId: string,
    chosenColor?: UnoColor,
    swapTargetId?: string,
  ): ActionResult {
    if (this.phase !== 'playing' || playerId !== this.currentPlayerId) {
      return { ok: false, reason: 'not_your_turn' };
    }
    if (typeof cardId !== 'string') {
      return { ok: false, reason: 'bad_action' };
    }

    const hand = this.hands.get(playerId) ?? [];
    const cardIdx = hand.findIndex((c) => c.id === cardId);
    if (cardIdx === -1) {
      return { ok: false, reason: 'bad_action' };
    }
    const card = hand[cardIdx];

    if (!this.isCardPlayable(card)) {
      return { ok: false, reason: 'illegal_move' };
    }

    let resolvedWildColor: UnoColor = this.activeColor;
    if (isUnoWild(card)) {
      if (chosenColor !== undefined) {
        if (!UNO_COLORS.includes(chosenColor)) {
          return { ok: false, reason: 'bad_action' };
        }
        resolvedWildColor = chosenColor;
      } else {
        resolvedWildColor = this.pickBestColorForHand(hand.filter((c) => c.id !== card.id));
      }
    }

    if (card.kind === '7' && swapTargetId !== undefined) {
      if (typeof swapTargetId !== 'string' || swapTargetId === playerId || !this.alive.includes(swapTargetId)) {
        return { ok: false, reason: 'bad_action' };
      }
    }

    // Rút lá vừa đánh khỏi tay & đẩy topCard cũ xuống chồng bỏ
    hand.splice(cardIdx, 1);
    this.discardPile.push(this.topCard);

    let dumpedCount = 1;
    if (card.kind === 'discard_all' && card.color !== 'wild') {
      const sameColor: UnoCard[] = [];
      const keep: UnoCard[] = [];
      for (const c of hand) {
        if (c.color === card.color) sameColor.push(c);
        else keep.push(c);
      }
      if (sameColor.length > 0) {
        this.discardPile.push(...sameColor);
        hand.splice(0, hand.length, ...keep);
        dumpedCount += sameColor.length;
      }
    }

    this.topCard = card;
    this.activeColor = card.color === 'wild' ? resolvedWildColor : card.color;
    this.drewThisTurn = false;

    const actorName = this.nameOf(playerId);
    const colorName = UNO_COLOR_META[this.activeColor].name;

    // Đánh hết sạch bài trên tay -> Thắng ngay lập tức!
    if (hand.length === 0) {
      this.unoSafeIds.delete(playerId);
      if (this.unoVulnerableId === playerId) this.unoVulnerableId = null;
      this.pushLog(`🏆 ${actorName} đánh lá cuối cùng (${getUnoCardLabel(card.kind).title}) và VỀ NHẤT!`, 'uno');
      this.finishByEmptyHand(playerId);
      return { ok: true };
    }

    // Kiểm tra trạng thái còn đúng 1 lá cho các lá không tráo/xoay bài
    if (card.kind !== '7' && card.kind !== '0') {
      if (hand.length === 1) {
        if (!this.unoSafeIds.has(playerId)) {
          this.unoVulnerableId = playerId;
          this.unoVulnerableSeq++;
        }
      } else {
        this.unoSafeIds.delete(playerId);
        if (this.unoVulnerableId === playerId) this.unoVulnerableId = null;
      }
    }

    const drawVal = getUnoDrawValue(card.kind);
    if (drawVal > 0) {
      const wasStack = this.drawStack;
      this.drawStack += drawVal;
      this.drawMinValue = drawVal;

      if (card.kind === 'wild_reverse_draw4') {
        this.direction = this.direction === 1 ? -1 : 1;
      }

      const nextId = this.getNextAlive(playerId, 1);
      const nextName = this.nameOf(nextId);

      this.emitBanner(
        'stack',
        wasStack > 0 ? `🔥 CỘNG DỒN +${this.drawStack} LÁ!!` : `🔥 PHẠT RÚT +${this.drawStack} LÁ!`,
        wasStack > 0
          ? `${actorName} chồng thêm +${drawVal} (${colorName}) → ${nextName} đỡ nổi không?!`
          : `${actorName} tung ${getUnoCardLabel(card.kind).title} (${colorName}) nhắm vào ${nextName}!`,
        playerId,
        nextId ?? undefined,
      );
      this.pushLog(
        wasStack > 0
          ? `🔥 ${actorName} chồng +${drawVal} lên tổng +${this.drawStack} lá (${colorName})!`
          : `🔥 ${actorName} đánh ${getUnoCardLabel(card.kind).title} (+${drawVal} lá, màu ${colorName})!`,
        'stack',
      );
      this.beginTurn(nextId, 'playing');
      this.ctx.changed();
      return { ok: true };
    }

    switch (card.kind) {
      case 'wild_roulette': {
        this.roulettePending = true;
        const nextId = this.getNextAlive(playerId, 1);
        const nextName = this.nameOf(nextId);
        this.emitBanner(
          'roulette',
          `🎰 VÒNG QUAY TỬ THẦN: ${colorName.toUpperCase()}!`,
          `${nextName} phải bốc liên tục cho tới khi ra lá màu ${colorName}!`,
          playerId,
          nextId ?? undefined,
        );
        this.pushLog(`🎰 ${actorName} xoay Vòng Quay Tử Thần — chỉ định màu ${colorName} cho ${nextName}!`, 'wild');
        this.beginTurn(nextId, 'playing');
        this.ctx.changed();
        return { ok: true };
      }

      case 'skip': {
        const skippedId = this.getNextAlive(playerId, 1);
        const nextId = this.getNextAlive(playerId, 2);
        this.pushLog(`🚫 ${actorName} cấm lượt ${this.nameOf(skippedId)}!`, 'normal');
        this.beginTurn(nextId, 'playing');
        this.ctx.changed();
        return { ok: true };
      }

      case 'reverse': {
        this.direction = this.direction === 1 ? -1 : 1;
        const twoPlayers = this.alive.length === 2;
        const nextId = twoPlayers ? playerId : this.getNextAlive(playerId, 1);
        this.pushLog(
          twoPlayers
            ? `🔄 ${actorName} đảo chiều (bàn 2 người = đánh tiếp lượt nữa)!`
            : `🔄 ${actorName} đảo chiều vòng đánh (${this.direction === 1 ? '↻ Thuận' : '↺ Ngược'})!`,
          'normal',
        );
        this.beginTurn(nextId, 'playing');
        this.ctx.changed();
        return { ok: true };
      }

      case 'skip_all': {
        this.emitBanner(
          'skip_all',
          `⏭️ BỎ LƯỢT TẤT CẢ! ${actorName} đi tiếp ngay!`,
          `Cả bàn đứng hình nhìn ${actorName} tung liên hoàn chiêu!`,
          playerId,
        );
        this.pushLog(`⏭️ ${actorName} tung Bỏ Lượt Tất Cả — được đi tiếp ngay 1 lượt!`, 'wild');
        this.beginTurn(playerId, 'playing');
        this.ctx.changed();
        return { ok: true };
      }

      case 'discard_all': {
        if (dumpedCount >= 2) {
          this.emitBanner(
            'discard_all',
            `🌪️ XẢ SẠCH ${dumpedCount} LÁ ${colorName.toUpperCase()}!`,
            `${actorName} quét bay cả chùm bài cùng màu trong 1 nước!`,
            playerId,
          );
        }
        this.pushLog(`🌪️ ${actorName} xả một mạch ${dumpedCount} lá màu ${colorName}!`, 'wild');
        const nextId = this.getNextAlive(playerId, 1);
        this.beginTurn(nextId, 'playing');
        this.ctx.changed();
        return { ok: true };
      }

      case '0': {
        this.performRotate0(playerId);
        if (this.finished) return { ok: true };
        const nextId = this.getNextAlive(playerId, 1);
        this.beginTurn(nextId, 'playing');
        this.ctx.changed();
        return { ok: true };
      }

      case '7': {
        if (swapTargetId) {
          const nextId = this.getNextAlive(playerId, 1);
          this.performSwap7(playerId, swapTargetId);
          if (this.finished) return { ok: true };
          const effectiveNext = nextId && this.alive.includes(nextId) ? nextId : this.getNextAlive(playerId, 1);
          this.beginTurn(effectiveNext, 'playing');
          this.ctx.changed();
          return { ok: true };
        }
        if (this.alive.length === 2) {
          const oppId = this.alive.find((id) => id !== playerId);
          if (oppId) {
            const nextId = this.getNextAlive(playerId, 1);
            this.performSwap7(playerId, oppId);
            if (this.finished) return { ok: true };
            const effectiveNext = nextId && this.alive.includes(nextId) ? nextId : this.getNextAlive(playerId, 1);
            this.beginTurn(effectiveNext, 'playing');
            this.ctx.changed();
            return { ok: true };
          }
        }
        // Bàn >= 3 người và chưa chọn mục tiêu -> chuyển sang pha chọn đối thủ để cướp bài (12s)
        this.pushLog(`🦊 ${actorName} đánh Số 7 — đang chọn đối thủ để tráo toàn bộ bài!`, 'swap');
        this.beginTurn(playerId, 'choose_swap');
        this.ctx.changed();
        return { ok: true };
      }

      default: {
        this.pushLog(`🃏 ${actorName} đánh lá ${card.kind} ${colorName}.`, 'normal');
        const nextId = this.getNextAlive(playerId, 1);
        this.beginTurn(nextId, 'playing');
        this.ctx.changed();
        return { ok: true };
      }
    }
  }

  // ================= Kết thúc ván & Bảng xếp hạng =================

  private buildRanking(winnerId: string | null, winDetail: string): RankEntry[] {
    const ranking: RankEntry[] = [];
    if (winnerId) {
      ranking.push({
        playerId: winnerId,
        name: this.nameOf(winnerId),
        detail: winDetail,
      });
    }

    const otherAlive = this.alive
      .filter((id) => id !== winnerId)
      .sort((a, b) => (this.hands.get(a)?.length ?? 0) - (this.hands.get(b)?.length ?? 0));

    for (const id of otherAlive) {
      const cnt = this.hands.get(id)?.length ?? 0;
      ranking.push({
        playerId: id,
        name: this.nameOf(id),
        detail: `Còn ${cnt} lá trên tay`,
      });
    }

    for (let i = this.eliminated.length - 1; i >= 0; i--) {
      const el = this.eliminated[i];
      if (el.id === winnerId) continue;
      ranking.push({
        playerId: el.id,
        name: this.nameOf(el.id),
        detail: el.reason === 'mercy_25' ? `💥 Cháy bài ${el.peakCards} lá` : '🚪 Rời bàn giữa ván',
      });
    }
    return ranking;
  }

  private finishByEmptyHand(winnerId: string): void {
    if (this.finished) return;
    this.finished = true;
    this.timer.clear();
    this.currentPlayerId = null;
    this.turnEndsAt = null;

    const winnerName = this.nameOf(winnerId);
    const ranking = this.buildRanking(winnerId, '🏆 Hết sạch bài về nhất!');
    this.ctx.finish({
      winnerId,
      ranking,
      headline: `🃏 ${winnerName} xả sạch bài — Chiến thắng UNO Tàn Nhẫn!`,
    });
  }

  private finishBySoleSurvivor(): void {
    if (this.finished) return;
    this.finished = true;
    this.timer.clear();
    this.currentPlayerId = null;
    this.turnEndsAt = null;

    const winnerId = this.alive[0] ?? this.eliminated[this.eliminated.length - 1]?.id ?? null;
    const winnerName = this.nameOf(winnerId);
    const leftCards = winnerId ? (this.hands.get(winnerId)?.length ?? 0) : 0;
    const ranking = this.buildRanking(
      winnerId,
      `👑 Sống sót cuối cùng · còn ${leftCards} lá`,
    );
    this.ctx.finish({
      winnerId,
      ranking,
      headline: winnerId
        ? `💥 Cả bàn nổ bài sạch — ${winnerName} sống sót độc tôn!`
        : '💥 Kết thúc ván UNO Tàn Nhẫn!',
    });
  }

  private finishEarlyByHost(): void {
    if (this.finished) return;
    this.finished = true;
    this.timer.clear();
    this.currentPlayerId = null;
    this.turnEndsAt = null;

    const sortedAlive = [...this.alive].sort(
      (a, b) => (this.hands.get(a)?.length ?? 0) - (this.hands.get(b)?.length ?? 0),
    );
    const winnerId = sortedAlive[0] ?? null;
    const winnerName = this.nameOf(winnerId);
    const cnt = winnerId ? (this.hands.get(winnerId)?.length ?? 0) : 0;
    const ranking = this.buildRanking(winnerId, `🏆 Ít bài nhất (${cnt} lá)`);
    this.ctx.finish({
      winnerId,
      ranking,
      headline: winnerId
        ? `🃏 Chủ phòng kết thúc ván — ${winnerName} dẫn đầu (${cnt} lá)!`
        : '🃏 Kết thúc ván UNO Tàn Nhẫn!',
    });
  }

  // ================= Người chơi rời phòng / mất kết nối / bị chọc =================

  removePlayer(playerId: string): void {
    if (this.finished || !this.alive.includes(playerId)) return;

    const wasCurrent = this.currentPlayerId === playerId;
    const nextAfterRemoved = wasCurrent ? this.getNextAlive(playerId, 1) : null;

    const hand = this.hands.get(playerId) ?? [];
    const peakCards = hand.length;
    if (hand.length > 0) {
      this.deck.unshift(...this.shuffle([...hand]));
      this.hands.set(playerId, []);
    }

    this.alive = this.alive.filter((id) => id !== playerId);
    this.eliminated.push({ id: playerId, reason: 'left', peakCards });
    this.unoSafeIds.delete(playerId);
    if (this.unoVulnerableId === playerId) this.unoVulnerableId = null;

    this.pushLog(`🚪 ${this.nameOf(playerId)} đã rời bàn chơi.`, 'normal');

    if (this.alive.length <= 1) {
      this.finishBySoleSurvivor();
      return;
    }

    if (wasCurrent) {
      // Tránh đẩy chồng bài phạt oan sang người kế tiếp khi người đang chịu phạt thoát phòng
      this.drawStack = 0;
      this.drawMinValue = 0;
      this.roulettePending = false;
      this.drewThisTurn = false;
      this.beginTurn(nextAfterRemoved, 'playing');
    } else if (this.phase === 'choose_swap' && this.currentPlayerId && this.alive.length === 2) {
      // Còn đúng 1 đối thủ khi đang chọn người tráo -> tự động tráo ngay
      const oppId = this.alive.find((id) => id !== this.currentPlayerId);
      if (oppId) {
        this.handlePickSwap(this.currentPlayerId, oppId);
      }
    }
  }

  onPlayerConnection(playerId: string, connected: boolean): void {
    if (this.finished || playerId !== this.currentPlayerId || !this.turnEndsAt) return;
    if (!connected) {
      const leftMs = Math.max(200, this.turnEndsAt - Date.now());
      this.scheduleTurnTimer(Math.min(leftMs, 1500));
    } else {
      const baseMs = this.phase === 'choose_swap' ? this.swapMs : this.turnMs;
      const leftMs = Math.max(2500, Math.min(baseMs, this.turnEndsAt - Date.now() + 3000));
      this.scheduleTurnTimer(leftMs);
    }
  }

  disrupt(playerId: string, ms: number): number {
    if (this.finished || playerId !== this.currentPlayerId || !this.turnEndsAt) return 0;
    const room = Math.max(0, DISRUPT_MAX_BONUS_MS - this.turnBonusMs);
    const grant = Math.min(room, Math.max(0, ms));
    if (grant <= 0) return 0;
    this.turnBonusMs += grant;
    const remaining = Math.max(300, this.turnEndsAt - Date.now()) + grant;
    this.scheduleTurnTimer(remaining);
    this.ctx.changed();
    return grant;
  }

  renamePlayer(playerId: string, name: string): void {
    if (this.names.has(playerId)) {
      this.names.set(playerId, name);
    }
  }

  // ================= Ruthless Bot AI =================

  private pickBestColorForHand(hand: readonly UnoCard[]): UnoColor {
    const counts: Record<UnoColor, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
    for (const c of hand) {
      if (c.color !== 'wild') counts[c.color]++;
    }
    let best: UnoColor = this.activeColor;
    let bestScore = -1;
    for (const col of UNO_COLORS) {
      if (counts[col] > bestScore) {
        bestScore = counts[col];
        best = col;
      }
    }
    return best;
  }

  private pickFewestCardsOpponent(playerId: string): string | null {
    const opponents = this.alive.filter((id) => id !== playerId);
    if (opponents.length === 0) return null;
    opponents.sort((a, b) => {
      const da = this.hands.get(a)?.length ?? 99;
      const db = this.hands.get(b)?.length ?? 99;
      return da - db;
    });
    return opponents[0] ?? null;
  }

  botAction(playerId: string): GameAction | null {
    if (this.finished || !this.alive.includes(playerId)) return null;

    // 1. Cơ hội bắt lỗi quên hô UNO (~55% với 1 bot để người thật vẫn kịp tranh bấm nút Bắt Lỗi!)
    if (
      this.unoVulnerableId &&
      this.unoVulnerableId !== playerId &&
      this.alive.includes(this.unoVulnerableId)
    ) {
      const botCount = this.alive.filter((id) => this.ctx.isBot?.(id)).length;
      const catchProb = botCount > 1 ? 0.36 : 0.55;
      if (hash01(this.unoVulnerableSeq, `catch:${playerId}`) < catchProb) {
        return { type: 'um_catch_uno', targetId: this.unoVulnerableId };
      }
    }

    if (this.currentPlayerId !== playerId) return null;

    // 2. Đang chọn nạn nhân tráo bài Số 7 -> ưu tiên cướp của người cầm ÍT BÀI NHẤT!
    if (this.phase === 'choose_swap') {
      const targetId = this.pickFewestCardsOpponent(playerId);
      return targetId ? { type: 'um_pick_swap', targetId } : null;
    }

    // 3. Lượt đánh chính
    if (this.roulettePending) {
      return { type: 'um_draw' };
    }

    const hand = this.hands.get(playerId) ?? [];
    const playable = hand.filter((c) => this.isCardPlayable(c));

    if (playable.length === 0) {
      return this.drewThisTurn ? { type: 'um_pass' } : { type: 'um_draw' };
    }

    const bestCard = this.chooseRuthlessCard(playerId, hand, playable);

    // Kiểm tra xem sau khi đánh lá này có xuống đúng 1 lá không -> 80% nhớ bấm Hô UNO trước!
    if (bestCard.kind !== '7' && bestCard.kind !== '0' && !this.unoSafeIds.has(playerId)) {
      let remainingAfter = hand.length - 1;
      if (bestCard.kind === 'discard_all' && bestCard.color !== 'wild') {
        remainingAfter = hand.filter((c) => c.color !== bestCard.color).length;
      }
      if (remainingAfter === 1 && hash01(this.turnSeq, `uno:${playerId}`) < 0.8) {
        return { type: 'um_shout_uno' };
      }
    }

    const remainingHand = hand.filter((c) => c.id !== bestCard.id);
    const chosenColor = isUnoWild(bestCard) ? this.pickBestColorForHand(remainingHand) : undefined;
    const swapTargetId =
      bestCard.kind === '7' && hand.length > 1 ? (this.pickFewestCardsOpponent(playerId) ?? undefined) : undefined;

    return {
      type: 'um_play',
      cardId: bestCard.id,
      ...(chosenColor ? { chosenColor } : {}),
      ...(swapTargetId ? { swapTargetId } : {}),
    };
  }

  private chooseRuthlessCard(playerId: string, hand: readonly UnoCard[], playable: readonly UnoCard[]): UnoCard {
    // Đang đỡ chồng bài phạt: ưu tiên lá có mức cộng thấp nhất đủ chuẩn để giữ vũ khí hạng nặng (+6/+10) về sau!
    if (this.drawStack > 0) {
      return [...playable].sort((a, b) => {
        const va = getUnoDrawValue(a.kind);
        const vb = getUnoDrawValue(b.kind);
        if (va !== vb) return va - vb;
        // Cùng mức +4: ưu tiên xả +4 màu trước khi dùng Wild Đảo Chiều +4
        if (a.color !== 'wild' && b.color === 'wild') return -1;
        if (a.color === 'wild' && b.color !== 'wild') return 1;
        return 0;
      })[0];
    }

    const opponents = this.alive.filter((id) => id !== playerId);
    const oppCounts = opponents.map((id) => this.hands.get(id)?.length ?? 99);
    const minOppCards = oppCounts.length > 0 ? Math.min(...oppCounts) : 99;
    const maxOppCards = oppCounts.length > 0 ? Math.max(...oppCounts) : 0;
    const nextId = this.getNextAlive(playerId, 1);
    const nextCards = nextId ? (this.hands.get(nextId)?.length ?? 99) : 99;

    const colorCounts: Record<UnoColor, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
    for (const c of hand) {
      if (c.color !== 'wild') colorCounts[c.color]++;
    }

    let best = playable[0];
    let bestScore = -99999;

    for (const c of playable) {
      let score = 0;

      // Nước dứt điểm thắng ngay lập tức
      const emptiesHand =
        hand.length === 1 ||
        (c.kind === 'discard_all' && c.color !== 'wild' && hand.every((x) => x.color === c.color));
      if (emptiesHand) {
        score += 10000;
      }

      // Ưu tiên xả cùng màu khi cầm nhiều lá trùng màu
      if (c.kind === 'discard_all' && c.color !== 'wild') {
        const same = colorCounts[c.color];
        score += same >= 2 ? 120 + same * 45 : 40;
      }

      // Số 7: cực kỳ tàn nhẫn khi có đối thủ sắp hết bài (<= 2 lá) và mình đang ôm nhiều bài!
      if (c.kind === '7') {
        if (minOppCards <= 2 && hand.length >= 4) score += 520;
        else if (minOppCards + 2 < hand.length) score += 180 + (hand.length - minOppCards) * 18;
        else score -= 220; // Không dại lấy 2 lá đổi lấy đống bài to của đối thủ!
      }

      // Số 0: xoay bài cả bàn nếu người đưa bài cho mình ít bài hơn hoặc cần phá thế UNO của địch
      if (c.kind === '0') {
        const giverId = this.getNextAlive(playerId, -1);
        const giverCards = giverId ? (this.hands.get(giverId)?.length ?? hand.length) : hand.length;
        if (minOppCards <= 2 && giverCards <= hand.length) score += 260;
        else if (giverCards + 2 < hand.length) score += 160;
        else if (giverCards > hand.length + 3) score -= 120;
        else score += 55;
      }

      // Bỏ lượt tất cả -> đánh liên hoàn
      if (c.kind === 'skip_all') {
        score += minOppCards <= 2 ? 250 : 145;
      }

      // Tấn công hủy diệt khi mục tiêu chịu đòn sắp về nhất (<= 2 lá) hoặc sắp nổ bài (>= 19 lá)!
      const drawVal = getUnoDrawValue(c.kind);
      if (drawVal > 0) {
        const hitTargetId = c.kind === 'wild_reverse_draw4' && this.alive.length >= 3
          ? this.getNextAlive(playerId, -1)
          : nextId;
        const hitCards = hitTargetId ? (this.hands.get(hitTargetId)?.length ?? 99) : nextCards;
        if (hitCards <= 2 || hitCards + drawVal >= UNO_MERCY_LIMIT) {
          score += 260 + drawVal * 18;
        } else if (minOppCards <= 2 || maxOppCards >= 20) {
          score += 140 + drawVal * 8;
        } else {
          // Bình thường giữ lại +6/+10 phòng thân đỡ stack
          score += c.color === 'wild' ? 25 - drawVal : 90;
        }
      }

      if (c.kind === 'wild_roulette') {
        score += nextCards <= 2 || nextCards >= 19 ? 255 : 45;
      }

      if (c.kind === 'skip' || c.kind === 'reverse') {
        score += nextCards <= 2 ? 195 : 88;
      }

      // Bài màu thường: ưu tiên màu mình đang cầm nhiều nhất
      if (c.color !== 'wild') {
        score += 50 + colorCounts[c.color] * 8;
      }

      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }

    return best;
  }

  // ================= View theo từng người chơi =================

  view(viewerId?: string): UnoMercyView {
    const namesObj: Record<string, string> = {};
    const handCounts: Record<string, number> = {};
    for (const id of this.order) {
      namesObj[id] = this.nameOf(id);
      handCounts[id] = this.hands.get(id)?.length ?? 0;
    }

    const myHand = viewerId && this.hands.has(viewerId) ? [...(this.hands.get(viewerId) ?? [])] : [];

    return {
      type: 'uno_mercy',
      phase: this.phase,
      order: [...this.order],
      names: namesObj,
      alive: [...this.alive],
      eliminated: this.eliminated.map((e) => ({ ...e })),
      currentPlayerId: this.currentPlayerId,
      direction: this.direction,
      turnEndsAt: this.turnEndsAt,
      turnSeconds: this.turnSeconds,
      topCard: { ...this.topCard },
      activeColor: this.activeColor,
      drawStack: this.drawStack,
      drawMinValue: this.drawMinValue,
      roulettePending: this.roulettePending,
      drewThisTurn: this.drewThisTurn,
      handCounts,
      unoSafeIds: [...this.unoSafeIds],
      unoVulnerableId: this.unoVulnerableId,
      deckCount: this.deck.length,
      myHand,
      lastBanner: this.lastBanner ? { ...this.lastBanner } : null,
      log: [...this.log],
    };
  }

  dispose(): void {
    this.finished = true;
    this.timer.clear();
  }
}
