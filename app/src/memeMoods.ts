import type { MemeId } from '../../shared/src/memes';

/** Các hành động trong game có kho meme riêng. */
export type MemePoolKey =
  | 'welcome'
  | 'turn_move'
  | 'correct'
  | 'wrong'
  | 'win'
  | 'lose'
  | 'money'
  | 'broke'
  | 'gift'
  | 'troll'
  | 'vote'
  | 'defense'
  | 'forgive'
  | 'eliminated'
  | 'twist'
  | 'bomb'
  | 'bite'
  | 'shock'
  | 'gift_receive' | 'help' | 'hurry' | 'relief'
  | 'chat_hype';

/**
 * Nhãn chi tiết cho từng câu (một câu có thể mang nhiều nhãn). Các nhãn được gom vào
 * 7 nhóm lớn (MEME_GROUPS) và mỗi hành động trong game lấy ngẫu nhiên từ một hoặc hai nhóm lớn,
 * nên hành động nào cũng dùng được phần lớn kho câu của giọng đang nói.
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
 * Không tự phát trong ván (quá gắt, chửi đích danh người thật, hoặc trùng tiếng câu khác);
 * vẫn nghe được trong bảng âm thanh.
 */
export const PREVIEW_ONLY_MEMES: readonly MemeId[] = [
  'linda_khongchameday',
  'coba_bebe',
  'coba_damnha',
  'coba_minhhieu_chui',
  'coba_trinhphen',
  // Trùng tiếng với câu khác cùng giọng (cắt chồng đoạn): giữ trong bảng nghe thử, không tự phát.
  'minhhieu_camtiendo_dq',
  'minhhieu_muonkhoc',
  'tranmy_mupruprup',
  'tranmy_maydienha',
  'tranmy_khungdeso',
];

