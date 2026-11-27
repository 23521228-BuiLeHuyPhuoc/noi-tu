/**
 * Bộ sinh kho đồ mở rộng (~2.800+ món có tên riêng, mô tả chính xác loại trang phục thế giới & Xóm Lầy).
 * - Bao phủ toàn bộ danh pháp trang phục / phụ kiện loài người (Nam, Nữ, Unisex, Truyền thống, Nghề nghiệp, Thể thao, Dạ hội, Sci-Fi).
 * - Bao phủ hàng trăm áo in chữ Meme tiếng Việt (vẽ chữ thật lên 3D ngực áo!) và loạt phiên bản Xóm Lầy 3D tham số hóa.
 * - Mọi món đều ánh xạ tới 1 trong ~440 hình khối 3D thật + thông số `v3d` riêng biệt (chất liệu, viền, cổ, họa tiết, độ phóng, phát sáng, chữ in).
 */
import type {
  ThoiTrangAccSubSlot,
  ThoiTrangCatalogItem,
  ThoiTrangCategoryId,
  ThoiTrangPaletteKey,
  ThoiTrangPatternId,
  ThoiTrangTag,
  ThoiTrangVisualSpec,
} from './thoitrang';

interface VariantDef {
  suffix: string;
  label: string;
  tags: readonly ThoiTrangTag[];
  c?: string;
  c2?: string;
  p?: ThoiTrangPatternId;
  group?: string;
  mod: Omit<ThoiTrangVisualSpec, 'base'>;
}

// ---------- 1. Kho áo in chữ Meme tiếng Việt Xóm Lầy (hiển thị chữ thật trên ngực áo 3D!) ----------
const MEME_SLOGANS: readonly (readonly [string, string, string, string, readonly ThoiTrangTag[]])[] = [
  ['luong', 'ĐỪNG HỎI LƯƠNG', '#ffffff', '#15121b', ['lay_loi', 'cong_so', 'van_hoa_vn']],
  ['vo_so_1', 'VỢ LÀ SỐ 1', '#ff6b8b', '#ffffff', ['lay_loi', 'tinh_yeu', 'van_hoa_vn']],
  ['deadline', 'CHẠY DEADLINE', '#15121b', '#ffea00', ['lay_loi', 'cong_so', 'hoc_duong']],
  ['het_tien', 'HẾT TIỀN RỒI', '#ffffff', '#c92a46', ['lay_loi', 'duong_pho', 'van_hoa_vn']],
  ['xom_lay', 'TRÙM XÓM LẦY', '#ffea00', '#15121b', ['lay_loi', 'duong_pho', 'van_hoa_vn']],
  ['err404', '404 KHÔNG NGƯỜI YÊU', '#15121b', '#00e5ff', ['lay_loi', 'scifi', 'hoc_duong']],
  ['e_ben_vung', 'Ế BỀN VỮNG', '#ffb3c7', '#15121b', ['lay_loi', 'tinh_yeu', 'duong_pho']],
  ['chu_tich', 'CHỦ TỊCH GIẢ NGHÈO', '#2b2533', '#ffd56b', ['lay_loi', 'cong_so', 'sang_chanh']],
  ['tang_ca', 'TĂNG CA XUYÊN ĐÊM', '#1c3568', '#ffffff', ['lay_loi', 'cong_so', 'kinh_di']],
  ['free_wifi', 'PHÁT WIFI MIỄN PHÍ', '#6ec6ff', '#15121b', ['lay_loi', 'scifi', 'duong_pho']],
  ['cam_nhin', 'CẤM NHÌN TRỘM', '#c92a46', '#ffffff', ['lay_loi', 'ca_tinh', 'duong_pho']],
  ['dang_doi', 'ĐANG RẤT ĐÓI', '#ff9f5a', '#15121b', ['lay_loi', 'duong_pho', 'de_thuong']],
  ['sale_99', 'GIẢM GIÁ 99%', '#ff2e93', '#ffea00', ['lay_loi', 'duong_pho', 'sang_chanh']],
  ['bao_thu', 'BÁO THỦ CHÍNH HIỆU', '#15121b', '#ff5722', ['lay_loi', 'duong_pho', 'hanh_dong']],
  ['vip_pro', 'VIP PRO MAX', '#ffd56b', '#15121b', ['lay_loi', 'sang_chanh', 'hoang_gia']],
  ['dai_gia', 'ĐẠI GIA NGẦM', '#1a6b4f', '#ffd56b', ['lay_loi', 'sang_chanh', 'cong_so']],
  ['tra_sua', 'NGHIỆN TRÀ SỮA', '#f6e7d8', '#ff6b8b', ['lay_loi', 'de_thuong', 'van_hoa_vn']],
  ['ngu_di', 'CHO TUI ĐI NGỦ', '#c79bff', '#ffffff', ['lay_loi', 'hoc_duong', 'mua_dong']],
  ['met_qua', 'MỆT QUÁ RỒI', '#7c828f', '#ffffff', ['lay_loi', 'cong_so', 'hoc_duong']],
  ['overthink', 'CHÚA OVERTHINKING', '#4b2d80', '#ffffff', ['lay_loi', 'bi_an', 'hoc_duong']],
  ['chill_phet', 'CHILL PHẾT ĐẤY', '#5fd3a6', '#15121b', ['lay_loi', 'bien_dao', 'mua_he']],
  ['con_ngoan', 'CON NGOAN TRÒ GIỎI', '#ffffff', '#2f6fd6', ['lay_loi', 'hoc_duong', 'van_hoa_vn']],
  ['tong_tai', 'TỔNG TÀI BÁ ĐẠO', '#15121b', '#d4af37', ['lay_loi', 'cong_so', 'sang_chanh']],
  ['simp_chua', 'SIMP CHÚA', '#ff2e93', '#ffffff', ['lay_loi', 'tinh_yeu', 'duong_pho']],
  ['luong_dau', 'LƯƠNG THÁNG NÀY ĐÂU', '#ffea00', '#c92a46', ['lay_loi', 'cong_so', 'van_hoa_vn']],
  ['dieu_kien', 'NHÀ CÓ ĐIỀU KIỆN', '#d4af37', '#15121b', ['lay_loi', 'sang_chanh', 'hoang_gia']],
  ['no_mon', 'QUA MÔN ĐI THẦY ƠI', '#ffffff', '#1c3568', ['lay_loi', 'hoc_duong', 'van_hoa_vn']],
  ['dep_trai', 'ĐẸP TRAI CÓ GÌ SAI', '#2f6fd6', '#ffffff', ['lay_loi', 'ca_tinh', 'duong_pho']],
  ['xinh_gai', 'XINH GÁI NHẤT XÓM', '#ffb3c7', '#c92a46', ['lay_loi', 'de_thuong', 'ngot_ngao']],
  ['chua_he', 'CHÚA HỀ XÓM LẦY', '#ff5722', '#ffea00', ['lay_loi', 'am_nhac', 'duong_pho']],
  ['trum_cuoi', 'TRÙM CUỐI SÀN DIỄN', '#15121b', '#ff2e93', ['lay_loi', 'da_hoi', 'hanh_dong']],
  ['no_money', 'NO MONEY NO LOVE', '#2b2533', '#76ff03', ['lay_loi', 'duong_pho', 'ca_tinh']],
  ['flexing', 'ĐANG FLEX ĐẤY', '#00e5ff', '#15121b', ['lay_loi', 'sang_chanh', 'am_nhac']],
  ['so_do_t', 'ĐỂ SỔ ĐỎ Ở NHÀ', '#c92a46', '#ffd56b', ['lay_loi', 'van_hoa_vn', 'sang_chanh']],
  ['mi_tom', 'ĂN MÌ TÔM CUỐI THÁNG', '#ff9f5a', '#c92a46', ['lay_loi', 'van_hoa_vn', 'hoc_duong']],
  ['ca_phe', 'CÀ PHÊ SỮA ĐÁ', '#a6774f', '#ffffff', ['lay_loi', 'van_hoa_vn', 'cong_so']],
  ['cuu_tui', 'CỨU TUI VỚI', '#ff2e93', '#ffffff', ['lay_loi', 'kinh_di', 'duong_pho']],
  ['khong_quao', 'HÔM NAY KHÔNG QUẠO', '#5fd3a6', '#ffffff', ['lay_loi', 'de_thuong', 'toi_gian']],
  ['ve_nha', 'MUỐN VỀ NHÀ QUÁ', '#6ec6ff', '#1c3568', ['lay_loi', 'cong_so', 'hoc_duong']],
  ['ban_ngu', 'ĐANG BẬN NGỦ', '#7c5cff', '#ffffff', ['lay_loi', 'mua_dong', 'de_thuong']],
  ['an_choi', 'CHỈ BIẾT ĂN CHƠI', '#ffd56b', '#c92a46', ['lay_loi', 'bien_dao', 'mua_he']],
  ['nyc', 'NGƯỜI YÊU CŨ BAY MÀU', '#15121b', '#ff6b8b', ['lay_loi', 'tinh_yeu', 'ca_tinh']],
  ['xin_via', 'XIN VÍA GIÀU SANG', '#c92a46', '#ffea00', ['lay_loi', 'van_hoa_vn', 'hoang_gia']],
  ['khoan_bt', 'KHOAN CẮT BÊ TÔNG', '#ffffff', '#2f6fd6', ['lay_loi', 'van_hoa_vn', 'duong_pho']],
  ['ba_dao', 'ĐỈNH CỦA CHÓP', '#ff5722', '#ffffff', ['lay_loi', 'am_nhac', 'ca_tinh']],
  ['ga_mo', 'GÀ MỜ NHƯNG TỰ TIN', '#ffea00', '#15121b', ['lay_loi', 'dong_vat', 'the_thao']],
  ['chay_pho', 'CHẠY PHỐ ĐI BỘ', '#00e5ff', '#15121b', ['lay_loi', 'duong_pho', 'am_nhac']],
  ['mua_rau', 'ĐI MUA RAU GẶP CRUSH', '#5fd3a6', '#c92a46', ['lay_loi', 'van_hoa_vn', 'tinh_yeu']],
];

