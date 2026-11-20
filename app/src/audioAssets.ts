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
  // Cô Linda / Cẩm Lan Sục (68)
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
  | 'linda_batoi'
  | 'linda_cauhoncauhon'
  | 'linda_botragiumcon'
  | 'linda_byebyeolala'
  | 'linda_coghettoi'
  | 'linda_aotuong'
  | 'linda_aicungxau'
  | 'linda_chuatienan'
  | 'linda_chuaduocyeu'
  | 'linda_chuaailuadoi'
  | 'linda_xinloime'
  | 'linda_khongaithuonghai'
  | 'linda_khongdieukien'
  | 'linda_sauraycodieukien'
  | 'linda_khongchuiboinua'
  | 'linda_batngocacban'
  | 'linda_chuahoimaykhai'
  | 'linda_duonghuongthien'
  | 'linda_camonem'
  | 'linda_nguocdoi'
  | 'linda_daynaucanh'
  | 'linda_quentoikhet'
  | 'linda_lanvaobep'
  | 'linda_hienhau'
  | 'linda_quenkeo'
  | 'linda_thatim'
  | 'linda_khongthachomay'
  | 'linda_tinhyeucuatrinh'
  | 'linda_tuclam'
  | 'linda_khongbomieng'
  | 'linda_cotiendulich'
  | 'linda_ngotnam'
  | 'linda_chaomungamthuc'
  | 'linda_ngonroiday'
  | 'linda_suchutcuaco'
  | 'linda_tienganh'
  | 'linda_cuoixinh'
  | 'linda_bochuithe'
  // Cô Minh Hiếu (62)
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
  | 'minhhieu_chaomayanh'
  | 'minhhieu_soquakhongbiet'
  | 'minhhieu_xinloithathu'
  | 'minhhieu_noiduakhongchui'
  | 'minhhieu_hettrontien'
  | 'minhhieu_voduyen'
  | 'minhhieu_saokhongdo'
  | 'minhhieu_themngando'
  | 'minhhieu_xammuongiangho'
  | 'minhhieu_divedicha'
  | 'minhhieu_cotiendikhong'
  | 'minhhieu_buonghe'
  | 'minhhieu_dungdieuqua'
  | 'minhhieu_canvang'
  | 'minhhieu_xaolao'
  | 'minhhieu_byebye'
  | 'minhhieu_dienhoai'
  | 'minhhieu_hetpin'
  | 'minhhieu_matsangsua'
  | 'minhhieu_fanmanh'
  | 'minhhieu_muanhachucty'
  | 'minhhieu_muadi'
  | 'minhhieu_chotdonkhongaimua'
  | 'minhhieu_chotdonquatroi'
  | 'minhhieu_vangthat'
  | 'minhhieu_disingapore'
  | 'minhhieu_dexnoiten'
  | 'minhhieu_hellomayem'
  | 'minhhieu_khuyroi'
  | 'minhhieu_xinchaomaycon'
  | 'minhhieu_kicucvay'
  | 'minhhieu_taodaymay'
  | 'minhhieu_khongchuikhongngu'
  | 'minhhieu_nguoitathuong'
  | 'minhhieu_metkhach'
  | 'minhhieu_dethuongkhong'
  | 'minhhieu_giauhontao'
  | 'minhhieu_baikinhte'
  // Cô Phương Hằng (61)
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
  | 'phuonghang_khonggikhongthe'
  | 'phuonghang_coloiqua'
  | 'phuonghang_emdepkhong'
  | 'phuonghang_tulamdep'
  | 'phuonghang_tientrongnao'
  | 'phuonghang_lieugan'
  | 'phuonghang_hoanhap'
  | 'phuonghang_khonganbam'
  | 'phuonghang_toidadu'
  | 'phuonghang_lamchucuocchoi'
  | 'phuonghang_suthatloira'
  | 'phuonghang_saodola'
  | 'phuonghang_chuyennhieu'
  | 'phuonghang_trathu'
  | 'phuonghang_nomoney'
  | 'phuonghang_chiuduockhong'
  | 'phuonghang_bominhde'
  | 'phuonghang_thangheo'
  | 'phuonghang_khongbietlamsao'
  | 'phuonghang_nguoigiau'
  | 'phuonghang_khongquygoi'
  | 'phuonghang_tienrotnuocmat'
  | 'phuonghang_emtonthuong'
  | 'phuonghang_choiluon'
  | 'phuonghang_bagai'
  | 'phuonghang_tuithan'
  | 'phuonghang_tientuibay'
  | 'phuonghang_noitieng'
  | 'phuonghang_ngheokhongtoi'
  | 'phuonghang_canhcua'
  | 'phuonghang_thuongbanthan'
  | 'phuonghang_lietsi'
  // Chị Phiến (63)
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
  | 'chiphien_conghenoi'
  | 'chiphien_noihay'
  | 'chiphien_dongluc'
  | 'chiphien_thomsangtrong'
  | 'chiphien_thatbainamdo'
  | 'chiphien_laycaisai'
  | 'chiphien_cuuchi'
  | 'chiphien_bihai'
  | 'chiphien_bacodoi'
  | 'chiphien_chuadukho'
  | 'chiphien_khongmuonon'
  | 'chiphien_chotdonnha'
  | 'chiphien_ghequa'
  | 'chiphien_daoboi'
  | 'chiphien_giaubaonam'
  | 'chiphien_conbado'
  | 'chiphien_amtham'
  | 'chiphien_thichvay'
  | 'chiphien_ngatdungcho'
  | 'chiphien_chinhkien'
  | 'chiphien_30thangchong'
  | 'chiphien_loiroi'
  | 'chiphien_ditu'
  | 'chiphien_doithua'
  | 'chiphien_xutoido'
  | 'chiphien_khongnoigi'
  | 'chiphien_loichivo'
  | 'chiphien_khongtontrong'
  | 'chiphien_nuoiong'
  | 'chiphien_manhme'
  | 'chiphien_blockbanhbeo'
  | 'chiphien_dungghep'
  | 'chiphien_thongminh'
  | 'chiphien_dangngo'
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
  // Cô Linda / Cẩm Lan Sục (68)
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
  linda_batoi: require('../assets/audio/memes/linda_batoi.mp3'),
  linda_cauhoncauhon: require('../assets/audio/memes/linda_cauhoncauhon.mp3'),
  linda_botragiumcon: require('../assets/audio/memes/linda_botragiumcon.mp3'),
  linda_byebyeolala: require('../assets/audio/memes/linda_byebyeolala.mp3'),
  linda_coghettoi: require('../assets/audio/memes/linda_coghettoi.mp3'),
  linda_aotuong: require('../assets/audio/memes/linda_aotuong.mp3'),
  linda_aicungxau: require('../assets/audio/memes/linda_aicungxau.mp3'),
  linda_chuatienan: require('../assets/audio/memes/linda_chuatienan.mp3'),
  linda_chuaduocyeu: require('../assets/audio/memes/linda_chuaduocyeu.mp3'),
  linda_chuaailuadoi: require('../assets/audio/memes/linda_chuaailuadoi.mp3'),
  linda_xinloime: require('../assets/audio/memes/linda_xinloime.mp3'),
  linda_khongaithuonghai: require('../assets/audio/memes/linda_khongaithuonghai.mp3'),
  linda_khongdieukien: require('../assets/audio/memes/linda_khongdieukien.mp3'),
  linda_sauraycodieukien: require('../assets/audio/memes/linda_sauraycodieukien.mp3'),
  linda_khongchuiboinua: require('../assets/audio/memes/linda_khongchuiboinua.mp3'),
  linda_batngocacban: require('../assets/audio/memes/linda_batngocacban.mp3'),
  linda_chuahoimaykhai: require('../assets/audio/memes/linda_chuahoimaykhai.mp3'),
  linda_duonghuongthien: require('../assets/audio/memes/linda_duonghuongthien.mp3'),
  linda_camonem: require('../assets/audio/memes/linda_camonem.mp3'),
  linda_nguocdoi: require('../assets/audio/memes/linda_nguocdoi.mp3'),
  linda_daynaucanh: require('../assets/audio/memes/linda_daynaucanh.mp3'),
  linda_quentoikhet: require('../assets/audio/memes/linda_quentoikhet.mp3'),
  linda_lanvaobep: require('../assets/audio/memes/linda_lanvaobep.mp3'),
  linda_hienhau: require('../assets/audio/memes/linda_hienhau.mp3'),
  linda_quenkeo: require('../assets/audio/memes/linda_quenkeo.mp3'),
  linda_thatim: require('../assets/audio/memes/linda_thatim.mp3'),
  linda_khongthachomay: require('../assets/audio/memes/linda_khongthachomay.mp3'),
  linda_tinhyeucuatrinh: require('../assets/audio/memes/linda_tinhyeucuatrinh.mp3'),
  linda_tuclam: require('../assets/audio/memes/linda_tuclam.mp3'),
  linda_khongbomieng: require('../assets/audio/memes/linda_khongbomieng.mp3'),
  linda_cotiendulich: require('../assets/audio/memes/linda_cotiendulich.mp3'),
  linda_ngotnam: require('../assets/audio/memes/linda_ngotnam.mp3'),
  linda_chaomungamthuc: require('../assets/audio/memes/linda_chaomungamthuc.mp3'),
  linda_ngonroiday: require('../assets/audio/memes/linda_ngonroiday.mp3'),
  linda_suchutcuaco: require('../assets/audio/memes/linda_suchutcuaco.mp3'),
  linda_tienganh: require('../assets/audio/memes/linda_tienganh.mp3'),
  linda_cuoixinh: require('../assets/audio/memes/linda_cuoixinh.mp3'),
  linda_bochuithe: require('../assets/audio/memes/linda_bochuithe.mp3'),
  // Cô Minh Hiếu (62)
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
  minhhieu_chaomayanh: require('../assets/audio/memes/minhhieu_chaomayanh.mp3'),
  minhhieu_soquakhongbiet: require('../assets/audio/memes/minhhieu_soquakhongbiet.mp3'),
  minhhieu_xinloithathu: require('../assets/audio/memes/minhhieu_xinloithathu.mp3'),
  minhhieu_noiduakhongchui: require('../assets/audio/memes/minhhieu_noiduakhongchui.mp3'),
  minhhieu_hettrontien: require('../assets/audio/memes/minhhieu_hettrontien.mp3'),
  minhhieu_voduyen: require('../assets/audio/memes/minhhieu_voduyen.mp3'),
  minhhieu_saokhongdo: require('../assets/audio/memes/minhhieu_saokhongdo.mp3'),
  minhhieu_themngando: require('../assets/audio/memes/minhhieu_themngando.mp3'),
  minhhieu_xammuongiangho: require('../assets/audio/memes/minhhieu_xammuongiangho.mp3'),
  minhhieu_divedicha: require('../assets/audio/memes/minhhieu_divedicha.mp3'),
  minhhieu_cotiendikhong: require('../assets/audio/memes/minhhieu_cotiendikhong.mp3'),
  minhhieu_buonghe: require('../assets/audio/memes/minhhieu_buonghe.mp3'),
  minhhieu_dungdieuqua: require('../assets/audio/memes/minhhieu_dungdieuqua.mp3'),
  minhhieu_canvang: require('../assets/audio/memes/minhhieu_canvang.mp3'),
  minhhieu_xaolao: require('../assets/audio/memes/minhhieu_xaolao.mp3'),
  minhhieu_byebye: require('../assets/audio/memes/minhhieu_byebye.mp3'),
  minhhieu_dienhoai: require('../assets/audio/memes/minhhieu_dienhoai.mp3'),
  minhhieu_hetpin: require('../assets/audio/memes/minhhieu_hetpin.mp3'),
  minhhieu_matsangsua: require('../assets/audio/memes/minhhieu_matsangsua.mp3'),
  minhhieu_fanmanh: require('../assets/audio/memes/minhhieu_fanmanh.mp3'),
  minhhieu_muanhachucty: require('../assets/audio/memes/minhhieu_muanhachucty.mp3'),
  minhhieu_muadi: require('../assets/audio/memes/minhhieu_muadi.mp3'),
  minhhieu_chotdonkhongaimua: require('../assets/audio/memes/minhhieu_chotdonkhongaimua.mp3'),
  minhhieu_chotdonquatroi: require('../assets/audio/memes/minhhieu_chotdonquatroi.mp3'),
  minhhieu_vangthat: require('../assets/audio/memes/minhhieu_vangthat.mp3'),
  minhhieu_disingapore: require('../assets/audio/memes/minhhieu_disingapore.mp3'),
  minhhieu_dexnoiten: require('../assets/audio/memes/minhhieu_dexnoiten.mp3'),
  minhhieu_hellomayem: require('../assets/audio/memes/minhhieu_hellomayem.mp3'),
  minhhieu_khuyroi: require('../assets/audio/memes/minhhieu_khuyroi.mp3'),
  minhhieu_xinchaomaycon: require('../assets/audio/memes/minhhieu_xinchaomaycon.mp3'),
  minhhieu_kicucvay: require('../assets/audio/memes/minhhieu_kicucvay.mp3'),
  minhhieu_taodaymay: require('../assets/audio/memes/minhhieu_taodaymay.mp3'),
  minhhieu_khongchuikhongngu: require('../assets/audio/memes/minhhieu_khongchuikhongngu.mp3'),
  minhhieu_nguoitathuong: require('../assets/audio/memes/minhhieu_nguoitathuong.mp3'),
  minhhieu_metkhach: require('../assets/audio/memes/minhhieu_metkhach.mp3'),
  minhhieu_dethuongkhong: require('../assets/audio/memes/minhhieu_dethuongkhong.mp3'),
  minhhieu_giauhontao: require('../assets/audio/memes/minhhieu_giauhontao.mp3'),
  minhhieu_baikinhte: require('../assets/audio/memes/minhhieu_baikinhte.mp3'),
  // Cô Phương Hằng (61)
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
  phuonghang_khonggikhongthe: require('../assets/audio/memes/phuonghang_khonggikhongthe.mp3'),
  phuonghang_coloiqua: require('../assets/audio/memes/phuonghang_coloiqua.mp3'),
  phuonghang_emdepkhong: require('../assets/audio/memes/phuonghang_emdepkhong.mp3'),
  phuonghang_tulamdep: require('../assets/audio/memes/phuonghang_tulamdep.mp3'),
  phuonghang_tientrongnao: require('../assets/audio/memes/phuonghang_tientrongnao.mp3'),
  phuonghang_lieugan: require('../assets/audio/memes/phuonghang_lieugan.mp3'),
  phuonghang_hoanhap: require('../assets/audio/memes/phuonghang_hoanhap.mp3'),
  phuonghang_khonganbam: require('../assets/audio/memes/phuonghang_khonganbam.mp3'),
  phuonghang_toidadu: require('../assets/audio/memes/phuonghang_toidadu.mp3'),
  phuonghang_lamchucuocchoi: require('../assets/audio/memes/phuonghang_lamchucuocchoi.mp3'),
  phuonghang_suthatloira: require('../assets/audio/memes/phuonghang_suthatloira.mp3'),
  phuonghang_saodola: require('../assets/audio/memes/phuonghang_saodola.mp3'),
  phuonghang_chuyennhieu: require('../assets/audio/memes/phuonghang_chuyennhieu.mp3'),
  phuonghang_trathu: require('../assets/audio/memes/phuonghang_trathu.mp3'),
  phuonghang_nomoney: require('../assets/audio/memes/phuonghang_nomoney.mp3'),
  phuonghang_chiuduockhong: require('../assets/audio/memes/phuonghang_chiuduockhong.mp3'),
  phuonghang_bominhde: require('../assets/audio/memes/phuonghang_bominhde.mp3'),
  phuonghang_thangheo: require('../assets/audio/memes/phuonghang_thangheo.mp3'),
  phuonghang_khongbietlamsao: require('../assets/audio/memes/phuonghang_khongbietlamsao.mp3'),
  phuonghang_nguoigiau: require('../assets/audio/memes/phuonghang_nguoigiau.mp3'),
  phuonghang_khongquygoi: require('../assets/audio/memes/phuonghang_khongquygoi.mp3'),
  phuonghang_tienrotnuocmat: require('../assets/audio/memes/phuonghang_tienrotnuocmat.mp3'),
  phuonghang_emtonthuong: require('../assets/audio/memes/phuonghang_emtonthuong.mp3'),
  phuonghang_choiluon: require('../assets/audio/memes/phuonghang_choiluon.mp3'),
  phuonghang_bagai: require('../assets/audio/memes/phuonghang_bagai.mp3'),
  phuonghang_tuithan: require('../assets/audio/memes/phuonghang_tuithan.mp3'),
  phuonghang_tientuibay: require('../assets/audio/memes/phuonghang_tientuibay.mp3'),
  phuonghang_noitieng: require('../assets/audio/memes/phuonghang_noitieng.mp3'),
  phuonghang_ngheokhongtoi: require('../assets/audio/memes/phuonghang_ngheokhongtoi.mp3'),
  phuonghang_canhcua: require('../assets/audio/memes/phuonghang_canhcua.mp3'),
  phuonghang_thuongbanthan: require('../assets/audio/memes/phuonghang_thuongbanthan.mp3'),
  phuonghang_lietsi: require('../assets/audio/memes/phuonghang_lietsi.mp3'),
  // Chị Phiến (63)
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
  chiphien_conghenoi: require('../assets/audio/memes/chiphien_conghenoi.mp3'),
  chiphien_noihay: require('../assets/audio/memes/chiphien_noihay.mp3'),
  chiphien_dongluc: require('../assets/audio/memes/chiphien_dongluc.mp3'),
  chiphien_thomsangtrong: require('../assets/audio/memes/chiphien_thomsangtrong.mp3'),
  chiphien_thatbainamdo: require('../assets/audio/memes/chiphien_thatbainamdo.mp3'),
  chiphien_laycaisai: require('../assets/audio/memes/chiphien_laycaisai.mp3'),
  chiphien_cuuchi: require('../assets/audio/memes/chiphien_cuuchi.mp3'),
  chiphien_bihai: require('../assets/audio/memes/chiphien_bihai.mp3'),
  chiphien_bacodoi: require('../assets/audio/memes/chiphien_bacodoi.mp3'),
  chiphien_chuadukho: require('../assets/audio/memes/chiphien_chuadukho.mp3'),
  chiphien_khongmuonon: require('../assets/audio/memes/chiphien_khongmuonon.mp3'),
  chiphien_chotdonnha: require('../assets/audio/memes/chiphien_chotdonnha.mp3'),
  chiphien_ghequa: require('../assets/audio/memes/chiphien_ghequa.mp3'),
  chiphien_daoboi: require('../assets/audio/memes/chiphien_daoboi.mp3'),
  chiphien_giaubaonam: require('../assets/audio/memes/chiphien_giaubaonam.mp3'),
  chiphien_conbado: require('../assets/audio/memes/chiphien_conbado.mp3'),
  chiphien_amtham: require('../assets/audio/memes/chiphien_amtham.mp3'),
  chiphien_thichvay: require('../assets/audio/memes/chiphien_thichvay.mp3'),
  chiphien_ngatdungcho: require('../assets/audio/memes/chiphien_ngatdungcho.mp3'),
  chiphien_chinhkien: require('../assets/audio/memes/chiphien_chinhkien.mp3'),
  chiphien_30thangchong: require('../assets/audio/memes/chiphien_30thangchong.mp3'),
  chiphien_loiroi: require('../assets/audio/memes/chiphien_loiroi.mp3'),
  chiphien_ditu: require('../assets/audio/memes/chiphien_ditu.mp3'),
  chiphien_doithua: require('../assets/audio/memes/chiphien_doithua.mp3'),
  chiphien_xutoido: require('../assets/audio/memes/chiphien_xutoido.mp3'),
  chiphien_khongnoigi: require('../assets/audio/memes/chiphien_khongnoigi.mp3'),
  chiphien_loichivo: require('../assets/audio/memes/chiphien_loichivo.mp3'),
  chiphien_khongtontrong: require('../assets/audio/memes/chiphien_khongtontrong.mp3'),
  chiphien_nuoiong: require('../assets/audio/memes/chiphien_nuoiong.mp3'),
  chiphien_manhme: require('../assets/audio/memes/chiphien_manhme.mp3'),
  chiphien_blockbanhbeo: require('../assets/audio/memes/chiphien_blockbanhbeo.mp3'),
  chiphien_dungghep: require('../assets/audio/memes/chiphien_dungghep.mp3'),
  chiphien_thongminh: require('../assets/audio/memes/chiphien_thongminh.mp3'),
  chiphien_dangngo: require('../assets/audio/memes/chiphien_dangngo.mp3'),
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
  // Cô Linda / Cẩm Lan Sục (68)
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
  { id: 'linda_batoi', persona: 'linda', label: 'Tao thấy mà tao bắt ói á má', quote: 'Trời đất ơi, tao thấy mà tao bắt ói á má. Nghĩ sao vậy má?', context: 'Cà khịa / Chê' },
  { id: 'linda_cauhoncauhon', persona: 'linda', label: 'Má làm lễ cầu hôn hay cầu hồn?', quote: 'Má làm lễ cầu hôn hay là má đứng má cầu hồn?', context: 'Cà khịa / Chọc quê' },
  { id: 'linda_botragiumcon', persona: 'linda', label: 'Trời ơi bớt ra giùm con đi', quote: 'Mấy má, trời ơi bớt ra giùm con đi.', context: 'Cà khịa / Hối' },
  { id: 'linda_byebyeolala', persona: 'linda', label: 'Bye bye mọi người, ô la la', quote: 'Bye bye mọi người, ô la la!', context: 'Bị loại / Tạm biệt' },
  { id: 'linda_coghettoi', persona: 'linda', label: 'Clip này sẽ có người ghét tôi', quote: 'Tôi biết là clip này sẽ có người ghét tôi.', context: 'Thua / Buồn' },
  { id: 'linda_aotuong', persona: 'linda', label: 'Cái ảo tưởng của tôi cao quá', quote: 'Vì cái ảo tưởng của tôi cũng cao quá.', context: 'Đoán sai / Quê' },
  { id: 'linda_aicungxau', persona: 'linda', label: 'Ai cũng xấu hết, tôi không tốt', quote: 'Ai cũng xấu hết ha, ai cũng xấu hết. Còn tôi thì tôi không tốt, bản thân tôi không tốt.', context: 'Biện minh / Nhận lỗi' },
  { id: 'linda_chuatienan', persona: 'linda', label: 'Tôi chưa hề có tiền án tiền sự', quote: 'Tôi chưa hề có tiền án tiền sự gì. Tôi tuy xấu miệng nhưng tôi chưa bao giờ hại ai.', context: 'Biện minh lúc bị nghi' },
  { id: 'linda_chuaduocyeu', persona: 'linda', label: 'Chưa người đàn ông nào yêu thật sự', quote: 'Tôi chưa được một người đàn ông nào yêu thật sự.', context: 'Thua / Buồn' },
  { id: 'linda_chuaailuadoi', persona: 'linda', label: 'Chưa có ai lừa dối tôi được', quote: 'Nhưng mà cũng chưa có ai lừa dối tôi được cả.', context: 'Thoát nạn / Gáy' },
  { id: 'linda_xinloime', persona: 'linda', label: 'Tôi xin lỗi mẹ tôi rất nhiều', quote: 'Tôi xin lỗi mẹ tôi, tôi xin lỗi mẹ tôi rất nhiều.', context: 'Thua / Xin lỗi' },
  { id: 'linda_khongaithuonghai', persona: 'linda', label: 'Tôi không cần ai thương hại', quote: 'Tôi không cần. Tôi chỉ nói những gì của tôi thôi, tôi không cần ai thương hại tôi hết.', context: 'Chống chế / Bị chê' },
  { id: 'linda_khongdieukien', persona: 'linda', label: 'Tôi đâu có điều kiện', quote: 'Nhưng mà tôi đâu có điều kiện.', context: 'Cháy túi' },
  { id: 'linda_sauraycodieukien', persona: 'linda', label: 'Sau này có điều kiện sẽ được như người ta', quote: 'Nếu mà sau này có điều kiện tôi sẽ được như người ta.', context: 'Cháy túi / Mơ ước' },
  { id: 'linda_khongchuiboinua', persona: 'linda', label: 'Không làm clip chửi bới ai nữa', quote: 'Tôi hứa là từ nay tôi sẽ không làm clip chửi bới ai nữa, chỉ làm clip giải trí cho các bạn cười thôi.', context: 'Hòa giải / Tha' },
  { id: 'linda_batngocacban', persona: 'linda', label: 'Tôi xin có một bất ngờ cho các bạn', quote: 'Trước tiên tôi xin chào các bạn và tôi xin có một bất ngờ dành cho các bạn.', context: 'Vào phòng / Chào sân' },
  { id: 'linda_chuahoimaykhai', persona: 'linda', label: 'Người ta chưa hỏi mà mày khai ra', quote: 'Tại sao người ta chưa hỏi gì đến cái vụ làm gái mày khai ra?', context: 'Bắt bài / Tố cáo' },
  { id: 'linda_duonghuongthien', persona: 'linda', label: 'Chúc em tìm được con đường hướng thiện', quote: 'Cảm ơn em rất nhiều và chúc em sẽ kiếm được một con đường hướng thiện.', context: 'Tha bổng / Hòa giải' },
  { id: 'linda_camonem', persona: 'linda', label: 'Chị cảm ơn em', quote: 'Chị cảm ơn em.', context: 'Nhận quà' },
  { id: 'linda_nguocdoi', persona: 'linda', label: 'Câu hỏi của em ngược đời ghê', quote: 'Ô trời ơi, câu hỏi của em nó ngược đời ghê á.', context: 'Sốc / Bất ngờ' },
  { id: 'linda_daynaucanh', persona: 'linda', label: 'Hôm nay cô dạy nấu canh chua', quote: 'Nhân tiện thì hôm nay cô sẽ dạy cho các em cách nấu canh chua như thế nào là ngon và hấp dẫn nhé.', context: 'Vào lượt / Tám chuyện' },
  { id: 'linda_quentoikhet', persona: 'linda', label: 'Cô lo nói chuyện quên tỏi khét', quote: 'Cô nói chuyện mà cô lo quên, tỏi khét mẹ nó rồi.', context: 'Đoán sai / Hụt' },
  { id: 'linda_lanvaobep', persona: 'linda', label: 'Muốn ăn phải lăn vào bếp', quote: 'Ăn thì muốn ăn phải lăn vào bếp, phải phụ cha phụ mẹ.', context: 'Cà khịa / Dạy đời' },
  { id: 'linda_hienhau', persona: 'linda', label: 'Phải như cô nói chuyện hiền hậu', quote: 'Phải như cô nói chuyện hiền hậu dễ thương dễ nghe.', context: 'Gáy / Tấu hài' },
  { id: 'linda_quenkeo', persona: 'linda', label: 'Tao để cái kéo đâu, quên rồi', quote: 'Tao để cái kéo đâu, tao quên mẹ rồi.', context: 'Quên / Hụt' },
  { id: 'linda_thatim', persona: 'linda', label: 'Mọi người ơi thả tim nhiều cho cô', quote: 'Mọi người ơi, thả tim nhiều cho cô đi chứ.', context: 'Tặng quà / Xin tim' },
  { id: 'linda_khongthachomay', persona: 'linda', label: 'Tao không có tha cho mày đâu', quote: 'Bực cái điện thoại tao nên không chửi đó, chứ tao không có tha cho mày đâu.', context: 'Hù dọa / Ra đòn' },
  { id: 'linda_tinhyeucuatrinh', persona: 'linda', label: 'Chào tất cả các tình yêu của Trinh', quote: 'Chào tất cả các tình yêu của Trinh nha!', context: 'Vào phòng / Chào sân' },
  { id: 'linda_tuclam', persona: 'linda', label: 'Tức lắm tức lắm mọi người ạ', quote: 'Tức lắm, tức lắm mọi người ạ, thật sự.', context: 'Thua / Bực' },
  { id: 'linda_khongbomieng', persona: 'linda', label: 'Thề không bỏ miếng đường nào', quote: 'Thề luôn không có bỏ một miếng đường nào vô luôn ấy.', context: 'Chối tội' },
  { id: 'linda_cotiendulich', persona: 'linda', label: 'Người ta có tiền người ta đi du lịch', quote: 'Trời ơi, người ta có tiền người ta đi du lịch.', context: 'Giàu có / Lụm tiền' },
  { id: 'linda_ngotnam', persona: 'linda', label: 'Ngọt ngon từ nấm', quote: 'Úi giời ơi, không có gì ngoài cái nước nó ngọt ngon từ nấm.', context: 'Đoán trúng / Khen ngon' },
  { id: 'linda_chaomungamthuc', persona: 'linda', label: 'Chào mừng đến chương trình ẩm thực', quote: 'Chào mừng các em đến với chương trình ẩm thực dân gian Việt Nam.', context: 'Vào phòng / Khai cuộc' },
  { id: 'linda_ngonroiday', persona: 'linda', label: 'Ngon rồi đấy mọi người ạ', quote: 'Ngon rồi đấy mọi người ạ.', context: 'Đoán trúng / Thắng' },
  { id: 'linda_suchutcuaco', persona: 'linda', label: 'Sức hút của cô vẫn còn', quote: 'Sức hút của cô vẫn còn, thôi thôi khỏi đi.', context: 'Gáy / Tự tin' },
  { id: 'linda_tienganh', persona: 'linda', label: 'Trình độ tiếng Anh mày bằng tao không?', quote: 'Trình độ tiếng Anh của mày có được bằng tao không mà mày nói khùng?', context: 'Cà khịa / Gáy' },
  { id: 'linda_cuoixinh', persona: 'linda', label: 'Cô cười xinh quá', quote: 'Cô cười xinh quá đúng không?', context: 'Gáy / Vui' },
  { id: 'linda_bochuithe', persona: 'linda', label: 'Đã bỏ chửi thề mấy năm rồi', quote: 'Trinh đã bỏ cái chửi thề ra mấy năm rồi, mọi người cũng hoan hỉ bỏ qua.', context: 'Biện minh / Tấu hài' },
  // Cô Minh Hiếu (62)
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
  { id: 'minhhieu_chaomayanh', persona: 'minhhieu', label: 'Em chào mấy anh mấy chị', quote: 'Em chào mấy anh mấy chị, mai mốt em lên em chửi nữa cho nghe.', context: 'Vào phòng / Chào sân' },
  { id: 'minhhieu_soquakhongbiet', persona: 'minhhieu', label: 'Trời ơi tôi sợ quá, tôi không biết', quote: 'Thôi thôi, trời ơi tôi sợ quá, tôi không biết nghe, tôi không biết đâu.', context: 'Hoảng / Bị dí bom' },
  { id: 'minhhieu_xinloithathu', persona: 'minhhieu', label: 'Em xin lỗi, anh tha thứ cho em', quote: 'Bây giờ em xin lỗi anh, em lạy anh, em lạy anh Ba, anh tha thứ cho em.', context: 'Xin tha / Biện minh' },
  { id: 'minhhieu_noiduakhongchui', persona: 'minhhieu', label: 'Bữa nay chị không có chửi', quote: 'Chị không có đùa đâu, bữa nay chị không có chửi.', context: 'Chối tội' },
  { id: 'minhhieu_hettrontien', persona: 'minhhieu', label: 'Em hết trơn tiền rồi chị ơi', quote: 'Trời ơi, em hết trơn tiền rồi chị ơi, em kẹt tiền, không có đồng nào.', context: 'Cháy túi / Mất tiền' },
  { id: 'minhhieu_voduyen', persona: 'minhhieu', label: 'Nó xấu mà còn vô duyên', quote: 'Trời đất ơi, nó vô duyên lắm, nó xấu mà nó còn vô duyên nữa đó.', context: 'Cà khịa' },
  { id: 'minhhieu_saokhongdo', persona: 'minhhieu', label: 'Sao mày không đỡ?', quote: 'Sao mày không đỡ? Gặp tao đánh là tao đỡ liền.', context: 'Ra đòn / Phản công' },
  { id: 'minhhieu_themngando', persona: 'minhhieu', label: 'Uýnh tao, tao cho thêm 1.000 đô', quote: 'Thằng nào mà lại uýnh tao, tao cho thêm 1.000 đô nữa nè.', context: 'Thách đấu / Khoe tiền' },
  { id: 'minhhieu_xammuongiangho', persona: 'minhhieu', label: 'Mày mướn giang hồ đánh tao', quote: 'Tao thấy xăm mình xăm đồ là tao biết mày mướn giang hồ đánh tao rồi.', context: 'Tố cáo / Bắt bài' },
  { id: 'minhhieu_divedicha', persona: 'minhhieu', label: 'Thôi đi về đi cha', quote: 'Thôi đi về đi cha, khổ quá.', context: 'Cà khịa / Tiễn khách' },
  { id: 'minhhieu_cotiendikhong', persona: 'minhhieu', label: 'Mày có tiền để mày đi không?', quote: 'Mày có tiền để mày đi không?', context: 'Cà khịa đối thủ nghèo' },
  { id: 'minhhieu_buonghe', persona: 'minhhieu', label: 'Buồn ghê, tối ngủ không được', quote: 'Mình tức mà mình buồn ghê luôn á, tối ngủ không được.', context: 'Thua / Buồn' },
  { id: 'minhhieu_dungdieuqua', persona: 'minhhieu', label: 'Nói chuyện đừng có điệu quá', quote: 'Trời ơi, nói chuyện đừng có điệu quá.', context: 'Cà khịa / Chat' },
  { id: 'minhhieu_canvang', persona: 'minhhieu', label: 'Lấy cái ký cân thử còn bao nhiêu', quote: 'Còn bao nhiêu? Bây giờ lấy cái ký cân thử còn bao nhiêu.', context: 'Đếm tiền / Lụm vàng' },
  { id: 'minhhieu_xaolao', persona: 'minhhieu', label: 'Nó bán đồ nó xạo nó láo', quote: 'Mấy con quỷ kia nó bán đồ nó xạo nó láo, thấy sợ luôn.', context: 'Tố cáo / Bỏ phiếu' },
  { id: 'minhhieu_byebye', persona: 'minhhieu', label: 'Em yêu anh cho gờ cu, bye bye', quote: 'Em yêu anh cho gờ cu, bye bye!', context: 'Bị loại / Tạm biệt' },
  { id: 'minhhieu_dienhoai', persona: 'minhhieu', label: 'Điện hoài vậy trời, thằng quỷ', quote: 'Kiếm ông nội mày gì mà điện hoài vậy trời, thằng quỷ!', context: 'Bị hối / Bực mình' },
  { id: 'minhhieu_hetpin', persona: 'minhhieu', label: 'Điện thoại gần hết pin', quote: 'Điện thoại nó gần hết pin.', context: 'Hối / Nhờ giúp' },
  { id: 'minhhieu_matsangsua', persona: 'minhhieu', label: 'Mặt tao sáng sủa, ai cũng tôn trọng', quote: 'Mặt của tao mày thấy không, sáng sủa, đi ra đường kẻ đưa người đón, ai cũng mừng, ai cũng tôn trọng.', context: 'Gáy / Khoe' },
  { id: 'minhhieu_fanmanh', persona: 'minhhieu', label: 'Fan của tao rất là mạnh', quote: 'Mày biết tao là hung dữ mà, mày biết tao là nhiều người mến mộ mà, fan của tao rất là mạnh mà.', context: 'Gáy / Hù dọa' },
  { id: 'minhhieu_muanhachucty', persona: 'minhhieu', label: 'Mua cái nhà hai ba chục tỷ đi', quote: 'Sao mày không mua nhà mày ở đi? Mua cái nhà hai ba chục tỷ đi.', context: 'Mua nhà / Khịa' },
  { id: 'minhhieu_muadi', persona: 'minhhieu', label: 'Mấy bà không mua tui buồn lắm, mua đi', quote: 'Tui nói thiệt luôn á, mấy bà mà không mua tui buồn lắm á, mua đi.', context: 'Mua bán / Đặt cược' },
  { id: 'minhhieu_chotdonkhongaimua', persona: 'minhhieu', label: 'Chốt đơn mà không ai mua', quote: 'Chốt đơn chốt đơn mà em không thấy ai mua hết trơn, phải làm gì, chốt đơn hả?', context: 'Ế / Hụt tiền' },
  { id: 'minhhieu_chotdonquatroi', persona: 'minhhieu', label: 'Chốt đơn quá trời chốt đơn', quote: 'Chốt đơn! Chốt đơn! Chốt đơn! Trời ơi quá trời chốt đơn!', context: 'Mua bán / Lụm tiền' },
  { id: 'minhhieu_vangthat', persona: 'minhhieu', label: 'Cái này mới đúng là vàng thật', quote: 'Cái này mới đúng là vàng thật nè.', context: 'Lụm tiền / Đoán trúng' },
  { id: 'minhhieu_disingapore', persona: 'minhhieu', label: 'Cho em 1.000 đô đi Singapore chơi', quote: 'Cho em 1.000 đô nè, em đổi ra đi rồi em đi qua Singapore chơi.', context: 'Tặng quà / Nhận quà' },
  { id: 'minhhieu_dexnoiten', persona: 'minhhieu', label: 'Mày dễ gì tao nói tên', quote: 'Mày dễ gì tao nói tên cho mày nghe.', context: 'Cà khịa / Giấu bài' },
  { id: 'minhhieu_hellomayem', persona: 'minhhieu', label: 'Hello mấy em của chị nha', quote: 'Hello mấy em của chị nha, chị nè tụi em ơi.', context: 'Vào phòng / Chào sân' },
  { id: 'minhhieu_khuyroi', persona: 'minhhieu', label: 'Khuya rồi, tức ghê luôn', quote: 'Ôi trời ơi, khuya rồi, tức ghê luôn á.', context: 'Hối / Chờ lâu' },
  { id: 'minhhieu_xinchaomaycon', persona: 'minhhieu', label: 'Xin chào mấy con mấy cháu', quote: 'Chào mấy em, xin chào mấy con mấy cháu nha.', context: 'Vào phòng / Chào sân' },
  { id: 'minhhieu_kicucvay', persona: 'minhhieu', label: 'Sao làm ăn gì kì cục vậy', quote: 'Trời đất ơi là trời ơi, sao làm ăn gì kì cục vậy hả?', context: 'Sốc / Bất ngờ' },
  { id: 'minhhieu_taodaymay', persona: 'minhhieu', label: 'Cha mẹ mày không dạy, để tao dạy', quote: 'Cha mẹ mày không dạy mày hả? Để tao dạy mày.', context: 'Ra đòn / Gắt' },
  { id: 'minhhieu_khongchuikhongngu', persona: 'minhhieu', label: 'Không chửi là ngủ không được', quote: 'Bây giờ nó xông lên, bây giờ không chửi là ngủ không được.', context: 'Gắt / Hối' },
  { id: 'minhhieu_nguoitathuong', persona: 'minhhieu', label: 'Người ta thương mình, mình mừng lắm', quote: 'Tại vì người ta thích mình, người ta thương mình, người ta quý mình là mình cũng mừng lắm chứ.', context: 'Nhận quà / Được khen' },
  { id: 'minhhieu_metkhach', persona: 'minhhieu', label: 'Chị mệt lắm, tiếp khách cả ngày', quote: 'Chị mệt lắm, tiếp khách cả ngày luôn á mấy em ơi.', context: 'Thua / Than mệt' },
  { id: 'minhhieu_dethuongkhong', persona: 'minhhieu', label: 'Em rất dễ thương không?', quote: 'Em nói chuyện rất đàng hoàng, em rất dễ thương không? Em đâu có tầm bậy tầm bạ.', context: 'Biện minh / Tự khen' },
  { id: 'minhhieu_giauhontao', persona: 'minhhieu', label: 'Chừng nào giàu hơn tao mới nổi tiếng', quote: 'Còn lâu mày mới nổi tiếng. Chừng nào mày giàu hơn tao thì mày mới nổi tiếng.', context: 'Cà khịa / Khoe giàu' },
  { id: 'minhhieu_baikinhte', persona: 'minhhieu', label: 'Chửi cho mày bại kinh tế', quote: 'Tao chửi cho mày bại kinh tế luôn.', context: 'Ra đòn / Hù dọa' },
  // Cô Phương Hằng (61)
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
  { id: 'phuonghang_khonggikhongthe', persona: 'phuonghang', label: 'Ở đời này không gì là không thể', quote: 'Ở đời này không gì là không thể đâu nha quý vị.', context: 'Tự tin vào lượt / Gáy' },
  { id: 'phuonghang_coloiqua', persona: 'phuonghang', label: 'Bớt đẹp cũng không làm được, có lỗi quá', quote: 'Ngay cả cái việc mà làm mình bớt đẹp cũng không làm được đó, trời ơi, có lỗi quá!', context: 'Gáy / Tấu hài' },
  { id: 'phuonghang_emdepkhong', persona: 'phuonghang', label: 'Quý vị ơi, em đẹp không?', quote: 'Quý vị ơi, em đẹp không quý vị?', context: 'Chào sân / Thả dáng' },
  { id: 'phuonghang_tulamdep', persona: 'phuonghang', label: 'Tôi tự làm đẹp, không cần ai trang điểm', quote: 'Tôi tự làm cho tôi đẹp chứ tôi không cần ai trang điểm.', context: 'Gáy / Tự tin' },
  { id: 'phuonghang_tientrongnao', persona: 'phuonghang', label: 'Tiền nằm trong não mình', quote: 'Tiền nó trong cái não của mình, không phải túi người khác.', context: 'Lụm tiền / Đầu tư' },
  { id: 'phuonghang_lieugan', persona: 'phuonghang', label: 'Tôi liều mà rất gan nha', quote: 'Tôi được một cái là liều mà rất gan nha quý vị.', context: 'Vào lượt / Đặt cược' },
  { id: 'phuonghang_hoanhap', persona: 'phuonghang', label: 'Hòa nhập nhưng không hòa tan', quote: 'Cái level của mỗi người nó có rồi, không cần phải nói. Chị hòa nhập nhưng không hòa tan.', context: 'Gáy / Cà khịa' },
  { id: 'phuonghang_khonganbam', persona: 'phuonghang', label: 'Chị không ăn bám chồng', quote: 'Chị chưa bao giờ sợ hôn nhân tan vỡ, là bởi vì chị không ăn bám chồng.', context: 'Gáy / Giàu có' },
  { id: 'phuonghang_toidadu', persona: 'phuonghang', label: 'Cái tôi có tôi đã có', quote: 'Cái tôi có tôi đã có, cái tôi đủ tôi đã đủ.', context: 'Giàu có / Thong thả' },
  { id: 'phuonghang_lamchucuocchoi', persona: 'phuonghang', label: 'Làm chủ cuộc chơi', quote: 'Làm chủ mình, làm chủ cuộc sống mình, làm chủ cuộc chơi.', context: 'Thắng / Vào lượt' },
  { id: 'phuonghang_suthatloira', persona: 'phuonghang', label: 'Sự thật bao giờ cũng là sự thật', quote: 'Sự thật bao giờ nó cũng là sự thật thôi, không sớm thì chiều.', context: 'Tố cáo / Bỏ phiếu' },
  { id: 'phuonghang_saodola', persona: 'phuonghang', label: 'Bị sao đô la nó đè', quote: 'Nhiều khi vận hạn nó đến, bị sao đô la nó đè đó quý vị ơi.', context: 'Mất tiền / Xui' },
  { id: 'phuonghang_chuyennhieu', persona: 'phuonghang', label: 'Tại chuyện nhiều quá chị mới nói', quote: 'Chị không có muốn nhiều chuyện, nhưng mà tại chuyện nhiều quá chị mới nói.', context: 'Biện minh / Tám chuyện' },
  { id: 'phuonghang_trathu', persona: 'phuonghang', label: 'Thành công là sự trả thù ngọt ngào', quote: 'Thành công là sự trả thù ngọt ngào êm ái nhất.', context: 'Thắng / Lật kèo' },
  { id: 'phuonghang_nomoney', persona: 'phuonghang', label: 'Mày no money thì nói không giá trị', quote: 'Mà mày no money á, là lời nói mày không có giá trị.', context: 'Cà khịa / Khoe tiền' },
  { id: 'phuonghang_chiuduockhong', persona: 'phuonghang', label: 'Chịu được không? Chịu được không?', quote: 'Chịu được không? Chịu được không?', context: 'Cà khịa / Hối' },
  { id: 'phuonghang_bominhde', persona: 'phuonghang', label: 'Nó bỏ mình thì rất dễ', quote: 'Nó bỏ mình thì rất dễ, mà mình bỏ nó không hề dễ.', context: 'Thua / Buồn' },
  { id: 'phuonghang_thangheo', persona: 'phuonghang', label: 'Thà nghèo chứ không bán rẻ lương tâm', quote: 'Tôi thà nghèo chứ tôi không bao giờ bán rẻ lương tâm.', context: 'Cháy túi / Chống chế' },
  { id: 'phuonghang_khongbietlamsao', persona: 'phuonghang', label: 'Mẹ không biết làm sao', quote: 'Mẹ không biết làm sao.', context: 'Bí / Nhờ giúp' },
  { id: 'phuonghang_nguoigiau', persona: 'phuonghang', label: 'Tôi là người giàu, người thành công', quote: 'Tôi là người giàu, tôi là người thành công, có gì đâu ăn mày.', context: 'Giàu có / Thắng' },
  { id: 'phuonghang_khongquygoi', persona: 'phuonghang', label: 'Đời tôi không bao giờ quỳ gối', quote: 'Đời tôi không bao giờ biết quỳ gối.', context: 'Thoát nạn / Gáy' },
  { id: 'phuonghang_tienrotnuocmat', persona: 'phuonghang', label: 'Có những đồng tiền cầm rớt nước mắt', quote: 'Có những đồng tiền mà khi chúng ta cầm, chúng ta rớt nước mắt.', context: 'Mất tiền / Buồn' },
  { id: 'phuonghang_emtonthuong', persona: 'phuonghang', label: 'Em khóc đó, em tổn thương đó', quote: 'Em khóc đó, em tổn thương, em buồn đó. Đủ rồi.', context: 'Thua / Bị cắn' },
  { id: 'phuonghang_choiluon', persona: 'phuonghang', label: 'Anh chơi tôi cũng chơi', quote: 'Anh chơi tôi cũng chơi, anh biết chơi tôi cũng biết chơi.', context: 'Vào lượt / Ra đòn' },
  { id: 'phuonghang_bagai', persona: 'phuonghang', label: 'Ba gai chứ không phải mất dạy', quote: 'Ba gai chứ không phải mất dạy. Mất dạy nó khác nha.', context: 'Biện minh' },
  { id: 'phuonghang_tuithan', persona: 'phuonghang', label: 'Tủi thân thì khóc, bản lĩnh có thừa', quote: 'Tủi thân thì tôi khóc. Nhưng bản lĩnh là có thừa nha. Chưa bao giờ tôi gục ngã.', context: 'Thua mà không gục / Thoát nạn' },
  { id: 'phuonghang_tientuibay', persona: 'phuonghang', label: 'Tiền tụi bây chưa chắc hơn tao', quote: 'Chưa bao giờ tao khuất phục thằng nào, con nào. Tiền tụi bây chưa chắc hơn tao.', context: 'Cà khịa / Khoe giàu' },
  { id: 'phuonghang_noitieng', persona: 'phuonghang', label: 'Tụi bây có nổi tiếng như tao không?', quote: 'Tụi bây có nổi tiếng như tao không? Nhiêu đó thôi. Ghét tao cũng phải coi.', context: 'Cà khịa / Gáy' },
  { id: 'phuonghang_ngheokhongtoi', persona: 'phuonghang', label: 'Nghèo không có tội', quote: 'Nghèo không có tội, ngu dốt cũng không có tội, nhưng phải sống cho đàng hoàng.', context: 'Cháy túi / Dạy đời' },
  { id: 'phuonghang_canhcua', persona: 'phuonghang', label: 'Cánh cửa này đóng, cánh cửa khác mở', quote: 'Khi cánh cửa này đóng lại sẽ có cánh cửa khác mở ra.', context: 'Thua vẫn lạc quan / Thoát nạn' },
  { id: 'phuonghang_thuongbanthan', persona: 'phuonghang', label: 'Phương Hằng tôi luôn thương bản thân', quote: 'Cho nên Phương Hằng tôi bao giờ cũng thương bản thân mình.', context: 'Gáy / Thong thả' },
  { id: 'phuonghang_lietsi', persona: 'phuonghang', label: 'Không ai trao bằng liệt sĩ đâu', quote: 'Không ai trao cho mình cái bằng liệt sĩ đâu.', context: 'Cà khịa / Biện minh' },
  // Chị Phiến (63)
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
  { id: 'chiphien_conghenoi', persona: 'chiphien', label: 'Tao có nói cái gì đâu mà mày nghe', quote: 'Tao có nói cái gì đâu mà mày nghe.', context: 'Chối / Cà khịa' },
  { id: 'chiphien_noihay', persona: 'chiphien', label: 'Chị nói hay không?', quote: 'Chị nói hay không? Bây giờ hai ngàn mấy trăm người đâu có thể nào mà nói được giống như chị.', context: 'Gáy / Đoán trúng' },
  { id: 'chiphien_dongluc', persona: 'chiphien', label: 'Mày không có động lực sống', quote: 'Mày sống mày không có cái động lực sống trong cuộc đời.', context: 'Cà khịa' },
  { id: 'chiphien_thomsangtrong', persona: 'chiphien', label: 'Chai này thơm sang trọng nè', quote: 'Cái chai này thơm sang trọng nè, thơm 5 ngày trên cái áo tụi bay luôn.', context: 'Mua bán / Khoe hàng' },
  { id: 'chiphien_thatbainamdo', persona: 'chiphien', label: 'Thất bại ở đâu nằm luôn ở đó', quote: 'Mình thất bại ở đâu thì mình nằm luôn ở đó, có sao đâu.', context: 'Thua / Buông xuôi' },
  { id: 'chiphien_laycaisai', persona: 'chiphien', label: 'Tiên phong lấy cái sai làm cái đúng', quote: 'Em sẽ là người đầu tiên tiên phong lấy cái sai làm cái đúng.', context: 'Đoán sai / Chống chế' },
  { id: 'chiphien_cuuchi', persona: 'chiphien', label: 'Em cứu chị được không?', quote: 'Ngọc Kem ơi, em cứu chị được không? Chứ cái này không phải chị đâu.', context: 'Xin cứu / Hoảng' },
  { id: 'chiphien_bihai', persona: 'chiphien', label: 'Chị bị hại, chị bị hại', quote: 'Ai lồng ghép chị vô á? Chị bị hại. Chị bị hại.', context: 'Biện minh / Bị tố' },
  { id: 'chiphien_bacodoi', persona: 'chiphien', label: 'Trời ơi má ơi bà cố nội ơi', quote: 'Trời ơi má ơi bà cố nội ơi!', context: 'Sốc / Bị cắn' },
  { id: 'chiphien_chuadukho', persona: 'chiphien', label: 'Chị chưa đủ khổ hả em?', quote: 'Ủa em ơi, chị chưa đủ khổ hả em?', context: 'Thua / Bị dí' },
  { id: 'chiphien_khongmuonon', persona: 'chiphien', label: 'Chị không có muốn ồn ào', quote: 'Chị không có muốn ồn ào, em xóa cái avatar này xuống cho chị đi.', context: 'Xin tha / Nhờ giúp' },
  { id: 'chiphien_chotdonnha', persona: 'chiphien', label: 'Chốt đơn nha mọi người ơi', quote: 'Chốt đơn chốt đơn nha mọi người ơi.', context: 'Mua bán / Đặt cược' },
  { id: 'chiphien_ghequa', persona: 'chiphien', label: 'Trời ơi ghê quá', quote: 'Trời ơi ghê quá!', context: 'Sốc' },
  { id: 'chiphien_daoboi', persona: 'chiphien', label: 'Đào bới chút xíu là lòi ra hết', quote: 'Cái cộng đồng mạng này ghê quá, đào bới một chút xíu là lòi ra tất cả mọi thứ.', context: 'Bị lộ / Tố cáo' },
  { id: 'chiphien_giaubaonam', persona: 'chiphien', label: 'Chuyện này chị giấu bao năm rồi', quote: 'Thật sự là cái chuyện này chị đã giấu bao nhiêu năm nay rồi. Bây giờ thôi.', context: 'Lật bài / Thú nhận' },
  { id: 'chiphien_conbado', persona: 'chiphien', label: 'Chị chính là con đàn bà đó', quote: 'Đúng, chị chính là con đàn bà đó.', context: 'Lộ thân phận / Lật kèo' },
  { id: 'chiphien_amtham', persona: 'chiphien', label: 'Làm âm thầm sao nổi tiếng được', quote: 'Nếu mà chị làm trong âm thầm thì làm sao chị có thể nổi tiếng được?', context: 'Gáy / Lật bài' },
  { id: 'chiphien_thichvay', persona: 'chiphien', label: 'Tao thích như vậy đó', quote: 'Trời, tao thích như vậy đó.', context: 'Vui / Gáy' },
  { id: 'chiphien_ngatdungcho', persona: 'chiphien', label: 'Chị biết ngắt đúng chỗ đúng lúc', quote: 'Tại vì chị biết ngắt đúng chỗ đúng lúc.', context: 'Gáy / Đoán trúng' },
  { id: 'chiphien_chinhkien', persona: 'chiphien', label: 'Phụ nữ chính kiến 5.0', quote: 'Em phải là một người phụ nữ chính kiến 5.0.', context: 'Động viên / Tha' },
  { id: 'chiphien_30thangchong', persona: 'chiphien', label: 'Chị đã quen 30 thằng chồng rồi', quote: 'Chị là người thất bại trong tình cảm, chị đã quen 30 thằng chồng rồi.', context: 'Thua / Tấu hài' },
  { id: 'chiphien_loiroi', persona: 'chiphien', label: 'Rồi lòi rồi, xin lỗi nha', quote: 'Ồ đất ơi, rồi lòi rồi, chết thôi, xin lỗi nha.', context: 'Bị lộ / Đoán sai' },
  { id: 'chiphien_ditu', persona: 'chiphien', label: 'Em đi tu cho chị đi', quote: 'Em đi tu cho chị đi.', context: 'Cà khịa' },
  { id: 'chiphien_doithua', persona: 'chiphien', label: 'Cứ đổ thừa ai được thì đổ thừa', quote: 'Cứ đổ thừa ai được thì cứ đổ thừa, kệ người ta.', context: 'Chối tội' },
  { id: 'chiphien_xutoido', persona: 'chiphien', label: 'Kêu tới đâu xử tới đó, đánh đi', quote: 'Giờ kêu tới đâu thì xử tới đó. Đánh đi!', context: 'Vào lượt / Ra đòn' },
  { id: 'chiphien_khongnoigi', persona: 'chiphien', label: 'Chị đâu có nói gì đâu em yêu', quote: 'Chị đâu có nói gì đâu em yêu ơi.', context: 'Chối tội' },
  { id: 'chiphien_loichivo', persona: 'chiphien', label: 'Sao cứ lôi chị vô hoài vậy?', quote: 'Ủa sao cứ lôi chị vô cái drama này hoài vậy? Chị đâu có muốn đâu em ơi.', context: 'Bị tố / Xin tha' },
  { id: 'chiphien_khongtontrong', persona: 'chiphien', label: 'Mày không có tôn trọng tao', quote: 'Mày vô mày nói chuyện vậy kia, mày không có tôn trọng tao.', context: 'Tố cáo / Gắt' },
  { id: 'chiphien_nuoiong', persona: 'chiphien', label: 'Nuôi ong tay áo', quote: 'Em sống á là em phải biết kính trên nhường dưới. Trời ơi, nuôi ong tay áo.', context: 'Bắt phản bội / Cà khịa' },
  { id: 'chiphien_manhme', persona: 'chiphien', label: 'Mạnh mẽ lên, em sẽ vượt qua', quote: 'Mạnh mẽ lên cho chị. Chỉ có 3 ngày 5 ngày thôi là chị tin là em sẽ vượt qua.', context: 'Động viên / Thoát nạn' },
  { id: 'chiphien_blockbanhbeo', persona: 'chiphien', label: 'Block con bánh bèo đó cho tao', quote: 'Cái gì vậy? Block cái con bánh bèo đó cho tao!', context: 'Bỏ phiếu loại / Gắt' },
  { id: 'chiphien_dungghep', persona: 'chiphien', label: 'Tao bán hàng, đừng vô ghẹo chị', quote: 'Tao nói tao bán hàng, đừng có vô ghẹo chị nha.', context: 'Bị chọc / Hối' },
  { id: 'chiphien_thongminh', persona: 'chiphien', label: 'Chị là người thông minh nhanh nhẹn', quote: 'Chị là người thông minh, là người nhanh nhẹn.', context: 'Gáy / Đoán trúng' },
  { id: 'chiphien_dangngo', persona: 'chiphien', label: 'Ai làm gì mà đáng ngờ?', quote: 'Ai làm gì mà đáng ngờ? Ủa ai làm gì mà đáng ngờ?', context: 'Biện minh lúc bị nghi' },
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
  linda: ['linda_airanh', 'linda_ancutheo', 'linda_banoi', 'linda_botkhung', 'linda_buoitoivuive', 'linda_chao', 'linda_chicho', 'linda_chodegiatao', 'linda_cuutoibacon', 'linda_dangcap', 'linda_dohamcau', 'linda_ecaijztroi', 'linda_emquaday', 'linda_hongnho', 'linda_iaxochon', 'linda_khongchameday', 'linda_khungdiensuunhi', 'linda_level', 'linda_maccuoi', 'linda_meoicuucon', 'linda_moimocra', 'linda_namdauquay', 'linda_quanquedo_ban', 'linda_que', 'linda_retienthem', 'linda_thaloi', 'linda_toasang', 'linda_trolai', 'linda_uongnuocmia', 'linda_xuongnuiquay', 'linda_batoi', 'linda_cauhoncauhon', 'linda_botragiumcon', 'linda_byebyeolala', 'linda_coghettoi', 'linda_aotuong', 'linda_aicungxau', 'linda_chuatienan', 'linda_chuaduocyeu', 'linda_chuaailuadoi', 'linda_xinloime', 'linda_khongaithuonghai', 'linda_khongdieukien', 'linda_sauraycodieukien', 'linda_khongchuiboinua', 'linda_batngocacban', 'linda_chuahoimaykhai', 'linda_duonghuongthien', 'linda_camonem', 'linda_nguocdoi', 'linda_daynaucanh', 'linda_quentoikhet', 'linda_lanvaobep', 'linda_hienhau', 'linda_quenkeo', 'linda_thatim', 'linda_khongthachomay', 'linda_tinhyeucuatrinh', 'linda_tuclam', 'linda_khongbomieng', 'linda_cotiendulich', 'linda_ngotnam', 'linda_chaomungamthuc', 'linda_ngonroiday', 'linda_suchutcuaco', 'linda_tienganh', 'linda_cuoixinh', 'linda_bochuithe'],
  minhhieu: ['minhhieu_1000do', 'minhhieu_10trieu', 'minhhieu_cadonhuquy', 'minhhieu_camtiendo_dq', 'minhhieu_conquyxao', 'minhhieu_cuutoi', 'minhhieu_duongquyen', 'minhhieu_hoihan', 'minhhieu_khoe', 'minhhieu_khungthichet', 'minhhieu_laytienche', 'minhhieu_lubu', 'minhhieu_maccuoi', 'minhhieu_matphoiphoi', 'minhhieu_muonkhoc', 'minhhieu_nganruoido', 'minhhieu_rotmuocmat', 'minhhieu_soqua', 'minhhieu_tienchicho', 'minhhieu_tiendo_quat', 'minhhieu_tiendohay', 'minhhieu_tiendomat', 'minhhieu_tientuoi', 'minhhieu_tinhlai', 'minhhieu_chaomayanh', 'minhhieu_soquakhongbiet', 'minhhieu_xinloithathu', 'minhhieu_noiduakhongchui', 'minhhieu_hettrontien', 'minhhieu_voduyen', 'minhhieu_saokhongdo', 'minhhieu_themngando', 'minhhieu_xammuongiangho', 'minhhieu_divedicha', 'minhhieu_cotiendikhong', 'minhhieu_buonghe', 'minhhieu_dungdieuqua', 'minhhieu_canvang', 'minhhieu_xaolao', 'minhhieu_byebye', 'minhhieu_dienhoai', 'minhhieu_hetpin', 'minhhieu_matsangsua', 'minhhieu_fanmanh', 'minhhieu_muanhachucty', 'minhhieu_muadi', 'minhhieu_chotdonkhongaimua', 'minhhieu_chotdonquatroi', 'minhhieu_vangthat', 'minhhieu_disingapore', 'minhhieu_dexnoiten', 'minhhieu_hellomayem', 'minhhieu_khuyroi', 'minhhieu_xinchaomaycon', 'minhhieu_kicucvay', 'minhhieu_taodaymay', 'minhhieu_khongchuikhongngu', 'minhhieu_nguoitathuong', 'minhhieu_metkhach', 'minhhieu_dethuongkhong', 'minhhieu_giauhontao', 'minhhieu_baikinhte'],
  phuonghang: ['phuonghang_50tuoi', 'phuonghang_cangchuicangdien', 'phuonghang_chanhcho_ngu', 'phuonghang_chanly', 'phuonghang_chomochui', 'phuonghang_chuabaogiobochay', 'phuonghang_connguo_nao', 'phuonghang_dosup', 'phuonghang_dungdien', 'phuonghang_dunglacham', 'phuonghang_haoquang', 'phuonghang_khonhon', 'phuonghang_kimcuong', 'phuonghang_laokhongduoc', 'phuonghang_laymayxuithem', 'phuonghang_luadao', 'phuonghang_motminhtao', 'phuonghang_ngongang', 'phuonghang_nguyhiem', 'phuonghang_quantutrathu', 'phuonghang_taophaimatday', 'phuonghang_thanhcong', 'phuonghang_thayvay', 'phuonghang_tienphuongtien', 'phuonghang_tinhhinh', 'phuonghang_trongcuoc', 'phuonghang_tubitritue', 'phuonghang_tuongvay', 'phuonghang_voquytday', 'phuonghang_khonggikhongthe', 'phuonghang_coloiqua', 'phuonghang_emdepkhong', 'phuonghang_tulamdep', 'phuonghang_tientrongnao', 'phuonghang_lieugan', 'phuonghang_hoanhap', 'phuonghang_khonganbam', 'phuonghang_toidadu', 'phuonghang_lamchucuocchoi', 'phuonghang_suthatloira', 'phuonghang_saodola', 'phuonghang_chuyennhieu', 'phuonghang_trathu', 'phuonghang_nomoney', 'phuonghang_chiuduockhong', 'phuonghang_bominhde', 'phuonghang_thangheo', 'phuonghang_khongbietlamsao', 'phuonghang_nguoigiau', 'phuonghang_khongquygoi', 'phuonghang_tienrotnuocmat', 'phuonghang_emtonthuong', 'phuonghang_choiluon', 'phuonghang_bagai', 'phuonghang_tuithan', 'phuonghang_tientuibay', 'phuonghang_noitieng', 'phuonghang_ngheokhongtoi', 'phuonghang_canhcua', 'phuonghang_thuongbanthan', 'phuonghang_lietsi'],
  chiphien: ['chiphien_30ty', 'chiphien_aiepmay', 'chiphien_bonghong', 'chiphien_capdoimanh', 'chiphien_chinhquyenbat', 'chiphien_chitoitiec', 'chiphien_depxuatsac', 'chiphien_dingu', 'chiphien_hoahau', 'chiphien_hoahauphukhoa', 'chiphien_ke_trithuc_do', 'chiphien_kemay', 'chiphien_kholam', 'chiphien_khongbannua_chet', 'chiphien_khongvon', 'chiphien_khonlamkeme', 'chiphien_lendonchet', 'chiphien_loilam', 'chiphien_maydien', 'chiphien_metlamroi', 'chiphien_miengdat', 'chiphien_nhinchidi', 'chiphien_odaumaxai', 'chiphien_sochongboss', 'chiphien_taisancuachi', 'chiphien_taividepqua', 'chiphien_villa', 'chiphien_xetda8cai', 'chiphien_xinhdep', 'chiphien_conghenoi', 'chiphien_noihay', 'chiphien_dongluc', 'chiphien_thomsangtrong', 'chiphien_thatbainamdo', 'chiphien_laycaisai', 'chiphien_cuuchi', 'chiphien_bihai', 'chiphien_bacodoi', 'chiphien_chuadukho', 'chiphien_khongmuonon', 'chiphien_chotdonnha', 'chiphien_ghequa', 'chiphien_daoboi', 'chiphien_giaubaonam', 'chiphien_conbado', 'chiphien_amtham', 'chiphien_thichvay', 'chiphien_ngatdungcho', 'chiphien_chinhkien', 'chiphien_30thangchong', 'chiphien_loiroi', 'chiphien_ditu', 'chiphien_doithua', 'chiphien_xutoido', 'chiphien_khongnoigi', 'chiphien_loichivo', 'chiphien_khongtontrong', 'chiphien_nuoiong', 'chiphien_manhme', 'chiphien_blockbanhbeo', 'chiphien_dungghep', 'chiphien_thongminh', 'chiphien_dangngo'],
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
