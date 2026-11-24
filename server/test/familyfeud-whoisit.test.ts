import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FAMILY_FEUD_BANK,
  matchFamilyFeudAnswer,
  normalizeFeudText,
  type FeudAnswer,
  type FamilyFeudView,
} from '../../shared/src/familyfeud';
import {
  generateWhoIsItBoard,
  matchWhoIsItTrait,
  WHO_IS_IT_ART_PACK_IDS,
  WHO_IS_IT_ART_PACKS,
  WHO_IS_IT_TRAITS,
  whoIsItBoardSize,
  whoIsItTraitsForPack,
  type WhoIsItView,
} from '../../shared/src/whoisit';
import { VOICE_PERSONA_IDS, type GameResult } from '../../shared/src/types';
import { Dictionary } from '../src/dictionary';
import { FamilyFeudGame } from '../src/games/familyfeud';
import { WhoIsItGame } from '../src/games/whoisit';
import type { EngineContext, EnginePlayer } from '../src/games/engine';
import { Room } from '../src/room';
import { SMALL_WORDS } from './helpers';

function makePlayers(n: number, withTeams = false): EnginePlayer[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `Người ${i}`,
    ...(withTeams ? { team: i % 2 === 0 ? 'red' : 'blue' } : {}),
  }));
}

function makeCtx(rng: () => number, settings: EngineContext['settings'] = {}, turnMs = 600) {
  let result: GameResult | null = null;
  const ctx: EngineContext = {
    rng,
    dict: new Dictionary(SMALL_WORDS),
    settings,
    turnMs,
    hostId: () => 'p0',
    isConnected: () => true,
    isBot: () => false,
    changed: () => {},
    finish: (r) => {
      result = r;
    },
    learnWord: () => {},
  };
  return { ctx, getResult: () => result };
}

describe('Room voice selection', () => {
  it('reserves and releases a voice, assigns distinct voices at start and frees bot voices on restart', () => {
    const room = new Room('VOICE', new Dictionary(SMALL_WORDS), { rng: () => 0.2 });
    try {
      const host = room.addPlayer('An');
      const guest = room.addPlayer('Bình');
      if (!host.ok || !guest.ok) throw new Error('join');
      expect(room.configure(host.playerId, 'baucua')).toEqual({ ok: true });
      expect(room.pickVoice(host.playerId, 'invalid')).toEqual({ ok: false, error: 'bad_request' });
      expect(room.pickVoice(host.playerId, 'chiphien')).toEqual({ ok: true });
      expect(room.pickVoice(guest.playerId, 'chiphien')).toEqual({ ok: false, error: 'voice_taken' });
      expect(room.pickVoice(host.playerId, null)).toEqual({ ok: true });
      expect(room.pickVoice(guest.playerId, 'chiphien')).toEqual({ ok: true });
      for (let index = 0; index < VOICE_PERSONA_IDS.length - 2; index++) expect(room.addBot(host.playerId).ok).toBe(true);
      expect(room.start(host.playerId)).toEqual({ ok: true });
      const playing = room.toPublic(host.playerId).players;
      expect(new Set(playing.map((player) => player.voice)).size).toBe(VOICE_PERSONA_IDS.length);
      expect(playing.every((player) => !!player.voice)).toBe(true);
      expect(playing.find((player) => player.id === guest.playerId)?.voice).toBe('chiphien');
      expect(room.pickVoice(guest.playerId, null)).toEqual({ ok: false, error: 'room_playing' });
      expect(room.action(host.playerId, { type: 'end' })).toEqual({ ok: true });
      expect(room.restart(host.playerId)).toEqual({ ok: true });
      const lobby = room.toPublic(host.playerId).players;
      for (const player of lobby) {
        expect(player.voice).toBe(player.bot ? undefined : playing.find((other) => other.id === player.id)?.voice);
      }
    } finally { room.dispose(); }
  });
});

