import type { CharacterConfig } from './types';

/**
 * 26 chân dung mẫu cho chỉ số avatar của tài khoản (0..25; 0..15 là bộ gốc); server và app dùng chung để người khác thấy đúng mặt bạn đã chọn.
 * Mỗi mẫu đã đeo một món phụ kiện "lầy" để mặt mặc định đã buồn cười.
 * Người chơi chưa tự chọn nhân vật/ảnh thì mọi nơi đều vẽ đúng chân dung này.
 */
export const AVATAR_PRESETS: readonly CharacterConfig[] = [
  { gender: 'nam', age: 'tre', hair: 'han', color: 1, accessory: 'kinhden', skin: 1, face: 'xoan', build: 'vua', look: { mouth: 'cuoirang', browshape: 'ngang', nose: 'ro' } },
  { gender: 'nu', age: 'tre', hair: 'dai', color: 7, accessory: 'bangdo', skin: 3, face: 'tron', build: 'gay', eyes: 'to', brows: 'lieu', look: { mouth: 'cuoitu', liner: 'co', earring: 'hoa', maphan: 'co' } },
  { gender: 'nam', age: 'nhi', hair: 'dinh', color: 3, accessory: 'muihe', skin: 0, face: 'bau', build: 'mum', eyes: 'hip', look: { mouth: 'cuoitu', cheek: 'phinh' } },
  { gender: 'nu', age: 'nhi', hair: 'buicu', color: 5, accessory: 'taitho', skin: 2, face: 'ovalngan', build: 'vua', brows: 'ray', look: { mouth: 'he', babyhair: 'co' } },
  { gender: 'nam', age: 'trung', hair: 'undercut', color: 2, accessory: 'ria', skin: 4, face: 'vuong', build: 'khoe', eyes: 'motmi', look: { jaw: 'ro', chin: 'rong', rauham: 'vua' } },
  { gender: 'nu', age: 'trung', hair: 'ngan', color: 4, accessory: 'prideghim', skin: 8, face: 'nhon', build: 'gay', brows: 'lieu', look: { mouth: 'khep', liner: 'co', earring: 'da' } },
  { gender: 'nam', age: 'lao', hair: 'ngan', color: 0, accessory: 'raukem', skin: 5, face: 'dai', build: 'gay', eyes: 'hip', brows: 'ray', look: { nepcuoi: 'co', raucam: 'vua', nose: 'ro' } },
  { gender: 'nu', age: 'lao', hair: 'bui', color: 6, accessory: 'nonla', skin: 9, face: 'oval', build: 'mum', look: { nepcuoi: 'co', mouth: 'cuoirang', cheek: 'day' } },
  { gender: 'khac', age: 'tre', hair: 'highlight', color: 4, accessory: 'nonbh', skin: 10, face: 'ovalvuong', build: 'vua', eyes: 'to', look: { tilt: 'trai', mouth: 'cuoirang', tattoo: 'co', tattooside: 'trai' } },
  { gender: 'nu', age: 'tre', hair: 'xoan', color: 3, accessory: 'mahong', skin: 6, face: 'ovaldai', build: 'mum', brows: 'lieu', look: { lipcolor: 'do', lipthick: 'day', mouth: 'cuoitu' } },
  { gender: 'nam', age: 'tre', hair: 'mohican', color: 5, accessory: 'bangcanhan', skin: 7, face: 'vuong', build: 'khoe', eyes: 'motmi', brows: 'ray', look: { jaw: 'ro', ria: 'manh', tattoo: 'co', tattoosize: 'vaibap' } },
  { gender: 'nu', age: 'tre', hair: 'han', color: 2, accessory: 'kinhden', skin: 1, face: 'xoan', build: 'vua', look: { haircolor: 'nau', part: 'lech', mouth: 'khep' } },
  { gender: 'nam', age: 'trung', hair: 'nam', color: 0, accessory: 'troc', skin: 4, face: 'tron', build: 'mum', eyes: 'hip', look: { cheek: 'phinh', chin: 'bo', mouth: 'cuoitu' } },
  { gender: 'khac', age: 'nhi', hair: 'maibang', color: 7, accessory: 'bangdo', skin: 2, face: 'nhon', build: 'gay', eyes: 'to', brows: 'lieu', look: { gaze: 'phai', mouth: 'he' } },
  { gender: 'nam', age: 'nhi', hair: 'afro', color: 6, accessory: 'bangcanhan', skin: 5, face: 'bau', build: 'mum', look: { volume: 'cao', mouth: 'cuoirang' } },
  { gender: 'khac', age: 'trung', hair: 'buicu', color: 1, accessory: 'ria', skin: 0, face: 'dai', build: 'vua', eyes: 'motmi', brows: 'ray', look: { asym: 'co', gaze: 'trai' } },
  // 16..25: 10 nhân vật hài chất meme do Xóm Lầy tự sáng tác, không dựa trên người thật nào
  {
    gender: 'nu', age: 'trung', hair: 'buocthap', color: 7, accessory: 'none', outfit: 'beo', detail: 'notruoi',
    skin: 2, face: 'ovaldai', build: 'vua', eyes: 'to', brows: 'lieu',
    look: { liner: 'co', lipcolor: 'do', lipthick: 'day', mouth: 'he', earring: 'da', ring: 'hoa', watch: 'bac', maphan: 'co', babyhair: 'co', molepos: 'moi', tilt: 'phai', pose: 'chumnguc' },
  },
  {
    gender: 'nam', age: 'tre', hair: 'chaingoc', color: 5, accessory: 'muihe', outfit: 'aohoa', detail: 'ranghe',
    skin: 3, face: 'ovalvuong', build: 'vua', eyes: 'to',
    look: { browshape: 'gap', browthick: 'day', mouth: 'cuoitu', asym: 'co', gaze: 'trai', volume: 'cao', nepcuoi: 'co', tilt: 'trai' },
  },
  {
    gender: 'nu', age: 'trung', hair: 'bui', color: 0, accessory: 'nonla', outfit: 'dayvang', detail: 'notruoi',
    skin: 6, face: 'ovalngan', build: 'mum', eyes: 'motmi', brows: 'ray',
    look: { jaw: 'ro', cheek: 'go', browshape: 'gap', browthick: 'day', mouth: 'he', nostril: 'rong', earring: 'hoa', glove: 'co', molepos: 'ma' },
  },
  {
    gender: 'nam', age: 'nhi', hair: 'nam', color: 3, accessory: 'mahong', outfit: 'thun', detail: 'tannhang',
    skin: 4, face: 'bau', build: 'mum', eyes: 'hip',
    look: { cheek: 'phinh', chin: 'bo', neck: 'day', mouth: 'cuoitu', nosetip: 'day', outfitcolor: 'xanhrung' },
  },
  {
    gender: 'nam', age: 'trung', hair: 'dungchom', color: 2, accessory: 'none', outfit: 'balden', detail: 'longmay',
    skin: 7, face: 'vuong', build: 'khoe', brows: 'ray',
    look: { jaw: 'ro', chin: 'rong', neck: 'day', ria: 'vua', raucam: 'vua', rauham: 'vua', mouth: 'cuoirang', tattoo: 'co', tattoosize: 'vaibap', tattooside: 'trai', watch: 'toi' },
  },
  {
    gender: 'nam', age: 'tre', hair: 'vuotlech', color: 1, accessory: 'bangcanhan', outfit: 'dongphuc', detail: 'tannhang',
    skin: 1, face: 'dai', build: 'gay', eyes: 'hip',
    look: { eyeshape: 'nho', open: 'tru', gaze: 'phai', part: 'lech', volume: 'cao', haircolor: 'nau', mouth: 'khep', tilt: 'trai' },
  },
  {
    gender: 'nam', age: 'tre', hair: 'undercut', color: 4, accessory: 'kinhden', outfit: 'somi', detail: 'malum',
    skin: 0, face: 'nhon', build: 'vua',
    look: { jaw: 'ro', sides: 'sat', volume: 'cao', ria: 'manh', raucam: 'manh', mouth: 'cuoirang', watch: 'bac', tattoo: 'co', tattooside: 'phai', pose: 'chongcam' },
  },
  {
    gender: 'nam', age: 'lao', hair: 'dinh', color: 6, accessory: 'nonbh', outfit: 'aomua', detail: 'longmay',
    skin: 8, face: 'oval', build: 'gay', eyes: 'motmi', brows: 'ray',
    look: { nepcuoi: 'co', ria: 'vua', raucam: 'manh', nose: 'ro', nostril: 'rong', mouth: 'khep' },
  },
  {
    gender: 'nu', age: 'tre', hair: 'maibang', color: 2, accessory: 'taitho', outfit: 'dobo', detail: 'malum',
    skin: 2, face: 'tron', build: 'mum', eyes: 'hip', brows: 'lieu',
    look: { open: 'nheo', cheek: 'phinh', babyhair: 'co', mouth: 'he', maphan: 'co' },
  },
  {
    gender: 'lgbt', age: 'tre', hair: 'dailung', color: 6, accessory: 'pridetoc', outfit: 'vestbong', detail: 'notruoi',
    skin: 5, face: 'xoan', build: 'vua',
    look: { haircolor: 'highlight', liner: 'co', lipcolor: 'cam', mouth: 'cuoitu', earring: 'da', molepos: 'cam', tilt: 'phai' },
  },
];

/** Tên gọi của từng chân dung mẫu (cho chú thích) */
export const AVATAR_PRESET_NAMES: readonly string[] = [
  'Anh Kính Đen', 'Nàng Băng Đô', 'Cu Mũi Hề', 'Bé Tai Thỏ', 'Chú Ria', 'Chị Khẩu Trang', 'Ông Râu Kẽm', 'Bà Nón Lá',
  'Bạn Nón Bảo Hiểm', 'Cô Má Hồng', 'Cậu Băng Cá Nhân', 'Chị Kính Đen', 'Sếp Đầu Trọc', 'Nàng Băng Đô 2', 'Cu Sẹo', 'Chú Ria Đẹp Trai',
  'Bà Trùm Livestream', 'Danh Hài Mặt Lầy', 'Chị Đại Chợ', 'Thánh Ăn', 'Ông Chú Nhậu', 'Học Sinh Trốn Học', 'Dân Chơi Phố Cổ', 'Bác Xe Ôm',
  'Chúa Ngủ Nướng', 'Idol Cầu Vồng',
];
