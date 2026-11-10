/** Tên ngắn hiển thị trên ô bàn cờ Tỷ phú (ô nhỏ trên điện thoại). Tên đầy đủ vẫn dùng ở bảng chi tiết. */
export const TYPHU_SHORT_NAMES: Record<string, string> = {
  'Buôn Ma Thuột': 'Buôn Mê',
  'Hải Phòng': 'HP',
  'Bình Dương': 'Bình D.',
  'Ga miền Tây': 'Ga Tây',
  'Ga miền Trung': 'Ga Trung',
  'Ga miền Bắc': 'Ga Bắc',
  'Ga miền Nam': 'Ga Nam',
  'Công ty điện': 'Cty điện',
  'Công ty nước': 'Cty nước',
  'Thuế thu nhập': 'Thuế TN',
  'Thuế xa xỉ': 'Thuế XX',
};

export const shortCellName = (name: string) => TYPHU_SHORT_NAMES[name] ?? name;
