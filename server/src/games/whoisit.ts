/**
 * Server Engine: Đoán Ai Đây? — Who Is It? HopKids (`who_is_it`, 2–12 người chia 2 đội Đỏ/Xanh).
 * - Tôn trọng chọn đội từ phòng chờ (ai bấm sớm vào trước).
 * - Số nhân vật co giãn theo số người: 30 -> 36 -> 42 -> 48 -> 54 thẻ, sinh mới mỗi ván theo 1 trong 7 bộ nét vẽ.
 * - Nhịp đấu rõ ràng: pick_secret -> turn_beat (giới thiệu lượt) -> ask -> (answer_free) -> reveal -> review -> turn_beat...
 * - Tự động úp ngay các thẻ không khớp khi hỏi câu đặc điểm (không bao giờ mất lượt úp).
 * - Kênh thảo luận riêng của từng đội & đồng bộ `oppFlipped` không lộ thẻ bí mật (`perPlayerView = true`).
 */
import {
  generateWhoIsItBoard,
  matchWhoIsItTrait,
  pickWhoIsItArtPack,
  WHO_IS_IT_MAX_LIVES,
  WHO_IS_IT_TRAIT_MAP,
  whoIsItBoardSize,
  whoIsItTraitsForPack,
  type WhoIsItArtPackId,
  type WhoIsItCharacter,
  type WhoIsItDifficulty,
  type WhoIsItPhase,
  type WhoIsItQA,
  type WhoIsItTeam,
  type WhoIsItTeamMsg,
  type WhoIsItTraitDef,
  type WhoIsItView,
} from '../../../shared/src/whoisit';
import type { ActionResult, GameAction, RankEntry } from '../../../shared/src/types';
import { Timer, type EngineContext, type EnginePlayer, type GameEngine } from './engine';

const PICK_SECRET_MS = 22_000;
const TURN_BEAT_MS = 3_400;
const ASK_MS = 40_000;
const ANSWER_FREE_MS = 25_000;
const REVEAL_MS = 5_200;
const REVIEW_TRAIT_MS = 9_000;
const REVIEW_FREE_MS = 18_000;

type WhoIsItSettingsCompat = { whoIsItDifficulty?: WhoIsItDifficulty };

export class WhoIsItGame implements GameEngine {
  readonly perPlayerView = true;

  private readonly difficulty: WhoIsItDifficulty;
  private readonly timer = new Timer();

  private order: string[] = [];
  private names = new Map<string, string>();
  private teams: Record<WhoIsItTeam, string[]> = { red: [], blue: [] };

  private artPack: WhoIsItArtPackId = 'avataaars';
  private availableTraits: WhoIsItTraitDef[] = [];
  private availableTraitKeys: string[] = [];
  private availableTraitKeySet = new Set<string>();
  private board: WhoIsItCharacter[] = [];
  private boardMap = new Map<string, WhoIsItCharacter>();
  private boardIds = new Set<string>();

  private secrets: Partial<Record<WhoIsItTeam, string>> = {};
  private secretReady: Record<WhoIsItTeam, boolean> = { red: false, blue: false };
  private flipped: Record<WhoIsItTeam, Set<string>> = { red: new Set(), blue: new Set() };
  private lastFlippedIds: string[] = [];
  private lastFlippedTeam: WhoIsItTeam | null = null;
  private turnNote: 'timeout' | null = null;
  private lives: Record<WhoIsItTeam, number> = { red: WHO_IS_IT_MAX_LIVES, blue: WHO_IS_IT_MAX_LIVES };
  private askedTraits: Record<WhoIsItTeam, Set<string>> = { red: new Set(), blue: new Set() };

  private phase: WhoIsItPhase = 'pick_secret';
  private phaseEndsAt: number | null = null;
  private phaseSeconds = 22;

  private turnTeam: WhoIsItTeam = 'red';
  private turnCursor: Record<WhoIsItTeam, number> = { red: 0, blue: 0 };
  private activePlayerId: string | null = null;
  private roundCount = 0;

  private qaSeq = 0;
  private history: WhoIsItQA[] = [];
  private lastQA: WhoIsItQA | null = null;
  private pendingQuestion: { id: number; askedByTeam: WhoIsItTeam; askedById: string; askedByName: string; text: string } | null = null;

  private chatSeq = 0;
  private teamChat: Record<WhoIsItTeam, WhoIsItTeamMsg[]> = { red: [], blue: [] };
  private finished = false;