describe('Room Lobby Team Picking (Ai bấm sớm vào trước)', () => {
  it('cho phép chọn đội ở phòng chờ, chặn team_full đúng sĩ số và giữ đội khi start', () => {
    const dict = new Dictionary(SMALL_WORDS);
    const room = new Room('TEAM4', dict, { turnMs: 250, rng: () => 0.2 });
    const p0 = room.addPlayer('An');
    const p1 = room.addPlayer('Bình');
    const p2 = room.addPlayer('Chi');
    const p3 = room.addPlayer('Dũng');
    if (!p0.ok || !p1.ok || !p2.ok || !p3.ok) throw new Error('join');

    expect(room.configure(p0.playerId, 'family_feud')).toEqual({ ok: true });

    // 4 người -> tối đa 2 người / đội
    expect(room.pickTeam(p0.playerId, 'red')).toEqual({ ok: true });
    expect(room.pickTeam(p1.playerId, 'red')).toEqual({ ok: true });
    expect(room.pickTeam(p2.playerId, 'red')).toEqual({ ok: false, error: 'team_full' });

    // p0 rời đội đỏ -> p2 vào được
    expect(room.pickTeam(p0.playerId, null)).toEqual({ ok: true });
    expect(room.pickTeam(p2.playerId, 'red')).toEqual({ ok: true });
    expect(room.pickTeam(p0.playerId, 'blue')).toEqual({ ok: true });
    expect(room.pickTeam(p3.playerId, 'blue')).toEqual({ ok: true });

    expect(room.start(p0.playerId)).toEqual({ ok: true });
    const vRed = room.toPublic(p1.playerId).game as FamilyFeudView;
    expect(new Set(vRed.teams.red)).toEqual(new Set([p1.playerId, p2.playerId]));
    expect(new Set(vRed.teams.blue)).toEqual(new Set([p0.playerId, p3.playerId]));
    room.dispose();
  });
});