export const MEME_MOODS: Record<MemeMood, readonly MemeId[]> = {
  greet: [
    'linda_chao', 'linda_trolai', 'linda_buoitoivuive', 'linda_emquaday', 'linda_toasang',
    'minhhieu_khoe', 'minhhieu_maccuoi', 'minhhieu_lubu',
    'phuonghang_motminhtao', 'phuonghang_50tuoi', 'phuonghang_kimcuong',
    'chiphien_chitoitiec', 'chiphien_hoahau', 'chiphien_depxuatsac',
    'coba_muonchoi', 'coba_totote',
    'phuonghang_emdepkhong',
    'minhhieu_chaomayanh', 'minhhieu_hellomayem', 'minhhieu_xinchaomaycon',
    'linda_batngocacban', 'linda_tinhyeucuatrinh', 'linda_chaomungamthuc',
    'coba_nuoctuban', 
    'coba_buoccungchan', 'coba_cogapma', 'coba_bahoangbachua',
    'tranmy_moithisinh', 'tranmy_thatim', 'tranmy_tatfilter', 'tranmy_toilatranmy',
  ],
  ready: [
    'linda_xuongnuiquay', 'linda_emquaday', 'linda_toasang', 'linda_level',
    'minhhieu_duongquyen', 'minhhieu_tiendohay', 'minhhieu_camtiendo_dq', 'minhhieu_lubu',
    'phuonghang_motminhtao', 'phuonghang_chuabaogiobochay', 'phuonghang_dunglacham', 'phuonghang_kimcuong',
    'chiphien_chitoitiec', 'chiphien_nhinchidi', 'chiphien_hoahau', 'chiphien_depxuatsac',
    'coba_muonchoi', 'coba_totote', 
    'vn_toicongchuyen',
    'phuonghang_khonggikhongthe', 'phuonghang_lieugan', 'phuonghang_lamchucuocchoi', 'phuonghang_choiluon',
    'chiphien_xutoido',
    'linda_daynaucanh',
    'coba_cahatchovui',
    'coba_buoccungchan', 'coba_choidi',
    'tranmy_moithisinh', 'tranmy_thatim', 'tranmy_lovoem',
  ],
  brag: [
    'linda_dangcap', 'linda_toasang', 'linda_level',
    'minhhieu_matphoiphoi', 'minhhieu_tiendohay', 'minhhieu_nganruoido', 'minhhieu_khoe',
    'phuonghang_chanly', 'phuonghang_kimcuong', 'phuonghang_motminhtao', 'phuonghang_thanhcong', 'phuonghang_50tuoi', 'phuonghang_tubitritue',
    'chiphien_depxuatsac', 'chiphien_taividepqua', 'chiphien_xinhdep', 'chiphien_capdoimanh', 'chiphien_bonghong',
    'coba_futani', 'coba_phenguoigiau', 'coba_saucannha', 'coba_quatbatieu', 'coba_mayimtaotha',
    'phuonghang_khonggikhongthe', 'phuonghang_coloiqua', 'phuonghang_emdepkhong', 'phuonghang_tulamdep', 'phuonghang_tientrongnao', 'phuonghang_lieugan', 'phuonghang_hoanhap', 'phuonghang_khonganbam', 'phuonghang_lamchucuocchoi', 'phuonghang_trathu', 'phuonghang_nguoigiau', 'phuonghang_khongquygoi', 'phuonghang_tientuibay', 'phuonghang_noitieng', 'phuonghang_thuongbanthan',
    'minhhieu_matsangsua', 'minhhieu_fanmanh', 'minhhieu_vangthat', 'minhhieu_nguoitathuong', 'minhhieu_dethuongkhong',
    'chiphien_noihay', 'chiphien_thomsangtrong', 'chiphien_amtham', 'chiphien_thichvay', 'chiphien_ngatdungcho', 'chiphien_chinhkien', 'chiphien_thongminh',
    'linda_chuaailuadoi', 'linda_hienhau', 'linda_ngotnam', 'linda_ngonroiday', 'linda_suchutcuaco', 'linda_tienganh', 'linda_cuoixinh',
    'coba_nuoctuban', 'coba_matthem1ty', 'coba_chauhophu', 'coba_chenkieu', 'coba_dephomnay', 'coba_mandoinhunglua', 'coba_chophulam', 'coba_tiemvangkhongdam', 'coba_ngannguoicoi', 
    'coba_khongngan', 'coba_ngandodanhdu', 'coba_xaycau', 'coba_chovangquamy', 'coba_tiensan', 'coba_bactyty', 'coba_bahoangbachua', 'coba_giangho',
    'tranmy_tatfilter', 'tranmy_tuyetvoi', 'tranmy_dungroi', 'tranmy_thandong', 'tranmy_mupruprup', 'tranmy_hatchuan', 'tranmy_toilatranmy', 'tranmy_nhieunhanvat', 'tranmy_doandungroi',
  ],
  laugh: [
    'linda_maccuoi',
    'minhhieu_maccuoi',
    'chiphien_hoahauphukhoa', 'chiphien_sochongboss',
    'coba_dethuong', 'coba_totote',
    'phuonghang_coloiqua',
    'chiphien_thichvay', 'chiphien_30thangchong',
    'linda_hienhau', 'linda_cuoixinh', 'linda_bochuithe',
    'coba_vuivelam', 'coba_vuivelucnao', 'coba_choinhagiau',
    'tranmy_deothay', 'tranmy_tuyetvoi', 'tranmy_chucmungem', 'tranmy_votay', 'tranmy_dungroi', 'tranmy_thandong', 'tranmy_haradi', 'tranmy_mupruprup', 'tranmy_daduvay', 'tranmy_hatchuan', 'tranmy_nhieunhanvat', 'tranmy_ngonqua', 'tranmy_hetchuot', 'tranmy_dethuongghe', 'tranmy_doandungroi',
  ],
  chill: [
    'linda_uongnuocmia', 'linda_buoitoivuive',
    'minhhieu_lubu', 'minhhieu_khoe',
    'phuonghang_tinhhinh', 'phuonghang_khonhon', 'phuonghang_50tuoi',
    'chiphien_maydien',
    'phuonghang_toidadu', 'phuonghang_chuyennhieu', 'phuonghang_thuongbanthan',
    'linda_daynaucanh',
    'coba_vuivelam', 'coba_vuivelucnao', 'coba_cahatchovui',
    'coba_buoccungchan', 'coba_cogapma', 'coba_lamlanh',
    'tranmy_5diem', 'tranmy_deothay', 'tranmy_lovoem',
  ],
  rich: [
    'linda_dangcap', 'linda_emquaday', 'linda_toasang',
    'minhhieu_1000do', 'minhhieu_10trieu', 'minhhieu_nganruoido', 'minhhieu_tientuoi', 'minhhieu_tiendo_quat',
    'minhhieu_tiendomat', 'minhhieu_matphoiphoi', 'minhhieu_lubu', 'minhhieu_khoe',
    'phuonghang_thanhcong', 'phuonghang_tienphuongtien', 'phuonghang_kimcuong',
    'chiphien_30ty', 'chiphien_taisancuachi', 'chiphien_villa', 'chiphien_miengdat', 'chiphien_odaumaxai', 'chiphien_khongvon',
    'coba_futani', 'coba_saucannha', 'coba_phenguoigiau',
    'phuonghang_tientrongnao', 'phuonghang_khonganbam', 'phuonghang_toidadu', 'phuonghang_nomoney', 'phuonghang_nguoigiau',
    'minhhieu_themngando', 'minhhieu_canvang', 'minhhieu_muanhachucty', 'minhhieu_muadi', 'minhhieu_chotdonquatroi', 'minhhieu_vangthat', 'minhhieu_disingapore', 'minhhieu_giauhontao',
    'chiphien_thomsangtrong', 'chiphien_chotdonnha',
    'linda_cotiendulich',
    'coba_matthem1ty', 'coba_tonbaonhieuty', 'coba_demtiendo', 'coba_tiemngando', 'coba_mandoinhunglua', 'coba_tiemvangkhongdam', 'coba_choinhagiau', 'coba_tra100trieu',
    'coba_choidi', 'coba_khongngan', 'coba_ngandodanhdu', 'coba_xaycau', 'coba_muaguilien', 'coba_chovangquamy', 'coba_tiensan', 'coba_bactyty', 'coba_bachucngando',
    'tranmy_danganko',
  ],
  broke: [
    'linda_que', 'linda_cuutoibacon', 'linda_banoi',
    'minhhieu_muonkhoc', 'minhhieu_rotmuocmat', 'minhhieu_hoihan', 'minhhieu_laytienche',
    'phuonghang_luadao', 'phuonghang_tienphuongtien', 'phuonghang_dosup',
    'chiphien_khongbannua_chet', 'chiphien_30ty', 'chiphien_aiepmay',
    'coba_khongguitien', 'coba_giadinhtannat', 
    'vn_hettien', 'tienbip_cainit',
    'phuonghang_saodola', 'phuonghang_thangheo', 'phuonghang_tienrotnuocmat', 'phuonghang_ngheokhongtoi',
    'minhhieu_hettrontien', 'minhhieu_chotdonkhongaimua',
    'linda_khongdieukien', 'linda_sauraycodieukien',
    'coba_toikholam', 'coba_no50cayvang', 'coba_trieuphukhoqua', 'coba_thualo',
    'coba_napthe', 'coba_chuabietchuno', 'coba_luchongheo',
    'tranmy_quyttien', 'tranmy_hettien',
  ],
  gift: [
    'linda_emquaday', 'linda_thaloi',
    'minhhieu_10trieu', 'minhhieu_1000do', 'minhhieu_tienchicho', 'minhhieu_tientuoi',
    'phuonghang_tienphuongtien', 'phuonghang_kimcuong',
    'chiphien_miengdat', 'chiphien_villa', 'chiphien_taisancuachi', 'chiphien_bonghong',
    'coba_dethuong', 'coba_saucannha', 'coba_futani',
    'minhhieu_disingapore', 'minhhieu_nguoitathuong',
    'linda_camonem', 'linda_thatim',
    'coba_tonbaonhieuty', 'coba_dephomnay', 'coba_chodimaimai', 
    'coba_ngandodanhdu', 'coba_xaycau', 'coba_muaguilien', 'coba_bachucngando', 'coba_lamlanh',
    'tranmy_tuyetvoi', 'tranmy_chucmungem', 'tranmy_votay', 'tranmy_daduvay', 'tranmy_ngonqua', 'tranmy_dethuongghe',
  ],
  sad: [
    'linda_que',
    'minhhieu_muonkhoc', 'minhhieu_rotmuocmat', 'minhhieu_hoihan',
    'phuonghang_quantutrathu', 'phuonghang_haoquang',
    'chiphien_metlamroi', 'chiphien_aiepmay', 'chiphien_khonlamkeme', 'chiphien_khongbannua_chet',
    'coba_thuamaythuan', 'coba_giadinhtannat', 'coba_banchetroi',
    'phuonghang_bominhde', 'phuonghang_khongbietlamsao', 'phuonghang_tienrotnuocmat', 'phuonghang_emtonthuong', 'phuonghang_tuithan', 'phuonghang_canhcua',
    'minhhieu_buonghe', 'minhhieu_khuyroi', 'minhhieu_metkhach',
    'chiphien_thatbainamdo', 'chiphien_chuadukho', 'chiphien_30thangchong',
    'linda_coghettoi', 'linda_chuaduocyeu', 'linda_xinloime', 'linda_sauraycodieukien', 'linda_tuclam',
    'coba_chetbenmy', 'coba_nghiepnang', 'coba_metmoiqua', 'coba_dungbuon', 'coba_nhucvinh', 'coba_trieuphukhoqua',
    'tranmy_taoquamet', 'tranmy_khongtinduoc', 'tranmy_sochimyoi', 'tranmy_quayvongvong', 'tranmy_emmetqua', 'tranmy_hettien', 'tranmy_toitinhgi', 'tranmy_nguthiet',
  ],
  flop: [
    'linda_que', 'linda_hongnho', 'linda_ecaijztroi', 'linda_airanh',
    'minhhieu_hoihan', 'minhhieu_conquyxao', 'minhhieu_rotmuocmat', 'minhhieu_khungthichet', 'minhhieu_cadonhuquy',
    'phuonghang_thayvay', 'phuonghang_haoquang', 'phuonghang_trongcuoc', 'phuonghang_luadao',
    'chiphien_loilam', 'chiphien_kholam', 'chiphien_ke_trithuc_do', 'chiphien_khonlamkeme',
    'coba_batphelon', 'coba_thuamaythuan', 'coba_giadinhtannat',
    'phuonghang_saodola',
    'minhhieu_chotdonkhongaimua',
    'chiphien_thatbainamdo', 'chiphien_laycaisai', 'chiphien_loiroi',
    'linda_aotuong', 'linda_quentoikhet', 'linda_quenkeo',
    'coba_nghiepnang', 'coba_thualo',
    'tranmy_taoquamet', 'tranmy_nguthiet',
  ],
  panic: [
    'linda_cuutoibacon', 'linda_meoicuucon', 'linda_banoi',
    'minhhieu_cuutoi', 'minhhieu_soqua', 'minhhieu_muonkhoc',
    'phuonghang_nguyhiem', 'phuonghang_tinhhinh', 'phuonghang_ngongang',
    'chiphien_metlamroi', 'chiphien_maydien', 'chiphien_khongbannua_chet',
    'coba_giadinhtannat', 'coba_banchetroi', 'coba_chaygiet',
    'minhhieu_soquakhongbiet',
    'chiphien_cuuchi', 'chiphien_bacodoi', 'chiphien_chuadukho',
    'coba_chetbenmy',
    'tranmy_khongphainha', 'tranmy_sochimyoi', 'tranmy_quayvongvong', 'tranmy_cuucuu', 'tranmy_chetmeroi',
  ],
  plea: [
    'linda_hongnho',
    'phuonghang_trongcuoc',
    'chiphien_kholam',
    'phuonghang_khongbietlamsao', 'phuonghang_emtonthuong',
    'minhhieu_xinloithathu', 'minhhieu_hetpin',
    'chiphien_cuuchi', 'chiphien_khongmuonon', 'chiphien_loichivo',
    'linda_xinloime',
    'coba_toikholam', 'coba_quylay',
    'coba_napthe',
    'tranmy_baikhacdi', 'tranmy_cuucuu', 'tranmy_emmetqua', 'tranmy_khongthichdau', 'tranmy_toitinhgi',
  ],
  shock: [
    'linda_banoi', 'linda_ecaijztroi', 'linda_dohamcau',
    'minhhieu_soqua', 'minhhieu_tinhlai', 'minhhieu_cuutoi',
    'phuonghang_ngongang', 'phuonghang_luadao',
    'chiphien_maydien', 'chiphien_odaumaxai', 'chiphien_chinhquyenbat',
    'vn_vineboom', 'vn_amongus',
    'minhhieu_kicucvay',
    'chiphien_bacodoi', 'chiphien_ghequa', 'chiphien_daoboi',
    'linda_nguocdoi',
    'coba_thietvayha',
    'tranmy_condien', 'tranmy_ghequa', 'tranmy_khongtinduoc', 'tranmy_mamay', 'tranmy_quanque', 'tranmy_vangma', 'tranmy_chetmeroi',
  ],
  danger: [
    'linda_moimocra',
    'minhhieu_duongquyen',
    'phuonghang_nguyhiem', 'phuonghang_tinhhinh',
    'chiphien_chinhquyenbat',
    'coba_ngaychon', 'coba_quatbatieu', 'coba_votungoi',
    'vn_toicongchuyen',
    'phuonghang_suthatloira',
  ],
  taunt: [
    'linda_airanh', 'linda_botkhung', 'linda_level', 'linda_dohamcau', 'linda_khungdiensuunhi', 'linda_quanquedo_ban',
    'linda_ancutheo', 'linda_iaxochon', 'linda_emquaday', 'linda_chodegiatao', 'linda_maccuoi',
    'minhhieu_cadonhuquy', 'minhhieu_khungthichet', 'minhhieu_tiendo_quat', 'minhhieu_matphoiphoi', 'minhhieu_tiendohay',
    'minhhieu_maccuoi', 'minhhieu_nganruoido',
    'phuonghang_connguo_nao', 'phuonghang_khonhon', 'phuonghang_laymayxuithem', 'phuonghang_chanhcho_ngu',
    'phuonghang_haoquang', 'phuonghang_tuongvay',
    'chiphien_kemay', 'chiphien_nhinchidi', 'chiphien_xinhdep', 'chiphien_khonlamkeme', 'chiphien_aiepmay',
    'coba_maylamenothienha', 'coba_chitaimaychet', 'coba_phenguoigiau',
    'vn_fartmic', 'vn_batngochua',
    'phuonghang_hoanhap', 'phuonghang_nomoney', 'phuonghang_chiuduockhong', 'phuonghang_tientuibay', 'phuonghang_noitieng', 'phuonghang_ngheokhongtoi', 'phuonghang_lietsi',
    'minhhieu_voduyen', 'minhhieu_saokhongdo', 'minhhieu_divedicha', 'minhhieu_cotiendikhong', 'minhhieu_dungdieuqua', 'minhhieu_dienhoai', 'minhhieu_muanhachucty', 'minhhieu_dexnoiten', 'minhhieu_giauhontao',
    'chiphien_conghenoi', 'chiphien_dongluc', 'chiphien_ditu', 'chiphien_nuoiong', 'chiphien_dungghep',
    'linda_batoi', 'linda_cauhoncauhon', 'linda_botragiumcon', 'linda_lanvaobep', 'linda_tienganh',
    'coba_conmatconnguoi', 'coba_nguduvay', 'coba_mattienhem', 'coba_nhinphaibiet', 'coba_xuongbien',
    'coba_nhinquancanh', 'coba_luchongheo',
    'tranmy_gomqua', 'tranmy_condien', 'tranmy_midien', 'tranmy_soma', 'tranmy_depdi', 'tranmy_ranhhaygi', 'tranmy_quanque', 'tranmy_nhucau', 'tranmy_khongranh', 'tranmy_kemetao', 'tranmy_songsoso', 'tranmy_maydienha', 'tranmy_taocoten', 'tranmy_khungdeso', 'tranmy_danganko', 'tranmy_hoiconcho', 'tranmy_mapgiongmamay', 'tranmy_khongthichchi', 'tranmy_hoimamay',
  ],
  threat: [
    'linda_namdauquay', 'linda_xuongnuiquay',
    'minhhieu_duongquyen', 'minhhieu_camtiendo_dq',
    'phuonghang_cangchuicangdien', 'phuonghang_taophaimatday', 'phuonghang_dunglacham', 'phuonghang_dosup',
    'chiphien_xetda8cai', 'chiphien_lendonchet',
    'coba_luocmay', 'coba_chedauchetme', 'coba_quatbatieu', 'coba_ngaychon', 'coba_votungoi',
    'phuonghang_choiluon',
    'minhhieu_themngando', 'minhhieu_fanmanh', 'minhhieu_taodaymay', 'minhhieu_khongchuikhongngu', 'minhhieu_baikinhte',
    'chiphien_xutoido', 'chiphien_blockbanhbeo',
    'linda_khongthachomay',
    'coba_hoitoi', 'coba_tra100trieu', 'coba_noimau', 'coba_tinhnong', 
    'coba_giangho',
    'tranmy_locmayluon', 'tranmy_midien', 'tranmy_duroinha', 'tranmy_hatdanghoang', 'tranmy_canhcao',
  ],
  accuse: [
    'linda_moimocra', 'linda_chodegiatao', 'linda_retienthem',
    'minhhieu_conquyxao', 'minhhieu_duongquyen', 'minhhieu_khungthichet',
    'phuonghang_dungdien', 'phuonghang_luadao', 'phuonghang_chomochui', 'phuonghang_laokhongduoc',
    'phuonghang_voquytday', 'phuonghang_chanhcho_ngu',
    'chiphien_chinhquyenbat', 'chiphien_lendonchet', 'chiphien_xetda8cai',
    'coba_baxaobala', 'coba_ngaychon', 'coba_votungoi', 'coba_batphelon', 
    'vn_toicongchuyen', 'vn_amongus',
    'phuonghang_suthatloira',
    'minhhieu_xammuongiangho', 'minhhieu_xaolao',
    'chiphien_daoboi', 'chiphien_khongtontrong', 'chiphien_nuoiong', 'chiphien_blockbanhbeo',
    'linda_chuahoimaykhai',
    'coba_giangho',
    'tranmy_ranhhaygi', 'tranmy_mamay', 'tranmy_quyttien', 'tranmy_taheo', 'tranmy_maydienha', 'tranmy_vangma', 'tranmy_taocoten', 'tranmy_khungdeso', 'tranmy_hoimamay',
  ],
  excuse: [
    'linda_hongnho', 'linda_thaloi', 'linda_uongnuocmia',
    'minhhieu_laytienche', 'minhhieu_lubu', 'minhhieu_conquyxao',
    'phuonghang_trongcuoc', 'phuonghang_thayvay', 'phuonghang_chuabaogiobochay', 'phuonghang_tuongvay',
    'chiphien_kholam', 'chiphien_loilam', 'chiphien_ke_trithuc_do',
    'coba_batphelon', 'coba_giadinhtannat', 
    'phuonghang_chuyennhieu', 'phuonghang_thangheo', 'phuonghang_bagai', 'phuonghang_lietsi',
    'minhhieu_xinloithathu', 'minhhieu_noiduakhongchui', 'minhhieu_metkhach', 'minhhieu_dethuongkhong',
    'chiphien_conghenoi', 'chiphien_laycaisai', 'chiphien_bihai', 'chiphien_doithua', 'chiphien_khongnoigi', 'chiphien_loichivo', 'chiphien_dangngo',
    'linda_aicungxau', 'linda_chuatienan', 'linda_khongaithuonghai', 'linda_khongbomieng', 'linda_bochuithe',
    'coba_thetayninh', 'coba_chanthatlam', 'coba_chuakiemchuyen', 'coba_taivigian', 'coba_quylay', 'coba_mangtoi',
    'coba_chuabietchuno',
    'tranmy_khongphainha', 'tranmy_nhucau', 'tranmy_khongranh', 'tranmy_kemetao', 'tranmy_khongthichdau',
  ],
  mercy: [
    'linda_thaloi', 'linda_buoitoivuive',
    'minhhieu_maccuoi', 'minhhieu_tinhlai',
    'phuonghang_tubitritue', 'phuonghang_tuongvay',
    'chiphien_khonlamkeme', 'chiphien_kemay',
    'coba_mayimtaotha', 
    'linda_maccuoi', 'minhhieu_khoe', 'phuonghang_trongcuoc', 'chiphien_xinhdep', 'coba_dethuong',
    'chiphien_chinhkien', 'chiphien_manhme',
    'linda_khongchuiboinua', 'linda_duonghuongthien',
    'coba_chodimaimai', 
    'coba_buoccungchan', 'coba_lamlanh',
    'tranmy_5diem', 'tranmy_bietloi',
  ],
  saved: [
    'linda_uongnuocmia', 'linda_maccuoi',
    'minhhieu_tinhlai', 'minhhieu_laytienche', 'minhhieu_khoe',
    'phuonghang_chuabaogiobochay', 'phuonghang_thayvay',
    'chiphien_xinhdep', 'chiphien_depxuatsac',
    'coba_dethuong', 
    'phuonghang_khongquygoi', 'phuonghang_tuithan', 'phuonghang_canhcua',
    'chiphien_manhme',
    'linda_chuaailuadoi',
    'tranmy_songsoso', 'tranmy_hetchuot',
  ],
  out: [
    'linda_cuutoibacon', 'linda_meoicuucon',
    'minhhieu_cuutoi',
    'phuonghang_chuabaogiobochay',
    'chiphien_dingu',
    'coba_banchetroi',
    'vn_vinhbietcu',
    'minhhieu_divedicha', 'minhhieu_byebye',
    'linda_byebyeolala',
    'tranmy_soma', 'tranmy_tuout', 'tranmy_khongthichchi',
  ],
  twist: [
    'linda_ecaijztroi', 'linda_xuongnuiquay', 'linda_namdauquay',
    'minhhieu_tinhlai', 'minhhieu_laytienche', 'minhhieu_camtiendo_dq',
    'phuonghang_thayvay', 'phuonghang_tuongvay', 'phuonghang_ngongang', 'phuonghang_haoquang', 'phuonghang_voquytday',
    'chiphien_xetda8cai', 'chiphien_nhinchidi', 'chiphien_maydien',
    'coba_batphelon', 'coba_mayimtaotha', 'coba_ngaychon',
    'vn_batngochua', 'vn_vineboom',
    'phuonghang_trathu',
    'minhhieu_saokhongdo',
    'chiphien_giaubaonam', 'chiphien_conbado', 'chiphien_amtham',
    'tranmy_tuout',
  ],
  hurry: [
    'linda_chicho', 'linda_airanh',
    'minhhieu_lubu', 'minhhieu_duongquyen',
    'phuonghang_taophaimatday', 'phuonghang_tinhhinh',
    'chiphien_maydien', 'chiphien_dingu',
    'coba_chaygiet', 'coba_muonchoi',
    'linda_botkhung', 'minhhieu_camtiendo_dq', 'phuonghang_khonhon', 'chiphien_aiepmay',
    'phuonghang_chiuduockhong',
    'minhhieu_dienhoai', 'minhhieu_hetpin', 'minhhieu_khuyroi', 'minhhieu_khongchuikhongngu',
    'chiphien_dungghep',
    'linda_botragiumcon',
    'tranmy_duroinha', 'tranmy_baikhacdi', 'tranmy_depdi', 'tranmy_hatdanghoang', 'tranmy_haradi',
  ],
};

