import {
  MASOI_PHASE_SECONDS, MASOI_ROLES, buildMaSoiDeck,
  type MaSoiDeadEntry, type MaSoiLogItem, type MaSoiPhase, type MaSoiRole, type MaSoiSpeed, type MaSoiView,
} from '../../../shared/src/masoi';
import type { ActionResult, GameAction } from '../../../shared/src/types';
import { Timer, type EngineContext, type EnginePlayer, type GameEngine } from './engine';

// Đã thay bằng MASOI_PHASE_SECONDS theo tốc độ phòng (slow / normal / fast)

export class MaSoiGame implements GameEngine {
  readonly perPlayerView = true;

  private order: string[] = [];
  private names = new Map<string, string>();
  private roles = new Map<string, MaSoiRole>();
  private alive = new Set<string>();
  private dead: MaSoiDeadEntry[] = [];
  private lovers = new Set<string>();
  private day = 1;
  private phase: MaSoiPhase = 'role_reveal';
  private phaseEndsAt: number | null = null;
  private phaseSeconds = 12;
  private phaseStartedAt = 0;

  private guardLastId: string | null = null;
  private guardTarget: string | null = null;
  private wolfVotes = new Map<string, string>();
  private wolfChat: { id: number; from: string; name: string; text: string }[] = [];
  private wolfChatSeq = 0;
  private seerDoneNight = false;
  private seerHistory: { day: number; targetId: string; isWolf: boolean }[] = [];
  private detectiveDoneNight = false;
  private detectiveHistory: { day: number; a: string; b: string; sameTeam: boolean }[] = [];
  private guardDoneNight = false;
  private cupidDone = false;

  private healLeft = true;
  private poisonLeft = true;
  private nightWolfVictim: string | null = null;
  private witchSaved = false;
  private witchPoisonTarget: string | null = null;
  private witchDoneNight = false;

  private hunterQueue: string[] = [];
  private hunterFired = new Set<string>();
  private pendingAfterHunter: 'day' | 'night' = 'day';

  private dayVotes = new Map<string, string | 'skip'>();
  private readySkip = new Set<string>();
  private publicLog: MaSoiLogItem[] = [];
  private logSeq = 0;
  private roleCounts: Partial<Record<MaSoiRole, number>> = {};
  private finished = false;
  private readonly timer = new Timer();
  private readonly botReadyTimer = new Timer();

  constructor(private readonly ctx: EngineContext) {}

  canRoomChat(playerId: string): boolean {
    if (this.finished) return true;
    if (!this.alive.has(playerId)) return false;
    if (this.phase === 'night_cupid' || this.phase === 'night_active' || this.phase === 'night_witch') {
      return false;
    }
    return true;
  }

  private speed(): MaSoiSpeed {
    const s = this.ctx.settings.masoiSpeed;
    return s === 'slow' || s === 'fast' ? s : 'normal';
  }

  private msFor(p: MaSoiPhase): number {
    const table = MASOI_PHASE_SECONDS[this.speed()] ?? MASOI_PHASE_SECONDS.normal;
    const def = (table[p] ?? 25) * 1000;
    return this.ctx.turnMs ? Math.min(def, Math.max(400, this.ctx.turnMs)) : def;
  }

  private addLog(kind: MaSoiLogItem['kind'], text: string): void {
    this.publicLog.push({ id: ++this.logSeq, day: this.day, kind, text, at: Date.now() });
    if (this.publicLog.length > 60) this.publicLog.shift();
  }