// ---------- 2. Danh pháp trang phục thế giới chi tiết (Real-World Human Taxonomy, cân bằng Nam & Nữ!) ----------
type WorldRow = readonly [
  id: string,
  name: string,
  base: string,
  tags: readonly ThoiTrangTag[],
  c: string,
  c2: string,
  group: string,
  p?: ThoiTrangPatternId,
  mod?: Omit<ThoiTrangVisualSpec, 'base'>,
];

const WORLD_ITEMS: Readonly<Record<ThoiTrangCategoryId, readonly WorldRow[]>> = {
  hair: [
    ['high_fade_m', 'Tóc High Fade nam sắc nét', 'fade_crop', ['cong_so', 'the_thao', 'ca_tinh', 'toi_gian'], '#1b1518', '#33211b', 'nam'],
    ['low_fade_m', 'Tóc Low Fade nam thanh lịch', 'fade_crop', ['cong_so', 'da_hoi', 'sang_chanh', 'toi_gian'], '#33211b', '#5a3825', 'nam'],
    ['skin_fade_m', 'Tóc Skin Fade cạo sát nam', 'crew_cut', ['the_thao', 'duong_pho', 'hanh_dong', 'ca_tinh'], '#1b1518', '#1b1518', 'nam'],
    ['taper_fade_m', 'Tóc Taper Fade nam hiện đại', 'side_swept_men', ['cong_so', 'duong_pho', 'toi_gian'], '#33211b', '#875331', 'nam'],
    ['edgar_cut_m', 'Tóc Edgar Cut mái ngang nam', 'french_crop', ['duong_pho', 'lay_loi', 'ca_tinh', 'am_nhac'], '#1b1518', '#33211b', 'nam'],
    ['caesar_cut_m', 'Tóc Caesar cổ điển La Mã', 'crew_cut', ['co_trang', 'retro', 'cong_so', 'toi_gian'], '#5a3825', '#33211b', 'nam'],
    ['faux_hawk_m', 'Tóc Faux Hawk nam cá tính', 'mohican', ['am_nhac', 'the_thao', 'duong_pho', 'ca_tinh'], '#1b1518', '#4285d6', 'nam'],
    ['flat_top_90s', 'Tóc Flat Top bằng phẳng 90s', 'fade_crop', ['retro', 'am_nhac', 'duong_pho', 'lay_loi'], '#1b1518', '#33211b', 'nam'],
    ['side_part_64', 'Tóc rẽ ngôi 6/4 nam Hàn Quốc', 'side_part', ['hoc_duong', 'cong_so', 'tinh_yeu', 'da_hoi'], '#33211b', '#5a3825', 'nam'],
    ['side_part_73', 'Tóc rẽ ngôi 7/3 cổ điển', 'side_swept_men', ['cong_so', 'cuoi_hoi', 'retro', 'sang_chanh'], '#1b1518', '#33211b', 'nam'],
    ['wolf_cut_men', 'Tóc Wolf Cut nam tỉa tầng', 'wolf_cut', ['am_nhac', 'duong_pho', 'ca_tinh', 'bi_an'], '#1b1518', '#c9c5c0', 'nam'],
    ['mullet_men', 'Tóc Mullet nam chất chơi', 'mullet', ['duong_pho', 'am_nhac', 'ca_tinh', 'retro'], '#1b1518', '#4285d6', 'nam'],
    ['samurai_topknot', 'Tóc búi Samurai Top Knot', 'man_bun', ['co_trang', 'hanh_dong', 'bi_an', 'hoang_gia'], '#1b1518', '#e8c47a', 'nam'],
    ['curly_taper_m', 'Tóc xoăn Taper nam sành điệu', 'curly_fro', ['duong_pho', 'am_nhac', 'the_thao', 'ca_tinh'], '#33211b', '#ba7e43', 'nam'],
    ['silver_fox_m', 'Tóc muối tiêu quý ông lịch lãm', 'slick_back', ['cong_so', 'da_hoi', 'hoang_gia', 'sang_chanh'], '#c9c5c0', '#f8fafc', 'nam'],
    ['french_bob_f', 'Tóc French Bob cổ điển Pháp', 'bob', ['cong_so', 'retro', 'sang_chanh', 'tinh_yeu'], '#33211b', '#5a3825', 'nu'],
    ['blunt_bob_f', 'Tóc Blunt Bob cắt bằng', 'bob', ['cong_so', 'ca_tinh', 'toi_gian', 'scifi'], '#1b1518', '#a98bff', 'nu'],
    ['hush_cut_f', 'Tóc Hush Cut tỉa bay Hàn Quốc', 'curtain_bangs', ['de_thuong', 'hoc_duong', 'ngot_ngao', 'duong_pho'], '#5a3825', '#ba7e43', 'nu'],
    ['butterfly_cut_f', 'Tóc Butterfly Cut tầng bồng bềnh', 'long_wavy', ['da_hoi', 'sang_chanh', 'tinh_yeu', 'am_nhac'], '#875331', '#e8c47a', 'nu'],
    ['jellyfish_cut', 'Tóc sứa Jellyfish độc lạ', 'hime_cut', ['scifi', 'ca_tinh', 'am_nhac', 'lay_loi'], '#1b1518', '#00e5ff', 'nu'],
    ['hollywood_waves', 'Tóc sóng nước Hollywood thảm đỏ', 'long_wavy', ['da_hoi', 'cuoi_hoi', 'sang_chanh', 'retro'], '#e8c47a', '#f5e6c4', 'nu'],
    ['beach_waves_f', 'Tóc xoăn sóng biển nhẹ nhàng', 'lob', ['bien_dao', 'mua_he', 'ngot_ngao', 'tinh_yeu'], '#ba7e43', '#e8c47a', 'nu'],
    ['bubble_ponytail', 'Tóc đuôi ngựa bong bóng', 'high_ponytail', ['am_nhac', 'de_thuong', 'duong_pho', 'the_thao'], '#e85f8c', '#ff9ec4', 'nu'],
    ['french_twist_f', 'Tóc búi xoắn Pháp thanh lịch', 'elegant_bun', ['cuoi_hoi', 'da_hoi', 'cong_so', 'hoang_gia'], '#33211b', '#e8c47a', 'nu'],
    ['messy_bun_f', 'Tóc búi rối lười biếng', 'onion_bun', ['duong_pho', 'hoc_duong', 'de_thuong', 'toi_gian'], '#5a3825', '#875331', 'nu'],
    ['fishtail_braid', 'Tóc tết xương cá Fishtail', 'braid_side', ['cuoi_hoi', 'bien_dao', 'ky_ao', 'ngot_ngao'], '#e8c47a', '#ff9ec4', 'nu'],
    ['box_braids_f', 'Tóc tết sợi Box Braids', 'dreadlocks', ['duong_pho', 'am_nhac', 'ca_tinh', 'mua_he'], '#1b1518', '#6242b8', 'nu'],
    ['milkmaid_braids', 'Tóc tết vòng cô gái nông thôn', 'braid_crown', ['retro', 'de_thuong', 'co_trang', 'ngot_ngao'], '#ba7e43', '#e8c47a', 'nu'],
    ['odango_anime', 'Tóc búi tròn Odango Thủy Thủ', 'space_buns', ['de_thuong', 'ky_ao', 'am_nhac', 'ngot_ngao'], '#ffd600', '#ff2e93', 'nu'],
    ['co_tam_updo', 'Tóc vấn khăn Cô Tấm cổ truyền', 'imperial_updo', ['van_hoa_vn', 'co_trang', 'cuoi_hoi', 'hoang_gia'], '#1b1518', '#a62936', 'truyen_thong'],
  ],

  top: [
    ['oxford_shirt_m', 'Áo sơ mi Oxford nam cổ điển', 'blouse', ['cong_so', 'hoc_duong', 'sang_chanh', 'toi_gian'], '#6ec6ff', '#ffffff', 'nam'],
    ['cuban_collar_m', 'Áo sơ mi cổ Cuba (Camp Collar)', 'hawaiian_shirt', ['mua_he', 'bien_dao', 'retro', 'duong_pho'], '#f6e7d8', '#a6774f', 'nam'],
    ['mandarin_shirt_m', 'Áo sơ mi cổ Tàu nam thanh lịch', 'ao_ngu_than_nam', ['cong_so', 'van_hoa_vn', 'toi_gian', 'cuoi_hoi'], '#ffffff', '#2b2533', 'nam'],
    ['denim_shirt_m', 'Áo sơ mi bò Denim nam', 'flannel_shirt', ['duong_pho', 'retro', 'ca_tinh', 'hanh_dong'], '#2f6fd6', '#f6e7d8', 'nam', 'denim'],
    ['linen_shirt_m', 'Áo sơ mi đũi Linen đi biển nam', 'mens_guayabera', ['bien_dao', 'mua_he', 'toi_gian', 'sang_chanh'], '#ffffff', '#f6e7d8', 'nam'],
    ['satin_shirt_m', 'Áo sơ mi lụa Satin nam dự tiệc', 'dress_shirt_tie', ['da_hoi', 'sang_chanh', 'am_nhac', 'tinh_yeu'], '#781d32', '#15121b', 'nam'],
    ['crewneck_tee_m', 'Áo thun cổ tròn nam Crewneck', 'tee', ['duong_pho', 'the_thao', 'toi_gian', 'hoc_duong'], '#2b2533', '#ffffff', 'nam'],
    ['vneck_tee_m', 'Áo thun cổ tim nam V-Neck', 'scrubs_top', ['duong_pho', 'mua_he', 'toi_gian', 'tinh_yeu'], '#ffffff', '#7c828f', 'nam'],
    ['boxy_tee_m', 'Áo thun Boxy Oversize nam', 'tee', ['duong_pho', 'ca_tinh', 'am_nhac', 'hoc_duong'], '#15121b', '#ff5722', 'nam', 'plain', { fit: 'oversize' }],
    ['sweatshirt_m', 'Áo nỉ chui đầu Sweatshirt', 'sweater', ['mua_dong', 'duong_pho', 'hoc_duong', 'the_thao'], '#7c828f', '#ffffff', 'nam'],
    ['zip_hoodie_m', 'Áo Hoodie khóa kéo nam', 'hoodie', ['duong_pho', 'mua_dong', 'the_thao', 'ca_tinh'], '#2b2533', '#d9d3cb', 'nam'],
    ['cable_knit_m', 'Áo len vặn thừng Cable Knit', 'sweater', ['mua_dong', 'cong_so', 'retro', 'sang_chanh'], '#f6e7d8', '#a6774f', 'unisex', 'argyle'],
    ['argyle_vest_m', 'Áo gile len quả trám Argyle', 'knit_vest', ['hoc_duong', 'cong_so', 'retro', 'mua_dong'], '#1c3568', '#c92a46', 'nam', 'argyle'],
    ['polo_sport_m', 'Áo Polo thể thao Golf/Tennis', 'polo_shirt', ['the_thao', 'cong_so', 'sang_chanh', 'mua_he'], '#ffffff', '#1a6b4f', 'nam'],
    ['basketball_tank_m', 'Áo bóng rổ không tay nam', 'muscle_tank', ['the_thao', 'duong_pho', 'am_nhac', 'mua_he'], '#4b2d80', '#ffd56b', 'nam'],
    ['football_shirt_m', 'Áo đấu bóng đá đội tuyển', 'jersey', ['the_thao', 'van_hoa_vn', 'hanh_dong', 'mua_he'], '#c92a46', '#ffea00', 'nam'],
    ['cycling_jersey', 'Áo đua xe đạp Cycling Jersey', 'compression_top', ['the_thao', 'hanh_dong', 'mua_he', 'scifi'], '#ffea00', '#15121b', 'the_thao'],
    ['rashguard_swim', 'Áo bơi tay dài chống nắng Rashguard', 'compression_top', ['bien_dao', 'mua_he', 'the_thao', 'hanh_dong'], '#1c3568', '#00e5ff', 'the_thao'],
    ['vovinam_gi', 'Áo võ phục Vovinam xanh lam', 'karate_gi_top', ['van_hoa_vn', 'the_thao', 'hanh_dong', 'hoc_duong'], '#2f6fd6', '#ffd56b', 'truyen_thong'],
    ['taekwondo_gi', 'Áo võ phục Taekwondo cổ chữ V', 'karate_gi_top', ['the_thao', 'hanh_dong', 'hoc_duong'], '#ffffff', '#15121b', 'the_thao'],
    ['referee_shirt', 'Áo trọng tài kẻ sọc đen trắng', 'polo_shirt', ['the_thao', 'lay_loi', 'cong_so'], '#ffffff', '#15121b', 'nghe_nghiep', 'pinstripe'],
    ['waiter_vest', 'Áo ghi-lê bồi bàn nhà hàng', 'vest_gilet', ['cong_so', 'da_hoi', 'sang_chanh', 'retro'], '#781d32', '#ffffff', 'nghe_nghiep'],
    ['nurse_top', 'Áo đồng phục Y tá', 'scrubs_top', ['cong_so', 'de_thuong', 'toi_gian'], '#ffb3c7', '#ffffff', 'nghe_nghiep'],
    ['chainmail_top', 'Áo giáp lưới trung cổ Chainmail', 'knight_plate', ['co_trang', 'ky_ao', 'hanh_dong', 'hoang_gia'], '#7c828f', '#d9d3cb', 'hoa_trang', 'dragon_scale'],
    ['baby_tee_f', 'Áo Baby Tee ôm dáng Y2K', 'crop_top', ['duong_pho', 'de_thuong', 'mua_he', 'ca_tinh'], '#ffffff', '#ff2e93', 'nu'],
    ['camisole_lace', 'Áo hai dây ren Camisole', 'tank', ['da_hoi', 'mua_he', 'ngot_ngao', 'tinh_yeu'], '#ffb3c7', '#ffffff', 'nu', 'lace'],
    ['babydoll_top', 'Áo Babydoll xòe dễ thương', 'puff_blouse', ['de_thuong', 'ngot_ngao', 'mua_he', 'hoc_duong'], '#ffffff', '#ffb3c7', 'nu', 'flower'],
    ['bustier_top', 'Áo Bustier cúp ngực dạ hội', 'corset_top', ['da_hoi', 'sang_chanh', 'ca_tinh', 'am_nhac'], '#15121b', '#d4af37', 'nu'],
    ['smock_top', 'Áo Smock nhún chun tay phồng', 'puff_blouse', ['mua_he', 'bien_dao', 'de_thuong', 'retro'], '#ffd56b', '#ffffff', 'nu'],
    ['cold_shoulder', 'Áo khoét vai Cold-Shoulder', 'off_shoulder', ['mua_he', 'da_hoi', 'tinh_yeu', 'ngot_ngao'], '#c79bff', '#ffffff', 'nu'],
    ['cowl_neck_top', 'Áo cổ đổ lụa Cowl Neck', 'halter_top', ['da_hoi', 'sang_chanh', 'tinh_yeu', 'cong_so'], '#d4af37', '#ffffff', 'nu'],
    ['cheerleader_top', 'Áo cổ vũ Cheerleader', 'idol_crop', ['the_thao', 'hoc_duong', 'am_nhac', 'de_thuong'], '#c92a46', '#ffffff', 'the_thao'],
    ['ao_tho_cam_top', 'Áo Thổ Cẩm Tây Bắc', 'ao_ba_ba', ['van_hoa_vn', 'co_trang', 'mua_dong', 'retro'], '#c92a46', '#ffd56b', 'truyen_thong', 'tho_cam'],
    ['tang_suit_top', 'Áo Đường Trang cổ điển', 'ao_ngu_than_nam', ['co_trang', 'hoang_gia', 'van_hoa_vn', 'cuoi_hoi'], '#c92a46', '#d4af37', 'truyen_thong', 'brocade'],
    ['mock_neck_top', 'Áo cổ lọ thấp Mock Neck', 'turtleneck_men', ['cong_so', 'toi_gian', 'mua_dong', 'sang_chanh'], '#f6e7d8', '#a6774f', 'unisex'],
    ['boat_neck_top', 'Áo cổ thuyền Breton kẻ ngang', 'tee', ['retro', 'bien_dao', 'cong_so', 'toi_gian'], '#ffffff', '#1c3568', 'unisex', 'stripe'],
  ],

  outer: [
    ['overcoat_men', 'Áo khoác dạ Overcoat nam', 'double_breasted_coat', ['mua_dong', 'cong_so', 'sang_chanh', 'da_hoi'], '#a6774f', '#2b2533', 'nam'],
    ['duffle_coat', 'Áo khoác Duffle cài khuy gỗ', 'peacoat', ['mua_dong', 'hoc_duong', 'retro', 'cong_so'], '#5a3825', '#f6e7d8', 'unisex'],
    ['chesterfield', 'Áo khoác Chesterfield cổ nhung', 'double_breasted_coat', ['cong_so', 'hoang_gia', 'da_hoi', 'sang_chanh'], '#15121b', '#781d32', 'nam'],
    ['cafe_racer_m', 'Áo khoác da Cafe Racer nam', 'leather_jacket', ['duong_pho', 'ca_tinh', 'hanh_dong', 'retro'], '#2b2533', '#d9d3cb', 'nam'],
    ['suede_jacket', 'Áo khoác da lộn Suede', 'harrington_jacket', ['retro', 'cong_so', 'mua_dong', 'sang_chanh'], '#a6774f', '#5a3825', 'nam'],
    ['chore_coat_m', 'Áo khoác Chore Coat công nhân', 'safari_jacket', ['duong_pho', 'retro', 'cong_so', 'toi_gian'], '#1c3568', '#a6774f', 'nam'],
    ['field_m65_m', 'Áo khoác quân đội Field M-65', 'safari_jacket', ['hanh_dong', 'duong_pho', 'mua_dong', 'ca_tinh'], '#556b2f', '#2b2533', 'nam', 'camo'],
    ['ma1_bomber', 'Áo khoác Bomber phi công MA-1', 'bomber_jacket', ['duong_pho', 'hanh_dong', 'the_thao', 'ca_tinh'], '#15121b', '#ff5722', 'nam'],
    ['smoking_jacket', 'Áo khoác nhung Smoking quý ông', 'suit_jacket_men', ['da_hoi', 'hoang_gia', 'sang_chanh', 'retro'], '#781d32', '#15121b', 'nam'],
    ['anorak_outer', 'Áo khoác chui đầu Anorak', 'windbreaker', ['the_thao', 'mua_dong', 'duong_pho', 'hanh_dong'], '#ff9f5a', '#1c3568', 'unisex'],
    ['raincoat_trench', 'Áo mưa măng tô chống nước', 'trench_coat', ['mua_dong', 'cong_so', 'duong_pho', 'toi_gian'], '#ffea00', '#15121b', 'unisex'],
    ['duster_coat', 'Áo khoác Duster cao bồi dài', 'trench_coat', ['retro', 'hanh_dong', 'bi_an', 'hai_tac'], '#5a3825', '#a6774f', 'nam'],
    ['jinbaori_outer', 'Áo choàng Samurai Jinbaori', 'kimono_haori', ['co_trang', 'hoang_gia', 'hanh_dong', 'bi_an'], '#781d32', '#d4af37', 'truyen_thong', 'brocade'],
    ['superhero_cape', 'Áo choàng Siêu Anh Hùng bay phấp phới', 'royal_cape', ['hanh_dong', 'ky_ao', 'scifi', 'lay_loi'], '#c92a46', '#ffea00', 'hoa_trang'],
    ['judge_robe', 'Áo choàng Thẩm phán tòa án', 'grad_gown', ['cong_so', 'bi_an', 'lay_loi', 'hoang_gia'], '#15121b', '#ffffff', 'nghe_nghiep'],
    ['bolero_shrug', 'Áo khoác lửng Bolero dự tiệc', 'cardigan', ['da_hoi', 'cuoi_hoi', 'ngot_ngao', 'sang_chanh'], '#ffffff', '#ffb3c7', 'nu'],
    ['oversized_blazer', 'Blazer Oversize cá tính', 'blazer', ['cong_so', 'duong_pho', 'sang_chanh', 'ca_tinh'], '#7c828f', '#15121b', 'unisex', 'check', { fit: 'oversize' }],
    ['tweed_jacket', 'Áo khoác vải dạ Tweed tiểu thư', 'blazer', ['sang_chanh', 'cong_so', 'da_hoi', 'hoang_gia'], '#ffb3c7', '#ffffff', 'nu', 'houndstooth'],
    ['long_cardigan', 'Cardigan len dáng dài mùa thu', 'trench_coat', ['mua_dong', 'ngot_ngao', 'hoc_duong', 'toi_gian'], '#f6e7d8', '#a6774f', 'nu'],
    ['grab_green_coat', 'Áo khoác xe ôm xanh lá', 'shipper_jacket', ['lay_loi', 'van_hoa_vn', 'duong_pho', 'hanh_dong'], '#1a6b4f', '#ffffff', 'lay_loi'],
    ['be_yellow_coat', 'Áo khoác xe ôm vàng rực', 'shipper_jacket', ['lay_loi', 'van_hoa_vn', 'duong_pho', 'hanh_dong'], '#ffea00', '#1c3568', 'lay_loi'],
    ['shopee_orange', 'Áo khoác giao hàng cam chói', 'shipper_jacket', ['lay_loi', 'van_hoa_vn', 'duong_pho', 'hanh_dong'], '#ff5722', '#ffffff', 'lay_loi'],
  ],

  bottom: [
    ['straight_jeans_m', 'Quần Jeans ống đứng nam', 'jeans', ['duong_pho', 'cong_so', 'toi_gian', 'retro'], '#1c3568', '#a6774f', 'nam', 'denim'],
    ['baggy_jeans_m', 'Quần Jeans Baggy rộng nam', 'wide_trousers', ['duong_pho', 'am_nhac', 'ca_tinh', 'hoc_duong'], '#2f6fd6', '#ffffff', 'nam', 'denim'],
    ['mom_jeans_f', 'Quần Mom Jeans cạp cao', 'jeans', ['duong_pho', 'retro', 'hoc_duong', 'toi_gian'], '#6ec6ff', '#ffffff', 'nu', 'denim'],
    ['boyfriend_jeans', 'Quần Boyfriend Jeans cá tính', 'wide_trousers', ['duong_pho', 'ca_tinh', 'retro', 'hoc_duong'], '#2f6fd6', '#d9d3cb', 'nu', 'denim'],
    ['bootcut_jeans', 'Quần ống loe nhẹ Bootcut', 'bell_bottoms', ['retro', 'duong_pho', 'cong_so', 'am_nhac'], '#1c3568', '#ffd56b', 'unisex', 'denim'],
    ['khaki_pants_m', 'Quần Khaki công sở nam', 'chino_pants', ['cong_so', 'hoc_duong', 'toi_gian', 'retro'], '#f6e7d8', '#a6774f', 'nam'],
    ['corduroy_pants', 'Quần nhung tăm Corduroy', 'wide_trousers', ['mua_dong', 'retro', 'cong_so', 'hoc_duong'], '#5a3825', '#a6774f', 'unisex', 'pinstripe'],
    ['linen_pants_m', 'Quần vải đũi Linen nam', 'wide_trousers', ['mua_he', 'bien_dao', 'toi_gian', 'sang_chanh'], '#f6e7d8', '#ffffff', 'nam'],
    ['parachute_pants', 'Quần dù ống rộng Parachute', 'harem_pants', ['duong_pho', 'am_nhac', 'scifi', 'ca_tinh'], '#2b2533', '#00e5ff', 'unisex'],
    ['sweatpants_m', 'Quần nỉ thể thao Sweatpants', 'joggers', ['the_thao', 'mua_dong', 'duong_pho', 'lay_loi'], '#d9d3cb', '#ffffff', 'unisex'],
    ['leggings_f', 'Quần Legging ôm thể thao', 'skinny_jeans', ['the_thao', 'duong_pho', 'toi_gian', 'hanh_dong'], '#15121b', '#ff6b8b', 'nu'],
    ['yoga_flare', 'Quần tập Yoga ống loe', 'bell_bottoms', ['the_thao', 'duong_pho', 'de_thuong', 'toi_gian'], '#4b2d80', '#ffb3c7', 'nu'],
    ['chino_shorts_m', 'Quần short Kaki nam lịch sự', 'bermuda', ['mua_he', 'bien_dao', 'cong_so', 'toi_gian'], '#f6e7d8', '#2b2533', 'nam'],
    ['cargo_shorts_m', 'Quần short túi hộp Cargo nam', 'bermuda', ['duong_pho', 'mua_he', 'hanh_dong', 'ca_tinh'], '#556b2f', '#2b2533', 'nam'],
    ['running_shorts', 'Quần chạy bộ thể thao', 'shorts', ['the_thao', 'mua_he', 'hanh_dong'], '#15121b', '#76ff03', 'the_thao'],
    ['palazzo_pants', 'Quần ống siêu rộng Palazzo', 'silk_pants', ['da_hoi', 'sang_chanh', 'mua_he', 'bien_dao'], '#ffffff', '#ffd56b', 'nu'],
    ['dhoti_pants', 'Quần Dhoti truyền thống Ấn Độ', 'harem_pants', ['co_trang', 'hoang_gia', 'van_hoa_vn', 'ky_ao'], '#f6e7d8', '#d4af37', 'truyen_thong'],
    ['quan_ba_ba', 'Quần lĩnh đen bà ba Nam Bộ', 'silk_pants', ['van_hoa_vn', 'co_trang', 'retro', 'toi_gian'], '#15121b', '#2b2533', 'truyen_thong'],
    ['tennis_skirt', 'Chân váy Tennis xếp ly trắng', 'pleated_skirt', ['the_thao', 'hoc_duong', 'de_thuong', 'mua_he'], '#ffffff', '#1a6b4f', 'nu'],
    ['cargo_skirt', 'Chân váy túi hộp Cargo', 'aline_skirt', ['duong_pho', 'ca_tinh', 'scifi', 'am_nhac'], '#556b2f', '#15121b', 'nu'],
    ['leather_mini', 'Chân váy da ngắn Rock', 'mini_skirt', ['am_nhac', 'duong_pho', 'ca_tinh', 'kinh_di'], '#15121b', '#d9d3cb', 'nu'],
    ['denim_skirt', 'Chân váy bò chữ A Denim', 'aline_skirt', ['duong_pho', 'hoc_duong', 'mua_he', 'retro'], '#2f6fd6', '#ffd56b', 'nu', 'denim'],
    ['midi_skirt', 'Chân váy Midi thanh lịch', 'aline_skirt', ['cong_so', 'ngot_ngao', 'retro', 'sang_chanh'], '#ffb3c7', '#ffffff', 'nu'],
    ['slip_skirt', 'Chân váy lụa bóng Slip Skirt', 'maxi_skirt', ['da_hoi', 'sang_chanh', 'tinh_yeu', 'toi_gian'], '#d4af37', '#ffffff', 'nu'],
    ['tulip_skirt', 'Chân váy hoa Tulip xòe nhẹ', 'wrap_skirt', ['cong_so', 'da_hoi', 'ngot_ngao', 'tinh_yeu'], '#ff6b8b', '#ffffff', 'nu'],
    ['vay_tho_cam', 'Váy đụp thổ cẩm vùng cao', 'maxi_skirt', ['van_hoa_vn', 'co_trang', 'mua_dong', 'retro'], '#c92a46', '#ffd56b', 'truyen_thong', 'tho_cam'],
  ],

  dress: [
    ['business_suit_m', 'Bộ Vest công sở nam 3 món', 'suit_full', ['cong_so', 'da_hoi', 'sang_chanh', 'cuoi_hoi'], '#2b2533', '#c92a46', 'nam'],
    ['white_tie_m', 'Bộ lễ phục White Tie Hoàng Gia', 'tuxedo_men', ['hoang_gia', 'da_hoi', 'cuoi_hoi', 'sang_chanh'], '#15121b', '#ffffff', 'nam'],
    ['linen_suit_m', 'Bộ Vest đũi mùa hè nam', 'suit_full', ['mua_he', 'bien_dao', 'cuoi_hoi', 'sang_chanh'], '#f6e7d8', '#2f6fd6', 'nam'],
    ['sherwani_men', 'Áo Sherwani hoàng tử Ấn Độ', 'ao_dai_nam', ['co_trang', 'hoang_gia', 'cuoi_hoi', 'da_hoi'], '#d4af37', '#781d32', 'truyen_thong', 'brocade'],
    ['hanbok_men', 'Hanbok nam truyền thống Hàn Quốc', 'ao_ngu_than_full', ['co_trang', 'hoang_gia', 'cuoi_hoi', 'de_thuong'], '#6ec6ff', '#1c3568', 'truyen_thong'],
    ['hanfu_men', 'Hán phục công tử cổ trang nam', 'hanfu_gown', ['co_trang', 'ky_ao', 'hoang_gia', 'bi_an'], '#ffffff', '#2f6fd6', 'truyen_thong'],
    ['lederhosen_m', 'Đồ quần yếm da Đức Lederhosen', 'overall', ['co_trang', 'retro', 'lay_loi', 'am_nhac'], '#5a3825', '#ffffff', 'truyen_thong'],
    ['butler_suit_m', 'Bộ lễ phục Quản gia quý tộc', 'tuxedo_men', ['cong_so', 'hoang_gia', 'bi_an', 'kinh_di'], '#15121b', '#c92a46', 'nghe_nghiep'],
    ['doctor_full_m', 'Bộ đồng phục Bác sĩ toàn thân', 'suit_full', ['cong_so', 'hoc_duong', 'scifi', 'toi_gian'], '#ffffff', '#008080', 'nghe_nghiep'],
    ['chef_full_m', 'Bộ đồng phục Bếp trưởng', 'suit_full', ['cong_so', 'van_hoa_vn', 'lay_loi'], '#ffffff', '#15121b', 'nghe_nghiep'],
    ['ninja_shinobi', 'Bộ đồ Ninja Shinobi đêm đen', 'cyber_suit', ['co_trang', 'hanh_dong', 'bi_an', 'ca_tinh'], '#15121b', '#c92a46', 'hoa_trang'],
    ['viking_warrior', 'Bộ chiến binh Viking Bắc Âu', 'samurai_armor', ['co_trang', 'hanh_dong', 'ky_ao', 'hai_tac'], '#5a3825', '#7c828f', 'hoa_trang'],
    ['superhero_suit', 'Bộ đồ Siêu Anh Hùng bó sát', 'cyber_suit', ['hanh_dong', 'scifi', 'ky_ao', 'lay_loi'], '#2f6fd6', '#c92a46', 'hoa_trang'],
    ['wetsuit_diver', 'Bộ đồ lặn biển Wetsuit', 'cyber_suit', ['bien_dao', 'the_thao', 'hanh_dong', 'mua_he'], '#15121b', '#00e5ff', 'the_thao'],
    ['skeleton_suit', 'Bộ đồ Bộ Xương Halloween', 'cyber_suit', ['kinh_di', 'bi_an', 'lay_loi', 'am_nhac'], '#15121b', '#ffffff', 'hoa_trang', 'zebra'],
    ['vampire_count', 'Bộ Bá tước Ma Cà Rồng', 'tuxedo_men', ['kinh_di', 'hoang_gia', 'bi_an', 'da_hoi'], '#15121b', '#781d32', 'hoa_trang'],
    ['wizard_robe', 'Áo choàng Phù thủy Học viện', 'hanfu_gown', ['ky_ao', 'hoc_duong', 'bi_an', 'kinh_di'], '#15121b', '#781d32', 'hoa_trang'],
    ['elf_costume', 'Bộ Yêu Tinh Giáng Sinh Elf', 'santa_suit', ['mua_dong', 'de_thuong', 'ky_ao', 'lay_loi'], '#1a6b4f', '#c92a46', 'hoa_trang'],
    ['aodai_cach_tan', 'Áo Dài Cách Tân hiện đại', 'aodai', ['van_hoa_vn', 'de_thuong', 'ngot_ngao', 'cuoi_hoi'], '#ffd56b', '#ffffff', 'truyen_thong', 'flower'],
    ['ao_giao_linh_vn', 'Áo Giao Lĩnh Việt cổ thời Lý-Trần', 'hanfu_gown', ['van_hoa_vn', 'co_trang', 'hoang_gia', 'bi_an'], '#781d32', '#d4af37', 'truyen_thong', 'brocade'],
    ['lbd_dress', 'Đầm đen huyền thoại Little Black Dress', 'slip_dress', ['da_hoi', 'sang_chanh', 'toi_gian', 'cong_so'], '#15121b', '#d4af37', 'nu'],
    ['bodycon_dress', 'Đầm ôm sát Bodycon quyến rũ', 'slip_dress', ['da_hoi', 'am_nhac', 'ca_tinh', 'sang_chanh'], '#c92a46', '#15121b', 'nu'],
    ['cocktail_dress', 'Đầm tiệc Cocktail lấp lánh', 'minidress', ['da_hoi', 'sang_chanh', 'tinh_yeu', 'am_nhac'], '#7c5cff', '#ffd56b', 'nu', 'sequin'],
    ['prom_gown', 'Đầm dạ hội Prom công chúa', 'ballgown', ['da_hoi', 'hoc_duong', 'hoang_gia', 'ngot_ngao'], '#ff6b8b', '#ffd56b', 'nu', 'sequin'],
    ['yukata_summer', 'Yukata lễ hội pháo hoa mùa hè', 'kimono_full', ['co_trang', 'mua_he', 'de_thuong', 'ngot_ngao'], '#6ec6ff', '#ff6b8b', 'truyen_thong', 'flower'],
    ['lehenga_indian', 'Đầm Lehenga Ấn Độ thêu vàng', 'sari_full', ['co_trang', 'da_hoi', 'cuoi_hoi', 'hoang_gia'], '#ff2e93', '#d4af37', 'truyen_thong', 'brocade'],
    ['sweet_lolita', 'Đầm Sweet Lolita kẹo ngọt', 'gothic_lolita', ['de_thuong', 'ngot_ngao', 'ky_ao', 'am_nhac'], '#ffb3c7', '#ffffff', 'nu', 'heart'],
    ['pinafore_dress', 'Váy yếm Pinafore học đường', 'school_uniform', ['hoc_duong', 'de_thuong', 'retro', 'ngot_ngao'], '#a6774f', '#ffffff', 'nu', 'check'],
    ['sweater_dress', 'Đầm len mùa đông ấm áp', 'minidress', ['mua_dong', 'de_thuong', 'cong_so', 'toi_gian'], '#f6e7d8', '#a6774f', 'nu'],
    ['shirt_dress', 'Đầm sơ mi thanh lịch công sở', 'sundress', ['cong_so', 'mua_he', 'toi_gian', 'hoc_duong'], '#6ec6ff', '#ffffff', 'nu', 'pinstripe'],
    ['ballet_dress', 'Đầm múa Ba Lê thiên nga', 'minidress', ['da_hoi', 'ky_ao', 'de_thuong', 'am_nhac'], '#ffffff', '#ffb3c7', 'nu'],
    ['cheerleader_set', 'Bộ cổ vũ Cheerleader nguyên cây', 'school_uniform', ['the_thao', 'hoc_duong', 'am_nhac', 'de_thuong'], '#c92a46', '#ffd56b', 'the_thao'],
    ['romper_summer', 'Bộ Romper đùi mùa hè', 'jumpsuit', ['mua_he', 'bien_dao', 'de_thuong', 'ngot_ngao'], '#ffd56b', '#ffffff', 'nu', 'flower'],
  ],

  shoes: [
    ['running_shoes', 'Giày chạy bộ Running siêu nhẹ', 'sneaker', ['the_thao', 'duong_pho', 'hanh_dong', 'mua_he'], '#00e5ff', '#15121b', 'the_thao'],
    ['dad_shoes', 'Giày thể thao đế hầm hố Dad Shoes', 'platform', ['duong_pho', 'ca_tinh', 'am_nhac', 'retro'], '#ffffff', '#7c828f', 'unisex'],
    ['canvas_converse', 'Giày vải cổ cao Canvas', 'high_top', ['hoc_duong', 'duong_pho', 'retro', 'am_nhac'], '#15121b', '#ffffff', 'unisex'],
    ['skate_slipon', 'Giày trượt ván Slip-on caro', 'loafer', ['duong_pho', 'the_thao', 'ca_tinh', 'hoc_duong'], '#15121b', '#ffffff', 'unisex', 'check'],
    ['monk_strap_m', 'Giày tây khóa cài Monk Strap nam', 'derby_shoes', ['cong_so', 'da_hoi', 'cuoi_hoi', 'sang_chanh'], '#5a3825', '#d4af37', 'nam'],
    ['penny_loafer_m', 'Giày lười Penny Loafer nam', 'loafer', ['cong_so', 'hoc_duong', 'retro', 'toi_gian'], '#781d32', '#15121b', 'nam'],
    ['chukka_boots_m', 'Bốt cổ lửng Chukka nam', 'chelsea_boots', ['cong_so', 'mua_dong', 'retro', 'toi_gian'], '#a6774f', '#5a3825', 'nam'],
    ['moccasins_m', 'Giày da lộn Moccasins nam', 'boat_shoes', ['mua_he', 'cong_so', 'sang_chanh', 'toi_gian'], '#a6774f', '#f6e7d8', 'nam'],
    ['espadrilles', 'Giày đế cói đi biển Espadrilles', 'boat_shoes', ['bien_dao', 'mua_he', 'retro', 'ngot_ngao'], '#f6e7d8', '#1c3568', 'unisex', 'stripe'],
    ['slides_sandal', 'Dép lê quai ngang Slides', 'dep_to_ong', ['duong_pho', 'mua_he', 'the_thao', 'bien_dao'], '#15121b', '#ffffff', 'unisex'],
    ['birkenstock', 'Dép đế bần 2 quai Birkenstock', 'sandals', ['duong_pho', 'mua_he', 'toi_gian', 'retro'], '#a6774f', '#2b2533', 'unisex'],
    ['thigh_high_boots', 'Bốt đùi siêu cao cá tính', 'knee_boots', ['da_hoi', 'am_nhac', 'ca_tinh', 'sang_chanh'], '#15121b', '#c92a46', 'nu'],
    ['kitten_heels', 'Cao gót đế thấp Kitten Heels', 'stiletto', ['cong_so', 'retro', 'ngot_ngao', 'da_hoi'], '#ffb3c7', '#ffffff', 'nu'],
    ['platform_heels', 'Cao gót đế đúp Platform Diva', 'platform', ['da_hoi', 'am_nhac', 'sang_chanh', 'ca_tinh'], '#ff2e93', '#ffd56b', 'nu'],
    ['mules_shoes', 'Giày sục hở gót Mules', 'loafer', ['cong_so', 'mua_he', 'sang_chanh', 'toi_gian'], '#f6e7d8', '#d4af37', 'nu'],
    ['tabi_shoes', 'Giày mũi chẻ Tabi Nhật Bản', 'ballet', ['co_trang', 'ca_tinh', 'scifi', 'duong_pho'], '#15121b', '#ffffff', 'truyen_thong'],
  ],

  hat: [
    ['snapback_m', 'Mũ lưỡi trai phẳng Snapback', 'trucker_cap', ['duong_pho', 'am_nhac', 'the_thao', 'ca_tinh'], '#15121b', '#ff2e93', 'nam'],
    ['dad_cap_m', 'Mũ lưỡi trai dáng mềm Dad Cap', 'cap', ['duong_pho', 'the_thao', 'mua_he', 'toi_gian'], '#f6e7d8', '#1c3568', 'nam'],
    ['boater_hat', 'Mũ cói phẳng Boater cổ điển', 'panama_hat', ['mua_he', 'bien_dao', 'retro', 'ngot_ngao'], '#f6e7d8', '#c92a46', 'unisex'],
    ['trilby_hat', 'Mũ phớt vành ngắn Trilby', 'fedora', ['am_nhac', 'cong_so', 'retro', 'bi_an'], '#2b2533', '#ffffff', 'nam'],
    ['pork_pie_hat', 'Mũ Pork Pie nhạc Jazz', 'bowler_hat', ['am_nhac', 'retro', 'bi_an', 'ca_tinh'], '#15121b', '#d4af37', 'nam'],
    ['boonie_hat', 'Mũ tai bèo dã ngoại Boonie', 'bucket_hat', ['hanh_dong', 'duong_pho', 'mua_he', 'the_thao'], '#556b2f', '#2b2533', 'nam', 'camo'],
    ['durag_head', 'Khăn trùm đầu Hip-hop Durag', 'bandana_head', ['duong_pho', 'am_nhac', 'ca_tinh', 'the_thao'], '#15121b', '#d4af37', 'nam'],
    ['sport_headband', 'Băng đô thể thao thấm mồ hôi', 'bandana_head', ['the_thao', 'hanh_dong', 'duong_pho', 'retro'], '#ffffff', '#c92a46', 'the_thao'],
    ['tennis_visor', 'Mũ nửa đầu thể thao Visor', 'cap', ['the_thao', 'mua_he', 'bien_dao', 'sang_chanh'], '#ffffff', '#1a6b4f', 'the_thao'],
    ['fullface_helmet', 'Mũ bảo hiểm Full-Face đua xe', 'helmet', ['hanh_dong', 'the_thao', 'scifi', 'ca_tinh'], '#c92a46', '#15121b', 'nam'],
    ['fire_helmet', 'Mũ bảo hộ Lính cứu hỏa', 'hard_hat', ['hanh_dong', 'cong_so', 'lay_loi'], '#c92a46', '#ffea00', 'nghe_nghiep'],
    ['nurse_cap', 'Mũ Y tá cổ điển', 'sailor_cap', ['cong_so', 'de_thuong', 'retro'], '#ffffff', '#c92a46', 'nghe_nghiep'],
    ['pharaoh_nemes', 'Mũ trùm đầu Pharaoh Ai Cập', 'turban', ['co_trang', 'hoang_gia', 'bi_an', 'ky_ao'], '#1c3568', '#ffd56b', 'truyen_thong', 'stripe'],
    ['roman_helmet', 'Mũ giáp La Mã mào đỏ', 'knight_helmet', ['co_trang', 'hoang_gia', 'hanh_dong'], '#d4af37', '#c92a46', 'hoa_trang'],
    ['keffiyeh_head', 'Khăn trùm đầu Trung Đông Keffiyeh', 'turban', ['co_trang', 'bi_an', 'mua_he', 'sang_chanh'], '#ffffff', '#c92a46', 'truyen_thong', 'check'],
    ['shower_cap', 'Mũ trùm đầu nilon đi tắm', 'beanie', ['lay_loi', 'de_thuong', 'mua_he'], '#ffb3c7', '#ffffff', 'lay_loi', 'dots'],
    ['sleeping_cap', 'Mũ ngủ dài cổ điển có quả bông', 'santa_hat', ['lay_loi', 'mua_dong', 'retro', 'de_thuong'], '#6ec6ff', '#ffffff', 'lay_loi', 'stars'],
    ['elf_hat', 'Mũ Yêu Tinh Giáng Sinh', 'santa_hat', ['mua_dong', 'ky_ao', 'de_thuong', 'lay_loi'], '#1a6b4f', '#c92a46', 'hoa_trang'],
    ['safari_pith', 'Mũ thám hiểm rừng xanh Safari', 'mu_coi', ['hanh_dong', 'retro', 'mua_he', 'dong_vat'], '#f6e7d8', '#a6774f', 'unisex'],
    ['paper_hat_lay', 'Mũ gấp bằng giấy báo hồi tiểu học', 'pirate_hat', ['lay_loi', 'hoc_duong', 'van_hoa_vn', 'retro'], '#d9d3cb', '#15121b', 'lay_loi'],
  ],

  glasses: [
    ['clubmaster', 'Kính nửa gọng Clubmaster', 'square_geek', ['cong_so', 'retro', 'sang_chanh', 'hoc_duong'], '#15121b', '#d4af37', 'nam'],
    ['oversized_diva', 'Kính râm bản to Diva thảm đỏ', 'cat_eye', ['da_hoi', 'sang_chanh', 'bien_dao', 'mua_he'], '#15121b', '#d4af37', 'nu'],
    ['rimless_glasses', 'Kính không gọng trí thức', 'round', ['cong_so', 'toi_gian', 'sang_chanh', 'scifi'], '#d9d3cb', '#ffffff', 'unisex'],
    ['tiny_matrix', 'Kính siêu mảnh Y2K Matrix', 'shades', ['scifi', 'duong_pho', 'ca_tinh', 'bi_an'], '#15121b', '#15121b', 'unisex'],
    ['sport_shield', 'Kính râm thể thao chạy bộ', 'cyber_visor', ['the_thao', 'hanh_dong', 'mua_he', 'scifi'], '#15121b', '#ff5722', 'the_thao'],
    ['swim_goggles', 'Kính bơi đi biển', 'ski_goggles', ['bien_dao', 'the_thao', 'mua_he', 'lay_loi'], '#2f6fd6', '#00e5ff', 'the_thao'],
    ['safety_goggles', 'Kính bảo hộ phòng thí nghiệm', 'ski_goggles', ['scifi', 'cong_so', 'hoc_duong', 'lay_loi'], '#ffffff', '#6ec6ff', 'nghe_nghiep'],
    ['reading_glasses', 'Kính lão đọc báo ông bà', 'round', ['retro', 'lay_loi', 'cong_so'], '#d4af37', '#ffffff', 'lay_loi'],
    ['gold_aviator', 'Kính phi công gọng vàng cổ điển', 'aviator', ['sang_chanh', 'hanh_dong', 'retro', 'bien_dao'], '#d4af37', '#15121b', 'nam'],
    ['cyber_neon_pink', 'Kính Cyberpunk Neon Hồng', 'cyber_visor', ['scifi', 'am_nhac', 'ca_tinh', 'duong_pho'], '#15121b', '#ff2e93', 'scifi'],
  ],

  acc: [
    ['messenger_bag', 'Túi đeo chéo Messenger nam', 'briefcase', ['cong_so', 'hoc_duong', 'duong_pho', 'toi_gian'], '#5a3825', '#2b2533', 'nam'],
    ['duffel_bag', 'Túi trống tập Gym Duffel', 'suitcase', ['the_thao', 'duong_pho', 'hanh_dong'], '#15121b', '#ff5722', 'nam'],
    ['shopping_bag', 'Túi mua sắm hàng hiệu', 'tote_bag', ['sang_chanh', 'da_hoi', 'duong_pho'], '#ff6b8b', '#ffd56b', 'tui'],
    ['hiking_pack', 'Ba lô leo núi dã ngoại', 'backpack', ['the_thao', 'hanh_dong', 'mua_dong', 'duong_pho'], '#556b2f', '#ff5722', 'tui'],
    ['silk_tie_navy', 'Cà vạt lụa sọc doanh nhân', 'necktie', ['cong_so', 'da_hoi', 'cuoi_hoi', 'sang_chanh'], '#1c3568', '#ffffff', 'nam', 'stripe'],
    ['bolo_tie', 'Dây cổ cao bồi Bolo Tie', 'necktie', ['retro', 'am_nhac', 'ca_tinh'], '#5a3825', '#d4af37', 'nam'],
    ['ascot_scarf', 'Khăn quàng cổ quý ông Ascot', 'scarf', ['hoang_gia', 'da_hoi', 'retro', 'sang_chanh'], '#781d32', '#ffd56b', 'nam', 'paisley'],
    ['diamond_necklace', 'Dây chuyền kim cương lấp lánh', 'pearls', ['da_hoi', 'cuoi_hoi', 'hoang_gia', 'sang_chanh'], '#00e5ff', '#ffffff', 'trang_suc'],
    ['silver_chain_m', 'Dây chuyền xích bạc Streetwear', 'gold_chain', ['duong_pho', 'am_nhac', 'ca_tinh', 'scifi'], '#d9d3cb', '#ffffff', 'nam'],
    ['smart_watch', 'Đồng hồ thông minh thể thao', 'luxury_watch', ['the_thao', 'scifi', 'cong_so', 'toi_gian'], '#15121b', '#00e5ff', 'nam'],
    ['red_lantern', 'Đèn lồng đỏ cổ trang', 'star_lantern', ['co_trang', 'van_hoa_vn', 'hoang_gia', 'cuoi_hoi'], '#c92a46', '#ffd56b', 'cam_tay'],
    ['rose_single', 'Bông hồng đỏ lãng mạn', 'bouquet', ['tinh_yeu', 'da_hoi', 'cuoi_hoi', 'ngot_ngao'], '#c92a46', '#1a6b4f', 'cam_tay'],
    ['acoustic_guitar', 'Đàn Guitar thùng Acoustic', 'guitar', ['am_nhac', 'retro', 'hoc_duong', 'bien_dao'], '#a6774f', '#5a3825', 'cam_tay'],
    ['pirate_cutlass', 'Đao Hải Tặc Caribe', 'sword', ['hai_tac', 'hanh_dong', 'bien_dao', 'co_trang'], '#d9d3cb', '#d4af37', 'vu_khi'],
    ['gold_medal', 'Huy chương vàng Olympic', 'whistle_neck', ['the_thao', 'hoang_gia', 'hoc_duong', 'lay_loi'], '#ffd56b', '#c92a46', 'the_thao'],
    ['crystal_orb', 'Quả cầu pha lê tiên tri', 'basketball', ['ky_ao', 'bi_an', 'kinh_di'], '#c79bff', '#ffffff', 'cam_tay', 'plain', { glow: true }],
    ['diploma_scroll', 'Bằng tốt nghiệp cuộn ruy băng', 'wand', ['hoc_duong', 'cong_so', 'van_hoa_vn'], '#ffffff', '#c92a46', 'cam_tay'],
    ['surfboard_prop', 'Ván lướt sóng đi biển', 'skateboard', ['bien_dao', 'mua_he', 'the_thao'], '#00e5ff', '#ffea00', 'the_thao', 'plain', { scale: 1.45 }],
    ['parasol_lace', 'Ô ren cổ điển công chúa', 'umbrella', ['co_trang', 'cuoi_hoi', 'ngot_ngao', 'mua_he'], '#ffffff', '#ffb3c7', 'cam_tay', 'lace'],
    ['paint_roller', 'Cây lăn sơn thợ xây', 'plunger', ['lay_loi', 'cong_so', 'duong_pho'], '#ffffff', '#ff5722', 'lay_loi'],
  ],
};

