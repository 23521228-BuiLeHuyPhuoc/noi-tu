/** Tên ngắn hiển thị trên ô bàn cờ Tỷ phú (ô nhỏ trên điện thoại, tự xuống dòng). Tên đầy đủ vẫn dùng ở bảng chi tiết. */
export const TYPHU_SHORT_NAMES: Record<string, string> = {
  'Buôn Ma Thuột': 'Buôn Mê',
  'Ga miền Tây': 'Ga Tây',
  'Ga miền Trung': 'Ga Trung',
  'Ga miền Bắc': 'Ga Bắc',
  'Ga miền Nam': 'Ga Nam',
  'Công ty điện': 'Điện',
  'Công ty nước': 'Nước',
  'Thuế thu nhập': 'Thuế',
  'Thuế xa xỉ': 'Thuế xa xỉ',
};

export const shortCellName = (name: string) => TYPHU_SHORT_NAMES[name] ?? name;
