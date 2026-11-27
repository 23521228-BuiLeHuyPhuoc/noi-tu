/**
 * Tủ đồ thiết kế v4 ("Sàn Diễn Xóm Lầy"):
 * - Thanh danh mục 11 mục (`ThoiTrangCategoryRail` bên trái trên desktop, dải pill `mtabs` trên mobile).
 * - Tủ kính mờ chứa thẻ icon lớn (3 cột desktop / 4 cột mobile), tìm kiếm, lọc tag chủ đề & nút ✨ Hợp chủ đề,
 *   bảng màu chính/phụ, 15 hoạ tiết (hoặc 2-tone tóc), 6 dáng người + thanh chiều cao, và 6 mục khuôn mặt.
 * Không có bộ phối sẵn (preset).
 */
import { useState, type CSSProperties } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import type {
  ThoiTrangBodyType,
  ThoiTrangCatalogItem,
  ThoiTrangCategoryId,
  ThoiTrangEquippedItem,
  ThoiTrangFace,
  ThoiTrangHairTwoTone,
  ThoiTrangOutfit,
  ThoiTrangPatternId,
  ThoiTrangPrimarySlotId,
  ThoiTrangTag,
  ThoiTrangTheme,
  ThoiTrangWardrobeTab,
} from '../../../shared/src/thoitrang';
import {
  BODY_DEFAULTS,
  BODY_TYPES,
  CATALOG,
  HAIR_TWO_TONES,
  PALETTES,
  PATTERNS,
  WARDROBE_TABS,
  getItem,
  setSlot,
  toggleAcc,
  updateAcc,
} from '../../../shared/src/thoitrang-catalog';
import { T } from '../ui';
import {
  BodyHeightSlider,
  FaceEditorPanel,
  HorizontalChipRow,
  SwatchRow,
  TAG_LABELS,
  ThoiTrangIconSprite,
  V4,
  useThoiTrangIconManifest,
  type FaceSubTab,
} from './ThoiTrangWardrobeControls';

function filterCatalogItems(
  rawList: readonly ThoiTrangCatalogItem[],
  themeTags: ReadonlySet<string>,
  query: string,
  matchOnly: boolean,
  activeTag: ThoiTrangTag | null,
): ThoiTrangCatalogItem[] {
  const q = query.trim().toLowerCase();
  const out = rawList.filter((item) => {
    if (item.excluded) return false;
    if (matchOnly && !item.tags.some((t) => themeTags.has(t))) return false;
    if (activeTag && !item.tags.includes(activeTag)) return false;
    if (q) {
      const inName = item.name.toLowerCase().includes(q);
      const inTag = item.tags.some((t) => t.includes(q) || (TAG_LABELS[t]?.toLowerCase().includes(q) ?? false));
      if (!inName && !inTag) return false;
    }
    return true;
  });
  return [...out].sort((a, b) => {
    const ah = a.tags.filter((t) => themeTags.has(t)).length;
    const bh = b.tags.filter((t) => themeTags.has(t)).length;
    return bh - ah;
  });
}