  constructor(private readonly ctx: EngineContext) {
    const raw = (ctx.settings as WhoIsItSettingsCompat).whoIsItDifficulty;
    this.difficulty = raw === 'large' ? 'large' : 'auto';
  }

  private scaleMs(baseMs: number): number {
    if (!this.ctx.turnMs) return baseMs;
    return Math.min(baseMs, Math.max(55, Math.floor((this.ctx.turnMs * baseMs) / 40_000)));
  }

  private otherTeam(team: WhoIsItTeam): WhoIsItTeam {
    return team === 'red' ? 'blue' : 'red';
  }

  private teamOf(playerId: string): WhoIsItTeam | null {
    if (this.teams.red.includes(playerId)) return 'red';
    if (this.teams.blue.includes(playerId)) return 'blue';
    return null;
  }

  private pickTeamMember(team: WhoIsItTeam, cursor: number): string | null {
    const arr = this.teams[team];
    if (arr.length === 0) return null;
    for (let offset = 0; offset < arr.length; offset++) {
      const cand = arr[(cursor + offset) % arr.length];
      if (this.ctx.isConnected(cand)) return cand;
    }
    return arr[cursor % arr.length] ?? null;
  }

  start(players: EnginePlayer[]): void {
    this.order = players.map((p) => p.id);
    this.teams = { red: [], blue: [] };
    const cap = Math.ceil(Math.max(2, players.length) / 2);
    const unassigned: EnginePlayer[] = [];

    for (const p of players) {
      this.names.set(p.id, p.name);
      if (p.team && this.teams[p.team].length < cap) {
        this.teams[p.team].push(p.id);
      } else {
        unassigned.push(p);
      }
    }
    for (const p of unassigned) {
      const target: WhoIsItTeam = this.teams.red.length <= this.teams.blue.length ? 'red' : 'blue';
      this.teams[target].push(p.id);
    }

    this.artPack = pickWhoIsItArtPack(this.ctx.rng);
    this.availableTraits = whoIsItTraitsForPack(this.artPack);
    this.availableTraitKeys = this.availableTraits.map((t) => t.key);
    this.availableTraitKeySet = new Set(this.availableTraitKeys);

    const boardSize = whoIsItBoardSize(players.length, this.difficulty);
    this.board = generateWhoIsItBoard(boardSize, this.artPack, this.ctx.rng);
    this.boardMap = new Map(this.board.map((c) => [c.id, c]));
    this.boardIds = new Set(this.board.map((c) => c.id));

    this.phase = 'pick_secret';
    const ms = this.scaleMs(PICK_SECRET_MS);
    this.phaseSeconds = Math.max(1, Math.round(ms / 1000));
    this.phaseEndsAt = Date.now() + ms;
    this.timer.set(ms, () => this.ensureSecretsAndStart());
  }

  private ensureSecretsAndStart(): void {
    if (this.finished || this.phase !== 'pick_secret') return;
    if (!this.secretReady.red) {
      this.secrets.red = this.board[Math.floor(this.ctx.rng() * this.board.length)].id;
      this.secretReady.red = true;
    }
    if (!this.secretReady.blue) {
      let idx = Math.floor(this.ctx.rng() * this.board.length);
      if (this.board.length > 1 && this.board[idx].id === this.secrets.red) {
        idx = (idx + 1) % this.board.length;
      }
      this.secrets.blue = this.board[idx].id;
      this.secretReady.blue = true;
    }
    const firstTeam: WhoIsItTeam = this.ctx.rng() < 0.5 ? 'red' : 'blue';
    this.enterTurnBeat(firstTeam);
    if (!this.finished) this.ctx.changed();
  }

  private enterTurnBeat(nextTeam: WhoIsItTeam, note: 'timeout' | null = null): void {
    if (this.finished) return;
    if (this.teams.red.length === 0 || this.teams.blue.length === 0) {
      const winner = this.teams.red.length > 0 ? 'red' : 'blue';
      this.finishWithWinner(winner, 'Đối thủ đã rời phòng!');
      return;
    }
    this.phase = 'turn_beat';
    this.turnTeam = nextTeam;
    this.turnNote = note;
    this.pendingQuestion = null;
    this.lastFlippedIds = [];
    this.lastFlippedTeam = null;
    this.activePlayerId = this.pickTeamMember(nextTeam, this.turnCursor[nextTeam]++);
    const ms = this.scaleMs(TURN_BEAT_MS);
    this.phaseSeconds = Math.max(1, Math.round(ms / 1000));
    this.phaseEndsAt = Date.now() + ms;
    this.timer.set(ms, () => {
      if (this.finished || this.phase !== 'turn_beat') return;
      this.enterAskPhase();
      if (!this.finished) this.ctx.changed();
    });
  }

