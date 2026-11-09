import { randomUUID } from 'node:crypto';
import { toSyllables, firstSyllable, lastSyllable } from '../../shared/src/vi';
import {
  MAX_PLAYERS, TURN_SECONDS, WORD_SYLLABLES,
  type ErrorCode, type HistoryItem, type Phase, type RejectReason, type RoomState,
} from '../../shared/src/types';
import type { Dictionary, Rng } from './dictionary';

export interface RoomOptions {
  turnMs?: number;
  disconnectGraceMs?: number;
  rng?: Rng;
  onChange?: (room: Room) => void;
}

interface Player {
  id: string;
  name: string;
  connected: boolean;
  eliminated: boolean;
  words: number;
  removeTimer?: ReturnType<typeof setTimeout>;
}

type Result<T = {}> = ({ ok: true } & T) | { ok: false; error: ErrorCode };

const MAX_NAME = 20;
const MAX_HISTORY = 300;

export function cleanName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (name.length < 1 || name.length > MAX_NAME) return null;
  return name;
}

export class Room {
  phase: Phase = 'lobby';
  players: Player[] = [];
  hostId = '';

  private currentWord: string | null = null;
  private currentId: string | null = null;
  private turnEndsAt: number | null = null;
  private turnTimer?: ReturnType<typeof setTimeout>;
  private used = new Set<string>();
  private history: HistoryItem[] = [];
  private winnerId: string | null = null;
  private totalWords = 0;
  private soloGame = false;

  private readonly turnMs: number;
  private readonly graceMs: number;
  private readonly rng: Rng;
  private readonly onChange: (room: Room) => void;

  constructor(readonly code: string, private readonly dict: Dictionary, opts: RoomOptions = {}) {
    this.turnMs = opts.turnMs ?? TURN_SECONDS * 1000;
    this.graceMs = opts.disconnectGraceMs ?? 30_000;
    this.rng = opts.rng ?? Math.random;
    this.onChange = opts.onChange ?? (() => {});
  }

  get connectedCount(): number {
    return this.players.filter((p) => p.connected).length;
  }

  has(playerId: string): boolean {
    return this.players.some((p) => p.id === playerId);
  }

  // ---------- người chơi ----------

  /** Vào phòng. Nếu `existingId` đã có trong phòng thì coi như vào lại (kể cả khi đang chơi). */
  addPlayer(rawName: unknown, existingId?: string): Result<{ playerId: string }> {
    const existing = existingId ? this.find(existingId) : undefined;
    if (existing) {
      this.setConnected(existing.id, true);
      return { ok: true, playerId: existing.id };
    }
    const name = cleanName(rawName);
    if (!name) return { ok: false, error: 'invalid_name' };
    if (this.phase !== 'lobby') return { ok: false, error: 'room_playing' };
    if (this.players.length >= MAX_PLAYERS) return { ok: false, error: 'room_full' };

    const id = existingId && /^[\w-]{8,64}$/.test(existingId) ? existingId : randomUUID();
    this.players.push({ id, name: this.uniqueName(name), connected: true, eliminated: false, words: 0 });
    if (!this.hostId) this.hostId = id;
    this.changed();
    return { ok: true, playerId: id };
  }

  setConnected(playerId: string, connected: boolean): void {
    const p = this.find(playerId);
    if (!p || p.connected === connected) {
      if (p && connected) this.clearRemoveTimer(p);
      return;
    }
    p.connected = connected;
    if (connected) this.clearRemoveTimer(p);
    else if (this.phase !== 'playing') this.scheduleRemoval(p);
    this.changed();
  }