/**
 * 7 nhóm lớn, mỗi nhóm gom các nhãn cùng không khí. Mỗi giọng có 16–30 câu,
 * nên hành động nào cũng được dùng phần lớn kho của giọng đó chứ không chỉ vài câu.
 * Mỗi nhãn thuộc đúng một nhóm.
 */
export type MemeGroup = 'hype' | 'salty' | 'spicy' | 'shock' | 'edge' | 'chill' | 'soft';

export const MEME_GROUPS: Record<MemeGroup, { label: string; moods: readonly MemeMood[] }> = {
  hype: { label: 'Gáy / Vui / Tiền về', moods: ['greet', 'brag', 'laugh', 'rich', 'gift', 'saved'] },
  salty: { label: 'Than / Quê / Chống chế', moods: ['sad', 'flop', 'broke', 'out', 'plea', 'excuse'] },
  spicy: { label: 'Gắt / Cà khịa / Tố', moods: ['taunt', 'threat', 'accuse', 'hurry'] },
  shock: { label: 'Sốc / Hoảng', moods: ['shock', 'panic'] },
  edge: { label: 'Căng / Lật kèo', moods: ['danger', 'twist'] },
  chill: { label: 'Vào lượt / Tán gẫu', moods: ['ready', 'chill'] },
  soft: { label: 'Tha / Hòa giải', moods: ['mercy'] },
};

