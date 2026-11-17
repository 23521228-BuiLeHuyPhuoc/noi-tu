/**
 * Kiểu dữ liệu & bộ bài Ma Sói (Werewolf) 4–12 người chơi.
 * Dùng chung giữa app và server; server lọc MaSoiView theo từng người xem (perPlayerView).
 */

export type MaSoiRole =
  | 'soi'
  | 'tientri'
  | 'baove'
  | 'phuthuy'
  | 'thosan'
  | 'cupid'
  | 'kengo'
  | 'thamtu'
  | 'dan';

export type MaSoiTeam = 'soi' | 'dan' | 'solo';

export interface MaSoiRoleMeta {
  id: MaSoiRole;
  name: string;
  emoji: string;
  team: MaSoiTeam;
  color: string;
  shortDesc: string;
  nightHint?: string;
}

export const MASOI_ROLES: Record<MaSoiRole, MaSoiRoleMeta> = {
  soi: {
    id: 'soi',
    name: 'Ma Sói',
    emoji: '🐺',
    team: 'soi',
    color: '#E03131',
    shortDesc: 'Mỗi đêm cùng bầy Sói chọn cắn 1 người và chat bí mật trong Kênh Sói.',
    nightHint: 'Chọn 1 nạn nhân để cả bầy Sói cắn đêm nay',
  },
  tientri: {
    id: 'tientri',
    name: 'Tiên Tri',
    emoji: '🔮',
    team: 'dan',
    color: '#7950F2',
    shortDesc: 'Mỗi đêm soi 1 người để biết người đó có phải Ma Sói hay không.',
    nightHint: 'Chọn 1 người để soi thân phận',
  },
  baove: {
    id: 'baove',
    name: 'Bảo Vệ',
    emoji: '🛡️',
    team: 'dan',
    color: '#1C7ED6',
    shortDesc: 'Mỗi đêm che chở 1 người khỏi nanh Sói (không bảo vệ cùng 1 người 2 đêm liền).',
    nightHint: 'Chọn 1 người để bảo vệ đêm nay',
  },
  phuthuy: {
    id: 'phuthuy',
    name: 'Phù Thủy',
    emoji: '🧪',
    team: 'dan',
    color: '#9C36B5',
    shortDesc: 'Có 1 bình Thuốc Cứu (cứu nạn nhân bị Sói cắn) và 1 bình Thuốc Độc.',
    nightHint: 'Quyết định dùng Thuốc Cứu hoặc Thuốc Độc',
  },
  thosan: {
    id: 'thosan',
    name: 'Thợ Săn',
    emoji: '🏹',
    team: 'dan',
    color: '#D97706',
    shortDesc: 'Khi bị giết (đêm hoặc treo cổ), được bắn kéo theo 1 người xuống mồ cùng.',
  },
  cupid: {
    id: 'cupid',
    name: 'Thần Tình Yêu',
    emoji: '💘',
    team: 'dan',
    color: '#E64980',
    shortDesc: 'Đêm đầu tiên ghép đôi 2 người. Một người chết thì người kia chết theo!',
    nightHint: 'Chọn 2 người để ghép thành Cặp Đôi Định Mệnh',
  },
  kengo: {
    id: 'kengo',
    name: 'Kẻ Ngố',
    emoji: '🤡',
    team: 'solo',
    color: '#F59F00',
    shortDesc: 'Phe độc lập: nếu bị dân làng treo cổ ban ngày, bạn thắng một mình ngay lập tức!',
  },
  thamtu: {
    id: 'thamtu',
    name: 'Thám Tử',
    emoji: '🕵️',
    team: 'dan',
    color: '#0CA678',
    shortDesc: 'Mỗi đêm chọn 2 người để điều tra xem họ có cùng phe hay không.',
    nightHint: 'Chọn 2 người để kiểm tra có cùng phe không',
  },
  dan: {
    id: 'dan',
    name: 'Dân Làng',
    emoji: '👨‍🌾',
    team: 'dan',
    color: '#2F9E44',
    shortDesc: 'Không có phép đêm; hãy lắng nghe, suy luận và bỏ phiếu treo cổ đúng Ma Sói!',
  },
};

