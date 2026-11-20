import type { RoomState, VoicePersonaId } from '../../shared/src/types';
import type { AvataaarsOpts } from './avatars';
import { buildMemePools } from './memeMoods';

export type MemePersona = VoicePersonaId | 'game_fx';

export type BgmId =
  | 'bgm_sing_linda_cafe'
  | 'bgm_sing_coba_cailuong'
  | 'bgm_sing_duet_cailuong'
  | 'bgm_sing_phuonghang_t30'
  | 'bgm_sing_phuonghang_bolero'
  | 'bgm_sing_allstars_7rings';

export type MemeId =
  // Cô Linda / Cẩm Lan Sục (30)
  | 'linda_airanh'
  | 'linda_ancutheo'
  | 'linda_banoi'
  | 'linda_botkhung'
  | 'linda_buoitoivuive'
  | 'linda_chao'
  | 'linda_chicho'
  | 'linda_chodegiatao'
  | 'linda_cuutoibacon'
  | 'linda_dangcap'
  | 'linda_dohamcau'
  | 'linda_ecaijztroi'
  | 'linda_emquaday'
  | 'linda_hongnho'
  | 'linda_iaxochon'
  | 'linda_khongchameday'
  | 'linda_khungdiensuunhi'
  | 'linda_level'
  | 'linda_maccuoi'
  | 'linda_meoicuucon'
  | 'linda_moimocra'
  | 'linda_namdauquay'
  | 'linda_quanquedo_ban'
  | 'linda_que'
  | 'linda_retienthem'
  | 'linda_thaloi'
  | 'linda_toasang'
  | 'linda_trolai'
  | 'linda_uongnuocmia'
  | 'linda_xuongnuiquay'
  // Cô Minh Hiếu (24)
  | 'minhhieu_1000do'
  | 'minhhieu_10trieu'
  | 'minhhieu_cadonhuquy'
  | 'minhhieu_camtiendo_dq'
  | 'minhhieu_conquyxao'
  | 'minhhieu_cuutoi'
  | 'minhhieu_duongquyen'
  | 'minhhieu_hoihan'
  | 'minhhieu_khoe'
  | 'minhhieu_khungthichet'
  | 'minhhieu_laytienche'
  | 'minhhieu_lubu'
  | 'minhhieu_maccuoi'
  | 'minhhieu_matphoiphoi'
  | 'minhhieu_muonkhoc'
  | 'minhhieu_nganruoido'
  | 'minhhieu_rotmuocmat'
  | 'minhhieu_soqua'
  | 'minhhieu_tienchicho'
  | 'minhhieu_tiendo_quat'
  | 'minhhieu_tiendohay'
  | 'minhhieu_tiendomat'
  | 'minhhieu_tientuoi'
  | 'minhhieu_tinhlai'
  // Cô Phương Hằng (29)
  | 'phuonghang_50tuoi'
  | 'phuonghang_cangchuicangdien'
  | 'phuonghang_chanhcho_ngu'
  | 'phuonghang_chanly'
  | 'phuonghang_chomochui'
  | 'phuonghang_chuabaogiobochay'
  | 'phuonghang_connguo_nao'
  | 'phuonghang_dosup'
  | 'phuonghang_dungdien'
  | 'phuonghang_dunglacham'
  | 'phuonghang_haoquang'
  | 'phuonghang_khonhon'
  | 'phuonghang_kimcuong'
  | 'phuonghang_laokhongduoc'
  | 'phuonghang_laymayxuithem'
  | 'phuonghang_luadao'
  | 'phuonghang_motminhtao'
  | 'phuonghang_ngongang'
  | 'phuonghang_nguyhiem'
  | 'phuonghang_quantutrathu'
  | 'phuonghang_taophaimatday'
  | 'phuonghang_thanhcong'
  | 'phuonghang_thayvay'
  | 'phuonghang_tienphuongtien'
  | 'phuonghang_tinhhinh'
  | 'phuonghang_trongcuoc'
  | 'phuonghang_tubitritue'
  | 'phuonghang_tuongvay'
  | 'phuonghang_voquytday'
  // Chị Phiến (29)
  | 'chiphien_30ty'
  | 'chiphien_aiepmay'
  | 'chiphien_bonghong'
  | 'chiphien_capdoimanh'
  | 'chiphien_chinhquyenbat'
  | 'chiphien_chitoitiec'
  | 'chiphien_depxuatsac'
  | 'chiphien_dingu'
  | 'chiphien_hoahau'
  | 'chiphien_hoahauphukhoa'
  | 'chiphien_ke_trithuc_do'
  | 'chiphien_kemay'
  | 'chiphien_kholam'
  | 'chiphien_khongbannua_chet'
  | 'chiphien_khongvon'
  | 'chiphien_khonlamkeme'
  | 'chiphien_lendonchet'
  | 'chiphien_loilam'
  | 'chiphien_maydien'
  | 'chiphien_metlamroi'
  | 'chiphien_miengdat'
  | 'chiphien_nhinchidi'
  | 'chiphien_odaumaxai'
  | 'chiphien_sochongboss'
  | 'chiphien_taisancuachi'
  | 'chiphien_taividepqua'
  | 'chiphien_villa'
  | 'chiphien_xetda8cai'
  | 'chiphien_xinhdep'
  // Cô Ba Vàng Ngọc (29)
  | 'coba_banchetroi'
  | 'coba_batphelon'
  | 'coba_baxaobala'
  | 'coba_bebe'
  | 'coba_buoccungchan'
  | 'coba_chaygiet'
  | 'coba_chedauchetme'
  | 'coba_chitaimaychet'
  | 'coba_damnha'
  | 'coba_dethuong'
  | 'coba_futani'
  | 'coba_giadinhtannat'
  | 'coba_giangho'
  | 'coba_khongguitien'
  | 'coba_luchongheo'
  | 'coba_luocmay'
  | 'coba_mayimtaotha'
  | 'coba_maylamenothienha'
  | 'coba_minhhieu_chui'
  | 'coba_muonchoi'
  | 'coba_ngaychon'
  | 'coba_nhinquancanh'
  | 'coba_phenguoigiau'
  | 'coba_quatbatieu'
  | 'coba_saucannha'
  | 'coba_thuamaythuan'
  | 'coba_totote'
  | 'coba_trinhphen'
  | 'coba_votungoi'
  // Hoa hậu Kỳ Duyên (16)
  | 'kyduyen_amanh'
  | 'kyduyen_chacchanloai'
  | 'kyduyen_dubanlinh'
  | 'kyduyen_giacmohong'
  | 'kyduyen_giamapluc'
  | 'kyduyen_karen_danong'
  | 'kyduyen_khonghoitiec'
  | 'kyduyen_khongmakesure'
  | 'kyduyen_loingonngot'
  | 'kyduyen_nguhaitieng'
  | 'kyduyen_nongsau_lanh'
  | 'kyduyen_thanhtuu'
  | 'kyduyen_thigio_giacmo'
  | 'kyduyen_tinchinhminh'
  | 'kyduyen_tuconsoam'
  | 'kyduyen_vuotquakhokhan'
  // Hỗ trợ Game (8)
  | 'tienbip_cainit'
  | 'vn_amongus'
  | 'vn_batngochua'
  | 'vn_fartmic'
  | 'vn_hettien'
  | 'vn_toicongchuyen'
  | 'vn_vineboom'
  | 'vn_vinhbietcu';

export const BGM_ASSETS: Record<BgmId, number> = {
  bgm_sing_linda_cafe: require('../assets/audio/bgm/bgm_sing_linda_cafe.mp3'),
  bgm_sing_coba_cailuong: require('../assets/audio/bgm/bgm_sing_coba_cailuong.mp3'),
  bgm_sing_duet_cailuong: require('../assets/audio/bgm/bgm_sing_duet_cailuong.mp3'),
  bgm_sing_phuonghang_t30: require('../assets/audio/bgm/bgm_sing_phuonghang_t30.mp3'),
  bgm_sing_phuonghang_bolero: require('../assets/audio/bgm/bgm_sing_phuonghang_bolero.mp3'),
  bgm_sing_allstars_7rings: require('../assets/audio/bgm/bgm_sing_allstars_7rings.mp3'),
};

