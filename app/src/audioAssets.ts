import type { RoomState } from '../../shared/src/types';

export type BgmId =
  | 'bgm_sing_linda_cafe'
  | 'bgm_sing_coba_cailuong'
  | 'bgm_sing_duet_cailuong'
  | 'bgm_sing_phuonghang_t30'
  | 'bgm_sing_phuonghang_bolero'
  | 'bgm_sing_allstars_7rings';

export type MemePersona = 'linda' | 'minhhieu' | 'phuonghang' | 'chiphien' | 'coba' | 'game_fx';

export type MemeId =
  // Cô Linda / Cẩm Lan Sục (29)
  | 'linda_chao'
  | 'linda_trolai'
  | 'linda_chicho'
  | 'linda_emquaday'
  | 'linda_dangcap'
  | 'linda_que'
  | 'linda_level'
  | 'linda_botkhung'
  | 'linda_10lay'
  | 'linda_thaloi'
  | 'linda_hongnho'
  | 'linda_duathoi'
  | 'linda_cuoi'
  | 'linda_maccuoi'
  | 'linda_airanh'
  | 'linda_banoi'
  | 'linda_caigizay'
  | 'linda_omc'
  | 'linda_thatim'
  | 'linda_ngonqua'
  | 'linda_ngonquaha'
  | 'linda_zo'
  | 'linda_jzma'
  | 'linda_oijztroi'
  | 'linda_achetchi'
  | 'linda_chuyencuatao'
  | 'linda_toalet'
  | 'linda_cuutui'
  | 'linda_chanhnha'
  | 'linda_xinchao_mn'
  | 'linda_uongnuocmia'
  | 'linda_cuutoibacon'
  | 'linda_ecaijztroi'
  | 'linda_meoicuucon'
  | 'linda_moimocra'
  | 'linda_buoitoivuive'
  | 'linda_toasang'
  | 'linda_xuongnuiquay'
  // Cô Ba Vàng Ngọc (26)
  | 'coba_giangho'
  | 'coba_thoithoi'
  | 'coba_quatbatieu'
  | 'coba_dethuong'
  | 'coba_futani'
  | 'coba_totote'
  | 'coba_muonchoi'
  | 'coba_buoccungchan'
  | 'coba_ngaychon'
  | 'coba_batphelon'
  | 'coba_phenguoigiau'
  | 'coba_luocmay'
  | 'coba_votungoi'
  | 'coba_mayimtaotha'
  | 'coba_khovang'
  | 'coba_thathu'
  | 'coba_choitangoc'
  | 'coba_dunglaigia'
  | 'coba_nhinquancanh'
  | 'coba_xinloianh'
  | 'coba_tamgietubi'
  | 'coba_giadinhtannat'
  | 'coba_dungdongkich'
  | 'coba_dunggionmat'
  | 'coba_dinhphen'
  | 'coba_aotuongsucmanh'
  // Cô Minh Hiếu (25)
  | 'minhhieu_tinhlai'
  | 'minhhieu_duongquyen'
  | 'minhhieu_tiendohay'
  | 'minhhieu_maccuoi'
  | 'minhhieu_khoe'
  | 'minhhieu_tiendo_quat'
  | 'minhhieu_matphoiphoi'
  | 'minhhieu_10trieu'
  | 'minhhieu_lubu'
  | 'minhhieu_canvang'
  | 'minhhieu_hoihan'
  | 'minhhieu_muonkhoc'
  | 'minhhieu_chotdon'
  | 'minhhieu_conquyxao'
  | 'minhhieu_laytienche'
  | 'minhhieu_soqua'
  | 'minhhieu_cuutoi'
  | 'minhhieu_tienchicho'
  | 'minhhieu_tiendomat'
  | 'minhhieu_nganruoido'
  | 'minhhieu_1000do'
  | 'minhhieu_tientuoi'
  | 'minhhieu_khongaimua'
  | 'minhhieu_cadonhuquy'
  | 'minhhieu_rotmuocmat'
  // Cô Phương Hằng (29)
  | 'phuonghang_ngongang'
  | 'phuonghang_trongcuoc'
  | 'phuonghang_dungdien'
  | 'phuonghang_haoquang'
  | 'phuonghang_luadao'
  | 'phuonghang_tuongvay'
  | 'phuonghang_divang'
  | 'phuonghang_nhieuchuyen'
  | 'phuonghang_chanly'
  | 'phuonghang_motminhtao'
  | 'phuonghang_dunglacham'
  | 'phuonghang_dosup'
  | 'phuonghang_kimcuong'
  | 'phuonghang_lamchu'
  | 'phuonghang_50tuoi'
  | 'phuonghang_thayvay'
  | 'phuonghang_nguyhiem'
  | 'phuonghang_khonhon'
  | 'phuonghang_suthat'
  | 'phuonghang_tinhhinh'
  | 'phuonghang_tienphuongtien'
  | 'phuonghang_tubitritue'
  | 'phuonghang_quantutrathu'
  | 'phuonghang_voquytday'
  | 'phuonghang_chuabaogiobochay'
  | 'phuonghang_thanhcong'
  | 'phuonghang_aidungaisai'
  | 'phuonghang_lammoico'
  | 'phuonghang_anhhung'
  // Chị Phiến (25)
  | 'chiphien_aiepmay'
  | 'chiphien_maydien'
  | 'chiphien_xinloi'
  | 'chiphien_dingu'
  | 'chiphien_30ty'
  | 'chiphien_hoahau'
  | 'chiphien_khongvon'
  | 'chiphien_bonghong'
  | 'chiphien_loilam'
  | 'chiphien_kholam'
  | 'chiphien_miengdat'
  | 'chiphien_villa'
  | 'chiphien_vonghiem'
  | 'chiphien_xinhdep'
  | 'chiphien_metlamroi'
  | 'chiphien_taisancuachi'
  | 'chiphien_kemay'
  | 'chiphien_dequahe'
  | 'chiphien_capdoimanh'
  | 'chiphien_chitoitiec'
  | 'chiphien_nhinchidi'
  | 'chiphien_nhinmaylaidi'
  | 'chiphien_odaumaxai'
  | 'chiphien_khongthamlam'
  | 'chiphien_xuitaotai'
  // Hỗ trợ Game cốt lõi (10)
  | 'batan_noroi'
  | 'tienbip_cainit'
  | 'sena_donate'
  | 'vn_toicongchuyen'
  | 'vn_batngochua'
  | 'vn_vinhbietcu'
  | 'vn_hettien'
  | 'vn_fartmic'
  | 'vn_vineboom'
  | 'vn_amongus';

export const BGM_ASSETS: Record<BgmId, number> = {
  bgm_sing_linda_cafe: require('../assets/audio/bgm/bgm_sing_linda_cafe.mp3'),
  bgm_sing_coba_cailuong: require('../assets/audio/bgm/bgm_sing_coba_cailuong.mp3'),
  bgm_sing_duet_cailuong: require('../assets/audio/bgm/bgm_sing_duet_cailuong.mp3'),
  bgm_sing_phuonghang_t30: require('../assets/audio/bgm/bgm_sing_phuonghang_t30.mp3'),
  bgm_sing_phuonghang_bolero: require('../assets/audio/bgm/bgm_sing_phuonghang_bolero.mp3'),
  bgm_sing_allstars_7rings: require('../assets/audio/bgm/bgm_sing_allstars_7rings.mp3'),
};