export type MaSoiPreset = 'classic' | 'chaos';

/** Bộ vai trò cân bằng cho 4–12 người */
export function buildMaSoiDeck(count: number, preset: MaSoiPreset = 'classic'): MaSoiRole[] {
  const n = Math.max(4, Math.min(12, count));
  if (preset === 'chaos') {
    const base: MaSoiRole[] = ['soi', 'tientri', 'baove', 'kengo'];
    if (n >= 5) base.push('phuthuy');
    if (n >= 6) base.unshift('soi');
    if (n >= 7) base.push('cupid');
    if (n >= 8) base.push('thosan');
    if (n >= 9) base.push('thamtu');
    if (n >= 10) base.unshift('soi');
    if (n >= 11) base.push('dan');
    if (n >= 12) base.unshift('soi');
    return base.slice(0, n);
  }
  switch (n) {
    case 4:
      return ['soi', 'tientri', 'baove', 'dan'];
    case 5:
      return ['soi', 'tientri', 'baove', 'dan', 'dan'];
    case 6:
      return ['soi', 'soi', 'tientri', 'baove', 'phuthuy', 'dan'];
    case 7:
      return ['soi', 'soi', 'tientri', 'baove', 'phuthuy', 'thosan', 'cupid'];
    case 8:
      return ['soi', 'soi', 'tientri', 'baove', 'phuthuy', 'thosan', 'cupid', 'kengo'];
    case 9:
      return ['soi', 'soi', 'soi', 'tientri', 'baove', 'phuthuy', 'thosan', 'cupid', 'thamtu'];
    case 10:
      return ['soi', 'soi', 'soi', 'tientri', 'baove', 'phuthuy', 'thosan', 'cupid', 'thamtu', 'dan'];
    case 11:
      return ['soi', 'soi', 'soi', 'tientri', 'baove', 'phuthuy', 'thosan', 'cupid', 'thamtu', 'kengo', 'dan'];
    default:
      return ['soi', 'soi', 'soi', 'soi', 'tientri', 'baove', 'phuthuy', 'thosan', 'cupid', 'thamtu', 'kengo', 'dan'];
  }
}

export type MaSoiPhase =
  | 'role_reveal'
  | 'night_cupid'
  | 'night_active'
  | 'night_witch'
  | 'hunter_shot'
  | 'day_discuss'
  | 'day_vote';

export interface MaSoiDeadEntry {
  id: string;
  reason: string;
  day: number;
  revealedRole?: MaSoiRole;
}

export interface MaSoiLogItem {
  id: number;
  day: number;
  kind: 'dawn' | 'vote' | 'system' | 'hunter';
  text: string;
}

export interface MaSoiView {
  type: 'masoi';
  day: number;
  phase: MaSoiPhase;
  phaseEndsAt: number | null;
  phaseSeconds: number;
  order: string[];
  names: Record<string, string>;
  alive: string[];
  dead: MaSoiDeadEntry[];
  loversLinked: boolean;
  dayVotes: Record<string, string | 'skip'>;
  readySkip: string[];
  hunterId: string | null;
  publicLog: MaSoiLogItem[];
  roleCounts: Partial<Record<MaSoiRole, number>>;
  /** Thông tin riêng tư chỉ gửi cho đúng viewerId */
  myRole: MaSoiRole | null;
  myPartnerId?: string | null;
  wolfPackIds?: string[];
  wolfVotes?: Record<string, string>;
  wolfChat?: { id: number; from: string; name: string; text: string }[];
  seerHistory?: { day: number; targetId: string; isWolf: boolean }[];
  detectiveHistory?: { day: number; a: string; b: string; sameTeam: boolean }[];
  guardLastId?: string | null;
  witchState?: { healLeft: boolean; poisonLeft: boolean; victimId: string | null };
  myNightSubmitted?: boolean;
}
