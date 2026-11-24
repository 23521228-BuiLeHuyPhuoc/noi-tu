/**
 * Bốc thăm không lặp lại (vd cặp từ "Ai Là Gián Điệp"): khóa nào đã ra thì tạm ngưng, chỉ dùng lại
 * khi đã ra hết cả bộ. Nhớ trong bộ nhớ tiến trình và ghi xuống kho lưu trữ (MongoDB trên Render)
 * nếu có, để khởi động lại server vẫn không lặp.
 */
import type { Rng } from './dictionary';

/** phần kho lưu trữ mà bộ bốc thăm cần (Store của server đáp ứng) */
export interface UsedKeyStore {
  listUsedKeys(pool: string): Promise<string[]>;
  addUsedKey(pool: string, key: string): Promise<void>;
  clearUsedKeys(pool: string): Promise<void>;
}

export class FreshDeck {
  private readonly used = new Map<string, Set<string>>();
  private readonly last = new Map<string, string>();
  private writes: Promise<void> = Promise.resolve();

  constructor(
    private readonly store?: UsedKeyStore,
    private readonly onError: (e: unknown) => void = () => {},
  ) {}

  private usedOf(pool: string): Set<string> {
    let set = this.used.get(pool);
    if (!set) {
      set = new Set();
      this.used.set(pool, set);
    }
    return set;
  }

  /** nạp các khóa đã dùng từ kho lưu trữ (gọi lúc server khởi động; bốc trước khi nạp xong vẫn chạy bình thường) */
  async load(pool: string): Promise<void> {
    if (!this.store) return;
    const keys = await this.store.listUsedKeys(pool);
    const set = this.usedOf(pool);
    for (const k of keys) set.add(k);
  }

  /** số khóa chưa dùng trong bộ hiện tại */
  remaining(pool: string, keys: readonly string[]): number {
    const set = this.usedOf(pool);
    return keys.filter((k) => !set.has(k)).length;
  }

  /**
   * Chọn ngẫu nhiên một khóa chưa dùng, trả về chỉ số của nó trong `keys` (-1 nếu bộ rỗng).
   * Hết khóa thì xoay vòng mới (xóa danh sách đã dùng) nhưng tránh ra lại đúng khóa vừa ra.
   */
  draw(pool: string, keys: readonly string[], rng: Rng = Math.random): number {
    if (keys.length === 0) return -1;
    const set = this.usedOf(pool);
    let fresh = keys.map((_, i) => i).filter((i) => !set.has(keys[i]));
    if (fresh.length === 0) {
      set.clear();
      this.persist((s) => s.clearUsedKeys(pool));
      const last = this.last.get(pool);
      fresh = keys.map((_, i) => i).filter((i) => keys.length === 1 || keys[i] !== last);
    }
    const idx = fresh[Math.min(fresh.length - 1, Math.floor(rng() * fresh.length))];
    const key = keys[idx];
    set.add(key);
    this.last.set(pool, key);
    this.persist((s) => s.addUsedKey(pool, key));
    return idx;
  }

  /** đợi các lần ghi xuống kho lưu trữ chạy xong (dùng trong test / khi tắt server) */
  flush(): Promise<void> {
    return this.writes;
  }

  /** ghi tuần tự để lệnh "xóa cả bộ" không chạy sau lệnh "thêm khóa" của vòng mới */
  private persist(op: (s: UsedKeyStore) => Promise<void>): void {
    const store = this.store;
    if (!store) return;
    this.writes = this.writes.then(() => op(store)).catch((e) => this.onError(e));
  }
}
