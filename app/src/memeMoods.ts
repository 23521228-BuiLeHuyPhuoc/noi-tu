import type { MemeId, MemePoolKey } from './audioAssets';

/**
 * Nhóm câu tương đồng: các câu cùng nhóm thay thế được cho nhau.
 * Mỗi hành động trong game (MemePoolKey) lấy ngẫu nhiên từ một hoặc vài nhóm,
 * nên cùng một hành động sẽ không cứ phát lại đúng một câu.
 */
export type MemeMood =
  | 'greet'
  | 'ready'
  | 'brag'
  | 'laugh'
  | 'chill'
  | 'rich'
  | 'broke'
  | 'gift'
  | 'sad'
  | 'flop'
  | 'panic'
  | 'plea'
  | 'shock'
  | 'danger'
  | 'taunt'
  | 'threat'
  | 'accuse'
  | 'excuse'
  | 'mercy'
  | 'saved'
  | 'out'
  | 'twist'
  | 'hurry';

export const MOOD_LABELS: Record<MemeMood, string> = {
  greet: 'Chào sân',
  ready: 'Vào lượt / Ra tay',
  brag: 'Gáy / Tự tin',
  laugh: 'Cười / Tấu hài',
  chill: 'Hóng chuyện',
  rich: 'Tiền về',
  broke: 'Cháy túi',
  gift: 'Quà / Tình cảm',
  sad: 'Buồn / Khóc',
  flop: 'Quê / Hụt / Nhầm',
  panic: 'Cứu / Hoảng / Đau',
  plea: 'Bí / Nhờ giúp',
  shock: 'Sốc / Bất ngờ',
  danger: 'Căng / Sắp có biến',
  taunt: 'Cà khịa',
  threat: 'Gắt / Đe dọa',
  accuse: 'Tố / Bắt bài',
  excuse: 'Biện minh',
  mercy: 'Tha / Hòa giải',
  saved: 'Thoát nạn',
  out: 'Bay màu / Tạm biệt',
  twist: 'Lật kèo',
  hurry: 'Hối',
};

/**
 * Không tự phát trong ván (quá gắt hoặc chửi đích danh người thật);
 * vẫn nghe được trong bảng âm thanh.
 */
export const PREVIEW_ONLY_MEMES: readonly MemeId[] = [
  'linda_khongchameday',
  'coba_bebe',
  'coba_damnha',
  'coba_minhhieu_chui',
  'coba_trinhphen',
];

