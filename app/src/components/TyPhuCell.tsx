import { memo } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { TYPHU_BOARD, TYPHU_GROUPS, TYPHU_MAX_HOUSES, isTyPhuProperty } from '../../../shared/src/typhu';
import { C } from '../theme';
import { T } from '../ui';
import { shortCellName } from '../typhuNames';
import { FX_ICON } from '../typhuCellIcons';
import { PICTO_BY_CELL as ICON_BY_CELL } from '../typhuPictos';
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

const BOARD_BG = '#CDE6D0';
const INK = '#111';
/** góc quay nội dung từng ô để chữ quay ra mép ngoài như bàn cờ in */
const ROT: Record<string, string> = { top: '0deg', right: '90deg', bottom: '180deg', left: '-90deg' };
const CORNER_ROT: Record<string, string> = { start: '-45deg', jail: '45deg', rest: '135deg', gotojail: '-135deg' };

/** Một ô kiểu bàn cờ in: nền xanh nhạt, viền mảnh, dải màu bộ đất ở mép trong, TÊN in hoa, giá ở mép ngoài. */
export const TyPhuCell = memo(function TyPhuCell(p: TyPhuCellProps) {
  const c = TYPHU_BOARD[p.index];
  const owned = p.ownerHex !== null;
  const isLand = c.kind === 'land';
  const price = isTyPhuProperty(c) ? c.price : c.kind === 'tax' ? c.amount : null;
  const name = shortCellName(c.name).toUpperCase();
  const label = `${p.index + 1}. ${c.name}${p.ownerName ? `, thuộc ${p.ownerName}` : ''}${price !== null ? `, ${c.kind === 'tax' ? 'nộp' : 'giá'} ${price} xu` : ''}`;
  const frame = [
    styles.cell,
    { left: p.x, top: p.y, width: p.w, height: p.h, backgroundColor: owned ? p.ownerLight! : BOARD_BG },
  ];
  const hl = p.here ? C.son : p.isStepTarget || p.isTrail ? C.gold : null;
  const hotel = p.houses >= TYPHU_MAX_HOUSES;
  const face = owned ? <Image source={{ uri: p.ownerPortrait! }} style={[styles.ownerFace, { borderColor: p.ownerHex! }]} /> : null;
  const houses = p.houses > 0 ? (
    <View style={styles.houseBits}>
      <Image source={{ uri: hotel ? FX_ICON.hotel : FX_ICON.house }} style={styles.houseIcon} />
      {!hotel && p.houses > 1 && <T style={styles.houseNum}>{p.houses}</T>}
    </View>
  ) : null;

  if (p.side === 'corner') {
    const box = p.w * 0.8;
    const icon = box * 0.52;
    const fs = Math.max(8, Math.min(13, box / 6.5));
    return (
      <Pressable testID={`cell-${p.index}`} accessibilityRole="button" accessibilityLabel={label} onPress={() => p.onPress(p.index)} style={frame}>
        <View style={[styles.corner, { left: (p.w - box) / 2, top: (p.h - box) / 2, width: box, height: box, transform: [{ rotate: CORNER_ROT[c.kind] ?? '0deg' }] }]}>
          <T numberOfLines={1} style={[styles.cornerName, { fontSize: fs, lineHeight: Math.round(fs * 1.4) }]}>{name}</T>
          <Image source={{ uri: ICON_BY_CELL[p.index] }} style={{ width: icon, height: icon }} resizeMode="contain" />
        </View>
        {hl && <View pointerEvents="none" style={[styles.hl, { borderColor: hl }]} />}
      </Pressable>
    );
  }

  const horiz = p.side === 'top' || p.side === 'bottom';
  const W = horiz ? p.w : p.h; // chiều dọc theo mép bàn
  const H = horiz ? p.h : p.w; // chiều sâu vào trong
  const nameSize = Math.max(7, Math.min(11, W / 5));
  const priceSize = Math.max(7.5, Math.min(11, W / 4.6));
  const priceTxt = price === null ? '' : c.kind === 'tax' ? `NỘP ${price}` : `${price} xu`;
  const iconSize = Math.min(W * 0.78, H * 0.42);

  return (
    <Pressable testID={`cell-${p.index}`} accessibilityRole="button" accessibilityLabel={label} onPress={() => p.onPress(p.index)} style={frame}>
      <View style={[styles.upright, { width: W, height: H, left: (p.w - W) / 2, top: (p.h - H) / 2, transform: [{ rotate: ROT[p.side] }] }]}>
        {isLand ? (
          <View style={[styles.band, { height: H * 0.22, backgroundColor: TYPHU_GROUPS[c.group].color }]}>
            {face}{houses}
          </View>
        ) : face ? <View style={[styles.specialFace, { height: H * 0.2 }]}>{face}</View> : null}
        <T numberOfLines={2} style={[styles.name, { fontSize: nameSize, lineHeight: Math.round(nameSize * 1.4), marginTop: isLand || face ? 1 : 3 }]}>{name}</T>
        <View style={styles.mid}>
          {!isLand && <Image source={{ uri: ICON_BY_CELL[p.index] }} style={{ width: iconSize, height: iconSize }} resizeMode="contain" />}
        </View>
        {priceTxt !== '' && <T numberOfLines={1} style={[styles.price, { fontSize: priceSize, lineHeight: Math.round(priceSize * 1.4) }]}>{priceTxt}</T>}
      </View>
      {hl && <View pointerEvents="none" style={[styles.hl, { borderColor: hl }]} />}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  cell: { position: 'absolute', borderWidth: 0.75, borderColor: INK, overflow: 'hidden' },
  upright: { position: 'absolute', alignItems: 'center' },
  band: { alignSelf: 'stretch', borderBottomWidth: 0.75, borderColor: INK, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
  specialFace: { alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  name: { color: INK, fontWeight: '700', textAlign: 'center', paddingHorizontal: 1, letterSpacing: -0.2 },
  mid: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  price: { color: INK, fontWeight: '700', textAlign: 'center', marginBottom: 3 },
  hl: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, borderWidth: 3 },
  ownerFace: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff', borderWidth: 1.5 },
  houseBits: { flexDirection: 'row', alignItems: 'center' },
  houseIcon: { width: 12, height: 12 },
  houseNum: { color: INK, fontWeight: '900', fontSize: 9, lineHeight: 11 },
  corner: { position: 'absolute', alignItems: 'center', justifyContent: 'center', gap: 2 },
  cornerName: { color: INK, fontWeight: '800', textAlign: 'center' },
});
