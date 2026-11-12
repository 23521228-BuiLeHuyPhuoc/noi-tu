import { randomUUID } from 'node:crypto';
import {
  BAUCUA_DEFAULT_ROUNDS, BAUCUA_ROUND_OPTIONS, type BauCuaRounds,
  CHARACTER_ACCESSORIES, CHARACTER_AGES, CHARACTER_BROWS, CHARACTER_BUILDS, CHARACTER_DETAILS, CHARACTER_EYES, CHARACTER_FACES, SKIN_TONES, CHARACTER_GENDERS, CHARACTER_OUTFITS, CHARACTER_HAIRS, PLAYER_COLORS,
  type CharacterAccessory, type CharacterAge, type CharacterBrows, type CharacterBuild, type CharacterEyes, type CharacterFace, type CharacterConfig, type CharacterDetail, type CharacterOutfit, type CharacterGender, type CharacterHair,
  STICKER_IDS, type StickerId, CHAT_MAX, GAME_INFO, MAX_NAME, MAX_PLAYERS,
  type ActionResult, type ChatMsg, type ErrorCode, type GameAction, type GameResult, type GameType, type Phase,
  type RoomSettings, type RoomState, type RoomSummary,
} from '../../shared/src/types';
import { AVATAR_PRESETS } from '../../shared/src/avatars';
import type { PlayerCosmetics } from '../../shared/src/shop';
import { parseLook } from '../../shared/src/types';
import { HpBoard, TargetCooldown, WindowLimiter } from './fun';
import type { Dictionary, Rng } from './dictionary';
import type { GameEngine } from './games/engine';
import { WordChainGame } from './games/wordchain';
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
  /** trang trí đã trang bị (tài khoản) */
  cosmetics?: PlayerCosmetics;
  /** người chơi đã tự chỉnh nhân vật trong phòng: không tự đổi theo avatar tài khoản nữa */
  characterCustom?: boolean;
  /** người chơi máy (chủ phòng thêm vào) */
  bot?: boolean;
  removeTimer?: ReturnType<typeof setTimeout>;
}

/** id của người chơi đã đăng nhập: "u-" + id tài khoản (khách không được dùng tiền tố này) */
export const ACCOUNT_PREFIX = 'u-';
const CHAT_KEEP = 40;

type Result<T = {}> = ({ ok: true } & T) | { ok: false; error: ErrorCode };

const AVATAR_COUNT = AVATAR_PRESETS.length;
/** nhân vật mặc định của khách luân phiên 3 kiểu đầu (không tự gán 'LGBT+' cho ai) */
const DEFAULT_GENDERS = CHARACTER_GENDERS.slice(0, 3);
const GAME_TYPES = Object.keys(GAME_INFO) as GameType[];

