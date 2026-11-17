/**
 * Server Engine: Hội Bàn Tròn Vô Tri (`cah` — Cards Against Humanity VN Party Edition, 3–12 người).
 */
import {
  CAH_BLACK_CARDS,
  CAH_DEFAULT_ROUNDS,
  CAH_HAND_SIZE,
  CAH_WHITE_CARDS,
  fillBlackCard,
  renderBlackCard,
  type CahAnonEntry,
  type CahBlackCard,
  type CahPhase,
  type CahView,
} from '../../../shared/src/cah';
import type { ActionResult, GameAction } from '../../../shared/src/types';
import { Timer, type EngineContext, type EnginePlayer, type GameEngine } from './engine';

const DEFAULT_SEC: Record<CahPhase, number> = {
  pick: 28,
  vote: 22,
  reveal: 5,
};

interface InternalEntry {
  slotId: string;
  text: string;
  authorId: string;
  votes: string[];
}

export class CahGame implements GameEngine {
  readonly perPlayerView = true;

  private order: string[] = [];
  private names = new Map<string, string>();
  private scores = new Map<string, number>();
  private hands = new Map<string, string[]>();
  private mulliganLeft = new Map<string, number>();

  private blackDeck: CahBlackCard[] = [];
  private whiteDeck: string[] = [];
  private whiteDiscard: string[] = [];

  private round = 1;
  private maxRounds = CAH_DEFAULT_ROUNDS;
  private phase: CahPhase = 'pick';
  private phaseEndsAt: number | null = null;
  private phaseSeconds = DEFAULT_SEC.pick;

  private currentBlack: CahBlackCard = CAH_BLACK_CARDS[0];
  private targetPlayerId: string | null = null;
  private blackPrompt = '';

  private picks = new Map<string, string>();
  private entries: InternalEntry[] = [];
  private votes = new Map<string, string>();
  private roundWinnerIds: string[] = [];

  private finished = false;
  private readonly timer = new Timer();

  constructor(private readonly ctx: EngineContext) {
    this.maxRounds = ctx.settings.cahRounds ?? CAH_DEFAULT_ROUNDS;
  }

  private msFor(phase: CahPhase): number {
    const def = DEFAULT_SEC[phase] * 1000;
    return this.ctx.turnMs ? Math.min(def, Math.max(250, this.ctx.turnMs)) : def;
  }

