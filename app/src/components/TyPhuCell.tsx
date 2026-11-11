import { memo } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { TYPHU_BOARD, TYPHU_GROUPS, TYPHU_MAX_HOUSES, isTyPhuProperty } from '../../../shared/src/typhu';
import { C } from '../theme';
import { T } from '../ui';
import { shortCellName } from '../typhuNames';
import { FX_ICON, ICON_BY_CELL } from '../typhuCellIcons';
import type { BandSide } from '../typhuLayout';

export interface TyPhuCellProps {
  index: number;
  x: number;
  y: number;
  w: number;
  h: number;
  side: BandSide;
  ownerName: string | null;
  ownerHex: string | null;
  ownerLight: string | null;
  ownerPortrait: string | null;
  houses: number;
  /** đang chờ quyết định mua ở ô này */
  here: boolean;
  isTrail: boolean;
  isStepTarget: boolean;
  onPress: (i: number) => void;
}

/** màu nền + dải cho ô đặc biệt (không thuộc bộ đất) */
const SPECIAL: Record<string, { bg: string; band: string }> = {
  start: { bg: '#B2F2BB', band: '#2F9E44' },
  jail: { bg: '#DEE2E6', band: '#868E96' },
  rest: { bg: '#C3FAE8', band: '#12B886' },
  gotojail: { bg: '#E5DBFF', band: '#7950F2' },
  chance: { bg: '#FFE8CC', band: '#FD7E14' },
  community: { bg: '#FFDEEB', band: '#E64980' },
  station: { bg: '#E9ECEF', band: '#495057' },
  utility: { bg: '#E3F6FF', band: '#228BE6' },
  tax: { bg: '#FFF3BF', band: '#F59F00' },
};

