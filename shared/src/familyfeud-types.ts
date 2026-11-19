/**
 * Kiểu dữ liệu dùng chung cho Khảo Sát Xóm Lầy — Family Feud (`family_feud`, 2–12 người chia 2 đội Đỏ/Xanh).
 */

export interface FeudAnswer {
  /** Đáp án chuẩn hiển thị trên bảng (tiếng Việt ngắn gọn, rõ ý) */
  text: string;
  /** Điểm khảo sát trên thang 100 (giảm dần từ #1 -> #6, tổng 6 ô = 100) */
  points: number;
  /** Các cách nói đồng nghĩa, tiếng lóng, viết tắt hoặc bỏ dấu phổ biến */
  aliases: string[];
  /** Từ khóa cốt lõi giúp nhận diện câu trả lời sát nghĩa */
  keywords: string[];
}

export interface FeudQuestion {
  id: string;
  category: string;
  question: string;
  answers: FeudAnswer[];
}

export type FeudTeam = 'red' | 'blue';
export type FeudPhase = 'faceoff' | 'decide' | 'play' | 'steal' | 'reveal_beat' | 'round_end';

export interface FeudTeamMsg {
  id: number;
  fromId: string;
  fromName: string;
  text: string;
  at: number;
}

export interface FeudSpotlight {
  tone: 'hit' | 'miss' | 'steal' | 'info';
  title: string;
  detail?: string;
}

export const FAMILY_FEUD_ROUND_OPTIONS = [3, 5] as const;
export type FamilyFeudRounds = (typeof FAMILY_FEUD_ROUND_OPTIONS)[number];
export const FAMILY_FEUD_DEFAULT_ROUNDS: FamilyFeudRounds = 3;

export interface FeudSlotView {
  index: number;
  revealed: boolean;
  text?: string;
  points?: number;
  revealedBy?: FeudTeam;
}

export interface FeudAttemptLog {
  id: number;
  playerId: string;
  playerName: string;
  team: FeudTeam;
  text: string;
  hitIndex: number | null;
  pointsAdded: number;
  duplicate?: boolean;
  at: number;
}

export interface FamilyFeudView {
  type: 'family_feud';
  round: number;
  maxRounds: number;
  multiplier: 1 | 2 | 3;
  phase: FeudPhase;
  phaseEndsAt: number | null;
  phaseSeconds: number;
  questionId: string;
  category: string;
  question: string;
  slots: FeudSlotView[];
  teams: Record<FeudTeam, string[]>;
  scores: Record<FeudTeam, number>;
  roundBank: number;
  strikes: number;
  controllingTeam: FeudTeam | null;
  faceoffWinner: FeudTeam | null;
  faceoffRedId: string | null;
  faceoffBlueId: string | null;
  faceoffSubmitted: Partial<Record<FeudTeam, { guess: string; hitIndex: number | null; points: number }>>;
  activePlayerId: string | null;
  attempts: FeudAttemptLog[];
  lastEvent: string | null;
  spotlight: FeudSpotlight | null;
  myTeam: FeudTeam | null;
  teamChat: FeudTeamMsg[];
  names: Record<string, string>;
}

export type FamilyFeudAction =
  | { type: 'ff_answer'; text: string }
  | { type: 'ff_decide'; choice: 'play' | 'pass' }
  | { type: 'ff_team_chat'; text: string };
