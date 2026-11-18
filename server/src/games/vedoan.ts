import {
  BOT_SKETCHES,
  getBotSketch,
  VE_DOAN_COLORS,
  VE_DOAN_WIDTHS,
  VE_DOAN_WORDS,
  type VeDoanGuessEntry,
  type VeDoanPhase,
  type VeDoanStroke,
  type VeDoanView,
} from '../../../shared/src/vedoan';
import type { ActionResult, GameAction } from '../../../shared/src/types';
import { Timer, type EngineContext, type EnginePlayer, type GameEngine } from './engine';

const DEFAULT_SEC: Record<VeDoanPhase, number> = {
  pick_word: 10,
  drawing: 55,
  round_end: 4,
};

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

function normGuess(s: string): string {
  return s.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i - 1;
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[b.length];
}

export class VeDoanGame implements GameEngine {
  readonly perPlayerView = true;

  private order: string[] = [];
  private names = new Map<string, string>();
  private scores = new Map<string, number>();

  private totalTurns = 0;
  private turnIndex = 0;
  private round = 1;
  private phase: VeDoanPhase = 'pick_word';
  private phaseEndsAt: number | null = null;
  private phaseSeconds = DEFAULT_SEC.pick_word;
  private phaseStartedAt = 0;
  private phaseMs = DEFAULT_SEC.pick_word * 1000;

  private drawerId = '';
  private wordOptions: string[] = [];
  private secretWord = '';
  private revealedIdx = new Set<number>();
  private strokes: VeDoanStroke[] = [];
  private botTargetSketch: VeDoanStroke[] = [];
  private guessed = new Set<string>();
  private feed: VeDoanGuessEntry[] = [];
  private feedSeq = 0;
  private finished = false;

  private readonly timer = new Timer();
  private readonly botDrawTimer = new Timer();
  private hintTimers: ReturnType<typeof setTimeout>[] = [];

  constructor(private readonly ctx: EngineContext) {}

  private msFor(p: VeDoanPhase): number {
    const def = DEFAULT_SEC[p] * 1000;
    return this.ctx.turnMs ? Math.min(def, Math.max(300, this.ctx.turnMs)) : def;
  }

  private clearHints(): void {
    this.botDrawTimer.clear();
    for (const t of this.hintTimers) clearTimeout(t);
    this.hintTimers = [];
  }