export const MEME_MOODS: Record<MemeMood, readonly MemeId[]> = {
  greet: [
    'linda_chao', 'linda_trolai', 'linda_buoitoivuive', 'linda_emquaday', 'linda_toasang',
    'minhhieu_khoe', 'minhhieu_maccuoi', 'minhhieu_lubu',
    'phuonghang_motminhtao', 'phuonghang_50tuoi', 'phuonghang_kimcuong',
    'chiphien_chitoitiec', 'chiphien_hoahau', 'chiphien_depxuatsac',
    'coba_muonchoi', 'coba_buoccungchan', 'coba_totote',
    'kyduyen_thigio_giacmo', 'kyduyen_dubanlinh', 'kyduyen_tinchinhminh',
  ],
  ready: [
    'linda_xuongnuiquay', 'linda_emquaday', 'linda_toasang', 'linda_level',
    'minhhieu_duongquyen', 'minhhieu_tiendohay', 'minhhieu_camtiendo_dq', 'minhhieu_lubu',
    'phuonghang_motminhtao', 'phuonghang_chuabaogiobochay', 'phuonghang_dunglacham', 'phuonghang_kimcuong',
    'chiphien_chitoitiec', 'chiphien_nhinchidi', 'chiphien_hoahau', 'chiphien_depxuatsac',
    'coba_buoccungchan', 'coba_muonchoi', 'coba_totote', 'coba_giangho',
    'kyduyen_dubanlinh', 'kyduyen_tinchinhminh', 'kyduyen_thigio_giacmo',
    'vn_toicongchuyen',
  ],
  brag: [
    'linda_dangcap', 'linda_toasang', 'linda_level',
    'minhhieu_matphoiphoi', 'minhhieu_tiendohay', 'minhhieu_nganruoido', 'minhhieu_khoe',
    'phuonghang_chanly', 'phuonghang_kimcuong', 'phuonghang_motminhtao', 'phuonghang_thanhcong', 'phuonghang_50tuoi',
    'chiphien_depxuatsac', 'chiphien_taividepqua', 'chiphien_xinhdep', 'chiphien_capdoimanh', 'chiphien_bonghong',
    'coba_futani', 'coba_phenguoigiau', 'coba_saucannha',
    'kyduyen_thanhtuu', 'kyduyen_vuotquakhokhan', 'kyduyen_dubanlinh', 'kyduyen_tinchinhminh', 'kyduyen_karen_danong',
  ],
  laugh: [
    'linda_maccuoi',
    'minhhieu_maccuoi',
    'chiphien_hoahauphukhoa', 'chiphien_sochongboss',
    'coba_dethuong', 'coba_totote',
  ],
  chill: [
    'linda_uongnuocmia', 'linda_buoitoivuive',
    'minhhieu_lubu', 'minhhieu_khoe',
    'phuonghang_tinhhinh', 'phuonghang_khonhon', 'phuonghang_50tuoi',
    'chiphien_maydien',
    'coba_buoccungchan',
    'kyduyen_giacmohong', 'kyduyen_nguhaitieng', 'kyduyen_karen_danong',
  ],
  rich: [
    'linda_dangcap', 'linda_emquaday', 'linda_toasang',
    'minhhieu_1000do', 'minhhieu_10trieu', 'minhhieu_nganruoido', 'minhhieu_tientuoi', 'minhhieu_tiendo_quat',
    'minhhieu_tiendomat', 'minhhieu_matphoiphoi', 'minhhieu_lubu', 'minhhieu_khoe',
    'phuonghang_thanhcong', 'phuonghang_tienphuongtien', 'phuonghang_kimcuong',
    'chiphien_30ty', 'chiphien_taisancuachi', 'chiphien_villa', 'chiphien_miengdat', 'chiphien_odaumaxai', 'chiphien_khongvon',
    'coba_futani', 'coba_saucannha', 'coba_phenguoigiau',
    'kyduyen_karen_danong', 'kyduyen_tuconsoam', 'kyduyen_dubanlinh',
  ],
  broke: [
    'linda_que', 'linda_cuutoibacon', 'linda_banoi',
    'minhhieu_muonkhoc', 'minhhieu_rotmuocmat', 'minhhieu_hoihan',
    'phuonghang_luadao', 'phuonghang_tienphuongtien', 'phuonghang_dosup',
    'chiphien_khongbannua_chet', 'chiphien_30ty', 'chiphien_aiepmay',
    'coba_khongguitien', 'coba_luchongheo', 'coba_giadinhtannat',
    'kyduyen_tuconsoam', 'kyduyen_amanh', 'kyduyen_khonghoitiec',
    'vn_hettien', 'tienbip_cainit',
  ],
  gift: [
    'linda_emquaday', 'linda_thaloi',
    'minhhieu_10trieu', 'minhhieu_1000do', 'minhhieu_tienchicho', 'minhhieu_tientuoi',
    'phuonghang_tienphuongtien', 'phuonghang_kimcuong',
    'chiphien_miengdat', 'chiphien_villa', 'chiphien_taisancuachi', 'chiphien_bonghong',
    'coba_dethuong', 'coba_saucannha', 'coba_futani',
    'kyduyen_loingonngot', 'kyduyen_karen_danong',
  ],
  sad: [
    'linda_que',
    'minhhieu_muonkhoc', 'minhhieu_rotmuocmat', 'minhhieu_hoihan',
    'phuonghang_quantutrathu', 'phuonghang_haoquang',
    'chiphien_metlamroi', 'chiphien_aiepmay', 'chiphien_khonlamkeme', 'chiphien_khongbannua_chet',
    'coba_thuamaythuan', 'coba_giadinhtannat', 'coba_banchetroi',
    'kyduyen_amanh', 'kyduyen_khonghoitiec', 'kyduyen_nguhaitieng',
  ],
  flop: [
    'linda_que', 'linda_hongnho', 'linda_ecaijztroi', 'linda_airanh',
    'minhhieu_hoihan', 'minhhieu_conquyxao', 'minhhieu_rotmuocmat',
    'phuonghang_thayvay', 'phuonghang_haoquang', 'phuonghang_trongcuoc', 'phuonghang_luadao',
    'chiphien_loilam', 'chiphien_kholam', 'chiphien_ke_trithuc_do', 'chiphien_khonlamkeme',
    'coba_batphelon', 'coba_thuamaythuan', 'coba_giadinhtannat',
    'kyduyen_khongmakesure', 'kyduyen_khonghoitiec', 'kyduyen_tinchinhminh',
  ],
  panic: [
    'linda_cuutoibacon', 'linda_meoicuucon', 'linda_banoi',
    'minhhieu_cuutoi', 'minhhieu_soqua', 'minhhieu_muonkhoc',
    'phuonghang_nguyhiem', 'phuonghang_tinhhinh', 'phuonghang_ngongang',
    'chiphien_metlamroi', 'chiphien_maydien', 'chiphien_khongbannua_chet',
    'coba_giadinhtannat', 'coba_banchetroi', 'coba_chaygiet',
    'kyduyen_amanh', 'kyduyen_nongsau_lanh',
  ],
  plea: [
    'linda_hongnho',
    'phuonghang_trongcuoc',
    'chiphien_kholam',
    'kyduyen_khongmakesure',
  ],
  shock: [
    'linda_banoi', 'linda_ecaijztroi', 'linda_dohamcau',
    'minhhieu_soqua', 'minhhieu_tinhlai', 'minhhieu_cuutoi',
    'phuonghang_ngongang', 'phuonghang_luadao',
    'chiphien_maydien', 'chiphien_odaumaxai', 'chiphien_chinhquyenbat',
    'kyduyen_nongsau_lanh', 'kyduyen_amanh',
    'vn_vineboom', 'vn_amongus',
  ],
  danger: [
    'linda_moimocra',
    'minhhieu_duongquyen',
    'phuonghang_nguyhiem', 'phuonghang_tinhhinh',
    'chiphien_chinhquyenbat',
    'coba_ngaychon', 'coba_quatbatieu', 'coba_votungoi',
    'kyduyen_chacchanloai',
    'vn_toicongchuyen',
  ],
  taunt: [
    'linda_airanh', 'linda_botkhung', 'linda_level', 'linda_dohamcau', 'linda_khungdiensuunhi', 'linda_quanquedo_ban',
    'linda_ancutheo', 'linda_iaxochon', 'linda_emquaday', 'linda_chodegiatao', 'linda_maccuoi',
    'minhhieu_cadonhuquy', 'minhhieu_khungthichet', 'minhhieu_tiendo_quat',
    'phuonghang_connguo_nao', 'phuonghang_khonhon', 'phuonghang_laymayxuithem', 'phuonghang_chanhcho_ngu',
    'phuonghang_haoquang', 'phuonghang_tuongvay',
    'chiphien_kemay', 'chiphien_nhinchidi', 'chiphien_xinhdep', 'chiphien_khonlamkeme', 'chiphien_aiepmay',
    'coba_maylamenothienha', 'coba_nhinquancanh', 'coba_chitaimaychet', 'coba_phenguoigiau',
    'kyduyen_giacmohong', 'kyduyen_karen_danong', 'kyduyen_dubanlinh',
    'vn_fartmic', 'vn_batngochua',
  ],
  threat: [
    'linda_namdauquay', 'linda_xuongnuiquay',
    'minhhieu_duongquyen', 'minhhieu_camtiendo_dq',
    'phuonghang_cangchuicangdien', 'phuonghang_taophaimatday', 'phuonghang_dunglacham', 'phuonghang_dosup',
    'chiphien_xetda8cai', 'chiphien_lendonchet',
    'coba_luocmay', 'coba_giangho', 'coba_chedauchetme', 'coba_quatbatieu', 'coba_ngaychon', 'coba_votungoi',
    'kyduyen_chacchanloai',
  ],
  accuse: [
    'linda_moimocra', 'linda_chodegiatao', 'linda_retienthem',
    'minhhieu_conquyxao', 'minhhieu_duongquyen', 'minhhieu_khungthichet',
    'phuonghang_dungdien', 'phuonghang_luadao', 'phuonghang_chomochui', 'phuonghang_laokhongduoc',
    'phuonghang_voquytday', 'phuonghang_chanhcho_ngu',
    'chiphien_chinhquyenbat', 'chiphien_lendonchet', 'chiphien_xetda8cai',
    'coba_baxaobala', 'coba_ngaychon', 'coba_votungoi', 'coba_batphelon', 'coba_giangho',
    'kyduyen_chacchanloai', 'kyduyen_khongmakesure', 'kyduyen_giacmohong',
    'vn_toicongchuyen', 'vn_amongus',
  ],
  excuse: [
    'linda_hongnho', 'linda_thaloi', 'linda_uongnuocmia',
    'minhhieu_laytienche', 'minhhieu_lubu', 'minhhieu_conquyxao',
    'phuonghang_trongcuoc', 'phuonghang_thayvay', 'phuonghang_chuabaogiobochay', 'phuonghang_tuongvay',
    'chiphien_kholam', 'chiphien_loilam', 'chiphien_ke_trithuc_do',
    'coba_batphelon', 'coba_giadinhtannat', 'coba_buoccungchan',
    'kyduyen_khonghoitiec', 'kyduyen_khongmakesure', 'kyduyen_tinchinhminh', 'kyduyen_dubanlinh',
  ],
  mercy: [
    'linda_thaloi', 'linda_buoitoivuive',
    'minhhieu_maccuoi', 'minhhieu_tinhlai',
    'phuonghang_tubitritue', 'phuonghang_tuongvay',
    'chiphien_khonlamkeme', 'chiphien_kemay',
    'coba_mayimtaotha', 'coba_buoccungchan',
    'kyduyen_giamapluc', 'kyduyen_khonghoitiec',
    'linda_maccuoi', 'minhhieu_khoe', 'phuonghang_trongcuoc', 'chiphien_xinhdep', 'coba_dethuong', 'kyduyen_vuotquakhokhan',
  ],
  saved: [
    'linda_uongnuocmia', 'linda_maccuoi',
    'minhhieu_tinhlai', 'minhhieu_laytienche', 'minhhieu_khoe',
    'phuonghang_chuabaogiobochay', 'phuonghang_thayvay',
    'chiphien_xinhdep', 'chiphien_depxuatsac',
    'coba_dethuong', 'coba_buoccungchan',
    'kyduyen_giamapluc', 'kyduyen_vuotquakhokhan', 'kyduyen_thanhtuu',
  ],
  out: [
    'linda_cuutoibacon', 'linda_meoicuucon',
    'minhhieu_cuutoi',
    'phuonghang_chuabaogiobochay',
    'chiphien_dingu',
    'coba_banchetroi',
    'vn_vinhbietcu',
  ],
  twist: [
    'linda_ecaijztroi', 'linda_xuongnuiquay', 'linda_namdauquay',
    'minhhieu_tinhlai', 'minhhieu_laytienche', 'minhhieu_camtiendo_dq',
    'phuonghang_thayvay', 'phuonghang_tuongvay', 'phuonghang_ngongang', 'phuonghang_haoquang', 'phuonghang_voquytday',
    'chiphien_xetda8cai', 'chiphien_nhinchidi', 'chiphien_maydien',
    'coba_batphelon', 'coba_mayimtaotha', 'coba_ngaychon',
    'kyduyen_nongsau_lanh', 'kyduyen_tuconsoam', 'kyduyen_vuotquakhokhan',
    'vn_batngochua', 'vn_vineboom',
  ],
  hurry: [
    'linda_chicho', 'linda_airanh',
    'minhhieu_lubu', 'minhhieu_duongquyen',
    'phuonghang_taophaimatday', 'phuonghang_tinhhinh',
    'chiphien_maydien', 'chiphien_dingu',
    'coba_chaygiet', 'coba_muonchoi',
    'kyduyen_nguhaitieng', 'kyduyen_thigio_giacmo',
    'linda_botkhung', 'minhhieu_camtiendo_dq', 'phuonghang_khonhon', 'chiphien_aiepmay', 'coba_giangho', 'kyduyen_chacchanloai',
  ],
};

