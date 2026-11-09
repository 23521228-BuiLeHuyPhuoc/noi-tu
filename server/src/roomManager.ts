import type { Dictionary, Rng } from './dictionary';
import { Room, type RoomOptions } from './room';

// bỏ các ký tự dễ nhầm: I, O, 0, 1
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

export interface RoomManagerOptions {
  room?: Omit<RoomOptions, 'onChange'>;
  /** phòng không còn ai kết nối sẽ bị xóa sau khoảng này */
  emptyRoomTtlMs?: number;
  rng?: Rng;
  onRoomChange?: (room: Room) => void;
}

export class RoomManager {
  private readonly rooms = new Map<string, Room>();
  private readonly deleteTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly rng: Rng;
  private readonly ttl: number;

  constructor(private readonly dict: Dictionary, private readonly opts: RoomManagerOptions = {}) {
    this.rng = opts.rng ?? Math.random;
    this.ttl = opts.emptyRoomTtlMs ?? 60_000;
  }

  get size(): number {
    return this.rooms.size;
  }

  create(): Room {
    let code: string;
    do code = this.randomCode();
    while (this.rooms.has(code));
    const room = new Room(code, this.dict, {
      ...this.opts.room,
      onChange: (r) => this.handleChange(r),
    });
    this.rooms.set(code, room);
    return room;
  }

  get(code: unknown): Room | undefined {
    if (typeof code !== 'string') return undefined;
    return this.rooms.get(code.trim().toUpperCase());
  }

  dispose(): void {
    for (const r of this.rooms.values()) r.dispose();
    for (const t of this.deleteTimers.values()) clearTimeout(t);
    this.rooms.clear();
    this.deleteTimers.clear();
  }

  private handleChange(room: Room): void {
    if (!this.rooms.has(room.code)) return;
    if (room.players.length === 0) {
      this.delete(room.code);
      return;
    }
    const pending = this.deleteTimers.get(room.code);
    if (room.connectedCount === 0) {
      if (!pending) this.deleteTimers.set(room.code, setTimeout(() => this.delete(room.code), this.ttl));
    } else if (pending) {
      clearTimeout(pending);
      this.deleteTimers.delete(room.code);
    }
    this.opts.onRoomChange?.(room);
  }

  private delete(code: string): void {
    const room = this.rooms.get(code);
    room?.dispose();
    this.rooms.delete(code);
    const t = this.deleteTimers.get(code);
    if (t) clearTimeout(t);
    this.deleteTimers.delete(code);
  }

  private randomCode(): string {
    let s = '';
    for (let i = 0; i < CODE_LENGTH; i++) s += CODE_ALPHABET[Math.floor(this.rng() * CODE_ALPHABET.length)];
    return s;
  }
}
