import {
  THOI_TRANG_CHEERS,
  THOI_TRANG_CHEER_COOLDOWN_MS,
  THOI_TRANG_DECK,
  THOI_TRANG_DEFAULT_DRESS_SEC,
  THOI_TRANG_DRESS_OPTIONS,
  THOI_TRANG_MAX_HALF_STARS,
  THOI_TRANG_MIN_HALF_STARS,
  THOI_TRANG_OUTFIT_COALESCE_MS,
  THOI_TRANG_POSE_COOLDOWN_MS,
  THOI_TRANG_READY_SHORTEN_SEC,
  THOI_TRANG_REVEAL_SEC,
  THOI_TRANG_RUNWAY_EARLY_SEC,
  THOI_TRANG_RUNWAY_MIN_ELAPSED_SEC,
  THOI_TRANG_RUNWAY_POSES,
  THOI_TRANG_THEME_REVEAL_SEC,
  formatAvgStars,
  formatHalfStars,
  runwaySecondsForPlayers,
  type ThoiTrangDressSec,
  type ThoiTrangJudgeResult,
  type ThoiTrangOutfit,
  type ThoiTrangPhase,
  type ThoiTrangPoseId,
  type ThoiTrangScoreRow,
  type ThoiTrangTheme,
  type ThoiTrangView,
} from '../../../shared/src/thoitrang';
import {
  BASE_OUTFIT,
  PALETTES,
  cloneOutfit,
  validateOutfit,
} from '../../../shared/src/thoitrang-catalog';
import { judgeOutfit } from '../../../shared/src/thoitrang-judge';
import { THOI_TRANG_THEMES, getThoiTrangTheme, getThoiTrangThemeKeys } from '../../../shared/src/thoitrang-themes';
import type { ActionResult, GameAction, RankEntry } from '../../../shared/src/types';
import { FreshDeck } from '../freshDeck';
import { Timer, type EngineContext, type EnginePlayer, type GameEngine } from './engine';
import {
  buildBotDressPlan,
  compareThoiTrangScores,
  computeThoiTrangScores,
  pickFrom,
  type BotDressPlan,
} from './thoitrang-helpers';

export { compareThoiTrangScores };

const processDeck = new FreshDeck();
const VALID_RUNWAY_POSES = new Set<string>(THOI_TRANG_RUNWAY_POSES);
const VALID_CHEERS = new Set<string>(THOI_TRANG_CHEERS);

export class ThoiTrangGame implements GameEngine {
  readonly perPlayerView = true;

  private order: string[] = [];
  private names = new Map<string, string>();
  private active = new Set<string>();
  private theme: ThoiTrangTheme = THOI_TRANG_THEMES[0];

  private phase: ThoiTrangPhase = 'theme_reveal';
  private phaseEndsAt: number | null = null;
  private phaseSeconds = THOI_TRANG_THEME_REVEAL_SEC;
  private phaseStartedAt = 0;

  private outfits = new Map<string, ThoiTrangOutfit>();
  private ready = new Set<string>();
  private shortenedDressing = false;

  private runwayIndex = -1;
  private walkerId: string | null = null;
  private lastPose: ThoiTrangPoseId = 'catwalk';
  private runwayEarlyScheduled = false;

  private ratings = new Map<string, Map<string, number>>();
  private machineScores = new Map<string, ThoiTrangJudgeResult>();
  private scores: ThoiTrangScoreRow[] | null = null;
  private skipRevealVotes = new Set<string>();

  private lastPoseAt = new Map<string, number>();
  private lastCheerAt = new Map<string, number>();
  private botPlans = new Map<string, BotDressPlan>();
  private botPoseCount = new Map<string, number>();
  private botLastPoseAt = new Map<string, number>();

  private readonly timer = new Timer();
  private readonly coalesceTimer = new Timer();
  private readonly earlyTimer = new Timer();
  private readonly botPoseTimer = new Timer();
  private coalesceActive = false;
  private outfitDirty = false;
  private finished = false;

  constructor(private readonly ctx: EngineContext) {}

  private themeRevealMs(): number {
    const def = THOI_TRANG_THEME_REVEAL_SEC * 1000;
    return this.ctx.turnMs ? Math.min(def, Math.max(100, this.ctx.turnMs)) : def;
  }

  private dressMs(): number {
    const rawSec = this.ctx.settings.thoiTrangDressSec;
    const dressSec = THOI_TRANG_DRESS_OPTIONS.includes(rawSec as ThoiTrangDressSec)
      ? (rawSec as ThoiTrangDressSec)
      : THOI_TRANG_DEFAULT_DRESS_SEC;
    const def = dressSec * 1000;
    return this.ctx.turnMs ? Math.min(def, Math.max(400, this.ctx.turnMs * 4)) : def;
  }

