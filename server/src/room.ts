import { randomUUID } from 'node:crypto';
import {
  BAUCUA_DEFAULT_ROUNDS, BAUCUA_ROUND_OPTIONS, type BauCuaRounds,
  CHARACTER_AGES, CHARACTER_GENDERS, CHARACTER_HAIRS, PLAYER_COLORS,
  type CharacterAge, type CharacterConfig, type CharacterGender, type CharacterHair,
  STICKER_IDS, type StickerId, CHAT_MAX, GAME_INFO, MAX_NAME, MAX_PLAYERS,
  type ActionResult, type ChatMsg, type ErrorCode, type GameAction, type GameResult, type GameType, type Phase,
  type RoomSettings, type RoomState,
} from '../../shared/src/types';
import { HpBoard } from './fun';
import type { Dictionary, Rng } from './dictionary';
import type { GameEngine } from './games/engine';
import { WordChainGame } from './games/wordchain';
import { LudoGame } from './games/ludo';
import { BauCuaGame } from './games/baucua';
import { TyPhuGame } from './games/typhu';

export interface RoomOptions {
  /** thời gian một lượt/một bước cho mọi game (ms) — để test rút ngắn */
  turnMs?: number;
  disconnectGraceMs?: number;
  rng?: Rng;
  onChange?: (room: Room) => void;
  /** ván vừa kết thúc (để cộng thành tích cho tài khoản) */
  onFinish?: (info: { gameType: GameType; participants: string[]; winnerId: string | null }) => void;
  /** cả phòng duyệt một từ mới */
  learnWord?: (word: string, byName: string) => void;
}

interface Player {
  id: string;
  name: string;
  connected: boolean;
  avatar: number;
  avatarUrl?: string;
  character: CharacterConfig;
  account: boolean;
  removeTimer?: ReturnType<typeof setTimeout>;
}

/** id của người chơi đã đăng nhập: "u-" + id tài khoản (khách không được dùng tiền tố này) */
export const ACCOUNT_PREFIX = 'u-';
const CHAT_KEEP = 40;

type Result<T = {}> = ({ ok: true } & T) | { ok: false; error: ErrorCode };