export const MEME_ASSETS: Record<MemeId, number> = {
  // Cô Linda / Cẩm Lan Sục (30)
  linda_airanh: require('../assets/audio/memes/linda_airanh.mp3'),
  linda_ancutheo: require('../assets/audio/memes/linda_ancutheo.mp3'),
  linda_banoi: require('../assets/audio/memes/linda_banoi.mp3'),
  linda_botkhung: require('../assets/audio/memes/linda_botkhung.mp3'),
  linda_buoitoivuive: require('../assets/audio/memes/linda_buoitoivuive.mp3'),
  linda_chao: require('../assets/audio/memes/linda_chao.mp3'),
  linda_chicho: require('../assets/audio/memes/linda_chicho.mp3'),
  linda_chodegiatao: require('../assets/audio/memes/linda_chodegiatao.mp3'),
  linda_cuutoibacon: require('../assets/audio/memes/linda_cuutoibacon.mp3'),
  linda_dangcap: require('../assets/audio/memes/linda_dangcap.mp3'),
  linda_dohamcau: require('../assets/audio/memes/linda_dohamcau.mp3'),
  linda_ecaijztroi: require('../assets/audio/memes/linda_ecaijztroi.mp3'),
  linda_emquaday: require('../assets/audio/memes/linda_emquaday.mp3'),
  linda_hongnho: require('../assets/audio/memes/linda_hongnho.mp3'),
  linda_iaxochon: require('../assets/audio/memes/linda_iaxochon.mp3'),
  linda_khongchameday: require('../assets/audio/memes/linda_khongchameday.mp3'),
  linda_khungdiensuunhi: require('../assets/audio/memes/linda_khungdiensuunhi.mp3'),
  linda_level: require('../assets/audio/memes/linda_level.mp3'),
  linda_maccuoi: require('../assets/audio/memes/linda_maccuoi.mp3'),
  linda_meoicuucon: require('../assets/audio/memes/linda_meoicuucon.mp3'),
  linda_moimocra: require('../assets/audio/memes/linda_moimocra.mp3'),
  linda_namdauquay: require('../assets/audio/memes/linda_namdauquay.mp3'),
  linda_quanquedo_ban: require('../assets/audio/memes/linda_quanquedo_ban.mp3'),
  linda_que: require('../assets/audio/memes/linda_que.mp3'),
  linda_retienthem: require('../assets/audio/memes/linda_retienthem.mp3'),
  linda_thaloi: require('../assets/audio/memes/linda_thaloi.mp3'),
  linda_toasang: require('../assets/audio/memes/linda_toasang.mp3'),
  linda_trolai: require('../assets/audio/memes/linda_trolai.mp3'),
  linda_uongnuocmia: require('../assets/audio/memes/linda_uongnuocmia.mp3'),
  linda_xuongnuiquay: require('../assets/audio/memes/linda_xuongnuiquay.mp3'),
  // Cô Minh Hiếu (24)
  minhhieu_1000do: require('../assets/audio/memes/minhhieu_1000do.mp3'),
  minhhieu_10trieu: require('../assets/audio/memes/minhhieu_10trieu.mp3'),
  minhhieu_cadonhuquy: require('../assets/audio/memes/minhhieu_cadonhuquy.mp3'),
  minhhieu_camtiendo_dq: require('../assets/audio/memes/minhhieu_camtiendo_dq.mp3'),
  minhhieu_conquyxao: require('../assets/audio/memes/minhhieu_conquyxao.mp3'),
  minhhieu_cuutoi: require('../assets/audio/memes/minhhieu_cuutoi.mp3'),
  minhhieu_duongquyen: require('../assets/audio/memes/minhhieu_duongquyen.mp3'),
  minhhieu_hoihan: require('../assets/audio/memes/minhhieu_hoihan.mp3'),
  minhhieu_khoe: require('../assets/audio/memes/minhhieu_khoe.mp3'),
  minhhieu_khungthichet: require('../assets/audio/memes/minhhieu_khungthichet.mp3'),
  minhhieu_laytienche: require('../assets/audio/memes/minhhieu_laytienche.mp3'),
  minhhieu_lubu: require('../assets/audio/memes/minhhieu_lubu.mp3'),
  minhhieu_maccuoi: require('../assets/audio/memes/minhhieu_maccuoi.mp3'),
  minhhieu_matphoiphoi: require('../assets/audio/memes/minhhieu_matphoiphoi.mp3'),
  minhhieu_muonkhoc: require('../assets/audio/memes/minhhieu_muonkhoc.mp3'),
  minhhieu_nganruoido: require('../assets/audio/memes/minhhieu_nganruoido.mp3'),
  minhhieu_rotmuocmat: require('../assets/audio/memes/minhhieu_rotmuocmat.mp3'),
  minhhieu_soqua: require('../assets/audio/memes/minhhieu_soqua.mp3'),
  minhhieu_tienchicho: require('../assets/audio/memes/minhhieu_tienchicho.mp3'),
  minhhieu_tiendo_quat: require('../assets/audio/memes/minhhieu_tiendo_quat.mp3'),
  minhhieu_tiendohay: require('../assets/audio/memes/minhhieu_tiendohay.mp3'),
  minhhieu_tiendomat: require('../assets/audio/memes/minhhieu_tiendomat.mp3'),
  minhhieu_tientuoi: require('../assets/audio/memes/minhhieu_tientuoi.mp3'),
  minhhieu_tinhlai: require('../assets/audio/memes/minhhieu_tinhlai.mp3'),
  // Cô Phương Hằng (29)
  phuonghang_50tuoi: require('../assets/audio/memes/phuonghang_50tuoi.mp3'),
  phuonghang_cangchuicangdien: require('../assets/audio/memes/phuonghang_cangchuicangdien.mp3'),
  phuonghang_chanhcho_ngu: require('../assets/audio/memes/phuonghang_chanhcho_ngu.mp3'),
  phuonghang_chanly: require('../assets/audio/memes/phuonghang_chanly.mp3'),
  phuonghang_chomochui: require('../assets/audio/memes/phuonghang_chomochui.mp3'),
  phuonghang_chuabaogiobochay: require('../assets/audio/memes/phuonghang_chuabaogiobochay.mp3'),
  phuonghang_connguo_nao: require('../assets/audio/memes/phuonghang_connguo_nao.mp3'),
  phuonghang_dosup: require('../assets/audio/memes/phuonghang_dosup.mp3'),
  phuonghang_dungdien: require('../assets/audio/memes/phuonghang_dungdien.mp3'),
  phuonghang_dunglacham: require('../assets/audio/memes/phuonghang_dunglacham.mp3'),
  phuonghang_haoquang: require('../assets/audio/memes/phuonghang_haoquang.mp3'),
  phuonghang_khonhon: require('../assets/audio/memes/phuonghang_khonhon.mp3'),
  phuonghang_kimcuong: require('../assets/audio/memes/phuonghang_kimcuong.mp3'),
  phuonghang_laokhongduoc: require('../assets/audio/memes/phuonghang_laokhongduoc.mp3'),
  phuonghang_laymayxuithem: require('../assets/audio/memes/phuonghang_laymayxuithem.mp3'),
  phuonghang_luadao: require('../assets/audio/memes/phuonghang_luadao.mp3'),
  phuonghang_motminhtao: require('../assets/audio/memes/phuonghang_motminhtao.mp3'),
  phuonghang_ngongang: require('../assets/audio/memes/phuonghang_ngongang.mp3'),
  phuonghang_nguyhiem: require('../assets/audio/memes/phuonghang_nguyhiem.mp3'),
  phuonghang_quantutrathu: require('../assets/audio/memes/phuonghang_quantutrathu.mp3'),
  phuonghang_taophaimatday: require('../assets/audio/memes/phuonghang_taophaimatday.mp3'),
  phuonghang_thanhcong: require('../assets/audio/memes/phuonghang_thanhcong.mp3'),
  phuonghang_thayvay: require('../assets/audio/memes/phuonghang_thayvay.mp3'),
  phuonghang_tienphuongtien: require('../assets/audio/memes/phuonghang_tienphuongtien.mp3'),
  phuonghang_tinhhinh: require('../assets/audio/memes/phuonghang_tinhhinh.mp3'),
  phuonghang_trongcuoc: require('../assets/audio/memes/phuonghang_trongcuoc.mp3'),
  phuonghang_tubitritue: require('../assets/audio/memes/phuonghang_tubitritue.mp3'),
  phuonghang_tuongvay: require('../assets/audio/memes/phuonghang_tuongvay.mp3'),
  phuonghang_voquytday: require('../assets/audio/memes/phuonghang_voquytday.mp3'),
  // Chị Phiến (29)
  chiphien_30ty: require('../assets/audio/memes/chiphien_30ty.mp3'),
  chiphien_aiepmay: require('../assets/audio/memes/chiphien_aiepmay.mp3'),
  chiphien_bonghong: require('../assets/audio/memes/chiphien_bonghong.mp3'),
  chiphien_capdoimanh: require('../assets/audio/memes/chiphien_capdoimanh.mp3'),
  chiphien_chinhquyenbat: require('../assets/audio/memes/chiphien_chinhquyenbat.mp3'),
  chiphien_chitoitiec: require('../assets/audio/memes/chiphien_chitoitiec.mp3'),
  chiphien_depxuatsac: require('../assets/audio/memes/chiphien_depxuatsac.mp3'),
  chiphien_dingu: require('../assets/audio/memes/chiphien_dingu.mp3'),
  chiphien_hoahau: require('../assets/audio/memes/chiphien_hoahau.mp3'),
  chiphien_hoahauphukhoa: require('../assets/audio/memes/chiphien_hoahauphukhoa.mp3'),
  chiphien_ke_trithuc_do: require('../assets/audio/memes/chiphien_ke_trithuc_do.mp3'),
  chiphien_kemay: require('../assets/audio/memes/chiphien_kemay.mp3'),
  chiphien_kholam: require('../assets/audio/memes/chiphien_kholam.mp3'),
  chiphien_khongbannua_chet: require('../assets/audio/memes/chiphien_khongbannua_chet.mp3'),
  chiphien_khongvon: require('../assets/audio/memes/chiphien_khongvon.mp3'),
  chiphien_khonlamkeme: require('../assets/audio/memes/chiphien_khonlamkeme.mp3'),
  chiphien_lendonchet: require('../assets/audio/memes/chiphien_lendonchet.mp3'),
  chiphien_loilam: require('../assets/audio/memes/chiphien_loilam.mp3'),
  chiphien_maydien: require('../assets/audio/memes/chiphien_maydien.mp3'),
  chiphien_metlamroi: require('../assets/audio/memes/chiphien_metlamroi.mp3'),
  chiphien_miengdat: require('../assets/audio/memes/chiphien_miengdat.mp3'),
  chiphien_nhinchidi: require('../assets/audio/memes/chiphien_nhinchidi.mp3'),
  chiphien_odaumaxai: require('../assets/audio/memes/chiphien_odaumaxai.mp3'),
  chiphien_sochongboss: require('../assets/audio/memes/chiphien_sochongboss.mp3'),
  chiphien_taisancuachi: require('../assets/audio/memes/chiphien_taisancuachi.mp3'),
  chiphien_taividepqua: require('../assets/audio/memes/chiphien_taividepqua.mp3'),
  chiphien_villa: require('../assets/audio/memes/chiphien_villa.mp3'),
  chiphien_xetda8cai: require('../assets/audio/memes/chiphien_xetda8cai.mp3'),
  chiphien_xinhdep: require('../assets/audio/memes/chiphien_xinhdep.mp3'),
  // Cô Ba Vàng Ngọc (29)
  coba_banchetroi: require('../assets/audio/memes/coba_banchetroi.mp3'),
  coba_batphelon: require('../assets/audio/memes/coba_batphelon.mp3'),
  coba_baxaobala: require('../assets/audio/memes/coba_baxaobala.mp3'),
  coba_bebe: require('../assets/audio/memes/coba_bebe.mp3'),
  coba_buoccungchan: require('../assets/audio/memes/coba_buoccungchan.mp3'),
  coba_chaygiet: require('../assets/audio/memes/coba_chaygiet.mp3'),
  coba_chedauchetme: require('../assets/audio/memes/coba_chedauchetme.mp3'),
  coba_chitaimaychet: require('../assets/audio/memes/coba_chitaimaychet.mp3'),
  coba_damnha: require('../assets/audio/memes/coba_damnha.mp3'),
  coba_dethuong: require('../assets/audio/memes/coba_dethuong.mp3'),
  coba_futani: require('../assets/audio/memes/coba_futani.mp3'),
  coba_giadinhtannat: require('../assets/audio/memes/coba_giadinhtannat.mp3'),
  coba_giangho: require('../assets/audio/memes/coba_giangho.mp3'),
  coba_khongguitien: require('../assets/audio/memes/coba_khongguitien.mp3'),
  coba_luchongheo: require('../assets/audio/memes/coba_luchongheo.mp3'),
  coba_luocmay: require('../assets/audio/memes/coba_luocmay.mp3'),
  coba_mayimtaotha: require('../assets/audio/memes/coba_mayimtaotha.mp3'),
  coba_maylamenothienha: require('../assets/audio/memes/coba_maylamenothienha.mp3'),
  coba_minhhieu_chui: require('../assets/audio/memes/coba_minhhieu_chui.mp3'),
  coba_muonchoi: require('../assets/audio/memes/coba_muonchoi.mp3'),
  coba_ngaychon: require('../assets/audio/memes/coba_ngaychon.mp3'),
  coba_nhinquancanh: require('../assets/audio/memes/coba_nhinquancanh.mp3'),
  coba_phenguoigiau: require('../assets/audio/memes/coba_phenguoigiau.mp3'),
  coba_quatbatieu: require('../assets/audio/memes/coba_quatbatieu.mp3'),
  coba_saucannha: require('../assets/audio/memes/coba_saucannha.mp3'),
  coba_thuamaythuan: require('../assets/audio/memes/coba_thuamaythuan.mp3'),
  coba_totote: require('../assets/audio/memes/coba_totote.mp3'),
  coba_trinhphen: require('../assets/audio/memes/coba_trinhphen.mp3'),
  coba_votungoi: require('../assets/audio/memes/coba_votungoi.mp3'),
  // Hoa hậu Kỳ Duyên (16)
  kyduyen_amanh: require('../assets/audio/memes/kyduyen_amanh.mp3'),
  kyduyen_chacchanloai: require('../assets/audio/memes/kyduyen_chacchanloai.mp3'),
  kyduyen_dubanlinh: require('../assets/audio/memes/kyduyen_dubanlinh.mp3'),
  kyduyen_giacmohong: require('../assets/audio/memes/kyduyen_giacmohong.mp3'),
  kyduyen_giamapluc: require('../assets/audio/memes/kyduyen_giamapluc.mp3'),
  kyduyen_karen_danong: require('../assets/audio/memes/kyduyen_karen_danong.mp3'),
  kyduyen_khonghoitiec: require('../assets/audio/memes/kyduyen_khonghoitiec.mp3'),
  kyduyen_khongmakesure: require('../assets/audio/memes/kyduyen_khongmakesure.mp3'),
  kyduyen_loingonngot: require('../assets/audio/memes/kyduyen_loingonngot.mp3'),
  kyduyen_nguhaitieng: require('../assets/audio/memes/kyduyen_nguhaitieng.mp3'),
  kyduyen_nongsau_lanh: require('../assets/audio/memes/kyduyen_nongsau_lanh.mp3'),
  kyduyen_thanhtuu: require('../assets/audio/memes/kyduyen_thanhtuu.mp3'),
  kyduyen_thigio_giacmo: require('../assets/audio/memes/kyduyen_thigio_giacmo.mp3'),
  kyduyen_tinchinhminh: require('../assets/audio/memes/kyduyen_tinchinhminh.mp3'),
  kyduyen_tuconsoam: require('../assets/audio/memes/kyduyen_tuconsoam.mp3'),
  kyduyen_vuotquakhokhan: require('../assets/audio/memes/kyduyen_vuotquakhokhan.mp3'),
  // Hỗ trợ Game (8)
  tienbip_cainit: require('../assets/audio/memes/tienbip_cainit.mp3'),
  vn_amongus: require('../assets/audio/memes/vn_amongus.mp3'),
  vn_batngochua: require('../assets/audio/memes/vn_batngochua.mp3'),
  vn_fartmic: require('../assets/audio/memes/vn_fartmic.mp3'),
  vn_hettien: require('../assets/audio/memes/vn_hettien.mp3'),
  vn_toicongchuyen: require('../assets/audio/memes/vn_toicongchuyen.mp3'),
  vn_vineboom: require('../assets/audio/memes/vn_vineboom.mp3'),
  vn_vinhbietcu: require('../assets/audio/memes/vn_vinhbietcu.mp3'),
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

export interface VoicePersonaMeta {
  id: VoicePersonaId;
  name: string;
  shortName: string;
  tagline: string;
  accent: string;
  badgeBg: string;
  avatarOpts: AvataaarsOpts;
  previewIds: readonly MemeId[];
}

export const VOICE_PERSONA_META: Record<VoicePersonaId, VoicePersonaMeta> = {
  phuonghang: {
    id: 'phuonghang',
    name: 'Cô Phương Hằng',
    shortName: 'Cô Hằng',
    tagline: 'Bà trùm livestream khẩu chiến gắt nhất cõi mạng',
    accent: '#C026D3',
    badgeBg: '#FAF5FF',
    avatarOpts: {
      top: ['bigHair'],
      hairColor: ['2c1b18'],
      skinColor: ['f8d25c'],
      eyes: ['wink'],
      eyebrows: ['raisedExcitedNatural'],
      mouth: ['twinkle'],
      accessories: ['sunglasses'],
      accessoriesProbability: 100,
      clothing: ['blazerAndShirt'],
      clothesColor: ['9333ea'],
    },
    previewIds: ['phuonghang_motminhtao', 'phuonghang_taophaimatday', 'phuonghang_ngongang'],
  },
  linda: {
    id: 'linda',
    name: 'Cô Linda / Cẩm Lan Sục',
    shortName: 'Cô Linda',
    tagline: 'Chuyên gia chửi thề gắt và tán xéo háng',
    accent: '#E11D48',
    badgeBg: '#FFF1F2',
    avatarOpts: {
      top: ['straightAndStrand'],
      hairColor: ['b58143'],
      skinColor: ['ffdbb4'],
      eyes: ['winkWacky'],
      eyebrows: ['angryNatural'],
      mouth: ['screamOpen'],
      accessoriesProbability: 0,
      clothing: ['shirtScoopNeck'],
      clothesColor: ['e11d48'],
    },
    previewIds: ['linda_chao', 'linda_dangcap', 'linda_airanh'],
  },
  minhhieu: {
    id: 'minhhieu',
    name: 'Cô Minh Hiếu',
    shortName: 'Minh Hiếu',
    tagline: '7 miếng đất, cầm tiền đô đi đường quyền',
    accent: '#D97706',
    badgeBg: '#FFFBEB',
    avatarOpts: {
      top: ['longButNotTooLong'],
      hairColor: ['4a312c'],
      skinColor: ['edb98a'],
      eyes: ['happy'],
      eyebrows: ['raisedExcitedNatural'],
      mouth: ['smile'],
      accessoriesProbability: 0,
      clothing: ['collarAndSweater'],
      clothesColor: ['f59e0b'],
    },
    previewIds: ['minhhieu_tiendo_quat', 'minhhieu_tinhlai', 'minhhieu_1000do'],
  },
  coba: {
    id: 'coba',
    name: 'Cô Ba Vàng Ngọc',
    shortName: 'Cô Ba',
    tagline: 'Khẩu nghiệp miền Tây cực mạnh, tới tiệm chẻ đầu',
    accent: '#059669',
    badgeBg: '#ECFDF5',
    avatarOpts: {
      top: ['bun'],
      hairColor: ['2c1b18'],
      skinColor: ['d08b5b'],
      eyes: ['squint'],
      eyebrows: ['angryNatural'],
      mouth: ['grimace'],
      accessoriesProbability: 0,
      clothing: ['overall'],
      clothesColor: ['059669'],
    },
    previewIds: ['coba_chedauchetme', 'coba_giangho', 'coba_banchetroi'],
  },
  chiphien: {
    id: 'chiphien',
    name: 'Chị Phiến',
    shortName: 'Chị Phiến',
    tagline: 'Bán nước hoa tếu táo, xéo xắt mặn mòi',
    accent: '#EC4899',
    badgeBg: '#FDF2F8',
    avatarOpts: {
      top: ['miaWallace'],
      hairColor: ['724133'],
      skinColor: ['ffdbb4'],
      eyes: ['side'],
      eyebrows: ['upDownNatural'],
      mouth: ['tongue'],
      accessoriesProbability: 0,
      clothing: ['shirtVNeck'],
      clothesColor: ['ec4899'],
    },
    previewIds: ['chiphien_aiepmay', 'chiphien_30ty', 'chiphien_hoahauphukhoa'],
  },
  kyduyen: {
    id: 'kyduyen',
    name: 'Hoa hậu Kỳ Duyên',
    shortName: 'Kỳ Duyên',
    tagline: 'Miss Universe chinh chiến cực gắt, đủ bản lĩnh handle hết',
    accent: '#0284C7',
    badgeBg: '#F0F9FF',
    avatarOpts: {
      top: ['straight01'],
      hairColor: ['2c1b18'],
      skinColor: ['ffdbb4'],
      eyes: ['default'],
      eyebrows: ['defaultNatural'],
      mouth: ['twinkle'],
      accessoriesProbability: 0,
      clothing: ['blazerAndSweater'],
      clothesColor: ['0284c7'],
    },
    previewIds: ['kyduyen_karen_danong', 'kyduyen_chacchanloai', 'kyduyen_amanh'],
  },
};

export function getPersonaDisplay(persona: MemePersona): { name: string; shortName: string; accent: string; badgeBg: string } {
  if (persona === 'game_fx') {
    return { name: 'Hỗ trợ Game', shortName: 'Hiệu ứng', accent: '#64748B', badgeBg: '#F1F5F9' };
  }
  const m = VOICE_PERSONA_META[persona];
  return { name: m.name, shortName: m.shortName, accent: m.accent, badgeBg: m.badgeBg };
}

export interface MemeInfo {
  id: MemeId;
  persona: MemePersona;
  label: string;
  quote: string;
  context: string;
}

export const MEME_LIST: readonly MemeInfo[] = [
  // Cô Linda / Cẩm Lan Sục (30)
  { id: 'linda_airanh', persona: 'linda', label: 'Ai rảnh?', quote: 'Ai rảnh?!', context: 'Chê bai / đoán hụt / né kèo' },
  { id: 'linda_ancutheo', persona: 'linda', label: 'Làm clip gì mời ăn cứt heo không em', quote: 'Làm những cái clip gì mà em ơi ăn cứt heo không em? Ăn bà nội cha tụi bay hả!', context: 'Ghê tởm / Troll' },
  { id: 'linda_banoi', persona: 'linda', label: 'Cái gì vậy bà nội?!', quote: 'khen nè gọi nữa, đó rõ ràng gọi nữa nè, đó... Cái gì vậy bà nội?! Cái gì vậy?!', context: 'Sốc khi bị úp sọt / bom nổ' },
  { id: 'linda_botkhung', persona: 'linda', label: 'Tao lạy mày bớt khùng dùm tao đi', quote: 'Nè tao quỳ, tao quỳ tao lạy mày tao nhận mày mày, trời ơi tao lạy mày mày bớt khùng giùm tao đi, ha!', context: 'Chọc troll / đoán bậy' },
  { id: 'linda_buoitoivuive', persona: 'linda', label: 'Chúc mọi người buổi tối vui vẻ', quote: 'Chúc mọi người buổi tối vui vẻ nha!', context: 'Chào bàn / mở màn rôm rả' },
  { id: 'linda_chao', persona: 'linda', label: 'Xin chào cả nhà iu của kem', quote: 'Hahaha! Hi! Xin chào cả nhà yêu của kem!', context: 'Vào phòng / chào đón' },
  { id: 'linda_chicho', persona: 'linda', label: 'Chị chờ cưng nãy giờ nè', quote: 'Trời đất ơi chị chờ cưng nãy giờ nè! Thế làm gì mà lâu dữ vậy?', context: 'Chờ tới lượt / hối đánh nhanh' },
  { id: 'linda_chodegiatao', persona: 'linda', label: 'Sao con người chó đẻ quá vậy', quote: 'Lịch sự mà sao con người bạn chó đẻ quá vậy, thà mất dạy công khai còn hơn đụ má', context: 'Chửi xéo giả tạo' },
  { id: 'linda_cuutoibacon', persona: 'linda', label: 'Cứu tui! Làng xóm ơi! Bà con ơi', quote: 'Cứu tui! Làng xóm ơi! Bà con ơi!', context: 'Nổ bom / bị cá sấu cắn / thua đau' },
  { id: 'linda_dangcap', persona: 'linda', label: 'Phong độ nhất thời, đẳng cấp mãi mãi', quote: 'Trời đất ơi, phong độ chỉ là nhất thời, đẳng cấp mới là mãi mãi cưng à!', context: 'Thắng ván / đoán chuẩn' },
  { id: 'linda_dohamcau', persona: 'linda', label: 'Dơ hơn cái hầm cầu nữa đó trời', quote: 'nó còn dơ hơn cái hầm cầu nữa.', context: 'Chê / Phản ứng sốc' },
  { id: 'linda_ecaijztroi', persona: 'linda', label: 'Ê cái gì vậy trời?', quote: 'Ê cái gì vậy trời? Trời ơi!', context: 'Sốc bất ngờ / đoán trật / dính đòn' },
  { id: 'linda_emquaday', persona: 'linda', label: 'Em qua đây chơi với anh', quote: 'Em qua đây chơi với anh nè', context: 'Mời kèo / trêu ghẹo khi ra đòn' },
  { id: 'linda_hongnho', persona: 'linda', label: 'Ủa có hả ta sao tao hổng nhớ?', quote: 'Ủa có hả ta? Để tao nhớ coi... Có hả trời, hồi nào ta, để tao nhớ... Ủa sao tao không nhớ?', context: 'Giả nai lúc bị nghi & biện minh' },
  { id: 'linda_iaxochon', persona: 'linda', label: 'Qua nhà tao ỉa cho đem về ăn bổ lắm', quote: 'Qua nhà tao tao ỉa cho nè đem về ăn! Bổ lắm, ngày nào tao cũng ăn khoai lang hết á!', context: 'Mất dạy / Bẫy' },
  { id: 'linda_khongchameday', persona: 'linda', label: 'Cái thứ mà không có cha mẹ dạy, cha chết…', quote: 'Cái thứ mà không có cha mẹ dạy, cha chết mẹ chết dạy, ra đây cá vậy á...', context: 'Chửi gắt' },
  { id: 'linda_khungdiensuunhi', persona: 'linda', label: 'Gặp những đứa khùng điên trẻ trâu sửu nhi', quote: 'Hầu như là mở newfeed ra gặp những cái đứa khùng điên trẻ trâu sửu nhi!', context: 'Khịa đối thủ / Đoán sai' },
  { id: 'linda_level', persona: 'linda', label: 'Không đủ level nói chuyện với chị', quote: 'Không có đủ level nói chuyện với chị đâu ha!', context: 'Cà khịa đối thủ / thả skill' },
  { id: 'linda_maccuoi', persona: 'linda', label: 'Ủa mắc cười hahaha', quote: 'Ủa? Mắc cười! Hahahahaha!', context: 'Chọc cười / thả cảm xúc' },
  { id: 'linda_meoicuucon', persona: 'linda', label: 'Mẹ ơi cứu con!', quote: 'Mẹ ơi cứu con!', context: 'Hoảng loạn khi dính bom / cắn' },
  { id: 'linda_moimocra', persona: 'linda', label: 'Bữa nay chị moi ra hết', quote: 'Bữa nay chết với chị, bữa nay chị moi móc ra hết!', context: 'Vạch mặt gián điệp / lật kèo vote' },
  { id: 'linda_namdauquay', persona: 'linda', label: 'Nắm đầu quay từng con như heo quay', quote: 'ăn vả thấy mẹ, hức, nắm đầu mẹ quay từng con như heo quay!', context: 'Tung chiêu / Trả thù' },
  { id: 'linda_quanquedo_ban', persona: 'linda', label: 'Bắt chước quần què dơ bẩn cặn bã', quote: 'Những cái hay những cái đẹp không bắt chước, bắt chước những cái quần què, họ dơ bẩn cặn bã của xã hội!', context: 'Chửi / Sai' },
  { id: 'linda_que', persona: 'linda', label: 'Rồi các bạn thấy quê không?', quote: 'Rồi các bạn thấy quê không?', context: 'Thua quê / đoán sai / bị loại' },
  { id: 'linda_retienthem', persona: 'linda', label: 'Tự nhiên đem cái giới tính con người ta ra…', quote: 'Tự nhiên đem cái giới tính con người ta ra cá với đùa cợt thì thấy đụ má rẻ tiền.', context: 'Khịa kẹt sỉ / Tố cáo' },
  { id: 'linda_thaloi', persona: 'linda', label: 'Em tha lỗi cho chị nha', quote: 'Em tha lỗi cho chị nha!', context: 'Xin tha bổng / hòa giải' },
  { id: 'linda_toasang', persona: 'linda', label: 'Đi tới đâu là tỏa sáng tới đó', quote: 'Chị đi tới đâu là tỏa sáng tới đó!', context: 'Vào ván / đoán đúng / thắng giòn' },
  { id: 'linda_trolai', persona: 'linda', label: 'Linda xin chào trở lại', quote: 'Hahaha! Hi, Linda xin chào các bạn vừa trở lại chương trình HTV BĐ Linda! Hahaha', context: 'Vào phòng / quay lại bàn' },
  { id: 'linda_uongnuocmia', persona: 'linda', label: 'Chị em tui á hả đang uống nước mía mọi người', quote: 'Chị em tui á hả đang uống nước mía mọi người!', context: 'Thảnh thơi hóng chuyện trên bàn' },
  { id: 'linda_xuongnuiquay', persona: 'linda', label: 'Tu mà không cho tu lâu, tao xuống núi quậy…', quote: 'Tu mà không cho tu lâu, tao xuống núi quậy hả?', context: 'Tới lượt / cà khịa đối thủ' },
  // Cô Minh Hiếu (24)
  { id: 'minhhieu_1000do', persona: 'minhhieu', label: 'Một ngàn đô chưa xài nữa!', quote: 'ăm cho hổm một ngàn đô nè. Đó. Đổi ra rồi mà chưa xài.', context: 'Phát thưởng / tặng quà / rủng rỉnh' },
  { id: 'minhhieu_10trieu', persona: 'minhhieu', label: '10 triệu tiền thiệt đàng hoàng', quote: 'Còn cái này là 10 triệu ha, 10 triệu tiền thiệt đàng hoàng nghe', context: 'Tặng quà lớn / đặt cược / giao dịch' },
  { id: 'minhhieu_cadonhuquy', persona: 'minhhieu', label: 'Ca dở như quỷ, cầm mic không ra', quote: 'Ca mà ca dở như quỷ. Cầm cái micro ca không ra đám ôn.', context: 'Chê đáp án sai / chọc quê trên chat' },
  { id: 'minhhieu_camtiendo_dq', persona: 'minhhieu', label: 'Cầm tiền đô đi đường quyền với mày', quote: 'Đi đường quyền mạnh ghê luôn, đụ má có tiền đô nè. Nè cầm tiền đô đi đường quyền với mày nè.', context: 'Đại gia / Phản đòn' },
  { id: 'minhhieu_conquyxao', persona: 'minhhieu', label: 'gì, nó xạo mấy cái con quỷ', quote: 'gì, nó xạo mấy cái con quỷ.', context: 'Bóc phốt / chê đáp án sai' },
  { id: 'minhhieu_cuutoi', persona: 'minhhieu', label: 'Trời ơi cứu tôi chết tôi trời ơi', quote: 'Trời ơi! Trời ơi cứu tôi, cứu tôi, cứu tôi trời ơi! Chết tôi trời ơi!', context: 'Nổ bom / Chết chắc' },
  { id: 'minhhieu_duongquyen', persona: 'minhhieu', label: 'Cầm tiền đô đi đường quyền', quote: 'Nè cầm tiền đô đi đường quyền với mày', context: 'Ra đòn / tung chiêu phản công' },
  { id: 'minhhieu_hoihan', persona: 'minhhieu', label: 'Hối hận vô cùng luôn', quote: 'Em ngủ không được, tự nhiên mình thấy mình hối hận vô cùng.', context: 'Đoán sai / thua ván / dính bom' },
  { id: 'minhhieu_khoe', persona: 'minhhieu', label: 'Có tiền đô thấy nó khỏe gì đâu', quote: 'Tự nhiên có tiền đô sao thấy nó khỏe gì đâu', context: 'Mở ván / hồi sức chiến tiếp' },
  { id: 'minhhieu_khungthichet', persona: 'minhhieu', label: 'cái mẹ có bị khùng á thì chết đi', quote: 'cái mẹ có bị khùng á thì chết đi', context: 'Thắng áp đảo / Bực mình' },
  { id: 'minhhieu_laytienche', persona: 'minhhieu', label: 'Lấy tiền che lại liền!', quote: 'Lấy tiền che lại liền.', context: 'Né đòn / đỡ phạt bằng Ruby / lật kèo' },
  { id: 'minhhieu_lubu', persona: 'minhhieu', label: 'Lu bu quá mắc đếm tiền', quote: 'ơi, còn em thì lu bu quá em không có ở không thời giờ, em mắc đếm tiền', context: 'Đếm tiền / bận né đòn / chém gió' },
  { id: 'minhhieu_maccuoi', persona: 'minhhieu', label: 'Tự nhiên có tiền đô mắc cười', quote: 'Trời ơi tự nhiên có tiền đô sao mắc cười hoài luôn vậy, ngộ ghê', context: 'Nhận quà / tấu hài trong phòng' },
  { id: 'minhhieu_matphoiphoi', persona: 'minhhieu', label: 'Tiền đô quạt mát phơi phới vậy đó', quote: 'Tiền đô tao nói nó quạt mà nó mát phơi phới vậy đó.', context: 'Thắng / Tiền nhiều' },
  { id: 'minhhieu_muonkhoc', persona: 'minhhieu', label: 'lắm. Muốn khóc vậy đó', quote: 'lắm. Muốn khóc vậy đó.', context: 'Mất trắng Ruby / bị loại' },
  { id: 'minhhieu_nganruoido', persona: 'minhhieu', label: 'Tiền mới ngàn rưỡi đô nè', quote: 'Tiền tao nói tiền mới ngàn rưỡi đô nè.', context: 'Nhận Ruby / ăn kèo lớn' },
  { id: 'minhhieu_rotmuocmat', persona: 'minhhieu', label: 'Nói mà rớt nước mắt muốn khóc', quote: 'Thiệt ngồi nói mà muốn rớt nước mắt vậy đó, muốn khóc vậy đó.', context: 'Thua thảm / cạn túi / bị loại' },
  { id: 'minhhieu_soqua', persona: 'minhhieu', label: 'biết. Thôi thôi, Tèo ơi, thôi thôi! Ôi tôi…', quote: 'biết. Thôi thôi, Tèo ơi, thôi thôi! Ôi tôi sợ lắm thôi.', context: 'Hoảng hồn / dí bom / cá sấu cắn' },
  { id: 'minhhieu_tienchicho', persona: 'minhhieu', label: 'Tiền này của chị kia cho nữa đó', quote: 'Nè, còn cái tiền này là của cái chị kia cho nữa.', context: 'Nhận thưởng / tặng quà Ruby' },
  { id: 'minhhieu_tiendo_quat', persona: 'minhhieu', label: 'Cầm tiền đô tao quạt mát lắm', quote: 'cầm tiền đô vậy nè, tao quạt vậy nè đó, thấy không? Tiền đô nó mát dữ lắm', context: 'Lụm tiền / khoe giàu' },
  { id: 'minhhieu_tiendohay', persona: 'minhhieu', label: 'Có tiền đi đường quyền mạnh ghê', quote: 'nay có tiền rồi, đi đường quyền mạnh ghê luôn, đụ má có tiền...', context: 'Ăn lớn / vừa ra nước đi hay' },
  { id: 'minhhieu_tiendomat', persona: 'minhhieu', label: 'Tiền đô gửi về nó mát gì đâu', quote: 'Tao nói tiền đô mà tao nói gửi về nó mát gì đâu.', context: 'Thu tiền thuê / thắng Ruby rủng rỉnh' },
  { id: 'minhhieu_tientuoi', persona: 'minhhieu', label: 'Tiền tươi không nè!', quote: 'Tiền tươi không. Nè tiền đô của người ta nè, nè. Ta gửi về nè thấy không?', context: 'Thanh toán Ruby tươi rói' },
  { id: 'minhhieu_tinhlai', persona: 'minhhieu', label: 'Tự nhiên cái tui tỉnh lại liền luôn', quote: 'Trời đất ơi tự nhiên cái tui tỉnh lại liền luôn. Tự nhiên...', context: 'Đoán trúng bất ngờ / lật kèo sống lại' },
  // Cô Phương Hằng (29)
  { id: 'phuonghang_50tuoi', persona: 'phuonghang', label: '50 tuổi mà được như tôi không phải dễ, em…', quote: '50 tuổi mà được như tôi không phải dễ, em hỏi vậy đó.', context: 'Gáy thắng / khịa nhẹ bàn chơi' },
  { id: 'phuonghang_cangchuicangdien', persona: 'phuonghang', label: 'càng chửi tao tao càng điên tao càng đã', quote: 'càng chửi tao tao càng điên tao càng đã', context: 'Nổi đóa / Phản công' },
  { id: 'phuonghang_chanhcho_ngu', persona: 'phuonghang', label: 'Nó đọc, nó viết comment rất là, rất là…', quote: 'Nó đọc, nó viết comment rất là, rất là chảnh chó nha quý vị.', context: 'Bị lừa / Sai' },
  { id: 'phuonghang_chanly', persona: 'phuonghang', label: 'Chân lý không phải chân tường', quote: 'ại, cái chân lý là chân lý chứ không phải chân lý là chân tường', context: 'Đoán trúng phóc / khẳng định đáp án' },
  { id: 'phuonghang_chomochui', persona: 'phuonghang', label: 'Chỗ mỏ chửi người ta đồ mất dạy', quote: 'hồi đó mày chỏ mỏ mày chửi người ta đồ mất dạy', context: 'Tố cáo / Chửi' },
  { id: 'phuonghang_chuabaogiobochay', persona: 'phuonghang', label: 'Cuộc chơi chưa bao giờ bỏ chạy!', quote: 'Tôi chưa bao giờ bỏ chạy.', context: 'Chốt lượt / phản biện không lùi bước' },
  { id: 'phuonghang_connguo_nao', persona: 'phuonghang', label: 'Con ngu á không có não. Đó quý vị thấy không', quote: 'Con ngu á không có não. Đó quý vị thấy không?', context: 'Đoán sai / Chửi' },
  { id: 'phuonghang_dosup', persona: 'phuonghang', label: 'Cho nó đổ sụp luôn!', quote: 'là nó muốn sụp thì em cho nó đổ luôn.', context: 'Bom nổ / hạ gục đối thủ' },
  { id: 'phuonghang_dungdien', persona: 'phuonghang', label: 'Thần điêu đại bịp đừng diễn nữa', quote: 'Thần điêu đại bịp! Thôi đừng có diễn nữa mấy má mấy cha ơi!', context: 'Tố cáo khi bỏ phiếu' },
  { id: 'phuonghang_dunglacham', persona: 'phuonghang', label: 'Đụng là chạm, cảm là xúc!', quote: 'sợp. Mà nó lôi em vô thì nó đụng em phải chạm thôi, nó cảm là em phải xúc.', context: 'Tung skill / phản công / cắn nhau' },
  { id: 'phuonghang_haoquang', persona: 'phuonghang', label: 'Đừng thấy hào quang tưởng vinh quang', quote: 'Đừng thấy hào quang mà tưởng vinh quang nha quý vị', context: 'Đoán sai / thua ngược' },
  { id: 'phuonghang_khonhon', persona: 'phuonghang', label: 'Đừng nghĩ mình khôn hơn người khác', quote: 'ừng bao giờ nghĩ rằng là mình khôn hơn người khác, không có đâu.', context: 'Chặt đẹp / chọc quê / hóng chat' },
  { id: 'phuonghang_kimcuong', persona: 'phuonghang', label: 'Im lặng là vàng, nói ra là kim cương', quote: 'Hay là người ta nói im lặng là vàng, còn tôi nói ra tôi mới là kim cương nè quý...', context: 'Chốt đáp án / thắng / nhận Ruby' },
  { id: 'phuonghang_laokhongduoc', persona: 'phuonghang', label: 'Nghe nó nói chuyện bố láo không quý vị?…', quote: 'Nghe nó nói chuyện bố láo không quý vị? Mấy cái con này không chửi nó không được. Nó...', context: 'Bắt bài / Tố cáo' },
  { id: 'phuonghang_laymayxuithem', persona: 'phuonghang', label: 'Lấy mày thằng đó cũng xui thấy mẹ', quote: 'đi lấy mày thằng đó cũng xui thấy mẹ, vô phước mới lấy thứ con vợ như mày. Mình...', context: 'Cà khịa mất lượt' },
  { id: 'phuonghang_luadao', persona: 'phuonghang', label: '1 mét vuông ba bốn lừa đảo', quote: 'ào, tôi thấy xã hội bây giờ kinh khủng quá, một mét vuông tới ba bốn thằng lừa đảo', context: 'Sốc vì bị úp sọt / hụt Ruby' },
  { id: 'phuonghang_motminhtao', persona: 'phuonghang', label: 'Công ty TNHH Một Mình Tao Chấp Hết', quote: '(Đ)ó là công ty trách nhiệm hữu hạn một mình tao, chấp hết ai luôn á!', context: 'Thắng áp đảo / cân cả bàn' },
  { id: 'phuonghang_ngongang', persona: 'phuonghang', label: 'Ngỡ ngàng ngơ ngác bật ngửa', quote: 'Quá bất ngờ, ngỡ ngàng, ngơ ngác và bật ngửa', context: 'Lật kèo bất ngờ / mở kết quả sốc' },
  { id: 'phuonghang_nguyhiem', persona: 'phuonghang', label: 'Nơi không an toàn là nơi nguy hiểm!', quote: 'Những nơi không an toàn nhất là những nơi gọi là, là nguy hiểm nhất.', context: 'Cảnh báo bom / cá sấu / vào đêm' },
  { id: 'phuonghang_quantutrathu', persona: 'phuonghang', label: 'Quân tử trả thù 10 năm chưa muộn', quote: 'Quân tử trả thù 10 năm chưa muộn.', context: 'Ghi thù lật kèo / chọc đối thủ' },
  { id: 'phuonghang_taophaimatday', persona: 'phuonghang', label: 'Nay tao phải mất dạy với mày', quote: 'tao phải mất dạy rồi mày', context: 'Bắt đầu gắt' },
  { id: 'phuonghang_thanhcong', persona: 'phuonghang', label: 'Thành công thì tôi hưởng thụ!', quote: 'Cuộc sống tôi thành công thì tôi tự hưởng thụ.', context: 'Thắng lớn / thu Ruby' },
  { id: 'phuonghang_thayvay', persona: 'phuonghang', label: 'Thấy vậy mà không phải vậy!', quote: 'Nhiều khi thấy vậy mà không phải vậy.', context: 'Lật kèo / thanh minh / tình huống bất ngờ' },
  { id: 'phuonghang_tienphuongtien', persona: 'phuonghang', label: 'Tiền chỉ là phương tiện thôi mà', quote: 'Nó không phải là mục tiêu, nó chỉ là phương tiện thôi mà.', context: 'Giao dịch Ruby / tiêu tiền không tiếc' },
  { id: 'phuonghang_tinhhinh', persona: 'phuonghang', label: 'Tình hình bây giờ rất là tình hình', quote: 'Cái tình hình bây giờ nó rất là tình hình.', context: 'Bầu không khí căng thẳng / hóng biến' },
  { id: 'phuonghang_trongcuoc', persona: 'phuonghang', label: 'Người trong cuộc hiểu người trong kẹt', quote: 'à chỉ có người trong cuộc mới hiểu người trong kẹt thôi quý vị', context: 'Biện minh / thảo luận nội bộ' },
  { id: 'phuonghang_tubitritue', persona: 'phuonghang', label: 'Có từ bi thì phải có trí tuệ', quote: 'Có từ bi thì phải có trí tuệ.', context: 'Tha bổng sáng suốt / tung nước đi hay' },
  { id: 'phuonghang_tuongvay', persona: 'phuonghang', label: 'Đừng thấy hoa nở ngỡ xuân về', quote: 'Đừng thấy hoa nở mà ngỡ xuân về, đừng thấy vậy mà tưởng vậy', context: 'Cú twist ngược dòng / tha bổng' },
  { id: 'phuonghang_voquytday', persona: 'phuonghang', label: 'Vỏ quýt dày có móng tay nhọn!', quote: 'Đi đêm có ngày gặp ma, rồi vỏ quýt dày có móng tay nhọn.', context: 'Bắt quả tang / lật kèo / xử tử' },
  // Chị Phiến (29)
  { id: 'chiphien_30ty', persona: 'chiphien', label: 'Tiền học phí con chị 30 tỷ', quote: 'Một tháng là tiền học phí của con chị là phải 30 tỷ', context: 'Cháy túi / giao dịch tiền lớn' },
  { id: 'chiphien_aiepmay', persona: 'chiphien', label: 'Ai ép mày, mệt thì nghỉ!', quote: 'Ai ép mày! Mệt thì nghỉ chứ bây giờ mệt cứ làm hoài làm hoài chi! Ai ép!', context: 'Thua ván / hết Ruby / bị loại' },
  { id: 'chiphien_bonghong', persona: 'chiphien', label: 'Đúng cái bông hồng đó của chị', quote: 'Ở đất ơi trời hồi nãy chị đã nói rồi, đúng cái bông hồng đó là của chị', context: 'Đoán trúng / ăn ván' },
  { id: 'chiphien_capdoimanh', persona: 'chiphien', label: 'Cặp đôi mạnh nhất thế giới', quote: 'Chị với MisThy là bây giờ là cặp đôi là là mạnh nhất thế giới cầu vồng.', context: 'Đồng đội / Thắng' },
  { id: 'chiphien_chinhquyenbat', persona: 'chiphien', label: 'Chuyện bậy quá má chính quyền bắt mày', quote: 'Đừng có nói chuyện bậy quá má, chứ thôi chính quyền bắt mày luôn', context: 'Tố cáo / Vào tù' },
  { id: 'chiphien_chitoitiec', persona: 'chiphien', label: 'Má ơi chị tới tiệc!', quote: 'Má ơi! Chị tới tiệc!', context: 'Vào phòng / Tới lượt' },
  { id: 'chiphien_depxuatsac', persona: 'chiphien', label: 'Chị đẹp không xuất sắc', quote: 'Chị đẹp không? Xuất sắc!', context: 'Đúng / Tự sướng' },
  { id: 'chiphien_dingu', persona: 'chiphien', label: 'Trễ rồi xin đi ngủ nha bye bye', quote: 'Trễ rồi, xin đi ngủ nha. Bye bye.', context: 'Bị loại / tạm biệt rời ván' },
  { id: 'chiphien_hoahau', persona: 'chiphien', label: 'Chị là hoa hậu xe tải', quote: 'Hồi xưa là chị sang trọng, chị nói chị là hoa hậu xe tải', context: 'Vào phòng / Giới thiệu' },
  { id: 'chiphien_hoahauphukhoa', persona: 'chiphien', label: 'Nó đẹp lắm, chị nói thiệt thật sự, nếu mà…', quote: 'Nó đẹp lắm, chị nói thiệt thật sự, nếu mà chị là có một cái hoa hậu mà hoa hậu phụ khoa', context: 'Tấu hài / Thắng' },
  { id: 'chiphien_ke_trithuc_do', persona: 'chiphien', label: 'Có tri thức thì dơ cũng được', quote: 'Kệ nó đi, có tri thức thì bà dơ cũng được', context: 'Biện minh / Cà khịa' },
  { id: 'chiphien_kemay', persona: 'chiphien', label: 'Em là idol Liên Quân kệ mày', quote: 'Em là idol Liên Quân kệ mày.', context: 'Cà khịa / Bơ đi' },
  { id: 'chiphien_kholam', persona: 'chiphien', label: 'Chị khờ lắm ai nói gì tin liền', quote: 'Chị vậy thôi chứ chị khờ lắm, ai nói cái gì là chị tin cái đó liền, thật sự', context: 'Bị lừa lúc vote / đoán trật' },
  { id: 'chiphien_khongbannua_chet', persona: 'chiphien', label: 'Chờ chết vậy đó', quote: 'Chị lo chị không bán nữa chờ chết vậy đó', context: 'Hết tiền / Đói' },
  { id: 'chiphien_khongvon', persona: 'chiphien', label: 'Làm nước hoa mấy triệu chai một ngày', quote: 'Không trời, làm gì có vốn mà chị làm nước hoa mà cả mấy triệu chai một ngày', context: 'Thắng đậm / lụm tiền liên tục' },
  { id: 'chiphien_khonlamkeme', persona: 'chiphien', label: 'Ờ, thôm lầm thì kệ mày', quote: 'Ờ, thôm lầm thì kệ mày', context: 'Mỉa mai / Thua' },
  { id: 'chiphien_lendonchet', persona: 'chiphien', label: '8k rồi lên đơn đi', quote: '8k rồi lên đơn đi!', context: 'K.O. / Tiễn khách' },
  { id: 'chiphien_loilam', persona: 'chiphien', label: 'Chỉn chu quá vẫn có lỗi lầm', quote: 'Đôi lúc mà các bạn chuẩn bị những cái sự gì đó mà chỉn chu quá, thì nó vẫn có những cái lỗi lầm, thì đó chính là cái lỗi của ảnh.', context: 'Đoán sai / Biện minh' },
  { id: 'chiphien_maydien', persona: 'chiphien', label: 'Mày điên rồi không để ai ngủ', quote: 'Mày điên rồi! Biết mấy giờ chưa? Không để cho ai ngủ hết trơn!', context: 'Sốc / hối nhanh trong chat' },
  { id: 'chiphien_metlamroi', persona: 'chiphien', label: 'Một cái thôi chị mệt lắm rồi', quote: 'Trời đất ơi một cái thôi là chị đã mệt lắm rồi', context: 'Dính bom / bị cắn / ăn đòn nặng' },
  { id: 'chiphien_miengdat', persona: 'chiphien', label: 'Mua cho em miếng đất là tin liền', quote: 'Ờ, anh mua cho em miếng đất nha là chị tin liền', context: 'Tặng quà / mua đất trong game' },
  { id: 'chiphien_nhinchidi', persona: 'chiphien', label: 'Giờ mày nhìn chị đi!', quote: 'Bây giờ mày nhìn chị đi! Chị đẹp mà...', context: 'Chốt lượt tự tin / khịa nhẹ' },
  { id: 'chiphien_odaumaxai', persona: 'chiphien', label: 'Tự nhiên cái mọc mười hai cái ở đâu ra mà…', quote: 'Tự nhiên cái mọc mười hai cái ở đâu ra mà xài cho hết bà nội', context: 'Hết hồn tiền bay nhanh / cháy túi' },
  { id: 'chiphien_sochongboss', persona: 'chiphien', label: 'Trước khi lấy chồng sợ chồng làm boss', quote: 'Trước khi chị lấy chồng thì chị sợ chồng chị làm boss', context: 'Tếu táo / Sợ' },
  { id: 'chiphien_taisancuachi', persona: 'chiphien', label: 'Tài sản của ảnh dành cho chị hết', quote: 'Thì bây giờ tài sản của ảnh là bây giờ nè dành cho chị hết (lẫn 1 âm cắt \'ờ/đó\' ở cuối)', context: 'Ăn tiền thuê / nhận quà Ruby' },
  { id: 'chiphien_taividepqua', persona: 'chiphien', label: 'Tại vì sao? Chị đẹp quá mà!', quote: 'Tại vì sao? Chị đẹp quá!', context: 'Thắng / Đúng' },
  { id: 'chiphien_villa', persona: 'chiphien', label: 'Mua căn villa là dụ chị được liền', quote: 'Cho nên là muốn dụ chị dễ lắm, mua căn villa là dụ chị được liền!', context: 'Đầu tư / Tặng quà' },
  { id: 'chiphien_xetda8cai', persona: 'chiphien', label: 'Cho em xét chị đá 8 cái cũng được', quote: 'Chứ bây giờ nếu mà cho chị cho em thì cho em xét, chị đá tám cái!', context: 'Phản công / Tát' },
  { id: 'chiphien_xinhdep', persona: 'chiphien', label: 'Không có mày chị vẫn xinh vẫn đẹp', quote: 'Ờ đất ơi nè, không có mày chị vẫn xinh vẫn đẹp.', context: 'Thắng / Tự tin' },
  // Cô Ba Vàng Ngọc (29)
  { id: 'coba_banchetroi', persona: 'coba', label: 'Nó bị bắn chết rồi chị Ba cũng bỏ', quote: 'Bị bắn chết rồi á chị Ba cũng buông bỏ, nói thôi kệ.', context: 'Loại đối thủ / Phũ phàng' },
  { id: 'coba_batphelon', persona: 'coba', label: 'Tụi bay bắt phe lộn rồi!', quote: 'Tụi bay bắt phe lộn rồi! Tụi bay bắt lộn rồi đó! Tụi bay bắt bồ mà bắt lộn...', context: 'Vote nhầm đồng đội / chọn sai' },
  { id: 'coba_baxaobala', persona: 'coba', label: 'Bà xạo ba láo con Trần My á, đụ má cái…', quote: 'Bà xạo ba láo con Trần My á, đụ má cái thân thì giống như là đói vậy', context: 'Bắt bài nói xạo' },
  { id: 'coba_bebe', persona: 'coba', label: 'Đ* mẹ mày bị bể phải không', quote: 'Đĩ mẹ mày là hai dể là cái lồn bị bể phải không?', context: 'Đoán sai / Phá sản' },
  { id: 'coba_buoccungchan', persona: 'coba', label: 'Bước cùng chân cùng chơi vui vẻ', quote: 'ía, tò là tò te tí, bước cùng chân cùng chơi, đó vui vẻ.', context: 'Hòa giải / khởi đầu / giao lưu' },
  { id: 'coba_chaygiet', persona: 'coba', label: 'Chạy riết rồi giận chạy vô trong nhà quàng…', quote: 'Chạy riết rồi giận chạy vô trong nhà quàng đó.', context: 'Hối lượt / Truy sát' },
  { id: 'coba_chedauchetme', persona: 'coba', label: 'Tới tiệm tao tao chẻ đầu chết mẹ luôn', quote: 'Tới tiệm tao hết á! Đụ má tới tiệm tao tao chẻ đầu chết mẹ luôn!', context: 'Đe dọa / Tung chiêu kết liễu' },
  { id: 'coba_chitaimaychet', persona: 'coba', label: 'Mày á, chết rồi á, như Chí Tài á, có đem…', quote: 'Mày á, chết rồi á, như Chí Tài á, có đem theo không?', context: 'Bị loại / Thua' },
  { id: 'coba_damnha', persona: 'coba', label: 'Cô Ba đang ở Hiền Dương, đó, cứ lại đây…', quote: 'Cô Ba đang ở Hiền Dương, đó, cứ lại đây đâm, chém, đụ má cho lòi lồn đồ chơi. Ok.', context: 'Đối đầu cực gắt' },
  { id: 'coba_dethuong', persona: 'coba', label: 'Trời đất ơi có dễ thương không hahaha', quote: 'Trời đất ơi coi dễ thương không hahaha! Dễ thương ghê chưa, đó vậy đó.', context: 'Thắng vui vẻ / tặng quà / đoán chuẩn' },
  { id: 'coba_futani', persona: 'coba', label: 'Đây là đồng tiền chân thật!', quote: 'Phu Ta Ni nó mới nói đây là đồng tiền chân thật.', context: 'Nhận thưởng / lụm Ruby / đoán đúng' },
  { id: 'coba_giadinhtannat', persona: 'coba', label: 'Tha thứ cho con, tan nát hết rồi', quote: 'ơi! Mẹ hãy tha thứ cho con, gia đình con đã tan nát hết rồi!', context: 'Than thở cháy túi / thua đau / thanh minh' },
  { id: 'coba_giangho', persona: 'coba', label: 'Dòng họ tao giang hồ không!', quote: 'Mày biết dòng họ tao là giang hồ không?', context: 'Bỏ phiếu / hù dọa đối thủ' },
  { id: 'coba_khongguitien', persona: 'coba', label: 'Đâu có tiền đâu mà gửi', quote: 'Đâu có tiền đâu mà để gửi cho mày tám trăm', context: 'Hết tiền / Từ chối chi' },
  { id: 'coba_luchongheo', persona: 'coba', label: 'Nghèo như con đĩ mẹ tụi nó lũ chó', quote: 'Nè, nghèo như con đĩ mẹ tụi nó vậy cái lũ chó, đói rồi khổ vậy đó. (cho n...)', context: 'Khịa đối thủ cháy túi / Thua' },
  { id: 'coba_luocmay', persona: 'coba', label: 'Cỡ mày có người luộc mày nữa chứ', quote: 'Cỡ mày người ta bỏ vài trăm ngàn cũng có người luộc mày nữa chứ, chứ đừng...', context: 'Thua đau / bị cắn / hù dọa' },
  { id: 'coba_mayimtaotha', persona: 'coba', label: 'Mày im thì tao tha!', quote: 'Mày im thì tao tha, tao im, tao không nói tới', context: 'Phán quyết tha bổng / lật kèo' },
  { id: 'coba_maylamenothienha', persona: 'coba', label: 'Lúc đó người ta là nói ờ mày là mẹ thiên…', quote: 'Lúc đó người ta là nói ờ mày là mẹ thiên hạ đó.', context: 'Mỉa mai / Vote' },
  { id: 'coba_minhhieu_chui', persona: 'coba', label: 'á áo ngực của chị Ba nè thấy không? Đụ má…', quote: 'á áo ngực của chị Ba nè thấy không? Đụ má mẹ Minh Hiếu nó bận cái áo như tao không? Nè', context: 'Khẩu chiến gắt' },
  { id: 'coba_muonchoi', persona: 'coba', label: 'Có anh nào muốn chơi vô đây', quote: 'Có anh nào muốn chơi, vô cùng đây với cây kèn te tí.', context: 'Mời kèo vào bàn / tới lượt' },
  { id: 'coba_ngaychon', persona: 'coba', label: 'Bữa nay mày tới thời mày rồi', quote: 'Bữa nay là mày tới thời mày rồi, mày ghẹo đúng nơi, đúng chỗ, đúng ngày chôn của mày luôn rồi đó!', context: 'Bắt thóp kẻ phản bội / sập bẫy' },
  { id: 'coba_nhinquancanh', persona: 'coba', label: 'Mày nhìn hoàn cảnh của mày đi', quote: 'Mày nói tao nghèo, để cho mày nhìn cái quan cảnh', context: 'Cà khịa đối thủ đang thê thảm' },
  { id: 'coba_phenguoigiau', persona: 'coba', label: 'Bắt phe với người giàu có tiền', quote: 'Trời đất ơi người ta bắt phe với người giàu, người có tiền, cái người mạnh người ta không phe', context: 'Khoe giàu / cháy túi / cà khịa' },
  { id: 'coba_quatbatieu', persona: 'coba', label: 'Kéo lại đây tao nè, kéo lại đây! Cái quạt…', quote: 'Kéo lại đây tao nè, kéo lại đây! Cái quạt ba tiêu này tao quạt một cái là tán gia bại sản đó!', context: 'Tung chiêu troll / thổi bay đối thủ' },
  { id: 'coba_saucannha', persona: 'coba', label: 'Nhà có sáu căn à', quote: 'Nhà có sáu căn à, một căn có triệu mấy à, căn có tám trăm ngàn.', context: 'Khoe giàu / Thu tiền' },
  { id: 'coba_thuamaythuan', persona: 'coba', label: 'Đụ má tao thua mày cái thứ ăn mày vậy sao.…', quote: 'Đụ má tao thua mày cái thứ ăn mày vậy sao. Chơi mày!', context: 'Bó tay / Thua keo' },
  { id: 'coba_totote', persona: 'coba', label: 'To tò te đây là ban kèn hơi', quote: 'To tò te, đây là ban kèn hơi, tò là tò te tí co...', context: 'Ăn mừng rộn ràng / chọc quê / tung xúc xắc' },
  { id: 'coba_trinhphen', persona: 'coba', label: 'Còn con đĩ Minh Hiếu bận nhiêu? Hai ba…', quote: 'Còn con đĩ Minh Hiếu bận nhiêu? Hai ba trăm ngàn! Đụ má chân phèn là vẫn là phèn thôi. Đó!', context: 'Cà khịa / Khoe tiền' },
  { id: 'coba_votungoi', persona: 'coba', label: 'Cho mày chiếc này vô tù ngồi nè', quote: 'Mày, tao cho mày chuyến này vô tù mày ngồi', context: 'Vào ô Tù / bị trục xuất khỏi ván' },
  // Hoa hậu Kỳ Duyên (16)
  { id: 'kyduyen_amanh', persona: 'kyduyen', label: 'Duyên bị ám ảnh rất nhiều luôn', quote: 'Bây giờ mỗi lần mà Duyên nhắc về chặng đường ở Mexico thì Duyên bị ám ảnh rất nhiều luôn.', context: 'Sốc / Thua đau' },
  { id: 'kyduyen_chacchanloai', persona: 'kyduyen', label: 'Và nếu như mà em gặp Tuấn Ngọc ở phòng…', quote: 'Và nếu như mà em gặp Tuấn Ngọc ở phòng loại, em chắc chắn sẽ loại Tuấn Ngọc.', context: 'Bỏ phiếu / Kết liễu' },
  { id: 'kyduyen_dubanlinh', persona: 'kyduyen', label: 'Bản thân Duyên đủ bản lĩnh handle hết', quote: 'Bản thân Duyên đủ bản lĩnh để mà có thể handle được hết tất cả mọi thứ ở đây.', context: 'Cà khịa / Đấu trí' },
  { id: 'kyduyen_giacmohong', persona: 'kyduyen', label: 'Một cái người mà ờ tự tự ru mình vào trong…', quote: 'Một cái người mà ờ tự tự ru mình vào trong những cái giấc mơ màu hồng, lúc nào cũng thích nghe những cái lời ngon ngọt.', context: 'Cà khịa giả tạo / Thả tim' },
  { id: 'kyduyen_giamapluc', persona: 'kyduyen', label: 'Áp lực giảm đi rất nhiều', quote: 'Thì nó cũng làm cho Duyên cảm thấy là cái sự áp lực của mình nó cũng giảm đi rất là nhiều.', context: 'Tha bổng / Nhẹ nhõm' },
  { id: 'kyduyen_karen_danong', persona: 'kyduyen', label: 'Không cho thứ tốt hơn mình tự cho', quote: 'Với một thằng đàn ông không cho mình được những thứ tốt hơn những thứ mình tự cho mình.', context: 'Chửi xéo / Thu tiền / Thắng' },
  { id: 'kyduyen_khonghoitiec', persona: 'kyduyen', label: 'Chưa bao giờ hối tiếc hay hối hận', quote: 'Chưa bao giờ hối tiếc, chưa bao giờ hối hận với tất cả những điều mà Duyên đã làm.', context: 'Khẳng định / Chối tội' },
  { id: 'kyduyen_khongmakesure', persona: 'kyduyen', label: 'Tôi sẽ không make sure 100 phần trăm', quote: 'yes với bạn khi mà bạn nhờ tôi như thế, nhưng mà nếu mà đồ của bạn xảy ra bất cứ một vấn đề gì thì tôi sẽ không make sure 100 phần trăm.', context: 'Nghi ngờ / Biện minh' },
  { id: 'kyduyen_loingonngot', persona: 'kyduyen', label: 'Lúc nào cũng thích nghe lời ngon ngọt', quote: 'Tự, tự ru mình vào trong những cái giấc mơ màu hồng, lúc nào cũng thích nghe những cái lời ngon ngọt.', context: 'Cà khịa giả tạo / Thả tim' },
  { id: 'kyduyen_nguhaitieng', persona: 'kyduyen', label: 'Duyên chỉ ngủ có 2 tiếng thôi', quote: '(mảnh âm cắt đầu) ...thì Duyên chỉ ngủ có hai tiếng thôi.', context: 'Chế giễu / Mệt mỏi' },
  { id: 'kyduyen_nongsau_lanh', persona: 'kyduyen', label: 'Hai tiếng trước vừa nóng hai tiếng sau đã lạnh', quote: 'Nó cứ lúc nóng lúc lạnh, lúc nóng lúc lạnh. Hai tiếng trước vừa nóng thôi mà hai tiếng sau đã lạnh rồi.', context: 'Đảo chiều / Sốc' },
  { id: 'kyduyen_thanhtuu', persona: 'kyduyen', label: 'Đã vượt qua chính là thành tựu', quote: 'Duyên đã vượt qua, đó chính là cái thành tựu của mình.', context: 'Thắng / Ghi điểm' },
  { id: 'kyduyen_thigio_giacmo', persona: 'kyduyen', label: 'Mình thi cho giấc mơ của mình', quote: 'Cá nhân của mình, mình thi cho giấc mơ của mình.', context: 'Vào lượt / Quyết tâm' },
  { id: 'kyduyen_tinchinhminh', persona: 'kyduyen', label: 'Mình luôn phải tin vào chính mình', quote: 'Cách mà mình đi á, mình luôn phải tin vào chính mình.', context: 'Biện minh / Tự tin' },
  { id: 'kyduyen_tuconsoam', persona: 'kyduyen', label: 'Không gì khó bằng từ con số âm đi lên', quote: 'Nó sẽ không thể nào mà nó khó khăn bằng việc là mình đi từ con số âm đi lên.', context: 'Âm Ruby / Phản công' },
  { id: 'kyduyen_vuotquakhokhan', persona: 'kyduyen', label: 'Không hiểu sao vượt qua ngày khó khăn', quote: 'Bây giờ nghĩ lại đúng là không hiểu lý do vì sao mình có thể vượt qua những cái ngày mà khó khăn như thế.', context: 'Thoát hiểm / Lật kèo' },
  // Hỗ trợ Game (8)
  { id: 'tienbip_cainit', persona: 'game_fx', label: 'Tiến Bịp: Còn đúng cái nịt!', quote: 'Còn cái nịt. Còn đúng cái nịt thôi. (cuối clip có tiếng nhỏ ngoài mic: Ai? Cái gì?)', context: 'Thua -2.000 Ruby / ví âm' },
  { id: 'vn_amongus', persona: 'game_fx', label: 'Among Us Role Reveal', quote: '(SFX: nhạc Among Us Role Reveal kèm tiếng \'Shhh\')', context: 'Mở màn kịch tính' },
  { id: 'vn_batngochua', persona: 'game_fx', label: 'Bất ngờ chưa bà già?!', quote: '(Tiếng nổ) Bất ngờ chưa bà già? Hé lu bà già! (Nhạc hài kết)', context: 'Phản đòn / đổi chiều thế trận' },
  { id: 'vn_fartmic', persona: 'game_fx', label: 'Đánh rắm vô mic vang dội', quote: '(SFX: tiếng đánh rắm vô mic vang dội - Prruuuuttt!!)', context: 'Skill troll xì hơi' },
  { id: 'vn_hettien', persona: 'game_fx', label: 'Úi trời đất ơi tui hết tiền rồi!', quote: 'Bạn biết gì chưa? Úi trời đất ơi! Tui hết tiền rồi!', context: 'Tài khoản Ruby xuống âm' },
  { id: 'vn_toicongchuyen', persona: 'game_fx', label: 'Rồi rồi tới công chuyện rồi!', quote: 'Rồi rồi, tới công chuyện rồi!', context: 'Bắt đầu bỏ phiếu / kèo căng' },
  { id: 'vn_vineboom', persona: 'game_fx', label: 'Vine Boom (Sốc toàn tập)', quote: '(SFX: BÙM!! - Vine Boom)', context: 'Chốt hạ / nổ / lật bài bất ngờ' },
  { id: 'vn_vinhbietcu', persona: 'game_fx', label: 'Xin vĩnh biệt cụ!', quote: 'Xin vĩnh biệt cụ!', context: 'Bay màu / loại khỏi ván' },
];

export const MEME_BY_ID: Record<MemeId, MemeInfo> = Object.fromEntries(
  MEME_LIST.map((m) => [m.id, m]),
) as Record<MemeId, MemeInfo>;

export const MEME_IDS_BY_PERSONA: Record<MemePersona, readonly MemeId[]> = {
  linda: ['linda_airanh', 'linda_ancutheo', 'linda_banoi', 'linda_botkhung', 'linda_buoitoivuive', 'linda_chao', 'linda_chicho', 'linda_chodegiatao', 'linda_cuutoibacon', 'linda_dangcap', 'linda_dohamcau', 'linda_ecaijztroi', 'linda_emquaday', 'linda_hongnho', 'linda_iaxochon', 'linda_khongchameday', 'linda_khungdiensuunhi', 'linda_level', 'linda_maccuoi', 'linda_meoicuucon', 'linda_moimocra', 'linda_namdauquay', 'linda_quanquedo_ban', 'linda_que', 'linda_retienthem', 'linda_thaloi', 'linda_toasang', 'linda_trolai', 'linda_uongnuocmia', 'linda_xuongnuiquay'],
  minhhieu: ['minhhieu_1000do', 'minhhieu_10trieu', 'minhhieu_cadonhuquy', 'minhhieu_camtiendo_dq', 'minhhieu_conquyxao', 'minhhieu_cuutoi', 'minhhieu_duongquyen', 'minhhieu_hoihan', 'minhhieu_khoe', 'minhhieu_khungthichet', 'minhhieu_laytienche', 'minhhieu_lubu', 'minhhieu_maccuoi', 'minhhieu_matphoiphoi', 'minhhieu_muonkhoc', 'minhhieu_nganruoido', 'minhhieu_rotmuocmat', 'minhhieu_soqua', 'minhhieu_tienchicho', 'minhhieu_tiendo_quat', 'minhhieu_tiendohay', 'minhhieu_tiendomat', 'minhhieu_tientuoi', 'minhhieu_tinhlai'],
  phuonghang: ['phuonghang_50tuoi', 'phuonghang_cangchuicangdien', 'phuonghang_chanhcho_ngu', 'phuonghang_chanly', 'phuonghang_chomochui', 'phuonghang_chuabaogiobochay', 'phuonghang_connguo_nao', 'phuonghang_dosup', 'phuonghang_dungdien', 'phuonghang_dunglacham', 'phuonghang_haoquang', 'phuonghang_khonhon', 'phuonghang_kimcuong', 'phuonghang_laokhongduoc', 'phuonghang_laymayxuithem', 'phuonghang_luadao', 'phuonghang_motminhtao', 'phuonghang_ngongang', 'phuonghang_nguyhiem', 'phuonghang_quantutrathu', 'phuonghang_taophaimatday', 'phuonghang_thanhcong', 'phuonghang_thayvay', 'phuonghang_tienphuongtien', 'phuonghang_tinhhinh', 'phuonghang_trongcuoc', 'phuonghang_tubitritue', 'phuonghang_tuongvay', 'phuonghang_voquytday'],
  chiphien: ['chiphien_30ty', 'chiphien_aiepmay', 'chiphien_bonghong', 'chiphien_capdoimanh', 'chiphien_chinhquyenbat', 'chiphien_chitoitiec', 'chiphien_depxuatsac', 'chiphien_dingu', 'chiphien_hoahau', 'chiphien_hoahauphukhoa', 'chiphien_ke_trithuc_do', 'chiphien_kemay', 'chiphien_kholam', 'chiphien_khongbannua_chet', 'chiphien_khongvon', 'chiphien_khonlamkeme', 'chiphien_lendonchet', 'chiphien_loilam', 'chiphien_maydien', 'chiphien_metlamroi', 'chiphien_miengdat', 'chiphien_nhinchidi', 'chiphien_odaumaxai', 'chiphien_sochongboss', 'chiphien_taisancuachi', 'chiphien_taividepqua', 'chiphien_villa', 'chiphien_xetda8cai', 'chiphien_xinhdep'],
  coba: ['coba_banchetroi', 'coba_batphelon', 'coba_baxaobala', 'coba_bebe', 'coba_buoccungchan', 'coba_chaygiet', 'coba_chedauchetme', 'coba_chitaimaychet', 'coba_damnha', 'coba_dethuong', 'coba_futani', 'coba_giadinhtannat', 'coba_giangho', 'coba_khongguitien', 'coba_luchongheo', 'coba_luocmay', 'coba_mayimtaotha', 'coba_maylamenothienha', 'coba_minhhieu_chui', 'coba_muonchoi', 'coba_ngaychon', 'coba_nhinquancanh', 'coba_phenguoigiau', 'coba_quatbatieu', 'coba_saucannha', 'coba_thuamaythuan', 'coba_totote', 'coba_trinhphen', 'coba_votungoi'],
  kyduyen: ['kyduyen_amanh', 'kyduyen_chacchanloai', 'kyduyen_dubanlinh', 'kyduyen_giacmohong', 'kyduyen_giamapluc', 'kyduyen_karen_danong', 'kyduyen_khonghoitiec', 'kyduyen_khongmakesure', 'kyduyen_loingonngot', 'kyduyen_nguhaitieng', 'kyduyen_nongsau_lanh', 'kyduyen_thanhtuu', 'kyduyen_thigio_giacmo', 'kyduyen_tinchinhminh', 'kyduyen_tuconsoam', 'kyduyen_vuotquakhokhan'],
  game_fx: ['tienbip_cainit', 'vn_amongus', 'vn_batngochua', 'vn_fartmic', 'vn_hettien', 'vn_toicongchuyen', 'vn_vineboom', 'vn_vinhbietcu'],
};

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

export const ACTION_POOL_META: readonly { key: MemePoolKey; label: string; desc: string }[] = [
  { key: 'welcome', label: 'Vào phòng / Khai cuộc', desc: 'Lời chào khi vào phòng' },
  { key: 'turn_move', label: 'Ra đòn / Tới lượt / Lắc xí ngầu', desc: 'Gõ chữ, chọn đáp án, lắc Bầu Cua/Tỷ Phú, đổi lượt' },
  { key: 'correct', label: 'Đoán đúng / Ghi điểm', desc: 'Đoán đúng từ Vẽ & Đoán, Đố Vui đúng, dò số chuẩn' },
  { key: 'wrong', label: 'Đoán trật / Sai luật / Bó tay', desc: 'Nhập từ sai, đoán trật đáp án hoặc hết giờ' },
  { key: 'win', label: 'Chiến thắng / Ăn lớn', desc: 'Thắng ván đấu, cộng +2.000 Ruby hoặc ăn đậm' },
  { key: 'lose', label: 'Thua ván / Ngậm ngùi', desc: 'Thua cuộc, hụt giải nhất hoặc mất cược' },
  { key: 'money', label: 'Đặt cược / Lụm tiền / Ruby', desc: 'Rải chip, thu tiền thuê đất, giao dịch trong ván' },
  { key: 'broke', label: 'Cháy túi / Âm Ruby', desc: 'Ví tụt âm hoặc nộp phạt nặng sạch túi' },
  { key: 'gift', label: 'Tặng quà', desc: 'Tặng hoa, thả tim hoặc gửi quà cho bạn chơi' },
  { key: 'gift_receive', label: 'Nhận quà', desc: 'Phản ứng của người nhận quà' },
  { key: 'help', label: 'Xin cứu trợ', desc: 'Nhờ giúp hoặc xin gợi ý' },
  { key: 'hurry', label: 'Hối lượt', desc: 'Nhắc người chơi đang chờ' },
  { key: 'relief', label: 'Thoát nạn', desc: 'Được cứu hoặc vừa ra tù' },
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

// Câu tự phát trong ván lấy từ các nhóm tương đồng (memeMoods.ts); bảng nghe thử vẫn có toàn bộ kho.
export const MEME_POOLS: Record<MemePoolKey, readonly MemeId[]> = buildMemePools();

/** Toàn bộ 165 ID meme đã kiểm định sạch giọng để phát xoay vòng không lặp. */
export const ALL_MEME_IDS: readonly MemeId[] = MEME_LIST.map((m) => m.id);

/** Nhạc nền xoay vòng 6 bài chỉ phát khi đang ở phòng chờ (lobby), tắt khi vào ván chơi. */
export function shouldPlayBgm(room: RoomState | null): boolean {
  return room?.phase === 'lobby';
}