  /** Rời phòng hẳn (bấm thoát, hoặc mất kết nối quá lâu). */
  removePlayer(playerId: string): void {
    const p = this.find(playerId);
    if (!p) return;
    this.clearRemoveTimer(p);

    let nextId: string | null = null;
    const wasCurrent = this.phase === 'playing' && this.currentId === p.id;
    if (this.phase === 'playing' && !p.eliminated) {
      this.pushHistory({ kind: 'eliminated', playerId: p.id, name: p.name, reason: 'left' });
      if (wasCurrent) nextId = this.nextAliveId(p.id, true);
    }
    this.players = this.players.filter((x) => x.id !== p.id);
    if (this.hostId === p.id) this.hostId = this.players[0]?.id ?? '';

    if (this.phase === 'playing') {
      if (this.checkEnd()) return;
      if (wasCurrent) {
        this.currentId = nextId;
        this.beginTurn();
      }
    }
    this.changed();
  }

  // ---------- ván chơi ----------

  start(byId: string): Result {
    if (byId !== this.hostId) return { ok: false, error: 'not_host' };
    if (this.phase !== 'lobby' || this.players.length === 0) return { ok: false, error: 'bad_request' };

    this.shuffle(this.players);
    for (const p of this.players) {
      p.eliminated = false;
      p.words = 0;
    }
    this.used = new Set();
    this.history = [];
    this.winnerId = null;
    this.totalWords = 0;
    this.soloGame = this.players.length === 1;

    const first = this.dict.randomStart(this.used, this.rng);
    if (!first) return { ok: false, error: 'bad_request' };
    this.currentWord = first;
    this.used.add(first);
    this.pushHistory({ kind: 'start', word: first });

    this.phase = 'playing';
    this.currentId = this.players[0].id;
    this.beginTurn();
    this.changed();
    return { ok: true };
  }

  submit(byId: string, raw: unknown): { ok: true } | { ok: false; reason: RejectReason } {
    if (this.phase !== 'playing' || !this.currentWord) return { ok: false, reason: 'not_playing' };
    if (byId !== this.currentId) return { ok: false, reason: 'not_your_turn' };
    if (this.turnEndsAt !== null && Date.now() >= this.turnEndsAt) {
      this.handleTimeout();
      return { ok: false, reason: 'timeout' };
    }
    if (typeof raw !== 'string' || raw.length > 60) return { ok: false, reason: 'format' };

    const syl = toSyllables(raw);
    if (!syl || syl.length !== WORD_SYLLABLES) return { ok: false, reason: 'format' };
    const word = syl.join(' ');
    if (firstSyllable(word) !== lastSyllable(this.currentWord)) return { ok: false, reason: 'chain' };
    if (this.used.has(word)) return { ok: false, reason: 'used' };
    if (!this.dict.has(word)) return { ok: false, reason: 'not_in_dictionary' };

    const player = this.find(byId)!;
    player.words++;
    this.totalWords++;
    this.used.add(word);
    this.currentWord = word;
    this.pushHistory({ kind: 'word', word, playerId: byId, name: player.name });
    this.currentId = this.nextAliveId(byId, false);
    this.beginTurn();
    this.changed();
    return { ok: true };
  }

  restart(byId: string): Result {
    if (byId !== this.hostId) return { ok: false, error: 'not_host' };
    if (this.phase !== 'finished') return { ok: false, error: 'bad_request' };
    this.phase = 'lobby';
    this.currentWord = null;
    this.currentId = null;
    this.turnEndsAt = null;
    this.used = new Set();
    this.history = [];
    this.winnerId = null;
    this.totalWords = 0;
    for (const p of this.players) {
      p.eliminated = false;
      p.words = 0;
    }
    this.changed();
    return { ok: true };
  }

  toPublic(): RoomState {
    return {
      code: this.code,
      phase: this.phase,
      hostId: this.hostId,
      players: this.players.map((p) => ({
        id: p.id, name: p.name, connected: p.connected, eliminated: p.eliminated, words: p.words,
      })),
      maxPlayers: MAX_PLAYERS,
      turnSeconds: this.turnMs / 1000,
      currentWord: this.currentWord,
      currentPlayerId: this.phase === 'playing' ? this.currentId : null,
      turnEndsAt: this.phase === 'playing' ? this.turnEndsAt : null,
      serverNow: Date.now(),
      nextCount: this.phase === 'playing' && this.currentWord
        ? this.dict.countNext(lastSyllable(this.currentWord), this.used)
        : null,
      history: this.history,
      winnerId: this.winnerId,
      totalWords: this.totalWords,
    };
  }