  private enterAskPhase(): void {
    if (this.finished) return;
    if (this.teams.red.length === 0 || this.teams.blue.length === 0) {
      const winner = this.teams.red.length > 0 ? 'red' : 'blue';
      this.finishWithWinner(winner, 'Đối thủ đã rời phòng!');
      return;
    }
    this.phase = 'ask';
    this.roundCount += 1;
    this.pendingQuestion = null;
    this.turnNote = null;
    const stillValid =
      this.activePlayerId !== null &&
      this.teams[this.turnTeam].includes(this.activePlayerId) &&
      this.ctx.isConnected(this.activePlayerId);
    if (!stillValid) {
      this.activePlayerId = this.pickTeamMember(this.turnTeam, this.turnCursor[this.turnTeam]++);
    }
    const ms = this.scaleMs(ASK_MS);
    this.phaseSeconds = Math.max(1, Math.round(ms / 1000));
    this.phaseEndsAt = Date.now() + ms;
    this.timer.set(ms, () => {
      if (this.finished || this.phase !== 'ask') return;
      this.enterTurnBeat(this.otherTeam(this.turnTeam), 'timeout');
      if (!this.finished) this.ctx.changed();
    });
  }

  private enterRevealPhase(onDone: () => void): void {
    if (this.finished) return;
    this.phase = 'reveal';
    const ms = this.scaleMs(REVEAL_MS);
    this.phaseSeconds = Math.max(1, Math.round(ms / 1000));
    this.phaseEndsAt = Date.now() + ms;
    this.timer.set(ms, () => {
      if (this.finished || this.phase !== 'reveal') return;
      onDone();
      if (!this.finished) this.ctx.changed();
    });
  }

  private enterReviewPhase(baseMs: number): void {
    if (this.finished) return;
    this.phase = 'review';
    const ms = this.scaleMs(baseMs);
    this.phaseSeconds = Math.max(1, Math.round(ms / 1000));
    this.phaseEndsAt = Date.now() + ms;
    this.timer.set(ms, () => {
      if (this.finished || this.phase !== 'review') return;
      this.enterTurnBeat(this.otherTeam(this.turnTeam));
      if (!this.finished) this.ctx.changed();
    });
  }

  private recordQA(entry: Omit<WhoIsItQA, 'id' | 'at'>): WhoIsItQA {
    const qa: WhoIsItQA = { ...entry, id: ++this.qaSeq, at: Date.now() };
    this.lastQA = qa;
    this.history.push(qa);
    if (this.history.length > 30) this.history.shift();
    return qa;
  }