const AVATAR_COUNT = 16;
const GAME_TYPES = Object.keys(GAME_INFO) as GameType[];

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
  gameType: GameType = 'wordchain';
  settings: RoomSettings = { ludoPieces: 4, baucuaRounds: BAUCUA_DEFAULT_ROUNDS };

  private engine: GameEngine | null = null;
  private result: GameResult | null = null;
  private participants: string[] = [];
  private chat: ChatMsg[] = [];
  private chatSeq = 0;
  readonly hp: HpBoard;
  private readonly graceMs: number;
  private readonly rng: Rng;
  private readonly onChange: (room: Room) => void;

  constructor(readonly code: string, private readonly dict: Dictionary, private readonly opts: RoomOptions = {}) {
    this.graceMs = opts.disconnectGraceMs ?? 30_000;
    this.rng = opts.rng ?? Math.random;
    this.onChange = opts.onChange ?? (() => {});
    this.hp = new HpBoard(this.rng);
  }

  get connectedCount(): number {
    return this.players.filter((p) => p.connected).length;
  }

  has(playerId: string): boolean {
    return this.players.some((p) => p.id === playerId);
  }

  /** Người chơi vào phòng sau khi ván đã bắt đầu: chỉ được xem cho tới khi về lại phòng chờ */
  isSpectator(playerId: string): boolean {
    return this.phase !== 'lobby' && !this.participants.includes(playerId);
  }

  // ---------- người chơi ----------

  /** Vào phòng. Nếu ván đang diễn ra, người mới vẫn được vào ở chế độ xem (spectator). */
  addPlayer(rawName: unknown, existingId?: string, profile?: { avatar?: number; avatarUrl?: string; account?: boolean }): Result<{ playerId: string }> {
    const account = profile?.account === true;
    // khách không được mạo danh id tài khoản
    if (existingId?.startsWith(ACCOUNT_PREFIX) && !account) existingId = undefined;
    const existing = existingId ? this.find(existingId) : undefined;
    if (existing) {
      this.setConnected(existing.id, true);
      return { ok: true, playerId: existing.id };
    }
    const name = cleanName(rawName);
    if (!name) return { ok: false, error: 'invalid_name' };
    if (this.players.length >= MAX_PLAYERS) return { ok: false, error: 'room_full' };

    const id = existingId && /^[\w-]{8,64}$/.test(existingId) ? existingId : randomUUID();
    const character: CharacterConfig = {
      gender: CHARACTER_GENDERS[this.players.length % CHARACTER_GENDERS.length],
      age: CHARACTER_AGES[this.players.length % CHARACTER_AGES.length],
      hair: CHARACTER_HAIRS[this.players.length % CHARACTER_HAIRS.length],
      color: this.freeColor(),
    };
    this.players.push({ id, name: this.uniqueName(name), connected: true, avatar: this.freeAvatar(profile?.avatar), avatarUrl: profile?.avatarUrl, character, account });
    if (!this.hostId) this.hostId = id;
    this.changed();
    return { ok: true, playerId: id };
  }

  /** Tùy chỉnh hình tượng nhân vật (giới tính, độ tuổi, kiểu tóc, màu sắc không trùng trong phòng) */
  customize(playerId: string, partial: Partial<CharacterConfig>): Result {
    const p = this.find(playerId);
    if (!p) return { ok: false, error: 'not_in_room' };
    if (!partial || typeof partial !== 'object') return { ok: false, error: 'bad_request' };
    const next: CharacterConfig = { ...p.character };
    if (partial.gender !== undefined) {
      if (!CHARACTER_GENDERS.includes(partial.gender as CharacterGender)) return { ok: false, error: 'bad_request' };
      next.gender = partial.gender;
    }
    if (partial.age !== undefined) {
      if (!CHARACTER_AGES.includes(partial.age as CharacterAge)) return { ok: false, error: 'bad_request' };
      next.age = partial.age;
    }
    if (partial.hair !== undefined) {
      if (!CHARACTER_HAIRS.includes(partial.hair as CharacterHair)) return { ok: false, error: 'bad_request' };
      next.hair = partial.hair;
    }
    if (partial.color !== undefined) {
      const c = partial.color;
      if (!Number.isInteger(c) || c < 0 || c >= PLAYER_COLORS.length) return { ok: false, error: 'bad_request' };
      if (this.players.some((other) => other.id !== p.id && other.character.color === c)) {
        return { ok: false, error: 'color_taken' };
      }
      next.color = c;
    }
    p.character = next;
    this.changed();
    return { ok: true };
  }

  /** Đổi tên/ảnh đại diện (khi người chơi sửa hồ sơ tài khoản) — chỉ khi chưa vào ván */
  updateProfile(playerId: string, name?: string, avatar?: number, avatarUrl?: string): void {
    const p = this.find(playerId);
    if (!p) return;
    // Callers pass the complete public profile, so undefined explicitly clears a removed upload.
    p.avatarUrl = avatarUrl;
    if (this.phase === 'playing') { this.changed(); return; }
    if (name && name !== p.name) {
      p.name = '';
      p.name = this.uniqueName(name);
    }
    if (avatar !== undefined && avatar !== p.avatar) {
      const old = p.avatar;
      p.avatar = -1;
      p.avatar = this.freeAvatar(avatar, old);
    }
    this.changed();
  }

  /** Tin nhắn trò chuyện: trả về tin đã làm sạch, hoặc null nếu không hợp lệ */
  addChat(playerId: string, raw: unknown): ChatMsg | null {
    const p = this.find(playerId);
    if (!p) return null;
    const input = typeof raw === 'string' ? { text: raw } : raw as Record<string, unknown> | null;
    if (!input || typeof input !== 'object') return null;
    const base = { id: this.chatSeq + 1, from: p.id, name: p.name, at: Date.now() };
    let msg: ChatMsg;
    if ('kind' in input && input.kind === 'sticker') {
      if (!STICKER_IDS.includes(input.stickerId as StickerId)) return null;
      msg = { ...base, kind: 'sticker', stickerId: input.stickerId as StickerId };
    } else {
      if (('kind' in input && input.kind !== undefined && input.kind !== 'text') || typeof input.text !== 'string') return null;
      const text = input.text.normalize('NFC').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, CHAT_MAX);
      if (!text) return null;
      msg = { ...base, kind: 'text', text };
    }
    this.chatSeq++;
    this.chat.push(msg);
    if (this.chat.length > CHAT_KEEP) this.chat.shift();
    return msg;
  }

  get chatLog(): ChatMsg[] {
    return [...this.chat];
  }

  setConnected(playerId: string, connected: boolean): void {
    const p = this.find(playerId);
    if (!p) return;
    if (connected) this.clearRemoveTimer(p);
    if (p.connected === connected) return;
    p.connected = connected;
    if (!connected && this.phase !== 'playing') this.scheduleRemoval(p);
    this.changed();
  }

  /** Rời phòng hẳn (bấm thoát, hoặc mất kết nối quá lâu). */
  removePlayer(playerId: string): void {
    const p = this.find(playerId);
    if (!p) return;
    this.clearRemoveTimer(p);
    this.players = this.players.filter((x) => x.id !== p.id);
    this.hp.remove(p.id);
    if (this.hostId === p.id) this.hostId = this.players[0]?.id ?? '';
    if (this.phase === 'playing') this.engine?.removePlayer(p.id);
    this.changed();
  }

  // ---------- cấu hình & ván chơi ----------

  configure(byId: string, gameType?: unknown, settings?: Partial<RoomSettings>): Result {
    if (byId !== this.hostId) return { ok: false, error: 'not_host' };
    if (this.phase === 'playing') return { ok: false, error: 'room_playing' };
    if (gameType !== undefined) {
      if (!GAME_TYPES.includes(gameType as GameType)) return { ok: false, error: 'bad_request' };
      this.gameType = gameType as GameType;
    }
    if (settings?.ludoPieces !== undefined) {
      if (settings.ludoPieces !== 2 && settings.ludoPieces !== 4) return { ok: false, error: 'bad_request' };
      this.settings = { ...this.settings, ludoPieces: settings.ludoPieces };
    }
    if (settings?.baucuaRounds !== undefined) {
      if (!BAUCUA_ROUND_OPTIONS.includes(settings.baucuaRounds as BauCuaRounds)) return { ok: false, error: 'bad_request' };
      this.settings = { ...this.settings, baucuaRounds: settings.baucuaRounds };
    }
    // đổi game sau khi kết thúc thì quay về phòng chờ
    if (this.phase === 'finished') this.backToLobby();
    this.changed();
    return { ok: true };
  }

  start(byId: string): Result {
    if (byId !== this.hostId) return { ok: false, error: 'not_host' };
    if (this.phase !== 'lobby') return { ok: false, error: 'bad_request' };
    const info = GAME_INFO[this.gameType];
    if (this.players.length < info.min) return { ok: false, error: 'too_few_players' };
    if (this.players.length > info.max) return { ok: false, error: 'too_many_players' };

    const order = [...this.players];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    this.result = null;
    this.participants = order.map((p) => p.id);
    this.engine = this.createEngine();
    this.phase = 'playing';
    this.engine.start(order.map((p) => ({ id: p.id, name: p.name })));
    this.changed();
    return { ok: true };
  }

  action(byId: string, action: unknown): ActionResult {
    if (this.phase !== 'playing' || !this.engine) return { ok: false, reason: 'not_playing' };
    if (!this.participants.includes(byId)) return { ok: false, reason: 'spectating' };
    if (!action || typeof action !== 'object' || typeof (action as GameAction).type !== 'string') {
      return { ok: false, reason: 'bad_action' };
    }
    return this.engine.action(byId, action as GameAction);
  }

  restart(byId: string): Result {
    if (byId !== this.hostId) return { ok: false, error: 'not_host' };
    if (this.phase !== 'finished') return { ok: false, error: 'bad_request' };
    this.backToLobby();
    this.changed();
    return { ok: true };
  }

  toPublic(): RoomState {
    return {
      code: this.code,
      phase: this.phase,
      hostId: this.hostId,
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        connected: p.connected,
        avatar: p.avatar,
        ...(p.avatarUrl ? { avatarUrl: p.avatarUrl } : {}),
        character: p.character,
        ...(this.isSpectator(p.id) ? { spectator: true } : {}),
        ...(p.account ? { account: true } : {}),
      })),
      maxPlayers: MAX_PLAYERS,
      gameType: this.gameType,
      settings: this.settings,
      serverNow: Date.now(),
      game: this.engine ? this.engine.view() : null,
      result: this.result,
    };
  }

  dispose(): void {
    this.engine?.dispose();
    for (const p of this.players) this.clearRemoveTimer(p);
  }

  // ---------- nội bộ ----------

  private createEngine(): GameEngine {
    const ctx = {
      rng: this.rng,
      dict: this.dict,
      settings: this.settings,
      turnMs: this.opts.turnMs,
      hostId: () => this.hostId,
      isConnected: (id: string) => this.find(id)?.connected ?? false,
      changed: () => {
        if (this.phase === 'playing') this.changed();
      },
      finish: (result: GameResult) => this.finish(result),
      learnWord: (word: string, byName: string) => this.opts.learnWord?.(word, byName),
    };
    switch (this.gameType) {
      case 'ludo':
        return new LudoGame(ctx);
      case 'baucua':
        return new BauCuaGame(ctx);
      case 'typhu':
        return new TyPhuGame(ctx);
      default:
        return new WordChainGame(ctx);
    }
  }

  private finish(result: GameResult): void {
    if (this.phase !== 'playing') return;
    this.phase = 'finished';
    this.result = result;
    this.engine?.dispose();
    for (const p of this.players) if (!p.connected) this.scheduleRemoval(p);
    this.changed();
    this.opts.onFinish?.({ gameType: this.gameType, participants: this.participants, winnerId: result.winnerId });
  }

  private backToLobby(): void {
    this.engine?.dispose();
    this.engine = null;
    this.result = null;
    this.phase = 'lobby';
  }

  private find(id: string): Player | undefined {
    return this.players.find((p) => p.id === id);
  }

  /** ảnh đại diện chưa ai dùng, ưu tiên `wanted` */
  private freeAvatar(wanted?: number, fallback?: number): number {
    const used = new Set(this.players.map((p) => p.avatar));
    const ok = (a: number | undefined): a is number =>
      a !== undefined && Number.isInteger(a) && a >= 0 && a < AVATAR_COUNT && !used.has(a);
    if (ok(wanted)) return wanted;
    if (ok(fallback)) return fallback;
    let avatar = Math.floor(this.rng() * AVATAR_COUNT);
    while (used.has(avatar)) avatar = (avatar + 1) % AVATAR_COUNT;
    return avatar;
  }

  /** màu sắc nhân vật chưa ai dùng trong phòng */
  private freeColor(wanted?: number): number {
    const used = new Set(this.players.map((p) => p.character.color));
    const count = PLAYER_COLORS.length;
    if (wanted !== undefined && Number.isInteger(wanted) && wanted >= 0 && wanted < count && !used.has(wanted)) {
      return wanted;
    }
    for (let i = 0; i < count; i++) {
      if (!used.has(i)) return i;
    }
    return 0;
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

  private changed(): void {
    this.onChange(this);
  }
}
