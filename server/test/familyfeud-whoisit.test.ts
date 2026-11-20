import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FAMILY_FEUD_BANK,
  matchFamilyFeudAnswer,
  normalizeFeudText,
  type FeudAnswer,
  type FamilyFeudView,
} from '../../shared/src/familyfeud';
import {
  WHO_IS_IT_CHARACTERS,
  WHO_IS_IT_TRAITS,
  whoIsItBoardSize,
  type WhoIsItView,
} from '../../shared/src/whoisit';
import type { GameResult } from '../../shared/src/types';
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
      expect(room.pickVoice(host.playerId, 'kyduyen')).toEqual({ ok: true });
      expect(room.pickVoice(guest.playerId, 'kyduyen')).toEqual({ ok: false, error: 'voice_taken' });
      expect(room.pickVoice(host.playerId, null)).toEqual({ ok: true });
      expect(room.pickVoice(guest.playerId, 'kyduyen')).toEqual({ ok: true });
      for (let index = 0; index < 4; index++) expect(room.addBot(host.playerId).ok).toBe(true);
      expect(room.start(host.playerId)).toEqual({ ok: true });
      const playing = room.toPublic(host.playerId).players;
      expect(new Set(playing.map((player) => player.voice)).size).toBe(6);
      expect(playing.every((player) => !!player.voice)).toBe(true);
      expect(playing.find((player) => player.id === guest.playerId)?.voice).toBe('kyduyen');
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

  it('đủ 100 nhân vật riêng biệt, 34 đặc điểm cân đối & bảng tự tăng tới 48–54 thẻ', () => {
    expect(WHO_IS_IT_CHARACTERS).toHaveLength(100);
    expect(new Set(WHO_IS_IT_CHARACTERS.map((c) => c.id)).size).toBe(100);
    expect(new Set(WHO_IS_IT_CHARACTERS.map((c) => c.name)).size).toBe(100);

    const traitSigs = WHO_IS_IT_CHARACTERS.map((c) =>
      JSON.stringify([
        c.gender, c.hairStyle, c.hairColor, c.hat, c.glasses, c.facialHair,
        c.skin, c.expression, c.clothing, c.clothesColor, c.earrings, c.blush, c.freckles, c.scar, c.bow,
      ]),
    );
    expect(new Set(traitSigs).size).toBe(100);

    for (const tr of WHO_IS_IT_TRAITS) {
      const hits = WHO_IS_IT_CHARACTERS.filter(tr.match).length;
      expect(hits, `${tr.key}`).toBeGreaterThan(4);
      expect(hits, `${tr.key}`).toBeLessThan(96);
    }

    expect(whoIsItBoardSize(2, 'auto')).toBe(24);
    expect(whoIsItBoardSize(4, 'auto')).toBe(30);
    expect(whoIsItBoardSize(6, 'auto')).toBe(36);
    expect(whoIsItBoardSize(8, 'auto')).toBe(42);
    expect(whoIsItBoardSize(10, 'auto')).toBe(48);
    expect(whoIsItBoardSize(10, 'large')).toBe(54);
  });

  it('bảo mật bí mật & chat riêng đội, đồng bộ oppFlipped khi soi bảng đối thủ & có nhịp turn_beat', () => {
    vi.useFakeTimers();
    const { ctx, getResult } = makeCtx(() => 0.1, { whoIsItDifficulty: 'auto' }, 3000);
    const game = new WhoIsItGame(ctx);
    game.start(makePlayers(4, true));

    const vRed0 = game.view('p0');
    expect(vRed0.boardSize).toBe(30);
    expect(vRed0.phase).toBe('pick_secret');

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

    const askingView = game.view(game.view('p0').turnTeam === 'red' ? 'p0' : 'p1');
    const askPid = askingView.myTeam === 'red' ? 'p0' : 'p1';
    const watchPid = askingView.myTeam === 'red' ? 'p1' : 'p0';
    const otherSecretChar = askingView.characters.find((c) => c.id === (askingView.myTeam === 'red' ? bluePick : redPick))!;

    expect(game.action(askPid, { type: 'wi_ask_trait', traitKey: 'gender_male' })).toEqual({ ok: true });
    expect(game.action(askPid, { type: 'wi_auto_flip' })).toEqual({ ok: true });

    // Bên đối phương nhìn được danh sách oppFlipped mà KHÔNG biết secret của đội hỏi!
    const afterAuto = game.view(askPid);
    const oppPerspective = game.view(watchPid);
    expect(afterAuto.myFlipped.length).toBeGreaterThan(0);
    expect(oppPerspective.oppFlipped).toEqual(afterAuto.myFlipped);
    expect(oppPerspective.mySecretId).toBe(otherSecretChar.id);

    // Kết thúc review -> vào turn_beat -> hết timer mới chuyển sang ask cho đội kia
    expect(game.action(askPid, { type: 'wi_end_review' })).toEqual({ ok: true });
    expect(game.view(askPid).phase).toBe('turn_beat');
    vi.advanceTimersByTime(3200);
    expect(game.view(watchPid).phase).toBe('ask');

    const nextPid = watchPid;
    const nextTarget = game.view(watchPid).myTeam === 'red' ? bluePick : redPick;
    expect(game.action(nextPid, { type: 'wi_guess', characterId: nextTarget })).toEqual({ ok: true });
    expect(getResult()).not.toBeNull();
  });

  it('tích hợp bot chơi đủ ván Who Is It ở các quy mô 2, 6, 10 người (24 -> 36 -> 48 thẻ)', async () => {
    vi.useFakeTimers();
    for (const [n, expectedBoard] of [[2, 24], [6, 36], [10, 48]] as const) {
      const { ctx, getResult } = makeCtx(() => Math.random(), { whoIsItDifficulty: 'auto' }, 2500);
      const game = new WhoIsItGame(ctx);
      const pls = makePlayers(n);
      game.start(pls);
      expect(game.view('p0').boardSize).toBe(expectedBoard);

      for (let step = 0; step < 300 && !getResult(); step++) {
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
    expect(vStart.boardSize).toBe(36);
    room.removePlayer(host.playerId);

    const t0 = Date.now();
    while (room.phase === 'playing' && Date.now() - t0 < 9000) {
      await new Promise((r) => setTimeout(r, 25));
    }
    expect(room.phase).toBe('finished');
    room.dispose();
  }, 15000);
});