  private shuffleArray<T>(items: readonly T[]): T[] {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      const raw = this.ctx.rng();
      const r = raw >= 1 ? 0.999999999 : raw < 0 ? 0 : raw;
      const j = Math.floor(r * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  private pickWordChoices(drawerIsBot: boolean): string[] {
    if (drawerIsBot) {
      const sketchPool = this.shuffleArray(Object.keys(BOT_SKETCHES));
      if (sketchPool.length >= 3) return sketchPool.slice(0, 3);
      const rest = this.shuffleArray(VE_DOAN_WORDS.filter((w) => !(w in BOT_SKETCHES)));
      return [...sketchPool, ...rest].slice(0, 3);
    }
    return this.shuffleArray(VE_DOAN_WORDS).slice(0, 3);
  }

  private botStrokeIntervalMs(): number {
    const count = Math.max(4, this.botTargetSketch.length + 2);
    if (this.ctx.turnMs) {
      return Math.max(35, Math.min(420, Math.floor(this.phaseMs / count)));
    }
    return 420;
  }

  private scheduleNextBotStroke(): void {
    this.botDrawTimer.clear();
    if (this.finished || this.phase !== 'drawing' || !this.ctx.isBot?.(this.drawerId)) return;
    if (this.strokes.length >= this.botTargetSketch.length || this.strokes.length >= 80) return;

    this.botDrawTimer.set(this.botStrokeIntervalMs(), () => {
      if (this.finished || this.phase !== 'drawing' || !this.ctx.isBot?.(this.drawerId)) return;
      const next = this.botTargetSketch[this.strokes.length];
      if (!next || this.strokes.length >= 80) return;
      if (!this.strokes.some((s) => this.isSameStroke(s, next))) {
        this.strokes.push(next);
      }
      this.scheduleNextBotStroke();
      this.ctx.changed();
    });
  }

  start(players: EnginePlayer[]): void {
    this.order = players.map((p) => p.id);
    for (const p of players) {
      this.names.set(p.id, p.name);
      this.scores.set(p.id, 0);
    }
    const rounds = Math.max(1, Math.min(3, this.ctx.settings.veDoanRounds ?? 2));
    this.totalTurns = Math.min(10, Math.max(2, this.order.length * rounds));
    this.turnIndex = 0;
    this.startTurn();
  }

  private enterPhase(phase: VeDoanPhase, onTimeout: () => void): void {
    if (this.finished) return;
    this.phase = phase;
    const ms = this.msFor(phase);
    this.phaseMs = ms;
    this.phaseSeconds = Math.max(1, Math.round(ms / 1000));
    this.phaseStartedAt = Date.now();
    this.phaseEndsAt = this.phaseStartedAt + ms;
    this.timer.set(ms, onTimeout);
  }

  private startTurn(): void {
    if (this.finished) return;
    this.clearHints();
    if (this.turnIndex >= this.totalTurns || this.order.length === 0) {
      this.finishAll();
      return;
    }
    this.round = Math.floor(this.turnIndex / this.order.length) + 1;
    this.drawerId = this.order[this.turnIndex % this.order.length];
    this.strokes = [];
    this.botTargetSketch = [];
    this.guessed.clear();
    this.revealedIdx.clear();
    this.secretWord = '';
    this.feed = [];

    const drawerIsBot = !!this.ctx.isBot?.(this.drawerId);
    this.wordOptions = this.pickWordChoices(drawerIsBot);

    this.enterPhase('pick_word', () => {
      this.beginDrawing(this.wordOptions[0] ?? 'mặt trời');
    });
    this.ctx.changed();
  }

  private beginDrawing(word: string): void {
    if (this.finished) return;
    this.clearHints();
    this.secretWord = word;
    this.revealedIdx.clear();
    this.strokes = [];
    this.botTargetSketch = getBotSketch(word).map((s) => this.sanitizeStroke(s));
    this.guessed.clear();
    this.enterPhase('drawing', () => this.endTurn());

    if (this.ctx.isBot?.(this.drawerId)) {
      this.scheduleNextBotStroke();
    }

    // Mở dần 2 ký tự gợi ý ở 40% và 72% thời gian vẽ
    const letterIndices = [...word].map((ch, idx) => (ch !== ' ' ? idx : -1)).filter((i) => i >= 0);
    if (letterIndices.length >= 3) {
      const revealOne = () => {
        if (this.finished || this.phase !== 'drawing') return;
        const hidden = letterIndices.filter((i) => !this.revealedIdx.has(i));
        if (hidden.length <= 1) return;
        const pick = hidden[Math.floor(this.ctx.rng() * hidden.length) % hidden.length];
        this.revealedIdx.add(pick);
        this.ctx.changed();
      };
      this.hintTimers.push(setTimeout(revealOne, Math.round(this.phaseMs * 0.4)));
      if (letterIndices.length >= 5) {
        this.hintTimers.push(setTimeout(revealOne, Math.round(this.phaseMs * 0.72)));
      }
    }
    this.ctx.changed();
  }

  private endTurn(): void {
    if (this.finished) return;
    this.clearHints();
    this.enterPhase('round_end', () => {
      this.turnIndex++;
      this.startTurn();
    });
    this.ctx.changed();
  }

  private finishAll(): void {
    if (this.finished) return;
    this.finished = true;
    this.timer.clear();
    this.clearHints();
    const sorted = [...this.order].sort((a, b) => (this.scores.get(b) ?? 0) - (this.scores.get(a) ?? 0));
    const maxScore = sorted.length ? (this.scores.get(sorted[0]) ?? 0) : 0;
    const winnerIds = sorted.filter((id) => (this.scores.get(id) ?? 0) === maxScore && maxScore > 0);
    const ranking = sorted.map((id) => ({
      playerId: id,
      name: this.names.get(id) ?? id,
      detail: `${(this.scores.get(id) ?? 0).toLocaleString('vi-VN')} điểm`,
    }));
    const headline = winnerIds.length
      ? `🎨 ${winnerIds.map((id) => this.names.get(id)).join(' & ')} vô địch Vẽ & Đoán với ${maxScore} điểm!`
      : '🎨 Kết thúc ván Vẽ & Đoán!';
    this.ctx.finish({
      winnerId: winnerIds[0] ?? sorted[0] ?? null,
      winnerIds: winnerIds.length ? winnerIds : (sorted[0] ? [sorted[0]] : []),
      ranking,
      headline,
    });
  }

  private buildMaskedWord(): string {
    if (!this.secretWord) return '';
    return [...this.secretWord]
      .map((ch, idx) => (ch === ' ' ? '  ' : this.revealedIdx.has(idx) ? ch.toUpperCase() : '_'))
      .join(' ');
  }

  private clampPt(v: number): number {
    return Math.max(0, Math.min(1000, Math.round(Number.isFinite(v) ? v : 0)));
  }

  private sanitizeStroke(raw: VeDoanStroke): VeDoanStroke {
    const color = (VE_DOAN_COLORS as readonly string[]).includes(raw.color) ? raw.color : '#111827';
    const width = (VE_DOAN_WIDTHS as readonly number[]).includes(raw.width) ? raw.width : 9;
    const points = raw.points.slice(0, 160).map(([x, y]): [number, number] => [this.clampPt(x), this.clampPt(y)]);
    return { color, width, points };
  }

  private isSameStroke(a: VeDoanStroke, b: VeDoanStroke): boolean {
    if (a.color !== b.color || a.width !== b.width || a.points.length !== b.points.length) return false;
    for (let i = 0; i < a.points.length; i++) {
      if (a.points[i][0] !== b.points[i][0] || a.points[i][1] !== b.points[i][1]) return false;
    }
    return true;
  }

  action(playerId: string, action: GameAction): ActionResult {
    if (this.finished) return { ok: false, reason: 'not_playing' };
    if (!this.order.includes(playerId)) return { ok: false, reason: 'bad_action' };

    if (action.type === 'vd_pick') {
      if (this.phase !== 'pick_word' || playerId !== this.drawerId) return { ok: false, reason: 'not_your_turn' };
      if (!this.wordOptions.includes(action.word)) return { ok: false, reason: 'bad_action' };
      this.timer.clear();
      this.beginDrawing(action.word);
      return { ok: true };
    }

    if (action.type === 'vd_stroke') {
      if (this.phase !== 'drawing' || playerId !== this.drawerId) return { ok: false, reason: 'not_your_turn' };
      if (this.strokes.length >= 80 || !action.stroke?.points?.length) return { ok: false, reason: 'bad_action' };
      const cleanStroke = this.sanitizeStroke(action.stroke);
      if (this.ctx.isBot?.(playerId) && this.strokes.some((s) => this.isSameStroke(s, cleanStroke))) {
        this.scheduleNextBotStroke();
        return { ok: true };
      }
      this.strokes.push(cleanStroke);
      if (this.ctx.isBot?.(playerId)) {
        this.scheduleNextBotStroke();
      }
      this.ctx.changed();
      return { ok: true };
    }

    if (action.type === 'vd_undo') {
      if (this.phase !== 'drawing' || playerId !== this.drawerId) return { ok: false, reason: 'not_your_turn' };
      if (this.strokes.length > 0) this.strokes.pop();
      this.ctx.changed();
      return { ok: true };
    }

    if (action.type === 'vd_clear') {
      if (this.phase !== 'drawing' || playerId !== this.drawerId) return { ok: false, reason: 'not_your_turn' };
      this.strokes = [];
      this.ctx.changed();
      return { ok: true };
    }

    if (action.type === 'vd_guess') {
      if (this.phase !== 'drawing' || playerId === this.drawerId || this.guessed.has(playerId)) {
        return { ok: false, reason: 'bad_action' };
      }
      const clean = normGuess(action.text).slice(0, 60);
      if (!clean) return { ok: false, reason: 'bad_action' };

      const target = normGuess(this.secretWord);
      const exact = clean === target;
      const noAccentExact = stripAccents(clean) === stripAccents(target);

      if (exact) {
        this.guessed.add(playerId);
        const remRatio = this.phaseEndsAt ? Math.max(0, Math.min(1, (this.phaseEndsAt - Date.now()) / this.phaseMs)) : 0;
        const firstBonus = this.guessed.size === 1 ? 30 : 0;
        const pts = 100 + Math.round(100 * remRatio) + firstBonus;
        this.scores.set(playerId, (this.scores.get(playerId) ?? 0) + pts);
        this.scores.set(this.drawerId, (this.scores.get(this.drawerId) ?? 0) + 45);
        this.feed.push({
          id: ++this.feedSeq,
          playerId,
          name: this.names.get(playerId) ?? playerId,
          text: `🎉 Đã đoán trúng! (+${pts} điểm)`,
          hit: true,
        });
        if (this.feed.length > 24) this.feed.shift();

        const guessersNeeded = this.order.filter((id) => id !== this.drawerId && (this.ctx.isBot?.(id) || this.ctx.isConnected(id)));
        if (guessersNeeded.length > 0 && guessersNeeded.every((id) => this.guessed.has(id))) {
          this.timer.clear();
          this.endTurn();
        } else {
          this.ctx.changed();
        }
        return { ok: true };
      }

      const close = noAccentExact || levenshtein(stripAccents(clean), stripAccents(target)) <= 1;
      this.feed.push({
        id: ++this.feedSeq,
        playerId,
        name: this.names.get(playerId) ?? playerId,
        // Nếu khớp sát không dấu thì tránh in nguyên chữ có dấu gần giống để giữ kịch tính
        text: noAccentExact ? '🔥 Suýt trúng rồi (kiểm tra lại dấu tiếng Việt)!' : clean,
        close,
      });
      if (this.feed.length > 24) this.feed.shift();
      this.ctx.changed();
      return { ok: true };
    }

    return { ok: false, reason: 'bad_action' };
  }

  removePlayer(playerId: string): void {
    if (this.finished) return;
    this.order = this.order.filter((id) => id !== playerId);
    if (this.order.length < 2) {
      this.finishAll();
      return;
    }
    if (playerId === this.drawerId) {
      this.timer.clear();
      this.clearHints();
      this.turnIndex++;
      this.startTurn();
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

  /**
   * Thuần khiết 100% (không biến đổi trạng thái nội bộ) để an toàn khi `Room.scheduleBots()`
   * gọi `botAction` cả lúc kiểm tra `.find()` lẫn bên trong `setTimeout`.
   */
  botAction(playerId: string): GameAction | null {
    if (this.finished) return null;
    if (this.phase === 'pick_word' && playerId === this.drawerId) {
      const sketchPick = this.wordOptions.find((w) => w in BOT_SKETCHES) ?? this.wordOptions[0];
      return sketchPick ? { type: 'vd_pick', word: sketchPick } : null;
    }
    if (this.phase === 'drawing') {
      if (playerId === this.drawerId) {
        const sketch = this.botTargetSketch.length > 0 ? this.botTargetSketch : getBotSketch(this.secretWord);
        if (this.strokes.length < sketch.length) {
          return { type: 'vd_stroke', stroke: sketch[this.strokes.length] };
        }
        return null;
      }
      if (!this.guessed.has(playerId) && this.strokes.length >= 1) {
        const elapsed = Date.now() - this.phaseStartedAt;
        if (elapsed >= this.phaseMs * 0.35) {
          const hitChance = elapsed >= this.phaseMs * 0.65 ? 0.62 : 0.38;
          if (this.ctx.rng() < hitChance) return { type: 'vd_guess', text: this.secretWord };
          const pool = VE_DOAN_WORDS.filter((w) => w !== this.secretWord);
          const wrong = pool[Math.floor(this.ctx.rng() * pool.length) % pool.length];
          if (wrong) return { type: 'vd_guess', text: wrong };
        }
      }
    }
    return null;
  }

  view(viewerId?: string): VeDoanView {
    const canSeeWord = this.phase === 'round_end' || (viewerId && viewerId === this.drawerId);
    return {
      type: 've_doan',
      round: this.round,
      totalTurns: this.totalTurns,
      turnIndex: this.turnIndex,
      phase: this.phase,
      phaseEndsAt: this.phaseEndsAt,
      phaseSeconds: this.phaseSeconds,
      drawerId: this.drawerId,
      order: [...this.order],
      names: Object.fromEntries(this.names),
      scores: Object.fromEntries(this.scores),
      strokes: [...this.strokes],
      maskedWord: this.buildMaskedWord(),
      wordLength: [...this.secretWord.replace(/\s+/g, '')].length,
      guessedIds: [...this.guessed],
      feed: [...this.feed],
      secretWord: canSeeWord ? this.secretWord : null,
      wordOptions: this.phase === 'pick_word' && viewerId === this.drawerId ? [...this.wordOptions] : undefined,
    };
  }

  dispose(): void {
    this.timer.clear();
    this.clearHints();
  }
}
