import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildMaSoiDeck, type MaSoiView } from '../../shared/src/masoi';
import { Dictionary } from '../src/dictionary';
import { MaSoiGame } from '../src/games/masoi';
import type { EngineContext } from '../src/games/engine';
import type { GameResult } from '../../shared/src/types';
import { Room } from '../src/room';
import { SMALL_WORDS } from './helpers';

function makePlayers(n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `Người ${i}` }));
}

function makeCtx(rng: () => number, opts: { turnMs?: number } = {}) {
  let result: GameResult | null = null;
  let changes = 0;
  const ctx: EngineContext = {
    rng,
    dict: new Dictionary(SMALL_WORDS),
    settings: { masoiPreset: 'classic' },
    turnMs: opts.turnMs ?? 1000,
    hostId: () => 'p0',
    isConnected: () => true,
    isBot: () => false,
    changed: () => { changes++; },
    finish: (r) => { result = r; },
    learnWord: () => {},
  };
  return { ctx, getResult: () => result, getChanges: () => changes };
}

describe('Ma Sói (Werewolf) 4–12 người', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('chia bộ vai cân bằng cho mọi quy mô 4–12 người (classic & chaos)', () => {
    for (let n = 4; n <= 12; n++) {
      const classic = buildMaSoiDeck(n, 'classic');
      const chaos = buildMaSoiDeck(n, 'chaos');
      expect(classic).toHaveLength(n);
      expect(chaos).toHaveLength(n);
      expect(classic.filter((r) => r === 'soi').length).toBeGreaterThanOrEqual(1);
      expect(classic.filter((r) => r === 'soi').length).toBeLessThan(n / 2);
      expect(chaos.includes('kengo')).toBe(true);
    }
  });

  it('cô lập perPlayerView tuyệt đối & kiểm thử đầy đủ Tiên Tri, Bảo Vệ, Phù Thủy, Thợ Săn, Cặp Đôi', () => {
    vi.useFakeTimers();
    // rng = 0.9999 giữ nguyên thứ tự buildMaSoiDeck(8):
    // p0: soi, p1: soi, p2: tientri, p3: baove, p4: phuthuy, p5: thosan, p6: cupid, p7: kengo
    const { ctx, getResult } = makeCtx(() => 0.9999, { turnMs: 5000 });
    const game = new MaSoiGame(ctx);
    game.start(makePlayers(8));

    // Ban đầu là role_reveal
    expect(game.view('p0').phase).toBe('role_reveal');
    expect(game.view('p0').myRole).toBe('soi');
    expect(game.view('p2').myRole).toBe('tientri');

    // Dân/Tiên tri KHÔNG thấy bầy Sói hay lịch sử người khác
    expect(game.view('p2').wolfPackIds).toBeUndefined();
    expect(game.view('p2').wolfChat).toBeUndefined();
    expect(game.view('p0').seerHistory).toBeUndefined();

    // Chỉ Sói mới chat được Kênh Sói
    expect(game.action('p2', { type: 'ms_wolfChat', text: 'lén xem' })).toEqual({ ok: false, reason: 'bad_action' });
    expect(game.action('p0', { type: 'ms_wolfChat', text: 'cắn ai đây' })).toEqual({ ok: true });
    expect(game.view('p1').wolfChat).toHaveLength(1);
    expect(game.view('p2').wolfChat).toBeUndefined();

    // Hết giờ role_reveal -> night_cupid
    vi.advanceTimersByTime(5100);
    expect(game.view('p6').phase).toBe('night_cupid');

    // Cupid (p6) nối đôi p0 (soi) & p3 (baove)
    expect(game.action('p0', { type: 'ms_night', target: 'p1', target2: 'p2' }).ok).toBe(false);
    expect(game.action('p6', { type: 'ms_night', target: 'p0', target2: 'p3' })).toEqual({ ok: true });
    expect(game.view('p0').myPartnerId).toBe('p3');
    expect(game.view('p3').myPartnerId).toBe('p0');
    expect(game.view('p2').myPartnerId).toBeUndefined();

    // Sang night_active
    expect(game.view('p0').phase).toBe('night_active');
    // Bảo vệ (p3) bảo vệ p5; Tiên tri (p2) soi p0 -> Là Sói!
    expect(game.action('p3', { type: 'ms_night', target: 'p5' })).toEqual({ ok: true });
    expect(game.action('p2', { type: 'ms_night', target: 'p0' })).toEqual({ ok: true });
    expect(game.view('p2').seerHistory).toEqual([{ day: 1, targetId: 'p0', isWolf: true }]);

    // Sói cắn p5 (nhưng p3 đang bảo vệ p5!) -> chuyển sang night_witch và không ai bị cắn
    expect(game.action('p0', { type: 'ms_night', target: 'p5' })).toEqual({ ok: true });
    expect(game.action('p1', { type: 'ms_night', target: 'p5' })).toEqual({ ok: true });
    expect(game.view('p4').phase).toBe('night_witch');
    expect(game.view('p4').witchState?.victimId).toBeNull();

    // Phù thủy không dùng bình gì -> sang day_discuss (bình minh yên bình)
    expect(game.action('p4', { type: 'ms_night', save: false, poison: null })).toEqual({ ok: true });
    expect(game.view('p0').phase).toBe('day_discuss');
    expect(game.view('p0').alive).toHaveLength(8);

    // Thảo luận -> sẵn sàng đủ đa số -> sang day_vote
    for (const id of ['p0', 'p1', 'p2', 'p3']) game.action(id, { type: 'ms_ready' });
    expect(game.view('p0').phase).toBe('day_vote');

    // Tất cả bỏ phiếu trắng -> qua đêm 2
    for (let i = 0; i < 8; i++) game.action(`p${i}`, { type: 'ms_vote', target: 'skip' });
    expect(game.view('p0').day).toBe(2);
    expect(game.view('p0').phase).toBe('night_active');

    // Đêm 2: Bảo vệ (p3) KHÔNG ĐƯỢC bảo vệ p5 2 đêm liên tiếp!
    expect(game.action('p3', { type: 'ms_night', target: 'p5' })).toEqual({ ok: false, reason: 'bad_action' });
    expect(game.action('p3', { type: 'ms_night', target: 'p4' })).toEqual({ ok: true });
    // Tiên tri soi p2? Không soi được bản thân; soi p5 -> Không phải Sói
    expect(game.action('p2', { type: 'ms_night', target: 'p5' })).toEqual({ ok: true });
    expect(game.view('p2').seerHistory?.at(-1)).toEqual({ day: 2, targetId: 'p5', isWolf: false });

    // Sói cắn p5 (Thợ săn, lần này không được bảo vệ)
    game.action('p0', { type: 'ms_night', target: 'p5' });
    game.action('p1', { type: 'ms_night', target: 'p5' });
    expect(game.view('p4').phase).toBe('night_witch');
    expect(game.view('p4').witchState?.victimId).toBe('p5');

    // Phù thủy KHÔNG cứu p5 và ĐẦU ĐỘC p1 (Sói 2)!
    expect(game.action('p4', { type: 'ms_night', save: false, poison: 'p1' })).toEqual({ ok: true });
    // p5 là Thợ săn nên phải kích hoạt pha hunter_shot!
    expect(game.view('p5').phase).toBe('hunter_shot');
    expect(game.view('p5').hunterId).toBe('p5');

    // Thợ săn p5 bắn gục p0 (Sói 1)! Vì p0 & p3 là Cặp Đôi -> p3 chết theo -> Hết sạch Sói -> Phe Dân thắng!
    expect(game.action('p5', { type: 'ms_hunter', target: 'p0' })).toEqual({ ok: true });
    const res = getResult();
    expect(res).not.toBeNull();
    expect(res?.winnerIds).toEqual(expect.arrayContaining(['p2', 'p3', 'p4', 'p5', 'p6']));
    expect(res?.winnerIds).not.toContain('p0');
    expect(res?.winnerIds).not.toContain('p1');
    expect(res?.winnerIds).not.toContain('p7'); // Kẻ ngố không thắng ké Phe Dân!
  });

  it('Kẻ Ngố (kengo) bị treo cổ ban ngày thì thắng độc lập ngay lập tức', () => {
    vi.useFakeTimers();
    const { ctx, getResult } = makeCtx(() => 0.9999, { turnMs: 2000 });
    const game = new MaSoiGame(ctx);
    game.start(makePlayers(8));
    vi.advanceTimersByTime(2100); // night_cupid
    game.action('p6', { type: 'ms_night', target: 'p2', target2: 'p4' });
    // night_active: không bảo vệ ai bị cắn -> bảo vệ p2, tiên tri p0, sói cắn p2
    game.action('p3', { type: 'ms_night', target: 'p2' });
    game.action('p2', { type: 'ms_night', target: 'p0' });
    game.action('p0', { type: 'ms_night', target: 'p2' });
    game.action('p1', { type: 'ms_night', target: 'p2' });
    game.action('p4', { type: 'ms_night', save: false, poison: null });
    for (const id of ['p0', 'p1', 'p2', 'p3']) game.action(id, { type: 'ms_ready' });
    // Mọi người vote p7 (Kẻ Ngố)
    for (let i = 0; i < 7; i++) game.action(`p${i}`, { type: 'ms_vote', target: 'p7' });
    game.action('p7', { type: 'ms_vote', target: 'p0' });

    const res = getResult();
    expect(res).not.toBeNull();
    expect(res?.winnerIds).toEqual(['p7']);
    expect(res?.headline).toContain('Kẻ Ngố');
  });

  it('Cặp Đôi khác phe (Sói + Dân) thắng khi sống sót tới Top 2', () => {
    vi.useFakeTimers();
    // 7 người classic: ['soi', 'soi', 'tientri', 'baove', 'phuthuy', 'thosan', 'cupid']
    const { ctx, getResult } = makeCtx(() => 0.9999, { turnMs: 2000 });
    const game = new MaSoiGame(ctx);
    game.start(makePlayers(7));
    vi.advanceTimersByTime(2100); // night_cupid
    // Cupid ghép đôi p0 (soi) & p6 (cupid)
    game.action('p6', { type: 'ms_night', target: 'p0', target2: 'p6' });

    // Giả lập loại dần các người khác qua vote/removePlayer để còn lại p0 & p6
    for (const deadId of ['p1', 'p2', 'p3', 'p4']) game.removePlayer(deadId);
    // Phải giải quyết nếu p5 (thosan) bỏ đi:
    game.removePlayer('p5');
    // Hoặc khi còn [p0, p6] -> Lovers thắng ngay!
    const res = getResult();
    expect(res).not.toBeNull();
    expect(res?.winnerIds).toEqual(['p0', 'p6']);
    expect(res?.headline).toContain('Cặp Đôi');
  });

  it('tích hợp Room + 10 bot chơi Ma Sói từ đầu tới kết thúc ván trơn tru', async () => {
    const dict = new Dictionary(SMALL_WORDS);
    let finishInfo: { winnerIds?: string[] } | null = null;
    const room = new Room('WOLF10', dict, {
      turnMs: 250,
      rng: () => Math.random(),
      onFinish: (info) => { finishInfo = info; },
    });
    room.configure('', 'masoi', { masoiPreset: 'classic' });
    const host = room.addPlayer('Chủ Sói');
    expect(host.ok).toBe(true);
    if (!host.ok) return;
    room.configure(host.playerId, 'masoi', { masoiPreset: 'chaos' });
    for (let i = 1; i < 10; i++) expect(room.addBot(host.playerId).ok).toBe(true);
    // Đánh dấu host tạm rời mạng (để chỉ còn bot tự chơi tới cuối hoặc giả lập bot)
    const startRes = room.start(host.playerId);
    expect(startRes).toEqual({ ok: true });
    room.removePlayer(host.playerId);
    // Cho vòng lặp bot nhanh để ván kết thúc trong < 3s
    const startAt = Date.now();
    while (room.phase === 'playing' && Date.now() - startAt < 6000) {
      await new Promise((r) => setTimeout(r, 40));
    }
    expect(room.phase).toBe('finished');
    expect(room.toPublic().result?.winnerIds?.length).toBeGreaterThanOrEqual(1);
    expect((finishInfo as { winnerIds?: string[] } | null)?.winnerIds?.length).toBeGreaterThanOrEqual(1);
    const v0 = room.toPublic().game as MaSoiView | null;
    expect(v0 === null || v0.type === 'masoi').toBe(true);
    room.dispose();
  }, 10000);
});
