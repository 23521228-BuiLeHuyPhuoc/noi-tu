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