export const MEME_ASSETS: Record<MemeId, number> = {
  // Cô Linda / Cẩm Lan Sục (29)
  linda_chao: require('../assets/audio/memes/linda_chao.mp3'),
  linda_trolai: require('../assets/audio/memes/linda_trolai.mp3'),
  linda_chicho: require('../assets/audio/memes/linda_chicho.mp3'),
  linda_emquaday: require('../assets/audio/memes/linda_emquaday.mp3'),
  linda_dangcap: require('../assets/audio/memes/linda_dangcap.mp3'),
  linda_que: require('../assets/audio/memes/linda_que.mp3'),
  linda_level: require('../assets/audio/memes/linda_level.mp3'),
  linda_botkhung: require('../assets/audio/memes/linda_botkhung.mp3'),
  linda_10lay: require('../assets/audio/memes/linda_10lay.mp3'),
  linda_thaloi: require('../assets/audio/memes/linda_thaloi.mp3'),
  linda_hongnho: require('../assets/audio/memes/linda_hongnho.mp3'),
  linda_duathoi: require('../assets/audio/memes/linda_duathoi.mp3'),
  linda_cuoi: require('../assets/audio/memes/linda_cuoi.mp3'),
  linda_maccuoi: require('../assets/audio/memes/linda_maccuoi.mp3'),
  linda_airanh: require('../assets/audio/memes/linda_airanh.mp3'),
  linda_banoi: require('../assets/audio/memes/linda_banoi.mp3'),
  linda_caigizay: require('../assets/audio/memes/linda_caigizay.mp3'),
  linda_omc: require('../assets/audio/memes/linda_omc.mp3'),
  linda_thatim: require('../assets/audio/memes/linda_thatim.mp3'),
  linda_ngonqua: require('../assets/audio/memes/linda_ngonqua.mp3'),
  linda_ngonquaha: require('../assets/audio/memes/linda_ngonquaha.mp3'),
  linda_zo: require('../assets/audio/memes/linda_zo.mp3'),
  linda_jzma: require('../assets/audio/memes/linda_jzma.mp3'),
  linda_oijztroi: require('../assets/audio/memes/linda_oijztroi.mp3'),
  linda_achetchi: require('../assets/audio/memes/linda_achetchi.mp3'),
  linda_chuyencuatao: require('../assets/audio/memes/linda_chuyencuatao.mp3'),
  linda_toalet: require('../assets/audio/memes/linda_toalet.mp3'),
  linda_cuutui: require('../assets/audio/memes/linda_cuutui.mp3'),
  linda_chanhnha: require('../assets/audio/memes/linda_chanhnha.mp3'),
  linda_xinchao_mn: require('../assets/audio/memes/linda_xinchao_mn.mp3'),
  linda_uongnuocmia: require('../assets/audio/memes/linda_uongnuocmia.mp3'),
  linda_cuutoibacon: require('../assets/audio/memes/linda_cuutoibacon.mp3'),
  linda_ecaijztroi: require('../assets/audio/memes/linda_ecaijztroi.mp3'),
  linda_meoicuucon: require('../assets/audio/memes/linda_meoicuucon.mp3'),
  linda_moimocra: require('../assets/audio/memes/linda_moimocra.mp3'),
  linda_buoitoivuive: require('../assets/audio/memes/linda_buoitoivuive.mp3'),
  linda_toasang: require('../assets/audio/memes/linda_toasang.mp3'),
  linda_xuongnuiquay: require('../assets/audio/memes/linda_xuongnuiquay.mp3'),
  // Cô Ba Vàng Ngọc (26)
  coba_giangho: require('../assets/audio/memes/coba_giangho.mp3'),
  coba_thoithoi: require('../assets/audio/memes/coba_thoithoi.mp3'),
  coba_quatbatieu: require('../assets/audio/memes/coba_quatbatieu.mp3'),
  coba_dethuong: require('../assets/audio/memes/coba_dethuong.mp3'),
  coba_futani: require('../assets/audio/memes/coba_futani.mp3'),
  coba_totote: require('../assets/audio/memes/coba_totote.mp3'),
  coba_muonchoi: require('../assets/audio/memes/coba_muonchoi.mp3'),
  coba_buoccungchan: require('../assets/audio/memes/coba_buoccungchan.mp3'),
  coba_ngaychon: require('../assets/audio/memes/coba_ngaychon.mp3'),
  coba_batphelon: require('../assets/audio/memes/coba_batphelon.mp3'),
  coba_phenguoigiau: require('../assets/audio/memes/coba_phenguoigiau.mp3'),
  coba_luocmay: require('../assets/audio/memes/coba_luocmay.mp3'),
  coba_votungoi: require('../assets/audio/memes/coba_votungoi.mp3'),
  coba_mayimtaotha: require('../assets/audio/memes/coba_mayimtaotha.mp3'),
  coba_khovang: require('../assets/audio/memes/coba_khovang.mp3'),
  coba_thathu: require('../assets/audio/memes/coba_thathu.mp3'),
  coba_choitangoc: require('../assets/audio/memes/coba_choitangoc.mp3'),
  coba_dunglaigia: require('../assets/audio/memes/coba_dunglaigia.mp3'),
  coba_nhinquancanh: require('../assets/audio/memes/coba_nhinquancanh.mp3'),
  coba_xinloianh: require('../assets/audio/memes/coba_xinloianh.mp3'),
  coba_tamgietubi: require('../assets/audio/memes/coba_tamgietubi.mp3'),
  coba_giadinhtannat: require('../assets/audio/memes/coba_giadinhtannat.mp3'),
  coba_dungdongkich: require('../assets/audio/memes/coba_dungdongkich.mp3'),
  coba_dunggionmat: require('../assets/audio/memes/coba_dunggionmat.mp3'),
  coba_dinhphen: require('../assets/audio/memes/coba_dinhphen.mp3'),
  coba_aotuongsucmanh: require('../assets/audio/memes/coba_aotuongsucmanh.mp3'),
  // Cô Minh Hiếu (25)
  minhhieu_tinhlai: require('../assets/audio/memes/minhhieu_tinhlai.mp3'),
  minhhieu_duongquyen: require('../assets/audio/memes/minhhieu_duongquyen.mp3'),
  minhhieu_tiendohay: require('../assets/audio/memes/minhhieu_tiendohay.mp3'),
  minhhieu_maccuoi: require('../assets/audio/memes/minhhieu_maccuoi.mp3'),
  minhhieu_khoe: require('../assets/audio/memes/minhhieu_khoe.mp3'),
  minhhieu_tiendo_quat: require('../assets/audio/memes/minhhieu_tiendo_quat.mp3'),
  minhhieu_matphoiphoi: require('../assets/audio/memes/minhhieu_matphoiphoi.mp3'),
  minhhieu_10trieu: require('../assets/audio/memes/minhhieu_10trieu.mp3'),
  minhhieu_lubu: require('../assets/audio/memes/minhhieu_lubu.mp3'),
  minhhieu_canvang: require('../assets/audio/memes/minhhieu_canvang.mp3'),
  minhhieu_hoihan: require('../assets/audio/memes/minhhieu_hoihan.mp3'),
  minhhieu_muonkhoc: require('../assets/audio/memes/minhhieu_muonkhoc.mp3'),
  minhhieu_chotdon: require('../assets/audio/memes/minhhieu_chotdon.mp3'),
  minhhieu_conquyxao: require('../assets/audio/memes/minhhieu_conquyxao.mp3'),
  minhhieu_laytienche: require('../assets/audio/memes/minhhieu_laytienche.mp3'),
  minhhieu_soqua: require('../assets/audio/memes/minhhieu_soqua.mp3'),
  minhhieu_cuutoi: require('../assets/audio/memes/minhhieu_cuutoi.mp3'),
  minhhieu_tienchicho: require('../assets/audio/memes/minhhieu_tienchicho.mp3'),
  minhhieu_tiendomat: require('../assets/audio/memes/minhhieu_tiendomat.mp3'),
  minhhieu_nganruoido: require('../assets/audio/memes/minhhieu_nganruoido.mp3'),
  minhhieu_1000do: require('../assets/audio/memes/minhhieu_1000do.mp3'),
  minhhieu_tientuoi: require('../assets/audio/memes/minhhieu_tientuoi.mp3'),
  minhhieu_khongaimua: require('../assets/audio/memes/minhhieu_khongaimua.mp3'),
  minhhieu_cadonhuquy: require('../assets/audio/memes/minhhieu_cadonhuquy.mp3'),
  minhhieu_rotmuocmat: require('../assets/audio/memes/minhhieu_rotmuocmat.mp3'),
  // Cô Phương Hằng (29)
  phuonghang_ngongang: require('../assets/audio/memes/phuonghang_ngongang.mp3'),
  phuonghang_trongcuoc: require('../assets/audio/memes/phuonghang_trongcuoc.mp3'),
  phuonghang_dungdien: require('../assets/audio/memes/phuonghang_dungdien.mp3'),
  phuonghang_haoquang: require('../assets/audio/memes/phuonghang_haoquang.mp3'),
  phuonghang_luadao: require('../assets/audio/memes/phuonghang_luadao.mp3'),
  phuonghang_tuongvay: require('../assets/audio/memes/phuonghang_tuongvay.mp3'),
  phuonghang_divang: require('../assets/audio/memes/phuonghang_divang.mp3'),
  phuonghang_nhieuchuyen: require('../assets/audio/memes/phuonghang_nhieuchuyen.mp3'),
  phuonghang_chanly: require('../assets/audio/memes/phuonghang_chanly.mp3'),
  phuonghang_motminhtao: require('../assets/audio/memes/phuonghang_motminhtao.mp3'),
  phuonghang_dunglacham: require('../assets/audio/memes/phuonghang_dunglacham.mp3'),
  phuonghang_dosup: require('../assets/audio/memes/phuonghang_dosup.mp3'),
  phuonghang_kimcuong: require('../assets/audio/memes/phuonghang_kimcuong.mp3'),
  phuonghang_lamchu: require('../assets/audio/memes/phuonghang_lamchu.mp3'),
  phuonghang_50tuoi: require('../assets/audio/memes/phuonghang_50tuoi.mp3'),
  phuonghang_thayvay: require('../assets/audio/memes/phuonghang_thayvay.mp3'),
  phuonghang_nguyhiem: require('../assets/audio/memes/phuonghang_nguyhiem.mp3'),
  phuonghang_khonhon: require('../assets/audio/memes/phuonghang_khonhon.mp3'),
  phuonghang_suthat: require('../assets/audio/memes/phuonghang_suthat.mp3'),
  phuonghang_tinhhinh: require('../assets/audio/memes/phuonghang_tinhhinh.mp3'),
  phuonghang_tienphuongtien: require('../assets/audio/memes/phuonghang_tienphuongtien.mp3'),
  phuonghang_tubitritue: require('../assets/audio/memes/phuonghang_tubitritue.mp3'),
  phuonghang_quantutrathu: require('../assets/audio/memes/phuonghang_quantutrathu.mp3'),
  phuonghang_voquytday: require('../assets/audio/memes/phuonghang_voquytday.mp3'),
  phuonghang_chuabaogiobochay: require('../assets/audio/memes/phuonghang_chuabaogiobochay.mp3'),
  phuonghang_thanhcong: require('../assets/audio/memes/phuonghang_thanhcong.mp3'),
  phuonghang_aidungaisai: require('../assets/audio/memes/phuonghang_aidungaisai.mp3'),
  phuonghang_lammoico: require('../assets/audio/memes/phuonghang_lammoico.mp3'),
  phuonghang_anhhung: require('../assets/audio/memes/phuonghang_anhhung.mp3'),
  // Chị Phiến (25)
  chiphien_aiepmay: require('../assets/audio/memes/chiphien_aiepmay.mp3'),
  chiphien_maydien: require('../assets/audio/memes/chiphien_maydien.mp3'),
  chiphien_xinloi: require('../assets/audio/memes/chiphien_xinloi.mp3'),
  chiphien_dingu: require('../assets/audio/memes/chiphien_dingu.mp3'),
  chiphien_30ty: require('../assets/audio/memes/chiphien_30ty.mp3'),
  chiphien_hoahau: require('../assets/audio/memes/chiphien_hoahau.mp3'),
  chiphien_khongvon: require('../assets/audio/memes/chiphien_khongvon.mp3'),
  chiphien_bonghong: require('../assets/audio/memes/chiphien_bonghong.mp3'),
  chiphien_loilam: require('../assets/audio/memes/chiphien_loilam.mp3'),
  chiphien_kholam: require('../assets/audio/memes/chiphien_kholam.mp3'),
  chiphien_miengdat: require('../assets/audio/memes/chiphien_miengdat.mp3'),
  chiphien_villa: require('../assets/audio/memes/chiphien_villa.mp3'),
  chiphien_vonghiem: require('../assets/audio/memes/chiphien_vonghiem.mp3'),
  chiphien_xinhdep: require('../assets/audio/memes/chiphien_xinhdep.mp3'),
  chiphien_metlamroi: require('../assets/audio/memes/chiphien_metlamroi.mp3'),
  chiphien_taisancuachi: require('../assets/audio/memes/chiphien_taisancuachi.mp3'),
  chiphien_kemay: require('../assets/audio/memes/chiphien_kemay.mp3'),
  chiphien_dequahe: require('../assets/audio/memes/chiphien_dequahe.mp3'),
  chiphien_capdoimanh: require('../assets/audio/memes/chiphien_capdoimanh.mp3'),
  chiphien_chitoitiec: require('../assets/audio/memes/chiphien_chitoitiec.mp3'),
  chiphien_nhinchidi: require('../assets/audio/memes/chiphien_nhinchidi.mp3'),
  chiphien_nhinmaylaidi: require('../assets/audio/memes/chiphien_nhinmaylaidi.mp3'),
  chiphien_odaumaxai: require('../assets/audio/memes/chiphien_odaumaxai.mp3'),
  chiphien_khongthamlam: require('../assets/audio/memes/chiphien_khongthamlam.mp3'),
  chiphien_xuitaotai: require('../assets/audio/memes/chiphien_xuitaotai.mp3'),
  // Hỗ trợ Game cốt lõi (10)
  batan_noroi: require('../assets/audio/memes/batan_noroi.mp3'),
  tienbip_cainit: require('../assets/audio/memes/tienbip_cainit.mp3'),
  sena_donate: require('../assets/audio/memes/sena_donate.mp3'),
  vn_toicongchuyen: require('../assets/audio/memes/vn_toicongchuyen.mp3'),
  vn_batngochua: require('../assets/audio/memes/vn_batngochua.mp3'),
  vn_vinhbietcu: require('../assets/audio/memes/vn_vinhbietcu.mp3'),
  vn_hettien: require('../assets/audio/memes/vn_hettien.mp3'),
  vn_fartmic: require('../assets/audio/memes/vn_fartmic.mp3'),
  vn_vineboom: require('../assets/audio/memes/vn_vineboom.mp3'),
  vn_amongus: require('../assets/audio/memes/vn_amongus.mp3'),
};

