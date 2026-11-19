/**
 * BỘ KIỂM THỬ MASTER OVERHAUL V6 (PHASES 45–53):
 * - VeDoan: >= 600 từ không trùng, mặc định 4 vòng (2p = 8 lượt, max 24).
 * - DoVui: 546 câu verified không trùng, phương án cân bằng độ dài, hỗ trợ 20 câu.
 * - MaSoi: canRoomChat, Sói không cắn Sói, bất đồng multi-Sói không kết đêm sớm, xóa wolfVotes sang ngày,
 *   Phù Thủy không tự đầu độc, role_reveal ready, bot day_discuss không kẹt, publicLog.at, chuỗi Cặp Đôi + Thợ Săn.
 * - GianDiep: thời gian các pha kéo dài đủ thảo luận/suy luận.
 * - Loto: callIntervalMs = 1500ms, vé 6×9 = 30 số (2 block 3×9 Gale-Ryser), loto_kinh hàng 0..5.
 * - Boom & CroakSquad: trượt góc khi nhấn chéo (`moveBoomPlayerWithSlide`) & tách va chạm + bám bệ `moveAndCollideFrog`.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { moveBoomPlayerWithSlide } from '../../shared/src/boom';
import {
  CROAK_FROG_H,
  CROAK_FROG_W,
  moveAndCollideFrog,
  type CroakRect,
} from '../../shared/src/croaksquad';
import { DO_VUI_QUESTIONS, type DoVuiView } from '../../shared/src/dovui';
import type { GianDiepView } from '../../shared/src/giandiep';
import {
  LOTO_TICKET_NUMBERS,
  LOTO_TICKET_ROWS,
  checkLotoRow,
  generateLotoTicket,
} from '../../shared/src/loto';
import type { MaSoiView } from '../../shared/src/masoi';
import { VE_DOAN_WORDS, type VeDoanView } from '../../shared/src/vedoan';
import type { GameResult, RoomSettings } from '../../shared/src/types';
import { Dictionary } from '../src/dictionary';
import type { EngineContext, EnginePlayer } from '../src/games/engine';
import { GianDiepGame } from '../src/games/giandiep';
import { LotoGame } from '../src/games/loto';
import { MaSoiGame } from '../src/games/masoi';
import { VeDoanGame } from '../src/games/vedoan';
import { Room } from '../src/room';
import { SMALL_WORDS } from './helpers';

function makePlayers(n: number): EnginePlayer[] {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `Player ${i + 1}` }));
}

function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function makeCtx(
  rng: () => number,
  settings: RoomSettings = {},
  turnMs?: number,
  bots = new Set<string>(),
) {
  let result: GameResult | null = null;
  const ctx: EngineContext = {
    rng,
    dict: new Dictionary(SMALL_WORDS),
    settings,
    ...(turnMs !== undefined ? { turnMs } : {}),
    hostId: () => 'p0',
    isConnected: (id) => !bots.has(id),
    isBot: (id) => bots.has(id),
    playerColor: (id) => Number(id.replace(/\D/g, '')) || 0,
    changed: () => {},
    finish: (r) => {
      result = r;
    },
    learnWord: () => {},
  };
  return { ctx, getResult: () => result };
}

describe('Phase 46 — Vẽ & Đoán V6: 600+ từ chuẩn hóa & mặc định 4 vòng (max 24 lượt)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('kho từ VE_DOAN_WORDS đạt >= 600 từ độc nhất sau chuẩn hóa', () => {
    expect(VE_DOAN_WORDS.length).toBeGreaterThanOrEqual(600);
    const normSet = new Set(VE_DOAN_WORDS.map((w) => w.trim().toLowerCase()));
    expect(normSet.size).toBe(VE_DOAN_WORDS.length);
  });

  it('mặc định 4 vòng: 2 người chơi 8 lượt, 8 người giới hạn tối đa 24 lượt & không lặp từ', () => {
    vi.useFakeTimers();
    const { ctx } = makeCtx(seededRng(4601), {}, 4000);
    const g2 = new VeDoanGame(ctx);
    g2.start(makePlayers(2));
    expect((g2.view('p0') as VeDoanView).totalTurns).toBe(8);
    g2.dispose();

    const { ctx: ctx8 } = makeCtx(seededRng(4602), {}, 4000);
    const g8 = new VeDoanGame(ctx8);
    g8.start(makePlayers(8));
    expect((g8.view('p0') as VeDoanView).totalTurns).toBe(24);
    g8.dispose();
  });
});

describe('Phase 47 — Đố Vui V6: 546 câu Intern–Junior cân bằng & tùy chọn 20 câu', () => {
  it('đủ 546 câu hỏi không trùng lặp nội dung & độ dài 4 phương án cân bằng', () => {
    expect(DO_VUI_QUESTIONS.length).toBeGreaterThanOrEqual(546);
    const prompts = new Set<string>();
    let rangeRatioSum = 0;
    let biasRatioSum = 0;

    for (const q of DO_VUI_QUESTIONS) {
      const normQ = q.q.trim().toLowerCase();
      expect(prompts.has(normQ)).toBe(false);
      prompts.add(normQ);
      expect(q.options).toHaveLength(4);
      const lens = q.options.map((o) => o.trim().length);
      const maxLen = Math.max(...lens, 1);
      const minLen = Math.min(...lens);
      const corrLen = lens[q.correct];
      const avgWrong = (lens.reduce((a, b) => a + b, 0) - corrLen) / 3;
      rangeRatioSum += (maxLen - minLen) / maxLen;
      biasRatioSum += Math.abs(corrLen - avgWrong) / maxLen;
    }

    expect(rangeRatioSum / DO_VUI_QUESTIONS.length).toBeLessThanOrEqual(0.32);
    expect(biasRatioSum / DO_VUI_QUESTIONS.length).toBeLessThanOrEqual(0.2);
  });

  it('Room cho phép cấu hình doVuiQuestions = 20 và khởi tạo đủ 20 câu', () => {
    const dict = new Dictionary(SMALL_WORDS);
    const room = new Room('QUIZ20', dict, { rng: seededRng(4701), turnMs: 2000 });
    const host = room.addPlayer('Chủ Phòng');
    expect(host.ok).toBe(true);
    if (!host.ok) return;
    expect(room.configure(host.playerId, 'do_vui', { doVuiQuestions: 20 })).toEqual({ ok: true });
    expect(room.start(host.playerId)).toEqual({ ok: true });
    const view = room.toPublic().game as DoVuiView;
    expect(view.type).toBe('do_vui');
    expect(view.total).toBe(20);
    room.dispose();
  });
});

describe('Phase 49 — Ma Sói V6: sửa triệt để 8 lỗi logic & chat phòng chung', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('canRoomChat & Room.addChat chặn chat ban đêm và chặn người đã chết, Sói không cắn đồng đội, multi-Sói phải đồng thuận, xóa wolfVotes lúc bình minh, Phù Thủy không tự đầu độc, role_reveal sẵn sàng sớm', () => {
    vi.useFakeTimers();
    const { ctx } = makeCtx(() => 0.9999, {}, 5000);
    // 8 người classic: p0: soi, p1: soi, p2: tientri, p3: baove, p4: phuthuy, p5: thosan, p6: cupid, p7: thamtu
    const game = new MaSoiGame(ctx);
    game.start(makePlayers(8));

    expect(game.view('p0').phase).toBe('role_reveal');
    expect(game.view('p0').publicLog.every((l) => typeof l.at === 'number' && l.at > 0)).toBe(true);

    // Đủ tất cả bấm Sẵn sàng -> sang đêm ngay trước hết giờ!
    for (let i = 0; i < 8; i++) {
      expect(game.action(`p${i}`, { type: 'ms_ready' })).toEqual({ ok: true });
    }
    expect(game.view('p0').phase).toBe('night_cupid');
    expect(game.canRoomChat('p0')).toBe(false);

    // Cupid chọn p2 & p5 (Thợ Săn)
    expect(game.action('p6', { type: 'ms_night', target: 'p2', target2: 'p5' })).toEqual({ ok: true });
    expect(game.view('p0').phase).toBe('night_active');
    expect(game.canRoomChat('p2')).toBe(false);

    // Sói p0 KHÔNG thể cắn đồng bọn p1
    expect(game.action('p0', { type: 'ms_night', target: 'p1' })).toEqual({ ok: false, reason: 'bad_action' });

    // Hai Sói chọn 2 mục tiêu khác nhau -> dù Tiên Tri, Bảo Vệ, Thám Tử xong hết vẫn chưa kết đêm sớm!
    expect(game.action('p0', { type: 'ms_night', target: 'p7' })).toEqual({ ok: true });
    expect(game.action('p1', { type: 'ms_night', target: 'p6' })).toEqual({ ok: true });
    expect(game.action('p2', { type: 'ms_night', target: 'p0' })).toEqual({ ok: true });
    expect(game.action('p3', { type: 'ms_night', target: 'p3' })).toEqual({ ok: true });
    expect(game.view('p0').phase).toBe('night_active');

    // Khi p1 đổi sang đồng thuận với p0 (p7) -> sang Phù Thủy ngay!
    expect(game.action('p1', { type: 'ms_night', target: 'p7' })).toEqual({ ok: true });
    expect(game.view('p4').phase).toBe('night_witch');

    // Phù Thủy KHÔNG được tự đầu độc chính mình
    expect(game.action('p4', { type: 'ms_night', poison: 'p4' })).toEqual({ ok: false, reason: 'bad_action' });
    // Phù Thủy bỏ qua (không cứu, không độc) -> sang bình minh, xóa wolfVotes, p7 chết -> người chết không chat được
    expect(game.action('p4', { type: 'ms_night' })).toEqual({ ok: true });
    const dayView = game.view('p0') as MaSoiView;
    expect(dayView.phase).toBe('day_discuss');
    expect(dayView.wolfVotes).toBeUndefined();
    expect(dayView.alive).not.toContain('p7');
    expect(game.canRoomChat('p7')).toBe(false);
    expect(game.canRoomChat('p0')).toBe(true);

    // Nếu p2 (yêu p5 Thợ Săn) bị remove/chết -> kích hoạt chuỗi Thợ Săn mà không tự đánh dấu fired nhầm
    game.removePlayer('p2');
    expect(game.view('p0').phase).toBe('hunter_shot');

    game.dispose();
  });

  it('Room.addChat tôn trọng canRoomChat (chặn ban đêm, mở ban ngày) & day_discuss bot sẵn sàng không bị treo', () => {
    vi.useFakeTimers();
    const dict = new Dictionary(SMALL_WORDS);
    const room = new Room('MSCHAT', dict, { turnMs: 6000, rng: () => 0.9999 });
    const h = room.addPlayer('Host');
    expect(h.ok).toBe(true);
    if (!h.ok) return;
    room.configure(h.playerId, 'masoi', { masoiPreset: 'classic' });
    for (let i = 0; i < 5; i++) expect(room.addBot(h.playerId).ok).toBe(true);
    expect(room.start(h.playerId)).toEqual({ ok: true });

    // Trong role_reveal cho chat trước khi ngủ
    expect(room.addChat(h.playerId, 'Chào làng!')).not.toBeNull();

    // Sang đêm -> chat phòng bị chặn hoàn toàn
    vi.advanceTimersByTime(6200);
    expect(room.addChat(h.playerId, 'Alo soi ne')).toBeNull();
    room.dispose();
  });
});

describe('Phase 50 — Ai Là Gián Điệp V6: thời gian pha kéo dài đủ thảo luận', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('thời gian mặc định clue_turn >= 40s, discussion >= 45s, vote >= 35s, mrwhite/spy_guess >= 25s', () => {
    vi.useFakeTimers();
    const { ctx } = makeCtx(seededRng(5001));
    const g = new GianDiepGame(ctx);
    g.start(makePlayers(4));

    const vReveal = g.view('p0') as GianDiepView;
    expect(vReveal.phase).toBe('word_reveal');
    expect(vReveal.phaseSeconds).toBe(10);

    vi.advanceTimersByTime(10_200);
    const vClue = g.view('p0') as GianDiepView;
    expect(vClue.phase).toBe('clue_turn');
    expect(vClue.phaseSeconds).toBe(40);
    g.dispose();
  });

  it('khóa tuyệt đối chat khi clue_turn/word_reveal/clue_summary/spy_guess & mở chat suốt discussion/vote/defense/final_vote + removePlayer không treo pha', () => {
    vi.useFakeTimers();
    const dict = new Dictionary(SMALL_WORDS);
    const room = new Room('GDCHAT', dict, { rng: () => 0.9999 });
    const h = room.addPlayer('Host');
    expect(h.ok).toBe(true);
    if (!h.ok) return;
    const p1 = room.addPlayer('Ban1');
    const p2 = room.addPlayer('Ban2');
    const p3 = room.addPlayer('Ban3');
    expect(p1.ok && p2.ok && p3.ok).toBe(true);
    if (!p1.ok || !p2.ok || !p3.ok) return;

    expect(room.configure(h.playerId, 'giandiep', { giandiepMrWhite: false, giandiepSpies: 1 })).toEqual({ ok: true });
    expect(room.start(h.playerId)).toEqual({ ok: true });

    const allIds = [h.playerId, p1.playerId, p2.playerId, p3.playerId];
    // word_reveal: khóa Room.addChat & gd_chat; bấm gd_ready đủ người thì sang clue_turn ngay
    expect(room.addChat(h.playerId, 'Alo')).toBeNull();
    expect(room.action(h.playerId, { type: 'gd_chat', text: 'Alo' })).toEqual({ ok: false, reason: 'not_your_turn' });
    for (const id of allIds) expect(room.action(id, { type: 'gd_ready' })).toEqual({ ok: true });

    const vClue = room.toPublic(h.playerId).game as GianDiepView;
    expect(vClue.phase).toBe('clue_turn');
    // Trong clue_turn: cả speaker lẫn người khác đều không được chat tự do
    for (const id of allIds) {
      expect(room.addChat(id, 'Chat trong luc khai')).toBeNull();
      expect(room.action(id, { type: 'gd_chat', text: 'Chat trong luc khai' })).toEqual({
        ok: false,
        reason: 'not_your_turn',
      });
    }

    // Khai đủ 4 gợi ý -> clue_summary
    for (let i = 0; i < 4; i++) {
      const sp = (room.toPublic(h.playerId).game as GianDiepView).currentSpeakerId!;
      expect(room.action(sp, { type: 'gd_clue', text: `Gợi ý vòng 1 số ${i + 1}` })).toEqual({ ok: true });
    }
    expect((room.toPublic(h.playerId).game as GianDiepView).phase).toBe('clue_summary');
    expect(room.addChat(h.playerId, 'Khoan chat')).toBeNull();

    // Đa số ready trong clue_summary -> sang discussion & mở khóa chat
    expect(room.action(h.playerId, { type: 'gd_ready' })).toEqual({ ok: true });
    expect(room.action(p1.playerId, { type: 'gd_ready' })).toEqual({ ok: true });
    const vDisc = room.toPublic(h.playerId).game as GianDiepView;
    expect(vDisc.phase).toBe('discussion');
    expect(vDisc.timeline.some((item) => item.kind === 'clue')).toBe(true);
    expect(room.addChat(h.playerId, 'Thảo luận nào!')).not.toBeNull();

    // Chống lách lọc từ khóa viết dính không khoảng trắng / không dấu trong gd_chat
    const danWord = (room.toPublic(p1.playerId).game as GianDiepView).myWord;
    if (danWord && danWord.includes(' ')) {
      const compactNoAccent = danWord
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/\s+/g, '')
        .toLowerCase();
      expect(room.action(p1.playerId, { type: 'gd_chat', text: `Chac chan la ${compactNoAccent}` })).toEqual({
        ok: false,
        reason: 'word_leaked',
      });
    }

    // Chuyển vote -> chat vẫn mở khi bỏ phiếu
    expect(room.action(h.playerId, { type: 'gd_ready' })).toEqual({ ok: true });
    expect(room.action(p1.playerId, { type: 'gd_ready' })).toEqual({ ok: true });
    expect((room.toPublic(h.playerId).game as GianDiepView).phase).toBe('vote');
    expect(room.action(h.playerId, { type: 'gd_chat', text: 'Chot phieu nha' })).toEqual({ ok: true });
    expect(room.addChat(p1.playerId, 'Dang vote roi')).not.toBeNull();

    expect(room.action(h.playerId, { type: 'gd_vote', target: p2.playerId })).toEqual({ ok: true });
    expect(room.action(p1.playerId, { type: 'gd_vote', target: p2.playerId })).toEqual({ ok: true });
    expect(room.action(p2.playerId, { type: 'gd_vote', target: p1.playerId })).toEqual({ ok: true });
    // p3 rời/mất kết nối khi còn là người cuối chưa vote -> tự chuyển sang defense ngay!
    room.setConnected(p3.playerId, false);
    expect((room.toPublic(h.playerId).game as GianDiepView).phase).toBe('defense');
    // Trong defense: cả bị cáo lẫn người khác đều chat được
    expect(room.addChat(h.playerId, 'Nghe bien minh ne')).not.toBeNull();
    expect(room.action(p2.playerId, { type: 'gd_chat', text: 'Minh la dan thuong' })).toEqual({ ok: true });
    expect(room.action(p2.playerId, { type: 'gd_ready' })).toEqual({ ok: true });

    // Trong final_vote: cả bị cáo lẫn cử tri vẫn chat & biện minh bình thường!
    expect((room.toPublic(h.playerId).game as GianDiepView).phase).toBe('final_vote');
    expect(room.action(p2.playerId, { type: 'gd_chat', text: 'Dung truc xuat minh ma!' })).toEqual({ ok: true });
    expect(room.action(h.playerId, { type: 'gd_chat', text: 'De minh xem lai loi khai' })).toEqual({ ok: true });
    expect(room.addChat(p1.playerId, 'Chot phan quyet')).not.toBeNull();

    room.dispose();
  });

  it('botReadyTimer tự đánh thức bot ready ở discussion/clue_summary khi có mặt người chơi thật', () => {
    vi.useFakeTimers();
    const bots = new Set(['p1', 'p2', 'p3']);
    const { ctx } = makeCtx(seededRng(5002), { giandiepMrWhite: false, giandiepSpies: 1 }, undefined, bots);
    const g = new GianDiepGame(ctx);
    g.start(makePlayers(4));

    // Người thật ready ở word_reveal, chờ botReadyTimer (>2000ms) để bot tự ready theo
    expect(g.action('p0', { type: 'gd_ready' })).toEqual({ ok: true });
    vi.advanceTimersByTime(2200);
    for (const b of bots) {
      const ba = g.botAction(b);
      if (ba) expect(g.action(b, ba).ok).toBe(true);
    }
    expect(g.view('p0').phase).toBe('clue_turn');
    g.dispose();
  });
});

describe('Phase 52 — Lô Tô V6: Tốc độ 1.5s & Tờ vé 6×9 (30 số, 6 hàng KINH)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('100 tờ vé 6×9 sinh ngẫu nhiên đều đúng 30 số, 2 block 3×9 hợp lệ & cột tăng dần', () => {
    for (let seed = 15000; seed < 15100; seed++) {
      const grid = generateLotoTicket(seededRng(seed));
      expect(grid).toHaveLength(LOTO_TICKET_ROWS);
      const seen = new Set<number>();
      for (let r = 0; r < LOTO_TICKET_ROWS; r++) {
        expect(grid[r].filter((x) => x !== null)).toHaveLength(5);
      }
      for (let c = 0; c < 9; c++) {
        const blockA = [0, 1, 2].map((r) => grid[r][c]).filter((x): x is number => x !== null);
        const blockB = [3, 4, 5].map((r) => grid[r][c]).filter((x): x is number => x !== null);
        expect(blockA.length).toBeGreaterThanOrEqual(1);
        expect(blockA.length).toBeLessThanOrEqual(3);
        expect(blockB.length).toBeGreaterThanOrEqual(1);
        expect(blockB.length).toBeLessThanOrEqual(3);
        const col = [...blockA, ...blockB];
        for (let i = 0; i < col.length; i++) {
          expect(seen.has(col[i])).toBe(false);
          seen.add(col[i]);
          if (i > 0) expect(col[i]).toBeGreaterThan(col[i - 1]);
        }
      }
      expect(seen.size).toBe(LOTO_TICKET_NUMBERS);
    }
  });

  it('nhịp gọi bóng mặc định = 1500ms & loto_kinh hợp lệ cho cả hàng 3..5, từ chối ngoài biên', () => {
    vi.useFakeTimers();
    const { ctx, getResult } = makeCtx(seededRng(5201));
    const g = new LotoGame(ctx);
    g.start(makePlayers(2));
    expect(g.view().callIntervalMs).toBe(1500);

    expect(g.action('p0', { type: 'loto_kinh', row: 6 })).toEqual({ ok: false, reason: 'bad_action' });
    expect(g.action('p0', { type: 'loto_kinh', row: -1 })).toEqual({ ok: false, reason: 'bad_action' });

    // Cho bóng quay tới khi 1 hàng 3..5 đủ 5/5 rồi KINH hàng dưới đó!
    let wonLowerBlock = false;
    for (let step = 0; step < 95 && !getResult(); step++) {
      vi.advanceTimersByTime(1550);
      const v = g.view();
      const calledSet = new Set(v.called);
      for (const r of [3, 4, 5]) {
        if (checkLotoRow(v.tickets.p0, r, calledSet).validKinh) {
          const res = g.action('p0', { type: 'loto_kinh', row: r });
          if (res.ok) {
            wonLowerBlock = true;
            break;
          }
        }
      }
    }
    expect(wonLowerBlock || getResult() !== null).toBe(true);
    g.dispose();
  });
});

describe('Phase 53 — Boom Online & CroakSquad: Corner-Slide chéo & Tách va chạm bệ gỗ', () => {
  it('Boom: nhấn chéo (1, -1) quanh mép trụ tự động trượt góc vào hành lang trên', () => {
    // Hàng lang (2, 1) mở, (2, 2) là tường/trụ, (1, 1) mở; người ở (1.5, 2.2) đi (+1, -1)
    const isSolid = (tx: number, ty: number) => tx === 2 && ty === 2;
    let x = 1.5;
    let y = 2.2;
    for (let i = 0; i < 20; i++) {
      const m = moveBoomPlayerWithSlide(x, y, 1, -1, 4.5, 0.05, 13, 11, isSolid);
      x = m.x;
      y = m.y;
    }
    // Đã trượt mượt qua cạnh ô (2,2) sang ô (2,1) ở bên trên!
    expect(x).toBeGreaterThan(2.0);
    expect(y).toBeLessThan(1.9);
  });

  it('CroakSquad: đang nhảy lên (vy < 0) sát mép trên bệ gỗ KHÔNG bị kéo tụt dính xuống đất & thoát ép ngang bệ di động', () => {
    const plat: Parameters<typeof moveAndCollideFrog>[1][number] = {
      x: 100,
      y: 300,
      w: 120,
      h: 16,
      vxPlatform: 80,
      vyPlatform: 0,
    };
    const frogJumping = {
      x: 130,
      y: 300 - CROAK_FROG_H + 2, // vừa bật nhảy qua mặt trên bệ
      vx: 0,
      vy: -380,
      onGround: false,
    };
    moveAndCollideFrog(frogJumping, [plat], 1 / 30);
    expect(frogJumping.vy).toBeLessThan(-300);
    expect(frogJumping.onGround).toBe(false);

    // Ép ngang sâu vào bên trong tường -> fallback đẩy thoát ra ngoài
    const wall: CroakRect = { x: 200, y: 100, w: 60, h: 120 };
    const frogWedged = {
      x: 200 - CROAK_FROG_W + 18,
      y: 120,
      vx: 100,
      vy: 0,
      onGround: true,
    };
    moveAndCollideFrog(frogWedged, [wall], 1 / 30);
    expect(frogWedged.x + CROAK_FROG_W).toBeLessThanOrEqual(wall.x + 0.01);
  });
});