  action(playerId: string, action: GameAction): ActionResult {
    if (this.finished) return { ok: false, reason: 'not_playing' };
    const team = this.teamOf(playerId);
    if (!team) return { ok: false, reason: 'spectating' };

    if (action.type === 'wi_team_chat') {
      const raw = typeof action.text === 'string' ? action.text.replace(/\s+/g, ' ').trim().slice(0, 140) : '';
      if (!raw) return { ok: false, reason: 'format' };
      const msg: WhoIsItTeamMsg = {
        id: ++this.chatSeq,
        fromId: playerId,
        fromName: this.names.get(playerId) ?? 'Đồng đội',
        text: raw,
        at: Date.now(),
      };
      this.teamChat[team].push(msg);
      if (this.teamChat[team].length > 30) this.teamChat[team].shift();
      this.ctx.changed();
      return { ok: true };
    }

    if (action.type === 'wi_pick_secret') {
      if (this.phase !== 'pick_secret') return { ok: false, reason: 'bad_action' };
      if (!this.boardIds.has(action.characterId)) return { ok: false, reason: 'bad_action' };
      this.secrets[team] = action.characterId;
      this.secretReady[team] = true;
      if (this.secretReady.red && this.secretReady.blue) {
        this.timer.clear();
        const firstTeam: WhoIsItTeam = this.ctx.rng() < 0.5 ? 'red' : 'blue';
        this.enterTurnBeat(firstTeam);
      }
      if (!this.finished) this.ctx.changed();
      return { ok: true };
    }

    // Lật thẻ thủ công trên bảng của đội mình được phép trong suốt ván
    if (action.type === 'wi_toggle_flip') {
      if (this.phase === 'pick_secret') return { ok: false, reason: 'bad_action' };
      if (!this.boardIds.has(action.characterId)) return { ok: false, reason: 'bad_action' };
      const set = this.flipped[team];
      if (set.has(action.characterId)) set.delete(action.characterId);
      else set.add(action.characterId);
      this.ctx.changed();
      return { ok: true };
    }

    if (action.type === 'wi_answer_free') {
      if (this.phase !== 'answer_free' || !this.pendingQuestion || team === this.turnTeam) {
        return { ok: false, reason: 'not_your_turn' };
      }
      this.timer.clear();
      const pq = this.pendingQuestion;
      this.pendingQuestion = null;
      this.lastFlippedIds = [];
      this.lastFlippedTeam = null;
      this.recordQA({
        team: pq.askedByTeam,
        askedById: pq.askedById,
        askedByName: pq.askedByName,
        question: pq.text,
        answer: !!action.yes,
        kind: 'free',
      });
      this.enterRevealPhase(() => this.enterReviewPhase(REVIEW_FREE_MS));
      this.ctx.changed();
      return { ok: true };
    }

    if (action.type === 'wi_end_review') {
      if (this.phase !== 'review' || team !== this.turnTeam) {
        return { ok: false, reason: 'not_your_turn' };
      }
      this.timer.clear();
      this.enterTurnBeat(this.otherTeam(this.turnTeam));
      if (!this.finished) this.ctx.changed();
      return { ok: true };
    }

    // Các hành động khi tới lượt hỏi/đoán (`ask`)
    if (this.phase !== 'ask' || team !== this.turnTeam) {
      return { ok: false, reason: 'not_your_turn' };
    }

    const pName = this.names.get(playerId) ?? 'Người chơi';

    if (action.type === 'wi_ask_trait') {
      if (!this.availableTraitKeySet.has(action.traitKey)) return { ok: false, reason: 'bad_action' };
      if (this.askedTraits[team].has(action.traitKey)) return { ok: false, reason: 'bad_action' };
      const def = WHO_IS_IT_TRAIT_MAP.get(action.traitKey);
      if (!def) return { ok: false, reason: 'bad_action' };
      const oppSecret = this.secrets[this.otherTeam(team)];
      const oppChar = oppSecret ? this.boardMap.get(oppSecret) : undefined;
      if (!oppChar) return { ok: false, reason: 'bad_action' };

      this.timer.clear();
      const ans = def.match(oppChar);
      this.askedTraits[team].add(def.key);
      this.recordQA({
        team,
        askedById: playerId,
        askedByName: pName,
        question: def.label,
        traitKey: def.key,
        answer: ans,
        kind: 'trait',
      });

      // Tự động úp ngay toàn bộ thẻ không khớp trên bảng của đội vừa hỏi
      const newlyFlipped: string[] = [];
      for (const ch of this.board) {
        if (matchWhoIsItTrait(ch, def.key) !== ans && !this.flipped[team].has(ch.id)) {
          this.flipped[team].add(ch.id);
          newlyFlipped.push(ch.id);
        }
      }
      this.lastFlippedIds = newlyFlipped;
      this.lastFlippedTeam = team;

      this.enterRevealPhase(() => this.enterReviewPhase(REVIEW_TRAIT_MS));
      this.ctx.changed();
      return { ok: true };
    }

    if (action.type === 'wi_ask_free') {
      const text = typeof action.question === 'string' ? action.question.replace(/\s+/g, ' ').trim() : '';
      if (text.length < 2 || text.length > 120) return { ok: false, reason: 'format' };
      this.timer.clear();
      this.phase = 'answer_free';
      this.pendingQuestion = {
        id: ++this.qaSeq,
        askedByTeam: team,
        askedById: playerId,
        askedByName: pName,
        text,
      };
      const ms = this.scaleMs(ANSWER_FREE_MS);
      this.phaseSeconds = Math.max(1, Math.round(ms / 1000));
      this.phaseEndsAt = Date.now() + ms;
      this.timer.set(ms, () => {
        if (this.finished || this.phase !== 'answer_free' || !this.pendingQuestion) return;
        const pq = this.pendingQuestion;
        this.pendingQuestion = null;
        this.lastFlippedIds = [];
        this.lastFlippedTeam = null;
        this.recordQA({
          team: pq.askedByTeam,
          askedById: pq.askedById,
          askedByName: pq.askedByName,
          question: pq.text,
          answer: false,
          kind: 'free',
        });
        this.enterRevealPhase(() => this.enterReviewPhase(REVIEW_FREE_MS));
        if (!this.finished) this.ctx.changed();
      });
      this.ctx.changed();
      return { ok: true };
    }

    if (action.type === 'wi_guess') {
      const target = this.boardMap.get(action.characterId);
      if (!target) return { ok: false, reason: 'bad_action' };
      this.timer.clear();
      const oppTeam = this.otherTeam(team);
      const isCorrect = target.id === this.secrets[oppTeam];
      this.recordQA({
        team,
        askedById: playerId,
        askedByName: pName,
        question: `Chốt đoán: ${target.name}!`,
        characterId: target.id,
        answer: isCorrect,
        kind: 'guess',
      });
      if (isCorrect) {
        this.lastFlippedIds = [];
        this.lastFlippedTeam = null;
        this.enterRevealPhase(() => {
          this.finishWithWinner(team, `🎯 ${pName} đoán trúng phóc "${target.name}"!`);
        });
        this.ctx.changed();
        return { ok: true };
      }
      this.lives[team] = Math.max(0, this.lives[team] - 1);
      this.flipped[team].add(target.id);
      this.lastFlippedIds = [target.id];
      this.lastFlippedTeam = team;
      if (this.lives[team] <= 0) {
        this.enterRevealPhase(() => {
          this.finishWithWinner(oppTeam, `💥 Đội ${team === 'red' ? 'Đỏ' : 'Xanh'} đoán trật hết ${WHO_IS_IT_MAX_LIVES} mạng!`);
        });
      } else {
        this.enterRevealPhase(() => {
          this.enterTurnBeat(oppTeam);
        });
      }
      this.ctx.changed();
      return { ok: true };
    }

    return { ok: false, reason: 'bad_action' };
  }

