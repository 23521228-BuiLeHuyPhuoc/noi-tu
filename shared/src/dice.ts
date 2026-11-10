/** Xúc xắc 3D của Cờ tỷ phú: hằng số và kiểu dùng chung cho server (mô phỏng vật lý) và app (phát lại). */

/** Cú tung: hướng vuốt (x,z trong mặt khay, đã chuẩn hoá về độ dài ≤ 1) và lực 0..1 */
export interface ThrowImpulse { x: number; z: number; p: number }

export const DICE_DEFAULT_IMPULSE: ThrowImpulse = { x: 0.85, z: -0.3, p: 0.6 };

/** Chuẩn hoá cú tung do client gửi: không số/NaN thì dùng mặc định, giới hạn độ dài và lực. */
export function sanitizeImpulse(v: unknown): ThrowImpulse {
  const o = (v ?? {}) as Partial<ThrowImpulse>;
  const x = Number(o.x), z = Number(o.z), p = Number(o.p);
  if (!Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(p)) return { ...DICE_DEFAULT_IMPULSE };
  const len = Math.hypot(x, z);
  if (len < 0.05) return { ...DICE_DEFAULT_IMPULSE, p: Math.min(1, Math.max(0.3, p)) };
  const k = 1 / len; // luôn về vector đơn vị
  return { x: x * k, z: z * k, p: Math.min(1, Math.max(0.3, p)) };
}

/** Kích thước khay (nửa chiều rộng/sâu) theo đơn vị mô phỏng; cạnh xúc xắc = 1 */
export const TRAY_HX = 2.9;
export const TRAY_HZ = 1.55;
export const DICE_FPS = 30;
/** 7 số mỗi xúc xắc mỗi khung: x, y, z, qx, qy, qz, qw */
export const DICE_FRAME_STRIDE = 14;

/** Pháp tuyến cục bộ của 6 mặt và số chấm tương ứng (mặt đối nhau cộng bằng 7) */
export const DICE_FACES: { n: [number, number, number]; v: number }[] = [
  { n: [0, 1, 0], v: 1 }, { n: [0, -1, 0], v: 6 },
  { n: [1, 0, 0], v: 3 }, { n: [-1, 0, 0], v: 4 },
  { n: [0, 0, 1], v: 2 }, { n: [0, 0, -1], v: 5 },
];

/** Kết quả tung gửi cho mọi client để phát lại cùng một cú lăn */
export interface DiceRollView {
  id: number;
  /** mốc bắt đầu (đồng hồ server) */
  startedAt: number;
  ms: number;
  fps: number;
  /** DICE_FRAME_STRIDE số mỗi khung, làm tròn 3 chữ số */
  frames: number[];
}
