import {
  BOT_SKETCHES,
  computeFloodFillPath,
  getBotSketch,
  matchVeDoanGuess,
  VE_DOAN_COLORS,
  VE_DOAN_TOOLS,
  VE_DOAN_WIDTHS,
  VE_DOAN_WORDS,
  type VeDoanGuessEntry,
  type VeDoanPhase,
  type VeDoanStroke,
  type VeDoanTool,
  type VeDoanView,
} from '../../../shared/src/vedoan';
import type { ActionResult, GameAction } from '../../../shared/src/types';
import { Timer, type EngineContext, type EnginePlayer, type GameEngine } from './engine';

const DEFAULT_SEC: Record<VeDoanPhase, number> = {
  pick_word: 10,
  drawing: 55,
  round_end: 4,
};

function normGuess(s: string): string {
  return s.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
}

function shuffleWithMathRng<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

let liveBotWordBag: string[] = [];
let liveHumanWordBag: string[] = [];

function drawLiveWords(pool: readonly string[], bagRef: 'bot' | 'human', exclude: Set<string>, count: number): string[] {
  const bag = bagRef === 'bot' ? liveBotWordBag : liveHumanWordBag;
  const out: string[] = [];
  let guard = 0;
  while (out.length < count && guard++ < pool.length * 2 + 10) {
    if (bag.length === 0) {
      const fresh = shuffleWithMathRng(pool);
      bag.push(...fresh);
    }
    const candidate = bag.shift();
    if (!candidate) continue;
    if (!exclude.has(candidate) && !out.includes(candidate)) {
      out.push(candidate);
    }
  }
  if (out.length < count) {
    for (const w of shuffleWithMathRng(pool)) {
      if (!out.includes(w)) {
        out.push(w);
        if (out.length >= count) break;
      }
    }
  }
  return out;
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
  private usedWords = new Set<string>();
  private offeredWords = new Set<string>();
  private revealedIdx = new Set<number>();
  private strokes: VeDoanStroke[] = [];
  private strokeSeq = 0;
  private undoStack: VeDoanStroke[][] = [];
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
    const skip = new Set([...this.usedWords, ...this.offeredWords]);
    const record = (choices: string[]) => {
      for (const w of choices) this.offeredWords.add(w);
      return choices;
    };

    if (drawerIsBot) {
      const allBot = Object.keys(BOT_SKETCHES);
      if (this.ctx.rng === Math.random) {
        const picked = drawLiveWords(allBot, 'bot', skip, 3);
        if (picked.length >= 3) return record(picked);
      }
      const freshBot = allBot.filter((w) => !skip.has(w));
      const fallbackBot = freshBot.length >= 3 ? freshBot : allBot.filter((w) => !this.usedWords.has(w));
      const sketchPool = this.shuffleArray(fallbackBot.length >= 3 ? fallbackBot : allBot);
      if (sketchPool.length >= 3) return record(sketchPool.slice(0, 3));
      const rest = this.shuffleArray(VE_DOAN_WORDS.filter((w) => !(w in BOT_SKETCHES) && !skip.has(w)));
      return record([...sketchPool, ...rest].slice(0, 3));
    }

    if (this.ctx.rng === Math.random) {
      return record(drawLiveWords(VE_DOAN_WORDS, 'human', skip, 3));
    }

    let fresh = VE_DOAN_WORDS.filter((w) => !skip.has(w));
    if (fresh.length < 3) {
      this.offeredWords.clear();
      fresh = VE_DOAN_WORDS.filter((w) => !this.usedWords.has(w));
    }
    if (fresh.length >= 3) return record(this.shuffleArray(fresh).slice(0, 3));
    this.usedWords.clear();
    return record(this.shuffleArray(VE_DOAN_WORDS).slice(0, 3));
  }

  private botStrokeIntervalMs(): number {
    const count = Math.max(4, this.botTargetSketch.length + 2);
    if (this.ctx.turnMs) {
      return Math.max(35, Math.min(420, Math.floor(this.phaseMs / count)));
    }
    return 420;
  }

  private pushUndo(): void {
    this.undoStack.push([...this.strokes]);
    if (this.undoStack.length > 40) this.undoStack.shift();
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
        this.strokes.push({ ...next, id: ++this.strokeSeq });
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
    const rounds = Math.max(1, Math.min(6, this.ctx.settings.veDoanRounds ?? 4));
    this.totalTurns = Math.min(24, Math.max(2, this.order.length * rounds));
    this.turnIndex = 0;
    this.usedWords.clear();
    this.offeredWords.clear();
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
    this.strokeSeq = 0;
    this.undoStack = [];
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
    this.usedWords.add(word);
    this.revealedIdx.clear();
    this.strokes = [];
    this.strokeSeq = 0;
    this.undoStack = [];
    this.botTargetSketch = getBotSketch(word).map((s) => this.sanitizeStroke(s, [], false));
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

  private buildMaskedWords(): string[] {
    if (!this.secretWord) return [];
    const chars = [...this.secretWord];
    const out: string[] = [];
    let cur: string[] = [];
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      if (ch === ' ') {
        if (cur.length > 0) {
          out.push(cur.join(' '));
          cur = [];
        }
      } else {
        cur.push(this.revealedIdx.has(i) ? ch.toUpperCase() : '_');
      }
    }
    if (cur.length > 0) out.push(cur.join(' '));
    return out;
  }

  private buildMaskedWord(): string {
    return this.buildMaskedWords().join('\u00A0\u00A0\u00A0');
  }

  private clampPt(v: number): number {
    return Math.max(0, Math.min(1000, Math.round(Number.isFinite(v) ? v : 0)));
  }

  private sanitizeStroke(
    raw: VeDoanStroke,
    existingStrokes: readonly VeDoanStroke[] = [],
    assignId = true,
  ): VeDoanStroke {
    const tool: VeDoanTool =
      raw.tool && (VE_DOAN_TOOLS as readonly string[]).includes(raw.tool) ? raw.tool : 'pen';
    const color = tool === 'eraser'
      ? '#FFFFFF'
      : (VE_DOAN_COLORS as readonly string[]).includes(raw.color)
        ? raw.color
        : '#111827';
    const allowedWidths = tool === 'eraser' ? [12, 22, 34] : VE_DOAN_WIDTHS;
    const fallbackWidth = tool === 'eraser' ? 22 : 9;
    const width = (allowedWidths as readonly number[]).includes(raw.width) || (VE_DOAN_WIDTHS as readonly number[]).includes(raw.width)
      ? raw.width
      : fallbackWidth;
    const points = raw.points.slice(0, 160).map(([x, y]): [number, number] => [this.clampPt(x), this.clampPt(y)]);
    const idPatch = assignId ? { id: ++this.strokeSeq } : {};
    if (tool === 'fill' && points.length > 0) {
      const fillPath = computeFloodFillPath(existingStrokes, points[0][0], points[0][1]);
      return { ...idPatch, tool, color, width, points: [points[0]], ...(fillPath ? { fillPath } : {}) };
    }
    if (tool === 'spray') {
      const seed = Number.isFinite(raw.seed)
        ? Math.max(0, Math.min(999_999, Math.round(raw.seed!)))
        : Math.floor(this.ctx.rng() * 1_000_000);
      return { ...idPatch, tool, color, width, points, seed };
    }
    return { ...idPatch, ...(tool !== 'pen' ? { tool } : {}), color, width, points };
  }

  private isSameStroke(a: VeDoanStroke, b: VeDoanStroke): boolean {
    if ((a.tool ?? 'pen') !== (b.tool ?? 'pen') || a.color !== b.color || a.width !== b.width || a.points.length !== b.points.length) return false;
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
      if (this.strokes.length >= 160 || !action.stroke?.points?.length) return { ok: false, reason: 'bad_action' };
      const cleanStroke = this.sanitizeStroke(action.stroke, this.strokes);
      if (cleanStroke.tool === 'fill' && !cleanStroke.fillPath) {
        return { ok: true };
      }
      if (this.ctx.isBot?.(playerId) && this.strokes.some((s) => this.isSameStroke(s, cleanStroke))) {
        this.scheduleNextBotStroke();
        return { ok: true };
      }
      this.pushUndo();
      this.strokes.push(cleanStroke);
      if (this.ctx.isBot?.(playerId)) {
        this.scheduleNextBotStroke();
      }
      this.ctx.changed();
      return { ok: true };
    }

    if (action.type === 'vd_erase_stroke') {
      if (this.phase !== 'drawing' || playerId !== this.drawerId) return { ok: false, reason: 'not_your_turn' };
      if (!Array.isArray(action.strokeIds) || action.strokeIds.length === 0) return { ok: false, reason: 'bad_action' };
      const killSet = new Set(action.strokeIds.filter((n) => Number.isInteger(n)));
      if (killSet.size === 0) return { ok: false, reason: 'bad_action' };
      const next = this.strokes.filter((s) => s.id === undefined || !killSet.has(s.id));
      if (next.length !== this.strokes.length) {
        this.pushUndo();
        this.strokes = next;
        this.ctx.changed();
      }
      return { ok: true };
    }

    if (action.type === 'vd_undo') {
      if (this.phase !== 'drawing' || playerId !== this.drawerId) return { ok: false, reason: 'not_your_turn' };
      if (this.undoStack.length > 0) {
        this.strokes = this.undoStack.pop()!;
        this.ctx.changed();
      } else if (this.strokes.length > 0) {
        this.strokes.pop();
        this.ctx.changed();
      }
      return { ok: true };
    }

    if (action.type === 'vd_clear') {
      if (this.phase !== 'drawing' || playerId !== this.drawerId) return { ok: false, reason: 'not_your_turn' };
      if (this.strokes.length > 0) {
        this.pushUndo();
        this.strokes = [];
        this.ctx.changed();
      }
      return { ok: true };
    }

    if (action.type === 'vd_guess') {
      if (this.phase !== 'drawing' || playerId === this.drawerId || this.guessed.has(playerId)) {
        return { ok: false, reason: 'bad_action' };
      }
      const clean = normGuess(action.text).slice(0, 60);
      if (!clean) return { ok: false, reason: 'bad_action' };

      const match = matchVeDoanGuess(clean, this.secretWord);

      if (match.hit) {
        this.guessed.add(playerId);
        const remRatio = this.phaseEndsAt ? Math.max(0, Math.min(1, (this.phaseEndsAt - Date.now()) / this.phaseMs)) : 0;
        const hitRank = this.guessed.size;
        const hintPenalty = Math.min(35, this.revealedIdx.size * 12);

        // Tính điểm người đoán: thưởng tốc độ & thứ tự đoán trúng
        const baseGuesser = hitRank === 1 ? 115 : hitRank === 2 ? 100 : 85;
        const speedGuesser = Math.round((hitRank === 1 ? 85 : hitRank === 2 ? 70 : 55) * remRatio);
        const pts = Math.max(70, baseGuesser + speedGuesser - hintPenalty);
        this.scores.set(playerId, (this.scores.get(playerId) ?? 0) + pts);

        // Luật điểm công bằng cho Họa sĩ: vẽ đẹp & dễ hiểu -> người khác đoán ra sớm = thưởng cao xứng đáng!
        const guessersNeeded = this.order.filter((id) => id !== this.drawerId && (this.ctx.isBot?.(id) || this.ctx.isConnected(id)));
        const allGuessed = guessersNeeded.length > 0 && guessersNeeded.every((id) => this.guessed.has(id));
        const baseDrawer = hitRank === 1 ? 85 + Math.round(65 * remRatio) : 35;
        const sweepBonus = allGuessed ? 35 : 0;
        const drawerDelta = baseDrawer + sweepBonus;
        this.scores.set(this.drawerId, (this.scores.get(this.drawerId) ?? 0) + drawerDelta);

        this.feed.push({
          id: ++this.feedSeq,
          playerId,
          name: this.names.get(playerId) ?? playerId,
          text: `🎉 Đã đoán trúng! (+${pts}đ · 🎨 Họa sĩ +${drawerDelta}đ${allGuessed ? ' · Cả phòng hiểu!' : ''})`,
          hit: true,
        });
        if (this.feed.length > 24) this.feed.shift();

        if (allGuessed) {
          this.timer.clear();
          this.endTurn();
        } else {
          this.ctx.changed();
        }
        return { ok: true };
      }

      this.feed.push({
        id: ++this.feedSeq,
        playerId,
        name: this.names.get(playerId) ?? playerId,
        // Nếu khớp sát không dấu thì tránh in nguyên chữ có dấu gần giống để giữ kịch tính
        text: match.accentHint ? '🔥 Suýt trúng rồi (kiểm tra lại dấu tiếng Việt)!' : clean,
        close: match.close,
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
      maskedWords: this.buildMaskedWords(),
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