/** Mỗi hành động trong game lấy câu từ những nhóm lớn nào. */
export const POOL_GROUPS: Record<MemePoolKey, readonly MemeGroup[]> = {
  welcome: ['hype', 'chill'],
  turn_move: ['chill', 'hype'],
  correct: ['hype'],
  wrong: ['salty', 'shock'],
  win: ['hype'],
  lose: ['salty', 'shock'],
  money: ['hype'],
  broke: ['salty', 'shock'],
  gift: ['hype'],
  gift_receive: ['hype'],
  help: ['shock', 'salty'],
  hurry: ['spicy'],
  relief: ['hype'],
  troll: ['spicy', 'edge'],
  vote: ['spicy', 'edge'],
  defense: ['salty', 'soft'],
  forgive: ['soft', 'hype'],
  eliminated: ['salty', 'shock'],
  twist: ['edge', 'hype'],
  bomb: ['shock', 'salty'],
  bite: ['shock', 'salty'],
  shock: ['shock', 'edge', 'spicy'],
  chat_hype: ['chill', 'hype'],
};

/**
 * 2 sắc thái: mỗi câu là VUI hoặc BUỒN/TỨC (theo đa số nhãn; hòa thì tính vui).
 * Hành động hay gặp nào cũng thuộc một trong 2 sắc thái và chỉ lấy câu cùng sắc thái của giọng đang nói
 * (xem FREQUENT_POOL_MOODS); các hành động hay gặp gộp lại phủ hết kho câu của từng giọng.
 */