  private shortDressMs(): number {
    const def = THOI_TRANG_READY_SHORTEN_SEC * 1000;
    return this.ctx.turnMs ? Math.min(def, Math.max(80, Math.floor(this.ctx.turnMs / 2))) : def;
  }

  private coalesceMs(): number {
    return this.ctx.turnMs
      ? Math.min(THOI_TRANG_OUTFIT_COALESCE_MS, Math.max(40, Math.floor(this.ctx.turnMs / 5)))
      : THOI_TRANG_OUTFIT_COALESCE_MS;
  }

  private runwayMs(): number {
    const def = runwaySecondsForPlayers(Math.max(2, this.active.size)) * 1000;
    return this.ctx.turnMs ? Math.min(def, Math.max(200, this.ctx.turnMs)) : def;
  }

  private runwayMinElapsedMs(): number {
    const def = THOI_TRANG_RUNWAY_MIN_ELAPSED_SEC * 1000;
    return this.ctx.turnMs ? Math.min(def, Math.floor(this.runwayMs() * 0.5)) : def;
  }

  private runwayEarlyMs(): number {
    const def = THOI_TRANG_RUNWAY_EARLY_SEC * 1000;
    return this.ctx.turnMs ? Math.min(def, Math.max(50, Math.floor(this.runwayMs() * 0.15))) : def;
  }

  private revealMs(): number {
    const def = THOI_TRANG_REVEAL_SEC * 1000;
    return this.ctx.turnMs ? Math.min(def, Math.max(120, this.ctx.turnMs)) : def;
  }

  private clearAllTimers(): void {
    this.timer.clear();
    this.coalesceTimer.clear();
    this.earlyTimer.clear();
    this.botPoseTimer.clear();
    this.coalesceActive = false;
  }

  private connectedActiveHumans(): string[] {
    return [...this.active].filter((id) => !this.ctx.isBot?.(id) && this.ctx.isConnected(id));
  }

  private enterPhase(phase: ThoiTrangPhase, ms: number, onTimeout: () => void): void {
    if (this.finished) return;
    this.timer.clear();
    this.earlyTimer.clear();
    this.botPoseTimer.clear();
    this.phase = phase;
    this.phaseStartedAt = Date.now();
    this.phaseEndsAt = this.phaseStartedAt + ms;
    this.phaseSeconds = Math.max(1, Math.round(ms / 1000));
    this.timer.set(ms, onTimeout);
  }

