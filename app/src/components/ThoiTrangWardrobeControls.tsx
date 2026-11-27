/**
 * Thành phần điều khiển tủ đồ v4: Atlas icon sprite responsive, bảng màu tròn, chip hoạ tiết / 2-tone,
 * thanh kéo chiều cao và bảng tùy chỉnh khuôn mặt 6 mục (14 biểu cảm).
 */
import { useEffect, useState, type CSSProperties } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { ThoiTrangFace, ThoiTrangTag } from '../../../shared/src/thoitrang';
import { EXPRESSIONS, FACE_OPTS } from '../../../shared/src/thoitrang-catalog';
import { T } from '../ui';

export const V4 = {
  pink: '#ff5c8a',
  pink2: '#ffb3c7',
  ink: '#3b2a3f',
  ink2: '#7a6880',
  glass: 'rgba(255,255,255,0.90)',
  line: '#f1e3ee',
  soft: '#fff4f8',
  card: '#fff6fa',
  mint: '#5fd3a6',
} as const;

export const TAG_LABELS: Readonly<Record<ThoiTrangTag, string>> = {
  da_hoi: 'Dạ hội',
  duong_pho: 'Đường phố',
  cong_so: 'Công sở',
  the_thao: 'Thể thao',
  co_trang: 'Cổ trang',
  ky_ao: 'Kỳ ảo',
  kinh_di: 'Kinh dị',
  mua_he: 'Mùa hè',
  mua_dong: 'Mùa đông',
  de_thuong: 'Dễ thương',
  lay_loi: 'Lầy lội',
  hoang_gia: 'Hoàng gia',
  cuoi_hoi: 'Cưới hỏi',
  hai_tac: 'Hải tặc',
  scifi: 'Sci-Fi',
  van_hoa_vn: 'Việt Nam',
  hoc_duong: 'Học đường',
  am_nhac: 'Âm nhạc',
  bi_an: 'Bí ẩn',
  ngot_ngao: 'Ngọt ngào',
  ca_tinh: 'Cá tính',
  sang_chanh: 'Sang chảnh',
  bien_dao: 'Biển đảo',
  dong_vat: 'Động vật',
  tinh_yeu: 'Tình yêu',
  hanh_dong: 'Hành động',
  retro: 'Retro',
  toi_gian: 'Tối giản',
};

export interface ThoiTrangIconRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ThoiTrangIconManifest {
  image: string;
  width: number;
  height: number;
  tile: number;
  cols: number;
  rows: number;
  count: number;
  items: Record<string, ThoiTrangIconRect>;
}

let cachedManifest: ThoiTrangIconManifest | null = null;
let manifestPromise: Promise<ThoiTrangIconManifest | null> | null = null;

export function useThoiTrangIconManifest(): ThoiTrangIconManifest | null {
  const [manifest, setManifest] = useState<ThoiTrangIconManifest | null>(() => cachedManifest);

  useEffect(() => {
    if (Platform.OS !== 'web' || cachedManifest) return;
    let alive = true;
    if (!manifestPromise) {
      manifestPromise = fetch('/thoitrang/icons.json')
        .then((r) => (r.ok ? r.json() : null))
        .then((data: ThoiTrangIconManifest | null) => {
          if (data && data.items) cachedManifest = data;
          return cachedManifest;
        })
        .catch(() => null);
    }
    void manifestPromise.then((res) => {
      if (alive && res) setManifest(res);
    });
    return () => { alive = false; };
  }, []);

  return manifest;
}