export type MemeTone = 'vui' | 'buon';
const SAD_ANGRY_MOODS: readonly MemeMood[] = [
  'sad', 'flop', 'broke', 'panic', 'plea', 'out', 'excuse', 'shock', 'danger', 'taunt', 'threat', 'accuse', 'hurry',
];
export function toneOfMoods(moods: readonly MemeMood[]): MemeTone {
  const sad = moods.filter((mood) => SAD_ANGRY_MOODS.includes(mood)).length;
  return sad > moods.length - sad ? 'buon' : 'vui';
}

/** Sắc thái của từng hành động. */
export const POOL_TONE: Record<MemePoolKey, MemeTone> = {
  welcome: 'vui',
  turn_move: 'vui',
  correct: 'vui',
  wrong: 'buon',
  win: 'vui',
  lose: 'buon',
  money: 'vui',
  broke: 'buon',
  gift: 'vui',
  gift_receive: 'vui',
  help: 'buon',
  hurry: 'buon',
  relief: 'vui',
  troll: 'buon',
  vote: 'buon',
  defense: 'buon',
  forgive: 'vui',
  eliminated: 'buon',
  twist: 'vui',
  bomb: 'buon',
  bite: 'buon',
  shock: 'buon',
  chat_hype: 'vui',
};

/**
 * Hành động hay gặp: mua nhà / thu tiền / đặt cược, gõ từ, tới lượt, nhắn tin / chat, đoán đúng / sai,
 * thắng / thua mỗi ván, mất tiền, chọc phá. Mỗi hành động lấy các câu CÙNG SẮC THÁI có ít nhất một nhãn
 * hợp với nó (vd mất tiền lấy câu than nghèo / buồn / nổi nóng, không lấy câu cà khịa người khác;
 * chọc phá lấy câu cà khịa / gắt, không lấy câu than khóc). Gộp lại vẫn phủ gần hết kho câu của mỗi giọng.
 */