  private shuffleInPlace<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.ctx.rng() * (i + 1)) % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  private drawBlack(): CahBlackCard {
    if (this.blackDeck.length === 0) {
      this.blackDeck = this.shuffleInPlace([...CAH_BLACK_CARDS]);
    }
    return this.blackDeck.pop()!;
  }

  private drawWhite(exclude: ReadonlySet<string>): string | null {
    for (let attempt = 0; attempt < 2; attempt++) {
      for (let i = this.whiteDeck.length - 1; i >= 0; i--) {
        const candidate = this.whiteDeck[i];
        if (!exclude.has(candidate)) {
          this.whiteDeck.splice(i, 1);
          return candidate;
        }
      }
      if (this.whiteDiscard.length > 0) {
        this.whiteDeck.push(...this.shuffleInPlace(this.whiteDiscard.splice(0)));
      } else {
        this.whiteDeck = this.shuffleInPlace([...CAH_WHITE_CARDS]);
      }
    }
    return this.whiteDeck.pop() ?? CAH_WHITE_CARDS[0];
  }

  private allCardsInHands(): Set<string> {
    const inHands = new Set<string>();
    for (const h of this.hands.values()) {
      for (const c of h) inHands.add(c);
    }
    return inHands;
  }

  private replenishAllHands(): void {
    const inHands = this.allCardsInHands();
    for (const id of this.order) {
      const hand = this.hands.get(id) ?? [];
      while (hand.length < CAH_HAND_SIZE) {
        const card = this.drawWhite(inHands);
        if (!card) break;
        hand.push(card);
        inHands.add(card);
      }
      this.hands.set(id, hand);
    }
  }

  start(players: EnginePlayer[]): void {
    this.order = players.map((p) => p.id);
    for (const p of players) {
      this.names.set(p.id, p.name);
      this.scores.set(p.id, 0);
      this.hands.set(p.id, []);
      this.mulliganLeft.set(p.id, 1);
    }

    this.blackDeck = this.shuffleInPlace([...CAH_BLACK_CARDS]);
    this.whiteDeck = this.shuffleInPlace([...CAH_WHITE_CARDS]);
    this.whiteDiscard = [];

    this.replenishAllHands();
    this.round = 1;
    this.startRound();
  }

  private enterPhase(phase: CahPhase, onTimeout: () => void): void {
    if (this.finished) return;
    this.phase = phase;
    const ms = this.msFor(phase);
    this.phaseSeconds = Math.max(1, Math.round(ms / 1000));
    this.phaseEndsAt = Date.now() + ms;
    this.timer.set(ms, onTimeout);
  }

  private refreshPromptText(): void {
    if (this.currentBlack.usesPlayer && this.targetPlayerId) {
      const tName = this.names.get(this.targetPlayerId) ?? 'Ai đó';
      this.blackPrompt = renderBlackCard(this.currentBlack, tName);
    } else {
      this.blackPrompt = renderBlackCard(this.currentBlack, 'Ai đó');
    }
  }

  private startRound(): void {
    if (this.finished) return;
    if (this.order.length === 0) {
      this.finishAll();
      return;
    }

    this.picks.clear();
    this.entries = [];
    this.votes.clear();
    this.roundWinnerIds = [];
    this.replenishAllHands();

    this.currentBlack = this.drawBlack();
    if (this.currentBlack.usesPlayer && this.order.length > 0) {
      const idx = Math.floor(this.ctx.rng() * this.order.length) % this.order.length;
      this.targetPlayerId = this.order[idx];
    } else {
      this.targetPlayerId = null;
    }
    this.refreshPromptText();

    this.enterPhase('pick', () => this.lockPicksAndStartVote());
    this.ctx.changed();
  }

  private activeIds(): string[] {
    return this.order.filter((id) => this.ctx.isBot?.(id) || this.ctx.isConnected(id));
  }

  private lockPicksAndStartVote(): void {
    if (this.finished) return;
    this.timer.clear();

    // Tự bốc ngẫu nhiên 1 lá trên tay cho người chơi treo máy / hết giờ
    for (const id of this.order) {
      if (this.picks.has(id)) continue;
      const hand = this.hands.get(id) ?? [];
      if (hand.length === 0) continue;
      const idx = Math.floor(this.ctx.rng() * hand.length) % hand.length;
      const [picked] = hand.splice(idx, 1);
      this.picks.set(id, picked);
    }

    const rawEntries = [...this.picks.entries()].map(([authorId, text]) => ({ authorId, text }));
    if (rawEntries.length === 0) {
      this.finishAll();
      return;
    }

    this.shuffleInPlace(rawEntries);
    this.entries = rawEntries.map((item, i) => ({
      slotId: `s${i}`,
      text: item.text,
      authorId: item.authorId,
      votes: [],
    }));

    this.enterPhase('vote', () => this.resolveVotesAndEnterReveal());
    this.ctx.changed();
  }

  private resolveVotesAndEnterReveal(): void {
    if (this.finished) return;
    this.timer.clear();

    let maxVotes = 0;
    for (const entry of this.entries) {
      const vCount = entry.votes.length;
      if (vCount > 0) {
        this.scores.set(entry.authorId, (this.scores.get(entry.authorId) ?? 0) + vCount * 100);
      }
      if (vCount > maxVotes) {
        maxVotes = vCount;
      }
    }

    const winners: string[] = [];
    if (maxVotes > 0) {
      for (const entry of this.entries) {
        if (entry.votes.length === maxVotes) {
          this.scores.set(entry.authorId, (this.scores.get(entry.authorId) ?? 0) + 150);
          if (!winners.includes(entry.authorId)) {
            winners.push(entry.authorId);
          }
        }
      }
    }
    this.roundWinnerIds = winners;

    // Thu hồi các lá đã đánh vào chồng bài bỏ và rút bù đủ 7 lá cho vòng kế
    for (const cardText of this.picks.values()) {
      this.whiteDiscard.push(cardText);
    }
    this.replenishAllHands();

    this.enterPhase('reveal', () => {
      if (this.round >= this.maxRounds) {
        this.finishAll();
      } else {
        this.round++;
        this.startRound();
      }
    });
    this.ctx.changed();
  }

  private finishAll(): void {
    if (this.finished) return;
    this.finished = true;
    this.timer.clear();

    const sorted = [...this.order].sort((a, b) => (this.scores.get(b) ?? 0) - (this.scores.get(a) ?? 0));
    const maxScore = sorted.length > 0 ? (this.scores.get(sorted[0]) ?? 0) : 0;
    const winnerIds = sorted.length > 0 ? sorted.filter((id) => (this.scores.get(id) ?? 0) === maxScore) : [];

    const ranking = sorted.map((id) => ({
      playerId: id,
      name: this.names.get(id) ?? id,
      detail: `${(this.scores.get(id) ?? 0).toLocaleString('vi-VN')} điểm độ lầy`,
    }));

    let headline = '🃏 Kết thúc Hội Bàn Tròn Vô Tri!';
    if (winnerIds.length > 0) {
      const winNames = winnerIds.map((id) => this.names.get(id) ?? id).join(' & ');
      const sampleWinEntry = this.entries.find((e) => winnerIds.includes(e.authorId));
      const quote = sampleWinEntry ? ` — ${fillBlackCard(this.blackPrompt, sampleWinEntry.text)}` : '';
      headline = `🃏 ${winNames} đăng quang Thánh Lầy Hội Bàn Tròn (${maxScore.toLocaleString('vi-VN')}đ)${quote.slice(0, 120)}`;
    }

    this.ctx.finish({
      winnerId: winnerIds[0] ?? null,
      winnerIds,
      ranking,
      headline,
    });
  }

  action(playerId: string, action: GameAction): ActionResult {
    if (this.finished) return { ok: false, reason: 'not_playing' };
    if (!this.order.includes(playerId)) return { ok: false, reason: 'not_playing' };

    if (action.type === 'end') {
      if (playerId !== this.ctx.hostId()) return { ok: false, reason: 'not_host' };
      this.finishAll();
      return { ok: true };
    }

    if (action.type === 'cah_mulligan') {
      if (this.phase !== 'pick') return { ok: false, reason: 'not_your_turn' };
      if (this.picks.has(playerId)) return { ok: false, reason: 'bad_action' };
      const left = this.mulliganLeft.get(playerId) ?? 0;
      if (left <= 0) return { ok: false, reason: 'bad_action' };

      this.mulliganLeft.set(playerId, left - 1);
      const oldHand = this.hands.get(playerId) ?? [];
      this.hands.set(playerId, []);
      const exclude = this.allCardsInHands();
      for (const old of oldHand) exclude.add(old);

      const newHand: string[] = [];
      for (let i = 0; i < CAH_HAND_SIZE; i++) {
        const c = this.drawWhite(exclude);
        if (!c) break;
        newHand.push(c);
        exclude.add(c);
      }
      this.whiteDiscard.push(...oldHand);
      this.hands.set(playerId, newHand);
      this.ctx.changed();
      return { ok: true };
    }

    if (action.type === 'cah_pick') {
      if (this.phase !== 'pick') return { ok: false, reason: 'not_your_turn' };
      if (this.picks.has(playerId)) return { ok: false, reason: 'bad_action' };
      if (typeof action.card !== 'string' || !action.card) return { ok: false, reason: 'bad_action' };

      const hand = this.hands.get(playerId) ?? [];
      const idx = hand.indexOf(action.card);
      if (idx === -1) return { ok: false, reason: 'bad_action' };

      hand.splice(idx, 1);
      this.picks.set(playerId, action.card);

      const active = this.activeIds();
      if (active.length > 0 && active.every((id) => this.picks.has(id))) {
        this.lockPicksAndStartVote();
      } else {
        this.ctx.changed();
      }
      return { ok: true };
    }

    if (action.type === 'cah_vote') {
      if (this.phase !== 'vote') return { ok: false, reason: 'not_your_turn' };
      if (this.votes.has(playerId)) return { ok: false, reason: 'bad_action' };
      if (typeof action.slotId !== 'string') return { ok: false, reason: 'bad_action' };

      const entry = this.entries.find((e) => e.slotId === action.slotId);
      if (!entry) return { ok: false, reason: 'bad_action' };
      // Cấm tự bầu cho bài của chính mình khi phòng có >= 3 người chơi
      if (this.order.length >= 3 && entry.authorId === playerId) {
        return { ok: false, reason: 'bad_action' };
      }

      this.votes.set(playerId, entry.slotId);
      entry.votes.push(playerId);

      const active = this.activeIds();
      if (active.length > 0 && active.every((id) => this.votes.has(id))) {
        this.resolveVotesAndEnterReveal();
      } else {
        this.ctx.changed();
      }
      return { ok: true };
    }

    return { ok: false, reason: 'bad_action' };
  }

  removePlayer(playerId: string): void {
    if (this.finished || !this.order.includes(playerId)) return;
    this.order = this.order.filter((id) => id !== playerId);
    const hand = this.hands.get(playerId);
    if (hand) {
      this.whiteDiscard.push(...hand);
      this.hands.delete(playerId);
    }

    if (this.order.length < 2) {
      this.finishAll();
      return;
    }

    const active = this.activeIds();
    if (this.phase === 'pick' && active.length > 0 && active.every((id) => this.picks.has(id))) {
      this.lockPicksAndStartVote();
      return;
    }
    if (this.phase === 'vote' && active.length > 0 && active.every((id) => this.votes.has(id))) {
      this.resolveVotesAndEnterReveal();
      return;
    }
    this.ctx.changed();
  }

  onPlayerConnection(_playerId: string, connected: boolean): void {
    if (this.finished) return;
    if (connected) {
      this.ctx.changed();
      return;
    }
    const active = this.activeIds();
    if (this.phase === 'pick' && active.length > 0 && active.every((id) => this.picks.has(id))) {
      this.lockPicksAndStartVote();
    } else if (this.phase === 'vote' && active.length > 0 && active.every((id) => this.votes.has(id))) {
      this.resolveVotesAndEnterReveal();
    }
  }

  renamePlayer(playerId: string, name: string): void {
    if (!this.names.has(playerId)) return;
    this.names.set(playerId, name);
    if (this.targetPlayerId === playerId) {
      this.refreshPromptText();
    }
  }

  botAction(playerId: string): GameAction | null {
    if (this.finished || !this.order.includes(playerId)) return null;

    if (this.phase === 'pick' && !this.picks.has(playerId)) {
      const hand = this.hands.get(playerId) ?? [];
      if (hand.length === 0) return null;
      const pick = hand[Math.floor(this.ctx.rng() * hand.length) % hand.length];
      return { type: 'cah_pick', card: pick };
    }

    if (this.phase === 'vote' && !this.votes.has(playerId)) {
      const legal = this.entries.filter((e) => this.order.length < 3 || e.authorId !== playerId);
      if (legal.length === 0) return null;
      const chosen = legal[Math.floor(this.ctx.rng() * legal.length) % legal.length];
      return { type: 'cah_vote', slotId: chosen.slotId };
    }

    return null;
  }

  view(viewerId?: string): CahView {
    const isReveal = this.phase === 'reveal';
    const publicEntries: CahAnonEntry[] = this.entries.map((e) =>
      isReveal
        ? {
            slotId: e.slotId,
            text: e.text,
            votes: [...e.votes],
            authorId: e.authorId,
            authorName: this.names.get(e.authorId) ?? e.authorId,
          }
        : {
            slotId: e.slotId,
            text: e.text,
            votes: [...e.votes],
          },
    );

    return {
      type: 'cah',
      round: this.round,
      maxRounds: this.maxRounds,
      phase: this.phase,
      phaseEndsAt: this.phaseEndsAt,
      phaseSeconds: this.phaseSeconds,
      order: [...this.order],
      names: Object.fromEntries(this.names),
      scores: Object.fromEntries(this.order.map((id) => [id, this.scores.get(id) ?? 0])),
      blackPrompt: this.blackPrompt,
      blackCategory: this.currentBlack.category,
      targetPlayerId: this.targetPlayerId,
      submittedIds: [...this.picks.keys()],
      votedIds: [...this.votes.keys()],
      myHand: viewerId ? [...(this.hands.get(viewerId) ?? [])] : [],
      myPicked: viewerId ? (this.picks.get(viewerId) ?? null) : null,
      myVote: viewerId ? (this.votes.get(viewerId) ?? null) : null,
      myMulliganLeft: viewerId ? (this.mulliganLeft.get(viewerId) ?? 0) : 0,
      entries: publicEntries,
      roundWinnerIds: [...this.roundWinnerIds],
    };
  }

  dispose(): void {
    this.timer.clear();
  }
}