  dispose(): void {
    clearTimeout(this.turnTimer);
    for (const p of this.players) this.clearRemoveTimer(p);
  }

  // ---------- nội bộ ----------

  private beginTurn(): void {
    clearTimeout(this.turnTimer);
    this.turnEndsAt = Date.now() + this.turnMs;
    this.turnTimer = setTimeout(() => this.handleTimeout(), this.turnMs);
  }

  private handleTimeout(): void {
    if (this.phase !== 'playing' || !this.currentId || !this.currentWord) return;
    clearTimeout(this.turnTimer);
    const loser = this.find(this.currentId);
    if (loser) {
      loser.eliminated = true;
      this.pushHistory({ kind: 'eliminated', playerId: loser.id, name: loser.name, reason: 'timeout' });
    }
    if (this.checkEnd()) return;

    // ngõ cụt: đổi từ mới để người kế tiếp không bị loại dây chuyền
    if (this.dict.countNext(lastSyllable(this.currentWord), this.used) === 0) {
      const fresh = this.dict.randomStart(this.used, this.rng);
      if (!fresh) {
        this.finish();
        return;
      }
      this.currentWord = fresh;
      this.used.add(fresh);
      this.pushHistory({ kind: 'newWord', word: fresh });
    }
    this.currentId = this.nextAliveId(this.currentId, true);
    this.beginTurn();
    this.changed();
  }

  /** Kết thúc ván nếu đủ điều kiện. Trả về true nếu đã kết thúc. */
  private checkEnd(): boolean {
    const alive = this.players.filter((p) => !p.eliminated);
    const over = this.soloGame ? alive.length === 0 : alive.length <= 1;
    if (!over) return false;
    this.winnerId = this.soloGame ? null : alive[0]?.id ?? null;
    this.finish();
    return true;
  }

  private finish(): void {
    clearTimeout(this.turnTimer);
    this.phase = 'finished';
    this.currentId = null;
    this.turnEndsAt = null;
    for (const p of this.players) if (!p.connected) this.scheduleRemoval(p);
    this.changed();
  }

  /** Người còn chơi kế tiếp sau `afterId`. `skipSelf`: không được chọn lại chính người đó. */
  private nextAliveId(afterId: string, skipSelf: boolean): string | null {
    const n = this.players.length;
    const start = this.players.findIndex((p) => p.id === afterId);
    for (let i = 1; i <= n; i++) {
      const p = this.players[(start + i) % n];
      if (skipSelf && p.id === afterId) continue;
      if (!p.eliminated) return p.id;
    }
    return null;
  }

  private find(id: string): Player | undefined {
    return this.players.find((p) => p.id === id);
  }

  private uniqueName(name: string): string {
    const taken = new Set(this.players.map((p) => p.name.toLowerCase()));
    if (!taken.has(name.toLowerCase())) return name;
    for (let i = 2; ; i++) {
      const candidate = `${name} ${i}`;
      if (!taken.has(candidate.toLowerCase())) return candidate;
    }
  }

  private scheduleRemoval(p: Player): void {
    this.clearRemoveTimer(p);
    p.removeTimer = setTimeout(() => this.removePlayer(p.id), this.graceMs);
  }

  private clearRemoveTimer(p: Player): void {
    if (p.removeTimer) clearTimeout(p.removeTimer);
    p.removeTimer = undefined;
  }

  private pushHistory(item: HistoryItem): void {
    this.history.push(item);
    if (this.history.length > MAX_HISTORY) this.history.splice(0, this.history.length - MAX_HISTORY);
  }

  private shuffle<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  private changed(): void {
    this.onChange(this);
  }
}
