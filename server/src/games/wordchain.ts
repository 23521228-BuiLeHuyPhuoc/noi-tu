import { toSyllables, firstSyllable, lastSyllable } from '../../../shared/src/vi';
import {
  TURN_SECONDS, WORD_SYLLABLES,
  type ActionResult, type GameAction, type WordChainView, type WordHistoryItem,
} from '../../../shared/src/types';
import { Timer, type EngineContext, type EnginePlayer, type GameEngine } from './engine';

const MAX_HISTORY = 300;

interface WPlayer extends EnginePlayer {
  eliminated: boolean;
  left: boolean;
  words: number;
  hintUsed: boolean;
}

export class WordChainGame implements GameEngine {
  private players: WPlayer[] = [];
  private currentWord = '';
  private currentId: string | null = null;
  private turnEndsAt: number | null = null;
  private used = new Set<string>();
  private history: WordHistoryItem[] = [];
  private totalWords = 0;
  private solo = false;
  private over = false;
  private readonly timer = new Timer();
  private readonly turnMs: number;

  constructor(private readonly ctx: EngineContext) {
    this.turnMs = ctx.turnMs ?? TURN_SECONDS * 1000;
  }

  start(players: EnginePlayer[]): void {
    this.players = players.map((p) => ({ ...p, eliminated: false, left: false, words: 0, hintUsed: false }));
    this.solo = players.length === 1;
    const first = this.ctx.dict.randomStart(this.used, this.ctx.rng);
    if (!first) throw new Error('Kho từ rỗng');
    this.currentWord = first;
    this.used.add(first);
    this.push({ kind: 'start', word: first });
    this.currentId = this.players[0].id;
    this.beginTurn();
  }

  action(playerId: string, a: GameAction): ActionResult {
    if (this.over) return { ok: false, reason: 'not_playing' };
    if (a.type === 'hint') return this.hint(playerId);
    if (a.type !== 'submit') return { ok: false, reason: 'bad_action' };
    if (playerId !== this.currentId) return { ok: false, reason: 'not_your_turn' };
    if (this.turnEndsAt !== null && Date.now() >= this.turnEndsAt) {
      this.timeout();
      return { ok: false, reason: 'timeout' };
    }
    const raw = a.word;
    if (typeof raw !== 'string' || raw.length > 60) return { ok: false, reason: 'format' };
    const syl = toSyllables(raw);
    if (!syl || syl.length !== WORD_SYLLABLES) return { ok: false, reason: 'format' };
    const word = syl.join(' ');
    if (firstSyllable(word) !== lastSyllable(this.currentWord)) return { ok: false, reason: 'chain' };
    if (this.used.has(word)) return { ok: false, reason: 'used' };
    if (!this.ctx.dict.has(word)) return { ok: false, reason: 'not_in_dictionary' };

    const p = this.find(playerId)!;
    p.words++;
    this.totalWords++;
    this.used.add(word);
    this.currentWord = word;
    this.push({ kind: 'word', word, playerId, name: p.name });
    this.currentId = this.nextAlive(playerId, false);
    this.beginTurn();
    this.ctx.changed();
    return { ok: true };
  }

  /** Quyền cứu trợ: mỗi người 1 lần/ván, chỉ người hỏi mới thấy từ gợi ý */
  private hint(playerId: string): ActionResult {
    const p = this.find(playerId);
    if (!p || p.eliminated) return { ok: false, reason: 'not_playing' };
    if (playerId !== this.currentId) return { ok: false, reason: 'not_your_turn' };
    if (p.hintUsed) return { ok: false, reason: 'hint_used' };
    const options = this.ctx.dict.nextOptions(lastSyllable(this.currentWord), this.used);
    if (options.length === 0) return { ok: false, reason: 'no_hint' };
    p.hintUsed = true;
    this.push({ kind: 'hint', playerId, name: p.name });
    this.ctx.changed();
    return { ok: true, hint: options[Math.floor(this.ctx.rng() * options.length)] };
  }

  removePlayer(playerId: string): void {
    const p = this.find(playerId);
    if (!p || p.left) return;
    p.left = true;
    if (!p.eliminated) {
      p.eliminated = true;
      this.push({ kind: 'eliminated', playerId, name: p.name, reason: 'left' });
      if (this.checkEnd()) return;
      if (this.currentId === playerId) {
        this.currentId = this.nextAlive(playerId, true);
        this.beginTurn();
      }
    }
    this.ctx.changed();
  }