// ---------- 3. Bộ biến thể phong cách & phiên bản Xóm Lầy 3D tham số hóa ----------
const CLOTHING_EDITIONS: readonly VariantDef[] = [
  { suffix: 'cong', label: 'Chăn Con Công', tags: ['lay_loi', 'van_hoa_vn', 'retro'], c: '#c92a46', c2: '#ffd56b', p: 'chan_con_cong', group: 'lay_loi', mod: { forcePat: 'chan_con_cong' } },
  { suffix: 'gold', label: 'Dát Vàng 9999', tags: ['sang_chanh', 'hoang_gia', 'lay_loi'], c: '#d4af37', c2: '#ffea00', p: 'sequin', group: 'lay_loi', mod: { trim: 'gold', forcePat: 'sequin' } },
  { suffix: 'neon', label: 'Neon LED Vũ Trường', tags: ['scifi', 'am_nhac', 'ca_tinh'], c: '#15121b', c2: '#00e5ff', p: 'cyber_grid', group: 'scifi', mod: { trim: 'neon', glow: true, forcePat: 'cyber_grid' } },
  { suffix: 'punk', label: 'Đinh Tán Rock Punk', tags: ['am_nhac', 'ca_tinh', 'kinh_di'], c: '#15121b', c2: '#ff2e93', p: 'plain', group: 'duong_pho', mod: { trim: 'spikes' } },
  { suffix: 'rainbow', label: 'Cầu Vồng Sặc Sỡ', tags: ['lay_loi', 'am_nhac', 'mua_he'], c: '#ff2e93', c2: '#ffea00', p: 'rainbow', group: 'lay_loi', mod: { forcePat: 'rainbow' } },
  { suffix: 'galaxy', label: 'Vũ Trụ Galaxy', tags: ['scifi', 'ky_ao', 'bi_an'], c: '#4b2d80', c2: '#00e5ff', p: 'galaxy', group: 'hoa_trang', mod: { forcePat: 'galaxy' } },
  { suffix: 'flame', label: 'Lửa Cháy Rực', tags: ['hanh_dong', 'am_nhac', 'ca_tinh'], c: '#15121b', c2: '#ff5722', p: 'flame', group: 'duong_pho', mod: { forcePat: 'flame' } },
  { suffix: 'leopard', label: 'Da Báo Quý Bà', tags: ['sang_chanh', 'lay_loi', 'dong_vat'], c: '#ff9f5a', c2: '#5a3825', p: 'leopard', group: 'lay_loi', mod: { forcePat: 'leopard' } },
  { suffix: 'cow', label: 'Bò Sữa Đáng Yêu', tags: ['dong_vat', 'de_thuong', 'lay_loi'], c: '#ffffff', c2: '#15121b', p: 'cow', group: 'lay_loi', mod: { forcePat: 'cow' } },
  { suffix: 'tiger', label: 'Vằn Hổ Báo Trường Mẫu Giáo', tags: ['dong_vat', 'hanh_dong', 'lay_loi'], c: '#ff9f5a', c2: '#15121b', p: 'tiger', group: 'lay_loi', mod: { forcePat: 'tiger' } },
  { suffix: 'thocam', label: 'Thổ Cẩm Tây Bắc', tags: ['van_hoa_vn', 'co_trang', 'retro'], c: '#c92a46', c2: '#ffd56b', p: 'tho_cam', group: 'truyen_thong', mod: { forcePat: 'tho_cam' } },
  { suffix: 'gam', label: 'Gấm Rồng Phượng Cung Đình', tags: ['hoang_gia', 'co_trang', 'van_hoa_vn'], c: '#781d32', c2: '#d4af37', p: 'brocade', group: 'truyen_thong', mod: { trim: 'gold', forcePat: 'brocade' } },
  { suffix: 'camo', label: 'Rằn Ri Quân Đội', tags: ['hanh_dong', 'duong_pho', 'ca_tinh'], c: '#556b2f', c2: '#2b2533', p: 'camo', group: 'nam', mod: { forcePat: 'camo' } },
  { suffix: 'tiedye', label: 'Tie-Dye Hippie Loang Màu', tags: ['retro', 'mua_he', 'bien_dao'], c: '#ff2e93', c2: '#00e5ff', p: 'tie_dye', group: 'duong_pho', mod: { forcePat: 'tie_dye' } },
  { suffix: 'sequin', label: 'Kim Sa Thảm Đỏ', tags: ['da_hoi', 'sang_chanh', 'am_nhac'], c: '#ff2e93', c2: '#ffd56b', p: 'sequin', group: 'da_hoi', mod: { forcePat: 'sequin' } },
  { suffix: 'reflect', label: 'Phản Quang Đêm Khuya', tags: ['lay_loi', 'scifi', 'duong_pho'], c: '#76ff03', c2: '#ffffff', p: 'plain', group: 'lay_loi', mod: { trim: 'reflective' } },
  { suffix: 'oversize', label: 'Oversize Siêu Rộng', tags: ['duong_pho', 'ca_tinh', 'lay_loi'], p: 'plain', group: 'duong_pho', mod: { fit: 'oversize' } },
  { suffix: 'fur', label: 'Viền Lông Quý Tộc', tags: ['mua_dong', 'sang_chanh', 'hoang_gia'], p: 'plain', group: 'da_hoi', mod: { collar: 'fur' } },
  { suffix: 'bow', label: 'Đính Nơ Bự Tiểu Thư', tags: ['de_thuong', 'ngot_ngao', 'da_hoi'], p: 'plain', group: 'nu', mod: { trim: 'bow' } },
  { suffix: 'chain', label: 'Gắn Xích Bạc Streetwear', tags: ['duong_pho', 'am_nhac', 'ca_tinh'], c: '#15121b', c2: '#d9d3cb', p: 'plain', group: 'nam', mod: { trim: 'chain' } },
  { suffix: 'lightning', label: 'Sấm Sét Bão Tố', tags: ['hanh_dong', 'scifi', 'am_nhac'], c: '#1c3568', c2: '#ffea00', p: 'lightning', group: 'nam', mod: { forcePat: 'lightning' } },
  { suffix: 'dragon', label: 'Vảy Rồng Huyền Thoại', tags: ['ky_ao', 'co_trang', 'hoang_gia'], c: '#1a6b4f', c2: '#ffd56b', p: 'dragon_scale', group: 'hoa_trang', mod: { forcePat: 'dragon_scale' } },
  { suffix: 'tartan', label: 'Caro Tartan Học Đường', tags: ['hoc_duong', 'retro', 'cong_so'], c: '#c92a46', c2: '#1c3568', p: 'tartan', group: 'unisex', mod: { forcePat: 'tartan' } },
  { suffix: 'hound', label: 'Răng Sói Sang Chảnh', tags: ['cong_so', 'sang_chanh', 'da_hoi'], c: '#15121b', c2: '#ffffff', p: 'houndstooth', group: 'da_hoi', mod: { forcePat: 'houndstooth' } },
  { suffix: 'flower', label: 'Hoa Nhí Bà Thím', tags: ['van_hoa_vn', 'mua_he', 'lay_loi'], c: '#ff6b8b', c2: '#ffea00', p: 'flower', group: 'lay_loi', mod: { forcePat: 'flower' } },
  { suffix: 'lace', label: 'Ren Xuyên Thấu', tags: ['da_hoi', 'kinh_di', 'ngot_ngao'], c: '#15121b', c2: '#ffffff', p: 'lace', group: 'nu', mod: { forcePat: 'lace' } },
  { suffix: 'nilon', label: 'Nilon Trong Suốt', tags: ['lay_loi', 'scifi', 'duong_pho'], c: '#6ec6ff', c2: '#ffffff', p: 'plain', group: 'lay_loi', mod: { alpha: 0.56 } },
];