describe('Family Feud (Khảo sát Xóm Lầy)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('kho câu hỏi có >= 250 câu duy nhất, mỗi đáp án ngắn <= 4 từ, <= 28 ký tự & tổng điểm = 100', () => {
    expect(FAMILY_FEUD_BANK.length).toBeGreaterThanOrEqual(250);
    const ids = new Set<string>();
    const questions = new Set<string>();

    for (const q of FAMILY_FEUD_BANK) {
      expect(ids.has(q.id), `Trùng id ${q.id}`).toBe(false);
      ids.add(q.id);
      const normQ = normalizeFeudText(q.question);
      expect(questions.has(normQ), `Trùng câu hỏi ${q.id}: ${q.question}`).toBe(false);
      questions.add(normQ);

      expect(q.answers, `${q.id} phải có đúng 6 đáp án`).toHaveLength(6);
      let sum = 0;
      for (let i = 0; i < q.answers.length; i++) {
        const a = q.answers[i];
        const wordCount = a.text.trim().split(/\s+/).length;
        expect(wordCount, `${q.id}#${i} "${a.text}" quá dài`).toBeLessThanOrEqual(4);
        expect(a.text.length, `${q.id}#${i} "${a.text}" > 28 ký tự`).toBeLessThanOrEqual(28);
        expect(Number.isInteger(a.points), `${q.id}#${i}`).toBe(true);
        expect(a.points, `${q.id}#${i}`).toBeGreaterThan(0);
        if (i > 0) {
          expect(a.points, `${q.id} điểm không giảm dần`).toBeLessThanOrEqual(q.answers[i - 1].points);
        }
        expect(a.aliases.length, `${q.id}#${i} aliases`).toBeGreaterThanOrEqual(3);
        expect(a.keywords.length, `${q.id}#${i} keywords`).toBeGreaterThanOrEqual(2);
        sum += a.points;
      }
      expect(sum, `${q.id} tổng điểm`).toBe(100);
    }
  });

  it('nhận diện chính xác câu trả lời sát nghĩa, không dấu, teen-code, đồng nghĩa & typo', () => {
    const sampleAnswers: FeudAnswer[] = [
      {
        text: 'Đi nhà nghỉ',
        points: 35,
        aliases: ['vao nha nghi', 'di khach san', 'thue phong', 'checkin phong'],
        keywords: ['nha nghi', 'khach san', 'phong'],
      },
      {
        text: 'Nhắn tin NYC',
        points: 25,
        aliases: ['nhan cho nyc', 'goi nguoi yeu cu', 'nhan tin nguoi yeu cu'],
        keywords: ['nguoi yeu cu', 'nhan tin'],
      },
      {
        text: 'Quỵt tiền nhậu',
        points: 18,
        aliases: ['bung bill', 'khong tra tien', 'xu tien nhua'],
        keywords: ['quyt tien', 'tinh tien', 'tron ve'],
      },
      {
        text: 'Đánh rắm trộm',
        points: 10,
        aliases: ['xi hoi', 'thoi quac', 'bom thoi'],
        keywords: ['danh ram', 'xi hoi'],
      },
      {
        text: 'Tắc bồn cầu',
        points: 7,
        aliases: ['nghet toilet', 'nghet wc', 'bon cau khong troi'],
        keywords: ['bon cau', 'nha ve sinh'],
      },
      {
        text: 'Cháy túi',
        points: 5,
        aliases: ['het tien', 'vi rong', 'sach tui', 'khong co tien'],
        keywords: ['het tien', 'chay tui'],
      },
    ];

    expect(matchFamilyFeudAnswer('đi nhà nghỉ', sampleAnswers, new Set())).toMatchObject({ status: 'hit', index: 0 });
    expect(matchFamilyFeudAnswer('vao ks thue hotel', sampleAnswers, new Set())).toMatchObject({ status: 'hit', index: 0 });
    expect(matchFamilyFeudAnswer('nt cho nyc lúc say', sampleAnswers, new Set())).toMatchObject({ status: 'hit', index: 1 });
    expect(matchFamilyFeudAnswer('xù bill không trả tiền', sampleAnswers, new Set())).toMatchObject({ status: 'hit', index: 2 });
    expect(matchFamilyFeudAnswer('xì hơi trong phòng', sampleAnswers, new Set())).toMatchObject({ status: 'hit', index: 3 });
    expect(matchFamilyFeudAnswer('nghẹt wc rồi', sampleAnswers, new Set())).toMatchObject({ status: 'hit', index: 4 });
    expect(matchFamilyFeudAnswer('ko có tiền sạch túi', sampleAnswers, new Set())).toMatchObject({ status: 'hit', index: 5 });
    expect(matchFamilyFeudAnswer('di nha nghj', sampleAnswers, new Set())).toMatchObject({ status: 'hit', index: 0 });
    expect(matchFamilyFeudAnswer('vào khách sạn', sampleAnswers, new Set([0]))).toMatchObject({ status: 'already_revealed', index: 0 });
    expect(matchFamilyFeudAnswer('x', sampleAnswers, new Set()).status).toBe('miss');
    expect(matchFamilyFeudAnswer('bầu trời hôm nay nhiều mây', sampleAnswers, new Set()).status).toBe('miss');
  });

  it('bảo mật chat đội riêng, có nhịp reveal_beat giữa các pha & kết thúc ván sạch sẽ', () => {
    vi.useFakeTimers();
    const { ctx, getResult } = makeCtx(() => 0.2, { familyFeudRounds: 3 }, 2500);
    const game = new FamilyFeudGame(ctx);
    game.start(makePlayers(4, true));

    // Thảo luận riêng tư: Đỏ gửi Xanh KHÔNG thấy
    expect(game.action('p0', { type: 'ff_team_chat', text: 'Gõ chữ hết tiền đi!' })).toEqual({ ok: true });
    expect(game.view('p2').teamChat).toHaveLength(1);
    expect(game.view('p1').teamChat).toHaveLength(0);

    // Chạy bot với nhịp reveal_beat -> phải từng thấy pha reveal_beat trước khi end
    let sawRevealBeat = false;
    for (let step = 0; step < 120 && !getResult(); step++) {
      for (const p of makePlayers(4)) {
        const act = game.botAction(p.id);
        if (act) game.action(p.id, act);
      }
      if (game.view('p0').phase === 'reveal_beat') sawRevealBeat = true;
      vi.advanceTimersByTime(650);
    }
    expect(sawRevealBeat).toBe(true);
    expect(getResult()).not.toBeNull();
    expect(getResult()!.ranking).toHaveLength(4);
  });

  it('tích hợp Room + 5 bot chơi Family Feud hoàn chỉnh tới khi kết thúc', async () => {
    const dict = new Dictionary(SMALL_WORDS);
    const room = new Room('FEUD5', dict, { turnMs: 220, rng: () => Math.random() });
    const host = room.addPlayer('Chủ');
    if (!host.ok) throw new Error('host');
    expect(room.configure(host.playerId, 'family_feud', { familyFeudRounds: 3 })).toEqual({ ok: true });
    for (let i = 0; i < 5; i++) room.addBot(host.playerId);
    expect(room.start(host.playerId)).toEqual({ ok: true });
    room.removePlayer(host.playerId);

    const t0 = Date.now();
    while (room.phase === 'playing' && Date.now() - t0 < 9000) {
      await new Promise((r) => setTimeout(r, 25));
    }
    expect(room.phase).toBe('finished');
    room.dispose();
  }, 14000);
});