/** pha màu với trắng để làm nền nhạt cho ô đất */
function tint(hex: string, k = 0.8): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (v: number) => Math.round(v + (255 - v) * k);
  return `rgb(${mix(n >> 16)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}

/** Một ô bàn cờ: thẻ bo tròn nền nhạt theo nhóm, dải màu ở cạnh hướng vào tâm, TÊN + GIÁ chữ to. Icon chỉ ở ô đặc biệt. */
export const TyPhuCell = memo(function TyPhuCell(p: TyPhuCellProps) {
  const c = TYPHU_BOARD[p.index];
  const owned = p.ownerHex !== null;
  const corner = p.side === 'corner';
  const sp = SPECIAL[c.kind];
  const isLand = c.kind === 'land';
  const band = isLand ? TYPHU_GROUPS[c.group].color : sp.band;
  const bg = isLand ? tint(band) : sp.bg;
  const price = isTyPhuProperty(c) ? c.price : c.kind === 'tax' ? c.amount : null;
  const name = shortCellName(c.name);
  const label = `${p.index + 1}. ${c.name}${p.ownerName ? `, thuộc ${p.ownerName}` : ''}${price !== null ? `, ${c.kind === 'tax' ? 'nộp' : 'giá'} ${price} xu` : ''}`;
  const frame = [
    styles.cell,
    { left: p.x, top: p.y, width: p.w, height: p.h, backgroundColor: bg },
    owned && { borderColor: p.ownerHex!, borderWidth: 3 },
    p.isTrail && styles.trail,
    p.isStepTarget && styles.step,
    p.here && styles.here,
  ];
  const hotel = p.houses >= TYPHU_MAX_HOUSES;
  const priceTxt = price === null ? '' : c.kind === 'tax' ? `-${price}` : `${price}`;
  const badges = (
    <View style={styles.badges} pointerEvents="none">
      {p.houses > 0 && (
        <View style={styles.houseBits}>
          <Image source={{ uri: hotel ? FX_ICON.hotel : FX_ICON.house }} style={styles.houseIcon} />
          {!hotel && p.houses > 1 && <T style={styles.houseNum}>{p.houses}</T>}
        </View>
      )}
      {owned && <Image source={{ uri: p.ownerPortrait! }} style={[styles.ownerFace, { borderColor: p.ownerHex! }]} />}
    </View>
  );

  if (corner) {
    const cf = Math.max(12, Math.min(16, p.h * 0.17));
    const icon = Math.max(22, Math.min(p.h - cf - 16, p.w * 0.45, 44));
    return (
      <Pressable testID={`cell-${p.index}`} accessibilityRole="button" accessibilityLabel={label} onPress={() => p.onPress(p.index)} style={[...frame, styles.cornerCell]}>
        <Image source={{ uri: ICON_BY_CELL[p.index] }} style={{ width: icon, height: icon }} />
        <T numberOfLines={1} adjustsFontSizeToFit style={[styles.cornerName, { fontSize: cf, lineHeight: cf + 3 }]}>{name}</T>
      </Pressable>
    );
  }

  const horiz = p.side === 'top' || p.side === 'bottom';
  const bt = 6; // độ dày dải màu
  const bandStyle =
    p.side === 'top' ? { top: 0, left: 0, right: 0, height: bt }
    : p.side === 'bottom' ? { bottom: 0, left: 0, right: 0, height: bt }
    : p.side === 'left' ? { left: 0, top: 0, bottom: 0, width: bt }
    : { right: 0, top: 0, bottom: 0, width: bt };
  const inset =
    p.side === 'top' ? { paddingTop: bt } : p.side === 'bottom' ? { paddingBottom: bt }
    : p.side === 'left' ? { paddingLeft: bt } : { paddingRight: bt };
  const nameSize = horiz ? Math.max(11, Math.min(14, p.w / 6)) : Math.max(11, Math.min(14, p.h * 0.28));
  const priceSize = horiz ? Math.max(13, Math.min(18, p.h * 0.24)) : Math.max(13, Math.min(17, p.h * 0.34));
  const iconSize = horiz ? Math.max(14, Math.min(22, p.h * 0.26)) : Math.max(16, Math.min(24, p.h * 0.5));
  const iconEl = !isLand ? <Image source={{ uri: ICON_BY_CELL[p.index] }} style={{ width: iconSize, height: iconSize }} /> : null;

  return (
    <Pressable testID={`cell-${p.index}`} accessibilityRole="button" accessibilityLabel={label} onPress={() => p.onPress(p.index)} style={frame}>
      <View style={[styles.band, bandStyle, { backgroundColor: band }]} />
      {horiz ? (
        <View style={[styles.inner, inset]}>
          {iconEl}
          <T numberOfLines={2} style={[styles.name, { fontSize: nameSize, lineHeight: nameSize + 2 }]}>{name}</T>
          {priceTxt !== '' && <T style={[styles.price, { fontSize: priceSize, lineHeight: priceSize + 2 }]}>{priceTxt}</T>}
        </View>
      ) : (
        <View style={[styles.innerRow, inset]}>
          {iconEl}
          <View style={{ flex: 1, minWidth: 0 }}>
            <T numberOfLines={2} style={[styles.name, { fontSize: nameSize, lineHeight: nameSize + 2, textAlign: 'left' }]}>{name}</T>
            {priceTxt !== '' && <T style={[styles.price, { fontSize: priceSize, lineHeight: priceSize + 2, textAlign: 'left' }]}>{priceTxt}</T>}
          </View>
        </View>
      )}
      {badges}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  cell: { position: 'absolute', borderRadius: 9, borderWidth: 1.5, borderColor: 'rgba(42,10,16,0.35)', overflow: 'hidden' },
  trail: { borderColor: C.gold, borderWidth: 2.5 },
  step: { borderColor: C.gold, borderWidth: 3 },
  here: { borderColor: C.son, borderWidth: 3.5 },
  band: { position: 'absolute' },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, gap: 1 },
  innerRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8 },
  name: { color: C.ink, fontWeight: '800', textAlign: 'center' },
  price: { color: C.ink, fontWeight: '900', textAlign: 'center' },
  badges: { position: 'absolute', top: 2, right: 2, flexDirection: 'row', alignItems: 'center', gap: 2 },
  ownerFace: { width: 13, height: 13, borderRadius: 7, backgroundColor: '#fff', borderWidth: 1.5 },
  houseBits: { flexDirection: 'row', alignItems: 'center' },
  houseIcon: { width: 13, height: 13 },
  houseNum: { color: C.ink, fontWeight: '900', fontSize: 10, lineHeight: 12 },
  cornerCell: { alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(42,10,16,0.45)' },
  cornerName: { color: C.ink, fontWeight: '900', textAlign: 'center' },
});
