/**
 * Server Engine: Khảo Sát Xóm Lầy — Family Feud (`family_feud`, 2–12 người chia 2 đội Đỏ/Xanh).
 * - Tôn trọng lựa chọn đội ở phòng chờ (ai bấm sớm vào trước).
 * - Nhịp độ trình diễn rõ ràng: có khoảng nghỉ `reveal_beat` sau mỗi câu mở ô / gậy X / cướp điểm.
 * - Kênh thảo luận riêng của từng đội (`perPlayerView = true`).
 */
import {
  FAMILY_FEUD_BANK,
  matchFamilyFeudAnswer,
} from '../../../shared/src/familyfeud';
import {
  FAMILY_FEUD_DEFAULT_ROUNDS,
  type FamilyFeudView,
  type FeudAttemptLog,
  type FeudPhase,
  type FeudQuestion,
  type FeudSpotlight,
  type FeudTeam,
  type FeudTeamMsg,
} from '../../../shared/src/familyfeud-types';
import type { ActionResult, GameAction, RankEntry } from '../../../shared/src/types';
import { Timer, type EngineContext, type EnginePlayer, type GameEngine } from './engine';

const FACEOFF_MS = 25_000;
const DECIDE_MS = 15_000;
const PLAY_MS = 25_000;
const STEAL_MS = 30_000;
const REVEAL_BEAT_MS = 2_600;
const ROUND_END_MS = 9_500;

/** Bộ bài toàn cục không lặp qua các ván live */
let liveFeudDeck: number[] = [];

function drawLiveQuestionIndex(): number {
  if (liveFeudDeck.length === 0) {
    liveFeudDeck = Array.from({ length: FAMILY_FEUD_BANK.length }, (_, i) => i);
    for (let i = liveFeudDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [liveFeudDeck[i], liveFeudDeck[j]] = [liveFeudDeck[j], liveFeudDeck[i]];
    }
  }
  return liveFeudDeck.pop()!;
}

type FamilyFeudSettingsCompat = { familyFeudRounds?: number };

export class FamilyFeudGame implements GameEngine {
  readonly perPlayerView = true;

  private readonly maxRounds: number;
  private readonly timer = new Timer();

  private order: string[] = [];
  private names = new Map<string, string>();
  private teams: Record<FeudTeam, string[]> = { red: [], blue: [] };
  private scores: Record<FeudTeam, number> = { red: 0, blue: 0 };
  private playerHits = new Map<string, number>();

  private round = 0;
  private phase: FeudPhase = 'faceoff';
  private phaseEndsAt: number | null = null;
  private phaseSeconds = 25;

  private usedQIdx = new Set<number>();
  private question!: FeudQuestion;
  private revealed = new Map<number, FeudTeam>();
  private roundBank = 0;
  private strikes = 0;

  private controllingTeam: FeudTeam | null = null;
  private faceoffWinner: FeudTeam | null = null;
  private faceoffRedIdx = 0;
  private faceoffBlueIdx = 0;
  private faceoffRedId: string | null = null;
  private faceoffBlueId: string | null = null;
  private faceoffAttempts = 0;
  private faceoffSubmitted: Partial<Record<FeudTeam, { guess: string; hitIndex: number | null; points: number }>> = {};

  private playTurnIdx: Record<FeudTeam, number> = { red: 0, blue: 0 };
  private activePlayerId: string | null = null;

  private attemptSeq = 0;
  private attempts: FeudAttemptLog[] = [];
  private lastEvent: string | null = null;
  private spotlight: FeudSpotlight | null = null;

  private chatSeq = 0;
  private teamChat: Record<FeudTeam, FeudTeamMsg[]> = { red: [], blue: [] };
  private finished = false;

  constructor(private readonly ctx: EngineContext) {
    const raw = (ctx.settings as FamilyFeudSettingsCompat).familyFeudRounds ?? FAMILY_FEUD_DEFAULT_ROUNDS;
    this.maxRounds = raw === 5 ? 5 : 3;
  }

