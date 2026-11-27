/**
 * Kho 144 hình khối 3D ĐỘC NHẤT bổ sung (v6) + 48 câu chữ Meme in áo riêng biệt.
 * - TUYỆT ĐỐI KHÔNG TẠO BẢN SAO ĐỔI MÀU / TRÙNG HÌNH DẠNG!
 * - Mọi món đồ trong `UNIQUE_ARCHETYPES_V2` đều có builder hình khối 3D riêng biệt tại `app/src/thoitrang3d/wear-unique-v2.js`
 *   và 1 ô icon 3D độc nhất trong `icons.webp`.
 * - 48 câu Meme được tách thành công cụ "Chữ in Meme" để dán lên BẤT KỲ áo / áo khoác / đầm nào mà không làm trùng lặp tủ đồ.
 */
import type {
  ThoiTrangAccSubSlot,
  ThoiTrangCatalogItem,
  ThoiTrangCategoryId,
  ThoiTrangPatternId,
  ThoiTrangTag,
} from './thoitrang';

export const MEME_PRINTS: readonly (readonly [id: string, label: string])[] = [
  ['none', 'Không in chữ'],
  ['luong', 'ĐỪNG HỎI LƯƠNG'],
  ['vo_so_1', 'VỢ LÀ SỐ 1'],
  ['deadline', 'CHẠY DEADLINE'],
  ['het_tien', 'HẾT TIỀN RỒI'],
  ['xom_lay', 'TRÙM XÓM LẦY'],
  ['err404', '404 KHÔNG NGƯỜI YÊU'],
  ['e_ben_vung', 'Ế BỀN VỮNG'],
  ['chu_tich', 'CHỦ TỊCH GIẢ NGHÈO'],
  ['tang_ca', 'TĂNG CA XUYÊN ĐÊM'],
  ['free_wifi', 'PHÁT WIFI MIỄN PHÍ'],
  ['cam_nhin', 'CẤM NHÌN TRỘM'],
  ['dang_doi', 'ĐANG RẤT ĐÓI'],
  ['sale_99', 'GIẢM GIÁ 99%'],
  ['bao_thu', 'BÁO THỦ CHÍNH HIỆU'],
  ['vip_pro', 'VIP PRO MAX'],
  ['dai_gia', 'ĐẠI GIA NGẦM'],
  ['tra_sua', 'NGHIỆN TRÀ SỮA'],
  ['ngu_di', 'CHO TUI ĐI NGỦ'],
  ['met_qua', 'MỆT QUÁ RỒI'],
  ['overthink', 'CHÚA OVERTHINKING'],
  ['chill_phet', 'CHILL PHẾT ĐẤY'],
  ['con_ngoan', 'CON NGOAN TRÒ GIỎI'],
  ['tong_tai', 'TỔNG TÀI BÁ ĐẠO'],
  ['simp_chua', 'SIMP CHÚA'],
  ['luong_dau', 'LƯƠNG THÁNG NÀY ĐÂU'],
  ['dieu_kien', 'NHÀ CÓ ĐIỀU KIỆN'],
  ['no_mon', 'QUA MÔN ĐI THẦY ƠI'],
  ['dep_trai', 'ĐẸP TRAI CÓ GÌ SAI'],
  ['xinh_gai', 'XINH GÁI NHẤT XÓM'],
  ['chua_he', 'CHÚA HỀ XÓM LẦY'],
  ['trum_cuoi', 'TRÙM CUỐI SÀN DIỄN'],
  ['no_money', 'NO MONEY NO LOVE'],
  ['flexing', 'ĐANG FLEX ĐẤY'],
  ['so_do_t', 'ĐỂ SỔ ĐỎ Ở NHÀ'],
  ['mi_tom', 'ĂN MÌ TÔM CUỐI THÁNG'],
  ['ca_phe', 'CÀ PHÊ SỮA ĐÁ'],
  ['cuu_tui', 'CỨU TUI VỚI'],
  ['khong_quao', 'HÔM NAY KHÔNG QUẠO'],
  ['ve_nha', 'MUỐN VỀ NHÀ QUÁ'],
  ['ban_ngu', 'ĐANG BẬN NGỦ'],
  ['an_choi', 'CHỈ BIẾT ĂN CHƠI'],
  ['nyc', 'NGƯỜI YÊU CŨ BAY MÀU'],
  ['xin_via', 'XIN VÍA GIÀU SANG'],
  ['khoan_bt', 'KHOAN CẮT BÊ TÔNG'],
  ['ba_dao', 'ĐỈNH CỦA CHÓP'],
  ['ga_mo', 'GÀ MỜ NHƯNG TỰ TIN'],
  ['chay_pho', 'CHẠY PHỐ ĐI BỘ'],
  ['mua_rau', 'ĐI MUA RAU GẶP CRUSH'],
];

export const MEME_PRINT_MAP: Readonly<Record<string, string>> = Object.fromEntries(
  MEME_PRINTS.filter(([id]) => id !== 'none'),
);

