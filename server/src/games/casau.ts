/**
 * Server Engine: Khám Răng Cá Sấu (`ca_sau`, 2–12 người).
 * Bấm răng kịch tính theo hiệp: ẩn tuyệt đối vị trí Răng Đau, Răng Vàng & Răng Đảo Chiều trên server cho đến khi được nhấn.
 */
import {
  CA_SAU_BITE_PENALTY,
  CA_SAU_DEFAULT_ROUNDS,
  CA_SAU_GOLD_PTS,
  CA_SAU_MAX_LIVES,
  CA_SAU_REVEAL_MS,
  CA_SAU_SAFE_BASE_PTS,
  CA_SAU_SAFE_STEP_PTS,
  CA_SAU_TURN_SECONDS,
  computeCaSauTeethCount,
  type CaSauAction,
  type CaSauPhase,
  type CaSauToothState,
  type CaSauView,
} from '../../../shared/src/casau';
import { DISRUPT_MAX_BONUS_MS, type ActionResult, type GameAction } from '../../../shared/src/types';
import { Timer, type EngineContext, type EnginePlayer, type GameEngine } from './engine';

type CaSauSettingsCompat = { caSauRounds?: number };

export class CaSauGame implements Omit<GameEngine, 'view' | 'botAction'> {
  readonly perPlayerView = false;

  private readonly maxRounds: number;
  private readonly turnMs: number;
  private readonly revealMs: number;

  private order: string[] = [];
  private activeOrder: string[] = [];
  private names = new Map<string, string>();
  private scores = new Map<string, number>();
  private bites = new Map<string, number>();
  private lives = new Map<string, number>();

  private round = 1;
  private phase: CaSauPhase = 'pressing';
  private phaseEndsAt: number | null = null;
  private phaseSeconds = CA_SAU_TURN_SECONDS;
  private turnBonusMs = 0;

  private turnIdx = 0;
  private direction: 1 | -1 = 1;

  private totalTeeth = 14;
  /** Chỉ lưu trạng thái công khai của từng răng ('intact' khi chưa ai bấm — không bao giờ lộ bẫy sớm) */
  private publicTeeth: CaSauToothState[] = [];
  private pressedBy = new Map<number, string>();

  /** Bí mật nội bộ trên server */
  private trapIndex = 0;
  private goldIndices = new Set<number>();
  private reverseIndex = -1;

  private lastActionText: string | null = null;
  private bittenPlayerId: string | null = null;
  private trapTooth: number | null = null;

  private finished = false;
  private readonly timer = new Timer();

  constructor(private readonly ctx: EngineContext) {
    const rawRounds = (ctx.settings as CaSauSettingsCompat).caSauRounds ?? CA_SAU_DEFAULT_ROUNDS;
    this.maxRounds = Math.max(1, Math.min(10, Math.floor(rawRounds) || CA_SAU_DEFAULT_ROUNDS));

    const defTurnMs = CA_SAU_TURN_SECONDS * 1000;
    this.turnMs = ctx.turnMs ? Math.min(defTurnMs, Math.max(200, ctx.turnMs)) : defTurnMs;
    this.revealMs = ctx.turnMs
      ? Math.min(CA_SAU_REVEAL_MS, Math.max(150, Math.floor(ctx.turnMs * 0.6)))
      : CA_SAU_REVEAL_MS;
  }

  private get currentPlayerId(): string | null {
    if (this.finished || this.phase !== 'pressing' || this.activeOrder.length === 0) return null;
    return this.activeOrder[this.turnIdx % this.activeOrder.length] ?? null;
  }

  start(players: EnginePlayer[]): void {
    this.order = players.map((p) => p.id);
    this.activeOrder = [...this.order];
    for (const p of players) {
      this.names.set(p.id, p.name);
      this.scores.set(p.id, 0);
      this.bites.set(p.id, 0);
      this.lives.set(p.id, CA_SAU_MAX_LIVES);
    }

    this.round = 1;
    this.turnIdx = 0;
    this.direction = 1;
    this.lastActionText = '🐊 Cá Sấu mở hàm rộng ngoác — Ai dám nhấn chiếc răng đầu tiên?!';

    this.beginRound(true);
  }

  private getIntactTeeth(): number[] {
    const out: number[] = [];
    for (let i = 0; i < this.totalTeeth; i++) {
      if (this.publicTeeth[i] === 'intact') out.push(i);
    }
    return out;
  }