  private scaleMs(baseMs: number): number {
    if (!this.ctx.turnMs) return baseMs;
    return Math.min(baseMs, Math.max(55, Math.floor((this.ctx.turnMs * baseMs) / 25_000)));
  }

  private otherTeam(team: FeudTeam): FeudTeam {
    return team === 'red' ? 'blue' : 'red';
  }

  private teamOf(playerId: string): FeudTeam | null {
    if (this.teams.red.includes(playerId)) return 'red';
    if (this.teams.blue.includes(playerId)) return 'blue';
    return null;
  }

  private multiplierForRound(r: number): 1 | 2 | 3 {
    if (r >= this.maxRounds) return 3;
    if (r === this.maxRounds - 1 && this.maxRounds >= 2) return 2;
    return 1;
  }

  private drawQuestion(): FeudQuestion {
    if (this.ctx.rng === Math.random) {
      let guard = 0;
      let idx = drawLiveQuestionIndex();
      while (this.usedQIdx.has(idx) && guard < 12) {
        idx = drawLiveQuestionIndex();
        guard++;
      }
      this.usedQIdx.add(idx);
      return FAMILY_FEUD_BANK[idx];
    }
    const avail: number[] = [];
    for (let i = 0; i < FAMILY_FEUD_BANK.length; i++) {
      if (!this.usedQIdx.has(i)) avail.push(i);
    }
    const pool = avail.length > 0 ? avail : Array.from({ length: FAMILY_FEUD_BANK.length }, (_, i) => i);
    const pick = pool[Math.floor(this.ctx.rng() * pool.length)];
    this.usedQIdx.add(pick);
    return FAMILY_FEUD_BANK[pick];
  }

  private pickTeamMember(team: FeudTeam, cursor: number): string | null {
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
      this.playerHits.set(p.id, 0);
      if (p.team && this.teams[p.team].length < cap) {
        this.teams[p.team].push(p.id);
      } else {
        unassigned.push(p);
      }
    }
    for (const p of unassigned) {
      const target: FeudTeam = this.teams.red.length <= this.teams.blue.length ? 'red' : 'blue';
      this.teams[target].push(p.id);
    }

