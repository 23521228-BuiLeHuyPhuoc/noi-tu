/**
 * Kiểu dữ liệu, kho 48 biểu tượng Fluent 3D & bộ sinh màn chơi cho Tinh Mắt Đập Nhanh (`tinh_mat`, 2–12 người).
 * Tất cả người chơi cùng nhìn và bấm đồng thời thời gian thực — không ai phải chờ lượt!
 */

export type TinhMatPhase = 'playing' | 'reveal';

export type TinhMatChallengeKind = 'match_target' | 'odd_one_out' | 'avoid_bomb';

export const TINH_MAT_DEFAULT_ROUNDS = 12;
export const TINH_MAT_ROUND_OPTIONS = [8, 12, 16] as const;
export type TinhMatRounds = (typeof TINH_MAT_ROUND_OPTIONS)[number];

export const TINH_MAT_PLAY_MS = 7000;
export const TINH_MAT_REVEAL_MS = 2200;
export const TINH_MAT_STUN_MS = 1300;

export const TINH_MAT_BOMB_EMOJI = '💣';

/** Kho 48 biểu tượng quen thuộc, sắc nét (tương thích Fluent Emoji 3D, tuyệt đối không trùng lặp & không chứa 💣) */
export const TINH_MAT_EMOJIS: readonly string[] = [
  '🐸', '🦊', '🐼', '🦁', '🐙', '🦄', '🐲', '🍕',
  '🍔', '🍣', '🍩', '🍓', '🍉', '⚽', '🏆', '💎',
  '👑', '🚀', '🛸', '🎸', '🎯', '🎲', '🧸', '🎈',
  '🌈', '⚡', '🔥', '❄️', '🌸', '🍄', '🦀', '🦋',
  '🐝', '🐢', '🦖', '👻', '🤖', '🎃', '🎁', '🔑',
  '🛡️', '⚔️', '🧪', '🔮', '🏮', '🪩', '🧁', '🍦',
];

export const TINH_MAT_SPEED_POINTS = [150, 110, 80, 60] as const;
export const TINH_MAT_TREASURE_PTS = 90;
export const TINH_MAT_BOMB_PENALTY = 60;
export const TINH_MAT_STREAK_BONUS = 15;

export interface TinhMatGridCell {
  id: number;
  emoji: string;
  hitBy: string | null;
  /** Chỉ đính kèm ở pha reveal để UI làm nổi bật các ô mục tiêu đúng */
  isTarget?: boolean;
}

export interface TinhMatRoundHit {
  playerId: string;
  name: string;
  cellId: number;
  emoji: string;
  delta: number;
  ok: boolean;
}

export type TinhMatAction =
  | { type: 'tm_tap'; cellId: number }
  | { type: 'end' };

export interface TinhMatView {
  type: 'tinh_mat';
  round: number;
  maxRounds: number;
  phase: TinhMatPhase;
  phaseEndsAt: number | null;
  phaseSeconds: number;
  challengeKind: TinhMatChallengeKind;
  promptText: string;
  targetEmoji: string | null;
  bonusEmojis: string[];
  grid: TinhMatGridCell[];
  scores: Record<string, number>;
  streaks: Record<string, number>;
  stunnedUntil: Record<string, number>;
  roundHits: TinhMatRoundHit[];
  order: string[];
  names: Record<string, string>;
}

export interface GeneratedTinhMatPuzzle {
  challengeKind: TinhMatChallengeKind;
  promptText: string;
  targetEmoji: string | null;
  bonusEmojis: string[];
  emojis: string[];
  validCellIds: Set<number>;
}

function shuffleInPlace<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1)) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Sinh màn thử thách Tinh Mắt cho 1 vòng chơi (`12` hoặc `16` ô) đảm bảo chặt chẽ toán học 100%.
 */