export function ThoiTrangCategoryRail({
  tab,
  onSelectTab,
}: {
  tab: ThoiTrangWardrobeTab;
  onSelectTab: (next: ThoiTrangWardrobeTab) => void;
}) {
  return (
    <View testID="tt-category-rail" style={styles.rail}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.railInner}>
        {WARDROBE_TABS.map(([id, emoji, label]) => {
          const active = tab === id;
          return (
            <Pressable
              key={id}
              testID={`tt-tab-${id}`}
              accessibilityRole="button"
              onPress={() => onSelectTab(id)}
              style={styles.railBtn}
            >
              <View style={[styles.railIcon, active && styles.railIconOn]}>
                <T style={styles.railEmoji}>{emoji}</T>
              </View>
              <T numberOfLines={1} style={[styles.railTxt, active && styles.railTxtOn]}>{label}</T>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export interface ThoiTrangWardrobeProps {
  outfit: ThoiTrangOutfit;
  theme: ThoiTrangTheme;
  tab: ThoiTrangWardrobeTab;
  mobile: boolean;
  disabled?: boolean;
  onSelectTab: (next: ThoiTrangWardrobeTab) => void;
  onChangeOutfit: (next: ThoiTrangOutfit, recordUndo?: boolean) => void;
}

export function ThoiTrangWardrobe({
  outfit,
  theme,
  tab,
  mobile,
  disabled = false,
  onSelectTab,
  onChangeOutfit,
}: ThoiTrangWardrobeProps) {
  const manifest = useThoiTrangIconManifest();
  const [faceSub, setFaceSub] = useState<FaceSubTab>('expr');
  const [query, setQuery] = useState('');
  const [matchOnly, setMatchOnly] = useState(false);
  const [activeTag, setActiveTag] = useState<ThoiTrangTag | null>(null);
  const [activeAccId, setActiveAccId] = useState<string | null>(null);

  const themeTagSet = new Set<string>(theme.tags);
  const tabMeta = WARDROBE_TABS.find((c) => c[0] === tab) ?? WARDROBE_TABS[3];

  const handleTabSwitch = (next: ThoiTrangWardrobeTab) => {
    setQuery('');
    setActiveTag(null);
    onSelectTab(next);
  };

  const patchFace = (patch: Partial<ThoiTrangFace>) => {
    if (disabled) return;
    onChangeOutfit({ ...outfit, face: { ...outfit.face, ...patch } });
  };

  const selectBody = (nextBody: ThoiTrangBodyType) => {
    if (disabled) return;
    const bd = BODY_DEFAULTS[nextBody];
    onChangeOutfit({
      ...outfit,
      body: nextBody,
      face: {
        ...outfit.face,
        eyes: bd.eyes,
        brows: bd.brows,
        blush: bd.blush,
        eyeliner: bd.eyeliner,
        nose: bd.nose,
      },
    });
  };

  const isCatalogTab = tab !== 'body' && tab !== 'face';
  const catTab = isCatalogTab ? (tab as ThoiTrangCategoryId) : 'top';
  const filteredItems = isCatalogTab
    ? filterCatalogItems(CATALOG[catTab], themeTagSet, query, matchOnly, activeTag)
    : [];

  const accs = outfit.acc ?? [];
  const activeAcc = accs.find((a) => a.id === activeAccId) ?? accs[accs.length - 1] ?? null;
  const curEquipped: ThoiTrangEquippedItem | null =
    tab === 'acc' ? activeAcc : (tab === 'hair' || !isCatalogTab ? null : (outfit.slots[tab as ThoiTrangPrimarySlotId] ?? null));

  const handleSelectItem = (id: string | null) => {
    if (disabled) return;
    if (tab === 'acc') {
      const next = toggleAcc(outfit, id);
      const added = id && next.acc.some((a) => a.id === id);
      setActiveAccId(added ? id : (next.acc[next.acc.length - 1]?.id ?? null));
      onChangeOutfit(next);
      return;
    }
    if (tab === 'hair') {
      if (!id) return;
      const meta = getItem('hair', id);
      if (!meta) return;
      onChangeOutfit({
        ...outfit,
        hair: {
          id: meta.id,
          c: outfit.hair.c || meta.c,
          c2: outfit.hair.c2 || meta.c2,
          twoTone: outfit.hair.twoTone || 'none',
        },
      });
      return;
    }
    const slot = tab as ThoiTrangPrimarySlotId;
    if (!id) {
      onChangeOutfit(setSlot(outfit, slot, null));
      return;
    }
    const meta = getItem(slot, id);
    if (!meta) return;
    const existing = outfit.slots[slot];
    const nextItem: ThoiTrangEquippedItem = existing
      ? { id: meta.id, c: existing.c, c2: existing.c2, p: meta.pat ? existing.p : 'plain' }
      : { id: meta.id, c: meta.c, c2: meta.c2, p: meta.p };
    onChangeOutfit(setSlot(outfit, slot, nextItem));
  };

  const updateCurrentGarment = (patch: Partial<Pick<ThoiTrangEquippedItem, 'c' | 'c2' | 'p'>>) => {
    if (disabled || !isCatalogTab) return;
    if (tab === 'acc') {
      if (!activeAcc) return;
      onChangeOutfit(updateAcc(outfit, activeAcc.id, patch));
      return;
    }
    if (tab === 'hair') return;
    const slot = tab as ThoiTrangPrimarySlotId;
    const cur = outfit.slots[slot];
    if (!cur) return;
    onChangeOutfit(setSlot(outfit, slot, { ...cur, ...patch }));
  };

  const countLabel =
    tab === 'body'
      ? `${BODY_TYPES.length} dáng · ${Math.round(outfit.height * 100)}%`
      : tab === 'face'
        ? '14 biểu cảm'
        : `${filteredItems.length} món`;

  const gridStyleWeb: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: mobile ? 'repeat(4, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))',
    gap: mobile ? '6px' : '8px',
    width: '100%',
  };

  return (
    <View testID="tt-wardrobe" style={[styles.closet, mobile && styles.closetMobile, disabled && styles.disabled]}>
      {mobile && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.mtabsScroll}
          contentContainerStyle={styles.mtabs}
        >
          {WARDROBE_TABS.map(([id, emoji, label]) => {
            const active = tab === id;
            return (
              <Pressable
                key={id}
                testID={`tt-tab-${id}`}
                accessibilityRole="button"
                onPress={() => handleTabSwitch(id)}
                style={[styles.mtabPill, active && styles.mtabPillOn]}
              >
                <T style={[styles.mtabTxt, active && styles.mtabTxtOn]}>{emoji} {label}</T>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.header}>
        <T style={styles.headerTitle}>{tabMeta[2]}</T>
        <T style={styles.headerCount}>{countLabel}</T>
      </View>

      {isCatalogTab && (
        <View style={styles.filterWrap}>
          {!mobile && (
            <TextInput
              testID="tt-search"
              value={query}
              onChangeText={setQuery}
              placeholder="Tìm món đồ hoặc tag…"
              placeholderTextColor={V4.ink2}
              style={styles.search}
            />
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagRow}>
            <Pressable
              testID="tt-filter-match"
              accessibilityRole="button"
              onPress={() => setMatchOnly((v) => !v)}
              style={[styles.tagChip, matchOnly && styles.tagChipOn]}
            >
              <T style={[styles.tagChipTxt, matchOnly && styles.tagChipTxtOn]}>✨ Hợp chủ đề</T>
            </Pressable>
            {theme.tags.map((tg) => {
              const on = activeTag === tg;
              return (
                <Pressable
                  key={tg}
                  testID={`tt-tag-${tg}`}
                  accessibilityRole="button"
                  onPress={() => setActiveTag((cur) => (cur === tg ? null : tg))}
                  style={[styles.tagChip, on && styles.tagChipOn]}
                >
                  <T style={[styles.tagChipTxt, on && styles.tagChipTxtOn]}>#{TAG_LABELS[tg] ?? tg}</T>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      <ScrollView
        style={styles.gridScroll}
        contentContainerStyle={styles.gridScrollContent}
        showsVerticalScrollIndicator={!mobile}
      >
        {tab === 'body' && (
          <View style={styles.bodyCol}>
            {Platform.OS === 'web' ? (
              <div style={gridStyleWeb}>
                {BODY_TYPES.map(([id, name]) => {
                  const active = outfit.body === id;
                  return (
                    <Pressable
                      key={id}
                      testID={`tt-body-${id}`}
                      accessibilityRole="button"
                      onPress={() => selectBody(id)}
                      style={[styles.card, active && styles.cardOn]}
                    >
                      <ThoiTrangIconSprite iconKey={`body:${id}`} manifest={manifest} />
                      <T numberOfLines={2} style={styles.cardTxt}>{name}</T>
                      {active && <View style={styles.checkBadge}><T style={styles.checkTxt}>✓</T></View>}
                    </Pressable>
                  );
                })}
              </div>
            ) : null}
            <BodyHeightSlider
              height={outfit.height}
              onChange={(h) => !disabled && onChangeOutfit({ ...outfit, height: h }, false)}
            />
          </View>
        )}

        {tab === 'face' && (
          <FaceEditorPanel
            face={outfit.face}
            subTab={faceSub}
            onChangeSubTab={setFaceSub}
            onPatchFace={patchFace}
            manifest={manifest}
          />
        )}

        {isCatalogTab && Platform.OS === 'web' && (
          <div style={gridStyleWeb}>
            {tab !== 'hair' && tab !== 'shoes' && (
              <Pressable
                testID="tt-item-none"
                accessibilityRole="button"
                onPress={() => handleSelectItem(null)}
                style={[
                  styles.card,
                  styles.noneCard,
                  (tab === 'acc' ? accs.length === 0 : !curEquipped) && styles.cardOn,
                ]}
              >
                <T style={styles.noneGlyph}>∅</T>
                <T style={styles.cardTxt}>Bỏ</T>
              </Pressable>
            )}
            {filteredItems.map((item) => {
              const active =
                tab === 'hair'
                  ? outfit.hair.id === item.id
                  : tab === 'acc'
                    ? accs.some((a) => a.id === item.id)
                    : curEquipped?.id === item.id;
              const matchesTheme = item.tags.some((t) => themeTagSet.has(t));
              return (
                <Pressable
                  key={item.id}
                  testID={`tt-item-${tab}-${item.id}`}
                  accessibilityRole="button"
                  onPress={() => handleSelectItem(item.id)}
                  style={[styles.card, mobile && styles.cardMobile, active && styles.cardOn]}
                >
                  <ThoiTrangIconSprite iconKey={`${tab}:${item.id}`} manifest={manifest} />
                  <T numberOfLines={2} style={[styles.cardTxt, mobile && styles.cardTxtMobile]}>{item.name}</T>
                  {matchesTheme && (
                    <View style={styles.sparkBadge}><T style={styles.sparkTxt}>✨</T></View>
                  )}
                  {active && (
                    <View style={styles.checkBadge}><T style={styles.checkTxt}>✓</T></View>
                  )}
                </Pressable>
              );
            })}
          </div>
        )}
      </ScrollView>

      {/* Bottom color swatches & pattern/2-tone rows (exact v4 hierarchy) */}
      <View style={[styles.controlsFooter, mobile && styles.controlsFooterMobile]}>
        {tab === 'body' && (
          <>
            <SwatchRow
              label="MÀU DA"
              colors={PALETTES.skin}
              value={outfit.skin}
              testIDPrefix="tt-skin"
              compact={mobile}
              onSelect={(c) => !disabled && onChangeOutfit({ ...outfit, skin: c })}
            />
            <SwatchRow
              label="MÀU MẮT"
              colors={PALETTES.eye}
              value={outfit.face.eyeColor}
              testIDPrefix="tt-eye"
              compact={mobile}
              onSelect={(c) => patchFace({ eyeColor: c })}
            />
          </>
        )}

        {tab === 'face' && (
          <>
            <SwatchRow
              label={faceSub === 'mk' ? 'MÀU PHẤN MẮT' : 'MÀU MẮT'}
              colors={faceSub === 'mk' ? PALETTES.shadow : PALETTES.eye}
              value={faceSub === 'mk' ? outfit.face.eyeshadowColor : outfit.face.eyeColor}
              testIDPrefix="tt-face-c1"
              compact={mobile}
              onSelect={(c) => patchFace(faceSub === 'mk' ? { eyeshadowColor: c } : { eyeColor: c })}
            />
            <SwatchRow
              label="MÀU SON MÔI"
              colors={PALETTES.lip}
              value={outfit.face.lipColor}
              testIDPrefix="tt-face-lip"
              compact={mobile}
              onSelect={(c) => patchFace({ lipColor: c })}
            />
          </>
        )}

        {tab === 'hair' && (
          <>
            <SwatchRow
              label="MÀU CHÍNH"
              colors={PALETTES.hair}
              value={outfit.hair.c}
              testIDPrefix="tt-c1"
              compact={mobile}
              onSelect={(c) => !disabled && onChangeOutfit({ ...outfit, hair: { ...outfit.hair, c } })}
            />
            <SwatchRow
              label="MÀU PHỤ / 2-TONE"
              colors={PALETTES.hair}
              value={outfit.hair.c2}
              testIDPrefix="tt-c2"
              compact={mobile}
              onSelect={(c2) =>
                !disabled &&
                onChangeOutfit({
                  ...outfit,
                  hair: {
                    ...outfit.hair,
                    c2,
                    twoTone: outfit.hair.twoTone === 'none' ? 'tips' : outfit.hair.twoTone,
                  },
                })
              }
            />
            <HorizontalChipRow
              label="KIỂU 2-TONE"
              options={HAIR_TWO_TONES}
              value={outfit.hair.twoTone}
              testIDPrefix="tt-twotone"
              onSelect={(m) =>
                !disabled && onChangeOutfit({ ...outfit, hair: { ...outfit.hair, twoTone: m as ThoiTrangHairTwoTone } })
              }
            />
          </>
        )}

        {isCatalogTab && tab !== 'hair' && (
          <>
            <SwatchRow
              label="MÀU CHÍNH"
              colors={PALETTES.fashion}
              value={curEquipped?.c}
              testIDPrefix="tt-c1"
              compact={mobile}
              onSelect={(c) => updateCurrentGarment({ c })}
            />
            <SwatchRow
              label="MÀU PHỤ"
              colors={PALETTES.fashion}
              value={curEquipped?.c2}
              testIDPrefix="tt-c2"
              compact={mobile}
              onSelect={(c2) => updateCurrentGarment({ c2 })}
            />
            {tab !== 'glasses' && (
              <HorizontalChipRow
                label="HOẠ TIẾT"
                options={PATTERNS}
                value={curEquipped?.p ?? 'plain'}
                testIDPrefix="tt-pat"
                onSelect={(p) => updateCurrentGarment({ p: p as ThoiTrangPatternId })}
              />
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    backgroundColor: V4.glass,
    borderRadius: 26,
    padding: 7,
    maxHeight: '100%',
    shadowColor: '#a05a96',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
  },
  railInner: { gap: 3, alignItems: 'center' },
  railBtn: { width: 62, paddingVertical: 3, alignItems: 'center', gap: 2 },
  railIcon: {
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: V4.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railIconOn: { backgroundColor: V4.pink },
  railEmoji: { fontSize: 18 },
  railTxt: { fontSize: 10, fontWeight: '600', color: V4.ink2 },
  railTxtOn: { color: V4.pink, fontWeight: '800' },
  closet: {
    backgroundColor: V4.glass,
    borderRadius: 26,
    padding: 15,
    gap: 8,
    flex: 1,
    minHeight: 0,
    shadowColor: '#a05a96',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 6 },
  },
  closetMobile: {
    borderRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 10,
    gap: 6,
  },
  disabled: { opacity: 0.65 },
  mtabsScroll: { flexGrow: 0, flexShrink: 0, maxHeight: 34 },
  mtabs: { flexDirection: 'row', gap: 5, alignItems: 'center', paddingBottom: 2 },
  mtabPill: { paddingVertical: 6, paddingHorizontal: 11, borderRadius: 999, backgroundColor: V4.soft },
  mtabPillOn: { backgroundColor: V4.pink },
  mtabTxt: { fontSize: 12, fontWeight: '700', color: V4.ink },
  mtabTxtOn: { color: '#ffffff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: V4.ink },
  headerCount: { fontSize: 12, fontWeight: '600', color: V4.ink2 },
  filterWrap: { gap: 6 },
  search: {
    borderWidth: 2,
    borderColor: V4.line,
    borderRadius: 13,
    paddingVertical: 6,
    paddingHorizontal: 11,
    fontSize: 12.5,
    color: V4.ink,
    backgroundColor: '#ffffff',
  },
  tagRow: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  tagChip: { paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999, backgroundColor: V4.soft },
  tagChipOn: { backgroundColor: V4.pink },
  tagChipTxt: { fontSize: 11, fontWeight: '700', color: V4.ink2 },
  tagChipTxtOn: { color: '#ffffff' },
  gridScroll: { flex: 1, minHeight: 0 },
  gridScrollContent: { paddingVertical: 2, paddingBottom: 6 },
  bodyCol: { gap: 8 },
  card: {
    borderWidth: 3,
    borderColor: 'transparent',
    borderRadius: 18,
    backgroundColor: V4.card,
    padding: 5,
    paddingBottom: 7,
    alignItems: 'center',
    gap: 3,
    position: 'relative',
  },
  cardMobile: { borderRadius: 14, padding: 4, paddingBottom: 5 },
  cardOn: { borderColor: V4.pink, backgroundColor: '#ffffff' },
  noneCard: { justifyContent: 'center', minHeight: 92 },
  noneGlyph: { fontSize: 26, color: V4.ink2, fontWeight: '700' },
  cardTxt: { fontSize: 11, fontWeight: '600', color: V4.ink, textAlign: 'center', lineHeight: 13 },
  cardTxtMobile: { fontSize: 10, lineHeight: 12 },
  checkBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: V4.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkTxt: { color: '#ffffff', fontSize: 11, fontWeight: '800' },
  sparkBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkTxt: { fontSize: 10 },
  controlsFooter: { gap: 7, paddingTop: 2 },
  controlsFooterMobile: { gap: 4, paddingTop: 1 },
});
