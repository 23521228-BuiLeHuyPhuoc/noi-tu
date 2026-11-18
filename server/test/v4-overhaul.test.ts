/**
 * BỘ KIỂM THỬ TOÀN DIỆN MASTER OVERHAUL V4 (PHASES 27–36):
 * - Thứ tự 15 trò chơi từ Cũ → Mới & xóa hoàn toàn Tinh Mắt / Đèn Đỏ Đèn Xanh.
 * - Avatar Mặc Định Lầy Lội / Meme (`@dicebear/avataaars` + đạo cụ Kính Thug, Nón Cá Mập, Nước Mũi...).
 * - Đố Vui IT/English: khử hoàn toàn mẹo "câu dài nhất là đúng" (`<= 27%`) + xáo trộn vị trí A/B/C/D động.
 * - Vẽ & Đoán: Bot vẽ từng nét (`botAction` thuần khiết không nhảy cóc nét) + >= 55 hình minh họa đa màu.
 * - Đầm Lầy Quái Chiêu 3.0: cho phép thêm Bot Co-op thông minh phối hợp qua màn.
 * - Đặt Bom Tử Chiến — Bản Vòng Bo (`boom_online`, 2–12p): Bóng nước 4.5s, Đồng đội cứu / Địch chích "BỤP!",
 *   Giày Đá Bom, Găng Tay Ném Bom qua tường, Kim Tự Cứu, Vòng Bo Xoắn Ốc 45s & Đĩa Bay Phục Thù (`ufo`).
 * - UNO Tàn Nhẫn (`uno_mercy`, 2–12p): Hộp bài 168 lá, Cộng dồn không đáy (+2/+4/+6/+10), Luật Nổ Bài >= 25 lá,
 *   Số 7 Cướp Trắng Bài, Số 0 Xoay Bài Cả Bàn, Xả Cùng Màu, Bỏ Tất Cả, Vòng Quay Tử Thần & Bắt lỗi quên hô UNO.
 */
import { describe, expect, it } from 'vitest';
import { AVATAR_PRESETS } from '../../shared/src/avatars';
import {
  BOOM_BLAST_TICKS,
  BOOM_BOMB_FUSE_TICKS,
  BOOM_LOB_TICKS,
  BOOM_ROUND_SEC,
  BOOM_SHRINK_START_SEC,
  type BoomTickPayload,
} from '../../shared/src/boom';
import {
  DO_VUI_DIFFICULTIES,
  DO_VUI_QUESTIONS,
  DO_VUI_TOPICS,
  type DoVuiDifficulty,
  type DoVuiView,
} from '../../shared/src/dovui';
import {
  CHARACTER_ACCESSORIES,
  CHARACTER_DETAILS,
  GAME_INFO,
  type GameResult,
  type GameType,
  type RoomSettings,
} from '../../shared/src/types';
import {
  UNO_MERCY_LIMIT,
  type UnoCard,
  type UnoCardKind,
  type UnoColor,
} from '../../shared/src/unomercy';
import { BOT_SKETCHES, type VeDoanView } from '../../shared/src/vedoan';
import { Dictionary } from '../src/dictionary';
import { BoomOnlineGame } from '../src/games/boom';
import { CroakSquadGame } from '../src/games/croaksquad';
import { DoVuiGame } from '../src/games/dovui';
import type { EngineContext, EnginePlayer } from '../src/games/engine';
import { UnoMercyGame } from '../src/games/unomercy';
import { VeDoanGame } from '../src/games/vedoan';
import { Room } from '../src/room';
import { SMALL_WORDS } from './helpers';

function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TEST_DICT = new Dictionary(SMALL_WORDS);

function makePlayers(n: number): EnginePlayer[] {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `Người ${i + 1}` }));
}

function makeHarness(
  seed: number,
  settings: RoomSettings = {},
  turnMs = 1000,
  bots = new Set<string>(),
) {
  const rng = seededRng(seed);
  let result: GameResult | null = null;
  const connected = new Set<string>(Array.from({ length: 16 }, (_, i) => `p${i}`));
  const boomTicks: BoomTickPayload[] = [];
  const ctx: EngineContext = {
    rng,
    dict: TEST_DICT,
    settings,
    turnMs,
    hostId: () => 'p0',
    isConnected: (id) => connected.has(id),
    isBot: (id) => bots.has(id),
    playerColor: (id) => Number(id.replace(/\D/g, '')) || 0,
    changed: () => {},
    finish: (r) => {
      result = r;
    },
    learnWord: () => {},
    emitBoomTick: (payload) => {
      boomTicks.push(payload);
    },
    emitCroakTick: () => {},
  };
  return {
    ctx,
    boomTicks,
    connected,
    getResult: () => result,
  };
}