  private advanceTurnIndex(): void {
    const len = this.activeOrder.length;
    if (len === 0) {
      this.turnIdx = 0;
      return;
    }
    this.turnIdx = (((this.turnIdx + this.direction) % len) + len) % len;
  }

  private beginRound(initial = false): void {
    if (this.finished) return;
    if (this.activeOrder.length === 0) {
      this.finishGame('🐊 Kết thúc ván Khám Răng Cá Sấu!');
      return;
    }

    this.totalTeeth = computeCaSauTeethCount(this.activeOrder.length);
    this.publicTeeth = Array<CaSauToothState>(this.totalTeeth).fill('intact');
    this.pressedBy.clear();
    this.bittenPlayerId = null;
    this.trapTooth = null;

    // Trộn ngẫu nhiên bí mật: 1 Răng Đau, 2 Răng Vàng, 1 Răng Xoáy Đảo Chiều
    const indices = Array.from({ length: this.totalTeeth }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(this.ctx.rng() * (i + 1)) % (i + 1);
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    this.trapIndex = indices[0];
    this.goldIndices = new Set<number>([indices[1], indices[2]]);
    this.reverseIndex = indices[3];

    this.turnIdx = this.turnIdx % this.activeOrder.length;
    if (!initial) {
      this.lastActionText = `🐊 Hiệp ${this.round}/${this.maxRounds}: Hàm cá sấu mới với ${this.totalTeeth} chiếc răng trắng ởn!`;
    }

    this.beginTurn();
  }

  private beginTurn(): void {
    if (this.finished) return;
    if (this.activeOrder.length === 0) {
      this.finishGame('🐊 Kết thúc ván Khám Răng Cá Sấu!');
      return;
    }

    this.phase = 'pressing';
    this.turnBonusMs = 0;
    this.phaseSeconds = Math.max(1, Math.round(this.turnMs / 1000));
    this.phaseEndsAt = Date.now() + this.turnMs;

    const curId = this.currentPlayerId;
    if (curId) {
      this.timer.set(this.turnMs, () => this.onTurnTimeout(curId));
    }
    this.ctx.changed();
  }

  private onTurnTimeout(expectedPlayerId: string): void {
    if (this.finished || this.phase !== 'pressing' || this.currentPlayerId !== expectedPlayerId) return;
    const intact = this.getIntactTeeth();
    if (intact.length === 0) {
      this.enterBiteReveal();
      return;
    }
    const pick = intact[Math.floor(this.ctx.rng() * intact.length) % intact.length];
    this.applyPress(expectedPlayerId, pick, true);
  }

  private applyPress(playerId: string, tooth: number, autoPressed: boolean): void {
    if (this.finished || this.phase !== 'pressing') return;
    if (tooth < 0 || tooth >= this.totalTeeth || this.publicTeeth[tooth] !== 'intact') return;

    this.timer.clear();
    const pressedBefore = this.pressedBy.size;
    this.pressedBy.set(tooth, playerId);

    const pName = this.names.get(playerId) ?? playerId;
    const prefix = autoPressed ? '⏰ Hết giờ bấm đại — ' : '';

    // 1. Trúng Răng Đau -> ĐẬP HÀM "PHẬP!!" ngay lập tức
    if (tooth === this.trapIndex) {
      this.publicTeeth[tooth] = 'trap';
      this.trapTooth = this.trapIndex;
      this.bittenPlayerId = playerId;

      this.bites.set(playerId, (this.bites.get(playerId) ?? 0) + 1);
      this.lives.set(playerId, Math.max(0, (this.lives.get(playerId) ?? CA_SAU_MAX_LIVES) - 1));
      const curScore = this.scores.get(playerId) ?? 0;
      this.scores.set(playerId, Math.max(0, curScore - CA_SAU_BITE_PENALTY));

      this.lastActionText = `${prefix}🐊 PHẬP!! Cá sấu sập hàm đớp trúng ${pName} ở răng #${tooth + 1} (-${CA_SAU_BITE_PENALTY}đ)!`;
      this.advanceTurnIndex();
      this.enterBiteReveal();
      return;
    }

    // 2. Răng Vàng May Mắn (+40đ)
    if (this.goldIndices.has(tooth)) {
      this.publicTeeth[tooth] = 'gold';
      this.scores.set(playerId, (this.scores.get(playerId) ?? 0) + CA_SAU_GOLD_PTS);
      this.lastActionText = `${prefix}✨ RĂNG VÀNG MAY MẮN! ${pName} nhổ trúng răng #${tooth + 1} (+${CA_SAU_GOLD_PTS}đ)!`;
    } else if (tooth === this.reverseIndex) {
      // 3. Răng Xoáy Đảo Chiều
      this.publicTeeth[tooth] = 'reverse';
      this.direction = this.direction === 1 ? -1 : 1;
      const pts = CA_SAU_SAFE_BASE_PTS + pressedBefore * CA_SAU_SAFE_STEP_PTS;
      this.scores.set(playerId, (this.scores.get(playerId) ?? 0) + pts);
      const dirText = this.direction === 1 ? 'thuận chiều ↻' : 'ngược chiều ↺';
      this.lastActionText = `${prefix}🔄 RĂNG XOÁY ĐẢO CHIỀU! ${pName} nhấn răng #${tooth + 1} (+${pts}đ) — xoay lượt ${dirText}!`;
    } else {
      // 4. Răng Lành (thưởng thần kinh thép tăng dần theo số răng đã bấm)
      this.publicTeeth[tooth] = 'safe';
      const pts = CA_SAU_SAFE_BASE_PTS + pressedBefore * CA_SAU_SAFE_STEP_PTS;
      this.scores.set(playerId, (this.scores.get(playerId) ?? 0) + pts);
      this.lastActionText = `${prefix}🦷 ${pName} nhấn răng #${tooth + 1} an toàn (+${pts}đ)!`;
    }

    this.advanceTurnIndex();

    // Nếu chỉ còn đúng 1 răng cuối cùng (chắc chắn là trapIndex) -> mở lộ diện luôn!
    const remaining = this.getIntactTeeth();
    if (remaining.length <= 1) {
      this.publicTeeth[this.trapIndex] = 'trap';
      this.trapTooth = this.trapIndex;
      this.bittenPlayerId = null;
      this.lastActionText = `🎉 THẦN KINH THÉP! Cả bàn né sạch hàm cá sấu, chừa đúng Răng Đau #${this.trapIndex + 1}!`;
      this.enterBiteReveal();
      return;
    }

    this.beginTurn();
  }

  private enterBiteReveal(): void {
    if (this.finished) return;
    this.phase = 'bite_reveal';
    this.phaseSeconds = Math.max(1, Math.round(this.revealMs / 1000));
    this.phaseEndsAt = Date.now() + this.revealMs;

    this.timer.set(this.revealMs, () => {
      if (this.finished) return;
      if (this.round >= this.maxRounds) {
        this.finishGame();
      } else {
        this.round++;
        this.beginRound(false);
      }
    });

    this.ctx.changed();
  }

  private finishGame(customHeadline?: string): void {
    if (this.finished) return;
    this.finished = true;
    this.phaseEndsAt = null;
    this.timer.clear();

    const sorted = [...this.order].sort((a, b) => {
      const scoreDiff = (this.scores.get(b) ?? 0) - (this.scores.get(a) ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      return (this.bites.get(a) ?? 0) - (this.bites.get(b) ?? 0);
    });

    const topId = sorted[0] ?? null;
    const topScore = topId ? (this.scores.get(topId) ?? 0) : 0;
    const topBites = topId ? (this.bites.get(topId) ?? 0) : 0;

    const winnerIds = sorted.filter(
      (id) => (this.scores.get(id) ?? 0) === topScore && (this.bites.get(id) ?? 0) === topBites,
    );

    const ranking = sorted.map((id) => {
      const sc = this.scores.get(id) ?? 0;
      const bt = this.bites.get(id) ?? 0;
      const biteDetail = bt === 0 ? '🛡️ Chưa bị đớp lần nào!' : `🐊 Bị đớp ${bt} lần`;
      return {
        playerId: id,
        name: this.names.get(id) ?? id,
        detail: `${sc.toLocaleString('vi-VN')} điểm · ${biteDetail}`,
      };
    });

    const winnerNames = winnerIds.map((id) => this.names.get(id) ?? id).join(' & ');
    const headline =
      customHeadline ??
      (winnerIds.length > 0
        ? `🐊 ${winnerNames} thần kinh thép vô địch Khám Răng Cá Sấu (${topScore.toLocaleString('vi-VN')}đ)!`
        : '🐊 Kết thúc ván Khám Răng Cá Sấu!');

    this.ctx.finish({
      winnerId: winnerIds[0] ?? null,
      winnerIds,
      ranking,
      headline,
    });
  }

  action(playerId: string, action: GameAction | CaSauAction): ActionResult {
    if (this.finished) return { ok: false, reason: 'not_playing' };
    if (!this.order.includes(playerId)) return { ok: false, reason: 'not_playing' };

    const act = action as CaSauAction | GameAction;

    if (act.type === 'end') {
      if (playerId !== this.ctx.hostId()) return { ok: false, reason: 'not_host' };
      this.finishGame('🏁 Chủ phòng đã kết thúc ván Khám Răng Cá Sấu!');
      return { ok: true };
    }

    if (act.type === 'cs_press') {
      if (this.phase !== 'pressing' || this.currentPlayerId !== playerId) {
        return { ok: false, reason: 'not_your_turn' };
      }
      if (!Number.isInteger(act.tooth) || act.tooth < 0 || act.tooth >= this.totalTeeth) {
        return { ok: false, reason: 'bad_action' };
      }
      if (this.publicTeeth[act.tooth] !== 'intact') {
        return { ok: false, reason: 'cell_occupied' };
      }

      this.applyPress(playerId, act.tooth, false);
      return { ok: true };
    }

    return { ok: false, reason: 'bad_action' };
  }

  disrupt(playerId: string, ms: number): number {
    if (this.finished || this.phase !== 'pressing' || this.currentPlayerId !== playerId || !this.phaseEndsAt) {
      return 0;
    }
    const room = Math.max(0, DISRUPT_MAX_BONUS_MS - this.turnBonusMs);
    const add = Math.min(room, Math.max(0, ms));
    if (add <= 0) return 0;

    this.turnBonusMs += add;
    this.phaseEndsAt += add;
    const remaining = Math.max(50, this.phaseEndsAt - Date.now());
    this.timer.set(remaining, () => this.onTurnTimeout(playerId));
    this.ctx.changed();
    return add;
  }

  removePlayer(playerId: string): void {
    if (this.finished) return;
    const idx = this.activeOrder.indexOf(playerId);
    if (idx === -1) return;

    const wasCurrent = this.phase === 'pressing' && idx === this.turnIdx % this.activeOrder.length;
    this.activeOrder.splice(idx, 1);

    if (this.activeOrder.length === 0) {
      this.finishGame('🐊 Kết thúc ván Khám Răng Cá Sấu!');
      return;
    }
    if (this.activeOrder.length === 1 && this.order.length > 1) {
      const survivor = this.activeOrder[0];
      const sName = this.names.get(survivor) ?? survivor;
      this.scores.set(survivor, (this.scores.get(survivor) ?? 0) + 30);
      this.finishGame(`🏆 Đối thủ rời bàn — ${sName} thắng Khám Răng Cá Sấu!`);
      return;
    }

    if (idx < this.turnIdx) {
      this.turnIdx--;
    }
    this.turnIdx = this.turnIdx % this.activeOrder.length;

    if (wasCurrent) {
      this.timer.clear();
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

  botAction(playerId: string): CaSauAction | null {
    if (this.finished || this.phase !== 'pressing' || this.currentPlayerId !== playerId) return null;
    const intact = this.getIntactTeeth();
    if (intact.length === 0) return null;
    const tooth = intact[Math.floor(this.ctx.rng() * intact.length) % intact.length];
    return { type: 'cs_press', tooth };
  }

  view(): CaSauView {
    return {
      type: 'ca_sau',
      round: this.round,
      maxRounds: this.maxRounds,
      phase: this.phase,
      phaseEndsAt: this.phaseEndsAt,
      phaseSeconds: this.phaseSeconds,
      order: [...this.order],
      names: Object.fromEntries(this.names),
      currentPlayerId: this.currentPlayerId,
      direction: this.direction,
      totalTeeth: this.totalTeeth,
      teeth: [...this.publicTeeth],
      pressedBy: Object.fromEntries(this.pressedBy),
      scores: Object.fromEntries(this.scores),
      bites: Object.fromEntries(this.bites),
      lastActionText: this.lastActionText,
      bittenPlayerId: this.bittenPlayerId,
      trapTooth: this.trapTooth,
      lives: Object.fromEntries(this.lives),
    };
  }

  dispose(): void {
    this.timer.clear();
  }
}