const PROP_EDITIONS: readonly VariantDef[] = [
  { suffix: 'gold', label: 'Bản Dát Vàng 9999', tags: ['sang_chanh', 'hoang_gia', 'lay_loi'], c: '#d4af37', c2: '#ffea00', group: 'lay_loi', mod: {} },
  { suffix: 'giant', label: 'Bản Khổng Lồ X2', tags: ['lay_loi', 'ky_ao', 'hanh_dong'], group: 'lay_loi', mod: { fit: 'giant', scale: 1.38 } },
  { suffix: 'neon', label: 'Bản LED Phát Sáng', tags: ['scifi', 'am_nhac', 'lay_loi'], c: '#00e5ff', c2: '#ff2e93', group: 'scifi', mod: { glow: true } },
  { suffix: 'pink', label: 'Bản Hồng Nam Tính', tags: ['lay_loi', 'de_thuong', 'ngot_ngao'], c: '#ff2e93', c2: '#ffb3c7', group: 'lay_loi', mod: {} },
  { suffix: 'rainbow', label: 'Bản Cầu Vồng', tags: ['lay_loi', 'am_nhac', 'de_thuong'], c: '#ff2e93', c2: '#ffea00', p: 'rainbow', group: 'lay_loi', mod: { forcePat: 'rainbow' } },
  { suffix: 'cong', label: 'Bản Chăn Con Công', tags: ['lay_loi', 'van_hoa_vn', 'retro'], c: '#c92a46', c2: '#ffd56b', p: 'chan_con_cong', group: 'lay_loi', mod: { forcePat: 'chan_con_cong' } },
  { suffix: 'dark', label: 'Bản Hắc Ám Gothic', tags: ['kinh_di', 'bi_an', 'ca_tinh'], c: '#15121b', c2: '#c92a46', group: 'hoa_trang', mod: {} },
  { suffix: 'crystal', label: 'Bản Pha Lê Trong Suốt', tags: ['ky_ao', 'hoang_gia', 'sang_chanh'], c: '#6ec6ff', c2: '#ffffff', group: 'da_hoi', mod: { alpha: 0.62, glow: true } },
  { suffix: 'camo', label: 'Bản Rằn Ri Quân Sự', tags: ['hanh_dong', 'duong_pho', 'ca_tinh'], c: '#556b2f', c2: '#2b2533', p: 'camo', group: 'nam', mod: { forcePat: 'camo' } },
  { suffix: 'leopard', label: 'Bản Da Báo Chảnh Sả', tags: ['sang_chanh', 'lay_loi', 'dong_vat'], c: '#ff9f5a', c2: '#5a3825', p: 'leopard', group: 'lay_loi', mod: { forcePat: 'leopard' } },
];