// ============================================================================
// 1. DANH MỤC 15 GAME THỨ TỰ CŨ -> MỚI & AVATAR LẦY LỘI / MEME
// ============================================================================
describe('Phase 27 & 28 — Danh mục 15 Game (Cũ → Mới) & Avatar Lầy Lội', () => {
  it('chứa chính xác 15 game theo thứ tự ra mắt từ cũ tới mới, đã xóa tinh_mat và den_do', () => {
    const keys = Object.keys(GAME_INFO) as GameType[];
    expect(keys).toEqual([
      'wordchain',
      'wordchain_en',
      'baucua',
      'typhu',
      'masoi',
      'giandiep',
      've_doan',
      'bom_tu',
      'do_vui',
      'loto',
      'caro',
      'croaksquad',
      'ca_sau',
      'boom_online',
      'uno_mercy',
    ]);
    expect('tinh_mat' in GAME_INFO).toBe(false);
    expect('den_do' in GAME_INFO).toBe(false);
    expect(GAME_INFO.boom_online).toEqual({ name: 'Đặt bom tử chiến', min: 2, max: 12 });
    expect(GAME_INFO.uno_mercy).toEqual({ name: 'UNO Tàn nhẫn', min: 2, max: 12 });
  });

  it('bộ 36 preset avatar mặc định chứa đầy đủ biểu cảm lầy lội & đạo cụ meme', () => {
    expect(AVATAR_PRESETS).toHaveLength(36);
    const mouthsInPresets = new Set(AVATAR_PRESETS.map((p) => p.look?.mouth).filter(Boolean));
    for (const goofyMouth of ['oicauvong', 'rangsun', 'leluoi', 'hetlon', 'nhai', 'hahoc']) {
      expect(mouthsInPresets.has(goofyMouth as NonNullable<(typeof AVATAR_PRESETS)[number]['look']>['mouth'])).toBe(true);
    }
    for (const acc of ['kinhthug', 'nuocmui', 'noncamap', 'mathe'] as const) {
      expect(CHARACTER_ACCESSORIES).toContain(acc);
      expect(AVATAR_PRESETS.some((p) => p.accessory === acc)).toBe(true);
    }
    expect(CHARACTER_DETAILS).toContain('ranghe');

    const room = new Room('GOOFY1', TEST_DICT, { rng: seededRng(42) });
    const hostRes = room.addPlayer('Host Lầy');
    expect(hostRes.ok).toBe(true);
    if (!hostRes.ok) return;
    expect(room.configure(hostRes.playerId, 'boom_online').ok).toBe(true);
    for (let i = 0; i < 7; i++) {
      expect(room.addBot(hostRes.playerId).ok).toBe(true);
    }
    const mouthsUsed = new Set(room.players.map((p) => p.character.look?.mouth));
    expect(mouthsUsed.size).toBeGreaterThanOrEqual(5);
    room.dispose();
  });
});