export interface BgmInfo {
  id: BgmId;
  name: string;
  duration: string;
  vibe: string;
}

export const BGM_LIST: readonly BgmInfo[] = [
  {
    id: 'bgm_sing_linda_cafe',
    name: 'Linda: Đen Đá Không Đường (Hát Cover)',
    duration: '73.5s',
    vibe: 'Cover lầy lội nhưng cực bắt tai, phát xoay vòng mọi ván',
  },
  {
    id: 'bgm_sing_coba_cailuong',
    name: 'Cô Ba Vàng Ngọc: Nửa Đời Giựt Hụi (Cải Lương)',
    duration: '88.0s',
    vibe: 'Hát cải lương mùi mẫn đậm chất hội chợ & Xóm Lầy',
  },
  {
    id: 'bgm_sing_duet_cailuong',
    name: 'Minh Hiếu x Cô Ba: Tình Chị Nghĩa Em (Cải Lương)',
    duration: '60.0s',
    vibe: 'Song ca cải lương khẩu chiến có một không hai giữa hai bà hoàng',
  },
  {
    id: 'bgm_sing_phuonghang_t30',
    name: 'Cô Phương Hằng: Tôi Và T30 (Nhạc Chế Live)',
    duration: '93.0s',
    vibe: 'Nhạc chế tâm trạng kịch tính khuấy động không khí bàn đấu',
  },
  {
    id: 'bgm_sing_phuonghang_bolero',
    name: 'Cô Phương Hằng: Cơn Mê Tình Ái (Bolero Live)',
    duration: '90.0s',
    vibe: 'Bolero livestream du dương chill giữa các pha đấu trí',
  },
  {
    id: 'bgm_sing_allstars_7rings',
    name: 'All-Stars Xóm Lầy: 7 Rings Miếng Đất (Mashup)',
    duration: '90.0s',
    vibe: 'Đại hội võ lâm hội tụ Cô Minh Hiếu, Phương Hằng, Cô Ba & Linda',
  },
];

export const BGM_PLAYLIST: readonly BgmId[] = BGM_LIST.map((b) => b.id);

export interface MemeInfo {
  id: MemeId;
  persona: MemePersona;
  label: string;
  quote: string;
  context: string;
}

