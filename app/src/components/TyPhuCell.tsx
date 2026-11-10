import { memo } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { C } from '../theme';
import { T } from '../ui';
import { TYPHU_PHOTOS } from '../typhuArt';
import { shortCellName } from '../typhuNames';

export interface TyPhuCellProps {
  index: number;
  name: string;
  /** màu dải bộ đất (null = ô đặc biệt) */
  bandColor: string | null;
  icon: string | null;
  price: number | null;
  top: number;
  left: number;
  w: number;
  h: number;
  minCell: number;
  ownerName: string | null;
  ownerHex: string | null;
  ownerLight: string | null;
  ownerPortrait: string | null;
  badgeText: string | null;
  badgeBg: string | null;
  badgeBorder: string | null;
  here: boolean;
  isTrail: boolean;
  isStepTarget: boolean;
  fxLabel: string | null;
  fxColor: string | null;
  onPress: (i: number) => void;
}

/** Một ô bàn cờ. Props chỉ đổi khi ô đó thật sự đổi, nên các nhịp animation 32ms không vẽ lại 40 ô. */
export const TyPhuCell = memo(function TyPhuCell(p: TyPhuCellProps) {
  const photoUri = TYPHU_PHOTOS[p.name];
  const owner = p.ownerHex !== null;
  return (
    <Pressable
      testID={`cell-${p.index}`}
      accessibilityRole="button"
      accessibilityLabel={`${p.index + 1}. ${p.name}${p.ownerName ? `, thuộc ${p.ownerName}` : ''}${p.price !== null ? `, giá ${p.price} xu` : ''}`}
      onPress={() => p.onPress(p.index)}
      style={[
        styles.cell,
        { top: p.top, left: p.left, width: p.w, height: p.h },
        owner && { backgroundColor: p.ownerLight!, borderWidth: 2.5, borderColor: p.ownerHex! },
        p.isTrail && styles.cellTrail,
        p.isStepTarget && styles.cellStepTarget,
        p.here && styles.cellHere,
        p.fxColor !== null && { borderWidth: 3.5, borderColor: p.fxColor },
      ]}
    >
      {photoUri && <Image source={{ uri: photoUri }} style={styles.cellPhoto} resizeMode="cover" />}
      <View style={styles.cellScrim} />

      {p.bandColor ? (
        <View style={[styles.band, { backgroundColor: p.bandColor, height: Math.max(5, p.h * 0.16) }]} />
      ) : p.h < 40 ? null : (
        <View style={styles.cornerBadge}>
          <T style={{ fontSize: Math.max(9, p.minCell * 0.22), lineHeight: Math.max(11, p.minCell * 0.25) }}>{p.icon}</T>
        </View>
      )}

      <View style={styles.cellNamePill}>
        <T
          style={[
            styles.cellName,
            {
              fontSize: Math.max(9, Math.min(12, p.minCell * 0.19)),
              lineHeight: Math.max(10, Math.min(13.5, p.minCell * 0.22)),
            },
          ]}
        >
          {shortCellName(p.name)}
        </T>
      </View>

      {p.price !== null && !owner && (
        <View style={styles.pricePill}>
          <T style={[styles.price, { fontSize: Math.max(9, Math.min(11, p.minCell * 0.17)) }]}>{p.price}</T>
        </View>
      )}

      {owner && p.badgeText && (
        <View
          style={[
            styles.ownerBar,
            { backgroundColor: p.badgeBg!, borderColor: p.badgeBorder!, minHeight: Math.max(12, p.h * 0.26) },
          ]}
        >
          <Image
            source={{ uri: p.ownerPortrait! }}
            style={[styles.ownerImage, { width: Math.max(10, p.minCell * 0.24), height: Math.max(10, p.minCell * 0.24) }]}
          />
          <T numberOfLines={1} style={[styles.levelText, { fontSize: Math.max(8, Math.min(11, p.minCell * 0.18)) }]}>
            {p.badgeText}
          </T>
        </View>
      )}

      {p.fxColor !== null && (
        <View pointerEvents="none" style={[styles.cellBurstOverlay, { borderColor: p.fxColor }]}>
          <View style={[styles.cellBurstPill, { backgroundColor: p.fxColor }]}>
            <T style={styles.cellBurstText}>{p.fxLabel}</T>
          </View>
        </View>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  cell: {
    position: 'absolute', backgroundColor: '#FFFFFF', borderWidth: 0.8, borderColor: '#2B2118',
    alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden',
  },
  cellPhoto: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', opacity: 0.84 },
  cellScrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(12, 16, 20, 0.22)' },
  cellTrail: {
    borderWidth: 2.5, borderColor: '#FFD43B',
    shadowColor: '#FFD43B', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 6,
  } as object,
  cellStepTarget: { borderWidth: 3, borderColor: '#FFF3BF' },
  cellHere: { borderWidth: 3.5, borderColor: C.gold },
  band: { alignSelf: 'stretch', borderBottomWidth: 1.2, borderColor: '#1A1412', zIndex: 2 },
  cornerBadge: { marginTop: 1, backgroundColor: 'rgba(255, 255, 255, 0.86)', borderRadius: 6, paddingHorizontal: 3, zIndex: 2 },
  cellNamePill: {
    backgroundColor: 'rgba(15, 20, 26, 0.72)', borderRadius: 4, paddingHorizontal: 2, paddingVertical: 0.5,
    maxWidth: '100%', zIndex: 2,
  },
  cellName: { color: '#FFFFFF', fontWeight: '900', textAlign: 'center', letterSpacing: -0.5 },
  pricePill: {
    backgroundColor: 'rgba(255, 212, 59, 0.94)', borderRadius: 4, paddingHorizontal: 3, marginBottom: 1,
    borderWidth: 0.8, borderColor: '#1A1412', zIndex: 2,
  },
  price: { color: '#1A1412', fontWeight: '900', lineHeight: 11 },
  ownerBar: {
    alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 2, paddingHorizontal: 2, borderTopWidth: 1.2, zIndex: 3,
  },
  ownerImage: { borderRadius: 99, borderWidth: 1, borderColor: '#FFFFFF', backgroundColor: '#FFFFFF' },
  levelText: { color: '#FFFFFF', fontWeight: '900', letterSpacing: -0.2 },
  cellBurstOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: 3,
    backgroundColor: 'rgba(255, 212, 59, 0.28)', alignItems: 'center', justifyContent: 'center', zIndex: 8,
  },
  cellBurstPill: { paddingHorizontal: 4, paddingVertical: 1.5, borderRadius: 6, borderWidth: 1.5, borderColor: '#1A1412' },
  cellBurstText: { color: '#1A1412', fontWeight: '900', fontSize: 9, textAlign: 'center' },
});