export function generateTinhMatPuzzle(
  round: number,
  playerCount: number,
  rng: () => number,
): GeneratedTinhMatPuzzle {
  const modes: readonly TinhMatChallengeKind[] = ['match_target', 'odd_one_out', 'avoid_bomb'];
  const challengeKind = modes[(Math.max(1, round) - 1) % modes.length];
  const gridSize = playerCount >= 5 || round > 4 ? 16 : 12;

  const pool = shuffleInPlace([...TINH_MAT_EMOJIS], rng);

  if (challengeKind === 'match_target') {
    const targetEmoji = pool[0];
    const targetCount = Math.min(4, Math.max(1, Math.ceil(Math.max(1, playerCount) / 3)));
    const distractors = pool.slice(1);

    const emojis: string[] = [];
    for (let i = 0; i < targetCount; i++) emojis.push(targetEmoji);
    for (let i = 0; i < gridSize - targetCount; i++) {
      emojis.push(distractors[i % distractors.length]);
    }
    shuffleInPlace(emojis, rng);

    const validCellIds = new Set<number>();
    emojis.forEach((em, idx) => {
      if (em === targetEmoji) validCellIds.add(idx);
    });

    return {
      challengeKind,
      promptText: `Tìm & đập nhanh hình trùng khớp: ${targetEmoji}!`,
      targetEmoji,
      bonusEmojis: [],
      emojis,
      validCellIds,
    };
  }

  if (challengeKind === 'odd_one_out') {
    // 1 ô độc nhất khi phòng <= 4 người, 2 ô độc nhất khi phòng đông >= 5 người
    const uniqueCount = playerCount >= 5 ? 2 : 1;
    const uniqueEmojis = pool.slice(0, uniqueCount);
    const uniqueSet = new Set(uniqueEmojis);

    const emojis: string[] = [...uniqueEmojis];
    let rem = gridSize - uniqueCount;
    let cursor = uniqueCount;

    // Nếu số ô còn lại là số lẻ (11 hoặc 15), tạo 1 bộ 3 hình giống nhau trước rồi chia chẵn từng cặp 2 hình
    if (rem % 2 === 1) {
      const tripleEmoji = pool[cursor++];
      emojis.push(tripleEmoji, tripleEmoji, tripleEmoji);
      rem -= 3;
    }
    while (rem >= 2) {
      const pairEmoji = pool[cursor++];
      emojis.push(pairEmoji, pairEmoji);
      rem -= 2;
    }

    shuffleInPlace(emojis, rng);

    const validCellIds = new Set<number>();
    emojis.forEach((em, idx) => {
      if (uniqueSet.has(em)) validCellIds.add(idx);
    });

    return {
      challengeKind,
      promptText: 'Đập hình CHỈ XUẤT HIỆN 1 LẦN!',
      targetEmoji: null,
      bonusEmojis: [],
      emojis,
      validCellIds,
    };
  }

  // challengeKind === 'avoid_bomb'
  const bonusEmojis = [pool[0], pool[1], pool[2]];
  const bonusSet = new Set(bonusEmojis);
  const treasureCount = Math.min(6, Math.max(3, Math.ceil(Math.max(1, playerCount) / 2) + 2));
  const bombCount = gridSize === 16 ? 6 : 5;
  const decoyCount = Math.max(0, gridSize - treasureCount - bombCount);

  const emojis: string[] = [];
  for (let i = 0; i < treasureCount; i++) {
    emojis.push(bonusEmojis[i % bonusEmojis.length]);
  }
  for (let i = 0; i < bombCount; i++) {
    emojis.push(TINH_MAT_BOMB_EMOJI);
  }
  const decoys = pool.slice(3);
  for (let i = 0; i < decoyCount; i++) {
    emojis.push(decoys[i % decoys.length]);
  }

  shuffleInPlace(emojis, rng);

  const validCellIds = new Set<number>();
  emojis.forEach((em, idx) => {
    if (bonusSet.has(em)) validCellIds.add(idx);
  });

  return {
    challengeKind,
    promptText: `Săn Kho Báu ${bonusEmojis.join(' ')} — CẤM CHẠM 💣!`,
    targetEmoji: null,
    bonusEmojis,
    emojis,
    validCellIds,
  };
}