  start(players: EnginePlayer[]): void {
    const ids = players.map((p) => p.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(this.ctx.rng() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    this.order = ids;
    players.forEach((p, idx) => {
      this.names.set(p.id, p.name);
      this.active.add(p.id);
      const base = cloneOutfit(BASE_OUTFIT);
      base.skin = PALETTES.skin[idx % PALETTES.skin.length];
      base.hair.c = PALETTES.hair[idx % PALETTES.hair.length];
      this.outfits.set(p.id, base);
    });

    const group = this.ctx.settings.thoiTrangThemeGroup ?? 'random';
    const keys = getThoiTrangThemeKeys(group);
    let idx = 0;
    if (this.ctx.drawFresh) idx = this.ctx.drawFresh(THOI_TRANG_DECK, keys);
    else if (this.ctx.rng === Math.random) idx = processDeck.draw(THOI_TRANG_DECK, keys);
    else idx = Math.floor(this.ctx.rng() * keys.length) % Math.max(1, keys.length);

    this.theme = getThoiTrangTheme(keys[idx]) ?? THOI_TRANG_THEMES[0];
    this.enterPhase('theme_reveal', this.themeRevealMs(), () => this.enterDressing());
    this.ctx.changed();
  }

  private enterDressing(): void {
    if (this.finished) return;
    this.ready.clear();
    this.shortenedDressing = false;
    this.outfitDirty = false;
    this.enterPhase('dressing', this.dressMs(), () => this.startRunway());
    this.ctx.changed();
  }

  private maybeShortenDressing(): void {
    if (this.finished || this.phase !== 'dressing' || this.shortenedDressing) return;
    const humans = this.connectedActiveHumans();
    const targets = humans.length > 0 ? humans : [...this.active];
    if (targets.length === 0 || !targets.every((id) => this.ready.has(id))) return;

    const shortMs = this.shortDressMs();
    const remaining = (this.phaseEndsAt ?? 0) - Date.now();
    this.shortenedDressing = true;
    if (remaining > shortMs) {
      this.phaseEndsAt = Date.now() + shortMs;
      this.phaseSeconds = Math.max(1, Math.round(shortMs / 1000));
      this.timer.set(shortMs, () => this.startRunway());
    }
  }

  private flushOutfitCoalesce(): void {
    this.coalesceTimer.clear();
    this.coalesceActive = false;
    this.outfitDirty = false;
  }

  private startRunway(): void {
    if (this.finished) return;
    this.flushOutfitCoalesce();
    if (this.active.size === 0) {
      this.finalizeGame();
      return;
    }
    this.machineScores.clear();
    for (const id of this.active) {
      const outfit = this.outfits.get(id) ?? cloneOutfit(BASE_OUTFIT);
      this.machineScores.set(id, judgeOutfit(outfit, this.theme));
    }
    this.ratings.clear();
    this.runwayIndex = -1;
    this.advanceRunway();
  }

  private advanceRunway(): void {
    if (this.finished) return;
    this.runwayIndex += 1;
    while (this.runwayIndex < this.order.length && !this.active.has(this.order[this.runwayIndex])) {
      this.runwayIndex += 1;
    }
    if (this.runwayIndex >= this.order.length) {
      this.enterReveal();
      return;
    }

    const walker = this.order[this.runwayIndex];
    this.walkerId = walker;
    this.lastPose = 'catwalk';
    this.runwayEarlyScheduled = false;
    this.ratings.set(walker, new Map());

    const ms = this.runwayMs();
    this.enterPhase('runway', ms, () => this.advanceRunway());
    this.earlyTimer.set(this.runwayMinElapsedMs(), () => this.checkRunwayEarlyAdvance());
    if (this.ctx.isBot?.(walker)) {
      this.botPoseTimer.set(Math.min(3200, Math.max(80, Math.floor(ms * 0.4))), () => {
        if (!this.finished && this.phase === 'runway' && this.walkerId === walker) this.ctx.changed();
      });
    }
    this.ctx.changed();
  }

  private checkRunwayEarlyAdvance(): void {
    if (this.finished || this.phase !== 'runway' || !this.walkerId || this.runwayEarlyScheduled) return;
    if (Date.now() - this.phaseStartedAt < this.runwayMinElapsedMs()) return;

    const voteMap = this.ratings.get(this.walkerId);
    if (!voteMap) return;
    const humans = this.connectedActiveHumans().filter((id) => id !== this.walkerId);
    const voters = humans.length > 0 ? humans : [...this.active].filter((id) => id !== this.walkerId);
    if (!voters.every((id) => voteMap.has(id))) return;

    const earlyMs = this.runwayEarlyMs();
    this.runwayEarlyScheduled = true;
    if ((this.phaseEndsAt ?? 0) - Date.now() > earlyMs) {
      this.phaseEndsAt = Date.now() + earlyMs;
      this.phaseSeconds = Math.max(1, Math.round(earlyMs / 1000));
      this.timer.set(earlyMs, () => this.advanceRunway());
      this.ctx.changed();
    }
  }

  private computeScores(): ThoiTrangScoreRow[] {
    return computeThoiTrangScores(
      this.order, this.active, this.names, this.outfits, this.machineScores, this.ratings, this.theme,
    );
  }

  private enterReveal(): void {
    if (this.finished) return;
    this.walkerId = null;
    this.scores = this.computeScores();
    this.skipRevealVotes.clear();
    if (this.connectedActiveHumans().length === 0) { this.finalizeGame(); return; }
    this.enterPhase('reveal', this.revealMs(), () => this.finalizeGame());
    this.ctx.changed();
  }

  private finalizeGame(): void {
    if (this.finished) return;
    this.finished = true;
    this.clearAllTimers();
    const rows = this.scores ?? this.computeScores();
    this.scores = rows;

    const winnerIds = rows.filter((r) => r.rank === 1).map((r) => r.playerId);
    const ranking: RankEntry[] = rows.map((r) => ({
      playerId: r.playerId,
      name: r.name,
      detail: `#${r.rank} · ${formatAvgStars(r.finalAvg)}★ (Máy ${formatHalfStars(r.machineHalfStars)}★ · ${r.machineReason})`,
    }));
    const topAvg = rows[0]?.finalAvg ?? 0;
    const winNames = winnerIds.map((id) => this.names.get(id) ?? id);
    const headline = winnerIds.length > 1
      ? `👑 Đồng Quán quân: ${winNames.join(' & ')} (${formatAvgStars(topAvg)}★)`
      : winNames.length === 1
        ? `🏆 ${winNames[0]} đăng quang (${formatAvgStars(topAvg)}★)`
        : 'Sàn Diễn Xóm Lầy kết thúc';

    this.ctx.finish({ winnerId: winnerIds[0] ?? null, winnerIds, ranking, headline });
  }

  action(playerId: string, action: GameAction): ActionResult {
    if (this.finished) return { ok: false, reason: 'not_playing' };
    if (action.type === 'end') {
      if (playerId !== this.ctx.hostId()) return { ok: false, reason: 'not_host' };
      this.finalizeGame();
      return { ok: true };
    }
    if (!this.active.has(playerId)) return { ok: false, reason: 'spectating' };

    if (action.type === 'tt_outfit') {
      if (this.phase !== 'dressing' || !action.outfit || typeof action.outfit !== 'object') {
        return { ok: false, reason: 'bad_action' };
      }
      this.outfits.set(playerId, validateOutfit(action.outfit).outfit);
      this.outfitDirty = true;
      if (!this.coalesceActive) {
        this.coalesceActive = true;
        this.coalesceTimer.set(this.coalesceMs(), () => {
          this.coalesceActive = false;
          if (this.finished || this.phase !== 'dressing' || !this.outfitDirty) return;
          this.outfitDirty = false;
          this.ctx.changed();
        });
      }
      return { ok: true };
    }

    if (action.type === 'tt_ready') {
      if (this.phase !== 'dressing' || typeof action.ready !== 'boolean') return { ok: false, reason: 'bad_action' };
      if (action.ready) this.ready.add(playerId); else this.ready.delete(playerId);
      this.flushOutfitCoalesce();
      this.maybeShortenDressing();
      this.ctx.changed();
      return { ok: true };
    }

    if (action.type === 'tt_rate') {
      if (this.phase !== 'runway' || !this.walkerId || playerId === this.walkerId) return { ok: false, reason: 'bad_action' };
      const hs = action.halfStars;
      if (!Number.isInteger(hs) || hs < THOI_TRANG_MIN_HALF_STARS || hs > THOI_TRANG_MAX_HALF_STARS) {
        return { ok: false, reason: 'bad_action' };
      }
      this.ratings.get(this.walkerId)?.set(playerId, hs);
      this.checkRunwayEarlyAdvance();
      this.ctx.changed();
      return { ok: true };
    }

    if (action.type === 'tt_pose') {
      if (this.phase !== 'runway' || this.walkerId !== playerId) return { ok: false, reason: 'not_your_turn' };
      if (typeof action.pose !== 'string' || !VALID_RUNWAY_POSES.has(action.pose)) return { ok: false, reason: 'bad_action' };
      const now = Date.now();
      if (now - (this.lastPoseAt.get(playerId) ?? 0) < THOI_TRANG_POSE_COOLDOWN_MS) return { ok: true };
      this.lastPoseAt.set(playerId, now);
      this.lastPose = action.pose;
      if (this.ctx.isBot?.(playerId)) {
        this.botPoseCount.set(playerId, (this.botPoseCount.get(playerId) ?? 0) + 1);
        this.botLastPoseAt.set(playerId, now);
      }
      this.ctx.emitThoiTrangPose?.({ kind: 'pose', playerId, pose: action.pose, at: now });
      return { ok: true };
    }

    if (action.type === 'tt_cheer') {
      if (this.phase !== 'runway' || !this.walkerId || playerId === this.walkerId) return { ok: false, reason: 'bad_action' };
      if (typeof action.cheer !== 'string' || !VALID_CHEERS.has(action.cheer)) return { ok: false, reason: 'bad_action' };
      const now = Date.now();
      if (now - (this.lastCheerAt.get(playerId) ?? 0) < THOI_TRANG_CHEER_COOLDOWN_MS) return { ok: true };
      this.lastCheerAt.set(playerId, now);
      this.ctx.emitThoiTrangPose?.({
        kind: 'cheer', playerId, name: this.names.get(playerId) ?? playerId, cheer: action.cheer, at: now,
      });
      return { ok: true };
    }

    if (action.type === 'tt_skip_reveal') {
      if (this.phase !== 'reveal') return { ok: false, reason: 'bad_action' };
      this.skipRevealVotes.add(playerId);
      const humans = this.connectedActiveHumans();
      const majority = humans.length === 0 || this.skipRevealVotes.size >= Math.ceil(humans.length / 2);
      if (playerId === this.ctx.hostId() || majority) this.finalizeGame(); else this.ctx.changed();
      return { ok: true };
    }

    return { ok: false, reason: 'bad_action' };
  }

  botAction(playerId: string): GameAction | null {
    if (this.finished || !this.active.has(playerId)) return null;
    if (this.phase === 'dressing') {
      if (this.ready.has(playerId)) return null;
      let plan = this.botPlans.get(playerId);
      if (!plan) {
        plan = buildBotDressPlan(this.theme, this.ctx.rng);
        this.botPlans.set(playerId, plan);
      }
      if (plan.step === 0) { plan.step = 1; return { type: 'tt_outfit', outfit: plan.step1 }; }
      if (plan.step === 1) { plan.step = 2; return { type: 'tt_outfit', outfit: plan.final }; }
      if (plan.step === 2) { plan.step = 3; return { type: 'tt_ready', ready: true }; }
      return null;
    }

    if (this.phase === 'runway' && this.walkerId) {
      if (this.walkerId === playerId) {
        const count = this.botPoseCount.get(playerId) ?? 0;
        const last = this.botLastPoseAt.get(playerId) ?? 0;
        if (count >= 2) return null;
        if (count === 1 && Date.now() - last < (this.ctx.turnMs ? Math.min(3000, Math.floor(this.runwayMs() * 0.3)) : 3000)) {
          return null;
        }
        const poses = THOI_TRANG_RUNWAY_POSES.filter((p) => p !== 'catwalk');
        return { type: 'tt_pose', pose: pickFrom(poses, this.ctx.rng) };
      }
      const voteMap = this.ratings.get(this.walkerId);
      if (voteMap && !voteMap.has(playerId)) {
        const machine = this.machineScores.get(this.walkerId)?.halfStars ?? 6;
        const delta = Math.floor(this.ctx.rng() * 3) - 1;
        const halfStars = Math.max(THOI_TRANG_MIN_HALF_STARS, Math.min(THOI_TRANG_MAX_HALF_STARS, machine + delta));
        return { type: 'tt_rate', halfStars };
      }
    }
    return null;
  }

  removePlayer(playerId: string): void {
    if (!this.active.delete(playerId)) return;
    this.ready.delete(playerId);
    this.skipRevealVotes.delete(playerId);
    if (this.finished) return;
    if (this.active.size === 0) { this.finalizeGame(); return; }
    if (this.phase === 'dressing') this.maybeShortenDressing();
    else if (this.phase === 'runway') {
      if (this.walkerId === playerId) { this.advanceRunway(); return; }
      this.checkRunwayEarlyAdvance();
    } else if (this.phase === 'reveal') {
      const humans = this.connectedActiveHumans();
      if (humans.length === 0 || this.skipRevealVotes.size >= Math.ceil(humans.length / 2)) {
        this.finalizeGame();
        return;
      }
    }
    this.ctx.changed();
  }

  onPlayerConnection(_playerId: string, connected: boolean): void {
    if (this.finished || connected) return;
    if (this.phase === 'dressing') this.maybeShortenDressing();
    else if (this.phase === 'runway') this.checkRunwayEarlyAdvance();
    else if (this.phase === 'reveal' && this.connectedActiveHumans().length === 0) { this.finalizeGame(); return; }
    this.ctx.changed();
  }

  renamePlayer(playerId: string, name: string): void {
    if (this.names.has(playerId)) this.names.set(playerId, name);
  }

  view(viewerId?: string): ThoiTrangView {
    const activeOrder = this.order.filter((id) => this.active.has(id));
    const names: Record<string, string> = {};
    const outfits: Record<string, ThoiTrangOutfit> = {};
    for (const id of activeOrder) {
      names[id] = this.names.get(id) ?? id;
      outfits[id] = this.outfits.get(id) ?? BASE_OUTFIT;
    }
    const voteMap = this.walkerId ? this.ratings.get(this.walkerId) : undefined;
    return {
      type: 'thoitrang',
      phase: this.phase,
      phaseEndsAt: this.phaseEndsAt,
      phaseSeconds: this.phaseSeconds,
      theme: this.theme,
      order: activeOrder,
      names,
      outfits,
      ready: activeOrder.filter((id) => this.ready.has(id)),
      runwayIndex: this.runwayIndex,
      walkerId: this.walkerId,
      lastPose: this.lastPose,
      ratedBy: voteMap ? [...voteMap.keys()] : [],
      myRating: viewerId && voteMap ? (voteMap.get(viewerId) ?? null) : null,
      scores: this.phase === 'reveal' ? this.scores : null,
    };
  }

  dispose(): void {
    this.finished = true;
    this.clearAllTimers();
  }
}
