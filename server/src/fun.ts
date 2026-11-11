import {
  DOODLES, EMOJIS, MAX_HP, NICKNAMES,
  type DoodleKind, type Emoji, type FunEvent, type FunSend, type HitMove, type NicknameId, type ThrowItem, type TauntId,
} from '../../shared/src/types';

const ITEMS: ThrowItem[] = ['dep', 'cachua', 'trung', 'phan', 'hoa', 'tim'];
const TAUNTS: TauntId[] = ['nhanh', 'ga', 'anmay', 'run', 'huhon', 'gg', 'cuu', 'dinh', 'khoc', 'denlai',
  'xiu', 'bayma', 'tuoi', 'ngoan', 'chaybai', 'hetthuoc'];
/** sát thương [thấp nhất, cao nhất] của mỗi chiêu — máu ảo, chỉ để vui */
export const HIT_DAMAGE: Record<HitMove, [number, number]> = {
  tat: [5, 9],
  dam: [8, 14],
  da: [11, 17],
  chuong: [18, 28],
};

/** Kiểm tra dữ liệu "ném/khịa/hối" gửi lên. Trả về bản sạch hoặc null. */
export function cleanFun(raw: unknown): FunSend | null {
  if (!raw || typeof raw !== 'object') return null;
  const f = raw as Record<string, unknown>;
  if (f.kind === 'throw' && typeof f.to === 'string' && ITEMS.includes(f.item as ThrowItem)) {
    return { kind: 'throw', to: f.to, item: f.item as ThrowItem };
  }
  if (f.kind === 'taunt' && TAUNTS.includes(f.taunt as TauntId)) return { kind: 'taunt', taunt: f.taunt as TauntId };
  if (f.kind === 'poke' && typeof f.to === 'string') return { kind: 'poke', to: f.to };
  if (f.kind === 'emoji' && EMOJIS.includes(f.emoji as Emoji)) return { kind: 'emoji', emoji: f.emoji as Emoji };
  if (f.kind === 'hit' && typeof f.to === 'string' && (f.move as string) in HIT_DAMAGE) {
    return { kind: 'hit', to: f.to, move: f.move as HitMove };
  }
  if (f.kind === 'doodle' && typeof f.to === 'string' && DOODLES.includes(f.doodle as DoodleKind)) {
    return { kind: 'doodle', to: f.to, doodle: f.doodle as DoodleKind };
  }
  if (f.kind === 'nick' && typeof f.to === 'string' && NICKNAMES.includes(f.nick as NicknameId)) {
    return { kind: 'nick', to: f.to, nick: f.nick as NicknameId };
  }
  if (
    (f.kind === 'roach' || f.kind === 'ink' || f.kind === 'honk' || f.kind === 'cry' || f.kind === 'blackout' || f.kind === 'spin' || f.kind === 'quake') &&
    typeof f.to === 'string'
  ) {
    return { kind: f.kind, to: f.to };
  }
  if (f.kind === 'charm') return { kind: 'charm' };
  return null;
}

/** "chọc mất dạy": nhóm chiêu có giới hạn riêng (chặt hơn ném đồ) */
export const TROLL_KINDS: FunSend['kind'][] = ['doodle', 'roach', 'ink', 'nick', 'honk', 'cry', 'charm', 'blackout', 'spin', 'quake'];
/** chiêu phủ lên màn hình người bị chọc: mỗi người bị chọc chỉ nhận 1 lần mỗi SCREEN_COOLDOWN_MS (từ bất kỳ ai) */
export const SCREEN_KINDS: FunSend['kind'][] = ['roach', 'ink'];
export const SCREEN_COOLDOWN_MS = 8000;

export const isTroll = (k: FunSend['kind']) => TROLL_KINDS.includes(k);
export const isScreenTroll = (k: FunSend['kind']) => SCREEN_KINDS.includes(k);

/** Số liệu ngẫu nhiên do server bốc để mọi máy thấy cùng một cảnh */
export function trollExtras(f: FunSend, rng: () => number = Math.random): Pick<FunEvent, 'count' | 'corner' | 'variant'> {
  if (f.kind === 'roach') return { count: 2 + Math.floor(rng() * 2) };
  if (f.kind === 'ink') return { corner: Math.floor(rng() * 4) };
  if (f.kind === 'honk') return { variant: Math.floor(rng() * 3) };
  return {};
}

/** Mỗi người bị chọc (key) chỉ nhận một chiêu phủ màn hình mỗi `ms` mili giây */
export class TargetCooldown {
  private last = new Map<string, number>();
  constructor(private readonly ms = SCREEN_COOLDOWN_MS) {}
  take(key: string, now = Date.now()): boolean {
    const t = this.last.get(key);
    if (t !== undefined && now - t < this.ms) return false;
    this.last.set(key, now);
    if (this.last.size > 64) for (const [k, v] of this.last) if (now - v >= this.ms) this.last.delete(k);
    return true;
  }
  remove(key: string): void {
    this.last.delete(key);
  }
}

/** Máu ảo của từng người trong phòng; bị K.O. thì hồi đầy */
export class HpBoard {
  private hp = new Map<string, number>();
  constructor(private readonly rng: () => number = Math.random) {}

  hit(to: string, move: HitMove): { damage: number; hp: number; ko: boolean } {
    const [lo, hi] = HIT_DAMAGE[move];
    let damage = lo + Math.floor(this.rng() * (hi - lo + 1));
    if (this.rng() < 0.12) damage *= 2; // chí mạng
    const left = (this.hp.get(to) ?? MAX_HP) - damage;
    const ko = left <= 0;
    this.hp.set(to, ko ? MAX_HP : left);
    return { damage, hp: ko ? 0 : left, ko };
  }

  get(id: string): number {
    return this.hp.get(id) ?? MAX_HP;
  }

  remove(id: string): void {
    this.hp.delete(id);
  }
}

/** Giới hạn tần suất kiểu "xô token": tối đa `burst` lần liền, hồi 1 lượt mỗi `refillMs` */
export class RateLimiter {
  private tokens: number;
  private last: number;
  constructor(private readonly burst = 6, private readonly refillMs = 1200, start = Date.now()) {
    this.last = start;
    this.tokens = burst;
  }
  take(now = Date.now()): boolean {
    this.tokens = Math.min(this.burst, this.tokens + (now - this.last) / this.refillMs);
    this.last = now;
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }
}
