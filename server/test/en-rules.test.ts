import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Dictionary } from '../src/dictionary';
import { WindowLimiter, isDisruptive, isHardDisrupt, pauseMsOf } from '../src/fun';
import { enCandidates, hasVietMarks, normalizeEnWord } from '../../shared/src/en';
import { enTurnMs, hintAllowance, DISRUPT_MAX_BONUS_MS } from '../../shared/src/types';
import { setup, smallDict, startWordChain, submit, TURN, wc } from './helpers';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

/** kho tiếng Anh dài: 60 từ bắt đầu bằng "a" và kết thúc bằng "a" để nối mãi được */
const LOOP = Array.from({ length: 80 }, (_, i) => `a${'bcdefghijklmnopqrstuvwxyz'[i % 25]}${'bcdefghijklmnopqrstuvwxyz'[Math.floor(i / 25)]}a`);
function loopDict(): Dictionary {
  const d = smallDict();
  d.en = new Dictionary([...LOOP, 'art', 'tit', 'xmas', 'xray', 'box', 'taxi', 'next', 'tea'], new Set(), {
    art: '/ɑ:t/ nghệ thuật', tit: 'chim sẻ ngô', box: 'cái hộp', taxi: 'xe tắc xi', xmas: 'lễ Giáng sinh',
  }, 'en');
  return d;
}

function startEn(names: string[], first: string, dict = loopDict()) {
  const s = setup(names, { dict });
  expect(s.room.configure(s.ids[0], 'wordchain_en')).toEqual({ ok: true });
  startWordChain(s.room, s.ids[0], first);
  return s;
}

describe('Nối từ Anh: thời gian lượt giảm dần, thêm cứu trợ', () => {
  it('công thức: 30s -> 15s tuyến tính trong 30 từ đúng rồi giữ 15s; mỗi 30 từ thêm 1 cứu trợ', () => {
    expect(enTurnMs(30_000, 0)).toBe(30_000);
    expect(enTurnMs(30_000, 1)).toBe(29_500);
    expect(enTurnMs(30_000, 10)).toBe(25_000);
    expect(enTurnMs(30_000, 30)).toBe(15_000);
    expect(enTurnMs(30_000, 99)).toBe(15_000);
    expect(hintAllowance('en', 0)).toBe(1);
    expect(hintAllowance('en', 29)).toBe(1);
    expect(hintAllowance('en', 30)).toBe(2);
    expect(hintAllowance('en', 61)).toBe(3);
    expect(hintAllowance('vi', 90)).toBe(1);
  });

  it('chơi một mình: mỗi từ đúng bớt 0,5 giây, tới 30 từ thì còn 15 giây và được thêm 1 cứu trợ', () => {
    const { room, ids } = startEn(['Solo'], 'aba');
    const me = ids[0];
    expect(wc(room).turnSeconds).toBe(30);
    const words = LOOP.filter((w) => w !== 'aba');
    for (let i = 0; i < 31; i++) {
      expect(submit(room, me, words[i])).toEqual({ ok: true });
      const g = wc(room);
      expect(g.correct?.[me]).toBe(i + 1);
      expect(g.turnSeconds).toBe(Math.max(15, 30 - (i + 1) / 2));
      expect(g.turnEndsAt! - Date.now()).toBe(g.turnSeconds * 1000);
    }
    expect(wc(room).hintsLeft?.[me]).toBe(2);
    // đồng hồ thật sự hết sau 15 giây
    vi.advanceTimersByTime(14_999);
    expect(room.toPublic().phase).toBe('playing');
    vi.advanceTimersByTime(2);
    expect(room.toPublic().phase).toBe('finished');
  });

  it('thời gian tính riêng từng người; từ nhờ cứu trợ không làm giảm thời gian', () => {
    const { room } = startEn(['An', 'Bình'], 'aba');
    const [p0, p1] = wc(room).order;
    const words = LOOP.filter((w) => w !== 'aba');
    expect(submit(room, p0, words[0])).toEqual({ ok: true });
    expect(wc(room).turnSeconds).toBe(30); // tới lượt p1 (0 từ)
    expect(submit(room, p1, words[1])).toEqual({ ok: true });
    expect(wc(room).turnSeconds).toBe(29.5); // lại tới p0 (1 từ)
    const r = room.action(p0, { type: 'hint' });
    expect(r.ok).toBe(true);
    expect(wc(room).correct).toEqual({ [p0]: 1, [p1]: 1 });
    expect(wc(room).words[p0]).toBe(2);
  });

  it('VI không đổi: luôn 30 giây', () => {
    const { room, ids } = setup(['A']);
    startWordChain(room, ids[0], 'con mèo');
    expect(submit(room, ids[0], 'mèo mướp')).toEqual({ ok: true });
    expect(wc(room).turnSeconds).toBe(TURN / 1000);
  });
});

