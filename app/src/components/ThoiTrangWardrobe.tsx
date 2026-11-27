/**
 * Tủ đồ thiết kế v6 ("Sàn Diễn Xóm Lầy"):
 * - ~648 kiểu dáng 3D ĐỘC NHẤT (mỗi món có hình khối 3D & icon 3D riêng biệt, KHÔNG có bản sao chỉ đổi màu).
 * - TUYỆT ĐỐI KHÔNG CÓ badge hợp chủ đề, KHÔNG CÓ filter hợp chủ đề, KHÔNG tự xếp đồ hợp chủ đề lên đầu.
 * - Mobile tối ưu cảm ứng: tách 2 chế độ "👗 Chọn kiểu" (toàn bộ chiều cao cho lưới 3 cột to rõ) &
 *   "🎨 Màu & In chữ" (chấm màu 28px dễ bấm + 32 họa tiết + 48 câu Meme in lên áo 3D), kèm nút tìm kiếm gọn
 *   và đệm đáy tránh nút loa nổi góc dưới phải.
 */
import { useMemo, useState, type CSSProperties } from 'react';
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
  ThoiTrangWardrobeTab,
} from '../../../shared/src/thoitrang';
import {
  BODY_DEFAULTS,
  BODY_TYPES,
  CATALOG,
  HAIR_TWO_TONES,
  MEME_PRINTS,
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
  ThoiTrangIconSprite,
  V4,
  useThoiTrangIconManifest,
  type FaceSubTab,
} from './ThoiTrangWardrobeControls';

const PAGE_SIZE = 60;

/** Chuẩn hóa tiếng Việt không dấu để gõ "dep to ong" hay "noi com" đều tìm ra ngay. */
function normSearch(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim();
}

type SubFilterDef = readonly [id: string, label: string, match: (it: ThoiTrangCatalogItem) => boolean];

const isMaleCoreHair = new Set(['undercut', 'quiff', 'buzz', 'mohawk', 'man_bun', 'wolf_cut', 'slick_back', 'curly_fro', 'side_part']);
const isLayGroup = (it: ThoiTrangCatalogItem) => it.group === 'lay_loi' || it.tags.includes('lay_loi');
const isMaleItem = (it: ThoiTrangCatalogItem) => it.group === 'nam' || isMaleCoreHair.has(it.id);
const isFemaleItem = (it: ThoiTrangCatalogItem) => it.group === 'nu' || (!it.group && !isMaleItem(it) && !isLayGroup(it));
const isTradItem = (it: ThoiTrangCatalogItem) => it.group === 'truyen_thong';
const isJobSportItem = (it: ThoiTrangCatalogItem) => it.group === 'nghe_nghiep' || it.group === 'the_thao';
const isCostumeItem = (it: ThoiTrangCatalogItem) => it.group === 'hoa_trang' || it.group === 'scifi';

