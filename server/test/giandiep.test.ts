import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  countWordChars,
  GIAN_DIEP_WORDS,
  matchGianDiepGuess,
  type GianDiepView,
} from '../../shared/src/giandiep';
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

    for (const id of game.view('p0').alive) game.action(id, { type: 'gd_ready' });
    expect(game.view('p0').phase).toBe('vote');

    // Bầu chọn p2 lên vành móng ngựa -> còn người chơi thật nên giữ nguyên pha 'vote' tới hết giờ (cho phép đổi phiếu)
    for (const id of ['p0', 'p1', 'p3', 'p4']) game.action(id, { type: 'gd_vote', target: 'p2' });
    game.action('p2', { type: 'gd_vote', target: 'p0' });
    game.action('p5', { type: 'gd_vote', target: 'skip' });
    expect(game.view('p2').phase).toBe('vote');
    vi.advanceTimersByTime(2100);

    expect(game.view('p2').phase).toBe('defense');
    expect(game.view('p2').defendants).toEqual(['p2']);
    expect(game.action('p2', { type: 'gd_defense', text: 'Oan quá, câu của mình chuẩn Dân Thường mà!' })).toEqual({ ok: true });
    expect(game.action('p2', { type: 'gd_ready' })).toEqual({ ok: true });

    expect(game.view('p0').phase).toBe('final_vote');
    for (const id of ['p0', 'p1', 'p3', 'p4', 'p5']) {
      expect(game.action(id, { type: 'gd_verdict', verdict: 'forgive' })).toEqual({ ok: true });
    }
    expect(game.view('p0').phase).toBe('final_vote');
    vi.advanceTimersByTime(2100);
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
    for (const id of game.view('p0').alive) game.action(id, { type: 'gd_ready' });
    expect(game.view('p0').phase).toBe('vote');
    for (const id of ['p0', 'p2', 'p3', 'p4', 'p5']) game.action(id, { type: 'gd_vote', target: 'p1' });
    game.action('p1', { type: 'gd_vote', target: 'p0' });
    expect(game.view('p1').phase).toBe('vote');
    vi.advanceTimersByTime(2100);

    expect(game.view('p1').phase).toBe('defense');
    game.action('p1', { type: 'gd_ready' });
    expect(game.view('p1').phase).toBe('final_vote');
    for (const id of ['p0', 'p2', 'p3', 'p4', 'p5']) {
      game.action(id, { type: 'gd_verdict', verdict: 'banish' });
    }
    expect(game.view('p1').phase).toBe('final_vote');
    vi.advanceTimersByTime(2100);

    expect(game.view('p1').phase).toBe('mrwhite_guess');
    expect(game.view('p1').mrWhiteId).toBe('p1');

    // Mr. White đoán đúng từ của Dân Thường -> vào màn Lật Mở Từ Khóa Cuối Ván (reveal_end)!
    expect(game.view('p2').winnerIds ?? null).toBeNull();
    expect(game.action('p1', { type: 'gd_guess', word: vDan.myWord! })).toEqual({ ok: true });
    const vRev = game.view('p2');
    expect(vRev.phase).toBe('reveal_end');
    expect(vRev.winnerIds).toEqual(['p1']);
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

  it('matchGianDiepGuess khớp từ khóa cốt lõi và chặn tiền tố loại từ / từ phe đối phương trên toàn bộ 160 cặp từ', () => {
    // 1. Toàn bộ 160 cặp từ: khớp đúng chính nó, KHÔNG khớp nhầm sang từ còn lại, KHÔNG khớp từ loại bare
    const bareClassifiers = ['con', 'chim', 'quả', 'bánh', 'nước', 'máy', 'xe', 'đàn', 'mạng'];
    for (const pair of GIAN_DIEP_WORDS) {
      expect(matchGianDiepGuess(pair.wordA, pair.wordA, pair.wordB)).toBe(true);
      expect(matchGianDiepGuess(pair.wordB, pair.wordB, pair.wordA)).toBe(true);
      expect(matchGianDiepGuess(pair.wordB, pair.wordA, pair.wordB)).toBe(false);
      expect(matchGianDiepGuess(pair.wordA, pair.wordB, pair.wordA)).toBe(false);
      for (const bare of bareClassifiers) {
        expect(matchGianDiepGuess(bare, pair.wordA, pair.wordB)).toBe(false);
        expect(matchGianDiepGuess(bare, pair.wordB, pair.wordA)).toBe(false);
      }
    }

    // 2. Các trường hợp từ khóa nhạy thực tế
    expect(matchGianDiepGuess('sư tử', 'Con sư tử', 'Con hổ')).toBe(true);
    expect(matchGianDiepGuess('su tu', 'Con sư tử', 'Con hổ')).toBe(true);
    expect(matchGianDiepGuess('con', 'Con sư tử', 'Con hổ')).toBe(false);
    expect(matchGianDiepGuess('con sư tử châu phi', 'Con sư tử', 'Con hổ')).toBe(true);
    expect(matchGianDiepGuess('con sư tử và con hổ', 'Con sư tử', 'Con hổ')).toBe(false);

    expect(matchGianDiepGuess('đại bàng', 'Chim đại bàng', 'Chim cú mèo')).toBe(true);
    expect(matchGianDiepGuess('chim', 'Chim đại bàng', 'Chim cú mèo')).toBe(false);

    expect(matchGianDiepGuess('gấu trúc', 'Con gấu trúc', 'Gấu Bắc Cực')).toBe(true);
    expect(matchGianDiepGuess('gấu', 'Con gấu trúc', 'Gấu Bắc Cực')).toBe(false);

    expect(matchGianDiepGuess('điện thoại', 'Điện thoại thông minh', 'Máy tính bảng')).toBe(true);
    expect(matchGianDiepGuess('thông minh', 'Điện thoại thông minh', 'Máy tính bảng')).toBe(false);

    expect(matchGianDiepGuess('wifi', 'Mạng Wi-Fi', 'Mạng 4G/5G')).toBe(true);
    expect(matchGianDiepGuess('wi fi', 'Mạng Wi-Fi', 'Mạng 4G/5G')).toBe(true);
    expect(matchGianDiepGuess('4g', 'Mạng 4G/5G', 'Mạng Wi-Fi')).toBe(true);
    expect(matchGianDiepGuess('5g', 'Mạng 4G/5G', 'Mạng Wi-Fi')).toBe(true);

    expect(matchGianDiepGuess('nón bảo hiểm', 'Mũ bảo hiểm', 'Mũ lưỡi trai')).toBe(true);
    expect(matchGianDiepGuess('bít tết', 'Bò bít tết', 'Bò né')).toBe(true);
    expect(matchGianDiepGuess('bò', 'Bò bít tết', 'Bò né')).toBe(false);
    expect(matchGianDiepGuess('ô', 'Ô che mưa', 'Áo mưa')).toBe(true);
    expect(matchGianDiepGuess('cây dù', 'Ô che mưa', 'Áo mưa')).toBe(true);
    expect(matchGianDiepGuess('tivi', 'Tivi thông minh', 'Máy chiếu')).toBe(true);
    expect(matchGianDiepGuess('tv', 'Tivi thông minh', 'Máy chiếu')).toBe(true);
  });

  it('xác nhận để skip ở vote & final_vote (đổi phiếu reset xác nhận) + ai cũng skip được defense + elimination card & targetCharCount', () => {
    vi.useFakeTimers();
    // 4 người: 1 human (p0) + 3 bots? Không, test cả multi-human trước rồi bot sau
    const bots = new Set(['p1', 'p2', 'p3']);
    const { ctx } = makeCtx(() => 0.9999, { turnMs: 5000, giandiepMrWhite: false, giandiepSpies: 1 });
    // Test 1: 4 người chơi thật cho vote confirm, defense skip, final_vote confirm, elimination + targetCharCount
    const g = new GianDiepGame(ctx);
    g.start(makePlayers(4));
    // Với rng=0.9999 & 4 người, giandiepSpies=1 -> p0 = giandiep, p1..p3 = dan
    expect(g.view('p0').myRole).toBe('giandiep');
    const danWord = g.view('p1').myWord!;
    expect(g.view('p0').targetCharCount).toBeNull();

    // Vào clue_turn -> summary -> discussion -> vote
    vi.advanceTimersByTime(5200);
    for (let i = 0; i < 4; i++) g.action(g.view().currentSpeakerId!, { type: 'gd_clue', text: `Gợi ý ${i}` });
    for (const id of ['p0', 'p1', 'p2']) g.action(id, { type: 'gd_ready' });
    expect(g.view('p0').phase).toBe('discussion');
    expect(g.view('p0').phaseSeconds).toBeLessThanOrEqual(60);
    for (const id of ['p0', 'p1', 'p2', 'p3']) g.action(id, { type: 'gd_ready' });
    expect(g.view('p0').phase).toBe('vote');

    // Chưa vote đủ -> gd_ready bị từ chối
    expect(g.action('p0', { type: 'gd_ready' })).toEqual({ ok: false, reason: 'not_your_turn' });
    g.action('p0', { type: 'gd_vote', target: 'p1' });
    g.action('p1', { type: 'gd_vote', target: 'p0' });
    g.action('p2', { type: 'gd_vote', target: 'p0' });
    expect(g.action('p0', { type: 'gd_ready' })).toEqual({ ok: false, reason: 'not_your_turn' });

    // Người cuối vote xong -> mở khóa nút xác nhận
    g.action('p3', { type: 'gd_vote', target: 'p1' });
    expect(g.action('p1', { type: 'gd_ready' })).toEqual({ ok: true });
    expect(g.action('p2', { type: 'gd_ready' })).toEqual({ ok: true });
    expect(g.view('p0').readySkip).toEqual(['p1', 'p2']);

    // Ai đó đổi phiếu -> tự động xóa danh sách xác nhận để mọi người xem lại
    g.action('p3', { type: 'gd_vote', target: 'p0' });
    expect(g.view('p0').readySkip).toEqual([]);

    // Đủ 4 người xác nhận -> nhảy thẳng sang defense
    for (const id of ['p0', 'p1', 'p2', 'p3']) expect(g.action(id, { type: 'gd_ready' })).toEqual({ ok: true });
    expect(g.view('p0').phase).toBe('defense');
    expect(g.view('p0').defendants).toEqual(['p0']);

    // Non-defendants (p1, p2, p3) cùng nhấn skip ở defense cũng cho phép nhảy thẳng sang final_vote
    expect(g.action('p1', { type: 'gd_ready' })).toEqual({ ok: true });
    expect(g.action('p2', { type: 'gd_ready' })).toEqual({ ok: true });
    expect(g.action('p3', { type: 'gd_ready' })).toEqual({ ok: true });
    // Chưa đủ 4/4 (thiếu bị cáo p0) -> chưa chuyển; đủ 4/4 -> chuyển ngay
    expect(g.view('p0').phase).toBe('defense');
    expect(g.action('p0', { type: 'gd_ready' })).toEqual({ ok: true });
    expect(g.view('p0').phase).toBe('final_vote');

    // Ở final_vote (1 bị cáo p0, >2 người còn sống -> cử tri là p1, p2, p3)
    expect(g.action('p1', { type: 'gd_ready' })).toEqual({ ok: false, reason: 'not_your_turn' });
    g.action('p1', { type: 'gd_verdict', verdict: 'banish' });
    g.action('p2', { type: 'gd_verdict', verdict: 'banish' });
    g.action('p3', { type: 'gd_verdict', verdict: 'forgive' });

    // 2 người xác nhận, người thứ 3 đổi ý -> xóa readySkip
    expect(g.action('p1', { type: 'gd_ready' })).toEqual({ ok: true });
    expect(g.action('p2', { type: 'gd_ready' })).toEqual({ ok: true });
    g.action('p3', { type: 'gd_verdict', verdict: 'banish' });
    expect(g.view('p0').readySkip).toEqual([]);

    // Cả 3 cử tri xác nhận -> trục xuất p0 ngay, phát item kind='elimination', sang spy_guess có targetCharCount
    for (const id of ['p1', 'p2', 'p3']) expect(g.action(id, { type: 'gd_ready' })).toEqual({ ok: true });
    const vGuess = g.view('p0');
    expect(vGuess.phase).toBe('spy_guess');
    expect(vGuess.targetCharCount).toBe(countWordChars(danWord));
    expect(vGuess.timeline.some((it) => it.kind === 'elimination' && it.playerId === 'p0' && it.role === 'giandiep')).toBe(true);
    g.dispose();

    // Test 2: phòng 1 người thật (p0) + 3 bot (p1..p3), bot bị cáo p1 được human skip defense & confirm vote
    const { ctx: botCtx } = makeCtx(
      () => 0.9999,
      { turnMs: 60000, giandiepMrWhite: false, giandiepSpies: 1 },
    );
    const botCtxFull: EngineContext = {
      ...botCtx,
      isBot: (id) => bots.has(id),
    };
    const gb = new GianDiepGame(botCtxFull);
    gb.start(makePlayers(4));
    expect(gb.view('p0').phaseSeconds).toBe(10);
    // check 60s discussion default later; skip word_reveal
    vi.advanceTimersByTime(10_500);
    for (let i = 0; i < 4; i++) gb.action(gb.view().currentSpeakerId!, { type: 'gd_clue', text: `Bot clue ${i}` });
    vi.advanceTimersByTime(10_500);
    expect(gb.view('p0').phase).toBe('discussion');
    expect(gb.view('p0').phaseSeconds).toBe(60);
    vi.advanceTimersByTime(60_500);
    expect(gb.view('p0').phase).toBe('vote');

    // Các bot bầu p1, p0 bầu p1 -> đủ phiếu -> p0 bấm confirm -> bots auto confirm -> defense ngay
    for (const b of bots) {
      const ba = gb.botAction(b);
      if (ba) gb.action(b, ba);
    }
    gb.action('p0', { type: 'gd_vote', target: 'p1' });
    expect(gb.view('p0').phase).toBe('vote');
    expect(gb.action('p0', { type: 'gd_ready' })).toEqual({ ok: true });
    for (const b of bots) {
      const ba = gb.botAction(b);
      if (ba) gb.action(b, ba);
    }
    expect(gb.view('p0').phase).toBe('defense');

    // Ở defense: dù bị cáo là bot hay p0, chỉ cần p0 bấm skip -> bots follow skip -> vào final_vote luôn
    expect(gb.action('p0', { type: 'gd_ready' })).toEqual({ ok: true });
    for (const b of bots) {
      const ba = gb.botAction(b);
      if (ba) gb.action(b, ba);
    }
    for (const b of bots) {
      const ba = gb.botAction(b);
      if (ba) gb.action(b, ba);
    }
    expect(gb.view('p0').phase).toBe('final_vote');
    gb.dispose();
  });
});
