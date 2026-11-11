import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setup, startWordChain, submit, TURN, wc } from './helpers';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function startEn(names: string[], firstWord = 'art') {
  const s = setup(names);
  expect(s.room.configure(s.ids[0], 'wordchain_en')).toEqual({ ok: true });
  startWordChain(s.room, s.ids[0], firstWord);
  return s;
}

describe('Nối từ tiếng Anh (wordchain_en)', () => {
  it('nối theo chữ cái cuối -> chữ cái đầu: art -> tits -> sex -> xenon kèm chú thích tiếng Việt', () => {
    const { room } = startEn(['An', 'Bình'], 'art');
    let g = wc(room);
    expect(g.type).toBe('wordchain_en');
    expect(g.currentWord).toBe('art');
    expect(g.currentDefinition?.text).toContain('nghệ thuật');
    const [p0, p1] = g.order;

    expect(submit(room, p0, 'tits')).toEqual({ ok: true });
    g = wc(room);
    expect(g.currentWord).toBe('tits');
    expect(g.currentDefinition?.text).toContain('số nhiều/chia của tit');
    expect(g.currentDefinition?.text).toContain('đầu vú');
    expect(g.currentPlayerId).toBe(p1);

    expect(submit(room, p1, 'sex')).toEqual({ ok: true });
    g = wc(room);
    expect(g.currentWord).toBe('sex');
    expect(g.currentDefinition?.text).toContain('giới tính');
    expect(g.currentPlayerId).toBe(p0);

    expect(submit(room, p0, 'xenon')).toEqual({ ok: true });
    g = wc(room);
    expect(g.currentWord).toBe('xenon');
    expect(g.currentDefinition?.text).toContain('xenon');
    expect(g.totalWords).toBe(3);
  });

  it('chấp nhận cả khi client ghép dư chữ cái đầu đã khóa (vd: ttits -> tits, eegg -> egg)', () => {
    const { room } = startEn(['An', 'Bình'], 'art');
    const [p0, p1] = wc(room).order;
    expect(submit(room, p0, 'ttits')).toEqual({ ok: true });
    expect(wc(room).currentWord).toBe('tits');
    expect(submit(room, p1, 'ssex')).toEqual({ ok: true });
    expect(wc(room).currentWord).toBe('sex');
  });

  it('báo đúng lỗi format, chain, used, not_in_dictionary', () => {
    const { room } = startEn(['An', 'Bình'], 'art');
    const [p0, p1] = wc(room).order;
    expect(submit(room, p1, 'tits')).toEqual({ ok: false, reason: 'not_your_turn' });
    expect(submit(room, p0, 'a')).toEqual({ ok: false, reason: 'format' });
    expect(submit(room, p0, 'two words')).toEqual({ ok: false, reason: 'format' });
    expect(submit(room, p0, '123')).toEqual({ ok: false, reason: 'format' });
    expect(submit(room, p0, 'sex')).toEqual({ ok: false, reason: 'chain' });
    expect(submit(room, p0, 'tunknown')).toEqual({ ok: false, reason: 'not_in_dictionary', word: 'tunknown' });
    expect(submit(room, p0, 'tits')).toEqual({ ok: true });
    expect(submit(room, p1, 'sex')).toEqual({ ok: true });
    expect(submit(room, p0, 'xmas')).toEqual({ ok: true });
    expect(submit(room, p1, 'sex')).toEqual({ ok: false, reason: 'used' });
  });

  it('quyền cứu trợ nối luôn một từ tiếng Anh bắt đầu bằng chữ cái cuối, ưu tiên từ có nghĩa', () => {
    const { room } = startEn(['An', 'Bình'], 'art');
    const [p0, p1] = wc(room).order;
    const r = room.action(p0, { type: 'hint' });
    expect(r.ok && r.hint?.startsWith('t')).toBe(true);
    // các từ bắt đầu bằng t có nghĩa: tit, time, table
    expect(['tit', 'time', 'table']).toContain(r.ok ? r.hint : '');
    expect(wc(room).currentWord).toBe(r.ok ? r.hint : '');
    expect(wc(room).currentPlayerId).toBe(p1);
    expect(wc(room).hintsLeft?.[p0]).toBe(0);
  });

  it('xin cả phòng duyệt từ tiếng Anh mới: đồng ý thì thêm vào từ điển tiếng Anh', () => {
    const { room, dict, learned } = startEn(['An', 'Bình', 'Chi'], 'art');
    const [p0, p1, p2] = wc(room).order;
    expect(submit(room, p0, 'tizz')).toEqual({ ok: false, reason: 'not_in_dictionary', word: 'tizz' });
    expect(room.action(p0, { type: 'appeal', word: 'Tizz' })).toEqual({ ok: true });
    expect(wc(room).vote?.word).toBe('tizz');
    expect(room.action(p1, { type: 'vote', yes: true })).toEqual({ ok: true });
    expect(room.action(p2, { type: 'vote', yes: true })).toEqual({ ok: true });
    expect(wc(room).currentWord).toBe('tizz');
    expect(dict.en?.has('tizz')).toBe(true);
    expect(learned).toHaveLength(1);
    expect(learned[0].word).toBe('tizz');
  });

  it('ngõ cụt: hết giờ khi không còn từ nối tiếp thì đổi sang từ tiếng Anh mới', () => {
    const { room } = startEn(['An', 'Bình', 'Chi'], 'ebony');
    const [p0, p1, p2] = wc(room).order;
    expect(submit(room, p0, 'yjazz')).toEqual({ ok: true });
    expect(wc(room).nextCount).toBe(0);
    vi.advanceTimersByTime(TURN);
    const g = wc(room);
    expect(g.eliminated).toEqual([p1]);
    expect(g.currentPlayerId).toBe(p2);
    expect(g.currentWord).not.toBe('yjazz');
    expect(g.history.at(-1)?.kind).toBe('newWord');
  });
});
