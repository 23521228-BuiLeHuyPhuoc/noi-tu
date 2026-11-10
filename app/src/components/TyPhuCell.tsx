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

/** số dòng ước lượng khi chữ đậm tự xuống dòng theo từ */
function wrapLines(name: string, f: number, availW: number): number {
  const cw = f * 0.6;
  let lines = 1;
  let cur = 0;
  for (const word of name.split(' ')) {
    const len = word.length * cw;
    if (cur === 0) cur = len;
    else if (cur + cw + len <= availW) cur += cw + len;
    else { lines++; cur = len; }
  }
  return lines;
}

/** Một ô bàn cờ dạng thẻ phẳng. Props chỉ đổi khi ô đó thật sự đổi, nên nhịp animation 32ms không vẽ lại 40 ô. */
export const TyPhuCell = memo(function TyPhuCell(p: TyPhuCellProps) {
  const c = TYPHU_BOARD[p.index];
  const owned = p.ownerHex !== null;
  const corner = p.side === 'corner';
  const sp = SPECIAL[c.kind];
  const group = c.kind === 'land' ? TYPHU_GROUPS[c.group].color : sp.band;
  const price = isTyPhuProperty(c) ? c.price : c.kind === 'tax' ? c.amount : null;
  const name = shortCellName(c.name);
  const label = `${p.index + 1}. ${c.name}${p.ownerName ? `, thuộc ${p.ownerName}` : ''}${price !== null ? `, ${c.kind === 'tax' ? 'nộp' : 'giá'} ${price} xu` : ''}`;
  const rowLayout = !corner && (p.w >= 56 && p.h <= 56 || p.w >= 64 && p.h <= 62);
  const sideBand = p.side === 'left' || p.side === 'right';
  const compactTB = !rowLayout && !sideBand && p.h < 60;
  const compact = !rowLayout && (sideBand ? p.h < 52 : compactTB);
  const frame = [
    styles.cell,
    { left: p.x, top: p.y, width: p.w, height: p.h, backgroundColor: owned ? p.ownerLight! : c.kind === 'land' ? '#FFFFFF' : sp.bg },
    owned && { borderColor: p.ownerHex!, borderWidth: 2.5 },
    p.isTrail && styles.trail,
    p.isStepTarget && styles.step,
    p.here && styles.here,
  ];

  const houseBits = p.houses >= TYPHU_MAX_HOUSES ? (
    <Image source={{ uri: FX_ICON.hotel }} style={styles.houseIcon} />
  ) : p.houses > 0 ? (
    <>
      <Image source={{ uri: FX_ICON.house }} style={styles.houseIcon} />
      <T style={styles.houseNum}>{p.houses}</T>
    </>
  ) : null;
  const priceTxt = c.kind === 'tax' ? `-${price}` : `${price}`;
  const footer = compactTB ? null : owned ? (
    <View style={[styles.owner, { backgroundColor: p.ownerHex! }, rowLayout && { alignSelf: 'center', borderRadius: 8, paddingHorizontal: 2 }]}>
      <Image source={{ uri: p.ownerPortrait! }} style={styles.ownerFace} />
      {houseBits}
    </View>
  ) : price !== null ? (
    compact ? (
      <T style={styles.priceBare}>{priceTxt}</T>
    ) : (
      <View style={[styles.price, c.kind === 'tax' && { backgroundColor: '#FFC9C9' }]}>
        <T style={styles.priceTxt}>{priceTxt}</T>
      </View>
    )
  ) : null;

  if (corner) {
    const cf = Math.max(11, Math.min(14, p.w * 0.2));
    const cl = wrapLines(name, cf, p.w - 6);
    const icon = Math.max(16, Math.min(Math.min(p.w, p.h) * 0.55, p.h - 6 - cl * (cf + 1) - 9));
    return (
      <Pressable testID={`cell-${p.index}`} accessibilityRole="button" accessibilityLabel={label} onPress={() => p.onPress(p.index)} style={[...frame, styles.cornerCell, { borderColor: owned ? p.ownerHex! : C.ink }]}>
        <View style={[styles.cornerBand, { backgroundColor: sp.band }]} />
        <Image source={{ uri: ICON_BY_CELL[p.index] }} style={{ width: icon, height: icon, marginTop: 4 }} />
        <T style={[styles.cornerName, { fontSize: cf, lineHeight: cf + 1 }]}>{name}</T>
      </Pressable>
    );
  }

  // ô cạnh: dải màu quay vào tâm bàn
  const bt = compactTB ? 11 : Math.max(7, Math.min(11, Math.min(p.w, p.h) * 0.2));
  const bandStyle =
    p.side === 'top' ? { top: 0, left: 0, right: 0, height: bt }
    : p.side === 'bottom' ? { bottom: 0, left: 0, right: 0, height: bt }
    : p.side === 'left' ? { left: 0, top: 0, bottom: 0, width: bt }
    : { right: 0, top: 0, bottom: 0, width: bt };
  const inset =
    p.side === 'top' ? { paddingTop: bt } : p.side === 'bottom' ? { paddingBottom: bt }
    : p.side === 'left' ? { paddingLeft: bt } : { paddingRight: bt };
  const availW = p.w - (p.side === 'left' || p.side === 'right' ? bt : 0) - 3;
  const longest = Math.max(...name.split(' ').map((x) => x.length));
  const f = rowLayout ? 10.5 : Math.max(10, Math.min(12, (availW - 1) / (longest * 0.6)));
  const lines = rowLayout ? 1 : wrapLines(name, f, availW);
  const iconSize = rowLayout
    ? Math.max(16, Math.min(p.h - 6 - (p.side === 'top' || p.side === 'bottom' ? bt : 0), 24))
    : Math.max(compactTB ? 10 : 15, Math.min(p.w - 8, 30, p.h - (p.side === 'top' || p.side === 'bottom' ? bt : 0) - lines * (compact ? f : f + 1) - (compactTB ? 0 : compact ? 11 : 14) - 4));
  return (
    <Pressable testID={`cell-${p.index}`} accessibilityRole="button" accessibilityLabel={label} onPress={() => p.onPress(p.index)} style={frame}>
      <View style={[styles.band, bandStyle, { backgroundColor: group }, compactTB && styles.bandRow]}>
        {compactTB && (owned ? (
          <>
            <Image source={{ uri: p.ownerPortrait! }} style={styles.ownerFace} />
            {houseBits}
          </>
        ) : price !== null ? (
          <T style={styles.bandPrice}>{priceTxt}</T>
        ) : null)}
      </View>
      {rowLayout && !sideBand ? (
        <View style={[styles.inner, inset, styles.innerRow, { justifyContent: 'flex-start' }]}>
          <Image source={{ uri: ICON_BY_CELL[p.index] }} style={{ width: iconSize, height: iconSize }} />
          <View style={{ flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <T style={[styles.name, { fontSize: f, lineHeight: f + 1 }]}>{name}</T>
            {footer}
          </View>
        </View>
      ) : (
        <View style={[styles.inner, inset, rowLayout ? styles.innerRow : styles.innerCol]}>
          <Image source={{ uri: ICON_BY_CELL[p.index] }} style={{ width: iconSize, height: iconSize }} />
          <T style={[styles.name, { fontSize: f, lineHeight: compact ? f : f + 1 }, rowLayout && { flex: 1, minWidth: 0 }]}>{name}</T>
          {footer}
        </View>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  cell: { position: 'absolute', borderWidth: 1, borderColor: '#4A2A2F', overflow: 'hidden' },
  trail: { backgroundColor: '#FFF3BF' },
  step: { borderColor: C.gold, borderWidth: 3 },
  here: { borderColor: C.son, borderWidth: 3.5 },
  band: { position: 'absolute', borderColor: C.ink },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'space-evenly', paddingHorizontal: 1 },
  innerCol: { flexDirection: 'column' },
  innerRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 3, gap: 3 },
  name: { color: C.ink, fontWeight: '800', textAlign: 'center', letterSpacing: -0.2 },
  bandRow: { alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 1 },
  bandPrice: { color: '#fff', fontWeight: '900', fontSize: 10, lineHeight: 11, textShadowColor: C.ink, textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
  priceBare: { color: C.ink, fontWeight: '900', fontSize: 10, lineHeight: 11, backgroundColor: C.gold, borderRadius: 4, paddingHorizontal: 3 },
  price: {
    backgroundColor: C.gold, borderRadius: 7, borderWidth: 1, borderColor: C.ink,
    paddingHorizontal: 4, minWidth: 22, alignItems: 'center', height: 14, justifyContent: 'center',
  },
  priceTxt: { color: C.ink, fontWeight: '900', fontSize: 10, lineHeight: 12 },
  owner: {
    alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 14, gap: 1,
  },
  ownerFace: { width: 13, height: 13, borderRadius: 7, backgroundColor: '#fff', borderWidth: 1, borderColor: '#fff' },
  houseIcon: { width: 11, height: 11 },
  houseNum: { color: '#fff', fontWeight: '900', fontSize: 10, lineHeight: 12 },
  cornerCell: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  cornerBand: { position: 'absolute', top: 0, left: 0, right: 0, height: 6 },
  cornerName: { color: C.ink, fontWeight: '900', textAlign: 'center', marginTop: 2 },
});