// ============================================================================
// 2. ĐỐ VUI IT/ENGLISH — CÂN BẰNG ĐỘ DÀI ĐÁP ÁN & XÁO TRỘN A/B/C/D ĐỘNG
// ============================================================================
describe('Phase 29 — Đố Vui IT/English: Cân bằng độ dài đáp án & Xáo trộn phương án', () => {
  it('toàn bộ 252 câu hỏi không còn mẹo chọn đáp án dài nhất (<= 27% tổng, <= 33% mỗi chủ đề)', () => {
    expect(DO_VUI_QUESTIONS.length).toBeGreaterThanOrEqual(252);

    const countLongestCorrect = (qs: typeof DO_VUI_QUESTIONS) =>
      qs.filter((q) => {
        const lens = q.options.map((o) => o.length);
        const maxLen = Math.max(...lens);
        return q.options[q.correct].length === maxLen;
      }).length;

    const overallRatio = countLongestCorrect(DO_VUI_QUESTIONS) / DO_VUI_QUESTIONS.length;
    expect(overallRatio).toBeLessThanOrEqual(0.27);
    expect(overallRatio).toBeGreaterThanOrEqual(0.14);

    for (const topicMeta of DO_VUI_TOPICS) {
      if (topicMeta.id === 'all') continue;
      const sub = DO_VUI_QUESTIONS.filter((q) => q.topic === topicMeta.id);
      expect(sub.length).toBeGreaterThanOrEqual(30);
      const r = countLongestCorrect(sub) / sub.length;
      expect(r).toBeLessThanOrEqual(0.33);
    }

    const diffs = (Object.keys(DO_VUI_DIFFICULTIES) as DoVuiDifficulty[]).filter((d) => d !== 'mixed');
    for (const diff of diffs) {
      const sub = DO_VUI_QUESTIONS.filter((q) => q.difficulty === diff);
      const r = countLongestCorrect(sub) / sub.length;
      expect(r).toBeLessThanOrEqual(0.3);
    }
  });

  it('xáo trộn vị trí A/B/C/D động theo RNG nhưng vẫn chấm đúng đáp án chuẩn xác', () => {
    const seenOrders = new Set<string>();
    for (let seed = 1; seed <= 12; seed++) {
      const h = makeHarness(seed, { doVuiTopic: 'oop', doVuiDifficulty: 'easy', doVuiQuestions: 5 }, 5000);
      const g = new DoVuiGame(h.ctx);
      g.start(makePlayers(2));
      const v = g.view() as DoVuiView;
      const bankQ = DO_VUI_QUESTIONS.find((q) => q.q === v.question);
      expect(bankQ).toBeDefined();
      const trueCorrectText = bankQ!.options[bankQ!.correct];
      const mappedCorrectIdx = v.options.indexOf(trueCorrectText);
      expect(mappedCorrectIdx).toBeGreaterThanOrEqual(0);
      seenOrders.add(`${bankQ!.q}::${mappedCorrectIdx}`);

      const wrongIdx = ((mappedCorrectIdx + 1) % 4) as 0 | 1 | 2 | 3;
      expect(g.action('p0', { type: 'dv_answer', choice: mappedCorrectIdx as 0 | 1 | 2 | 3 }).ok).toBe(true);
      expect(g.action('p1', { type: 'dv_answer', choice: wrongIdx }).ok).toBe(true);

      const after = g.view() as DoVuiView;
      expect(after.phase).toBe('reveal');
      expect(after.correctIndex).toBe(mappedCorrectIdx);
      expect(after.scores.p0).toBeGreaterThan(0);
      expect(after.scores.p1).toBe(0);
      g.dispose();
    }
    expect(seenOrders.size).toBeGreaterThanOrEqual(4);
  });
});

// ============================================================================
// 3. VẼ & ĐOÁN — BOT VẼ THUẦN KHIẾT TỪNG NÉT & >= 55 HÌNH ĐA MÀU
// ============================================================================
describe('Phase 30 — Vẽ & Đoán: Bot vẽ từng nét mượt mà không mất nét', () => {
  it('kho BOT_SKETCHES có ít nhất 55 hình minh họa đa màu & botAction() thuần khiết 100%', () => {
    const sketchKeys = Object.keys(BOT_SKETCHES);
    expect(sketchKeys.length).toBeGreaterThanOrEqual(55);

    const h = makeHarness(77, { veDoanRounds: 1 }, 5000, new Set(['p0']));
    const g = new VeDoanGame(h.ctx);
    g.start(makePlayers(2));

    // Pha pick_word: gọi botAction nhiều lần phải trả về cùng hành động chọn từ
    const pick1 = g.botAction('p0');
    const pick2 = g.botAction('p0');
    expect(pick1).toEqual(pick2);
    expect(pick1?.type).toBe('vd_pick');
    expect(g.action('p0', pick1!).ok).toBe(true);

    // Pha drawing: gọi botAction('p0') 3 lần liên tiếp khi chưa action() KHÔNG làm nhảy cóc nét vẽ!
    const s1 = g.botAction('p0');
    const s2 = g.botAction('p0');
    const s3 = g.botAction('p0');
    expect(s1?.type).toBe('vd_stroke');
    expect(s2).toEqual(s1);
    expect(s3).toEqual(s1);

    // Áp dụng từng nét vẽ của Bot tuần tự -> đủ toàn bộ các nét!
    let applied = 0;
    for (let i = 0; i < 12; i++) {
      const act = g.botAction('p0');
      if (!act) break;
      expect(act.type).toBe('vd_stroke');
      expect(g.action('p0', act).ok).toBe(true);
      applied++;
    }
    expect(applied).toBeGreaterThanOrEqual(4);
    const view = g.view('p1') as VeDoanView;
    expect(view.strokes.length).toBe(applied);
    g.dispose();
  });
});

