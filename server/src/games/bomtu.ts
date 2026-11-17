import {
  BOM_TU_FALLBACK_WORDS, BOM_TU_MAX_HEARTS,
  type BomTuLogEntry, type BomTuView,
} from '../../../shared/src/bomtu';
import type { ActionResult, GameAction } from '../../../shared/src/types';
import { normalizeWord } from '../../../shared/src/vi';
import type { Dictionary } from '../dictionary';
import { Timer, type EngineContext, type EnginePlayer, type GameEngine } from './engine';

interface BomTuIndex {
  syllables: string[];
  validWords: Set<string>;
  bySyllable: Map<string, string[]>;
}

const INDEX_CACHE = new WeakMap<Dictionary, BomTuIndex>();

function buildIndex(dict: Dictionary): BomTuIndex {
  const cached = INDEX_CACHE.get(dict);
  if (cached) return cached;

  const validWords = new Set<string>();
  const dictWords = dict.allWords();
  const minThreshold = dictWords.size >= 400 ? 12 : 2;
  const source = dictWords.size >= 200 ? dictWords : new Set([...dictWords, ...BOM_TU_FALLBACK_WORDS]);

  const bySyllable = new Map<string, string[]>();
  for (const raw of source) {
    const w = normalizeWord(raw);
    if (!w) continue;
    const parts = w.split(' ');
    if (parts.length !== 2) continue;
    validWords.add(w);
    const seen = new Set<string>();
    for (const syl of parts) {
      if (syl.length < 2 || seen.has(syl)) continue;
      seen.add(syl);
      const list = bySyllable.get(syl) ?? [];
      list.push(w);
      bySyllable.set(syl, list);
    }
  }

  const filtered = new Map<string, string[]>();
  for (const [syl, words] of bySyllable) {
    if (words.length >= minThreshold) filtered.set(syl, words);
  }
  if (filtered.size === 0) {
    for (const [syl, words] of bySyllable) {
      if (words.length >= 1) filtered.set(syl, words);
    }
  }
  const index: BomTuIndex = {
    syllables: [...filtered.keys()],
    validWords,
    bySyllable: filtered,
  };
  INDEX_CACHE.set(dict, index);
  return index;
}

export class BomTuGame implements GameEngine {
  private order: string[] = [];
  private names = new Map<string, string>();
  private alive: string[] = [];
  private hearts = new Map<string, number>();

  private index!: BomTuIndex;
  private usedWords = new Set<string>();
  private recent: BomTuLogEntry[] = [];
  private logSeq = 0;

  private round = 1;
  private holderIdx = 0;
  private bombSyllable = 'mèo';
  private fuseEndsAt: number | null = null;
  private fuseSeconds = 10;
  private lastBoom: { playerId: string; name: string; syllable: string } | null = null;
  private finished = false;
  private readonly timer = new Timer();

  constructor(private readonly ctx: EngineContext) {}

  private fuseMs(): number {
    const base = 7500 + Math.floor(this.ctx.rng() * 4500);
    const speedUp = Math.min(2500, this.usedWords.size * 120);
    const natural = Math.max(5000, base - speedUp);
    return this.ctx.turnMs ? Math.min(natural, Math.max(300, this.ctx.turnMs)) : natural;
  }

  private pickSyllable(): string {
    const list = this.index.syllables;
    if (!list.length) return 'mèo';
    for (let i = 0; i < 8; i++) {
      const syl = list[Math.floor(this.ctx.rng() * list.length) % list.length];
      const candidates = this.index.bySyllable.get(syl) ?? [];
      if (candidates.some((w) => !this.usedWords.has(w))) return syl;
    }
    return list[Math.floor(this.ctx.rng() * list.length) % list.length];
  }

  start(players: EnginePlayer[]): void {
    this.index = buildIndex(this.ctx.dict);
    this.order = players.map((p) => p.id);
    this.alive = [...this.order];
    for (const p of players) {
      this.names.set(p.id, p.name);
      this.hearts.set(p.id, BOM_TU_MAX_HEARTS);
    }
    this.holderIdx = 0;
    this.startFuse(true);
    this.ctx.changed();
  }

  private currentHolder(): string | null {
    return this.alive[this.holderIdx % Math.max(1, this.alive.length)] ?? null;
  }

  private startFuse(newSyllable: boolean): void {
    if (this.finished || this.alive.length === 0) return;
    if (newSyllable) this.bombSyllable = this.pickSyllable();
    const ms = this.fuseMs();
    this.fuseSeconds = Math.max(1, Math.round(ms / 1000));
    this.fuseEndsAt = Date.now() + ms;
    this.timer.set(ms, () => this.explode());
  }