/** Bộ lọc trung tính theo LOẠI TRANG PHỤC (cố định, hoàn toàn không dính tới chủ đề ván đấu). */
const SUB_FILTERS: Readonly<Record<ThoiTrangCategoryId, readonly SubFilterDef[]>> = {
  hair: [
    ['all', 'Tất cả', () => true],
    ['lay', '🤡 Lầy lội', isLayGroup],
    ['nam', '👨 Tóc Nam', isMaleItem],
    ['nu', '👩 Tóc Nữ', (it) => isFemaleItem(it) || (!isMaleItem(it) && !isLayGroup(it))],
    ['trad', '🏮 Cổ trang', isTradItem],
  ],
  top: [
    ['all', 'Tất cả', () => true],
    ['lay', '🤡 Siêu Lầy', isLayGroup],
    ['nam', '👔 Áo Nam', isMaleItem],
    ['nu', '👚 Áo Nữ', isFemaleItem],
    ['trad', '🏮 Truyền thống', isTradItem],
    ['job', '⚽ Nghề & Sport', isJobSportItem],
    ['cos', '🎭 Hóa trang', isCostumeItem],
  ],
  outer: [
    ['all', 'Tất cả', () => true],
    ['lay', '🤡 Siêu Lầy', isLayGroup],
    ['nam', '🧥 Khoác Nam', isMaleItem],
    ['nu', '✨ Nữ & Unisex', (it) => !isMaleItem(it) && !isLayGroup(it)],
    ['trad', '🏮 Truyền thống', isTradItem],
    ['job', '👷 Nghề nghiệp', isJobSportItem],
    ['cos', '🎭 Hóa trang', isCostumeItem],
  ],
  bottom: [
    ['all', 'Tất cả', () => true],
    ['lay', '🤡 Siêu Lầy', isLayGroup],
    ['nam', '👖 Quần Nam', isMaleItem],
    ['nu', '👗 Quần/Váy Nữ', isFemaleItem],
    ['trad', '🏮 Truyền thống', isTradItem],
    ['sport', '🏃 Thể thao', isJobSportItem],
  ],
  dress: [
    ['all', 'Tất cả', () => true],
    ['lay', '🤡 Siêu Lầy', isLayGroup],
    ['nam', '🤵 Bộ Nam', isMaleItem],
    ['nu', '👗 Đầm Nữ', isFemaleItem],
    ['trad', '🏮 Truyền thống', isTradItem],
    ['job', '👮 Nghề & Sport', isJobSportItem],
    ['cos', '🎭 Hóa trang', isCostumeItem],
  ],
  shoes: [
    ['all', 'Tất cả', () => true],
    ['lay', '🤡 Siêu Lầy', isLayGroup],
    ['nam', '👞 Giày Nam', isMaleItem],
    ['nu', '👠 Giày Nữ', isFemaleItem],
    ['trad', '🏮 Truyền thống', isTradItem],
    ['sport', '👟 Thể thao', isJobSportItem],
  ],
  hat: [
    ['all', 'Tất cả', () => true],
    ['lay', '🤡 Siêu Lầy', isLayGroup],
    ['nam', '🧢 Mũ Nam', isMaleItem],
    ['trad', '🏮 Truyền thống', isTradItem],
    ['job', '👷 Nghề nghiệp', isJobSportItem],
    ['cos', '🎭 Hóa trang', isCostumeItem],
  ],
  glasses: [
    ['all', 'Tất cả', () => true],
    ['lay', '🤡 Siêu Lầy', isLayGroup],
    ['nam', '🕶️ Kính Nam', isMaleItem],
    ['scifi', '🤖 Sci-Fi & Sport', (it) => isCostumeItem(it) || isJobSportItem(it)],
  ],
  acc: [
    ['all', 'Tất cả', () => true],
    ['lay', '🤡 Siêu Lầy', isLayGroup],
    ['tui', '👜 Túi xách', (it) => it.group === 'tui' || it.subSlot === 'handR' || it.subSlot === 'hipBag'],
    ['jewel', '💎 Cổ/Eo/Tay', (it) => it.subSlot === 'neck' || it.subSlot === 'ears' || it.subSlot === 'waist' || it.subSlot === 'wrists' || it.subSlot === 'head'],
    ['hand', '✋ Cầm tay', (it) => it.subSlot === 'handL' || it.subSlot === 'chestProp'],
    ['food', '🍜 Đồ ăn', (it) => it.group === 'do_an'],
    ['weapon', '⚔️ Vũ khí', (it) => it.group === 'vu_khi'],
    ['wings', '🦋 Cánh & Đuôi', (it) => it.subSlot === 'back' || it.subSlot === 'tail'],
    ['nam', '⚽ Nam & Sport', (it) => isMaleItem(it) || isJobSportItem(it)],
  ],
};

