import type { CharacterConfig } from './types';

/**
 * 26 chân dung mẫu cho chỉ số avatar của tài khoản (0..25; 0..15 là bộ gốc); server và app dùng chung để người khác thấy đúng mặt bạn đã chọn.
 * Mỗi mẫu đã đeo một món phụ kiện "lầy" để mặt mặc định đã buồn cười.
 * Người chơi chưa tự chọn nhân vật/ảnh thì mọi nơi đều vẽ đúng chân dung này.
 */
export const AVATAR_PRESETS: readonly CharacterConfig[] = [
  { gender: 'nam', age: 'tre', hair: 'han', color: 1, accessory: 'kinhden', skin: 1, face: 'xoan', build: 'vua' },
  { gender: 'nu', age: 'tre', hair: 'dai', color: 7, accessory: 'bangdo', skin: 3, face: 'tron', build: 'gay', eyes: 'to', brows: 'lieu' },
  { gender: 'nam', age: 'nhi', hair: 'dinh', color: 3, accessory: 'muihe', skin: 0, face: 'bau', build: 'mum', eyes: 'hip' },
  { gender: 'nu', age: 'nhi', hair: 'buicu', color: 5, accessory: 'taitho', skin: 2, face: 'tron', build: 'vua', brows: 'ray' },
  { gender: 'nam', age: 'trung', hair: 'undercut', color: 2, accessory: 'ria', skin: 4, face: 'vuong', build: 'mum', eyes: 'motmi' },
  { gender: 'nu', age: 'trung', hair: 'ngan', color: 4, accessory: 'khautrang', skin: 1, face: 'nhon', build: 'gay', brows: 'lieu' },
  { gender: 'nam', age: 'lao', hair: 'ngan', color: 0, accessory: 'raukem', skin: 5, face: 'dai', build: 'gay', eyes: 'hip', brows: 'ray' },
  { gender: 'nu', age: 'lao', hair: 'bui', color: 6, accessory: 'nonla', skin: 2, face: 'xoan', build: 'mum' },
  { gender: 'khac', age: 'tre', hair: 'highlight', color: 4, accessory: 'nonbh', skin: 3, face: 'nhon', build: 'vua', eyes: 'to' },
  { gender: 'nu', age: 'tre', hair: 'xoan', color: 3, accessory: 'mahong', skin: 6, face: 'bau', build: 'mum', brows: 'lieu' },
  { gender: 'nam', age: 'tre', hair: 'mohican', color: 5, accessory: 'bangcanhan', skin: 7, face: 'vuong', build: 'gay', eyes: 'motmi', brows: 'ray' },
  { gender: 'nu', age: 'tre', hair: 'han', color: 2, accessory: 'kinhden', skin: 1, face: 'xoan', build: 'vua' },
  { gender: 'nam', age: 'trung', hair: 'nam', color: 0, accessory: 'troc', skin: 4, face: 'tron', build: 'mum', eyes: 'hip' },
  { gender: 'khac', age: 'nhi', hair: 'maibang', color: 7, accessory: 'bangdo', skin: 2, face: 'nhon', build: 'gay', eyes: 'to', brows: 'lieu' },
  { gender: 'nam', age: 'nhi', hair: 'afro', color: 6, accessory: 'bangcanhan', skin: 5, face: 'bau', build: 'mum' },
  { gender: 'khac', age: 'trung', hair: 'buicu', color: 1, accessory: 'ria', skin: 0, face: 'dai', build: 'vua', eyes: 'motmi', brows: 'ray' },
  // 16..25: nhân vật hài do Xóm Lầy tự nghĩ ra, không dựa trên người thật nào
  { gender: 'nu', age: 'trung', hair: 'dai', color: 7, accessory: 'kinhden', outfit: 'dayvang', skin: 2, face: 'nhon', build: 'gay', brows: 'lieu' },
  { gender: 'nam', age: 'tre', hair: 'afro', color: 5, accessory: 'muihe', outfit: 'aohoa', detail: 'ranghe', skin: 3, face: 'tron', build: 'vua', eyes: 'to' },
  { gender: 'nu', age: 'trung', hair: 'bui', color: 0, accessory: 'nonla', outfit: 'dayvang', detail: 'notruoi', skin: 5, face: 'bau', build: 'mum', eyes: 'motmi', brows: 'ray' },
  { gender: 'nam', age: 'nhi', hair: 'nam', color: 3, accessory: 'mahong', outfit: 'bala', detail: 'tannhang', skin: 4, face: 'bau', build: 'mum', eyes: 'hip' },
  { gender: 'nam', age: 'trung', hair: 'dinh', color: 2, accessory: 'ria', outfit: 'bala', detail: 'longmay', skin: 6, face: 'vuong', build: 'mum', brows: 'ray' },
  { gender: 'nam', age: 'tre', hair: 'highlight', color: 1, accessory: 'khautrang', outfit: 'dongphuc', detail: 'tannhang', skin: 1, face: 'dai', build: 'gay', eyes: 'hip' },
  { gender: 'nam', age: 'tre', hair: 'undercut', color: 4, accessory: 'kinhden', outfit: 'vestbong', skin: 0, face: 'nhon', build: 'vua' },
  { gender: 'nam', age: 'lao', hair: 'dinh', color: 6, accessory: 'nonbh', outfit: 'aomua', detail: 'longmay', skin: 7, face: 'vuong', build: 'gay', eyes: 'motmi', brows: 'ray' },
  { gender: 'nu', age: 'tre', hair: 'maibang', color: 2, accessory: 'taitho', outfit: 'dobo', detail: 'malum', skin: 2, face: 'tron', build: 'mum', eyes: 'hip', brows: 'lieu' },
  { gender: 'lgbt', age: 'tre', hair: 'dailung', color: 6, accessory: 'pridetoc', detail: 'notruoi', skin: 4, face: 'xoan', build: 'vua' },
];

/** Tên gọi của từng chân dung mẫu (cho chú thích) */
export const AVATAR_PRESET_NAMES: readonly string[] = [
  'Anh Kính Đen', 'Nàng Băng Đô', 'Cu Mũi Hề', 'Bé Tai Thỏ', 'Chú Ria', 'Chị Khẩu Trang', 'Ông Râu Kẽm', 'Bà Nón Lá',
  'Bạn Nón Bảo Hiểm', 'Cô Má Hồng', 'Cậu Băng Cá Nhân', 'Chị Kính Đen', 'Sếp Đầu Trọc', 'Nàng Băng Đô 2', 'Cu Sẹo', 'Chú Ria Đẹp Trai',
  'Bà Trùm Livestream', 'Danh Hài Mặt Lầy', 'Chị Đại Chợ', 'Thánh Ăn', 'Ông Chú Nhậu', 'Học Sinh Trốn Học', 'Dân Chơi Phố Cổ', 'Bác Xe Ôm',
  'Chúa Ngủ Nướng', 'Idol Cầu Vồng',
];
