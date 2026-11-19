import { Platform } from 'react-native';
import { themeById } from '../../shared/src/themes';

/**
 * Hệ thống Design Tokens thống nhất cho Xóm Lầy theo hướng Warm Paper & Ink Parlor:
 * - Bề mặt giấy ấm (`#FDFBF7`), giấy parchment (`#F6F2EA`), nhấn nét mảnh (`1px`),
 *   mực than chì (`#1F1B16`) và bảng đêm (`#11141C` / `#1A1E28`) cho các màn/map tối.
 */
export const C = {
  son: '#9F2B36', // đỏ son trầm tinh tế
  sonDark: '#6E1922',
  gold: '#F59E0B', // hổ phách nhấn
  goldDeep: '#B45309',
  goldSoft: '#FEF3C7',
  ink: '#1F1B16', // chữ & viền mực chính
  secondary: '#5E554A',
  paper: '#FDFBF7', // thẻ bài giấy ngà ấm
  parchment: '#F6F2EA', // nền bàn chơi chính
  mist: '#EFEAE0', // bề mặt phụ / nút trung tính
  muted: '#7B7266', // chữ phụ
  jade: '#15803D', // tới lượt / xác nhận
  jadeDeep: '#166534',
  jadeSoft: '#F0FDF4',
  lotus: '#BE185D',
  danger: '#B91C1C', // báo lỗi / loại
  dangerSoft: '#FEF2F2',
  violet: '#5B21B6',
  cyan: '#0E7490',
  brass: '#8C7A64',
  onSon: '#FBF9F5',
  glassDark: 'rgba(31, 27, 22, 0.72)',
  glassLight: 'rgba(253, 251, 247, 0.94)',
  borderSubtle: 'rgba(31, 27, 22, 0.10)',
  borderStrong: 'rgba(31, 27, 22, 0.18)',
  darkBg: '#11141C',
  darkSurface: '#1A1E28',
  darkSubtle: '#232836',
  darkBorder: 'rgba(251, 249, 245, 0.12)',
  darkText: '#FBF9F5',
  darkMuted: 'rgba(251, 249, 245, 0.68)',
};

export const GRADS = {
  gold: ['#F59E0B', '#F59E0B', '#D97706'] as const,
  paper: ['#FDFBF7', '#FDFBF7', '#F6F2EA'] as const,
  ink: ['#1F1B16', '#1F1B16', '#171411'] as const,
  jade: ['#15803D', '#15803D', '#166534'] as const,
  danger: ['#B91C1C', '#B91C1C', '#991B1B'] as const,
  royal: ['#5B21B6', '#5B21B6', '#4C1D95'] as const,
  vipDark: ['#1A1E28', '#11141C', '#1A1E28'] as const,
};

export const FONT =
  Platform.OS === 'web'
    ? "'Be Vietnam Pro', 'BeVietnamPro_600SemiBold', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    : 'BeVietnamPro_600SemiBold';

export const FONT_BOLD = Platform.OS === 'web' ? FONT : 'BeVietnamPro_800ExtraBold';

/** Mặc định (`son_mac_dinh`) dùng nền giấy parchment sáng; các map tối dùng tông tối dễ đọc */
export function isDarkThemeId(themeId?: string): boolean {
  return !!themeId && themeId !== 'son_mac_dinh';
}

export function backdropPalette(themeId?: string) {
  const dark = isDarkThemeId(themeId);
  const t = themeById(themeId);
  if (!dark) {
    return {
      dark: false,
      bg: C.parchment,
      bgAlt: C.mist,
      text: C.ink,
      muted: C.secondary,
      card: C.paper,
      subtle: C.mist,
      hairline: C.borderSubtle,
    };
  }
  return {
    dark: true,
    bg: t.bg,
    bgAlt: t.bgAlt,
    text: C.darkText,
    muted: C.darkMuted,
    card: C.darkSurface,
    subtle: C.darkSubtle,
    hairline: C.darkBorder,
  };
}

/**
 * Độ nổi nhẹ nhàng 1px hairline + bóng trung tính (loại bỏ viền đen thô và môi 3D nặng).
 */
export const sticker = (dy = 2): Record<string, unknown> => {
  const subtle = dy <= 1;
  if (Platform.OS === 'web') {
    return {
      borderWidth: 1,
      borderColor: C.borderSubtle,
      boxShadow: subtle
        ? '0 1px 2px rgba(31, 27, 22, 0.06)'
        : `0 ${Math.max(3, dy * 2)}px ${Math.max(8, dy * 4)}px rgba(31, 27, 22, 0.07)`,
    };
  }
  return {
    borderWidth: 1,
    borderColor: C.borderSubtle,
    shadowColor: '#1F1B16',
    shadowOffset: { width: 0, height: subtle ? 1 : Math.min(4, dy) },
    shadowOpacity: subtle ? 0.05 : 0.08,
    shadowRadius: subtle ? 2 : Math.max(4, dy * 2),
    elevation: subtle ? 1 : Math.min(4, dy),
  };
};
