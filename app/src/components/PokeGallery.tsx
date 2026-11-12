/**
 * "Kho chọc ghẹo" trong bảng chọc: tìm kiếm, tab nhóm, lưới hình Fluent 3D kèm tên và giá.
 * Chỉ vẽ một nhóm mỗi lần, mỗi lần tối đa PAGE món (xem thêm để hiện tiếp) nên mở bảng vẫn nhanh.
 */
import { memo, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { POKES, POKE_CATEGORIES, type PokeCategory, type PokeItem } from '../../../shared/src/pokes';
import { C, FONT, sticker } from '../theme';
import { play } from '../sound';
import { Button, T } from '../ui';
import { PokeImg } from './PokeImg';

const PAGE = 24;
type Tab = PokeCategory | 'free' | 'ruby';

/** bỏ dấu và hạ chữ thường để tìm không phân biệt dấu */
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
      style={({ pressed }) => [styles.cell, ruby && styles.cellRuby, pressed && { transform: [{ scale: 0.95 }] }]}
    >
      <PokeImg item={item} size={50} />
      <T numberOfLines={2} style={styles.name}>{item.name}</T>
      <View style={[styles.badge, ruby ? styles.badgeRuby : styles.badgeFree]}>
        <T style={[styles.badgeText, ruby && { color: C.gold }]}>{ruby ? `💎 ${item.price}` : 'Miễn phí'}</T>
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
      <TextInput
        testID="poke-search"
        style={styles.search}
        value={q}
        onChangeText={(v) => { setQ(v); setShown(PAGE); }}
        placeholder={`Tìm trong ${POKES.length} món…`}
        placeholderTextColor={C.muted}
        autoCorrect={false}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.tabs}>
        {tabs.map((t) => (
          <Pressable
            key={t.id}
            testID={`poke-tab-${t.id}`}
            accessibilityRole="button"
            accessibilityState={{ selected: !q && tab === t.id }}
            onPress={() => choose(t.id)}
            style={[styles.tab, !q && tab === t.id && styles.tabOn]}
          >
            <T style={[styles.tabText, !q && tab === t.id && { color: C.gold }]}>{t.icon} {t.name}</T>
          </Pressable>
        ))}
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
  box: { gap: 8 },
  search: {
    fontFamily: FONT, backgroundColor: C.mist, borderRadius: 12, paddingHorizontal: 12, height: 42, fontSize: 15, color: C.ink, borderWidth: 2, borderColor: C.ink,
  },
  tabs: { gap: 6, paddingVertical: 2 },
  tab: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 16, backgroundColor: C.mist, borderWidth: 2, borderColor: C.ink },
  tabOn: { backgroundColor: C.ink },
  tabText: { fontSize: 13, fontWeight: '800', color: C.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { width: '23.4%', minWidth: 74, flexGrow: 1, alignItems: 'center', gap: 3, paddingVertical: 7, paddingHorizontal: 3, borderRadius: 12, backgroundColor: C.paper, ...sticker(2) },
  cellRuby: { backgroundColor: '#FFF8E1' },
  name: { fontSize: 11, lineHeight: 13, fontWeight: '700', color: C.ink, textAlign: 'center', minHeight: 26 },
  badge: { borderRadius: 9, paddingHorizontal: 6, paddingVertical: 1 },
  badgeFree: { backgroundColor: '#D3F5E8' },
  badgeRuby: { backgroundColor: C.ink },
  badgeText: { fontSize: 10.5, fontWeight: '900', color: C.jade },
  empty: { fontSize: 13, color: C.muted, paddingVertical: 12 },
});
