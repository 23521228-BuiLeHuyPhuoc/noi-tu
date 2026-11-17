/**
 * Kiểu dữ liệu & bộ bài Ma Sói 2.0 (Werewolf) 4–12 người chơi.
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
export type MaSoiSpeed = 'slow' | 'normal' | 'fast';

export interface MaSoiRoleMeta {
  id: MaSoiRole;
  name: string;
  emoji: string;
  team: MaSoiTeam;
  teamLabel: string;
  color: string;
  shortDesc: string;
  howToPlay: string;
  winCond: string;
  tips: string;
  nightHint?: string;
}

export const MASOI_ROLES: Record<MaSoiRole, MaSoiRoleMeta> = {
  soi: {
    id: 'soi',
    name: 'Ma Sói',
    emoji: '🐺',
    team: 'soi',
    teamLabel: 'Phe Ma Sói',
    color: '#EF4444',
    shortDesc: 'Mỗi đêm cùng bầy Sói chọn cắn 1 người và bàn mưu bí mật trong Kênh Sói.',
    howToPlay: 'Ban đêm mở Kênh Sói thống nhất mục tiêu cắn. Ban ngày trà trộn vào dân làng, giả danh vai tốt hoặc đổ tội khéo léo.',
    winCond: 'Thắng khi số Ma Sói còn sống ≥ số Dân Làng còn sống.',
    tips: 'Đừng im lặng quá mức dễ bị nghi! Đôi khi giả làm Tiên Tri ("fake claim") đúng lúc sẽ xoay chuyển cả bàn.',
    nightHint: 'Chạm chọn 1 cư dân để cả bầy Sói tấn công đêm nay',
  },
  tientri: {
    id: 'tientri',
    name: 'Tiên Tri',
    emoji: '🔮',
    team: 'dan',
    teamLabel: 'Phe Dân Làng',
    color: '#8B5CF6',
    shortDesc: 'Mỗi đêm soi 1 người để biết chính xác họ có phải Ma Sói hay không.',
    howToPlay: 'Đêm chọn 1 người đáng nghi để soi. Kết quả soi (🐺 Sói / 🧑‍🌾 Không phải Sói) sẽ được ghim thẳng lên avatar người đó cho riêng bạn theo dõi!',
    winCond: 'Cùng Dân Làng tiêu diệt toàn bộ Ma Sói.',
    tips: 'Đừng lộ thân phận ngay Ngày 1 nếu chưa soi trúng Sói, kẻo đêm sau Sói cắn mất!',
    nightHint: 'Chạm vào avatar 1 người để soi thân phận thực sự',
  },
  baove: {
    id: 'baove',
    name: 'Bảo Vệ',
    emoji: '🛡️',
    team: 'dan',
    teamLabel: 'Phe Dân Làng',
    color: '#0EA5E9',
    shortDesc: 'Mỗi đêm che chở 1 người khỏi nanh Sói (không bảo vệ cùng 1 người 2 đêm liên tiếp).',
    howToPlay: 'Đêm chọn 1 người (có thể tự bảo vệ chính mình). Nếu Sói cắn đúng người đó, họ hoàn toàn bình an (nhưng không cản được độc của Phù Thủy).',
    winCond: 'Cùng Dân Làng tiêu diệt toàn bộ Ma Sói.',
    tips: 'Hãy đoán xem Sói muốn giết ai nhất (ví dụ người vừa lộ là Tiên Tri) để canh gác kịp thời!',
    nightHint: 'Chọn 1 người để giương khiên bảo vệ đêm nay',
  },
  phuthuy: {
    id: 'phuthuy',
    name: 'Phù Thủy',
    emoji: '🧪',
    team: 'dan',
    teamLabel: 'Phe Dân Làng',
    color: '#D946EF',
    shortDesc: 'Sở hữu 1 bình Thuốc Cứu (cứu nạn nhân bị Sói cắn) và 1 bình Thuốc Độc (tiêu diệt 1 người).',
    howToPlay: 'Cuối đêm bạn được biết ai vừa bị Sói cắn (nếu còn bình Cứu). Mỗi loại bình chỉ dùng được 1 lần duy nhất trong suốt cả ván.',
    winCond: 'Cùng Dân Làng tiêu diệt toàn bộ Ma Sói.',
    tips: 'Có thể dùng cả Cứu lẫn Độc trong cùng 1 đêm nếu chắc chắn kẻ tình nghi là Sói!',
    nightHint: 'Quyết định dùng Bình Cứu hoặc quăng Bình Độc',
  },
  thosan: {
    id: 'thosan',
    name: 'Thợ Săn',
    emoji: '🏹',
    team: 'dan',
    teamLabel: 'Phe Dân Làng',
    color: '#F59E0B',
    shortDesc: 'Khi tử nạn (bị Sói cắn hoặc bị treo cổ), được nổ súng kéo theo 1 người xuống mồ cùng.',
    howToPlay: 'Ban đêm ngủ như dân thường. Ngay khoảnh khắc ngã xuống, bạn có pha riêng để nhắm bắn kẻ đáng nghi nhất (hoặc bắn chỉ thiên bỏ qua).',
    winCond: 'Cùng Dân Làng tiêu diệt toàn bộ Ma Sói.',
    tips: 'Quan sát kỹ biểu hiện lúc bỏ phiếu để nếu lỡ chết thì viên đạn cuối mang theo đúng 1 con Sói!',
  },
  cupid: {
    id: 'cupid',
    name: 'Thần Tình Yêu',
    emoji: '💘',
    team: 'dan',
    teamLabel: 'Phe Dân Làng',
    color: '#EC4899',
    shortDesc: 'Đêm đầu tiên ghép đôi 2 người thành Cặp Đôi Định Mệnh. Một người chết, người kia chết theo!',
    howToPlay: 'Chỉ thức dậy ở Đêm 1 để chọn 2 người bất kỳ (kể cả tự ghép mình). Đặc biệt: nếu 1 Sói ghép với 1 Dân, họ thành Phe Cặp Đôi riêng và thắng khi trụ lại 2 người cuối!',
    winCond: 'Cùng Dân Làng diệt hết Sói (hoặc thắng riêng nếu bạn nằm trong Cặp Đôi khác phe).',
    tips: 'Hãy nhớ mặt 2 người bạn đã nối tơ hồng vì số phận họ gắn chặt với nhau!',
    nightHint: 'Chọn 2 cư dân để nối dây tơ hồng định mệnh',
  },
  kengo: {
    id: 'kengo',
    name: 'Kẻ Ngố',
    emoji: '🤡',
    team: 'solo',
    teamLabel: 'Phe Độc Lập',
    color: '#EAB308',
    shortDesc: 'Phe độc lập lầy lội: nếu lừa được cả làng bỏ phiếu treo cổ bạn vào ban ngày, bạn THẮNG NGAY!',
    howToPlay: 'Giả vờ lập cập, nói hớ như Sói để dân làng nghi ngờ treo cổ bạn. Lưu ý: bị Sói cắn ban đêm hoặc trúng độc/đạn thì bạn thua!',
    winCond: 'Thắng một mình ngay lập tức khi bị treo cổ bởi phiếu bầu ban ngày.',
    tips: 'Diễn lộ quá dễ bị Tiên Tri/Phù Thủy xử đẹp; hãy diễn vừa đủ đáng ngờ!',
  },
  thamtu: {
    id: 'thamtu',
    name: 'Thám Tử',
    emoji: '🕵️',
    team: 'dan',
    teamLabel: 'Phe Dân Làng',
    color: '#10B981',
    shortDesc: 'Mỗi đêm chọn 2 người bất kỳ để điều tra xem họ thuộc CÙNG PHE hay KHÁC PHE.',
    howToPlay: 'Đêm chọn 2 avatar. Hệ thống báo họ Cùng Phe (cùng Làng hoặc cùng Sói) hay Khác Phe (1 Sói + 1 Không phải Sói).',
    winCond: 'Cùng Dân Làng tiêu diệt toàn bộ Ma Sói.',
    tips: 'Nếu bạn đã biết chắc 1 người là Dân tốt, hãy ghép họ với từng người khác để lọc Sói cực nhanh!',
    nightHint: 'Chọn 2 người để đối chiếu xem có cùng phe không',
  },
  dan: {
    id: 'dan',
    name: 'Dân Làng',
    emoji: '👨‍🌾',
    team: 'dan',
    teamLabel: 'Phe Dân Làng',
    color: '#22C55E',
    shortDesc: 'Không có phép đêm; vũ khí mạnh nhất của bạn là suy luận sắc bén & lá phiếu treo cổ ban ngày!',
    howToPlay: 'Theo dõi ai hay đánh trống lảng, ai bỏ phiếu cứu nhau, dùng tính năng Ghim Nghi Vấn trên avatar để khoanh vùng bầy Sói.',
    winCond: 'Cùng Dân Làng tiêu diệt toàn bộ Ma Sói.',
    tips: 'Ghi chép nghi vấn trực tiếp lên từng avatar trên bàn giúp bạn không bị Sói thao túng tâm lý!',
  },
};

export type MaSoiPreset = 'classic' | 'chaos';

/** Câu chat nhanh 1 chạm trên điện thoại khi thảo luận ban ngày */
export const MASOI_QUICK_CHAT: readonly string[] = [
  '🔮 Ai Tiên Tri nhảy ra báo thông tin đi!',
  '🐺 Đêm qua ai được Bảo Vệ / Phù Thủy cứu vậy?',
  '🤔 Tui là Dân thường 100%, soi tui phí lượt!',
  '👀 Nhìn cách bỏ phiếu vòng trước nghi lắm nha!',
  '⚖️ Hôm nay khoan treo bừa, nghe khai hết một vòng đã!',
  '🤡 Cẩn thận Kẻ Ngố đang cố tình xin phiếu treo đó!',
];