export const MEME_LIST: readonly MemeInfo[] = [
  // Cô Linda / Cẩm Lan Sục (29)
  { id: 'linda_chao', persona: 'linda', label: 'Xin chào cả nhà iu của kem', quote: 'Hi xin chào cả nhà iu của kem!', context: 'Vào phòng / chào đón' },
  { id: 'linda_trolai', persona: 'linda', label: 'Linda xin chào trở lại', quote: 'Linda xin chào trở lại!', context: 'Vào phòng / quay lại bàn' },
  { id: 'linda_chicho', persona: 'linda', label: 'Chị chờ cưng nãy giờ nè', quote: 'Trời đất ơi chị chờ cưng nãy giờ nè!', context: 'Chờ tới lượt / hối đánh nhanh' },
  { id: 'linda_emquaday', persona: 'linda', label: 'Em qua đây chơi với anh', quote: 'Em qua đây chơi với anh!', context: 'Mời kèo / trêu ghẹo khi ra đòn' },
  { id: 'linda_dangcap', persona: 'linda', label: 'Phong độ nhất thời, đẳng cấp mãi mãi', quote: 'Phong độ chỉ là nhất thời, đẳng cấp là mãi mãi cưng à!', context: 'Thắng ván / đoán chuẩn' },
  { id: 'linda_que', persona: 'linda', label: 'Rồi các bạn thấy quê không?', quote: 'Rồi các bạn thấy quê chưa?!', context: 'Thua quê / đoán sai / bị loại' },
  { id: 'linda_level', persona: 'linda', label: 'Không đủ level nói chuyện với chị', quote: 'Không có đủ level nói chuyện với chị đâu ha!', context: 'Cà khịa đối thủ / thả skill' },
  { id: 'linda_botkhung', persona: 'linda', label: 'Tao lạy mày bớt khùng dùm tao đi', quote: 'Tao lạy mày nè, mày bớt khùng dùm tao đi!', context: 'Chọc troll / đoán bậy' },
  { id: 'linda_10lay', persona: 'linda', label: 'Chị lạy em 10 lạy cho hài lòng', quote: 'Chị lạy em mười lạy cho em hài lòng!', context: 'Biện minh / năn nỉ đừng vote' },
  { id: 'linda_thaloi', persona: 'linda', label: 'Em tha lỗi cho chị nha', quote: 'Em tha lỗi cho chị nha!', context: 'Xin tha bổng / hòa giải' },
  { id: 'linda_hongnho', persona: 'linda', label: 'Ủa có hả ta sao tao hổng nhớ?', quote: 'Ủa có hả ta? Sao tao hổng nhớ!', context: 'Giả nai lúc bị nghi & biện minh' },
  { id: 'linda_duathoi', persona: 'linda', label: 'Đùa thôi đừng có làm quá!', quote: 'Đùa thôi đừng có làm quá!', context: 'Hạ nhiệt / tha bổng / cà khịa' },
  { id: 'linda_cuoi', persona: 'linda', label: 'Linda cười á ahahahaha', quote: 'Cười á ahahahaha!', context: 'Cười hả hê khi troll trúng' },
  { id: 'linda_maccuoi', persona: 'linda', label: 'Ủa mắc cười hahaha', quote: 'Ủa mắc cười hahaha!', context: 'Chọc cười / thả cảm xúc' },
  { id: 'linda_airanh', persona: 'linda', label: 'Ai rảnh?', quote: 'Ai rảnh?!', context: 'Chê bai / đoán hụt / né kèo' },
  { id: 'linda_banoi', persona: 'linda', label: 'Cái gì vậy bà nội?!', quote: 'Cái gì vậy bà nội?!', context: 'Sốc khi bị úp sọt / bom nổ' },
  { id: 'linda_caigizay', persona: 'linda', label: 'Cái gì zậy trời?!', quote: 'Cái gì zậy?!', context: 'Bất ngờ pha lật kèo' },
  { id: 'linda_omc', persona: 'linda', label: 'Ô mai ca quan ai sẹt!', quote: 'Ô mai ca quan ai sẹt!', context: 'Ngạc nhiên cực độ' },
  { id: 'linda_thatim', persona: 'linda', label: 'Thả tim nè!', quote: 'Thả tim chụt chụt!', context: 'Tặng quà / nhận tim' },
  { id: 'linda_ngonqua', persona: 'linda', label: 'Ngon quá à lâu lắm mới được ăn', quote: 'Ngon quá à, lâu lắm mới được ăn!', context: 'Ăn lớn / nhận quà / lụm tiền' },
  { id: 'linda_ngonquaha', persona: 'linda', label: 'Ngon quá hà!', quote: 'Ngon quá hà!', context: 'Thắng / đoán chuẩn' },
  { id: 'linda_zo', persona: 'linda', label: 'Zô của Linda!', quote: 'Zô!!', context: 'Ra đòn / chốt hạ ăn mừng' },
  { id: 'linda_jzma', persona: 'linda', label: 'Gì zậy má?!', quote: 'Gì zậy má?!', context: 'Phản ứng nhanh khi đoán sai / bị sốc' },
  { id: 'linda_oijztroi', persona: 'linda', label: 'Ôi gì zậy trời!', quote: 'Linda ơi gì zậy trời!', context: 'Thua tức tưởi / bất ngờ' },
  { id: 'linda_achetchi', persona: 'linda', label: 'Á chết chị!', quote: 'Á chết chị!', context: 'Cá sấu đớp / bị loại / trúng bom' },
  { id: 'linda_chuyencuatao', persona: 'linda', label: 'Đây là chuyện của tao!', quote: 'Đây là chuyện của tao!', context: 'Gắt lên / bỏ phiếu / cà khịa mạnh' },
  { id: 'linda_toalet', persona: 'linda', label: 'Mới đi toa lét ra', quote: 'Linda mới đi toa lét ra!', context: 'Tấu hài lúc vào bàn / chat' },
  { id: 'linda_cuutui', persona: 'linda', label: 'Trời đất ơi cứu tui!', quote: 'Trời đất ơi cứu tui!', context: 'Bị dí bom / cạn Ruby / bị đớp' },
  { id: 'linda_chanhnha', persona: 'linda', label: 'Cho em chanh nha chị', quote: 'Cho em chanh nha chị!', context: 'Chọc quê / rôm rả bàn chơi' },
  { id: 'linda_xinchao_mn', persona: 'linda', label: 'Xin chào mọi người', quote: 'Xin chào mọi người!', context: 'Chào bàn khi vào phòng' },
  { id: 'linda_uongnuocmia', persona: 'linda', label: 'Đang uống nước mía nè', quote: 'Em tôi hả đang uống nước mía cho mọi người coi!', context: 'Thảnh thơi hóng chuyện trên bàn' },
  { id: 'linda_cuutoibacon', persona: 'linda', label: 'Chết tôi sớm rồi bà con ơi', quote: 'Chết tôi là sớm rồi bà con ơi!', context: 'Nổ bom / bị cá sấu cắn / thua đau' },
  { id: 'linda_ecaijztroi', persona: 'linda', label: 'Ê cái gì vậy trời?', quote: 'Ê cái gì vậy trời? Trời ơi!', context: 'Sốc bất ngờ / đoán trật / dính đòn' },
  { id: 'linda_meoicuucon', persona: 'linda', label: 'Mẹ ơi cứu con!', quote: 'Mẹ ơi cứu con hả!', context: 'Hoảng loạn khi dính bom / cắn' },
  { id: 'linda_moimocra', persona: 'linda', label: 'Bữa nay chị moi ra hết', quote: 'Bữa nay chết với chị, bữa nay chị moi ra hết!', context: 'Vạch mặt gián điệp / lật kèo vote' },
  { id: 'linda_buoitoivuive', persona: 'linda', label: 'Chúc mọi người buổi tối vui vẻ', quote: 'Không quên chúc mọi người buổi tối vui vẻ!', context: 'Chào bàn / mở màn rôm rả' },
  { id: 'linda_toasang', persona: 'linda', label: 'Đi tới đâu là tỏa sáng tới đó', quote: 'Đi tới đâu là tỏa sáng tới đó!', context: 'Vào ván / đoán đúng / thắng giòn' },
  { id: 'linda_xuongnuiquay', persona: 'linda', label: 'Tao xuống núi quậy hả?', quote: 'Tu mà cho tu lâu, tao xuống núi quậy hả?', context: 'Tới lượt / cà khịa đối thủ' },

  // Cô Ba Vàng Ngọc (26)
  { id: 'coba_giangho', persona: 'coba', label: 'Dòng họ tao giang hồ không!', quote: 'Mày biết dòng họ tao là giang hồ không?', context: 'Bỏ phiếu / hù dọa đối thủ' },
  { id: 'coba_thoithoi', persona: 'coba', label: 'Ôi trời ơi thôi thôi!', quote: 'Ôi trời ơi thôi thôi!', context: 'Hoảng hốt né đòn / thua / cá sấu đớp' },
  { id: 'coba_quatbatieu', persona: 'coba', label: 'Quạt ba tiêu Cô Ba!', quote: 'Quạt ba tiêu nè con!', context: 'Tung chiêu troll / thổi bay đối thủ' },
  { id: 'coba_dethuong', persona: 'coba', label: 'Trời đất ơi có dễ thương không hahaha', quote: 'Trời đất ơi có dễ thương không hahaha!', context: 'Thắng vui vẻ / tặng quà / đoán chuẩn' },
  { id: 'coba_futani', persona: 'coba', label: 'Đây là đồng tiền chân thật!', quote: 'Phu Ta Ni nó mới nói đây là đồng tiền chân thật!', context: 'Nhận thưởng / lụm Ruby / đoán đúng' },
  { id: 'coba_totote', persona: 'coba', label: 'To tò te đây là ban kèn hơi', quote: 'To tò te, đây là ban kèn hơi, to là tò te té!', context: 'Ăn mừng rộn ràng / chọc quê / tung xúc xắc' },
  { id: 'coba_muonchoi', persona: 'coba', label: 'Có anh nào muốn chơi vô đây', quote: 'Có anh nào muốn chơi vô cùng đây với cây kèn!', context: 'Mời kèo vào bàn / tới lượt' },
  { id: 'coba_buoccungchan', persona: 'coba', label: 'Bước cùng chân cùng chơi vui vẻ', quote: 'Bước cùng chân cùng chơi, đó vui vẻ!', context: 'Hòa giải / khởi đầu / giao lưu' },
  { id: 'coba_ngaychon', persona: 'coba', label: 'Bữa nay mày tới thời mày rồi', quote: 'Bữa nay mày tới thời mày rồi, mày ghẹo đúng nơi đúng chỗ!', context: 'Bắt thóp kẻ phản bội / sập bẫy' },
  { id: 'coba_batphelon', persona: 'coba', label: 'Tụi bay bắt phe lộn rồi!', quote: 'Tụi bay bắt phe lộn rồi! Tụi bay bắt bồ mà bắt lộn rồi!', context: 'Vote nhầm đồng đội / chọn sai' },
  { id: 'coba_phenguoigiau', persona: 'coba', label: 'Bắt phe với người giàu có tiền', quote: 'Trời đất ơi người ta bắt phe với người giàu, người có tiền!', context: 'Khoe giàu / cháy túi / cà khịa' },
  { id: 'coba_luocmay', persona: 'coba', label: 'Cỡ mày có người luộc mày nữa chứ', quote: 'Cỡ mày người ta bỏ vài trăm ngàn cũng có người luộc mày nữa chứ!', context: 'Thua đau / bị cắn / hù dọa' },
  { id: 'coba_votungoi', persona: 'coba', label: 'Cho mày chiếc này vô tù ngồi nè', quote: 'Tao cho mày chiếc này vô tù mày ngồi nè!', context: 'Vào ô Tù / bị trục xuất khỏi ván' },
  { id: 'coba_mayimtaotha', persona: 'coba', label: 'Mày im thì tao tha!', quote: 'Mày im thì tao tha, tao im tao không nói tới mày được!', context: 'Phán quyết tha bổng / lật kèo' },
  { id: 'coba_khovang', persona: 'coba', label: 'Mẹ mới cho cái kho vàng', quote: 'Nhờ cái tâm thánh thiện mà mẹ mới cho cái kho vàng!', context: 'Thắng jackpot / đoán trúng / nhận tiền' },
  { id: 'coba_thathu', persona: 'coba', label: 'Ta sẵn sàng tha thứ cho con', quote: 'Ta sẵn sàng tha thứ cho con nếu con biết rồi!', context: 'Chọn tha bổng / xoay chiều thế trận' },
  { id: 'coba_choitangoc', persona: 'coba', label: 'Chơi phải chơi cho tận gốc', quote: 'Chơi phải chơi cho tận gốc tận cùng!', context: 'Vào ván / tung chiêu hết mình' },
  { id: 'coba_dunglaigia', persona: 'coba', label: 'Dừng lại! Đó là tên giả đó', quote: 'Dừng lại! Đó là tên giả đó!', context: 'Bắt gián điệp / lật mặt sói / vote' },
  { id: 'coba_nhinquancanh', persona: 'coba', label: 'Mày nhìn hoàn cảnh của mày đi', quote: 'Cho mày nhìn cái cảnh của mày đi!', context: 'Cà khịa đối thủ đang thê thảm' },
  { id: 'coba_xinloianh', persona: 'coba', label: 'Em xin lỗi anh tha thứ cho em', quote: 'Bây giờ em xin lỗi em lạy anh, tha thứ cho em!', context: 'Thanh minh / xin tha bổng phút chót' },
  { id: 'coba_tamgietubi', persona: 'coba', label: 'Tâm từ bi bỏ qua cho con', quote: 'Lấy tâm từ bi mà bỏ qua cho lần này!', context: 'Tha bổng khi vote hòa / xử nhẹ' },
  { id: 'coba_giadinhtannat', persona: 'coba', label: 'Tha thứ cho con, tan nát hết rồi', quote: 'Mẹ hãy tha thứ cho con, gia cảnh đã tan nát hết rồi!', context: 'Than thở cháy túi / thua đau / thanh minh' },
  { id: 'coba_dungdongkich', persona: 'coba', label: 'Đừng có đóng kịch nữa!', quote: 'Đừng có đóng kịch nữa chị ơi!', context: 'Tố diễn sâu / vote nghi phạm' },
  { id: 'coba_dunggionmat', persona: 'coba', label: 'Vô tù ngồi nè, đừng giỡn mặt!', quote: 'Này vô tù ngồi nè, chứ mày đừng có giỡn mặt!', context: 'Vào tù / bị loại / cảnh cáo cực gắt' },
  { id: 'coba_dinhphen', persona: 'coba', label: 'Coi lại cái mặt, dính phèn kìa', quote: 'Coi lại cái mặt của mình đi, dính phèn rồi đó!', context: 'Đoán sai / chọc quê đồng đội' },
  { id: 'coba_aotuongsucmanh', persona: 'coba', label: 'Ảo tưởng sức mạnh!', quote: 'Nói gì hả? Ảo tưởng sức mạnh vừa thôi!', context: 'Đoán hụt / nổ quá đà bị dập' },

  // Cô Minh Hiếu (25)
  { id: 'minhhieu_tinhlai', persona: 'minhhieu', label: 'Tự nhiên cái tui tỉnh lại liền luôn', quote: 'Trời đất ơi tự nhiên cái tui tỉnh lại liền luôn!', context: 'Đoán trúng bất ngờ / lật kèo sống lại' },
  { id: 'minhhieu_duongquyen', persona: 'minhhieu', label: 'Cầm tiền đô đi đường quyền', quote: 'Có tiền đô này nè, cầm tiền đô đi đường quyền với mày!', context: 'Ra đòn / tung chiêu phản công' },
  { id: 'minhhieu_tiendohay', persona: 'minhhieu', label: 'Có tiền đi đường quyền mạnh ghê', quote: 'Bữa nay có tiền đi đường quyền mạnh ghê luôn!', context: 'Ăn lớn / vừa ra nước đi hay' },
  { id: 'minhhieu_maccuoi', persona: 'minhhieu', label: 'Tự nhiên có tiền đô mắc cười', quote: 'Trời ơi tự nhiên có tiền đô sao mắc cười hoài luôn vậy ngộ ghê!', context: 'Nhận quà / tấu hài trong phòng' },
  { id: 'minhhieu_khoe', persona: 'minhhieu', label: 'Có tiền đô thấy nó khỏe gì đâu', quote: 'Tự nhiên có tiền đô sao thấy nó khỏe gì đâu!', context: 'Mở ván / hồi sức chiến tiếp' },
  { id: 'minhhieu_tiendo_quat', persona: 'minhhieu', label: 'Cầm tiền đô tao quạt mát lắm', quote: 'Cầm tiền đô vầy nè tao quạt vậy nè, tiền đô nó mát dữ lắm!', context: 'Lụm tiền / khoe giàu' },
  { id: 'minhhieu_matphoiphoi', persona: 'minhhieu', label: 'Quạt tiền đô mát phơi phới', quote: 'Tiền đô tao nói nó quạt mà nó mát phơi phới vậy đó!', context: 'Chốt thắng đậm / ăn bội tiền' },
  { id: 'minhhieu_10trieu', persona: 'minhhieu', label: '10 triệu tiền thiệt đàng hoàng', quote: 'Cái này là 10 triệu ha, 10 triệu tiền thiệt đàng hoàng nha!', context: 'Tặng quà lớn / đặt cược / giao dịch' },
  { id: 'minhhieu_lubu', persona: 'minhhieu', label: 'Lu bu quá mắc đếm tiền', quote: 'Trời đất ơi còn em thì lu bu quá, em mắc đếm tiền!', context: 'Đếm tiền / bận né đòn / chém gió' },
  { id: 'minhhieu_canvang', persona: 'minhhieu', label: 'Lấy ký cân vàng thử còn nhiêu', quote: 'Vàng bây giờ còn bao nhiêu rồi? Lấy cái ký cân thử còn bao nhiêu!', context: 'Soi ví Ruby / hết tiền' },
  { id: 'minhhieu_hoihan', persona: 'minhhieu', label: 'Hối hận vô cùng luôn', quote: 'Tự nhiên mình thấy mình hối hận vô cùng!', context: 'Đoán sai / thua ván / dính bom' },
  { id: 'minhhieu_muonkhoc', persona: 'minhhieu', label: 'Đó muốn khóc vậy đó', quote: 'Đó, muốn khóc vậy đó!', context: 'Mất trắng Ruby / bị loại' },
  { id: 'minhhieu_chotdon', persona: 'minhhieu', label: 'Chốt đơn chốt đơn chốt đơn!', quote: 'Chốt đơn! Chốt đơn! Chốt đơn! Chốt đơn!', context: 'Chốt lượt / vote / đoán đúng từ khóa' },
  { id: 'minhhieu_conquyxao', persona: 'minhhieu', label: 'Xạo! Mấy con quỷ xạo', quote: 'Xạo! Mấy cái con quỷ xạo!', context: 'Bóc phốt / chê đáp án sai' },
  { id: 'minhhieu_laytienche', persona: 'minhhieu', label: 'Lấy tiền che lại liền!', quote: 'Thì em lấy tiền che lại liền!', context: 'Né đòn / đỡ phạt bằng Ruby / lật kèo' },
  { id: 'minhhieu_soqua', persona: 'minhhieu', label: 'Thôi trời ơi tôi sợ lắm!', quote: 'Sợ quá trời ơi thôi tôi sợ lắm rồi!', context: 'Hoảng hồn / dí bom / cá sấu cắn' },
  { id: 'minhhieu_cuutoi', persona: 'minhhieu', label: 'Trời ơi cứu tôi chết tôi!', quote: 'Trời ơi cứu tôi, cứu tôi, chết tôi trời ơi!', context: 'Dính bom / bị cắn / bị loại khỏi ván' },
  { id: 'minhhieu_tienchicho', persona: 'minhhieu', label: 'Tiền này của chị kia cho nữa đó', quote: 'Còn cái tiền này là của cái chị kia nữa đó!', context: 'Nhận thưởng / tặng quà Ruby' },
  { id: 'minhhieu_tiendomat', persona: 'minhhieu', label: 'Tiền đô gửi về nó mát gì đâu', quote: 'Tiền đô mà tao nói gửi về nó mát gì đâu á!', context: 'Thu tiền thuê / thắng Ruby rủng rỉnh' },
  { id: 'minhhieu_nganruoido', persona: 'minhhieu', label: 'Tiền mới ngàn rưỡi đô nè', quote: 'Gửi về tiền mới ngàn rưỡi đô nè thấy chưa!', context: 'Nhận Ruby / ăn kèo lớn' },
  { id: 'minhhieu_1000do', persona: 'minhhieu', label: 'Một ngàn đô chưa xài nữa!', quote: 'Cho họ một ngàn đô nè, đổi ra chưa xài nữa!', context: 'Phát thưởng / tặng quà / rủng rỉnh' },
  { id: 'minhhieu_tientuoi', persona: 'minhhieu', label: 'Tiền tươi không nè!', quote: 'Tiền tươi không nè, tiền đô của người ta gửi về nè!', context: 'Thanh toán Ruby tươi rói' },
  { id: 'minhhieu_khongaimua', persona: 'minhhieu', label: 'Chốt đơn mà không thấy ai mua', quote: 'Chốt đơn chốt đơn mà em không thấy ai mua hết trơn!', context: 'Thua ván / ế hàng / cháy túi' },
  { id: 'minhhieu_cadonhuquy', persona: 'minhhieu', label: 'Ca dở như quỷ, cầm mic không ra', quote: 'Ca dở như quỷ mà cầm micro ca hoài!', context: 'Chê đáp án sai / chọc quê trên chat' },
  { id: 'minhhieu_rotmuocmat', persona: 'minhhieu', label: 'Nói mà rớt nước mắt muốn khóc', quote: 'Ngồi nói mà rớt nước mắt muốn khóc luôn vậy đó!', context: 'Thua thảm / cạn túi / bị loại' },

  // Cô Phương Hằng (29)
  { id: 'phuonghang_ngongang', persona: 'phuonghang', label: 'Ngỡ ngàng ngơ ngác bật ngửa', quote: 'Quá bất ngờ, ngỡ ngàng, ngơ ngác và bật ngửa!', context: 'Lật kèo bất ngờ / mở kết quả sốc' },
  { id: 'phuonghang_trongcuoc', persona: 'phuonghang', label: 'Người trong cuộc hiểu người trong kẹt', quote: 'Chỉ có người trong cuộc mới hiểu người trong kẹt thôi quý vị à!', context: 'Biện minh / thảo luận nội bộ' },
  { id: 'phuonghang_dungdien', persona: 'phuonghang', label: 'Thần điêu đại bịp đừng diễn nữa', quote: 'Thần điêu đại bịp! Thôi đừng có diễn nữa mấy má mấy cha ơi!', context: 'Tố cáo khi bỏ phiếu' },
  { id: 'phuonghang_haoquang', persona: 'phuonghang', label: 'Đừng thấy hào quang tưởng vinh quang', quote: 'Đừng thấy hào quang mà tưởng vinh quang nha quý vị!', context: 'Đoán sai / thua ngược' },
  { id: 'phuonghang_luadao', persona: 'phuonghang', label: '1 mét vuông ba bốn lừa đảo', quote: 'Xã hội bây giờ kinh khủng quá, 1 mét vuông tới ba bốn thằng lừa đảo!', context: 'Sốc vì bị úp sọt / hụt Ruby' },
  { id: 'phuonghang_tuongvay', persona: 'phuonghang', label: 'Đừng thấy hoa nở ngỡ xuân về', quote: 'Đừng thấy hoa nở mà ngỡ xuân về, đừng thấy vậy mà tưởng vậy nha quý vị!', context: 'Cú twist ngược dòng / tha bổng' },
  { id: 'phuonghang_divang', persona: 'phuonghang', label: 'Dĩ vãng dơ dáy dễ gì giấu diếm', quote: 'Dĩ vãng dơ dáy dễ gì giấu diếm!', context: 'Bị lật tẩy vai ác / thua lộ bài' },
  { id: 'phuonghang_nhieuchuyen', persona: 'phuonghang', label: 'Không thích nhiều chuyện mà chuyện quá nhiều', quote: 'Em không thích nhiều chuyện đâu mà tại chuyện nó quá nhiều!', context: 'Bình luận rôm rả / biện minh' },
  { id: 'phuonghang_chanly', persona: 'phuonghang', label: 'Chân lý không phải chân tường', quote: 'Chân lý là chân lý chứ không phải chân lý là chân tường!', context: 'Đoán trúng phóc / khẳng định đáp án' },
  { id: 'phuonghang_motminhtao', persona: 'phuonghang', label: 'Công ty TNHH Một Mình Tao Chấp Hết', quote: 'Công ty trách nhiệm hữu hạn Một Mình Tao Chấp Hết!', context: 'Thắng áp đảo / cân cả bàn' },
  { id: 'phuonghang_dunglacham', persona: 'phuonghang', label: 'Đụng là chạm, cảm là xúc!', quote: 'Nó đụng em phải chạm thôi, nó cảm là em phải xúc thôi!', context: 'Tung skill / phản công / cắn nhau' },
  { id: 'phuonghang_dosup', persona: 'phuonghang', label: 'Cho nó đổ sụp luôn!', quote: 'Nó muốn sụp thì em cho nó đổ sụp luôn!', context: 'Bom nổ / hạ gục đối thủ' },
  { id: 'phuonghang_kimcuong', persona: 'phuonghang', label: 'Im lặng là vàng, nói ra là kim cương', quote: 'Người ta nói im lặng là vàng, còn tôi nói ra tôi mới là kim cương!', context: 'Chốt đáp án / thắng / nhận Ruby' },
  { id: 'phuonghang_lamchu', persona: 'phuonghang', label: 'Làm chủ cuộc sống, làm chủ cuộc chơi', quote: 'Làm chủ mình, làm chủ cuộc sống, làm chủ cuộc chơi!', context: 'Vào ván / tung chiêu làm chủ bàn' },
  { id: 'phuonghang_50tuoi', persona: 'phuonghang', label: '50 tuổi mà được như tôi không?', quote: 'Có ai 50 tuổi mà được như tôi không quý vị!', context: 'Gáy thắng / khịa nhẹ bàn chơi' },
  { id: 'phuonghang_thayvay', persona: 'phuonghang', label: 'Thấy vậy mà không phải vậy!', quote: 'Thấy vậy mà không phải vậy đâu nha quý vị!', context: 'Lật kèo / thanh minh / tình huống bất ngờ' },
  { id: 'phuonghang_nguyhiem', persona: 'phuonghang', label: 'Nơi không an toàn là nơi nguy hiểm!', quote: 'Những nơi không an toàn là những nơi rất là nguy hiểm!', context: 'Cảnh báo bom / cá sấu / vào đêm' },
  { id: 'phuonghang_khonhon', persona: 'phuonghang', label: 'Đừng nghĩ mình khôn hơn người khác', quote: 'Đừng bao giờ nghĩ rằng mình khôn hơn người khác!', context: 'Chặt đẹp / chọc quê / hóng chat' },
  { id: 'phuonghang_suthat', persona: 'phuonghang', label: 'Sự thật bao giờ cũng là sự thật', quote: 'Chị nói sự thật bao giờ cũng là sự thật thôi!', context: 'Đoán trúng / khẳng định chắc nịch' },
  { id: 'phuonghang_tinhhinh', persona: 'phuonghang', label: 'Tình hình bây giờ rất là tình hình', quote: 'Tình hình bây giờ rất là tình hình luôn quý vị!', context: 'Bầu không khí căng thẳng / hóng biến' },
  { id: 'phuonghang_tienphuongtien', persona: 'phuonghang', label: 'Tiền chỉ là phương tiện thôi mà', quote: 'Tiền nó chỉ là phương tiện thôi mà quý vị!', context: 'Giao dịch Ruby / tiêu tiền không tiếc' },
  { id: 'phuonghang_tubitritue', persona: 'phuonghang', label: 'Có từ bi thì phải có trí tuệ', quote: 'Có từ bi thì phải có trí tuệ nha quý vị!', context: 'Tha bổng sáng suốt / tung nước đi hay' },
  { id: 'phuonghang_quantutrathu', persona: 'phuonghang', label: 'Quân tử trả thù 10 năm chưa muộn', quote: 'Quân tử trả thù 10 năm chưa muộn đâu nha!', context: 'Ghi thù lật kèo / chọc đối thủ' },
  { id: 'phuonghang_voquytday', persona: 'phuonghang', label: 'Vỏ quýt dày có móng tay nhọn!', quote: 'Đi đêm có ngày gặp ma, vỏ quýt dày có móng tay nhọn!', context: 'Bắt quả tang / lật kèo / xử tử' },
  { id: 'phuonghang_chuabaogiobochay', persona: 'phuonghang', label: 'Cuộc chơi chưa bao giờ bỏ chạy!', quote: 'Cuộc chơi này tôi chưa bao giờ bỏ chạy!', context: 'Chốt lượt / phản biện không lùi bước' },
  { id: 'phuonghang_thanhcong', persona: 'phuonghang', label: 'Thành công thì tôi hưởng thụ!', quote: 'Cuộc sống tôi thành công thì tôi hưởng thụ!', context: 'Thắng lớn / thu Ruby' },
  { id: 'phuonghang_aidungaisai', persona: 'phuonghang', label: 'Không thể kết luận ai đúng ai sai', quote: 'Chúng ta không thể kết luận ai đúng ai sai!', context: 'Tranh luận / vote cân não / đoán hụt' },
  { id: 'phuonghang_lammoico', persona: 'phuonghang', label: 'Chỉ có làm thì mới có ăn!', quote: 'Chỉ có làm thì mới có ăn nha quý vị!', context: 'Đoán đúng / cày điểm tới lượt' },
  { id: 'phuonghang_anhhung', persona: 'phuonghang', label: 'Anh hùng núp là bị lôi ra hết!', quote: 'Anh hùng hảo hán núp vô là bị lôi ra hết!', context: 'Chỉ điểm gián điệp / lộ phe đêm' },

  // Chị Phiến (25)
  { id: 'chiphien_aiepmay', persona: 'chiphien', label: 'Ai ép mày, mệt thì nghỉ!', quote: 'Ai ép mày! Mệt thì nghỉ, chứ làm hoài chi!', context: 'Thua ván / hết Ruby / bị loại' },
  { id: 'chiphien_maydien', persona: 'chiphien', label: 'Mày điên rồi không để ai ngủ', quote: 'Mày điên rồi! Biết mấy giờ chưa không để cho ai ngủ hết trơn!', context: 'Sốc / hối nhanh trong chat' },
  { id: 'chiphien_xinloi', persona: 'chiphien', label: 'Xin lỗi gì mà xin lỗi?!', quote: 'Xin lỗi nha! Xin lỗi gì mà xin lỗi?!', context: 'Phản đòn / troll khi bị vote oan' },
  { id: 'chiphien_dingu', persona: 'chiphien', label: 'Trễ rồi xin đi ngủ nha bye bye', quote: 'Trễ rồi, xin đi ngủ nha! Bye bye!', context: 'Bị loại / tạm biệt rời ván' },
  { id: 'chiphien_30ty', persona: 'chiphien', label: 'Tiền học phí con chị 30 tỷ', quote: 'Một tháng tiền học phí của con chị là phải 30 tỷ!', context: 'Cháy túi / giao dịch tiền lớn' },
  { id: 'chiphien_hoahau', persona: 'chiphien', label: 'Chị là hoa hậu xe tải', quote: 'Hồi xưa chị sang trọng, chị nói chị là hoa hậu xe tải!', context: 'Chào sân / tạo nét đầu lượt' },
  { id: 'chiphien_khongvon', persona: 'chiphien', label: 'Làm nước hoa mấy triệu chai một ngày', quote: 'Làm gì có vốn mà chị làm nước hoa ra mấy triệu chai một ngày!', context: 'Thắng đậm / lụm tiền liên tục' },
  { id: 'chiphien_bonghong', persona: 'chiphien', label: 'Đúng cái bông hồng đó của chị', quote: 'Hồi nãy chị nói rồi, đúng cái bông hồng đó là của chị đó!', context: 'Đoán trúng / ăn ván' },
  { id: 'chiphien_loilam', persona: 'chiphien', label: 'Chỉnh chu quá vẫn có lỗi lầm', quote: 'Chuẩn bị chỉnh chu quá vẫn có lỗi lầm, đó chính là cái lỗi của ảnh!', context: 'Đoán sai / hụt chiến thắng' },
  { id: 'chiphien_kholam', persona: 'chiphien', label: 'Chị khờ lắm ai nói gì tin liền', quote: 'Chị vậy thôi chứ chị khờ lắm, ai nói cái gì chị tin cái đó liền!', context: 'Bị lừa lúc vote / đoán trật' },
  { id: 'chiphien_miengdat', persona: 'chiphien', label: 'Mua cho em miếng đất là tin liền', quote: 'Anh mua cho em miếng đất nha là chị tin liền!', context: 'Tặng quà / mua đất trong game' },
  { id: 'chiphien_villa', persona: 'chiphien', label: 'Mua căn villa dụ chị được liền', quote: 'Muốn dụ chị dễ lắm, mua căn villa là dụ chị được liền rồi!', context: 'Nhận quà khủng / nâng cấp' },
  { id: 'chiphien_vonghiem', persona: 'chiphien', label: 'Phương trình vô nghiệm', quote: 'Chúng tôi chính là một phương trình vô nghiệm!', context: 'Bó tay / thua ván / đáp án trật' },
  { id: 'chiphien_xinhdep', persona: 'chiphien', label: 'Không có mày chị vẫn xinh vẫn đẹp', quote: 'Ở đất ơi nè, không có mày chị vẫn xinh vẫn đẹp!', context: 'Tự tin lật kèo / đi tiếp không ngại' },
  { id: 'chiphien_metlamroi', persona: 'chiphien', label: 'Một cái thôi chị mệt lắm rồi', quote: 'Trời đất ơi một cái thôi là chị đã mệt lắm rồi em yêu ơi!', context: 'Dính bom / bị cắn / ăn đòn nặng' },
  { id: 'chiphien_taisancuachi', persona: 'chiphien', label: 'Tài sản của ảnh dành cho chị hết', quote: 'Tài sản của ảnh là dành cho chị hết đó nha!', context: 'Ăn tiền thuê / nhận quà Ruby' },
  { id: 'chiphien_kemay', persona: 'chiphien', label: 'Kệ mày chứ, chị không quan tâm', quote: 'Kệ mày chứ, chị Phiến không có quan tâm đâu cưng!', context: 'Cà khịa / phản biện bơ đẹp' },
  { id: 'chiphien_dequahe', persona: 'chiphien', label: 'Dễ quá he!', quote: 'Trời ơi dễ quá he!', context: 'Đoán đúng cái rẹt / đi nước quá mượt' },
  { id: 'chiphien_capdoimanh', persona: 'chiphien', label: 'Cặp đôi mạnh nhất thế giới!', quote: 'Cặp đôi là mạnh nhất thế giới luôn đó nha!', context: 'Thắng đồng đội / đoán ăn ý' },
  { id: 'chiphien_chitoitiec', persona: 'chiphien', label: 'Chị tới tiệc rồi đây!', quote: 'Ôi tới tiệc rồi đây mấy cưng ơi!', context: 'Vào ván / góp vui phòng chờ' },
  { id: 'chiphien_nhinchidi', persona: 'chiphien', label: 'Giờ mày nhìn chị đi!', quote: 'Giờ mày nhìn chị đi, chị đẹp mà!', context: 'Chốt lượt tự tin / khịa nhẹ' },
  { id: 'chiphien_nhinmaylaidi', persona: 'chiphien', label: 'Mày nhìn lại mày đi!', quote: 'Mày nhìn lại mày đi cưng!', context: 'Cà khịa đáp án sai / chọc quê' },
  { id: 'chiphien_odaumaxai', persona: 'chiphien', label: 'Ở đâu ra mà xài hết bà nội ơi!', quote: 'Ở đâu ra mà cho xài hết bà nội ơi!', context: 'Hết hồn tiền bay nhanh / cháy túi' },
  { id: 'chiphien_khongthamlam', persona: 'chiphien', label: 'Chị không phải người tham lam!', quote: 'Chị không phải là một con đàn bà tham lam đâu nha!', context: 'Thanh minh / tha bổng rộng lượng' },
  { id: 'chiphien_xuitaotai', persona: 'chiphien', label: 'Đừng đổ lỗi cho xui là tại tôi!', quote: 'Đừng đổ lỗi cho xui là tại tôi nha!', context: 'Đoán sai / thua xui / thanh minh' },

  // Hỗ trợ Game cốt lõi (10)
  { id: 'batan_noroi', persona: 'game_fx', label: 'Bà Tân: Chạy đi các cháu ơi nổ rồi!', quote: 'Chạy đi các cháu ơi nổ rồi!', context: 'Đặt bom nổ / Bom Chữ' },
  { id: 'tienbip_cainit', persona: 'game_fx', label: 'Tiến Bịp: Còn đúng cái nịt!', quote: 'Còn đúng cái nịt thôi!', context: 'Thua -2.000 Ruby / ví âm' },
  { id: 'sena_donate', persona: 'game_fx', label: 'Sena: Nạp donate cho tao!', quote: 'Thằng nào có tiền nạp vào donate cho tao!', context: 'Tặng quà / xin donate' },
  { id: 'vn_toicongchuyen', persona: 'game_fx', label: 'Rồi rồi tới công chuyện rồi!', quote: 'Rồi rồi tới công chuyện rồi!', context: 'Bắt đầu bỏ phiếu / kèo căng' },
  { id: 'vn_batngochua', persona: 'game_fx', label: 'Bất ngờ chưa bà già?!', quote: 'Bất ngờ chưa bà già?!', context: 'Phản đòn / đổi chiều thế trận' },
  { id: 'vn_vinhbietcu', persona: 'game_fx', label: 'Xin vĩnh biệt cụ!', quote: 'Xin vĩnh biệt cụ!', context: 'Bay màu / loại khỏi ván' },
  { id: 'vn_hettien', persona: 'game_fx', label: 'Úi trời đất ơi tui hết tiền rồi!', quote: 'Bạn biết gì chưa? Tui hết tiền rồi!', context: 'Tài khoản Ruby xuống âm' },
  { id: 'vn_fartmic', persona: 'game_fx', label: 'Đánh rắm vô mic vang dội', quote: 'Prruuuuttt!!', context: 'Skill troll xì hơi' },
  { id: 'vn_vineboom', persona: 'game_fx', label: 'Vine Boom (Sốc toàn tập)', quote: 'BÙM!!', context: 'Chốt hạ / nổ / lật bài bất ngờ' },
  { id: 'vn_amongus', persona: 'game_fx', label: 'Among Us Role Reveal', quote: 'Shhh… Có Gián Điệp!', context: 'Mở màn kịch tính' },
];

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
  | 'chat_hype';