export const UNIQUE_ACC_SUB_V2: Readonly<Record<string, ThoiTrangAccSubSlot>> = {
  red_plastic_stool: 'handL',
  woven_hand_fan: 'handL',
  badminton_racket: 'handL',
  electric_mosquito_swatter: 'handL',
  rice_cooker_bag: 'handR',
  electric_fan_prop: 'handL',
  mop_bucket_prop: 'handL',
  keyboard_weapon: 'handL',
  giant_spoon: 'handL',
  bubble_wand: 'handL',
  magic_carpet_back: 'back',
  giant_bow_back: 'back',
  surfboard_back: 'back',
  coffin_back: 'back',
  angel_halo_floating: 'head',
  rain_cloud_head: 'head',
  mini_ufo_pet: 'head',
  shoulder_parrot: 'neck',
  shoulder_cat: 'neck',
  sash_miss_world: 'chestProp',
  giant_bowtie_neck: 'neck',
  floatie_flamingo: 'waist',
};

const H = (
  id: string, name: string, tags: readonly ThoiTrangTag[], c: string, c2: string, group: string,
): ThoiTrangCatalogItem => ({
  id, name, tags, c, c2, p: 'plain', cPal: 'hair', c2Pal: 'hair', c2Label: 'Màu 2-tone', pat: false, group,
});

const W = (
  id: string, name: string, tags: readonly ThoiTrangTag[], c: string, c2: string, group: string,
  p: ThoiTrangPatternId = 'plain',
): ThoiTrangCatalogItem => ({
  id, name, tags, c, c2, p, cPal: 'fashion', c2Pal: 'fashion', c2Label: 'Màu phụ', pat: true, group,
});

const G = (
  id: string, name: string, tags: readonly ThoiTrangTag[], c: string, c2: string, group: string,
): ThoiTrangCatalogItem => ({
  id, name, tags, c, c2, p: 'plain', cPal: 'fashion', c2Pal: 'fashion', c2Label: 'Tròng / Chi tiết', pat: false, group,
});

const A = (
  id: string, name: string, tags: readonly ThoiTrangTag[], c: string, c2: string, group: string,
): ThoiTrangCatalogItem => ({
  id, name, tags, c, c2, p: 'plain', cPal: 'fashion', c2Pal: 'fashion', c2Label: 'Màu phụ', pat: true,
  subSlot: UNIQUE_ACC_SUB_V2[id], group,
});

