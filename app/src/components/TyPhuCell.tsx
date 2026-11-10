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
  start: { bg: '#CFF5E3', band: '#0FA37F' },
  jail: { bg: '#FFE0B8', band: '#F08C00' },
  rest: { bg: '#D6EEFF', band: '#339AF0' },
  gotojail: { bg: '#FFD4D4', band: '#E03131' },
  chance: { bg: '#FFF1B8', band: '#FFC21A' },
  community: { bg: '#FFD9EC', band: '#FF6FA5' },
  station: { bg: '#E3E7F2', band: '#5C6B8C' },
  utility: { bg: '#E0F7FA', band: '#15AABF' },
  tax: { bg: '#FFE4D6', band: '#E8590C' },
};

/** Một ô bàn cờ dạng in sẵn: dải màu nhóm đất ở cạnh hướng vào tâm, TÊN to ở giữa, GIÁ to ở cạnh ngoài. Icon chỉ ở ô đặc biệt. */
export const TyPhuCell = memo(function TyPhuCell(p: TyPhuCellProps) {
  const c = TYPHU_BOARD[p.index];
  const owned = p.ownerHex !== null;
  const corner = p.side === 'corner';
  const sp = SPECIAL[c.kind];
  const isLand = c.kind === 'land';
  const group = isLand ? TYPHU_GROUPS[c.group].color : sp.band;
  const price = isTyPhuProperty(c) ? c.price : c.kind === 'tax' ? c.amount : null;
  const name = shortCellName(c.name);
  const label = `${p.index + 1}. ${c.name}${p.ownerName ? `, thuộc ${p.ownerName}` : ''}${price !== null ? `, ${c.kind === 'tax' ? 'nộp' : 'giá'} ${price} xu` : ''}`;
  const frame = [
    styles.cell,
    { left: p.x, top: p.y, width: p.w, height: p.h, backgroundColor: owned ? p.ownerLight! : isLand ? '#FFFEF8' : sp.bg },
    owned && { borderColor: p.ownerHex!, borderWidth: 2.5 },
    p.isTrail && styles.trail,
    p.isStepTarget && styles.step,
    p.here && styles.here,
  ];
  const hotel = p.houses >= TYPHU_MAX_HOUSES;
  const houseBits = p.houses > 0 ? (
    <View style={[styles.houseBits, (p.side === 'left' || p.side === 'right') && { flexDirection: 'column' }]}>
      <Image source={{ uri: hotel ? FX_ICON.hotel : FX_ICON.house }} style={styles.houseIcon} />
      {!hotel && <T style={styles.houseNum}>{p.houses}</T>}
    </View>
  ) : null;
  const priceTxt = price === null ? '' : c.kind === 'tax' ? `-${price}` : `${price}`;

  if (corner) {
    const cf = Math.max(12, Math.min(16, p.h * 0.26));
    const icon = Math.max(18, Math.min(p.h - cf * 2 - 10, p.w * 0.5, 40));
    return (
      <Pressable testID={`cell-${p.index}`} accessibilityRole="button" accessibilityLabel={label} onPress={() => p.onPress(p.index)} style={[...frame, styles.cornerCell, { borderColor: owned ? p.ownerHex! : C.ink }]}>
        <View style={[styles.cornerBand, { backgroundColor: sp.band }]} />
        <Image source={{ uri: ICON_BY_CELL[p.index] }} style={{ width: icon, height: icon, marginTop: 4 }} />
        <T numberOfLines={1} style={[styles.cornerName, { fontSize: cf, lineHeight: cf + 2 }]}>{name}</T>
      </Pressable>
    );
  }

  const horiz = p.side === 'top' || p.side === 'bottom'; // ô ở hàng trên/dưới: dải màu nằm ngang
  const bt = horiz ? Math.max(12, Math.round(p.h * 0.24)) : Math.max(10, Math.round(p.w * 0.13));
  const bandStyle =
    p.side === 'top' ? { top: 0, left: 0, right: 0, height: bt }
    : p.side === 'bottom' ? { bottom: 0, left: 0, right: 0, height: bt }
    : p.side === 'left' ? { left: 0, top: 0, bottom: 0, width: bt }
    : { right: 0, top: 0, bottom: 0, width: bt };
  const inset =
    p.side === 'top' ? { paddingTop: bt } : p.side === 'bottom' ? { paddingBottom: bt }
    : p.side === 'left' ? { paddingLeft: bt } : { paddingRight: bt };
  const face = owned ? <Image source={{ uri: p.ownerPortrait! }} style={styles.ownerFace} /> : null;
  const iconEl = !isLand ? <Image source={{ uri: ICON_BY_CELL[p.index] }} style={horiz ? { width: Math.min(22, p.h * 0.38), height: Math.min(22, p.h * 0.38) } : { width: 18, height: 18 }} /> : null;
  const nameSize = horiz ? Math.max(12, Math.min(15, p.w / 6.2)) : 12.5;

  return (
    <Pressable testID={`cell-${p.index}`} accessibilityRole="button" accessibilityLabel={label} onPress={() => p.onPress(p.index)} style={frame}>
      <View style={[styles.band, bandStyle, { backgroundColor: group }, horiz ? styles.bandRow : styles.bandCol]}>
        {horiz && face}
        {houseBits}
      </View>
      {horiz ? (
        <View style={[styles.inner, inset, { justifyContent: 'space-between', paddingVertical: 1, flexDirection: p.side === 'bottom' ? 'column-reverse' : 'column' }]}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 3 }}>
            {iconEl}
            <T numberOfLines={2} style={[styles.name, { fontSize: nameSize, lineHeight: nameSize + 1, flexShrink: 1 }]}>{name}</T>
          </View>
          {priceTxt !== '' && <T style={[styles.priceBig, { fontSize: Math.max(13, Math.min(16, p.h * 0.28)) }]}>{priceTxt}</T>}
        </View>
      ) : (
        <View style={[styles.inner, inset, styles.innerRow]}>
          {!horiz && face}
          {iconEl}
          <T numberOfLines={2} style={[styles.name, { fontSize: nameSize, lineHeight: nameSize + 1, flex: 1, textAlign: 'left' }]}>{name}</T>
          {priceTxt !== '' && <T style={[styles.priceBig, { fontSize: 14 }]}>{priceTxt}</T>}
        </View>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  cell: { position: 'absolute', borderWidth: 1, borderColor: '#3A3A3A', overflow: 'hidden' },
  trail: { backgroundColor: '#FFF3BF' },
  step: { borderColor: C.gold, borderWidth: 3 },
  here: { borderColor: C.son, borderWidth: 3.5 },
  band: { position: 'absolute', borderColor: C.ink },
  bandRow: { alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 },
  bandCol: { alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1 },
  inner: { flex: 1, alignItems: 'center', paddingHorizontal: 2 },
  innerRow: { flexDirection: 'row', gap: 3, paddingHorizontal: 4 },
  name: { color: C.ink, fontWeight: '800', textAlign: 'center' },
  priceBig: { color: C.ink, fontWeight: '900' },
  ownerFace: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#fff', borderWidth: 1, borderColor: '#fff' },
  houseBits: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  houseIcon: { width: 11, height: 11 },
  houseNum: { color: '#fff', fontWeight: '900', fontSize: 10, lineHeight: 11, textShadowColor: C.ink, textShadowRadius: 1 },
  cornerCell: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  cornerBand: { position: 'absolute', top: 0, left: 0, right: 0, height: 6 },
  cornerName: { color: C.ink, fontWeight: '900', textAlign: 'center', marginTop: 2 },
});
