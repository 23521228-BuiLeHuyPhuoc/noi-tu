/**
 * "Kho chọc ghẹo" trong bảng chọc: tìm kiếm, tab nhóm, lưới hình Fluent 3D/Flat kèm tên và giá Ruby.
 */
import { memo, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { POKES, POKE_CATEGORIES, type PokeCategory, type PokeItem } from '../../../shared/src/pokes';
import { C, FONT, sticker } from '../theme';
import { play } from '../sound';
import { Button, T } from '../ui';
import { PokeImg } from './PokeImg';
import { EmojiIcon, RubyIcon, UiIcon } from './Icons';

const PAGE = 24;
type Tab = PokeCategory | 'free' | 'ruby';

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase();

const Cell = memo(function Cell({ item, onPick }: { item: PokeItem; onPick: (p: PokeItem) => void }) {
  const ruby = item.tier === 'ruby';
  return (
    <Pressable
      testID={`poke-item-${item.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${ruby ? `${item.price} Ruby` : 'miễn phí'}`}
      onPress={() => {
        play('pop');
        onPick(item);
      }}
      style={({ pressed }) => [styles.cell, sticker(pressed ? 1 : 2), ruby && styles.cellRuby, pressed && { transform: [{ scale: 0.96 }] }]}
    >
      <PokeImg item={item} size={48} />
      <T numberOfLines={2} style={styles.name}>{item.name}</T>
      <View style={[styles.badge, ruby ? styles.badgeRuby : styles.badgeFree]}>
        {ruby ? (
          <View style={styles.rubyBadgeRow}>
            <RubyIcon size={11} />
            <T style={[styles.badgeText, { color: C.gold }]}>{item.price}</T>
          </View>
        ) : (
          <T style={styles.badgeText}>Miễn phí</T>
        )}
      </View>
    </Pressable>
  );
});

export function PokeGallery({ onPick }: { onPick: (p: PokeItem) => void }) {
  const [tab, setTab] = useState<Tab>('nem');
  const [q, setQ] = useState('');
  const [shown, setShown] = useState(PAGE);
  const list = useMemo(() => {
    const k = fold(q.trim());
    return POKES.filter((p) => {
      if (k) return fold(p.name).includes(k) || p.id.includes(k);
      return tab === 'free' ? p.tier === 'free' : tab === 'ruby' ? p.tier === 'ruby' : p.category === tab;
    });
  }, [tab, q]);
  const choose = (t: Tab) => {
    setTab(t);
    setQ('');
    setShown(PAGE);
  };
  const tabs: { id: Tab; name: string; icon: string }[] = [
    { id: 'ruby', name: 'Ruby', icon: '💎' },
    { id: 'free', name: 'Miễn phí', icon: '🎟️' },
    ...POKE_CATEGORIES,
  ];
  return (
    <View testID="poke-gallery" style={styles.box}>
      <View style={styles.searchWrap}>
        <UiIcon name="Search" size={16} color={C.muted} />
        <TextInput
          testID="poke-search"
          style={styles.search}
          value={q}
          onChangeText={(v) => { setQ(v); setShown(PAGE); }}
          placeholder={`Tìm trong ${POKES.length} món…`}
          placeholderTextColor={C.muted}
          autoCorrect={false}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.tabs}>
        {tabs.map((t) => {
          const on = !q && tab === t.id;
          return (
            <Pressable
              key={t.id}
              testID={`poke-tab-${t.id}`}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => choose(t.id)}
              style={[styles.tab, on && styles.tabOn]}
            >
              <EmojiIcon emoji={t.icon} size={14} />
              <T style={[styles.tabText, on && { color: C.gold }]}>{t.name}</T>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.grid}>
        {list.slice(0, shown).map((p) => <Cell key={p.id} item={p} onPick={onPick} />)}
        {list.length === 0 && <T style={styles.empty}>Không có món nào tên như vậy.</T>}
      </View>
      {list.length > shown && (
        <Button testID="poke-more" small variant="paper" title={`Xem thêm (${list.length - shown})`} onPress={() => setShown((n) => n + PAGE)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 10 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.mist, borderRadius: 14, paddingHorizontal: 12, height: 42,
    borderWidth: 1.5, borderColor: 'rgba(28,32,36,0.16)',
  },
  search: {
    fontFamily: FONT, flex: 1, minWidth: 0, fontSize: 15, color: C.ink, height: '100%',
  },
  tabs: { gap: 6, paddingVertical: 2 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: C.mist,
    borderWidth: 1.5, borderColor: 'rgba(28,32,36,0.12)',
  },
  tabOn: { backgroundColor: C.ink, borderColor: C.ink },
  tabText: { fontSize: 13, fontWeight: '800', color: C.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { width: '23.4%', minWidth: 74, flexGrow: 1, alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 4, borderRadius: 14, backgroundColor: C.paper },
  cellRuby: { backgroundColor: '#FFFBEB', borderColor: 'rgba(245,158,11,0.35)' },
  name: { fontSize: 11, lineHeight: 13.5, fontWeight: '700', color: C.ink, textAlign: 'center', minHeight: 27 },
  badge: { borderRadius: 9, paddingHorizontal: 7, paddingVertical: 2 },
  rubyBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  badgeFree: { backgroundColor: '#D6F1E3' },
  badgeRuby: { backgroundColor: C.ink },
  badgeText: { fontSize: 10.5, fontWeight: '900', color: C.jadeDeep },
  empty: { fontSize: 13, color: C.muted, paddingVertical: 12 },
});
