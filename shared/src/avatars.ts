import type { CharacterConfig } from './types';

/**
 * 16 chân dung mẫu cho chỉ số avatar của tài khoản (0..15); server và app dùng chung để người khác thấy đúng mặt bạn đã chọn.
 * Người chơi chưa tự chọn nhân vật/ảnh thì mọi nơi đều vẽ đúng chân dung này.
 */
export const AVATAR_PRESETS: readonly CharacterConfig[] = [
  { gender: 'nam', age: 'tre', hair: 'han', color: 1 },
  { gender: 'nu', age: 'tre', hair: 'dai', color: 7 },
  { gender: 'nam', age: 'nhi', hair: 'ngan', color: 3 },
  { gender: 'nu', age: 'nhi', hair: 'bui', color: 5 },
  { gender: 'nam', age: 'trung', hair: 'undercut', color: 2 },
  { gender: 'nu', age: 'trung', hair: 'ngan', color: 4 },
  { gender: 'nam', age: 'lao', hair: 'ngan', color: 0 },
  { gender: 'nu', age: 'lao', hair: 'bui', color: 6 },
  { gender: 'khac', age: 'tre', hair: 'xoan', color: 4 },
  { gender: 'nu', age: 'tre', hair: 'xoan', color: 3 },
  { gender: 'nam', age: 'tre', hair: 'undercut', color: 5 },
  { gender: 'nu', age: 'tre', hair: 'han', color: 2 },
  { gender: 'nam', age: 'trung', hair: 'han', color: 0 },
  { gender: 'khac', age: 'nhi', hair: 'dai', color: 7 },
  { gender: 'nam', age: 'nhi', hair: 'xoan', color: 6 },
  { gender: 'khac', age: 'trung', hair: 'bui', color: 1 },
];

