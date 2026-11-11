/**
 * Kiểm tra cả ván Cờ tỷ phú từ đầu tới khi có người thắng, với xúc xắc vật lý thật, tốc độ x3,
 * người chơi máy tự quyết định. Mỗi lượt đổ đều được đối chiếu với luật: đi đúng số ô, qua Xuất phát
 * +200, tiền thuê đúng mức, thuế vào hũ, Nghỉ chân ăn hũ, mua/nâng cấp đúng lúc, đổ đôi tung tiếp,
 * 3 lần đôi vào tù, luật ra tù, thứ tự lượt.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TyPhuGame } from '../src/games/typhu';
import type { EngineContext } from '../src/games/engine';
import type { GameResult, TyPhuView } from '../../shared/src/types';
import {
  TYPHU_BOARD, TYPHU_GROUPS, TYPHU_JAIL, TYPHU_JAIL_FINE, TYPHU_MAX_HOUSES, TYPHU_PASS_START, TYPHU_SIZE,
  groupCells, isTyPhuProperty, rentOf, stationRent, utilityRent,
} from '../../shared/src/typhu';
import { smallDict } from './helpers';

type V = TyPhuView & { movement: { path: number[]; from: number; to: number; endsAt: number; kind: string; playerId: string } | null };

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}

function playAudited(n: number, seed: number) {
  const finished: GameResult[] = [];
  const rng = lcg(seed);
  const ctx: EngineContext = {
    rng, dict: smallDict(), settings: { ludoPieces: 4 }, turnMs: 20_000,
    hostId: () => 'p0', isConnected: () => true, changed: () => {}, finish: (r) => finished.push(r), learnWord: () => {},
  };
  const g = new TyPhuGame(ctx);
  g.start(Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}` })));
  const v = () => JSON.parse(JSON.stringify(g.view())) as V;
  const errors: string[] = [];
  const transcript: string[] = [];
  const bot = lcg(seed * 31 + 7);
  const fail = (msg: string) => { if (errors.length < 40) errors.push(msg); };
  expect(g.action('p0', { type: 'speed', value: 3 }).ok).toBe(true);

  const settle = () => {
    let guard = 0;
    while (v().movement && guard++ < 10) vi.advanceTimersByTime(v().movement!.endsAt - Date.now() + 1);
  };
  const nextAlive = (s: V, id: string) => {
    const i = s.order.indexOf(id);
    for (let k = 1; k <= s.order.length; k++) {
      const o = s.order[(i + k) % s.order.length];
      if (!s.bankrupt.includes(o)) return o;
    }
    return id;
  };
  const doublesInRow: Record<string, number> = {};
  let turns = 0;

  for (let step = 0; step < 6000 && !finished.length; step++) {
    const s = v();
    const cur = s.currentPlayerId!;
    if (s.movement) { settle(); continue; }
    if (s.step === 'wait') { vi.advanceTimersByTime(1500); continue; }
    if (s.step === 'buy') {
      const c = TYPHU_BOARD[s.pendingBuy!];
      const price = isTyPhuProperty(c) ? c.price : 0;
      const before = s.cash[cur];
      if (before >= price + 60 && bot() < 0.85) {
        g.action(cur, { type: 'buy' });
        const a = v();
        if (a.owners[s.pendingBuy!] !== cur) fail(`mua ${c.name} nhưng không thành chủ`);
        if (a.cash[cur] !== before - price) fail(`mua ${c.name}: tiền ${before} -> ${a.cash[cur]}, phải trừ ${price}`);
        transcript.push(`${cur} mua ${c.name} (-${price})`);
      } else {
        g.action(cur, { type: 'skip' });
        transcript.push(`${cur} bỏ qua ${c.name}`);
      }
      continue;
    }
    if (s.step === 'upgrade') {
      const i = s.pendingBuy!;
      const c = TYPHU_BOARD[i];
      if (c.kind !== 'land') { fail('upgrade trên ô không phải đất'); g.action(cur, { type: 'skip' }); continue; }
      const h = s.houses[i] ?? 0;
      const cost = TYPHU_GROUPS[c.group].house;
      if (g.action(cur, { type: 'build', cell: i, levels: 2 }).ok) fail('nhảy cóc 2 cấp vẫn được');
      if (s.cash[cur] >= cost + 80 && bot() < 0.85) {
        const ok = g.action(cur, { type: 'build', cell: i }).ok;
        const a = v();
        if (!ok || (a.houses[i] ?? 0) !== h + 1) fail(`nâng ${c.name} từ ${h} không lên ${h + 1}`);
        if (a.cash[cur] !== s.cash[cur] - cost) fail(`nâng ${c.name}: trừ sai tiền`);
        transcript.push(`${cur} nâng ${c.name} lên cấp ${h + 1} (-${cost})`);
      } else {
        g.action(cur, { type: 'skip' });
      }
      continue;
    }
    // ---- lượt đổ ----
    turns++;
    const before = s;
    const inJail = cur in before.jail;
    if (inJail && before.cash[cur] >= 200 && bot() < 0.4) {
      g.action(cur, { type: 'payJail' });
      const a = v();
      if (cur in a.jail) fail('nộp tiền ra tù mà vẫn ở tù');
      if (a.cash[cur] !== before.cash[cur] - TYPHU_JAIL_FINE) fail('nộp ra tù trừ sai tiền');
      if ((a.pot ?? 0) !== (before.pot ?? 0) + TYPHU_JAIL_FINE) fail('tiền ra tù không vào hũ');
      transcript.push(`${cur} nộp ${TYPHU_JAIL_FINE} ra tù`);
      continue; // vẫn bước 'roll', vòng sau đổ
    }
    const logBefore = before.log.at(-1)?.id ?? 0;
    g.action(cur, { type: 'roll' });
    const r = v();
    const [d1, d2] = r.dice!;
    const sum = d1 + d2;
    const dbl = d1 === d2;
    const from = before.pos[cur];
    const jailCount = before.jail[cur];
    let expectMove = true;
    let mayRollAgain = dbl;
    if (inJail) {
      mayRollAgain = false;
      if (!dbl && jailCount + 1 < 3) {
        expectMove = false;
        if (r.movement) fail(`đang ở tù, đổ ${d1}-${d2} lần ${jailCount + 1} mà vẫn đi`);
        if (r.jail[cur] !== jailCount + 1) fail('đếm lượt ngồi tù sai');
      }
    } else if (dbl) {
      doublesInRow[cur] = (doublesInRow[cur] ?? 0) + 1;
      if (doublesInRow[cur] >= 3) {
        expectMove = false;
        mayRollAgain = false;
        if (r.pos[cur] !== TYPHU_JAIL || !(cur in r.jail)) fail('đổ đôi 3 lần liên tiếp mà không vào tù');
      }
    }
    if (!dbl || inJail) doublesInRow[cur] = 0;
    if (r.bankrupt.includes(cur)) expectMove = false; // phá sản vì tiền phạt ra tù thì không đi nữa
    if (expectMove) {
      const m = r.movement;
      if (!m || m.kind !== 'roll') fail(`đổ ${sum} mà không đi`);
      else {
        if (m.path.length !== sum) fail(`đổ ${d1}+${d2}=${sum} mà đi ${m.path.length} ô`);
        if (m.from !== from) fail('đi từ sai ô');
        m.path.forEach((c, k) => { if (c !== (from + k + 1) % TYPHU_SIZE) fail('đường đi không liên tục'); });
      }
    }
    settle();
    const a = v();
    const newLogs = a.log.filter((l) => l.id > logBefore);
    transcript.push(`${cur} đổ ${d1}+${d2}${dbl ? ' (đôi)' : ''} ${from}->${a.pos[cur]}: ${newLogs.map((l) => l.text).join(' | ')}`);
    if (expectMove) {
      const land = (from + sum) % TYPHU_SIZE;
      const passed = from + sum >= TYPHU_SIZE;
      const hasStart = newLogs.some((l) => l.kind === 'start' && l.text.startsWith(`P${cur.slice(1)} `));
      const c = TYPHU_BOARD[land];
      const viaCard = c.kind === 'chance' || c.kind === 'community';
      if (!viaCard && passed !== hasStart) fail(`qua Xuất phát (${from}+${sum}) nhưng log nhận 200: ${hasStart}`);
      if (viaCard && passed && !hasStart) fail(`qua Xuất phát (${from}+${sum}) mà không nhận 200`);
      const owner = before.owners[land];
      const cashAfterStart = before.cash[cur] + (passed ? TYPHU_PASS_START : 0) - (inJail && !dbl && jailCount + 1 >= 3 ? TYPHU_JAIL_FINE : 0);
      if (isTyPhuProperty(c) && owner && owner !== cur && !a.bankrupt.includes(cur)) {
        const count = Object.entries(before.owners).filter(([k, o]) => o === owner && TYPHU_BOARD[Number(k)].kind === c.kind).length;
        const full = c.kind === 'land' && groupCells(c.group).every((k) => before.owners[k] === owner);
        const rent = c.kind === 'station' ? stationRent(count) : c.kind === 'utility' ? utilityRent(count, sum) : rentOf(land, before.houses[land] ?? 0, full);
        const log = newLogs.find((l) => l.kind === 'rent');
        if (!log) fail(`dừng ở ${c.name} của ${owner} mà không trả tiền thuê`);
        else if (!log.text.includes(` ${rent.toLocaleString('vi-VN')} xu`)) fail(`tiền thuê ${c.name} phải ${rent}: "${log.text}"`);
        if (a.cash[owner] < before.cash[owner] + Math.min(rent, 1)) fail('chủ đất không nhận tiền thuê');
      } else if (isTyPhuProperty(c) && !owner) {
        if (cashAfterStart >= c.price && a.step !== 'buy') fail(`dừng ở ${c.name} chưa chủ, đủ tiền mà không được hỏi mua (bước ${a.step})`);
        if (cashAfterStart >= c.price && a.pendingBuy !== land) fail('hỏi mua sai ô');
      } else if (c.kind === 'land' && owner === cur) {
        const h = before.houses[land] ?? 0;
        const can = h < TYPHU_MAX_HOUSES && cashAfterStart >= TYPHU_GROUPS[c.group].house;
        if (can !== (a.step === 'upgrade')) fail(`dừng ở đất của mình ${c.name} (cấp ${h}) mà bước là ${a.step}`);
      } else if (c.kind === 'tax' && !a.bankrupt.includes(cur)) {
        if ((a.pot ?? 0) !== (before.pot ?? 0) + c.amount) fail(`thuế ${c.amount} không vào hũ`);
      } else if (c.kind === 'gotojail') {
        if (a.pos[cur] !== TYPHU_JAIL || !(cur in a.jail)) fail('dừng ô Vào tù mà không vào tù');
        mayRollAgain = false;
      } else if (c.kind === 'rest') {
        if ((before.pot ?? 0) > 0 && (a.pot ?? 0) !== 0) fail('dừng Nghỉ chân mà không ăn hũ');
      }
      if (c.kind === 'chance' || c.kind === 'community') {
        if (a.card && /tù/i.test(a.card.text) && /Vào tù|tóm/.test(a.card.text)) mayRollAgain = false;
        if (cur in a.jail) mayRollAgain = false;
      }
    }
    // đổ đôi: sau khi mua/nâng/bỏ qua phải được tung tiếp; không đôi: chuyển cho người kế
    let guard = 0;
    while (!finished.length && guard++ < 6) {
      const x = v();
      if (x.movement) { settle(); continue; }
      if (x.step === 'buy') {
        const c = TYPHU_BOARD[x.pendingBuy!];
        const price = isTyPhuProperty(c) ? c.price : 0;
        const ok = x.cash[cur] >= price + 60 && bot() < 0.85 && g.action(cur, { type: 'buy' }).ok;
        if (ok) transcript.push(`${cur} mua ${c.name} (-${price})`);
        else g.action(cur, { type: 'skip' });
        continue;
      }
      if (x.step === 'upgrade') {
        const i = x.pendingBuy!;
        const c = TYPHU_BOARD[i];
        const h = x.houses[i] ?? 0;
        const cost = c.kind === 'land' ? TYPHU_GROUPS[c.group].house : 0;
        if (g.action(cur, { type: 'build', cell: i, levels: 2 }).ok) fail('nhảy cóc 2 cấp vẫn được');
        if (x.cash[cur] >= cost + 80 && bot() < 0.85) {
          const before = x.cash[cur];
          if (!g.action(cur, { type: 'build', cell: i }).ok) fail('nâng cấp hợp lệ bị từ chối');
          const z = v();
          if ((z.houses[i] ?? 0) !== h + 1 || z.cash[cur] !== before - cost) fail(`nâng ${c.name} sai: cấp ${z.houses[i]}, tiền ${before}->${z.cash[cur]}`);
          transcript.push(`${cur} nâng ${c.name} lên cấp ${h + 1} (-${cost})`);
        } else g.action(cur, { type: 'skip' });
        continue;
      }
      if (x.step === 'wait') { vi.advanceTimersByTime(1500); continue; }
      break;
    }
    if (finished.length) break;
    const y = v();
    // hết lượt (sang người khác, vào tù) thì đếm lại số lần đổ đôi liên tiếp
    if (y.currentPlayerId !== cur || cur in y.jail) doublesInRow[cur] = 0;
    if (y.bankrupt.includes(cur)) continue;
    if (mayRollAgain && !(cur in y.jail)) {
      if (y.currentPlayerId !== cur || !y.extraRoll) fail(`${cur} đổ đôi ${d1}-${d2} mà không được tung tiếp (lượt chuyển cho ${y.currentPlayerId})`);
    } else if (y.currentPlayerId !== nextAlive(y, cur) && y.order.filter((o) => !y.bankrupt.includes(o)).length > 1) {
      fail(`sau lượt của ${cur}, lượt chuyển sai: ${y.currentPlayerId} (phải ${nextAlive(y, cur)})`);
    }
    // bất biến
    for (const id of y.order) if (y.cash[id] < 0) fail(`${id} âm tiền`);
    for (const [k, h] of Object.entries(y.houses)) if (h && !y.owners[Number(k)]) fail('nhà trên đất không chủ');
  }
  if (!finished.length) {
    settle();
    g.action('p0', { type: 'end' });
  }
  g.dispose();
  return { errors, transcript, finished, turns: Math.round(turns / n) };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('Cờ tỷ phú: chơi trọn ván và đối chiếu luật', () => {
  it('ván 3 người tới khi kết thúc, mọi lượt đều đúng luật', () => {
    const res = playAudited(3, 2026);
    // in tóm tắt ván để người đọc rà lại
    console.log(`Số vòng (mỗi người 1 lượt): ${res.turns}\n` + res.transcript.slice(0, 60).join('\n') + '\n...\n' + res.transcript.slice(-25).join('\n'));
    console.log('KẾT QUẢ:', res.finished[0]?.headline, res.finished[0]?.ranking.map((r) => `${r.name}: ${r.detail}`).join(', '));
    expect(res.errors).toEqual([]);
    expect(res.finished).toHaveLength(1);
  }, 120_000);

  it('thêm 8 ván 2-6 người với hạt giống khác nhau, không vi phạm luật', () => {
    const all: string[] = [];
    const stats: string[] = [];
    for (let seed = 1; seed <= 8; seed++) {
      const n = 2 + (seed % 5);
      const r = playAudited(n, seed * 101);
      all.push(...r.errors.map((e) => `[ván ${seed}] ${e}`));
      stats.push(`${n} người: ${r.turns} vòng – ${r.finished[0]?.headline}`);
    }
    console.log(stats.join('\n'));
    expect(all).toEqual([]);
  }, 600_000);
});
