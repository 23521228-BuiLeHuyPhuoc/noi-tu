/**
 * Server Engine: Chia Chác Giang Hồ (`cashnguns` — Cash 'n Guns Edition, 3–12 người).
 * Luật Đầu hàng ("nằm xuống"): hạ súng và cúi đầu tránh đạn — không bắn ai (blocked = true),
 * né toàn bộ đạn nhắm vào mình (dodged = true), nhưng nhường phần chia chiến lợi phẩm vòng này.
 */
import {
  CG_CLIP_BANG,
  CG_CLIP_CLICK,
  CG_LOOT_PER_ROUND,
  CG_MAX_ROUNDS,
  CG_START_HP,
  buildCgLootDeck,
  cgTotalWealth,
  type CashGunsView,
  type CgBullet,
  type CgLootCard,
  type CgPhase,
  type CgShotResult,
} from '../../../shared/src/cashnguns';
import type { ActionResult, GameAction } from '../../../shared/src/types';
import { Timer, type EngineContext, type EnginePlayer, type GameEngine } from './engine';

const DEFAULT_SEC: Record<CgPhase, number> = {
  plan: 22,
  standoff: 15,
  resolve: 5,
};

interface PlayerPlan {
  bulletIndex: number;
  targetId: string;
}

export class CashGunsGame implements GameEngine {
  readonly perPlayerView = true;

  private order: string[] = [];
  private names = new Map<string, string>();
  private hp = new Map<string, number>();
  private alive = new Set<string>();
  private cash = new Map<string, number>();
  private diamonds = new Map<string, number>();
  private clips = new Map<string, CgBullet[]>();

  private godfatherId = '';
  private lootDeck: CgLootCard[] = [];
  private tableLoot: CgLootCard[] = [];

  private round = 1;
  private readonly maxRounds = CG_MAX_ROUNDS;
  private phase: CgPhase = 'plan';
  private phaseEndsAt: number | null = null;
  private phaseSeconds = DEFAULT_SEC.plan;

  private plans = new Map<string, PlayerPlan>();
  private aims = new Map<string, string | null>();
  private decidedStandoff = new Map<string, 'stand' | 'surrender'>();
  private surrendered = new Set<string>();
  private redirectedByGodfather: { targetId: string; oldAim: string; newAim: string } | null = null;

  private lastShots: CgShotResult[] = [];
  private lastLootGains: Record<string, string[]> = {};

  private finished = false;
  private readonly timer = new Timer();

  constructor(private readonly ctx: EngineContext) {}

  private msFor(phase: CgPhase): number {
    const def = DEFAULT_SEC[phase] * 1000;
    return this.ctx.turnMs ? Math.min(def, Math.max(250, this.ctx.turnMs)) : def;
  }