/** tên người chơi máy */
const BOT_NAMES = ['Máy Tèo', 'Máy Tí', 'Máy Mít', 'Máy Bông', 'Máy Su', 'Máy Bi'];
/** máy "suy nghĩ" bao lâu trước mỗi nước (ms) */
const BOT_THINK_MS: Record<GameType, [number, number]> = {
  wordchain: [1500, 3200], wordchain_en: [1500, 3200], baucua: [700, 2200], typhu: [900, 1700],
};

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

  /** phòng công khai hiện trong sảnh "Phòng đang mở"; riêng tư thì chỉ vào được bằng mã hoặc link mời */
  isPublic = true;
  /** người đã bị chủ phòng mời ra: không vào lại được phòng này */
  private readonly kicked = new Set<string>();
  private engine: GameEngine | null = null;
  private result: GameResult | null = null;
  private participants: string[] = [];
  private chat: ChatMsg[] = [];
  private chatSeq = 0;
  readonly hp: HpBoard;
  /** hạt giống riêng của phòng để rải đặc điểm nhân vật khách (không dùng this.rng, khỏi làm lệch dãy ngẫu nhiên của ván) */
  private readonly spreadSeed = Math.floor(Math.random() * 997);
  /** chống dội gián/mực lên màn hình một người */
  readonly screenCooldown = new TargetCooldown();
  /** mỗi người chỉ bị rung/lắc/che màn hình tối đa 3 lần mỗi 15 giây (từ bất kỳ ai) */
  readonly disruptLimiter = new WindowLimiter();
  private readonly graceMs: number;
  private readonly rng: Rng;
  /** ngẫu nhiên riêng cho thời gian máy suy nghĩ (không làm lệch dãy ngẫu nhiên của ván) */
  private readonly botRng: Rng = Math.random;
  private readonly onChange: (room: Room) => void;

  constructor(readonly code: string, private readonly dict: Dictionary, private readonly opts: RoomOptions = {}) {
    this.graceMs = opts.disconnectGraceMs ?? 30_000;
    this.rng = opts.rng ?? Math.random;
    this.onChange = opts.onChange ?? (() => {});
    this.hp = new HpBoard(this.rng);
  }

  /** số người thật đang kết nối (máy không tính: phòng chỉ còn máy thì được dọn) */
  get connectedCount(): number {
    return this.players.filter((p) => p.connected && !p.bot).length;
  }

  isBot(playerId: string): boolean {
    return this.find(playerId)?.bot === true;
  }

  // ---------- máy chơi ----------

  /** Chủ phòng thêm một người chơi máy (chỉ ở phòng chờ). */
  addBot(byId: string): Result<{ playerId: string }> {
    if (byId !== this.hostId) return { ok: false, error: 'not_host' };
    if (this.phase === 'playing') return { ok: false, error: 'room_playing' };
    if (this.players.length >= MAX_PLAYERS) return { ok: false, error: 'room_full' };
    if (this.phase === 'finished') this.backToLobby();
    const used = new Set(this.players.map((p) => p.name.toLowerCase()));
    const base = BOT_NAMES.find((n) => !used.has(n.toLowerCase())) ?? 'Máy';
    const id = `bot-${randomUUID().slice(0, 12)}`;
    this.players.push({
      id, name: this.uniqueName(base), connected: true, avatar: this.freeAvatar(), character: this.spreadCharacter(), account: false, bot: true,
    });
    this.changed();
    return { ok: true, playerId: id };
  }

  /** Chủ phòng bỏ một người chơi máy (chỉ ở phòng chờ / sau ván). */
  removeBot(byId: string, botId: unknown): Result {
    if (byId !== this.hostId) return { ok: false, error: 'not_host' };
    if (this.phase === 'playing') return { ok: false, error: 'room_playing' };
    const p = typeof botId === 'string' ? this.find(botId) : undefined;
    if (!p?.bot) return { ok: false, error: 'bad_request' };
    this.removePlayer(p.id);
    return { ok: true };
  }

  /** hẹn giờ cho máy tới lượt ra tay (mỗi lúc một máy; mỗi lần trạng thái đổi thì xét lại) */
  private botTimer?: ReturnType<typeof setTimeout>;
  private scheduleBots(): void {
    if (this.botTimer || this.phase !== 'playing' || !this.engine?.botAction) return;
    const engine = this.engine;
    const bot = this.players.find((p) => p.bot && this.participants.includes(p.id) && engine.botAction!(p.id));
    if (!bot) return;
    const [lo, hi] = BOT_THINK_MS[this.gameType];
    const delay = Math.round(lo + this.botRng() * (hi - lo));
    this.botTimer = setTimeout(() => {
      this.botTimer = undefined;
      if (this.phase !== 'playing' || this.engine !== engine) return;
      // xét lại lúc ra tay: trạng thái có thể đã đổi trong lúc "suy nghĩ"
      const a = engine.botAction!(bot.id);
      if (a) this.action(bot.id, a);
      this.scheduleBots();
    }, delay);
  }
  private clearBotTimer(): void {
    if (this.botTimer) clearTimeout(this.botTimer);
    this.botTimer = undefined;
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
  addPlayer(rawName: unknown, existingId?: string, profile?: { avatar?: number; avatarUrl?: string; account?: boolean; cosmetics?: PlayerCosmetics }): Result<{ playerId: string }> {
    const account = profile?.account === true;
    // khách không được mạo danh id tài khoản
    if (existingId?.startsWith(ACCOUNT_PREFIX) && !account) existingId = undefined;
    if (existingId && this.kicked.has(existingId)) return { ok: false, error: 'kicked' };
    const existing = existingId ? this.find(existingId) : undefined;
    if (existing) {
      if (account) this.setCosmetics(existing.id, profile?.cosmetics);
      this.setConnected(existing.id, true);
      return { ok: true, playerId: existing.id };
    }
    const name = cleanName(rawName);
    if (!name) return { ok: false, error: 'invalid_name' };
    if (this.players.length >= MAX_PLAYERS) return { ok: false, error: 'room_full' };

    const id = existingId && /^[\w-]{8,64}$/.test(existingId) ? existingId : randomUUID();
    // tài khoản và khách đã tự chọn mặt đại diện: dựng nhân vật theo mặt đó
    const preset = this.presetFor(profile?.avatar);
    const character: CharacterConfig = preset ?? this.spreadCharacter();
    this.players.push({ id, name: this.uniqueName(name), connected: true, avatar: this.freeAvatar(profile?.avatar), avatarUrl: profile?.avatarUrl, character, account, ...(profile?.cosmetics ? { cosmetics: profile.cosmetics } : {}) });
    if (!this.hostId) this.hostId = id;
    this.changed();
    return { ok: true, playerId: id };
  }

  /**
   * Nhân vật mặc định cho khách: mỗi người vào phòng lệch bước ở từng đặc điểm (da, dáng mặt, tóc, mắt…)
   * nên cả phòng không bao giờ giống hệt nhau. Không tự gán 'LGBT+' hay phụ kiện cầu vồng cho ai.
   */
  private spreadCharacter(): CharacterConfig {
    const n = this.players.length;
    const r = this.spreadSeed;
    const accs = CHARACTER_ACCESSORIES.filter((a) => !a.startsWith('pride') && a !== 'khautrang');
    const mouths = ['khep', 'cuoirang', 'cuoitu', 'he'] as const;
    const brows = ['ngang', 'cong', 'mem', 'gap', 'lieu'] as const;
    const noses = ['thap', 'vua', 'ro'] as const;
    const vols = ['sat', 'vua', 'cao'] as const;
    const tilts = ['thang', 'trai', 'phai'] as const;
    return {
      gender: DEFAULT_GENDERS[n % DEFAULT_GENDERS.length],
      age: CHARACTER_AGES[n % CHARACTER_AGES.length],
      hair: CHARACTER_HAIRS[(n * 5 + r) % CHARACTER_HAIRS.length],
      color: this.freeColor(),
      skin: (n * 3 + r) % SKIN_TONES,
      face: CHARACTER_FACES[(n * 3 + r) % CHARACTER_FACES.length],
      build: CHARACTER_BUILDS[(n + r) % CHARACTER_BUILDS.length],
      eyes: CHARACTER_EYES[(n * 3 + r) % CHARACTER_EYES.length],
      brows: CHARACTER_BROWS[(n * 2 + r) % CHARACTER_BROWS.length],
      accessory: accs[(n * 7 + r) % accs.length],
      detail: CHARACTER_DETAILS[(n + r) % CHARACTER_DETAILS.length],
      outfit: CHARACTER_OUTFITS[(n * 2 + r) % CHARACTER_OUTFITS.length],
      look: {
        mouth: mouths[(n * 3 + r) % mouths.length],
        browshape: brows[(n * 2 + r) % brows.length],
        nose: noses[(n + r) % noses.length],
        volume: vols[(n * 2 + r) % vols.length],
        tilt: tilts[(n + r) % tilts.length],
      },
    };
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
    if (partial.accessory !== undefined) {
      if (!CHARACTER_ACCESSORIES.includes(partial.accessory as CharacterAccessory)) return { ok: false, error: 'bad_request' };
      next.accessory = partial.accessory;
    }
    if (partial.skin !== undefined) {
      if (!Number.isInteger(partial.skin) || partial.skin < 0 || partial.skin >= SKIN_TONES) return { ok: false, error: 'bad_request' };
      next.skin = partial.skin;
    }
    if (partial.face !== undefined) {
      if (!CHARACTER_FACES.includes(partial.face as CharacterFace)) return { ok: false, error: 'bad_request' };
      next.face = partial.face;
    }
    if (partial.build !== undefined) {
      if (!CHARACTER_BUILDS.includes(partial.build as CharacterBuild)) return { ok: false, error: 'bad_request' };
      next.build = partial.build;
    }
    if (partial.eyes !== undefined) {
      if (!CHARACTER_EYES.includes(partial.eyes as CharacterEyes)) return { ok: false, error: 'bad_request' };
      next.eyes = partial.eyes;
    }
    if (partial.brows !== undefined) {
      if (!CHARACTER_BROWS.includes(partial.brows as CharacterBrows)) return { ok: false, error: 'bad_request' };
      next.brows = partial.brows;
    }
    if (partial.look !== undefined) {
      const look = parseLook(partial.look);
      if (!look) return { ok: false, error: 'bad_request' };
      if (Object.keys(look).length === 0) delete next.look;
      else next.look = look;
    }
    if (partial.detail !== undefined) {
      if (!CHARACTER_DETAILS.includes(partial.detail as CharacterDetail)) return { ok: false, error: 'bad_request' };
      next.detail = partial.detail;
    }
    if (partial.outfit !== undefined) {
      if (!CHARACTER_OUTFITS.includes(partial.outfit as CharacterOutfit)) return { ok: false, error: 'bad_request' };
      next.outfit = partial.outfit;
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
    p.characterCustom = true;
    this.changed();
    return { ok: true };
  }

  /**
   * Hồ sơ tài khoản vừa đổi (tên, mặt đại diện, ảnh). Truyền đủ hồ sơ: avatarUrl undefined nghĩa là đã bỏ ảnh.
   * `explicit`: chính người chơi vừa chọn mặt mới (áp luôn nhân vật theo mặt đó, kể cả khi đã tự chỉnh).
   */
  updateProfile(playerId: string, name?: string, avatar?: number, avatarUrl?: string, explicit = false): void {
    this.patchProfile(playerId, { name, avatar, avatarUrl: avatarUrl ?? null, explicit });
  }

  /**
   * Đổi tên / mặt đại diện / ảnh của một người trong phòng, được cả lúc đang chơi.
   * Trường undefined giữ nguyên; avatarUrl null là bỏ ảnh. Trả về false nếu tên không hợp lệ.
   */
  patchProfile(playerId: string, patch: { name?: unknown; avatar?: number; avatarUrl?: string | null; explicit?: boolean }): boolean {
    const p = this.find(playerId);
    if (!p) return false;
    if (patch.name !== undefined) {
      const name = cleanName(patch.name);
      if (!name) return false;
      if (name !== p.name) {
        p.name = '';
        p.name = this.uniqueName(name);
        if (this.phase === 'playing') this.engine?.renamePlayer?.(p.id, p.name);
        for (const m of this.chat) if (m.from === p.id) m.name = p.name;
      }
    }
    if (patch.avatarUrl !== undefined) p.avatarUrl = patch.avatarUrl ?? undefined;
    const avatar = patch.avatar;
    if (avatar !== undefined && Number.isInteger(avatar) && avatar >= 0 && avatar < AVATAR_COUNT && (avatar !== p.avatar || patch.explicit)) {
      const old = p.avatar;
      p.avatar = -1;
      p.avatar = this.freeAvatar(avatar, old);
      if (patch.explicit || (p.account && !p.characterCustom)) {
        const preset = this.presetFor(avatar, p.id);
        if (preset) {
          p.character = preset;
          if (patch.explicit) p.characterCustom = false;
        }
      }
    }
    this.changed();
    return true;
  }

  /** trang trí vừa đổi (trang bị / gỡ): cập nhật cho cả phòng */
  setCosmetics(playerId: string, cosmetics: PlayerCosmetics | undefined): void {
    const p = this.find(playerId);
    if (!p) return;
    if (JSON.stringify(p.cosmetics ?? null) === JSON.stringify(cosmetics ?? null)) return;
    if (cosmetics) p.cosmetics = cosmetics;
    else delete p.cosmetics;
    this.changed();
  }

  /** người chơi dính chiêu làm rung/che màn hình: bù thời gian lượt nếu game hỗ trợ. Trả về số ms được bù. */
  disrupt(playerId: string, ms: number): number {
    if (this.phase !== 'playing' || !this.engine?.disrupt) return 0;
    return this.engine.disrupt(playerId, ms);
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
    if (this.phase === 'playing') this.engine?.onPlayerConnection?.(playerId, connected);
    this.changed();
  }

  /** Chủ phòng đổi phòng thành công khai / riêng tư (được cả lúc đang chơi). */
  setPublic(byId: string, value: unknown): Result {
    if (byId !== this.hostId) return { ok: false, error: 'not_host' };
    if (typeof value !== 'boolean') return { ok: false, error: 'bad_request' };
    if (this.isPublic !== value) {
      this.isPublic = value;
      this.changed();
    }
    return { ok: true };
  }

  /** Chủ phòng mời một người ra khỏi phòng (cả lúc đang chơi); người đó không vào lại được phòng này. */
  kick(byId: string, targetId: unknown): Result {
    if (byId !== this.hostId) return { ok: false, error: 'not_host' };
    if (typeof targetId !== 'string' || targetId === byId || !this.find(targetId)) return { ok: false, error: 'bad_request' };
    this.kicked.add(targetId);
    this.removePlayer(targetId);
    return { ok: true };
  }

  /** Thông tin gọn cho sảnh "Phòng đang mở" */
  summary(): RoomSummary | null {
    const host = this.find(this.hostId);
    if (!host) return null;
    return {
      code: this.code,
      gameType: this.gameType,
      phase: this.phase,
      hostName: host.name,
      hostAvatar: host.avatar,
      ...(host.avatarUrl ? { hostAvatarUrl: host.avatarUrl } : {}),
      players: this.players.length,
      maxPlayers: MAX_PLAYERS,
      names: this.players.map((p) => p.name),
    };
  }

  /** Rời phòng hẳn (bấm thoát, hoặc mất kết nối quá lâu). */
  removePlayer(playerId: string): void {
    const p = this.find(playerId);
    if (!p) return;
    this.clearRemoveTimer(p);
    this.players = this.players.filter((x) => x.id !== p.id);
    this.hp.remove(p.id);
    this.disruptLimiter.remove(p.id);
    // chủ phòng rời đi: trao cho người thật kế tiếp (máy không làm chủ phòng được)
    if (this.hostId === p.id) this.hostId = (this.players.find((x) => !x.bot) ?? this.players[0])?.id ?? '';
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
        ...(p.cosmetics ? { cosmetics: p.cosmetics } : {}),
        ...(p.bot ? { bot: true } : {}),
      })),
      maxPlayers: MAX_PLAYERS,
      gameType: this.gameType,
      settings: this.settings,
      serverNow: Date.now(),
      game: this.gameView(),
      result: this.result,
      isPublic: this.isPublic,
    };
  }

  /** trạng thái ván; tên người chơi luôn lấy theo tên hiện tại trong phòng (đổi tên giữa ván vẫn khớp) */
  private gameView(): RoomState['game'] {
    const view = this.engine ? this.engine.view() : null;
    if (!view || !('names' in view) || !view.names) return view;
    const names = { ...view.names };
    for (const p of this.players) if (p.id in names) names[p.id] = p.name;
    return { ...view, names } as RoomState['game'];
  }

  dispose(): void {
    this.clearBotTimer();
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
      isBot: (id: string) => this.isBot(id),
      changed: () => {
        if (this.phase === 'playing') this.changed();
      },
      finish: (result: GameResult) => this.finish(result),
      learnWord: (word: string, byName: string) => this.opts.learnWord?.(word, byName),
    };
    switch (this.gameType) {
      case 'wordchain_en':
        return new WordChainGame(ctx, 'en');
      case 'baucua':
        return new BauCuaGame(ctx);
      case 'typhu':
        return new TyPhuGame(ctx);
      default:
        return new WordChainGame(ctx, 'vi');
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
    this.clearBotTimer();
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

  /** nhân vật mẫu theo avatar tài khoản; màu trùng thì lấy màu trống kế tiếp, giữ nguyên giới tính/tuổi/tóc */
  private presetFor(avatar?: number, exceptId?: string): CharacterConfig | undefined {
    if (avatar === undefined || !Number.isInteger(avatar) || avatar < 0 || avatar >= AVATAR_PRESETS.length) return undefined;
    const preset = AVATAR_PRESETS[avatar];
    return { ...preset, color: this.freeColor(preset.color, exceptId, true) };
  }

  /** màu sắc nhân vật chưa ai dùng trong phòng (nextFree: nếu `wanted` bị chiếm thì lấy màu trống ngay sau nó) */
  private freeColor(wanted?: number, exceptId?: string, nextFree = false): number {
    const used = new Set(this.players.filter((p) => p.id !== exceptId).map((p) => p.character.color));
    if (nextFree && wanted !== undefined) {
      for (let k = 0; k < PLAYER_COLORS.length; k++) {
        const c = (wanted + k) % PLAYER_COLORS.length;
        if (!used.has(c)) return c;
      }
    }
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
    this.scheduleBots();
  }
}
