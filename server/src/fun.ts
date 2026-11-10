import { EMOJIS, MAX_HP, type Emoji, type FunSend, type HitMove, type ThrowItem, type TauntId } from '../../shared/src/types';

const ITEMS: ThrowItem[] = ['dep', 'cachua', 'trung', 'phan', 'hoa', 'tim'];
const TAUNTS: TauntId[] = ['nhanh', 'ga', 'anmay', 'run', 'huhon', 'gg', 'cuu', 'dinh', 'khoc', 'denlai'];
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
  return null;
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
  private last = Date.now();
  constructor(private readonly burst = 6, private readonly refillMs = 1200) {
    this.tokens = burst;
  }
  take(): boolean {
    const now = Date.now();
    this.tokens = Math.min(this.burst, this.tokens + (now - this.last) / this.refillMs);
    this.last = now;
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }
}
