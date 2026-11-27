/**
 * Nguồn mô hình & tài sản 3D thiết kế v4 cho trò chơi "Sàn Diễn Xóm Lầy" (`thoitrang`).
 * - 6 dáng người toon (nu_manh, nu_day, nam_thu_sinh, nam_vam_vo, chibi, cao_mau),
 *   14 biểu cảm khuôn mặt, 167 món đồ, 15 hoạ tiết & 11 dáng sàn diễn dựng thủ tục bằng Three.js 0.170.0.
 * - Atlas 245 icon (mannequin mờ) sinh tự động qua `npm run build:thoitrang:icons` → `/thoitrang/icons.webp` + `icons.json`.
 */

export const THOI_TRANG_BODY_CREDIT = 'Mô hình 3D toon thiết kế v4 dựng thủ tục hoàn toàn bằng Three.js 0.170.0';

export const THOI_TRANG_ART_SOURCES = [
  {
    name: 'Three.js Toon Engine v4 (Procedural)',
    license: 'MIT (Three.js 0.170.0)',
    url: 'https://threejs.org/',
    note: THOI_TRANG_BODY_CREDIT,
  },
] as const;