export const ACTION_POOL_META: readonly { key: MemePoolKey; label: string; desc: string }[] = [
  { key: 'welcome', label: 'Vào phòng / Khai cuộc', desc: 'Khi vào phòng, bắt đầu ván mới hoặc đổi lượt vẽ/chọn từ' },
  { key: 'turn_move', label: 'Ra đòn / Tới lượt / Lắc xí ngầu', desc: 'Gõ chữ, chọn đáp án, lắc Bầu Cua/Tỷ Phú, đổi lượt' },
  { key: 'correct', label: 'Đoán đúng / Ghi điểm', desc: 'Đoán đúng từ Vẽ & Đoán, Đố Vui đúng, dò số chuẩn' },
  { key: 'wrong', label: 'Đoán trật / Sai luật / Bó tay', desc: 'Nhập từ sai, đoán trật đáp án hoặc hết giờ' },
  { key: 'win', label: 'Chiến thắng / Ăn lớn', desc: 'Thắng ván đấu, cộng +2.000 Ruby hoặc ăn đậm' },
  { key: 'lose', label: 'Thua ván / Ngậm ngùi', desc: 'Thua cuộc, hụt giải nhất hoặc mất cược' },
  { key: 'money', label: 'Đặt cược / Lụm tiền / Ruby', desc: 'Rải chip, thu tiền thuê đất, giao dịch trong ván' },
  { key: 'broke', label: 'Cháy túi / Âm Ruby', desc: 'Ví tụt âm hoặc nộp phạt nặng sạch túi' },
  { key: 'gift', label: 'Tặng quà / Nhận 70% Ruby', desc: 'Gửi & nhận quà Ruby / thả tim giữa người chơi' },
  { key: 'troll', label: 'Cà khịa / Tung Skill / Chọc phá', desc: 'Đòn đánh, xì hơi, +2/+4 UNO, dán biệt danh, chọc nhau' },
  { key: 'vote', label: 'Bỏ phiếu / Tố cáo', desc: 'Gọi vote loại người chơi hoặc nghi ngờ Sói / Gián Điệp' },
  { key: 'defense', label: 'Biện minh / Chối tội', desc: 'Pha tự bào chữa, giả nai, xin đừng vote' },
  { key: 'forgive', label: 'Tha bổng / Hòa giải', desc: 'Chọn tha bổng cho bị cáo đi tiếp thêm vòng' },
  { key: 'eliminated', label: 'Bị loại / Vào tù / K.O.', desc: 'Bay màu khỏi ván đấu, vào ô Tù hoặc gục ngã' },
  { key: 'twist', label: 'Lật kèo / Phản đòn bất ngờ', desc: 'Gián điệp đoán ngược, đảo chiều UNO, lật bài chốt hạ' },
  { key: 'bomb', label: 'Nổ bom / Chấn động', desc: 'Bom nổ trong Bom Chữ, Đặt Bom Tử Chiến, địa chấn' },
  { key: 'bite', label: 'Cá sấu đớp / Quái tấn công', desc: 'Nhấn trúng răng sâu, bị đớp hoặc quái chạm người' },
  { key: 'shock', label: 'Sốc toàn tập / Đêm kịch tính', desc: 'Bắt đầu đêm Ma Sói, lộ thân phận hoặc kết quả gây sốc' },
  { key: 'chat_hype', label: 'Chat / Hối lượt / Tấu hài', desc: 'Thảo luận rôm rả, hối đối thủ, thả biểu cảm' },
];

