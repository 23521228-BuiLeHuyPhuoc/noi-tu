import { toSyllables, firstSyllable, lastSyllable } from '../../../shared/src/vi';
import { normalizeEnWord, firstLetter, lastLetter } from '../../../shared/src/en';
import {
  TURN_SECONDS, VOTE_SECONDS, WORD_SYLLABLES,
  type ActionResult, type ActionError, type GameAction, type WordChainView, type WordHistoryItem, type WordVote,
} from '../../../shared/src/types';
import type { Dictionary, DictLang } from '../dictionary';
import { Timer, type EngineContext, type EnginePlayer, type GameEngine } from './engine';

const MAX_HISTORY = 300;
/** sau khi xin duyệt bị từ chối, người chơi còn ít nhất chừng này thời gian */
const MIN_RESUME_MS = 5000;

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
  private readonly voteMs: number;
  private readonly dict: Dictionary;
  /** đang xin duyệt từ; thời gian lượt tạm dừng, còn lại `pausedLeft` ms */
  private vote: WordVote | null = null;
  private pausedLeft = 0;
  /** đã xin duyệt trong lượt này chưa (mỗi lượt 1 lần) */
  private appealedTurn = false;

  constructor(private readonly ctx: EngineContext, private readonly lang: DictLang = 'vi') {
    this.dict = lang === 'en' ? (ctx.dict.en ?? ctx.dict) : ctx.dict;
    this.turnMs = ctx.turnMs ?? TURN_SECONDS * 1000;
    this.voteMs = Math.min(VOTE_SECONDS * 1000, this.turnMs);
  }

  private lastUnit(word: string): string {
    return this.lang === 'en' ? lastLetter(word) : lastSyllable(word);
  }

  start(players: EnginePlayer[]): void {
    this.players = players.map((p) => ({ ...p, eliminated: false, left: false, words: 0, hintUsed: false }));
    this.solo = players.length === 1;
    const first = this.dict.randomStart(this.used, this.ctx.rng);
    if (!first) throw new Error('Kho từ rỗng');
    this.currentWord = first;
    this.used.add(first);
    this.push({ kind: 'start', word: first });
    this.currentId = this.players[0].id;
    this.beginTurn();
  }

  action(playerId: string, a: GameAction): ActionResult {
    if (this.over) return { ok: false, reason: 'not_playing' };
    if (a.type === 'vote') return this.castVote(playerId, a.yes);
    if (this.vote) return { ok: false, reason: 'bad_action' };
    if (a.type === 'hint') return this.hint(playerId);
    if (a.type !== 'submit' && a.type !== 'appeal') return { ok: false, reason: 'bad_action' };
    if (playerId !== this.currentId) return { ok: false, reason: 'not_your_turn' };
    if (this.turnEndsAt !== null && Date.now() >= this.turnEndsAt) {
      this.timeout();
      return { ok: false, reason: 'timeout' };
    }
    const checked = this.check(a.word);
    if (typeof checked !== 'string') {
      // từ chưa có trong từ điển vẫn có thể xin cả phòng duyệt
      if (a.type === 'appeal' && checked.reason === 'not_in_dictionary') return this.appeal(playerId, checked.word);
      return { ok: false, reason: a.type === 'appeal' ? 'cannot_appeal' : checked.reason };
    }
    if (a.type === 'appeal') return { ok: false, reason: 'cannot_appeal' };
    this.accept(playerId, checked);
    return { ok: true };
  }

  /** Kiểm tra từ gửi lên: trả về từ đã chuẩn hóa nếu hợp lệ */
  private check(raw: unknown): string | { reason: ActionError; word: string } {
    if (typeof raw !== 'string' || raw.length > 60) return { reason: 'format', word: '' };
    if (this.lang === 'en') {
      const word = normalizeEnWord(raw);
      if (!word) return { reason: 'format', word: '' };
      const need = lastLetter(this.currentWord);
      if (firstLetter(word) !== need) return { reason: 'chain', word };
      const resolved =
        !this.dict.has(word) &&
        word.startsWith(need + need) &&
        word.length >= 3 &&
        (this.dict.has(word.slice(1)) || this.used.has(word.slice(1)))
          ? word.slice(1)
          : word;
      if (this.used.has(resolved)) return { reason: 'used', word: resolved };
      if (!this.dict.has(resolved)) return { reason: 'not_in_dictionary', word: resolved };
      return resolved;
    }
    const syl = toSyllables(raw);
    if (!syl || syl.length !== WORD_SYLLABLES) return { reason: 'format', word: '' };
    const word = syl.join(' ');
    if (firstSyllable(word) !== lastSyllable(this.currentWord)) return { reason: 'chain', word };
    if (this.used.has(word)) return { reason: 'used', word };
    if (!this.dict.has(word)) return { reason: 'not_in_dictionary', word };
    return word;
  }

  private accept(playerId: string, word: string): void {
    const p = this.find(playerId)!;
    p.words++;
    this.totalWords++;
    this.used.add(word);
    this.currentWord = word;
    this.push({ kind: 'word', word, playerId, name: p.name });
    this.currentId = this.nextAlive(playerId, false);
    this.beginTurn();
    this.ctx.changed();
  }

  // ---------- xin duyệt từ ----------

  private appeal(playerId: string, word: string): ActionResult {
    if (this.appealedTurn) return { ok: false, reason: 'cannot_appeal' };
    const voters = this.players
      .filter((p) => p.id !== playerId && !p.eliminated && this.ctx.isConnected(p.id))
      .map((p) => p.id);
    if (voters.length === 0) return { ok: false, reason: 'no_voters' };
    const by = this.find(playerId)!;
    this.appealedTurn = true;
    this.pausedLeft = Math.max(0, (this.turnEndsAt ?? Date.now()) - Date.now());
    this.turnEndsAt = null;
    this.vote = { word, byId: playerId, byName: by.name, voters, yes: [], no: [], endsAt: Date.now() + this.voteMs };
    this.timer.set(this.voteMs, () => this.resolveVote());
    this.ctx.changed();
    return { ok: true };
  }

  private castVote(playerId: string, yes: unknown): ActionResult {
    const v = this.vote;
    if (!v || !v.voters.includes(playerId)) return { ok: false, reason: 'not_voting' };
    if (typeof yes !== 'boolean') return { ok: false, reason: 'bad_action' };
    v.yes = v.yes.filter((id) => id !== playerId);
    v.no = v.no.filter((id) => id !== playerId);
    (yes ? v.yes : v.no).push(playerId);
    if (v.yes.length + v.no.length >= v.voters.length) this.resolveVote();
    else this.ctx.changed();
    return { ok: true };
  }

  /** Chốt phiếu: đồng ý nhiều hơn phản đối (người không bấm coi như bỏ phiếu trắng) */
  private resolveVote(): void {
    const v = this.vote;
    if (!v || this.over) return;
    this.vote = null;
    this.timer.clear();
    const approved = v.yes.length > v.no.length;
    this.push({ kind: 'vote', word: v.word, playerId: v.byId, name: v.byName, approved });
    if (approved && !this.used.has(v.word) && this.currentId === v.byId) {
      this.ctx.learnWord(v.word, v.byName);
      this.accept(v.byId, v.word);
      return;
    }
    this.resumeTurn();
  }

  private resumeTurn(): void {
    const left = Math.max(MIN_RESUME_MS, this.pausedLeft);
    this.turnEndsAt = Date.now() + left;
    this.timer.set(left, () => this.timeout());
    this.ctx.changed();
  }

  /** người bỏ phiếu rời đi / bị loại giữa chừng */
  private dropVoter(playerId: string): void {
    const v = this.vote;
    if (!v) return;
    if (v.byId === playerId) {
      this.vote = null;
      return;
    }
    v.voters = v.voters.filter((id) => id !== playerId);
    v.yes = v.yes.filter((id) => id !== playerId);
    v.no = v.no.filter((id) => id !== playerId);
    if (v.voters.length === 0 || v.yes.length + v.no.length >= v.voters.length) this.resolveVote();
  }

  /** Quyền cứu trợ: mỗi người 1 lần/ván, chỉ người hỏi mới thấy từ gợi ý */
  private hint(playerId: string): ActionResult {
    const p = this.find(playerId);
    if (!p || p.eliminated) return { ok: false, reason: 'not_playing' };
    if (playerId !== this.currentId) return { ok: false, reason: 'not_your_turn' };
    if (p.hintUsed) return { ok: false, reason: 'hint_used' };
    const options = this.dict.nextOptions(this.lastUnit(this.currentWord), this.used);
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
      // người xin duyệt luôn là người đang tới lượt, nên chỉ cần bỏ phiếu của người rời đi
      this.dropVoter(playerId);
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
      type: this.lang === 'en' ? 'wordchain_en' : 'wordchain',
      order: this.players.map((p) => p.id),
      eliminated: this.players.filter((p) => p.eliminated).map((p) => p.id),
      words: Object.fromEntries(this.players.map((p) => [p.id, p.words])),
      hintUsed: this.players.filter((p) => p.hintUsed).map((p) => p.id),
      currentWord: this.currentWord,
      currentDefinition: this.dict.definition(this.currentWord),
      currentPlayerId: this.over ? null : this.currentId,
      turnEndsAt: this.over ? null : this.turnEndsAt,
      turnSeconds: this.turnMs / 1000,
      nextCount: this.dict.countNext(this.lastUnit(this.currentWord), this.used),
      history: this.history.map((item) => 'word' in item ? { ...item, definition: this.dict.definition(item.word) } : item),
      totalWords: this.totalWords,
      vote: this.over ? null : this.vote,
    };
  }

  dispose(): void {
    this.timer.clear();
  }

  // ---------- nội bộ ----------

  private beginTurn(): void {
    this.appealedTurn = false;
    this.vote = null;
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
    if (this.dict.countNext(this.lastUnit(this.currentWord), this.used) === 0) {
      const fresh = this.dict.randomStart(this.used, this.ctx.rng);
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
        detail: `${p.words} từ${p.left ? ', đã thoát' : ''}`,
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
