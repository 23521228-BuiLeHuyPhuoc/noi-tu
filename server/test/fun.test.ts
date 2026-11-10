import { describe, it, expect } from 'vitest';
import { cleanFun, isScreenTroll, isTroll, RateLimiter, TargetCooldown, trollExtras } from '../src/fun';
import { CHARACTER_BROWS, CHARACTER_BUILDS, CHARACTER_EYES, CHARACTER_FACES, CHARACTER_HAIRS, SKIN_TONES, CHARACTER_ACCESSORIES, CHARACTER_DETAILS, CHARACTER_GENDERS, CHARACTER_OUTFITS, DOODLES, NICKNAMES } from '../../shared/src/types';
import { AVATAR_PRESETS } from '../../shared/src/avatars';
import { setup } from './helpers';

describe('cleanFun: chiêu "chọc mất dạy"', () => {
  it('nhận đúng các giá trị trong danh sách', () => {
    for (const d of DOODLES) expect(cleanFun({ kind: 'doodle', to: 'x', doodle: d })).toEqual({ kind: 'doodle', to: 'x', doodle: d });
    for (const n of NICKNAMES) expect(cleanFun({ kind: 'nick', to: 'x', nick: n })).toEqual({ kind: 'nick', to: 'x', nick: n });
    for (const k of ['roach', 'ink', 'honk', 'cry'] as const) expect(cleanFun({ kind: k, to: 'x', junk: 1 })).toEqual({ kind: k, to: 'x' });
    expect(cleanFun({ kind: 'charm', to: 'x' })).toEqual({ kind: 'charm' });
  });

  it('từ chối giá trị lạ, thiếu người nhận, biệt danh tự đặt', () => {
    expect(cleanFun({ kind: 'doodle', to: 'x', doodle: 'chuiboi' })).toBeNull();
    expect(cleanFun({ kind: 'doodle', doodle: 'ria' })).toBeNull();
    expect(cleanFun({ kind: 'nick', to: 'x', nick: 'Tên tự đặt' })).toBeNull();
    expect(cleanFun({ kind: 'nick', to: 'x' })).toBeNull();
    expect(cleanFun({ kind: 'roach' })).toBeNull();
    expect(cleanFun({ kind: 'ink', to: 42 })).toBeNull();
    expect(cleanFun({ kind: 'honk', to: {} })).toBeNull();
    expect(cleanFun({ kind: 'troll', to: 'x' })).toBeNull();
  });

  it('phân loại nhóm chiêu', () => {
    expect(isTroll('roach') && isTroll('charm') && isTroll('doodle')).toBe(true);
    expect(isTroll('throw')).toBe(false);
    expect(isScreenTroll('roach') && isScreenTroll('ink')).toBe(true);
    expect(isScreenTroll('honk')).toBe(false);
  });

  it('server bốc số liệu hợp lệ', () => {
    for (let i = 0; i < 50; i++) {
      const c = trollExtras({ kind: 'roach', to: 'x' }).count!;
      expect(c === 2 || c === 3).toBe(true);
      const k = trollExtras({ kind: 'ink', to: 'x' }).corner!;
      expect(Number.isInteger(k) && k >= 0 && k <= 3).toBe(true);
      const v = trollExtras({ kind: 'honk', to: 'x' }).variant!;
      expect(Number.isInteger(v) && v >= 0 && v <= 2).toBe(true);
    }
    expect(trollExtras({ kind: 'cry', to: 'x' })).toEqual({});
  });
});

describe('giới hạn tần suất', () => {
  it('RateLimiter chặn sau burst và hồi dần', () => {
    const t0 = 1_000_000;
    const rl = new RateLimiter(4, 3000, t0);
    expect([1, 2, 3, 4].map(() => rl.take(t0))).toEqual([true, true, true, true]);
    expect(rl.take(t0)).toBe(false);
    expect(rl.take(t0 + 2999)).toBe(false);
    expect(rl.take(t0 + 3100)).toBe(true);
    expect(rl.take(t0 + 3100)).toBe(false);
  });

  it('TargetCooldown: mỗi người bị chọc chỉ 1 lần / 8 giây, người khác không bị ảnh hưởng', () => {
    const cd = new TargetCooldown(8000);
    expect(cd.take('an', 0)).toBe(true);
    expect(cd.take('an', 7999)).toBe(false);
    expect(cd.take('binh', 100)).toBe(true);
    expect(cd.take('an', 8000)).toBe(true);
    cd.remove('an');
    expect(cd.take('an', 8001)).toBe(true);
  });
});

describe('phụ kiện nhân vật', () => {
  it('customize chỉ nhận phụ kiện trong danh sách', () => {
    const { room, ids } = setup(['An', 'Bình']);
    for (const a of CHARACTER_ACCESSORIES) expect(room.customize(ids[0], { accessory: a })).toEqual({ ok: true });
    expect(room.players[0].character.accessory).toBe('pridebang');
    expect(room.customize(ids[0], { accessory: 'sungtien' as never })).toEqual({ ok: false, error: 'bad_request' });
    expect(room.customize(ids[0], { accessory: 5 as never })).toEqual({ ok: false, error: 'bad_request' });
    expect(room.players[0].character.accessory).toBe('pridebang');
  });

  it('mẫu chân dung có phụ kiện hợp lệ, ít nhất nửa số mẫu đeo phụ kiện', () => {
    expect(AVATAR_PRESETS.every((p) => p.accessory === undefined || CHARACTER_ACCESSORIES.includes(p.accessory))).toBe(true);
    expect(AVATAR_PRESETS.filter((p) => p.accessory && p.accessory !== 'none').length).toBeGreaterThanOrEqual(8);
  });
});