export const FREQUENT_POOL_MOODS = {
  turn_move: ['ready', 'chill', 'greet', 'laugh', 'brag'],
  chat_hype: ['chill', 'laugh', 'greet', 'ready', 'brag', 'gift', 'mercy', 'saved'],
  money: ['rich', 'brag', 'gift'],
  correct: ['brag', 'laugh', 'saved', 'rich', 'greet'],
  win: ['brag', 'laugh', 'rich', 'saved', 'gift', 'twist'],
  wrong: ['flop', 'excuse', 'shock', 'sad', 'plea', 'panic'],
  lose: ['sad', 'flop', 'broke', 'out', 'panic', 'plea', 'threat'],
  broke: ['broke', 'sad', 'plea', 'panic', 'flop', 'threat'],
  troll: ['taunt', 'threat', 'accuse', 'danger', 'twist', 'hurry'],
} as const satisfies Partial<Record<MemePoolKey, readonly MemeMood[]>>;

export const FREQUENT_POOLS = Object.keys(FREQUENT_POOL_MOODS) as (keyof typeof FREQUENT_POOL_MOODS)[];
const isFrequent = (pool: MemePoolKey): pool is keyof typeof FREQUENT_POOL_MOODS => pool in FREQUENT_POOL_MOODS;

function moodsById(): Map<MemeId, MemeMood[]> {
  const blocked = new Set<MemeId>(PREVIEW_ONLY_MEMES);
  const moodsOf = new Map<MemeId, MemeMood[]>();
  for (const mood of Object.keys(MEME_MOODS) as MemeMood[]) {
    for (const id of MEME_MOODS[mood]) {
      if (!blocked.has(id)) moodsOf.set(id, [...(moodsOf.get(id) ?? []), mood]);
    }
  }
  return moodsOf;
}

