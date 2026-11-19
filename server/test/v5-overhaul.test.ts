/**
 * BỘ KIỂM THỬ MASTER OVERHAUL V5 (PHASES 38–43):
 * - Phase 38: Cờ Caro (`caro`) pha `win_reveal` giữ đường 5 quân thắng trước tổng kết + nút `caro_finish_reveal`.
 * - Phase 39: Ai Là Gián Điệp (`giandiep`) luật nhiều vòng (`danAlive <= 1`), pha Phản Đòn `spy_guess`, `roleSummary` & `aliveCounts`.
 * - Phase 40: Vẽ & Đoán (`ve_doan`) 6 công cụ (`pen`, `fill`, `eraser`, `line`, `rect`, `circle`), Flood-Fill 2D & tính điểm công bằng.
 * - Phase 41: Đầm Lầy Quái Chiêu (`croaksquad`) sửa bug đứng/chạy trên thanh gỗ lơ lửng, thang máy di động & vừa nhảy vừa ném.
 * - Phase 43: Đặt Bom Tử Chiến (`boom_online`) mở rộng 9 vật phẩm (`max_range`, `shield` đỡ bom, `treasure` +25đ).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BOOM_MAX_RANGE_LVL,
  type BoomItemKind,
  type BoomPlayerEntity,
} from '../../shared/src/boom';
import {
  CROAK_DT,
  CROAK_FROG_H,
  CROAK_FROG_W,
  CROAK_STAGES,
  createCroakWorld,
  platformRectAt,
  stepCroakWorld,
} from '../../shared/src/croaksquad';
import {
  buildVeDoanShapePoints,
  computeFloodFillPath,
  VE_DOAN_TOOLS,
} from '../../shared/src/vedoan';
import type { GameResult, RoomSettings } from '../../shared/src/types';
import { Dictionary } from '../src/dictionary';
import { BoomOnlineGame } from '../src/games/boom';
import { CaroGame } from '../src/games/caro';
import type { EngineContext, EnginePlayer } from '../src/games/engine';
import { GianDiepGame } from '../src/games/giandiep';
import { VeDoanGame } from '../src/games/vedoan';
import { SMALL_WORDS } from './helpers';

function makePlayers(n: number): EnginePlayer[] {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `Player ${i + 1}` }));
}

function makeCtx(
  rng: () => number,
  settings: RoomSettings = {},
  turnMs?: number,
) {
  let result: GameResult | null = null;
  const ctx: EngineContext = {
    rng,
    dict: new Dictionary(SMALL_WORDS),
    settings,
    ...(turnMs !== undefined ? { turnMs } : {}),
    hostId: () => 'p0',
    isConnected: () => true,
    isBot: () => false,
    playerColor: (id) => Number(id.replace(/\D/g, '')) || 0,
    changed: () => {},
    finish: (r) => {
      result = r;
    },
    learnWord: () => {},
  };
  return { ctx, getResult: () => result };
}

describe('Phase 38 — Cờ Caro: Pha Win Reveal đường 5 quân trước bảng tổng kết', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('giữ ván ở trạng thái win_reveal hiển thị winLine 5 quân trước khi sang tổng kết, hỗ trợ caro_finish_reveal', () => {
    vi.useFakeTimers();
    const { ctx, getResult } = makeCtx(() => 0.5, { caroRevealMs: 4200, caroBlockTwoEnds: false }, 5000);
    const g = new CaroGame(ctx);
    g.start(makePlayers(2));

    // p0 đánh hàng ngang dòng 7: (7,3)..(7,7), p1 đánh dòng 8: (8,3)..(8,6)
    for (let k = 0; k < 4; k++) {
      expect(g.action('p0', { type: 'caro_move', row: 7, col: 3 + k }).ok).toBe(true);
      expect(g.action('p1', { type: 'caro_move', row: 8, col: 3 + k }).ok).toBe(true);
    }
    expect(g.action('p0', { type: 'caro_move', row: 7, col: 7 }).ok).toBe(true);

    // Chưa kết thúc ngay mà dừng ở win_reveal để chiêm ngưỡng 5 quân thắng!
    expect(getResult()).toBeNull();
    const vReveal = g.view();
    expect(vReveal.winnerId).toBe('p0');
    expect(vReveal.winLine).toHaveLength(5);
    expect(vReveal.revealEndsAt).toBeGreaterThan(Date.now());
    expect(vReveal.currentPlayerId).toBeNull();

    // Không cho đánh thêm nước mới trong khi đang reveal
    expect(g.action('p1', { type: 'caro_move', row: 1, col: 1 })).toEqual({ ok: false, reason: 'not_playing' });

    // Bấm nút chuyển ngay sang bảng tổng kết -> kết thúc tức thì
    expect(g.action('p1', { type: 'caro_finish_reveal' })).toEqual({ ok: true });
    expect(getResult()?.winnerId).toBe('p0');
    g.dispose();
  });

  it('tự chuyển sang bảng tổng kết sau khi hết đếm ngược revealEndsAt', () => {
    vi.useFakeTimers();
    const { ctx, getResult } = makeCtx(() => 0.5, { caroRevealMs: 3000 }, 5000);
    const g = new CaroGame(ctx);
    g.start(makePlayers(2));

    for (let k = 0; k < 4; k++) {
      g.action('p0', { type: 'caro_move', row: 5, col: 2 + k });
      g.action('p1', { type: 'caro_move', row: 6, col: 2 + k });
    }
    g.action('p0', { type: 'caro_move', row: 5, col: 6 });

    expect(getResult()).toBeNull();
    vi.advanceTimersByTime(3100);
    expect(getResult()?.winnerId).toBe('p0');
    g.dispose();
  });
});

describe('Phase 39 — Ai Là Gián Điệp: Kịch tính nhiều vòng & Phản đòn Gián Điệp', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('bàn 5 người (3 Dân + 1 Điệp + 1 Mr.White): loại 1 Dân Vòng 1 KHÔNG kết thúc ngay mà chơi tiếp Vòng 2!', () => {
    vi.useFakeTimers();
    const { ctx, getResult } = makeCtx(() => 0.9999, { giandiepMrWhite: true, giandiepSpies: 1 }, 2000);
    const g = new GianDiepGame(ctx);
    g.start(makePlayers(5));

    const v0 = g.view('p2');
    expect(v0.roleSummary).toEqual({ dan: 3, giandiep: 1, mrwhite: 1 });
    expect(v0.aliveCounts).toEqual({ dan: 3, hidden: 2 });

    // Vào Vòng 1: vote loại p2 (Dân Thường)
    vi.advanceTimersByTime(2100);
    for (let i = 0; i < 5; i++) {
      const s = g.view().currentSpeakerId!;
      g.action(s, { type: 'gd_clue', text: `Khẩu hiệu ${i}` });
    }
    expect(g.view('p0').phase).toBe('clue_summary');
    for (const id of ['p0', 'p1', 'p2']) g.action(id, { type: 'gd_ready' });
    expect(g.view('p0').phase).toBe('discussion');
    for (const id of ['p0', 'p1', 'p2']) g.action(id, { type: 'gd_ready' });
    for (const id of ['p0', 'p1', 'p3', 'p4']) g.action(id, { type: 'gd_vote', target: 'p2' });
    g.action('p2', { type: 'gd_vote', target: 'p0' });
    g.action('p2', { type: 'gd_ready' });
    for (const id of ['p0', 'p1', 'p3', 'p4']) g.action(id, { type: 'gd_verdict', verdict: 'banish' });

    // Còn 2 Dân vs 2 Hidden -> game VẪN TIẾP TỤC sang Vòng 2!
    const vR2 = g.view('p3');
    expect(vR2.round).toBe(2);
    expect(vR2.alive).toHaveLength(4);
    expect(vR2.aliveCounts).toEqual({ dan: 2, hidden: 2 });
    expect(getResult()).toBeNull();

    // Chỉ khi chỉ còn 1 Dân (danAlive <= 1), phe Gián Điệp mới thắng theo số lượng!
    g.removePlayer('p3');
    expect(g.view('p0').phase).toBe('reveal_end');
    g.dispose();
  });

  it('khi Gián Điệp cuối cùng bị vote loại, kích hoạt pha Phản Đòn 15s (spy_guess) để đoán từ lật kèo', () => {
    vi.useFakeTimers();
    const { ctx, getResult } = makeCtx(() => 0.9999, { giandiepMrWhite: false, giandiepSpies: 1 }, 2000);
    const g = new GianDiepGame(ctx);
    g.start(makePlayers(4));

    const danWord = g.view('p1').myWord!;
    vi.advanceTimersByTime(2100);
    for (let i = 0; i < 4; i++) {
      g.action(g.view().currentSpeakerId!, { type: 'gd_clue', text: `Mô tả ${i}` });
    }
    expect(g.view('p0').phase).toBe('clue_summary');
    for (const id of ['p0', 'p1']) g.action(id, { type: 'gd_ready' });
    expect(g.view('p0').phase).toBe('discussion');
    for (const id of ['p0', 'p1']) g.action(id, { type: 'gd_ready' });
    for (const id of ['p1', 'p2', 'p3']) g.action(id, { type: 'gd_vote', target: 'p0' });
    g.action('p0', { type: 'gd_vote', target: 'p1' });
    g.action('p0', { type: 'gd_ready' });
    for (const id of ['p1', 'p2', 'p3']) g.action(id, { type: 'gd_verdict', verdict: 'banish' });

    expect(g.view('p0').phase).toBe('spy_guess');
    expect(g.view('p1').mrWhiteId).toBe('p0');

    // Gián Điệp đoán trúng từ Dân Thường -> lật kèo thắng!
    expect(g.action('p0', { type: 'gd_guess', word: danWord })).toEqual({ ok: true });
    expect(g.view('p0').phase).toBe('reveal_end');
    expect(g.action('p0', { type: 'gd_ready' })).toEqual({ ok: true });
    expect(getResult()?.winnerIds).toEqual(['p0']);
    g.dispose();
  });

  it('khi 1 Gián Điệp bị bắt dù vẫn còn Mr. White hoặc Gián Điệp khác sống, vẫn cho phép đoán từ Dân Thường (spy_guess)', () => {
    vi.useFakeTimers();
    // Test A: 5 người (3 Dân + 1 Spy p0 + 1 Mr.White p1) -> bắt p0 dù còn p1 sống vẫn vào spy_guess; đoán trật -> sang Vòng 2
    const { ctx: c1, getResult: r1 } = makeCtx(() => 0.9999, { giandiepMrWhite: true, giandiepSpies: 1 }, 2000);
    const g1 = new GianDiepGame(c1);
    g1.start(makePlayers(5));
    vi.advanceTimersByTime(2100);
    for (let i = 0; i < 5; i++) g1.action(g1.view().currentSpeakerId!, { type: 'gd_clue', text: `Gợi ý A${i}` });
    for (const id of ['p0', 'p1', 'p2']) g1.action(id, { type: 'gd_ready' });
    for (const id of ['p0', 'p1', 'p2']) g1.action(id, { type: 'gd_ready' });
    for (const id of ['p1', 'p2', 'p3', 'p4']) g1.action(id, { type: 'gd_vote', target: 'p0' });
    g1.action('p0', { type: 'gd_vote', target: 'p2' });
    g1.action('p0', { type: 'gd_ready' });
    for (const id of ['p1', 'p2', 'p3', 'p4']) g1.action(id, { type: 'gd_verdict', verdict: 'banish' });

    expect(g1.view('p0').phase).toBe('spy_guess');
    expect(g1.view('p1').mrWhiteId).toBe('p0');
    expect(g1.action('p0', { type: 'gd_guess', word: 'từ đoán sai hoàn toàn' })).toEqual({ ok: true });
    expect(g1.view('p1').round).toBe(2);
    expect(g1.view('p1').alive).toContain('p1');
    expect(r1()).toBeNull();
    g1.dispose();

    // Test B: 6 người (4 Dân + 2 Spy p0, p1) -> bắt p0 -> p0 vào spy_guess đoán đúng từ Dân -> phe Gián Điệp thắng
    const { ctx: c2, getResult: r2 } = makeCtx(() => 0.9999, { giandiepMrWhite: false, giandiepSpies: 2 }, 2000);
    const g2 = new GianDiepGame(c2);
    g2.start(makePlayers(6));
    const danWord = g2.view('p2').myWord!;
    vi.advanceTimersByTime(2100);
    for (let i = 0; i < 6; i++) g2.action(g2.view().currentSpeakerId!, { type: 'gd_clue', text: `Gợi ý B${i}` });
    for (const id of ['p0', 'p1', 'p2']) g2.action(id, { type: 'gd_ready' });
    for (const id of ['p0', 'p1', 'p2']) g2.action(id, { type: 'gd_ready' });
    for (const id of ['p1', 'p2', 'p3', 'p4', 'p5']) g2.action(id, { type: 'gd_vote', target: 'p0' });
    g2.action('p0', { type: 'gd_vote', target: 'p2' });
    g2.action('p0', { type: 'gd_ready' });
    for (const id of ['p1', 'p2', 'p3', 'p4', 'p5']) g2.action(id, { type: 'gd_verdict', verdict: 'banish' });

    expect(g2.view('p0').phase).toBe('spy_guess');
    expect(g2.action('p0', { type: 'gd_guess', word: danWord })).toEqual({ ok: true });
    expect(g2.view('p2').phase).toBe('reveal_end');
    expect(g2.action('p2', { type: 'gd_ready' })).toEqual({ ok: true });
    expect(r2()?.winnerIds).toEqual(['p0', 'p1']);
    g2.dispose();
  });
});

describe('Phase 40 — Vẽ & Đoán: Flood-Fill 2D, Hình học & Điểm công bằng Họa sĩ / Người đoán', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('đủ 6 công cụ & computeFloodFillPath tô kín đúng miền khép kín mà không tràn ra ngoài', () => {
    expect(VE_DOAN_TOOLS).toEqual(['pen', 'fill', 'eraser', 'line', 'rect', 'circle']);

    const sq = buildVeDoanShapePoints('rect', [300, 300], [700, 700]);
    expect(sq).toHaveLength(5);
    const circ = buildVeDoanShapePoints('circle', [200, 200], [800, 800]);
    expect(circ.length).toBeGreaterThanOrEqual(24);

    // Click đổ màu vào tâm hình vuông [300..700, 300..700]
    const fillInside = computeFloodFillPath([{ tool: 'rect', color: '#111827', width: 9, points: sq }], 500, 500);
    expect(fillInside.startsWith('M')).toBe(true);
    expect(fillInside).not.toBe('M0 0H1000V1000H0Z');

    // Click trên nền trống hoàn toàn -> fill trọn 0..1000
    const fillBlank = computeFloodFillPath([], 500, 500);
    expect(fillBlank).toBe('M0 0H1000V1000H0Z');
  });

  it('tính điểm công bằng: Họa sĩ vẽ rõ để đoán sớm nhận thưởng tốc độ + thưởng cả phòng hiểu (120+đ)', () => {
    vi.useFakeTimers();
    const { ctx } = makeCtx(() => 0.1, { veDoanRounds: 1 }, 5000);
    const g = new VeDoanGame(ctx);
    g.start(makePlayers(3));

    const word = g.view('p0').wordOptions![0];
    expect(g.action('p0', { type: 'vd_pick', word }).ok).toBe(true);

    // Họa sĩ vẽ hình chữ nhật + đổ màu + dùng tẩy
    expect(g.action('p0', { type: 'vd_stroke', stroke: { tool: 'rect', color: '#111827', width: 9, points: buildVeDoanShapePoints('rect', [250, 250], [750, 750]) } }).ok).toBe(true);
    expect(g.action('p0', { type: 'vd_stroke', stroke: { tool: 'fill', color: '#E03131', width: 9, points: [[500, 500]] } }).ok).toBe(true);
    expect(g.action('p0', { type: 'vd_stroke', stroke: { tool: 'eraser', color: '#FFFFFF', width: 22, points: [[450, 450], [550, 550]] } }).ok).toBe(true);

    const viewAfterFill = g.view('p1');
    expect(viewAfterFill.strokes).toHaveLength(3);
    expect(viewAfterFill.strokes[1].fillPath).toBeTruthy();
    expect(viewAfterFill.strokes[2].color).toBe('#FFFFFF');

    // p1 và p2 đều đoán trúng nhanh
    expect(g.action('p1', { type: 'vd_guess', text: word }).ok).toBe(true);
    expect(g.action('p2', { type: 'vd_guess', text: word }).ok).toBe(true);

    const endView = g.view('p0');
    expect(endView.phase).toBe('round_end');
    // Họa sĩ được thưởng tốc độ + người thứ 2 + sweep bonus => >= 150đ!
    expect(endView.scores.p0).toBeGreaterThanOrEqual(150);
    expect(endView.scores.p1).toBeGreaterThanOrEqual(150);
    g.dispose();
  });
});

describe('Phase 41 — Đầm Lầy Quái Chiêu: Thanh gỗ lơ lửng & Vừa nhảy vừa ném', () => {
  it('đứng và chạy qua lại trên thanh gỗ di động (p2_mover1) và thang máy dọc (p3_elevator) không bị văng ngang hay rớt onGround', () => {
    // Màn 2: đứng trên p2_mover1 (bệ di động ngang giữa vực sâu)
    const w2 = createCroakWorld([
      { id: 'p0', name: 'Ếch 1' },
      { id: 'p1', name: 'Ếch 2' },
    ], 1);
    const mover = CROAK_STAGES[1].platforms.find((p) => p.id === 'p2_mover1')!;
    const r0 = platformRectAt(mover, w2.elapsedSec);
    w2.frogs[0].x = r0.x + 20;
    w2.frogs[0].y = r0.y - CROAK_FROG_H;
    w2.frogs[0].vx = 0;
    w2.frogs[0].vy = 0;
    w2.frogs[0].onGround = true;

    for (let t = 0; t < 45; t++) {
      const dir = t % 20 < 10 ? 1 : -1;
      stepCroakWorld(w2, { p0: { moveX: dir } }, CROAK_DT);
      expect(w2.frogs[0].state).not.toBe('dead');
      expect(w2.frogs[0].onGround).toBe(true);
    }

    // Màn 3: đứng trên p3_elevator (thang máy dọc lên xuống y=610 -> y=400) suốt chu kỳ 4.5s
    const w3 = createCroakWorld([
      { id: 'p0', name: 'Ếch 1' },
      { id: 'p1', name: 'Ếch 2' },
    ], 2);
    const elev = CROAK_STAGES[2].platforms.find((p) => p.id === 'p3_elevator')!;
    const re0 = platformRectAt(elev, w3.elapsedSec);
    w3.frogs[0].x = re0.x + 40;
    w3.frogs[0].y = re0.y - CROAK_FROG_H;
    w3.frogs[0].onGround = true;

    let airborneTicks = 0;
    for (let t = 0; t < 135; t++) {
      stepCroakWorld(w3, { p0: { moveX: 0 } }, CROAK_DT);
      expect(w3.frogs[0].state).not.toBe('dead');
      if (!w3.frogs[0].onGround) airborneTicks++;
    }
    expect(airborneTicks).toBe(0);
  });

  it('thao tác Vừa Nhảy Vừa Ném (`jump` -> `spit`) phóng đồng đội bay cao chuẩn xác khi đang ở trên không', () => {
    const w = createCroakWorld([
      { id: 'p0', name: 'Ếch 1' },
      { id: 'p1', name: 'Ếch 2' },
    ], 0);
    w.frogs[0].x = 200;
    w.frogs[0].y = 580 - CROAK_FROG_H;
    w.frogs[0].onGround = true;
    w.frogs[0].state = 'carrying';
    w.frogs[0].bellyId = 'p1';
    w.frogs[1].state = 'swallowed';
    w.frogs[1].carrierId = 'p0';

    // Bước 1: Bấm nhảy lên không trung
    stepCroakWorld(w, { p0: { moveX: 1, jump: true } }, CROAK_DT);
    expect(w.frogs[0].onGround).toBe(false);
    expect(w.frogs[0].vy).toBeLessThan(-200);

    // Bước 2 (3 tick sau khi đang bay lên trên không): bấm BẮN (`spit: true`)!
    for (let i = 0; i < 3; i++) stepCroakWorld(w, { p0: { moveX: 1 } }, CROAK_DT);
    expect(w.frogs[0].onGround).toBe(false);

    stepCroakWorld(w, { p0: { moveX: 1, spit: true, aimAngle: -Math.PI * 0.3, aimPower: 0.9 } }, CROAK_DT);
    expect(w.frogs[0].bellyId).toBeNull();
    expect(w.frogs[0].state).toBe('normal');
    expect(w.frogs[1].state).toBe('launched');
    // Nhờ xung lực vừa nhảy vừa ném, passenger bay vọt lên mạnh hơn!
    expect(w.frogs[1].vy).toBeLessThan(-600);
  });
});

describe('Phase 43 — Đặt Bom Tử Chiến: 9 vật phẩm mới (`max_range`, `shield`, `treasure`)', () => {
  it('hỗ trợ nhặt đủ max_range (7 ô), shield (giáp bảo vệ miễn nhiễm tia nước), và treasure (+25đ)', () => {
    const { ctx } = makeCtx(() => 0.4, { boomMode: 'ffa', boomRounds: 1 }, 500);
    const g = new BoomOnlineGame(ctx);
    g.start(makePlayers(2));
    g.stepManual(12);

    const internal = g as unknown as {
      players: BoomPlayerEntity[];
      scores: Record<string, number>;
      applyItemPickup: (p: BoomPlayerEntity, kind: BoomItemKind) => void;
    };

    const p0 = internal.players.find((p) => p.id === 'p0')!;
    const scoreBefore = internal.scores.p0 ?? 0;

    internal.applyItemPickup(p0, 'max_range');
    expect(p0.range).toBe(BOOM_MAX_RANGE_LVL);

    internal.applyItemPickup(p0, 'shield');
    expect(p0.shieldTicks).toBeGreaterThanOrEqual(140);

    internal.applyItemPickup(p0, 'treasure');
    expect(internal.scores.p0).toBe(scoreBefore + 25);
    g.dispose();
  });
});
