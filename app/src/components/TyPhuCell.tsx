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
  /** hũ tiền (chỉ ô Nghỉ chân) */
  pot?: number;
}

const BOARD_BG = '#CDE6D0';
const INK = '#111';

const svgUri = (body: string, vb: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"><g stroke="#111" stroke-width="2" stroke-linejoin="round">${body}</g></svg>`)}`;
/** làm tối một màu hex (cho cửa/mái) */
function shade(hex: string, k = 0.6): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.round(v * k);
  return `rgb(${f(n >> 16)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
}
const houseCache = new Map<string, { house: string; hotel: string }>();
/** nhà mái nhọn và khách sạn theo đúng màu người chơi sở hữu */
function buildingsOf(color: string) {
  let v = houseCache.get(color);
  if (!v) {
    const dark = shade(color);
    v = {
      house: svgUri(`<path d="M2 11L10 3L18 11V19H2Z" fill="${color}"/><path d="M2 11L10 3L18 11" fill="none"/><rect x="8" y="13" width="4" height="6" fill="${dark}"/>`, '0 0 20 21'),
      hotel: svgUri(`<path d="M2 9L8 2H28L34 9V19H2Z" fill="${color}"/><path d="M8 2H28L34 9H2Z" fill="#FFD43B"/><rect x="15" y="12" width="6" height="7" fill="${dark}"/><rect x="6" y="11" width="4" height="4" fill="#fff" stroke-width="1.2"/><rect x="26" y="11" width="4" height="4" fill="#fff" stroke-width="1.2"/><path d="M18 3.5l1 2 2 .3-1.5 1.4.4 2-1.9-1-1.9 1 .4-2L15 5.8l2-.3z" fill="#fff" stroke-width="0.8"/>`, '0 0 36 21'),
    };
    houseCache.set(color, v);
  }
  return v;
}

/** Nhà cấp 1-3: nhà nhỏ màu chủ đất; cấp 4: khách sạn mái vàng có sao. `vertical`: xếp dọc (ô ở cạnh bên). */
function Houses({ n, size, vertical, color }: { n: number; size: number; vertical: boolean; color: string }) {
  if (n <= 0) return null;
  const b = buildingsOf(color);
  if (n >= TYPHU_MAX_HOUSES) {
    return <Image source={{ uri: b.hotel }} style={vertical ? { width: size * 1.05, height: size * 0.62 } : { width: size * 1.75, height: size * 1.02 }} resizeMode="contain" />;
  }
  return (
    <View style={{ flexDirection: vertical ? 'column' : 'row', gap: 1 }}>
      {Array.from({ length: n }, (_, k) => <Image key={k} source={{ uri: b.house }} style={{ width: size, height: size * 1.05 }} resizeMode="contain" />)}
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
  const face = owned && p.houses === 0 ? <Image source={{ uri: p.ownerPortrait! }} style={[styles.ownerFace, { borderColor: p.ownerHex! }]} /> : null;
  const priceTxt = price === null ? (c.kind === 'start' ? '+200' : c.kind === 'rest' ? (p.pot ? `+${p.pot}` : 'HŨ 0') : '') : c.kind === 'tax' ? `-${price}` : `${price} xu`;
  const minus = c.kind === 'tax';

  if (p.side === 'corner') {
    const fs = Math.max(7, Math.min(11, p.w / 7.4));
    const icon = p.w * (priceTxt !== '' ? 0.38 : 0.44);
    return (
      <Pressable testID={`cell-${p.index}`} accessibilityRole="button" accessibilityLabel={label} onPress={() => p.onPress(p.index)} style={frame}>
        <View style={styles.corner}>
          <T numberOfLines={2} style={[styles.cornerName, { fontSize: fs, lineHeight: Math.round(fs * 1.2) }]}>{name}</T>
          <Image source={{ uri: ICON_BY_CELL[p.index] }} style={{ width: icon, height: icon }} resizeMode="contain" />
          {priceTxt !== '' && <T style={[styles.price, styles.plus, { fontSize: fs, lineHeight: Math.round(fs * 1.25) }]}>{priceTxt}</T>}
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
    const bandH = Math.max(13, p.h * 0.24);
    const iconSize = Math.min(W * (face ? 0.56 : 0.8), p.h * 0.38);
    const bandEl = band ? (
      <View style={[styles.bandH, { height: bandH, backgroundColor: band }, p.side === 'top' ? styles.bandBorderB : styles.bandBorderT]}>
        <Houses n={p.houses} color={p.ownerHex ?? '#2FB344'} size={Math.min(bandH - 2, (W - 6) / 3.3)} vertical={false} />
      </View>
    ) : null;
    return (
      <Pressable testID={`cell-${p.index}`} accessibilityRole="button" accessibilityLabel={label} onPress={() => p.onPress(p.index)} style={frame}>
        <View style={styles.col}>
          {p.side === 'top' && bandEl}
          <T numberOfLines={2} style={[styles.name, { fontSize: nameSize, lineHeight: Math.round(nameSize * 1.32), marginTop: 1 }]}>{name}</T>
          <View style={styles.mid}>
            {!isLand && <Image source={{ uri: ICON_BY_CELL[p.index] }} style={{ width: iconSize, height: iconSize }} resizeMode="contain" />}
            {face}
          </View>
          {priceTxt !== '' && <T numberOfLines={1} style={[styles.price, minus && styles.minus, { fontSize: priceSize, lineHeight: Math.round(priceSize * 1.32), marginBottom: 1 }]}>{priceTxt}</T>}
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
      <Houses n={p.houses} color={p.ownerHex ?? '#2FB344'} size={Math.min(12, (H - 6) / 3.3)} vertical />
    </View>
  ) : null;
  return (
    <Pressable testID={`cell-${p.index}`} accessibilityRole="button" accessibilityLabel={label} onPress={() => p.onPress(p.index)} style={frame}>
      <View style={styles.row}>
        {p.side === 'left' && bandEl}
        {!isLand ? (
          <View style={styles.sideIconWrap}>
            <Image source={{ uri: ICON_BY_CELL[p.index] }} style={{ width: iconSize, height: iconSize }} resizeMode="contain" />
            {face && <View style={styles.sideFace}>{face}</View>}
          </View>
        ) : (
          face && <View style={{ marginLeft: p.side === 'left' ? 1 : 2, marginRight: p.side === 'right' ? 1 : 0 }}>{face}</View>
        )}
        <View style={styles.rowText}>
          <T numberOfLines={2} style={[styles.name, { fontSize: nameSize, lineHeight: Math.round(nameSize * 1.25) }]}>{name}</T>
          {sidePrice !== '' && <T numberOfLines={1} style={[styles.price, minus && styles.minus, { fontSize: priceSize, lineHeight: Math.round(priceSize * 1.28) }]}>{sidePrice}</T>}
        </View>
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
  bandV: { alignSelf: 'stretch', width: 14, alignItems: 'center', justifyContent: 'center' },
  bandBorderB: { borderBottomWidth: 0.75, borderColor: INK },
  bandBorderT: { borderTopWidth: 0.75, borderColor: INK },
  bandBorderL: { borderLeftWidth: 0.75, borderColor: INK },
  bandBorderR: { borderRightWidth: 0.75, borderColor: INK },
  name: { color: INK, fontWeight: '700', textAlign: 'center', letterSpacing: -0.2 },
  mid: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 1 },
  price: { color: INK, fontWeight: '800', textAlign: 'center' },
  minus: { color: '#C92A2A' },
  plus: { color: '#2B8A3E' },
  sideIconWrap: { marginLeft: 2, alignItems: 'center', justifyContent: 'center' },
  sideFace: { position: 'absolute', right: -3, bottom: -2, transform: [{ scale: 0.8 }] },
  ownerFace: { width: 13, height: 13, borderRadius: 7, backgroundColor: '#fff', borderWidth: 1.5 },
  corner: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 1, padding: 2 },
  cornerName: { color: INK, fontWeight: '800', textAlign: 'center' },
});
