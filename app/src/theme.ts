/** Bảng màu & kiểu chữ "Xóm Lầy": đỏ son, vàng kim, mực, kiểu sticker viền dày */
export const C = {
  son: '#B5121B', // nền
  sonDark: '#8E0D14',
  gold: '#FFC21A', // nút chính
  ink: '#2A0A10', // viền, chữ
  paper: '#FFFFFF', // thẻ
  mist: '#F6E9E4', // nền phụ trong thẻ
  muted: '#7A5A5E',
  jade: '#0FA37F', // tới lượt / thắng
  lotus: '#FF6FA5', // hiệu ứng vui
  danger: '#E5383B',
  onSon: '#FFE7C2', // chữ phụ trên nền đỏ
};

export const FONT = "'Be Vietnam Pro', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

/** bóng đổ đặc kiểu sticker (không nhòe) */
export const sticker = (dy = 4) => ({
  borderWidth: 2.5,
  borderColor: C.ink,
  shadowColor: C.ink,
  shadowOffset: { width: 0, height: dy },
  shadowOpacity: 1,
  shadowRadius: 0,
});
