import {
  pickDoVuiQuestions,
  secondsForDoVuiLevel,
  type DoVuiPhase,
  type DoVuiQuestion,
  type DoVuiView,
} from '../../../shared/src/dovui';
import type { ActionResult, GameAction } from '../../../shared/src/types';
import { Timer, type EngineContext, type EnginePlayer, type GameEngine } from './engine';

const REVEAL_SEC = 5;

export class DoVuiGame implements GameEngine {
  readonly perPlayerView = true;

  private order: string[] = [];
  private names = new Map<string, string>();
  private scores = new Map<string, number>();
  private streaks = new Map<string, number>();

  private questions: DoVuiQuestion[] = [];
  private currentQ: DoVuiQuestion | null = null;
  private index = 0;
  private phase: DoVuiPhase = 'question';
  private phaseEndsAt: number | null = null;
  private phaseSeconds = 22;
  private phaseMs = 22_000;

  private answers = new Map<string, { choice: number; at: number }>();
  private finished = false;
  private readonly timer = new Timer();

  constructor(private readonly ctx: EngineContext) {}

  private shuffleQuestionOptions(q: DoVuiQuestion): DoVuiQuestion {
    const perm: [0 | 1 | 2 | 3, 0 | 1 | 2 | 3, 0 | 1 | 2 | 3, 0 | 1 | 2 | 3] = [0, 1, 2, 3];
    for (let i = perm.length - 1; i > 0; i--) {
      const raw = this.ctx.rng();
      const r = raw >= 1 ? 0.999999999 : raw < 0 ? 0 : raw;
      const j = Math.floor(r * (i + 1));
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    const options: [string, string, string, string] = [
      q.options[perm[0]],
      q.options[perm[1]],
      q.options[perm[2]],
      q.options[perm[3]],
    ];
    const correct = perm.indexOf(q.correct) as 0 | 1 | 2 | 3;
    return { ...q, options, correct };
  }

  private msFor(p: DoVuiPhase): number {
    if (p === 'reveal') {
      const def = REVEAL_SEC * 1000;
      return this.ctx.turnMs ? Math.min(def, Math.max(250, this.ctx.turnMs)) : def;
    }
    const q = this.currentQ ?? this.questions[this.index];
    const sec = q ? secondsForDoVuiLevel(q.difficulty) : 22;
    const def = sec * 1000;
    return this.ctx.turnMs ? Math.min(def, Math.max(250, this.ctx.turnMs)) : def;
  }

  start(players: EnginePlayer[]): void {
    this.order = players.map((p) => p.id);
    for (const p of players) {
      this.names.set(p.id, p.name);
      this.scores.set(p.id, 0);
      this.streaks.set(p.id, 0);
    }
    const total = this.ctx.settings.doVuiQuestions ?? 10;
    this.questions = pickDoVuiQuestions(
      this.ctx.rng,
      total,
      this.ctx.settings.doVuiTopic ?? 'all',
      this.ctx.settings.doVuiDifficulty ?? 'mixed',
    );
    this.index = 0;
    this.currentQ = null;
    this.startQuestion();
  }

  private enterPhase(phase: DoVuiPhase, onTimeout: () => void): void {
    if (this.finished) return;
    this.phase = phase;
    const ms = this.msFor(phase);
    this.phaseMs = ms;
    this.phaseSeconds = Math.max(1, Math.round(ms / 1000));
    this.phaseEndsAt = Date.now() + ms;
    this.timer.set(ms, onTimeout);
  }

  private startQuestion(): void {
    if (this.finished) return;
    if (this.index >= this.questions.length) {
      this.finishAll();
      return;
    }
    const shuffled = this.shuffleQuestionOptions(this.questions[this.index]);
    this.questions[this.index] = shuffled;
    this.currentQ = shuffled;
    this.answers.clear();
    this.enterPhase('question', () => this.enterReveal());
    this.ctx.changed();
  }

  private enterReveal(): void {
    if (this.finished) return;
    const q = this.currentQ ?? this.questions[this.index];
    const x2 = this.index >= Math.max(1, this.questions.length - 2);
    const endsAt = this.phaseEndsAt ?? Date.now();

    for (const id of this.order) {
      const ans = this.answers.get(id);
      if (ans && ans.choice === q.correct) {
        const nextStreak = (this.streaks.get(id) ?? 0) + 1;
        this.streaks.set(id, nextStreak);
        const remRatio = Math.max(0, Math.min(1, (endsAt - ans.at) / this.phaseMs));
        const streakBonus = Math.min(300, (nextStreak - 1) * 100);
        const pts = (500 + Math.round(500 * remRatio) + streakBonus) * (x2 ? 2 : 1);
        this.scores.set(id, (this.scores.get(id) ?? 0) + pts);
      } else {
        this.streaks.set(id, 0);
      }
    }

    this.enterPhase('reveal', () => {
      this.index++;
      this.startQuestion();
    });
    this.ctx.changed();
  }

  private finishAll(): void {
    if (this.finished) return;
    this.finished = true;
    this.timer.clear();
    const sorted = [...this.order].sort((a, b) => (this.scores.get(b) ?? 0) - (this.scores.get(a) ?? 0));
    const maxScore = sorted.length ? (this.scores.get(sorted[0]) ?? 0) : 0;
    const winnerIds = sorted.filter((id) => (this.scores.get(id) ?? 0) === maxScore);
    const ranking = sorted.map((id) => ({
      playerId: id,
      name: this.names.get(id) ?? id,
      detail: `${(this.scores.get(id) ?? 0).toLocaleString('vi-VN')} điểm`,
    }));
    this.ctx.finish({
      winnerId: winnerIds[0] ?? null,
      winnerIds,
      ranking,
      headline: winnerIds.length
        ? `🧠 ${winnerIds.map((id) => this.names.get(id)).join(' & ')} vô địch Đấu Trường Đố Vui (${maxScore.toLocaleString('vi-VN')}đ)!`
        : '🧠 Kết thúc Đấu Trường Đố Vui!',
    });
  }

  action(playerId: string, action: GameAction): ActionResult {
    if (this.finished) return { ok: false, reason: 'not_playing' };
    if (action.type !== 'dv_answer') return { ok: false, reason: 'bad_action' };
    if (this.phase !== 'question') return { ok: false, reason: 'not_your_turn' };
    if (!this.order.includes(playerId) || this.answers.has(playerId)) return { ok: false, reason: 'bad_action' };
    if (!Number.isInteger(action.choice) || action.choice < 0 || action.choice > 3) return { ok: false, reason: 'bad_action' };

    this.answers.set(playerId, { choice: action.choice, at: Date.now() });
    const connected = this.order.filter((id) => this.ctx.isBot?.(id) || this.ctx.isConnected(id));
    if (connected.every((id) => this.answers.has(id))) {
      this.timer.clear();
      this.enterReveal();
    } else {
      this.ctx.changed();
    }
    return { ok: true };
  }

  removePlayer(playerId: string): void {
    if (this.finished) return;
    this.order = this.order.filter((id) => id !== playerId);
    if (this.order.length === 0) this.finishAll();
    else this.ctx.changed();
  }

  onPlayerConnection(_playerId: string, connected: boolean): void {
    if (!this.finished && connected) this.ctx.changed();
  }

  renamePlayer(playerId: string, name: string): void {
    if (this.names.has(playerId)) this.names.set(playerId, name);
  }

  botAction(playerId: string): GameAction | null {
    if (this.finished || this.phase !== 'question' || this.answers.has(playerId)) return null;
    const q = this.currentQ ?? this.questions[this.index];
    if (!q) return null;
    // 65% chọn đáp án đúng, 35% chọn ngẫu nhiên để đua điểm vui vẻ
    const choice = this.ctx.rng() < 0.65 ? q.correct : Math.floor(this.ctx.rng() * 4) % 4;
    return { type: 'dv_answer', choice: choice as 0 | 1 | 2 | 3 };
  }

  view(viewerId?: string): DoVuiView {
    const q = this.currentQ ?? this.questions[Math.min(this.index, Math.max(0, this.questions.length - 1))];
    const doublePoints = this.index >= Math.max(1, this.questions.length - 2);
    const isReveal = this.phase === 'reveal';
    const picks = isReveal
      ? Object.fromEntries([...this.answers.entries()].map(([id, a]) => [id, a.choice]))
      : null;

    return {
      type: 'do_vui',
      index: Math.min(this.index + 1, this.questions.length),
      total: this.questions.length,
      phase: this.phase,
      phaseEndsAt: this.phaseEndsAt,
      phaseSeconds: this.phaseSeconds,
      category: q?.category ?? '',
      selectedTopic: this.ctx.settings.doVuiTopic ?? 'all',
      selectedDifficulty: this.ctx.settings.doVuiDifficulty ?? 'mixed',
      difficulty: q?.difficulty,
      question: q?.q ?? '',
      options: q ? ([...q.options] as [string, string, string, string]) : ['', '', '', ''],
      doublePoints,
      order: [...this.order],
      names: Object.fromEntries(this.names),
      scores: Object.fromEntries(this.scores),
      streaks: Object.fromEntries(this.streaks),
      answeredIds: [...this.answers.keys()],
      myAnswer: viewerId ? (this.answers.get(viewerId)?.choice ?? null) : null,
      ...(isReveal && q ? { correctIndex: q.correct, explain: q.explain, picks } : {}),
    };
  }

  dispose(): void {
    this.timer.clear();
  }
}