/** Thời lượng chuẩn từng pha theo tốc độ phòng (giây) — thong thả đủ chat & đọc vai */
export const MASOI_PHASE_SECONDS: Record<MaSoiSpeed, Record<MaSoiPhase, number>> = {
  slow: {
    role_reveal: 15,
    night_cupid: 25,
    night_active: 40,
    night_witch: 25,
    hunter_shot: 20,
    day_discuss: 90,
    day_vote: 40,
  },
  normal: {
    role_reveal: 12,
    night_cupid: 20,
    night_active: 32,
    night_witch: 20,
    hunter_shot: 16,
    day_discuss: 65,
    day_vote: 32,
  },
  fast: {
    role_reveal: 8,
    night_cupid: 14,
    night_active: 22,
    night_witch: 15,
    hunter_shot: 12,
    day_discuss: 40,
    day_vote: 22,
  },
};

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
  speed?: MaSoiSpeed;
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
  wolfChat?: { id: number; from: string; name: string; text: string; at?: number }[];
  seerHistory?: { day: number; targetId: string; isWolf: boolean }[];
  detectiveHistory?: { day: number; a: string; b: string; sameTeam: boolean }[];
  guardLastId?: string | null;
  guardCurrentTargetId?: string | null;
  witchState?: { healLeft: boolean; poisonLeft: boolean; victimId: string | null };
  myNightSubmitted?: boolean;
}