  view(): WordChainView {
    return {
      type: 'wordchain',
      order: this.players.map((p) => p.id),
      eliminated: this.players.filter((p) => p.eliminated).map((p) => p.id),
      words: Object.fromEntries(this.players.map((p) => [p.id, p.words])),
      hintUsed: this.players.filter((p) => p.hintUsed).map((p) => p.id),
      currentWord: this.currentWord,
      currentPlayerId: this.over ? null : this.currentId,
      turnEndsAt: this.over ? null : this.turnEndsAt,
      turnSeconds: this.turnMs / 1000,
      nextCount: this.ctx.dict.countNext(lastSyllable(this.currentWord), this.used),
      history: this.history,
      totalWords: this.totalWords,
    };
  }

  dispose(): void {
    this.timer.clear();
  }

  // ---------- nội bộ ----------

  private beginTurn(): void {
    this.turnEndsAt = Date.now() + this.turnMs;
    this.timer.set(this.turnMs, () => this.timeout());
  }

  private timeout(): void {
    if (this.over || !this.currentId) return;
    this.timer.clear();
    const loser = this.find(this.currentId);
    if (loser) {
      loser.eliminated = true;
      this.push({ kind: 'eliminated', playerId: loser.id, name: loser.name, reason: 'timeout' });
    }
    if (this.checkEnd()) return;
    // ngõ cụt: đổi từ mới để người kế tiếp không bị loại dây chuyền
    if (this.ctx.dict.countNext(lastSyllable(this.currentWord), this.used) === 0) {
      const fresh = this.ctx.dict.randomStart(this.used, this.ctx.rng);
      if (!fresh) return this.end();
      this.currentWord = fresh;
      this.used.add(fresh);
      this.push({ kind: 'newWord', word: fresh });
    }
    this.currentId = this.nextAlive(this.currentId, true);
    this.beginTurn();
    this.ctx.changed();
  }

  private checkEnd(): boolean {
    const alive = this.players.filter((p) => !p.eliminated);
    const over = this.solo ? alive.length === 0 : alive.length <= 1;
    if (over) this.end();
    return over;
  }

  private end(): void {
    this.over = true;
    this.timer.clear();
    const alive = this.players.filter((p) => !p.eliminated);
    const winner = this.solo ? null : alive[0] ?? null;
    // xếp hạng: người thắng trước, sau đó theo số từ, người bị loại sau xếp sau
    const elimOrder = this.history
      .filter((h): h is Extract<WordHistoryItem, { kind: 'eliminated' }> => h.kind === 'eliminated')
      .map((h) => h.playerId);
    const ranked = [...this.players].sort((a, b) => {
      if (winner && a.id === winner.id) return -1;
      if (winner && b.id === winner.id) return 1;
      return elimOrder.indexOf(b.id) - elimOrder.indexOf(a.id) || b.words - a.words;
    });
    this.ctx.finish({
      winnerId: winner?.id ?? null,
      headline: this.solo
        ? `Bạn nối được ${this.totalWords} từ!`
        : winner
          ? `${winner.name} trụ lại cuối cùng!`
          : 'Ván chơi kết thúc',
      ranking: ranked.map((p) => ({
        playerId: p.id,
        name: p.name,
        detail: `${p.words} từ${p.left ? ' · đã thoát' : ''}`,
      })),
    });
  }

  /** Người còn chơi kế tiếp sau `afterId`. `skipSelf`: không được chọn lại chính người đó. */
  private nextAlive(afterId: string, skipSelf: boolean): string | null {
    const n = this.players.length;
    const start = this.players.findIndex((p) => p.id === afterId);
    for (let i = 1; i <= n; i++) {
      const p = this.players[(start + i) % n];
      if (skipSelf && p.id === afterId) continue;
      if (!p.eliminated) return p.id;
    }
    return null;
  }

  private find(id: string): WPlayer | undefined {
    return this.players.find((p) => p.id === id);
  }

  private push(item: WordHistoryItem): void {
    this.history.push(item);
    if (this.history.length > MAX_HISTORY) this.history.splice(0, this.history.length - MAX_HISTORY);
  }
}