  private explode(): void {
    if (this.finished || this.alive.length === 0) return;
    const victimId = this.currentHolder();
    if (!victimId) return;
    const left = (this.hearts.get(victimId) ?? 1) - 1;
    this.hearts.set(victimId, Math.max(0, left));
    this.lastBoom = { playerId: victimId, name: this.names.get(victimId) ?? victimId, syllable: this.bombSyllable };
    this.recent.push({
      id: ++this.logSeq,
      playerId: victimId,
      name: this.names.get(victimId) ?? victimId,
      word: `💥 BÙM! Mất 1 tim (tiếng "${this.bombSyllable}")`,
      boom: true,
    });
    if (this.recent.length > 20) this.recent.shift();

    if (left <= 0) {
      const idx = this.alive.indexOf(victimId);
      this.alive.splice(idx, 1);
      if (this.alive.length <= 1) {
        this.finishGame();
        return;
      }
      this.holderIdx = idx % this.alive.length;
    } else {
      this.holderIdx = (this.holderIdx + 1) % this.alive.length;
    }
    this.round++;
    this.startFuse(true);
    this.ctx.changed();
  }

  private finishGame(): void {
    if (this.finished) return;
    this.finished = true;
    this.timer.clear();
    const sorted = [...this.order].sort((a, b) => (this.hearts.get(b) ?? 0) - (this.hearts.get(a) ?? 0));
    const winnerId = this.alive[0] ?? sorted[0] ?? null;
    const ranking = sorted.map((id) => {
      const h = this.hearts.get(id) ?? 0;
      return {
        playerId: id,
        name: this.names.get(id) ?? id,
        detail: h > 0 ? `❤️ ×${h} · Trụ lại cuối cùng!` : '💥 Hết tim',
      };
    });
    this.ctx.finish({
      winnerId,
      winnerIds: winnerId ? [winnerId] : [],
      ranking,
      headline: winnerId ? `💣 ${this.names.get(winnerId)} sống sót cuối cùng trong Bom Chữ!` : '💣 Hết ván Bom Chữ!',
    });
  }

  action(playerId: string, action: GameAction): ActionResult {
    if (this.finished) return { ok: false, reason: 'not_playing' };
    if (action.type !== 'bt_submit') return { ok: false, reason: 'bad_action' };
    if (playerId !== this.currentHolder()) return { ok: false, reason: 'not_your_turn' };

    const clean = normalizeWord(action.word);
    if (!clean) return { ok: false, reason: 'format' };
    const parts = clean.split(' ');
    if (parts.length !== 2) return { ok: false, reason: 'format' };
    if (!parts.includes(this.bombSyllable)) return { ok: false, reason: 'chain' };
    if (this.usedWords.has(clean)) return { ok: false, reason: 'used' };
    if (!this.index.validWords.has(clean) && !this.ctx.dict.has(clean)) return { ok: false, reason: 'not_in_dictionary' };

    this.timer.clear();
    this.usedWords.add(clean);
    this.lastBoom = null;
    this.recent.push({ id: ++this.logSeq, playerId, name: this.names.get(playerId) ?? playerId, word: clean });
    if (this.recent.length > 20) this.recent.shift();

    this.holderIdx = (this.holderIdx + 1) % this.alive.length;
    this.round++;
    const changeSyl = this.ctx.rng() < 0.45;
    this.startFuse(changeSyl);
    this.ctx.changed();
    return { ok: true, word: clean };
  }

  removePlayer(playerId: string): void {
    if (this.finished) return;
    const idx = this.alive.indexOf(playerId);
    if (idx === -1) return;
    const wasHolder = idx === this.holderIdx;
    this.alive.splice(idx, 1);
    this.hearts.set(playerId, 0);
    if (this.alive.length <= 1) {
      this.finishGame();
      return;
    }
    if (wasHolder) {
      this.timer.clear();
      this.holderIdx = idx % this.alive.length;
      this.startFuse(true);
    } else if (idx < this.holderIdx) {
      this.holderIdx--;
    }
    this.ctx.changed();
  }

  onPlayerConnection(_playerId: string, connected: boolean): void {
    if (!this.finished && connected) this.ctx.changed();
  }

  renamePlayer(playerId: string, name: string): void {
    if (this.names.has(playerId)) this.names.set(playerId, name);
  }

  botAction(playerId: string): GameAction | null {
    if (this.finished || playerId !== this.currentHolder()) return null;
    if (this.ctx.rng() < 0.2) return null; // Đôi khi bot cũng bị bí từ để nổ cho vui!
    const pool = (this.index.bySyllable.get(this.bombSyllable) ?? []).filter((w) => !this.usedWords.has(w));
    const pick = pool[Math.floor(this.ctx.rng() * pool.length) % pool.length];
    return pick ? { type: 'bt_submit', word: pick } : null;
  }

  view(): BomTuView {
    return {
      type: 'bom_tu',
      round: this.round,
      bombSyllable: this.bombSyllable,
      holderId: this.currentHolder(),
      fuseEndsAt: this.fuseEndsAt,
      fuseSeconds: this.fuseSeconds,
      order: [...this.order],
      names: Object.fromEntries(this.names),
      alive: [...this.alive],
      hearts: Object.fromEntries(this.hearts),
      usedCount: this.usedWords.size,
      recent: [...this.recent],
      lastBoom: this.lastBoom,
    };
  }

  dispose(): void {
    this.timer.clear();
  }
}