export const UNIQUE_ARCHETYPES_V2: Readonly<Record<ThoiTrangCategoryId, readonly ThoiTrangCatalogItem[]>> = {
  // ===== +14 HÌNH KHỐI TÓC ĐỘC NHẤT =====
  hair: [
    H('afro_giant', 'Tóc Afro xù khổng lồ Disco', ['retro', 'am_nhac', 'lay_loi', 'duong_pho'], '#1b1518', '#5a3825', 'unisex'),
    H('viking_braids', 'Tóc bím chiến binh Viking có nhẫn', ['co_trang', 'hanh_dong', 'ca_tinh', 'hai_tac'], '#ba7e43', '#e8c47a', 'nam'),
    H('geisha_shimada', 'Tóc búi Geisha cắm trâm dài', ['co_trang', 'da_hoi', 'hoang_gia', 'sang_chanh'], '#1b1518', '#a62936', 'truyen_thong'),
    H('anime_ahoge', 'Cọng tóc ngố Ahoge dựng siêu dài', ['de_thuong', 'lay_loi', 'hoc_duong', 'ngot_ngao'], '#e85f8c', '#ff9ec4', 'lay_loi'),
    H('liberty_spikes', 'Tóc gai Punk 7 mũi nhọn dài', ['am_nhac', 'ca_tinh', 'duong_pho', 'lay_loi'], '#ff2e93', '#76ff03', 'nam'),
    H('princess_hime', 'Tóc công chúa Hime cắt tầng má', ['co_trang', 'de_thuong', 'hoc_duong', 'sang_chanh'], '#1b1518', '#6242b8', 'nu'),
    H('elvis_rockabilly', 'Tóc xoáy Rockabilly Elvis cực cao', ['retro', 'am_nhac', 'da_hoi', 'ca_tinh'], '#1b1518', '#33211b', 'nam'),
    H('bald_shiny_halo', 'Đầu trọc bóng loáng tỏa hào quang', ['lay_loi', 'ky_ao', 'hoang_gia', 'scifi'], '#ffd600', '#f8fafc', 'lay_loi'),
    H('broccoli_hair', 'Tóc bông cải xanh Gen Z', ['lay_loi', 'duong_pho', 'hoc_duong', 'de_thuong'], '#4f9460', '#76ff03', 'lay_loi'),
    H('noodle_hair', 'Tóc sợi mì gói úp đầu vàng xoăn', ['lay_loi', 'van_hoa_vn', 'duong_pho'], '#ffd600', '#ff6d00', 'lay_loi'),
    H('tentacle_hair', 'Tóc xúc tu bạch tuộc biển sâu', ['ky_ao', 'bien_dao', 'kinh_di', 'lay_loi'], '#6242b8', '#ff2e93', 'lay_loi'),
    H('flame_hair', 'Tóc ngọn lửa cháy bừng bừng', ['ky_ao', 'hanh_dong', 'lay_loi', 'am_nhac'], '#ff6d00', '#ffd600', 'lay_loi'),
    H('cloud_hair', 'Tóc đám mây bồng bềnh trên trời', ['ky_ao', 'de_thuong', 'lay_loi', 'ngot_ngao'], '#f8fafc', '#00e5ff', 'lay_loi'),
    H('cactus_hair', 'Tóc xương rồng có gai nở hoa', ['lay_loi', 'mua_he', 'dong_vat', 'ky_ao'], '#4f9460', '#ff2e93', 'lay_loi'),
  ],

  // ===== +18 HÌNH KHỐI ÁO ĐỘC NHẤT =====
  top: [
    W('turtleneck_rib', 'Áo cổ lọ tay dài ôm dáng', ['cong_so', 'mua_dong', 'toi_gian', 'sang_chanh'], '#2b2533', '#d9d3cb', 'unisex'),
    W('chainmail_hauberk', 'Áo giáp lưới sắt hiệp sĩ trung cổ', ['co_trang', 'hanh_dong', 'hoang_gia', 'ky_ao'], '#7c828f', '#d4af37', 'nam'),
    W('cape_blouse', 'Áo blouse tay cánh dơi Cape', ['da_hoi', 'sang_chanh', 'cong_so', 'hoang_gia'], '#ffffff', '#d4af37', 'nu'),
    W('bustier_lace', 'Áo Bustier cúp ngực xương cá', ['da_hoi', 'sang_chanh', 'am_nhac', 'ca_tinh'], '#781d32', '#15121b', 'nu', 'lace'),
    W('bolero_shrug', 'Áo lửng tay phồng Bolero', ['da_hoi', 'cuoi_hoi', 'ngot_ngao', 'retro'], '#ffb3c7', '#ffffff', 'nu'),
    W('sumo_mawashi_top', 'Dây thừng Yokozuna võ sĩ Sumo', ['co_trang', 'the_thao', 'lay_loi', 'hanh_dong'], '#ffffff', '#c92a46', 'nam'),
    W('barong_tagalog', 'Áo Barong truyền thống thêu ngực', ['cong_so', 'cuoi_hoi', 'da_hoi', 'sang_chanh'], '#f6e7d8', '#d4af37', 'nam', 'brocade'),
    W('traditional_tang', 'Áo Đường trang khuy cài ngang nam', ['co_trang', 'hoang_gia', 'van_hoa_vn', 'da_hoi'], '#c92a46', '#ffd56b', 'nam', 'brocade'),
    W('matador_jacket_top', 'Áo đấu sĩ bò tót cầu vai tua vàng', ['da_hoi', 'co_trang', 'hanh_dong', 'hoang_gia'], '#c92a46', '#d4af37', 'nam'),
    W('football_shoulder_pads', 'Áo giáp vai bóng bầu dục Mỹ to sụ', ['the_thao', 'hanh_dong', 'ca_tinh', 'lay_loi'], '#1c3568', '#ffffff', 'nam'),
    // Xóm Lầy sculpted shapes
    W('sandwich_board', 'Biển quảng cáo kẹp 2 mặt đi dạo', ['lay_loi', 'duong_pho', 'cong_so', 'van_hoa_vn'], '#ffea00', '#c92a46', 'lay_loi'),
    W('bubble_wrap_top', 'Áo quấn màng bọc xốp nổ chống sốc', ['lay_loi', 'scifi', 'duong_pho'], '#ffffff', '#6ec6ff', 'lay_loi'),
    W('newspaper_top', 'Áo gấp từ giấy báo thời sự', ['lay_loi', 'retro', 'cong_so', 'duong_pho'], '#d9d3cb', '#15121b', 'lay_loi'),
    W('barrel_top', 'Thùng gỗ có quai đeo vai phá sản', ['lay_loi', 'hai_tac', 'co_trang', 'retro'], '#a6774f', '#2b2533', 'lay_loi'),
    W('lifebuoy_vest', 'Áo phao cứu hộ cổ bành khổng lồ', ['lay_loi', 'bien_dao', 'mua_he', 'hanh_dong'], '#ff5722', '#ffffff', 'lay_loi'),
    W('durian_armor_top', 'Áo giáp vỏ sầu riêng đầy gai nhọn', ['lay_loi', 'van_hoa_vn', 'hanh_dong', 'ky_ao'], '#556b2f', '#ffd56b', 'lay_loi'),
    W('led_vest_top', 'Áo bảng đèn LED Neon phát sáng ngực', ['scifi', 'am_nhac', 'lay_loi', 'duong_pho'], '#15121b', '#00e5ff', 'lay_loi'),
    W('pillow_strap_top', 'Thắt dây buộc nguyên cái gối ôm trước ngực', ['lay_loi', 'de_thuong', 'mua_dong', 'ngot_ngao'], '#ffffff', '#ffb3c7', 'lay_loi'),
  ],

  // ===== +14 HÌNH KHỐI ÁO KHOÁC ĐỘC NHẤT =====
  outer: [
    W('angel_feather_cape', 'Áo choàng lông vũ trắng hoàng gia', ['ky_ao', 'da_hoi', 'hoang_gia', 'cuoi_hoi'], '#ffffff', '#ffd56b', 'nu'),
    W('poncho_fringe', 'Áo choàng Poncho tua rua du mục', ['mua_dong', 'retro', 'duong_pho', 'co_trang'], '#c95e2f', '#ffd56b', 'truyen_thong', 'tho_cam'),
    W('fur_stole_wrap', 'Khăn choàng lông vũ quý bà phủ vai', ['da_hoi', 'sang_chanh', 'mua_dong', 'hoang_gia'], '#ffffff', '#ffb3c7', 'nu'),
    W('duffle_coat', 'Áo khoác Duffle mũ trùm cài khuy sừng', ['mua_dong', 'hoc_duong', 'retro', 'cong_so'], '#5a3825', '#f6e7d8', 'nam'),
    W('astronaut_jet_rig', 'Khung động cơ đẩy phi hành gia đeo vai', ['scifi', 'hanh_dong', 'lay_loi', 'ca_tinh'], '#d9d3cb', '#00e5ff', 'nam'),
    W('baseball_dugout_cape', 'Áo khoác bóng chày dáng hộp rộng', ['the_thao', 'duong_pho', 'hoc_duong', 'ca_tinh'], '#1c3568', '#c92a46', 'nam'),
    W('doctor_lab_coat', 'Áo Blouse trắng Bác sĩ dài cài bút', ['cong_so', 'scifi', 'hoc_duong', 'toi_gian'], '#ffffff', '#2f6fd6', 'nghe_nghiep'),
    W('judge_robe_outer', 'Áo choàng Thẩm phán cổ bèo trắng', ['cong_so', 'hoang_gia', 'co_trang', 'bi_an'], '#15121b', '#ffffff', 'nghe_nghiep'),
    // Xóm Lầy sculpted outerwear
    W('quilt_blanket_wrap', 'Quấn nguyên cái chăn bông dày mùa đông', ['lay_loi', 'mua_dong', 'van_hoa_vn', 'de_thuong'], '#c92a46', '#ffd56b', 'lay_loi', 'chan_con_cong'),
    W('bedsheet_toga', 'Quấn ga trải giường có 4 góc chun', ['lay_loi', 'co_trang', 'duong_pho'], '#6ec6ff', '#ffffff', 'lay_loi'),
    W('shower_curtain_cape', 'Rèm nhà tắm còn nguyên móc treo nhựa', ['lay_loi', 'bien_dao', 'mua_he'], '#6ec6ff', '#ffffff', 'lay_loi', 'dots'),
    W('umbrella_cloak', 'Áo choàng gắn tán ô dù trên vai', ['lay_loi', 'mua_he', 'ky_ao', 'duong_pho'], '#ff2e93', '#ffea00', 'lay_loi'),
    W('cardboard_mech_outer', 'Giáp Robot thùng carton cánh tay hộp', ['lay_loi', 'scifi', 'hanh_dong'], '#a6774f', '#00e5ff', 'lay_loi'),
    W('leaf_bush_ghillie', 'Áo ngụy trang bụi cây lá rậm rạp', ['lay_loi', 'hanh_dong', 'bi_an', 'dong_vat'], '#1a6b4f', '#556b2f', 'lay_loi'),
  ],

  // ===== +14 HÌNH KHỐI QUẦN / VÁY ĐỘC NHẤT =====
  bottom: [
    W('merman_tail_bottom', 'Đuôi Người Cá vảy lấp lánh xòe vây lớn', ['ky_ao', 'bien_dao', 'da_hoi', 'lay_loi'], '#00e5ff', '#7c5cff', 'unisex', 'dragon_scale'),
    W('dhoti_pants', 'Quần xếp ly Dhoti truyền thống Ấn Độ', ['co_trang', 'mua_he', 'hoang_gia', 'toi_gian'], '#f6e7d8', '#d4af37', 'truyen_thong'),
    W('lederhosen', 'Quần yếm da Đức Lederhosen có dây', ['co_trang', 'retro', 'duong_pho', 'lay_loi'], '#5a3825', '#1a6b4f', 'nam'),
    W('tutu_ballet', 'Váy Tutu múa Ba-lê xòe ngang', ['da_hoi', 'am_nhac', 'de_thuong', 'ngot_ngao'], '#ffb3c7', '#ffffff', 'nu'),
    W('tiered_ruffle_skirt', 'Váy 4 tầng xếp bèo bồng bềnh', ['ngot_ngao', 'de_thuong', 'mua_he', 'da_hoi'], '#c79bff', '#ffffff', 'nu'),
    W('hoop_crinoline', 'Khung váy lồng chim quý tộc Victoria', ['hoang_gia', 'co_trang', 'da_hoi', 'lay_loi'], '#d4af37', '#ffffff', 'nu'),
    W('cargo_parachute', 'Quần dù Parachute ống phồng túi hộp to', ['duong_pho', 'ca_tinh', 'the_thao', 'am_nhac'], '#556b2f', '#15121b', 'nam'),
    W('chaps_cowboy', 'Quần da cao bồi tua rua 2 ống', ['retro', 'hanh_dong', 'ca_tinh', 'duong_pho'], '#5a3825', '#d4af37', 'nam'),
    // Xóm Lầy sculpted bottoms
    W('kiddie_pool_skirt', 'Đeo nguyên bể bơi phao tròn ngang hông', ['lay_loi', 'bien_dao', 'mua_he', 'de_thuong'], '#00e5ff', '#ffea00', 'lay_loi'),
    W('lamp_shade_skirt', 'Váy chụp đèn ngủ xếp ly có dây giật', ['lay_loi', 'retro', 'da_hoi'], '#f6e7d8', '#d4af37', 'lay_loi'),
    W('traffic_barrier_skirt', 'Váy thanh chắn rào công trường sọc', ['lay_loi', 'duong_pho', 'hanh_dong'], '#ff5722', '#ffffff', 'lay_loi'),
    W('cardboard_skirt', 'Váy hình thang gấp từ thùng mì tôm', ['lay_loi', 'van_hoa_vn', 'duong_pho'], '#a6774f', '#c92a46', 'lay_loi'),
    W('plastic_chair_skirt', 'Mặc nguyên chiếc ghế nhựa đỏ đục lỗ', ['lay_loi', 'van_hoa_vn', 'duong_pho'], '#c92a46', '#ffffff', 'lay_loi'),
    W('cabbage_leaf_skirt', 'Váy bắp cải nhiều lớp lá xanh mướt', ['lay_loi', 'mua_he', 'de_thuong', 'ky_ao'], '#5fd3a6', '#1a6b4f', 'lay_loi'),
  ],

  // ===== +20 HÌNH KHỐI ĐẦM / BỘ ĐỒ NGUYÊN CÂY ĐỘC NHẤT =====
  dress: [
    W('wedding_train', 'Váy cưới đuôi dài quét đất hoàng gia', ['cuoi_hoi', 'hoang_gia', 'da_hoi', 'tinh_yeu'], '#ffffff', '#ffd56b', 'nu'),
    W('ao_giao_linh', 'Áo Giao Lĩnh cổ chéo Việt cổ', ['van_hoa_vn', 'co_trang', 'hoang_gia', 'da_hoi'], '#1a6b4f', '#d4af37', 'truyen_thong'),
    W('qilin_hanfu', 'Hán phục tay ống siêu rộng phiêu dật', ['co_trang', 'ky_ao', 'hoang_gia', 'da_hoi'], '#6ec6ff', '#ffffff', 'truyen_thong'),
    W('scottish_kilt_full', 'Bộ lễ phục Scotland + túi lông Sporran', ['co_trang', 'hoang_gia', 'da_hoi', 'am_nhac'], '#c92a46', '#15121b', 'nam', 'tartan'),
    W('matador_full', 'Bộ đấu sĩ bò tót Tây Ban Nha trọn bộ', ['co_trang', 'da_hoi', 'hanh_dong', 'hoang_gia'], '#c92a46', '#d4af37', 'nam'),
    W('scuba_diver', 'Bộ đồ thợ lặn biển kèm bình khí', ['bien_dao', 'the_thao', 'hanh_dong', 'scifi'], '#15121b', '#ffea00', 'nghe_nghiep'),
    W('fencing_suit', 'Bộ đồ đấu kiếm trắng giáp ngực', ['the_thao', 'hanh_dong', 'hoang_gia', 'toi_gian'], '#ffffff', '#c92a46', 'the_thao'),
    W('beekeeper_suit', 'Bộ đồ nuôi ong trùm lưới mũ rộng', ['lay_loi', 'hanh_dong', 'dong_vat', 'mua_he'], '#f6e7d8', '#15121b', 'nghe_nghiep'),
    W('medieval_jester_full', 'Bộ Chú Hề cung đình hai màu đối xứng', ['co_trang', 'lay_loi', 'hoang_gia', 'kinh_di'], '#c92a46', '#7c5cff', 'hoa_trang'),
    W('race_driver_suit', 'Bộ đồ đua xe F1 bảo hộ sọc tốc độ', ['the_thao', 'hanh_dong', 'scifi', 'ca_tinh'], '#c92a46', '#ffffff', 'nam'),
    // +10 Bộ đồ Siêu Lầy điêu khắc 3D nguyên khối
    W('corn_cob_suit', 'Bộ đồ Bắp Ngô vàng hạt nổi + vỏ xanh', ['lay_loi', 'dong_vat', 'mua_he', 'de_thuong'], '#ffea00', '#1a6b4f', 'lay_loi'),
    W('hotdog_suit', 'Bộ đồ Bánh mì Xúc xích rưới mù tạt', ['lay_loi', 'duong_pho', 'de_thuong', 'mua_he'], '#c95e2f', '#ffea00', 'lay_loi'),
    W('carrot_suit', 'Bộ đồ Củ Cà Rốt chóp lá xanh', ['lay_loi', 'de_thuong', 'dong_vat', 'mua_he'], '#ff5722', '#1a6b4f', 'lay_loi'),
    W('avocado_suit', 'Bộ đồ Quả Bơ xanh hạt tròn giữa bụng', ['lay_loi', 'de_thuong', 'mua_he', 'ngot_ngao'], '#76ff03', '#5a3825', 'lay_loi'),
    W('milk_carton_suit', 'Bộ đồ Hộp Sữa Tươi 1 lít mái nhọn', ['lay_loi', 'hoc_duong', 'de_thuong', 'ngot_ngao'], '#ffffff', '#2f6fd6', 'lay_loi'),
    W('traffic_light_suit', 'Bộ đồ Cột Đèn Giao Thông 3 đèn phát sáng', ['lay_loi', 'duong_pho', 'scifi', 'hanh_dong'], '#2b2533', '#ffea00', 'lay_loi'),
    W('snowman_suit', 'Bộ đồ Người Tuyết 3 cục tròn mũi cà rốt', ['lay_loi', 'mua_dong', 'de_thuong', 'ngot_ngao'], '#ffffff', '#ff5722', 'lay_loi'),
    W('cactus_pot_suit', 'Bộ đồ Chậu Cây Xương Rồng 2 tay gai', ['lay_loi', 'mua_he', 'de_thuong', 'ky_ao'], '#1a6b4f', '#c95e2f', 'lay_loi'),
    W('robot_retro_suit', 'Bộ đồ Robot thùng thiếc ăng-ten lò xo', ['scifi', 'lay_loi', 'retro', 'hanh_dong'], '#7c828f', '#00e5ff', 'lay_loi'),
    W('fridge_suit', 'Bộ đồ Tủ Lạnh 2 cánh có tay nắm inox', ['lay_loi', 'scifi', 'mua_dong', 'duong_pho'], '#ffffff', '#7c828f', 'lay_loi'),
  ],

  // ===== +12 HÌNH KHỐI GIÀY / DÉP ĐỘC NHẤT =====
  shoes: [
    W('pointe_ballet', 'Giày múa Ba-lê buộc ruy-băng cổ chân', ['da_hoi', 'am_nhac', 'de_thuong', 'ngot_ngao'], '#ffb3c7', '#ffffff', 'nu'),
    W('flippers_scuba', 'Chân vịt lặn biển dài ngoằng', ['bien_dao', 'lay_loi', 'the_thao', 'mua_he'], '#00e5ff', '#15121b', 'lay_loi'),
    W('ski_boots', 'Giày trượt tuyết gắn 2 ván trượt dài', ['mua_dong', 'the_thao', 'lay_loi', 'hanh_dong'], '#c92a46', '#ffffff', 'the_thao'),
    W('spring_jump_boots', 'Giày lò xo khổng lồ bật nhảy cao', ['lay_loi', 'the_thao', 'scifi', 'hanh_dong'], '#ff5722', '#d9d3cb', 'lay_loi'),
    W('tabi_boots', 'Giày Tabi xẻ ngón Ninja Nhật Bản', ['co_trang', 'hanh_dong', 'bi_an', 'ca_tinh'], '#15121b', '#d9d3cb', 'truyen_thong'),
    W('roman_greaves', 'Giáp ống chân đấu sĩ La Mã vàng đồng', ['co_trang', 'hanh_dong', 'hoang_gia', 'ky_ao'], '#d4af37', '#5a3825', 'nam'),
    W('high_platform_goth', 'Bốt Goth đế bánh mì siêu cao 15cm', ['kinh_di', 'ca_tinh', 'am_nhac', 'duong_pho'], '#15121b', '#c92a46', 'unisex'),
    W('pointy_elf_shoes', 'Giày yêu tinh mũi cong gắn chuông vàng', ['ky_ao', 'mua_dong', 'lay_loi', 'de_thuong'], '#1a6b4f', '#ffd56b', 'hoa_trang'),
    // Xóm Lầy sculpted shoes
    W('tissue_box_shoes', 'Xỏ chân vào 2 hộp giấy ăn rút', ['lay_loi', 'duong_pho', 'hoc_duong'], '#6ec6ff', '#ffffff', 'lay_loi'),
    W('banana_peel_shoes', 'Giẫm 2 vỏ chuối trượt chân lầy lội', ['lay_loi', 'mua_he', 'duong_pho'], '#ffea00', '#5a3825', 'lay_loi'),
    W('bread_loaf_shoes', 'Xỏ chân vào 2 ổ bánh mì baguette', ['lay_loi', 'van_hoa_vn', 'duong_pho'], '#c98b2c', '#f6e7d8', 'lay_loi'),
    W('brick_stilts', 'Đi cà kheo bằng 2 viên gạch đỏ buộc dây', ['lay_loi', 'van_hoa_vn', 'hanh_dong'], '#c95e2f', '#ffffff', 'lay_loi'),
  ],

  // ===== +18 HÌNH KHỐI MŨ / ĐỘI ĐẦU ĐỘC NHẤT =====
  hat: [
    W('pharaoh_nemes', 'Mũ sọc vàng xanh Pharaoh Ai Cập', ['co_trang', 'hoang_gia', 'bi_an', 'ky_ao'], '#d4af37', '#1c3568', 'truyen_thong'),
    W('pope_mitre', 'Mũ chóp cao quý tộc trung cổ', ['hoang_gia', 'co_trang', 'da_hoi', 'bi_an'], '#ffffff', '#d4af37', 'truyen_thong'),
    W('roman_galea', 'Mũ đấu sĩ La Mã mào lông đỏ dài', ['co_trang', 'hanh_dong', 'hoang_gia', 'ca_tinh'], '#d4af37', '#c92a46', 'nam'),
    W('plague_hat', 'Mũ vành rộng thợ săn phù thủy', ['kinh_di', 'bi_an', 'co_trang', 'ky_ao'], '#15121b', '#d4af37', 'hoa_trang'),
    W('ushanka_bear', 'Mũ đầu Gấu bông trùm 2 tai mềm', ['mua_dong', 'de_thuong', 'dong_vat', 'ngot_ngao'], '#a6774f', '#f6e7d8', 'unisex'),
    W('turban_jewel', 'Khăn quấn Sultan đính ngọc + lông vũ', ['hoang_gia', 'co_trang', 'sang_chanh', 'ky_ao'], '#ffffff', '#c92a46', 'truyen_thong'),
    W('bicorne_napoleon', 'Mũ hai sừng hoàng đế Napoleon', ['hoang_gia', 'co_trang', 'hai_tac', 'hanh_dong'], '#1c3568', '#ffd56b', 'nam'),
    W('cat_ear_helmet', 'Mũ bảo hiểm Fullface gắn tai mèo', ['duong_pho', 'ca_tinh', 'scifi', 'de_thuong'], '#15121b', '#ff2e93', 'unisex'),
    // +10 Mũ Siêu Lầy 3D
    W('water_jug_20l', 'Úp bình nước lọc 20 lít trong suốt lên đầu', ['lay_loi', 'van_hoa_vn', 'scifi', 'bien_dao'], '#6ec6ff', '#ffffff', 'lay_loi'),
    W('noodle_bowl_hat', 'Đội tô mì úp ngược chảy sợi + đôi đũa', ['lay_loi', 'van_hoa_vn', 'duong_pho'], '#c92a46', '#ffea00', 'lay_loi'),
    W('toilet_plunger_hat', 'Dính cây thông bồn cầu thẳng đứng trên đầu', ['lay_loi', 'duong_pho', 'kinh_di'], '#c92a46', '#a6774f', 'lay_loi'),
    W('banana_bunch_hat', 'Đội nguyên nải chuối chín vàng trên đầu', ['lay_loi', 'mua_he', 'bien_dao', 'de_thuong'], '#ffea00', '#5a3825', 'lay_loi'),
    W('hen_sitting_hat', 'Con gà mái đang nằm ấp trên đỉnh đầu', ['lay_loi', 'dong_vat', 'van_hoa_vn', 'de_thuong'], '#ffffff', '#c92a46', 'lay_loi'),
    W('aquarium_hat', 'Đội bể cá tròn có cá vàng bơi bên trong', ['lay_loi', 'bien_dao', 'ky_ao', 'dong_vat'], '#6ec6ff', '#ff5722', 'lay_loi'),
    W('tv_head', 'Đầu Tivi hộp cổ điển có ăng-ten râu', ['lay_loi', 'scifi', 'retro', 'bi_an'], '#2b2533', '#00e5ff', 'lay_loi'),
    W('lamp_shade_hat', 'Chụp đèn ngủ có dây công tắc úp kín đầu', ['lay_loi', 'retro', 'bi_an'], '#f6e7d8', '#d4af37', 'lay_loi'),
    W('shark_bite_hat', 'Hàm Cá Mập khổng lồ đang ngoạm đầu', ['lay_loi', 'dong_vat', 'bien_dao', 'hanh_dong'], '#7c828f', '#c92a46', 'lay_loi'),
    W('durian_helmet', 'Mũ bảo hiểm vỏ Sầu Riêng đầy gai', ['lay_loi', 'van_hoa_vn', 'hanh_dong', 'duong_pho'], '#556b2f', '#ffd56b', 'lay_loi'),
  ],

  // ===== +12 HÌNH KHỐI KÍNH / MẶT NẠ ĐỘC NHẤT =====
  glasses: [
    G('plague_doctor_mask', 'Mặt nạ mỏ chim Bác sĩ dịch hạch dài', ['kinh_di', 'bi_an', 'co_trang', 'lay_loi'], '#15121b', '#d4af37', 'hoa_trang'),
    G('horse_mask', 'Mặt nạ đầu Ngựa Meme huyền thoại', ['lay_loi', 'dong_vat', 'duong_pho', 'kinh_di'], '#a6774f', '#2b2533', 'lay_loi'),
    G('clown_nose_glasses', 'Mũi hề đỏ to tròn + gọng sao hề', ['lay_loi', 'de_thuong', 'am_nhac'], '#c92a46', '#ffea00', 'lay_loi'),
    G('anime_shimmer_glasses', 'Kính trắng lóe sáng phản diện Anime', ['scifi', 'lay_loi', 'hoc_duong', 'bi_an'], '#15121b', '#ffffff', 'lay_loi'),
    G('welding_mask', 'Mặt nạ thợ hàn che kín mặt', ['scifi', 'hanh_dong', 'cong_so', 'lay_loi'], '#2b2533', '#00e5ff', 'nam'),
    G('fencing_mask', 'Mặt nạ lưới đấu kiếm bảo hộ', ['the_thao', 'hanh_dong', 'hoang_gia'], '#d9d3cb', '#15121b', 'the_thao'),
    G('scuba_snorkel', 'Kính lặn biển kèm ống thở nhô cao', ['bien_dao', 'mua_he', 'the_thao', 'lay_loi'], '#00e5ff', '#ffea00', 'the_thao'),
    G('blindfold_cloth', 'Băng bịt mắt kiếm khách / Gojo', ['bi_an', 'hanh_dong', 'ca_tinh', 'ky_ao'], '#15121b', '#ffffff', 'nam'),
    G('opera_lorgnette', 'Kính Opera quý tộc có cán cầm vàng', ['hoang_gia', 'da_hoi', 'retro', 'sang_chanh'], '#d4af37', '#ffffff', 'nu'),
    G('giant_eyeballs', 'Kính lò xo lồi 2 nhãn cầu khổng lồ', ['lay_loi', 'kinh_di', 'de_thuong'], '#ffffff', '#15121b', 'lay_loi'),
    G('paper_bag_mask', 'Túi giấy nâu khoét 2 lỗ mắt úp mặt', ['lay_loi', 'bi_an', 'duong_pho'], '#a6774f', '#15121b', 'lay_loi'),
    G('pixel_censored_bar', 'Thanh đen che mắt kiểu tin nóng 18+', ['lay_loi', 'bi_an', 'duong_pho', 'ca_tinh'], '#15121b', '#ff2e93', 'lay_loi'),
  ],

  // ===== +22 HÌNH KHỐI PHỤ KIỆN / ĐẠO CỤ ĐỘC NHẤT =====
  acc: [
    A('red_plastic_stool', 'Ghế nhựa đỏ quán trà đá cầm tay', ['lay_loi', 'van_hoa_vn', 'duong_pho', 'hanh_dong'], '#c92a46', '#ffffff', 'lay_loi'),
    A('woven_hand_fan', 'Quạt nan / Quạt mo cau Việt Nam', ['van_hoa_vn', 'co_trang', 'mua_he', 'lay_loi'], '#c98b2c', '#a6774f', 'cam_tay'),
    A('badminton_racket', 'Vợt cầu lông + quả cầu trắng', ['the_thao', 'mua_he', 'hoc_duong'], '#2f6fd6', '#ffffff', 'nam'),
    A('electric_mosquito_swatter', 'Vợt muỗi điện huyền thoại xóm lầy', ['lay_loi', 'van_hoa_vn', 'hanh_dong', 'mua_he'], '#ff5722', '#ffea00', 'lay_loi'),
    A('rice_cooker_bag', 'Xách nồi cơm điện đi ăn chực', ['lay_loi', 'van_hoa_vn', 'duong_pho'], '#ffffff', '#c92a46', 'lay_loi'),
    A('electric_fan_prop', 'Ôm nguyên chiếc quạt máy cây lồng tròn', ['lay_loi', 'mua_he', 'van_hoa_vn'], '#6ec6ff', '#ffffff', 'lay_loi'),
    A('mop_bucket_prop', 'Cây lau nhà bông xòe cầm tay', ['lay_loi', 'cong_so', 'duong_pho'], '#2f6fd6', '#d9d3cb', 'lay_loi'),
    A('keyboard_weapon', 'Bàn phím cơ RGB anh hùng bàn phím', ['lay_loi', 'scifi', 'cong_so', 'hanh_dong'], '#15121b', '#00e5ff', 'vu_khi'),
    A('giant_spoon', 'Cái thìa inox khổng lồ cao bằng người', ['lay_loi', 'ky_ao', 'hanh_dong', 'duong_pho'], '#d9d3cb', '#ffffff', 'vu_khi'),
    A('bubble_wand', 'Gậy thổi bong bóng xà phòng lấp lánh', ['de_thuong', 'ngot_ngao', 'ky_ao', 'mua_he'], '#ff6b8b', '#00e5ff', 'cam_tay'),
    A('magic_carpet_back', 'Thảm bay Aladin cuộn đeo sau lưng', ['ky_ao', 'co_trang', 'hoang_gia', 'hai_tac'], '#781d32', '#d4af37', 'canh_duoi'),
    A('giant_bow_back', 'Nơ bướm khổng lồ gắn sau lưng', ['da_hoi', 'de_thuong', 'ngot_ngao', 'cuoi_hoi'], '#ff2e93', '#ffffff', 'canh_duoi'),
    A('surfboard_back', 'Ván lướt sóng sọc đeo sau lưng', ['bien_dao', 'mua_he', 'the_thao', 'ca_tinh'], '#00e5ff', '#ffea00', 'nam'),
    A('coffin_back', 'Quan tài ma cà rồng mini đeo lưng', ['kinh_di', 'bi_an', 'lay_loi', 'ca_tinh'], '#2b2533', '#c92a46', 'canh_duoi'),
    A('angel_halo_floating', 'Vòng hào quang thiên thần phát sáng', ['ky_ao', 'cuoi_hoi', 'hoang_gia', 'de_thuong'], '#ffea00', '#ffffff', 'trang_suc'),
    A('rain_cloud_head', 'Đám mây mưa nhỏ giật sét trên đầu', ['lay_loi', 'kinh_di', 'ky_ao', 'mua_dong'], '#7c828f', '#ffea00', 'lay_loi'),
    A('mini_ufo_pet', 'Đĩa bay UFO mini lơ lửng cạnh đầu', ['scifi', 'lay_loi', 'ky_ao', 'bi_an'], '#d9d3cb', '#76ff03', 'lay_loi'),
    A('shoulder_parrot', 'Con vẹt hải tặc đậu trên vai', ['hai_tac', 'dong_vat', 'bien_dao', 'lay_loi'], '#c92a46', '#ffea00', 'lay_loi'),
    A('shoulder_cat', 'Mèo con cuộn tròn nằm ngủ trên vai', ['dong_vat', 'de_thuong', 'ngot_ngao', 'mua_dong'], '#ff9f5a', '#ffffff', 'trang_suc'),
    A('sash_miss_world', 'Dải băng chéo Hoa Hậu Xóm Lầy', ['da_hoi', 'hoang_gia', 'lay_loi', 'sang_chanh'], '#ffffff', '#d4af37', 'lay_loi'),
    A('giant_bowtie_neck', 'Nơ cổ khổng lồ to bằng đôi vai', ['lay_loi', 'da_hoi', 'de_thuong', 'retro'], '#ff2e93', '#ffea00', 'lay_loi'),
    A('floatie_flamingo', 'Phao Hồng Hạc cổ cao quấn eo', ['bien_dao', 'mua_he', 'lay_loi', 'de_thuong'], '#ff6b8b', '#15121b', 'lay_loi'),
  ],
};