    this.scores = { red: 0, blue: 0 };
    this.startNextRound();
  }

  private startNextRound(): void {
    if (this.finished) return;
    if (this.teams.red.length === 0 || this.teams.blue.length === 0) {
      this.finishGame();
      return;
    }
    this.round += 1;
    this.question = this.drawQuestion();
    this.revealed.clear();
    this.roundBank = 0;
    this.strikes = 0;
    this.controllingTeam = null;
    this.faceoffWinner = null;
    this.faceoffAttempts = 0;
    this.attempts = [];
    this.beginFaceoffPair();
  }

  private beginFaceoffPair(): void {
    this.phase = 'faceoff';
    this.faceoffSubmitted = {};
    this.faceoffRedId = this.pickTeamMember('red', this.faceoffRedIdx++);
    this.faceoffBlueId = this.pickTeamMember('blue', this.faceoffBlueIdx++);
    this.activePlayerId = this.faceoffRedId ?? this.faceoffBlueId;
    this.spotlight = {
      tone: 'info',
      title: `VÒNG ${this.round}/${this.maxRounds} (×${this.multiplierForRound(this.round)})`,
      detail: '2 đại diện thi bấm chuông trả lời!',
    };
    this.lastEvent = `Vòng ${this.round}/${this.maxRounds} (×${this.multiplierForRound(this.round)}) · Đấu đối đầu!`;
    const ms = this.scaleMs(FACEOFF_MS);
    this.phaseSeconds = Math.max(1, Math.round(ms / 1000));
    this.phaseEndsAt = Date.now() + ms;
    this.timer.set(ms, () => this.onFaceoffTimeout());
  }

  private onFaceoffTimeout(): void {
    if (this.finished || this.phase !== 'faceoff') return;
    this.resolveFaceoff(true);
    this.ctx.changed();
  }

  private enterRevealBeat(spotlight: FeudSpotlight, after: () => void): void {
    this.phase = 'reveal_beat';
    this.spotlight = spotlight;
    this.activePlayerId = null;
    const ms = this.scaleMs(REVEAL_BEAT_MS);
    this.phaseSeconds = Math.max(1, Math.round(ms / 1000));
    this.phaseEndsAt = Date.now() + ms;
    this.timer.set(ms, () => {
      if (this.finished) return;
      after();
      this.ctx.changed();
    });
  }

  private resolveFaceoff(timedOut: boolean): void {
    const r = this.faceoffSubmitted.red;
    const b = this.faceoffSubmitted.blue;
    if (!timedOut && (!r || !b)) {
      const winnerInstant: FeudTeam | null =
        r && r.hitIndex === 0 ? 'red' : b && b.hitIndex === 0 ? 'blue' : null;
      if (!winnerInstant) return;
      this.timer.clear();
      const topAns = this.question.answers[0]?.text ?? 'Đáp án #1';
      this.enterRevealBeat(
        {
          tone: 'hit',
          title: `🎯 TRÚNG ĐỈNH #1: "${topAns}"!`,
          detail: `Đội ${winnerInstant === 'red' ? 'Đỏ' : 'Xanh'} thắng ngay vòng đối đầu!`,
        },
        () => this.enterDecide(winnerInstant),
      );
      return;
    }

    this.timer.clear();
    const rPts = r?.hitIndex !== null && r?.hitIndex !== undefined ? r.points : -1;
    const bPts = b?.hitIndex !== null && b?.hitIndex !== undefined ? b.points : -1;

    if (rPts > bPts || bPts > rPts || (rPts >= 0 && rPts === bPts)) {
      const winner: FeudTeam =
        rPts > bPts ? 'red' : bPts > rPts ? 'blue' : this.round % 2 === 1 ? 'red' : 'blue';
      this.enterRevealBeat(
        {
          tone: 'hit',
          title: `⚡ Đội ${winner === 'red' ? 'Đỏ' : 'Xanh'} thắng đối đầu!`,
          detail: 'Chuẩn bị chọn Chơi tiếp hay Nhường lượt…',
        },
        () => this.enterDecide(winner),
      );
      return;
    }

    if (this.faceoffAttempts === 0) {
      this.faceoffAttempts = 1;
      this.enterRevealBeat(
        {
          tone: 'miss',
          title: '😅 Cả hai cùng trật!',
          detail: 'Đổi cặp khác lên bấm chuông lần 2…',
        },
        () => this.beginFaceoffPair(),
      );
      return;
    }

    const fallbackTeam: FeudTeam = this.round % 2 === 1 ? 'red' : 'blue';
    this.faceoffWinner = fallbackTeam;
    this.controllingTeam = fallbackTeam;
    this.enterRevealBeat(
      {
        tone: 'info',
        title: `🎲 Đội ${fallbackTeam === 'red' ? 'Đỏ' : 'Xanh'} cầm bảng trước!`,
        detail: 'Hội ý cùng đồng đội để mở hết 6 ô!',
      },
      () => this.enterPlayTurn(),
    );
  }

  private enterDecide(winner: FeudTeam): void {
    this.faceoffWinner = winner;
    this.phase = 'decide';
    this.activePlayerId = this.pickTeamMember(winner, this.playTurnIdx[winner]);
    this.spotlight = {
      tone: 'info',
      title: `Đội ${winner === 'red' ? 'Đỏ' : 'Xanh'} thắng đối đầu!`,
      detail: 'Chọn CHƠI TIẾP hoặc NHƯỜNG LƯỢT đối thủ',
    };
    this.lastEvent = `Đội ${winner === 'red' ? 'Đỏ' : 'Xanh'} chọn Chơi tiếp hoặc Nhường lượt!`;
    const ms = this.scaleMs(DECIDE_MS);
    this.phaseSeconds = Math.max(1, Math.round(ms / 1000));
    this.phaseEndsAt = Date.now() + ms;
    this.timer.set(ms, () => {
      if (this.finished || this.phase !== 'decide') return;
      this.controllingTeam = winner;
      this.enterPlayTurn();
      this.ctx.changed();
    });
  }

  private enterPlayTurn(): void {
    if (!this.controllingTeam) return;
    if (this.revealed.size >= this.question.answers.length) {
      this.awardAndEndRound(
        this.controllingTeam,
        `🏆 Quét sạch 6/6 ô! Đội ${this.controllingTeam === 'red' ? 'Đỏ' : 'Xanh'} ẵm +${this.roundBank}đ!`,
      );
      return;
    }
    const team = this.controllingTeam;
    if (this.teams[team].length === 0) {
      this.finishGame();
      return;
    }
    this.phase = 'play';
    this.activePlayerId = this.pickTeamMember(team, this.playTurnIdx[team]++);
    const pName = this.activePlayerId ? (this.names.get(this.activePlayerId) ?? 'Đồng đội') : 'Đồng đội';
    this.spotlight = {
      tone: 'info',
      title: `Đội ${team === 'red' ? 'Đỏ' : 'Xanh'} · Lượt ${pName}`,
      detail: `Còn ${6 - this.revealed.size} ô chưa mở · ${this.strikes}/3 gậy X`,
    };
    const ms = this.scaleMs(PLAY_MS);
    this.phaseSeconds = Math.max(1, Math.round(ms / 1000));
    this.phaseEndsAt = Date.now() + ms;
    this.timer.set(ms, () => this.onPlayTimeout());
  }

  private onPlayTimeout(): void {
    if (this.finished || this.phase !== 'play' || !this.controllingTeam) return;
    const pid = this.activePlayerId ?? '';
    const pName = this.names.get(pid) ?? 'Đồng đội';
    const team = this.controllingTeam;
    this.strikes += 1;
    this.pushAttempt(pid, pName, team, '(Hết giờ)', null, 0);
    this.lastEvent = `⏰ ${pName} hết giờ! Dính gậy X (${this.strikes}/3)`;
    this.enterRevealBeat(
      {
        tone: 'miss',
        title: `⏰ HẾT GIỜ! GẬY X (${this.strikes}/3)`,
        detail: `${pName} chưa kịp chốt đáp án`,
      },
      () => {
        if (this.strikes >= 3) this.enterSteal();
        else this.enterPlayTurn();
      },
    );
    this.ctx.changed();
  }

  private enterSteal(): void {
    if (!this.controllingTeam) return;
    const stealTeam = this.otherTeam(this.controllingTeam);
    this.phase = 'steal';
    this.activePlayerId = this.pickTeamMember(stealTeam, this.playTurnIdx[stealTeam]++);
    const sLabel = stealTeam === 'red' ? 'Đỏ' : 'Xanh';
    this.spotlight = {
      tone: 'steal',
      title: `🚨 CƠ HỘI CƯỚP ${this.roundBank}đ!`,
      detail: `Đội ${sLabel} bàn với nhau rồi chốt 1 đáp án!`,
    };
    this.lastEvent = `🚨 ĐỦ 3 GẬY X! Đội ${sLabel} có 1 phát CƯỚP SẠCH ${this.roundBank}đ!`;
    const ms = this.scaleMs(STEAL_MS);
    this.phaseSeconds = Math.max(1, Math.round(ms / 1000));
    this.phaseEndsAt = Date.now() + ms;
    this.timer.set(ms, () => {
      if (this.finished || this.phase !== 'steal' || !this.controllingTeam) return;
      const cTeam = this.controllingTeam;
      this.awardAndEndRound(
        cTeam,
        `🛡️ Cướp hụt vì hết giờ! Đội ${cTeam === 'red' ? 'Đỏ' : 'Xanh'} giữ trọn +${this.roundBank}đ!`,
      );
      this.ctx.changed();
    });
  }

  private awardAndEndRound(winnerTeam: FeudTeam, eventText: string): void {
    const awarded = this.roundBank;
    this.scores[winnerTeam] += awarded;
    this.roundBank = 0;
    this.phase = 'round_end';
    this.activePlayerId = null;
    this.lastEvent = eventText;
    this.spotlight = {
      tone: winnerTeam === this.controllingTeam ? 'hit' : 'steal',
      title: `Đội ${winnerTeam === 'red' ? 'Đỏ' : 'Xanh'} húp +${awarded}đ!`,
      detail: 'Đang mở hết đáp án còn lại trên bảng…',
    };
    const ms = this.scaleMs(ROUND_END_MS);
    this.phaseSeconds = Math.max(1, Math.round(ms / 1000));
    this.phaseEndsAt = Date.now() + ms;
    this.timer.set(ms, () => {
      if (this.finished) return;
      if (this.round >= this.maxRounds) {
        this.finishGame();
      } else {
        this.startNextRound();
      }
      this.ctx.changed();
    });
  }

  private pushAttempt(
    playerId: string,
    playerName: string,
    team: FeudTeam,
    text: string,
    hitIndex: number | null,
    pointsAdded: number,
    duplicate = false,
  ): void {
    this.attempts.push({
      id: ++this.attemptSeq,
      playerId,
      playerName,
      team,
      text,
      hitIndex,
      pointsAdded,
      ...(duplicate ? { duplicate: true } : {}),
      at: Date.now(),
    });
    if (this.attempts.length > 14) this.attempts.shift();
  }

  action(playerId: string, action: GameAction): ActionResult {
    if (this.finished) return { ok: false, reason: 'not_playing' };
    const team = this.teamOf(playerId);
    if (!team) return { ok: false, reason: 'spectating' };

    if (action.type === 'ff_team_chat') {
      const raw = typeof action.text === 'string' ? action.text.replace(/\s+/g, ' ').trim().slice(0, 140) : '';
      if (!raw) return { ok: false, reason: 'format' };
      const msg: FeudTeamMsg = {
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

    if (action.type === 'ff_decide') {
      if (this.phase !== 'decide' || team !== this.faceoffWinner) {
        return { ok: false, reason: 'not_your_turn' };
      }
      this.timer.clear();
      this.controllingTeam = action.choice === 'pass' ? this.otherTeam(team) : team;
      this.lastEvent =
        action.choice === 'pass'
          ? `Đội ${team === 'red' ? 'Đỏ' : 'Xanh'} NHƯỜNG LƯỢT — đẩy áp lực sang đối thủ!`
          : `Đội ${team === 'red' ? 'Đỏ' : 'Xanh'} quyết định CHƠI TIẾP!`;
      this.enterPlayTurn();
      this.ctx.changed();
      return { ok: true };
    }

    if (action.type !== 'ff_answer') return { ok: false, reason: 'bad_action' };
    const rawText = typeof action.text === 'string' ? action.text.trim() : '';
    if (!rawText || rawText.length > 80) return { ok: false, reason: 'format' };

    const pName = this.names.get(playerId) ?? 'Người chơi';
    const mult = this.multiplierForRound(this.round);

    if (this.phase === 'faceoff') {
      const expectedId = team === 'red' ? this.faceoffRedId : this.faceoffBlueId;
      if (playerId !== expectedId || this.faceoffSubmitted[team]) {
        return { ok: false, reason: 'not_your_turn' };
      }
      const match = matchFamilyFeudAnswer(rawText, this.question.answers, new Set(this.revealed.keys()));
      if (match.status === 'already_revealed') {
        return { ok: false, reason: 'used' };
      }
      if (match.status === 'hit' && match.index !== null) {
        const ans = this.question.answers[match.index];
        const pts = ans.points * mult;
        this.revealed.set(match.index, team);
        this.roundBank += pts;
        this.playerHits.set(playerId, (this.playerHits.get(playerId) ?? 0) + 1);
        this.faceoffSubmitted[team] = { guess: rawText, hitIndex: match.index, points: ans.points };
        this.pushAttempt(playerId, pName, team, rawText, match.index, pts);
        this.lastEvent = `🎯 ${pName} mở ô #${match.index + 1}: "${ans.text}" (+${pts}đ)!`;
        this.spotlight = {
          tone: 'hit',
          title: `🎯 Ô #${match.index + 1}: "${ans.text}" (+${pts}đ)`,
          detail: `${pName} (${team === 'red' ? 'Đỏ' : 'Xanh'}) ghi điểm!`,
        };
      } else {
        this.faceoffSubmitted[team] = { guess: rawText, hitIndex: null, points: 0 };
        this.pushAttempt(playerId, pName, team, rawText, null, 0);
        this.lastEvent = `❌ ${pName} đoán "${rawText}" — không có trên bảng!`;
        this.spotlight = {
          tone: 'miss',
          title: `❌ "${rawText}" — Hụt!`,
          detail: `${pName} chưa mở được ô nào`,
        };
      }
      this.resolveFaceoff(false);
      this.ctx.changed();
      return { ok: true };
    }

    if (this.phase === 'play') {
      if (team !== this.controllingTeam || playerId !== this.activePlayerId) {
        return { ok: false, reason: 'not_your_turn' };
      }
      const match = matchFamilyFeudAnswer(rawText, this.question.answers, new Set(this.revealed.keys()));
      if (match.status === 'already_revealed') {
        return { ok: false, reason: 'used' };
      }
      this.timer.clear();
      if (match.status === 'hit' && match.index !== null) {
        const ans = this.question.answers[match.index];
        const pts = ans.points * mult;
        this.revealed.set(match.index, team);
        this.roundBank += pts;
        this.playerHits.set(playerId, (this.playerHits.get(playerId) ?? 0) + 1);
        this.pushAttempt(playerId, pName, team, rawText, match.index, pts);
        this.lastEvent = `🔥 TRÚNG Ô #${match.index + 1}: "${ans.text}" (+${pts}đ)!`;
        if (this.revealed.size >= this.question.answers.length) {
          this.awardAndEndRound(
            team,
            `🏆 Quét sạch 6/6 đáp án! Đội ${team === 'red' ? 'Đỏ' : 'Xanh'} ẵm +${this.roundBank}đ!`,
          );
        } else {
          this.enterRevealBeat(
            {
              tone: 'hit',
              title: `🔥 Ô #${match.index + 1}: "${ans.text}" (+${pts}đ)`,
              detail: `${pName} giúp quỹ lên ${this.roundBank}đ!`,
            },
            () => this.enterPlayTurn(),
          );
        }
      } else {
        this.strikes += 1;
        this.pushAttempt(playerId, pName, team, rawText, null, 0);
        this.lastEvent = `✕ HỤT! "${rawText}" không có (${this.strikes}/3 gậy X)`;
        this.enterRevealBeat(
          {
            tone: 'miss',
            title: `✕ GẬY X (${this.strikes}/3) — "${rawText}"`,
            detail: this.strikes >= 3 ? 'Đủ 3 gậy! Chuẩn bị pha CƯỚP ĐIỂM!' : `${pName} đoán trật`,
          },
          () => {
            if (this.strikes >= 3) this.enterSteal();
            else this.enterPlayTurn();
          },
        );
      }
      this.ctx.changed();
      return { ok: true };
    }

    if (this.phase === 'steal') {
      if (!this.controllingTeam || team === this.controllingTeam) {
        return { ok: false, reason: 'not_your_turn' };
      }
      const match = matchFamilyFeudAnswer(rawText, this.question.answers, new Set(this.revealed.keys()));
      if (match.status === 'already_revealed') {
        return { ok: false, reason: 'used' };
      }
      this.timer.clear();
      if (match.status === 'hit' && match.index !== null) {
        const ans = this.question.answers[match.index];
        const pts = ans.points * mult;
        this.revealed.set(match.index, team);
        this.roundBank += pts;
        this.playerHits.set(playerId, (this.playerHits.get(playerId) ?? 0) + 1);
        this.pushAttempt(playerId, pName, team, rawText, match.index, pts);
        this.awardAndEndRound(
          team,
          `💥 CƯỚP THÀNH CÔNG! "${ans.text}" → Đội ${team === 'red' ? 'Đỏ' : 'Xanh'} hốt +${this.roundBank}đ!`,
        );
      } else {
        this.pushAttempt(playerId, pName, team, rawText, null, 0);
        this.awardAndEndRound(
          this.controllingTeam,
          `🛡️ Cướp hụt "${rawText}"! Đội ${this.controllingTeam === 'red' ? 'Đỏ' : 'Xanh'} giữ trọn +${this.roundBank}đ!`,
        );
      }
      this.ctx.changed();
      return { ok: true };
    }

    return { ok: false, reason: 'not_your_turn' };
  }

  botAction(playerId: string): GameAction | null {
    if (this.finished || this.phase === 'reveal_beat' || this.phase === 'round_end') return null;
    const team = this.teamOf(playerId);
    if (!team) return null;

    if (this.phase === 'decide') {
      if (team !== this.faceoffWinner || playerId !== this.activePlayerId) return null;
      return { type: 'ff_decide', choice: this.ctx.rng() < 0.86 ? 'play' : 'pass' };
    }

    const canSubmitAnswer =
      (this.phase === 'faceoff' &&
        (playerId === this.faceoffRedId || playerId === this.faceoffBlueId) &&
        !this.faceoffSubmitted[team]) ||
      (this.phase === 'play' && team === this.controllingTeam && playerId === this.activePlayerId) ||
      (this.phase === 'steal' && this.controllingTeam !== null && team !== this.controllingTeam && playerId === this.activePlayerId);

    if (!canSubmitAnswer) return null;

    const unrevealed = this.question.answers
      .map((a, i) => ({ a, i }))
      .filter(({ i }) => !this.revealed.has(i));

    if (unrevealed.length > 0 && this.ctx.rng() < 0.72) {
      const target = unrevealed[Math.floor(this.ctx.rng() * unrevealed.length)].a;
      const sample = target.aliases.length > 0 && this.ctx.rng() < 0.5
        ? target.aliases[Math.floor(this.ctx.rng() * target.aliases.length)]
        : target.text;
      return { type: 'ff_answer', text: sample };
    }

    const funnyMisses = ['khong biet', 'doan dai', 'bo tay', 'di ngu', 'quen roi'];
    return { type: 'ff_answer', text: funnyMisses[Math.floor(this.ctx.rng() * funnyMisses.length)] };
  }

  removePlayer(playerId: string): void {
    this.teams.red = this.teams.red.filter((id) => id !== playerId);
    this.teams.blue = this.teams.blue.filter((id) => id !== playerId);
    this.order = this.order.filter((id) => id !== playerId);
    if (this.teams.red.length === 0 || this.teams.blue.length === 0) {
      this.finishGame();
      return;
    }
    if (this.activePlayerId === playerId) {
      if (this.phase === 'play' && this.controllingTeam) {
        this.enterPlayTurn();
      } else if (this.phase === 'steal' && this.controllingTeam) {
        const sTeam = this.otherTeam(this.controllingTeam);
        this.activePlayerId = this.pickTeamMember(sTeam, this.playTurnIdx[sTeam]++);
      } else if (this.phase === 'decide' && this.faceoffWinner) {
        this.activePlayerId = this.pickTeamMember(this.faceoffWinner, this.playTurnIdx[this.faceoffWinner]);
      }
    }
    if (this.phase === 'faceoff') {
      if (this.faceoffRedId === playerId) this.faceoffRedId = this.pickTeamMember('red', this.faceoffRedIdx++);
      if (this.faceoffBlueId === playerId) this.faceoffBlueId = this.pickTeamMember('blue', this.faceoffBlueIdx++);
    }
  }

  private finishGame(): void {
    if (this.finished) return;
    this.finished = true;
    this.timer.clear();
    const rScore = this.scores.red;
    const bScore = this.scores.blue;
    let winnerIds: string[];
    let headline: string;
    if (rScore > bScore) {
      winnerIds = [...this.teams.red];
      headline = `🏆 Đội Đỏ thắng Khảo Sát Xóm Lầy (${rScore} – ${bScore}đ)!`;
    } else if (bScore > rScore) {
      winnerIds = [...this.teams.blue];
      headline = `🏆 Đội Xanh thắng Khảo Sát Xóm Lầy (${bScore} – ${rScore}đ)!`;
    } else {
      winnerIds = [...this.order];
      headline = `🤝 Hai đội hòa điểm kịch tính (${rScore} – ${bScore}đ)!`;
    }
    const sorted = [...this.order].sort((a, b) => {
      const sa = this.scores[this.teamOf(a) ?? 'red'];
      const sb = this.scores[this.teamOf(b) ?? 'red'];
      if (sb !== sa) return sb - sa;
      return (this.playerHits.get(b) ?? 0) - (this.playerHits.get(a) ?? 0);
    });
    const ranking: RankEntry[] = sorted.map((id) => {
      const t = this.teamOf(id);
      const tScore = t ? this.scores[t] : 0;
      return {
        playerId: id,
        name: this.names.get(id) ?? 'Người chơi',
        detail: `${t === 'red' ? 'Đội Đỏ' : 'Đội Xanh'} · ${tScore}đ · ${this.playerHits.get(id) ?? 0} câu trúng`,
      };
    });
    this.ctx.finish({
      winnerId: winnerIds[0] ?? null,
      winnerIds,
      ranking,
      headline,
    });
  }

  view(viewerId?: string): FamilyFeudView {
    const myTeam = viewerId ? this.teamOf(viewerId) : null;
    const showAll = this.phase === 'round_end';
    const slots = this.question.answers.map((ans, index) => {
      const team = this.revealed.get(index);
      const isRevealed = team !== undefined;
      return {
        index,
        revealed: isRevealed,
        ...(isRevealed || showAll ? { text: ans.text, points: ans.points } : {}),
        ...(team ? { revealedBy: team } : {}),
      };
    });
    return {
      type: 'family_feud',
      round: this.round,
      maxRounds: this.maxRounds,
      multiplier: this.multiplierForRound(this.round),
      phase: this.phase,
      phaseEndsAt: this.phaseEndsAt,
      phaseSeconds: this.phaseSeconds,
      questionId: this.question.id,
      category: this.question.category,
      question: this.question.question,
      slots,
      teams: { red: [...this.teams.red], blue: [...this.teams.blue] },
      scores: { ...this.scores },
      roundBank: this.roundBank,
      strikes: this.strikes,
      controllingTeam: this.controllingTeam,
      faceoffWinner: this.faceoffWinner,
      faceoffRedId: this.faceoffRedId,
      faceoffBlueId: this.faceoffBlueId,
      faceoffSubmitted: { ...this.faceoffSubmitted },
      activePlayerId: this.activePlayerId,
      attempts: [...this.attempts],
      lastEvent: this.lastEvent,
      spotlight: this.spotlight,
      myTeam,
      teamChat: myTeam ? [...this.teamChat[myTeam]] : [],
      names: Object.fromEntries(this.names),
    };
  }

  dispose(): void {
    this.finished = true;
    this.timer.clear();
  }
}
