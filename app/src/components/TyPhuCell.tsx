import { memo } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { TYPHU_BOARD, TYPHU_GROUPS, TYPHU_MAX_HOUSES, isTyPhuProperty } from '../../../shared/src/typhu';
import { C } from '../theme';
import { T } from '../ui';
import { shortCellName } from '../typhuNames';
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

/** Nhà cấp 1-3: nhà xanh nhỏ; cấp 4: khách sạn đỏ. `vertical`: xếp dọc (ô ở cạnh bên). */
function Houses({ n, vertical }: { n: number; vertical: boolean }) {
  if (n <= 0) return null;
  if (n >= TYPHU_MAX_HOUSES) return <View style={[styles.hotel, vertical && { width: 7, height: 13 }]} />;
  return (
    <View style={{ flexDirection: vertical ? 'column' : 'row', gap: 1.5 }}>
      {Array.from({ length: n }, (_, k) => <View key={k} style={styles.house} />)}
    </View>
  );
}

/** Một ô kiểu bàn cờ in, chữ luôn xuôi theo hướng người cầm máy: dải màu bộ đất ở mép trong, TÊN in hoa, giá ở mép ngoài. */
export const TyPhuCell = memo(function TyPhuCell(p: TyPhuCellProps) {
  const c = TYPHU_BOARD[p.index];
  const owned = p.ownerHex !== null;
  const isLand = c.kind === 'land';
  const price = isTyPhuProperty(c) ? c.price : c.kind === 'tax' ? c.amount : null;
  const name = shortCellName(c.name).toUpperCase();
  const label = `${p.index + 1}. ${c.name}${p.ownerName ? `, thuộc ${p.ownerName}` : ''}${price !== null ? `, ${c.kind === 'tax' ? 'mất' : 'giá'} ${price} xu` : ''}`;
  const frame = [
    styles.cell,
    { left: p.x, top: p.y, width: p.w, height: p.h, backgroundColor: owned ? p.ownerLight! : BOARD_BG },
  ];
  const hl = p.here ? C.son : p.isStepTarget || p.isTrail ? C.gold : null;
  const ring = hl ?? (owned ? p.ownerHex! : null);
  const overlay = ring ? <View pointerEvents="none" style={[styles.ring, { borderColor: ring, borderWidth: hl ? 3 : 2.5 }]} /> : null;
  const face = owned ? <Image source={{ uri: p.ownerPortrait! }} style={[styles.ownerFace, { borderColor: p.ownerHex! }]} /> : null;
  const priceTxt = price === null ? (c.kind === 'start' ? '+200' : '') : c.kind === 'tax' ? `-${price}` : `${price} xu`;
  const minus = c.kind === 'tax';

  if (p.side === 'corner') {
    const fs = Math.max(7.5, Math.min(12, p.w / 7));
    const icon = p.w * 0.46;
    return (
      <Pressable testID={`cell-${p.index}`} accessibilityRole="button" accessibilityLabel={label} onPress={() => p.onPress(p.index)} style={frame}>
        <View style={styles.corner}>
          <T numberOfLines={2} style={[styles.cornerName, { fontSize: fs, lineHeight: Math.round(fs * 1.35) }]}>{name}</T>
          <Image source={{ uri: ICON_BY_CELL[p.index] }} style={{ width: icon, height: icon }} resizeMode="contain" />
          {priceTxt !== '' && <T style={[styles.price, styles.plus, { fontSize: fs, lineHeight: Math.round(fs * 1.4) }]}>{priceTxt}</T>}
        </View>
        {overlay}
      </Pressable>
    );
  }

  const horiz = p.side === 'top' || p.side === 'bottom';
  const band = isLand ? TYPHU_GROUPS[c.group].color : null;

  if (horiz) {
    // ô hàng dưới (dải màu ở trên) và hàng trên (dải màu ở dưới), chữ đều xuôi
    const W = p.w;
    const nameSize = Math.max(6.5, Math.min(10, W / 5.2));
    const priceSize = Math.max(7, Math.min(10.5, W / 4.6));
    const bandH = p.h * 0.2;
    const iconSize = Math.min(W * 0.8, p.h * 0.4);
    const bandEl = band ? (
      <View style={[styles.bandH, { height: bandH, backgroundColor: band }, p.side === 'top' ? styles.bandBorderB : styles.bandBorderT]}>
        <Houses n={p.houses} vertical={false} />
      </View>
    ) : null;
    return (
      <Pressable testID={`cell-${p.index}`} accessibilityRole="button" accessibilityLabel={label} onPress={() => p.onPress(p.index)} style={frame}>
        <View style={styles.col}>
          {p.side === 'top' && bandEl}
          <T numberOfLines={2} style={[styles.name, { fontSize: nameSize, lineHeight: Math.round(nameSize * 1.4), marginTop: 2 }]}>{name}</T>
          <View style={styles.mid}>
            {!isLand && <Image source={{ uri: ICON_BY_CELL[p.index] }} style={{ width: iconSize, height: iconSize }} resizeMode="contain" />}
            {face}
          </View>
          {priceTxt !== '' && <T numberOfLines={1} style={[styles.price, minus && styles.minus, { fontSize: priceSize, lineHeight: Math.round(priceSize * 1.4), marginBottom: 2 }]}>{priceTxt}</T>}
          {p.side === 'bottom' && bandEl}
        </View>
        {overlay}
      </Pressable>
    );
  }

  // ô cạnh trái/phải: nằm ngang, dải màu dọc ở mép trong
  const H = p.h;
  const nameSize = Math.max(6.5, Math.min(9.5, H / 5));
  const priceSize = Math.max(7, Math.min(10, H / 4.6));
  const iconSize = Math.min(H * 0.6, p.w * 0.3);
  const sidePrice = priceTxt.replace(' xu', '');
  const bandEl = band ? (
    <View style={[styles.bandV, { backgroundColor: band }, p.side === 'right' ? styles.bandBorderL : styles.bandBorderR]}>
      <Houses n={p.houses} vertical />
    </View>
  ) : null;
  return (
    <Pressable testID={`cell-${p.index}`} accessibilityRole="button" accessibilityLabel={label} onPress={() => p.onPress(p.index)} style={frame}>
      <View style={styles.row}>
        {p.side === 'left' && bandEl}
        {!isLand && <Image source={{ uri: ICON_BY_CELL[p.index] }} style={{ width: iconSize, height: iconSize, marginLeft: 2 }} resizeMode="contain" />}
        <View style={styles.rowText}>
          <T numberOfLines={2} style={[styles.name, { fontSize: nameSize, lineHeight: Math.round(nameSize * 1.28) }]}>{name}</T>
          {sidePrice !== '' && <T numberOfLines={1} style={[styles.price, minus && styles.minus, { fontSize: priceSize, lineHeight: Math.round(priceSize * 1.3) }]}>{sidePrice}</T>}
        </View>
        {face && <View style={[styles.sideFace, p.side === 'right' ? { left: 1 } : { right: 1 }]}>{face}</View>}
        {p.side === 'right' && bandEl}
      </View>
      {overlay}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  cell: { position: 'absolute', borderWidth: 0.75, borderColor: INK, overflow: 'hidden' },
  ring: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 },
  col: { flex: 1, alignItems: 'center' },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  rowText: { flex: 1, minWidth: 0, paddingHorizontal: 2, alignItems: 'center' },
  bandH: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  bandV: { alignSelf: 'stretch', width: 10, alignItems: 'center', justifyContent: 'center' },
  bandBorderB: { borderBottomWidth: 0.75, borderColor: INK },
  bandBorderT: { borderTopWidth: 0.75, borderColor: INK },
  bandBorderL: { borderLeftWidth: 0.75, borderColor: INK },
  bandBorderR: { borderRightWidth: 0.75, borderColor: INK },
  name: { color: INK, fontWeight: '700', textAlign: 'center', letterSpacing: -0.2 },
  mid: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  price: { color: INK, fontWeight: '800', textAlign: 'center' },
  minus: { color: '#C92A2A' },
  plus: { color: '#2B8A3E' },
  sideFace: { position: 'absolute', bottom: 1, transform: [{ scale: 0.85 }] },
  ownerFace: { width: 13, height: 13, borderRadius: 7, backgroundColor: '#fff', borderWidth: 1.5 },
  house: { width: 6, height: 6, backgroundColor: '#2F9E44', borderWidth: 1, borderColor: INK },
  hotel: { width: 13, height: 7, backgroundColor: '#E03131', borderWidth: 1, borderColor: INK },
  corner: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 1, padding: 2 },
  cornerName: { color: INK, fontWeight: '800', textAlign: 'center' },
});