  start(players: EnginePlayer[]): void {
    this.order = players.map((p) => p.id);
    this.readySkip.clear();
    for (const p of players) {
      this.names.set(p.id, p.name);
      this.alive.add(p.id);
    }
    const deck = buildMaSoiDeck(players.length, this.ctx.settings.masoiPreset ?? 'classic');
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(this.ctx.rng() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    this.roleCounts = {};
    this.order.forEach((id, i) => {
      const r = deck[i];
      this.roles.set(id, r);
      this.roleCounts[r] = (this.roleCounts[r] ?? 0) + 1;
    });
    this.addLog('system', `🌙 Ngôi làng có ${players.length} cư dân bước vào màn đêm đầu tiên...`);
    this.enterPhase('role_reveal', () => this.startNight());
  }

  private enterPhase(phase: MaSoiPhase, onTimeout: () => void): void {
    if (this.finished) return;
    this.botReadyTimer.clear();
    this.phase = phase;
    const ms = this.msFor(phase);
    this.phaseSeconds = Math.max(1, Math.round(ms / 1000));
    this.phaseStartedAt = Date.now();
    this.phaseEndsAt = this.phaseStartedAt + ms;
    this.timer.set(ms, onTimeout);
  }

  private aliveWithRole(r: MaSoiRole): string[] {
    return this.order.filter((id) => this.alive.has(id) && this.roles.get(id) === r);
  }

  private isConnectedAlive(id: string): boolean {
    return this.alive.has(id) && (this.ctx.isBot?.(id) || this.ctx.isConnected(id));
  }

  private startNight(): void {
    if (this.finished) return;
    this.readySkip.clear();
    this.guardTarget = null;
    this.wolfVotes.clear();
    this.seerDoneNight = false;
    this.detectiveDoneNight = false;
    this.guardDoneNight = false;
    this.nightWolfVictim = null;
    this.witchSaved = false;
    this.witchPoisonTarget = null;
    this.witchDoneNight = false;

    const cupids = this.day === 1 && !this.cupidDone ? this.aliveWithRole('cupid') : [];
    if (cupids.length > 0 && this.isConnectedAlive(cupids[0])) {
      this.enterPhase('night_cupid', () => this.finishCupidAuto());
      this.ctx.changed();
      return;
    }
    this.startActiveNight();
  }

  private finishCupidAuto(): void {
    if (!this.cupidDone && this.alive.size >= 2) {
      const list = [...this.alive];
      const a = list[Math.floor(this.ctx.rng() * list.length) % list.length];
      const rest = list.filter((x) => x !== a);
      const b = rest[Math.floor(this.ctx.rng() * rest.length) % rest.length];
      if (a && b) {
        this.lovers.add(a);
        this.lovers.add(b);
        this.cupidDone = true;
        this.addLog('system', '💘 Thần Tình Yêu đã se duyên cho một cặp đôi bí mật!');
      }
    }
    this.startActiveNight();
  }

  private startActiveNight(): void {
    if (this.finished) return;
    this.enterPhase('night_active', () => this.moveToWitchOrDawn());
    this.ctx.changed();
  }

  private checkActiveNightReady(): void {
    if (this.phase !== 'night_active') return;
    const wolves = this.aliveWithRole('soi').filter((id) => this.isConnectedAlive(id));
    const wolfTargets = wolves
      .map((id) => this.wolfVotes.get(id))
      .filter((t): t is string => !!t && this.alive.has(t));
    // Khi có >= 2 Sói cùng thức: chỉ qua đêm sớm khi cả bầy đã vote VÀ đồng thuận cùng 1 mục tiêu!
    const wolvesReady = wolves.length === 0 || (wolfTargets.length === wolves.length && new Set(wolfTargets).size === 1);
    const seer = this.aliveWithRole('tientri').filter((id) => this.isConnectedAlive(id));
    const seerReady = seer.length === 0 || this.seerDoneNight;
    const guard = this.aliveWithRole('baove').filter((id) => this.isConnectedAlive(id));
    const guardReady = guard.length === 0 || this.guardDoneNight;
    const det = this.aliveWithRole('thamtu').filter((id) => this.isConnectedAlive(id));
    const detReady = det.length === 0 || this.detectiveDoneNight;
    if (wolvesReady && seerReady && guardReady && detReady) {
      this.timer.clear();
      this.moveToWitchOrDawn();
    }
  }

  private computeWolfTarget(): string | null {
    const counts = new Map<string, number>();
    for (const [wolfId, targetId] of this.wolfVotes) {
      if (!this.alive.has(wolfId) || !this.alive.has(targetId)) continue;
      counts.set(targetId, (counts.get(targetId) ?? 0) + 1);
    }
    if (counts.size === 0) return null;
    const max = Math.max(...counts.values());
    const top = [...counts.entries()].filter(([, c]) => c === max).map(([id]) => id);
    return top[Math.floor(this.ctx.rng() * top.length) % top.length] ?? null;
  }

  private moveToWitchOrDawn(): void {
    if (this.finished) return;
    const rawTarget = this.computeWolfTarget();
    this.nightWolfVictim = rawTarget && rawTarget !== this.guardTarget ? rawTarget : null;
    const witches = this.aliveWithRole('phuthuy').filter((id) => this.isConnectedAlive(id));
    if (witches.length > 0 && (this.healLeft || this.poisonLeft)) {
      this.enterPhase('night_witch', () => this.resolveDawn());
      this.ctx.changed();
      return;
    }
    this.resolveDawn();
  }

  private killPlayer(id: string, reason: string, applyLovers = true): void {
    if (!this.alive.has(id)) return;
    this.alive.delete(id);
    const role = this.roles.get(id);
    this.dead.push({ id, reason, day: this.day, revealedRole: role });
    if (role === 'thosan' && !this.hunterFired.has(id)) {
      this.hunterQueue.push(id);
    }
    if (applyLovers && this.lovers.has(id)) {
      for (const other of this.lovers) {
        if (other !== id && this.alive.has(other)) {
          this.addLog('dawn', `💔 ${this.names.get(other)} chết theo người thương ${this.names.get(id)}!`);
          this.killPlayer(other, `chết theo người yêu (${this.names.get(id)})`, false);
        }
      }
    }
  }

  private resolveDawn(): void {
    if (this.finished) return;
    this.wolfVotes.clear();
    this.guardLastId = this.guardTarget;
    const deaths: { id: string; reason: string }[] = [];
    if (this.nightWolfVictim && !this.witchSaved && this.alive.has(this.nightWolfVictim)) {
      deaths.push({ id: this.nightWolfVictim, reason: 'bị Ma Sói cắn trong đêm' });
    }
    if (this.witchPoisonTarget && this.alive.has(this.witchPoisonTarget)) {
      if (!deaths.some((d) => d.id === this.witchPoisonTarget)) {
        deaths.push({ id: this.witchPoisonTarget, reason: 'bị Phù Thủy đầu độc' });
      }
    }
    if (deaths.length === 0) {
      this.addLog('dawn', `☀️ Bình minh ngày ${this.day}: Đêm qua thật yên bình, không ai mất mạng!`);
    } else {
      const names = deaths.map((d) => `${this.names.get(d.id)} (${MASOI_ROLES[this.roles.get(d.id)!].emoji} ${MASOI_ROLES[this.roles.get(d.id)!].name})`).join(', ');
      this.addLog('dawn', `☀️ Bình minh ngày ${this.day}: ${names} đã tử nạn đêm qua!`);
      for (const d of deaths) this.killPlayer(d.id, d.reason);
    }

    this.pendingAfterHunter = 'day';
    if (this.triggerHunterOrCheckWin()) return;
    this.startDayDiscuss();
  }

  private triggerHunterOrCheckWin(): boolean {
    while (this.hunterQueue.length > 0) {
      const hid = this.hunterQueue[0];
      if (!this.hunterFired.has(hid) && (this.ctx.isBot?.(hid) || this.ctx.isConnected(hid)) && this.alive.size > 0) {
        this.addLog('hunter', `🏹 Thợ Săn ${this.names.get(hid)} rút súng ngắm bắn phát cuối cùng!`);
        this.enterPhase('hunter_shot', () => {
          this.hunterFired.add(hid);
          this.hunterQueue.shift();
          if (!this.triggerHunterOrCheckWin()) {
            if (this.pendingAfterHunter === 'day') this.startDayDiscuss();
            else { this.day++; this.startNight(); }
          }
        });
        this.ctx.changed();
        return true;
      }
      this.hunterFired.add(hid);
      this.hunterQueue.shift();
    }
    return this.checkWin();
  }

  private startDayDiscuss(): void {
    if (this.finished) return;
    this.readySkip.clear();
    this.dayVotes.clear();
    this.enterPhase('day_discuss', () => this.startDayVote());
    const botDelayMs = Math.min(10_000, Math.max(400, Math.floor(this.msFor('day_discuss') * 0.35)));
    this.botReadyTimer.set(botDelayMs, () => {
      if (!this.finished && this.phase === 'day_discuss') this.ctx.changed();
    });
    this.ctx.changed();
  }

  private checkPhaseAdvance(): void {
    if (this.finished) return;
    if (this.phase === 'role_reveal') {
      const aliveConn = [...this.alive].filter((id) => this.isConnectedAlive(id));
      if (aliveConn.length > 0 && aliveConn.every((id) => this.readySkip.has(id))) {
        this.timer.clear();
        this.startNight();
      }
      return;
    }
    if (this.phase === 'night_cupid') {
      const cupids = this.aliveWithRole('cupid').filter((id) => this.isConnectedAlive(id));
      if (this.cupidDone || cupids.length === 0) {
        this.timer.clear();
        this.finishCupidAuto();
      }
      return;
    }
    if (this.phase === 'night_active') {
      this.checkActiveNightReady();
      return;
    }
    if (this.phase === 'night_witch') {
      const witches = this.aliveWithRole('phuthuy').filter((id) => this.isConnectedAlive(id));
      if (this.witchDoneNight || witches.length === 0) {
        this.timer.clear();
        this.resolveDawn();
      }
      return;
    }
    if (this.phase === 'hunter_shot') {
      const hid = this.hunterQueue[0];
      if (!hid || !(this.ctx.isBot?.(hid) || this.ctx.isConnected(hid))) {
        this.timer.clear();
        if (hid) {
          this.hunterFired.add(hid);
          this.hunterQueue.shift();
        }
        if (!this.triggerHunterOrCheckWin()) {
          if (this.pendingAfterHunter === 'day') this.startDayDiscuss();
          else { this.day++; this.startNight(); }
        }
      }
      return;
    }
    if (this.phase === 'day_discuss') {
      const aliveConn = [...this.alive].filter((id) => this.isConnectedAlive(id));
      const readyCount = aliveConn.filter((id) => this.readySkip.has(id)).length;
      if (aliveConn.length > 0 && readyCount >= Math.max(1, Math.ceil(aliveConn.length / 2))) {
        this.timer.clear();
        this.startDayVote();
      }
      return;
    }
    if (this.phase === 'day_vote') {
      const aliveConn = [...this.alive].filter((id) => this.isConnectedAlive(id));
      if (aliveConn.length > 0 && aliveConn.every((id) => this.dayVotes.has(id))) {
        this.timer.clear();
        this.resolveDayVote();
      }
    }
  }

  private startDayVote(): void {
    if (this.finished) return;
    this.dayVotes.clear();
    this.enterPhase('day_vote', () => this.resolveDayVote());
    this.ctx.changed();
  }

  private resolveDayVote(): void {
    if (this.finished) return;
    const tally = new Map<string, number>();
    let skips = 0;
    for (const [voter, target] of this.dayVotes) {
      if (!this.alive.has(voter)) continue;
      if (target === 'skip') skips++;
      else if (this.alive.has(target)) tally.set(target, (tally.get(target) ?? 0) + 1);
    }
    let executed: string | null = null;
    if (tally.size > 0) {
      const max = Math.max(...tally.values());
      const top = [...tally.entries()].filter(([, c]) => c === max).map(([id]) => id);
      if (top.length === 1 && max > skips) executed = top[0];
    }

    if (!executed) {
      this.addLog('vote', `⚖️ Kết thúc bỏ phiếu ngày ${this.day}: Không đủ phiếu hoặc hòa nhau, không ai bị treo cổ.`);
    } else {
      const role = this.roles.get(executed)!;
      const meta = MASOI_ROLES[role];
      this.addLog('vote', `⚖️ Dân làng quyết định treo cổ ${this.names.get(executed)} (${meta.emoji} ${meta.name})!`);
      if (role === 'kengo') {
        this.killPlayer(executed, 'bị treo cổ (Kẻ Ngố thắng!)');
        this.finishGame('solo_jester', [executed], `🤡 Kẻ Ngố ${this.names.get(executed)} lừa cả làng treo cổ mình và THẮNG ĐỘC LẬP!`);
        return;
      }
      this.killPlayer(executed, 'bị dân làng treo cổ');
      this.pendingAfterHunter = 'night';
      if (this.triggerHunterOrCheckWin()) return;
    }

    if (this.checkWin()) return;
    this.day++;
    this.startNight();
  }

  private checkWin(): boolean {
    if (this.finished) return true;
    const aliveIds = [...this.alive];
    const wolvesAlive = aliveIds.filter((id) => this.roles.get(id) === 'soi').length;
    const nonWolvesAlive = aliveIds.length - wolvesAlive;

    // 1. Cặp đôi khác phe sống sót tới Top 2
    if (aliveIds.length === 2 && this.lovers.size === 2 && aliveIds.every((id) => this.lovers.has(id))) {
      const loverRoles = aliveIds.map((id) => this.roles.get(id));
      if (loverRoles.includes('soi') && loverRoles.some((r) => r !== 'soi')) {
        const lNames = aliveIds.map((id) => this.names.get(id)).join(' & ');
        this.finishGame('lovers', aliveIds, `💘 Cặp Đôi Định Mệnh ${lNames} vượt qua tất cả để chiến thắng!`);
        return true;
      }
    }

    // 2. Sói chết hết -> Phe Dân thắng
    if (wolvesAlive === 0) {
      const winners = this.order.filter((id) => {
        const r = this.roles.get(id);
        return r !== 'soi' && r !== 'kengo';
      });
      this.finishGame('dan', winners, '🎉 Toàn bộ Ma Sói đã bị tiêu diệt! Phe Dân Làng chiến thắng!');
      return true;
    }

    // 3. Sói >= Dân -> Phe Sói thắng
    if (wolvesAlive >= nonWolvesAlive) {
      const winners = this.order.filter((id) => this.roles.get(id) === 'soi');
      this.finishGame('soi', winners, '🐺 Bầy Ma Sói đã áp đảo ngôi làng! Phe Ma Sói chiến thắng!');
      return true;
    }

    return false;
  }

  private finishGame(reason: 'dan' | 'soi' | 'solo_jester' | 'lovers', winnerIds: string[], headline: string): void {
    if (this.finished) return;
    this.finished = true;
    this.timer.clear();
    this.botReadyTimer.clear();
    const winSet = new Set(winnerIds);
    const sorted = [...this.order].sort((a, b) => {
      const wa = winSet.has(a) ? 1 : 0;
      const wb = winSet.has(b) ? 1 : 0;
      if (wa !== wb) return wb - wa;
      const aa = this.alive.has(a) ? 1 : 0;
      const ab = this.alive.has(b) ? 1 : 0;
      return ab - aa;
    });
    const ranking = sorted.map((id) => {
      const r = this.roles.get(id)!;
      const m = MASOI_ROLES[r];
      const status = this.alive.has(id) ? 'Sống sót' : 'Đã hy sinh';
      const tag = winSet.has(id) ? '🏆 Thắng' : 'Thua';
      return {
        playerId: id,
        name: this.names.get(id) ?? id,
        detail: `${m.emoji} ${m.name} · ${status} · ${tag}${this.lovers.has(id) ? ' 💘' : ''}`,
      };
    });
    void reason;
    this.ctx.finish({
      winnerId: winnerIds[0] ?? null,
      winnerIds,
      ranking,
      headline,
    });
  }

  action(playerId: string, action: GameAction): ActionResult {
    if (this.finished) return { ok: false, reason: 'not_playing' };
    const role = this.roles.get(playerId);
    if (!role) return { ok: false, reason: 'bad_action' };

    if (action.type === 'ms_wolfChat') {
      if (role !== 'soi' || !this.alive.has(playerId)) return { ok: false, reason: 'bad_action' };
      const text = action.text.normalize('NFC').replace(/\s+/g, ' ').trim().slice(0, 120);
      if (!text) return { ok: false, reason: 'bad_action' };
      this.wolfChat.push({ id: ++this.wolfChatSeq, from: playerId, name: this.names.get(playerId) ?? 'Sói', text });
      if (this.wolfChat.length > 40) this.wolfChat.shift();
      this.ctx.changed();
      return { ok: true };
    }

    if (action.type === 'ms_hunter') {
      if (this.phase !== 'hunter_shot' || this.hunterQueue[0] !== playerId) return { ok: false, reason: 'not_your_turn' };
      const hid = playerId;
      this.timer.clear();
      this.hunterFired.add(hid);
      this.hunterQueue.shift();
      if (action.target !== 'skip' && this.alive.has(action.target) && action.target !== hid) {
        const targetRole = this.roles.get(action.target)!;
        this.addLog('hunter', `💥 Thợ Săn ${this.names.get(hid)} bắn gục ${this.names.get(action.target)} (${MASOI_ROLES[targetRole].emoji} ${MASOI_ROLES[targetRole].name})!`);
        this.killPlayer(action.target, `bị Thợ Săn ${this.names.get(hid)} bắn kéo theo`);
      } else {
        this.addLog('hunter', `🏹 Thợ Săn ${this.names.get(hid)} cất súng, không bắn ai.`);
      }
      if (!this.triggerHunterOrCheckWin()) {
        if (this.pendingAfterHunter === 'day') this.startDayDiscuss();
        else { this.day++; this.startNight(); }
      }
      return { ok: true };
    }

    if (!this.alive.has(playerId)) return { ok: false, reason: 'bad_action' };

    if (action.type === 'ms_night') {
      if (this.phase === 'night_cupid') {
        if (role !== 'cupid' || this.cupidDone) return { ok: false, reason: 'not_your_turn' };
        const a = action.target;
        const b = action.target2;
        if (!a || !b || a === b || !this.alive.has(a) || !this.alive.has(b)) return { ok: false, reason: 'bad_action' };
        this.lovers.add(a);
        this.lovers.add(b);
        this.cupidDone = true;
        this.addLog('system', '💘 Thần Tình Yêu đã nối dây tơ hồng cho hai người!');
        this.timer.clear();
        this.startActiveNight();
        return { ok: true };
      }

      if (this.phase === 'night_active') {
        if (role === 'soi') {
          if (!action.target || !this.alive.has(action.target) || this.roles.get(action.target) === 'soi') {
            return { ok: false, reason: 'bad_action' };
          }
          this.wolfVotes.set(playerId, action.target);
          this.ctx.changed();
          this.checkActiveNightReady();
          return { ok: true };
        }
        if (role === 'tientri') {
          if (this.seerDoneNight || !action.target || action.target === playerId || !this.alive.has(action.target)) return { ok: false, reason: 'bad_action' };
          this.seerDoneNight = true;
          this.seerHistory.push({ day: this.day, targetId: action.target, isWolf: this.roles.get(action.target) === 'soi' });
          this.ctx.changed();
          this.checkActiveNightReady();
          return { ok: true };
        }
        if (role === 'baove') {
          if (this.guardDoneNight || !action.target || !this.alive.has(action.target) || action.target === this.guardLastId) {
            return { ok: false, reason: 'bad_action' };
          }
          this.guardTarget = action.target;
          this.guardDoneNight = true;
          this.ctx.changed();
          this.checkActiveNightReady();
          return { ok: true };
        }
        if (role === 'thamtu') {
          const a = action.target;
          const b = action.target2;
          if (this.detectiveDoneNight || !a || !b || a === b || !this.alive.has(a) || !this.alive.has(b)) {
            return { ok: false, reason: 'bad_action' };
          }
          this.detectiveDoneNight = true;
          const sameTeam = (this.roles.get(a) === 'soi') === (this.roles.get(b) === 'soi');
          this.detectiveHistory.push({ day: this.day, a, b, sameTeam });
          this.ctx.changed();
          this.checkActiveNightReady();
          return { ok: true };
        }
        return { ok: false, reason: 'bad_action' };
      }

      if (this.phase === 'night_witch') {
        if (role !== 'phuthuy' || this.witchDoneNight) return { ok: false, reason: 'not_your_turn' };
        if (action.save) {
          if (!this.healLeft || !this.nightWolfVictim) return { ok: false, reason: 'bad_action' };
          this.healLeft = false;
          this.witchSaved = true;
        }
        if (action.poison) {
          if (!this.poisonLeft || !this.alive.has(action.poison) || action.poison === playerId) {
            return { ok: false, reason: 'bad_action' };
          }
          this.poisonLeft = false;
          this.witchPoisonTarget = action.poison;
        }
        this.witchDoneNight = true;
        this.timer.clear();
        this.resolveDawn();
        return { ok: true };
      }
      return { ok: false, reason: 'not_your_turn' };
    }

    if (action.type === 'ms_ready') {
      if (this.phase !== 'day_discuss' && this.phase !== 'role_reveal') return { ok: false, reason: 'bad_action' };
      this.readySkip.add(playerId);
      if (this.phase === 'role_reveal') {
        const aliveConn = [...this.alive].filter((id) => this.isConnectedAlive(id));
        if (aliveConn.length > 0 && aliveConn.every((id) => this.readySkip.has(id))) {
          this.timer.clear();
          this.startNight();
        } else {
          this.ctx.changed();
        }
        return { ok: true };
      }
      const aliveConn = [...this.alive].filter((id) => this.isConnectedAlive(id)).length;
      if (this.readySkip.size >= Math.max(1, Math.ceil(aliveConn / 2))) {
        this.timer.clear();
        this.startDayVote();
      } else {
        this.ctx.changed();
      }
      return { ok: true };
    }

    if (action.type === 'ms_vote') {
      if (this.phase !== 'day_vote') return { ok: false, reason: 'bad_action' };
      if (action.target !== 'skip' && (!this.alive.has(action.target) || action.target === playerId)) {
        return { ok: false, reason: 'bad_action' };
      }
      this.dayVotes.set(playerId, action.target);
      const aliveConn = [...this.alive].filter((id) => this.isConnectedAlive(id));
      if (aliveConn.every((id) => this.dayVotes.has(id))) {
        this.timer.clear();
        this.resolveDayVote();
      } else {
        this.ctx.changed();
      }
      return { ok: true };
    }

    return { ok: false, reason: 'bad_action' };
  }

  removePlayer(playerId: string): void {
    if (this.finished || !this.alive.has(playerId)) return;
    const role = this.roles.get(playerId)!;
    this.addLog('system', `🚪 ${this.names.get(playerId)} rời làng (${MASOI_ROLES[role].emoji} ${MASOI_ROLES[role].name}).`);
    // Người tự rời không thể nổ súng nữa, nhưng nếu người thương còn ở lại là Thợ Săn thì vẫn kích hoạt trả thù!
    this.hunterFired.add(playerId);
    this.pendingAfterHunter = this.phase === 'day_discuss' || this.phase === 'day_vote' ? 'night' : 'day';
    this.killPlayer(playerId, 'rời khỏi làng');
    if (this.triggerHunterOrCheckWin()) return;
    this.checkPhaseAdvance();
    this.ctx.changed();
  }

  onPlayerConnection(_playerId: string, connected: boolean): void {
    if (this.finished) return;
    if (!connected) {
      this.checkPhaseAdvance();
    }
    this.ctx.changed();
  }

  renamePlayer(playerId: string, name: string): void {
    if (this.names.has(playerId)) this.names.set(playerId, name);
  }

  botAction(playerId: string): GameAction | null {
    if (this.finished) return null;
    const role = this.roles.get(playerId);
    if (!role) return null;

    if (this.phase === 'hunter_shot' && this.hunterQueue[0] === playerId) {
      const others = [...this.alive].filter((id) => id !== playerId);
      const target = others[Math.floor(this.ctx.rng() * others.length) % others.length] ?? 'skip';
      return { type: 'ms_hunter', target };
    }
    if (!this.alive.has(playerId)) return null;

    if (this.phase === 'night_cupid' && role === 'cupid' && !this.cupidDone) {
      const list = [...this.alive];
      if (list.length < 2) return null;
      const idxA = Math.floor(this.ctx.rng() * list.length) % list.length;
      const a = list[idxA];
      const rest = list.filter((x) => x !== a);
      const b = rest[Math.floor(this.ctx.rng() * rest.length) % rest.length];
      return a && b ? { type: 'ms_night', target: a, target2: b } : null;
    }

    if (this.phase === 'night_active') {
      const myPartner = this.lovers.has(playerId) ? ([...this.lovers].find((x) => x !== playerId) ?? null) : null;
      if (role === 'soi' && !this.wolfVotes.has(playerId)) {
        const preyAll = [...this.alive].filter((id) => this.roles.get(id) !== 'soi');
        const preySafe = myPartner ? preyAll.filter((id) => id !== myPartner) : preyAll;
        const pool = preySafe.length > 0 ? preySafe : preyAll;
        const pick = pool[Math.floor(this.ctx.rng() * pool.length) % pool.length];
        return pick ? { type: 'ms_night', target: pick } : null;
      }
      if (role === 'tientri' && !this.seerDoneNight) {
        const seen = new Set(this.seerHistory.map((h) => h.targetId));
        const pool = [...this.alive].filter((id) => id !== playerId && !seen.has(id));
        const fallback = [...this.alive].filter((id) => id !== playerId);
        const list = pool.length ? pool : fallback;
        const pick = list[Math.floor(this.ctx.rng() * list.length) % list.length];
        return pick ? { type: 'ms_night', target: pick } : null;
      }
      if (role === 'baove' && !this.guardDoneNight) {
        const pool = [...this.alive].filter((id) => id !== this.guardLastId);
        const pick = pool[Math.floor(this.ctx.rng() * pool.length) % pool.length];
        return pick ? { type: 'ms_night', target: pick } : null;
      }
      if (role === 'thamtu' && !this.detectiveDoneNight && this.alive.size >= 2) {
        const candidates = [...this.alive].filter((id) => id !== playerId);
        const pool = candidates.length >= 2 ? candidates : [...this.alive];
        const pairs: [string, string][] = [];
        for (let i = 0; i < pool.length; i++) {
          for (let j = i + 1; j < pool.length; j++) {
            pairs.push([pool[i], pool[j]]);
          }
        }
        const checkedKeys = new Set(this.detectiveHistory.map((h) => [h.a, h.b].sort().join('|')));
        const fresh = pairs.filter(([a, b]) => !checkedKeys.has([a, b].sort().join('|')));
        const choices = fresh.length > 0 ? fresh : pairs;
        const pick = choices[Math.floor(this.ctx.rng() * choices.length) % choices.length];
        return pick ? { type: 'ms_night', target: pick[0], target2: pick[1] } : null;
      }
      return null;
    }

    if (this.phase === 'night_witch' && role === 'phuthuy' && !this.witchDoneNight) {
      const save = this.healLeft && !!this.nightWolfVictim && (this.nightWolfVictim === playerId || this.ctx.rng() < 0.7);
      let poison: string | null = null;
      if (!save && this.poisonLeft && this.day >= 2 && this.ctx.rng() < 0.45) {
        const pool = [...this.alive].filter((id) => id !== playerId);
        poison = pool[Math.floor(this.ctx.rng() * pool.length) % pool.length] ?? null;
      }
      return { type: 'ms_night', save, poison };
    }

    if (this.phase === 'day_discuss' && !this.readySkip.has(playerId)) {
      const aliveHumans = [...this.alive].filter((id) => !this.ctx.isBot?.(id));
      const anyHumanReady = aliveHumans.some((id) => this.readySkip.has(id));
      const readyThreshold = Math.min(10_000, Math.max(400, Math.floor(this.msFor('day_discuss') * 0.35)));
      if (aliveHumans.length === 0 || anyHumanReady || Date.now() - this.phaseStartedAt >= readyThreshold) {
        return { type: 'ms_ready' };
      }
      return null;
    }

    if (this.phase === 'day_vote' && !this.dayVotes.has(playerId)) {
      const myPartner = this.lovers.has(playerId) ? ([...this.lovers].find((x) => x !== playerId) ?? null) : null;
      if (role === 'tientri') {
        const knownWolf = this.seerHistory.find((h) => h.isWolf && this.alive.has(h.targetId) && h.targetId !== myPartner);
        if (knownWolf) return { type: 'ms_vote', target: knownWolf.targetId };
      }
      const allValid = [...this.alive].filter((id) => {
        if (id === playerId) return false;
        if (role === 'soi' && this.roles.get(id) === 'soi') return false;
        return true;
      });
      const nonLover = myPartner ? allValid.filter((id) => id !== myPartner) : allValid;
      const pool = nonLover.length > 0 ? nonLover : allValid;
      if (pool.length === 0) return { type: 'ms_vote', target: 'skip' };
      const pick = pool[Math.floor(this.ctx.rng() * pool.length) % pool.length];
      return { type: 'ms_vote', target: pick };
    }

    return null;
  }

  view(viewerId?: string): MaSoiView {
    const myRole = viewerId ? (this.roles.get(viewerId) ?? null) : null;
    const isWolf = myRole === 'soi';
    const isLover = !!viewerId && this.lovers.has(viewerId);
    const partner = isLover ? [...this.lovers].find((id) => id !== viewerId) ?? null : null;

    let myNightSubmitted = false;
    if (viewerId && this.alive.has(viewerId)) {
      if (this.phase === 'night_cupid' && myRole === 'cupid') myNightSubmitted = this.cupidDone;
      else if (this.phase === 'night_active') {
        if (myRole === 'soi') myNightSubmitted = this.wolfVotes.has(viewerId);
        else if (myRole === 'tientri') myNightSubmitted = this.seerDoneNight;
        else if (myRole === 'baove') myNightSubmitted = this.guardDoneNight;
        else if (myRole === 'thamtu') myNightSubmitted = this.detectiveDoneNight;
      } else if (this.phase === 'night_witch' && myRole === 'phuthuy') myNightSubmitted = this.witchDoneNight;
    }

    return {
      type: 'masoi',
      day: this.day,
      speed: this.speed(),
      phase: this.phase,
      phaseEndsAt: this.phaseEndsAt,
      phaseSeconds: this.phaseSeconds,
      order: [...this.order],
      names: Object.fromEntries(this.names),
      alive: [...this.alive],
      dead: [...this.dead],
      loversLinked: this.lovers.size === 2,
      dayVotes: Object.fromEntries(this.dayVotes),
      readySkip: [...this.readySkip],
      hunterId: this.phase === 'hunter_shot' ? (this.hunterQueue[0] ?? null) : null,
      publicLog: [...this.publicLog],
      roleCounts: { ...this.roleCounts },
      myRole,
      ...(isLover ? { myPartnerId: partner } : {}),
      ...(isWolf ? {
        wolfPackIds: this.order.filter((id) => this.roles.get(id) === 'soi'),
        ...(this.phase === 'night_active' ? { wolfVotes: Object.fromEntries(this.wolfVotes) } : {}),
        wolfChat: [...this.wolfChat],
      } : {}),
      ...(myRole === 'tientri' ? { seerHistory: [...this.seerHistory] } : {}),
      ...(myRole === 'thamtu' ? { detectiveHistory: [...this.detectiveHistory] } : {}),
      ...(myRole === 'baove' ? { guardLastId: this.guardLastId, guardCurrentTargetId: this.guardTarget } : {}),
      ...(myRole === 'phuthuy' ? {
        witchState: {
          healLeft: this.healLeft,
          poisonLeft: this.poisonLeft,
          victimId: this.phase === 'night_witch' && this.healLeft ? this.nightWolfVictim : null,
        },
      } : {}),
      myNightSubmitted,
    };
  }

  dispose(): void {
    this.timer.clear();
    this.botReadyTimer.clear();
  }
}
