import { afterEach, describe, expect, it, vi } from 'vitest';
import { GIAN_DIEP_WORDS, type GianDiepView } from '../../shared/src/giandiep';
import type { GameResult } from '../../shared/src/types';
import { Dictionary } from '../src/dictionary';
import type { EngineContext } from '../src/games/engine';
import { GianDiepGame } from '../src/games/giandiep';
import { Room } from '../src/room';
import { SMALL_WORDS } from './helpers';

function makePlayers(n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `Người ${i}` }));
}

function makeCtx(rng: () => number, opts: { turnMs?: number; giandiepMrWhite?: boolean; giandiepSpies?: 1 | 2 | 3 } = {}) {
  let result: GameResult | null = null;
  const ctx: EngineContext = {
    rng,
    dict: new Dictionary(SMALL_WORDS),
    settings: {
      giandiepMrWhite: opts.giandiepMrWhite,
      giandiepSpies: opts.giandiepSpies,
    },
    turnMs: opts.turnMs ?? 1500,
    hostId: () => 'p0',
    isConnected: () => true,
    isBot: () => false,
    changed: () => {},
    finish: (r) => { result = r; },
    learnWord: () => {},
  };
  return { ctx, getResult: () => result };
}

describe('Ai Là Gián Điệp (Undercover / Mr. White)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('có ít nhất 150 cặp từ tiếng Việt phân loại rõ ràng', () => {
    expect(GIAN_DIEP_WORDS.length).toBeGreaterThanOrEqual(150);
    for (const pair of GIAN_DIEP_WORDS) {
      expect(pair.wordA).not.toBe(pair.wordB);
      expect(pair.cluesA.length).toBeGreaterThanOrEqual(2);
      expect(pair.cluesB.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('cô lập từ khóa theo viewerId, Mr. White không đi đầu vòng 1, chặn word_leaked & xử lý Mr. White lật kèo', () => {
    vi.useFakeTimers();
    // Với rng = 0.9999 & 6 người + 1 Mr.White + 1 Spy -> cuối mảng deck trước shuffle giữ nguyên:
    // p0 = giandiep, p1 = mrwhite, p2..p5 = dan
    const { ctx, getResult } = makeCtx(() => 0.9999, { turnMs: 2000, giandiepMrWhite: true, giandiepSpies: 1 });
    const game = new GianDiepGame(ctx);
    game.start(makePlayers(6));

    // Cách ly view
    const vDan = game.view('p2');
    const vSpy = game.view('p0');
    const vWhite = game.view('p1');
    expect(vDan.myRole).toBe('dan');
    expect(vSpy.myRole).toBe('giandiep');
    expect(vWhite.myRole).toBe('mrwhite');
    expect(vDan.myWord).toBeTruthy();
    expect(vSpy.myWord).toBeTruthy();
    expect(vDan.myWord).not.toBe(vSpy.myWord);
    expect(vWhite.myWord).toBeNull();

    // Hết thời gian xem từ -> clue_turn vòng 1
    vi.advanceTimersByTime(2100);
    const vClue = game.view('p2');
    expect(vClue.phase).toBe('clue_turn');
    expect(vClue.speakerOrder[0]).not.toBe('p1'); // Mr. White không đi đầu vòng 1

    // Không cho người khác phát biểu khi chưa tới lượt
    const cur = vClue.currentSpeakerId!;
    const other = vClue.alive.find((id) => id !== cur && id !== 'p1')!;
    expect(game.action(other, { type: 'gd_clue', text: 'nói chen' })).toEqual({ ok: false, reason: 'not_your_turn' });

    // Thử nhắc thẳng từ khóa của chính mình -> bị chặn 'word_leaked'!
    const curWord = game.view(cur).myWord;
    if (curWord) {
      expect(game.action(cur, { type: 'gd_clue', text: `Tôi chắc chắn là ${curWord.toLowerCase()}` })).toEqual({
        ok: false,
        reason: 'word_leaked',
      });
    }

    // Toàn bộ người chơi đưa gợi ý hợp lệ theo đúng lượt
    for (let step = 0; step < 6; step++) {
      const sId = game.view('p0').currentSpeakerId!;
      expect(game.action(sId, { type: 'gd_clue', text: `Gợi ý số ${step + 1}` })).toEqual({ ok: true });
    }
    expect(game.view('p0').phase).toBe('discussion');

    // Nhanh vào vote
    for (const id of ['p0', 'p1', 'p2']) game.action(id, { type: 'gd_ready' });
    expect(game.view('p0').phase).toBe('vote');

    // Hòa phiếu -> qua vòng 2 không ai bị loại
    game.action('p0', { type: 'gd_vote', target: 'p1' });
    game.action('p1', { type: 'gd_vote', target: 'p0' });
    game.action('p2', { type: 'gd_vote', target: 'p1' });
    game.action('p3', { type: 'gd_vote', target: 'p0' });
    game.action('p4', { type: 'gd_vote', target: 'skip' });
    game.action('p5', { type: 'gd_vote', target: 'skip' });
    expect(game.view('p0').round).toBe(2);
    expect(game.view('p0').alive).toHaveLength(6);

    // Chạy nhanh qua vòng 2 tới vote -> cả phòng loại p1 (Mr. White)
    for (let step = 0; step < 6; step++) {
      const sId = game.view('p0').currentSpeakerId!;
      game.action(sId, { type: 'gd_clue', text: `Vòng 2 số ${step}` });
    }
    for (const id of ['p0', 'p1', 'p2']) game.action(id, { type: 'gd_ready' });
    for (const id of ['p0', 'p2', 'p3', 'p4', 'p5']) game.action(id, { type: 'gd_vote', target: 'p1' });
    game.action('p1', { type: 'gd_vote', target: 'p0' });

    expect(game.view('p1').phase).toBe('mrwhite_guess');
    expect(game.view('p1').mrWhiteId).toBe('p1');

    // Mr. White đoán đúng từ của Dân Thường -> thắng độc lập!
    expect(game.action('p1', { type: 'gd_guess', word: vDan.myWord! })).toEqual({ ok: true });
    const res = getResult();
    expect(res?.winnerIds).toEqual(['p1']);
    expect(res?.headline).toContain('Mr. White');
  });

  it('Dân Thường thắng khi loại sạch Gián Điệp, Gián Điệp thắng khi đạt cân bằng quân số', () => {
    vi.useFakeTimers();
    const { ctx: c1, getResult: r1 } = makeCtx(() => 0.9999, { turnMs: 2000, giandiepMrWhite: false, giandiepSpies: 1 });
    const g1 = new GianDiepGame(c1);
    g1.start(makePlayers(4));
    // rng=0.9999 -> p0 = giandiep, p1..p3 = dan
    g1.removePlayer('p0');
    expect(r1()?.winnerIds).toEqual(['p1', 'p2', 'p3']);

    const { ctx: c2, getResult: r2 } = makeCtx(() => 0.9999, { turnMs: 2000, giandiepMrWhite: false, giandiepSpies: 1 });
    const g2 = new GianDiepGame(c2);
    g2.start(makePlayers(4));
    // Loại 2 dân (p1, p2) -> còn p0 (giandiep) & p3 (dan): 1 <= 1 -> Gián Điệp thắng!
    g2.removePlayer('p1');
    expect(r2()).toBeNull();
    g2.removePlayer('p2');
    expect(r2()?.winnerIds).toEqual(['p0']);
  });

  it('tích hợp Room + 8 bot tự chơi Ai Là Gián Điệp tới khi kết thúc', async () => {
    const dict = new Dictionary(SMALL_WORDS);
    const room = new Room('SPY8', dict, { turnMs: 220, rng: () => Math.random() });
    const host = room.addPlayer('Chủ Phòng');
    expect(host.ok).toBe(true);
    if (!host.ok) return;
    expect(room.configure(host.playerId, 'giandiep', { giandiepMrWhite: true, giandiepSpies: 1 })).toEqual({ ok: true });
    for (let i = 1; i < 8; i++) expect(room.addBot(host.playerId).ok).toBe(true);
    expect(room.start(host.playerId)).toEqual({ ok: true });
    room.removePlayer(host.playerId);

    const started = Date.now();
    while (room.phase === 'playing' && Date.now() - started < 6000) {
      await new Promise((r) => setTimeout(r, 30));
    }
    expect(room.phase).toBe('finished');
    expect(room.toPublic().result?.winnerIds?.length).toBeGreaterThanOrEqual(1);
    const viewCheck = room.toPublic().game as GianDiepView | null;
    expect(viewCheck === null || viewCheck.type === 'giandiep').toBe(true);
    room.dispose();
  }, 10000);
});
