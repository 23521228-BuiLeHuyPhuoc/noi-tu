import type { CharacterConfig } from './types';

/**
 * 16 chân dung mẫu cho chỉ số avatar của tài khoản (0..15); server và app dùng chung để người khác thấy đúng mặt bạn đã chọn.
 * Mỗi mẫu đã đeo một món phụ kiện "lầy" để mặt mặc định đã buồn cười.
 * Người chơi chưa tự chọn nhân vật/ảnh thì mọi nơi đều vẽ đúng chân dung này.
 */
export const AVATAR_PRESETS: readonly CharacterConfig[] = [
  { gender: 'nam', age: 'tre', hair: 'han', color: 1, accessory: 'kinhden' },
  { gender: 'nu', age: 'tre', hair: 'dai', color: 7, accessory: 'bangdo' },
  { gender: 'nam', age: 'nhi', hair: 'ngan', color: 3, accessory: 'muihe' },
  { gender: 'nu', age: 'nhi', hair: 'bui', color: 5, accessory: 'taitho' },
  { gender: 'nam', age: 'trung', hair: 'undercut', color: 2, accessory: 'ria' },
  { gender: 'nu', age: 'trung', hair: 'ngan', color: 4, accessory: 'khautrang' },
  { gender: 'nam', age: 'lao', hair: 'ngan', color: 0, accessory: 'raukem' },
  { gender: 'nu', age: 'lao', hair: 'bui', color: 6, accessory: 'nonla' },
  { gender: 'khac', age: 'tre', hair: 'xoan', color: 4, accessory: 'nonbh' },
  { gender: 'nu', age: 'tre', hair: 'xoan', color: 3, accessory: 'mahong' },
  { gender: 'nam', age: 'tre', hair: 'undercut', color: 5, accessory: 'bangcanhan' },
  { gender: 'nu', age: 'tre', hair: 'han', color: 2, accessory: 'kinhden' },
  { gender: 'nam', age: 'trung', hair: 'han', color: 0, accessory: 'troc' },
  { gender: 'khac', age: 'nhi', hair: 'dai', color: 7, accessory: 'bangdo' },
  { gender: 'nam', age: 'nhi', hair: 'xoan', color: 6, accessory: 'bangcanhan' },
  { gender: 'khac', age: 'trung', hair: 'bui', color: 1, accessory: 'ria' },
];