describe('giới tính, chi tiết mặt, trang phục, mẫu mở rộng', () => {
  it('customize whitelist gender (có LGBT+), detail, outfit', () => {
    const { room, ids } = setup(['An']);
    expect(CHARACTER_GENDERS).toContain('lgbt');
    expect(room.customize(ids[0], { gender: 'lgbt' })).toEqual({ ok: true });
    for (const d of CHARACTER_DETAILS) expect(room.customize(ids[0], { detail: d })).toEqual({ ok: true });
    for (const o of CHARACTER_OUTFITS) expect(room.customize(ids[0], { outfit: o })).toEqual({ ok: true });
    expect(room.customize(ids[0], { gender: 'abc' as never })).toEqual({ ok: false, error: 'bad_request' });
    expect(room.customize(ids[0], { detail: 'sung' as never })).toEqual({ ok: false, error: 'bad_request' });
    expect(room.customize(ids[0], { outfit: 'bikini' as never })).toEqual({ ok: false, error: 'bad_request' });
    expect(room.players[0].character).toMatchObject({ gender: 'lgbt', outfit: 'dayvang', detail: 'malum' });
  });

  it('khách mới không bị tự gán LGBT+', () => {
    const { room } = setup(['A', 'B', 'C', 'D', 'E']);
    expect(room.players.every((p) => p.character.gender !== 'lgbt')).toBe(true);
  });

  it('có 26 mẫu, 16 mẫu đầu giữ nguyên, mẫu mới hợp lệ', () => {
    expect(AVATAR_PRESETS.length).toBe(26);
    expect(AVATAR_PRESETS[0]).toMatchObject({ gender: 'nam', age: 'tre', hair: 'han', color: 1 });
    for (const p of AVATAR_PRESETS) {
      expect(CHARACTER_GENDERS).toContain(p.gender);
      expect(CHARACTER_DETAILS).toContain(p.detail ?? 'none');
      expect(CHARACTER_OUTFITS).toContain(p.outfit ?? 'none');
    }
  });

  it('tài khoản chọn mẫu 25 thì nhân vật theo mẫu đó; 26 thì bị bỏ qua', () => {
    const { room } = setup(['A']);
    const r = room.addPlayer('Idol', undefined, { avatar: 25, account: true });
    if (!r.ok) throw new Error('add');
    expect(room.players.find((p) => p.id === r.playerId)!.character).toMatchObject({ gender: 'lgbt', accessory: 'pridetoc' });
  });
});

describe('đa dạng khuôn mặt: da, dáng mặt, dáng người, mắt, mày, tóc', () => {
  it('customize whitelist chặt từng trường mới', () => {
    const { room, ids } = setup(['An']);
    for (let k = 0; k < SKIN_TONES; k++) expect(room.customize(ids[0], { skin: k })).toEqual({ ok: true });
    for (const f of CHARACTER_FACES) expect(room.customize(ids[0], { face: f })).toEqual({ ok: true });
    for (const b of CHARACTER_BUILDS) expect(room.customize(ids[0], { build: b })).toEqual({ ok: true });
    for (const e of CHARACTER_EYES) expect(room.customize(ids[0], { eyes: e })).toEqual({ ok: true });
    for (const b of CHARACTER_BROWS) expect(room.customize(ids[0], { brows: b })).toEqual({ ok: true });
    for (const h of CHARACTER_HAIRS) expect(room.customize(ids[0], { hair: h })).toEqual({ ok: true });
    const bad = (x: object) => expect(room.customize(ids[0], x as never)).toEqual({ ok: false, error: 'bad_request' });
    bad({ skin: 8 }); bad({ skin: -1 }); bad({ skin: 1.5 }); bad({ skin: '2' });
    bad({ face: 'vuông' }); bad({ build: 'beo' }); bad({ eyes: 'laser' }); bad({ brows: 'x' }); bad({ hair: 'mullet' });
    expect(room.players[0].character).toMatchObject({ skin: 7, face: 'nhon', build: 'mum', eyes: 'motmi', brows: 'lieu', hair: 'dailung' });
  });

  it('khách mặc định trong cùng phòng không giống nhau (không bản sao)', () => {
    const { room } = setup(['A', 'B', 'C', 'D', 'E', 'F']);
    const keys = room.players.map((p) => JSON.stringify({ ...p.character, color: 0 }));
    expect(new Set(keys).size).toBe(6);
    expect(new Set(room.players.map((p) => p.character.skin)).size).toBeGreaterThanOrEqual(5);
    expect(new Set(room.players.map((p) => p.character.face)).size).toBeGreaterThanOrEqual(5);
    expect(room.players.every((p) => !p.character.accessory?.startsWith('pride') && p.character.gender !== 'lgbt')).toBe(true);
  });

  it('mẫu chân dung đa dạng da, dáng mặt và dáng người', () => {
    expect(new Set(AVATAR_PRESETS.map((p) => p.skin)).size).toBe(SKIN_TONES);
    expect(new Set(AVATAR_PRESETS.map((p) => p.face)).size).toBe(CHARACTER_FACES.length);
    expect(new Set(AVATAR_PRESETS.map((p) => p.build)).size).toBe(CHARACTER_BUILDS.length);
    expect(AVATAR_PRESETS.every((p) => CHARACTER_HAIRS.includes(p.hair))).toBe(true);
  });
});