// ============================================================================
// 4. ĐẦM LẦY QUÁI CHIÊU 3.0 — CO-OP BOTS THÔNG MINH
// ============================================================================
describe('Phase 34 — Đầm Lầy Quái Chiêu 3.0: Bot Co-op thông minh', () => {
  it('cho phép thêm Bot trong sảnh Croak Squad và AI ếch tự di chuyển / nhảy phối hợp mượt mà', () => {
    const room = new Room('CROAK3', TEST_DICT, { rng: seededRng(101) });
    const hostRes = room.addPlayer('Ếch Trưởng');
    expect(hostRes.ok).toBe(true);
    if (!hostRes.ok) return;
    expect(room.configure(hostRes.playerId, 'croaksquad').ok).toBe(true);
    expect(room.addBot(hostRes.playerId).ok).toBe(true);
    expect(room.addBot(hostRes.playerId).ok).toBe(true);
    expect(room.players).toHaveLength(3);
    room.dispose();

    const h = makeHarness(202, {}, 1000, new Set(['p1', 'p2']));
    const g = new CroakSquadGame(h.ctx);
    g.start(makePlayers(3));
    const before = g.view().frogs.map((f) => ({ id: f.id, x: f.x, y: f.y }));

    g.stepManual(90); // 3 giây vật lý 30Hz
    const after = g.view().frogs;
    const bot1Before = before.find((f) => f.id === 'p1')!;
    const bot1After = after.find((f) => f.id === 'p1')!;
    expect(Math.hypot(bot1After.x - bot1Before.x, bot1After.y - bot1Before.y)).toBeGreaterThan(8);
    for (const f of after) {
      expect(Number.isFinite(f.x)).toBe(true);
      expect(Number.isFinite(f.y)).toBe(true);
    }
    g.dispose();
  });
});