  botAction(playerId: string): GameAction | null {
    if (this.finished || this.phase === 'turn_beat' || this.phase === 'reveal') return null;
    const team = this.teamOf(playerId);
    if (!team) return null;

    if (this.phase === 'pick_secret' && !this.secretReady[team]) {
      const cand = this.board[Math.floor(this.ctx.rng() * this.board.length)];
      return { type: 'wi_pick_secret', characterId: cand.id };
    }

    if (this.phase === 'answer_free' && team !== this.turnTeam && this.pendingQuestion) {
      if (playerId !== this.teams[team][0]) return null;
      const mySecret = this.secrets[team];
      const ch = mySecret ? this.boardMap.get(mySecret) : undefined;
      const q = this.pendingQuestion.text.toLowerCase();
      let ans = this.ctx.rng() < 0.5;
      if (ch) {
        if (q.includes('nam')) ans = ch.gender === 'male';
        else if (q.includes('nu') || q.includes('nữ')) ans = ch.gender === 'female';
        else if (q.includes('kinh') || q.includes('kính')) ans = ch.glasses === 'clear' || ch.glasses === 'sunglasses';
        else if (q.includes('mu') || q.includes('mũ')) ans = ch.hat !== 'none';
        else if (q.includes('rau') || q.includes('râu') || q.includes('ria')) ans = ch.facialHair !== 'none';
      }
      return { type: 'wi_answer_free', yes: ans };
    }

    if (this.phase === 'review' && team === this.turnTeam && playerId === this.activePlayerId) {
      return { type: 'wi_end_review' };
    }

    if (this.phase === 'ask' && team === this.turnTeam && playerId === this.activePlayerId) {
      const cands = this.board.filter((c) => !this.flipped[team].has(c.id));
      if (cands.length === 0) {
        return { type: 'wi_guess', characterId: this.board[0].id };
      }
      if (cands.length === 1 || (cands.length === 2 && this.lives[team] >= 2)) {
        const pick = cands[Math.floor(this.ctx.rng() * cands.length)];
        return { type: 'wi_guess', characterId: pick.id };
      }

      let bestKey: string | null = null;
      let bestDiff = Infinity;
      const target = cands.length / 2;
      for (const tr of this.availableTraits) {
        if (this.askedTraits[team].has(tr.key)) continue;
        const yesCount = cands.filter(tr.match).length;
        if (yesCount === 0 || yesCount === cands.length) continue;
        const diff = Math.abs(yesCount - target);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestKey = tr.key;
        }
      }
      if (bestKey) return { type: 'wi_ask_trait', traitKey: bestKey };
      const pick = cands[Math.floor(this.ctx.rng() * cands.length)];
      return { type: 'wi_guess', characterId: pick.id };
    }