function filterCatalogItems(
  rawList: readonly ThoiTrangCatalogItem[],
  query: string,
  subFilterFn: ((it: ThoiTrangCatalogItem) => boolean) | null,
): ThoiTrangCatalogItem[] {
  const q = normSearch(query);
  return rawList.filter((item) => {
    if (item.excluded) return false;
    if (subFilterFn && !subFilterFn(item)) return false;
    if (q) {
      const inName = normSearch(item.name).includes(q);
      const inId = item.id.toLowerCase().includes(q);
      if (!inName && !inId) return false;
    }
    return true;
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
    <ScrollView
      style={styles.rail}
      contentContainerStyle={styles.railInner}
      showsVerticalScrollIndicator={false}
    >
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
            <T numberOfLines={1} style={[styles.railTxt, active && styles.railTxtOn]}>
              {label}
            </T>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export interface ThoiTrangWardrobeProps {
  outfit: ThoiTrangOutfit;
  tab: ThoiTrangWardrobeTab;
  mobile: boolean;
  disabled?: boolean;
  onSelectTab: (next: ThoiTrangWardrobeTab) => void;
  onChangeOutfit: (next: ThoiTrangOutfit, pushUndo?: boolean) => void;
}

export function ThoiTrangWardrobe({
  outfit,
  tab,
  mobile,
  disabled = false,
  onSelectTab,
  onChangeOutfit,
}: ThoiTrangWardrobeProps) {
  const manifest = useThoiTrangIconManifest();
  const [query, setQuery] = useState('');
  const [subGroup, setSubGroup] = useState('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [faceSub, setFaceSub] = useState<FaceSubTab>('expr');
  const [activeAccId, setActiveAccId] = useState<string | null>(null);
  const [mobilePanel, setMobilePanel] = useState<'items' | 'style'>('items');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const tabMeta = WARDROBE_TABS.find((t) => t[0] === tab) ?? WARDROBE_TABS[3];

  const handleTabSwitch = (next: ThoiTrangWardrobeTab) => {
    onSelectTab(next);
    setSubGroup('all');
    setQuery('');
    setVisibleCount(PAGE_SIZE);
    setMobilePanel('items');
    setMobileSearchOpen(false);
  };

  const patchFace = (patch: Partial<ThoiTrangFace>) => {
    if (disabled) return;
    onChangeOutfit({ ...outfit, face: { ...outfit.face, ...patch } });
  };

  const selectBody = (body: ThoiTrangBodyType) => {
    if (disabled) return;
    const bd = BODY_DEFAULTS[body];
    onChangeOutfit({
      ...outfit,
      body,
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
  const subFilterDefs = isCatalogTab ? SUB_FILTERS[catTab] : [];
  const activeSubDef = subFilterDefs.find((d) => d[0] === subGroup) ?? subFilterDefs[0] ?? null;
  const supportsMemeTxt = tab === 'top' || tab === 'outer' || tab === 'dress';

  const filteredItems = useMemo(() => {
    if (!isCatalogTab) return [];
    const defs = SUB_FILTERS[catTab];
    const active = defs.find((d) => d[0] === subGroup) ?? defs[0] ?? null;
    return filterCatalogItems(CATALOG[catTab], query, active ? active[2] : null);
  }, [isCatalogTab, catTab, query, subGroup]);
  const shownItems = useMemo(() => filteredItems.slice(0, visibleCount), [filteredItems, visibleCount]);
  const remainingCount = Math.max(0, filteredItems.length - shownItems.length);

  const accs = outfit.acc ?? [];
  const activeAcc = accs.find((a) => a.id === activeAccId) ?? accs[accs.length - 1] ?? null;
  const curEquipped: ThoiTrangEquippedItem | null =
    tab === 'acc' ? activeAcc : (tab === 'hair' || !isCatalogTab ? null : (outfit.slots[tab as ThoiTrangPrimarySlotId] ?? null));
  const curEquippedMeta = curEquipped && isCatalogTab && tab !== 'hair'
    ? getItem(catTab, curEquipped.id)
    : tab === 'hair'
      ? getItem('hair', outfit.hair.id)
      : undefined;

  const handleSelectItem = (id: string | null) => {
    if (disabled) return;
    if (tab === 'acc') {
      const next = toggleAcc(outfit, id);
      const added = id && next.acc.some((a) => a.id === id);
      setActiveAccId(added ? id : next.acc[next.acc.length - 1]?.id ?? null);
      onChangeOutfit(next);
      return;
    }
    if (tab === 'hair') {
      if (!id) return;
      onChangeOutfit({ ...outfit, hair: { ...outfit.hair, id } });
      return;
    }
    if (!isCatalogTab) return;
    const slot = tab as ThoiTrangPrimarySlotId;
    if (!id) {
      onChangeOutfit(setSlot(outfit, slot, null));
      return;
    }
    const meta = getItem(slot, id);
    if (!meta) return;
    const prevTxt = outfit.slots[slot]?.txt;
    onChangeOutfit(
      setSlot(outfit, slot, {
        id: meta.id,
        c: meta.c,
        c2: meta.c2,
        p: meta.p,
        ...(prevTxt && supportsMemeTxt ? { txt: prevTxt } : {}),
      }),
    );
  };

  const updateCurrentGarment = (patch: Partial<Pick<ThoiTrangEquippedItem, 'c' | 'c2' | 'p' | 'txt'>>) => {
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
    const merged: ThoiTrangEquippedItem = { ...cur, ...patch };
    if (merged.txt === 'none') delete merged.txt;
    onChangeOutfit(setSlot(outfit, slot, merged));
  };

  const countLabel =
    tab === 'body'
      ? `${BODY_TYPES.length} dáng · ${Math.round(outfit.height * 100)}%`
      : tab === 'face'
        ? '14 biểu cảm'
        : `${filteredItems.length.toLocaleString('vi-VN')} kiểu`;

  const gridStyleWeb: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: mobile ? '8px' : '8px',
    width: '100%',
  };

  const previewC1 = tab === 'hair' ? outfit.hair.c : (curEquipped?.c ?? '#ff5c8a');
  const previewC2 = tab === 'hair' ? outfit.hair.c2 : (curEquipped?.c2 ?? '#ffffff');

  /** Khối chỉnh màu, họa tiết & chữ in Meme (dùng chung cho footer Desktop và chế độ "Màu & In" trên Mobile). */
  const renderStyleControls = (touchLarge: boolean) => (
    <View style={[styles.styleBlock, touchLarge && styles.styleBlockMobile]}>
      {touchLarge && curEquippedMeta && (
        <View style={styles.styleTargetRow}>
          <T numberOfLines={1} style={styles.styleTargetName}>
            Đang chỉnh: {curEquippedMeta.name}
          </T>
          <Pressable
            accessibilityRole="button"
            onPress={() => setMobilePanel('items')}
            style={styles.backToGridBtn}
          >
            <T style={styles.backToGridTxt}>← Đổi kiểu</T>
          </Pressable>
        </View>
      )}
      {touchLarge && isCatalogTab && tab !== 'hair' && !curEquipped && (
        <T style={styles.emptyTxt}>Hãy chọn 1 món đồ ở tab “Chọn kiểu” trước khi đổi màu nhé!</T>
      )}

      {tab === 'body' && (
        <>
          <SwatchRow
            label="MÀU DA"
            colors={PALETTES.skin}
            value={outfit.skin}
            testIDPrefix="tt-skin"
            compact={!touchLarge}
            touchLarge={touchLarge}
            onSelect={(c) => !disabled && onChangeOutfit({ ...outfit, skin: c })}
          />
          <SwatchRow
            label="MÀU MẮT"
            colors={PALETTES.eye}
            value={outfit.face.eyeColor}
            testIDPrefix="tt-eye"
            compact={!touchLarge}
            touchLarge={touchLarge}
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
            compact={!touchLarge}
            touchLarge={touchLarge}
            onSelect={(c) => patchFace(faceSub === 'mk' ? { eyeshadowColor: c } : { eyeColor: c })}
          />
          <SwatchRow
            label="MÀU SON MÔI"
            colors={PALETTES.lip}
            value={outfit.face.lipColor}
            testIDPrefix="tt-face-lip"
            compact={!touchLarge}
            touchLarge={touchLarge}
            onSelect={(c) => patchFace({ lipColor: c })}
          />
        </>
      )}

      {tab === 'hair' && (
        <>
          <SwatchRow
            label="MÀU TÓC CHÍNH"
            colors={PALETTES.hair}
            value={outfit.hair.c}
            testIDPrefix="tt-c1"
            compact={!touchLarge}
            touchLarge={touchLarge}
            onSelect={(c) => !disabled && onChangeOutfit({ ...outfit, hair: { ...outfit.hair, c } })}
          />
          <SwatchRow
            label="MÀU PHỤ / 2-TONE"
            colors={PALETTES.hair}
            value={outfit.hair.c2}
            testIDPrefix="tt-c2"
            compact={!touchLarge}
            touchLarge={touchLarge}
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
            wrap={touchLarge}
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
            compact={!touchLarge}
            touchLarge={touchLarge}
            onSelect={(c) => updateCurrentGarment({ c })}
          />
          <SwatchRow
            label="MÀU PHỤ"
            colors={PALETTES.fashion}
            value={curEquipped?.c2}
            testIDPrefix="tt-c2"
            compact={!touchLarge}
            touchLarge={touchLarge}
            onSelect={(c2) => updateCurrentGarment({ c2 })}
          />
          {tab !== 'glasses' && (
            <HorizontalChipRow
              label="HOẠ TIẾT (32)"
              options={PATTERNS}
              value={curEquipped?.p ?? 'plain'}
              testIDPrefix="tt-pat"
              wrap={touchLarge}
              onSelect={(p) => updateCurrentGarment({ p: p as ThoiTrangPatternId })}
            />
          )}
          {supportsMemeTxt && (
            <HorizontalChipRow
              label="💬 CHỮ IN MEME LÊN ÁO (48)"
              options={MEME_PRINTS}
              value={curEquipped?.txt ?? 'none'}
              testIDPrefix="tt-meme"
              wrap={touchLarge}
              onSelect={(txt) => updateCurrentGarment({ txt: txt === 'none' ? undefined : txt })}
            />
          )}
        </>
      )}
    </View>
  );

  const showMobileStyleView = mobile && isCatalogTab && mobilePanel === 'style';

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

      {/* Desktop Header OR Mobile Segmented Control (Chọn kiểu / Màu & In + Tìm kiếm) */}
      {!mobile ? (
        <View style={styles.header}>
          <T style={styles.headerTitle}>{tabMeta[2]}</T>
          <T style={styles.headerCount}>{countLabel}</T>
        </View>
      ) : isCatalogTab ? (
        <View style={styles.mobileBar}>
          <View style={styles.mobileSeg}>
            <Pressable
              testID="tt-mobile-mode-items"
              accessibilityRole="button"
              onPress={() => setMobilePanel('items')}
              style={[styles.mobileSegBtn, mobilePanel === 'items' && styles.mobileSegBtnOn]}
            >
              <T style={[styles.mobileSegTxt, mobilePanel === 'items' && styles.mobileSegTxtOn]}>
                👗 Chọn kiểu ({filteredItems.length})
              </T>
            </Pressable>
            <Pressable
              testID="tt-mobile-mode-style"
              accessibilityRole="button"
              onPress={() => setMobilePanel('style')}
              style={[styles.mobileSegBtn, mobilePanel === 'style' && styles.mobileSegBtnOn]}
            >
              <View style={styles.colorDotsMini}>
                <View style={[styles.dotMini, { backgroundColor: previewC1 }]} />
                <View style={[styles.dotMini, { backgroundColor: previewC2 }]} />
              </View>
              <T style={[styles.mobileSegTxt, mobilePanel === 'style' && styles.mobileSegTxtOn]}>
                {supportsMemeTxt ? 'Màu & Chữ' : 'Đổi màu'}
              </T>
            </Pressable>
          </View>
          {mobilePanel === 'items' && (
            <Pressable
              testID="tt-mobile-search-btn"
              accessibilityRole="button"
              onPress={() => setMobileSearchOpen((v) => !v)}
              style={[styles.searchToggleBtn, (mobileSearchOpen || query.length > 0) && styles.searchToggleBtnOn]}
            >
              <T style={[styles.searchToggleTxt, (mobileSearchOpen || query.length > 0) && styles.searchToggleTxtOn]}>
                🔍
              </T>
            </Pressable>
          )}
        </View>
      ) : (
        <View style={styles.header}>
          <T style={styles.headerTitle}>{tabMeta[2]}</T>
          <T style={styles.headerCount}>{countLabel}</T>
        </View>
      )}

      {/* Search & neutral garment-type filters */}
      {isCatalogTab && !showMobileStyleView && (
        <View style={styles.filterWrap}>
          {(!mobile || mobileSearchOpen || query.length > 0) && (
            <View style={styles.searchRow}>
              <TextInput
                testID="tt-search"
                value={query}
                onChangeText={(txt) => {
                  setQuery(txt);
                  setVisibleCount(PAGE_SIZE);
                }}
                placeholder="Tìm kiểu đồ (vd: nồi cơm, dép tổ ong, áo dài, vest…)"
                placeholderTextColor={V4.ink2}
                style={[styles.search, mobile && styles.searchMobile]}
              />
              {query.length > 0 && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setQuery('')}
                  style={styles.clearSearchBtn}
                >
                  <T style={styles.clearSearchTxt}>✕</T>
                </Pressable>
              )}
            </View>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagRow}>
            {subFilterDefs.map(([gid, glabel]) => {
              const on = (activeSubDef?.[0] ?? 'all') === gid;
              return (
                <Pressable
                  key={gid}
                  testID={`tt-sub-${gid}`}
                  accessibilityRole="button"
                  onPress={() => {
                    setSubGroup(gid);
                    setVisibleCount(PAGE_SIZE);
                  }}
                  style={[styles.tagChip, mobile && styles.tagChipMobile, on && styles.tagChipOn]}
                >
                  <T style={[styles.tagChipTxt, on && styles.tagChipTxtOn]}>{glabel}</T>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Main Scrollable Content (Items Grid OR Mobile Style Customizer) */}
      <ScrollView
        style={styles.gridScroll}
        contentContainerStyle={[styles.gridScrollContent, mobile && styles.gridScrollContentMobile]}
        showsVerticalScrollIndicator={!mobile}
        scrollEventThrottle={120}
        onScroll={(e) => {
          if (showMobileStyleView || remainingCount <= 0) return;
          const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 220) {
            setVisibleCount((v) => v + PAGE_SIZE);
          }
        }}
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
                      style={[styles.card, mobile && styles.cardMobile, active && styles.cardOn]}
                    >
                      <ThoiTrangIconSprite iconKey={`body:${id}`} manifest={manifest} />
                      <T numberOfLines={2} style={[styles.cardTxt, mobile && styles.cardTxtMobile]}>{name}</T>
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
            {mobile && renderStyleControls(true)}
          </View>
        )}

        {tab === 'face' && (
          <View style={styles.bodyCol}>
            <FaceEditorPanel
              face={outfit.face}
              subTab={faceSub}
              onChangeSubTab={setFaceSub}
              onPatchFace={patchFace}
              manifest={manifest}
            />
            {mobile && renderStyleControls(true)}
          </View>
        )}

        {showMobileStyleView && renderStyleControls(true)}

        {isCatalogTab && !showMobileStyleView && Platform.OS === 'web' && (
          <>
            <div style={gridStyleWeb}>
              {tab !== 'hair' && tab !== 'shoes' && (
                <Pressable
                  testID="tt-item-none"
                  accessibilityRole="button"
                  onPress={() => handleSelectItem(null)}
                  style={[
                    styles.card,
                    mobile && styles.cardMobile,
                    styles.noneCard,
                    (tab === 'acc' ? accs.length === 0 : !curEquipped) && styles.cardOn,
                  ]}
                >
                  <T style={styles.noneGlyph}>∅</T>
                  <T style={[styles.cardTxt, mobile && styles.cardTxtMobile]}>Bỏ món</T>
                </Pressable>
              )}
              {shownItems.map((item) => {
                const active =
                  tab === 'hair'
                    ? outfit.hair.id === item.id
                    : tab === 'acc'
                      ? accs.some((a) => a.id === item.id)
                      : curEquipped?.id === item.id;
                return (
                  <Pressable
                    key={item.id}
                    testID={`tt-item-${tab}-${item.id}`}
                    accessibilityRole="button"
                    onPress={() => handleSelectItem(item.id)}
                    style={[styles.card, mobile && styles.cardMobile, active && styles.cardOn]}
                  >
                    <ThoiTrangIconSprite
                      iconKey={item.iconKey ?? `${tab}:${item.id}`}
                      manifest={manifest}
                    />
                    <T numberOfLines={2} style={[styles.cardTxt, mobile && styles.cardTxtMobile]}>{item.name}</T>
                    {active && (
                      <View style={styles.checkBadge}><T style={styles.checkTxt}>✓</T></View>
                    )}
                  </Pressable>
                );
              })}
            </div>
            {remainingCount > 0 && (
              <Pressable
                testID="tt-load-more"
                accessibilityRole="button"
                onPress={() => setVisibleCount((v) => v + PAGE_SIZE)}
                style={styles.loadMoreBtn}
              >
                <T style={styles.loadMoreTxt}>
                  Xem thêm +{Math.min(PAGE_SIZE, remainingCount)} kiểu (còn {remainingCount.toLocaleString('vi-VN')})
                </T>
              </Pressable>
            )}
            {filteredItems.length === 0 && (
              <T style={styles.emptyTxt}>Không tìm thấy món nào khớp “{query}”. Thử từ khóa khác nhé!</T>
            )}
          </>
        )}
      </ScrollView>

      {/* Desktop always-visible color / pattern / meme-print footer */}
      {!mobile && (
        <View style={styles.controlsFooter}>
          {renderStyleControls(false)}
        </View>
      )}
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
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 7,
  },
  disabled: { opacity: 0.65 },
  mtabsScroll: { flexGrow: 0, flexShrink: 0, maxHeight: 38 },
  mtabs: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingBottom: 2 },
  mtabPill: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, backgroundColor: V4.soft },
  mtabPillOn: { backgroundColor: V4.pink },
  mtabTxt: { fontSize: 12.5, fontWeight: '700', color: V4.ink },
  mtabTxtOn: { color: '#ffffff' },
  mobileBar: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mobileSeg: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: V4.soft,
    borderRadius: 14,
    padding: 3,
    gap: 3,
  },
  mobileSegBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 11,
  },
  mobileSegBtnOn: {
    backgroundColor: '#ffffff',
    shadowColor: '#a05a96',
    shadowOpacity: 0.14,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  mobileSegTxt: { fontSize: 12, fontWeight: '700', color: V4.ink2 },
  mobileSegTxtOn: { color: V4.pink, fontWeight: '800' },
  colorDotsMini: { flexDirection: 'row', gap: 2, alignItems: 'center' },
  dotMini: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: 'rgba(59,42,63,0.22)' },
  searchToggleBtn: {
    width: 36,
    height: 34,
    borderRadius: 12,
    backgroundColor: V4.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchToggleBtnOn: { backgroundColor: V4.pink },
  searchToggleTxt: { fontSize: 15 },
  searchToggleTxtOn: { color: '#ffffff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: V4.ink },
  headerCount: { fontSize: 12, fontWeight: '700', color: V4.pink },
  filterWrap: { gap: 6 },
  searchRow: { flexDirection: 'row', alignItems: 'center', position: 'relative' },
  search: {
    flex: 1,
    borderWidth: 2,
    borderColor: V4.line,
    borderRadius: 13,
    paddingVertical: 6,
    paddingHorizontal: 11,
    paddingRight: 30,
    fontSize: 12.5,
    color: V4.ink,
    backgroundColor: '#ffffff',
  },
  searchMobile: { paddingVertical: 6, paddingHorizontal: 11, fontSize: 12.5, borderRadius: 11 },
  clearSearchBtn: {
    position: 'absolute',
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: V4.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearSearchTxt: { fontSize: 11, fontWeight: '800', color: V4.ink2 },
  tagRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  tagChip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: V4.soft },
  tagChipMobile: { paddingVertical: 5, paddingHorizontal: 11 },
  tagChipOn: { backgroundColor: V4.pink },
  tagChipTxt: { fontSize: 11.5, fontWeight: '700', color: V4.ink2 },
  tagChipTxtOn: { color: '#ffffff' },
  gridScroll: { flex: 1, minHeight: 0 },
  gridScrollContent: { paddingVertical: 2, paddingBottom: 14, gap: 8 },
  gridScrollContentMobile: { paddingBottom: 76 },
  bodyCol: { gap: 10 },
  card: {
    borderWidth: 2.5,
    borderColor: 'transparent',
    borderRadius: 18,
    backgroundColor: V4.card,
    padding: 5,
    paddingBottom: 7,
    alignItems: 'center',
    gap: 4,
    position: 'relative',
  },
  cardMobile: { borderRadius: 15, padding: 6, paddingBottom: 7, gap: 4 },
  cardOn: { borderColor: V4.pink, backgroundColor: '#ffffff' },
  noneCard: { justifyContent: 'center', minHeight: 108 },
  noneGlyph: { fontSize: 28, color: V4.ink2, fontWeight: '700' },
  cardTxt: { fontSize: 11, fontWeight: '600', color: V4.ink, textAlign: 'center', lineHeight: 13.5 },
  cardTxtMobile: { fontSize: 11, fontWeight: '700', lineHeight: 13.5 },
  checkBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor: V4.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkTxt: { color: '#ffffff', fontSize: 11, fontWeight: '800' },
  loadMoreBtn: {
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: V4.soft,
    alignItems: 'center',
  },
  loadMoreTxt: { fontSize: 12.5, fontWeight: '800', color: V4.pink },
  emptyTxt: { fontSize: 12.5, fontWeight: '600', color: V4.ink2, textAlign: 'center', paddingVertical: 16 },
  controlsFooter: { paddingTop: 2 },
  styleBlock: { gap: 6 },
  styleBlockMobile: { gap: 12, paddingTop: 4 },
  styleTargetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: V4.soft,
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  styleTargetName: { flex: 1, fontSize: 12, fontWeight: '800', color: V4.ink },
  backToGridBtn: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#ffffff' },
  backToGridTxt: { fontSize: 11.5, fontWeight: '800', color: V4.pink },
});
