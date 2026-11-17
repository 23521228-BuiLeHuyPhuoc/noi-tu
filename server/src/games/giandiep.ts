import {
  GIAN_DIEP_ROLE_META, GIAN_DIEP_WORDS, MR_WHITE_GENERIC_CLUES,
  type GianDiepClue, type GianDiepPhase, type GianDiepRole, type GianDiepView, type GianDiepWordPair,
} from '../../../shared/src/giandiep';
import type { ActionResult, GameAction } from '../../../shared/src/types';
import { Timer, type EngineContext, type EnginePlayer, type GameEngine } from './engine';

const DEFAULT_SEC: Record<GianDiepPhase, number> = {
  word_reveal: 5,
  clue_turn: 24,
  discussion: 24,
  vote: 22,
  mrwhite_guess: 15,
};

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

function normPhrase(s: string): string {
  return s.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

export class GianDiepGame implements GameEngine {
  readonly perPlayerView = true;

  private order: string[] = [];
  private names = new Map<string, string>();
  private roles = new Map<string, GianDiepRole>();
  private words = new Map<string, string | null>();
  private alive = new Set<string>();
  private eliminated: { id: string; role: GianDiepRole; round: number }[] = [];

  private pair!: GianDiepWordPair;
  private danWord = '';
  private spyWord = '';

  private round = 1;
  private phase: GianDiepPhase = 'word_reveal';
  private phaseEndsAt: number | null = null;
  private phaseSeconds = DEFAULT_SEC.word_reveal;
  private phaseStartedAt = 0;

  private speakerOrder: string[] = [];
  private speakerIdx = 0;
  private clues: GianDiepClue[] = [];
  private clueSeq = 0;
  private readySkip = new Set<string>();
  private votes = new Map<string, string | 'skip'>();
  private mrWhiteId: string | null = null;
  private mrWhiteGuessed = false;
  private finished = false;
  private readonly timer = new Timer();

  constructor(private readonly ctx: EngineContext) {}

  private msFor(p: GianDiepPhase): number {
    const def = DEFAULT_SEC[p] * 1000;
    return this.ctx.turnMs ? Math.min(def, Math.max(300, this.ctx.turnMs)) : def;
  }

  start(players: EnginePlayer[]): void {
    this.order = players.map((p) => p.id);
    for (const p of players) {
      this.names.set(p.id, p.name);
      this.alive.add(p.id);
    }

    this.pair = GIAN_DIEP_WORDS[Math.floor(this.ctx.rng() * GIAN_DIEP_WORDS.length) % GIAN_DIEP_WORDS.length];
    const flip = this.ctx.rng() < 0.5;
    this.danWord = flip ? this.pair.wordB : this.pair.wordA;
    this.spyWord = flip ? this.pair.wordA : this.pair.wordB;

    const n = players.length;
    const maxHidden = Math.max(1, Math.floor((n - 1) / 2));
    const wantWhite = (this.ctx.settings.giandiepMrWhite ?? (n >= 5)) && n >= 4;
    const whiteCount = wantWhite && maxHidden >= 2 ? 1 : (wantWhite && n === 4 && this.ctx.settings.giandiepSpies === undefined ? 0 : 0);
    // Cho phép 4 người có Mr. White nếu muốn? An toàn nhất: 5+ người mới bật cả Spy + White,
    // hoặc 4 người có 1 Spy (hoặc nếu user ép muốn MrWhite ở >=5 người).
    const requestedSpies = this.ctx.settings.giandiepSpies ?? (n >= 9 ? 3 : n >= 6 ? 2 : 1);
    const spyCount = Math.max(1, Math.min(requestedSpies, maxHidden - whiteCount));

    const deck: GianDiepRole[] = [];
    for (let i = 0; i < spyCount; i++) deck.push('giandiep');
    for (let i = 0; i < whiteCount; i++) deck.push('mrwhite');
    while (deck.length < n) deck.push('dan');

    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(this.ctx.rng() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    this.order.forEach((id, i) => {
      const r = deck[i];
      this.roles.set(id, r);
      this.words.set(id, r === 'dan' ? this.danWord : r === 'giandiep' ? this.spyWord : null);
    });

    this.enterPhase('word_reveal', () => this.startRound());
    this.ctx.changed();
  }

  private enterPhase(phase: GianDiepPhase, onTimeout: () => void): void {
    if (this.finished) return;
    this.phase = phase;
    const ms = this.msFor(phase);
    this.phaseSeconds = Math.max(1, Math.round(ms / 1000));
    this.phaseStartedAt = Date.now();
    this.phaseEndsAt = this.phaseStartedAt + ms;
    this.timer.set(ms, onTimeout);
  }

  private startRound(): void {
    if (this.finished) return;
    const list = this.order.filter((id) => this.alive.has(id));
    if (this.round === 1 && list.length > 1 && this.roles.get(list[0]) === 'mrwhite') {
      // Luật chuẩn: Mr. White không bao giờ nói đầu tiên ở Vòng 1
      const nonWhiteIdx = list.findIndex((id) => this.roles.get(id) !== 'mrwhite');
      if (nonWhiteIdx > 0) [list[0], list[nonWhiteIdx]] = [list[nonWhiteIdx], list[0]];
    }
    this.speakerOrder = list;
    this.speakerIdx = 0;
    this.readySkip.clear();
    this.votes.clear();
    this.beginSpeakerTurn();
  }

  private beginSpeakerTurn(): void {
    if (this.finished) return;
    while (this.speakerIdx < this.speakerOrder.length && !this.alive.has(this.speakerOrder[this.speakerIdx])) {
      this.speakerIdx++;
    }
    if (this.speakerIdx >= this.speakerOrder.length) {
      this.startDiscussion();
      return;
    }
    const speakerId = this.speakerOrder[this.speakerIdx];
    this.enterPhase('clue_turn', () => {
      this.clues.push({
        id: ++this.clueSeq,
        round: this.round,
        playerId: speakerId,
        name: this.names.get(speakerId) ?? speakerId,
        text: '🤐 (Im lặng hết giờ)',
      });
      this.speakerIdx++;
      this.beginSpeakerTurn();
    });
    this.ctx.changed();
  }

  private startDiscussion(): void {
    if (this.finished) return;
    this.readySkip.clear();
    this.enterPhase('discussion', () => this.startVote());
    this.ctx.changed();
  }

  private startVote(): void {
    if (this.finished) return;
    this.votes.clear();
    this.enterPhase('vote', () => this.resolveVote());
    this.ctx.changed();
  }

  private resolveVote(): void {
    if (this.finished) return;
    const tally = new Map<string, number>();
    let skips = 0;
    for (const [voter, target] of this.votes) {
      if (!this.alive.has(voter)) continue;
      if (target === 'skip') skips++;
      else if (this.alive.has(target)) tally.set(target, (tally.get(target) ?? 0) + 1);
    }

    let chosen: string | null = null;
    if (tally.size > 0) {
      const max = Math.max(...tally.values());
      const top = [...tally.entries()].filter(([, c]) => c === max).map(([id]) => id);
      if (top.length === 1 && max > skips) chosen = top[0];
    }

    if (!chosen) {
      this.round++;
      this.startRound();
      return;
    }

    const role = this.roles.get(chosen)!;
    this.alive.delete(chosen);
    this.eliminated.push({ id: chosen, role, round: this.round });

    if (role === 'mrwhite') {
      this.mrWhiteId = chosen;
      this.mrWhiteGuessed = false;
      this.enterPhase('mrwhite_guess', () => {
        this.mrWhiteId = null;
        if (!this.checkWin()) {
          this.round++;
          this.startRound();
        }
      });
      this.ctx.changed();
      return;
    }

    if (this.checkWin()) return;
    this.round++;
    this.startRound();
  }

  private checkWin(): boolean {
    if (this.finished) return true;
    const aliveIds = [...this.alive];
    const hiddenAlive = aliveIds.filter((id) => this.roles.get(id) !== 'dan');
    const danAlive = aliveIds.filter((id) => this.roles.get(id) === 'dan');

    if (hiddenAlive.length === 0) {
      const winners = this.order.filter((id) => this.roles.get(id) === 'dan');
      this.finishGame('dan', winners, `🎉 Bắt gọn toàn bộ Gián Điệp! Dân Thường thắng (${this.danWord} / ${this.spyWord})`);
      return true;
    }

    if (danAlive.length <= hiddenAlive.length) {
      const winners = this.order.filter((id) => {
        const r = this.roles.get(id);
        return r === 'giandiep' || (r === 'mrwhite' && this.alive.has(id));
      });
      this.finishGame('spy', winners, `🕵️ Gián Điệp ẩn mình thành công! Phe Gián Điệp thắng (${this.spyWord} vs ${this.danWord})`);
      return true;
    }
    return false;
  }

  private finishGame(_why: 'dan' | 'spy' | 'mrwhite', winnerIds: string[], headline: string): void {
    if (this.finished) return;
    this.finished = true;
    this.timer.clear();
    const winSet = new Set(winnerIds);
    const sorted = [...this.order].sort((a, b) => (winSet.has(b) ? 1 : 0) - (winSet.has(a) ? 1 : 0));
    const ranking = sorted.map((id) => {
      const r = this.roles.get(id)!;
      const m = GIAN_DIEP_ROLE_META[r];
      const word = this.words.get(id) ?? 'Không có từ';
      return {
        playerId: id,
        name: this.names.get(id) ?? id,
        detail: `${m.emoji} ${m.name} (${word}) · ${winSet.has(id) ? '🏆 Thắng' : 'Thua'}`,
      };
    });
    this.ctx.finish({
      winnerId: winnerIds[0] ?? null,
      winnerIds,
      ranking,
      headline,
    });
  }

  private containsSecretWord(text: string, secret: string | null | undefined): boolean {
    if (!secret) return false;
    const cleanText = normPhrase(text);
    const cleanSecret = normPhrase(secret);
    if (!cleanSecret) return false;
    if (cleanText.includes(cleanSecret)) return true;
    return stripAccents(cleanText).includes(stripAccents(cleanSecret));
  }

  action(playerId: string, action: GameAction): ActionResult {
    if (this.finished) return { ok: false, reason: 'not_playing' };
    const role = this.roles.get(playerId);
    if (!role) return { ok: false, reason: 'bad_action' };

    if (action.type === 'gd_guess') {
      if (this.phase !== 'mrwhite_guess' || this.mrWhiteId !== playerId || this.mrWhiteGuessed) {
        return { ok: false, reason: 'not_your_turn' };
      }
      const guess = action.word.normalize('NFC').replace(/\s+/g, ' ').trim();
      if (!guess) return { ok: false, reason: 'bad_action' };
      this.mrWhiteGuessed = true;
      this.timer.clear();
      const matched = normPhrase(guess) === normPhrase(this.danWord) || stripAccents(normPhrase(guess)) === stripAccents(normPhrase(this.danWord));
      if (matched) {
        this.finishGame('mrwhite', [playerId], `🤍 Mr. White ${this.names.get(playerId)} đoán trúng "${this.danWord}" và LẬT KÈO THẮNG ĐỘC LẬP!`);
      } else {
        this.mrWhiteId = null;
        if (!this.checkWin()) {
          this.round++;
          this.startRound();
        }
      }
      return { ok: true };
    }

    if (!this.alive.has(playerId)) return { ok: false, reason: 'bad_action' };

    if (action.type === 'gd_clue') {
      const currentSpeaker = this.speakerOrder[this.speakerIdx];
      if (this.phase !== 'clue_turn' || currentSpeaker !== playerId) return { ok: false, reason: 'not_your_turn' };
      const text = action.text.normalize('NFC').replace(/\s+/g, ' ').trim().slice(0, 80);
      if (!text) return { ok: false, reason: 'bad_action' };
      const myWord = this.words.get(playerId);
      if (this.containsSecretWord(text, myWord)) return { ok: false, reason: 'word_leaked' };
      this.timer.clear();
      this.clues.push({
        id: ++this.clueSeq,
        round: this.round,
        playerId,
        name: this.names.get(playerId) ?? playerId,
        text,
      });
      this.speakerIdx++;
      this.beginSpeakerTurn();
      return { ok: true };
    }

    if (action.type === 'gd_ready') {
      if (this.phase !== 'discussion') return { ok: false, reason: 'bad_action' };
      this.readySkip.add(playerId);
      const aliveConn = [...this.alive].filter((id) => this.ctx.isBot?.(id) || this.ctx.isConnected(id)).length;
      if (this.readySkip.size >= Math.max(1, Math.ceil(aliveConn / 2))) {
        this.timer.clear();
        this.startVote();
      } else {
        this.ctx.changed();
      }
      return { ok: true };
    }

    if (action.type === 'gd_vote') {
      if (this.phase !== 'vote') return { ok: false, reason: 'bad_action' };
      if (action.target !== 'skip' && (!this.alive.has(action.target) || action.target === playerId)) {
        return { ok: false, reason: 'bad_action' };
      }
      this.votes.set(playerId, action.target);
      const aliveConn = [...this.alive].filter((id) => this.ctx.isBot?.(id) || this.ctx.isConnected(id));
      if (aliveConn.every((id) => this.votes.has(id))) {
        this.timer.clear();
        this.resolveVote();
      } else {
        this.ctx.changed();
      }
      return { ok: true };
    }

    return { ok: false, reason: 'bad_action' };
  }

  removePlayer(playerId: string): void {
    if (this.finished) return;
    if (this.phase === 'mrwhite_guess' && this.mrWhiteId === playerId) {
      this.timer.clear();
      this.mrWhiteId = null;
      if (!this.checkWin()) { this.round++; this.startRound(); }
      return;
    }
    if (!this.alive.has(playerId)) return;
    this.alive.delete(playerId);
    const role = this.roles.get(playerId)!;
    this.eliminated.push({ id: playerId, role, round: this.round });
    if (this.checkWin()) return;
    if (this.phase === 'clue_turn' && this.speakerOrder[this.speakerIdx] === playerId) {
      this.timer.clear();
      this.speakerIdx++;
      this.beginSpeakerTurn();
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
    if (this.finished) return null;
    if (this.phase === 'mrwhite_guess' && this.mrWhiteId === playerId && !this.mrWhiteGuessed) {
      const guess = this.ctx.rng() < 0.25 ? this.danWord : this.spyWord;
      return { type: 'gd_guess', word: guess };
    }
    if (!this.alive.has(playerId)) return null;
    const role = this.roles.get(playerId);

    if (this.phase === 'clue_turn' && this.speakerOrder[this.speakerIdx] === playerId) {
      const usedTexts = new Set(this.clues.map((c) => c.text));
      const pool = role === 'mrwhite'
        ? MR_WHITE_GENERIC_CLUES
        : this.words.get(playerId) === this.pair.wordA
          ? this.pair.cluesA
          : this.pair.cluesB;
      const fresh = pool.filter((t) => !usedTexts.has(t));
      const pick = (fresh.length ? fresh : pool)[Math.floor(this.ctx.rng() * (fresh.length || pool.length))] ?? 'Khá quen thuộc';
      return { type: 'gd_clue', text: pick };
    }

    if (this.phase === 'discussion' && !this.readySkip.has(playerId)) {
      const aliveHumans = [...this.alive].filter((id) => !this.ctx.isBot?.(id));
      if (aliveHumans.length === 0 || Date.now() - this.phaseStartedAt >= 8_000) {
        return { type: 'gd_ready' };
      }
      return null;
    }

    if (this.phase === 'vote' && !this.votes.has(playerId)) {
      const candidates = [...this.alive].filter((id) => {
        if (id === playerId) return false;
        if (role === 'giandiep' && this.roles.get(id) === 'giandiep') return false;
        return true;
      });
      if (candidates.length === 0) return { type: 'gd_vote', target: 'skip' };
      const pick = candidates[Math.floor(this.ctx.rng() * candidates.length) % candidates.length];
      return { type: 'gd_vote', target: pick };
    }

    return null;
  }

  view(viewerId?: string): GianDiepView {
    const myRole = viewerId ? (this.roles.get(viewerId) ?? null) : null;
    const myWord = viewerId && myRole ? (this.words.get(viewerId) ?? null) : null;
    return {
      type: 'giandiep',
      round: this.round,
      phase: this.phase,
      phaseEndsAt: this.phaseEndsAt,
      phaseSeconds: this.phaseSeconds,
      category: this.pair.category,
      order: [...this.order],
      names: Object.fromEntries(this.names),
      alive: [...this.alive],
      eliminated: [...this.eliminated],
      currentSpeakerId: this.phase === 'clue_turn' ? (this.speakerOrder[this.speakerIdx] ?? null) : null,
      speakerOrder: [...this.speakerOrder],
      clues: [...this.clues],
      readySkip: [...this.readySkip],
      votes: Object.fromEntries(this.votes),
      mrWhiteId: this.phase === 'mrwhite_guess' ? this.mrWhiteId : null,
      myRole,
      myWord,
    };
  }

  dispose(): void {
    this.timer.clear();
  }
}