describe('Nối từ Anh: gõ nhầm bộ gõ tiếng Việt, gạch nối, chữ x', () => {
  it('enCandidates dịch ngược Telex', () => {
    expect(enCandidates('xmas')).toEqual(['xmas']);
    expect(enCandidates('xmá')).toContain('xmas');
    expect(enCandidates('bõ')[0]).toBe('box');
    expect(enCandidates('tãi')[0]).toBe('taxi');
    expect(enCandidates('nẽt')[0]).toBe('next');
    expect(enCandidates('tê')).toContain('tee');
    expect(enCandidates('đog')).toContain('ddog');
    expect(enCandidates('12')).toEqual([]);
    expect(enCandidates('two words')).toEqual([]);
    expect(normalizeEnWord('X-Ray')).toBe('xray');
    expect(normalizeEnWord("o'clock")).toBe('oclock');
    expect(hasVietMarks('xmá')).toBe(true);
    expect(hasVietMarks('xmas')).toBe(false);
  });

  it('nối được từ bắt đầu bằng x kể cả khi Telex biến chữ thành có dấu hoặc gõ x-ray', () => {
    const { room } = startEn(['An', 'Bình'], 'box');
    const [p0, p1] = wc(room).order;
    // app gửi chữ khóa "x" + phần gõ; Telex biến "mas" thành "má"
    expect(submit(room, p0, 'xmá')).toEqual({ ok: true });
    expect(wc(room).currentWord).toBe('xmas');
    expect(submit(room, p1, 'sx')).toEqual({ ok: false, reason: 'not_in_dictionary', word: 'sx' });
  });

  it('gõ cả từ có chữ đầu đã khóa (xxray) hoặc có gạch nối (x-ray) đều hiểu là xray', () => {
    const { room } = startEn(['An', 'Bình'], 'box');
    const [p0] = wc(room).order;
    expect(submit(room, p0, 'xx-ray')).toEqual({ ok: true });
    expect(wc(room).currentWord).toBe('xray');
  });

  it('chuỗi có dấu không đoán ra từ nào: nhắc tắt bộ gõ, không cho xin duyệt chuỗi lạ', () => {
    const { room } = startEn(['An', 'Bình'], 'art');
    const [p0] = wc(room).order;
    expect(submit(room, p0, 'tẽo')).toEqual({ ok: false, reason: 'vi_keyboard' });
    expect(room.action(p0, { type: 'appeal', word: 'tẽo' })).toEqual({ ok: false, reason: 'cannot_appeal' });
  });

  it('gõ lại chữ đầu đã khóa cho từ không có trong kho: xin duyệt đúng từ không bị lặp chữ', () => {
    const { room } = startEn(['An', 'Bình', 'Chi'], 'art');
    const [p0] = wc(room).order;
    expect(submit(room, p0, 'ttizz')).toEqual({ ok: false, reason: 'not_in_dictionary', word: 'tizz' });
  });
});

describe('Bù giờ khi bị chọc giữa lượt', () => {
  it('chỉ bù cho người đang tới lượt, tối đa 15 giây mỗi lượt, reset ở lượt sau', () => {
    const { room } = startEn(['An', 'Bình'], 'aba');
    const [p0, p1] = wc(room).order;
    const end0 = wc(room).turnEndsAt!;
    expect(room.disrupt(p1, 4500)).toBe(0);
    expect(room.disrupt(p0, 4500)).toBe(4500);
    expect(wc(room).turnEndsAt).toBe(end0 + 4500);
    expect(wc(room).turnBonusMs).toBe(4500);
    for (let i = 0; i < 5; i++) room.disrupt(p0, 4500);
    expect(wc(room).turnBonusMs).toBe(DISRUPT_MAX_BONUS_MS);
    expect(wc(room).turnEndsAt).toBe(end0 + DISRUPT_MAX_BONUS_MS);
    // hết giờ gốc nhưng còn giờ bù: chưa bị loại
    vi.advanceTimersByTime(30_000);
    expect(wc(room).eliminated).toEqual([]);
    expect(submit(room, p0, LOOP[0])).toEqual({ ok: true });
    expect(wc(room).turnBonusMs).toBe(0);
  });

  it('không bù trong lúc bỏ phiếu hoặc ở game khác', () => {
    const { room, ids } = setup(['A', 'B']);
    expect(room.configure(ids[0], 'baucua')).toEqual({ ok: true });
    room.start(ids[0]);
    expect(room.disrupt(ids[0], 3000)).toBe(0);
    room.dispose();
  });

  it('phân loại chiêu phá màn hình và thời gian bù', () => {
    expect(isHardDisrupt('blackout') && isHardDisrupt('poke') && isHardDisrupt('quake')).toBe(true);
    expect(isHardDisrupt('hit')).toBe(false);
    expect(isDisruptive({ kind: 'hit', to: 'x', move: 'tat' })).toBe(true);
    expect(isDisruptive({ kind: 'throw', to: 'x', item: 'dep' })).toBe(true);
    expect(isDisruptive({ kind: 'throw', to: 'x', item: 'hoa' })).toBe(false);
    expect(isDisruptive({ kind: 'doodle', to: 'x', doodle: 'ria' })).toBe(false);
    expect(pauseMsOf({ kind: 'blackout', to: 'x' })).toBe(4500);
    expect(pauseMsOf({ kind: 'hit', to: 'x', move: 'dam' }, { ko: true })).toBe(1500);
  });

  it('WindowLimiter: tối đa 3 lần mỗi 15 giây cho mỗi khóa', () => {
    const w = new WindowLimiter(3, 15_000);
    expect(w.take('a', 0)).toBe(true);
    expect(w.take('a', 1000)).toBe(true);
    expect(w.take('a', 2000)).toBe(true);
    expect(w.take('a', 3000)).toBe(false);
    expect(w.wait('a', 3000)).toBe(12_000);
    expect(w.take('b', 3000)).toBe(true);
    expect(w.take('a', 15_000)).toBe(true);
  });
});

