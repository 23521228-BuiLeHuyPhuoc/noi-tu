import { toSyllables, firstSyllable, lastSyllable } from '../../../shared/src/vi';
import { enCandidates, firstLetter, hasVietMarks, lastLetter } from '../../../shared/src/en';
import {
  DISRUPT_MAX_BONUS_MS, TURN_SECONDS, VOTE_SECONDS, WORD_SYLLABLES, enTurnMs, hintAllowance,
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
  /** tổng số từ đã nối (kể cả từ nhờ cứu trợ) */
  words: number;
  /** số từ tự nối đúng (gõ hoặc được cả phòng duyệt): tính thời gian lượt và thưởng cứu trợ */
  correct: number;
  hintsUsed: number;
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
  /** độ dài lượt hiện tại (ms) */
  private turnLenMs = 0;
  /** đã bù bao nhiêu ms cho người đang tới lượt vì bị chọc */
  private bonusMs = 0;

  constructor(private readonly ctx: EngineContext, private readonly lang: DictLang = 'vi') {
    this.dict = lang === 'en' ? (ctx.dict.en ?? ctx.dict) : ctx.dict;
    this.turnMs = ctx.turnMs ?? TURN_SECONDS * 1000;
    this.voteMs = Math.min(VOTE_SECONDS * 1000, this.turnMs);
  }

  private lastUnit(word: string): string {
    return this.lang === 'en' ? lastLetter(word) : lastSyllable(word);
  }

  start(players: EnginePlayer[]): void {
    this.players = players.map((p) => ({ ...p, eliminated: false, left: false, words: 0, correct: 0, hintsUsed: 0 }));
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
      if (a.type === 'appeal') return { ok: false, reason: 'cannot_appeal' };
      // từ chưa có trong kho: báo lại đúng từ server đã hiểu để app xin duyệt đúng từ đó
      return checked.reason === 'not_in_dictionary' ? { ok: false, reason: checked.reason, word: checked.word } : { ok: false, reason: checked.reason };
    }
    if (a.type === 'appeal') return { ok: false, reason: 'cannot_appeal' };
    this.accept(playerId, checked, true);
    return { ok: true };
  }

  /** Kiểm tra từ gửi lên: trả về từ đã chuẩn hóa nếu hợp lệ */
  private check(raw: unknown): string | { reason: ActionError; word: string } {
    if (typeof raw !== 'string' || raw.length > 60) return { reason: 'format', word: '' };
    if (this.lang === 'en') return this.checkEn(raw);
    const syl = toSyllables(raw);
    if (!syl || syl.length !== WORD_SYLLABLES) return { reason: 'format', word: '' };
    const word = syl.join(' ');
    if (firstSyllable(word) !== lastSyllable(this.currentWord)) return { reason: 'chain', word };
    if (this.used.has(word)) return { reason: 'used', word };
    if (!this.dict.has(word)) return { reason: 'not_in_dictionary', word };
    return word;
  }

  /**
   * Nối từ tiếng Anh. App luôn gửi "chữ đầu đã khóa + phần người chơi gõ", nên nếu người chơi lỡ gõ cả từ
   * thì chữ đầu bị lặp (xxmas): từ không có trong từ điển mà mở đầu bằng 2 chữ đó thì bỏ bớt 1 chữ.
   * Chuỗi bị bộ gõ tiếng Việt thêm dấu (Telex: xmas -> xmá) được dịch ngược rồi thử từng cách.
   */
  private checkEn(raw: string): string | { reason: ActionError; word: string } {
    const need = lastLetter(this.currentWord);
    const cands = enCandidates(raw);
    if (cands.length === 0) return { reason: 'format', word: '' };
    const resolve = (w: string) => (!this.dict.has(w) && w.length >= 3 && w.startsWith(need + need) ? w.slice(1) : w);
    const resolved = [...new Set(cands.map(resolve))];
    const chained = resolved.filter((w) => firstLetter(w) === need);
    const ok = chained.find((w) => this.dict.has(w) && !this.used.has(w));
    if (ok) return ok;
    if (chained.length === 0) return { reason: 'chain', word: resolved[0] };
    const used = chained.find((w) => this.used.has(w));
    if (used) return { reason: 'used', word: used };
    // có dấu tiếng Việt mà không đoán ra từ nào: nhắc tắt bộ gõ thay vì cho xin duyệt một chuỗi lạ
    if (hasVietMarks(raw)) return { reason: 'vi_keyboard', word: '' };
    return { reason: 'not_in_dictionary', word: chained[0] };
  }

  private accept(playerId: string, word: string, own: boolean): void {
    const p = this.find(playerId)!;
    p.words++;
    if (own) p.correct++;
    this.totalWords++;
    this.used.add(word);
    this.currentWord = word;
    this.push({ kind: 'word', word, playerId, name: p.name, ...(own ? {} : { hint: true }) });
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
      this.accept(v.byId, v.word, true);
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

  private hintsLeft(p: WPlayer): number {
    return Math.max(0, hintAllowance(this.lang, p.correct) - p.hintsUsed);
  }

  /**
   * Quyền cứu trợ: mỗi người 1 lần/ván (Nối từ Anh: thêm 1 lần sau mỗi 30 từ tự nối đúng).
   * Server chọn một từ hợp lệ và nối luôn cho người chơi (không cần điền rồi bấm Gửi).
   */
  private hint(playerId: string): ActionResult {
    const p = this.find(playerId);
    if (!p || p.eliminated) return { ok: false, reason: 'not_playing' };
    if (playerId !== this.currentId) return { ok: false, reason: 'not_your_turn' };
    if (this.turnEndsAt !== null && Date.now() >= this.turnEndsAt) {
      this.timeout();
      return { ok: false, reason: 'timeout' };
    }
    if (this.hintsLeft(p) <= 0) return { ok: false, reason: 'hint_used' };
    const options = this.dict.hintOptions(this.lastUnit(this.currentWord), this.used);
    if (options.length === 0) return { ok: false, reason: 'no_hint' };
    const word = options[Math.floor(this.ctx.rng() * options.length)];
    p.hintsUsed++;
    this.push({ kind: 'hint', playerId, name: p.name });
    this.accept(playerId, word, false);
    return { ok: true, hint: word };
  }

  /**
   * Người chơi dính chiêu làm rung/che màn hình: nếu đang tới lượt thì bù lại thời gian đã mất.
   * Trả về số ms thực sự được bù (0 nếu không bù).
   */
  disrupt(playerId: string, ms: number): number {
    if (this.over || this.vote || playerId !== this.currentId || this.turnEndsAt === null) return 0;
    const add = Math.max(0, Math.min(ms, DISRUPT_MAX_BONUS_MS - this.bonusMs));
    if (add <= 0) return 0;
    const left = this.turnEndsAt - Date.now();
    if (left <= 0) return 0;
    this.bonusMs += add;
    this.turnEndsAt += add;
    this.timer.set(left + add, () => this.timeout());
    this.ctx.changed();
    return add;
  }

  /** người chơi đổi tên giữa ván */
  renamePlayer(playerId: string, name: string): void {
    const p = this.find(playerId);
    if (p) p.name = name;
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
      hintUsed: this.players.filter((p) => this.hintsLeft(p) <= 0).map((p) => p.id),
      hintsLeft: Object.fromEntries(this.players.map((p) => [p.id, this.hintsLeft(p)])),
      correct: Object.fromEntries(this.players.map((p) => [p.id, p.correct])),
      currentWord: this.currentWord,
      currentDefinition: this.dict.definition(this.currentWord),
      currentPlayerId: this.over ? null : this.currentId,
      turnEndsAt: this.over ? null : this.turnEndsAt,
      turnSeconds: (this.turnLenMs || this.turnMs) / 1000,
      turnBonusMs: this.over ? 0 : this.bonusMs,
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

  /** độ dài lượt của một người: Nối từ Anh giảm dần 30s -> 15s theo số từ tự nối đúng */
  private turnLengthFor(id: string | null): number {
    const p = id ? this.find(id) : undefined;
    return this.lang === 'en' && p ? enTurnMs(this.turnMs, p.correct) : this.turnMs;
  }

  private beginTurn(): void {
    this.appealedTurn = false;
    this.vote = null;
    this.bonusMs = 0;
    this.turnLenMs = this.turnLengthFor(this.currentId);
    this.turnEndsAt = Date.now() + this.turnLenMs;
    this.timer.set(this.turnLenMs, () => this.timeout());
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