const HAIR_EDITIONS: readonly (readonly [string, string, string, string, readonly ThoiTrangTag[], string])[] = [
  ['bach_kim', 'Bạch Kim Idol', '#f8fafc', '#c9c5c0', ['am_nhac', 'sang_chanh', 'scifi'], 'unisex'],
  ['hong_neon', 'Hồng Neon Nổi Bật', '#ff2e93', '#ff9ec4', ['am_nhac', 'lay_loi', 'duong_pho'], 'lay_loi'],
  ['xanh_dien', 'Xanh Cyan Cyberpunk', '#00e5ff', '#1e3a8a', ['scifi', 'am_nhac', 'ca_tinh'], 'scifi'],
  ['do_ruou', 'Đỏ Rượu Quyến Rũ', '#a62936', '#7f1d1d', ['da_hoi', 'kinh_di', 'ca_tinh'], 'unisex'],
  ['vang_gold', 'Vàng Kim Hoàng Gia', '#ffd600', '#e8c47a', ['hoang_gia', 'ky_ao', 'am_nhac'], 'unisex'],
  ['tim_mong', 'Tím Mộng Mơ', '#a98bff', '#6242b8', ['ky_ao', 'de_thuong', 'am_nhac'], 'nu'],
  ['xanh_la', 'Xanh Lá Chói Lòa', '#76ff03', '#4f9460', ['lay_loi', 'duong_pho', 'scifi'], 'lay_loi'],
  ['cam_chay', 'Cam Cháy Rực Lửa', '#ff6d00', '#ffd600', ['am_nhac', 'hanh_dong', 'lay_loi'], 'nam'],
];