// ============================================================================
// 5. GAME MỚI #1: 💣 ĐẶT BOM TỬ CHIẾN — BẢN VÒNG BO (`boom_online`)
// ============================================================================
describe('Phase 35 — Đặt Bom Tử Chiến (Boom Online Battle Royale)', () => {
  it('khởi tạo mê cung an toàn cho 2..12 người chơi, đặt bom nổ thùng rơi vật phẩm', () => {
    for (const n of [2, 4, 8, 12]) {
      const h = makeHarness(500 + n, { boomMode: 'ffa', boomRounds: 1 }, 500);
      const g = new BoomOnlineGame(h.ctx);
      g.start(makePlayers(n));
      const snap = g.view().snapshot;
      expect(snap.players).toHaveLength(n);

      // Mọi người chơi đều đứng trên ô cỏ trống (0) và có ít nhất 1 ô lân cận trống để né bom!
      for (const p of snap.players) {
        const tx = Math.floor(p.x);
        const ty = Math.floor(p.y);
        expect(snap.grid[ty * snap.width + tx]).toBe(0);
        const neighbors = [
          snap.grid[ty * snap.width + (tx + 1)],
          snap.grid[ty * snap.width + (tx - 1)],
          snap.grid[(ty + 1) * snap.width + tx],
          snap.grid[(ty - 1) * snap.width + tx],
        ];
        expect(neighbors.some((tile) => tile === 0)).toBe(true);
      }
      g.dispose();
    }
  });

  it('cơ chế Bóng Nước 4.5s: Đồng đội chạm CỨU SỐNG (+1 cứu), Kẻ địch chạm CHÍCH NỔ "BỤP!" (+1 kill -> UFO)', () => {
    // 4 người chế độ Đấu Đội: p0 & p2 Đội Đỏ (0), p1 & p3 Đội Xanh (1)
    const h = makeHarness(909, { boomMode: 'teams', boomRounds: 1 }, 200);
    const g = new BoomOnlineGame(h.ctx);
    g.start(makePlayers(4));
    // Qua pha countdown
    g.stepManual(10);
    expect(g.view().phase).toBe('playing');

    const internal = g as unknown as {
      grid: number[];
      width: number;
      height: number;
      players: {
        id: string;
        x: number;
        y: number;
        state: string;
        shieldTicks: number;
        trappedTicks: number;
        trappedBy: string | null;
        needles: number;
        ufoCooldownTicks: number;
      }[];
      bombs: unknown[];
    };

    // Dọn sạch mặt sân giữa để test va chạm chính xác 100%
    for (let y = 1; y < internal.height - 1; y++) {
      for (let x = 1; x < internal.width - 1; x++) {
        internal.grid[y * internal.width + x] = 0;
      }
    }
    for (const p of internal.players) p.shieldTicks = 0;

    const p0 = internal.players.find((p) => p.id === 'p0')!; // Đỏ
    const p1 = internal.players.find((p) => p.id === 'p1')!; // Xanh
    const p2 = internal.players.find((p) => p.id === 'p2')!; // Đỏ (đồng đội p0)
    const p3 = internal.players.find((p) => p.id === 'p3')!; // Xanh

    // Đưa p2 & p3 ra xa để chưa can thiệp
    p2.x = 11.5;
    p2.y = 9.5;
    p3.x = 11.5;
    p3.y = 1.5;

    // 1) p1 đặt bom nhốt p0 vào Bóng Nước
    p0.x = 3.5;
    p0.y = 3.5;
    p1.x = 2.5;
    p1.y = 3.5;
    expect(g.action('p1', { type: 'bm_input', input: { dx: 0, dy: 0, placeBomb: true, seq: 1 } }).ok).toBe(true);
    g.stepManual(1);
    // p1 lùi ra xa để không tự dính bom của mình
    p1.x = 1.5;
    p1.y = 1.5;
    g.stepManual(BOOM_BOMB_FUSE_TICKS + 1);
    expect(p0.state).toBe('trapped');

    // Chờ tia nước tan hẳn rồi đồng đội p2 chạy tới chạm vào bóng nước của p0 -> CỨU SỐNG!
    g.stepManual(BOOM_BLAST_TICKS);
    p2.x = p0.x;
    p2.y = p0.y;
    g.stepManual(1);
    expect(p0.state).toBe('alive');
    expect(g.view().saves.p2).toBe(1);

    // 3) Kim tự cứu (`needle`): p0 bị nhốt lần nữa nhưng có Kim -> bấm special tự thoát ngay!
    p0.shieldTicks = 0;
    p0.state = 'trapped';
    p0.trappedTicks = 60;
    p0.needles = 1;
    p2.x = 11.5;
    p2.y = 9.5;
    expect(g.action('p0', { type: 'bm_input', input: { dx: 0, dy: 0, special: true, seq: 2 } }).ok).toBe(true);
    g.stepManual(1);
    expect(p0.state).toBe('alive');
    expect(p0.needles).toBe(0);

    // 4) Kẻ địch p1 chạy tới tông vào bóng nước của p0 -> "BỤP!" hạ gục, p0 hóa thành Đĩa Bay Phục Thù (`ufo`)!
    p0.shieldTicks = 0;
    p0.state = 'trapped';
    p0.trappedTicks = 60;
    p0.trappedBy = 'p1';
    p1.x = p0.x;
    p1.y = p0.y;
    g.stepManual(1);
    expect(p0.state).toBe('ufo');
    expect(g.view().kills.p1).toBe(1);

    // 5) p0 trong trạng thái Đĩa Bay (`ufo`) ném bom phục thù từ ngoài biên vào sân!
    p0.ufoCooldownTicks = 0;
    expect(g.action('p0', { type: 'bm_input', input: { dx: 0, dy: 0, placeBomb: true, seq: 3 } }).ok).toBe(true);
    g.stepManual(1);
    const ufoBomb = g.view().snapshot.bombs.find((b) => b.ownerId === 'p0' && b.fromUfo);
    expect(ufoBomb).toBeDefined();
    g.stepManual(BOOM_LOB_TICKS + 2);
    g.dispose();
  });

  it('Giày Đá Bom, Găng Tay Ném Bom qua tường, Vòng Bo Gạch Tử Thần sau 45s & 12 Bot đấu trọn ván', () => {
    const h = makeHarness(1234, { boomMode: 'ffa', boomRounds: 1 }, 150);
    const g = new BoomOnlineGame(h.ctx);
    g.start(makePlayers(3));
    g.stepManual(8);

    const internal = g as unknown as {
      grid: number[];
      width: number;
      height: number;
      timeLeftMs: number;
      players: {
        id: string;
        x: number;
        y: number;
        dir: string;
        canKick: boolean;
        canGlove: boolean;
      }[];
      bombs: { id: number; x: number; y: number; vx: number; vy: number; lob?: unknown }[];
    };

    // Dọn đường ngang y=3 để thử Đá Bom & Ném Bom
    for (let x = 1; x < internal.width - 1; x++) {
      internal.grid[3 * internal.width + x] = 0;
    }
    const p0 = internal.players[0];
    p0.x = 3.5;
    p0.y = 3.5;
    p0.dir = 'right';
    p0.canKick = true;
    p0.canGlove = true;

    // 1) Đặt bom ở (3,3) rồi bấm Kỹ Năng khi đang đứng trên bom -> Găng Tay quăng bom bay vọt đi!
    g.action('p0', { type: 'bm_input', input: { dx: 0, dy: 0, placeBomb: true, seq: 1 } });
    g.stepManual(1);
    expect(internal.bombs).toHaveLength(1);
    g.action('p0', { type: 'bm_input', input: { dx: 1, dy: 0, special: true, seq: 2 } });
    g.stepManual(1);
    expect(internal.bombs[0].lob).toBeDefined();
    g.stepManual(BOOM_LOB_TICKS + 1);
    expect(Math.floor(internal.bombs[0].x)).toBeGreaterThan(4);

    // 2) Giày Đá Bom (`canKick`): bước sang trái khỏi bom mới rồi húc vào quả bom -> bom trượt thẳng (`vx > 0`)!
    p0.x = 2.5;
    p0.y = 3.5;
    g.action('p0', { type: 'bm_input', input: { dx: 0, dy: 0, placeBomb: true, seq: 3 } });
    g.stepManual(1);
    const kickBomb = internal.bombs[internal.bombs.length - 1];
    g.action('p0', { type: 'bm_input', input: { dx: -1, dy: 0, seq: 4 } });
    g.stepManual(8);
    g.action('p0', { type: 'bm_input', input: { dx: 1, dy: 0, seq: 5 } });
    g.stepManual(8);
    expect(kickBomb.x).toBeGreaterThan(2.6);

    // Kích hoạt Vòng Bo sau 45s (`timeLeftMs <= 30_000`)
    const shrinkThresholdMs = (BOOM_ROUND_SEC - BOOM_SHRINK_START_SEC) * 1000;
    internal.timeLeftMs = shrinkThresholdMs - 100;
    g.stepManual(25);
    expect(g.view().snapshot.ringActive).toBe(true);
    expect(g.view().snapshot.grid.some((tile) => tile === 3)).toBe(true);
    g.dispose();

    // Đấu trọn ván 12 người (1 người + 11 Bot thông minh) chế độ 1 hiệp -> kết thúc sạch sẽ có BXH!
    const bots = new Set(Array.from({ length: 11 }, (_, i) => `p${i + 1}`));
    const hMatch = makeHarness(2026, { boomMode: 'ffa', boomRounds: 1 }, 100, bots);
    const gMatch = new BoomOnlineGame(hMatch.ctx);
    gMatch.start(makePlayers(12));
    gMatch.stepManual(2200);
    const res = hMatch.getResult();
    expect(res).not.toBeNull();
    expect(res!.ranking).toHaveLength(12);
    gMatch.dispose();
  });
});

