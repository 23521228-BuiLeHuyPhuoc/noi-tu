import { afterEach, describe, expect, it, vi } from 'vitest';
import { BOM_TU_FALLBACK_WORDS, type BomTuView } from '../../shared/src/bomtu';
import { DO_VUI_QUESTIONS, type DoVuiView } from '../../shared/src/dovui';
import { VE_DOAN_WORDS, type VeDoanView } from '../../shared/src/vedoan';
import type { GameResult } from '../../shared/src/types';
import { Dictionary } from '../src/dictionary';
import { BomTuGame } from '../src/games/bomtu';
import { DoVuiGame } from '../src/games/dovui';
import type { EngineContext } from '../src/games/engine';
import { VeDoanGame } from '../src/games/vedoan';
import { Room } from '../src/room';
import { SMALL_WORDS } from './helpers';

function makePlayers(n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `Người ${i}` }));
}

function makeCtx(rng: () => number, settings: EngineContext['settings'] = {}, turnMs = 1500) {
  let result: GameResult | null = null;
  const ctx: EngineContext = {
    rng,
    dict: new Dictionary([...SMALL_WORDS, ...BOM_TU_FALLBACK_WORDS]),
    settings,
    turnMs,
    hostId: () => 'p0',
    isConnected: () => true,
    isBot: () => false,
    changed: () => {},
    finish: (r) => { result = r; },
    learnWord: () => {},
  };
  return { ctx, getResult: () => result };
}

