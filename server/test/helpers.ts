import { vi } from 'vitest';
import { Dictionary } from '../src/dictionary';
import { Room } from '../src/room';
import type { BauCuaView, WordChainView } from '../../shared/src/types';

/** Kho từ nhỏ, đủ để dựng các tình huống. */
export const SMALL_WORDS = [
  'con mèo', 'mèo mướp', 'mướp đắng', 'đắng cay', 'cay đắng', 'cay nghiệt',
  'đồ đạc', 'đồ vật', 'vật lý', 'lý do', 'do dự', 'dự án', 'án mạng', 'mạng lưới',
  'hòa bình', 'bình yên', 'yên tâm', 'tâm sự', 'sự thật', 'thật thà',
  // "cụt lủn": không có từ nào bắt đầu bằng "lủn" -> ngõ cụt
  'mèo cụt', 'cụt lủn',
];

/** Kho từ tiếng Anh nhỏ kèm chú thích nghĩa tiếng Việt */
export const SMALL_EN_WORDS = [
  'art', 'tit', 'tits', 'time', 'table', 'sex', 'sun', 'star',
  'xenon', 'xray', 'xmas', 'night', 'note', 'egg', 'game',
  // "jazz": không có từ nào trong kho nhỏ bắt đầu bằng "z" -> ngõ cụt
  'ebony', 'yjazz',
];

export const SMALL_EN_DEFS: Record<string, string> = {
  art: '/ɑ:t/ nghệ thuật; mỹ thuật',
  tit: '/tit/ (thông tục) đầu vú, núm vú; (động vật học) chim sẻ ngô',
  sex: '/seks/ giới tính; vấn đề sinh lý',
  xenon: "/'zenɔn/ (hoá học) khí xenon",
  night: '/nait/ đêm, tối',
  time: '/taim/ thời gian, thì giờ',
  table: "/'teibl/ cái bàn",
};

export function smallEnDict(words = SMALL_EN_WORDS, defs = SMALL_EN_DEFS): Dictionary {
  return new Dictionary(words, new Set(), defs, 'en');
}

export function smallDict(words = SMALL_WORDS): Dictionary {
  const d = new Dictionary(words);
  d.en = smallEnDict();
  return d;
}

/** rng cố định: luôn trả về 0 */
export const zeroRng = () => 0;

export const TURN = 30_000;

export function setup(names: string[], opts: { dict?: Dictionary; rng?: () => number; turnMs?: number } = {}) {
  const onChange = vi.fn();
  const dict = opts.dict ?? smallDict();
  const learned: { word: string; by: string }[] = [];
  const finishes: { gameType: string; participants: string[]; winnerId: string | null }[] = [];
  const room = new Room('ABC123', dict, {
    turnMs: opts.turnMs ?? TURN,
    disconnectGraceMs: 30_000,
    rng: opts.rng ?? zeroRng,
    onChange,
    learnWord: (word, by) => {
      learned.push({ word, by });
      if (!dict.add(word)) dict.en?.add(word);
    },
    onFinish: (info) => finishes.push(info),
  });
  const ids = names.map((n) => {
    const r = room.addPlayer(n);
    if (!r.ok) throw new Error(r.error);
    return r.playerId;
  });
  return { room, ids, onChange, dict, learned, finishes };
}

export const wc = (room: Room) => room.toPublic().game as WordChainView;
export const bc = (room: Room) => room.toPublic().game as BauCuaView;
export const submit = (room: Room, id: string, word: string) => room.action(id, { type: 'submit', word });

/** Bắt đầu ván Nối từ với từ mở đầu cố định */
export function startWordChain(room: Room, hostId: string, word: string) {
  const dict = (room as unknown as { dict: Dictionary }).dict;
  const target = room.gameType === 'wordchain_en' ? (dict.en ?? dict) : dict;
  vi.spyOn(target, 'randomStart').mockReturnValueOnce(word);
  const r = room.start(hostId);
  if (!r.ok) throw new Error(r.error);
}
