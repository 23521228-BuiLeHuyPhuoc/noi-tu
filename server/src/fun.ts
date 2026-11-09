import type { FunSend, ThrowItem, TauntId } from '../../shared/src/types';

const ITEMS: ThrowItem[] = ['dep', 'cachua', 'trung', 'phan', 'hoa', 'tim'];
const TAUNTS: TauntId[] = ['nhanh', 'ga', 'anmay', 'run', 'huhon', 'gg', 'cuu', 'dinh', 'khoc', 'denlai'];

/** Kiểm tra dữ liệu "ném/khịa/hối" gửi lên. Trả về bản sạch hoặc null. */
export function cleanFun(raw: unknown): FunSend | null {
  if (!raw || typeof raw !== 'object') return null;
  const f = raw as Record<string, unknown>;
  if (f.kind === 'throw' && typeof f.to === 'string' && ITEMS.includes(f.item as ThrowItem)) {
    return { kind: 'throw', to: f.to, item: f.item as ThrowItem };
  }
  if (f.kind === 'taunt' && TAUNTS.includes(f.taunt as TauntId)) return { kind: 'taunt', taunt: f.taunt as TauntId };
  if (f.kind === 'poke' && typeof f.to === 'string') return { kind: 'poke', to: f.to };
  return null;
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