// ============================================================================
// 6. GAME MỚI #2: 🃏 UNO TÀN NHẪN (`uno_mercy` — SHOW 'EM NO MERCY)
// ============================================================================
describe("Phase 36 — UNO Tàn Nhẫn (UNO Show 'Em No Mercy)", () => {
  const card = (id: string, color: UnoColor | 'wild', kind: UnoCardKind): UnoCard => ({ id, color, kind });

  it('cách ly tuyệt đối bài bí mật perPlayerView & chồng bài không đáy (+2 -> +4 -> +6 -> +10 = +22)', () => {
    const h = makeHarness(3001, {}, 5000);
    const g = new UnoMercyGame(h.ctx);
    expect(g.perPlayerView).toBe(true);
    g.start(makePlayers(5));

    const v0 = g.view('p0');
    const v1 = g.view('p1');
    expect(v0.myHand).toHaveLength(7);
    expect(v1.myHand).toHaveLength(7);
    expect(v0.myHand[0].id).not.toBe(v1.myHand[0].id);
    expect(g.view().myHand).toHaveLength(0);

    // Dàn dựng bàn cờ để kiểm tra Cộng Dồn Không Đáy (+2 -> +4 -> +6 -> +10)
    const internal = g as unknown as {
      currentPlayerId: string;
      direction: 1 | -1;
      activeColor: UnoColor;
      topCard: UnoCard;
      hands: Map<string, UnoCard[]>;
    };
    internal.currentPlayerId = 'p0';
    internal.direction = 1;
    internal.activeColor = 'red';
    internal.topCard = card('top_r5', 'red', '5');

    internal.hands.set('p0', [card('c_p0_d2', 'red', 'draw2'), card('c_p0_x', 'blue', '1')]);
    internal.hands.set('p1', [
      card('c_p1_small_d2', 'blue', 'draw2'),
      card('c_p1_d4', 'green', 'draw4'),
      card('c_p1_x', 'yellow', '2'),
    ]);
    internal.hands.set('p2', [
      card('c_p2_small_d4', 'red', 'draw4'),
      card('c_p2_d6', 'wild', 'wild_draw6'),
      card('c_p2_x', 'red', '3'),
    ]);
    internal.hands.set('p3', [card('c_p3_d10', 'wild', 'wild_draw10'), card('c_p3_x', 'blue', '4')]);
    internal.hands.set('p4', [card('c_p4_1', 'green', '1'), card('c_p4_2', 'green', '2')]);

    // p0 đánh +2 Đỏ -> stack = 2
    expect(g.action('p0', { type: 'um_play', cardId: 'c_p0_d2' }).ok).toBe(true);
    expect(g.view('p1').drawStack).toBe(2);

    // p1 chồng +4 Lá -> stack = 6 (mức tối thiểu lên 4)
    expect(g.action('p1', { type: 'um_play', cardId: 'c_p1_d4' }).ok).toBe(true);
    expect(g.view('p2').drawStack).toBe(6);
    expect(g.view('p2').drawMinValue).toBe(4);

    // p2 cố đánh +2 (giả sử có) sẽ bị từ chối; chồng +6 Wild chọn Vàng -> stack = 12 (mức tối thiểu lên 6)
    internal.hands.get('p2')!.push(card('c_p2_bad2', 'green', 'draw2'));
    expect(g.action('p2', { type: 'um_play', cardId: 'c_p2_bad2' }).ok).toBe(false);
    expect(g.action('p2', { type: 'um_play', cardId: 'c_p2_d6', chosenColor: 'yellow' }).ok).toBe(true);
    expect(g.view('p3').drawStack).toBe(12);
    expect(g.view('p3').drawMinValue).toBe(6);

    // p3 chồng tiếp +10 Wild chọn Xanh -> stack = 22!
    expect(g.action('p3', { type: 'um_play', cardId: 'c_p3_d10', chosenColor: 'blue' }).ok).toBe(true);
    expect(g.view('p4').drawStack).toBe(22);
    expect(g.view('p4').drawMinValue).toBe(10);

    // p4 đang có 2 lá + rút chồng 22 lá = 24 lá (sát nút 25 lá nhưng chưa nổ!)
    expect(g.action('p4', { type: 'um_draw' }).ok).toBe(true);
    expect(g.view('p4').myHand).toHaveLength(24);
    expect(g.view('p4').alive).toContain('p4');
    expect(g.view('p4').drawStack).toBe(0);
    g.dispose();
  });

  it('Luật Nổ Bài (Mercy Rule >= 25 lá) loại trực tiếp ngay lập tức + Số 7 Tráo Bài + Số 0 Xoay Bài + Bắt UNO', () => {
    const h = makeHarness(4002, {}, 5000);
    const g = new UnoMercyGame(h.ctx);
    g.start(makePlayers(3));

    const internal = g as unknown as {
      currentPlayerId: string;
      direction: 1 | -1;
      activeColor: UnoColor;
      topCard: UnoCard;
      hands: Map<string, UnoCard[]>;
    };
    internal.currentPlayerId = 'p0';
    internal.direction = 1;
    internal.activeColor = 'blue';
    internal.topCard = card('top_b7', 'blue', '6');

    // 1) Số 7 Tráo Bài: p0 đang cầm 5 lá đánh Số 7 cướp bộ 1 lá của p1!
    internal.hands.set('p0', [
      card('p0_7', 'blue', '7'),
      card('p0_a', 'red', '1'),
      card('p0_b', 'red', '2'),
      card('p0_c', 'yellow', '3'),
      card('p0_d', 'green', '4'),
    ]);
    internal.hands.set('p1', [card('p1_only', 'blue', '9')]);
    internal.hands.set('p2', [card('p2_0', 'blue', '0'), card('p2_x', 'green', '8'), card('p2_y', 'red', '9')]);

    expect(g.action('p0', { type: 'um_play', cardId: 'p0_7' }).ok).toBe(true);
    expect(g.view('p0').phase).toBe('choose_swap');
    expect(g.action('p0', { type: 'um_pick_swap', targetId: 'p1' }).ok).toBe(true);
    // p0 giờ chỉ còn 1 lá ('p1_only'), còn p1 ôm 4 lá cũ của p0!
    expect(g.view('p0').myHand.map((c) => c.id)).toEqual(['p1_only']);
    expect(g.view('p1').myHand).toHaveLength(4);

    // 2) Tới lượt p1 -> giả lập p2 đánh Số 0 Xoay Bài Cả Bàn theo chiều thuận (p0 -> p1 -> p2 -> p0)
    internal.currentPlayerId = 'p2';
    internal.activeColor = 'blue';
    expect(g.action('p2', { type: 'um_play', cardId: 'p2_0' }).ok).toBe(true);
    // Trước khi xoay (sau khi p2 hạ p2_0): p0=1 lá, p1=4 lá, p2=2 lá.
    // Xoay thuận (+1): p1 nhận bài p0 (1 lá), p2 nhận bài p1 (4 lá), p0 nhận bài p2 (2 lá)!
    expect(g.view('p1').myHand).toHaveLength(1);
    expect(g.view('p2').myHand).toHaveLength(4);
    expect(g.view('p0').myHand).toHaveLength(2);

    // 3) Quên hô UNO & Bị Bắt Quả Tang (+2 lá phạt):
    internal.currentPlayerId = 'p0';
    internal.activeColor = 'red';
    internal.topCard = card('top_r1', 'red', '1');
    internal.hands.set('p0', [card('p0_play', 'red', '5'), card('p0_last', 'blue', '8')]);
    // p0 đánh xuống còn 1 lá mà KHÔNG bấm um_shout_uno trước!
    expect(g.action('p0', { type: 'um_play', cardId: 'p0_play' }).ok).toBe(true);
    expect(g.view('p1').unoVulnerableId).toBe('p0');
    expect(g.action('p1', { type: 'um_catch_uno', targetId: 'p0' }).ok).toBe(true);
    expect(g.view('p0').myHand).toHaveLength(3); // 1 + 2 lá phạt!

    // 4) Luật Nổ Bài (Mercy Rule >= 25 lá): p1 đang cầm 21 lá, p0 ném +4 khiến p1 rút lên 25 lá -> CHÁY BÀI LOẠI NGAY!
    internal.currentPlayerId = 'p0';
    internal.activeColor = 'red';
    internal.hands.set('p0', [card('p0_d4', 'red', 'draw4'), card('p0_keep', 'yellow', '2')]);
    internal.hands.set(
      'p1',
      Array.from({ length: UNO_MERCY_LIMIT - 4 }, (_, idx) => card(`heavy_${idx}`, 'green', '1')),
    );
    expect(g.action('p0', { type: 'um_shout_uno' }).ok).toBe(true);
    expect(g.action('p0', { type: 'um_play', cardId: 'p0_d4' }).ok).toBe(true);
    expect(g.action('p1', { type: 'um_draw' }).ok).toBe(true);

    const afterMercy = g.view('p0');
    expect(afterMercy.alive).not.toContain('p1');
    expect(afterMercy.eliminated.some((e) => e.id === 'p1' && e.reason === 'mercy_25')).toBe(true);
    expect(afterMercy.lastBanner?.kind).toBe('mercy_ko');
    g.dispose();
  });

  it('mô phỏng các bàn 2, 6 và 12 Bot Tàn Nhẫn đấu tới khi tìm ra Quán Quân mà không bao giờ treo lặp', () => {
    for (const playerCount of [2, 6, 12]) {
      const bots = new Set(Array.from({ length: playerCount }, (_, i) => `p${i}`));
      const h = makeHarness(7000 + playerCount, {}, 2000, bots);
      const g = new UnoMercyGame(h.ctx);
      g.start(makePlayers(playerCount));

      let guard = 0;
      while (!h.getResult() && guard < 1500) {
        guard++;
        const state = g.view();
        let acted = false;
        if (state.unoVulnerableId) {
          for (const pid of state.alive) {
            if (pid === state.unoVulnerableId) continue;
            const catchAct = g.botAction(pid);
            if (catchAct?.type === 'um_catch_uno') {
              expect(g.action(pid, catchAct).ok).toBe(true);
              acted = true;
              break;
            }
          }
        }
        if (acted || h.getResult()) continue;

        const cur = state.currentPlayerId!;
        const act = g.botAction(cur);
        expect(act).not.toBeNull();
        expect(g.action(cur, act!).ok).toBe(true);
      }

      const res = h.getResult();
      expect(res).not.toBeNull();
      expect(res!.winnerId).toBeTruthy();
      expect(res!.ranking).toHaveLength(playerCount);
      g.dispose();
    }
  });
});