/** Sắc thái của từng câu tự phát. */
export function memeTones(): Map<MemeId, MemeTone> {
  return new Map([...moodsById()].map(([id, moods]) => [id, toneOfMoods(moods)]));
}

const MIN_FREQUENT_LINES = 20;

export function buildMemePools(personaOf: (id: MemeId) => string): Record<MemePoolKey, readonly MemeId[]> {
  const blocked = new Set<MemeId>(PREVIEW_ONLY_MEMES);
  const moodsOf = moodsById();
  const pools = {} as Record<MemePoolKey, readonly MemeId[]>;
  for (const pool of Object.keys(POOL_GROUPS) as MemePoolKey[]) {
    if (isFrequent(pool)) {
      const fits: readonly MemeMood[] = FREQUENT_POOL_MOODS[pool];
      const sameTone = [...moodsOf].filter(([, moods]) => toneOfMoods(moods) === POOL_TONE[pool]);
      const ids: MemeId[] = [];
      for (const persona of new Set(sameTone.map(([id]) => personaOf(id)))) {
        const mine = sameTone.filter(([id]) => personaOf(id) === persona);
        const fitting = mine.filter(([, moods]) => moods.some((mood) => fits.includes(mood)));
        // Giọng nào có ≤ 20 câu hợp thì lấy cả túi cùng sắc thái, để hành động hay gặp luôn có > 20 câu xoay vòng.
        ids.push(...(fitting.length > MIN_FREQUENT_LINES ? fitting : mine).map(([id]) => id));
      }
      pools[pool] = ids;
      continue;
    }
    const ids = new Set<MemeId>();
    for (const group of POOL_GROUPS[pool]) {
      for (const mood of MEME_GROUPS[group].moods) {
        for (const id of MEME_MOODS[mood]) if (!blocked.has(id)) ids.add(id);
      }
    }
    pools[pool] = [...ids];
  }
  return pools;
}

/** Toàn bộ câu tự phát (không tính câu chỉ nghe thử). */
export function autoMemeIds(): MemeId[] {
  const blocked = new Set<MemeId>(PREVIEW_ONLY_MEMES);
  return [...new Set(Object.values(MEME_MOODS).flat())].filter((id) => !blocked.has(id));
}