    return null;
  }

  removePlayer(playerId: string): void {
    this.teams.red = this.teams.red.filter((id) => id !== playerId);
    this.teams.blue = this.teams.blue.filter((id) => id !== playerId);
    this.order = this.order.filter((id) => id !== playerId);
    if (this.teams.red.length === 0 || this.teams.blue.length === 0) {
      const winner: WhoIsItTeam = this.teams.red.length > 0 ? 'red' : 'blue';
      this.finishWithWinner(winner, 'Đối thủ đã rời phòng!');
      return;
    }
    if (this.activePlayerId === playerId && (this.phase === 'ask' || this.phase === 'turn_beat')) {
      this.activePlayerId = this.pickTeamMember(this.turnTeam, this.turnCursor[this.turnTeam]++);
    }
  }

  private finishWithWinner(winnerTeam: WhoIsItTeam, headlinePrefix: string): void {
    if (this.finished) return;
    this.finished = true;
    this.timer.clear();
    const redSecretName = (this.secrets.red && this.boardMap.get(this.secrets.red)?.name) ?? '?';
    const blueSecretName = (this.secrets.blue && this.boardMap.get(this.secrets.blue)?.name) ?? '?';
    const winnerIds = [...this.teams[winnerTeam]];
    const headline = `${headlinePrefix} · Đội ${winnerTeam === 'red' ? 'Đỏ' : 'Xanh'} thắng! (Đỏ: ${redSecretName} | Xanh: ${blueSecretName})`;

    const sorted = [...this.order].sort((a, b) => {
      const wa = this.teamOf(a) === winnerTeam ? 1 : 0;
      const wb = this.teamOf(b) === winnerTeam ? 1 : 0;
      return wb - wa;
    });
    const ranking: RankEntry[] = sorted.map((id) => {
      const t = this.teamOf(id);
      const sec = t === 'red' ? redSecretName : blueSecretName;
      return {
        playerId: id,
        name: this.names.get(id) ?? 'Người chơi',
        detail: `${t === 'red' ? 'Đội Đỏ' : 'Đội Xanh'} (Thẻ: ${sec}) · ${t === winnerTeam ? 'Thắng' : 'Thua'}`,
      };
    });

    this.ctx.finish({
      winnerId: winnerIds[0] ?? null,
      winnerIds,
      ranking,
      headline,
    });
  }

  view(viewerId?: string): WhoIsItView {
    const myTeam = viewerId ? this.teamOf(viewerId) : null;
    const oppTeam = myTeam ? this.otherTeam(myTeam) : null;
    const mySecretId = myTeam ? (this.secrets[myTeam] ?? null) : null;
    const myFlipped = myTeam ? [...this.flipped[myTeam]] : [];
    const oppFlipped = oppTeam ? [...this.flipped[oppTeam]] : [];

    return {
      type: 'who_is_it',
      phase: this.phase,
      phaseEndsAt: this.phaseEndsAt,
      phaseSeconds: this.phaseSeconds,
      artPack: this.artPack,
      traitKeys: [...this.availableTraitKeys],
      boardSize: this.board.length,
      characters: this.board,
      teams: { red: [...this.teams.red], blue: [...this.teams.blue] },
      myTeam,
      mySecretId,
      myFlipped,
      oppFlipped,
      lastFlippedIds: [...this.lastFlippedIds],
      lastFlippedTeam: this.lastFlippedTeam,
      turnNote: this.turnNote,
      secretReady: { ...this.secretReady },
      remainingCounts: {
        red: Math.max(0, this.board.length - this.flipped.red.size),
        blue: Math.max(0, this.board.length - this.flipped.blue.size),
      },
      lives: { ...this.lives },
      turnTeam: this.turnTeam,
      activePlayerId: this.activePlayerId,
      lastQA: this.lastQA,
      history: [...this.history],
      pendingQuestion: this.pendingQuestion
        ? {
            id: this.pendingQuestion.id,
            askedByTeam: this.pendingQuestion.askedByTeam,
            text: this.pendingQuestion.text,
          }
        : null,
      teamChat: myTeam ? [...this.teamChat[myTeam]] : [],
      roundCount: this.roundCount,
      names: Object.fromEntries(this.names),
    };
  }

  dispose(): void {
    this.finished = true;
    this.timer.clear();
  }
}
