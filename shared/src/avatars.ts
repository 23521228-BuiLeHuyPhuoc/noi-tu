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
  // 16..25: 10 nhân vật thực tế & idol mạng đặc sắc (Cô Phương Hằng, Chị Phiến, Thầy Huấn, Khá Bảnh, Lộc Fuho, Bà Tân Vlog, Thông Soái Ca...)
  {
    // 16: Cô Phương Hằng — áo trắng cổ bèo, tóc buộc thấp có tóc con, bông tai kim cương to, nhẫn hoa kim cương, đồng hồ bạc, hai tay đan trước ngực
    gender: 'nu', age: 'trung', hair: 'buocthap', color: 7, accessory: 'none', outfit: 'beo', detail: 'notruoi',
    skin: 1, face: 'ovaldai', build: 'vua', eyes: 'to', brows: 'lieu',
    look: {
      liner: 'co', lipcolor: 'do', lipthick: 'day', mouth: 'he',
      earring: 'da', ring: 'hoa', watch: 'bac',
      maphan: 'co', nepcuoi: 'co', babyhair: 'co', molepos: 'moi',
      nose: 'ro', volume: 'cao', tilt: 'phai', pose: 'chumnguc',
    },
  },
  {
    // 17: Chị Phiến — tóc chải ngược phồng cao + lọn xoăn gáy, áo thun xanh rừng, găng tay nilon trong suốt, bông tai hoa, nốt ruồi má, nụ cười đặc trưng
    gender: 'nu', age: 'tre', hair: 'chaingoc', color: 2, accessory: 'none', outfit: 'thun', detail: 'notruoi',
    skin: 3, face: 'ovalvuong', build: 'vua', eyes: 'to', brows: 'ray',
    look: {
      jaw: 'ro', cheek: 'go', browshape: 'gap', browthick: 'vua', liner: 'co',
      mouth: 'cuoirang', lipcolor: 'cam', lipthick: 'duoi',
      asym: 'co', gaze: 'trai', volume: 'cao', babyhair: 'co', haircolor: 'nauden',
      outfitcolor: 'xanhrung', glove: 'co', earring: 'hoa', molepos: 'ma',
      nose: 'ro', tilt: 'trai', pose: 'chongcam',
    },
  },
  {
    // 18: Thầy Huấn Hoa Hồng — tóc vuốt lệch undercut sát 2 bên, sơ mi trắng mở cổ, kính đen, đồng hồ bạc, nhẫn kim cương, hình xăm, tay chống cằm giảng đạo lý
    gender: 'nam', age: 'trung', hair: 'vuotlech', color: 3, accessory: 'kinhden', outfit: 'somi', detail: 'malum',
    skin: 2, face: 'vuong', build: 'khoe', eyes: 'macdinh', brows: 'ray',
    look: {
      jaw: 'ro', sides: 'sat', volume: 'cao', part: 'lech',
      ria: 'manh', raucam: 'manh', mouth: 'cuoirang', nose: 'ro',
      watch: 'bac', ring: 'hoa', tattoo: 'co', tattoosize: 'vaibap', tattooside: 'phai',
      pose: 'chongcam',
    },
  },
  {
    // 19: Khá Bảnh Múa Quạt — tóc bờm ngựa mohican dựng cao, áo hoa sặc sỡ, băng cá nhân, hình xăm bắp tay, khoanh tay cực ngầu
    gender: 'nam', age: 'tre', hair: 'mohican', color: 5, accessory: 'bangcanhan', outfit: 'aohoa', detail: 'longmay',
    skin: 4, face: 'nhon', build: 'vua', eyes: 'to', brows: 'ray',
    look: {
      jaw: 'ro', browshape: 'gap', browthick: 'day', mouth: 'cuoirang',
      volume: 'cao', sides: 'sat', tattoo: 'co', tattoosize: 'vaibap', tattooside: 'trai',
      watch: 'toi', pose: 'baochan',
    },
  },
  {
    // 20: Lộc Fuho — phụ hồ chân chất, tóc đinh dựng chỏm, áo ba lỗ đen khoét sâu, da rám nắng khỏe khoắn, râu ria, đồng hồ thể thao đen
    gender: 'nam', age: 'trung', hair: 'dungchom', color: 1, accessory: 'none', outfit: 'balden', detail: 'longmay',
    skin: 7, face: 'vuong', build: 'khoe', brows: 'ray',
    look: {
      jaw: 'ro', chin: 'rong', neck: 'day',
      ria: 'vua', raucam: 'vua', rauham: 'vua',
      mouth: 'cuoirang', nose: 'ro', nostril: 'rong',
      tattoo: 'co', tattoosize: 'vaibap', tattooside: 'trai', watch: 'toi', pose: 'baochan',
    },
  },
  {
    // 21: Bà Tân Vlog — nón lá truyền thống, áo bà ba chấm bi, tóc búi, nụ cười hiền hậu siu to khổng lồ
    gender: 'nu', age: 'lao', hair: 'bui', color: 6, accessory: 'nonla', outfit: 'dobo', detail: 'notruoi',
    skin: 8, face: 'ovalngan', build: 'gay', eyes: 'hip', brows: 'macdinh',
    look: {
      nepcuoi: 'co', cheek: 'go', mouth: 'cuoirang',
      nose: 'ro', nostril: 'rong', earring: 'hoa', molepos: 'cam', pose: 'chumnguc',
    },
  },
  {
    // 22: Thông Soái Ca — tóc highlight vàng rực, kính râm đen, dây chuyền vàng to bản, răng khểnh thương hiệu "những thằng khác ngại tán em..."
    gender: 'nam', age: 'tre', hair: 'highlight', color: 4, accessory: 'kinhden', outfit: 'dayvang', detail: 'ranghe',
    skin: 6, face: 'dai', build: 'gay', eyes: 'hip', brows: 'ray',
    look: {
      jaw: 'ro', chin: 'nho', browshape: 'gap', mouth: 'cuoirang',
      haircolor: 'highlight', volume: 'cao', ria: 'manh',
      watch: 'bac', ring: 'hoa', tilt: 'trai', pose: 'chongcam',
    },
  },
  {
    // 23: Chị Đại Chợ Lớn — tóc xoăn bồng bềnh, dây chuyền vàng + nhẫn kim cương + khuyên tai hoa vàng, môi đỏ mọng
    gender: 'nu', age: 'trung', hair: 'xoan', color: 0, accessory: 'mahong', outfit: 'dayvang', detail: 'notruoi',
    skin: 3, face: 'tron', build: 'mum', eyes: 'motmi', brows: 'lieu',
    look: {
      cheek: 'day', browshape: 'cong', liner: 'co',
      lipcolor: 'do', lipthick: 'day', mouth: 'he',
      earring: 'hoa', ring: 'hoa', watch: 'bac', maphan: 'co', molepos: 'moi', pose: 'chongcam',
    },
  },
  {
    // 24: Thánh Mukbang — má phính hồng hào, tóc nấm, đeo găng tay nilon chuẩn bị chén sạch bàn tiệc
    gender: 'nam', age: 'tre', hair: 'nam', color: 5, accessory: 'mahong', outfit: 'dongphuc', detail: 'tannhang',
    skin: 1, face: 'bau', build: 'mum', eyes: 'to',
    look: {
      cheek: 'phinh', chin: 'bo', neck: 'day',
      mouth: 'cuoirang', lipcolor: 'cam', lipthick: 'day', nosetip: 'tron',
      glove: 'co', pose: 'chumnguc',
    },
  },
  {
    // 25: Idol Cầu Vồng — tóc dài highlight + mảng tóc cầu vồng, vest bóng sang chảnh, khuyên tai kim cương lấp lánh
    gender: 'lgbt', age: 'tre', hair: 'dailung', color: 6, accessory: 'pridetoc', outfit: 'vestbong', detail: 'notruoi',
    skin: 2, face: 'xoan', build: 'vua', eyes: 'to', brows: 'lieu',
    look: {
      haircolor: 'highlight', liner: 'co', lipcolor: 'do', lipthick: 'day', mouth: 'cuoitu',
      earring: 'da', ring: 'hoa', maphan: 'co', babyhair: 'co', molepos: 'ma', tilt: 'phai', pose: 'chongcam',
    },
  },
];

/** Tên gọi của từng chân dung mẫu (cho chú thích) */
export const AVATAR_PRESET_NAMES: readonly string[] = [
  'Anh Kính Đen', 'Nàng Băng Đô', 'Cu Mũi Hề', 'Bé Tai Thỏ', 'Chú Ria', 'Chị Cài Áo', 'Ông Râu Kẽm', 'Bà Nón Lá',
  'Phượt Thủ Nón Sơn', 'Cô Má Hồng', 'Giang Hồ Băng Keo', 'Chị Kính Râm', 'Sếp Đầu Trọc', 'Bé Mái Bằng', 'Cu Tóc Xù', 'Chú Ria Lệch',
  'Cô Phương Hằng', 'Chị Phiến', 'Thầy Huấn', 'Khá Bảnh', 'Lộc Fuho', 'Bà Tân Vlog', 'Thông Soái Ca', 'Chị Đại Chợ Lớn',
  'Thánh Mukbang', 'Idol Cầu Vồng',
];
