import { describe, it, expect } from 'vitest';
import { cleanFun, isScreenTroll, isTroll, RateLimiter, TargetCooldown, trollExtras } from '../src/fun';
import { CHARACTER_ACCESSORIES, DOODLES, NICKNAMES } from '../../shared/src/types';
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
    expect(room.players[0].character.accessory).toBe('mahong');
    expect(room.customize(ids[0], { accessory: 'sungtien' as never })).toEqual({ ok: false, error: 'bad_request' });
    expect(room.customize(ids[0], { accessory: 5 as never })).toEqual({ ok: false, error: 'bad_request' });
    expect(room.players[0].character.accessory).toBe('mahong');
  });

  it('mẫu chân dung có phụ kiện hợp lệ, ít nhất nửa số mẫu đeo phụ kiện', () => {
    expect(AVATAR_PRESETS.every((p) => p.accessory === undefined || CHARACTER_ACCESSORIES.includes(p.accessory))).toBe(true);
    expect(AVATAR_PRESETS.filter((p) => p.accessory && p.accessory !== 'none').length).toBeGreaterThanOrEqual(8);
  });
});
