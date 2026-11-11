import type { ActionResult, GameAction, GameResult, GameView, RoomSettings } from '../../../shared/src/types';
import type { Dictionary, Rng } from '../dictionary';
import type { ThrowImpulse } from '../../../shared/src/dice';

export interface EnginePlayer {
  id: string;
  name: string;
}

/** Những gì Room cung cấp cho một ván chơi */
export interface EngineContext {
  rng: Rng;
  dict: Dictionary;
  settings: RoomSettings;
  /** thời gian mỗi lượt (ms) — để test có thể rút ngắn */
  turnMs?: number;
  /** id chủ phòng hiện tại (có thể đổi giữa ván) */
  hostId: () => string;
  /** người chơi còn kết nối không (để tự đi thay người đang mất mạng) */
  isConnected: (playerId: string) => boolean;
  /** báo trạng thái đã đổi để server phát cho mọi người */
  changed: () => void;
  /** kết thúc ván */
  finish: (result: GameResult) => void;
  /** thay thế bộ mô phỏng xúc xắc 3D (test dùng để cho ra mặt xác định) */
  rollDice?: (impulse: ThrowImpulse, rng: Rng) => { dice: [number, number]; frames: number[]; ms: number; fps: number };
  /** cả phòng vừa duyệt một từ mới: thêm vào từ điển và lưu lại */
  learnWord: (word: string, byName: string) => void;
}

export interface GameEngine {
  start(players: EnginePlayer[]): void;
  action(playerId: string, action: GameAction): ActionResult;
  /** người chơi rời phòng giữa ván */
  removePlayer(playerId: string): void;
  /** trạng thái kết nối của người chơi thay đổi giữa ván */
  onPlayerConnection?(playerId: string, connected: boolean): void;
  /** người chơi dính chiêu làm rung/che màn hình (ms ước lượng bị mất); trả về số ms được bù vào lượt */
  disrupt?(playerId: string, ms: number): number;
  /** người chơi đổi tên giữa ván */
  renamePlayer?(playerId: string, name: string): void;
  view(): GameView;
  dispose(): void;
}

/** Bộ hẹn giờ gọn: tự hủy hẹn cũ khi đặt hẹn mới */
export class Timer {
  private t?: ReturnType<typeof setTimeout>;
  set(ms: number, fn: () => void): void {
    this.clear();
    this.t = setTimeout(fn, ms);
  }
  clear(): void {
    if (this.t) clearTimeout(this.t);
    this.t = undefined;
  }
}