describe('Who Is It? HopKids (Đoán Ai Đây?)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('tự úp thẻ theo câu hỏi mới nhất dù không bấm úp, không mất lượt úp', () => {
    vi.useFakeTimers();
    const { ctx } = makeCtx(() => 0.15, { whoIsItDifficulty: 'auto' }, 2000);
    const game = new WhoIsItGame(ctx);
    game.start(makePlayers(2, true));

    const v0 = game.view('p0');
    const redSecret = v0.characters[0].id;
    const blueSecret = v0.characters[1].id;
    expect(game.action('p0', { type: 'wi_pick_secret', characterId: redSecret })).toEqual({ ok: true });
    expect(game.action('p1', { type: 'wi_pick_secret', characterId: blueSecret })).toEqual({ ok: true });

    const stepUntil = (pred: () => boolean, maxSteps = 400) => {
      for (let i = 0; i < maxSteps && !pred(); i++) {
        vi.advanceTimersByTime(100);
      }
      expect(pred()).toBe(true);
    };

    // Chờ tới pha ask đầu tiên
    stepUntil(() => game.view('p0').phase === 'ask');

    const firstTeam = game.view('p0').turnTeam;
    const askPid = firstTeam === 'red' ? 'p0' : 'p1';
    const oppPid = firstTeam === 'red' ? 'p1' : 'p0';
    const oppTeam = firstTeam === 'red' ? 'blue' : 'red';
    const board = game.view(askPid).characters;

    const availKeys = (): string[] => {
      const v = game.view(askPid) as WhoIsItView & { traitKeys?: string[] };
      return v.traitKeys ?? WHO_IS_IT_TRAITS.map((t) => t.key);
    };

    const trait1 = availKeys().find((k) => {
      const hits = board.filter((c) => matchWhoIsItTrait(c, k)).length;
      return hits > 0 && hits < board.length;
    })!;
    expect(trait1).toBeTruthy();

    // Hỏi câu 1, KHÔNG gửi hành động úp thẻ nào, chờ hết review để tự qua lượt
    expect(game.action(askPid, { type: 'wi_ask_trait', traitKey: trait1 })).toEqual({ ok: true });
    const qa1 = game.view(askPid).lastQA!;
    expect(qa1.traitKey).toBe(trait1);
    expect(typeof qa1.answer).toBe('boolean');

    stepUntil(() => game.view(askPid).turnTeam === oppTeam && game.view(askPid).phase === 'ask');

    const expected1 = board
      .filter((c) => matchWhoIsItTrait(c, trait1) !== qa1.answer)
      .map((c) => c.id)
      .sort();
    expect(expected1.length).toBeGreaterThan(0);
    expect([...game.view(askPid).myFlipped].sort()).toEqual(expected1);
    expect([...game.view(oppPid).oppFlipped].sort()).toEqual(expected1);

    // Chơi lượt đội kia để quay lại lượt đội đầu tiên
    expect(game.action(oppPid, { type: 'wi_ask_trait', traitKey: trait1 })).toEqual({ ok: true });
    stepUntil(() => game.view(oppPid).phase === 'review');
    expect(game.action(oppPid, { type: 'wi_end_review' })).toEqual({ ok: true });
    stepUntil(() => game.view(askPid).turnTeam === firstTeam && game.view(askPid).phase === 'ask');

    // Hỏi câu 2 (khác câu 1), kết thúc review bằng wi_end_review mà không úp thủ công
    const trait2 = availKeys().find((k) => {
      if (k === trait1) return false;
      const open = board.filter((c) => !game.view(askPid).myFlipped.includes(c.id));
      const hits = open.filter((c) => matchWhoIsItTrait(c, k)).length;
      return hits > 0 && hits < open.length;
    })!;
    expect(trait2).toBeTruthy();

    expect(game.action(askPid, { type: 'wi_ask_trait', traitKey: trait2 })).toEqual({ ok: true });
    const qa2 = game.view(askPid).lastQA!;
    stepUntil(() => game.view(askPid).phase === 'review');
    expect(game.action(askPid, { type: 'wi_end_review' })).toEqual({ ok: true });

    const expected2 = Array.from(
      new Set([
        ...expected1,
        ...board.filter((c) => matchWhoIsItTrait(c, trait2) !== qa2.answer).map((c) => c.id),
      ]),
    ).sort();
    const myFlippedAfter2 = game.view(askPid).myFlipped;
    expect(new Set(myFlippedAfter2).size).toBe(myFlippedAfter2.length);
    expect([...myFlippedAfter2].sort()).toEqual(expected2);
    expect([...game.view(oppPid).oppFlipped].sort()).toEqual(expected2);

    // Đoán sai phải úp thẻ đoán sai và mất 1 mạng
    stepUntil(() => game.view(oppPid).turnTeam === oppTeam && game.view(oppPid).phase === 'ask');
    const askSecret = firstTeam === 'red' ? redSecret : blueSecret;
    const wrongCard = board.find((c) => c.id !== askSecret && !game.view(oppPid).myFlipped.includes(c.id))!;
    const livesBefore = game.view(oppPid).lives[oppTeam];
    expect(game.action(oppPid, { type: 'wi_guess', characterId: wrongCard.id })).toEqual({ ok: true });
    expect(game.view(oppPid).myFlipped).toContain(wrongCard.id);
    expect(game.view(oppPid).lives[oppTeam]).toBe(livesBefore - 1);

    game.dispose();
  });

  it('bộ sinh nhân vật tạo bảng hợp lệ, duy nhất & cân đối trên đủ 7 gói nét vẽ và kích cỡ 30–54 thẻ', () => {
    const mulberry32 = (seed: number) => {
      let a = seed >>> 0;
      return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    };

    expect(WHO_IS_IT_ART_PACK_IDS).toHaveLength(7);
    expect(WHO_IS_IT_TRAITS.some((t) => t.key === 'exp_sad')).toBe(true);

    const sizes = [30, 36, 42, 48, 54] as const;
    const seeds = [101, 2026, 99991];

    for (const pack of WHO_IS_IT_ART_PACK_IDS) {
      const caps = WHO_IS_IT_ART_PACKS[pack].caps;
      const traits = whoIsItTraitsForPack(pack);
      expect(traits.length, `${pack} phải có đặc điểm`).toBeGreaterThanOrEqual(10);

      for (const size of sizes) {
        for (const seed of seeds) {
          const board = generateWhoIsItBoard(size, pack, mulberry32(seed));
          expect(board).toHaveLength(size);
          expect(new Set(board.map((c) => c.id)).size, `${pack}/${size}/${seed} unique id`).toBe(size);
          expect(new Set(board.map((c) => c.name)).size, `${pack}/${size}/${seed} unique name`).toBe(size);

          const vectors = board.map((c) => traits.map((t) => (t.match(c) ? '1' : '0')).join(''));
          expect(new Set(vectors).size, `${pack}/${size}/${seed} unique vectors`).toBe(size);

          for (const c of board) {
            expect(caps.hairStyle, `${pack} hairStyle`).toContain(c.hairStyle);
            expect(caps.hat, `${pack} hat`).toContain(c.hat);
            expect(caps.glasses, `${pack} glasses`).toContain(c.glasses);
            expect(caps.facialHair, `${pack} facialHair`).toContain(c.facialHair);
            expect(caps.expression, `${pack} expression`).toContain(c.expression);
            if (caps.clothing.length > 0) {
              expect(caps.clothing, `${pack} clothing`).toContain(c.clothing);
            }
            if (!caps.earrings) expect(c.earrings).toBe(false);
            if (!caps.blush) expect(c.blush).toBe(false);
            if (!caps.freckles) expect(c.freckles).toBe(false);
            if (!caps.scar) expect(c.scar).toBe(false);
            if (!caps.bow) expect(c.bow).toBe(false);

            if (c.gender === 'female') {
              expect(c.facialHair).toBe('none');
              expect(c.hairStyle).not.toBe('bald');
              if (caps.femaleHairStyles) expect(caps.femaleHairStyles, `${pack} femaleHairStyles`).toContain(c.hairStyle);
            } else if (caps.maleHairStyles) {
              expect(caps.maleHairStyles, `${pack} maleHairStyles`).toContain(c.hairStyle);
            }
            if (c.hairStyle === 'covered' || c.hairStyle === 'bald' || !caps.hairColor) {
              expect(c.hairColor).toBe('none');
            }
            if (c.bow) {
              expect(c.gender).toBe('female');
              expect(c.hat).toBe('none');
            }
          }

          for (const tr of traits) {
            const hits = board.filter(tr.match).length;
            expect(hits, `${pack}/${size}/${seed} ${tr.key}`).toBeGreaterThanOrEqual(2);
            expect(hits, `${pack}/${size}/${seed} ${tr.key}`).toBeLessThanOrEqual(size - 2);
          }
        }
      }
    }

    expect(whoIsItBoardSize(2, 'auto')).toBe(30);
    expect(whoIsItBoardSize(4, 'auto')).toBe(36);
    expect(whoIsItBoardSize(6, 'auto')).toBe(42);
    expect(whoIsItBoardSize(8, 'auto')).toBe(48);
    expect(whoIsItBoardSize(10, 'auto')).toBe(54);
    expect(whoIsItBoardSize(10, 'large')).toBe(54);
  });

  it('bảo mật bí mật & chat riêng đội, nhịp reveal -> review -> turn_beat giữ đúng người hỏi kế tiếp & từ chối đặc điểm không thuộc gói vẽ', () => {
    vi.useFakeTimers();
    // rng = 0.8 => pickWhoIsItArtPack chọn 'bigSmile' (không có mũ, râu, áo hoodie...)
    const { ctx, getResult } = makeCtx(() => 0.8, { whoIsItDifficulty: 'auto' }, 3000);
    const game = new WhoIsItGame(ctx);
    game.start(makePlayers(4, true));

    const vRed0 = game.view('p0');
    expect(vRed0.boardSize).toBe(36);
    expect(vRed0.phase).toBe('pick_secret');
    expect(vRed0.artPack).toBe('bigSmile');

    // Thảo luận đội riêng tư
    expect(game.action('p0', { type: 'wi_team_chat', text: 'Bí mật chọn người đội mũ!' })).toEqual({ ok: true });
    expect(game.view('p2').teamChat).toHaveLength(1);
    expect(game.view('p1').teamChat).toHaveLength(0);

    const redPick = vRed0.characters[0].id;
    const bluePick = vRed0.characters[1].id;
    expect(game.action('p0', { type: 'wi_pick_secret', characterId: redPick })).toEqual({ ok: true });
    expect(game.view('p0').mySecretId).toBe(redPick);
    expect(game.view('p1').mySecretId).toBeNull();
    expect(game.action('p1', { type: 'wi_pick_secret', characterId: bluePick })).toEqual({ ok: true });

    // Vừa chọn xong bí mật -> vào turn_beat giới thiệu lượt đầu tiên (đã có sẵn turnTeam & activePlayerId)
    const firstBeat = game.view('p0');
    expect(firstBeat.phase).toBe('turn_beat');
    expect(firstBeat.activePlayerId).not.toBeNull();
    const firstTeam = firstBeat.turnTeam;
    const firstAsker = firstBeat.activePlayerId!;

    vi.advanceTimersByTime(500);
    const firstAsk = game.view(firstAsker);
    expect(firstAsk.phase).toBe('ask');
    expect(firstAsk.turnTeam).toBe(firstTeam);
    expect(firstAsk.activePlayerId).toBe(firstAsker);

    const oppPid = firstTeam === 'red' ? 'p1' : 'p0';
    const otherSecretChar = firstAsk.characters.find((c) => c.id === (firstTeam === 'red' ? bluePick : redPick))!;

    // Từ chối trait không thuộc gói bigSmile (vd hat_cap, facial_beard, cloth_hoodie)
    const unavailableKey = WHO_IS_IT_TRAITS.find((t) => !firstAsk.traitKeys.includes(t.key))!.key;
    expect(game.action(firstAsker, { type: 'wi_ask_trait', traitKey: unavailableKey })).toEqual({
      ok: false,
      reason: 'bad_action',
    });

    // Hỏi trait hợp lệ -> vào reveal ngay, thẻ đã được tự động úp
    expect(game.action(firstAsker, { type: 'wi_ask_trait', traitKey: 'gender_male' })).toEqual({ ok: true });
    const afterAsk = game.view(firstAsker);
    expect(afterAsk.phase).toBe('reveal');
    expect(afterAsk.myFlipped.length).toBeGreaterThan(0);
    expect(afterAsk.lastFlippedIds.length).toBe(afterAsk.myFlipped.length);
    expect(afterAsk.lastFlippedTeam).toBe(firstTeam);

    // Bên đối phương nhìn được danh sách oppFlipped mà KHÔNG biết secret của đội hỏi!
    const oppPerspective = game.view(oppPid);
    expect(oppPerspective.oppFlipped).toEqual(afterAsk.myFlipped);
    expect(oppPerspective.mySecretId).toBe(otherSecretChar.id);

    // Hết reveal -> vào review -> bấm wi_end_review -> vào turn_beat với đội & người hỏi kế tiếp đã chốt sẵn
    vi.advanceTimersByTime(600);
    expect(game.view(firstAsker).phase).toBe('review');
    expect(game.action(firstAsker, { type: 'wi_end_review' })).toEqual({ ok: true });

    const nextBeat = game.view(oppPid);
    const expectedNextTeam = firstTeam === 'red' ? 'blue' : 'red';
    expect(nextBeat.phase).toBe('turn_beat');
    expect(nextBeat.turnTeam).toBe(expectedNextTeam);
    expect(nextBeat.activePlayerId).not.toBeNull();
    const nextAsker = nextBeat.activePlayerId!;

    // Hết turn_beat -> vào ask với ĐÚNG người hỏi đã thông báo trong turn_beat
    vi.advanceTimersByTime(500);
    const nextAsk = game.view(nextAsker);
    expect(nextAsk.phase).toBe('ask');
    expect(nextAsk.turnTeam).toBe(expectedNextTeam);
    expect(nextAsk.activePlayerId).toBe(nextAsker);

    // Đội đang hỏi hết giờ -> chuyển turn_beat sang đội kia với turnNote = 'timeout'
    vi.advanceTimersByTime(2700);
    const timeoutBeat = game.view(firstAsker);
    expect(timeoutBeat.phase).toBe('turn_beat');
    expect(timeoutBeat.turnTeam).toBe(firstTeam);
    expect(timeoutBeat.turnNote).toBe('timeout');

    vi.advanceTimersByTime(300);
    const secondTurnView = game.view(firstAsker);
    expect(secondTurnView.phase).toBe('ask');
    expect(secondTurnView.turnNote).toBeNull();
    const secondAsker = secondTurnView.activePlayerId!;

    // Không cho phép cùng 1 đội hỏi lại đặc điểm đã hỏi
    expect(game.action(secondAsker, { type: 'wi_ask_trait', traitKey: 'gender_male' })).toEqual({
      ok: false,
      reason: 'bad_action',
    });

    // Chốt đoán đúng -> qua pha reveal rồi mới kết thúc ván (kèm characterId trên lastQA)
    const targetForFirstTeam = firstTeam === 'red' ? bluePick : redPick;
    expect(game.action(secondAsker, { type: 'wi_guess', characterId: targetForFirstTeam })).toEqual({ ok: true });
    expect(game.view(secondAsker).phase).toBe('reveal');
    expect(game.view(secondAsker).lastQA?.characterId).toBe(targetForFirstTeam);
    expect(getResult()).toBeNull();
    vi.advanceTimersByTime(600);
    expect(getResult()).not.toBeNull();
    game.dispose();
  });

  it('tích hợp bot chơi đủ ván Who Is It ở các quy mô 2, 6, 10 người (30 -> 42 -> 54 thẻ)', async () => {
    vi.useFakeTimers();
    for (const [n, expectedBoard] of [[2, 30], [6, 42], [10, 54]] as const) {
      const { ctx, getResult } = makeCtx(() => Math.random(), { whoIsItDifficulty: 'auto' }, 2500);
      const game = new WhoIsItGame(ctx);
      const pls = makePlayers(n);
      game.start(pls);
      expect(game.view('p0').boardSize).toBe(expectedBoard);

      for (let step = 0; step < 400 && !getResult(); step++) {
        for (const p of pls) {
          const act = game.botAction(p.id);
          if (act) game.action(p.id, act);
        }
        vi.advanceTimersByTime(500);
      }
      expect(getResult(), `Ván ${n} người phải kết thúc sạch`).not.toBeNull();
      game.dispose();
    }
    vi.useRealTimers();

    const dict = new Dictionary(SMALL_WORDS);
    const room = new Room('WHOIS5', dict, { turnMs: 220, rng: () => Math.random() });
    const host = room.addPlayer('Chủ');
    if (!host.ok) throw new Error('host');
    expect(room.configure(host.playerId, 'who_is_it', { whoIsItDifficulty: 'auto' })).toEqual({ ok: true });
    for (let i = 0; i < 5; i++) room.addBot(host.playerId);
    expect(room.start(host.playerId)).toEqual({ ok: true });
    const vStart = room.toPublic(host.playerId).game as WhoIsItView;
    expect(vStart.boardSize).toBe(42);
    room.removePlayer(host.playerId);

    const t0 = Date.now();
    while (room.phase === 'playing' && Date.now() - t0 < 9000) {
      await new Promise((r) => setTimeout(r, 25));
    }
    expect(room.phase).toBe('finished');
    room.dispose();
  }, 15000);
});
