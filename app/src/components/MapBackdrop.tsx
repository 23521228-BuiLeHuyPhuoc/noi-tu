/**
 * Nền Map & Chủ Đề Phòng (Unslopped Warm Parchment / Quiet Dark Tonal Ramp):
 * - Mặc định (`son_mac_dinh`): nền giấy parchment dịu mắt (`#F6F2EA` -> `#EFEAE0`) tôn nổi bàn chơi & thẻ bài.
 * - Các map tối / ban đêm dùng dải màu tối đồng nhất (`#11141C` -> `#1A1E28` hoặc tông trầm riêng),
 *   loại bỏ hoàn toàn đốm màu neon và hạt emoji bay gây rối mắt.
 */
import { memo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { themeById, type RoomTheme } from '../../../shared/src/themes';
import { C, isDarkThemeId } from '../theme';

const web = (o: Record<string, unknown>) => (Platform.OS === 'web' ? (o as object) : {});

function backgroundGradient(t: RoomTheme): string {
  if (!isDarkThemeId(t.id)) {
    return `linear-gradient(180deg, ${C.parchment} 0%, ${C.mist} 100%)`;
  }
  if (t.id === 'dem_trang_soi') {
    return `linear-gradient(175deg, ${C.darkBg} 0%, ${C.darkSurface} 100%)`;
  }
  return `linear-gradient(175deg, ${t.bg} 0%, ${t.bgAlt} 100%)`;
}

export const MapBackdrop = memo(function MapBackdrop({
  themeId,
  smooth: _smooth = false,
}: {
  themeId?: string;
  smooth?: boolean;
}) {
  const theme = themeById(themeId);
  const baseBg = isDarkThemeId(theme.id) ? theme.bg : C.parchment;

  return (
    <View
      testID={`map-backdrop-${theme.id}`}
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: baseBg, overflow: 'hidden' },
        web({ backgroundImage: backgroundGradient(theme) }),
      ]}
    />
  );
});
