import {
  GIAN_DIEP_ROLE_META,
  GIAN_DIEP_WORDS,
  MR_WHITE_GENERIC_CLUES,
  type GianDiepClue,
  type GianDiepFeedItem,
  type GianDiepPhase,
  type GianDiepRevealPlayer,
  type GianDiepRole,
  type GianDiepView,
  type GianDiepWordPair,
} from '../../../shared/src/giandiep';
import type { ActionResult, GameAction } from '../../../shared/src/types';
import { Timer, type EngineContext, type EnginePlayer, type GameEngine } from './engine';

const DEFAULT_SEC: Record<GianDiepPhase, number> = {
  word_reveal: 10,
  clue_turn: 40,
  clue_summary: 10,
  discussion: 50,
  vote: 35,
  defense: 28,
  final_vote: 25,
  mrwhite_guess: 25,
  spy_guess: 25,
  reveal_end: 12,
};

const BOT_DEFENSE_LINES = [
  'Oan quá mọi người ơi, câu mô tả của mình chuẩn từ gốc luôn mà!',
  'Đừng loại nhầm Dân Thường nha, đọc kỹ lại gợi ý vòng trước của mình đi!',
  'Mình mô tả khéo để tránh lộ từ cho Mr. White thôi chứ mình phe Dân thật sự!',
  'Bình tĩnh suy luận lại đi cả nhà, loại mình là phe Gián Điệp cười thầm đó!',
  'Ai dẫn dắt vote mình mới là người đáng nghi nhất bàn này á!',
];