export function ThoiTrangIconSprite({
  iconKey,
  manifest,
  size,
  round = false,
  swatch,
}: {
  iconKey: string;
  manifest: ThoiTrangIconManifest | null;
  size?: number;
  round?: boolean;
  swatch?: { c: string; c2: string; label?: string };
}) {
  const rect = manifest?.items?.[iconKey];
  if (Platform.OS !== 'web' || !manifest || !rect) {
    return (
      <View
        style={[
          styles.iconFallback,
          size ? { width: size, height: size } : styles.iconFluid,
          round && { borderRadius: 999 },
        ]}
      />
    );
  }
  const cols = Math.max(1, manifest.cols || Math.round(manifest.width / rect.w));
  const rows = Math.max(1, manifest.rows || Math.round(manifest.height / rect.h));
  const col = Math.round(rect.x / rect.w);
  const row = Math.round(rect.y / rect.h);
  const posX = cols > 1 ? `${(col / (cols - 1)) * 100}%` : '0%';
  const posY = rows > 1 ? `${(row / (rows - 1)) * 100}%` : '0%';

  const webStyle: CSSProperties = {
    width: size ? `${size}px` : '100%',
    height: size ? `${size}px` : undefined,
    aspectRatio: '1 / 1',
    borderRadius: round ? '999px' : '12px',
    backgroundColor: '#fdeef5',
    backgroundImage: `url(${manifest.image}), radial-gradient(circle at 50% 40%, #ffffff, #fde7f1)`,
    backgroundRepeat: 'no-repeat, no-repeat',
    backgroundSize: `${cols * 100}% ${rows * 100}%, 100% 100%`,
    backgroundPositionX: `${posX}, 0%`,
    backgroundPositionY: `${posY}, 0%`,
    flexShrink: 0,
    position: 'relative',
  };
  return (
    <div style={webStyle}>
      {swatch && !round && (
        <div
          style={{
            position: 'absolute',
            left: '4px',
            bottom: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            padding: '2px 4px',
            borderRadius: '999px',
            backgroundColor: 'rgba(255,255,255,0.88)',
            boxShadow: '0 1px 3px rgba(59,42,63,0.18)',
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '99px', backgroundColor: swatch.c, border: '1px solid rgba(59,42,63,0.22)' }} />
          <span style={{ width: '8px', height: '8px', borderRadius: '99px', backgroundColor: swatch.c2, border: '1px solid rgba(59,42,63,0.22)' }} />
          {swatch.label && <span style={{ fontSize: '8px', fontWeight: 800, color: '#3b2a3f', lineHeight: 1 }}>{swatch.label}</span>}
        </div>
      )}
    </div>
  );
}

export function SwatchRow({
  label,
  colors,
  value,
  onSelect,
  testIDPrefix,
  compact = false,
  touchLarge = false,
}: {
  label: string;
  colors: readonly string[];
  value?: string;
  onSelect: (hex: string) => void;
  testIDPrefix: string;
  compact?: boolean;
  touchLarge?: boolean;
}) {
  const cur = value?.toLowerCase();
  const dots = colors.map((hex, i) => {
    const active = cur === hex.toLowerCase();
    return (
      <Pressable
        key={hex}
        testID={`${testIDPrefix}-${i}`}
        accessibilityRole="button"
        onPress={() => onSelect(hex)}
        style={[
          styles.swatch,
          compact && !touchLarge && styles.swatchCompact,
          touchLarge && styles.swatchLarge,
          { backgroundColor: hex },
          active && styles.swatchOn,
        ]}
      />
    );
  });
  return (
    <View style={styles.rowBlock}>
      <T style={styles.rowLabel}>{label}</T>
      {compact && !touchLarge ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.swRowScroll}>
          {dots}
        </ScrollView>
      ) : (
        <View style={[styles.swWrap, touchLarge && styles.swWrapLarge]}>{dots}</View>
      )}
    </View>
  );
}

export function HorizontalChipRow({
  label,
  options,
  value,
  onSelect,
  testIDPrefix,
  wrap = false,
}: {
  label: string;
  options: readonly (readonly [string, string])[];
  value: string;
  onSelect: (id: string) => void;
  testIDPrefix: string;
  wrap?: boolean;
}) {
  const chips = options.map(([id, name]) => {
    const active = value === id;
    return (
      <Pressable
        key={id}
        testID={`${testIDPrefix}-${id}`}
        accessibilityRole="button"
        onPress={() => onSelect(id)}
        style={[styles.chip, wrap && styles.chipTouch, active && styles.chipOn]}
      >
        <T style={[styles.chipTxt, active && styles.chipTxtOn]}>{name}</T>
      </Pressable>
    );
  });
  return (
    <View style={styles.rowBlock}>
      <T style={styles.rowLabel}>{label}</T>
      {wrap ? (
        <View style={styles.wrapChips}>{chips}</View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hChips}>
          {chips}
        </ScrollView>
      )}
    </View>
  );
}