/** Mỗi hành động trong game lấy câu từ những nhóm nào. */
export const POOL_MOODS: Record<MemePoolKey, readonly MemeMood[]> = {
  welcome: ['greet'],
  turn_move: ['ready'],
  correct: ['brag', 'laugh'],
  wrong: ['flop'],
  win: ['brag', 'laugh'],
  lose: ['sad', 'flop'],
  money: ['rich'],
  broke: ['broke'],
  gift: ['gift'],
  gift_receive: ['gift', 'rich'],
  help: ['panic', 'plea'],
  hurry: ['hurry'],
  relief: ['saved'],
  troll: ['taunt', 'threat'],
  vote: ['accuse'],
  defense: ['excuse'],
  forgive: ['mercy'],
  eliminated: ['out', 'sad'],
  twist: ['twist'],
  bomb: ['panic', 'shock'],
  bite: ['panic'],
  shock: ['shock', 'danger'],
  chat_hype: ['laugh', 'chill'],
};

export function buildMemePools(): Record<MemePoolKey, readonly MemeId[]> {
  const blocked = new Set<MemeId>(PREVIEW_ONLY_MEMES);
  const pools = {} as Record<MemePoolKey, readonly MemeId[]>;
  for (const pool of Object.keys(POOL_MOODS) as MemePoolKey[]) {
    const ids = new Set<MemeId>();
    for (const mood of POOL_MOODS[pool]) {
      for (const id of MEME_MOODS[mood]) if (!blocked.has(id)) ids.add(id);
    }
    pools[pool] = [...ids];
  }
  return pools;
}