  private shuffleInPlace<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.ctx.rng() * (i + 1)) % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  private makeInitialClip(): CgBullet[] {
    const clip: CgBullet[] = [];
    for (let i = 0; i < CG_CLIP_CLICK; i++) clip.push('click');
    for (let i = 0; i < CG_CLIP_BANG; i++) clip.push('bang');
    return this.shuffleInPlace(clip);
  }

  start(players: EnginePlayer[]): void {
    this.order = players.map((p) => p.id);
    for (const p of players) {
      this.names.set(p.id, p.name);
      this.hp.set(p.id, CG_START_HP);
      this.alive.add(p.id);
      this.cash.set(p.id, 0);
      this.diamonds.set(p.id, 0);
      this.clips.set(p.id, this.makeInitialClip());
    }

    this.godfatherId = this.order[0] ?? '';
    this.lootDeck = this.shuffleInPlace(buildCgLootDeck());
    this.round = 1;
    this.startRound();
  }

  private enterPhase(phase: CgPhase, onTimeout: () => void): void {
    if (this.finished) return;
    this.phase = phase;
    const ms = this.msFor(phase);
    this.phaseSeconds = Math.max(1, Math.round(ms / 1000));
    this.phaseEndsAt = Date.now() + ms;
    this.timer.set(ms, onTimeout);
  }

  private ensureAliveGodfather(): void {
    if (this.alive.has(this.godfatherId)) return;
    const next = this.order.find((id) => this.alive.has(id));
    if (next) this.godfatherId = next;
  }

  private turnOrderFromGodfather(): string[] {
    const startIdx = Math.max(0, this.order.indexOf(this.godfatherId));
    const rotated: string[] = [];
    for (let k = 0; k < this.order.length; k++) {
      rotated.push(this.order[(startIdx + k) % this.order.length]);
    }
    return rotated;
  }

  private aliveActiveIds(): string[] {
    return this.order.filter((id) => this.alive.has(id) && (this.ctx.isBot?.(id) || this.ctx.isConnected(id)));
  }

  private startRound(): void {
    if (this.finished) return;
    if (this.alive.size <= 1 || this.round > this.maxRounds || this.lootDeck.length === 0) {
      this.finishAll();
      return;
    }

    this.ensureAliveGodfather();
    this.tableLoot = this.lootDeck.splice(0, CG_LOOT_PER_ROUND);

    this.plans.clear();
    this.aims.clear();
    this.decidedStandoff.clear();
    this.surrendered.clear();
    this.redirectedByGodfather = null;
    this.lastShots = [];
    this.lastLootGains = {};

    this.enterPhase('plan', () => this.lockPlansAndEnterStandoff());
    this.ctx.changed();
  }

  private lockPlansAndEnterStandoff(): void {
    if (this.finished) return;
    this.timer.clear();

    const aliveList = this.order.filter((id) => this.alive.has(id));
    if (aliveList.length <= 1) {
      this.finishAll();
      return;
    }

    for (const id of aliveList) {
      const existing = this.plans.get(id);
      const clip = this.clips.get(id) ?? [];
      if (existing && this.alive.has(existing.targetId) && existing.targetId !== id) {
        const validIdx = existing.bulletIndex >= 0 && existing.bulletIndex < clip.length ? existing.bulletIndex : 0;
        this.plans.set(id, { bulletIndex: validIdx, targetId: existing.targetId });
      } else {
        const others = aliveList.filter((o) => o !== id);
        const randTarget = others[Math.floor(this.ctx.rng() * others.length) % others.length];
        this.plans.set(id, { bulletIndex: 0, targetId: randTarget });
      }
    }

    this.aims.clear();
    for (const id of this.order) {
      if (this.alive.has(id)) {
        this.aims.set(id, this.plans.get(id)?.targetId ?? null);
      } else {
        this.aims.set(id, null);
      }
    }

    this.enterPhase('standoff', () => this.resolveRound());
    this.ctx.changed();
  }

  private resolveRound(): void {
    if (this.finished) return;
    this.timer.clear();

    const aliveBeforeShots = this.order.filter((id) => this.alive.has(id));
    const shots: CgShotResult[] = [];
    const woundedThisRound = new Set<string>();

    // 1. Mọi tay súng còn sống đều tiêu hao viên đạn đã nạp trong băng đạn vòng này
    const firedBullets = new Map<string, CgBullet>();
    for (const id of aliveBeforeShots) {
      const clip = this.clips.get(id) ?? [];
      const plan = this.plans.get(id);
      let bullet: CgBullet = 'click';
      if (clip.length > 0) {
        const idx = plan && plan.bulletIndex >= 0 && plan.bulletIndex < clip.length ? plan.bulletIndex : 0;
        [bullet] = clip.splice(idx, 1);
      }
      firedBullets.set(id, bullet);
    }

    // 2. Xử lý đồng thời các phát súng
    for (const fromId of aliveBeforeShots) {
      const toId = this.aims.get(fromId);
      if (!toId || !this.alive.has(toId)) continue;
      const bullet = firedBullets.get(fromId) ?? 'click';

      // Nếu người bắn đã bấm Đầu hàng -> hạ súng không bóp cò (blocked = true)
      if (this.surrendered.has(fromId)) {
        shots.push({
          fromId,
          toId,
          bullet,
          dodged: this.surrendered.has(toId),
          blocked: true,
        });
        continue;
      }

      // Nếu mục tiêu bấm Đầu hàng -> cúi rạp né đạn thành công (dodged = true)
      if (this.surrendered.has(toId)) {
        shots.push({
          fromId,
          toId,
          bullet,
          dodged: true,
        });
        continue;
      }

      // Cả hai cùng đứng vững đối đầu
      shots.push({
        fromId,
        toId,
        bullet,
        dodged: false,
      });

      if (bullet === 'bang') {
        woundedThisRound.add(toId);
        const nextHp = Math.max(0, (this.hp.get(toId) ?? 0) - 1);
        this.hp.set(toId, nextHp);
      }
    }

    // Loại người hết máu khỏi danh sách còn sống
    for (const id of aliveBeforeShots) {
      if ((this.hp.get(id) ?? 0) <= 0) {
        this.alive.delete(id);
      }
    }

    this.lastShots = shots;

    // 3. Những người đứng vững & không trúng đạn thật chia chiến lợi phẩm theo vòng từ Bố Già
    const looters = this.turnOrderFromGodfather().filter(
      (id) => this.alive.has(id) && !this.surrendered.has(id) && !woundedThisRound.has(id),
    );

    const gains: Record<string, string[]> = {};
    let nextGodfatherId: string | null = null;

    if (looters.length > 0) {
      for (let i = 0; i < this.tableLoot.length; i++) {
        const card = this.tableLoot[i];
        const pid = looters[i % looters.length];
        if (!gains[pid]) gains[pid] = [];
        gains[pid].push(`${card.emoji} ${card.label}`);

        switch (card.kind) {
          case 'cash_5k':
          case 'cash_10k':
          case 'cash_20k':
            this.cash.set(pid, (this.cash.get(pid) ?? 0) + card.value);
            break;
          case 'diamond_1k':
          case 'diamond_5k':
          case 'diamond_10k':
            this.cash.set(pid, (this.cash.get(pid) ?? 0) + card.value);
            this.diamonds.set(pid, (this.diamonds.get(pid) ?? 0) + 1);
            break;
          case 'medkit':
            this.hp.set(pid, CG_START_HP);
            break;
          case 'godfather':
            nextGodfatherId = pid;
            break;
        }
      }
    }

    if (nextGodfatherId && this.alive.has(nextGodfatherId)) {
      this.godfatherId = nextGodfatherId;
    } else {
      this.ensureAliveGodfather();
    }

    this.lastLootGains = gains;

    // 4. Sang pha hiển thị kết quả nổ súng & chia phần (5s), sau đó kiểm tra kết thúc
    this.enterPhase('resolve', () => {
      if (this.alive.size <= 1 || this.round >= this.maxRounds || this.lootDeck.length === 0) {
        this.finishAll();
      } else {
        this.round++;
        this.startRound();
      }
    });
    this.ctx.changed();
  }

  private finishAll(): void {
    if (this.finished) return;
    this.finished = true;
    this.timer.clear();

    const cashObj = Object.fromEntries(this.order.map((id) => [id, this.cash.get(id) ?? 0]));
    const diamondObj = Object.fromEntries(this.order.map((id) => [id, this.diamonds.get(id) ?? 0]));
    const { totals, diamondKingIds } = cgTotalWealth(cashObj, diamondObj, this.alive);
    const kingSet = new Set(diamondKingIds);

    const sorted = [...this.order].sort((a, b) => {
      const aliveDiff = (this.alive.has(b) ? 1 : 0) - (this.alive.has(a) ? 1 : 0);
      if (aliveDiff !== 0) return aliveDiff;
      const wealthDiff = (totals[b] ?? 0) - (totals[a] ?? 0);
      if (wealthDiff !== 0) return wealthDiff;
      const diaDiff = (diamondObj[b] ?? 0) - (diamondObj[a] ?? 0);
      if (diaDiff !== 0) return diaDiff;
      return (this.hp.get(b) ?? 0) - (this.hp.get(a) ?? 0);
    });

    const aliveSorted = sorted.filter((id) => this.alive.has(id));
    const maxWealth = aliveSorted.length > 0 ? (totals[aliveSorted[0]] ?? 0) : 0;
    const winnerIds = aliveSorted.length > 0 ? aliveSorted.filter((id) => (totals[id] ?? 0) === maxWealth) : [];

    const ranking = sorted.map((id) => {
      const name = this.names.get(id) ?? id;
      if (!this.alive.has(id)) {
        return {
          playerId: id,
          name,
          detail: `💀 Ngã gục (rơi $${(cashObj[id] ?? 0).toLocaleString('en-US')})`,
        };
      }
      const dCount = diamondObj[id] ?? 0;
      const kingBadge = kingSet.has(id) ? ' · 👑 Vua Kim Cương (+$60k)' : dCount > 0 ? ` · 💎×${dCount}` : '';
      return {
        playerId: id,
        name,
        detail: `💰 $${(totals[id] ?? 0).toLocaleString('en-US')}${kingBadge} · ❤️${this.hp.get(id) ?? 0}`,
      };
    });

    const headline =
      winnerIds.length > 0
        ? `🔫 ${winnerIds.map((id) => this.names.get(id) ?? id).join(' & ')} ôm trọn chiến lợi phẩm ($${maxWealth.toLocaleString('en-US')})!`
        : '💥 Cả băng đảng đều ngã gục — Không ai mang nổi tiền rời kho!';

    this.ctx.finish({
      winnerId: winnerIds[0] ?? null,
      winnerIds,
      ranking,
      headline,
    });
  }

  private checkStandoffAdvance(): void {
    const active = this.aliveActiveIds();
    if (active.length > 0 && active.every((id) => this.decidedStandoff.has(id))) {
      this.resolveRound();
    } else {
      this.ctx.changed();
    }
  }

  action(playerId: string, action: GameAction): ActionResult {
    if (this.finished) return { ok: false, reason: 'not_playing' };
    if (!this.order.includes(playerId)) return { ok: false, reason: 'not_playing' };

    if (action.type === 'end') {
      if (playerId !== this.ctx.hostId()) return { ok: false, reason: 'not_host' };
      this.finishAll();
      return { ok: true };
    }

    if (!this.alive.has(playerId)) return { ok: false, reason: 'bad_action' };

    if (action.type === 'cg_plan') {
      if (this.phase !== 'plan') return { ok: false, reason: 'not_your_turn' };
      if (this.plans.has(playerId)) return { ok: false, reason: 'bad_action' };

      const clip = this.clips.get(playerId) ?? [];
      if (!Number.isInteger(action.bulletIndex) || action.bulletIndex < 0 || action.bulletIndex >= clip.length) {
        return { ok: false, reason: 'bad_action' };
      }
      if (typeof action.targetId !== 'string' || action.targetId === playerId || !this.alive.has(action.targetId)) {
        return { ok: false, reason: 'bad_action' };
      }

      this.plans.set(playerId, { bulletIndex: action.bulletIndex, targetId: action.targetId });

      const active = this.aliveActiveIds();
      if (active.length > 0 && active.every((id) => this.plans.has(id))) {
        this.lockPlansAndEnterStandoff();
      } else {
        this.ctx.changed();
      }
      return { ok: true };
    }

    if (action.type === 'cg_godfather') {
      if (this.phase !== 'standoff') return { ok: false, reason: 'not_your_turn' };
      if (playerId !== this.godfatherId || this.surrendered.has(playerId)) {
        return { ok: false, reason: 'bad_action' };
      }
      if (this.redirectedByGodfather !== null) {
        return { ok: false, reason: 'bad_action' };
      }
      const { targetId, newAimId } = action;
      if (
        typeof targetId !== 'string' ||
        typeof newAimId !== 'string' ||
        targetId === this.godfatherId ||
        !this.alive.has(targetId) ||
        this.surrendered.has(targetId) ||
        newAimId === targetId ||
        !this.alive.has(newAimId)
      ) {
        return { ok: false, reason: 'bad_action' };
      }

      const oldAim = this.aims.get(targetId) ?? newAimId;
      this.redirectedByGodfather = { targetId, oldAim, newAim: newAimId };
      this.aims.set(targetId, newAimId);
      const tPlan = this.plans.get(targetId);
      if (tPlan) tPlan.targetId = newAimId;

      // Nếu mục tiêu mới vừa bị chĩa súng mà trước đó đã lỡ bấm Đứng vững, cho họ cơ hội cân nhắc lại
      if (this.decidedStandoff.get(newAimId) === 'stand') {
        this.decidedStandoff.delete(newAimId);
      }

      this.ctx.changed();
      return { ok: true };
    }

    if (action.type === 'cg_standoff') {
      if (this.phase !== 'standoff') return { ok: false, reason: 'not_your_turn' };
      if (action.decision !== 'stand' && action.decision !== 'surrender') {
        return { ok: false, reason: 'bad_action' };
      }
      if (this.decidedStandoff.has(playerId)) {
        return { ok: false, reason: 'bad_action' };
      }

      this.decidedStandoff.set(playerId, action.decision);
      if (action.decision === 'surrender') {
        this.surrendered.add(playerId);
      }

      this.checkStandoffAdvance();
      return { ok: true };
    }

    return { ok: false, reason: 'bad_action' };
  }

  removePlayer(playerId: string): void {
    if (this.finished || !this.order.includes(playerId)) return;
    this.order = this.order.filter((id) => id !== playerId);
    this.alive.delete(playerId);
    this.plans.delete(playerId);
    this.aims.delete(playerId);
    this.decidedStandoff.delete(playerId);

    if (this.alive.size <= 1) {
      this.finishAll();
      return;
    }

    this.ensureAliveGodfather();

    if (this.phase === 'plan') {
      // Nếu ai đó đang nhắm vào người vừa thoát, cho phép chọn lại
      for (const [id, p] of this.plans.entries()) {
        if (p.targetId === playerId) this.plans.delete(id);
      }
      const active = this.aliveActiveIds();
      if (active.length > 0 && active.every((id) => this.plans.has(id))) {
        this.lockPlansAndEnterStandoff();
        return;
      }
    } else if (this.phase === 'standoff') {
      this.checkStandoffAdvance();
      return;
    }

    this.ctx.changed();
  }

  onPlayerConnection(_playerId: string, connected: boolean): void {
    if (this.finished) return;
    if (connected) {
      this.ctx.changed();
      return;
    }
    const active = this.aliveActiveIds();
    if (this.phase === 'plan' && active.length > 0 && active.every((id) => this.plans.has(id))) {
      this.lockPlansAndEnterStandoff();
    } else if (this.phase === 'standoff' && active.length > 0 && active.every((id) => this.decidedStandoff.has(id))) {
      this.resolveRound();
    }
  }

  renamePlayer(playerId: string, name: string): void {
    if (this.names.has(playerId)) this.names.set(playerId, name);
  }

  botAction(playerId: string): GameAction | null {
    if (this.finished || !this.alive.has(playerId)) return null;

    if (this.phase === 'plan' && !this.plans.has(playerId)) {
      const clip = this.clips.get(playerId) ?? [];
      if (clip.length === 0) return null;

      const others = this.order.filter((id) => id !== playerId && this.alive.has(id));
      if (others.length === 0) return null;

      // Ưu tiên nhắm vào kẻ giàu nhất hoặc Bố Già (65%), còn lại nhắm ngẫu nhiên tạo bất ngờ
      let targetId: string;
      if (this.ctx.rng() < 0.65) {
        const sortedRich = [...others].sort((a, b) => {
          const wa = (this.cash.get(a) ?? 0) + (this.diamonds.get(a) ?? 0) * 8_000 + (a === this.godfatherId ? 5_000 : 0);
          const wb = (this.cash.get(b) ?? 0) + (this.diamonds.get(b) ?? 0) * 8_000 + (b === this.godfatherId ? 5_000 : 0);
          return wb - wa;
        });
        targetId = sortedRich[0];
      } else {
        targetId = others[Math.floor(this.ctx.rng() * others.length) % others.length];
      }

      // Khi trên bàn có nhiều tiền to hoặc kim cương, ưu tiên nạp đạn thật nếu có; ngược lại lừa đạn giả
      const highValueTable = this.tableLoot.some((c) => c.kind === 'diamond_10k' || c.kind === 'cash_20k' || c.kind === 'godfather');
      const bangIndices = clip.map((b, i) => (b === 'bang' ? i : -1)).filter((i) => i >= 0);
      const clickIndices = clip.map((b, i) => (b === 'click' ? i : -1)).filter((i) => i >= 0);

      let bulletIndex = 0;
      if (highValueTable && bangIndices.length > 0 && this.ctx.rng() < 0.6) {
        bulletIndex = bangIndices[0];
      } else if (!highValueTable && clickIndices.length > 0 && this.ctx.rng() < 0.7) {
        bulletIndex = clickIndices[0];
      } else {
        bulletIndex = Math.floor(this.ctx.rng() * clip.length) % clip.length;
      }

      return { type: 'cg_plan', bulletIndex, targetId };
    }

    if (this.phase === 'standoff') {
      // Nếu máy đang là Bố Già và bị ai đó chĩa súng vào mặt, lập tức ép kẻ đó quay nòng sang người khác!
      if (playerId === this.godfatherId && !this.redirectedByGodfather && !this.surrendered.has(playerId)) {
        const threatId = this.order.find(
          (sid) => sid !== playerId && this.alive.has(sid) && !this.surrendered.has(sid) && this.aims.get(sid) === playerId,
        );
        if (threatId) {
          const altTargets = this.order.filter((id) => id !== playerId && id !== threatId && this.alive.has(id));
          if (altTargets.length > 0) {
            const newAimId = altTargets[Math.floor(this.ctx.rng() * altTargets.length) % altTargets.length];
            return { type: 'cg_godfather', targetId: threatId, newAimId };
          }
        }
      }

      if (!this.decidedStandoff.has(playerId)) {
        const gunsOnMe = this.order.filter(
          (sid) => sid !== playerId && this.alive.has(sid) && !this.surrendered.has(sid) && this.aims.get(sid) === playerId,
        ).length;
        const myHp = this.hp.get(playerId) ?? 1;

        let decision: 'stand' | 'surrender' = 'stand';
        if (myHp === 1 && gunsOnMe >= 2) {
          decision = 'surrender';
        } else if (myHp === 1 && gunsOnMe === 1) {
          decision = this.ctx.rng() < 0.55 ? 'surrender' : 'stand';
        } else if (gunsOnMe >= 3) {
          decision = this.ctx.rng() < 0.7 ? 'surrender' : 'stand';
        }

        return { type: 'cg_standoff', decision };
      }
    }

    return null;
  }

  view(viewerId?: string): CashGunsView {
    const showAims = this.phase !== 'plan';
    const aimsRecord: Record<string, string | null> = {};
    if (showAims) {
      for (const id of this.order) {
        aimsRecord[id] = this.aims.get(id) ?? null;
      }
    }

    const myPlan = viewerId ? this.plans.get(viewerId) : undefined;

    return {
      type: 'cashnguns',
      round: this.round,
      maxRounds: this.maxRounds,
      phase: this.phase,
      phaseEndsAt: this.phaseEndsAt,
      phaseSeconds: this.phaseSeconds,
      order: [...this.order],
      names: Object.fromEntries(this.names),
      hp: Object.fromEntries(this.order.map((id) => [id, this.hp.get(id) ?? 0])),
      alive: this.order.filter((id) => this.alive.has(id)),
      cash: Object.fromEntries(this.order.map((id) => [id, this.cash.get(id) ?? 0])),
      diamonds: Object.fromEntries(this.order.map((id) => [id, this.diamonds.get(id) ?? 0])),
      godfatherId: this.godfatherId,
      tableLoot: [...this.tableLoot],
      plannedIds: [...this.plans.keys()],
      aims: aimsRecord,
      surrendered: this.order.filter((id) => this.surrendered.has(id)),
      redirectedByGodfather: this.redirectedByGodfather,
      lastShots: [...this.lastShots],
      lastLootGains: { ...this.lastLootGains },
      myClip: viewerId ? [...(this.clips.get(viewerId) ?? [])] : [],
      myPickedBulletIndex: myPlan ? myPlan.bulletIndex : null,
      myAimTarget: myPlan ? myPlan.targetId : null,
    };
  }

  dispose(): void {
    this.timer.clear();
  }
}