function mergeTags(a: readonly ThoiTrangTag[], b: readonly ThoiTrangTag[]): readonly ThoiTrangTag[] {
  const s = new Set<ThoiTrangTag>(a);
  for (const t of b) s.add(t);
  return [...s];
}

export function buildExpandedCatalogItems(
  baseCatalog: Readonly<Record<ThoiTrangCategoryId, readonly ThoiTrangCatalogItem[]>>,
  accSubMap: Readonly<Record<string, ThoiTrangAccSubSlot>>,
): {
  items: Record<ThoiTrangCategoryId, ThoiTrangCatalogItem[]>;
  extraAccSub: Record<string, ThoiTrangAccSubSlot>;
} {
  const items: Record<ThoiTrangCategoryId, ThoiTrangCatalogItem[]> = {
    hair: [], top: [], outer: [], bottom: [], dress: [], shoes: [], hat: [], glasses: [], acc: [],
  };
  const extraAccSub: Record<string, ThoiTrangAccSubSlot> = {};
  const seen = new Map<ThoiTrangCategoryId, Set<string>>();
  for (const cat of Object.keys(items) as ThoiTrangCategoryId[]) {
    seen.set(cat, new Set(baseCatalog[cat].map((x) => x.id)));
  }

  const pushItem = (cat: ThoiTrangCategoryId, it: ThoiTrangCatalogItem) => {
    const s = seen.get(cat)!;
    if (s.has(it.id)) return;
    s.add(it.id);
    items[cat].push(it);
    if (cat === 'acc' && it.subSlot) extraAccSub[it.id] = it.subSlot;
  };

  const baseById = new Map<string, ThoiTrangCatalogItem>();
  for (const cat of Object.keys(baseCatalog) as ThoiTrangCategoryId[]) {
    for (const it of baseCatalog[cat]) baseById.set(`${cat}:${it.id}`, it);
  }

  // 1. Add all real-world human garment taxonomy entries
  for (const cat of Object.keys(WORLD_ITEMS) as ThoiTrangCategoryId[]) {
    const cPal: ThoiTrangPaletteKey = cat === 'hair' ? 'hair' : 'fashion';
    const allowPat = cat !== 'hair' && cat !== 'glasses';
    for (const [id, name, base, tags, c, c2, group, p = 'plain', mod] of WORLD_ITEMS[cat]) {
      const subSlot = cat === 'acc' ? accSubMap[base] : undefined;
      pushItem(cat, {
        id, name, tags, c, c2, p: allowPat ? p : 'plain',
        cPal, c2Pal: cPal,
        c2Label: cat === 'hair' ? 'Màu phụ / 2-tone' : 'Màu phụ',
        pat: allowPat,
        group,
        iconKey: `${cat}:${base}`,
        v3d: { base, ...(mod ?? {}), ...(p !== 'plain' ? { forcePat: p } : {}) },
        ...(subSlot ? { subSlot } : {}),
      });
    }
  }

  // 2. Add Meme Slogan Shirts / Hoodies / Croptops / Tank Tops (48 slogans × 4 cuts = 192 hilarious printed 3D tops!)
  const sloganCuts: readonly (readonly [string, string, string, string])[] = [
    ['tee', 'Áo thun', 'lay_loi', 'regular'],
    ['hoodie', 'Áo Hoodie', 'lay_loi', 'oversize'],
    ['crop_top', 'Áo Croptop', 'nu', 'regular'],
    ['muscle_tank', 'Áo ba lỗ', 'nam', 'regular'],
  ];
  for (const [slug, txt, c, c2, tags] of MEME_SLOGANS) {
    for (const [base, prefix, grp, fit] of sloganCuts) {
      pushItem('top', {
        id: `meme_${base}_${slug}`,
        name: `${prefix} in chữ "${txt}"`,
        tags: mergeTags(tags, ['duong_pho', 'lay_loi']),
        c, c2, p: 'plain',
        cPal: 'fashion', c2Pal: 'fashion', c2Label: 'Màu phụ',
        pat: true,
        group: grp === 'lay_loi' ? 'lay_loi' : grp,
        iconKey: `top:${base}`,
        v3d: { base, fit: fit as ThoiTrangVisualSpec['fit'], print: txt },
      });
    }
  }

  // 3. Curated 3D style & Xóm Lầy editions across every category (~2,400+ visually distinct items!)
  // Hair color-style editions (first 36 hairstyles × 8 vivid styles = 288 hair items)
  for (const h of baseCatalog.hair.slice(0, 36)) {
    for (const [suf, lbl, c, c2, tags, grp] of HAIR_EDITIONS) {
      pushItem('hair', {
        id: `${h.id}__${suf}`,
        name: `${h.name} (${lbl})`,
        tags: mergeTags(h.tags, tags),
        c, c2, p: 'plain',
        cPal: 'hair', c2Pal: 'hair', c2Label: 'Màu phụ / 2-tone',
        pat: false,
        group: h.group === 'nam' ? 'nam' : grp,
        iconKey: `hair:${h.id}`,
        v3d: { base: h.id },
      });
    }
  }

  // Tops, Outerwear, Bottoms, Dresses — apply curated 3D editions (material, trim, collar, pattern, fit!)
  const clothingEditionPick: Record<'top' | 'outer' | 'bottom' | 'dress', number> = {
    top: 10,
    outer: 11,
    bottom: 9,
    dress: 10,
  };
  for (const cat of ['top', 'outer', 'bottom', 'dress'] as const) {
    const baseList = baseCatalog[cat];
    const perBase = clothingEditionPick[cat];
    baseList.forEach((baseItem, idx) => {
      for (let k = 0; k < perBase; k++) {
        const ed = CLOTHING_EDITIONS[(idx * 3 + k) % CLOTHING_EDITIONS.length];
        // Skip collar/fit mods on bottoms that only make sense on torso
        const cleanMod: Omit<ThoiTrangVisualSpec, 'base'> = { ...ed.mod };
        if (cat === 'bottom') { delete cleanMod.collar; delete cleanMod.fit; }
        pushItem(cat, {
          id: `${baseItem.id}__${ed.suffix}`,
          name: `${baseItem.name} — ${ed.label}`,
          tags: mergeTags(baseItem.tags, ed.tags),
          c: ed.c ?? baseItem.c,
          c2: ed.c2 ?? baseItem.c2,
          p: ed.p ?? baseItem.p,
          cPal: 'fashion', c2Pal: 'fashion', c2Label: 'Màu phụ',
          pat: true,
          group: baseItem.group === 'nam' ? 'nam' : (ed.group ?? baseItem.group ?? 'khac'),
          iconKey: `${cat}:${baseItem.id}`,
          v3d: { base: baseItem.id, ...cleanMod },
        });
      }
    });
  }

  // Shoes, Hats, Glasses, Accessories — apply hilarious & stylish prop editions (giant, gold, neon LED, rainbow, chăn con công, crystal, pink nam tính, dark gothic, camo, leopard)
  const propEditionPick: Record<'shoes' | 'hat' | 'glasses' | 'acc', number> = {
    shoes: 6,
    hat: 5,
    glasses: 5,
    acc: 5,
  };
  for (const cat of ['shoes', 'hat', 'glasses', 'acc'] as const) {
    const baseList = baseCatalog[cat];
    const perBase = propEditionPick[cat];
    const allowPat = cat !== 'glasses';
    baseList.forEach((baseItem, idx) => {
      for (let k = 0; k < perBase; k++) {
        const ed = PROP_EDITIONS[(idx * 2 + k) % PROP_EDITIONS.length];
        const subSlot = cat === 'acc' ? (baseItem.subSlot ?? accSubMap[baseItem.id]) : undefined;
        pushItem(cat, {
          id: `${baseItem.id}__${ed.suffix}`,
          name: `${baseItem.name} (${ed.label})`,
          tags: mergeTags(baseItem.tags, ed.tags),
          c: ed.c ?? baseItem.c,
          c2: ed.c2 ?? baseItem.c2,
          p: allowPat ? (ed.p ?? baseItem.p) : 'plain',
          cPal: 'fashion', c2Pal: 'fashion', c2Label: 'Màu phụ',
          pat: allowPat,
          group: baseItem.group === 'nam' ? 'nam' : (ed.group ?? baseItem.group ?? 'khac'),
          iconKey: `${cat}:${baseItem.id}`,
          v3d: { base: baseItem.id, ...ed.mod, ...(!allowPat ? { forcePat: undefined } : {}) },
          ...(subSlot ? { subSlot } : {}),
        });
      }
    });
  }

  return { items, extraAccSub };
}
