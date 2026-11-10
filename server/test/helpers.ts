import { vi } from 'vitest';
import { Dictionary } from '../src/dictionary';
import { Room } from '../src/room';
import type { BauCuaView, LudoView, WordChainView } from '../../shared/src/types';

/** Kho từ nhỏ, đủ để dựng các tình huống. */
export const SMALL_WORDS = [
  'con mèo', 'mèo mướp', 'mướp đắng', 'đắng cay', 'cay đắng', 'cay nghiệt',
  'đồ đạc', 'đồ vật', 'vật lý', 'lý do', 'do dự', 'dự án', 'án mạng', 'mạng lưới',
  'hòa bình', 'bình yên', 'yên tâm', 'tâm sự', 'sự thật', 'thật thà',
  // "cụt lủn": không có từ nào bắt đầu bằng "lủn" -> ngõ cụt
  'mèo cụt', 'cụt lủn',
];

export function smallDict(words = SMALL_WORDS): Dictionary {
  return new Dictionary(words);
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
      dict.add(word);
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
export const ludo = (room: Room) => room.toPublic().game as LudoView;
export const bc = (room: Room) => room.toPublic().game as BauCuaView;
export const submit = (room: Room, id: string, word: string) => room.action(id, { type: 'submit', word });

/** Bắt đầu ván Nối từ với từ mở đầu cố định */
export function startWordChain(room: Room, hostId: string, word: string) {
  const dict = (room as unknown as { dict: Dictionary }).dict;
  vi.spyOn(dict, 'randomStart').mockReturnValueOnce(word);
  const r = room.start(hostId);
  if (!r.ok) throw new Error(r.error);
}