export const MEME_POOLS: Record<MemePoolKey, readonly MemeId[]> = {
  welcome: [
    'linda_chao', 'linda_xinchao_mn', 'linda_trolai', 'linda_buoitoivuive', 'linda_emquaday',
    'linda_toasang', 'coba_muonchoi', 'coba_buoccungchan', 'coba_choitangoc', 'coba_dethuong',
    'minhhieu_khoe', 'phuonghang_lamchu', 'chiphien_hoahau', 'chiphien_chitoitiec',
  ],
  turn_move: [
    'linda_chicho', 'linda_emquaday', 'linda_zo', 'linda_xuongnuiquay',
    'minhhieu_duongquyen', 'minhhieu_tiendohay', 'minhhieu_chotdon', 'minhhieu_lubu',
    'phuonghang_lamchu', 'phuonghang_dunglacham', 'phuonghang_chuabaogiobochay', 'phuonghang_lammoico',
    'phuonghang_tubitritue', 'coba_totote', 'coba_choitangoc', 'coba_quatbatieu',
    'coba_muonchoi', 'chiphien_nhinchidi', 'chiphien_xinhdep', 'chiphien_dequahe',
  ],
  correct: [
    'minhhieu_tinhlai', 'minhhieu_chotdon', 'minhhieu_tiendohay',
    'linda_dangcap', 'linda_ngonquaha', 'linda_zo', 'linda_toasang',
    'coba_futani', 'coba_dethuong', 'coba_khovang',
    'phuonghang_chanly', 'phuonghang_suthat', 'phuonghang_kimcuong', 'phuonghang_lammoico',
    'phuonghang_tubitritue', 'chiphien_bonghong', 'chiphien_dequahe', 'chiphien_xinhdep',
    'chiphien_capdoimanh', 'chiphien_khongvon',
  ],
  wrong: [
    'linda_que', 'linda_jzma', 'linda_airanh', 'linda_botkhung', 'linda_oijztroi', 'linda_ecaijztroi',
    'coba_batphelon', 'coba_dinhphen', 'coba_aotuongsucmanh', 'coba_thoithoi', 'coba_nhinquancanh',
    'minhhieu_hoihan', 'minhhieu_conquyxao', 'minhhieu_cadonhuquy',
    'phuonghang_aidungaisai', 'phuonghang_haoquang', 'phuonghang_khonhon',
    'chiphien_loilam', 'chiphien_kholam', 'chiphien_vonghiem', 'chiphien_xuitaotai',
  ],
  win: [
    'linda_dangcap', 'linda_zo', 'linda_ngonqua', 'linda_ngonquaha', 'linda_toasang', 'linda_cuoi',
    'coba_khovang', 'coba_totote', 'coba_futani', 'coba_dethuong',
    'minhhieu_matphoiphoi', 'minhhieu_tiendohay', 'minhhieu_tiendomat',
    'phuonghang_motminhtao', 'phuonghang_thanhcong', 'phuonghang_kimcuong', 'phuonghang_50tuoi',
    'chiphien_khongvon', 'chiphien_bonghong', 'chiphien_capdoimanh', 'chiphien_xinhdep', 'chiphien_dequahe',
  ],
  lose: [
    'linda_que', 'linda_oijztroi', 'linda_jzma', 'linda_cuutoibacon', 'linda_meoicuucon',
    'coba_thoithoi', 'coba_giadinhtannat',
    'minhhieu_hoihan', 'minhhieu_muonkhoc', 'minhhieu_rotmuocmat', 'minhhieu_khongaimua',
    'phuonghang_divang', 'phuonghang_haoquang', 'phuonghang_quantutrathu',
    'chiphien_aiepmay', 'chiphien_loilam', 'chiphien_vonghiem', 'chiphien_xuitaotai', 'tienbip_cainit',
  ],
  money: [
    'minhhieu_tiendo_quat', 'minhhieu_matphoiphoi', 'minhhieu_tiendomat', 'minhhieu_nganruoido',
    'minhhieu_1000do', 'minhhieu_tientuoi', 'minhhieu_10trieu', 'minhhieu_tienchicho',
    'minhhieu_lubu', 'minhhieu_canvang', 'minhhieu_laytienche',
    'coba_futani', 'coba_phenguoigiau', 'coba_khovang',
    'phuonghang_kimcuong', 'phuonghang_tienphuongtien', 'phuonghang_thanhcong',
    'chiphien_khongvon', 'chiphien_30ty', 'chiphien_villa', 'chiphien_taisancuachi', 'chiphien_odaumaxai',
    'linda_ngonqua',
  ],
  broke: [
    'tienbip_cainit', 'vn_hettien', 'sena_donate',
    'minhhieu_muonkhoc', 'minhhieu_rotmuocmat', 'minhhieu_canvang', 'minhhieu_hoihan', 'minhhieu_khongaimua',
    'chiphien_30ty', 'chiphien_aiepmay', 'chiphien_odaumaxai',
    'coba_giadinhtannat', 'linda_cuutui', 'phuonghang_luadao',
  ],
  gift: [
    'linda_thatim', 'linda_ngonqua', 'linda_ngonquaha',
    'coba_futani', 'coba_dethuong', 'coba_khovang',
    'minhhieu_maccuoi', 'minhhieu_tienchicho', 'minhhieu_10trieu', 'minhhieu_1000do', 'minhhieu_khoe',
    'phuonghang_kimcuong',
    'chiphien_miengdat', 'chiphien_villa', 'chiphien_taisancuachi', 'sena_donate',
  ],
  troll: [
    'linda_level', 'linda_botkhung', 'linda_cuoi', 'linda_maccuoi', 'linda_chuyencuatao',
    'linda_chanhnha', 'linda_airanh', 'linda_duathoi', 'linda_xuongnuiquay', 'linda_moimocra',
    'coba_quatbatieu', 'coba_totote', 'coba_luocmay', 'coba_dunggionmat', 'coba_dinhphen',
    'coba_aotuongsucmanh', 'coba_nhinquancanh',
    'minhhieu_duongquyen', 'minhhieu_conquyxao', 'minhhieu_cadonhuquy',
    'phuonghang_dunglacham', 'phuonghang_khonhon', 'phuonghang_50tuoi', 'phuonghang_quantutrathu',
    'phuonghang_tuongvay', 'chiphien_kemay', 'chiphien_nhinmaylaidi', 'chiphien_nhinchidi',
    'chiphien_xinloi', 'vn_fartmic',
  ],
  vote: [
    'vn_toicongchuyen', 'vn_amongus', 'linda_chuyencuatao', 'linda_botkhung', 'linda_moimocra',
    'coba_giangho', 'coba_batphelon', 'coba_ngaychon', 'coba_dungdongkich', 'coba_dunglaigia',
    'minhhieu_conquyxao', 'minhhieu_chotdon',
    'phuonghang_dungdien', 'phuonghang_anhhung', 'phuonghang_luadao', 'phuonghang_aidungaisai',
    'phuonghang_voquytday', 'chiphien_kholam', 'chiphien_xinloi',
  ],
  defense: [
    'linda_hongnho', 'linda_10lay', 'linda_thaloi', 'linda_duathoi',
    'coba_xinloianh', 'coba_giadinhtannat', 'coba_mayimtaotha',
    'minhhieu_soqua', 'minhhieu_laytienche',
    'phuonghang_trongcuoc', 'phuonghang_thayvay', 'phuonghang_suthat',
    'phuonghang_chuabaogiobochay', 'phuonghang_aidungaisai',
    'chiphien_xinloi', 'chiphien_khongthamlam', 'chiphien_xuitaotai', 'chiphien_kemay',
  ],
  forgive: [
    'coba_thathu', 'coba_mayimtaotha', 'coba_tamgietubi', 'coba_buoccungchan', 'coba_xinloianh',
    'linda_thaloi', 'linda_duathoi', 'linda_10lay',
    'phuonghang_tubitritue', 'phuonghang_trongcuoc', 'chiphien_khongthamlam',
  ],
  eliminated: [
    'vn_vinhbietcu', 'linda_que', 'linda_achetchi', 'linda_banoi',
    'coba_votungoi', 'coba_ngaychon', 'coba_luocmay', 'coba_dunggionmat',
    'minhhieu_muonkhoc', 'minhhieu_rotmuocmat', 'minhhieu_cuutoi',
    'phuonghang_dosup', 'phuonghang_divang', 'phuonghang_voquytday',
    'chiphien_dingu', 'chiphien_aiepmay', 'chiphien_metlamroi',
  ],
  twist: [
    'vn_batngochua', 'vn_vineboom', 'minhhieu_tinhlai', 'minhhieu_laytienche', 'minhhieu_duongquyen',
    'linda_omc', 'linda_caigizay', 'linda_emquaday', 'linda_moimocra',
    'coba_mayimtaotha', 'coba_thathu', 'coba_dunglaigia', 'coba_dungdongkich',
    'phuonghang_ngongang', 'phuonghang_tuongvay', 'phuonghang_thayvay',
    'phuonghang_voquytday', 'phuonghang_quantutrathu',
  ],
  bomb: [
    'batan_noroi', 'vn_vineboom',
    'linda_cuutui', 'linda_cuutoibacon', 'linda_meoicuucon', 'linda_banoi', 'linda_achetchi', 'linda_oijztroi',
    'coba_thoithoi', 'coba_ngaychon',
    'minhhieu_cuutoi', 'minhhieu_soqua', 'minhhieu_hoihan',
    'phuonghang_dosup', 'phuonghang_nguyhiem', 'chiphien_metlamroi',
  ],
  bite: [
    'linda_cuutui', 'linda_cuutoibacon', 'linda_meoicuucon', 'linda_achetchi',
    'linda_banoi', 'linda_jzma', 'linda_ecaijztroi',
    'coba_thoithoi', 'coba_votungoi',
    'minhhieu_cuutoi', 'minhhieu_soqua', 'minhhieu_muonkhoc',
    'phuonghang_nguyhiem', 'chiphien_metlamroi',
  ],
  shock: [
    'vn_amongus', 'vn_vineboom',
    'linda_banoi', 'linda_omc', 'linda_caigizay', 'linda_jzma', 'linda_ecaijztroi', 'linda_oijztroi',
    'coba_batphelon', 'coba_dunggionmat', 'coba_dunglaigia',
    'minhhieu_tinhlai', 'minhhieu_soqua',
    'phuonghang_ngongang', 'phuonghang_tinhhinh', 'phuonghang_nguyhiem', 'phuonghang_thayvay',
    'phuonghang_tuongvay', 'phuonghang_anhhung', 'phuonghang_divang', 'phuonghang_luadao', 'phuonghang_dosup',
    'chiphien_maydien', 'chiphien_vonghiem', 'chiphien_odaumaxai',
  ],
  chat_hype: [
    'linda_chicho', 'linda_maccuoi', 'linda_cuoi', 'linda_uongnuocmia', 'linda_toalet',
    'linda_chanhnha', 'linda_level', 'linda_airanh', 'linda_buoitoivuive',
    'minhhieu_maccuoi', 'minhhieu_lubu', 'minhhieu_tiendo_quat', 'minhhieu_cadonhuquy',
    'phuonghang_nhieuchuyen', 'phuonghang_trongcuoc', 'phuonghang_haoquang',
    'phuonghang_tinhhinh', 'phuonghang_khonhon', 'phuonghang_50tuoi',
    'chiphien_maydien', 'chiphien_nhinmaylaidi', 'chiphien_kemay', 'chiphien_chitoitiec',
    'coba_giangho', 'coba_buoccungchan', 'coba_phenguoigiau', 'coba_dinhphen',
  ],
};

/** Toàn bộ 153 ID meme hợp lệ để phát xoay vòng ngẫu nhiên toàn cục không lặp. */
export const ALL_MEME_IDS: readonly MemeId[] = MEME_LIST.map((m) => m.id);

/** Nhạc nền xoay vòng 6 bài chỉ phát khi đang ở phòng chờ (lobby), tắt khi vào ván chơi. */
export function shouldPlayBgm(room: RoomState | null): boolean {
  return room?.phase === 'lobby';
}