describe('Party Games Pack (Vẽ & Đoán, Bom Chữ, Đố Vui)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Game 7 — Vẽ & Đoán (ve_doan)', () => {
    it('có >= 180 từ khóa, ẩn secretWord khỏi người đoán, cho vẽ SVG & cộng điểm khi đoán trúng', () => {
      vi.useFakeTimers();
      expect(VE_DOAN_WORDS.length).toBeGreaterThanOrEqual(180);
      const { ctx, getResult } = makeCtx(() => 0.1, { veDoanRounds: 1 }, 5000);
      const game = new VeDoanGame(ctx);
      game.start(makePlayers(2));

      // Họa sĩ p0 thấy wordOptions, người đoán p1 KHÔNG thấy
      const v0 = game.view('p0');
      const v1 = game.view('p1');
      expect(v0.phase).toBe('pick_word');
      expect(v0.wordOptions).toHaveLength(3);
      expect(v1.wordOptions).toBeUndefined();
      expect(v1.secretWord).toBeNull();

      const chosen = v0.wordOptions![0];
      expect(game.action('p1', { type: 'vd_pick', word: chosen })).toEqual({ ok: false, reason: 'not_your_turn' });
      expect(game.action('p0', { type: 'vd_pick', word: chosen })).toEqual({ ok: true });

      expect(game.view('p0').phase).toBe('drawing');
      expect(game.view('p0').secretWord).toBe(chosen);
      expect(game.view('p1').secretWord).toBeNull();

      // Vẽ nét, hoàn tác, vẽ lại
      expect(game.action('p0', { type: 'vd_stroke', stroke: { color: '#E03131', width: 9, points: [[100, 100], [500, 500]] } })).toEqual({ ok: true });
      expect(game.view('p1').strokes).toHaveLength(1);
      expect(game.action('p0', { type: 'vd_undo' })).toEqual({ ok: true });
      expect(game.view('p1').strokes).toHaveLength(0);
      expect(game.action('p0', { type: 'vd_stroke', stroke: { color: '#1971C2', width: 4, points: [[10, 20], [30, 40]] } })).toEqual({ ok: true });

      // Đoán sai trước rồi đoán đúng -> kết thúc lượt sớm & chuyển lượt p1
      expect(game.action('p1', { type: 'vd_guess', text: 'sai bét' })).toEqual({ ok: true });
      expect(game.action('p1', { type: 'vd_guess', text: chosen })).toEqual({ ok: true });
      expect(game.view('p0').phase).toBe('round_end');
      expect(game.view('p1').scores.p1).toBeGreaterThanOrEqual(100);
      expect(game.view('p0').scores.p0).toBe(45);

      // Qua lượt 2 (p1 vẽ) -> hết giờ kết thúc toàn ván
      vi.advanceTimersByTime(5100);
      expect(game.view('p1').drawerId).toBe('p1');
      vi.advanceTimersByTime(5100);
      vi.advanceTimersByTime(5100);
      vi.advanceTimersByTime(5100);
      expect(getResult()).not.toBeNull();
    });

    it('tích hợp Room + 4 bot chơi Vẽ & Đoán tới khi kết thúc', async () => {
      const dict = new Dictionary(SMALL_WORDS);
      const room = new Room('DRAW4', dict, { turnMs: 200, rng: () => Math.random() });
      const host = room.addPlayer('Chủ');
      if (!host.ok) throw new Error('host');
      expect(room.configure(host.playerId, 've_doan', { veDoanRounds: 1 })).toEqual({ ok: true });
      for (let i = 1; i < 4; i++) room.addBot(host.playerId);
      expect(room.start(host.playerId)).toEqual({ ok: true });
      room.removePlayer(host.playerId);

      const t0 = Date.now();
      while (room.phase === 'playing' && Date.now() - t0 < 6000) {
        await new Promise((r) => setTimeout(r, 25));
      }
      expect(room.phase).toBe('finished');
      const v = room.toPublic().game as VeDoanView | null;
      expect(v === null || v.type === 've_doan').toBe(true);
      room.dispose();
    }, 10000);
  });

  describe('Game 8 — Bom Chữ (bom_tu)', () => {
    it('kiểm tra âm tiết hợp lệ, chặn từ sai/trùng, nổ bom trừ tim & loại người chơi', () => {
      vi.useFakeTimers();
      const { ctx, getResult } = makeCtx(() => 0.25, {}, 1000);
      const game = new BomTuGame(ctx);
      game.start(makePlayers(2));

      const v0 = game.view();
      expect(v0.type).toBe('bom_tu');
      expect(v0.holderId).toBe('p0');
      expect(v0.hearts.p0).toBe(3);

      // Chặn sai người & sai tiếng
      expect(game.action('p1', { type: 'bt_submit', word: 'con mèo' })).toEqual({ ok: false, reason: 'not_your_turn' });
      expect(game.action('p0', { type: 'bt_submit', word: 'một' })).toEqual({ ok: false, reason: 'format' });
      const wordPool = [...SMALL_WORDS, ...BOM_TU_FALLBACK_WORDS];
      const wrongSyl = wordPool.find((w) => w.split(' ').length === 2 && !w.split(' ').includes(v0.bombSyllable))!;
      expect(game.action('p0', { type: 'bt_submit', word: wrongSyl })).toEqual({ ok: false, reason: 'chain' });

      // Tìm từ hợp lệ chứa bombSyllable
      const valid = wordPool.find((w) => w.split(' ').length === 2 && w.split(' ').includes(v0.bombSyllable));
      expect(valid).toBeTruthy();
      expect(game.action('p0', { type: 'bt_submit', word: valid! })).toEqual({ ok: true, word: valid! });
      expect(game.view().holderId).toBe('p1');

      // Chơi hoặc để bom nổ hết tim
      vi.advanceTimersByTime(1100);
      expect(game.view().hearts.p1).toBe(2);
      for (let i = 0; i < 6 && !getResult(); i++) {
        const cur = game.view();
        if (cur.holderId === 'p0') {
          const w = wordPool.find((x) => x.split(' ').length === 2 && x.split(' ').includes(cur.bombSyllable));
          if (w && game.action('p0', { type: 'bt_submit', word: w }).ok) continue;
        }
        vi.advanceTimersByTime(1100);
      }
      const finalV = game.view();
      expect(finalV.hearts.p1 === 0 || finalV.hearts.p0 === 0 || getResult() !== null).toBe(true);
    });

    it('tích hợp Room + 4 bot chơi Bom Chữ hết ván', async () => {
      const dict = new Dictionary([...SMALL_WORDS, ...BOM_TU_FALLBACK_WORDS]);
      const room = new Room('BOMB4', dict, { turnMs: 220, rng: () => Math.random() });
      const host = room.addPlayer('Chủ');
      if (!host.ok) throw new Error('host');
      room.configure(host.playerId, 'bom_tu');
      for (let i = 1; i < 4; i++) room.addBot(host.playerId);
      expect(room.start(host.playerId)).toEqual({ ok: true });
      room.removePlayer(host.playerId);

      const t0 = Date.now();
      while (room.phase === 'playing' && Date.now() - t0 < 8000) {
        await new Promise((r) => setTimeout(r, 25));
      }
      expect(room.phase).toBe('finished');
      const v = room.toPublic().game as BomTuView | null;
      expect(v === null || v.type === 'bom_tu').toBe(true);
      room.dispose();
    }, 12000);
  });

  describe('Game 9 — Đấu Trường Đố Vui (do_vui)', () => {
    it('có >= 200 câu hỏi, ẩn hoàn toàn correctIndex khi đang question & nhân đôi điểm 2 câu cuối', () => {
      vi.useFakeTimers();
      expect(DO_VUI_QUESTIONS.length).toBeGreaterThanOrEqual(200);
      const { ctx, getResult } = makeCtx(() => 0.9999, { doVuiQuestions: 5 }, 2000);
      const game = new DoVuiGame(ctx);
      game.start(makePlayers(2));

      for (let q = 0; q < 5; q++) {
        const vQ = game.view('p0');
        expect(vQ.phase).toBe('question');
        expect(vQ.correctIndex).toBeUndefined();
        expect(vQ.explain).toBeUndefined();
        expect(vQ.doublePoints).toBe(q >= 3);

        // Chờ hết giờ hoặc nộp đáp án: p0 & p1 cùng chọn 0 để chuyển thẳng sang reveal
        expect(game.action('p0', { type: 'dv_answer', choice: 0 })).toEqual({ ok: true });
        expect(game.action('p1', { type: 'dv_answer', choice: 1 })).toEqual({ ok: true });

        const vR = game.view('p0');
        expect(vR.phase).toBe('reveal');
        expect(vR.correctIndex).toBeDefined();
        expect(vR.explain).toBeTruthy();

        vi.advanceTimersByTime(2100);
      }
      const res = getResult();
      expect(res).not.toBeNull();
      expect(res?.ranking).toHaveLength(2);
    });

    it('tích hợp Room + 4 bot chơi Đố Vui tới kết thúc', async () => {
      const dict = new Dictionary(SMALL_WORDS);
      const room = new Room('QUIZ4', dict, { turnMs: 180, rng: () => Math.random() });
      const host = room.addPlayer('Chủ');
      if (!host.ok) throw new Error('host');
      expect(room.configure(host.playerId, 'do_vui', { doVuiQuestions: 5 })).toEqual({ ok: true });
      for (let i = 1; i < 4; i++) room.addBot(host.playerId);
      expect(room.start(host.playerId)).toEqual({ ok: true });
      room.removePlayer(host.playerId);

      const t0 = Date.now();
      while (room.phase === 'playing' && Date.now() - t0 < 6000) {
        await new Promise((r) => setTimeout(r, 25));
      }
      expect(room.phase).toBe('finished');
      const v = room.toPublic().game as DoVuiView | null;
      expect(v === null || v.type === 'do_vui').toBe(true);
      room.dispose();
    }, 10000);
  });
});
