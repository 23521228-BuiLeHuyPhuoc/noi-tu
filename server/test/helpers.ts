import { Dictionary } from '../src/dictionary';

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

/** rng cố định: luôn trả về 0 -> shuffle giữ gần nguyên thứ tự, randomStart lấy phần tử đầu hợp lệ */
export const zeroRng = () => 0;