describe('Đổi tên giữa ván', () => {
  it('đổi tên ngay cả khi đang chơi: cập nhật phòng, lịch sử mới và tránh trùng tên', () => {
    const { room, ids } = setup(['An', 'Bình']);
    startWordChain(room, ids[0], 'con mèo');
    const cur = wc(room).currentPlayerId!;
    expect(room.patchProfile(cur, { name: 'Bình' })).toBe(true);
    const renamed = room.toPublic().players.find((p) => p.id === cur)!.name;
    expect(renamed).toBe(cur === ids[1] ? 'Bình' : 'Bình 2');
    expect(submit(room, cur, 'mèo mướp')).toEqual({ ok: true });
    expect(wc(room).history.at(-1)).toMatchObject({ kind: 'word', name: renamed });
    expect(room.patchProfile(cur, { name: '   ' })).toBe(false);
  });

  it('khách chọn mặt đại diện: nhân vật đổi theo mặt đó, được cả khi đang chơi', () => {
    const { room, ids } = setup(['An', 'Bình']);
    startWordChain(room, ids[0], 'con mèo');
    expect(room.patchProfile(ids[0], { avatar: 5, explicit: true })).toBe(true);
    const p = room.toPublic().players.find((x) => x.id === ids[0])!;
    expect(p.avatar).toBe(5);
    expect(room.patchProfile(ids[0], { avatarUrl: 'https://example.test/a.jpg' })).toBe(true);
    expect(room.toPublic().players.find((x) => x.id === ids[0])!.avatarUrl).toBe('https://example.test/a.jpg');
    room.patchProfile(ids[0], { avatarUrl: null });
    expect(room.toPublic().players.find((x) => x.id === ids[0])!.avatarUrl).toBeUndefined();
  });
});

describe('Kho từ tiếng Anh mới (server/data)', () => {
  const en = Dictionary.loadEn(new URL('../data/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));

  it('nguồn uy tín: bỏ tên riêng/viết tắt rác, giữ từ thật bắt đầu bằng x', () => {
    for (const w of ['xcmd', 'xga', 'aaronovitch', 'xayavong', 'xerogaphy']) expect(en.has(w)).toBe(false);
    for (const w of ['xenon', 'xylophone', 'xerox', 'xmas', 'xray', 'xi', 'xylem', 'xenophobia']) expect(en.has(w)).toBe(true);
    expect(en.size).toBeGreaterThan(150_000);
  });

  it('nghĩa tiếng Việt theo từ loại; biến thể ghi rõ gốc từ', () => {
    expect(en.definition('run')?.text).toContain('(động từ) chạy');
    expect(en.definition('took')?.text).toMatch(/^\(quá khứ của take\)/);
    expect(en.definition('cats')?.text).toMatch(/^\(số nhiều của cat\).*con mèo/);
    expect(en.definition('mice')?.text).toMatch(/^\(số nhiều của mouse\).*chuột/);
    expect(en.definition('ran')?.text).toContain('quá khứ của run');
    expect(en.definition('need')?.text).not.toContain('Econ');
    expect(en.definition('xi')?.text).toContain('Hy Lạp');
  });

  it('cứu trợ ưu tiên từ thông dụng có nghĩa', () => {
    const opts = en.hintOptions('x', new Set());
    expect(opts.length).toBeGreaterThan(0);
    for (const w of opts) expect(en.definition(w)).toBeDefined();
  });
});