const BOT_CHAT_LINES = [
  'Nghe kỹ xem câu nào lệch tông nhất nha!',
  'Có người mô tả hơi chung chung đó, coi chừng Mr. White!',
  'Khoan vội, đối chiếu lại lời khai vòng này đã!',
  'Mình thấy có 1 người dùng từ hơi lạ so với chủ đề nè.',
];

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
  private eliminated: { id: string; role: GianDiepRole; round: number; word?: string | null }[] = [];

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
  private timeline: GianDiepFeedItem[] = [];
  private feedSeq = 0;

  private readySkip = new Set<string>();
  private votes = new Map<string, string | 'skip'>();
  private defendants: string[] = [];
  private defendedIds = new Set<string>();
  private finalVotes = new Map<string, string>();
  private botChattedRound = new Set<string>();

  private mrWhiteId: string | null = null;
  private mrWhiteGuessed = false;

  private pendingResult: { winnerIds: string[]; headline: string } | null = null;
  private revealedAll: GianDiepRevealPlayer[] | null = null;
  private wordPairReveal: { wordA: string; wordB: string; winnerHeadline: string } | null = null;

  private finished = false;
  private readonly timer = new Timer();
  private readonly botReadyTimer = new Timer();

  constructor(private readonly ctx: EngineContext) {}

  private clearTimers(): void {
    this.timer.clear();
    this.botReadyTimer.clear();
  }

  private aliveConnected(): string[] {
    return [...this.alive].filter((id) => this.ctx.isBot?.(id) || this.ctx.isConnected(id));
  }

  private isChatAllowedPhase(): boolean {
    return this.phase === 'discussion' || this.phase === 'vote' || this.phase === 'final_vote';
  }

  canRoomChat(playerId: string): boolean {
    if (this.finished || this.phase === 'reveal_end') return true;
    if (!this.alive.has(playerId)) return false;
    return this.isChatAllowedPhase();
  }

  private msFor(p: GianDiepPhase): number {
    const def = DEFAULT_SEC[p] * 1000;
    return this.ctx.turnMs ? Math.min(def, Math.max(120, this.ctx.turnMs)) : def;
  }

  private seatTag(id: string): string {
    const idx = this.order.indexOf(id);
    const name = this.names.get(id) ?? id;
    return idx >= 0 ? `#${idx + 1} ${name}` : name;
  }

  private pushSystem(text: string): void {
    this.timeline.push({
      id: ++this.feedSeq,
      round: this.round,
      kind: 'system',
      text,
      at: Date.now(),
    });
    if (this.timeline.length > 160) this.timeline.shift();
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
    // Đảm bảo tối thiểu 2 Dân Thường (hoặc nhiều hơn) để ván đấu kéo dài nhiều vòng kịch tính
    const maxHidden = n <= 3 ? 1 : Math.max(1, Math.min(Math.floor(n / 2), n - 2));
    const wantWhite = (this.ctx.settings.giandiepMrWhite ?? (n >= 5)) && n >= 4;
    const whiteCount = wantWhite && maxHidden >= 2 ? 1 : 0;
    const requestedSpies = this.ctx.settings.giandiepSpies ?? (n >= 9 ? 3 : n >= 6 ? 2 : 1);
    const spyCount = Math.max(1, Math.min(requestedSpies, maxHidden - whiteCount));
    const danCount = Math.max(2, n - spyCount - whiteCount);

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

    this.pushSystem(
      `🕵️ Ván bắt đầu! Chủ đề: «${this.pair.category}» (${danCount} Dân · ${spyCount} Gián Điệp${whiteCount ? ' · 1 Mr. White' : ''}) — Loại hết Gián Điệp để thắng!`,
    );
    this.enterPhase('word_reveal', () => this.startRound());
    this.botReadyTimer.set(Math.min(2000, Math.floor(this.msFor('word_reveal') / 2)), () => {
      if (!this.finished && this.phase === 'word_reveal') this.ctx.changed();
    });
    this.ctx.changed();
  }

  private enterPhase(phase: GianDiepPhase, onTimeout: () => void): void {
    if (this.finished) return;
    this.clearTimers();
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
    this.defendants = [];
    this.defendedIds.clear();
    this.finalVotes.clear();
    this.botChattedRound.clear();
    this.pushSystem(`🔔 Vòng ${this.round} — Lần lượt từng người khai 1 câu mô tả (tạm khóa chat tới khi khai xong).`);
    this.beginSpeakerTurn();
  }

  private beginSpeakerTurn(): void {
    if (this.finished) return;
    while (this.speakerIdx < this.speakerOrder.length && !this.alive.has(this.speakerOrder[this.speakerIdx])) {
      this.speakerIdx++;
    }
    if (this.speakerIdx >= this.speakerOrder.length) {
      this.startClueSummary();
      return;
    }
    const speakerId = this.speakerOrder[this.speakerIdx];
    this.enterPhase('clue_turn', () => {
      const name = this.names.get(speakerId) ?? speakerId;
      const silentText = '🤐 (Im lặng hết giờ)';
      const now = Date.now();
      this.clues.push({
        id: ++this.clueSeq,
        round: this.round,
        playerId: speakerId,
        name,
        text: silentText,
        at: now,
      });
      this.timeline.push({
        id: ++this.feedSeq,
        round: this.round,
        kind: 'clue',
        playerId: speakerId,
        name,
        text: silentText,
        at: now,
      });
      this.speakerIdx++;
      this.beginSpeakerTurn();
    });
    this.ctx.changed();
  }

  private startClueSummary(): void {
    if (this.finished) return;
    this.readySkip.clear();
    this.pushSystem(`📋 Tổng hợp lời khai Vòng ${this.round} — Đối chiếu toàn bộ gợi ý trước khi thảo luận!`);
    this.enterPhase('clue_summary', () => this.startDiscussion());
    this.botReadyTimer.set(Math.min(2500, Math.floor(this.msFor('clue_summary') / 2)), () => {
      if (!this.finished && this.phase === 'clue_summary') this.ctx.changed();
    });
    this.ctx.changed();
  }

  private startDiscussion(): void {
    if (this.finished) return;
    this.readySkip.clear();
    this.pushSystem(`💬 Thảo luận Vòng ${this.round} — Đối chiếu lời khai ngay trong khung chat!`);
    this.enterPhase('discussion', () => this.startVote());
    this.botReadyTimer.set(Math.min(7200, Math.floor(this.msFor('discussion') * 0.6)), () => {
      if (!this.finished && this.phase === 'discussion') this.ctx.changed();
    });
    this.ctx.changed();
  }

  private startVote(): void {
    if (this.finished) return;
    this.votes.clear();
    this.pushSystem(`🗳️ Bỏ phiếu Vòng ${this.round} — Bảng chọn nghi phạm đã mở! Hãy chọn người đáng ngờ nhất.`);
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

    if (tally.size === 0) {
      this.pushSystem('🏳️ Không ai nhận phiếu bầu — chuyển sang vòng tiếp theo!');
      this.round++;
      this.startRound();
      return;
    }

    const max = Math.max(...tally.values());
    if (max <= skips) {
      this.pushSystem(`🏳️ Phiếu trắng áp đảo (${skips} phiếu) — không ai bị đưa lên biện minh!`);
      this.round++;
      this.startRound();
      return;
    }

    const top = [...tally.entries()]
      .filter(([, c]) => c === max)
      .map(([id]) => id)
      .slice(0, 3);

    this.defendants = top;
    this.defendedIds.clear();
    this.readySkip.clear();
    const names = top.map((id) => this.seatTag(id)).join(', ');
    this.pushSystem(`⚖️ ${names} bị nghi ngờ cao nhất (${max} phiếu) — bước vào Pha Biện Minh!`);
    this.enterPhase('defense', () => this.startFinalVote());
    this.botReadyTimer.set(Math.min(4700, Math.floor(this.msFor('defense') * 0.5)), () => {
      if (!this.finished && this.phase === 'defense') this.ctx.changed();
    });
    this.ctx.changed();
  }

  private startFinalVote(): void {
    if (this.finished) return;
    this.defendants = this.defendants.filter((id) => this.alive.has(id));
    if (this.defendants.length === 0) {
      this.round++;
      this.startRound();
      return;
    }
    this.finalVotes.clear();
    if (this.defendants.length === 1) {
      this.pushSystem(`🔨 Phán quyết cuối cùng: Trục xuất hay Tha bổng cho ${this.seatTag(this.defendants[0])}?`);
    } else {
      const names = this.defendants.map((id) => this.seatTag(id)).join(' vs ');
      this.pushSystem(`🔨 Bầu chung kết giữa các bị cáo đồng phiếu: ${names}!`);
    }
    this.enterPhase('final_vote', () => this.resolveFinalVote());
    this.ctx.changed();
  }

  private eligibleVerdictVoters(): string[] {
    const aliveList = [...this.alive];
    if (this.defendants.length === 1 && aliveList.length > 2) {
      return aliveList.filter((id) => id !== this.defendants[0]);
    }
    return aliveList;
  }

  private resolveFinalVote(): void {
    if (this.finished) return;
    let banished: string | null = null;

    if (this.defendants.length === 1) {
      const acc = this.defendants[0];
      if (this.alive.has(acc)) {
        let banishCount = 0;
        let forgiveCount = 0;
        for (const [voter, v] of this.finalVotes) {
          if (!this.alive.has(voter)) continue;
          if (v === 'banish') banishCount++;
          else if (v === 'forgive') forgiveCount++;
        }
        // Nếu người chơi bỏ phiếu Trục xuất >= Tha bổng (hoặc hết giờ không ai ấn Tha bổng khi đã bị vote cao nhất ở vòng trước)
        if (forgiveCount > banishCount) {
          this.pushSystem(`🕊️ Cả phòng quyết định THA BỔNG cho ${this.seatTag(acc)} (${forgiveCount} tha / ${banishCount} loại)!`);
        } else {
          banished = acc;
        }
      }
    } else {
      const tally = new Map<string, number>();
      let skips = 0;
      for (const [voter, v] of this.finalVotes) {
        if (!this.alive.has(voter)) continue;
        if (v === 'skip') skips++;
        else if (this.defendants.includes(v) && this.alive.has(v)) {
          tally.set(v, (tally.get(v) ?? 0) + 1);
        }
      }
      if (tally.size > 0) {
        const max = Math.max(...tally.values());
        const top = [...tally.entries()].filter(([, c]) => c === max).map(([id]) => id);
        if (top.length === 1 && max > skips) banished = top[0];
      }
      if (!banished) {
        this.pushSystem('⚖️ Phán quyết vẫn hòa phiếu — không ai bị trục xuất ở vòng này!');
      }
    }

    this.defendants = [];
    this.finalVotes.clear();

    if (!banished) {
      this.round++;
      this.startRound();
      return;
    }

    this.eliminatePlayer(banished);
  }

  private eliminatePlayer(chosen: string): void {
    const role = this.roles.get(chosen)!;
    const roleMeta = GIAN_DIEP_ROLE_META[role];
    this.alive.delete(chosen);
    this.eliminated.push({ id: chosen, role, round: this.round, word: this.words.get(chosen) ?? null });
    this.pushSystem(`💥 ${this.seatTag(chosen)} bị trục xuất — Thân phận: ${roleMeta.emoji} ${roleMeta.name}!`);

    if (role === 'mrwhite') {
      this.mrWhiteId = chosen;
      this.mrWhiteGuessed = false;
      this.pushSystem(`🤍 Mr. White ${this.seatTag(chosen)} có ${DEFAULT_SEC.mrwhite_guess} giây đoán từ khóa của Dân Thường để lật kèo!`);
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

    // Nếu Gián Điệp cuối cùng bị bắt khi phe Dân vẫn chưa lộ hết, cho Gián Điệp 15s phản đòn đoán từ khóa phe Dân!
    const remainingHidden = [...this.alive].filter((id) => this.roles.get(id) !== 'dan');
    if (role === 'giandiep' && remainingHidden.length === 0) {
      this.mrWhiteId = chosen;
      this.mrWhiteGuessed = false;
      this.pushSystem(`🕵️ Gián Điệp cuối cùng ${this.seatTag(chosen)} bị lộ! Có ${DEFAULT_SEC.spy_guess} giây phản đòn đoán đúng từ Dân Thường để lật kèo!`);
      this.enterPhase('spy_guess', () => {
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
    if (this.finished || this.phase === 'reveal_end') return true;
    const aliveIds = [...this.alive];
    const hiddenAlive = aliveIds.filter((id) => this.roles.get(id) !== 'dan');
    const danAlive = aliveIds.filter((id) => this.roles.get(id) === 'dan');

    if (hiddenAlive.length === 0) {
      const winners = this.order.filter((id) => this.roles.get(id) === 'dan');
      this.beginRevealEnd(winners, `🎉 Bắt gọn toàn bộ Gián Điệp! Dân Thường thắng (${this.danWord} / ${this.spyWord})`);
      return true;
    }

    // Luật Undercover nhiều vòng: Phe Gián Điệp chỉ thắng theo số lượng khi phe Dân chỉ còn tối đa 1 người sống sót!
    if (danAlive.length <= 1) {
      const winners = this.order.filter((id) => {
        const r = this.roles.get(id);
        return r === 'giandiep' || (r === 'mrwhite' && this.alive.has(id));
      });
      this.beginRevealEnd(winners, `🕵️ Gián Điệp trụ tới vòng cuối thành công! Phe Gián Điệp thắng (${this.spyWord} vs ${this.danWord})`);
      return true;
    }
    return false;
  }

  private beginRevealEnd(winnerIds: string[], headline: string): void {
    if (this.finished || this.pendingResult) return;
    this.pendingResult = { winnerIds, headline };
    this.readySkip.clear();
    this.revealedAll = this.order.map((id) => ({
      id,
      name: this.names.get(id) ?? id,
      role: this.roles.get(id)!,
      word: this.words.get(id) ?? null,
      alive: this.alive.has(id),
    }));
    this.wordPairReveal = {
      wordA: this.danWord,
      wordB: this.spyWord,
      winnerHeadline: headline,
    };
    this.pushSystem(`🔓 LẬT MỞ TỪ KHÓA: Dân Thường «${this.danWord}» · Gián Điệp «${this.spyWord}»!`);

    // Nếu không còn người thật nào đang kết nối trong phòng (vd chạy bot test hoặc chủ phòng thoát), kết thúc luôn
    const anyHumanAlive = this.order.some((id) => !this.ctx.isBot?.(id) && this.ctx.isConnected(id));
    if (!anyHumanAlive) {
      this.finalizeGame();
      return;
    }

    this.enterPhase('reveal_end', () => this.finalizeGame());
    this.ctx.changed();
  }

  private finalizeGame(): void {
    if (this.finished || !this.pendingResult) return;
    this.finished = true;
    this.clearTimers();
    const { winnerIds, headline } = this.pendingResult;
    const winSet = new Set(winnerIds);
    const sorted = [...this.order].sort((a, b) => (winSet.has(b) ? 1 : 0) - (winSet.has(a) ? 1 : 0));
    const ranking = sorted.map((id) => {
      const r = this.roles.get(id)!;
      const m = GIAN_DIEP_ROLE_META[r];
      const word = this.words.get(id) ?? 'Không có từ';
      return {
        playerId: id,
        name: this.names.get(id) ?? id,
        detail: `${m.emoji} ${m.name} («${word}») · ${winSet.has(id) ? '🏆 Thắng' : 'Thua'}`,
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
    const strippedText = stripAccents(cleanText);
    const strippedSecret = stripAccents(cleanSecret);
    if (strippedText.includes(strippedSecret)) return true;
    if (cleanSecret.includes(' ')) {
      const noSpaceSecret = strippedSecret.replace(/\s+/g, '');
      if (noSpaceSecret.length >= 3 && strippedText.replace(/\s+/g, '').includes(noSpaceSecret)) return true;
    }
    return false;
  }

  private checkPhaseAdvance(): boolean {
    if (this.finished) return true;
    if (this.phase === 'word_reveal') {
      const conn = this.aliveConnected();
      if (conn.length > 0 && conn.every((id) => this.readySkip.has(id))) {
        this.clearTimers();
        this.startRound();
        return true;
      }
      return false;
    }
    if (this.phase === 'clue_summary') {
      const conn = this.aliveConnected();
      if (this.readySkip.size >= Math.max(1, Math.ceil(conn.length / 2))) {
        this.clearTimers();
        this.startDiscussion();
        return true;
      }
      return false;
    }
    if (this.phase === 'discussion') {
      const conn = this.aliveConnected();
      if (this.readySkip.size >= Math.max(1, Math.ceil(conn.length / 2))) {
        this.clearTimers();
        this.startVote();
        return true;
      }
      return false;
    }
    if (this.phase === 'vote') {
      const conn = this.aliveConnected();
      if (conn.length > 0 && conn.every((id) => this.votes.has(id))) {
        this.clearTimers();
        this.resolveVote();
        return true;
      }
      return false;
    }
    if (this.phase === 'defense') {
      const activeDefs = this.defendants.filter(
        (id) => this.alive.has(id) && (this.ctx.isBot?.(id) || this.ctx.isConnected(id)),
      );
      if (activeDefs.length === 0 || activeDefs.every((id) => this.readySkip.has(id))) {
        this.clearTimers();
        this.startFinalVote();
        return true;
      }
      return false;
    }
    if (this.phase === 'final_vote') {
      const connVoters = this.eligibleVerdictVoters().filter((id) => this.ctx.isBot?.(id) || this.ctx.isConnected(id));
      if (connVoters.length > 0 && connVoters.every((id) => this.finalVotes.has(id))) {
        this.clearTimers();
        this.resolveFinalVote();
        return true;
      }
      return false;
    }
    return false;
  }

  action(playerId: string, action: GameAction): ActionResult {
    if (this.finished) return { ok: false, reason: 'not_playing' };
    if (action.type === 'end' && playerId === this.ctx.hostId()) {
      this.pendingResult = { winnerIds: [], headline: 'Ván đấu kết thúc sớm' };
      this.finalizeGame();
      return { ok: true };
    }

    const role = this.roles.get(playerId);
    if (!role) return { ok: false, reason: 'bad_action' };

    // Ở màn Lật Mở Từ Khóa cuối ván, bấm Tiếp tục sẽ sang ngay màn Tổng kết
    if (this.phase === 'reveal_end') {
      if (action.type === 'gd_ready') {
        this.finalizeGame();
        return { ok: true };
      }
      return { ok: false, reason: 'bad_action' };
    }

    if (action.type === 'gd_guess') {
      if ((this.phase !== 'mrwhite_guess' && this.phase !== 'spy_guess') || this.mrWhiteId !== playerId || this.mrWhiteGuessed) {
        return { ok: false, reason: 'not_your_turn' };
      }
      const guess = action.word.normalize('NFC').replace(/\s+/g, ' ').trim();
      if (!guess) return { ok: false, reason: 'bad_action' };
      this.mrWhiteGuessed = true;
      this.clearTimers();
      const matched =
        normPhrase(guess) === normPhrase(this.danWord) ||
        stripAccents(normPhrase(guess)) === stripAccents(normPhrase(this.danWord));
      const guiserLabel = role === 'mrwhite' ? '🤍 Mr. White' : '🕵️ Gián Điệp';
      if (matched) {
        this.beginRevealEnd(
          [playerId],
          `${guiserLabel} ${this.names.get(playerId)} đoán trúng "${this.danWord}" và LẬT KÈO THẮNG ĐỘC LẬP!`,
        );
      } else {
        this.pushSystem(`❌ ${guiserLabel} đoán «${guess}» — trật lất!`);
        this.mrWhiteId = null;
        if (!this.checkWin()) {
          this.round++;
          this.startRound();
        }
      }
      return { ok: true };
    }

    if (!this.alive.has(playerId)) return { ok: false, reason: 'bad_action' };

    // Chỉ cho chat trong pha Thảo luận / Vote / Phán quyết; khóa hoàn toàn khi Đang nhận từ hoặc Khai gợi ý
    if (action.type === 'gd_chat') {
      if (!this.isChatAllowedPhase()) return { ok: false, reason: 'not_your_turn' };
      const text = action.text.normalize('NFC').replace(/\s+/g, ' ').trim().slice(0, 120);
      if (!text) return { ok: false, reason: 'bad_action' };
      const myWord = this.words.get(playerId);
      if (this.containsSecretWord(text, myWord)) return { ok: false, reason: 'word_leaked' };
      this.timeline.push({
        id: ++this.feedSeq,
        round: this.round,
        kind: 'chat',
        playerId,
        name: this.names.get(playerId) ?? playerId,
        text,
        at: Date.now(),
      });
      if (this.timeline.length > 160) this.timeline.shift();
      this.ctx.changed();
      return { ok: true };
    }

    if (action.type === 'gd_clue') {
      const currentSpeaker = this.speakerOrder[this.speakerIdx];
      if (this.phase !== 'clue_turn' || currentSpeaker !== playerId) return { ok: false, reason: 'not_your_turn' };
      const text = action.text.normalize('NFC').replace(/\s+/g, ' ').trim().slice(0, 80);
      if (!text) return { ok: false, reason: 'bad_action' };
      const myWord = this.words.get(playerId);
      if (this.containsSecretWord(text, myWord)) return { ok: false, reason: 'word_leaked' };
      this.clearTimers();
      const name = this.names.get(playerId) ?? playerId;
      const now = Date.now();
      this.clues.push({
        id: ++this.clueSeq,
        round: this.round,
        playerId,
        name,
        text,
        at: now,
      });
      this.timeline.push({
        id: ++this.feedSeq,
        round: this.round,
        kind: 'clue',
        playerId,
        name,
        text,
        at: now,
      });
      this.speakerIdx++;
      this.beginSpeakerTurn();
      return { ok: true };
    }

    if (action.type === 'gd_defense') {
      if (this.phase !== 'defense' || !this.defendants.includes(playerId)) {
        return { ok: false, reason: 'not_your_turn' };
      }
      const text = action.text.normalize('NFC').replace(/\s+/g, ' ').trim().slice(0, 120);
      if (!text) return { ok: false, reason: 'bad_action' };
      const myWord = this.words.get(playerId);
      if (this.containsSecretWord(text, myWord)) return { ok: false, reason: 'word_leaked' };
      this.defendedIds.add(playerId);
      this.timeline.push({
        id: ++this.feedSeq,
        round: this.round,
        kind: 'defense',
        playerId,
        name: this.names.get(playerId) ?? playerId,
        text,
        at: Date.now(),
      });
      if (!this.checkPhaseAdvance()) this.ctx.changed();
      return { ok: true };
    }

    if (action.type === 'gd_ready') {
      if (this.phase === 'word_reveal' || this.phase === 'clue_summary' || this.phase === 'discussion') {
        this.readySkip.add(playerId);
        if (!this.checkPhaseAdvance()) this.ctx.changed();
        return { ok: true };
      }
      if (this.phase === 'defense' && this.defendants.includes(playerId)) {
        this.readySkip.add(playerId);
        this.defendedIds.add(playerId);
        if (!this.checkPhaseAdvance()) this.ctx.changed();
        return { ok: true };
      }
      return { ok: false, reason: 'bad_action' };
    }

    if (action.type === 'gd_vote') {
      if (this.phase !== 'vote') return { ok: false, reason: 'bad_action' };
      if (action.target !== 'skip' && (!this.alive.has(action.target) || action.target === playerId)) {
        return { ok: false, reason: 'bad_action' };
      }
      this.votes.set(playerId, action.target);
      if (!this.checkPhaseAdvance()) this.ctx.changed();
      return { ok: true };
    }

    if (action.type === 'gd_verdict') {
      if (this.phase !== 'final_vote') return { ok: false, reason: 'bad_action' };
      const voters = this.eligibleVerdictVoters();
      if (!voters.includes(playerId)) return { ok: false, reason: 'not_your_turn' };

      if (this.defendants.length === 1) {
        if (action.verdict !== 'banish' && action.verdict !== 'forgive') {
          return { ok: false, reason: 'bad_action' };
        }
      } else {
        if (action.verdict !== 'skip' && (!this.defendants.includes(action.verdict) || action.verdict === playerId)) {
          return { ok: false, reason: 'bad_action' };
        }
      }

      this.finalVotes.set(playerId, action.verdict);
      if (!this.checkPhaseAdvance()) this.ctx.changed();
      return { ok: true };
    }

    return { ok: false, reason: 'bad_action' };
  }

  removePlayer(playerId: string): void {
    if (this.finished) return;
    if (this.phase === 'reveal_end') {
      const anyHumanAlive = this.order.some((id) => id !== playerId && !this.ctx.isBot?.(id) && this.ctx.isConnected(id));
      if (!anyHumanAlive) this.finalizeGame();
      return;
    }
    if ((this.phase === 'mrwhite_guess' || this.phase === 'spy_guess') && this.mrWhiteId === playerId) {
      this.clearTimers();
      this.mrWhiteId = null;
      if (!this.checkWin()) {
        this.round++;
        this.startRound();
      }
      return;
    }
    if (!this.alive.has(playerId)) return;
    this.alive.delete(playerId);
    this.votes.delete(playerId);
    this.finalVotes.delete(playerId);
    this.readySkip.delete(playerId);
    this.defendedIds.delete(playerId);
    for (const [v, t] of [...this.votes]) if (t === playerId) this.votes.delete(v);
    for (const [v, t] of [...this.finalVotes]) if (t === playerId) this.finalVotes.delete(v);

    const role = this.roles.get(playerId)!;
    this.eliminated.push({ id: playerId, role, round: this.round, word: this.words.get(playerId) ?? null });
    if (this.checkWin()) return;
    if (this.phase === 'clue_turn' && this.speakerOrder[this.speakerIdx] === playerId) {
      this.clearTimers();
      this.speakerIdx++;
      this.beginSpeakerTurn();
      return;
    }
    if (this.phase === 'defense' || this.phase === 'final_vote') {
      this.defendants = this.defendants.filter((id) => id !== playerId);
      if (this.defendants.length === 0) {
        this.clearTimers();
        this.round++;
        this.startRound();
        return;
      }
    }
    if (this.checkPhaseAdvance()) return;
    this.ctx.changed();
  }

  onPlayerConnection(_playerId: string, connected: boolean): void {
    if (this.finished) return;
    if (!connected && this.checkPhaseAdvance()) return;
    if (connected) this.ctx.changed();
  }

  renamePlayer(playerId: string, name: string): void {
    if (this.names.has(playerId)) this.names.set(playerId, name);
  }

  botAction(playerId: string): GameAction | null {
    if (this.finished || this.phase === 'reveal_end') return null;

    if ((this.phase === 'mrwhite_guess' || this.phase === 'spy_guess') && this.mrWhiteId === playerId && !this.mrWhiteGuessed) {
      const guess = this.ctx.rng() < 0.25 ? this.danWord : this.spyWord;
      return { type: 'gd_guess', word: guess };
    }
    if (!this.alive.has(playerId)) return null;
    const role = this.roles.get(playerId);

    if (this.phase === 'word_reveal') {
      if (!this.readySkip.has(playerId)) {
        const aliveHumans = [...this.alive].filter((id) => !this.ctx.isBot?.(id));
        const waitMs = Math.min(1_800, Math.floor(this.msFor('word_reveal') * 0.45));
        if (aliveHumans.length === 0 || Date.now() - this.phaseStartedAt >= waitMs) {
          return { type: 'gd_ready' };
        }
      }
      return null;
    }

    if (this.phase === 'clue_turn' && this.speakerOrder[this.speakerIdx] === playerId) {
      const usedTexts = new Set(this.clues.map((c) => c.text));
      const myWord = this.words.get(playerId);
      const rawPool =
        role === 'mrwhite'
          ? MR_WHITE_GENERIC_CLUES
          : myWord === this.pair.wordA
            ? this.pair.cluesA
            : this.pair.cluesB;
      const safePool = rawPool.filter((t) => !this.containsSecretWord(t, myWord));
      const pool = safePool.length ? safePool : ['Khá quen thuộc trong đời sống'];
      const fresh = pool.filter((t) => !usedTexts.has(t));
      const pick = (fresh.length ? fresh : pool)[Math.floor(this.ctx.rng() * (fresh.length || pool.length))] ?? 'Khá quen thuộc trong đời sống';
      return { type: 'gd_clue', text: pick };
    }

    if (this.phase === 'clue_summary') {
      if (!this.readySkip.has(playerId)) {
        const aliveHumans = [...this.alive].filter((id) => !this.ctx.isBot?.(id));
        const waitMs = Math.min(2_400, Math.floor(this.msFor('clue_summary') * 0.45));
        if (aliveHumans.length === 0 || Date.now() - this.phaseStartedAt >= waitMs) {
          return { type: 'gd_ready' };
        }
      }
      return null;
    }

    if (this.phase === 'discussion') {
      if (!this.botChattedRound.has(playerId) && this.ctx.rng() < 0.35) {
        this.botChattedRound.add(playerId);
        const line = BOT_CHAT_LINES[Math.floor(this.ctx.rng() * BOT_CHAT_LINES.length)];
        return { type: 'gd_chat', text: line };
      }
      if (!this.readySkip.has(playerId)) {
        const aliveHumans = [...this.alive].filter((id) => !this.ctx.isBot?.(id));
        const waitMs = Math.min(7_000, Math.floor(this.msFor('discussion') * 0.5));
        if (aliveHumans.length === 0 || Date.now() - this.phaseStartedAt >= waitMs) {
          return { type: 'gd_ready' };
        }
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

    if (this.phase === 'defense' && this.defendants.includes(playerId)) {
      if (!this.defendedIds.has(playerId)) {
        const line = BOT_DEFENSE_LINES[Math.floor(this.ctx.rng() * BOT_DEFENSE_LINES.length)];
        return { type: 'gd_defense', text: line };
      }
      if (!this.readySkip.has(playerId)) {
        const aliveHumans = [...this.alive].filter((id) => !this.ctx.isBot?.(id));
        const waitMs = Math.min(4_500, Math.floor(this.msFor('defense') * 0.45));
        if (aliveHumans.length === 0 || Date.now() - this.phaseStartedAt >= waitMs) {
          return { type: 'gd_ready' };
        }
      }
      return null;
    }

    if (this.phase === 'final_vote' && !this.finalVotes.has(playerId)) {
      const voters = this.eligibleVerdictVoters();
      if (!voters.includes(playerId)) return null;
      if (this.defendants.length === 1) {
        const acc = this.defendants[0];
        if (role === 'giandiep' && this.roles.get(acc) === 'giandiep') {
          return { type: 'gd_verdict', verdict: 'forgive' };
        }
        return { type: 'gd_verdict', verdict: this.ctx.rng() < 0.78 ? 'banish' : 'forgive' };
      }
      const choices = this.defendants.filter((id) => id !== playerId && !(role === 'giandiep' && this.roles.get(id) === 'giandiep'));
      if (choices.length === 0) return { type: 'gd_verdict', verdict: 'skip' };
      return { type: 'gd_verdict', verdict: choices[Math.floor(this.ctx.rng() * choices.length) % choices.length] };
    }

    return null;
  }

  view(viewerId?: string): GianDiepView {
    const myRole = viewerId ? (this.roles.get(viewerId) ?? null) : null;
    const myWord = viewerId && myRole ? (this.words.get(viewerId) ?? null) : null;
    const roleSummary = { dan: 0, giandiep: 0, mrwhite: 0 };
    for (const r of this.roles.values()) {
      roleSummary[r]++;
    }
    const aliveCounts = { dan: 0, hidden: 0 };
    for (const id of this.alive) {
      if (this.roles.get(id) === 'dan') aliveCounts.dan++;
      else aliveCounts.hidden++;
    }
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
      timeline: [...this.timeline],
      readySkip: [...this.readySkip],
      votes: Object.fromEntries(this.votes),
      defendants: [...this.defendants],
      finalVotes: Object.fromEntries(this.finalVotes),
      mrWhiteId: (this.phase === 'mrwhite_guess' || this.phase === 'spy_guess') ? this.mrWhiteId : null,
      roleSummary,
      aliveCounts,
      revealedAll: this.phase === 'reveal_end' ? this.revealedAll : null,
      wordPairReveal: this.phase === 'reveal_end' ? this.wordPairReveal : null,
      myRole,
      myWord,
    };
  }

  dispose(): void {
    this.clearTimers();
  }
}
