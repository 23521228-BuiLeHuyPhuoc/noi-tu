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

describe('Ai Là Gián Điệp 2.0 (Biện Minh, Phán Quyết, Lật Mở Từ Khóa & Mr. White)', () => {
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

  it('cô lập từ khóa, chặn word_leaked ở cả gợi ý & chat, hỗ trợ Pha Biện Minh + Tha Bổng + Trục Xuất + Lật Từ Khóa', () => {
    vi.useFakeTimers();
    // Với rng = 0.9999 & 6 người + 1 Mr.White + 1 Spy -> p0 = giandiep, p1 = mrwhite, p2..p5 = dan
    const { ctx, getResult } = makeCtx(() => 0.9999, { turnMs: 2000, giandiepMrWhite: true, giandiepSpies: 1 });
    const game = new GianDiepGame(ctx);
    game.start(makePlayers(6));

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

    // Khóa chat ở word_reveal và trong khi khai gợi ý (clue_turn)
    expect(game.action('p2', { type: 'gd_chat', text: 'Nhắn lén lúc nhận từ' })).toEqual({
      ok: false,
      reason: 'not_your_turn',
    });

    vi.advanceTimersByTime(2100);
    const vClue = game.view('p2');
    expect(vClue.phase).toBe('clue_turn');
    expect(vClue.speakerOrder[0]).not.toBe('p1'); // Mr. White không đi đầu vòng 1

    const cur = vClue.currentSpeakerId!;
    const other = vClue.alive.find((id) => id !== cur && id !== 'p1')!;
    expect(game.action(other, { type: 'gd_chat', text: 'Chat chen ngang' })).toEqual({
      ok: false,
      reason: 'not_your_turn',
    });
    expect(game.action(other, { type: 'gd_clue', text: 'nói chen' })).toEqual({ ok: false, reason: 'not_your_turn' });

    const curWord = game.view(cur).myWord;
    if (curWord) {
      expect(game.action(cur, { type: 'gd_clue', text: `Tôi chắc chắn là ${curWord.toLowerCase()}` })).toEqual({
        ok: false,
        reason: 'word_leaked',
      });
    }

    for (let step = 0; step < 6; step++) {
      const sId = game.view('p0').currentSpeakerId!;
      expect(game.action(sId, { type: 'gd_clue', text: `Gợi ý số ${step + 1}` })).toEqual({ ok: true });
    }
    // Sau khi khai xong hết -> hiện màn Tổng hợp lời khai (`clue_summary`)
    expect(game.view('p0').phase).toBe('clue_summary');
    expect(game.view('p0').clues.filter((c) => c.round === 1)).toHaveLength(6);
    expect(game.action('p2', { type: 'gd_chat', text: 'Chưa mở chat đâu' })).toEqual({ ok: false, reason: 'not_your_turn' });

    for (const id of ['p0', 'p1', 'p2']) game.action(id, { type: 'gd_ready' });
    expect(game.view('p0').phase).toBe('discussion');

    // Chat thảo luận hợp nhất + chặn lộ từ khóa trong chat
    expect(game.action('p2', { type: 'gd_chat', text: 'Ai nói câu cuối hơi lạ nha!' })).toEqual({ ok: true });
    expect(game.action('p2', { type: 'gd_chat', text: `Từ của mình là ${vDan.myWord}` })).toEqual({
      ok: false,
      reason: 'word_leaked',
    });

    for (const id of ['p0', 'p1', 'p2']) game.action(id, { type: 'gd_ready' });
    expect(game.view('p0').phase).toBe('vote');

    // Bầu chọn p2 lên vành móng ngựa -> vào Pha Biện Minh -> cả phòng Tha Bổng!
    for (const id of ['p0', 'p1', 'p3', 'p4']) game.action(id, { type: 'gd_vote', target: 'p2' });
    game.action('p2', { type: 'gd_vote', target: 'p0' });
    game.action('p5', { type: 'gd_vote', target: 'skip' });

    expect(game.view('p2').phase).toBe('defense');
    expect(game.view('p2').defendants).toEqual(['p2']);
    expect(game.action('p2', { type: 'gd_defense', text: 'Oan quá, câu của mình chuẩn Dân Thường mà!' })).toEqual({ ok: true });
    expect(game.action('p2', { type: 'gd_ready' })).toEqual({ ok: true });

    expect(game.view('p0').phase).toBe('final_vote');
    for (const id of ['p0', 'p1', 'p3', 'p4', 'p5']) {
      expect(game.action(id, { type: 'gd_verdict', verdict: 'forgive' })).toEqual({ ok: true });
    }
    // Được tha bổng -> sang Vòng 2 vẫn còn đủ 6 người!
    expect(game.view('p0').round).toBe(2);
    expect(game.view('p0').alive).toHaveLength(6);

    // Chạy vòng 2 -> clue_summary -> discussion -> vote -> đưa p1 (Mr. White) lên Biện Minh -> Trục Xuất!
    for (let step = 0; step < 6; step++) {
      const sId = game.view('p0').currentSpeakerId!;
      game.action(sId, { type: 'gd_clue', text: `Vòng 2 số ${step}` });
    }
    expect(game.view('p0').phase).toBe('clue_summary');
    for (const id of ['p0', 'p1', 'p2']) game.action(id, { type: 'gd_ready' });
    expect(game.view('p0').phase).toBe('discussion');
    for (const id of ['p0', 'p1', 'p2']) game.action(id, { type: 'gd_ready' });
    expect(game.view('p0').phase).toBe('vote');
    for (const id of ['p0', 'p2', 'p3', 'p4', 'p5']) game.action(id, { type: 'gd_vote', target: 'p1' });
    game.action('p1', { type: 'gd_vote', target: 'p0' });

    expect(game.view('p1').phase).toBe('defense');
    game.action('p1', { type: 'gd_ready' });
    expect(game.view('p1').phase).toBe('final_vote');
    for (const id of ['p0', 'p2', 'p3', 'p4', 'p5']) {
      game.action(id, { type: 'gd_verdict', verdict: 'banish' });
    }

    expect(game.view('p1').phase).toBe('mrwhite_guess');
    expect(game.view('p1').mrWhiteId).toBe('p1');

    // Mr. White đoán đúng từ của Dân Thường -> vào màn Lật Mở Từ Khóa Cuối Ván (reveal_end)!
    expect(game.action('p1', { type: 'gd_guess', word: vDan.myWord! })).toEqual({ ok: true });
    const vRev = game.view('p2');
    expect(vRev.phase).toBe('reveal_end');
    expect(vRev.revealedAll).toHaveLength(6);
    expect(vRev.wordPairReveal?.wordA).toBe(vDan.myWord);
    expect(vRev.wordPairReveal?.wordB).toBe(vSpy.myWord);

    // Bấm sang bảng kết quả (hoặc chờ hết giờ)
    expect(game.action('p2', { type: 'gd_ready' })).toEqual({ ok: true });
    const res = getResult();
    expect(res?.winnerIds).toEqual(['p1']);
    expect(res?.headline).toContain('Mr. White');
  });

  it('Dân Thường thắng khi loại sạch Gián Điệp, Gián Điệp thắng khi đạt cân bằng quân số', () => {
    vi.useFakeTimers();
    const { ctx: c1, getResult: r1 } = makeCtx(() => 0.9999, { turnMs: 2000, giandiepMrWhite: false, giandiepSpies: 1 });
    const g1 = new GianDiepGame(c1);
    g1.start(makePlayers(4));
    g1.removePlayer('p0');
    expect(g1.view('p1').phase).toBe('reveal_end');
    vi.advanceTimersByTime(2100);
    expect(r1()?.winnerIds).toEqual(['p1', 'p2', 'p3']);

    const { ctx: c2, getResult: r2 } = makeCtx(() => 0.9999, { turnMs: 2000, giandiepMrWhite: false, giandiepSpies: 1 });
    const g2 = new GianDiepGame(c2);
    g2.start(makePlayers(4));
    g2.removePlayer('p1');
    expect(r2()).toBeNull();
    g2.removePlayer('p2');
    expect(g2.view('p0').phase).toBe('reveal_end');
    vi.advanceTimersByTime(2100);
    expect(r2()?.winnerIds).toEqual(['p0']);
  });

  it('tích hợp Room + 8 bot tự chơi Ai Là Gián Điệp tới khi kết thúc', async () => {
    const dict = new Dictionary(SMALL_WORDS);
    const room = new Room('SPY8', dict, { turnMs: 120, rng: () => Math.random() });
    const host = room.addPlayer('Chủ Phòng');
    expect(host.ok).toBe(true);
    if (!host.ok) return;
    expect(room.configure(host.playerId, 'giandiep', { giandiepMrWhite: true, giandiepSpies: 1 })).toEqual({ ok: true });
    for (let i = 1; i < 8; i++) expect(room.addBot(host.playerId).ok).toBe(true);
    expect(room.start(host.playerId)).toEqual({ ok: true });
    room.removePlayer(host.playerId);

    const started = Date.now();
    while (room.phase === 'playing' && Date.now() - started < 11000) {
      await new Promise((r) => setTimeout(r, 25));
    }
    expect(room.phase).toBe('finished');
    expect(room.toPublic().result?.winnerIds?.length).toBeGreaterThanOrEqual(1);
    const viewCheck = room.toPublic().game as GianDiepView | null;
    expect(viewCheck === null || viewCheck.type === 'giandiep').toBe(true);
    room.dispose();
  }, 15000);
});