export function BodyHeightSlider({
  height,
  onChange,
}: {
  height: number;
  onChange: (next: number) => void;
}) {
  const pct = Math.round(height * 100);
  return (
    <View style={styles.sliderBox}>
      <View style={styles.sliderHead}>
        <T style={styles.sliderLabel}>Chiều cao</T>
        <T style={styles.sliderVal}>{pct}%</T>
      </View>
      {Platform.OS === 'web' ? (
        <input
          data-testid="tt-height-slider"
          type="range"
          min={85}
          max={115}
          value={pct}
          onChange={(e) => onChange(Math.round(Number(e.target.value)) / 100)}
          style={{ width: '100%', accentColor: V4.pink, cursor: 'pointer', margin: 0 }}
        />
      ) : (
        <View style={styles.nativeSliderRow}>
          <Pressable style={styles.chip} onPress={() => onChange(Math.max(0.85, +(height - 0.05).toFixed(2)))}>
            <T style={styles.chipTxt}>-5%</T>
          </Pressable>
          <Pressable style={styles.chip} onPress={() => onChange(Math.min(1.15, +(height + 0.05).toFixed(2)))}>
            <T style={styles.chipTxt}>+5%</T>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export type FaceSubTab = 'expr' | 'eyes' | 'bm' | 'mouth' | 'mk' | 'beard';

const FACE_SUBTABS: readonly (readonly [FaceSubTab, string])[] = [
  ['expr', 'Biểu cảm'],
  ['eyes', 'Mắt'],
  ['bm', 'Mày & Mũi'],
  ['mouth', 'Miệng'],
  ['mk', 'Trang điểm'],
  ['beard', 'Râu'],
];

export function FaceEditorPanel({
  face,
  subTab,
  onChangeSubTab,
  onPatchFace,
  manifest,
}: {
  face: ThoiTrangFace;
  subTab: FaceSubTab;
  onChangeSubTab: (next: FaceSubTab) => void;
  onPatchFace: (patch: Partial<ThoiTrangFace>) => void;
  manifest: ThoiTrangIconManifest | null;
}) {
  const renderBlock = (
    title: string,
    list: readonly (readonly [string, string])[],
    cur: string,
    prefix: string,
    iconPrefix: string | null,
    onPick: (id: string) => void,
  ) => (
    <View style={styles.fblk}>
      <T style={styles.rowLabel}>{title}</T>
      <View style={styles.wrapChips}>
        {list.map(([id, name]) => {
          const active = cur === id;
          return (
            <Pressable
              key={id}
              testID={`tt-face-${prefix}-${id}`}
              accessibilityRole="button"
              onPress={() => onPick(id)}
              style={[styles.chip, iconPrefix && styles.chipWithIcon, active && styles.chipOn]}
            >
              {iconPrefix && (
                <ThoiTrangIconSprite iconKey={`${iconPrefix}:${id}`} manifest={manifest} size={22} round />
              )}
              <T style={[styles.chipTxt, active && styles.chipTxtOn]}>{name}</T>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={styles.faceWrap}>
      <View style={styles.fsubRow}>
        {FACE_SUBTABS.map(([id, label]) => {
          const active = subTab === id;
          return (
            <Pressable
              key={id}
              testID={`tt-fsub-${id}`}
              accessibilityRole="button"
              onPress={() => onChangeSubTab(id)}
              style={[styles.fsubPill, active && styles.chipOn]}
            >
              <T style={[styles.fsubTxt, active && styles.chipTxtOn]}>{label}</T>
            </Pressable>
          );
        })}
      </View>

      {subTab === 'expr' && renderBlock('BIỂU CẢM (14)', EXPRESSIONS, face.expression, 'expr', 'face_expression', (id) =>
        onPatchFace({ expression: id as ThoiTrangFace['expression'] }),
      )}
      {subTab === 'eyes' && renderBlock('DÁNG MẮT (10)', FACE_OPTS.eyes, face.eyes, 'eye', 'face_eyes', (id) =>
        onPatchFace({ eyes: id as ThoiTrangFace['eyes'], expression: 'neutral' }),
      )}
      {subTab === 'bm' && (
        <>
          {renderBlock('LÔNG MÀY (8)', FACE_OPTS.brows, face.brows, 'brow', null, (id) =>
            onPatchFace({ brows: id as ThoiTrangFace['brows'] }),
          )}
          {renderBlock('DÁNG MŨI (5)', FACE_OPTS.noses, face.nose, 'nose', null, (id) =>
            onPatchFace({ nose: id as ThoiTrangFace['nose'] }),
          )}
        </>
      )}
      {subTab === 'mouth' && renderBlock('DÁNG MIỆNG (10)', FACE_OPTS.mouths, face.mouth, 'mouth', 'face_mouth', (id) =>
        onPatchFace({ mouth: id as ThoiTrangFace['mouth'], expression: 'neutral' }),
      )}
      {subTab === 'mk' && (
        <>
          {renderBlock('MÁ HỒNG', FACE_OPTS.blush, face.blush, 'blush', null, (id) =>
            onPatchFace({ blush: id as ThoiTrangFace['blush'] }),
          )}
          {renderBlock('KẺ MẮT', FACE_OPTS.eyeliner, face.eyeliner, 'liner', null, (id) =>
            onPatchFace({ eyeliner: id as ThoiTrangFace['eyeliner'] }),
          )}
          {renderBlock('PHẤN MẮT', FACE_OPTS.eyeshadow, face.eyeshadow, 'shadow', null, (id) =>
            onPatchFace({ eyeshadow: id as ThoiTrangFace['eyeshadow'] }),
          )}
          {renderBlock('NỐT RUỒI', FACE_OPTS.beautyMark, face.beautyMark, 'mark', null, (id) =>
            onPatchFace({ beautyMark: id as ThoiTrangFace['beautyMark'] }),
          )}
          <View style={styles.fblk}>
            <T style={styles.rowLabel}>TÀN NHANG</T>
            <View style={styles.wrapChips}>
              <Pressable
                testID="tt-face-freckles"
                accessibilityRole="button"
                onPress={() => onPatchFace({ freckles: !face.freckles })}
                style={[styles.chip, face.freckles && styles.chipOn]}
              >
                <T style={[styles.chipTxt, face.freckles && styles.chipTxtOn]}>
                  {face.freckles ? '✓ Có tàn nhang' : '+ Thêm tàn nhang'}
                </T>
              </Pressable>
            </View>
          </View>
        </>
      )}
      {subTab === 'beard' && renderBlock('RÂU & RIA MÉP (6)', FACE_OPTS.beard, face.beard, 'beard', 'face_beard', (id) =>
        onPatchFace({ beard: id as ThoiTrangFace['beard'] }),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  iconFluid: { width: '100%', aspectRatio: 1, borderRadius: 12 },
  iconFallback: { backgroundColor: '#fde7f1', borderRadius: 12 },
  rowBlock: { gap: 4 },
  rowLabel: { fontSize: 10.5, fontWeight: '800', color: V4.ink2, letterSpacing: 0.6 },
  swWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  swWrapLarge: { gap: 8 },
  swRowScroll: { flexDirection: 'row', gap: 6, paddingVertical: 2, paddingHorizontal: 1 },
  swatch: {
    width: 21,
    height: 21,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(59,42,63,0.14)',
  },
  swatchCompact: { width: 20, height: 20 },
  swatchLarge: { width: 28, height: 28 },
  swatchOn: {
    borderWidth: 2.5,
    borderColor: V4.pink,
    transform: [{ scale: 1.12 }],
  },
  hChips: { flexDirection: 'row', gap: 5, paddingBottom: 2 },
  wrapChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: V4.soft,
  },
  chipTouch: { paddingVertical: 7, paddingHorizontal: 12 },
  chipWithIcon: { paddingVertical: 3, paddingLeft: 4, paddingRight: 10 },
  chipOn: { backgroundColor: V4.pink },
  chipTxt: { fontSize: 11.5, fontWeight: '600', color: V4.ink },
  chipTxtOn: { color: '#ffffff', fontWeight: '700' },
  sliderBox: {
    width: '100%',
    backgroundColor: V4.card,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 6,
  },
  sliderHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sliderLabel: { fontSize: 12, fontWeight: '700', color: V4.ink },
  sliderVal: { fontSize: 12, fontWeight: '800', color: V4.pink },
  nativeSliderRow: { flexDirection: 'row', gap: 8 },
  faceWrap: { gap: 10, paddingBottom: 4 },
  fsubRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: V4.line,
  },
  fsubPill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: V4.soft,
  },
  fsubTxt: { fontSize: 11.5, fontWeight: '700', color: V4.ink2 },
  fblk: { gap: 6 },
});
